from .env import os, urlparse, BASE_DIR, env_bool

# Database
# Prefer DATABASE_URL if provided; fallback to sqlite3
db_url = os.getenv("DATABASE_URL")
if db_url:
    parsed = urlparse(db_url)
    if parsed.scheme in ("postgres", "postgresql"):
        DATABASES = {
            "default": {
                "ENGINE": "django.db.backends.postgresql",
                "NAME": parsed.path[1:] or "",
                "USER": parsed.username or "",
                "PASSWORD": parsed.password or "",
                "HOST": parsed.hostname or "",
                "PORT": str(parsed.port or ""),
            }
        }
    elif parsed.scheme == "sqlite":
        DATABASES = {
            "default": {
                "ENGINE": "django.db.backends.sqlite3",
                "NAME": parsed.path if parsed.path else BASE_DIR / "db.sqlite3",
            }
        }
    else:
        # Unknown scheme -> fallback to sqlite
        DATABASES = {
            "default": {
                "ENGINE": "django.db.backends.sqlite3",
                "NAME": BASE_DIR / "db.sqlite3",
            }
        }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

# Prod-friendly defaults for Postgres connection reuse.
# Keeps DB connections open to reduce per-request latency.
try:
    if DATABASES.get("default", {}).get("ENGINE") == "django.db.backends.postgresql":
        # Increase default max age to keep connections warm on Railway/internal networking.
        DATABASES["default"]["CONN_MAX_AGE"] = int(os.getenv("DB_CONN_MAX_AGE", "300"))
        DATABASES["default"]["CONN_HEALTH_CHECKS"] = True
        DATABASES["default"]["DISABLE_SERVER_SIDE_CURSORS"] = env_bool(
            "DB_DISABLE_SERVER_SIDE_CURSORS", False
        )
        # Socket keepalives reduce unexpected connection drops; connect_timeout caps stalls.
        DATABASES["default"]["OPTIONS"] = {
            "connect_timeout": int(os.getenv("DB_CONNECT_TIMEOUT", "5")),
            "keepalives": 1,
            "keepalives_idle": int(os.getenv("DB_KEEPALIVES_IDLE", "30")),
            "keepalives_interval": int(os.getenv("DB_KEEPALIVES_INTERVAL", "10")),
            "keepalives_count": int(os.getenv("DB_KEEPALIVES_COUNT", "5")),
        }
except Exception:
    pass
