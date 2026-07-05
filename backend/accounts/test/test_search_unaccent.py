"""
Testy pre accent-insensitive vyhľadávanie (BOD 1 – unaccent + expression index).

Pozn.: testy bežia na sqlite, kde `accent_insensitive_contains_q` používa regex
fallback. PostgreSQL vetvu (`unaccent_lower__contains` + expression GIN index)
overujeme na úrovni konštrukcie Q (mock vendor) – jej skutočné využitie indexu
treba overiť EXPLAIN-om na staging Postgrese.
"""

from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import OfferedSkill
from accounts.views.dashboard_views.utils import accent_insensitive_contains_q

User = get_user_model()


class AccentInsensitiveContainsQTests(TestCase):
    def test_postgresql_branch_uses_unaccent_lower_contains(self):
        with patch("accounts.views.dashboard_views.utils.connection") as conn:
            conn.vendor = "postgresql"
            q = accent_insensitive_contains_q("first_name", "Malíár")
        # Diakritika sa odstráni v Pythone, pole sa porovná cez unaccent_lower transform.
        self.assertEqual(
            q.children, [("first_name__unaccent_lower__contains", "maliar")]
        )

    def test_sqlite_branch_uses_accent_regex(self):
        with patch("accounts.views.dashboard_views.utils.connection") as conn:
            conn.vendor = "sqlite"
            q = accent_insensitive_contains_q("first_name", "abc")
        key, _value = q.children[0]
        self.assertEqual(key, "first_name__iregex")


@pytest.mark.django_db
class AccentInsensitiveSearchResultsTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.owner = User.objects.create_user(
            username="painter",
            email="painter@example.com",
            password="StrongPass123",
            first_name="Kaderník",
            is_active=True,
            is_verified=True,
            is_public=True,
            user_type="individual",
        )
        self.offer = OfferedSkill.objects.create(
            user=self.owner,
            category="Remeslá",
            subcategory="Maľovanie",
            description="Malíár interiérov",
            is_hidden=False,
        )

    def test_public_search_finds_accented_offer_with_unaccented_query(self):
        # "maliar" (bez diakritiky) musí nájsť ponuku s "Malíár" (s diakritikou).
        resp = self.client.get(reverse("accounts:search"), {"q": "maliar"})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        ids = [item["id"] for item in resp.data["results"]]
        self.assertIn(self.offer.id, ids)

    def test_global_search_finds_accented_user_with_unaccented_query(self):
        # "kadernik" (bez diakritiky) musí nájsť "Kaderník" – prejde LEN ak
        # accent-normalizácia (unaccent na PG / accent-regex na sqlite) skutočne
        # funguje: raw "kadernik" sa nerovná "Kaderník" (í != i).
        resp = self.client.get(reverse("accounts:search_global"), {"q": "kadernik"})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        user_ids = [u["id"] for u in resp.data["users"]]
        self.assertIn(self.owner.id, user_ids)

    def test_search_handles_regex_special_chars_without_crashing(self):
        # Špeciálne regex znaky v dotaze nesmú zhodiť endpoint (ReDoS/escape guard).
        resp = self.client.get(reverse("accounts:search"), {"q": "a(b[c"})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_empty_query_returns_empty_results(self):
        resp = self.client.get(reverse("accounts:search"), {"q": ""})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["results"], [])
