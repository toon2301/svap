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


@pytest.mark.django_db
class TestRegistrationFieldKeywordFalsePositive(APITestCase):
    """Legitímne hodnoty s bežnými slovami (update/select) sa nesmú blokovať,
    neplatný formát musí zostať odmietnutý cez štruktúrované validátory.
    """

    @patch("accounts.models.send_mail")
    @override_settings(EMAIL_VERIFICATION_REQUIRED=False)
    def test_register_with_keyword_username_email_website_succeeds(self, mock_send_mail):
        mock_send_mail.return_value = True
        url = reverse("accounts:register")
        payload = {
            "username": "update select guru",
            "email": "update@example.com",
            "password": "StrongPass123",
            "password_confirm": "StrongPass123",
            "user_type": "individual",
            "website": "https://example.com/blog/how-to-update-django",
            "captcha_token": "test_captcha_token",
        }
        r = self.client.post(url, payload, format="json")
        assert r.status_code == status.HTTP_201_CREATED, r.data
        user = User.objects.get(email="update@example.com")
        assert user.username == "update select guru"
        assert user.website == "https://example.com/blog/how-to-update-django"

    def test_register_invalid_email_format_still_rejected(self):
        url = reverse("accounts:register")
        payload = {
            "username": "user1",
            "email": "not-an-email",
            "password": "StrongPass123",
            "password_confirm": "StrongPass123",
            "user_type": "individual",
            "captcha_token": "test_captcha_token",
        }
        r = self.client.post(url, payload, format="json")
        assert r.status_code == status.HTTP_400_BAD_REQUEST
        # EmailValidator odmietne neplatný formát (chyba je vnorená pod "details").
        assert "email" in r.data.get("details", r.data)

    def test_register_whitespace_only_username_rejected(self):
        # BOD 5: username len z medzier musí byť odmietnutý (nie uložený).
        url = reverse("accounts:register")
        payload = {
            "username": "   ",
            "email": "wsuser@example.com",
            "password": "StrongPass123",
            "password_confirm": "StrongPass123",
            "user_type": "individual",
            "captcha_token": "test_captcha_token",
        }
        r = self.client.post(url, payload, format="json")
        assert r.status_code == status.HTTP_400_BAD_REQUEST
        assert "username" in r.data.get("details", r.data)
        assert not User.objects.filter(email="wsuser@example.com").exists()

    def test_register_invalid_website_scheme_still_rejected(self):
        url = reverse("accounts:register")
        payload = {
            "username": "user2",
            "email": "user2@example.com",
            "password": "StrongPass123",
            "password_confirm": "StrongPass123",
            "user_type": "individual",
            "website": "ftp://example.com",
            "captcha_token": "test_captcha_token",
        }
        r = self.client.post(url, payload, format="json")
        assert r.status_code == status.HTTP_400_BAD_REQUEST
        # URLValidator odmietne nepodporovanú schému (chyba je vnorená pod "details").
        assert "website" in r.data.get("details", r.data)


@pytest.mark.django_db
class TestResendVerificationKeywordEmail(APITestCase):
    def test_resend_with_keyword_email_not_blocked(self):
        # Email s bežným slovom (update@) nesmie byť blokovaný formátovým filtrom.
        User.objects.create_user(
            username="upd",
            email="update@example.com",
            password="StrongPass123",
            is_verified=True,
        )
        url = reverse("accounts:resend_verification")
        r = self.client.post(url, {"email": "update@example.com"}, format="json")
        assert r.status_code == status.HTTP_200_OK
        assert r.data.get("already_verified") is True
