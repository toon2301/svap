import pytest
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase


User = get_user_model()


@pytest.mark.django_db
class TestCookieAuthHttpOnly(APITestCase):
    def test_login_sets_http_only_cookies_and_me_works_without_authorization(self):
        user = User.objects.create_user(
            username="u1",
            email="u1@example.com",
            password="StrongPass123",
            is_verified=True,
        )

        url = reverse("accounts:login")
        r = self.client.post(
            url, {"email": user.email, "password": "StrongPass123"}, format="json"
        )
        assert r.status_code == status.HTTP_200_OK

        # Cookies set
        assert "access_token" in r.cookies
        assert "refresh_token" in r.cookies
        assert r.cookies["access_token"]["httponly"] is True
        assert r.cookies["refresh_token"]["httponly"] is True

        # Subsequent /me/ call should work via cookie auth (no Authorization header)
        me_url = reverse("accounts:me")
        r2 = self.client.get(me_url)
        assert r2.status_code == status.HTTP_200_OK
        assert r2.data.get("email") == user.email
