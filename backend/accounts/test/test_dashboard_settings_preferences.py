from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import UserProfile

User = get_user_model()


class DashboardSettingsPreferencesTests(APITestCase):
    """
    Čítanie a ukladanie volieb upozornení cez push/preferences/ a dashboard/settings/.

    Server nesie sedem volieb: dva hlavné vypínače a päť kategórií upozornení.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            username="settings-user",
            email="settings@example.com",
            password="testpass123",
            is_public=False,
        )
        self.profile, _ = UserProfile.objects.get_or_create(user=self.user)
        self.profile.in_app_notifications = False
        self.profile.push_notifications = True
        self.profile.show_email = True
        self.profile.show_phone = False
        self.profile.save()
        self.client.force_authenticate(user=self.user)

        self.dashboard_settings_url = reverse("accounts:dashboard_settings")
        self.push_preferences_url = reverse("accounts:push_preferences")

    def test_push_preferences_get_returns_persisted_values(self):
        """GET push/preferences/ vráti uložených sedem volieb (kategórie zapnuté)."""
        response = self.client.get(self.push_preferences_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            {
                "in_app_notifications": False,
                "push_notifications": True,
                "notify_likes": True,
                "notify_comment_likes": True,
                "notify_comments": True,
                "notify_tags_and_shares": True,
                "notify_skill_requests": True,
            },
        )

    def test_push_preferences_patch_persists_changes(self):
        """PATCH push/preferences/ uloží jednu voľbu a vráti všetkých sedem hodnôt."""
        response = self.client.patch(
            self.push_preferences_url,
            {"push_notifications": False},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            {
                "in_app_notifications": False,
                "push_notifications": False,
                "notify_likes": True,
                "notify_comment_likes": True,
                "notify_comments": True,
                "notify_tags_and_shares": True,
                "notify_skill_requests": True,
            },
        )

        self.profile.refresh_from_db()
        self.assertFalse(self.profile.push_notifications)
        self.assertFalse(self.profile.in_app_notifications)

    def test_dashboard_settings_get_returns_real_notification_values(self):
        """GET dashboard/settings/ nesie v notifications sedem skutočných hodnôt."""
        response = self.client.get(self.dashboard_settings_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["notifications"],
            {
                "in_app_notifications": False,
                "push_notifications": True,
                "notify_likes": True,
                "notify_comment_likes": True,
                "notify_comments": True,
                "notify_tags_and_shares": True,
                "notify_skill_requests": True,
            },
        )
        self.assertEqual(response.data["privacy"]["profile_visibility"], "private")
        self.assertTrue(response.data["privacy"]["show_email"])
        self.assertFalse(response.data["privacy"]["show_phone"])

    def test_dashboard_settings_patch_updates_notification_preferences(self):
        """PATCH dashboard/settings/ zmení zadané voľby a vráti všetkých sedem."""
        response = self.client.patch(
            self.dashboard_settings_url,
            {
                "notifications": {
                    "in_app_notifications": True,
                    "push_notifications": False,
                }
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["settings"]["notifications"],
            {
                "in_app_notifications": True,
                "push_notifications": False,
                "notify_likes": True,
                "notify_comment_likes": True,
                "notify_comments": True,
                "notify_tags_and_shares": True,
                "notify_skill_requests": True,
            },
        )

        self.profile.refresh_from_db()
        self.assertTrue(self.profile.in_app_notifications)
        self.assertFalse(self.profile.push_notifications)
