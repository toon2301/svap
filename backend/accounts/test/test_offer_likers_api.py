"""Zoznam ľudí, čo dali lajk ponuke (nález 262, rozhodnutie R20 variant A).

Pravidlá lajkujúcich sú rovnaké ako na Nástenke (`_likers_response`): súkromný a
neaktívny účet sa nezobrazí, prihlásený vidí vždy seba a blok sa rešpektuje
obojsmerne len voči konkrétnemu divákovi. Navyše platí viditeľnosť samotnej
ponuky: skrytá ponuka, neverejný alebo neaktívny vlastník a blok medzi divákom
a vlastníkom dajú 404 rovnakého tvaru ako lajk ponuky, nič neprezradia.
"""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import OfferedSkill, OfferedSkillLike, UserBlock

User = get_user_model()

NOT_FOUND_BODY = {"error": "Ponuka nebola najdena"}
SUMMARY_FIELDS = {"id", "display_name", "slug", "user_type", "avatar_url"}


def _user(name, *, is_public=True, is_active=True):
    """Účet bez hesla: vytvorí sa rýchlo a prihlasuje sa cez force_authenticate."""
    return User.objects.create_user(
        username=name,
        email=f"{name}@example.com",
        password=None,
        is_public=is_public,
        is_active=is_active,
    )


def _offer(owner, **overrides):
    """Verejná ponuka vlastníka; polia sa dajú prepísať."""
    data = {
        "user": owner,
        "category": "Remeslo",
        "subcategory": "Maliarske práce",
        "description": "Ponuka na zoznam lajkov",
        "detailed_description": "Podrobnosti ponuky",
        "is_hidden": False,
    }
    data.update(overrides)
    return OfferedSkill.objects.create(**data)


def _space_likes(offer):
    """Rozostúpi `created_at` lajkov po minúte v poradí vzniku.

    Pri zhodnom `created_at` prejde cursor do offsetového režimu a test by
    meral rozlíšenie hodín, nie stránkovanie ani poradie.
    """
    base = timezone.now() - timedelta(hours=2)
    likes = list(OfferedSkillLike.objects.filter(offer=offer).order_by("id"))
    for index, like in enumerate(likes):
        like.created_at = base + timedelta(minutes=index)
    OfferedSkillLike.objects.bulk_update(likes, ["created_at"])


def _ids(response):
    """Identifikátory lajkujúcich z jednej stránky odpovede."""
    return [item["id"] for item in response.data["results"]]


class OfferLikersListTests(APITestCase):
    """Tvar zoznamu: poradie, polia, verejný prístup a len čítanie."""

    @classmethod
    def setUpTestData(cls):
        """Ponuka s dvoma lajkmi, druhý je novší."""
        cls.owner = _user("offlk-owner")
        cls.offer = _offer(cls.owner)
        cls.first = _user("offlk-first")
        cls.second = _user("offlk-second")
        OfferedSkillLike.objects.create(offer=cls.offer, user=cls.first)
        OfferedSkillLike.objects.create(offer=cls.offer, user=cls.second)
        _space_likes(cls.offer)
        cls.url = reverse("accounts:offer_likers", args=[cls.offer.id])
        # Druhá ponuka s vlastným lajkom: jej lajkujúci sa do prvého zoznamu nesmú dostať.
        cls.other_offer = _offer(cls.owner, subcategory="Iná ponuka")
        cls.stranger = _user("offlk-stranger")
        OfferedSkillLike.objects.create(offer=cls.other_offer, user=cls.stranger)

    def test_lists_likers_newest_first(self):
        """Najnovší lajk je prvý."""
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(_ids(response), [self.second.id, self.first.id])

    def test_lists_only_the_likers_of_that_offer(self):
        """Zoznam obsahuje len lajkujúcich tejto ponuky, nie lajky iných ponúk."""
        other_url = reverse("accounts:offer_likers", args=[self.other_offer.id])

        self.assertNotIn(self.stranger.id, _ids(self.client.get(self.url)))
        self.assertEqual(_ids(self.client.get(other_url)), [self.stranger.id])

    def test_entry_has_exactly_the_summary_fields(self):
        """Položka nesie presne päť polí a nič navyše."""
        entry = self.client.get(self.url).data["results"][0]

        self.assertEqual(set(entry), SUMMARY_FIELDS)

    def test_response_has_the_cursor_envelope(self):
        """Odpoveď má tvar `results`, `next`, `previous` ako na Nástenke."""
        data = self.client.get(self.url).data

        self.assertEqual(set(data), {"next", "previous", "results"})

    def test_anonymous_sees_the_list(self):
        """Ponuku vidí aj neprihlásený (je vo verejnom vyhľadávaní), teda aj zoznam."""
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 2)

    def test_owner_sees_the_list(self):
        """Vlastník ponuky zoznam vidí."""
        self.client.force_authenticate(user=self.owner)

        self.assertEqual(
            _ids(self.client.get(self.url)), [self.second.id, self.first.id]
        )

    def test_endpoint_is_read_only(self):
        """Na adrese zoznamu sa nedá zapisovať."""
        self.client.force_authenticate(user=self.first)

        for method in (self.client.post, self.client.put, self.client.delete):
            self.assertEqual(
                method(self.url).status_code, status.HTTP_405_METHOD_NOT_ALLOWED
            )
        self.assertEqual(OfferedSkillLike.objects.filter(offer=self.offer).count(), 2)


