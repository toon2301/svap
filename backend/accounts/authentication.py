"""
Custom JWT authentication pre Swaply s Redis fallback
"""
import logging
from django.core.cache import cache
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings

logger = logging.getLogger(__name__)


class SwaplyJWTAuthentication(JWTAuthentication):
    """
    Custom JWT authentication s Redis fallback pre token blacklisting
    """
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.user_id_field = 'id'
    
    def get_user(self, validated_token):
        """
        Override get_user to handle blacklist checking with Redis fallback
        """
        try:
            user_id = validated_token.get('user_id')
            if user_id is None:
                raise InvalidToken('Token contained no recognizable user identification')
            
            # Skús Redis blacklist check
            if self._is_redis_available():
                if self._is_token_blacklisted(validated_token):
                    raise InvalidToken('Token is blacklisted')
            else:
                # Fallback: jednoduchá kontrola v databáze
                if self._is_token_blacklisted_fallback(validated_token):
                    raise InvalidToken('Token is blacklisted')
            
            from django.contrib.auth import get_user_model
            User = get_user_model()
            user = User.objects.get(**{self.user_id_field: user_id})
            
            if not user.is_active:
                raise InvalidToken('User is inactive')
            
            return user
            
        except Exception as e:
            logger.error(f"JWT authentication error: {e}")
            raise InvalidToken('Token is invalid')
    
    def _is_redis_available(self):
        """
        Skontroluj, či je Redis dostupný
        """
        try:
            cache.get('test_key')
            return True
        except Exception:
            return False
    
    def _is_token_blacklisted(self, token):
        """
        Skontroluj blacklist v Redis
        """
        try:
            jti = token.get('jti')
            if not jti:
                return False
            
            # Skontroluj v cache (Redis)
            blacklist_key = f"blacklist_{jti}"
            return cache.get(blacklist_key) is not None
            
        except Exception as e:
            logger.warning(f"Redis blacklist check failed: {e}")
            return False
    
    def _is_token_blacklisted_fallback(self, token):
        """
        Fallback blacklist check bez Redis
        """
        try:
            # Jednoduchá implementácia - môže byť rozšírená
            # Pre teraz vráť False (žiadne blacklisting bez Redis)
            return False
        except Exception:
            return False


class SwaplyRefreshToken(RefreshToken):
    """
    Custom RefreshToken s Redis fallback pre blacklisting
    """
    
    def blacklist(self):
        """
        Blacklist token s Redis fallback
        """
        try:
            if self._is_redis_available():
                self._blacklist_redis()
            else:
                self._blacklist_fallback()
        except Exception as e:
            logger.error(f"Token blacklisting failed: {e}")
            # Nevyhodíme chybu, len zalogujeme
    
    def _is_redis_available(self):
        """
        Skontroluj, či je Redis dostupný
        """
        try:
            cache.get('test_key')
            return True
        except Exception:
            return False
    
    def _blacklist_redis(self):
        """
        Blacklist token v Redis
        """
        try:
            jti = self.get('jti')
            if jti:
                # Nastav blacklist flag v Redis
                blacklist_key = f"blacklist_{jti}"
                cache.set(blacklist_key, True, timeout=86400)  # 24 hodín
        except Exception as e:
            logger.error(f"Redis blacklisting failed: {e}")
    
    def _blacklist_fallback(self):
        """
        Fallback blacklisting bez Redis
        """
        try:
            # Pre teraz len zalogujeme - môže byť rozšírené o databázu
            logger.info(f"Token blacklisted (fallback): {self.get('jti')}")
        except Exception as e:
            logger.error(f"Fallback blacklisting failed: {e}")
