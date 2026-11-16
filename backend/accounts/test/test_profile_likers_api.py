"""Zoznam ľudí, čo dali lajk profilu (nález 262, rozhodnutie R20 variant A).

Pravidlá lajkujúcich sú rovnaké ako na Nástenke (`_likers_response`): súkromný a
neaktívny účet sa nezobrazí, prihlásený vidí vždy seba a blok sa rešpektuje
obojsmerne len voči konkrétnemu divákovi. Profil vidí len prihlásený, preto
neprihlásený dostane 401. Viditeľnosť samotného profilu je rovnaká ako pri jeho
lajkovaní (`profile_like_view`): neexistujúci alebo neaktívny účet, blok medzi
divákom a vlastníkom a neverejný profil dajú 404 rovnakého tvaru, nič
neprezradia. Vlastník vidí zoznam vždy.
"""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import ProfileLike, UserBlock

User = get_user_model()

NOT_FOUND_BODY = {"error": "Pouzivatel nebol najdeny"}
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


def _space_likes(profile_user):
    """Rozostúpi `created_at` lajkov profilu po minúte v poradí vzniku.

    Pri zhodnom `created_at` prejde cursor do offsetového režimu a test by
    meral rozlíšenie hodín, nie stránkovanie ani poradie.
    """
    base = timezone.now() - timedelta(hours=2)
    likes = list(ProfileLike.objects.filter(profile_user=profile_user).order_by("id"))
    for index, like in enumerate(likes):
        like.created_at = base + timedelta(minutes=index)
    ProfileLike.objects.bulk_update(likes, ["created_at"])


def _ids(response):
    """Identifikátory lajkujúcich z jednej stránky odpovede."""
    return [entry["id"] for entry in response.data["results"]]


def _url(user_id):
    """Adresa zoznamu lajkujúcich profilu používateľa."""
    return reverse("accounts:dashboard_user_profile_likers", args=[user_id])


