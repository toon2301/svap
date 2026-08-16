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

    def test_slovakia_czechia_and_poland_have_current_active_district_counts(self):
        slovak_districts = get_offer_district_entries("SK")
        czech_districts = get_offer_district_entries("CZ")
        polish_districts = get_offer_district_entries("PL")

        self.assertEqual(len(slovak_districts), 79)
        self.assertEqual(len(czech_districts), 77)
        self.assertEqual(len(polish_districts), 380)
        self.assertEqual(len({entry["code"] for entry in slovak_districts}), 79)
        self.assertEqual(len({entry["code"] for entry in czech_districts}), 77)
        self.assertEqual(len({entry["code"] for entry in polish_districts}), 380)
        self.assertEqual(len({entry["label"] for entry in czech_districts}), 77)
        self.assertEqual(len({entry["label"] for entry in polish_districts}), 380)
        self.assertEqual(
            len({entry["official_code"] for entry in polish_districts}),
            380,
        )
        self.assertTrue(
            all(entry["official_code"] for entry in polish_districts)
        )

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

        polish_codes = {entry["code"] for entry in polish_districts}
        self.assertTrue(
            {
                "boleslawiecki",
                "brzeski-malopolskie",
                "brzeski-opolskie",
                "katovice",
                "walbrzyski",
                "walbrzych",
            }.issubset(polish_codes)
        )

    def test_polish_legacy_names_resolve_to_corrected_canonical_districts(self):
        self.assertEqual(
            resolve_offer_district_code("PL", "Katovice"),
            ("katovice", "Katowice"),
        )
        self.assertEqual(
            resolve_offer_district_code("PL", "Lodž"),
            ("lodz", "Łódź"),
        )
        self.assertEqual(
            resolve_offer_district_code("PL", "Lodz"),
            ("lodz", "Łódź"),
        )
        self.assertEqual(
            resolve_offer_district_code("PL", "Jastrzębie Zdrój"),
            ("jastrzebie-zdroj", "Jastrzębie-Zdrój"),
        )

    def test_same_named_polish_districts_are_disambiguated_by_voivodeship(self):
        self.assertEqual(
            resolve_offer_district_code("PL", "Brzeski (Małopolskie)"),
            ("brzeski-malopolskie", "Brzeski (Małopolskie)"),
        )
        self.assertEqual(
            resolve_offer_district_code("PL", "Brzeski (Opolskie)"),
            ("brzeski-opolskie", "Brzeski (Opolskie)"),
        )

    def test_hungary_has_current_active_and_legacy_district_counts(self):
        active_entries = get_offer_district_entries("HU")
        all_entries = get_offer_district_entries("HU", include_inactive=True)

        self.assertEqual(len(active_entries), 197)
        self.assertEqual(len(all_entries), 206)
        self.assertEqual(len({entry["code"] for entry in all_entries}), 206)
        self.assertEqual(len({entry["label"] for entry in active_entries}), 197)
        self.assertEqual(
            len({entry["official_code"] for entry in active_entries}),
            197,
        )
        self.assertTrue(all(entry["official_code"] for entry in active_entries))

        active_codes = {entry["code"] for entry in active_entries}
        self.assertTrue(
            {
                "boly",
                "budakeszi",
                "budapest-01-ker",
                "budapest-23-ker",
                "sasd",
                "tolna",
            }.issubset(active_codes)
        )
        self.assertEqual(
            get_offer_district_label("HU", "budapest-01-ker"),
            "Budapest 01. ker.",
        )
        self.assertEqual(get_offer_district_label("HU", "boly"), "Bóly")

    def test_inactive_hungarian_legacy_values_remain_resolvable(self):
        all_entries = get_offer_district_entries("HU", include_inactive=True)
        inactive_codes = {
            entry["code"] for entry in all_entries if not entry["active"]
        }

        self.assertEqual(
            inactive_codes,
            {
                "abadszalok",
                "budaors",
                "budapest",
                "csepreg",
                "dorog",
                "kisujszallas",
                "nagyecsed",
                "pacsa",
                "polgardi",
            },
        )
        self.assertFalse(is_valid_offer_district_code("HU", "budapest"))
        self.assertTrue(is_inactive_offer_district_code("HU", "budapest"))
        self.assertEqual(
            get_offer_district_label(
                "HU",
                "budapest",
                include_inactive=True,
            ),
            "Budapest",
        )

    def test_austria_has_current_active_and_legacy_district_counts(self):
        active_entries = get_offer_district_entries("AT")
        all_entries = get_offer_district_entries("AT", include_inactive=True)

        self.assertEqual(len(active_entries), 94)
        self.assertEqual(len(all_entries), 96)
        self.assertEqual(len({entry["code"] for entry in all_entries}), 96)
        self.assertEqual(len({entry["label"] for entry in active_entries}), 94)
        self.assertEqual(
            len({entry["official_code"] for entry in active_entries}),
            94,
        )
        self.assertTrue(all(entry["official_code"] for entry in active_entries))

        entries_by_code = {entry["code"]: entry for entry in active_entries}
        self.assertEqual(entries_by_code["wien"]["official_code"], "900")
        self.assertEqual(entries_by_code["krems"]["official_code"], "313")
        self.assertEqual(
            entries_by_code["klagenfurt-am-worthersee"]["official_code"],
            "201",
        )
        self.assertFalse(
            any(
                "901" <= entry["official_code"] <= "923"
                for entry in active_entries
            )
        )

    def test_inactive_austrian_legacy_values_remain_resolvable(self):
        all_entries = get_offer_district_entries("AT", include_inactive=True)
        inactive_codes = {
            entry["code"] for entry in all_entries if not entry["active"]
        }

        self.assertEqual(inactive_codes, {"schwechat", "wien-umgebung"})
        self.assertFalse(is_valid_offer_district_code("AT", "schwechat"))
        self.assertTrue(is_inactive_offer_district_code("AT", "schwechat"))
        self.assertEqual(
            get_offer_district_label(
                "AT",
                "schwechat",
                include_inactive=True,
            ),
            "Schwechat",
        )

    def test_germany_has_current_active_and_legacy_district_counts(self):
        active_entries = get_offer_district_entries("DE")
        all_entries = get_offer_district_entries("DE", include_inactive=True)

        self.assertEqual(len(active_entries), 401)
        self.assertEqual(len(all_entries), 444)
        self.assertEqual(len({entry["code"] for entry in all_entries}), 444)
        self.assertEqual(len({entry["label"] for entry in active_entries}), 401)
        self.assertEqual(
            len({entry["official_code"] for entry in active_entries}),
            401,
        )
        self.assertTrue(all(entry["official_code"] for entry in active_entries))

        entries_by_code = {entry["code"]: entry for entry in active_entries}
        self.assertEqual(entries_by_code["berlin"]["official_code"], "11000")
        self.assertEqual(
            entries_by_code["munchen-stadt"]["official_code"],
            "09162",
        )
        self.assertEqual(
            entries_by_code["munchen-landkreis"]["official_code"],
            "09184",
        )
        self.assertEqual(
            entries_by_code["landkreis-rostock"]["official_code"],
            "13072",
        )

    def test_inactive_german_legacy_values_remain_resolvable(self):
        all_entries = get_offer_district_entries("DE", include_inactive=True)
        inactive_codes = {
            entry["code"] for entry in all_entries if not entry["active"]
        }

        self.assertEqual(len(inactive_codes), 43)
        self.assertTrue(
            {
                "annaberg",
                "dobeln",
                "munchen",
                "soltau-fallingbostel",
                "wesel-2",
            }.issubset(inactive_codes)
        )
        self.assertFalse(is_valid_offer_district_code("DE", "munchen"))
        self.assertTrue(is_inactive_offer_district_code("DE", "munchen"))
        self.assertEqual(
            get_offer_district_label(
                "DE",
                "munchen",
                include_inactive=True,
            ),
            "M\u00fcnchen",
        )
        self.assertEqual(
            resolve_offer_district_code(
                "DE",
                "Wesel",
                include_inactive=True,
            ),
            ("wesel", "Wesel"),
        )

    def test_german_city_and_county_labels_are_unambiguous(self):
        self.assertEqual(
            resolve_offer_district_code("DE", "Munchen (Stadt)"),
            ("munchen-stadt", "M\u00fcnchen (Stadt)"),
        )
        self.assertEqual(
            resolve_offer_district_code("DE", "Osnabruck (Landkreis)"),
            ("osnabruck-landkreis", "Osnabr\u00fcck (Landkreis)"),
        )
        self.assertEqual(
            resolve_offer_district_code("DE", "Hassberge"),
            ("hassberge", "Ha\u00dfberge"),
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
        self.assertEqual(raw["_meta"]["sources"]["PL"]["active_count"], 380)
        self.assertEqual(raw["_meta"]["sources"]["HU"]["active_count"], 197)
        self.assertEqual(raw["_meta"]["sources"]["AT"]["active_count"], 94)
        self.assertEqual(raw["_meta"]["sources"]["DE"]["active_count"], 401)

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

    def test_post_api_auth_skills_accepts_new_polish_district(self):
        response = self.client.post(
            self.url,
            {
                "category": "Remeslá",
                "subcategory": "Maliar",
                "description": "Maľovanie stien",
                "country_code": "PL",
                "district_code": "boleslawiecki",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["district_code"], "boleslawiecki")
        self.assertEqual(response.data["district_label"], "Bolesławiecki")

    def test_post_api_auth_skills_accepts_new_hungarian_district(self):
        response = self.client.post(
            self.url,
            {
                "category": "Remeslá",
                "subcategory": "Maliar",
                "description": "Maľovanie stien",
                "country_code": "HU",
                "district_code": "budapest-01-ker",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["district_code"], "budapest-01-ker")
        self.assertEqual(response.data["district_label"], "Budapest 01. ker.")

    def test_post_api_auth_skills_rejects_inactive_hungarian_district(self):
        response = self.client.post(
            self.url,
            {
                "category": "Remeslá",
                "subcategory": "Maliar",
                "description": "Maľovanie stien",
                "country_code": "HU",
                "district_code": "budapest",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("district_code", response.data)

    def test_post_api_auth_skills_accepts_current_austrian_district(self):
        response = self.client.post(
            self.url,
            {
                "category": "Remeslá",
                "subcategory": "Maliar",
                "description": "Maľovanie stien",
                "country_code": "AT",
                "district_code": "klagenfurt-am-worthersee",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            response.data["district_code"],
            "klagenfurt-am-worthersee",
        )
        self.assertEqual(
            response.data["district_label"],
            "Klagenfurt am Wörthersee",
        )

    def test_post_api_auth_skills_rejects_inactive_austrian_district(self):
        response = self.client.post(
            self.url,
            {
                "category": "Remeslá",
                "subcategory": "Maliar",
                "description": "Maľovanie stien",
                "country_code": "AT",
                "district_code": "schwechat",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("district_code", response.data)

    def test_post_api_auth_skills_accepts_current_german_district(self):
        response = self.client.post(
            self.url,
            {
                "category": "Remesl\u00e1",
                "subcategory": "Maliar",
                "description": "Ma\u013eovanie stien",
                "country_code": "DE",
                "district_code": "munchen-stadt",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["district_code"], "munchen-stadt")
        self.assertEqual(response.data["district_label"], "M\u00fcnchen (Stadt)")

    def test_post_api_auth_skills_rejects_inactive_german_district(self):
        response = self.client.post(
            self.url,
            {
                "category": "Remesl\u00e1",
                "subcategory": "Maliar",
                "description": "Ma\u013eovanie stien",
                "country_code": "DE",
                "district_code": "munchen",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("district_code", response.data)
