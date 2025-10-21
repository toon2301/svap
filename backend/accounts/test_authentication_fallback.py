"""
Testy pre Redis fallback authentication
"""
from django.test import TestCase
from django.core.cache import cache
from django.contrib.auth import get_user_model
from unittest.mock import patch, MagicMock
from accounts.authentication import SwaplyJWTAuthentication, SwaplyRefreshToken
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


class TestRedisFallback(TestCase):
    """Testy pre Redis fallback funkcionalitu"""
    
    def setUp(self):
        """Nastavenie testov"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_redis_unavailable_fallback(self):
        """Test fallback keď Redis nie je dostupný"""
        # Simuluj Redis nedostupnosť
        with patch('accounts.authentication.cache.get', side_effect=Exception("Redis unavailable")):
            auth = SwaplyJWTAuthentication()
            self.assertFalse(auth._is_redis_available())
    
    def test_redis_available(self):
        """Test keď Redis je dostupný"""
        # Simuluj Redis dostupnosť
        with patch('accounts.authentication.cache.get', return_value=None):
            auth = SwaplyJWTAuthentication()
            self.assertTrue(auth._is_redis_available())
    
    def test_token_blacklist_redis_fallback(self):
        """Test token blacklisting s Redis fallback"""
        # Vytvor token
        refresh = SwaplyRefreshToken.for_user(self.user)
        
        # Simuluj Redis nedostupnosť
        with patch('accounts.authentication.cache.get', side_effect=Exception("Redis unavailable")):
            with patch('accounts.authentication.cache.set', side_effect=Exception("Redis unavailable")):
                # Blacklisting by nemal vyhodiť chybu
                refresh.blacklist()
                # Test by mal prejsť bez chyby
    
    def test_token_blacklist_redis_available(self):
        """Test token blacklisting keď Redis je dostupný"""
        # Vytvor token
        refresh = SwaplyRefreshToken.for_user(self.user)
        
        # Simuluj Redis dostupnosť
        with patch('accounts.authentication.cache.get', return_value=None):
            with patch('accounts.authentication.cache.set', return_value=True) as mock_set:
                refresh.blacklist()
                # Skontroluj, či sa volal cache.set
                mock_set.assert_called_once()
    
    def test_authentication_with_blacklisted_token_redis_fallback(self):
        """Test autentifikácie s blacklistovaným tokenom (Redis fallback)"""
        # Vytvor token
        refresh = SwaplyRefreshToken.for_user(self.user)
        access_token = refresh.access_token
        
        # Simuluj Redis nedostupnosť
        with patch('accounts.authentication.cache.get', side_effect=Exception("Redis unavailable")):
            auth = SwaplyJWTAuthentication()
            
            # Token by mal byť validný (fallback neblokuje)
            validated_token = auth.get_validated_token(str(access_token))
            user = auth.get_user(validated_token)
            self.assertEqual(user, self.user)
    
    def test_authentication_with_blacklisted_token_redis_available(self):
        """Test autentifikácie s blacklistovaným tokenom (Redis dostupný)"""
        # Vytvor token
        refresh = SwaplyRefreshToken.for_user(self.user)
        access_token = refresh.access_token
        
        # Simuluj Redis dostupnosť a blacklisted token
        with patch('accounts.authentication.cache.get', return_value=True):  # Token je blacklisted
            auth = SwaplyJWTAuthentication()
            
            # Token by mal byť neplatný
            validated_token = auth.get_validated_token(str(access_token))
            with self.assertRaises(Exception):  # InvalidToken
                auth.get_user(validated_token)
    
    def test_authentication_with_valid_token_redis_available(self):
        """Test autentifikácie s platným tokenom (Redis dostupný)"""
        # Vytvor token
        refresh = SwaplyRefreshToken.for_user(self.user)
        access_token = refresh.access_token
        
        # Simuluj Redis dostupnosť a token nie je blacklisted
        with patch('accounts.authentication.cache.get', return_value=None):  # Token nie je blacklisted
            auth = SwaplyJWTAuthentication()
            
            # Token by mal byť platný
            validated_token = auth.get_validated_token(str(access_token))
            user = auth.get_user(validated_token)
            self.assertEqual(user, self.user)
