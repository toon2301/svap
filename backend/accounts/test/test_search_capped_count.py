"""
Testy pre capped count vo verejnom vyhľadávaní (BOD 2).

Presný počet do SEARCH_COUNT_CAP, nad ňou is_capped=True a total=CAP ("CAP+").
Hranicu v testoch znižujeme cez patch, aby sme nemuseli vytvárať 500+ riadkov.
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
from accounts.views import search_query_builders as sqb

User = get_user_model()


class CappedCountHelperTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="cap_owner",
            email="cap@example.com",
            password="StrongPass123",
            is_public=True,
            is_active=True,
            user_type="individual",
        )

    def _make_offers(self, n):
        # UNIQUE(user, category, subcategory) → varíruj subcategory.
        OfferedSkill.objects.bulk_create(
            [
                OfferedSkill(
                    user=self.user,
                    category="IT",
                    subcategory=f"Web{i}",
                    description="x",
                )
                for i in range(n)
            ]
        )

    def test_zero_results(self):
        with patch.object(sqb, "SEARCH_COUNT_CAP", 3):
            count, capped = sqb.capped_count(OfferedSkill.objects.none())
        self.assertEqual(count, 0)
        self.assertFalse(capped)

    def test_below_cap(self):
        self._make_offers(2)
        with patch.object(sqb, "SEARCH_COUNT_CAP", 3):
            count, capped = sqb.capped_count(OfferedSkill.objects.all())
        self.assertEqual(count, 2)
        self.assertFalse(capped)

    def test_exactly_at_cap_is_not_capped(self):
        self._make_offers(3)
        with patch.object(sqb, "SEARCH_COUNT_CAP", 3):
            count, capped = sqb.capped_count(OfferedSkill.objects.all())
        self.assertEqual(count, 3)
        self.assertFalse(capped)

    def test_above_cap_is_capped(self):
        self._make_offers(4)
        with patch.object(sqb, "SEARCH_COUNT_CAP", 3):
            count, capped = sqb.capped_count(OfferedSkill.objects.all())
        self.assertEqual(count, 3)  # vráti CAP, nie presný počet
        self.assertTrue(capped)


@pytest.mark.django_db
class SearchViewCappedResponseTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.owner = User.objects.create_user(
            username="cap_search",
            email="capsearch@example.com",
            password="StrongPass123",
            is_public=True,
            is_active=True,
            is_verified=True,
            user_type="individual",
        )

    def _make_python_offers(self, n):
        # UNIQUE(user, category, subcategory) → varíruj subcategory; všetky matchnú "python".
        OfferedSkill.objects.bulk_create(
            [
                OfferedSkill(
                    user=self.owner,
                    category="IT",
                    subcategory=f"Web{i}",
                    description="Python mentor",
                    is_hidden=False,
                )
                for i in range(n)
            ]
        )

    def test_is_capped_false_for_small_result(self):
        self._make_python_offers(1)
        resp = self.client.get(reverse("accounts:search"), {"q": "python"})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("is_capped", resp.data)
        self.assertFalse(resp.data["is_capped"])
        self.assertEqual(resp.data["total"], 1)

    def test_is_capped_true_above_cap(self):
        self._make_python_offers(3)
        with patch.object(sqb, "SEARCH_COUNT_CAP", 2):
            resp = self.client.get(reverse("accounts:search"), {"q": "python"})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data["is_capped"])
        self.assertEqual(resp.data["total"], 2)  # = CAP

    def test_empty_results_not_capped(self):
        resp = self.client.get(reverse("accounts:search"), {"q": "nonexistentxyz"})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["total"], 0)
        self.assertFalse(resp.data["is_capped"])
