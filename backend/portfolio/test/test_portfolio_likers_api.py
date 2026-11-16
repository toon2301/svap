"""Zoznam ľudí, čo dali lajk položke portfólia (nález 262, rozhodnutie R20 variant A).

Pravidlá lajkujúcich sú rovnaké ako na Nástenke (`_likers_response`): súkromný a
neaktívny účet sa nezobrazí, prihlásený vidí vždy seba a blok sa rešpektuje
obojsmerne len voči konkrétnemu divákovi. Portfólio vidí len prihlásený, preto
neprihlásený dostane 401. Viditeľnosť samotnej položky je rovnaká ako pri lajku
(`_get_likeable_portfolio_item`): neverejný alebo neaktívny vlastník, blok medzi
divákom a vlastníkom a titulná fotka čakajúca na schválenie dajú 404 rovnakého
tvaru, nič neprezradia. Vlastník vidí všetko.
"""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import UserBlock
from portfolio.models import PortfolioImage, PortfolioItem, PortfolioItemLike

User = get_user_model()

NOT_FOUND_BODY = {
    "error": "Polozka portfolia nebola najdena",
    "code": "portfolio_item_not_found",
}
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


def _item(owner, **overrides):
    """Položka portfólia vlastníka (bez titulnej fotky, teda viditeľná)."""
    data = {
        "owner": owner,
        "title": "Položka na zoznam lajkov",
        "category": "Remeslo",
        "description": "Popis položky",
        "sort_order": 0,
    }
    data.update(overrides)
    return PortfolioItem.objects.create(**data)


def _cover(item, *, approved):
    """Titulná fotka položky: schválená, alebo čakajúca na spracovanie."""
    data = {"item": item, "order": 0, "width": 1200, "height": 800}
    if approved:
        data.update(
            status=PortfolioImage.Status.APPROVED,
            approved_key=f"portfolio/{item.id}/cover.webp",
            thumbnail_key=f"portfolio/{item.id}/cover-thumb.webp",
        )
    else:
        data.update(status=PortfolioImage.Status.PENDING)
    image = PortfolioImage.objects.create(**data)
    item.cover_image = image
    item.save(update_fields=["cover_image", "updated_at"])
    return image


def _space_likes(item):
    """Rozostúpi `created_at` lajkov po minúte v poradí vzniku.

    Pri zhodnom `created_at` prejde cursor do offsetového režimu a test by
    meral rozlíšenie hodín, nie stránkovanie ani poradie.
    """
    base = timezone.now() - timedelta(hours=2)
    likes = list(PortfolioItemLike.objects.filter(item=item).order_by("id"))
    for index, like in enumerate(likes):
        like.created_at = base + timedelta(minutes=index)
    PortfolioItemLike.objects.bulk_update(likes, ["created_at"])


def _ids(response):
    """Identifikátory lajkujúcich z jednej stránky odpovede."""
    return [entry["id"] for entry in response.data["results"]]


def _url(item_id):
    """Adresa zoznamu lajkujúcich položky."""
    return reverse("accounts:portfolio_likers", args=[item_id])


class PortfolioLikersListTests(APITestCase):
    """Tvar zoznamu: poradie, polia, prístup a len čítanie."""

    @classmethod
    def setUpTestData(cls):
        """Položka s dvoma lajkmi (druhý je novší) a druhá položka s vlastným lajkom."""
        cls.owner = _user("pflk-owner")
        cls.item = _item(cls.owner)
        cls.first = _user("pflk-first")
        cls.second = _user("pflk-second")
        cls.viewer = _user("pflk-viewer")
        PortfolioItemLike.objects.create(item=cls.item, user=cls.first)
        PortfolioItemLike.objects.create(item=cls.item, user=cls.second)
        _space_likes(cls.item)
        cls.url = _url(cls.item.id)
        # Lajkujúci druhej položky sa do zoznamu prvej nesmie dostať.
        cls.other_item = _item(cls.owner, title="Iná položka", sort_order=1)
        cls.stranger = _user("pflk-stranger")
        PortfolioItemLike.objects.create(item=cls.other_item, user=cls.stranger)

    def setUp(self):
        """Každý test začína ako prihlásený divák."""
        self.client.force_authenticate(user=self.viewer)

    def test_lists_likers_newest_first(self):
        """Najnovší lajk je prvý."""
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(_ids(response), [self.second.id, self.first.id])

    def test_lists_only_the_likers_of_that_item(self):
        """Zoznam obsahuje len lajkujúcich tejto položky, nie lajky inej položky."""
        self.assertNotIn(self.stranger.id, _ids(self.client.get(self.url)))
        self.assertEqual(
            _ids(self.client.get(_url(self.other_item.id))), [self.stranger.id]
        )

    def test_entry_has_exactly_the_summary_fields(self):
        """Položka nesie presne päť polí a nič navyše."""
        entry = self.client.get(self.url).data["results"][0]

        self.assertEqual(set(entry), SUMMARY_FIELDS)

    def test_response_has_the_cursor_envelope(self):
        """Odpoveď má tvar `results`, `next`, `previous` ako na Nástenke."""
        data = self.client.get(self.url).data

        self.assertEqual(set(data), {"next", "previous", "results"})

    def test_anonymous_is_unauthorized(self):
        """Portfólio vidí len prihlásený, neprihlásený dostane 401 a žiadne dáta."""
        self.client.force_authenticate(user=None)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertNotIn("results", response.data)

    def test_owner_sees_the_list(self):
        """Vlastník položky zoznam vidí."""
        self.client.force_authenticate(user=self.owner)

        self.assertEqual(
            _ids(self.client.get(self.url)), [self.second.id, self.first.id]
        )

    def test_endpoint_is_read_only(self):
        """Na adrese zoznamu sa nedá zapisovať."""
        for method in (self.client.post, self.client.put, self.client.delete):
            self.assertEqual(
                method(self.url).status_code, status.HTTP_405_METHOD_NOT_ALLOWED
            )
        self.assertEqual(PortfolioItemLike.objects.filter(item=self.item).count(), 2)


