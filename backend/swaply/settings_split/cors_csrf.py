from .env import os, sys, env_bool
from .security import DEBUG

# CORS settings - nastavte v .env súbore pre produkciu (IP adresa pre mobile testovanie)
CORS_ALLOWED_ORIGINS = os.getenv(
    'CORS_ALLOWED_ORIGINS',
    'http://localhost:3000,http://127.0.0.1:3000'
).split(',')

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = False

CORS_ALLOWED_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
    'cache-control',
    'pragma',
    'x-mobile-app',  # Pridané pre mobile detekciu
    'x-device-type',  # Pridané pre mobile detekciu
]

CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

CORS_PREFLIGHT_MAX_AGE = 86400

CORS_EXPOSE_HEADERS = [
    'authorization',
    'content-type',
    'x-csrf-token',
]

# CSRF trusted origins
CSRF_TRUSTED_ORIGINS = os.getenv(
    'CSRF_TRUSTED_ORIGINS',
    ','.join(CORS_ALLOWED_ORIGINS)
).split(',')

# Cookies a bezpečnosť
SESSION_COOKIE_SECURE = env_bool('SESSION_COOKIE_SECURE', not DEBUG)
CSRF_COOKIE_SECURE = env_bool('CSRF_COOKIE_SECURE', not DEBUG)
SESSION_COOKIE_HTTPONLY = env_bool('SESSION_COOKIE_HTTPONLY', True)
CSRF_COOKIE_HTTPONLY = env_bool('CSRF_COOKIE_HTTPONLY', False)

# Enforce CSRF pre API – v produkcii povoliť vždy; v testoch je možné vypnúť
if DEBUG:
    CSRF_ENFORCE_API = env_bool('CSRF_ENFORCE_API', False) and not ('test' in sys.argv or 'pytest' in sys.modules)
else:
    # V produkcii vynucuj CSRF pre API ako default (nezávisle od testov)
    CSRF_ENFORCE_API = True

# Pri JWT (Authorization: Bearer ...) nie je CSRF potrebné – voliteľne vypnuteľné
CSRF_SKIP_FOR_JWT = env_bool('CSRF_SKIP_FOR_JWT', True)
SECURE_SSL_REDIRECT = env_bool('SECURE_SSL_REDIRECT', not DEBUG)
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'
SECURE_HSTS_SECONDS = 31536000 if not DEBUG else 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = not DEBUG
SECURE_HSTS_PRELOAD = not DEBUG
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
X_FRAME_OPTIONS = 'DENY'


