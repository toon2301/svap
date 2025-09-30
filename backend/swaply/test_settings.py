from .settings import *  # noqa

# Test overrides
DEBUG = True

# Use fast password hasher for tests
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]

# In-memory email backend for tests
EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'

# SQLite in-memory DB for tests unless DATABASE_URL provided
if 'DATABASE_URL' not in os.environ:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': ':memory:',
        }
    }

# Faster logging during tests
for logger_name in ['django', 'swaply', 'accounts', 'audit', 'security']:
    LOGGING['loggers'][logger_name]['handlers'] = ['console']  # type: ignore
    LOGGING['loggers'][logger_name]['level'] = 'WARNING'  # type: ignore

# Rate limiting off for most tests; security tests can toggle
RATE_LIMIT_DISABLED = False

# Konsistentný frontend URL pre testy
FRONTEND_URL = 'http://localhost:3000'

# Cache – počas testov použi pamäťovú cache, nie Redis
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'swaply-test-cache'
    }
}

# Per-action rate limit overrides pre testy, aby bežné integračné testy nepadali na 429.
# Nechávame 'email_verification' bez override, aby rate-limiting testy fungovali podľa očakávania.
RATE_LIMIT_OVERRIDES = {
    'api': {'max_attempts': 1000, 'window_minutes': 1, 'block_minutes': 1},
}

# Allow-list pre bypass rate limitu na konkrétnych cestách v integračných testoch
RATE_LIMIT_ALLOW_PATHS = [
    '/api/auth/login/',
    '/api/auth/register/',
    '/api/auth/verify-email/',
]


