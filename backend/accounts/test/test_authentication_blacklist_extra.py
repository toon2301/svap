import pytest
from django.contrib.auth import get_user_model
from unittest.mock import patch

from rest_framework_simplejwt.tokens import RefreshToken

from accounts.authentication import SwaplyRefreshToken, SwaplyJWTAuthentication

User = get_user_model()


@pytest.mark.django_db
class TestAuthenticationBlacklistExtras:
    def test_is_token_blacklisted_fallback_no_jti(self):
        auth = SwaplyJWTAuthentication()
        assert auth._is_token_blacklisted_fallback({}) is False

    def test_blacklist_fail_open_when_internal_errors(self):
        user = User.objects.create_user(username='u2', email='u2_auth@example.com', password='StrongPass123', is_verified=True)
        token = SwaplyRefreshToken(str(RefreshToken.for_user(user)))

        with patch.object(SwaplyRefreshToken, '_is_redis_available', side_effect=Exception('boom')):
            # Nemalo by to vyhodiť výnimku
            token.blacklist()


