"""
Bezpečnostné testy pre EnforceCSRFMiddleware.

Overujú, že CSRF token sa na state-changing /api/ endpointoch reálne VALIDUJE
(zhoda hlavička↔cookie), nie len kontroluje na prítomnosť. Bez tejto validácie
by DRF `@api_view` views (csrf_exempt) prepustili aj sfalšované cross-site POSTy.
"""

import json

import pytest
from django.test import Client


@pytest.fixture
def csrf_enforced(settings):
    settings.CSRF_ENFORCE_API = True
    return settings


def _post_login(client, **extra):
    return client.post(
        "/api/auth/login/",
        data=json.dumps({"email": "x@example.com", "password": "whatever"}),
        content_type="application/json",
        **extra,
    )


@pytest.mark.django_db
def test_mismatched_token_is_rejected(csrf_enforced):
    """Cookie a hlavička sa nezhodujú → 403 (token sa reálne porovnáva)."""
    client = Client(enforce_csrf_checks=True)
    client.cookies["csrftoken"] = "AAAAmismatchAAAA"
    resp = _post_login(client, HTTP_X_CSRFTOKEN="BBBBdifferentBBBB")
    assert resp.status_code == 403


@pytest.mark.django_db
def test_cookie_only_without_header_is_rejected(csrf_enforced):
    """Sfalšovaný cross-site POST nesie iba cookie (bez hlavičky) → 403."""
    client = Client(enforce_csrf_checks=True)
    client.cookies["csrftoken"] = "AAAAcookieOnlyAAAA"
    resp = _post_login(client)
    assert resp.status_code == 403


@pytest.mark.django_db
def test_missing_token_entirely_is_rejected(csrf_enforced):
    """Žiadny token (ani cookie, ani hlavička) → 403."""
    client = Client(enforce_csrf_checks=True)
    resp = _post_login(client)
    assert resp.status_code == 403


@pytest.mark.django_db
def test_valid_token_passes_csrf_and_reaches_view(csrf_enforced):
    """
    Platný token (z /auth/csrf-token/, zhodný s cookie) → CSRF prejde a request
    sa dostane do login view (400/401 = neplatné creds), NIE 403.
    """
    client = Client(enforce_csrf_checks=True)
    token_resp = client.get("/api/auth/csrf-token/")
    assert token_resp.status_code == 200
    token = token_resp.json()["csrf_token"]

    resp = _post_login(client, HTTP_X_CSRFTOKEN=token)
    assert resp.status_code != 403
    assert resp.status_code in (400, 401)
