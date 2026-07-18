"""
Helpery pre auth views (vyčlenené z auth.py kvôli dĺžke).

Cookie kwargs/set/clear, /me queryset, cross-site detekcia, cookie diagnostika,
lockout (login-failure) logika a timing. Views ostávajú v auth.py /
auth_registration_views.py a importujú odtiaľto.
"""

import hashlib
import logging
import os
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db.models import Count, IntegerField, OuterRef, Subquery, Value
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework.response import Response

from ..models import Notification, NotificationType, ProfileLike, SkillRequest, SkillRequestStatus

User = get_user_model()
logger = logging.getLogger(__name__)

# Account lockout configuration
LOGIN_FAILURE_MAX_ATTEMPTS = 5
LOGIN_FAILURE_WINDOW_MINUTES = 15
ACCOUNT_LOCKOUT_MINUTES = 15


def _access_token_lifetime_seconds() -> int:
    lifetime = settings.SIMPLE_JWT.get("ACCESS_TOKEN_LIFETIME")
    if isinstance(lifetime, timedelta):
        return max(0, int(lifetime.total_seconds()))
    return 15 * 60


def _set_auth_session_headers(response: Response) -> None:
    access_lifetime_seconds = _access_token_lifetime_seconds()
    access_expires_at = timezone.now() + timedelta(seconds=access_lifetime_seconds)
    response["X-Svaply-Access-Expires-At"] = access_expires_at.isoformat()
    response["X-Svaply-Access-Expires-In"] = str(access_lifetime_seconds)


def _me_user_queryset():
    """
    Load the full current user row and completed cooperation counters in one query.
    """
    completed_sent_count = Subquery(
        SkillRequest.objects.filter(
            requester=OuterRef("pk"),
            status=SkillRequestStatus.COMPLETED,
        )
        .values("requester")
        .annotate(total=Count("pk"))
        .values("total")[:1],
        output_field=IntegerField(),
    )
    completed_received_count = Subquery(
        SkillRequest.objects.filter(
            recipient=OuterRef("pk"),
            status=SkillRequestStatus.COMPLETED,
        )
        .values("recipient")
        .annotate(total=Count("pk"))
        .values("total")[:1],
        output_field=IntegerField(),
    )
    profile_likes_count = Subquery(
        ProfileLike.objects.filter(profile_user_id=OuterRef("pk"))
        .values("profile_user_id")
        .annotate(total=Count("pk"))
        .values("total")[:1],
        output_field=IntegerField(),
    )
    unread_skill_request_count = Subquery(
        Notification.objects.filter(
            user_id=OuterRef("pk"),
            type=NotificationType.SKILL_REQUEST,
            is_read=False,
        )
        .values("user_id")
        .annotate(total=Count("pk"))
        .values("total")[:1],
        output_field=IntegerField(),
    )

    return User.objects.annotate(
        _completed_sent_count=Coalesce(
            completed_sent_count,
            Value(0),
            output_field=IntegerField(),
        ),
        _completed_received_count=Coalesce(
            completed_received_count,
            Value(0),
            output_field=IntegerField(),
        ),
        _profile_likes_count=Coalesce(
            profile_likes_count,
            Value(0),
            output_field=IntegerField(),
        ),
        _unread_skill_request_count=Coalesce(
            unread_skill_request_count,
            Value(0),
            output_field=IntegerField(),
        ),
    )


def _record_auth_view_timing(request, **entries) -> None:
    """Best-effort Server-Timing enrichment for auth views."""
    try:
        base_req = getattr(request, "_request", request)
        st = getattr(base_req, "_server_timing", None)
        if not isinstance(st, dict):
            st = {}
        st.update(entries)
        base_req._server_timing = st
    except Exception:
        pass


def _auth_cookie_debug_enabled() -> bool:
    """
    Bezpečná diagnostika pre problémy so starými/duplicitnými cookies.
    Zapína sa iba explicitne:
    - DEBUG=True, alebo
    - env AUTH_COOKIE_DEBUG=true/1/yes
    """
    if getattr(settings, "DEBUG", False):
        return True
    v = (os.getenv("AUTH_COOKIE_DEBUG") or "").strip().lower()
    return v in ("true", "1", "yes")


def _fingerprint_secret(value: str) -> str:
    """Nezvratný fingerprint (bez úniku tokenu)."""
    try:
        h = hashlib.sha256(value.encode("utf-8")).hexdigest()
        return h[:10]
    except Exception:
        return "ERR"


