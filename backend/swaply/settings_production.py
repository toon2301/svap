"""
Produkčné nastavenia pre Swaply
"""

import os
import sys
from pathlib import Path
from datetime import timedelta
from .settings import *
from urllib.parse import urlparse

LOG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logs")
os.makedirs(LOG_DIR, exist_ok=True)

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = False

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("SECRET_KEY must be set in production")

if CAPTCHA_ENABLED:
    invalid_captcha_values = {"", "test-secret-key", "test-site-key"}
    if CAPTCHA_SECRET_KEY in invalid_captcha_values:
        raise ValueError("CAPTCHA_SECRET_KEY must be set to a production value")
    if CAPTCHA_SITE_KEY in invalid_captcha_values:
        raise ValueError("CAPTCHA_SITE_KEY must be set to a production value")

if not os.getenv("MFA_ENCRYPTION_KEY"):
    raise ValueError("MFA_ENCRYPTION_KEY must be set in production")

def _env_bool_prod(name: str, default: bool) -> bool:
    v = os.getenv(name)
    if v is None:
        return default
    normalized = v.strip().lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off"}:
        return False
    raise ValueError(
        f"Unrecognized value for {name}: {v!r}. Expected: 1/true/yes/on or 0/false/no/off"
    )


SAFESEARCH_ENABLED = _env_bool_prod("SAFESEARCH_ENABLED", True)
SAFESEARCH_FAIL_OPEN = False
SAFESEARCH_BLOCK_ON_RACY_WITHOUT_ADULT = _env_bool_prod(
    "SAFESEARCH_BLOCK_ON_RACY_WITHOUT_ADULT", True
)
SAFESEARCH_MIN_ADULT = os.getenv("SAFESEARCH_MIN_ADULT", "POSSIBLE")
SAFESEARCH_MIN_RACY = os.getenv("SAFESEARCH_MIN_RACY", "LIKELY")
SAFESEARCH_MIN_VIOLENCE = os.getenv("SAFESEARCH_MIN_VIOLENCE", "LIKELY")

if SAFESEARCH_ENABLED and not (
    os.getenv("GCP_VISION_SERVICE_ACCOUNT_JSON")
    or os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
):
    raise ValueError("SafeSearch credentials must be set in production")

RATE_LIMIT_FAIL_OPEN = False

# Počet dôveryhodných proxy pred Djangom v produkcii (Railway edge + prípadne
# Next.js rewrite proxy). Default 1 = bezpečné minimum (Railway vždy terminuje
# pred backendom aspoň 1 proxy → nikdy nie spoofovateľné). Po runtime overení
# skutočného XFF reťazca možno hodnotu cez env TRUSTED_PROXY_HOPS zvýšiť, NIKDY
# nie nad reálny počet hopov (vyššia hodnota by sprístupnila klientom
# sfalšovateľné položky XFF).
try:
    TRUSTED_PROXY_HOPS = max(0, int(os.getenv("TRUSTED_PROXY_HOPS", "1")))
except (TypeError, ValueError):
    TRUSTED_PROXY_HOPS = 1

# ALLOWED_HOSTS - nastavte v .env súbore pre produkciu (presne tieto hodnoty, žiadne wildcardy)
_PROD_ALLOWED_HOSTS = {
    "svaply.com",
    "www.svaply.com",
    "api.svaply.com",
    "stunning-inspiration-svap.up.railway.app",
    "exemplary-tranquility-svap.up.railway.app",  # backend Railway
}


def _collect_env_allowed_hosts() -> list[str]:
    extra_hosts: list[str] = []
    host_env_names = (
        "RAILWAY_PUBLIC_DOMAIN",
        "SITE_DOMAIN",
    )
    origin_env_names = (
        "BACKEND_ORIGIN",
        "BACKEND_WS_ORIGIN",
        "FRONTEND_ORIGIN",
        "FRONTEND_URL",
        "FRONTEND_CALLBACK_URL",
        "BACKEND_CALLBACK_URL",
    )

    for env_name in host_env_names:
        value = (os.getenv(env_name) or "").strip()
        if value:
            extra_hosts.append(value)

    for env_name in origin_env_names:
        value = (os.getenv(env_name) or "").strip()
        if not value:
            continue
        try:
            parsed = urlparse(value)
        except Exception:
            continue
        if parsed.hostname:
            extra_hosts.append(parsed.hostname)

    deduped: list[str] = []
    for host in extra_hosts:
        cleaned = host.strip().strip("/")
        if not cleaned or cleaned in deduped:
            continue
        deduped.append(cleaned)
    return deduped

