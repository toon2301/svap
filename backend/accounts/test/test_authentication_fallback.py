"""
Testy pre Redis fallback authentication
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from unittest.mock import patch
from accounts.authentication import SwaplyJWTAuthentication, SwaplyRefreshToken

User = get_user_model()


class TestRedisFallback(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser', email='test@example.com', password='testpass123'
        )

    def test_redis_unavailable_fallback(self):
        with patch('accounts.authentication.cache.get', side_effect=Exception("Redis unavailable")):
            auth = SwaplyJWTAuthentication()
            assert auth._is_redis_available() is False

    def test_redis_available(self):
        with patch('accounts.authentication.cache.get', return_value=None):
            auth = SwaplyJWTAuthentication()
            assert auth._is_redis_available() is True

    def test_token_blacklist_redis_fallback(self):
        refresh = SwaplyRefreshToken.for_user(self.user)
        with patch('accounts.authentication.cache.get', side_effect=Exception("Redis unavailable")):
            with patch('accounts.authentication.cache.set', side_effect=Exception("Redis unavailable")):
                refresh.blacklist()

    def test_token_blacklist_redis_available(self):
        refresh = SwaplyRefreshToken.for_user(self.user)
        with patch('accounts.authentication.cache.get', return_value=None):
            with patch.object(SwaplyRefreshToken, '_is_redis_available', return_value=True):
                with patch('accounts.authentication.cache.set', return_value=True) as mock_set:
                    refresh.blacklist()
                    mock_set.assert_called_once()

    def test_authentication_with_blacklisted_token_redis_available(self):
        refresh = SwaplyRefreshToken.for_user(self.user)
        access_token = refresh.access_token
        with patch('accounts.authentication.cache.get', return_value=True):
            auth = SwaplyJWTAuthentication()
            validated = auth.get_validated_token(str(access_token))
            try:
                auth.get_user(validated)
                assert False, "Expected InvalidToken"
            except Exception:
                pass

