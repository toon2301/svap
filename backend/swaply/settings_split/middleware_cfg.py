MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    # 'allauth.account.middleware.AccountMiddleware',  # DOČASNE VYPNUTÉ
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "swaply.middleware.SecurityHeadersMiddleware",
    "swaply.middleware.EnforceCSRFMiddleware",
    "swaply.middleware.GlobalErrorHandlingMiddleware",
]

# Cross Origin Opener Policy – None pre kompatibilitu s popupmi len ak je potrebné
SECURE_CROSS_ORIGIN_OPENER_POLICY = None
