from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import OfferedSkill

User = get_user_model()


class DashboardRecommendationsTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.viewer = User.objects.create_user(
            username="viewer",
            email="viewer@example.com",
            password="testpass123",
            first_name="View",
            last_name="Er",
            user_type="individual",
            is_public=False,
            location="Bratislava",
            district="Bratislava I",
        )
        self.client.force_authenticate(user=self.viewer)

    def test_dashboard_recommendations_prioritize_local_complementary_verified_skills(self):
        OfferedSkill.objects.create(
            user=self.viewer,
            category="Grafika",
            subcategory="Logo",
            description="Ponukam tvorbu loga",
            detailed_description="Detaily",
            tags=["branding"],
            is_hidden=False,
            is_seeking=False,
        )

        local_verified_owner = User.objects.create_user(
            username="localverified",
            email="localverified@example.com",
            password="testpass123",
            first_name="Local",
            last_name="Verified",
            user_type="individual",
            is_public=True,
            is_verified=True,
            location="Bratislava",
            district="Bratislava I",
        )
        top_skill = OfferedSkill.objects.create(
            user=local_verified_owner,
            category="Grafika",
            subcategory="Logo",
            description="Hladam logo",
            detailed_description="Detaily",
            tags=["branding"],
            location="Bratislava",
            district="Bratislava I",
            is_hidden=False,
            is_seeking=True,
        )

        local_related_owner = User.objects.create_user(
            username="localrelated",
            email="localrelated@example.com",
            password="testpass123",
            first_name="Local",
            last_name="Related",
            user_type="individual",
            is_public=True,
            location="Bratislava",
            district="Bratislava I",
        )
        OfferedSkill.objects.create(
            user=local_related_owner,
            category="Grafika",
            subcategory="Logo",
            description="Ponukam dalsie logo",
            detailed_description="Detaily",
            location="Bratislava",
            district="Bratislava I",
            is_hidden=False,
            is_seeking=False,
        )

        remote_verified_owner = User.objects.create_user(
            username="remoteverified",
            email="remoteverified@example.com",
            password="testpass123",
            first_name="Remote",
            last_name="Verified",
            user_type="individual",
            is_public=True,
            is_verified=True,
            location="Kosice",
            district="Kosice I",
        )
        OfferedSkill.objects.create(
            user=remote_verified_owner,
            category="Grafika",
            subcategory="Logo",
            description="Hladam logo na dialku",
            detailed_description="Detaily",
            location="Kosice",
            district="Kosice I",
            is_hidden=False,
            is_seeking=True,
        )

        url = reverse("accounts:dashboard_search_recommendations")
        response = self.client.get(url, {"limit": "5"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("skills", response.data)
        self.assertGreaterEqual(len(response.data["skills"]), 1)
        self.assertEqual(response.data["skills"][0]["id"], top_skill.id)
        self.assertTrue(all(skill["user_id"] != self.viewer.id for skill in response.data["skills"]))

    def test_dashboard_search_users_excludes_private_profiles_except_viewer(self):
        private_other = User.objects.create_user(
            username="shared-private",
            email="private@example.com",
            password="testpass123",
            first_name="Shared",
            last_name="Private",
            user_type="individual",
            is_public=False,
        )
        public_other = User.objects.create_user(
            username="shared-public",
            email="public@example.com",
            password="testpass123",
            first_name="Shared",
            last_name="Public",
            user_type="individual",
            is_public=True,
        )

        self.viewer.username = "shared-viewer"
        self.viewer.save(update_fields=["username"])

        url = reverse("accounts:dashboard_search")
        response = self.client.get(url, {"q": "shared"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = {user["id"] for user in response.data["users"]}
        self.assertIn(self.viewer.id, returned_ids)
        self.assertIn(public_other.id, returned_ids)
        self.assertNotIn(private_other.id, returned_ids)

    def test_dashboard_recommendations_limit_is_clamped_and_diversified(self):
        owner_many = User.objects.create_user(
            username="owner-many",
            email="owner-many@example.com",
            password="testpass123",
            first_name="Owner",
            last_name="Many",
            user_type="individual",
            is_public=True,
            location="Bratislava",
            district="Bratislava I",
        )
        for index in range(3):
            OfferedSkill.objects.create(
                user=owner_many,
                category="Grafika",
                subcategory=f"Logo {index}",
                description="Skill",
                detailed_description="Detaily",
                location="Bratislava",
                district="Bratislava I",
                is_hidden=False,
                is_seeking=True,
            )

        owner_other = User.objects.create_user(
            username="owner-other",
            email="owner-other@example.com",
            password="testpass123",
            first_name="Owner",
            last_name="Other",
            user_type="individual",
            is_public=True,
            location="Bratislava",
            district="Bratislava I",
        )
        OfferedSkill.objects.create(
            user=owner_other,
            category="Grafika",
            subcategory="Logo other",
            description="Skill",
            detailed_description="Detaily",
            location="Bratislava",
            district="Bratislava I",
            is_hidden=False,
            is_seeking=True,
        )

        url = reverse("accounts:dashboard_search_recommendations")
        response = self.client.get(url, {"limit": "999"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertLessEqual(len(response.data["skills"]), 20)
        owner_many_count = sum(
            1 for skill in response.data["skills"] if skill["user_id"] == owner_many.id
        )
        self.assertLessEqual(owner_many_count, 2)

    def test_dashboard_recommendations_cache_is_invalidated_after_viewer_skill_change(self):
        local_owner = User.objects.create_user(
            username="local-cold",
            email="local-cold@example.com",
            password="testpass123",
            first_name="Local",
            last_name="Cold",
            user_type="individual",
            is_public=True,
            is_verified=True,
            location="Bratislava",
            district="Bratislava I",
        )
        cold_skill = OfferedSkill.objects.create(
            user=local_owner,
            category="Upratovanie",
            subcategory="Byt",
            description="Pomoc s bytom",
            detailed_description="Detaily",
            location="Bratislava",
            district="Bratislava I",
            is_hidden=False,
            is_seeking=True,
        )

        logo_owner = User.objects.create_user(
            username="logo-hot",
            email="logo-hot@example.com",
            password="testpass123",
            first_name="Logo",
            last_name="Hot",
            user_type="individual",
            is_public=True,
            location="Bratislava",
            district="Bratislava I",
        )
        hot_skill = OfferedSkill.objects.create(
            user=logo_owner,
            category="Grafika",
            subcategory="Logo",
            description="Hladam logo",
            detailed_description="Detaily",
            tags=["branding"],
            location="Bratislava",
            district="Bratislava I",
            is_hidden=False,
            is_seeking=True,
        )

        url = reverse("accounts:dashboard_search_recommendations")
        first_response = self.client.get(url, {"limit": "5"})

        self.assertEqual(first_response.status_code, status.HTTP_200_OK)
        self.assertEqual(first_response.data["skills"][0]["id"], cold_skill.id)

        OfferedSkill.objects.create(
            user=self.viewer,
            category="Grafika",
            subcategory="Logo",
            description="Ponukam logo",
            detailed_description="Detaily",
            tags=["branding"],
            is_hidden=False,
            is_seeking=False,
        )

        second_response = self.client.get(url, {"limit": "5"})

        self.assertEqual(second_response.status_code, status.HTTP_200_OK)
        self.assertEqual(second_response.data["skills"][0]["id"], hot_skill.id)

    def tearDown(self):
        cache.clear()
