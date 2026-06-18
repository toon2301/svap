from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import OfferedSkill, UserType

User = get_user_model()


class SkillDeleteApiTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="delete-owner",
            email="delete-owner@example.com",
            password="testpass123",
            user_type=UserType.INDIVIDUAL,
            is_verified=True,
        )
        self.other = User.objects.create_user(
            username="delete-other",
            email="delete-other@example.com",
            password="testpass123",
            user_type=UserType.INDIVIDUAL,
            is_verified=True,
        )
        self.skill = OfferedSkill.objects.create(
            user=self.owner,
            category="Remeslá",
            subcategory="Maliar",
            description="Test karta",
            country_code="SK",
            district_code="ba",
            district="Bratislava",
        )
        self.url = reverse("accounts:skills_detail", kwargs={"skill_id": self.skill.id})

    def test_owner_can_delete_skill_returns_204(self):
        self.client.force_authenticate(self.owner)
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_delete_response_has_no_body(self):
        self.client.force_authenticate(self.owner)
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(response.content, b"")

    def test_skill_removed_from_db_after_delete(self):
        self.client.force_authenticate(self.owner)
        self.client.delete(self.url)
        self.assertFalse(OfferedSkill.objects.filter(id=self.skill.id).exists())

    def test_other_user_cannot_delete_skill_returns_404(self):
        self.client.force_authenticate(self.other)
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(OfferedSkill.objects.filter(id=self.skill.id).exists())

    def test_unauthenticated_cannot_delete_skill(self):
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertTrue(OfferedSkill.objects.filter(id=self.skill.id).exists())
