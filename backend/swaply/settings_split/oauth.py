from .env import os

# Django allauth settings
ACCOUNT_LOGIN_METHODS = {'email'}
ACCOUNT_SIGNUP_FIELDS = ['email*', 'password1*', 'password2*']
ACCOUNT_EMAIL_VERIFICATION = 'mandatory'
ACCOUNT_UNIQUE_EMAIL = True
ACCOUNT_USER_MODEL_USERNAME_FIELD = None
ACCOUNT_USER_MODEL_EMAIL_FIELD = 'email'
ACCOUNT_USERNAME_REQUIRED = False
ACCOUNT_USERNAME_BLACKLIST = []

# Social account settings
SOCIALACCOUNT_EMAIL_VERIFICATION = False
SOCIALACCOUNT_EMAIL_REQUIRED = True
SOCIALACCOUNT_AUTO_SIGNUP = True

# Google OAuth settings
SOCIALACCOUNT_PROVIDERS = {
    'google': {
        'SCOPE': [
            'profile',
            'email',
        ],
        'AUTH_PARAMS': {
            'access_type': 'online',
        },
        'OAUTH_PKCE_ENABLED': True,
    }
}

# Google OAuth credentials (treba nastaviť v .env súbore)
GOOGLE_OAUTH2_CLIENT_ID = os.getenv('GOOGLE_OAUTH2_CLIENT_ID', '')
GOOGLE_OAUTH2_SECRET = os.getenv('GOOGLE_OAUTH2_SECRET', '')

# OAuth Callback URLs - nastavte v .env súbore pre produkciu (IP adresa pre mobile testovanie)
FRONTEND_CALLBACK_URL = os.getenv('FRONTEND_CALLBACK_URL', 'http://localhost:3000/auth/callback/')
BACKEND_CALLBACK_URL = os.getenv('BACKEND_CALLBACK_URL', 'http://localhost:8000/api/oauth/google/callback/')

# Frontend URL pre CORS - používa localhost pre lokálny vývoj, IP adresu pre mobile testovanie
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')


