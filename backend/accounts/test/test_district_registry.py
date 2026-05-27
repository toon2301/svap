from pathlib import Path

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.district_registry import (
    DISTRICT_REGISTRY_PATH,
    _load_registry,
    get_offer_district_label,
    is_valid_offer_district_code,
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
