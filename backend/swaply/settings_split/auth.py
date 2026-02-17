from .env import os, env_bool
from .security import DEBUG

# Authentication backends
AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",
    # 'allauth.account.auth_backends.AuthenticationBackend',  # DOČASNE VYPNUTÉ
]

# Custom user model
AUTH_USER_MODEL = "accounts.User"

# Sites framework
SITE_ID = int(os.getenv("SITE_ID", "1"))

# Account lockout feature flag (v testoch vypnuté)
ACCOUNT_LOCKOUT_ENABLED = env_bool("ACCOUNT_LOCKOUT_ENABLED", True)

# Povoliť prihlásenie aj bez overeného emailu (do produkčného spustenia)
# Predvolene povolené v DEBUG/test, v produkcii môže byť vypnuté cez env
ALLOW_UNVERIFIED_LOGIN = env_bool("ALLOW_UNVERIFIED_LOGIN", True if DEBUG else True)