raw_allowed_hosts = os.getenv("ALLOWED_HOSTS")
if not raw_allowed_hosts:
    raise ValueError("ALLOWED_HOSTS must be set in production")

configured_allowed_hosts = [h.strip() for h in raw_allowed_hosts.split(",") if h and h.strip()]
for h in configured_allowed_hosts:
    if "*" in h or h.startswith("."):
        raise ValueError(f"Wildcard hosts are not allowed in ALLOWED_HOSTS: {h!r}")

missing_required_hosts = sorted(_PROD_ALLOWED_HOSTS.difference(configured_allowed_hosts))
if missing_required_hosts:
    raise ValueError(
        "Invalid ALLOWED_HOSTS for production. Missing required hosts: "
        + ", ".join(missing_required_hosts)
    )

ALLOWED_HOSTS = list(configured_allowed_hosts)
for host in _collect_env_allowed_hosts():
    if host not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(host)

# Database – v produkcii musí byť explicitne nastavený podporovaný DATABASE_URL.
db_url = os.getenv("DATABASE_URL")
if not db_url:
    raise ValueError("DATABASE_URL must be set in production")

parsed = urlparse(db_url)
if parsed.scheme not in ("postgres", "postgresql"):
    raise ValueError("DATABASE_URL must use postgres/postgresql in production")

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": (parsed.path[1:] or ""),
        "USER": parsed.username or "",
        "PASSWORD": parsed.password or "",
        "HOST": parsed.hostname or "",
        "PORT": str(parsed.port or ""),
    }
}

if not DATABASES["default"]["NAME"]:
    raise ValueError("DATABASE_URL database name is required in production")
if not DATABASES["default"]["HOST"]:
    raise ValueError("DATABASE_URL host is required in production")

# DB connection reuse (prod):
# Keep connections open to avoid paying TLS/DNS/handshake per request on Railway.
# Safe for production; tune via env if needed.
try:
    if DATABASES.get("default", {}).get("ENGINE") == "django.db.backends.postgresql":
        DATABASES["default"]["CONN_MAX_AGE"] = int(os.getenv("DB_CONN_MAX_AGE", "300"))
        DATABASES["default"]["CONN_HEALTH_CHECKS"] = True
        DATABASES["default"]["OPTIONS"] = {
            "connect_timeout": int(os.getenv("DB_CONNECT_TIMEOUT", "5")),
            "keepalives": 1,
            "keepalives_idle": int(os.getenv("DB_KEEPALIVES_IDLE", "30")),
            "keepalives_interval": int(os.getenv("DB_KEEPALIVES_INTERVAL", "10")),
            "keepalives_count": int(os.getenv("DB_KEEPALIVES_COUNT", "5")),
        }
        # statement_timeout (ms): žiadny dotaz nesmie bežať neobmedzene (napr. zaseknutý
        # legacy search fallback). Po prekročení PG vráti OperationalError → existujúci
        # process_exception middleware → generický 500 (žiadny únik detailov).
        # Migrácie a testy vynímame – CREATE INDEX CONCURRENTLY a pod. môžu trvať dlhšie
        # než limit a nesmú byť predčasne zabité. Vypnutie: DB_STATEMENT_TIMEOUT_MS=0.
        _stmt_timeout_ms = int(os.getenv("DB_STATEMENT_TIMEOUT_MS", "5000") or "5000")
        _subcommand = sys.argv[1] if len(sys.argv) > 1 else ""
        _skip_stmt_timeout = _subcommand in {
            "migrate",
            "makemigrations",
            "sqlmigrate",
            "showmigrations",
            "test",
        }
        if _stmt_timeout_ms > 0 and not _skip_stmt_timeout:
            DATABASES["default"]["OPTIONS"]["options"] = (
                f"-c statement_timeout={_stmt_timeout_ms}"
            )
except Exception:
    pass
# Static files storage - bez manifest pre Railway
STATICFILES_STORAGE = "django.contrib.staticfiles.storage.StaticFilesStorage"

# Whitenoise pre servovanie static files na Railway
MIDDLEWARE.insert(1, "whitenoise.middleware.WhiteNoiseMiddleware")

# Static files (CSS, JavaScript, Images)
STATIC_URL = "/static/"
STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")

# Vytvoriť staticfiles adresár ak neexistuje (pre Railway)
staticfiles_dir = STATIC_ROOT
if not os.path.exists(staticfiles_dir):
    try:
        os.makedirs(staticfiles_dir, exist_ok=True)
    except Exception:
        pass  # Ignorovať chyby pri vytváraní adresára

