from pathlib import Path

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.country_registry import (
    COUNTRY_REGISTRY_PATH,
    SUPPORTED_OFFER_COUNTRIES,
    _load_country_registry,
    get_offer_country_name,
    normalize_offer_country_code,
)
from accounts.district_registry import (
    get_offer_district_entries,
    has_offer_district_registry,
    is_valid_offer_district_code,
)
from accounts.models import UserType


User = get_user_model()


class CountryRegistryDataTests(APITestCase):
    def test_registry_is_backend_owned_and_contains_iso_codes_plus_kosovo(self):
        self.assertTrue(COUNTRY_REGISTRY_PATH.is_file())
        self.assertEqual(COUNTRY_REGISTRY_PATH.name, "country_registry.json")
        self.assertEqual(COUNTRY_REGISTRY_PATH.parent.name, "data")
        self.assertNotIn("frontend", COUNTRY_REGISTRY_PATH.parts)

        _load_country_registry.cache_clear()
        registry = _load_country_registry()
        self.assertEqual(len(registry), 250)
        self.assertEqual(len(SUPPORTED_OFFER_COUNTRIES), 250)
        self.assertEqual(registry["XK"]["standard"], "compatibility")
        self.assertEqual(
            sum(entry["standard"] == "iso-3166-1" for entry in registry.values()),
            249,
        )

    def test_country_normalization_uses_registry_allowlist(self):
        self.assertEqual(normalize_offer_country_code(" it "), "IT")
        self.assertEqual(normalize_offer_country_code("xk"), "XK")
        self.assertEqual(get_offer_country_name("US"), "United States")
        self.assertEqual(normalize_offer_country_code("ZZ"), "")
        self.assertEqual(normalize_offer_country_code("USA"), "")

    def test_country_registry_path_does_not_escape_accounts_package(self):
        accounts_root = Path(__file__).resolve().parents[1]
        self.assertTrue(COUNTRY_REGISTRY_PATH.resolve().is_relative_to(accounts_root))

    def test_country_without_curated_districts_remains_valid(self):
        self.assertFalse(has_offer_district_registry("IT"))
        self.assertEqual(get_offer_district_entries("IT"), ())
        self.assertFalse(is_valid_offer_district_code("IT", "nitra"))
        self.assertTrue(has_offer_district_registry("SK"))


class SkillCountryRegistryApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="country-registry-user",
            email="country-registry@example.com",
            password="testpass123",
            user_type=UserType.INDIVIDUAL,
            is_verified=True,
        )
        self.client.force_authenticate(self.user)
        self.url = reverse("accounts:skills_list")

    def _payload(self, **overrides):
        payload = {
            "category": "Services",
            "subcategory": "Painting",
            "description": "Interior painting",
            "country_code": "IT",
        }
        payload.update(overrides)
        return payload

    def test_create_accepts_country_without_curated_districts(self):
        response = self.client.post(self.url, self._payload(location="Roma"), format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["country_code"], "IT")
        self.assertEqual(response.data["district_code"], "")
        self.assertEqual(response.data["location"], "Roma")

    def test_create_rejects_unknown_country_code(self):
        response = self.client.post(
            self.url,
            self._payload(country_code="ZZ"),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("country_code", response.data)

    def test_create_rejects_curated_district_from_another_country(self):
        response = self.client.post(
            self.url,
            self._payload(district_code="nitra"),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("district_code", response.data)
