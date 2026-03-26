"""
Testy pre accounts views
"""

import pytest
import json
from django.core.cache import cache
from django.test import TestCase
from django.db import connection
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from factory import Faker, SubFactory
from factory.django import DjangoModelFactory
from unittest.mock import patch

from accounts.authentication import _redis_user_cache_key, _serialize_user_for_cache
from accounts.viewer_location_cache import _viewer_location_cache_key
from accounts.models import OfferedSkill, SkillRequest, SkillRequestStatus, UserType
from accounts.views.auth import _me_user_queryset

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
        self.assertIn("user", response.data)
        # Čistý cookie model: tokeny nie sú v body, musia byť v cookies
        self.assertIn("access_token", response.cookies)
        self.assertIn("refresh_token", response.cookies)

    def test_login_view_warms_auth_cache(self):
        self.user.is_verified = True
        self.user.location = "Bratislava"
        self.user.district = "Bratislava I"
        self.user.save()
        url = reverse("accounts:login")
        data = {"email": self.user.email, "password": "testpass123"}
        cache.clear()

        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            cache.get(_redis_user_cache_key(self.user.id)),
            _serialize_user_for_cache(self.user),
        )
        self.assertEqual(
            cache.get(_viewer_location_cache_key(self.user.id)),
            {"location": "Bratislava", "district": "Bratislava I"},
        )

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
        self.client.cookies["access_token"] = str(refresh.access_token)

        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], self.user.email)

    def test_me_view_avoids_duplicate_user_fetch(self):
        url = reverse("accounts:me")
        refresh = RefreshToken.for_user(self.user)
        self.client.cookies["access_token"] = str(refresh.access_token)
        cache.clear()

        with CaptureQueriesContext(connection) as ctx:
            response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            len(ctx.captured_queries),
            2,
            f"Expected auth user lookup plus completed count, got {len(ctx.captured_queries)} queries",
        )

    def test_me_view_uses_single_post_auth_query_when_auth_cache_is_warm(self):
        url = reverse("accounts:me")
        refresh = RefreshToken.for_user(self.user)
        self.client.cookies["access_token"] = str(refresh.access_token)
        cache.clear()
        cache.set(
            _redis_user_cache_key(self.user.id),
            _serialize_user_for_cache(self.user),
            timeout=300,
        )

        with CaptureQueriesContext(connection) as ctx:
            response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["completed_cooperations_count"], 0)
        self.assertEqual(
            len(ctx.captured_queries),
            1,
            f"Expected a single annotated /me query on warm auth cache, got {len(ctx.captured_queries)} queries",
        )

    def test_me_view_exposes_server_timing_breakdown(self):
        url = reverse("accounts:me")
        refresh = RefreshToken.for_user(self.user)
        self.client.cookies["access_token"] = str(refresh.access_token)
        cache.clear()
        cache.set(
            _redis_user_cache_key(self.user.id),
            _serialize_user_for_cache(self.user),
            timeout=300,
        )

        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        server_timing = response.headers.get("Server-Timing", "")
        self.assertIn("me_db_get", server_timing)
        self.assertIn("me_serialize", server_timing)
        self.assertIn("me_response_build", server_timing)
        self.assertIn("me_total", server_timing)

    def test_me_view_completed_cooperations_count_is_correct(self):
        sender_peer = UserFactory()
        receiver_peer = UserFactory()
        offer_for_peer = OfferedSkill.objects.create(
            user=sender_peer,
            category="Design",
            subcategory="Logo",
            description="Branding",
        )
        own_offer = OfferedSkill.objects.create(
            user=self.user,
            category="Dev",
            subcategory="Backend",
            description="Python",
        )
        extra_offer = OfferedSkill.objects.create(
            user=receiver_peer,
            category="Marketing",
            subcategory="Ads",
            description="Campaigns",
        )
        SkillRequest.objects.create(
            requester=self.user,
            recipient=sender_peer,
            offer=offer_for_peer,
            status=SkillRequestStatus.COMPLETED,
        )
        SkillRequest.objects.create(
            requester=receiver_peer,
            recipient=self.user,
            offer=own_offer,
            status=SkillRequestStatus.COMPLETED,
        )
        SkillRequest.objects.create(
            requester=self.user,
            recipient=receiver_peer,
            offer=extra_offer,
            status=SkillRequestStatus.PENDING,
        )

        url = reverse("accounts:me")
        refresh = RefreshToken.for_user(self.user)
        self.client.cookies["access_token"] = str(refresh.access_token)

        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["completed_cooperations_count"], 2)

    def test_me_queryset_uses_subquery_counts_without_distinct_join_multiplication(self):
        sql = str(_me_user_queryset().filter(pk=self.user.pk).query)

        self.assertNotIn("COUNT(DISTINCT", sql)
        self.assertNotIn('LEFT OUTER JOIN "accounts_skillrequest"', sql)

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
        self.client.cookies["access_token"] = str(refresh.access_token)
        self.client.cookies["refresh_token"] = str(refresh)

        response = self.client.post(url, {}, format="json")
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
        self.client.cookies["access_token"] = str(refresh.access_token)

    def test_update_profile_success(self):
        """Test úspešnej aktualizácie profilu"""
        url = reverse("accounts:update_profile")
        data = {"first_name": "Updated", "last_name": "Name", "bio": "Updated bio"}

        response = self.client.patch(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user"]["first_name"], "Updated")

    def test_update_profile_invalid_data(self):
        """Test aktualizácie profilu s neplatnými údajmi (email je read_only, user_type validujeme)"""
        url = reverse("accounts:update_profile")
        data = {"user_type": "invalid_type"}

        response = self.client.patch(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    # User list a detail views boli odstránené - testy nie sú potrebné


# OAuth views boli odstránené - testy nie sú potrebné
