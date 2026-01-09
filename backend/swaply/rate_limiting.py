"""
Rate limiting utilities pre Swaply
"""
from django.core.cache import cache
from django.http import JsonResponse
from django.utils import timezone
from functools import wraps
import hashlib
import json
import logging
from rest_framework.exceptions import Throttled

logger = logging.getLogger(__name__)


class RateLimitExceeded(Throttled):
    """Exception pre prekročenie rate limitu"""
    default_detail = "Prekročili ste limit požiadaviek. Skúste to prosím neskôr."
    extra_detail = "Rate limit exceeded."

    def __init__(self, wait=None, detail=None, code=None):
        self.wait = wait
        if detail is not None:
            self.detail = detail
        if code is not None:
            self.code = code


class RateLimiter:
    """
    Jednoduchý rate limiter používajúci Django cache
    """
    
    def __init__(self, max_attempts=5, window_minutes=15, block_minutes=60):
        self.max_attempts = max_attempts
        self.window_minutes = window_minutes
        self.block_minutes = block_minutes
    
    def get_key(self, identifier, action):
        """
        Generuje cache key pre rate limiting
        """
        return f"rate_limit:{action}:{hashlib.md5(identifier.encode()).hexdigest()}"
    
    def is_allowed(self, identifier, action):
        """
        Kontroluje, či je akcia povolená
        """
        key = self.get_key(identifier, action)
        data = cache.get(key, {'attempts': 0, 'first_attempt': None})
        
        now = timezone.now()
        
        # Ak je prvý pokus, inicializuj
        if data['first_attempt'] is None:
            data['first_attempt'] = now
            data['attempts'] = 1
            cache.set(key, data, timeout=self.window_minutes * 60)
            return True
        
        # Ak je okno vypršané, resetuj
        if (now - data['first_attempt']).total_seconds() > self.window_minutes * 60:
            data = {'attempts': 1, 'first_attempt': now}
            cache.set(key, data, timeout=self.window_minutes * 60)
            return True
        
        # Ak je počet pokusov prekročený, zablokuj
        if data['attempts'] >= self.max_attempts:
            # Nastav dlhšie blokovanie
            cache.set(key, data, timeout=self.block_minutes * 60)
            return False
        
        # Inkrementuj počet pokusov
        data['attempts'] += 1
        cache.set(key, data, timeout=self.window_minutes * 60)
        return True
    
    def get_remaining_attempts(self, identifier, action):
        """
        Vráti počet zostávajúcich pokusov
        """
        key = self.get_key(identifier, action)
        data = cache.get(key, {'attempts': 0, 'first_attempt': None})
        
        if data['first_attempt'] is None:
            return self.max_attempts
        
        now = timezone.now()
        if (now - data['first_attempt']).total_seconds() > self.window_minutes * 60:
            return self.max_attempts
        
        return max(0, self.max_attempts - data['attempts'])
    
    def get_reset_time(self, identifier, action):
        """
        Vráti čas, kedy sa rate limit resetuje
        """
        key = self.get_key(identifier, action)
        data = cache.get(key, {'attempts': 0, 'first_attempt': None})
        
        if data['first_attempt'] is None:
            return None
        
        return data['first_attempt'] + timezone.timedelta(minutes=self.window_minutes)


def rate_limit(max_attempts=5, window_minutes=15, block_minutes=60, action='default'):
    """
    Decorator pre rate limiting
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            # Skontroluj, či je rate limiting povolený
            from django.conf import settings
            if not getattr(settings, 'RATE_LIMITING_ENABLED', True) or getattr(settings, 'RATE_LIMIT_DISABLED', False):
                return view_func(request, *args, **kwargs)

            # Povoliť bypass podľa cesty (užitočné pre testovacie scenáre)
            try:
                allow_paths = set(getattr(settings, 'RATE_LIMIT_ALLOW_PATHS', []) or [])
                if getattr(request, 'path', None) in allow_paths:
                    return view_func(request, *args, **kwargs)
            except Exception:
                pass

            # Per-action overrides (napr. pre testy)
            try:
                overrides = getattr(settings, 'RATE_LIMIT_OVERRIDES', {}) or {}
                if action in overrides:
                    cfg = overrides[action] or {}
                    local_max_attempts = int(cfg.get('max_attempts', max_attempts))
                    local_window_minutes = int(cfg.get('window_minutes', window_minutes))
                    local_block_minutes = int(cfg.get('block_minutes', block_minutes))
                else:
                    local_max_attempts = max_attempts
                    local_window_minutes = window_minutes
                    local_block_minutes = block_minutes
            except Exception:
                # Fallback na pôvodné hodnoty
                local_max_attempts = max_attempts
                local_window_minutes = window_minutes
                local_block_minutes = block_minutes
            
            # Získaj identifikátor (IP adresa alebo user ID)
            if hasattr(request, 'user') and request.user.is_authenticated:
                identifier = f"user:{request.user.id}"
            else:
                identifier = f"ip:{request.META.get('REMOTE_ADDR', 'unknown')}"
            
            limiter = RateLimiter(local_max_attempts, local_window_minutes, local_block_minutes)
            
            if not limiter.is_allowed(identifier, action):
                remaining = limiter.get_remaining_attempts(identifier, action)
                reset_time = limiter.get_reset_time(identifier, action)
                
                logger.warning(
                    f"Rate limit exceeded for {identifier} on action {action}",
                    extra={
                        'identifier': identifier,
                        'action': action,
                        'remaining_attempts': remaining,
                        'reset_time': reset_time,
                        'request_path': request.path,
                        'request_method': request.method
                    }
                )
                
                return JsonResponse({
                    'error': True,
                    'message': 'Príliš veľa pokusov. Skúste to znovu neskôr.',
                    'code': 'RATE_LIMITED',
                    'remaining_attempts': remaining,
                    'reset_time': reset_time.isoformat() if reset_time else None,
                    'timestamp': timezone.now().isoformat()
                }, status=429)
            
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator


# Prednastavené rate limitery pre rôzne akcie
login_rate_limit = rate_limit(max_attempts=5, window_minutes=15, block_minutes=60, action='login')
register_rate_limit = rate_limit(max_attempts=3, window_minutes=15, block_minutes=30, action='register')
password_reset_rate_limit = rate_limit(max_attempts=3, window_minutes=60, block_minutes=120, action='password_reset')
email_verification_rate_limit = rate_limit(max_attempts=5, window_minutes=15, block_minutes=60, action='email_verification')
api_rate_limit = rate_limit(max_attempts=1000, window_minutes=60, block_minutes=60, action='api')
email_check_rate_limit = rate_limit(max_attempts=30, window_minutes=10, block_minutes=30, action='email_check')


def get_client_ip(request):
    """Získanie IP adresy klienta"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip
