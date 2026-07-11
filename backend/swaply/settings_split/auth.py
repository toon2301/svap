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

# Overenie emailu pri registrácii je POVINNÉ by default (bezpečný default pre
# produkciu – predtým default False spôsoboval, že registrácia označila účet
# ako overený, verifikačný email sa neposlal a login neblokoval neoverených).
# Lokálny vývoj bez SMTP: console email backend vypíše verifikačný link do
# konzoly; prípadne nastav ALLOW_UNVERIFIED_LOGIN=True v .env.
EMAIL_VERIFICATION_REQUIRED = env_bool("EMAIL_VERIFICATION_REQUIRED", True)
ALLOW_UNVERIFIED_LOGIN = env_bool(
    "ALLOW_UNVERIFIED_LOGIN",
    not EMAIL_VERIFICATION_REQUIRED,
)

# Platnosť odkazu na reset hesla (Django default je 3 dni). Zosúladené s textom
# v reset emaile, ktorý používateľovi komunikuje 24 hodín.
PASSWORD_RESET_TIMEOUT = int(os.getenv("PASSWORD_RESET_TIMEOUT", str(24 * 60 * 60)))
