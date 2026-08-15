import json
from pathlib import Path

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.district_registry import (
    DISTRICT_REGISTRY_PATH,
    _load_registry,
    get_offer_district_entries,
    get_offer_district_label,
    is_inactive_offer_district_code,
    is_valid_offer_district_code,
    resolve_offer_district_code,
)
from accounts.models import UserType


User = get_user_model()


class DistrictRegistryDataTests(APITestCase):
    def test_registry_file_is_backend_local(self):
        self.assertTrue(DISTRICT_REGISTRY_PATH.is_file())
        self.assertEqual(DISTRICT_REGISTRY_PATH.name, "district_registry.json")
        self.assertEqual(DISTRICT_REGISTRY_PATH.parent.name, "data")
        self.assertEqual(DISTRICT_REGISTRY_PATH.parent.parent.name, "accounts")
        self.assertNotIn("frontend", DISTRICT_REGISTRY_PATH.parts)

    def test_registry_loads_supported_countries(self):
        _load_registry.cache_clear()
        registry = _load_registry()
        self.assertIn("SK", registry)
        self.assertTrue(is_valid_offer_district_code("SK", "nitra"))
        self.assertEqual(get_offer_district_label("SK", "nitra"), "Nitra")

    def test_slovakia_and_czechia_have_current_active_district_counts(self):
        slovak_districts = get_offer_district_entries("SK")
        czech_districts = get_offer_district_entries("CZ")

        self.assertEqual(len(slovak_districts), 79)
        self.assertEqual(len(czech_districts), 77)
        self.assertEqual(len({entry["code"] for entry in slovak_districts}), 79)
        self.assertEqual(len({entry["code"] for entry in czech_districts}), 77)
        self.assertEqual(len({entry["label"] for entry in czech_districts}), 77)

        czech_codes = {entry["code"] for entry in czech_districts}
        self.assertTrue(
            {
                "praha",
                "prachatice",
                "most",
                "teplice",
                "semily",
                "rychnov-nad-kneznou",
                "uherske-hradiste",
            }.issubset(czech_codes)
        )

    def test_inactive_czech_legacy_value_is_resolvable_but_not_selectable(self):
        active_codes = {
            entry["code"] for entry in get_offer_district_entries("CZ")
        }
        all_entries = get_offer_district_entries("CZ", include_inactive=True)

        self.assertEqual(len(all_entries), 78)
        self.assertNotIn("valasske-mezirici", active_codes)
        self.assertFalse(is_valid_offer_district_code("CZ", "valasske-mezirici"))
        self.assertTrue(
            is_inactive_offer_district_code("CZ", "valasske-mezirici")
        )
        self.assertEqual(
            get_offer_district_label(
                "CZ",
                "valasske-mezirici",
                include_inactive=True,
            ),
            "Valašské Meziříčí",
        )

    def test_active_alias_resolves_to_canonical_czech_district(self):
        self.assertEqual(
            resolve_offer_district_code("CZ", "Hlavní město Praha"),
            ("praha", "Praha"),
        )

    def test_registry_metadata_records_authoritative_active_counts(self):
        with DISTRICT_REGISTRY_PATH.open("r", encoding="utf-8") as file_handle:
            raw = json.load(file_handle)

        self.assertEqual(raw["_meta"]["schema_version"], 2)
        self.assertEqual(raw["_meta"]["sources"]["SK"]["active_count"], 79)
        self.assertEqual(raw["_meta"]["sources"]["CZ"]["active_count"], 77)

    def test_registry_path_does_not_escape_accounts_package(self):
        accounts_root = Path(__file__).resolve().parents[1]
        registry_path = DISTRICT_REGISTRY_PATH.resolve()
        accounts_root.resolve()
        self.assertTrue(
            registry_path.is_relative_to(accounts_root),
            msg=f"{registry_path} must stay under {accounts_root}",
        )


class PostApiAuthSkillsDistrictRegistryRegressionTests(APITestCase):
    """Regression for production FileNotFoundError on POST /api/auth/skills/."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="skills-post-user",
            email="skills-post@example.com",
            password="testpass123",
            user_type=UserType.INDIVIDUAL,
            is_verified=True,
        )
        self.client.force_authenticate(self.user)
        self.url = reverse("accounts:skills_list")

    def test_post_api_auth_skills_with_district_code_succeeds(self):
        response = self.client.post(
            self.url,
            {
                "category": "Remeslá",
                "subcategory": "Maliar",
                "description": "Maľovanie stien",
                "country_code": "SK",
                "district_code": "nitra",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["district_code"], "nitra")
        self.assertEqual(response.data["district_label"], "Nitra")