class PortfolioLikersPaginationTests(APITestCase):
    """Stránkovanie kurzorom: 20 na stránku, najviac 50 cez `page_size`."""

    @classmethod
    def setUpTestData(cls):
        """Položka s päťdesiatimi piatimi lajkami."""
        cls.owner = _user("pfpg-owner")
        cls.viewer = _user("pfpg-viewer")
        cls.item = _item(cls.owner)
        cls.likers = [_user(f"pfpg-liker-{index}") for index in range(55)]
        PortfolioItemLike.objects.bulk_create(
            [PortfolioItemLike(item=cls.item, user=user) for user in cls.likers]
        )
        _space_likes(cls.item)
        cls.url = _url(cls.item.id)

    def setUp(self):
        """Každý test začína ako prihlásený divák."""
        self.client.force_authenticate(user=self.viewer)

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
        """Väčšie `page_size` sa zreže na päťdesiat."""
        response = self.client.get(f"{self.url}?page_size=100")

        self.assertEqual(len(response.data["results"]), 50)
        self.assertIsNotNone(response.data["next"])

    def test_smaller_page_size_is_respected(self):
        """Menšie `page_size` sa dodrží."""
        response = self.client.get(f"{self.url}?page_size=5")

        self.assertEqual(len(response.data["results"]), 5)


class PortfolioLikersQueryCountTests(APITestCase):
    """Počet dotazov nezávisí od počtu lajkujúcich."""

    def _item_with_likers(self, name, count):
        """Položka s daným počtom lajkujúcich a jej adresa zoznamu."""
        item = _item(_user(f"{name}-owner"))
        PortfolioItemLike.objects.bulk_create(
            [
                PortfolioItemLike(item=item, user=_user(f"{name}-liker-{index}"))
                for index in range(count)
            ]
        )
        _space_likes(item)
        return _url(item.id)

    def _queries(self, url):
        """Počet dotazov jedného volania po zahriatí (prvé volanie môže plniť cache)."""
        self.client.get(url)
        with CaptureQueriesContext(connection) as captured:
            self.assertEqual(self.client.get(url).status_code, status.HTTP_200_OK)
        return len(captured)

    def test_query_count_is_constant(self):
        """Dva a dvanásť lajkov dajú rovnaký počet dotazov (aj s blokmi v hre)."""
        small = self._item_with_likers("qc-small", 2)
        large = self._item_with_likers("qc-large", 12)
        self.client.force_authenticate(user=_user("qc-viewer"))

        self.assertEqual(self._queries(small), self._queries(large))


class PortfolioLikersPrivacyTests(APITestCase):
    """Skrytí lajkujúci: súkromný, neaktívny a blokovaný."""

    def setUp(self):
        """Položka a štyria lajkujúci: verejný, súkromný, neaktívny a divák."""
        self.owner = _user("pfpv-owner")
        self.item = _item(self.owner)
        self.public_liker = _user("pfpv-public")
        self.private_liker = _user("pfpv-private", is_public=False)
        self.inactive_liker = _user("pfpv-inactive")
        self.bystander = _user("pfpv-bystander")
        for user in (self.public_liker, self.private_liker, self.inactive_liker):
            PortfolioItemLike.objects.create(item=self.item, user=user)
        self.inactive_liker.is_active = False
        self.inactive_liker.save(update_fields=["is_active"])
        _space_likes(self.item)
        self.url = _url(self.item.id)

    def test_private_and_inactive_likers_are_hidden_from_others(self):
        """Prihlásený divák vidí len verejného a aktívneho lajkujúceho."""
        self.client.force_authenticate(user=self.bystander)

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


