# 🚨 RÝCHLY DEBUGGING 429 - KROK ZA KROKOM

## ⚡ OKAMŽITÉ KROKY (Keď sa objaví 429)

### 1. Chrome Console (Frontend)
```js
// Zisti, ktoré endpointy sa volajú najčastejšie
window.__API_DEBUG__.print()

// Zisti, ktoré useEffect sa volajú opakovane
window.__USE_EFFECT_DEBUG__.print()
```

### 2. Backend Konzola (Backend)
Pozri sa na posledné logy - uvidíš:
```
WARNING: Rate limit exceeded for user:74 on action api
- request_path: /api/auth/dashboard/users/slug/...
- remaining_attempts: 0
```

### 3. Chrome Network Tab
1. Otvor **Network** tab (F12)
2. Aktivuj **Preserve log** ✅
3. Filtruj: **Status Code: 429**
4. Pozri si **Waterfall** - časové rozloženie

---

## 📊 ČO PRESNE HĽADAŤ

### 🔴 ČERVENÉ VLAGY (Problém):

1. **Rovnaký endpoint sa volá viac ako 5x za sekundu**
   ```
   GET /auth/dashboard/users/slug/.../profile/ - 15 calls (v 2 sekundách)
   ```

2. **useEffect sa volá opakovane**
   ```
   🔵 useEffect [Dashboard.loadProfile] - Execution #47
   ```

3. **Backend log ukazuje vysoký počet pokusov**
   ```
   remaining_attempts: 0  (znamená, že limit je prekročený)
   ```

---

## 🎯 SYSTÉMOVÝ TEST

### Krok 1: Vyčisti všetko
```bash
# Backend (Django shell)
python manage.py shell
>>> from django.core.cache import cache
>>> cache.clear()
```

```js
// Frontend (Chrome Console)
localStorage.clear();
sessionStorage.clear();
window.__API_DEBUG__.clear();
window.__USE_EFFECT_DEBUG__.clear();
```

### Krok 2: Refreshni stránku
- F5 alebo Ctrl+R

### Krok 3: Postupne testuj
1. Otvor dashboard
2. Klikni na search
3. Vyhľadaj niečo
4. Klikni na profil
5. Naviguj medzi modulmi

### Krok 4: Po každom kroku skontroluj
```js
// V Chrome Console
window.__API_DEBUG__.print()
```

---

## 📝 REPORTING TEMPLATE

Keď nájdeš 429, zapíš:

```
⏰ Čas: [HH:MM:SS]
🔗 Endpoint: [presný URL]
📊 Počet volaní: [číslo]
⏱️ Časový rozsah: [napr. "5 sekúnd"]
🔄 useEffect: [ktorý useEffect, ak vieš]
📋 Backend log: [skopíruj z backend konzoly]
```

---

## 💡 TIPY

- **Preserve log** v Network tab - aby sa logy nezmažali
- **Throttling** - nastav "Slow 3G" v Network tab
- **React DevTools Profiler** - zisti, ktoré komponenty re-renderujú

---

## 🔧 POMOCNÉ PRÍKAZY

### Zisti aktuálny stav rate limitu (Backend)
```python
python manage.py shell
>>> from django.core.cache import cache
>>> from swaply.rate_limiting import RateLimiter
>>> 
>>> limiter = RateLimiter(max_attempts=100, window_minutes=60, block_minutes=60)
>>> key = limiter.get_key("user:74", "api")
>>> data = cache.get(key, {'attempts': 0})
>>> print(f"Attempts: {data.get('attempts', 0)}/100")
```

### Zisti všetky API volania (Frontend)
```js
window.__API_DEBUG__.print()
```

### Zisti všetky useEffect volania (Frontend)
```js
window.__USE_EFFECT_DEBUG__.print()
```

