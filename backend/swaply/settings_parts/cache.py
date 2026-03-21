import os
from typing import Any, Dict


def build_caches(
    redis_url: str | None,
    *,
    key_prefix: str | None = None,
    socket_timeout: float | None = None,
    socket_connect_timeout: float | None = None,
    ignore_exceptions: bool = False,
    max_connections: int | None = None,
) -> Dict[str, Any]:
    """
    Vytvor CACHES konfiguraciu. Ak je nastaveny Redis URL, pouzije RedisCache,
    inak LocMemCache.
    """
    if redis_url:
        pool_kwargs = {
            "retry_on_timeout": True,
            "socket_keepalive": True,
            "socket_keepalive_options": {},
        }
        if max_connections is not None:
            pool_kwargs["max_connections"] = max_connections

        options = {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
            "IGNORE_EXCEPTIONS": bool(ignore_exceptions),
            "CONNECTION_POOL_KWARGS": pool_kwargs,
        }
        if socket_timeout is not None:
            options["SOCKET_TIMEOUT"] = float(socket_timeout)
        if socket_connect_timeout is not None:
            options["SOCKET_CONNECT_TIMEOUT"] = float(socket_connect_timeout)

        return {
            "default": {
                "BACKEND": "django_redis.cache.RedisCache",
                "LOCATION": redis_url,
                "KEY_PREFIX": key_prefix or os.getenv("CACHE_KEY_PREFIX", "swaply"),
                "OPTIONS": options,
            }
        }

    return {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "swaply-cache",
        }
    }
