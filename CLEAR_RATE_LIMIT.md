# 🧹 Vyčistenie Rate Limit Cache - Návod

## Problém
Používatelia majú prekročený rate limit (100/60min) z predchádzajúcich session, takže všetky nové requesty dostávajú 429.

## Riešenie

### Krok 1: Zvýšiť limit ✅
Limit bol zvýšený z **100** na **1000** requestov za 60 minút.

### Krok 2: Vyčistiť cache

#### Možnosť A: Vyčistiť všetku cache (najjednoduchšie)
```bash
python manage.py shell
>>> from django.core.cache import cache
>>> cache.clear()
>>> print("✅ Cache cleared!")
```

#### Možnosť B: Použiť script
```bash
python manage.py shell < clear_rate_limit_cache.py
```

#### Možnosť C: Vyčistiť len pre konkrétneho používateľa
```bash
python manage.py shell
>>> from django.core.cache import cache
>>> from swaply.rate_limiting import RateLimiter
>>> 
>>> limiter = RateLimiter(max_attempts=1000, window_minutes=60, block_minutes=60)
>>> key = limiter.get_key("user:74", "api")  # user:74 = tvoj používateľ
>>> cache.delete(key)
>>> print(f"✅ Rate limit cleared for user:74")
```

## Výsledok

Po vyčistení cache:
- ✅ Všetci používatelia budú mať nový limit: **1000 requestov za 60 minút**
- ✅ Staré prekročené limity budú vymazané
- ✅ Nové requesty budú fungovať normálne

## Testovanie

Po vyčistení cache:
1. Refreshni stránku (F5)
2. Používaj aplikáciu normálne
3. Skontroluj, či už nie sú 429 chyby

## Poznámka

Ak sa 429 chyby objavia znova:
- Skontroluj `window.__API_DEBUG__.print()` - koľko requestov sa volá
- Ak je to viac ako 1000 za hodinu, problém je v zbytočných volaniach (treba pridať deduplication)

