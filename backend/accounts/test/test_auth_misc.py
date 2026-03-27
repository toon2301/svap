import pytest
from urllib.parse import parse_qs, urlparse
from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.views.google_oauth_simple import (
    _OAUTH_STATE_COOKIE_NAME,
    _OAUTH_STATE_TTL_SECONDS,
)


User = get_user_model()


@pytest.mark.django_db
class TestAuthMisc(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="john",
            email="john@example.com",
            password="StrongPass123",
            is_verified=True,
        )

    def _start_google_login(self):
        login_url = reverse("accounts:google_login")
        response = self.client.get(
            login_url,
            {"callback": "http://localhost:3000/auth/callback"},
        )
        assert response.status_code == status.HTTP_302_FOUND
        query = parse_qs(urlparse(response["Location"]).query)
        state = query["state"][0]
        callback_path = urlparse(query["redirect_uri"][0]).path
        return response, state, callback_path

    def test_me_requires_auth(self):
        url = reverse("accounts:me")
        response = self.client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_logout_without_token_is_ok(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("accounts:logout")
        response = self.client.post(url, data={"refresh": ""}, format="json")
        assert response.status_code == status.HTTP_200_OK

    @override_settings(
        GOOGLE_OAUTH2_CLIENT_ID="id",
        GOOGLE_OAUTH2_SECRET="secret",
        FRONTEND_CALLBACK_URL="http://localhost:3000/auth/callback",
        BACKEND_CALLBACK_URL="http://localhost:8000/api/oauth/google/callback/",
    )
    def test_google_login_sets_signed_state_cookie(self):
        response, _, callback_path = self._start_google_login()

        assert _OAUTH_STATE_COOKIE_NAME in response.cookies
        cookie = response.cookies[_OAUTH_STATE_COOKIE_NAME]
        assert cookie.value
        assert cookie["httponly"] is True
        assert cookie["path"] == callback_path
        assert int(cookie["max-age"]) == _OAUTH_STATE_TTL_SECONDS

    @override_settings(
        GOOGLE_OAUTH2_CLIENT_ID="id",
        GOOGLE_OAUTH2_SECRET="secret",
        FRONTEND_CALLBACK_URL="http://localhost:3000/auth/callback",
        BACKEND_CALLBACK_URL="http://localhost:8000/api/oauth/google/callback/",
    )
    @patch("accounts.views.google_oauth_simple.requests.get")
    @patch("accounts.views.google_oauth_simple.requests.post")
    def test_google_oauth_success_even_when_cache_entry_is_missing(
        self, mock_post, mock_get
    ):
        mock_post.return_value = Mock(
            status_code=200, json=lambda: {"access_token": "at"}
        )
        mock_get.return_value = Mock(
            status_code=200,
            json=lambda: {
                "email": "oauth@example.com",
                "given_name": "O",
                "family_name": "Auth",
            },
        )

        _, state, callback_path = self._start_google_login()
        cache.delete(f"oauth_state:{state}")

        response = self.client.get(f"{callback_path}?code=ok&state={state}")

        assert response.status_code == status.HTTP_302_FOUND
        assert "oauth=success" in response["Location"]
        assert "access_token" in response.cookies
        assert response.cookies[_OAUTH_STATE_COOKIE_NAME].value == ""
        assert int(response.cookies[_OAUTH_STATE_COOKIE_NAME]["max-age"]) == 0

    @override_settings(
        GOOGLE_OAUTH2_CLIENT_ID="id",
        GOOGLE_OAUTH2_SECRET="secret",
        FRONTEND_CALLBACK_URL="http://localhost:3000/auth/callback",
        BACKEND_CALLBACK_URL="http://localhost:8000/api/oauth/google/callback/",
    )
    @patch("accounts.views.google_oauth_simple.requests.get")
    @patch("accounts.views.google_oauth_simple.requests.post")
    def test_google_oauth_rejects_missing_state_cookie_even_when_cache_entry_exists(
        self, mock_post, mock_get
    ):
        mock_post.return_value = Mock(
            status_code=200, json=lambda: {"access_token": "at"}
        )
        mock_get.return_value = Mock(
            status_code=200,
            json=lambda: {
                "email": "oauth@example.com",
                "given_name": "O",
                "family_name": "Auth",
            },
        )

        _, state, callback_path = self._start_google_login()
        del self.client.cookies[_OAUTH_STATE_COOKIE_NAME]

        response = self.client.get(f"{callback_path}?code=ok&state={state}")

        assert response.status_code == status.HTTP_302_FOUND
        assert "error=invalid_state" in response["Location"]

    @override_settings(
        GOOGLE_OAUTH2_CLIENT_ID="id",
        GOOGLE_OAUTH2_SECRET="secret",
        FRONTEND_CALLBACK_URL="http://localhost:3000/auth/callback",
        BACKEND_CALLBACK_URL="http://localhost:8000/api/oauth/google/callback/",
    )
    @patch("accounts.views.google_oauth_simple.requests.post")
    def test_google_oauth_bad_token_exchange_uses_real_signed_state(
        self, mock_post
    ):
        mock_post.return_value = Mock(
            status_code=400,
            text='{"error":"invalid_grant"}',
            json=lambda: {"error": "invalid_grant"},
        )

        _, state, callback_path = self._start_google_login()
        response = self.client.get(f"{callback_path}?code=bad&state={state}")

        assert response.status_code == status.HTTP_302_FOUND
        assert "error=token_exchange_failed" in response["Location"]
