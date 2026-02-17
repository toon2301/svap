from .env import os, sys, env_bool
from .security import DEBUG

# Email settings
# Allow explicit override via env even in DEBUG
EMAIL_BACKEND = os.getenv("EMAIL_BACKEND")
if not EMAIL_BACKEND:
    # Pre testovanie použijeme console backend
    if DEBUG or "test" in sys.argv:
        EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
    else:
        EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"

# SMTP defaults if SMTP backend selected
if EMAIL_BACKEND.endswith("smtp.EmailBackend"):
    EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
    EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
    EMAIL_USE_TLS = env_bool("EMAIL_USE_TLS", True)
    EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
    EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
    DEFAULT_FROM_EMAIL = os.getenv(
        "DEFAULT_FROM_EMAIL", EMAIL_HOST_USER or "no-reply@localhost"
    )
