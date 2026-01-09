# 🔍 Systémový Debugging 429 Chýb - Kompletný Návod

## Cieľ
Presne zistiť, **ktoré API volania** a **kedy** spôsobujú 429 chyby, aby sme ich mohli definitívne vyriešiť.

---

## 📊 Metóda 1: Frontend API Debug (OKAMŽITÉ)

### Ako použiť:
1. Otvor **Chrome DevTools** (F12)
2. Prejdi na **Console** tab
3. Napíš: `window.__API_DEBUG__.print()`

### Čo uvidíš:
- Zoznam všetkých API volaní zoskupených podľa endpointu
- Počet volaní pre každý endpoint
- Časové razítka
- Status kódy (vrátane 429)

### Príklad výstupu:
```
GET /auth/dashboard/users/slug/zuzana.chudjakova/profile/ - 15 calls
GET /auth/skills/ - 8 calls
GET /auth/dashboard/search/ - 12 calls
```

---

## 📊 Metóda 2: Backend Logging (DETAILNÉ)

### Čo sa deje:
Backend už loguje 429 chyby, ale môžeme pridať **detailnejšie logy** pre každý request.

### Ako zistiť:
1. Otvor **backend konzolu** (kde beží Django server)
2. Keď sa objaví 429, uvidíš:
   ```
   WARNING: Rate limit exceeded for user:74 on action api
   - request_path: /api/auth/dashboard/users/slug/zuzana.chudjakova/profile/
   - request_method: GET
   - remaining_attempts: 0
   ```

### Čo to znamená:
- **user:74** = používateľ s ID 74
- **action api** = používa sa `api_rate_limit` (100 requestov za 60 minút)
- **request_path** = ktorý endpoint bol volaný

---

## 📊 Metóda 3: Chrome Network Tab (VIZUÁLNE)

### Ako použiť:
1. Otvor **Chrome DevTools** (F12)
2. Prejdi na **Network** tab
3. Aktivuj **Preserve log** (aby sa logy nezmažali pri navigácii)
4. Filtruj podľa **Status Code: 429**
5. Pozri si **Waterfall** - zobrazí časovú os volaní

### Čo hľadať:
- **Časové rozloženie** - sú volania súčasné alebo postupné?
- **Ktoré endpointy** majú 429?
- **Ako často** sa opakujú?

---

## 📊 Metóda 4: React useEffect Tracking (INFINITE LOOPS)

### Ako použiť:
1. V `SearchModule.tsx` alebo `Dashboard.tsx` pridaj na začiatok:
   ```ts
   import { useEffectDebugger } from '@/utils/useEffectDebugger';
   ```
2. Namiesto `useEffect` použij `useEffectDebugger`:
   ```ts
   useEffectDebugger(() => {
     // tvoj kód
   }, [dependencies], 'Názov useEffect');
   ```
3. V konzole uvidíš, ktoré `useEffect` sa volajú opakovane

### Čo hľadať:
- `useEffect` ktoré sa volajú **viac ako 5x za sekundu**
- `useEffect` s **objektmi v dependencies** namiesto primitívov

---

## 📊 Metóda 5: Backend Cache Inspection (AKTUÁLNY STAV)

### Ako zistiť aktuálny stav rate limitu:

1. Otvor **Django shell**:
   ```bash
   python manage.py shell
   ```

2. Spusti tento kód:
   ```python
   from django.core.cache import cache
   from swaply.rate_limiting import RateLimiter
   import hashlib
   
   # Pre tvojho používateľa (napr. ID 74)
   user_id = 74
   identifier = f"user:{user_id}"
   action = "api"
   
   # Zisti aktuálny stav
   limiter = RateLimiter(max_attempts=100, window_minutes=60, block_minutes=60)
   key = limiter.get_key(identifier, action)
   data = cache.get(key, {'attempts': 0, 'first_attempt': None})
   
   print(f"Key: {key}")
   print(f"Attempts: {data.get('attempts', 0)}")
   print(f"First attempt: {data.get('first_attempt')}")
   print(f"Remaining: {100 - data.get('attempts', 0)}")
   ```

---

## 📊 Metóda 6: Systematický Test Scenár

### Postup:
1. **Vyčisti cache**:
   ```bash
   # V Django shell
   from django.core.cache import cache
   cache.clear()
   ```

2. **Vyčisti frontend localStorage**:
   ```js
   // V Chrome Console
   localStorage.clear();
   sessionStorage.clear();
   ```

3. **Refreshni stránku** (F5)

4. **Postupne testuj**:
   - Otvor dashboard
   - Klikni na search
   - Vyhľadaj niečo
   - Klikni na profil
   - Atď.

5. **Sleduj v reálnom čase**:
   - Chrome Console: `window.__API_DEBUG__.print()` po každom kroku
   - Backend konzola: sleduj logy
   - Network tab: filtruj 429

---

## 🎯 Čo presne hľadať:

### 1. **Opakujúce sa volania toho istého endpointu**
   - Ak vidíš `GET /auth/dashboard/users/slug/.../profile/` 10x za sekundu = problém

### 2. **useEffect s objektmi v dependencies**
   - `[user]` namiesto `[user?.id]` = nekonečná slučka

### 3. **Chýbajúce request deduplication**
   - Rovnaký request sa volá súčasne viackrát

### 4. **Chýbajúci cooldown**
   - Requesty sa volajú okamžite po sebe bez pauzy

---

## 📝 Reporting Template

Keď nájdeš 429, zapíš si:

```
Čas: [HH:MM:SS]
Endpoint: [presný URL]
Počet volaní: [číslo]
Časový rozsah: [napr. 5 sekúnd]
useEffect: [ktorý useEffect to spôsobuje, ak vieš]
Backend log: [skopíruj z backend konzoly]
```

---

## 🚀 Rýchle Akcie

### Ak vidíš 429 hneď teraz:

1. **Chrome Console**:
   ```js
   window.__API_DEBUG__.print()
   ```

2. **Backend konzola** - pozri posledné logy

3. **Network tab** - filtruj 429, pozri ktoré endpointy

4. **Zdieľaj výsledky** - a môžeme presne opraviť problém

---

## 💡 Tipy

- **Preserve log** v Network tab - aby sa logy nezmažali
- **Throttling** v Network tab - nastav "Slow 3G" aby bolo vidieť timing
- **React DevTools Profiler** - zisti, ktoré komponenty re-renderujú často

