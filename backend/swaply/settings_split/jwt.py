import logging

from .security import SECRET_KEY
from .env import os, timedelta

logger = logging.getLogger("swaply")

# JWT signing key oddelený od Django SECRET_KEY.
# Cieľ: leak/rotácia jedného kľúča neohrozí druhý (JWT vs CSRF/session/signing).
# Fallback na SECRET_KEY je zámerný – appka nespadne, ak env premenná ešte nie je
# nastavená – ale pri fallbacku zalogujeme WARNING, nech je zrejmé, že chýba.
JWT_SIGNING_KEY = os.getenv("JWT_SIGNING_KEY")
if not JWT_SIGNING_KEY:
    JWT_SIGNING_KEY = SECRET_KEY
    logger.warning(
        "JWT_SIGNING_KEY nie je nastavený – JWT sa podpisuje Django SECRET_KEY "
        "(fallback). Pre oddelenie JWT od SECRET_KEY nastav samostatný "
        "JWT_SIGNING_KEY v env premenných."
    )

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    # HS256: VERIFYING_KEY ostáva None → na overovanie sa použije SIGNING_KEY.
    "SIGNING_KEY": JWT_SIGNING_KEY,
    "VERIFYING_KEY": None,
    "AUDIENCE": None,
    "ISSUER": None,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_HEADER_NAME": "HTTP_AUTHORIZATION",
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
    "REFRESH_TOKEN_CLASS": "accounts.authentication.SwaplyRefreshToken",
}
