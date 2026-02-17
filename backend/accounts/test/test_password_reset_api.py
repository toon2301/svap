import pytest
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.contrib.auth.tokens import default_token_generator
from unittest.mock import patch


User = get_user_model()


@pytest.mark.django_db
class TestPasswordResetAPI(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="resetuser",
            email="reset@example.com",
            password="StrongPass123",
            is_verified=True,
        )

    @patch("accounts.views.password_reset.send_mail")
    def test_password_reset_request_existing_email(self, mock_send_mail):
        mock_send_mail.return_value = True
        url = reverse("accounts:password_reset_request")
        r = self.client.post(url, {"email": "reset@example.com"}, format="json")
        assert r.status_code == status.HTTP_200_OK
        mock_send_mail.assert_called_once()

    def test_password_reset_request_unknown_email(self):
        url = reverse("accounts:password_reset_request")
        r = self.client.post(url, {"email": "unknown@example.com"}, format="json")
        assert r.status_code == status.HTTP_200_OK

    def test_password_reset_confirm_invalid_uid(self):
        url = reverse(
            "accounts:password_reset_confirm", kwargs={"uidb64": "!!", "token": "abc"}
        )
        r = self.client.post(url, {"password": "NewStrong123"}, format="json")
        assert r.status_code == status.HTTP_400_BAD_REQUEST

    def test_password_reset_confirm_invalid_token(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        url = reverse(
            "accounts:password_reset_confirm",
            kwargs={"uidb64": uid, "token": "invalid-token"},
        )
        r = self.client.post(url, {"password": "NewStrong123"}, format="json")
        assert r.status_code == status.HTTP_400_BAD_REQUEST

    def test_password_reset_confirm_success(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = default_token_generator.make_token(self.user)
        url = reverse(
            "accounts:password_reset_confirm", kwargs={"uidb64": uid, "token": token}
        )
        r = self.client.post(url, {"password": "NewStrong123"}, format="json")
        assert r.status_code == status.HTTP_200_OK

    def test_password_reset_verify_token_invalid(self):
        url = reverse(
            "accounts:password_reset_verify", kwargs={"uidb64": "!!", "token": "abc"}
        )
        r = self.client.get(url)
        assert r.status_code == status.HTTP_400_BAD_REQUEST

    def test_password_reset_verify_token_valid(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = default_token_generator.make_token(self.user)
        url = reverse(
            "accounts:password_reset_verify", kwargs={"uidb64": uid, "token": token}
        )
        r = self.client.get(url)
        assert r.status_code == status.HTTP_200_OK
        assert r.json()["valid"] is True
