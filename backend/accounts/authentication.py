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

logger = logging.getLogger(__name__)

# Per-process user cache is intentionally disabled. A worker-local cached User
# object cannot be invalidated reliably across workers and caused stale profile
# data after profile updates, refreshes, and re-logins.
_USER_CACHE_TTL_SECONDS = 0
_USER_CACHE_MAX = 0

# Cross-process cache TTL (Redis via Django cache). We keep only auth metadata
# here, never profile fields or unnecessary PII.
_USER_REDIS_TTL_SECONDS = int(
    os.getenv("AUTH_USER_REDIS_CACHE_TTL_SECONDS", "300") or "300"
)
_AUTH_LAZY_USER_ENABLED = (
    (os.getenv("AUTH_LAZY_USER_ENABLED") or "1").strip().lower()
    not in {"0", "false", "no"}
)
_AUTH_CACHE_FIELD_NAMES = ("id", "is_active", "is_staff", "is_superuser")
_USER_CACHE_LOCK = threading.Lock()
_USER_CACHE: "OrderedDict[int, tuple[float, object]]" = OrderedDict()

_BLACKLIST_CACHE_TTL_SECONDS = int(
    os.getenv("AUTH_BLACKLIST_CACHE_TTL_SECONDS", "60") or "60"
)
_BLACKLIST_CACHE_MAX = int(
    os.getenv("AUTH_BLACKLIST_CACHE_MAX", "20000") or "20000"
)
_BLACKLIST_CACHE_LOCK = threading.Lock()
_BLACKLIST_CACHE: "OrderedDict[str, tuple[float, bool]]" = OrderedDict()


def _bl_cache_get(jti: str) -> bool | None:
    if _BLACKLIST_CACHE_TTL_SECONDS <= 0 or _BLACKLIST_CACHE_MAX <= 0:
        return None
    now = time.time()
    key = str(jti)
    with _BLACKLIST_CACHE_LOCK:
        item = _BLACKLIST_CACHE.get(key)
        if not item:
            return None
        exp, val = item
        if exp < now:
            try:
                _BLACKLIST_CACHE.pop(key, None)
            except Exception:
                pass
            return None
        try:
            _BLACKLIST_CACHE.move_to_end(key)
        except Exception:
            pass
        return bool(val)


def _bl_cache_set(jti: str, val: bool) -> None:
    if _BLACKLIST_CACHE_TTL_SECONDS <= 0 or _BLACKLIST_CACHE_MAX <= 0:
        return
    now = time.time()
    key = str(jti)
    with _BLACKLIST_CACHE_LOCK:
        _BLACKLIST_CACHE[key] = (now + float(_BLACKLIST_CACHE_TTL_SECONDS), bool(val))
        try:
            _BLACKLIST_CACHE.move_to_end(key)
        except Exception:
            pass
        while len(_BLACKLIST_CACHE) > _BLACKLIST_CACHE_MAX:
            try:
                _BLACKLIST_CACHE.popitem(last=False)
            except Exception:
                break


def _user_cache_get(user_id: int):
    # Disabled by design; keep helper for compatibility and explicit cleanup paths.
    _ = user_id
    return None


def _user_cache_set(user_id: int, user):
    # Disabled by design; keep helper for compatibility and explicit cleanup paths.
    _ = (user_id, user)
    return


def _redis_user_cache_key(user_id: int) -> str:
    return f"auth_user_v2:{int(user_id)}"


def _serialize_user_for_cache(user) -> dict:
    """
    Minimal auth metadata only.

    GDPR/data-minimization: do not cache profile fields or extra PII in the auth
    cache layer.
    """

    try:
        return {
            "id": int(getattr(user, "id", 0) or 0),
            "is_active": bool(getattr(user, "is_active", False)),
            "is_staff": bool(getattr(user, "is_staff", False)),
            "is_superuser": bool(getattr(user, "is_superuser", False)),
        }
    except Exception:
        return {}


def _parse_cached_auth_state(data: dict | None) -> dict | None:
    try:
        if not isinstance(data, dict):
            return None
        uid = int(data.get("id") or 0)
        if uid <= 0:
            return None
        return {
            "id": uid,
            "is_active": bool(data.get("is_active", False)),
            "is_staff": bool(data.get("is_staff", False)),
            "is_superuser": bool(data.get("is_superuser", False)),
        }
    except Exception:
        return None


