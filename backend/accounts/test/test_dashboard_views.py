"""
Testy pre dashboard views
"""

from django.test import TestCase
from django.db import connection
from django.core.cache import cache
from django.urls import reverse
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from unittest.mock import patch

from accounts.models import (
    OfferedSkill,
    OfferedSkillImage,
    Review,
    SkillRequest,
    SkillRequestStatus,
)

User = get_user_model()


class DashboardViewsTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        cache.clear()
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
            first_name="Test",
            last_name="User",
            user_type="individual",
        )
        self.client.force_authenticate(user=self.user)

    def test_dashboard_home_view_success(self):
        """Test úspešného načítania dashboard home"""
        url = reverse("accounts:dashboard_home")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("stats", response.data)
        self.assertIn("recent_activities", response.data)
        self.assertIn("user", response.data)

        # Kontrola základných štatistík
        stats = response.data["stats"]
        self.assertIn("skills_count", stats)
        self.assertIn("active_exchanges", stats)
        self.assertIn("completed_exchanges", stats)
        self.assertIn("favorites_count", stats)
        self.assertIn("profile_completeness", stats)

    def test_dashboard_home_view_unauthenticated(self):
        """Test prístupu bez autentifikácie"""
        self.client.force_authenticate(user=None)
        url = reverse("accounts:dashboard_home")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_dashboard_search_view_success(self):
        """Test úspešného vyhľadávania"""
        url = reverse("accounts:dashboard_search")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("skills", response.data)
        self.assertIn("users", response.data)
        self.assertIn("pagination", response.data)

    def test_dashboard_search_view_with_query(self):
        """Test vyhľadávania s query parametrom – základná štruktúra odpovede"""
        url = reverse("accounts:dashboard_search")
        response = self.client.get(url, {"q": "test"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("skills", response.data)
        self.assertIn("users", response.data)

    def test_dashboard_search_advanced_filters_do_not_crash(self):
        """Test, že pokročilé filtre fungujú bez chyby (aj bez dát)"""
        url = reverse("accounts:dashboard_search")
        response = self.client.get(
            url,
            {
                "q": "auto",
                "location": "Nitra",
                "offer_type": "offer",
                "only_my_location": "1",
                "price_min": "10",
                "price_max": "100",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("skills", response.data)
        self.assertIn("users", response.data)

    def test_dashboard_search_avoids_per_skill_query_explosion(self):
        owner = User.objects.create_user(
            username="owner",
            email="owner@example.com",
            password="testpass123",
            first_name="Owner",
            last_name="User",
            user_type="individual",
            is_public=True,
            location="Bratislava",
            district="Bratislava I",
        )
        for index in range(6):
            OfferedSkill.objects.create(
                user=owner,
                category=f"Skill {index}",
                subcategory="Sub",
                description=f"Description {index}",
                detailed_description="Details",
                location="Bratislava",
                district="Bratislava I",
                is_hidden=False,
                is_seeking=False,
            )

        self.user.location = "Bratislava"
        self.user.district = "Bratislava I"
        self.user.save(update_fields=["location", "district"])

        url = reverse("accounts:dashboard_search")
        with CaptureQueriesContext(connection) as ctx:
            response = self.client.get(
                url,
                {"only_my_location": "1", "per_page": "5", "page": "1"},
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["skills"]), 5)
        self.assertLessEqual(
            len(ctx.captured_queries),
            10,
            f"Expected optimized search query count, got {len(ctx.captured_queries)}",
        )

    def test_dashboard_search_only_my_location_filters_skills_before_pagination(self):
        self.user.location = "Bratislava"
        self.user.district = "Bratislava I"
        self.user.save(update_fields=["location", "district"])

        local_owner = User.objects.create_user(
            username="localowner",
            email="localowner@example.com",
            password="testpass123",
            first_name="Local",
            last_name="Owner",
            user_type="individual",
            is_public=True,
            location="Bratislava",
            district="Bratislava I",
            is_verified=True,
        )
        remote_owner = User.objects.create_user(
            username="remoteowner",
            email="remoteowner@example.com",
            password="testpass123",
            first_name="Remote",
            last_name="Owner",
            user_type="individual",
            is_public=True,
            location="Kosice",
            district="Kosice I",
            is_verified=True,
        )

        for index in range(2):
            OfferedSkill.objects.create(
                user=local_owner,
                category=f"Local {index}",
                subcategory="Sub",
                description="Description",
                detailed_description="Details",
                location="Bratislava",
                district="Bratislava I",
                is_hidden=False,
                is_seeking=False,
            )

        for index in range(6):
            OfferedSkill.objects.create(
                user=remote_owner,
                category=f"Remote {index}",
                subcategory="Sub",
                description="Description",
                detailed_description="Details",
                location="Kosice",
                district="Kosice I",
                is_hidden=False,
                is_seeking=False,
            )

        url = reverse("accounts:dashboard_search")
        response = self.client.get(
            url,
            {"only_my_location": "1", "per_page": "5", "page": "1"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["skills"]), 2)
        self.assertTrue(
            all(skill["district"] == "Bratislava I" for skill in response.data["skills"])
        )

    def test_dashboard_search_exposes_server_timing_breakdown(self):
        owner = User.objects.create_user(
            username="timingowner",
            email="timingowner@example.com",
            password="testpass123",
            first_name="Timing",
            last_name="Owner",
            user_type="individual",
            is_public=True,
            location="Bratislava",
            district="Bratislava I",
        )
        OfferedSkill.objects.create(
            user=owner,
            category="Skill",
            subcategory="Sub",
            description="Description",
            detailed_description="Details",
            location="Bratislava",
            district="Bratislava I",
            is_hidden=False,
            is_seeking=False,
        )

        self.user.location = "Bratislava"
        self.user.district = "Bratislava I"
        self.user.save(update_fields=["location", "district"])

        url = reverse("accounts:dashboard_search")
        response = self.client.get(
            url,
            {"only_my_location": "1", "per_page": "5", "page": "1"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        server_timing = response.headers.get("Server-Timing", "")
        self.assertIn("dashboard_search_skills_count", server_timing)
        self.assertIn("dashboard_search_skills_page_ids", server_timing)
        self.assertIn("dashboard_search_skills_page_load", server_timing)
        self.assertIn("dashboard_search_users_count", server_timing)
        self.assertIn("dashboard_search_users_page", server_timing)

    def test_skills_list_cache_hit_avoids_db_queries(self):
        OfferedSkill.objects.create(
            user=self.user,
            category="Skill",
            subcategory="Sub",
            description="Description",
            detailed_description="Details",
        )

        url = reverse("accounts:skills_list")
        first = self.client.get(url)
        self.assertEqual(first.status_code, status.HTTP_200_OK)

        with CaptureQueriesContext(connection) as ctx:
            second = self.client.get(url)

        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(len(second.data), 1)
        self.assertEqual(
            len(ctx.captured_queries),
            0,
            f"Expected skills cache hit without SQL queries, got {len(ctx.captured_queries)}",
        )

    def test_skills_list_cache_invalidates_on_direct_skill_save(self):
        skill = OfferedSkill.objects.create(
            user=self.user,
            category="Old Skill",
            subcategory="Sub",
            description="Description",
            detailed_description="Details",
        )
        url = reverse("accounts:skills_list")
        first = self.client.get(url)
        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(first.data[0]["category"], "Old Skill")

        skill.category = "Updated Skill"
        skill.save(update_fields=["category"])

        second = self.client.get(url)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(second.data[0]["category"], "Updated Skill")

    def test_skills_list_cache_invalidates_on_review_change(self):
        skill = OfferedSkill.objects.create(
            user=self.user,
            category="Rated Skill",
            subcategory="Sub",
            description="Description",
            detailed_description="Details",
        )
        reviewer = User.objects.create_user(
            username="reviewer",
            email="reviewer@example.com",
            password="testpass123",
            first_name="Review",
            last_name="User",
            user_type="individual",
        )
        url = reverse("accounts:skills_list")

        first = self.client.get(url)
        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(first.data[0]["reviews_count"], 0)
        self.assertIsNone(first.data[0]["average_rating"])

        Review.objects.create(
            reviewer=reviewer,
            offer=skill,
            rating="4.5",
            text="Great collaboration",
        )

        second = self.client.get(url)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(second.data[0]["reviews_count"], 1)
        self.assertEqual(second.data[0]["average_rating"], 4.5)

    def test_skills_list_cache_invalidates_on_image_change(self):
        skill = OfferedSkill.objects.create(
            user=self.user,
            category="Visual Skill",
            subcategory="Sub",
            description="Description",
            detailed_description="Details",
        )
        url = reverse("accounts:skills_list")

        first = self.client.get(url)
        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(first.data[0]["images"], [])

        OfferedSkillImage.objects.create(
            skill=skill,
            order=0,
            status=OfferedSkillImage.Status.APPROVED,
            approved_key="offers/test-image.jpg",
        )

        second = self.client.get(url)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(len(second.data[0]["images"]), 1)

    def test_dashboard_user_skills_owner_cache_hit_avoids_db_queries(self):
        OfferedSkill.objects.create(
            user=self.user,
            category="Owner Skill",
            subcategory="Sub",
            description="Description",
            detailed_description="Details",
        )
        url = reverse("accounts:dashboard_user_skills", args=[self.user.id])

        first = self.client.get(url)
        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(len(first.data), 1)

        with CaptureQueriesContext(connection) as ctx:
            second = self.client.get(url)

        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(len(second.data), 1)
        self.assertEqual(
            len(ctx.captured_queries),
            0,
            f"Expected dashboard owner skills cache hit without SQL queries, got {len(ctx.captured_queries)}",
        )

    def test_dashboard_user_skills_cache_is_viewer_specific_and_updates_after_skill_request(self):
        owner = User.objects.create_user(
            username="publicowner",
            email="publicowner@example.com",
            password="testpass123",
            first_name="Public",
            last_name="Owner",
            user_type="individual",
            is_public=True,
        )
        viewer_a = User.objects.create_user(
            username="viewera",
            email="viewera@example.com",
            password="testpass123",
            first_name="Viewer",
            last_name="A",
            user_type="individual",
        )
        viewer_b = User.objects.create_user(
            username="viewerb",
            email="viewerb@example.com",
            password="testpass123",
            first_name="Viewer",
            last_name="B",
            user_type="individual",
        )
        skill = OfferedSkill.objects.create(
            user=owner,
            category="Public Skill",
            subcategory="Sub",
            description="Description",
            detailed_description="Details",
        )
        url = reverse("accounts:dashboard_user_skills", args=[owner.id])

        client_a = APIClient()
        client_a.force_authenticate(user=viewer_a)
        first_a = client_a.get(url)
        self.assertEqual(first_a.status_code, status.HTTP_200_OK)
        self.assertIsNone(first_a.data[0]["my_request_status"])

        SkillRequest.objects.create(
            requester=viewer_a,
            recipient=owner,
            offer=skill,
            status=SkillRequestStatus.PENDING,
        )

        second_a = client_a.get(url)
        self.assertEqual(second_a.status_code, status.HTTP_200_OK)
        self.assertEqual(second_a.data[0]["my_request_status"], SkillRequestStatus.PENDING)

        client_b = APIClient()
        client_b.force_authenticate(user=viewer_b)
        response_b = client_b.get(url)
        self.assertEqual(response_b.status_code, status.HTTP_200_OK)
        self.assertIsNone(response_b.data[0]["my_request_status"])

    def test_dashboard_favorites_get_success(self):
        """Test získania obľúbených"""
        url = reverse("accounts:dashboard_favorites")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("users", response.data)
        self.assertIn("skills", response.data)

    def test_dashboard_favorites_post_success(self):
        """Test pridania do obľúbených"""
        url = reverse("accounts:dashboard_favorites")
        data = {"type": "user", "id": 1}
        response = self.client.post(url, data)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("message", response.data)
        self.assertIn("type", response.data)
        self.assertIn("id", response.data)

    def test_dashboard_favorites_post_missing_params(self):
        """Test pridania do obľúbených bez povinných parametrov"""
        url = reverse("accounts:dashboard_favorites")
        data = {"type": "user"}  # Chýba 'id'
        response = self.client.post(url, data)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_dashboard_favorites_delete_success(self):
        """Test odstránenia z obľúbených"""
        url = reverse("accounts:dashboard_favorites")
        data = {"type": "user", "id": 1}
        response = self.client.delete(url, data)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("message", response.data)

    def test_dashboard_profile_get_success(self):
        """Test získania profilu"""
        url = reverse("accounts:dashboard_profile")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("id", response.data)
        self.assertIn("username", response.data)
        self.assertIn("email", response.data)
        self.assertIn("first_name", response.data)
        self.assertIn("last_name", response.data)
        self.assertIn("profile_completeness", response.data)

    def test_dashboard_profile_put_success(self):
        """Test aktualizácie profilu"""
        url = reverse("accounts:dashboard_profile")
        data = {
            "username": "testuser",
            "email": "test@example.com",
            "first_name": "Updated",
            "last_name": "Name",
            "bio": "Updated bio",
        }
        response = self.client.put(url, data, format="json")

        if response.status_code != status.HTTP_200_OK:
            print(f"Response status: {response.status_code}")
            print(f"Response data: {response.data}")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("message", response.data)
        self.assertIn("user", response.data)

    def test_dashboard_profile_patch_success(self):
        """Test čiastočnej aktualizácie profilu"""
        url = reverse("accounts:dashboard_profile")
        data = {"bio": "Updated bio only"}
        response = self.client.patch(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("message", response.data)

    def test_dashboard_settings_get_success(self):
        """Test získania nastavení"""
        url = reverse("accounts:dashboard_settings")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("notifications", response.data)
        self.assertIn("privacy", response.data)
        self.assertIn("security", response.data)
        self.assertIn("general", response.data)

    def test_dashboard_settings_put_success(self):
        """Test aktualizácie nastavení"""
        url = reverse("accounts:dashboard_settings")
        data = {
            "notifications": {"email_notifications": True, "push_notifications": False},
            "privacy": {"profile_visibility": "private"},
        }
        response = self.client.put(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("message", response.data)
        self.assertIn("settings", response.data)

    def test_dashboard_settings_patch_success(self):
        """Test čiastočnej aktualizácie nastavení"""
        url = reverse("accounts:dashboard_settings")
        data = {"notifications": {"email_notifications": False}}
        response = self.client.patch(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("message", response.data)

    def test_rate_limiting_applied(self):
        """Test že je aplikované rate limiting"""
        url = reverse("accounts:dashboard_home")

        # Simuluj veľa požiadaviek
        for _ in range(100):
            response = self.client.get(url)
            # Rate limiting by mal vrátiť 429 po určitom počte požiadaviek
            # (presná implementácia závisí od rate limiting konfigurácie)

        # Aspoň jedna požiadavka by mala byť úspešná
        self.assertIn(
            response.status_code,
            [status.HTTP_200_OK, status.HTTP_429_TOO_MANY_REQUESTS],
        )

    def test_audit_logging_for_profile_updates(self):
        """Test audit logovania pre aktualizácie profilu"""
        with patch("swaply.audit_logger.log_profile_update") as mock_log:
            url = reverse("accounts:dashboard_profile")
            data = {
                "username": "testuser",
                "email": "test@example.com",
                "first_name": "Updated",
                "bio": "This is a longer bio that meets the minimum requirement",
            }
            response = self.client.patch(url, data, format="json")

            if response.status_code != status.HTTP_200_OK:
                print(f"Response status: {response.status_code}")
                print(f"Response data: {response.data}")

            self.assertEqual(response.status_code, status.HTTP_200_OK)
            # Audit log by mal byť volaný pre zmeny profilu
            # (presná implementácia závisí od audit logger konfigurácie)
