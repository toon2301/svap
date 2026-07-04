"""
Custom JWT authentication for Swaply.

- Uses Redis/Django cache for blacklist checks.
- Keeps only minimal auth metadata in cross-process cache.
- Returns a real User model instance on every request.
- On auth-cache hit it may return a deferred/lazy User that materializes the
  full DB row only when non-auth profile fields are actually accessed.
"""

import logging
import os
import threading
import time
from collections import OrderedDict
from types import MethodType

from django.core.cache import cache
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework_simplejwt.tokens import RefreshToken

# Cache/serialize/lazy-user helpery sú vyčlenené do authentication_helpers.
# Re-export (noqa) zachováva spätnú kompatibilitu pre `from accounts.authentication
# import <helper>` v ostatnom kóde.
from .authentication_helpers import (  # noqa: F401
    _AUTH_LAZY_USER_ENABLED,
    _USER_CACHE,
    _USER_REDIS_TTL_SECONDS,
    _bl_cache_get,
    _bl_cache_set,
    _build_lazy_auth_user,
    _parse_cached_auth_state,
    _redis_user_cache_key,
    _serialize_user_for_cache,
    _should_skip_auth_user_cache_set,
    _user_cache_get,
    _user_cache_set,
    invalidate_user_auth_cache,
    materialize_auth_user,
    warm_user_auth_cache,
    warm_user_auth_cache_with_timing,
)

logger = logging.getLogger(__name__)


