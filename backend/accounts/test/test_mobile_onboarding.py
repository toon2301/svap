import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.profile_serializers import UserProfileSerializer


User = get_user_model()


@pytest.mark.django_db
class TestMobileOnboarding(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="onboarding-user",
            email="onboarding@example.com",
            password="StrongPass123",
            is_verified=True,
        )
        self.url = reverse("accounts:mobile_onboarding")

    def test_new_user_has_default_mobile_onboarding_state(self):
        assert self.user.mobile_onboarding_status == "in_progress"
        assert self.user.mobile_onboarding_step == "home"

    def test_me_returns_mobile_onboarding_state(self):
        self.client.force_authenticate(self.user)

        response = self.client.get(reverse("accounts:me"))

        assert response.status_code == status.HTTP_200_OK
        assert response.data["mobile_onboarding"] == {
            "version": 1,
            "status": "in_progress",
            "step": "home",
        }

    def test_anonymous_update_is_rejected(self):
        response = self.client.patch(
            self.url,
            {"status": "completed", "step": "edit_form"},
            format="json",
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_update_mobile_onboarding_state(self):
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
        assert self.user.mobile_onboarding_status == "in_progress"
        assert self.user.mobile_onboarding_step == "profile_icon"

    def test_update_rejects_unknown_fields(self):
        self.client.force_authenticate(self.user)

        response = self.client.patch(
            self.url,
            {"status": "in_progress", "step": "home", "user_id": 999},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["code"] == "VALIDATION_ERROR"

    def test_update_rejects_invalid_values(self):
        self.client.force_authenticate(self.user)

        response = self.client.patch(
            self.url,
            {"status": "paused", "step": "home"},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_completed_state_must_end_on_edit_form(self):
        self.client.force_authenticate(self.user)

        response = self.client.patch(
            self.url,
            {"status": "completed", "step": "profile_edit"},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_terminal_state_cannot_be_reopened(self):
        self.user.mobile_onboarding_status = "completed"
        self.user.mobile_onboarding_step = "edit_form"
        self.user.save(update_fields=["mobile_onboarding_status", "mobile_onboarding_step"])
        self.client.force_authenticate(self.user)

        response = self.client.patch(
            self.url,
            {"status": "in_progress", "step": "profile_icon"},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        self.user.refresh_from_db()
        assert self.user.mobile_onboarding_status == "completed"
        assert self.user.mobile_onboarding_step == "edit_form"

    def test_mobile_onboarding_is_hidden_from_non_owner_profile_serializer(self):
        other = User.objects.create_user(
            username="viewer",
            email="viewer@example.com",
            password="StrongPass123",
            is_verified=True,
        )
        request = type("Request", (), {"user": other})()

        data = UserProfileSerializer(self.user, context={"request": request}).data

        assert "mobile_onboarding" not in data
