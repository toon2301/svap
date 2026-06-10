from .env import os
from .security import DEBUG

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