class SwaplyJWTAuthentication(JWTAuthentication):
    """
    Custom JWT authentication with Redis/Django-cache blacklist fallback.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.user_id_field = "id"

    def authenticate(self, request):
        """
        Cookie-only auth model:
        - Ignore Authorization header
        - Accept only HttpOnly `access_token` cookie
        """

        base_req = getattr(request, "_request", request)
        try:
            self._timing_request = base_req
        except Exception:
            self._timing_request = None

        t0 = time.perf_counter()
        try:
            cookie_token = request.COOKIES.get("access_token")
        except Exception:
            cookie_token = None
        if not cookie_token:
            return None

        t1 = time.perf_counter()
        validated_token = self.get_validated_token(cookie_token)
        t2 = time.perf_counter()
        user = self.get_user(validated_token)
        t3 = time.perf_counter()

        try:
            st = getattr(base_req, "_server_timing", None)
            if not isinstance(st, dict):
                st = {}
            st["auth"] = (t3 - t0) * 1000.0
            st["auth_validate"] = (t2 - t1) * 1000.0
            st["auth_user"] = (t3 - t2) * 1000.0
            base_req._server_timing = st
        except Exception:
            pass

        return user, validated_token

    def get_user(self, validated_token):
        """
        Return a real User model instance.

        On auth-cache hit we may return a lazy/deferred User instance that only
        carries minimal auth fields immediately and materializes the full row on
        first access to non-auth fields. This keeps permissions and ORM
        compatibility while avoiding an unconditional DB fetch on every
        protected request.
        """

        try:
            user_id = validated_token.get("user_id")
            if user_id is None:
                raise InvalidToken(
                    "Token contained no recognizable user identification"
                )

            t_bl0 = time.perf_counter()
            if self._should_check_blacklist(validated_token) and self._is_token_blacklisted(
                validated_token
            ):
                raise InvalidToken("Token is blacklisted")
            t_bl1 = time.perf_counter()

            from django.contrib.auth import get_user_model
            from django.db import connections

            User = get_user_model()
            conn = connections["default"]
            try:
                conn_was_none = conn.connection is None
            except Exception:
                conn_was_none = False

            cached_state = None
            cache_get_ms = 0.0
            cache_hit = False
            if _USER_REDIS_TTL_SECONDS > 0:
                t_cache0 = time.perf_counter()
                try:
                    cached_state = _parse_cached_auth_state(
                        cache.get(_redis_user_cache_key(int(user_id)))
                    )
                    cache_hit = cached_state is not None
                except Exception:
                    cached_state = None
                    cache_hit = False
                finally:
                    cache_get_ms = (time.perf_counter() - t_cache0) * 1000.0

            db_connect_ms = 0.0
            db_query_ms = 0.0
            db_get_ms = 0.0
            cache_set_ms = 0.0
            cache_set_skipped = False
            if cached_state is not None and _AUTH_LAZY_USER_ENABLED:
                if not cached_state["is_active"]:
                    invalidate_user_auth_cache(int(user_id))
                    raise InvalidToken("User is inactive")
                user = _build_lazy_auth_user(User, cached_state)
            else:
                t_db_connect0 = time.perf_counter()
                try:
                    conn.ensure_connection()
                except Exception:
                    pass
                db_connect_ms = (time.perf_counter() - t_db_connect0) * 1000.0

                t_db_query0 = time.perf_counter()
                user = User.objects.get(**{self.user_id_field: user_id})
                db_query_ms = (time.perf_counter() - t_db_query0) * 1000.0
                db_get_ms = db_connect_ms + db_query_ms

                if not user.is_active:
                    invalidate_user_auth_cache(int(user_id))
                    raise InvalidToken("User is inactive")

                if _USER_REDIS_TTL_SECONDS > 0 and not _should_skip_auth_user_cache_set(
                    cache_get_ms
                ):
                    t_cache_set0 = time.perf_counter()
                    try:
                        fresh_payload = _serialize_user_for_cache(user)
                        if cached_state != fresh_payload:
                            cache.set(
                                _redis_user_cache_key(int(user_id)),
                                fresh_payload,
                                timeout=_USER_REDIS_TTL_SECONDS,
                            )
                    except Exception:
                        pass
                    finally:
                        cache_set_ms = (
                            time.perf_counter() - t_cache_set0
                        ) * 1000.0
                elif _USER_REDIS_TTL_SECONDS > 0:
                    cache_set_skipped = True
                    logger.debug(
                        "Skipping auth user cache set after slow cache get for user_id=%s (%.1f ms)",
                        user_id,
                        cache_get_ms,
                    )

            try:
                base_req = getattr(self, "_timing_request", None)
                if base_req is not None:
                    st = getattr(base_req, "_server_timing", None)
                    if not isinstance(st, dict):
                        st = {}
                    st["auth_blacklist"] = (t_bl1 - t_bl0) * 1000.0
                    st["auth_user_cache_get"] = cache_get_ms
                    st["auth_user_cache_hit"] = 1.0 if cache_hit else 0.0
                    st["auth_user_cache_miss"] = 0.0 if cache_hit else 1.0
                    st["auth_user_db_connect"] = db_connect_ms
                    st["auth_user_db_query"] = db_query_ms
                    st["auth_user_db_get"] = db_get_ms
                    st["auth_user_cache_set"] = cache_set_ms
                    st["auth_user_cache_set_skipped"] = 1.0 if cache_set_skipped else 0.0
                    st["auth_user_db"] = db_get_ms
                    st["db_conn_new"] = 0.1 if conn_was_none else 0.0
                    base_req._server_timing = st
            except Exception:
                pass

            return user

        except Exception as exc:
            logger.error("JWT authentication error: %s", exc)
            raise InvalidToken("Token is invalid")

    def _should_check_blacklist(self, token) -> bool:
        """
        Access tokens are short-lived and are not the token type persisted in the
        SimpleJWT blacklist model. Skip their blacklist lookup to avoid an extra
        remote cache hop on every authenticated request.
        """
        return str(token.get("token_type") or "").lower() != "access"

    def _is_redis_available(self):
        """Compatibility helper used by existing tests and diagnostics."""
        try:
            cache.get("test_key")
            return True
        except Exception:
            return False

    def _is_token_blacklisted_fallback(self, token):
        """Compatibility wrapper for explicit fallback blacklist checks in tests."""
        jti = token.get("jti")
        if not jti:
            return True
        try:
            from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken

            return BlacklistedToken.objects.filter(token__jti=jti).exists()
        except Exception:
            return True

    def _is_token_blacklisted(self, token):
        """
        Check blacklist in cache first; fall back to DB blacklist when needed.
        """

        jti = token.get("jti")
        if not jti:
            logger.warning("Blacklist check failed (missing jti) - fail-closed")
            return True

        cached = _bl_cache_get(str(jti))
        if cached is not None:
            return bool(cached)

        blacklist_key = f"blacklist_{jti}"
        t0 = time.perf_counter()
        try:
            is_bl = cache.get(blacklist_key) is not None
            _bl_cache_set(str(jti), bool(is_bl))
            return is_bl
        except Exception as exc:
            logger.warning("Redis blacklist check failed, falling back to DB: %s", exc)
            try:
                from rest_framework_simplejwt.token_blacklist.models import (
                    BlacklistedToken,
                )

                is_bl = BlacklistedToken.objects.filter(token__jti=jti).exists()
                _bl_cache_set(str(jti), bool(is_bl))
                return is_bl
            except Exception as db_exc:
                logger.warning("DB blacklist check failed: %s", db_exc)
                return True
        finally:
            try:
                _ = (time.perf_counter() - t0) * 1000.0
            except Exception:
                pass


class SwaplyRefreshToken(RefreshToken):
    """
    Custom RefreshToken with Redis/Django-cache blacklist fallback.
    """

    def blacklist(self):
        try:
            super().blacklist()
        except Exception as exc:
            logger.warning("Base blacklist failed or unavailable: %s", exc)

        try:
            if self._is_redis_available():
                self._blacklist_redis()
            else:
                self._blacklist_fallback()
        except Exception as exc:
            logger.error("Token blacklisting failed: %s", exc)

    def _is_redis_available(self):
        try:
            cache.get("test_key")
            return True
        except Exception:
            return False

    def _blacklist_redis(self):
        try:
            jti = self.get("jti")
            if jti:
                blacklist_key = f"blacklist_{jti}"
                cache.set(blacklist_key, True, timeout=86400)
        except Exception as exc:
            logger.error("Redis blacklisting failed: %s", exc)

    def _blacklist_fallback(self):
        try:
            jti = self.get("jti")
            if jti:
                blacklist_key = f"blacklist_{jti}"
                cache.set(blacklist_key, True, timeout=86400)
        except Exception as exc:
            logger.error("Fallback blacklisting failed: %s", exc)
