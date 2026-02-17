"""
Testy pre CAPTCHA funkcionalitu v registrácii
"""

import pytest
import json
from unittest.mock import patch, Mock
from django.test import TestCase, override_settings
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import UserProfile, EmailVerification

User = get_user_model()


@pytest.mark.django_db
class TestCAPTCHARegistration:
    """Testy pre registráciu s CAPTCHA"""

    def setup_method(self):
        """Setup pre každý test"""
        self.client = APIClient()
        self.registration_url = reverse("accounts:register")
        self.valid_data = {
            "username": "testuser",
            "email": "test@example.com",
            "password": "TestPassword123",
            "password_confirm": "TestPassword123",
            "user_type": "individual",
            "birth_day": "15",
            "birth_month": "6",
            "birth_year": "1990",
            "gender": "male",
            "captcha_token": "valid_captcha_token",
        }

    @override_settings(CAPTCHA_SKIP_IN_TESTS=True, RATE_LIMITING_ENABLED=False)
    def test_registration_with_valid_captcha_success(self):
        """Test úspešnej registrácie s platnou CAPTCHA"""
        response = self.client.post(self.registration_url, self.valid_data)

        assert response.status_code == status.HTTP_201_CREATED
        assert "message" in response.data
        assert "email_sent" in response.data
        assert response.data["email_sent"] is True

        # Skontroluj, či sa používateľ vytvoril
        user = User.objects.get(email="test@example.com")
        assert user.username == "testuser"
        assert user.is_verified is False  # Používateľ nie je overený po registrácii

        # Skontroluj, či sa vytvoril profil
        assert UserProfile.objects.filter(user=user).exists()

        # Skontroluj, či sa vytvoril verifikačný token
        assert EmailVerification.objects.filter(user=user).exists()

    @override_settings(
        CAPTCHA_SKIP_IN_TESTS=False, CAPTCHA_ENABLED=True, RATE_LIMITING_ENABLED=False
    )
    @patch("swaply.validators.requests.post")
    def test_registration_with_valid_captcha_api_success(self, mock_post):
        """Test úspešnej registrácie s platnou CAPTCHA cez API"""
        # Mock úspešnej CAPTCHA validácie
        mock_response = Mock()
        mock_response.json.return_value = {"success": True, "score": 0.8}
        mock_post.return_value = mock_response

        response = self.client.post(self.registration_url, self.valid_data)

        assert response.status_code == status.HTTP_201_CREATED
        mock_post.assert_called_once()

    @override_settings(
        CAPTCHA_SKIP_IN_TESTS=False, CAPTCHA_ENABLED=True, RATE_LIMITING_ENABLED=False
    )
    @patch("swaply.validators.requests.post")
    def test_registration_with_invalid_captcha_fails(self, mock_post):
        """Test neúspešnej registrácie s neplatnou CAPTCHA"""
        # Mock neúspešnej CAPTCHA validácie
        mock_response = Mock()
        mock_response.json.return_value = {"success": False}
        mock_post.return_value = mock_response

        response = self.client.post(self.registration_url, self.valid_data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "error" in response.data
        assert "details" in response.data

        # Skontroluj, či sa používateľ nevytvoril
        assert not User.objects.filter(email="test@example.com").exists()

    @override_settings(
        CAPTCHA_SKIP_IN_TESTS=False, CAPTCHA_ENABLED=True, RATE_LIMITING_ENABLED=False
    )
    def test_registration_without_captcha_fails(self):
        """Test neúspešnej registrácie bez CAPTCHA tokenu"""
        data_without_captcha = self.valid_data.copy()
        del data_without_captcha["captcha_token"]

        response = self.client.post(self.registration_url, data_without_captcha)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "error" in response.data

        # Skontroluj, či sa používateľ nevytvoril
        assert not User.objects.filter(email="test@example.com").exists()

    @override_settings(
        CAPTCHA_SKIP_IN_TESTS=False, CAPTCHA_ENABLED=True, RATE_LIMITING_ENABLED=False
    )
    @patch("swaply.validators.requests.post")
    def test_registration_with_low_captcha_score_fails(self, mock_post):
        """Test neúspešnej registrácie s nízko skóre CAPTCHA"""
        # Mock nízkeho CAPTCHA skóre
        mock_response = Mock()
        mock_response.json.return_value = {"success": True, "score": 0.3}
        mock_post.return_value = mock_response

        response = self.client.post(self.registration_url, self.valid_data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "error" in response.data

        # Skontroluj, či sa používateľ nevytvoril
        assert not User.objects.filter(email="test@example.com").exists()

    @override_settings(CAPTCHA_ENABLED=False, RATE_LIMITING_ENABLED=False)
    def test_registration_with_captcha_disabled_success(self):
        """Test úspešnej registrácie keď je CAPTCHA vypnutá"""
        response = self.client.post(self.registration_url, self.valid_data)

        assert response.status_code == status.HTTP_201_CREATED

        # Skontroluj, či sa používateľ vytvoril
        user = User.objects.get(email="test@example.com")
        assert user.username == "testuser"

    @override_settings(RATE_LIMITING_ENABLED=False)
    def test_registration_get_endpoint_returns_captcha_info(self):
        """Test, že GET endpoint vráti informácie o CAPTCHA"""
        response = self.client.get(self.registration_url)

        assert response.status_code == status.HTTP_200_OK
        assert "captcha" in response.data
        assert "enabled" in response.data["captcha"]
        assert "site_key" in response.data["captcha"]
        assert "captcha_token" in response.data["required_fields"]


@pytest.mark.django_db
class TestEmailVerification:
    """Testy pre email verifikáciu"""

    def setup_method(self):
        """Setup pre každý test"""
        self.client = APIClient()
        self.verify_url = reverse("accounts:verify_email")
        self.login_url = reverse("accounts:login")

        # Vytvor používateľa s neovereným emailom
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="TestPassword123",
            is_verified=False,
        )
        self.user_profile = UserProfile.objects.create(user=self.user)
        self.verification = EmailVerification.objects.create(user=self.user)

    @override_settings(RATE_LIMITING_ENABLED=False)
    def test_unverified_user_can_login_temporarily(self):
        """Dočasne: neoverený používateľ sa môže prihlásiť (verifikácia vypnutá pre testy)"""
        login_data = {"email": "test@example.com", "password": "TestPassword123"}

        response = self.client.post(self.login_url, login_data)

        assert response.status_code == status.HTTP_200_OK
        assert "tokens" in response.data

    @override_settings(RATE_LIMITING_ENABLED=False)
    def test_email_verification_success(self):
        """Test úspešnej email verifikácie"""
        verify_data = {"token": str(self.verification.token)}

        response = self.client.post(self.verify_url, verify_data)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["verified"] is True
        assert "tokens" in response.data

        # Skontroluj, či je používateľ overený
        self.user.refresh_from_db()
        assert self.user.is_verified is True

        # Skontroluj, či je verifikačný token označený ako použitý
        self.verification.refresh_from_db()
        assert self.verification.is_used is True

    @override_settings(RATE_LIMITING_ENABLED=False)
    def test_verified_user_can_login(self):
        """Test, že overený používateľ sa môže prihlásiť"""
        # Najprv over email
        self.user.is_verified = True
        self.user.save()

        login_data = {"email": "test@example.com", "password": "TestPassword123"}

        response = self.client.post(self.login_url, login_data)

        assert response.status_code == status.HTTP_200_OK
        assert "tokens" in response.data
        assert "access" in response.data["tokens"]
        assert "refresh" in response.data["tokens"]

    @override_settings(RATE_LIMITING_ENABLED=False)
    def test_invalid_verification_token_fails(self):
        """Test neúspešnej verifikácie s neplatným tokenom"""
        verify_data = {"token": "invalid-token-123"}

        response = self.client.post(self.verify_url, verify_data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "error" in response.data

    @override_settings(RATE_LIMITING_ENABLED=False)
    def test_expired_verification_token_fails(self):
        """Test neúspešnej verifikácie s expirovaným tokenom"""
        # Simuluj expirovaný token
        from django.utils import timezone
        from datetime import timedelta

        # Požiadavka: predĺženie expirácie na 48 hodín
        self.verification.created_at = timezone.now() - timedelta(hours=49)
        self.verification.save()

        verify_data = {"token": str(self.verification.token)}

        response = self.client.post(self.verify_url, verify_data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "error" in response.data

    @override_settings(RATE_LIMITING_ENABLED=False)
    def test_used_verification_token_fails(self):
        """Test neúspešnej verifikácie s už použitým tokenom"""
        # Označ token ako použitý
        self.verification.is_used = True
        self.verification.save()

        verify_data = {"token": str(self.verification.token)}

        response = self.client.post(self.verify_url, verify_data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "error" in response.data


@pytest.mark.django_db
class TestRegistrationFlow:
    """Testy pre kompletný registračný flow"""

    def setup_method(self):
        """Setup pre každý test"""
        self.client = APIClient()
        self.registration_url = reverse("accounts:register")
        self.verify_url = reverse("accounts:verify_email")
        self.login_url = reverse("accounts:login")

    @override_settings(CAPTCHA_SKIP_IN_TESTS=True, RATE_LIMITING_ENABLED=False)
    def test_complete_registration_and_verification_flow(self):
        """Test kompletný flow registrácie a verifikácie"""
        # 1. Registrácia
        registration_data = {
            "username": "testuser",
            "email": "test@example.com",
            "password": "TestPassword123",
            "password_confirm": "TestPassword123",
            "user_type": "individual",
            "birth_day": "15",
            "birth_month": "6",
            "birth_year": "1990",
            "gender": "male",
            "captcha_token": "valid_captcha_token",
        }

        response = self.client.post(self.registration_url, registration_data)
        assert response.status_code == status.HTTP_201_CREATED

        # 2. Skontroluj, že používateľ existuje ale nie je overený
        user = User.objects.get(email="test@example.com")
        assert user.is_verified is False

        # 3. Dočasné chovanie: prihlásenie je povolené aj bez verifikácie
        login_data = {"email": "test@example.com", "password": "TestPassword123"}

        response = self.client.post(self.login_url, login_data)
        assert response.status_code == status.HTTP_200_OK

        # 4. Over email
        verification = EmailVerification.objects.get(user=user)
        verify_data = {"token": str(verification.token)}

        response = self.client.post(self.verify_url, verify_data)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["verified"] is True

        # 5. Skontroluj, že sa teraz môže prihlásiť
        response = self.client.post(self.login_url, login_data)
        assert response.status_code == status.HTTP_200_OK
        assert "tokens" in response.data
