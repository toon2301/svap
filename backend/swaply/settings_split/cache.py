from .env import os
from swaply.settings_parts.cache import build_caches


def _env_float(name: str, default: float | None) -> float | None:
    raw = os.getenv(name)
    if raw is None or str(raw).strip() == "":
        return default
    return float(raw)


def _env_int(name: str, default: int | None) -> int | None:
    raw = os.getenv(name)
    if raw is None or str(raw).strip() == "":
        return default
    return int(raw)


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None or str(raw).strip() == "":
        return default
    return str(raw).strip().lower() in ("1", "true", "yes", "on")


# Dedicated cache Redis is preferred; fall back to the legacy shared REDIS_URL.
REDIS_URL = os.getenv("REDIS_URL", None)
CACHE_REDIS_URL = os.getenv("CACHE_REDIS_URL", None) or REDIS_URL
CACHE_KEY_PREFIX = os.getenv("CACHE_KEY_PREFIX", "swaply")
CACHE_SOCKET_TIMEOUT = _env_float("CACHE_SOCKET_TIMEOUT", 0.3 if CACHE_REDIS_URL else None)
CACHE_SOCKET_CONNECT_TIMEOUT = _env_float(
    "CACHE_SOCKET_CONNECT_TIMEOUT", 0.2 if CACHE_REDIS_URL else None
)
CACHE_IGNORE_EXCEPTIONS = _env_bool("CACHE_IGNORE_EXCEPTIONS", True)
CACHE_RETRY_ON_TIMEOUT = _env_bool("CACHE_RETRY_ON_TIMEOUT", False)
CACHE_REDIS_MAX_CONNECTIONS = _env_int("CACHE_REDIS_MAX_CONNECTIONS", None)

CACHES = build_caches(
    CACHE_REDIS_URL,
    key_prefix=CACHE_KEY_PREFIX,
    socket_timeout=CACHE_SOCKET_TIMEOUT,
    socket_connect_timeout=CACHE_SOCKET_CONNECT_TIMEOUT,
    ignore_exceptions=CACHE_IGNORE_EXCEPTIONS,
    max_connections=CACHE_REDIS_MAX_CONNECTIONS,
    retry_on_timeout=CACHE_RETRY_ON_TIMEOUT,
)
