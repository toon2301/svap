"""Ponuka neaktívneho vlastníka cez priame id (nález 339).

Účet deaktivovaný inak než zmazaním používateľom (napríklad v administrácii) vo
vyhľadávaní nie je (`searchable_user_q`), no jeho ponuka bola cez priame id
dostupná a dala sa lajkovať. `offer_hidden_from_user` berie neaktívneho
vlastníka ako skrytú ponuku pre cudzieho diváka: detail aj lajk dajú 404
rovnakého tvaru ako pri ostatných skrytých ponukách (súkromný účet, blok, skrytá
ponuka), takže sa neprezradí, prečo ponuka chýba, a lajk sa neuloží.

Pomocník volajú aj recenzie ponuky, preto sa 404 týka aj ich zoznamu, detailu a
lajku. Ostatné cesty sa nemenia: vyhľadávanie ponuku neaktívneho vlastníka
vynecháva dávno, zoznam lajkujúcich a žiadosť o ponuku ho už kontrolovali samy.
"""

from decimal import Decimal
from unittest import mock

from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.core.cache import cache
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import (
    OfferedSkill,
    OfferedSkillLike,
    Review,
    ReviewLike,
    SkillRequest,
    UserBlock,
)
from accounts.services.offer_visibility import offer_hidden_from_user

User = get_user_model()

DETAIL_NOT_FOUND = {"error": "Zručnosť nebola nájdená"}
LIKE_NOT_FOUND = {"error": "Ponuka nebola najdena"}
MISSING_OFFER_ID = 987654321
MISSING_REVIEW_ID = 987654322


def _user(name, *, is_public=True, is_active=True):
    """Účet bez hesla: vytvorí sa rýchlo a prihlasuje sa cez force_authenticate."""
    return User.objects.create_user(
        username=name,
        email=f"{name}@example.com",
        password=None,
        is_public=is_public,
        is_active=is_active,
        is_verified=True,
    )


def _offer(owner, **overrides):
    """Verejná ponuka vlastníka; polia sa dajú prepísať."""
    data = {
        "user": owner,
        "category": "Remeslo",
        "subcategory": "Maliarske práce",
        "description": "Ponuka neaktívneho vlastníka",
        "detailed_description": "Podrobnosti ponuky",
        "is_hidden": False,
    }
    data.update(overrides)
    return OfferedSkill.objects.create(**data)


def _deactivate(user):
    """Deaktivuje účet ako administrácia: bez zmazania a bez zásahu do ponúk."""
    user.is_active = False
    user.save(update_fields=["is_active"])


class OfferHiddenFromUserTests(TestCase):
    """Samotné pravidlo: komu je ponuka neaktívneho vlastníka skrytá."""

    @classmethod
    def setUpTestData(cls):
        """Vlastník, divák a ponuka vlastníka."""
        cls.owner = _user("rule-owner")
        cls.viewer = _user("rule-viewer")
        cls.offer = _offer(cls.owner)

    def _offer_from_db(self):
        """Ponuka načítaná ako vo view: aj s vlastníkom v jednom dopyte."""
        return OfferedSkill.objects.select_related("user").get(pk=self.offer.pk)

    def test_offer_of_an_active_owner_is_visible(self):
        """Ponuka aktívneho vlastníka je viditeľná."""
        self.assertFalse(offer_hidden_from_user(self._offer_from_db(), self.viewer))

    def test_offer_of_an_inactive_owner_is_hidden_from_another_user(self):
        """Cudziemu prihlásenému divákovi je ponuka neaktívneho vlastníka skrytá."""
        _deactivate(self.owner)

        self.assertTrue(offer_hidden_from_user(self._offer_from_db(), self.viewer))

    def test_offer_of_an_inactive_owner_is_hidden_from_an_anonymous_viewer(self):
        """Neprihlásenému divákovi je ponuka neaktívneho vlastníka skrytá tiež."""
        _deactivate(self.owner)

        self.assertTrue(offer_hidden_from_user(self._offer_from_db(), AnonymousUser()))

    def test_owner_is_never_restricted_even_when_inactive(self):
        """Výnimka vlastníka platí aj pre neaktívny účet (autentifikácia ho zvyčajne odmietne)."""
        _deactivate(self.owner)

        self.assertFalse(offer_hidden_from_user(self._offer_from_db(), self.owner))


