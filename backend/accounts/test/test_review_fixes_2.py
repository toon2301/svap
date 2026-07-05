"""Testy pre druhú dávku code-review fixov (BOD 11–15, 18)."""

from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.http import HttpResponse
from rest_framework.test import APIClient

from accounts.account_deletion import anonymize_user
from accounts.authentication_helpers import _env_float, _env_int
from accounts.models import Notification, NotificationType, OfferedSkill
from accounts.views.auth_helpers import (
    _access_token_lifetime_seconds,
    _set_auth_cookies,
)
from accounts.views.skill_helpers import _skills_list_cache_key

User = get_user_model()


def _user(username):
    return User.objects.create_user(
        username=username, email=f"{username}@e.com", password="StrongPass123"
    )


# ── BOD 11 – scrub mena aktéra nezávisle od (historického) mena ───────────────
@pytest.mark.django_db
class TestActorNotificationScrub:
    def test_actor_notifications_scrubbed_regardless_of_historical_name(self):
        actor = _user("actor")
        recipient = _user("recip")
        # Body obsahuje STARÉ meno (iné než aktuálny display_name) – simuluje
        # premenovanie po vytvorení notifikácie.
        notif = Notification.objects.create(
            user=recipient,
            actor=actor,
            type=NotificationType.SKILL_REQUEST_ACCEPTED,
            title="Žiadosť prijatá",
            body="Staré Meno prijal tvoju žiadosť.",
            data={"offer_id": 1},
        )

        anonymize_user(actor)

        notif.refresh_from_db()
        assert notif.title == "Zmazaný používateľ"
        assert notif.body == "Zmazaný používateľ"
        assert "Staré Meno" not in notif.body


# BOD 12 (mazanie AccountDeletionRequest) NIE je implementovaný – koliduje s
# OAuth confirm flow (viď report). Test preto zámerne chýba.


# ── BOD 13 – env parsing s fallbackom (žiadny crash pri zlej hodnote) ─────────
class TestEnvParsing:
    def test_env_int_invalid_falls_back(self, monkeypatch):
        monkeypatch.setenv("X_REVIEW_TTL", "abc")
        assert _env_int("X_REVIEW_TTL", 99) == 99  # žiadny ValueError

    def test_env_int_valid_and_missing(self, monkeypatch):
        monkeypatch.setenv("X_REVIEW_TTL", "123")
        assert _env_int("X_REVIEW_TTL", 99) == 123
        monkeypatch.delenv("X_REVIEW_TTL", raising=False)
        assert _env_int("X_REVIEW_TTL", 99) == 99

    def test_env_float_invalid_falls_back(self, monkeypatch):
        monkeypatch.setenv("X_REVIEW_MS", "notfloat")
        assert _env_float("X_REVIEW_MS", 2.5) == 2.5


# ── BOD 14 – access cookie lifetime = JWT konfigurácia ────────────────────────
class TestCookieLifetimeAlignment:
    def test_access_cookie_max_age_matches_jwt_lifetime(self, settings):
        settings.SIMPLE_JWT = {
            **settings.SIMPLE_JWT,
            "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
        }
        resp = HttpResponse()
        _set_auth_cookies(resp, access="a", refresh="r")
        max_age = int(resp.cookies["access_token"]["max-age"])
        assert max_age == _access_token_lifetime_seconds() == 30 * 60


# ── BOD 15 – skills cache je host-scoped (žiadny cross-domain leak) ───────────
@pytest.mark.django_db
class TestSkillsCacheHostScoped:
    def setup_method(self):
        cache.clear()

    def teardown_method(self):
        cache.clear()

    def test_cache_entry_is_host_specific(self, settings):
        settings.ALLOWED_HOSTS = ["a.test", "b.test", "testserver"]
        user = _user("hostuser")
        OfferedSkill.objects.create(user=user, category="IT", subcategory="Web")
        client = APIClient()
        client.force_authenticate(user=user)

        r1 = client.get("/api/auth/skills/", HTTP_HOST="a.test")
        assert r1.status_code == 200
        entry = cache.get(_skills_list_cache_key(user.id))
        assert isinstance(entry, dict) and entry["host"] == "a.test"

        # Request z iného hosta sa neobslúži z a.test cache -> recompute + prepíše host.
        r2 = client.get("/api/auth/skills/", HTTP_HOST="b.test")
        assert r2.status_code == 200
        entry2 = cache.get(_skills_list_cache_key(user.id))
        assert entry2["host"] == "b.test"


# ── BOD 18 – konzistentný response shape (is_capped v early returns) ──────────
@pytest.mark.django_db
class TestSearchEarlyReturnShape:
    def setup_method(self):
        cache.clear()

    def test_search_empty_query_has_is_capped(self):
        client = APIClient()
        r = client.get("/api/auth/search/", {"q": ""})
        assert r.status_code == 200
        assert r.data["is_capped"] is False

    def test_global_search_empty_query_has_capped_fields(self):
        client = APIClient()
        r = client.get("/api/auth/search/global/", {"q": ""})
        assert r.status_code == 200
        assert r.data["users_is_capped"] is False
        assert r.data["offers_is_capped"] is False
