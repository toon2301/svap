"""
Testy pre email verifikáciu
"""

import pytest
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from unittest.mock import patch
from datetime import timedelta
from django.utils import timezone

from accounts.models import EmailVerification, UserType

User = get_user_model()


@pytest.mark.django_db
class TestEmailVerificationModel(TestCase):
    """Testy pre EmailVerification model"""

    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
            is_verified=False,
        )

    def test_verification_creation(self):
        """Test vytvorenia verifikačného tokenu"""
        verification = EmailVerification.objects.create(user=self.user)

        self.assertIsNotNone(verification.token)
        self.assertEqual(verification.user, self.user)
        self.assertFalse(verification.is_used)
        self.assertIsNone(verification.verified_at)

    def test_verification_str(self):
        """Test __str__ metódy"""
        verification = EmailVerification.objects.create(user=self.user)
        expected = f"Verifikácia pre {self.user.email}"
        self.assertEqual(str(verification), expected)

    def test_is_expired_fresh_token(self):
        """Test, že čerstvý token nie je expirovaný"""
        verification = EmailVerification.objects.create(user=self.user)
        self.assertFalse(verification.is_expired())

    def test_is_expired_old_token(self):
        """Test, že starý token je expirovaný"""
        verification = EmailVerification.objects.create(user=self.user)
        # Nastavíme created_at na 49 hodín dozadu (požiadavka: expiruje po 48h)
        verification.created_at = timezone.now() - timedelta(hours=49)
        verification.save()

        self.assertTrue(verification.is_expired())

    def test_verify_success(self):
        """Test úspešného overenia"""
        verification = EmailVerification.objects.create(user=self.user)

        result = verification.verify()

        self.assertTrue(result)
        self.assertTrue(verification.is_used)
        self.assertIsNotNone(verification.verified_at)

        # Skontroluj, že používateľ je overený
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_verified)

    def test_verify_already_used(self):
        """Test overenia už použitého tokenu"""
        verification = EmailVerification.objects.create(user=self.user)
        verification.is_used = True
        verification.save()

        result = verification.verify()

        self.assertFalse(result)

    def test_verify_expired_token(self):
        """Test overenia expirovaného tokenu"""
        verification = EmailVerification.objects.create(user=self.user)
        verification.created_at = timezone.now() - timedelta(hours=49)
        verification.save()

        result = verification.verify()

        self.assertFalse(result)

    @patch("accounts.models.send_mail")
    def test_send_verification_email(self, mock_send_mail):
        """Test odosielania verifikačného emailu"""
        mock_send_mail.return_value = True

        verification = EmailVerification.objects.create(user=self.user)
        result = verification.send_verification_email()

        self.assertTrue(result)
        mock_send_mail.assert_called_once()

        # Skontroluj argumenty
        call_args = mock_send_mail.call_args
        self.assertIn("Potvrdenie registrácie - Swaply", call_args[1]["subject"])
        self.assertIn(self.user.email, call_args[1]["recipient_list"])
        self.assertIn(str(verification.token), call_args[1]["message"])

    def test_get_verification_url(self):
        """Test generovania verifikačného URL"""
        verification = EmailVerification.objects.create(user=self.user)

        url = verification.get_verification_url()

        self.assertIn("/verify-email", url)
        self.assertIn(str(verification.token), url)

        # Test bez request objektu (fallback)
        url_fallback = verification.get_verification_url()
        self.assertIn("/verify-email", url_fallback)
        self.assertIn(str(verification.token), url_fallback)


@pytest.mark.django_db
class TestEmailVerificationAPI(APITestCase):
    """Testy pre email verifikáciu API"""

    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
            is_verified=False,
        )
        self.verification = EmailVerification.objects.create(user=self.user)

    def test_verify_email_success(self):
        """Test úspešného overenia emailu"""
        url = reverse("accounts:verify_email")
        data = {"token": str(self.verification.token)}

        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["verified"])
        self.assertIn("úspešne overený", response.data["message"])

        # Skontroluj, že používateľ je overený
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_verified)

        # Skontroluj, že token je označený ako použitý
        self.verification.refresh_from_db()
        self.assertTrue(self.verification.is_used)

    def test_verify_email_invalid_token(self):
        """Test overenia s neplatným tokenom"""
        url = reverse("accounts:verify_email")
        data = {"token": "invalid-token"}

        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Must be a valid UUID", str(response.data["details"]["token"][0]))

    def test_verify_email_used_token(self):
        """Test overenia s už použitým tokenom"""
        self.verification.is_used = True
        self.verification.save()

        url = reverse("accounts:verify_email")
        data = {"token": str(self.verification.token)}

        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("už bol použitý", response.data["details"]["token"][0])

    def test_verify_email_expired_token(self):
        """Test overenia s expirovaným tokenom"""
        # Požiadavka: predĺženie expirácie na 48 hodín
        self.verification.created_at = timezone.now() - timedelta(hours=49)
        self.verification.save()

        url = reverse("accounts:verify_email")
        data = {"token": str(self.verification.token)}

        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("expiroval", response.data["details"]["token"][0])

    def test_verify_email_missing_token(self):
        """Test overenia bez tokenu"""
        url = reverse("accounts:verify_email")
        data = {}

        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("token", response.data["details"])


@pytest.mark.django_db
class TestRegistrationWithEmailVerification(APITestCase):
    """Testy pre registráciu s email verifikáciou"""

    @patch("accounts.models.send_mail")
    def test_registration_creates_verification(self, mock_send_mail):
        """Test, že registrácia vytvorí verifikačný token"""
        mock_send_mail.return_value = True

        url = reverse("accounts:register")
        data = {
            "username": "newuser",
            "email": "newuser@example.com",
            "password": "newpass123",
            "password_confirm": "newpass123",
            "user_type": "individual",
            "birth_day": "15",
            "birth_month": "06",
            "birth_year": "1990",
            "gender": "male",
            "captcha_token": "test_captcha_token",
        }

        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["email_sent"])
        self.assertIn("Skontrolujte si email", response.data["message"])

        # Skontroluj, že používateľ nie je overený
        user = User.objects.get(email="newuser@example.com")
        self.assertFalse(user.is_verified)

        # Skontroluj, že verifikačný token bol vytvorený
        verification = EmailVerification.objects.get(user=user)
        self.assertIsNotNone(verification)

        # Skontroluj, že email bol odoslaný
        mock_send_mail.assert_called_once()

    def test_login_without_verification_allowed_temporarily(self):
        """Dočasne: prihlásenie bez verifikácie je povolené (vypnutá kontrola)"""
        user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
            is_verified=False,
        )

        url = reverse("accounts:login")
        data = {"email": "test@example.com", "password": "testpass123"}

        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("tokens", response.data)

    def test_login_with_verification_success(self):
        """Test, že prihlásenie s verifikáciou funguje"""
        user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
            is_verified=True,
        )

        url = reverse("accounts:login")
        data = {"email": "test@example.com", "password": "testpass123"}

        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("tokens", response.data)
