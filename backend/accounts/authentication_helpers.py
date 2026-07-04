"""
Auth cache/serialize/lazy-user helpery (vyčlenené z authentication.py kvôli dĺžke).

Blacklist a auth-user cache (GDPR-minimal metadáta), lazy User materializácia,
warm-up a invalidácia. Triedy (SwaplyJWTAuthentication/SwaplyRefreshToken) ostávajú
v authentication.py a tieto helpery odtiaľ importujú.
"""

import logging
import os
import threading
import time
from collections import OrderedDict
from types import MethodType

from django.core.cache import cache

logger = logging.getLogger(__name__)


# Per-process user cache is intentionally disabled. A worker-local cached User
# object cannot be invalidated reliably across workers and caused stale profile
# data after profile updates, refreshes, and re-logins.
_USER_CACHE_TTL_SECONDS = 0
_USER_CACHE_MAX = 0

# Cross-process cache TTL (Redis via Django cache). We keep only auth metadata
# here, never profile fields or unnecessary PII.
_USER_REDIS_TTL_SECONDS = int(
    os.getenv("AUTH_USER_REDIS_CACHE_TTL_SECONDS", "86400") or "86400"
)
_AUTH_USER_CACHE_SLOW_GET_SKIP_SET_MS = float(
    os.getenv("AUTH_USER_CACHE_SLOW_GET_SKIP_SET_MS", "250") or "250"
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


def _should_skip_auth_user_cache_set(cache_get_ms: float) -> bool:
    """
    If the preceding cache.get path was already slow, avoid paying for a second
    remote Redis hop on the same cold-miss request.

    This keeps auth fail-open and correct while preferring user-visible latency
    over best-effort warm-up during a degraded cache window.
    """

    try:
        threshold_ms = float(_AUTH_USER_CACHE_SLOW_GET_SKIP_SET_MS)
        measured_ms = float(cache_get_ms)
    except Exception:
        return False

    if threshold_ms <= 0:
        return False
    return measured_ms >= threshold_ms


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


def warm_user_auth_cache(user) -> bool:
    """
    Best-effort warm-up for the minimal cross-process auth cache.

    This keeps the auth cache GDPR-minimal and avoids pushing the first
    protected request after login/refresh through the full cold auth path.
    """

    if _USER_REDIS_TTL_SECONDS <= 0 or user is None:
        return False

    try:
        user_id = int(getattr(user, "pk", None) or getattr(user, "id", None) or 0)
    except Exception:
        user_id = 0
    if user_id <= 0:
        return False

    payload = _serialize_user_for_cache(user)
    if not payload:
        return False

    try:
        cache.set(
            _redis_user_cache_key(user_id),
            payload,
            timeout=_USER_REDIS_TTL_SECONDS,
        )
        return True
    except Exception as exc:
        logger.warning("Auth user cache warm-up failed for user_id=%s: %s", user_id, exc)
        return False


def warm_user_auth_cache_with_timing(user) -> dict[str, float | bool]:
    """
    Best-effort helper for auth warm-up observability.

    Returns a small metrics dict with:
    - ok: whether cache.set path completed successfully
    - duration_ms: total write duration
    - verify_ok: whether the value is immediately readable back
    - verify_ms: read-after-write verification duration
    """

    t0 = time.perf_counter()
    ok = warm_user_auth_cache(user)
    duration_ms = (time.perf_counter() - t0) * 1000.0

    verify_ok = False
    verify_ms = 0.0
    if ok:
        t_verify0 = time.perf_counter()
        try:
            user_id = int(getattr(user, "pk", None) or getattr(user, "id", None) or 0)
        except Exception:
            user_id = 0
        try:
            if user_id > 0:
                expected = _parse_cached_auth_state(_serialize_user_for_cache(user))
                actual = _parse_cached_auth_state(
                    cache.get(_redis_user_cache_key(user_id))
                )
                verify_ok = bool(expected and actual and actual == expected)
        except Exception:
            verify_ok = False
        finally:
            verify_ms = (time.perf_counter() - t_verify0) * 1000.0

    return {
        "ok": ok,
        "duration_ms": duration_ms,
        "verify_ok": verify_ok,
        "verify_ms": verify_ms,
    }

