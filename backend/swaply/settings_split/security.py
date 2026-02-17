from .env import env_bool, urlparse, os

# SECURITY
# DEBUG from env (default True for local/dev). MUST be False in production.
DEBUG = env_bool("DEBUG", True)

# SECRET_KEY from env; in production it must be explicitly provided
SECRET_KEY = os.getenv("SECRET_KEY") or ("dev-secret-key" if DEBUG else None)
if not SECRET_KEY:
    raise ValueError("SECRET_KEY must be set when DEBUG is False")

# ALLOWED_HOSTS - nastavte v .env súbore pre produkciu
ALLOWED_HOSTS = os.getenv(
    "ALLOWED_HOSTS", "localhost,127.0.0.1,AntonChudjak.pythonanywhere.com"
).split(",")

# Automaticky pridaj host pre Railway podľa BACKEND_ORIGIN alebo Railway env
_backend_origin = os.getenv("BACKEND_ORIGIN", "")
if _backend_origin:
    try:
        parsed_backend = urlparse(_backend_origin)
        if parsed_backend.hostname and parsed_backend.hostname not in ALLOWED_HOSTS:
            ALLOWED_HOSTS.append(parsed_backend.hostname)
    except Exception:
        pass

# Pri detekcii Railway prostredia povoľ aj subdomény railway.app
if os.getenv("RAILWAY_ENVIRONMENT_ID") and ".railway.app" not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(".railway.app")
