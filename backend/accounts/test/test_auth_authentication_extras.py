import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import connection
from django.test.utils import CaptureQueriesContext
from unittest.mock import patch
from rest_framework_simplejwt.exceptions import InvalidToken
from accounts.authentication import (
    SwaplyJWTAuthentication,
    _redis_user_cache_key,
    _serialize_user_for_cache,
    materialize_auth_user,
)
from accounts.authentication import RefreshToken as _BaseRefreshToken
from accounts.authentication import SwaplyRefreshToken
from accounts.models import OfferedSkill

User = get_user_model()


@pytest.mark.django_db
class TestJWTAuthExtras:
    def test_get_user_missing_user_id_raises(self):
        auth = SwaplyJWTAuthentication()
        with pytest.raises(InvalidToken):
            auth.get_user(validated_token={})

    def test_get_user_inactive_user_raises(self):
        user = User.objects.create_user(
            username="inactive",
            email="inactive@example.com",
            password="StrongPass123",
            is_active=False,
        )
        token = {"user_id": user.id, "jti": "x1"}
        auth = SwaplyJWTAuthentication()
        # Zabezpeč, že nevyhodí blacklist pred overením usera
        with patch.object(
            SwaplyJWTAuthentication, "_is_redis_available", return_value=False
        ):
            with patch("django.core.cache.cache.get", return_value=None):
                with pytest.raises(InvalidToken):
                    auth.get_user(validated_token=token)

    def test_fallback_blacklisted_token_raises(self):
        user = User.objects.create_user(
            username="bluser",
            email="bl@example.com",
            password="StrongPass123",
            is_active=True,
        )
        token = {"user_id": user.id, "jti": "bl123"}
        auth = SwaplyJWTAuthentication()
        # Simuluj fallback (žiadny Redis) a blacklisted v cache
        with patch.object(
            SwaplyJWTAuthentication, "_is_redis_available", return_value=False
        ):
            with patch("django.core.cache.cache.get", return_value=True):
                with pytest.raises(InvalidToken):
                    auth.get_user(validated_token=token)

    def test_redis_available_not_blacklisted_returns_user(self):
        user = User.objects.create_user(
            username="okuser",
            email="ok@example.com",
            password="StrongPass123",
            is_active=True,
        )
        token = {"user_id": user.id, "jti": "ok123"}
        auth = SwaplyJWTAuthentication()
        with patch.object(
            SwaplyJWTAuthentication, "_is_redis_available", return_value=True
        ):
            with patch("django.core.cache.cache.get", return_value=None):
                got = auth.get_user(validated_token=token)
                assert got.id == user.id

    def test_is_token_blacklisted_no_jti_returns_false(self):
        auth = SwaplyJWTAuthentication()
        assert auth._is_token_blacklisted({"user_id": 1}) is True

    def test_redis_blacklist_check_exception_path_returns_user(self):
        user = User.objects.create_user(
            username="rerr",
            email="rerr@example.com",
            password="StrongPass123",
            is_active=True,
        )
        token = {"user_id": user.id, "jti": "exc1"}
        auth = SwaplyJWTAuthentication()
        with patch.object(
            SwaplyJWTAuthentication, "_is_redis_available", return_value=True
        ):
            with patch("django.core.cache.cache.get", side_effect=Exception("boom")):
                got = auth.get_user(validated_token=token)
                assert got.id == user.id

    def test_refresh_blacklist_logs_base_failure_and_uses_fallback(self, caplog):
        user = User.objects.create_user(
            username="rb",
            email="rb@example.com",
            password="StrongPass123",
            is_active=True,
        )
        refresh = SwaplyRefreshToken.for_user(user)
        with patch(
            "accounts.authentication.RefreshToken.blacklist",
            side_effect=Exception("base-fail"),
        ):
            with patch.object(
                SwaplyRefreshToken, "_is_redis_available", return_value=False
            ):
                with patch(
                    "django.core.cache.cache.set", return_value=True
                ) as mock_set:
                    refresh.blacklist()
                    assert any(
                        "Base blacklist failed" in rec.message for rec in caplog.records
                    )
                    mock_set.assert_called_once()

    def test_is_token_blacklisted_fallback_not_blacklisted(self):
        auth = SwaplyJWTAuthentication()
        with patch("django.core.cache.cache.get", return_value=None):
            assert auth._is_token_blacklisted_fallback({"jti": "nope"}) is False

    def test_refresh_blacklist_logs_error_on_cache_failure(self):
        user = User.objects.create_user(
            username="rb2",
            email="rb2@example.com",
            password="StrongPass123",
            is_active=True,
        )
        refresh = SwaplyRefreshToken.for_user(user)
        with patch.object(SwaplyRefreshToken, "_is_redis_available", return_value=True):
            with patch(
                "accounts.authentication.cache.set", side_effect=Exception("cache-fail")
            ):
                # Should not raise
                refresh.blacklist()

    def test_is_token_blacklisted_fallback_exception_returns_false(self):
        auth = SwaplyJWTAuthentication()
        with patch(
            "rest_framework_simplejwt.token_blacklist.models.BlacklistedToken.objects.filter",
            side_effect=Exception("err"),
        ):
            assert auth._is_token_blacklisted_fallback({"jti": "x"}) is True

    def test_redis_available_blacklisted_raises(self):
        user = User.objects.create_user(
            username="rb3",
            email="rb3@example.com",
            password="StrongPass123",
            is_active=True,
        )
        token = {"user_id": user.id, "jti": "badjti"}
        auth = SwaplyJWTAuthentication()
        with patch.object(
            SwaplyJWTAuthentication, "_is_redis_available", return_value=True
        ):
            with patch("django.core.cache.cache.get", return_value=True):
                with pytest.raises(InvalidToken):
                    auth.get_user(validated_token=token)

    def test_cached_auth_hit_skips_user_db_until_deferred_profile_field_is_used(self):
        cache.clear()
        user = User.objects.create_user(
            username="lazyuser",
            email="lazy@example.com",
            password="StrongPass123",
            first_name="Lazy",
            bio="Loaded lazily",
            is_active=True,
        )
        cache.set(
            _redis_user_cache_key(user.id),
            _serialize_user_for_cache(user),
            timeout=300,
        )

        auth = SwaplyJWTAuthentication()
        with patch.object(
            SwaplyJWTAuthentication, "_is_token_blacklisted", return_value=False
        ):
            with CaptureQueriesContext(connection) as ctx:
                got = auth.get_user(validated_token={"user_id": user.id, "jti": "lz1"})
                assert got.id == user.id
                assert got.is_active is True
                assert got.is_staff is False

            assert len(ctx.captured_queries) == 0
            assert isinstance(got, User)
            assert getattr(got, "_swaply_auth_lazy", False) is True

            with CaptureQueriesContext(connection) as ctx:
                assert got.email == user.email
                assert got.first_name == "Lazy"

            assert len(ctx.captured_queries) == 1
            assert getattr(got, "_swaply_auth_fully_loaded", False) is True

            with CaptureQueriesContext(connection) as ctx:
                assert got.bio == "Loaded lazily"

            assert len(ctx.captured_queries) == 0

    def test_materialize_auth_user_loads_full_model_once(self):
        cache.clear()
        user = User.objects.create_user(
            username="materialize",
            email="materialize@example.com",
            password="StrongPass123",
            first_name="Mat",
            last_name="User",
            bio="Needs full load",
        )
        cache.set(
            _redis_user_cache_key(user.id),
            _serialize_user_for_cache(user),
            timeout=300,
        )
        auth = SwaplyJWTAuthentication()

        with patch.object(
            SwaplyJWTAuthentication, "_is_token_blacklisted", return_value=False
        ):
            lazy_user = auth.get_user(validated_token={"user_id": user.id, "jti": "lz2"})

        with CaptureQueriesContext(connection) as ctx:
            hydrated = materialize_auth_user(lazy_user)
            assert hydrated.email == user.email
            assert hydrated.bio == "Needs full load"

        assert len(ctx.captured_queries) == 1

        with CaptureQueriesContext(connection) as ctx:
            assert materialize_auth_user(hydrated).first_name == "Mat"

        assert len(ctx.captured_queries) == 0

    def test_lazy_auth_user_remains_compatible_with_user_fk_filters(self):
        cache.clear()
        user = User.objects.create_user(
            username="ormuser",
            email="orm@example.com",
            password="StrongPass123",
            is_active=True,
        )
        OfferedSkill.objects.create(
            user=user,
            category="Dev",
            subcategory="Backend",
            description="Python",
        )
        cache.set(
            _redis_user_cache_key(user.id),
            _serialize_user_for_cache(user),
            timeout=300,
        )
        auth = SwaplyJWTAuthentication()

        with patch.object(
            SwaplyJWTAuthentication, "_is_token_blacklisted", return_value=False
        ):
            lazy_user = auth.get_user(validated_token={"user_id": user.id, "jti": "lz3"})

        assert OfferedSkill.objects.filter(user=lazy_user).count() == 1