def _log_cookie_header_diagnostics(request, *, where: str) -> None:
    """
    Loguje iba metadáta z raw Cookie headera (počty a fingerprinty),
    aby sme vedeli odhaliť duplicitné cookies s rovnakým menom.
    NIKDY neloguje priamo tokeny.
    """
    if not _auth_cookie_debug_enabled():
        return
    raw = request.META.get("HTTP_COOKIE") or ""
    if not raw:
        logger.info("AUTH_COOKIE_DEBUG %s: no Cookie header", where)
        return

    # Very small, safe parse: split on ';' and count duplicates by name.
    parts = [p.strip() for p in raw.split(";") if p.strip()]
    by_name: dict[str, list[str]] = {}
    for p in parts:
        if "=" not in p:
            continue
        name, val = p.split("=", 1)
        name = name.strip()
        if not name:
            continue
        by_name.setdefault(name, []).append(val)

    interesting = ("access_token", "refresh_token", "auth_state", "csrftoken")
    summary = {}
    for name in interesting:
        vals = by_name.get(name) or []
        if not vals:
            continue
        summary[name] = {
            "count": len(vals),
            "lengths": [len(v) for v in vals[:3]],
            "fp": [_fingerprint_secret(v) for v in vals[:3]],
        }

    logger.info(
        "AUTH_COOKIE_DEBUG %s: cookie_counts=%s",
        where,
        summary if summary else {"note": "no interesting cookies present"},
    )


def _is_cross_site_cookie_env() -> bool:
    """True ak bežíme v Railway / test cross-origin (FE a BE na rôznych doménach)."""
    v = (os.getenv("RAILWAY") or os.getenv("CROSS_SITE_COOKIES") or "").strip().lower()
    if v in ("true", "1", "yes"):
        return True
    # Ak je nastavený HTTPS frontend origin, ide o oddelený FE/BE – cookie musia byť cross-site
    frontend = (os.getenv("FRONTEND_ORIGIN") or "").strip()
    return frontend.startswith("https://")


def _auth_cookie_kwargs() -> dict:
    """
    Bezpečné defaulty pre JWT cookies.
    - Cross-site (Railway/test): SameSite=None, Secure=True – cookie sa posiela cross-origin.
    - Produkcia (svaply.com): access SameSite=None, refresh Strict; Secure=True.
    - Lokál (DEBUG): Lax, Secure=False.
    """
    is_prod = not getattr(settings, "DEBUG", False)
    cross_site = _is_cross_site_cookie_env()
    if cross_site:
        return {
            "httponly": True,
            "secure": True,
            "samesite": "None",
            "path": "/",
        }
    return {
        "httponly": True,
        "secure": True if is_prod else False,
        "samesite": "None" if is_prod else "Lax",
        "path": "/",
    }


def _auth_state_cookie_kwargs() -> dict:
    """Rovnaké bezpečnostné nastavenia ako access_token (HttpOnly, Secure, SameSite, Path)."""
    return _auth_cookie_kwargs()


# NOTE:
# Django's response cookie container is keyed by cookie name, so multiple set_cookie() calls
# for the same cookie name (even with different Path) overwrite each other in the response.
# To ensure reliable logout even if legacy cookies exist under different paths, logout_view
# additionally sends Clear-Site-Data: "cookies" (see below).
_AUTH_COOKIE_PATHS_TO_CLEAR = ("/",)


def _with_path(kwargs: dict, path: str) -> dict:
    k = dict(kwargs)
    k["path"] = path
    return k


def _set_auth_cookies(response, *, access: str, refresh: str) -> None:
    kwargs = _auth_cookie_kwargs()
    state_kwargs = _auth_state_cookie_kwargs()
    # Defensive: clear any legacy-path cookies first to prevent stale token precedence.
    _clear_auth_cookies(response)
    # Access token – životnosť odvodená z JWT konfigurácie (jeden zdroj pravdy),
    # aby cookie neexpirovala skôr/neskôr ako samotný token.
    response.set_cookie(
        "access_token", access, max_age=_access_token_lifetime_seconds(), **kwargs
    )
    # Refresh token – dlhšia životnosť
    # Cross-site (Railway): SameSite=None. Produkcia (svaply.com): Strict.
    refresh_kwargs = dict(kwargs)
    if not _is_cross_site_cookie_env() and not getattr(settings, "DEBUG", False):
        refresh_kwargs["samesite"] = "Strict"
    response.set_cookie(
        "refresh_token", refresh, max_age=7 * 24 * 60 * 60, **refresh_kwargs
    )
    # Stavový cookie pre UI (bez tokenov)
    response.set_cookie("auth_state", "1", max_age=7 * 24 * 60 * 60, **state_kwargs)


