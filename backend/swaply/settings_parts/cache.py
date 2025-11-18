import os
from typing import Dict, Any


def build_caches(redis_url: str | None) -> Dict[str, Any]:
    """
    Vytvor CACHES konfiguráciu. Ak je nastavený REDIS_URL, použije RedisCache,
    inak LocMemCache. Žiadna zmena logiky oproti pôvodnému nastaveniu.
    """
    if redis_url:
        return {
            'default': {
                'BACKEND': 'django.core.cache.backends.redis.RedisCache',
                'LOCATION': redis_url,
                'KEY_PREFIX': os.getenv('CACHE_KEY_PREFIX', 'swaply'),
                'OPTIONS': {
                    'CLIENT_CLASS': 'django_redis.client.DefaultClient',
                    'CONNECTION_POOL_KWARGS': {
                        'retry_on_timeout': True,
                        'socket_keepalive': True,
                        'socket_keepalive_options': {},
                    }
                }
            }
        }
    else:
        return {
            'default': {
                'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
                'LOCATION': 'swaply-cache'
            }
        }