class PortfolioLikersVisibilityTests(APITestCase):
    """Viditeľnosť položky: všade, kde je skrytá, je to 404 rovnakého tvaru."""

    def setUp(self):
        """Položka s jedným lajkom, vlastník a dvaja diváci."""
        self.owner = _user("pfvis-owner")
        self.item = _item(self.owner)
        self.liker = _user("pfvis-liker")
        self.viewer = _user("pfvis-viewer")
        self.other = _user("pfvis-other")
        PortfolioItemLike.objects.create(item=self.item, user=self.liker)
        self.url = _url(self.item.id)

    def _assert_not_found(self, response):
        """404 s presne rovnakým telom ako pri lajku položky."""
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data, NOT_FOUND_BODY)

    def test_unknown_item_is_not_found(self):
        """Neexistujúce id dá 404."""
        self.client.force_authenticate(user=self.viewer)

        self._assert_not_found(self.client.get(_url(999999)))

    def test_item_without_cover_is_visible(self):
        """Položka bez titulnej fotky je pre diváka viditeľná."""
        self.client.force_authenticate(user=self.viewer)

        self.assertEqual(_ids(self.client.get(self.url)), [self.liker.id])

    def test_item_with_approved_cover_is_visible(self):
        """Položka so schválenou titulnou fotkou je pre diváka viditeľná."""
        _cover(self.item, approved=True)
        self.client.force_authenticate(user=self.viewer)

        self.assertEqual(_ids(self.client.get(self.url)), [self.liker.id])

    def test_pending_cover_hides_the_item_but_not_from_the_owner(self):
        """Titulná fotka čakajúca na schválenie skryje položku všetkým okrem vlastníka."""
        _cover(self.item, approved=False)

        self.client.force_authenticate(user=self.viewer)
        self._assert_not_found(self.client.get(self.url))
        self.client.force_authenticate(user=self.owner)
        self.assertEqual(_ids(self.client.get(self.url)), [self.liker.id])

    def test_private_owner_hides_the_item_but_not_from_the_owner(self):
        """Položka neverejného vlastníka je pre ostatných 404, vlastník ju vidí."""
        self.owner.is_public = False
        self.owner.save(update_fields=["is_public"])

        self.client.force_authenticate(user=self.viewer)
        self._assert_not_found(self.client.get(self.url))
        self.client.force_authenticate(user=self.owner)
        self.assertEqual(_ids(self.client.get(self.url)), [self.liker.id])

    def test_inactive_owner_is_not_found(self):
        """Neaktívny vlastník skryje položku aj jej zoznam."""
        self.owner.is_active = False
        self.owner.save(update_fields=["is_active"])
        self.client.force_authenticate(user=self.viewer)

        self._assert_not_found(self.client.get(self.url))

    def test_block_between_viewer_and_owner_hides_the_item(self):
        """Blok v ktoromkoľvek smere skryje položku len tomu divákovi."""
        UserBlock.objects.create(blocker=self.viewer, blocked_user=self.owner)
        UserBlock.objects.create(blocker=self.owner, blocked_user=self.other)

        for blocked_viewer in (self.viewer, self.other):
            self.client.force_authenticate(user=blocked_viewer)
            self._assert_not_found(self.client.get(self.url))

        self.client.force_authenticate(user=self.liker)
        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_200_OK)

    def test_not_found_looks_the_same_for_every_reason(self):
        """Žiadny dôvod 404 sa z odpovede nedá rozlíšiť od neexistujúcej položky."""
        self.client.force_authenticate(user=self.viewer)
        bodies = [self.client.get(_url(999999)).data]
        _cover(self.item, approved=False)
        bodies.append(self.client.get(self.url).data)
        self.owner.is_public = False
        self.owner.save(update_fields=["is_public"])
        bodies.append(self.client.get(self.url).data)
        self.owner.is_active = False
        self.owner.save(update_fields=["is_active"])
        bodies.append(self.client.get(self.url).data)

        self.assertTrue(all(body == bodies[0] for body in bodies))
        self.assertEqual(bodies[0], NOT_FOUND_BODY)
