from .env import os

# Prihlásenie cez Google rieši vlastný kód v accounts/views/google_oauth_simple.py
# (bez knižnice django-allauth).

# Google OAuth credentials (treba nastaviť v .env súbore)
GOOGLE_OAUTH2_CLIENT_ID = os.getenv("GOOGLE_OAUTH2_CLIENT_ID", "")
GOOGLE_OAUTH2_SECRET = os.getenv("GOOGLE_OAUTH2_SECRET", "")

# OAuth Callback URLs - nastavte v .env súbore pre produkciu (IP adresa pre mobile testovanie)
FRONTEND_CALLBACK_URL = os.getenv(
    "FRONTEND_CALLBACK_URL", "http://localhost:3000/auth/callback/"
)
BACKEND_CALLBACK_URL = os.getenv(
    "BACKEND_CALLBACK_URL", "http://localhost:8000/api/oauth/google/callback/"
)

# Frontend URL pre CORS - používa localhost pre lokálny vývoj, IP adresu pre mobile testovanie
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
