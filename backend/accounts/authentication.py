"""
Custom JWT authentication pre Swaply s Redis fallback
"""

import logging
import time
from django.core.cache import cache
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings

logger = logging.getLogger(__name__)


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
            st = getattr(request, "_server_timing", None)
            if not isinstance(st, dict):
                st = {}
            st["auth"] = (t3 - t0) * 1000.0
            st["auth_validate"] = (t2 - t1) * 1000.0
            st["auth_user"] = (t3 - t2) * 1000.0
            request._server_timing = st
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

            # Blacklist check:
            # - prefer Redis (cache) for speed
            # - fallback to DB token_blacklist (safe) when Redis is unavailable
            if self._is_token_blacklisted(validated_token):
                raise InvalidToken("Token is blacklisted")

            from django.contrib.auth import get_user_model

            User = get_user_model()
            user = User.objects.get(**{self.user_id_field: user_id})

            if not user.is_active:
                raise InvalidToken("User is inactive")

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

        blacklist_key = f"blacklist_{jti}"
        t0 = time.perf_counter()
        try:
            # Fast-path (Redis)
            return cache.get(blacklist_key) is not None
        except Exception as e:
            logger.warning(f"Redis blacklist check failed, falling back to DB: {e}")
            # Fallback (DB): rest_framework_simplejwt.token_blacklist
            try:
                from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken

                return BlacklistedToken.objects.filter(token__jti=jti).exists()
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
