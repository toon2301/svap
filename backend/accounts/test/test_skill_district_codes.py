from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import OfferedSkill, UserType


User = get_user_model()


class SkillDistrictCodeApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="district-user",
            email="district@example.com",
            password="testpass123",
            user_type=UserType.INDIVIDUAL,
            is_verified=True,
        )
        self.client.force_authenticate(self.user)
        self.list_url = reverse("accounts:skills_list")

    def test_create_skill_with_valid_country_and_district_code_returns_canonical_label(self):
        response = self.client.post(
            self.list_url,
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
        self.assertEqual(response.data["country_code"], "SK")
        self.assertEqual(response.data["district_code"], "nitra")
        self.assertEqual(response.data["district"], "Nitra")
        self.assertEqual(response.data["district_label"], "Nitra")

        skill = OfferedSkill.objects.get(id=response.data["id"])
        self.assertEqual(skill.country_code, "SK")
        self.assertEqual(skill.district_code, "nitra")
        self.assertEqual(skill.district, "Nitra")

    def test_create_skill_rejects_district_code_from_different_country(self):
        response = self.client.post(
            self.list_url,
            {
                "category": "Remeslá",
                "subcategory": "Elektrikár",
                "description": "Zapojenie svetiel",
                "country_code": "SK",
                "district_code": "brno-mesto",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("district_code", response.data)

    def test_partial_patch_keeps_legacy_skill_editable_without_country_codes(self):
        skill = OfferedSkill.objects.create(
            user=self.user,
            category="Domácnosť",
            subcategory="Upratovanie",
            description="Povysávam byt",
            district="Nitra",
            location="Nitra",
        )

        response = self.client.patch(
            reverse("accounts:skills_detail", args=[skill.id]),
            {"description": "Povysávam aj dom"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        skill.refresh_from_db()
        self.assertEqual(skill.description, "Povysávam aj dom")
        self.assertEqual(skill.district, "Nitra")
        self.assertEqual(skill.country_code, "")
        self.assertEqual(skill.district_code, "")
