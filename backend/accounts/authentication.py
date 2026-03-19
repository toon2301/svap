"""
Custom JWT authentication pre Swaply s Redis fallback
"""

import logging
import time
import os
import threading
from collections import OrderedDict
from django.core.cache import cache
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings

logger = logging.getLogger(__name__)

_USER_CACHE_TTL_SECONDS = int(os.getenv("AUTH_USER_CACHE_TTL_SECONDS", "30") or "30")
_USER_CACHE_MAX = int(os.getenv("AUTH_USER_CACHE_MAX", "5000") or "5000")
# Cross-process cache TTL (Redis via Django cache). Keep short to avoid stale role/state.
_USER_REDIS_TTL_SECONDS = int(os.getenv("AUTH_USER_REDIS_CACHE_TTL_SECONDS", "300") or "300")
_USER_CACHE_LOCK = threading.Lock()
_USER_CACHE: "OrderedDict[int, tuple[float, object]]" = OrderedDict()

_BLACKLIST_CACHE_TTL_SECONDS = int(os.getenv("AUTH_BLACKLIST_CACHE_TTL_SECONDS", "60") or "60")
_BLACKLIST_CACHE_MAX = int(os.getenv("AUTH_BLACKLIST_CACHE_MAX", "20000") or "20000")
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
    if _USER_CACHE_TTL_SECONDS <= 0 or _USER_CACHE_MAX <= 0:
        return None
    now = time.time()
    with _USER_CACHE_LOCK:
        item = _USER_CACHE.get(int(user_id))
        if not item:
            return None
        exp, user = item
        if exp < now:
            try:
                _USER_CACHE.pop(int(user_id), None)
            except Exception:
                pass
            return None
        # LRU touch
        try:
            _USER_CACHE.move_to_end(int(user_id))
        except Exception:
            pass
        return user


def _user_cache_set(user_id: int, user):
    if _USER_CACHE_TTL_SECONDS <= 0 or _USER_CACHE_MAX <= 0:
        return
    now = time.time()
    with _USER_CACHE_LOCK:
        _USER_CACHE[int(user_id)] = (now + float(_USER_CACHE_TTL_SECONDS), user)
        try:
            _USER_CACHE.move_to_end(int(user_id))
        except Exception:
            pass
        # Evict oldest
        while len(_USER_CACHE) > _USER_CACHE_MAX:
            try:
                _USER_CACHE.popitem(last=False)
            except Exception:
                break


def _redis_user_cache_key(user_id: int) -> str:
    # v2: store a small dict (safe to pickle), not a full Django model instance
    return f"auth_user_v2:{int(user_id)}"


def _serialize_user_for_cache(user) -> dict:
    # Minimal subset used by permissions + UI; avoids DB hit per request.
    # Keep conservative; add fields if something breaks.
    try:
        return {
            "id": int(getattr(user, "id", 0) or 0),
            "is_active": bool(getattr(user, "is_active", False)),
            "is_staff": bool(getattr(user, "is_staff", False)),
            "is_superuser": bool(getattr(user, "is_superuser", False)),
            "is_public": bool(getattr(user, "is_public", True)),
            "is_verified": bool(getattr(user, "is_verified", False)),
            "user_type": getattr(user, "user_type", None),
            "email": getattr(user, "email", None),
            "username": getattr(user, "username", None),
            "first_name": getattr(user, "first_name", None),
            "last_name": getattr(user, "last_name", None),
            "company_name": getattr(user, "company_name", None),
            "slug": getattr(user, "slug", None),
        }
    except Exception:
        return {}


