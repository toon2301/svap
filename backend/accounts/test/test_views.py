"""
Testy pre accounts views
"""

import pytest
import json
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from factory import Faker, SubFactory
from factory.django import DjangoModelFactory
from unittest.mock import patch

from accounts.models import UserType

User = get_user_model()


class UserFactory(DjangoModelFactory):
    """Factory pre User model"""

    class Meta:
        model = User

    username = Faker("user_name")
    email = Faker("email")
    first_name = Faker("first_name")
    last_name = Faker("last_name")
    user_type = UserType.INDIVIDUAL
    is_active = True


@pytest.mark.django_db
class TestAuthViews(APITestCase):
    """Testy pre autentifikačné views"""

    def setUp(self):
        self.user = UserFactory()
        self.user.set_password("testpass123")
        self.user.save()

    def test_register_view_success(self):
        """Test úspešnej registrácie"""
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
        self.assertIn("email_sent", response.data)
        self.assertIn("user", response.data)

    def test_register_view_invalid_data(self):
        """Test registrácie s neplatnými údajmi"""
        url = reverse("accounts:register")
        data = {
            "username": "newuser",
            "email": "invalid-email",
            "password": "short",
            "password_confirm": "different",
            "user_type": "individual",
            "captcha_token": "test_captcha_token",
        }

        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_login_view_success(self):
        """Test úspešného prihlásenia"""
        # Označ používateľa ako overeného
        self.user.is_verified = True
        self.user.save()

        url = reverse("accounts:login")
        data = {"email": self.user.email, "password": "testpass123"}

        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("tokens", response.data)
        self.assertIn("user", response.data)

    def test_login_view_invalid_credentials(self):
        """Test prihlásenia s neplatnými údajmi"""
        url = reverse("accounts:login")
        data = {"email": self.user.email, "password": "wrong_password"}

        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_me_view_authenticated(self):
        """Test získania informácií o prihlásenom používateľovi"""
        url = reverse("accounts:me")

        # Vytvor JWT token
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], self.user.email)

    def test_me_view_unauthenticated(self):
        """Test získania informácií o neprihlásenom používateľovi"""
        url = reverse("accounts:me")

        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_view_success(self):
        """Test úspešného odhlásenia"""
        url = reverse("accounts:logout")

        # Vytvor JWT token
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        data = {"refresh": str(refresh)}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("message", response.data)


@pytest.mark.django_db
class TestProfileViews(APITestCase):
    """Testy pre profil views"""

    def setUp(self):
        self.user = UserFactory()
        self.user.set_password("testpass123")
        self.user.save()

        # Vytvor JWT token
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

    def test_update_profile_success(self):
        """Test úspešnej aktualizácie profilu"""
        url = reverse("accounts:update_profile")
        data = {"first_name": "Updated", "last_name": "Name", "bio": "Updated bio"}

        response = self.client.patch(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user"]["first_name"], "Updated")

    def test_update_profile_invalid_data(self):
        """Test aktualizácie profilu s neplatnými údajmi"""
        url = reverse("accounts:update_profile")
        data = {"email": "invalid-email"}

        response = self.client.patch(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    # User list a detail views boli odstránené - testy nie sú potrebné


# OAuth views boli odstránené - testy nie sú potrebné