def _clear_auth_cookies(response) -> None:
    kwargs = _auth_cookie_kwargs()
    state_kwargs = _auth_state_cookie_kwargs()
    # delete_cookie nevie vždy nastaviť rovnaké samesite/secure v každej verzii, preto nastavíme expiráciu.
    refresh_kwargs = dict(kwargs)
    if not _is_cross_site_cookie_env() and not getattr(settings, "DEBUG", False):
        refresh_kwargs["samesite"] = "Strict"

    for path in _AUTH_COOKIE_PATHS_TO_CLEAR:
        response.set_cookie("access_token", "", max_age=0, **_with_path(kwargs, path))
        response.set_cookie(
            "refresh_token", "", max_age=0, **_with_path(refresh_kwargs, path)
        )
        response.set_cookie(
            "auth_state", "", max_age=0, **_with_path(state_kwargs, path)
        )


def _lock_keys_for_email(email: str):
    # Email nikdy nedávame do cache kľúča priamo (PII v Redis). Použijeme stabilný
    # SHA-256 hash – rovnaké mapovanie email->kľúč, ale bez expozície PII.
    safe_email = (email or "").lower().strip()
    email_hash = hashlib.sha256(safe_email.encode("utf-8")).hexdigest()
    return (
        f"login_failures:{email_hash}",
        f"login_locked:{email_hash}",
    )


def is_account_locked(email: str) -> bool:
    if not email:
        return False
    # Lockout sa aplikuje len na existujúce účty
    try:
        if not User.objects.filter(email=email).exists():
            return False
    except Exception:
        return False
    _, lock_key = _lock_keys_for_email(email)
    try:
        return bool(cache.get(lock_key))
    except Exception as e:
        # Fail-open: ak cache nie je dostupná, radšej nelockuj a nepadni na 500.
        if getattr(settings, "DEBUG", False):
            logger.warning(f"Lockout cache.get failed for {lock_key}: {e}")
        else:
            logger.warning("Lockout cache.get failed")
        return False


def register_login_failure(email: str) -> bool:
    if not email:
        return False
    # Lockout sa aplikuje len na existujúce účty
    try:
        if not User.objects.filter(email=email).exists():
            return False
    except Exception:
        return False
    fail_key, lock_key = _lock_keys_for_email(email)
    window_seconds = LOGIN_FAILURE_WINDOW_MINUTES * 60
    try:
        # Atomicita: cache.add inicializuje počítadlo len ak kľúč neexistuje
        # (nereštartuje bežiace okno), cache.incr je atomický na strane backendu.
        # Tým sa vyhneme stratenému inkrementu pri súbežných pokusoch (get+set race).
        cache.add(fail_key, 0, timeout=window_seconds)
        attempts = cache.incr(fail_key)
    except ValueError:
        # Kľúč expiroval medzi add a incr – reinicializuj (window začína odznova).
        try:
            cache.add(fail_key, 0, timeout=window_seconds)
            attempts = cache.incr(fail_key)
        except Exception:
            attempts = 1
    except Exception as e:
        if getattr(settings, "DEBUG", False):
            logger.warning(f"Lockout cache incr failed for {fail_key}: {e}")
        else:
            logger.warning("Lockout cache incr failed")
        return False
    if attempts >= LOGIN_FAILURE_MAX_ATTEMPTS:
        try:
            cache.set(lock_key, True, timeout=ACCOUNT_LOCKOUT_MINUTES * 60)
        except Exception as e:
            if getattr(settings, "DEBUG", False):
                logger.warning(f"Lockout cache.set failed for {lock_key}: {e}")
            else:
                logger.warning("Lockout cache.set failed")
            return False
        return True
    return False


def reset_login_failures(email: str) -> None:
    if not email:
        return
    fail_key, lock_key = _lock_keys_for_email(email)
    try:
        cache.delete(fail_key)
    except Exception as e:
        if getattr(settings, "DEBUG", False):
            logger.warning(f"Lockout cache.delete failed for {fail_key}: {e}")
        else:
            logger.warning("Lockout cache.delete failed")
    try:
        cache.delete(lock_key)
    except Exception as e:
        if getattr(settings, "DEBUG", False):
            logger.warning(f"Lockout cache.delete failed for {lock_key}: {e}")
        else:
            logger.warning("Lockout cache.delete failed")