class OfferLikersPaginationTests(APITestCase):
    """Stránkovanie kurzorom: 20 na stránku, najviac 50 cez `page_size`."""

    @classmethod
    def setUpTestData(cls):
        """Ponuka s päťdesiatimi piatimi lajkami."""
        cls.owner = _user("offpg-owner")
        cls.offer = _offer(cls.owner)
        cls.likers = [_user(f"offpg-liker-{index}") for index in range(55)]
        OfferedSkillLike.objects.bulk_create(
            [OfferedSkillLike(offer=cls.offer, user=user) for user in cls.likers]
        )
        _space_likes(cls.offer)
        cls.url = reverse("accounts:offer_likers", args=[cls.offer.id])

    def _relative(self, absolute_url):
        """Odkaz `next` ako relatívna adresa, ktorú vie zavolať testovací klient."""
        return "/api" + absolute_url.split("/api", 1)[1]

    def test_default_page_has_twenty_and_a_next_link(self):
        """Prvá stránka má dvadsať položiek a odkaz na ďalšiu."""
        response = self.client.get(self.url)

        self.assertEqual(len(response.data["results"]), 20)
        self.assertIsNotNone(response.data["next"])
        self.assertIsNone(response.data["previous"])

    def test_next_links_walk_the_whole_list_once(self):
        """Cez odkazy `next` sa prejdú všetci presne raz a v poradí od najnovšieho."""
        collected = []
        url = self.url
        pages = 0
        while url and pages < 10:
            response = self.client.get(url)
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            collected.extend(_ids(response))
            next_url = response.data["next"]
            url = self._relative(next_url) if next_url else None
            pages += 1

        self.assertEqual(pages, 3)
        self.assertEqual(collected, [user.id for user in reversed(self.likers)])

    def test_page_size_is_capped_at_fifty(self):
        """Väčšie `page_size` sa zrezá na päťdesiat."""
        response = self.client.get(f"{self.url}?page_size=100")

        self.assertEqual(len(response.data["results"]), 50)
        self.assertIsNotNone(response.data["next"])

    def test_smaller_page_size_is_respected(self):
        """Menšie `page_size` sa dodrží."""
        response = self.client.get(f"{self.url}?page_size=5")

        self.assertEqual(len(response.data["results"]), 5)