def _hydrate_user_instance_from_db(target_user, full_user) -> None:
    for field in target_user._meta.concrete_fields:
        setattr(target_user, field.attname, getattr(full_user, field.attname))

    try:
        target_user._state.db = full_user._state.db
        target_user._state.adding = full_user._state.adding
    except Exception:
        pass

    try:
        target_user._prefetched_objects_cache = getattr(
            full_user, "_prefetched_objects_cache", {}
        )
    except Exception:
        pass


def _lazy_auth_refresh_from_db(self, using=None, fields=None, from_queryset=None):
    original_refresh = getattr(self, "_swaply_auth_original_refresh_from_db", None)
    if getattr(self, "_swaply_auth_fully_loaded", False):
        if callable(original_refresh):
            return original_refresh(
                using=using, fields=fields, from_queryset=from_queryset
            )
        return None

    from django.contrib.auth import get_user_model

    using = using or getattr(getattr(self, "_state", None), "db", None) or "default"
    user_model = get_user_model()
    queryset = from_queryset or user_model._default_manager.using(using)
    full_user = queryset.get(pk=self.pk)
    _hydrate_user_instance_from_db(self, full_user)
    self._swaply_auth_fully_loaded = True
    return None


def _build_lazy_auth_user(user_model, cached_state: dict):
    field_names = []
    values = []
    for field in user_model._meta.concrete_fields:
        if field.attname in cached_state:
            field_names.append(field.attname)
            values.append(cached_state[field.attname])
    user = user_model.from_db("default", field_names, values)
    user._swaply_auth_lazy = True
    user._swaply_auth_fully_loaded = False
    user._swaply_auth_original_refresh_from_db = user.refresh_from_db
    user.refresh_from_db = MethodType(_lazy_auth_refresh_from_db, user)
    return user


def materialize_auth_user(user):
    if user is None:
        return None
    if getattr(user, "_swaply_auth_lazy", False) and not getattr(
        user, "_swaply_auth_fully_loaded", False
    ):
        user.refresh_from_db()
    return user


def invalidate_user_auth_cache(user_id: int | None) -> None:
    """
    Best-effort invalidation for all auth-related user cache layers.
    """

    if not user_id:
        return

    try:
        cache.delete(_redis_user_cache_key(int(user_id)))
    except Exception as exc:
        logger.warning(
            "Auth user cache invalidation failed for user_id=%s: %s", user_id, exc
        )

    try:
        with _USER_CACHE_LOCK:
            _USER_CACHE.pop(int(user_id), None)
    except Exception:
        pass


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
            if self._is_token_blacklisted(validated_token):
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
            if _USER_REDIS_TTL_SECONDS > 0:
                t_cache0 = time.perf_counter()
                try:
                    cached_state = _parse_cached_auth_state(
                        cache.get(_redis_user_cache_key(int(user_id)))
                    )
                except Exception:
                    cached_state = None
                finally:
                    cache_get_ms = (time.perf_counter() - t_cache0) * 1000.0

            db_get_ms = 0.0
            cache_set_ms = 0.0
            if cached_state is not None and _AUTH_LAZY_USER_ENABLED:
                if not cached_state["is_active"]:
                    invalidate_user_auth_cache(int(user_id))
                    raise InvalidToken("User is inactive")
                user = _build_lazy_auth_user(User, cached_state)
            else:
                t_db0 = time.perf_counter()
                user = User.objects.get(**{self.user_id_field: user_id})
                db_get_ms = (time.perf_counter() - t_db0) * 1000.0

                if not user.is_active:
                    invalidate_user_auth_cache(int(user_id))
                    raise InvalidToken("User is inactive")

                if _USER_REDIS_TTL_SECONDS > 0:
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

            try:
                base_req = getattr(self, "_timing_request", None)
                if base_req is not None:
                    st = getattr(base_req, "_server_timing", None)
                    if not isinstance(st, dict):
                        st = {}
                    st["auth_blacklist"] = (t_bl1 - t_bl0) * 1000.0
                    st["auth_user_cache_get"] = cache_get_ms
                    st["auth_user_db_get"] = db_get_ms
                    st["auth_user_cache_set"] = cache_set_ms
                    st["auth_user_db"] = db_get_ms
                    st["db_conn_new"] = 0.1 if conn_was_none else 0.0
                    base_req._server_timing = st
            except Exception:
                pass

            return user

        except Exception as exc:
            logger.error("JWT authentication error: %s", exc)
            raise InvalidToken("Token is invalid")

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
