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
    raise ValueError("SECRET_KEY environment variable must be set in production")

# ALLOWED_HOSTS - nastavte v .env súbore pre produkciu
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', '').split(',')
if not ALLOWED_HOSTS or ALLOWED_HOSTS == ['']:
    raise ValueError("ALLOWED_HOSTS environment variable must be set in production")

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME'),
        'USER': os.getenv('DB_USER'),
        'PASSWORD': os.getenv('DB_PASSWORD'),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        'PORT': os.getenv('DB_PORT', '5432'),
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
    raise ValueError("CORS_ALLOWED_ORIGINS environment variable must be set in production")

# Email settings
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL')

if not EMAIL_HOST_USER or not EMAIL_HOST_PASSWORD:
    raise ValueError("EMAIL_HOST_USER and EMAIL_HOST_PASSWORD must be set in production")

# Google OAuth credentials
GOOGLE_OAUTH2_CLIENT_ID = os.getenv('GOOGLE_OAUTH2_CLIENT_ID')
GOOGLE_OAUTH2_SECRET = os.getenv('GOOGLE_OAUTH2_SECRET')

if not GOOGLE_OAUTH2_CLIENT_ID or not GOOGLE_OAUTH2_SECRET:
    raise ValueError("GOOGLE_OAUTH2_CLIENT_ID and GOOGLE_OAUTH2_SECRET must be set in production")

# OAuth Callback URLs
FRONTEND_CALLBACK_URL = os.getenv('FRONTEND_CALLBACK_URL')
BACKEND_CALLBACK_URL = os.getenv('BACKEND_CALLBACK_URL')

if not FRONTEND_CALLBACK_URL or not BACKEND_CALLBACK_URL:
    raise ValueError("FRONTEND_CALLBACK_URL and BACKEND_CALLBACK_URL must be set in production")

# Frontend URL
FRONTEND_URL = os.getenv('FRONTEND_URL')
if not FRONTEND_URL:
    raise ValueError("FRONTEND_URL must be set in production")

# Site Domain
SITE_DOMAIN = os.getenv('SITE_DOMAIN')
if not SITE_DOMAIN:
    raise ValueError("SITE_DOMAIN must be set in production")

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
