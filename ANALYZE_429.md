# 📊 Analýza 429 Chýb - Normálne Používanie

## Problém
Používateľ **normálne používa aplikáciu** (nič špeciálne nerobí) a aj tak dostáva 429 chyby.

## Aktuálny stav

### Backend Rate Limit
- **Limit**: 100 requestov za 60 minút
- **Action**: `api` (pre všetky API endpointy)
- **Block**: 60 minút po prekročení

### Zistenia z debugu
- `GET /auth/me/` - 1 volanie
- `GET /auth/dashboard/users/slug/.../profile/` - 2 volania (429)
- `GET /auth/skills/` - 1 volanie (429)
- `GET /auth/dashboard/users/:id/skills/` - 1 volanie (429)

**Všetky requesty dostali 429** = limit bol už prekročený z predchádzajúcich session.

## Možné príčiny

### 1. Limit je príliš nízky
Ak používateľ:
- Otvorí dashboard (1-2 requesty)
- Klikne na search (1 request)
- Otvorí profil (1-2 requesty)
- Prejde medzi modulmi (1-2 requesty za modul)
- **5-10 session za hodinu = 25-50 requestov**
- **Ak používa aplikáciu aktívne = 100+ requestov za hodinu**

### 2. Requesty sa volajú zbytočne
- Re-rendery spúšťajú nové requesty
- useEffect slučky
- Chýbajúca cache kontrola
- Duplicitné volania

### 3. Cache sa nevyužíva správne
- Cache TTL je 60 sekúnd (príliš krátky?)
- Cache sa nevyužíva pred volaním API
- Requesty sa volajú aj keď sú dáta v cache

## Riešenia

### Riešenie 1: Zvýšiť limit (RÝCHLE)
```python
# backend/swaply/rate_limiting.py
api_rate_limit = rate_limit(max_attempts=200, window_minutes=60, block_minutes=60, action='api')
```
**Pros**: Rýchle riešenie
**Cons**: Nevyrieši root cause, len odloží problém

### Riešenie 2: Zlepšiť cache (DOPORUČENÉ)
- Zvýšiť cache TTL na 5-10 minút
- Vždy skontrolovať cache pred volaním API
- Použiť stale-while-revalidate pattern

### Riešenie 3: Request deduplication (DOPORUČENÉ)
- Pridať deduplication pre všetky API volania
- Cooldown mechanizmus (2 sekundy)
- Zdieľať in-flight requests medzi komponentmi

### Riešenie 4: Kombinácia (NAJLEPŠIE)
1. Zvýšiť limit na 200/60min (bezpečnostná rezerva)
2. Zlepšiť cache (TTL 5 min, vždy kontrolovať)
3. Pridať deduplication všade
4. Pridať cooldown (2 sekundy)

## Testovanie

### Krok 1: Zmeraj normálne používanie
```js
// V Chrome Console
window.__API_DEBUG__.clear();
// Teraz normálne používaj aplikáciu 5 minút
window.__API_DEBUG__.print();
```

### Krok 2: Zisti, koľko requestov sa volá
- Počet requestov za 5 minút
- Počet requestov za hodinu (odhad)
- Ktoré endpointy sa volajú najčastejšie

### Krok 3: Porovnaj s limitom
- Ak je počet requestov < 50 za hodinu = problém je v zbytočných volaniach
- Ak je počet requestov > 100 za hodinu = limit je príliš nízky

## Odporúčanie

**Okamžite**:
1. Zvýšiť limit na 200/60min (bezpečnostná rezerva)
2. Vyčistiť rate limit cache pre používateľov

**Potom**:
3. Pridať request deduplication
4. Zlepšiť cache (TTL, kontrola)
5. Pridať cooldown

