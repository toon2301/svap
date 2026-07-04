"""
Testy validácie vstupov vyhľadávania (robustnostný audit — BOD 1).

- search_view: min_rating mimo rozsahu 0–5 → 400 (konzistentné s inými neplatnými
  parametrami); platné hodnoty prejdú.
- dashboard_search: page je ohraničený (extrémne hodnoty nespôsobia chybu/obrovský
  OFFSET; negatívne → 1, obrovské → MAX).
"""

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.views.dashboard_views.search import MAX_DASHBOARD_SEARCH_PAGE

User = get_user_model()


@pytest.mark.django_db
class SearchViewMinRatingValidationTests(APITestCase):
    def setUp(self):
        cache.clear()

    def _get(self, **params):
        return self.client.get(reverse("accounts:search"), params)

    def test_min_rating_above_range_rejected(self):
        resp = self._get(min_rating="6")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_min_rating_negative_rejected(self):
        resp = self._get(min_rating="-1")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_min_rating_way_above_rejected(self):
        resp = self._get(min_rating="999")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_min_rating_unparseable_rejected(self):
        resp = self._get(min_rating="abc")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_min_rating_valid_in_range_ok(self):
        for value in ("0", "3", "5"):
            resp = self._get(min_rating=value)
            self.assertEqual(resp.status_code, status.HTTP_200_OK, value)
            self.assertIn("results", resp.data)


@pytest.mark.django_db
class DashboardSearchPageClampTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            username="dash_user",
            email="dash@example.com",
            password="StrongPass123",
            user_type="individual",
        )
        self.client.force_authenticate(user=self.user)

    def _get(self, **params):
        return self.client.get(reverse("accounts:dashboard_search"), params)

    def test_extremely_high_page_is_clamped_and_does_not_error(self):
        resp = self._get(q="test", page="99999999")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertLessEqual(resp.data["pagination"]["page"], MAX_DASHBOARD_SEARCH_PAGE)

    def test_negative_page_clamped_to_one(self):
        resp = self._get(q="test", page="-5")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["pagination"]["page"], 1)

    def test_non_integer_page_defaults_to_one(self):
        resp = self._get(q="test", page="abc")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["pagination"]["page"], 1)

    def test_extremely_long_location_does_not_error(self):
        # location/district idú do search termov – dlhý vstup nesmie zhodiť endpoint.
        resp = self._get(q="test", location="a" * 10000, district="b" * 10000)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("skills", resp.data)
