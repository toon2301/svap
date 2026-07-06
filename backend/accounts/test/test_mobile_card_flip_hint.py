import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIRequestFactory, APITestCase, force_authenticate

from accounts.profile_serializers import UserProfileSerializer


User = get_user_model()


@pytest.mark.django_db
class TestMobileCardFlipHint(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="card-hint-user",
            email="card-hint@example.com",
            password="StrongPass123",
            is_verified=True,
        )
        self.url = reverse("accounts:mobile_card_flip_hint")

    def test_new_user_has_default_card_flip_hint_state(self):
        assert self.user.mobile_card_flip_hint_own_completed is False
        assert self.user.mobile_card_flip_hint_foreign_completed is False

    def test_me_returns_card_flip_hint_state(self):
        self.client.force_authenticate(self.user)

        response = self.client.get(reverse("accounts:me"))

        assert response.status_code == status.HTTP_200_OK
        assert response.data["mobile_card_flip_hint"] == {
            "version": 1,
            "own_completed": False,
            "foreign_completed": False,
        }

    def test_anonymous_update_is_rejected(self):
        response = self.client.patch(self.url, {"context": "own"}, format="json")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_complete_own_profile_hint(self):
        self.client.force_authenticate(self.user)

        response = self.client.patch(self.url, {"context": "own"}, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data == {
            "version": 1,
            "own_completed": True,
            "foreign_completed": False,
        }
        self.user.refresh_from_db()
        assert self.user.mobile_card_flip_hint_own_completed is True
        assert self.user.mobile_card_flip_hint_foreign_completed is False

    def test_complete_foreign_profile_hint(self):
        self.client.force_authenticate(self.user)

        response = self.client.patch(self.url, {"context": "foreign"}, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data == {
            "version": 1,
            "own_completed": False,
            "foreign_completed": True,
        }
        self.user.refresh_from_db()
        assert self.user.mobile_card_flip_hint_own_completed is False
        assert self.user.mobile_card_flip_hint_foreign_completed is True

    def test_complete_hint_is_idempotent(self):
        self.user.mobile_card_flip_hint_own_completed = True
        self.user.save(update_fields=["mobile_card_flip_hint_own_completed"])
        self.client.force_authenticate(self.user)

        response = self.client.patch(self.url, {"context": "own"}, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data == {
            "version": 1,
            "own_completed": True,
            "foreign_completed": False,
        }

    def test_invalid_context_is_rejected(self):
        self.client.force_authenticate(self.user)

        response = self.client.patch(self.url, {"context": "desktop"}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        self.user.refresh_from_db()
        assert self.user.mobile_card_flip_hint_own_completed is False
        assert self.user.mobile_card_flip_hint_foreign_completed is False

    def test_unknown_field_is_rejected(self):
        self.client.force_authenticate(self.user)

        response = self.client.patch(
            self.url,
            {"context": "own", "own_completed": True},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        self.user.refresh_from_db()
        assert self.user.mobile_card_flip_hint_own_completed is False
        assert self.user.mobile_card_flip_hint_foreign_completed is False

    def test_serializer_hides_card_flip_hint_for_non_owner(self):
        viewer = User.objects.create_user(
            username="profile-viewer",
            email="viewer@example.com",
            password="StrongPass123",
            is_verified=True,
        )
        self.user.mobile_card_flip_hint_own_completed = True
        self.user.mobile_card_flip_hint_foreign_completed = True
        self.user.save(
            update_fields=[
                "mobile_card_flip_hint_own_completed",
                "mobile_card_flip_hint_foreign_completed",
            ]
        )
        request = APIRequestFactory().get("/")
        force_authenticate(request, viewer)
        request.user = viewer

        data = UserProfileSerializer(self.user, context={"request": request}).data

        assert "mobile_card_flip_hint" not in data
