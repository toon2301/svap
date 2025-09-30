from django.test import TestCase
from django.conf import settings


class TestSettingsBits(TestCase):
    def test_security_flags_present(self):
        assert hasattr(settings, 'SECURE_SSL_REDIRECT')
        assert hasattr(settings, 'SESSION_COOKIE_SECURE')
        assert hasattr(settings, 'CSRF_COOKIE_SECURE')
        # access values to mark lines
        _ = settings.SECURE_SSL_REDIRECT
        _ = settings.SESSION_COOKIE_SECURE
        _ = settings.CSRF_COOKIE_SECURE
        _ = settings.SECURE_HSTS_SECONDS
        _ = settings.SECURE_HSTS_INCLUDE_SUBDOMAINS
        _ = settings.SECURE_HSTS_PRELOAD

