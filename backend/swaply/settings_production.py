"""
Produkčné nastavenia pre Swaply
"""
import os
from pathlib import Path
from datetime import timedelta
from .settings import *
from urllib.parse import urlparse

LOG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'logs')
os.makedirs(LOG_DIR, exist_ok=True)

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = False

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('SECRET_KEY')
if not SECRET_KEY:
    SECRET_KEY = 'fallback-secret-key-for-production'

# ALLOWED_HOSTS - nastavte v .env súbore pre produkciu
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', '').split(',')
if not ALLOWED_HOSTS or ALLOWED_HOSTS == ['']:
    ALLOWED_HOSTS = ['antonchudjak.pythonanywhere.com']

# Database – preferuj DATABASE_URL, inak fallback na sqlite
db_url = os.getenv('DATABASE_URL')
if db_url:
    parsed = urlparse(db_url)
    if parsed.scheme in ('postgres', 'postgresql'):
        DATABASES = {
            'default': {
                'ENGINE': 'django.db.backends.postgresql',
                'NAME': (parsed.path[1:] or ''),
                'USER': parsed.username or '',
                'PASSWORD': parsed.password or '',
                'HOST': parsed.hostname or '',
                'PORT': str(parsed.port or ''),
            }
        }
    elif parsed.scheme == 'sqlite':
        DATABASES = {
            'default': {
                'ENGINE': 'django.db.backends.sqlite3',
                'NAME': parsed.path if parsed.path else BASE_DIR / 'db.sqlite3',
            }
        }
    else:
        # Neznáma schéma -> fallback na sqlite
        DATABASES = {
            'default': {
                'ENGINE': 'django.db.backends.sqlite3',
                'NAME': BASE_DIR / 'db.sqlite3',
            }
        }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Security settings
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# HTTPS settings (Railway má SSL pred reverse proxy)
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# CORS settings - nastavte v .env súbore pre produkciu
CORS_ALLOWED_ORIGINS = os.getenv('CORS_ALLOWED_ORIGINS', '').split(',')
if not CORS_ALLOWED_ORIGINS or CORS_ALLOWED_ORIGINS == ['']:
    CORS_ALLOWED_ORIGINS = ['https://antonchudjak.pythonanywhere.com']

# Email settings
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL')

if not EMAIL_HOST_USER or not EMAIL_HOST_PASSWORD:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Google OAuth credentials
GOOGLE_OAUTH2_CLIENT_ID = os.getenv('GOOGLE_OAUTH2_CLIENT_ID')
GOOGLE_OAUTH2_SECRET = os.getenv('GOOGLE_OAUTH2_SECRET')

# OAuth Callback URLs
FRONTEND_CALLBACK_URL = os.getenv('FRONTEND_CALLBACK_URL')
BACKEND_CALLBACK_URL = os.getenv('BACKEND_CALLBACK_URL')

if not FRONTEND_CALLBACK_URL or not BACKEND_CALLBACK_URL:
    FRONTEND_CALLBACK_URL = 'https://antonchudjak.pythonanywhere.com/auth/callback'
    BACKEND_CALLBACK_URL = 'https://antonchudjak.pythonanywhere.com/api/auth/oauth/google/callback/'

# Frontend URL
FRONTEND_URL = os.getenv('FRONTEND_URL')
if not FRONTEND_URL:
    FRONTEND_URL = 'https://antonchudjak.pythonanywhere.com'

# Frontend Root nie je potrebný pri oddelenom hostingu frontendu (Next.js na Railway)
FRONTEND_ROOT = os.getenv('FRONTEND_ROOT', '')

# Site Domain
SITE_DOMAIN = os.getenv('SITE_DOMAIN')
if not SITE_DOMAIN:
    SITE_DOMAIN = 'antonchudjak.pythonanywhere.com'

# Logging configuration for production (Railway): log to stdout
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
        'json': {
            'format': '{"level": "%(levelname)s", "time": "%(asctime)s", "module": "%(module)s", "message": "%(message)s"}',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
        'console_json': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'json',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': True,
        },
        'swaply': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': True,
        },
        'accounts': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': True,
        },
        'audit': {
            'handlers': ['console_json'],
            'level': 'INFO',
            'propagate': False,
        },
        'security': {
            'handlers': ['console_json'],
            'level': 'WARNING',
            'propagate': False,
        },
    },
}