def _build_user_from_cache(UserModel, data: dict):
    try:
        uid = int(data.get("id") or 0)
        if uid <= 0:
            return None
        user = UserModel(
            id=uid,
            is_active=bool(data.get("is_active", True)),
            is_staff=bool(data.get("is_staff", False)),
            is_superuser=bool(data.get("is_superuser", False)),
            is_public=bool(data.get("is_public", True)),
            is_verified=bool(data.get("is_verified", False)),
            user_type=data.get("user_type") or getattr(UserModel, "user_type", None),
            email=data.get("email") or "",
            username=data.get("username") or "",
            first_name=data.get("first_name") or "",
            last_name=data.get("last_name") or "",
            company_name=data.get("company_name") or "",
            slug=data.get("slug"),
        )
        try:
            user._state.adding = False
            user._state.db = "default"
        except Exception:
            pass
        return user
    except Exception:
        return None


class SwaplyJWTAuthentication(JWTAuthentication):
    """
    Custom JWT authentication s Redis fallback pre token blacklisting
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.user_id_field = "id"

    def authenticate(self, request):
        """
        Čistý HttpOnly cookie auth model:
        - Ignoruj Authorization header (nepodporované)
        - Akceptuj iba access token z HttpOnly cookie `access_token`
        """
        # DRF posiela rest_framework.request.Request, middleware však agreguje timing z Django HttpRequest.
        base_req = getattr(request, "_request", request)
        # Keep reference for get_user() timing breakdown (per-request instance in DRF).
        try:
            self._timing_request = base_req
        except Exception:
            self._timing_request = None
        t0 = time.perf_counter()
        cookie_token = None
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
        # Server-Timing aggregation (safe, no tokens)
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
        Override get_user to handle blacklist checking with Redis fallback
        """
        try:
            user_id = validated_token.get("user_id")
            if user_id is None:
                raise InvalidToken(
                    "Token contained no recognizable user identification"
                )

            t_bl0 = time.perf_counter()
            # Blacklist check:
            # - prefer Redis (cache) for speed
            # - fallback to DB token_blacklist (safe) when Redis is unavailable
            if self._is_token_blacklisted(validated_token):
                raise InvalidToken("Token is blacklisted")
            t_bl1 = time.perf_counter()

            from django.contrib.auth import get_user_model
            from django.db import connections

            User = get_user_model()
            conn = connections["default"]
            conn_was_none = False
            try:
                conn_was_none = conn.connection is None
            except Exception:
                conn_was_none = False
            t_db0 = time.perf_counter()
            cached = _user_cache_get(int(user_id))
            if cached is not None:
                user = cached
            else:
                # Cross-thread/process cache (Redis via Django cache) – avoids DB connects on every request.
                user = None
                if _USER_REDIS_TTL_SECONDS > 0:
                    try:
                        cached_data = cache.get(_redis_user_cache_key(int(user_id)))
                        if isinstance(cached_data, dict):
                            user = _build_user_from_cache(User, cached_data)
                    except Exception:
                        user = None
                if user is None:
                    # Fetch minimal fields only (connection cost dominates, but keep row small).
                    user = (
                        User.objects.only(
                            "id",
                            "is_active",
                            "is_staff",
                            "is_superuser",
                            "is_public",
                            "is_verified",
                            "user_type",
                            "email",
                            "username",
                            "first_name",
                            "last_name",
                            "company_name",
                            "slug",
                        )
                        .get(**{self.user_id_field: user_id})
                    )
                    # Cache only active users; TTL is short to avoid stale auth after deactivation.
                    try:
                        if getattr(user, "is_active", False):
                            if _USER_REDIS_TTL_SECONDS > 0:
                                try:
                                    cache.set(
                                        _redis_user_cache_key(int(user_id)),
                                        _serialize_user_for_cache(user),
                                        timeout=_USER_REDIS_TTL_SECONDS,
                                    )
                                except Exception:
                                    pass
                    except Exception:
                        pass
                # Cache only active users; TTL is short to avoid stale auth after deactivation.
                try:
                    if getattr(user, "is_active", False):
                        _user_cache_set(int(user_id), user)
                except Exception:
                    pass
            t_db1 = time.perf_counter()

            if not user.is_active:
                raise InvalidToken("User is inactive")

            # Timing breakdown (safe): auth blacklist + user DB fetch (incl. connection open).
            try:
                base_req = getattr(self, "_timing_request", None)
                if base_req is not None:
                    st = getattr(base_req, "_server_timing", None)
                    if not isinstance(st, dict):
                        st = {}
                    st["auth_blacklist"] = (t_bl1 - t_bl0) * 1000.0
                    st["auth_user_db"] = (t_db1 - t_db0) * 1000.0
                    # Encode "was connection already open" as tiny timing bucket (0ms/0.1ms)
                    st["db_conn_new"] = 0.1 if conn_was_none else 0.0
                    base_req._server_timing = st
            except Exception:
                pass

            return user

        except Exception as e:
            logger.error(f"JWT authentication error: {e}")
            raise InvalidToken("Token is invalid")

    def _is_token_blacklisted(self, token):
        """
        Skontroluj blacklist v Redis cache; ak zlyhá, fallback na DB blacklist.
        """
        jti = token.get("jti")
        if not jti:
            logger.warning("Blacklist check failed (missing jti) – fail-closed")
            return True

        # In-process cache avoids Redis roundtrip on every request for same access token.
        cached = _bl_cache_get(str(jti))
        if cached is not None:
            return bool(cached)

        blacklist_key = f"blacklist_{jti}"
        t0 = time.perf_counter()
        try:
            # Fast-path (Redis)
            is_bl = cache.get(blacklist_key) is not None
            _bl_cache_set(str(jti), bool(is_bl))
            return is_bl
        except Exception as e:
            logger.warning(f"Redis blacklist check failed, falling back to DB: {e}")
            # Fallback (DB): rest_framework_simplejwt.token_blacklist
            try:
                from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken

                is_bl = BlacklistedToken.objects.filter(token__jti=jti).exists()
                _bl_cache_set(str(jti), bool(is_bl))
                return is_bl
            except Exception as e2:
                # Fail-closed: ak nevieme overiť blacklist ani v DB, token považuj za neplatný
                logger.warning(f"DB blacklist check failed: {e2}")
                return True
        finally:
            # Best-effort measure blacklist check time (can be used in views that call authenticate)
            try:
                ms = (time.perf_counter() - t0) * 1000.0
                # No direct request reference here; higher-level authenticate() will capture auth_user anyway.
                _ = ms
            except Exception:
                pass


