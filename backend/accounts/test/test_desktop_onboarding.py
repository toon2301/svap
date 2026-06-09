import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.profile_serializers import UserProfileSerializer


User = get_user_model()


@pytest.mark.django_db
class TestDesktopOnboarding(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="desktop-onboarding-user",
            email="desktop-onboarding@example.com",
            password="StrongPass123",
            is_verified=True,
        )
        self.url = reverse("accounts:desktop_onboarding")

    def test_new_user_has_default_desktop_onboarding_state(self):
        assert self.user.desktop_onboarding_status == "in_progress"
        assert self.user.desktop_onboarding_step == "navigation"

    def test_me_returns_desktop_onboarding_state(self):
        self.client.force_authenticate(self.user)

        response = self.client.get(reverse("accounts:me"))

        assert response.status_code == status.HTTP_200_OK
        assert response.data["desktop_onboarding"] == {
            "version": 1,
            "status": "in_progress",
            "step": "navigation",
        }

    def test_anonymous_update_is_rejected(self):
        response = self.client.patch(
            self.url,
            {"status": "completed", "step": "profile_icon"},
            format="json",
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_update_desktop_onboarding_profile_icon_step(self):
        self.client.force_authenticate(self.user)

        response = self.client.patch(
            self.url,
            {"status": "in_progress", "step": "profile_icon"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data == {
            "version": 1,
            "status": "in_progress",
            "step": "profile_icon",
        }
        self.user.refresh_from_db()
        assert self.user.desktop_onboarding_status == "in_progress"
        assert self.user.desktop_onboarding_step == "profile_icon"

    def test_update_rejects_unknown_fields(self):
        self.client.force_authenticate(self.user)

        response = self.client.patch(
            self.url,
            {"status": "in_progress", "step": "navigation", "user_id": 999},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["code"] == "VALIDATION_ERROR"

    def test_completed_state_must_end_on_terminal_step(self):
        self.client.force_authenticate(self.user)

        response = self.client.patch(
            self.url,
            {"status": "completed", "step": "navigation"},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_completed_state_can_end_on_profile_icon(self):
        self.client.force_authenticate(self.user)

        response = self.client.patch(
            self.url,
            {"status": "completed", "step": "profile_icon"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data == {
            "version": 1,
            "status": "completed",
            "step": "profile_icon",
        }
        self.user.refresh_from_db()
        assert self.user.desktop_onboarding_status == "completed"
        assert self.user.desktop_onboarding_step == "profile_icon"

    def test_terminal_state_cannot_be_reopened(self):
        self.user.desktop_onboarding_status = "completed"
        self.user.desktop_onboarding_step = "profile_icon"
        self.user.save(update_fields=["desktop_onboarding_status", "desktop_onboarding_step"])
        self.client.force_authenticate(self.user)

        response = self.client.patch(
            self.url,
            {"status": "in_progress", "step": "navigation"},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        self.user.refresh_from_db()
        assert self.user.desktop_onboarding_status == "completed"
        assert self.user.desktop_onboarding_step == "profile_icon"

    def test_terminal_state_cannot_change_step_only(self):
        self.user.desktop_onboarding_status = "completed"
        self.user.desktop_onboarding_step = "profile_icon"
        self.user.save(update_fields=["desktop_onboarding_status", "desktop_onboarding_step"])
        self.client.force_authenticate(self.user)

        response = self.client.patch(
            self.url,
            {"status": "completed", "step": "navigation"},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        self.user.refresh_from_db()
        assert self.user.desktop_onboarding_status == "completed"
        assert self.user.desktop_onboarding_step == "profile_icon"

    def test_skipped_state_can_preserve_current_step(self):
        self.client.force_authenticate(self.user)

        response = self.client.patch(
            self.url,
            {"status": "skipped", "step": "navigation"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data == {
            "version": 1,
            "status": "skipped",
            "step": "navigation",
        }
        self.user.refresh_from_db()
        assert self.user.desktop_onboarding_status == "skipped"
        assert self.user.desktop_onboarding_step == "navigation"

    def test_skipped_state_cannot_change_step_only(self):
        self.user.desktop_onboarding_status = "skipped"
        self.user.desktop_onboarding_step = "navigation"
        self.user.save(update_fields=["desktop_onboarding_status", "desktop_onboarding_step"])
        self.client.force_authenticate(self.user)

        response = self.client.patch(
            self.url,
            {"status": "skipped", "step": "profile_icon"},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        self.user.refresh_from_db()
        assert self.user.desktop_onboarding_status == "skipped"
        assert self.user.desktop_onboarding_step == "navigation"

    def test_desktop_onboarding_is_hidden_from_non_owner_profile_serializer(self):
        other = User.objects.create_user(
            username="viewer",
            email="viewer-desktop@example.com",
            password="StrongPass123",
            is_verified=True,
        )
        request = type("Request", (), {"user": other})()

        data = UserProfileSerializer(self.user, context={"request": request}).data

        assert "desktop_onboarding" not in data
