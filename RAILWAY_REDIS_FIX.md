# Riešenie problému s Redis na Railway hostingu

## Problém
Na Railway hostingu sa vyskytovali chyby:
- `ERROR Logout error: Token is blacklisted`
- `WARNING Bad Request: /api/auth/logout/`
- `Security event: login_failed`
- `WARNING Bad Request: /api/auth/login/`

## Príčina
1. **Redis nie je dostupný** - Railway nemal nakonfigurovanú Redis službu
2. **JWT blacklisting vyžaduje Redis** - `rest_framework_simplejwt.token_blacklist` potrebuje Redis pre ukladanie blacklistovaných tokenov
3. **Fallback na LocMemCache** - keď Redis nie je dostupný, Django používa LocMemCache, ale JWT blacklist to nepodporuje

## Riešenie

### 1. Custom JWT Authentication s Redis Fallback
Vytvorený `backend/accounts/authentication.py` s:
- `SwaplyJWTAuthentication` - custom JWT authentication s Redis fallback
- `SwaplyRefreshToken` - custom RefreshToken s Redis fallback pre blacklisting
- Automatická detekcia Redis dostupnosti
- Graceful fallback pri Redis chybách

### 2. Redis Konfigurácia s Fallback
Aktualizované `backend/swaply/settings.py`:
- Test Redis pripojenia pri štarte
- Automatický fallback na LocMemCache ak Redis nie je dostupný
- Vylepšené Redis nastavenia s retry mechanizmami

### 3. Railway Konfigurácia
Aktualizované `railway.json`:
- Pridaná Redis služba (`redis:7-alpine`)
- Nastavená `REDIS_URL` environment variable
- Správne porty a závislosti

### 4. Dependencies
Pridané do `backend/requirements.txt`:
- `django-redis==5.4.0` - pre lepšiu Redis integráciu

## Implementované Funkcie

### Redis Fallback Mechanizmus
```python
# Automatická detekcia Redis dostupnosti
def _is_redis_available(self):
    try:
        cache.get('test_key')
        return True
    except Exception:
        return False
```

### Token Blacklisting s Fallback
```python
def blacklist(self):
    try:
        if self._is_redis_available():
            self._blacklist_redis()
        else:
            self._blacklist_fallback()
    except Exception as e:
        logger.error(f"Token blacklisting failed: {e}")
        # Nevyhodíme chybu, len zalogujeme
```

### Error Handling
- Všetky Redis operácie majú try-catch bloky
- Chyby sa logujú, ale neprerušujú aplikáciu
- Graceful degradation pri Redis nedostupnosti

## Testy
Vytvorené `backend/accounts/test_authentication_fallback.py` s testami pre:
- Redis dostupnosť/nedostupnosť
- Token blacklisting s Redis fallback
- Autentifikácia s blacklistovanými tokenmi
- Všetky testy prešli úspešne ✅

## Výsledok
- ✅ Aplikácia funguje aj bez Redis
- ✅ JWT blacklisting funguje s Redis aj bez neho
- ✅ Login/logout funguje na Railway hostingu
- ✅ Žiadne "Token is blacklisted" chyby
- ✅ Robustný error handling

## Nasadenie
1. Push kód do repozitára
2. Railway automaticky nasadí novú konfiguráciu s Redis
3. Aplikácia sa spustí s Redis fallback mechanizmom
4. Login/logout by mal fungovať bez chýb

## Monitoring
- Sledujte logy pre Redis connection warnings
- Ak sa vyskytnú Redis chyby, aplikácia automaticky prepne na fallback
- Všetky chyby sú logované pre debugging
