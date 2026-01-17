from .env import os
from swaply.settings_parts.cache import build_caches  # absolute import kvôli runtime načítaniu v testoch

# Redis settings (pre cache a session storage). Ak REDIS_URL nie je zadaný, použijeme LocMemCache.
REDIS_URL = os.getenv('REDIS_URL', None)
CACHES = build_caches(REDIS_URL)


