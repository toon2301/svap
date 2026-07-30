import logging as _logging

from .env import os
from .security import DEBUG

_logger = _logging.getLogger(__name__)

# Email settings (Resend HTTP API via django-anymail in production)


def _require_env(name: str) -> str:
    v = os.getenv(name)
    if v is None or not str(v).strip():
        raise ValueError(f"{name} must be set")
    return str(v).strip()


if DEBUG:
    _resend_key = os.getenv("RESEND_API_KEY", "").strip()
    _default_backend = (
        "anymail.backends.resend.EmailBackend"
        if _resend_key
        else "django.core.mail.backends.console.EmailBackend"
    )
    EMAIL_BACKEND = os.getenv("EMAIL_BACKEND") or _default_backend
else:
    EMAIL_BACKEND = os.getenv("EMAIL_BACKEND") or "anymail.backends.resend.EmailBackend"

if EMAIL_BACKEND.endswith("resend.EmailBackend"):
    ANYMAIL = {"RESEND_API_KEY": _require_env("RESEND_API_KEY")}
    DEFAULT_FROM_EMAIL = _require_env("DEFAULT_FROM_EMAIL")
elif EMAIL_BACKEND.endswith("console.EmailBackend"):
    DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "no-reply@localhost")
else:
    DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "webmaster@localhost")

# Kontaktný formulár – cieľová adresa podpory
SUPPORT_EMAIL = os.getenv("SUPPORT_EMAIL", "info@svaply.com")

# Hlásenia chýb – samostatne konfigurovateľné, s fallbackom na podporu.
BUG_REPORT_EMAIL = os.getenv("BUG_REPORT_EMAIL", SUPPORT_EMAIL)
try:
    BUG_REPORT_NOTIFICATION_STALE_CLAIM_SECONDS = int(
        os.getenv("BUG_REPORT_NOTIFICATION_STALE_CLAIM_SECONDS", "300")
    )
except ValueError as exc:
    raise ValueError(
        "BUG_REPORT_NOTIFICATION_STALE_CLAIM_SECONDS must be an integer"
    ) from exc
if BUG_REPORT_NOTIFICATION_STALE_CLAIM_SECONDS < 60:
    raise ValueError(
        "BUG_REPORT_NOTIFICATION_STALE_CLAIM_SECONDS must be at least 60"
    )

_configured_bug_report_origin = (
    os.getenv("BUG_REPORT_ADMIN_ORIGIN") or os.getenv("BACKEND_ORIGIN") or ""
).strip()
_site_domain = os.getenv("SITE_DOMAIN", "").strip()
if _configured_bug_report_origin:
    BUG_REPORT_ADMIN_ORIGIN = _configured_bug_report_origin.rstrip("/")
elif _site_domain:
    BUG_REPORT_ADMIN_ORIGIN = (
        _site_domain if "://" in _site_domain else f"https://{_site_domain}"
    ).rstrip("/")
elif DEBUG:
    BUG_REPORT_ADMIN_ORIGIN = "http://localhost:8000"
else:
    BUG_REPORT_ADMIN_ORIGIN = "https://api.svaply.com"
    _logger.warning(
        "No bug report admin origin is configured; using "
        "https://api.svaply.com as the production fallback."
    )
