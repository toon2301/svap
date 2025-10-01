"""
Produkčné nastavenia pre Swaply
"""
import os
from pathlib import Path
from datetime import timedelta
from .settings import *

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

# Database - používame SQLite pre jednoduchosť
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

# HTTPS settings
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

if not GOOGLE_OAUTH2_CLIENT_ID or not GOOGLE_OAUTH2_SECRET:
    GOOGLE_OAUTH2_CLIENT_ID = 'dummy-client-id'
    GOOGLE_OAUTH2_SECRET = 'dummy-secret'

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

# Frontend Root - kde sú buildované frontend súbory
FRONTEND_ROOT = os.path.join(BASE_DIR.parent, 'out')

# Site Domain
SITE_DOMAIN = os.getenv('SITE_DOMAIN')
if not SITE_DOMAIN:
    SITE_DOMAIN = 'antonchudjak.pythonanywhere.com'

# Logging configuration for production
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'json': {
            'format': '{"level": "%(levelname)s", "time": "%(asctime)s", "module": "%(module)s", "message": "%(message)s", "extra": %(extra)s}',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': 'logs/swaply.log',
            'formatter': 'verbose',
        },
        'audit_file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': 'logs/audit.log',
            'formatter': 'json',
        },
        'security_file': {
            'level': 'WARNING',
            'class': 'logging.FileHandler',
            'filename': 'logs/security.log',
            'formatter': 'json',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file'],
            'level': 'INFO',
            'propagate': True,
        },
        'swaply': {
            'handlers': ['file'],
            'level': 'INFO',
            'propagate': True,
        },
        'accounts': {
            'handlers': ['file'],
            'level': 'INFO',
            'propagate': True,
        },
        'audit': {
            'handlers': ['audit_file'],
            'level': 'INFO',
            'propagate': False,
        },
        'security': {
            'handlers': ['security_file'],
            'level': 'WARNING',
            'propagate': False,
        },
    },
}