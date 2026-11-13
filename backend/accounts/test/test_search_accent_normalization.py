"""
Vyhľadávanie podľa mena a textu s písmenami, ktoré sa nedajú rozložiť na základné písmeno a diakritiku.

Na PostgreSQL sa stĺpec porovnáva ako ``public.immutable_unaccent(lower(stĺpec))``. Hľadaný text sa
kedysi upravoval v Pythone (rozklad Unicode), ktorý nechá nezmenené ``ł``, ``ß``, ``đ``, ``ø``, ``æ``
a ``œ``, kým ``unaccent`` ich v stĺpci mení na ``l``, ``ss``, ``d``, ``o``, ``ae`` a ``oe``. Používateľ
s takým menom sa preto nenašiel ani pri presnom zadaní jeho mena (hlásenie z manuálnych testov K20,
13. 11. 2026). SQLite používa regex a chybu nemal, preto sa pád prejaví len na PostgreSQL (CI beží aj tam,
úloha ``backend-postgres``); testy bežia na oboch databázach. Zadanie bez nerozložiteľných písmen (napr. ``lukasz``
pre „Łukasz“) rieši len ``unaccent`` na PostgreSQL, regex náhrada na SQLite ho nepozná, preto sa kontroluje len tam.
"""

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import connection
from django.urls import reverse
from rest_framework.test import APITestCase

from accounts.models import OfferedSkill

User = get_user_model()

# Meno -> rovnaké meno bez nerozložiteľných písmen tak, ako ho vráti PostgreSQL `unaccent` (malými).
NON_DECOMPOSABLE_NAMES = {
    "Łukasz": "lukasz",
    "Straße": "strasse",
    "Đorđe": "dorde",
    "Søren": "soren",
    "Ælfred": "aelfred",
    "Œuvre": "oeuvre",
}


def _queries_for(username, ascii_name):
    """Dotazy, ktoré majú meno nájsť: presné a malými; zadanie bez nerozložiteľných písmen len na PostgreSQL."""
    queries = [username, username.lower()]
    if connection.vendor == "postgresql":
        queries.append(ascii_name)
    return queries


def _create_user(username):
    """Vytvorí aktívneho verejného používateľa, ktorého meno sa dá nájsť len podľa `username`."""
    return User.objects.create_user(
        username=username,
        email=f"{username.encode().hex()}@example.com",
        password="x",
        is_public=True,
    )


class DashboardSearchAccentNormalizationTests(APITestCase):
    """Dashboard vyhľadávanie používateľov: hľadaný text sa upraví rovnako ako stĺpec."""

    def setUp(self):
        """Vyčistí cache a prihlási hľadajúceho používateľa bez zhody s hľadanými menami."""
        cache.clear()
        self.viewer = _create_user("hladac")
        self.client.force_authenticate(user=self.viewer)

    def _found_ids(self, query):
        """Vráti ID používateľov, ktorých dashboard vyhľadávanie vráti pre daný text."""
        response = self.client.get(
            reverse("accounts:dashboard_search"), {"q": query, "country": "SK"}
        )
        self.assertEqual(response.status_code, 200)
        return {user["id"] for user in response.data["users"]}

    def test_user_with_non_decomposable_letter_is_found_by_exact_name(self):
        """Meno s písmenom ako ł, ß, đ, ø, æ alebo œ sa nájde pri presnom zadaní, malými aj bez nich."""
        for username, ascii_name in NON_DECOMPOSABLE_NAMES.items():
            with self.subTest(username=username):
                user = _create_user(username)
                for query in _queries_for(username, ascii_name):
                    self.assertIn(user.id, self._found_ids(query))

    def test_part_of_name_with_non_decomposable_letter_is_found(self):
        """Hľadanie funguje aj podľa časti mena, ktorá obsahuje nerozložiteľné písmeno."""
        user = _create_user("Pawełek")
        self.assertIn(user.id, self._found_ids("weł"))
        self.assertIn(user.id, self._found_ids("PAWEŁ"))

    def test_slovak_diacritics_match_with_and_without_accents(self):
        """Slovenská diakritika sa ďalej zhoduje s písmenami s diakritikou aj bez nej a bez ohľadu na veľkosť."""
        user = _create_user("Šaľa")
        for query in ("Šaľa", "sala", "ŠAĽA", "šaľ"):
            with self.subTest(query=query):
                self.assertIn(user.id, self._found_ids(query))

    def test_unrelated_user_is_not_found(self):
        """Používateľ, ktorého meno hľadaný text neobsahuje, sa nenájde."""
        user = _create_user("Straße")
        self.assertNotIn(user.id, self._found_ids("lukasz"))

    def test_wildcard_characters_in_query_are_literal(self):
        """Znaky %, _ a spätná lomka v hľadanom texte sa berú doslovne, nie ako zástupné znaky."""
        underscore = _create_user("a_b2")
        decoy_underscore = _create_user("axb2")
        percent = _create_user("a%c")
        decoy_percent = _create_user("abc")
        backslash = _create_user("a\\b")
        decoy_backslash = _create_user("axb")

        found = self._found_ids("a_b2")
        self.assertIn(underscore.id, found)
        self.assertNotIn(decoy_underscore.id, found)
        found = self._found_ids("a%c")
        self.assertIn(percent.id, found)
        self.assertNotIn(decoy_percent.id, found)
        found = self._found_ids("a\\b")
        self.assertIn(backslash.id, found)
        self.assertNotIn(decoy_backslash.id, found)


