"""
Testy pre nálezy z výkonového/kvalitatívneho auditu vyhľadávania.

BOD 4 — fallback projekcia→legacy v dashboard search loguje WARNING.
BOD 5 — post_save User re-syncuje projekciu len pri zmene relevantných polí.
"""

from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import DatabaseError
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from django.test import TestCase

from accounts.signals import _user_save_touches_projection

User = get_user_model()


class SearchFallbackLoggingTests(TestCase):
    """BOD 4 — tichý prepad na legacy nesmie ostať neviditeľný."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="auditor",
            email="auditor@example.com",
            password="StrongPass123",
            user_type="individual",
        )
        self.client.force_authenticate(user=self.user)

    @patch(
        "accounts.views.dashboard_views.search._build_projection_skills_page_qs",
        side_effect=DatabaseError("projection unavailable"),
    )
    def test_projection_db_error_logs_warning_and_falls_back(self, _mock_projection):
        url = reverse("accounts:dashboard_search")
        with self.assertLogs("swaply", level="WARNING") as captured:
            response = self.client.get(url, {"q": "test"})

        # Legacy cesta dobehne – endpoint stále funguje.
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("skills", response.data)
        # Prepad je zalogovaný (monitoring uvidí pokazenú projekciu).
        self.assertTrue(
            any(
                "projekcia" in message.lower() or "legacy" in message.lower()
                for message in captured.output
            ),
            captured.output,
        )


class UserSaveProjectionSyncGatingTests(TestCase):
    """BOD 5 — re-sync projekcie len pri zmene denormalizovaných User polí."""

    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            username="sync_user",
            email="sync@example.com",
            password="StrongPass123",
            user_type="individual",
        )

    def test_touches_projection_logic(self):
        # Plný save (nevieme čo sa zmenilo) → konzervatívne True.
        self.assertTrue(_user_save_touches_projection(None))
        # Relevantné polia → True.
        self.assertTrue(_user_save_touches_projection(["location"]))
        self.assertTrue(_user_save_touches_projection(["bio", "is_public"]))
        # Irelevantné polia → False.
        self.assertFalse(_user_save_touches_projection(["last_login"]))
        self.assertFalse(_user_save_touches_projection(["bio", "phone"]))
        self.assertFalse(_user_save_touches_projection([]))

    @patch("accounts.signals.sync_dashboard_skill_search_projections_for_user")
    def test_irrelevant_update_fields_skip_resync(self, mock_sync):
        # last_login (napr. pri každom prihlásení) → žiadny re-sync.
        self.user.last_login = timezone.now()
        self.user.save(update_fields=["last_login"])
        self.assertEqual(mock_sync.call_count, 0)

    @patch("accounts.signals.sync_dashboard_skill_search_projections_for_user")
    def test_relevant_update_fields_trigger_resync(self, mock_sync):
        self.user.location = "Bratislava"
        self.user.save(update_fields=["location"])
        self.assertEqual(mock_sync.call_count, 1)

    @patch("accounts.signals.sync_dashboard_skill_search_projections_for_user")
    def test_full_save_triggers_resync(self, mock_sync):
        # update_fields=None → konzervatívne re-sync (zachované pôvodné správanie).
        self.user.save()
        self.assertEqual(mock_sync.call_count, 1)
