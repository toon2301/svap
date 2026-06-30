"""
BOD 1 auditu: anti-scraping minimálna dĺžka q v public search_view.

Prázdny/krátky dotaz bez zužujúceho filtra už nevracia VŠETKY ponuky, ale
prázdny výsledok (status 200). Filtrované prehliadanie (type/user_type/price/
min_rating) bez q naďalej funguje.
"""

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from accounts.models import OfferedSkill

User = get_user_model()


class SearchMinQueryTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse("accounts:search")
        self.owner = User.objects.create_user(
            username="owner_minq",
            email="owner_minq@example.com",
            password="x",
            is_public=True,
        )
        self.offer = OfferedSkill.objects.create(
            user=self.owner,
            category="Programovanie",
            subcategory="Python",
            description="popis",
            is_seeking=False,
            price_from=10,
        )

    def _owner_ids(self, resp):
        return {o.get("user_id") for o in resp.data["results"]}

    # ---- prázdne / krátke q bez filtra → prázdno -------------------------

    def test_empty_q_no_filter_returns_empty(self):
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["results"], [])
        self.assertEqual(resp.data["total"], 0)

    def test_single_char_q_no_filter_returns_empty(self):
        resp = self.client.get(self.url, {"q": "a"})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["results"], [])
        self.assertEqual(resp.data["total"], 0)

    def test_garbage_type_does_not_bypass_guard(self):
        # type s neplatnou hodnotou nie je zužujúci filter → guard platí.
        resp = self.client.get(self.url, {"q": "a", "type": "garbage"})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["results"], [])

    def test_district_only_does_not_bypass_guard(self):
        # district sa v tomto endpointe používa len na zoradenie, nie filter.
        resp = self.client.get(self.url, {"district": "Bratislava"})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["results"], [])

    # ---- platné q (>=2) alebo aktívny filter → výsledky -------------------

    def test_two_char_q_searches_normally(self):
        resp = self.client.get(self.url, {"q": "Pr"})
        self.assertEqual(resp.status_code, 200)
        self.assertIn(self.owner.id, self._owner_ids(resp))

    def test_full_q_returns_match(self):
        resp = self.client.get(self.url, {"q": "Programovanie"})
        self.assertEqual(resp.status_code, 200)
        self.assertIn(self.owner.id, self._owner_ids(resp))

    def test_type_filter_without_q_returns_results(self):
        resp = self.client.get(self.url, {"type": "offer"})
        self.assertEqual(resp.status_code, 200)
        self.assertIn(self.owner.id, self._owner_ids(resp))

    def test_price_filter_without_q_returns_results(self):
        resp = self.client.get(self.url, {"price_min": "5"})
        self.assertEqual(resp.status_code, 200)
        self.assertIn(self.owner.id, self._owner_ids(resp))

    def test_invalid_price_with_no_q_still_validates(self):
        # price_min je prítomný (intent filtrovať) → guard nezasiahne, ale
        # neplatná hodnota vráti 400 (zachované pôvodné správanie validácie).
        resp = self.client.get(self.url, {"price_min": "abc"})
        self.assertEqual(resp.status_code, 400)
