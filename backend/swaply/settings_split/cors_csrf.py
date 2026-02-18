from .env import os, sys, env_bool
from .security import DEBUG

# CORS settings - nastavte v .env súbore pre produkciu (IP adresa pre mobile testovanie)
CORS_ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
    ).split(",")
    if o.strip()
]
# Railway / cross-site: pridaj frontend origin z env, aby CORS povolil credentials
_railway = (os.getenv("RAILWAY") or os.getenv("CROSS_SITE_COOKIES") or "").strip().lower() in ("true", "1", "yes")
_frontend_origin = (os.getenv("FRONTEND_ORIGIN") or "").strip()
if _railway and _frontend_origin and _frontend_origin not in CORS_ALLOWED_ORIGINS:
    CORS_ALLOWED_ORIGINS = list(CORS_ALLOWED_ORIGINS) + [_frontend_origin]

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = False

CORS_ALLOWED_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
    "cache-control",
    "pragma",
    "x-mobile-app",  # Pridané pre mobile detekciu
    "x-device-type",  # Pridané pre mobile detekciu
]

CORS_ALLOW_METHODS = [
    "DELETE",
    "GET",
    "OPTIONS",
    "PATCH",
    "POST",
    "PUT",
]

CORS_PREFLIGHT_MAX_AGE = 86400

CORS_EXPOSE_HEADERS = [
    "authorization",
    "content-type",
    "x-csrf-token",
]

# CSRF trusted origins
CSRF_TRUSTED_ORIGINS = os.getenv(
    "CSRF_TRUSTED_ORIGINS", ",".join(CORS_ALLOWED_ORIGINS)
).split(",")

# Cookies a bezpečnosť
SESSION_COOKIE_SECURE = env_bool("SESSION_COOKIE_SECURE", not DEBUG)
CSRF_COOKIE_SECURE = env_bool("CSRF_COOKIE_SECURE", not DEBUG)
SESSION_COOKIE_HTTPONLY = env_bool("SESSION_COOKIE_HTTPONLY", True)
CSRF_COOKIE_HTTPONLY = env_bool("CSRF_COOKIE_HTTPONLY", False)
# Pri cross-origin (frontend na inej doméne) musí byť SameSite=None, inak prehliadač nepošle cookie pri POST
# Railway/cross-site: vynucujeme SameSite=None a Secure aby CSRF cookie išla cross-site
if _railway:
    CSRF_COOKIE_SECURE = True
    CSRF_COOKIE_SAMESITE = "None"
else:
    CSRF_COOKIE_SAMESITE = "None" if (not DEBUG and CSRF_COOKIE_SECURE) else "Lax"

# Enforce CSRF pre API – v produkcii povoliť vždy; v testoch je možné vypnúť
if DEBUG:
    CSRF_ENFORCE_API = env_bool("CSRF_ENFORCE_API", False) and not (
        "test" in sys.argv or "pytest" in sys.modules
    )
else:
    # V produkcii vynucuj CSRF pre API ako default (nezávisle od testov)
    CSRF_ENFORCE_API = True

# Čistý cookie-based auth: CSRF sa NEPRESKAKUJE na základe Authorization headeru.
CSRF_SKIP_FOR_JWT = env_bool("CSRF_SKIP_FOR_JWT", False)
SECURE_SSL_REDIRECT = env_bool("SECURE_SSL_REDIRECT", not DEBUG)
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
SECURE_HSTS_SECONDS = 31536000 if not DEBUG else 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = not DEBUG
SECURE_HSTS_PRELOAD = not DEBUG
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
X_FRAME_OPTIONS = "DENY"