class OfferLikersQueryCountTests(APITestCase):
    """Počet dotazov nezávisí od počtu lajkujúcich."""

    def _offer_with_likers(self, name, count):
        """Ponuka s daným počtom lajkujúcich a jej adresa zoznamu."""
        offer = _offer(_user(f"{name}-owner"))
        OfferedSkillLike.objects.bulk_create(
            [
                OfferedSkillLike(offer=offer, user=_user(f"{name}-liker-{index}"))
                for index in range(count)
            ]
        )
        _space_likes(offer)
        return reverse("accounts:offer_likers", args=[offer.id])

    def _queries(self, url):
        """Počet dotazov jedného volania po zahriatí (prvé volanie môže plniť cache)."""
        self.client.get(url)
        with CaptureQueriesContext(connection) as captured:
            self.assertEqual(self.client.get(url).status_code, status.HTTP_200_OK)
        return len(captured)

    def test_anonymous_query_count_is_constant(self):
        """Neprihlásený: dva a dvanásť lajkov dajú rovnaký počet dotazov."""
        small = self._offer_with_likers("qc-small", 2)
        large = self._offer_with_likers("qc-large", 12)

        self.assertEqual(self._queries(small), self._queries(large))

    def test_authenticated_query_count_is_constant(self):
        """Prihlásený (s blokmi v hre): rovnaký počet dotazov pri rôznom počte lajkov."""
        small = self._offer_with_likers("qa-small", 2)
        large = self._offer_with_likers("qa-large", 12)
        self.client.force_authenticate(user=_user("qa-viewer"))

        self.assertEqual(self._queries(small), self._queries(large))


class OfferLikersPrivacyTests(APITestCase):
    """Skrytí lajkujúci: súkromný, neaktívny a blokovaný."""

    def setUp(self):
        """Ponuka a štyria lajkujúci: verejný, súkromný, neaktívny a divák."""
        self.owner = _user("offpv-owner")
        self.offer = _offer(self.owner)
        self.public_liker = _user("offpv-public")
        self.private_liker = _user("offpv-private", is_public=False)
        self.inactive_liker = _user("offpv-inactive")
        self.bystander = _user("offpv-bystander")
        for user in (self.public_liker, self.private_liker, self.inactive_liker):
            OfferedSkillLike.objects.create(offer=self.offer, user=user)
        self.inactive_liker.is_active = False
        self.inactive_liker.save(update_fields=["is_active"])
        _space_likes(self.offer)
        self.url = reverse("accounts:offer_likers", args=[self.offer.id])

    def test_private_and_inactive_likers_are_hidden_from_others(self):
        """Prihlásený divák vidí len verejného a aktívneho lajkujúceho."""
        self.client.force_authenticate(user=self.bystander)

        self.assertEqual(_ids(self.client.get(self.url)), [self.public_liker.id])

    def test_private_and_inactive_likers_are_hidden_from_anonymous(self):
        """Neprihlásený vidí len verejného a aktívneho lajkujúceho."""
        self.assertEqual(_ids(self.client.get(self.url)), [self.public_liker.id])

    def test_private_liker_sees_themselves(self):
        """Súkromný lajkujúci vidí v zozname seba, ale nie neaktívneho."""
        self.client.force_authenticate(user=self.private_liker)

        self.assertEqual(
            _ids(self.client.get(self.url)),
            [self.private_liker.id, self.public_liker.id],
        )

    def test_blocked_liker_is_hidden_from_that_viewer_only(self):
        """Blok skryje lajkujúceho len pred tým, kto blokoval; vlastník ho vidí."""
        UserBlock.objects.create(blocker=self.bystander, blocked_user=self.public_liker)

        self.client.force_authenticate(user=self.bystander)
        self.assertEqual(_ids(self.client.get(self.url)), [])

        self.client.force_authenticate(user=self.owner)
        self.assertEqual(_ids(self.client.get(self.url)), [self.public_liker.id])

    def test_block_works_in_the_other_direction_too(self):
        """Ak blokoval lajkujúci diváka, divák ho tiež nevidí."""
        UserBlock.objects.create(blocker=self.public_liker, blocked_user=self.bystander)
        self.client.force_authenticate(user=self.bystander)

        self.assertEqual(_ids(self.client.get(self.url)), [])