class ProfileLikersListTests(APITestCase):
    """Tvar zoznamu: poradie, polia, prístup a len čítanie."""

    @classmethod
    def setUpTestData(cls):
        """Profil s dvoma lajkmi (druhý je novší) a druhý profil s vlastným lajkom."""
        cls.owner = _user("prlk-owner")
        cls.first = _user("prlk-first")
        cls.second = _user("prlk-second")
        cls.viewer = _user("prlk-viewer")
        ProfileLike.objects.create(profile_user=cls.owner, user=cls.first)
        ProfileLike.objects.create(profile_user=cls.owner, user=cls.second)
        _space_likes(cls.owner)
        cls.url = _url(cls.owner.id)
        # Lajkujúci iného profilu sa do zoznamu tohto profilu nesmie dostať.
        cls.other_profile = _user("prlk-other-profile")
        cls.stranger = _user("prlk-stranger")
        ProfileLike.objects.create(profile_user=cls.other_profile, user=cls.stranger)

    def setUp(self):
        """Každý test začína ako prihlásený divák."""
        self.client.force_authenticate(user=self.viewer)

    def test_lists_likers_newest_first(self):
        """Najnovší lajk je prvý."""
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(_ids(response), [self.second.id, self.first.id])

    def test_lists_only_the_likers_of_that_profile(self):
        """Zoznam obsahuje len lajkujúcich tohto profilu, nie lajky iného profilu."""
        self.assertNotIn(self.stranger.id, _ids(self.client.get(self.url)))
        self.assertEqual(
            _ids(self.client.get(_url(self.other_profile.id))), [self.stranger.id]
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
        """Profil vidí len prihlásený, neprihlásený dostane 401 a žiadne dáta."""
        self.client.force_authenticate(user=None)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertNotIn("results", response.data)

    def test_owner_sees_the_list(self):
        """Vlastník profilu zoznam vidí."""
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
        self.assertEqual(ProfileLike.objects.filter(profile_user=self.owner).count(), 2)


class ProfileLikersPaginationTests(APITestCase):
    """Stránkovanie kurzorom: 20 na stránku, najviac 50 cez `page_size`."""

    @classmethod
    def setUpTestData(cls):
        """Profil s päťdesiatimi piatimi lajkami."""
        cls.owner = _user("prpg-owner")
        cls.viewer = _user("prpg-viewer")
        cls.likers = [_user(f"prpg-liker-{index}") for index in range(55)]
        ProfileLike.objects.bulk_create(
            [ProfileLike(profile_user=cls.owner, user=user) for user in cls.likers]
        )
        _space_likes(cls.owner)
        cls.url = _url(cls.owner.id)

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


class ProfileLikersQueryCountTests(APITestCase):
    """Počet dotazov nezávisí od počtu lajkujúcich."""

    def _profile_with_likers(self, name, count):
        """Profil s daným počtom lajkujúcich a jeho adresa zoznamu."""
        owner = _user(f"{name}-owner")
        ProfileLike.objects.bulk_create(
            [
                ProfileLike(profile_user=owner, user=_user(f"{name}-liker-{index}"))
                for index in range(count)
            ]
        )
        _space_likes(owner)
        return _url(owner.id)

    def _queries(self, url):
        """Počet dotazov jedného volania po zahriatí (prvé volanie môže plniť cache)."""
        self.client.get(url)
        with CaptureQueriesContext(connection) as captured:
            self.assertEqual(self.client.get(url).status_code, status.HTTP_200_OK)
        return len(captured)

    def test_query_count_is_constant(self):
        """Dva a dvanásť lajkov dajú rovnaký počet dotazov (aj s blokmi v hre)."""
        small = self._profile_with_likers("qc-small", 2)
        large = self._profile_with_likers("qc-large", 12)
        self.client.force_authenticate(user=_user("qc-viewer"))

        self.assertEqual(self._queries(small), self._queries(large))


class ProfileLikersPrivacyTests(APITestCase):
    """Skrytí lajkujúci: súkromný, neaktívny a blokovaný."""

    def setUp(self):
        """Profil a štyria lajkujúci: verejný, súkromný, neaktívny a divák."""
        self.owner = _user("prpv-owner")
        self.public_liker = _user("prpv-public")
        self.private_liker = _user("prpv-private", is_public=False)
        self.inactive_liker = _user("prpv-inactive")
        self.bystander = _user("prpv-bystander")
        for user in (self.public_liker, self.private_liker, self.inactive_liker):
            ProfileLike.objects.create(profile_user=self.owner, user=user)
        self.inactive_liker.is_active = False
        self.inactive_liker.save(update_fields=["is_active"])
        _space_likes(self.owner)
        self.url = _url(self.owner.id)

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


class ProfileLikersVisibilityTests(APITestCase):
    """Viditeľnosť profilu: všade, kde je skrytý, je to 404 rovnakého tvaru."""

    def setUp(self):
        """Profil s jedným lajkom, vlastník a dvaja diváci."""
        self.owner = _user("prvis-owner")
        self.liker = _user("prvis-liker")
        self.viewer = _user("prvis-viewer")
        self.other = _user("prvis-other")
        ProfileLike.objects.create(profile_user=self.owner, user=self.liker)
        self.url = _url(self.owner.id)

    def _assert_not_found(self, response):
        """404 s presne rovnakým telom ako pri lajku profilu."""
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data, NOT_FOUND_BODY)

    def test_unknown_user_is_not_found(self):
        """Neexistujúce id dá 404."""
        self.client.force_authenticate(user=self.viewer)

        self._assert_not_found(self.client.get(_url(999999)))

    def test_private_profile_is_not_found_but_the_owner_sees_it(self):
        """Neverejný profil a jeho zoznam vidí len vlastník."""
        self.owner.is_public = False
        self.owner.save(update_fields=["is_public"])

        self.client.force_authenticate(user=self.viewer)
        self._assert_not_found(self.client.get(self.url))
        self.client.force_authenticate(user=self.owner)
        self.assertEqual(_ids(self.client.get(self.url)), [self.liker.id])

    def test_inactive_user_is_not_found(self):
        """Neaktívny účet dá 404."""
        self.owner.is_active = False
        self.owner.save(update_fields=["is_active"])
        self.client.force_authenticate(user=self.viewer)

        self._assert_not_found(self.client.get(self.url))

    def test_block_between_viewer_and_owner_hides_the_profile(self):
        """Blok v ktoromkoľvek smere skryje profil len tomu divákovi."""
        UserBlock.objects.create(blocker=self.viewer, blocked_user=self.owner)
        UserBlock.objects.create(blocker=self.owner, blocked_user=self.other)

        for blocked_viewer in (self.viewer, self.other):
            self.client.force_authenticate(user=blocked_viewer)
            self._assert_not_found(self.client.get(self.url))

        self.client.force_authenticate(user=self.liker)
        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_200_OK)

    def test_not_found_looks_the_same_for_every_reason(self):
        """Žiadny dôvod 404 sa z odpovede nedá rozlíšiť od neexistujúceho účtu."""
        self.client.force_authenticate(user=self.viewer)
        bodies = [self.client.get(_url(999999)).data]
        self.owner.is_public = False
        self.owner.save(update_fields=["is_public"])
        bodies.append(self.client.get(self.url).data)
        self.owner.is_active = False
        self.owner.save(update_fields=["is_active"])
        bodies.append(self.client.get(self.url).data)

        self.assertTrue(all(body == bodies[0] for body in bodies))
        self.assertEqual(bodies[0], NOT_FOUND_BODY)
