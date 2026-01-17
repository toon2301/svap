from .env import os, env_bool

# CAPTCHA settings
CAPTCHA_ENABLED = env_bool('CAPTCHA_ENABLED', True)
CAPTCHA_SECRET_KEY = os.getenv('CAPTCHA_SECRET_KEY', 'test-secret-key')
CAPTCHA_SITE_KEY = os.getenv('CAPTCHA_SITE_KEY', 'test-site-key')
CAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify'
CAPTCHA_SKIP_IN_TESTS = env_bool('CAPTCHA_SKIP_IN_TESTS', True)