class GlobalSearchAccentNormalizationTests(APITestCase):
    """Verejné (global) vyhľadávanie: používatelia aj ponuky s nerozložiteľnými písmenami."""

    def setUp(self):
        """Vyčistí cache pred každým testom."""
        cache.clear()

    def _global(self, query):
        """Zavolá globálne vyhľadávanie bez prihlásenia a vráti odpoveď."""
        response = self.client.get(reverse("accounts:search_global"), {"q": query})
        self.assertEqual(response.status_code, 200)
        return response

    def test_user_with_non_decomposable_letter_is_found_by_exact_name(self):
        """Používateľ s ł, ß, đ, ø, æ alebo œ v mene sa nájde pri presnom zadaní aj bez týchto písmen."""
        for username, ascii_name in NON_DECOMPOSABLE_NAMES.items():
            with self.subTest(username=username):
                user = _create_user(username)
                for query in _queries_for(username, ascii_name):
                    found = {u["id"] for u in self._global(query).data["users"]}
                    self.assertIn(user.id, found)

    def test_offer_with_non_decomposable_letter_is_found(self):
        """Ponuka, ktorej kategória obsahuje ß alebo ł, sa nájde pri presnom zadaní aj bez týchto písmen."""
        owner = _create_user("majitel")
        offer = OfferedSkill.objects.create(
            user=owner, category="Straßenbau", subcategory="Łodygi", description="popis"
        )
        queries = ["Straßenbau", "Łodygi"]
        if connection.vendor == "postgresql":
            queries += ["strassenbau", "lodygi"]
        for query in queries:
            with self.subTest(query=query):
                found = {o["id"] for o in self._global(query).data["offers"]}
                self.assertIn(offer.id, found)

    def test_public_offer_search_finds_offer_with_non_decomposable_letter(self):
        """Verejné vyhľadávanie ponúk nájde ponuku s ß v kategórii pri presnom zadaní aj bez neho."""
        owner = _create_user("majitel2")
        offer = OfferedSkill.objects.create(
            user=owner, category="Fußboden", subcategory="x", description="popis"
        )
        queries = ["Fußboden", "fußboden"]
        if connection.vendor == "postgresql":
            queries.append("fussboden")
        for query in queries:
            with self.subTest(query=query):
                response = self.client.get(reverse("accounts:search"), {"q": query})
                self.assertEqual(response.status_code, 200)
                self.assertIn(offer.id, {o["id"] for o in response.data["results"]})
