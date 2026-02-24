from .env import os, sys, env_bool
from .security import DEBUG

# Email settings
def _require_env(name: str) -> str:
    v = os.getenv(name)
    if v is None or not str(v).strip():
        raise ValueError(f"{name} must be set when DEBUG is False")
    return str(v).strip()


if DEBUG:
    # Dev/test: console backend je povolený (prípadne explicitný override cez env).
    EMAIL_BACKEND = os.getenv("EMAIL_BACKEND") or "django.core.mail.backends.console.EmailBackend"
else:
    # Production: nikdy console backend, vždy SMTP backend (bez fallbackov).
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"

# SMTP defaults if SMTP backend selected
if EMAIL_BACKEND.endswith("smtp.EmailBackend"):
    if DEBUG:
        EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
        EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
        EMAIL_USE_TLS = env_bool("EMAIL_USE_TLS", True)
        EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
        EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
        DEFAULT_FROM_EMAIL = os.getenv(
            "DEFAULT_FROM_EMAIL", EMAIL_HOST_USER or "no-reply@localhost"
        )
    else:
        EMAIL_HOST = _require_env("EMAIL_HOST")
        try:
            EMAIL_PORT = int(_require_env("EMAIL_PORT"))
        except Exception:
            raise ValueError("EMAIL_PORT must be an integer when DEBUG is False")
        EMAIL_HOST_USER = _require_env("EMAIL_HOST_USER")
        EMAIL_HOST_PASSWORD = _require_env("EMAIL_HOST_PASSWORD")
        EMAIL_USE_TLS = env_bool("EMAIL_USE_TLS", True)
        DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL") or EMAIL_HOST_USER

# Limit SMTP connection/response time (seconds)
EMAIL_TIMEOUT = int(os.getenv("EMAIL_TIMEOUT", "10"))
