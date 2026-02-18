"""
Token refresh endpoint, ktorý podporuje refresh token aj v HttpOnly cookie.
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework import status
from rest_framework.response import Response
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
import hashlib
import logging

logger = logging.getLogger(__name__)

_GENERIC_INVALID_CREDENTIALS_DETAIL = "Invalid authentication credentials"


def _invalid_credentials_response():
    return Response(
        {"detail": _GENERIC_INVALID_CREDENTIALS_DETAIL},
        status=status.HTTP_401_UNAUTHORIZED,
    )


def _rl_key(*, ip: str, action: str) -> str:
    # Hash len na skrátenie key; neslúži na kryptografickú bezpečnosť.
    ident = f"ip:{ip}"
    digest = hashlib.md5(ident.encode(), usedforsecurity=False).hexdigest()
    return f"fin_rl:{action}:{digest}"


def _rate_limit_fail_closed(*, ip: str, action: str, max_attempts: int, window_seconds: int):
    """
    Fintech-level: ak limiter (cache) zlyhá, request sa zablokuje (fail-closed).
    Fixed window: max_attempts per window_seconds.
    """
    key = _rl_key(ip=ip, action=action)
    now = timezone.now()
    try:
        data = cache.get(key)
    except Exception as e:
        logger.error("Rate limiter cache.get failed (fail-closed)", exc_info=e)
        return False, None

    if not data or not isinstance(data, dict):
        data = {"attempts": 1, "first_attempt": now}
        try:
            cache.set(key, data, timeout=window_seconds)
        except Exception as e:
            logger.error("Rate limiter cache.set failed (init, fail-closed)", exc_info=e)
            return False, None
        return True, max_attempts - 1

    first = data.get("first_attempt") or now
    attempts = int(data.get("attempts") or 0)

    if (now - first).total_seconds() > window_seconds:
        data = {"attempts": 1, "first_attempt": now}
        try:
            cache.set(key, data, timeout=window_seconds)
        except Exception as e:
            logger.error("Rate limiter cache.set failed (reset, fail-closed)", exc_info=e)
            return False, None
        return True, max_attempts - 1

    if attempts >= max_attempts:
        remaining = 0
        return False, remaining

    data["attempts"] = attempts + 1
    try:
        cache.set(key, data, timeout=window_seconds)
    except Exception as e:
        logger.error("Rate limiter cache.set failed (increment, fail-closed)", exc_info=e)
        return False, None

    return True, max(0, max_attempts - data["attempts"])


def _get_client_ip(request) -> str:
    try:
        from swaply.rate_limiting import get_client_ip

        return (get_client_ip(request) or "").strip() or "unknown"
    except Exception:
        return (request.META.get("REMOTE_ADDR") or "").strip() or "unknown"


def _enforce_refresh_rate_limits(request):
    """
    Limity:
    - 10 pokusov / min / IP (všetky pokusy)
    - 5 zlyhaní / min / IP (počítané pri neplatnom/missing refresh tokene)
    """
    # Rešpektuj globálne toggles (v testoch je rate limit vypnutý)
    if not getattr(settings, "RATE_LIMITING_ENABLED", True) or getattr(
        settings, "RATE_LIMIT_DISABLED", False
    ):
        return None

    ip = _get_client_ip(request)
    ok, remaining = _rate_limit_fail_closed(
        ip=ip, action="token_refresh", max_attempts=10, window_seconds=60
    )
    if ok:
        return None

    try:
        from swaply.audit_logger import AuditLog

        AuditLog.log_security_event(
            event_type="token_refresh_rate_limited",
            details={"scope": "all", "remaining": remaining},
            ip_address=ip,
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
            user=getattr(request, "user", None),
        )
    except Exception:
        pass

    return Response(
        {"detail": "Too many refresh attempts"},
        status=status.HTTP_429_TOO_MANY_REQUESTS,
    )


def _count_failed_refresh_attempt(request, *, reason: str, token_fingerprint: str | None):
    if not getattr(settings, "RATE_LIMITING_ENABLED", True) or getattr(
        settings, "RATE_LIMIT_DISABLED", False
    ):
        return None

    ip = _get_client_ip(request)
    ok, remaining = _rate_limit_fail_closed(
        ip=ip, action="token_refresh_failed", max_attempts=5, window_seconds=60
    )

    try:
        from swaply.audit_logger import AuditLog

        AuditLog.log_security_event(
            event_type="token_refresh_failed",
            details={
                "reason": reason,
                "token_fp": token_fingerprint,
                "remaining_failed_budget": remaining,
            },
            ip_address=ip,
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
            user=getattr(request, "user", None),
        )
    except Exception:
        pass

    if ok:
        return None

    # Neodhaľuj klientovi, že ide o rate-limit (anti-enumeration).
    return _invalid_credentials_response()


@api_view(["POST"])
@permission_classes([AllowAny])
def token_refresh_cookie_view(request):
    """
    Vráti nový access token; pri ROTATE_REFRESH_TOKENS môže vydať aj nový refresh token.
    - Čistý cookie model: použi iba request.COOKIES["refresh_token"]
    """
    rl_resp = _enforce_refresh_rate_limits(request)
    if rl_resp is not None:
        return rl_resp

    refresh_str = None
    try:
        refresh_str = request.COOKIES.get("refresh_token")

        if not refresh_str:
            failed_rl = _count_failed_refresh_attempt(
                request, reason="missing_refresh_cookie", token_fingerprint=None
            )
            if failed_rl is not None:
                return failed_rl
            return _invalid_credentials_response()

        from rest_framework_simplejwt.serializers import TokenRefreshSerializer

        serializer = TokenRefreshSerializer(data={"refresh": refresh_str})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        access = data.get("access")
        new_refresh_str = data.get("refresh")
        resp = Response({"status": "ok"}, status=status.HTTP_200_OK)

        # Nastav cookies: access vždy, refresh len ak sme vydali nový
        try:
            from accounts.views.auth import _set_auth_cookies, _auth_cookie_kwargs

            if access:
                if new_refresh_str:
                    _set_auth_cookies(
                        resp, access=str(access), refresh=str(new_refresh_str)
                    )
                else:
                    # iba access
                    kwargs = _auth_cookie_kwargs()
                    resp.set_cookie(
                        "access_token", str(access), max_age=15 * 60, **kwargs
                    )
        except Exception as e:
            if getattr(settings, "DEBUG", False):
                logger.error(f"Failed to set refresh cookies: {e}")
            else:
                logger.error("Failed to set refresh cookies")

        return resp
    except Exception as e:
        token_fp = None
        try:
            # Nezaloguj samotný token, len fingerprint
            if refresh_str:
                token_fp = hashlib.sha256(str(refresh_str).encode()).hexdigest()[:12]
        except Exception:
            token_fp = None

        reason = "invalid_refresh_token"
        try:
            msg = (str(e) or "").lower()
            if "expired" in msg:
                reason = "expired_refresh_token"
        except Exception:
            pass

        failed_rl = _count_failed_refresh_attempt(
            request, reason=reason, token_fingerprint=token_fp
        )
        if failed_rl is not None:
            return failed_rl

        if getattr(settings, "DEBUG", False):
            logger.error(f"Token refresh failed: {e}")
        else:
            logger.error("Token refresh failed")
        return _invalid_credentials_response()