class InactiveOwnerDirectAccessTests(APITestCase):
    """Detail a lajk ponuky cudzím prihláseným divákom."""

    @classmethod
    def setUpTestData(cls):
        """Vlastník, divák a ponuka s adresami detailu a lajku."""
        cls.owner = _user("direct-owner")
        cls.viewer = _user("direct-viewer")
        cls.offer = _offer(cls.owner)
        cls.detail_url = reverse("accounts:skills_detail", args=[cls.offer.id])
        cls.like_url = reverse("accounts:offer_like", args=[cls.offer.id])

    def setUp(self):
        """Čistá cache (počítadlá obmedzenia požiadaviek) a prihlásený divák."""
        cache.clear()
        self.client.force_authenticate(user=self.viewer)

    def test_detail_of_an_inactive_owner_offer_is_not_found(self):
        """Detail ponuky neaktívneho vlastníka dá 404 ako skrytá ponuka."""
        _deactivate(self.owner)

        response = self.client.get(self.detail_url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data, DETAIL_NOT_FOUND)

    def test_inactive_owner_offer_cannot_be_liked(self):
        """Lajk ponuky neaktívneho vlastníka dá 404 a nič sa neuloží."""
        _deactivate(self.owner)

        response = self.client.post(self.like_url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data, LIKE_NOT_FOUND)
        self.assertFalse(OfferedSkillLike.objects.filter(offer=self.offer).exists())

    def test_like_made_before_the_deactivation_stays_and_cannot_be_changed(self):
        """Ako pri každej skrytej ponuke: cez API sa už nedá ani zrušiť."""
        OfferedSkillLike.objects.create(offer=self.offer, user=self.viewer)
        _deactivate(self.owner)

        response = self.client.delete(self.like_url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(
            OfferedSkillLike.objects.filter(offer=self.offer, user=self.viewer).exists()
        )

    def test_owner_deactivated_while_the_like_is_being_saved(self):
        """Súbeh: účet sa deaktivuje po prvej kontrole, ešte pred zápisom lajku.

        Ponuka sa pod zámkom načíta znova a viditeľnosť sa overí na čerstvých
        dátach, takže sa lajk neuloží.
        """

        def deactivate_before_the_reread(**_kwargs):
            """Deaktivuje účet medzi prvou kontrolou a čítaním pod zámkom."""
            User.objects.filter(pk=self.owner.pk).update(is_active=False)

        with mock.patch(
            "accounts.views.offer_likes.lock_user_pair_for_update",
            side_effect=deactivate_before_the_reread,
        ):
            response = self.client.post(self.like_url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data, LIKE_NOT_FOUND)
        self.assertFalse(OfferedSkillLike.objects.filter(offer=self.offer).exists())

    def test_responses_do_not_reveal_why_the_offer_is_hidden(self):
        """Neaktívny vlastník vyzerá ako neexistujúca ponuka aj ako každý iný dôvod."""

        def responses(offer_id):
            """Detail, lajk a zrušenie lajku jednej ponuky."""
            return (
                self.client.get(reverse("accounts:skills_detail", args=[offer_id])),
                self.client.post(reverse("accounts:offer_like", args=[offer_id])),
                self.client.delete(reverse("accounts:offer_like", args=[offer_id])),
            )

        def shape(batch):
            """Stavové kódy a telá odpovedí na porovnanie."""
            return [(response.status_code, response.data) for response in batch]

        expected = shape(responses(MISSING_OFFER_ID))
        self.assertEqual([item[0] for item in expected], [404, 404, 404])

        owner_factories = {
            "hidden offer": lambda owner, offer: OfferedSkill.objects.filter(
                pk=offer.pk
            ).update(is_hidden=True),
            "private owner": lambda owner, offer: User.objects.filter(
                pk=owner.pk
            ).update(is_public=False),
            "blocked owner": lambda owner, offer: UserBlock.objects.create(
                blocker=self.viewer, blocked_user=owner
            ),
            "inactive owner": lambda owner, offer: User.objects.filter(
                pk=owner.pk
            ).update(is_active=False),
        }
        for index, (reason, make_hidden) in enumerate(owner_factories.items()):
            with self.subTest(reason=reason):
                owner = _user(f"reason-owner-{index}")
                offer = _offer(owner)
                make_hidden(owner, offer)

                self.assertEqual(shape(responses(offer.id)), expected)
                self.assertFalse(OfferedSkillLike.objects.filter(offer=offer).exists())

    def test_offer_of_an_active_owner_stays_accessible(self):
        """Ponuka aktívneho vlastníka sa nemení: detail, lajk aj zrušenie lajku."""
        detail = self.client.get(self.detail_url)
        liked = self.client.post(self.like_url)
        unliked = self.client.delete(self.like_url)

        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        self.assertEqual(liked.status_code, status.HTTP_201_CREATED)
        self.assertEqual(liked.data["likes_count"], 1)
        self.assertEqual(unliked.status_code, status.HTTP_200_OK)
        self.assertFalse(OfferedSkillLike.objects.filter(offer=self.offer).exists())

    def test_owner_still_sees_the_own_offer(self):
        """Neaktívny účet sa zvyčajne neprihlási, preto sa výnimka skúša cez force_authenticate."""
        _deactivate(self.owner)
        self.client.force_authenticate(user=self.owner)

        response = self.client.get(self.detail_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_offer_is_accessible_again_after_the_reactivation(self):
        """Po opätovnej aktivácii účtu je ponuka znova dostupná."""
        _deactivate(self.owner)
        self.assertEqual(
            self.client.get(self.detail_url).status_code, status.HTTP_404_NOT_FOUND
        )

        User.objects.filter(pk=self.owner.pk).update(is_active=True)

        self.assertEqual(
            self.client.get(self.detail_url).status_code, status.HTTP_200_OK
        )
        self.assertEqual(
            self.client.post(self.like_url).status_code, status.HTTP_201_CREATED
        )


class InactiveOwnerUntouchedPathsTests(APITestCase):
    """Cesty, ktorých výsledok sa oprave nemá zmeniť: vyhľadávanie a zoznam lajkujúcich."""

    @classmethod
    def setUpTestData(cls):
        """Vlastník, divák a ponuka s nájditeľnou podkategóriou."""
        cls.owner = _user("paths-owner")
        cls.viewer = _user("paths-viewer")
        cls.offer = _offer(cls.owner)

    def setUp(self):
        """Čistá cache (počítadlá obmedzenia požiadaviek) a prihlásený divák."""
        cache.clear()
        self.client.force_authenticate(user=self.viewer)

    def _found_in_search(self):
        """Je ponuka vo výsledkoch vyhľadávania?"""
        response = self.client.get("/api/auth/search/", {"q": "Maliarske"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return self.offer.id in [row["id"] for row in response.data["results"]]

    def _likers_status(self):
        """Stavový kód zoznamu lajkujúcich ponuky."""
        return self.client.get(
            reverse("accounts:offer_likers", args=[self.offer.id])
        ).status_code

    def test_search_and_likers_list_follow_the_owner_state(self):
        """Vyhľadávanie aj zoznam lajkujúcich sa správajú ako doteraz."""
        self.assertTrue(self._found_in_search())
        self.assertEqual(self._likers_status(), status.HTTP_200_OK)

        _deactivate(self.owner)

        self.assertFalse(self._found_in_search())
        self.assertEqual(self._likers_status(), status.HTTP_404_NOT_FOUND)

    def test_skill_request_for_an_inactive_owner_offer_is_still_refused(self):
        """Žiadosť o ponuku neaktívneho vlastníka ostáva zamietnutá ako doteraz."""
        url = reverse("accounts:skill_requests")
        created = self.client.post(url, {"offer_id": self.offer.id}, format="json")
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        SkillRequest.objects.all().delete()

        _deactivate(self.owner)
        refused = self.client.post(url, {"offer_id": self.offer.id}, format="json")

        self.assertEqual(refused.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("offer_id", refused.data)
        self.assertFalse(SkillRequest.objects.exists())


class InactiveOwnerReviewPathsTests(APITestCase):
    """Recenzie ponuky používajú ten istý pomocník, takže ich 404 sleduje vlastníka."""

    @classmethod
    def setUpTestData(cls):
        """Vlastník, autor recenzie, divák, ponuka a recenzia s adresami."""
        cls.owner = _user("review-owner")
        cls.reviewer = _user("review-writer")
        cls.viewer = _user("review-viewer")
        cls.offer = _offer(cls.owner)
        cls.review = Review.objects.create(
            reviewer=cls.reviewer,
            offer=cls.offer,
            rating=Decimal("4.0"),
            text="Spokojnosť",
        )
        cls.list_url = reverse("accounts:reviews_list", args=[cls.offer.id])
        cls.detail_url = reverse("accounts:review_detail", args=[cls.review.id])
        cls.like_url = reverse("accounts:review_like", args=[cls.review.id])

    def setUp(self):
        """Čistá cache (počítadlá obmedzenia požiadaviek) a prihlásený divák."""
        cache.clear()
        self.client.force_authenticate(user=self.viewer)

    def test_reviews_of_an_active_owner_offer_are_available(self):
        """Recenzie ponuky aktívneho vlastníka sú dostupné."""
        self.assertEqual(self.client.get(self.list_url).status_code, status.HTTP_200_OK)
        self.assertEqual(
            self.client.get(self.detail_url).status_code, status.HTTP_200_OK
        )
        self.assertEqual(
            self.client.post(self.like_url).status_code, status.HTTP_201_CREATED
        )

    def test_reviews_of_an_inactive_owner_offer_are_not_found(self):
        """Zoznam aj detail recenzie dajú 404 s rovnakým telom ako neexistujúce id."""
        missing_list = self.client.get(
            reverse("accounts:reviews_list", args=[MISSING_OFFER_ID])
        )
        missing_detail = self.client.get(
            reverse("accounts:review_detail", args=[MISSING_REVIEW_ID])
        )
        self.assertEqual(missing_list.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(missing_detail.status_code, status.HTTP_404_NOT_FOUND)
        _deactivate(self.owner)

        listing = self.client.get(self.list_url)
        detail = self.client.get(self.detail_url)

        self.assertEqual(listing.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(detail.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(listing.data, missing_list.data)
        self.assertEqual(detail.data, missing_detail.data)

    def test_review_of_an_inactive_owner_offer_cannot_be_liked(self):
        """Lajk recenzie dá 404 s rovnakým telom ako neexistujúce id a nič sa neuloží."""
        missing = self.client.post(
            reverse("accounts:review_like", args=[MISSING_REVIEW_ID])
        )
        self.assertEqual(missing.status_code, status.HTTP_404_NOT_FOUND)
        _deactivate(self.owner)

        response = self.client.post(self.like_url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data, missing.data)
        self.assertFalse(ReviewLike.objects.filter(review=self.review).exists())
