"""
Helpery pre Google OAuth (vyčlenené z google_oauth_simple.py kvôli dĺžke).

OAuth trace logging, normalizácia frontend callbacku (anti-open-redirect) a
podpísaný state cookie (set/clear/validate). Views ostávajú v google_oauth_simple.py.
"""

import logging
import os
import secrets
import urllib.parse

from django.core import signing
from django.core.cache import cache

logger = logging.getLogger(__name__)

_OAUTH_STATE_COOKIE_NAME = "google_oauth_state"
_OAUTH_STATE_COOKIE_SALT = "accounts.google_oauth_state"
_OAUTH_STATE_TTL_SECONDS = 10 * 60


def _oauth_trace_enabled():
    return os.getenv("OAUTH_TRACE", "").strip().lower() in {"1", "true", "yes", "on"}


def _oauth_trace(event, **fields):
    if not _oauth_trace_enabled():
        return
    try:
        safe = {k: v for k, v in fields.items()}
        logger.warning(f"OAUTH_TRACE {event} {safe}")
    except Exception:
        logger.warning(f"OAUTH_TRACE {event}")


def _normalize_frontend_callback(candidate: str | None, default_callback: str) -> str:
    candidate = candidate or default_callback
    try:
        parsed_default = urllib.parse.urlparse(default_callback)
        parsed_candidate = urllib.parse.urlparse(candidate)
        if (
            parsed_candidate.scheme != parsed_default.scheme
            or parsed_candidate.netloc != parsed_default.netloc
        ):
            return default_callback
    except Exception:
        return default_callback
    return candidate


def _oauth_state_cookie_path(backend_callback: str | None) -> str:
    try:
        path = urllib.parse.urlparse(backend_callback or "").path or "/"
    except Exception:
        path = "/"
    return path if path.startswith("/") else "/"


def _oauth_state_cookie_kwargs(backend_callback: str | None) -> dict:
    from .auth import _auth_state_cookie_kwargs

    kwargs = _auth_state_cookie_kwargs()
    kwargs["path"] = _oauth_state_cookie_path(backend_callback)
    return kwargs


def _set_oauth_state_cookie(
    response,
    *,
    oauth_state: str,
    frontend_callback: str,
    backend_callback: str | None,
) -> None:
    signed_payload = signing.dumps(
        {"state": oauth_state, "frontend_callback": frontend_callback},
        salt=_OAUTH_STATE_COOKIE_SALT,
    )
    response.set_cookie(
        _OAUTH_STATE_COOKIE_NAME,
        signed_payload,
        max_age=_OAUTH_STATE_TTL_SECONDS,
        **_oauth_state_cookie_kwargs(backend_callback),
    )


def _clear_oauth_state_cookie(
    response,
    *,
    backend_callback: str | None = None,
    request_path: str | None = None,
) -> None:
    cookie_target = backend_callback or request_path or "/"
    response.set_cookie(
        _OAUTH_STATE_COOKIE_NAME,
        "",
        max_age=0,
        **_oauth_state_cookie_kwargs(cookie_target),
    )


def _frontend_callback_from_state_cache(
    oauth_state: str | None, default_callback: str
) -> str:
    if not oauth_state:
        return default_callback
    try:
        cached = cache.get(f"oauth_state:{oauth_state}")
    except Exception:
        return default_callback
    if not cached:
        return default_callback
    return _normalize_frontend_callback(str(cached), default_callback)


def _validated_frontend_callback_from_state_cookie(
    request, *, oauth_state: str, default_callback: str
) -> str:
    signed_cookie = request.COOKIES.get(_OAUTH_STATE_COOKIE_NAME)
    if not signed_cookie:
        _oauth_trace("google_callback_invalid_state_cookie_missing")
        raise ValueError("missing_cookie")

    try:
        payload = signing.loads(
            signed_cookie,
            salt=_OAUTH_STATE_COOKIE_SALT,
            max_age=_OAUTH_STATE_TTL_SECONDS,
        )
    except signing.SignatureExpired as exc:
        _oauth_trace("google_callback_invalid_state_cookie_expired")
        raise ValueError("expired_cookie") from exc
    except signing.BadSignature as exc:
        _oauth_trace("google_callback_invalid_state_cookie_bad_signature")
        raise ValueError("bad_cookie_signature") from exc

    frontend_callback = _normalize_frontend_callback(
        str(payload.get("frontend_callback") or ""), default_callback
    )
    cookie_state = str(payload.get("state") or "")
    if not cookie_state or not secrets.compare_digest(cookie_state, oauth_state):
        _oauth_trace("google_callback_invalid_state_cookie_mismatch")
        raise ValueError("state_mismatch")

    return frontend_callback
