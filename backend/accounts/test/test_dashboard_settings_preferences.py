from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import UserProfile

User = get_user_model()


class DashboardSettingsPreferencesTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="settings-user",
            email="settings@example.com",
            password="testpass123",
            is_public=False,
        )
        self.profile, _ = UserProfile.objects.get_or_create(user=self.user)
        self.profile.email_notifications = False
        self.profile.push_notifications = True
        self.profile.show_email = True
        self.profile.show_phone = False
        self.profile.save()
        self.client.force_authenticate(user=self.user)

        self.dashboard_settings_url = reverse("accounts:dashboard_settings")
        self.push_preferences_url = reverse("accounts:push_preferences")

    def test_push_preferences_get_returns_persisted_values(self):
        response = self.client.get(self.push_preferences_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            {
                "email_notifications": False,
                "push_notifications": True,
            },
        )

    def test_push_preferences_patch_persists_changes(self):
        response = self.client.patch(
            self.push_preferences_url,
            {"push_notifications": False},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            {
                "email_notifications": False,
                "push_notifications": False,
            },
        )

        self.profile.refresh_from_db()
        self.assertFalse(self.profile.push_notifications)
        self.assertFalse(self.profile.email_notifications)

    def test_dashboard_settings_get_returns_real_notification_values(self):
        response = self.client.get(self.dashboard_settings_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["notifications"],
            {
                "email_notifications": False,
                "push_notifications": True,
            },
        )
        self.assertEqual(response.data["privacy"]["profile_visibility"], "private")
        self.assertTrue(response.data["privacy"]["show_email"])
        self.assertFalse(response.data["privacy"]["show_phone"])

    def test_dashboard_settings_patch_updates_notification_preferences(self):
        response = self.client.patch(
            self.dashboard_settings_url,
            {
                "notifications": {
                    "email_notifications": True,
                    "push_notifications": False,
                }
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["settings"]["notifications"],
            {
                "email_notifications": True,
                "push_notifications": False,
            },
        )

        self.profile.refresh_from_db()
        self.assertTrue(self.profile.email_notifications)
        self.assertFalse(self.profile.push_notifications)
