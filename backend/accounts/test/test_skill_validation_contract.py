from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import OfferedSkill, UserType


User = get_user_model()


class SkillValidationContractTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="offer-validation-user",
            email="offer-validation@example.com",
            password="testpass123",
            user_type=UserType.INDIVIDUAL,
            is_verified=True,
        )
        self.client.force_authenticate(self.user)
        self.url = reverse("accounts:skills_list")

    @staticmethod
    def payload(*, subcategory="Maliar", description="Maľovanie stien"):
        return {
            "category": "Remeslá",
            "subcategory": subcategory,
            "description": description,
            "country_code": "SK",
            "district_code": "nitra",
        }

    def test_short_description_accepts_150_and_rejects_151_characters(self):
        accepted = self.client.post(
            self.url,
            self.payload(description="a" * 150),
            format="json",
        )
        rejected = self.client.post(
            self.url,
            self.payload(subcategory="Stolár", description="a" * 151),
            format="json",
        )

        self.assertEqual(accepted.status_code, status.HTTP_201_CREATED)
        self.assertEqual(rejected.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(rejected.data["code"], "offer_description_too_long")
        self.assertIn("description", rejected.data)
        self.assertFalse(OfferedSkill.objects.filter(subcategory="Stolár").exists())

    def test_duplicate_offer_returns_stable_human_readable_error(self):
        OfferedSkill.objects.create(
            user=self.user,
            category="Remeslá",
            subcategory="Maliar",
            description="Prvá karta",
        )

        response = self.client.post(self.url, self.payload(), format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "duplicate_offer")
        self.assertEqual(
            response.data["error"],
            "Takúto ponuku alebo dopyt už máš vytvorený.",
        )

    def test_other_validation_error_keeps_field_and_adds_safe_code(self):
        response = self.client.post(
            self.url,
            {
                **self.payload(),
                "district_code": "brno-mesto",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "offer_validation_failed")
        self.assertIn("district_code", response.data)

    def test_card_limit_returns_stable_error_code(self):
        for index in range(3):
            OfferedSkill.objects.create(
                user=self.user,
                category="Remeslá",
                subcategory=f"Karta {index}",
                description="Popis",
                is_seeking=False,
            )

        response = self.client.post(
            self.url,
            self.payload(subcategory="Štvrtá karta"),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "offer_limit_reached")
