"""End-to-end API contract for a cookie-backed login session."""

from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.views.auth_helpers import (
    _auth_cookie_kwargs,
    _lock_keys_for_email,
    _log_cookie_header_diagnostics,
)


@pytest.fixture
def session_user(db):
    """Create an active, verified account solely in the isolated test database."""
    return get_user_model().objects.create_user(
        username="session-contract",
        email="session-contract@example.com",
        password="StrongPass123",
        is_verified=True,
    )


@pytest.fixture
def session_client():
    """Keep authentication and rate-limit state isolated between scenarios."""
    cache.clear()
    client = APIClient()
    yield client
    cache.clear()


def _login(client):
    """Log in via the public API with the test account's known credentials."""
    return client.post(
        reverse("accounts:login"),
        {"email": "session-contract@example.com", "password": "StrongPass123"},
        format="json",
    )


def test_login_me_logout_and_protected_route(session_client, session_user):
    """A logged-out client cannot recover the previous identity via /me."""
    me_url = reverse("accounts:me")
    logout_url = reverse("accounts:logout")

    assert session_client.get(me_url).status_code == 401
    assert session_client.post(logout_url, {}, format="json").status_code == 401

    login = _login(session_client)
    assert login.status_code == 200
    assert "access" not in login.data
    assert "refresh" not in login.data
    assert "access_token" in login.cookies
    assert "refresh_token" in login.cookies
    assert login.cookies["access_token"]["httponly"] is True
    assert login.cookies["refresh_token"]["httponly"] is True

    current = session_client.get(me_url)
    assert current.status_code == 200
    assert current.data["id"] == session_user.id
    assert "no-store" in current["Cache-Control"]
    assert "Cookie" in current["Vary"]

    logout = session_client.post(logout_url, {}, format="json")
    assert logout.status_code == 200
    assert logout["Clear-Site-Data"] == '"cookies"'
    assert logout.cookies["access_token"].value == ""
    assert logout.cookies["refresh_token"].value == ""
    assert session_client.get(me_url).status_code == 401


def test_refresh_requires_cookie_even_if_token_is_in_body(session_client, session_user):
    """A refresh token supplied through JSON must not bypass HttpOnly cookies."""
    refresh = RefreshToken.for_user(session_user)
    response = session_client.post(
        reverse("token_refresh"), {"refresh": str(refresh)}, format="json"
    )

    assert response.status_code == 401
    assert response.data["detail"] == "Invalid authentication credentials"


def test_refresh_restores_access_but_never_exposes_jwt_in_body(
    session_client, session_user
):
    """A valid refresh cookie restores access through a new HttpOnly cookie."""
    assert _login(session_client).status_code == 200
    session_client.cookies.pop("access_token", None)
    assert session_client.get(reverse("accounts:me")).status_code == 401

    refreshed = session_client.post(reverse("token_refresh"), {}, format="json")

    assert refreshed.status_code == 200
    assert refreshed.data == {"status": "ok"}
    assert refreshed.cookies["access_token"]["httponly"] is True
    assert "X-Svaply-Access-Expires-At" in refreshed
    assert session_client.get(reverse("accounts:me")).status_code == 200


def test_logout_blacklists_captured_refresh_cookie(session_client, session_user):
    """Restoring a copied pre-logout refresh cookie cannot revive the session."""
    assert _login(session_client).status_code == 200
    old_refresh = session_client.cookies["refresh_token"].value
    logout = session_client.post(reverse("accounts:logout"), {}, format="json")
    assert logout.status_code == 200

    session_client.cookies["refresh_token"] = old_refresh
    response = session_client.post(reverse("token_refresh"), {}, format="json")

    assert response.status_code == 401
    assert response.data["detail"] == "Invalid authentication credentials"


def test_expired_refresh_cookie_is_rejected(session_client, session_user):
    """An expired signed refresh token cannot issue another access cookie."""
    token = RefreshToken.for_user(session_user)
    token.set_exp(lifetime=timedelta(seconds=-1))
    session_client.cookies["refresh_token"] = str(token)

    response = session_client.post(reverse("token_refresh"), {}, format="json")

    assert response.status_code == 401
    assert response.data["detail"] == "Invalid authentication credentials"
    assert "access_token" not in response.cookies


@override_settings(RATE_LIMITING_ENABLED=True, RATE_LIMIT_DISABLED=False)
def test_refresh_rate_limit_blocks_the_eleventh_attempt(session_client, db):
    """Repeated refresh requests are capped even without a refresh cookie."""
    refresh_url = reverse("token_refresh")

    for _ in range(10):
        assert session_client.post(refresh_url, {}, format="json").status_code == 401

    response = session_client.post(refresh_url, {}, format="json")
    assert response.status_code == 429


@override_settings(RATE_LIMITING_ENABLED=True, RATE_LIMIT_DISABLED=False)
def test_refresh_rate_limiter_fails_closed_when_cache_is_unavailable(
    session_client, db
):
    """A cache outage cannot silently remove refresh brute-force protection."""
    with patch(
        "accounts.views.token_refresh_cookie.cache.get",
        side_effect=RuntimeError("cache down"),
    ):
        response = session_client.post(reverse("token_refresh"), {}, format="json")

    assert response.status_code == 429


def test_successful_login_resets_previous_failure_count(session_client, session_user):
    """Past mistakes do not lock an account after a successful login."""
    login_url = reverse("accounts:login")
    for _ in range(2):
        bad = session_client.post(
            login_url,
            {"email": session_user.email, "password": "wrong"},
            format="json",
        )
        assert bad.status_code == 400

    fail_key, lock_key = _lock_keys_for_email(session_user.email)
    assert cache.get(fail_key) == 2
    assert _login(session_client).status_code == 200
    assert cache.get(fail_key) is None
    assert cache.get(lock_key) is None


@override_settings(DEBUG=False)
def test_production_auth_cookies_are_secure_and_http_only(monkeypatch):
    """Production cookie policy protects credentials regardless of locale."""
    monkeypatch.delenv("RAILWAY", raising=False)
    monkeypatch.delenv("CROSS_SITE_COOKIES", raising=False)
    monkeypatch.delenv("FRONTEND_ORIGIN", raising=False)
    options = _auth_cookie_kwargs()

    assert options == {
        "httponly": True,
        "secure": True,
        "samesite": "None",
        "path": "/",
    }


@override_settings(DEBUG=True)
def test_cookie_diagnostics_log_only_fingerprints():
    """Diagnostic output must never contain raw access or refresh secrets."""
    request = SimpleNamespace(
        META={
            "HTTP_COOKIE": (
                "access_token=secret-access; refresh_token=secret-refresh; "
                "access_token=older"
            )
        }
    )

    with patch("accounts.views.auth_helpers.logger.info") as log_info:
        _log_cookie_header_diagnostics(request, where="test")

    logged = str(log_info.call_args)
    assert "secret-access" not in logged
    assert "secret-refresh" not in logged
    assert "'count': 2" in logged
