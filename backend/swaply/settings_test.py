"""
Test settings pre Swaply
"""
from .settings import *
import os

# Vypnúť rate limiting pre testy
RATE_LIMITING_ENABLED = False

# Vypnúť všetky rate limitery pre testy
RATE_LIMIT_DISABLED = True

# Vypnúť audit logging pre testy
AUDIT_LOGGING_ENABLED = False

# Použiť in-memory databázu pre testy
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}

# Vypnúť cache pre testy
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.dummy.DummyCache',
    }
}

# Vypnúť logging pre testy
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'null': {
            'class': 'logging.NullHandler',
        },
    },
    'loggers': {
        'swaply.rate_limiting': {
            'handlers': ['null'],
            'level': 'CRITICAL',
        },
        'swaply.audit_logger': {
            'handlers': ['null'],
            'level': 'CRITICAL',
        },
    },
}

# Vypnúť email sending pre testy
EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'

# Debug mode pre testy
DEBUG = True
