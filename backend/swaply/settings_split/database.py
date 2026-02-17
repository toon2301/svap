from .env import os, urlparse, BASE_DIR

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