class OfferLikersVisibilityTests(APITestCase):
    """Viditeľnosť ponuky: všade, kde je skrytá, je to 404 rovnakého tvaru."""

    def setUp(self):
        """Ponuka s jedným lajkom, vlastník a dvaja diváci."""
        self.owner = _user("offvis-owner")
        self.offer = _offer(self.owner)
        self.liker = _user("offvis-liker")
        self.viewer = _user("offvis-viewer")
        self.other = _user("offvis-other")
        OfferedSkillLike.objects.create(offer=self.offer, user=self.liker)
        self.url = reverse("accounts:offer_likers", args=[self.offer.id])

    def _assert_not_found(self, response):
        """404 s presne rovnakým telom ako pri lajku ponuky."""
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data, NOT_FOUND_BODY)

    def test_unknown_offer_is_not_found(self):
        """Neexistujúce id dá 404."""
        response = self.client.get(reverse("accounts:offer_likers", args=[999999]))

        self._assert_not_found(response)

    def test_hidden_offer_is_not_found_but_the_owner_sees_it(self):
        """Skrytú ponuku a jej zoznam vidí len vlastník."""
        self.offer.is_hidden = True
        self.offer.save(update_fields=["is_hidden"])

        self._assert_not_found(self.client.get(self.url))
        self.client.force_authenticate(user=self.viewer)
        self._assert_not_found(self.client.get(self.url))
        self.client.force_authenticate(user=self.owner)
        self.assertEqual(_ids(self.client.get(self.url)), [self.liker.id])

    def test_private_owner_hides_the_offer_but_not_from_the_owner(self):
        """Ponuka neverejného vlastníka je pre ostatných 404, vlastník ju vidí."""
        self.owner.is_public = False
        self.owner.save(update_fields=["is_public"])

        self._assert_not_found(self.client.get(self.url))
        self.client.force_authenticate(user=self.viewer)
        self._assert_not_found(self.client.get(self.url))
        self.client.force_authenticate(user=self.owner)
        self.assertEqual(_ids(self.client.get(self.url)), [self.liker.id])

    def test_inactive_owner_is_not_found(self):
        """Neaktívny vlastník skryje ponuku aj jej zoznam, hoci pomocník to nekontroluje."""
        self.owner.is_active = False
        self.owner.save(update_fields=["is_active"])

        self._assert_not_found(self.client.get(self.url))
        self.client.force_authenticate(user=self.viewer)
        self._assert_not_found(self.client.get(self.url))

    def test_block_between_viewer_and_owner_hides_the_offer(self):
        """Blok v ktoromkoľvek smere skryje ponuku len tomu divákovi."""
        UserBlock.objects.create(blocker=self.viewer, blocked_user=self.owner)
        UserBlock.objects.create(blocker=self.owner, blocked_user=self.other)

        for blocked_viewer in (self.viewer, self.other):
            self.client.force_authenticate(user=blocked_viewer)
            self._assert_not_found(self.client.get(self.url))

        self.client.force_authenticate(user=self.liker)
        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_200_OK)

    def test_not_found_looks_the_same_for_every_reason(self):
        """Žiadny dôvod 404 sa z odpovede nedá rozlíšiť od neexistujúcej ponuky."""
        bodies = [self.client.get(reverse("accounts:offer_likers", args=[999999])).data]
        self.offer.is_hidden = True
        self.offer.save(update_fields=["is_hidden"])
        bodies.append(self.client.get(self.url).data)
        self.offer.is_hidden = False
        self.offer.save(update_fields=["is_hidden"])
        self.owner.is_active = False
        self.owner.save(update_fields=["is_active"])
        bodies.append(self.client.get(self.url).data)

        self.assertTrue(all(body == bodies[0] for body in bodies))
        self.assertEqual(bodies[0], NOT_FOUND_BODY)
