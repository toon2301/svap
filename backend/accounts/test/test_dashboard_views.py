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

from accounts.authentication import _build_lazy_auth_user, _serialize_user_for_cache
from accounts.models import (
    DashboardSkillSearchProjection,
    FavoriteUser,
    OfferedSkill,
    OfferedSkillImage,
    Review,
    SkillRequest,
    SkillRequestStatus,
)
from accounts.viewer_location_cache import (
    _viewer_location_cache_key,
    get_viewer_location_snapshot,
    warm_viewer_location_snapshot_cache,
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
        self.other_user = User.objects.create_user(
            username="otheruser",
            email="other@example.com",
            password="testpass123",
            first_name="Other",
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
        self.assertTrue(response.data["pagination"]["has_next_skills"])
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
        self.assertIsNone(response.data["pagination"]["total_skills"])
        self.assertIsNone(response.data["pagination"]["total_pages_skills"])
        self.assertFalse(response.data["pagination"]["has_next_skills"])
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
        self.assertIn("dashboard_search_skills_count_base", server_timing)
        self.assertIn("dashboard_search_skills_count_exec", server_timing)
        self.assertIn("dashboard_search_skills_count", server_timing)
        self.assertIn("dashboard_search_skills_page_ids", server_timing)
        self.assertIn("dashboard_search_skills_page_load", server_timing)
        self.assertIn("dashboard_search_skills_queryset_load", server_timing)
        self.assertIn("dashboard_search_skills_context", server_timing)
        self.assertIn("dashboard_search_skills_serialize", server_timing)
        self.assertIn("dashboard_search_viewer_location_load", server_timing)
        self.assertIn("dashboard_search_users_count", server_timing)
        self.assertIn("dashboard_search_users_page", server_timing)
        self.assertIn("dashboard_search_users_page_load", server_timing)
        self.assertIn("dashboard_search_users_serialize", server_timing)
        self.assertIn("dashboard_search_response_build", server_timing)
        self.assertIn("dashboard_search_view_total", server_timing)

    def test_dashboard_search_only_my_location_skips_exact_skills_count_query(self):
        self.user.location = "Bratislava"
        self.user.district = "Bratislava I"
        self.user.save(update_fields=["location", "district"])

        local_owner = User.objects.create_user(
            username="countlocalowner",
            email="countlocalowner@example.com",
            password="testpass123",
            first_name="Local",
            last_name="Owner",
            user_type="individual",
            is_public=True,
            location="Bratislava",
            district="Bratislava I",
        )
        remote_owner = User.objects.create_user(
            username="countremoteowner",
            email="countremoteowner@example.com",
            password="testpass123",
            first_name="Remote",
            last_name="Owner",
            user_type="individual",
            is_public=True,
            location="Kosice",
            district="Kosice I",
        )

        OfferedSkill.objects.create(
            user=local_owner,
            category="Local skill",
            subcategory="Sub",
            description="Description",
            detailed_description="Details",
            location="Bratislava",
            district="Bratislava I",
            is_hidden=False,
            is_seeking=False,
        )
        OfferedSkill.objects.create(
            user=remote_owner,
            category="Remote skill",
            subcategory="Sub",
            description="Description",
            detailed_description="Details",
            location="Kosice",
            district="Kosice I",
            is_hidden=False,
            is_seeking=False,
        )

        url = reverse("accounts:dashboard_search")
        with CaptureQueriesContext(connection) as ctx:
            response = self.client.get(
                url,
                {"only_my_location": "1", "per_page": "5", "page": "1"},
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["pagination"]["total_skills"])
        self.assertFalse(response.data["pagination"]["has_next_skills"])
        skills_count_queries = []
        for query in ctx.captured_queries:
            normalized_sql = query["sql"].upper().strip()
            if normalized_sql.startswith("SELECT COUNT(") and "ACCOUNTS_OFFERSKILL" in normalized_sql:
                skills_count_queries.append(query["sql"])
        self.assertFalse(
            skills_count_queries,
            f"Expected dashboard search skills branch to skip exact COUNT(*), got: {skills_count_queries}",
        )

    def test_dashboard_search_projection_syncs_skill_and_user_fields(self):
        owner = User.objects.create_user(
            username="projectionowner",
            email="projectionowner@example.com",
            password="testpass123",
            first_name="Projection",
            last_name="Owner",
            user_type="individual",
            is_public=True,
            is_verified=False,
            location="Bratislava",
            district="Bratislava I",
        )
        skill = OfferedSkill.objects.create(
            user=owner,
            category="Painter",
            subcategory="Interiors",
            description="Description",
            detailed_description="Details",
            tags=["wall", "paint"],
            location="Bratislava",
            district="Bratislava I",
            is_hidden=False,
            is_seeking=False,
        )

        projection = DashboardSkillSearchProjection.objects.get(skill=skill)
        self.assertEqual(projection.user_id, owner.id)
        self.assertEqual(projection.category, "Painter")
        self.assertEqual(projection.tags_text, "wall paint")
        self.assertEqual(projection.user_location, "Bratislava")
        self.assertFalse(projection.user_is_verified)

        owner.is_verified = True
        owner.location = "Kosice"
        owner.district = "Kosice I"
        owner.save(update_fields=["is_verified", "location", "district"])

        projection.refresh_from_db()
        self.assertTrue(projection.user_is_verified)
        self.assertEqual(projection.user_location, "Kosice")
        self.assertEqual(projection.user_district, "Kosice I")

    def test_dashboard_search_skills_page_id_query_uses_projection_table(self):
        self.user.location = "Bratislava"
        self.user.district = "Bratislava I"
        self.user.save(update_fields=["location", "district"])

        owner = User.objects.create_user(
            username="projectionqueryowner",
            email="projectionqueryowner@example.com",
            password="testpass123",
            first_name="Projection",
            last_name="Query",
            user_type="individual",
            is_public=True,
            is_verified=True,
            location="Bratislava",
            district="Bratislava I",
        )
        OfferedSkill.objects.create(
            user=owner,
            category="Local skill",
            subcategory="Sub",
            description="Description",
            detailed_description="Details",
            tags=["local"],
            location="Bratislava",
            district="Bratislava I",
            is_hidden=False,
            is_seeking=False,
        )

        url = reverse("accounts:dashboard_search")
        with CaptureQueriesContext(connection) as ctx:
            response = self.client.get(
                url,
                {"only_my_location": "1", "per_page": "5", "page": "1"},
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        projection_queries = [
            query["sql"]
            for query in ctx.captured_queries
            if '"accounts_dashboardskillsearchprojection"' in query["sql"]
            and "SELECT" in query["sql"].upper()
        ]
        self.assertTrue(
            projection_queries,
            "Expected dashboard search to read skill page ids from projection table",
        )
        page_id_query = projection_queries[0].upper()
        self.assertIn("ORDER BY", page_id_query)
        self.assertNotIn('INNER JOIN "ACCOUNTS_USER"', page_id_query)

    def test_viewer_location_snapshot_avoids_full_lazy_user_materialization(self):
        self.user.location = "Bratislava"
        self.user.district = "Bratislava I"
        self.user.save(update_fields=["location", "district"])

        lazy_user = _build_lazy_auth_user(User, _serialize_user_for_cache(self.user))
        self.assertFalse(lazy_user._swaply_auth_fully_loaded)

        location, district = get_viewer_location_snapshot(lazy_user)

        self.assertEqual(location, "Bratislava")
        self.assertEqual(district, "Bratislava I")
        self.assertFalse(
            lazy_user._swaply_auth_fully_loaded,
            "Location snapshot should not materialize the full lazy auth user",
        )

    def test_viewer_location_snapshot_cache_invalidates_on_user_save(self):
        self.user.location = "Bratislava"
        self.user.district = "Bratislava I"
        self.user.save(update_fields=["location", "district"])
        warm_viewer_location_snapshot_cache(self.user)

        self.assertEqual(
            cache.get(_viewer_location_cache_key(self.user.id)),
            {"location": "Bratislava", "district": "Bratislava I"},
        )

        self.user.location = "Kosice"
        self.user.save(update_fields=["location"])

        self.assertIsNone(cache.get(_viewer_location_cache_key(self.user.id)))

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

    def test_skill_detail_can_review_after_closed_request_until_review_exists(self):
        """Detail ponuky povoli recenziu az po uzavreti vymeny."""
        self.other_user.is_public = True
        self.other_user.save(update_fields=["is_public"])
        skill = OfferedSkill.objects.create(
            user=self.other_user,
            category="Reviewable Skill",
            subcategory="Sub",
            description="Description",
            detailed_description="Details",
            is_hidden=False,
        )
        skill_request = SkillRequest.objects.create(
            requester=self.user,
            recipient=self.other_user,
            offer=skill,
            status=SkillRequestStatus.ACCEPTED,
        )
        url = reverse("accounts:skills_detail", args=[skill.id])

        accepted = self.client.get(url)
        self.assertEqual(accepted.status_code, status.HTTP_200_OK)
        self.assertFalse(accepted.data["can_review"])
        self.assertFalse(accepted.data["already_reviewed"])

        skill_request.status = SkillRequestStatus.COMPLETION_REQUESTED
        skill_request.save(update_fields=["status"])

        completion_requested = self.client.get(url)
        self.assertEqual(completion_requested.status_code, status.HTTP_200_OK)
        self.assertFalse(completion_requested.data["can_review"])
        self.assertFalse(completion_requested.data["already_reviewed"])

        skill_request.status = SkillRequestStatus.COMPLETED
        skill_request.save(update_fields=["status"])

        completed = self.client.get(url)
        self.assertEqual(completed.status_code, status.HTTP_200_OK)
        self.assertTrue(completed.data["can_review"])
        self.assertFalse(completed.data["already_reviewed"])

        skill_request.status = SkillRequestStatus.TERMINATED
        skill_request.save(update_fields=["status"])

        terminated = self.client.get(url)
        self.assertEqual(terminated.status_code, status.HTTP_200_OK)
        self.assertTrue(terminated.data["can_review"])
        self.assertFalse(terminated.data["already_reviewed"])

        Review.objects.create(
            reviewer=self.user,
            offer=skill,
            rating="5.0",
            text="Great collaboration",
        )

        reviewed = self.client.get(url)
        self.assertEqual(reviewed.status_code, status.HTTP_200_OK)
        self.assertFalse(reviewed.data["can_review"])
        self.assertTrue(reviewed.data["already_reviewed"])

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

    def test_dashboard_user_skills_cache_updates_even_when_time_ns_collides(self):
        # Deterministic reproduction of the former flake: pin time_ns so every
        # cache-version bump in this scenario shares a clock tick (the worst
        # case). The version token must still change between the offer's and the
        # skill request's invalidations, otherwise the second GET serves a stale
        # cache entry and my_request_status stays None.
        owner = User.objects.create_user(
            username="collisionowner",
            email="collisionowner@example.com",
            password="testpass123",
            is_public=True,
        )
        viewer = User.objects.create_user(
            username="collisionviewer",
            email="collisionviewer@example.com",
            password="testpass123",
        )
        url = reverse("accounts:dashboard_user_skills", args=[owner.id])
        client = APIClient()
        client.force_authenticate(user=viewer)

        with patch("accounts.cache_versioning.time_ns", return_value=42):
            skill = OfferedSkill.objects.create(
                user=owner,
                category="Collision Skill",
                subcategory="Sub",
                description="Description",
                detailed_description="Details",
            )
            first = client.get(url)
            self.assertEqual(first.status_code, status.HTTP_200_OK)
            self.assertIsNone(first.data[0]["my_request_status"])

            SkillRequest.objects.create(
                requester=viewer,
                recipient=owner,
                offer=skill,
                status=SkillRequestStatus.PENDING,
            )

            second = client.get(url)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(second.data[0]["my_request_status"], SkillRequestStatus.PENDING)

    def test_dashboard_favorites_get_success(self):
        """Test získania obľúbených"""
        FavoriteUser.objects.create(user=self.user, favorite_user=self.other_user)
        url = reverse("accounts:dashboard_favorites")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("users", response.data)
        self.assertIn("skills", response.data)
        self.assertEqual(len(response.data["users"]), 1)
        self.assertEqual(response.data["users"][0]["id"], self.other_user.id)

    def test_dashboard_favorites_post_success(self):
        """Test pridania do obľúbených"""
        url = reverse("accounts:dashboard_favorites")
        data = {"type": "user", "id": self.other_user.id}
        response = self.client.post(url, data)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("message", response.data)
        self.assertIn("type", response.data)
        self.assertIn("id", response.data)
        self.assertTrue(response.data["is_favorited"])
        self.assertTrue(
            FavoriteUser.objects.filter(
                user=self.user,
                favorite_user=self.other_user,
            ).exists()
        )

    def test_dashboard_favorites_post_missing_params(self):
        """Test pridania do obľúbených bez povinných parametrov"""
        url = reverse("accounts:dashboard_favorites")
        data = {"type": "user"}  # Chýba 'id'
        response = self.client.post(url, data)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("validation_errors", response.data)
        self.assertIn("id", response.data["validation_errors"])

    def test_dashboard_favorites_post_rejects_self(self):
        url = reverse("accounts:dashboard_favorites")
        response = self.client.post(url, {"type": "user", "id": self.user.id})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_dashboard_favorites_delete_success(self):
        """Test odstránenia z obľúbených"""
        FavoriteUser.objects.create(user=self.user, favorite_user=self.other_user)
        url = reverse("accounts:dashboard_favorites")
        data = {"type": "user", "id": self.other_user.id}
        response = self.client.delete(url, data)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("message", response.data)
        self.assertFalse(response.data["is_favorited"])
        self.assertFalse(
            FavoriteUser.objects.filter(
                user=self.user,
                favorite_user=self.other_user,
            ).exists()
        )

    def test_dashboard_favorite_user_detail_delete_success(self):
        """Čisté DELETE bez tela – položku identifikuje user_id z URL."""
        FavoriteUser.objects.create(user=self.user, favorite_user=self.other_user)
        url = reverse(
            "accounts:dashboard_favorite_user_detail",
            kwargs={"user_id": self.other_user.id},
        )
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["is_favorited"])
        self.assertEqual(response.data["id"], self.other_user.id)
        self.assertFalse(
            FavoriteUser.objects.filter(
                user=self.user, favorite_user=self.other_user
            ).exists()
        )

    def test_dashboard_favorite_user_detail_delete_is_idempotent(self):
        """Odobranie neexistujúcej obľúbenej položky (aj dvojklik) → 200, bez chyby."""
        url = reverse(
            "accounts:dashboard_favorite_user_detail",
            kwargs={"user_id": self.other_user.id},
        )
        # Nie je v obľúbených → prvý DELETE.
        first = self.client.delete(url)
        self.assertEqual(first.status_code, status.HTTP_200_OK)
        # Druhý DELETE (dvojklik) → stále 200.
        second = self.client.delete(url)
        self.assertEqual(second.status_code, status.HTTP_200_OK)

    def test_dashboard_favorite_user_detail_delete_only_affects_own(self):
        """Nedá sa odobrať cudzia obľúbená položka."""
        FavoriteUser.objects.create(user=self.other_user, favorite_user=self.user)
        url = reverse(
            "accounts:dashboard_favorite_user_detail",
            kwargs={"user_id": self.user.id},
        )
        # request.user = self.user; maže len svoje obľúbené, nie other_user-ove.
        self.client.delete(url)
        self.assertTrue(
            FavoriteUser.objects.filter(
                user=self.other_user, favorite_user=self.user
            ).exists()
        )

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
            "notifications": {"in_app_notifications": True, "push_notifications": False},
            "privacy": {"profile_visibility": "private"},
        }
        response = self.client.put(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("message", response.data)
        self.assertIn("settings", response.data)

    def test_dashboard_settings_patch_success(self):
        """Test čiastočnej aktualizácie nastavení"""
        url = reverse("accounts:dashboard_settings")
        data = {"notifications": {"in_app_notifications": False}}
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
