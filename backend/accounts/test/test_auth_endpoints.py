import pytest
from django.urls import reverse
from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework.test import APITestCase
from rest_framework import status
from unittest.mock import patch
from rest_framework_simplejwt.tokens import RefreshToken


User = get_user_model()


@pytest.mark.django_db
class TestAuthEndpoints(APITestCase):
    def test_register_get_info(self):
        url = reverse("accounts:register")
        r = self.client.get(url)
        assert r.status_code == status.HTTP_200_OK
        assert "required_fields" in r.data

    @patch("accounts.models.send_mail")
    @override_settings(EMAIL_VERIFICATION_REQUIRED=True, ALLOW_UNVERIFIED_LOGIN=True)
    def test_register_post_success(self, mock_send_mail):
        mock_send_mail.return_value = True
        url = reverse("accounts:register")
        payload = {
            "username": "reg",
            "email": "reg@example.com",
            "password": "StrongPass123",
            "password_confirm": "StrongPass123",
            "user_type": "individual",
            "birth_day": "01",
            "birth_month": "01",
            "birth_year": "2000",
            "gender": "male",
            "captcha_token": "test_captcha_token",
        }
        r = self.client.post(url, payload, format="json")
        assert r.status_code == status.HTTP_201_CREATED
        assert r.data["email_sent"] is True

    def test_me(self):
        user = User.objects.create_user(
            username="meu",
            email="me@example.com",
            password="StrongPass123",
            is_verified=True,
        )
        # cookie-only: otestuj me endpoint so server-side auth
        refresh = RefreshToken.for_user(user)
        self.client.cookies["access_token"] = str(refresh.access_token)
        url = reverse("accounts:me")
        r = self.client.get(url)
        assert r.status_code == status.HTTP_200_OK
        assert "email" in r.data

    def test_logout_with_refresh(self):
        user = User.objects.create_user(
            username="lou",
            email="lou@example.com",
            password="StrongPass123",
            is_verified=True,
        )
        refresh = RefreshToken.for_user(user)
        self.client.cookies["access_token"] = str(refresh.access_token)
        self.client.cookies["refresh_token"] = str(refresh)
        url = reverse("accounts:logout")
        r = self.client.post(url, {}, format="json")
        assert r.status_code == status.HTTP_200_OK
        # Pokus o použitie zblacklistovaného refresh tokenu na získanie nového access tokenu by mal zlyhať
        refresh_token_url = reverse("token_refresh")
        # refresh cookie-only
        r2 = self.client.post(refresh_token_url, {}, format="json")
        assert r2.status_code in (
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_400_BAD_REQUEST,
        )

    @override_settings(RATE_LIMITING_ENABLED=False)
    @patch("accounts.views.token_refresh_cookie.logger")
    def test_invalid_refresh_cookie_is_warning_not_error(self, mock_logger):
        self.client.cookies["refresh_token"] = "not-a-valid-refresh-token"

        r = self.client.post(reverse("token_refresh"), {}, format="json")

        assert r.status_code == status.HTTP_401_UNAUTHORIZED
        mock_logger.warning.assert_called_once()
        mock_logger.error.assert_not_called()
        assert mock_logger.warning.call_args.kwargs["extra"]["reason"] in {
            "expired_refresh_token",
            "invalid_refresh_token",
        }