# Media files – S3 storage in production
DEFAULT_FILE_STORAGE = "storages.backends.s3boto3.S3Boto3Storage"

AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_STORAGE_BUCKET_NAME = os.getenv("AWS_STORAGE_BUCKET_NAME")
AWS_S3_REGION_NAME = os.getenv("AWS_S3_REGION_NAME")
AWS_S3_CUSTOM_DOMAIN = os.getenv("AWS_S3_CUSTOM_DOMAIN", "")

# Public-read setup (unsigned URLs)
AWS_DEFAULT_ACL = None
AWS_S3_FILE_OVERWRITE = False
AWS_QUERYSTRING_AUTH = False

if AWS_S3_CUSTOM_DOMAIN:
    MEDIA_URL = f"https://{AWS_S3_CUSTOM_DOMAIN}/"
else:
    # Fallback to default S3 public endpoint
    if AWS_STORAGE_BUCKET_NAME and AWS_S3_REGION_NAME:
        MEDIA_URL = (
            f"https://{AWS_STORAGE_BUCKET_NAME}.s3.{AWS_S3_REGION_NAME}.amazonaws.com/"
        )
    else:
        # Safe default if envs are missing (won't serve correctly, but avoids crash)
        MEDIA_URL = "/media/"
        MEDIA_ROOT = os.path.join(BASE_DIR, "media")

# Security settings
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# HTTPS settings (Railway má SSL pred reverse proxy)
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# CORS settings - nastavte v .env súbore pre produkciu
CORS_ALLOWED_ORIGINS = os.getenv("CORS_ALLOWED_ORIGINS", "").split(",")
if not CORS_ALLOWED_ORIGINS or CORS_ALLOWED_ORIGINS == [""]:
    CORS_ALLOWED_ORIGINS = ["https://antonchudjak.pythonanywhere.com"]

# Email settings (production) - Resend HTTP API via django-anymail
def _require_env(name: str) -> str:
    v = os.getenv(name)
    if v is None or not str(v).strip():
        raise ValueError(f"{name} must be set in production")
    return str(v).strip()


EMAIL_BACKEND = "anymail.backends.resend.EmailBackend"
ANYMAIL = {"RESEND_API_KEY": _require_env("RESEND_API_KEY")}
DEFAULT_FROM_EMAIL = _require_env("DEFAULT_FROM_EMAIL")

# Google OAuth credentials
GOOGLE_OAUTH2_CLIENT_ID = os.getenv("GOOGLE_OAUTH2_CLIENT_ID")
GOOGLE_OAUTH2_SECRET = os.getenv("GOOGLE_OAUTH2_SECRET")

# OAuth Callback URLs
FRONTEND_CALLBACK_URL = os.getenv("FRONTEND_CALLBACK_URL")
BACKEND_CALLBACK_URL = os.getenv("BACKEND_CALLBACK_URL")

if not FRONTEND_CALLBACK_URL or not BACKEND_CALLBACK_URL:
    FRONTEND_CALLBACK_URL = "https://antonchudjak.pythonanywhere.com/auth/callback"
    BACKEND_CALLBACK_URL = (
        "https://antonchudjak.pythonanywhere.com/api/auth/oauth/google/callback/"
    )

# Frontend URL
FRONTEND_URL = os.getenv("FRONTEND_URL")
if not FRONTEND_URL:
    FRONTEND_URL = "https://antonchudjak.pythonanywhere.com"

# Frontend Root nie je potrebný pri oddelenom hostingu frontendu (Next.js na Railway)
FRONTEND_ROOT = os.getenv("FRONTEND_ROOT", "")

# Site Domain
SITE_DOMAIN = os.getenv("SITE_DOMAIN")
if not SITE_DOMAIN:
    SITE_DOMAIN = "antonchudjak.pythonanywhere.com"

# Logging configuration for production (Railway): log to stdout
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "simple": {
            "format": "{levelname} {message}",
            "style": "{",
        },
        "json": {
            "format": '{"level": "%(levelname)s", "time": "%(asctime)s", "module": "%(module)s", "message": "%(message)s"}',
        },
    },
    "handlers": {
        "console": {
            "level": "INFO",
            "class": "logging.StreamHandler",
            "formatter": "simple",
        },
        "console_json": {
            "level": "INFO",
            "class": "logging.StreamHandler",
            "formatter": "json",
        },
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": True,
        },
        "swaply": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": True,
        },
        "accounts": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": True,
        },
        "audit": {
            "handlers": ["console_json"],
            "level": "INFO",
            "propagate": False,
        },
        "security": {
            "handlers": ["console_json"],
            "level": "WARNING",
            "propagate": False,
        },
    },
}
