"""
Script na vyčistenie rate limit cache pre všetkých používateľov
Spustiť: python manage.py shell < clear_rate_limit_cache.py
alebo: python manage.py shell, potom skopíruj obsah tohto súboru
"""

from django.core.cache import cache
from swaply.rate_limiting import RateLimiter
import re

# Vytvor limiter pre získanie správnych kľúčov
limiter = RateLimiter(max_attempts=1000, window_minutes=60, block_minutes=60)

# Ak používaš Redis alebo inú cache backend, môžeš použiť pattern matching
# Pre Django cache (default), musíme vymazať všetky kľúče manuálne

# Metóda 1: Vymazať všetku cache (najjednoduchšie, ale vymaže aj iné cache)
print("🧹 Clearing all cache (including rate limits)...")
cache.clear()
print("✅ All cache cleared!")

# Metóda 2: Vymazať len rate limit kľúče (ak vieš pattern)
# Toto funguje len ak máš prístup k cache keys (napr. Redis)
# Pre default Django cache to nie je možné bez pattern matching

print("\n✅ Rate limit cache cleared for all users!")
print("📊 New limit: 1000 requests per 60 minutes")
