import pytest
from django.urls import reverse
from django.contrib.auth import get_user_model
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

    def test_me_with_tokens(self):
        user = User.objects.create_user(
            username="meu",
            email="me@example.com",
            password="StrongPass123",
            is_verified=True,
        )
        self.client.force_authenticate(user=user)
        url = reverse("accounts:me") + "?with_tokens=true"
        r = self.client.get(url)
        assert r.status_code == status.HTTP_200_OK
        assert "tokens" in r.data

    def test_logout_with_refresh(self):
        user = User.objects.create_user(
            username="lou",
            email="lou@example.com",
            password="StrongPass123",
            is_verified=True,
        )
        self.client.force_authenticate(user=user)
        refresh = RefreshToken.for_user(user)
        url = reverse("accounts:logout")
        r = self.client.post(url, {"refresh": str(refresh)}, format="json")
        assert r.status_code == status.HTTP_200_OK
        # Pokus o použitie zblacklistovaného refresh tokenu na získanie nového access tokenu by mal zlyhať
        refresh_token_url = reverse("token_refresh")
        r2 = self.client.post(
            refresh_token_url, {"refresh": str(refresh)}, format="json"
        )
        assert r2.status_code in (
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_400_BAD_REQUEST,
        )
