import pytest
from django.contrib.auth import get_user_model
from unittest.mock import patch
from rest_framework_simplejwt.exceptions import InvalidToken
from accounts.authentication import SwaplyJWTAuthentication
from accounts.authentication import RefreshToken as _BaseRefreshToken
from accounts.authentication import SwaplyRefreshToken

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
        assert auth._is_token_blacklisted({"user_id": 1}) is False

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
        with patch("django.core.cache.cache.get", side_effect=Exception("err")):
            assert auth._is_token_blacklisted_fallback({"jti": "x"}) is False

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