class SwaplyRefreshToken(RefreshToken):
    """
    Custom RefreshToken s Redis fallback pre blacklisting
    """

    def blacklist(self):
        """
        Blacklist token s Redis fallback
        """
        # Najprv vždy zapíš do DB blacklistu (oficiálny simplejwt mechanizmus)
        try:
            super().blacklist()
        except Exception as e:
            logger.warning(f"Base blacklist failed or unavailable: {e}")
        # Navyše použij rýchly cache/Redis mechanizmus ak je k dispozícii
        try:
            if self._is_redis_available():
                self._blacklist_redis()
            else:
                self._blacklist_fallback()
        except Exception as e:
            logger.error(f"Token blacklisting failed: {e}")
            # Nevyhodíme chybu, len zalogujeme

    def _is_redis_available(self):
        """
        Skontroluj, či je Redis dostupný
        """
        try:
            cache.get("test_key")
            return True
        except Exception:
            return False

    def _blacklist_redis(self):
        """
        Blacklist token v Redis
        """
        try:
            jti = self.get("jti")
            if jti:
                # Nastav blacklist flag v Redis
                blacklist_key = f"blacklist_{jti}"
                cache.set(blacklist_key, True, timeout=86400)  # 24 hodín
        except Exception as e:
            logger.error(f"Redis blacklisting failed: {e}")

    def _blacklist_fallback(self):
        """
        Fallback blacklisting bez Redis
        """
        try:
            jti = self.get("jti")
            if jti:
                blacklist_key = f"blacklist_{jti}"
                # Použi default Django cache (LocMem v DEV/TEST) ako fallback
                cache.set(blacklist_key, True, timeout=86400)  # 24 hodín
        except Exception as e:
            logger.error(f"Fallback blacklisting failed: {e}")
