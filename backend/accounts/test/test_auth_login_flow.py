import pytest
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from django.core.cache import cache
from rest_framework import status


User = get_user_model()


@pytest.mark.django_db
class TestAuthLoginFlow(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="flow",
            email="flow@example.com",
            password="StrongPass123",
            is_verified=True,
        )
        # Reset rate/lock caches to avoid flakiness between tests
        cache.clear()

    def test_login_success(self):
        url = reverse("accounts:login")
        r = self.client.post(
            url,
            {"email": "flow@example.com", "password": "StrongPass123"},
            format="json",
        )
        assert r.status_code == status.HTTP_200_OK
        assert "access_token" in r.cookies
        assert "refresh_token" in r.cookies

    def test_login_invalid(self):
        url = reverse("accounts:login")
        r = self.client.post(
            url, {"email": "flow@example.com", "password": "wrong"}, format="json"
        )
        assert r.status_code == status.HTTP_400_BAD_REQUEST

    def test_lockout_after_multiple_failures(self):
        url = reverse("accounts:login")
        for _ in range(5):
            self.client.post(
                url, {"email": "flow@example.com", "password": "bad"}, format="json"
            )
        r = self.client.post(
            url, {"email": "flow@example.com", "password": "bad"}, format="json"
        )
        # 423 Locked
        assert r.status_code == 423
