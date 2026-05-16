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

# Email verification is temporarily optional while the product is being tested.
# Before production, set EMAIL_VERIFICATION_REQUIRED=True.
EMAIL_VERIFICATION_REQUIRED = env_bool("EMAIL_VERIFICATION_REQUIRED", False)
ALLOW_UNVERIFIED_LOGIN = env_bool(
    "ALLOW_UNVERIFIED_LOGIN",
    not EMAIL_VERIFICATION_REQUIRED,
)
