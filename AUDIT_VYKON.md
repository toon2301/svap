# AUDIT ŠKÁLOVATEĽNOSTI A VÝKONU — Swaply

**Dátum:** 2026-06-21
**Cieľ:** preventívna pripravenosť na rádovo vyšší počet používateľov (100k+).
**Rozsah:** backend (Django/DRF), DB, Redis, deployment.

> **Hlavný záver:** Aplikácia je už dnes **prekvapivo dobre optimalizovaná** —
> kompozitné indexy na hot query patternoch, dôsledné `select_related`/
> `prefetch_related`/bulk-context (žiadne N+1 v hlavných endpointoch),
> denormalizovaná projekčná tabuľka pre vyhľadávanie, Redis cache, stránkovanie
> na hlavných zoznamoch. **Priame zmeny v tomto audite: žiadne** — nenašiel som
> bezpečný, izolovaný a jednoznačne prínosný zásah, ktorý by ešte chýbal.
> Skutočné budúce úzke miesta sú **infraštruktúrne** (web server, DB pooling)
> a **fulltext vyhľadávanie** (`iregex`/`icontains`) — tie vyžadujú tvoje
> potvrdenie, lebo nejde o malé aditívne zmeny.

---

## FÁZA A — ZMAPOVANIE INFRAŠTRUKTÚRY

### Databáza
- **Typ:** PostgreSQL v produkcii (cez `DATABASE_URL`), SQLite fallback pre lokál
  ([settings_split/database.py](svap/backend/swaply/settings_split/database.py)).
- **Connection pooling (Django-level):** `CONN_MAX_AGE=300` s (env `DB_CONN_MAX_AGE`),
  `CONN_HEALTH_CHECKS=True`, TCP keepalives (idle 30s/interval 10s/count 5),
  `connect_timeout=5s`. → perzistentné spojenia, dobré.
- **Externý pooler (PgBouncer):** **NIE je** v kóde/konfigurácii. Aplikácia sa
  spolieha výhradne na Django perzistentné spojenia.

### Redis
- **Jedno Redis** (alebo voliteľne dedikované cez `CACHE_REDIS_URL`/`CHANNELS_REDIS_URL`),
  používa sa na: **cache** (`django_redis`, `SOCKET_TIMEOUT=0.3s`,
  `IGNORE_EXCEPTIONS=True` → fail-open, `socket_keepalive=True`),
  **Channels layer** (WebSockety, `RedisChannelLayer`),
  **rate limiting** (cez cache backend),
  **unread-count cache / auth cache warming** (z predošlých auditov).
- **Pool:** `CACHE_REDIS_MAX_CONNECTIONS` nenastavené → default pool `django_redis`.
- **Sessions:** cookie/JWT model (HttpOnly cookies), **bez server-side session store**
  → Redis sa session-mi nezaťažuje. Dobré.

### Web server / runtime
- **Štart:** [start.sh](svap/backend/start.sh) podľa `APP_SERVER_MODE`:
  - `all` (**default**) → **daphne, jeden proces** (HTTP + WS naraz).
  - `http` → **gunicorn** (`WEB_CONCURRENCY=2` workers × `GUNICORN_THREADS=4`).
  - `ws` → daphne (len WebSockety).
- **Worker:** Celery (`worker: celery -A swaply worker`).
- **Migrácie:** `start-common.sh` spúšťa `migrate` + `collectstatic` **pri každom boote**.

### ⚠️ Infra zistenia (len report)
| # | Zistenie | Riziko pri 100k+ | Odporúčanie |
|---|---|---|---|
| A1 | Default `APP_SERVER_MODE=all` = **daphne jeden proces** | **Vysoké** – jediný async proces obsluhuje celé HTTP API; bez multi-workera je to tvrdý strop priepustnosti | Over, čo beží v prod. Pre HTTP prejsť na **gunicorn** (`APP_SERVER_MODE=http`, viac workerov + replicas), daphne nechať len na WS (`ws`) |
| A2 | Bez **PgBouncer** | **Stredné/vysoké** – `workers × replicas × CONN_MAX_AGE` perzistentných spojení môže vyčerpať Postgres `max_connections` (Railway má nízke limity) | Pridať PgBouncer (transaction pooling) pred Postgres, ALEBO ladiť `DB_CONN_MAX_AGE` vs. počet workerov |
| A3 | `migrate` pri **každom** boote | Stredné – pri viacerých replikách súčasný `migrate` = race/lock pri štarte | Spúšťať migrácie ako samostatný release/deploy krok (nie v každom web boote); `RUN_STARTUP_TASKS=0` na sekundárnych replikách |
| A4 | Počet replík nie je v kóde | — | Nastavenie na Railway dashboarde – over manuálne |

---

## FÁZA B — DATABÁZOVÉ INDEXY

Prešiel som hlavné modely a porovnal polia použité vo `filter()`/`exclude()`/
`order_by()`/JOIN s existujúcimi indexmi.

| Model.pole | Používa sa (kde) | Index? | Záver |
|---|---|---|---|
| `OfferedSkill (is_hidden, -created_at)` | base filter feedu/search + default sort | ✅ kompozitný `acc_off_skill_hidden_new_idx` | OK |
| `OfferedSkill (is_hidden, is_seeking, -created_at)` | filter typu (ponúkam/hľadám) | ✅ `acc_off_skill_type_new_idx` | OK |
| `OfferedSkill.country_code / district / price_from / created_at` | filtre vyhľadávania | ✅ jednotlivé indexy | OK |
| `OfferedSkill.district_code` | — | ❌ | **netreba** – nikde sa nefiltruje (len validácia v serializeri) |
| `OfferedSkill (user, category, subcategory)` | limit 3 karty / user lookup | ✅ `UniqueConstraint` (= index) | OK |
| `User.email / username / slug` | login, profil lookup | ✅ `unique=True` (= index) | OK |
| `User.subscription_tier` | entitlements | ✅ `db_index=True` | OK |
| `User (is_active, is_public)` | user-directory search (`search_global`, `dashboard search`) | ❌ (boolean) | **zámerne nepridané** – low-cardinality boolean → btree neselektívny; dominantný náklad je `iregex` (viď B-pozn.) |
| `Notification (user,is_read,created_at) / (user,type,is_read) / (user,created_at)` | feed + unread | ✅ 3 kompozitné | OK |
| `Message (conversation, created_at)` | message list (stránkovaný) | ✅ `msg_conv_created_at_idx` | OK |
| `Conversation (last_message_at + kompozitné)` | sidebar list | ✅ | OK |
| `ConversationParticipant (user,*) ×4` | prístupové/zoznamové dotazy | ✅ 4 kompozitné | OK |
| `Review (offer,created_at)/(reviewer,created_at)/(rating,created_at)` | reviews list + agregácie | ✅ 3 kompozitné | OK |
| `FavoriteUser (user, created_at)` | favorites list | ✅ `acc_fav_user_owner_created_idx` + unique | OK |
| `SkillRequest (recipient,status,created)/(requester,status,created)/(offer,created)` | received/sent listy, completed count | ✅ 3 kompozitné | OK |
| `EmailVerification.token` | verifikačný lookup | ✅ `unique=True` (= index) | OK |
| `WebPushSubscription (user,is_active)/(is_active,last_seen_at)` | push fan-out | ✅ | OK |
| `PortfolioItem (owner,*) / PortfolioImage (item,*)` | portfólio list | ✅ | OK |
| FK polia (`*_id`) všeobecne | JOIN-y | ✅ Django indexuje FK automaticky | OK |

**Záver B:** **žiadne jednoduché chýbajúce indexy.** Pridávať špekulatívne indexy
by len zvýšilo write overhead bez prínosu (porušilo by „nevytváraj zbytočnú
komplexitu"). **Nevytvorené žiadne migrácie.**

### B-pozn. (čaká na potvrdenie) — fulltext vyhľadávanie
`search.py`, `search_global.py`, `dashboard search` filtrujú cez
`category__iregex`, `tags__icontains`, `first_name__iregex`, … Tieto **nevedia
použiť B-tree index** a pri 100k+ záznamoch robia sekvenčný scan.
- **Odporúčanie:** `CREATE EXTENSION pg_trgm` + **GIN trigram indexy** na vyhľadávané
  textové stĺpce (príp. prechod z `iregex` na `ILIKE`/`%` alebo Postgres
  `SearchVector`/`tsvector`). **Nejde o aditívnu zmenu** (extension + prepis
  query + zmena accent-insensitive logiky) → **vyžaduje tvoje potvrdenie.**

---

## FÁZA C — N+1 QUERIES

Prešiel som hlavné list/detail endpointy. **Aplikácia je proti N+1 dôsledne
chránená** – nenašiel som N+1 v hot paths:

| Endpoint / queryset | Optimalizácia | N+1? |
|---|---|---|
| Offer listing / search ([`_skills_list_queryset`](svap/backend/accounts/views/skills.py)) | `select_related("user")` + `prefetch_related("images")` + `annotate(_avg_rating,_reviews_count,_likes_count)` | ❌ čisté |
| Offer serializer kontext ([`_skills_list_context`](svap/backend/accounts/views/skills.py)) | bulk dotazy pre `reviewed/can_review/request_status/liked` (namiesto `.exists()` per riadok) | ❌ čisté |
| Conversation list ([`view_helpers.py`](svap/backend/messaging/api/view_helpers.py)) | `Subquery` anotácie pre druhého účastníka, `Exists`, `unread_count` výraz, `Prefetch(participants, …).only()` | ❌ čisté |
| Notification list ([`notifications.py`](svap/backend/accounts/views/notifications.py)) | `select_related("actor","conversation","group_invitation","skill_request")`, cap `[:50]` | ❌ čisté |
| Portfolio list ([`portfolio/views.py`](svap/backend/portfolio/views.py)) | `select_related("owner","related_offer","cover_image")` + `prefetch_related(images)` | ❌ čisté |
| Reviews list ([`reviews.py`](svap/backend/accounts/views/reviews.py)) | `select_related("reviewer")` + `annotate(likes_count, Exists is_liked_by_me)` | ❌ čisté (ale unbounded — viď Fáza E) |
| Skill requests list ([`skill_requests.py`](svap/backend/accounts/views/skill_requests.py)) | široký `select_related(...)`, cap `[:MAX]`, bulk `reviewed_offer_ids` | ❌ čisté |
| Favorites list ([`favorites.py`](svap/backend/accounts/views/dashboard_views/favorites.py)) | `select_related("favorite_user").only(...)` | ❌ čisté |

**Pozn. (mitigované, nie chyba):** `OfferedSkillSerializer.get_can_review/
already_reviewed/is_liked_by_me` majú **fallback** na per-riadkový `.exists()`,
ak v kontexte chýba bulk množina. Overené: **všetky** miesta, kde sa serializer
používa so zoznamom, predávajú `_skills_list_context(...)` → fallback sa
nespustí. Žiadny zásah netreba. **Žiadne zmeny kódu.**

---

## FÁZA D — RATE LIMITING (len report)

Mechanizmus: [`swaply/rate_limiting.py`](svap/backend/swaply/rate_limiting.py),
Redis-based, identifikátor `user:{id}` (prihlásený) / `ip:{addr}` (anonym).

**Pokrytie drahých/write endpointov — dobré:**
| Endpoint | Dekorátor | Limit |
|---|---|---|
| Vytvorenie/úprava karty, upload fotiek (`skills_*`) | `api_rate_limit` | 1000 / 60 min |
| Search / global search / dashboard search | `api_rate_limit` | 1000 / 60 min |
| Odoslanie správy (`message POST`) | `messaging_send_rate_limit` | 120 / 5 min |
| Otvorenie konverzácií / mark-read | `messaging_open/mark_read_rate_limit` | 30–300 / 5 min |
| Kontaktný formulár | `contact_form_rate_limit` | 5 / 60 min |
| Auth (login/register/reset/resend/email-check) | dedikované limity | rôzne |

**Premyslené detaily:** autentifikované `GET/HEAD/OPTIONS` **preskakujú** rate
limiting (žiadny Redis roundtrip, nižšia latencia); limit dopadá len na **zápisy
a anonymné** requesty.

**Zistenia (odporúčania, NEIMPLEMENTOVANÉ):**
| # | Zistenie | Odporúčanie |
|---|---|---|
| D1 | **Žiadny globálny per-IP throttle** na úrovni middleware – ochrana je len per-endpoint | Zvážiť edge/WAF limit na Railway, alebo tenký global middleware throttle (per-IP) ako poistku |
| D2 | Anonymný **search/global-search** (`AllowAny`) je drahý (`iregex` scan) a má len zdieľaný `api` limit 1000/h | Dedikovaný, prísnejší limit pre anonymný search (napr. 60–120/h/IP), alebo vyžadovať auth |
| D3 | `api_rate_limit` zdieľa jeden counter (`action="api"`) naprieč endpointmi | OK kým platí D2; prípadne rozdeliť na jemnejšie akcie ak narastie write-traffic |

> Neimplementujem podľa zadania – nesprávny limit môže blokovať legitímnych
> používateľov. Čakám na tvoje potvrdenie konkrétnych hodnôt.

---

## FÁZA E — VÝKON KRITICKÝCH ENDPOINTOV

| Endpoint | Odhad DB queries / request | Stránkované? | Status |
|---|---|---|---|
| Offer feed / search (`GET /search/`) | ~4–6 (count + page + prefetch images + bulk context) | ✅ Paginator, `page_size` 12 (max 50) | OK |
| Global search (`GET /search/global/`) | ~6–8 (users + offers, oba paginované) | ✅ offset/limit | OK (pozri B-pozn. iregex) |
| Dashboard search | ~4–6 (projekčná tabuľka + page load) | ✅ Paginator | OK |
| Conversation list | ~3 (count + page + prefetch participants) | ✅ `PageNumberPagination` 20 (max 100) | OK |
| Message list | ~2–3 | ✅ `MessagePagination` | OK |
| Notification list | ~1 (`select_related` + cap 50) | ⚠️ cap, bez offsetu | OK (bounded) |
| `/me/` profil | nízke (cache warm + serializer) | n/a (single) | OK |

### 🔴 Kritický nález E1 — Reviews list NIE je stránkovaný
[`reviews.py:101`](svap/backend/accounts/views/reviews.py) — `GET /api/auth/skills/<offer_id>/reviews/`
vracia **všetky recenzie ponuky naraz** (žiadny `Paginator`/cap). Pri populárnom
poskytovateľovi (veľa dokončených spoluprác) to časom môže byť veľká odpoveď.

**Prečo to NEOPRAVUJEM rovno (čaká na potvrdenie):**
1. **Frontend kontrakt:** FE konzumuje endpoint ako **holé pole** —
   `api.get<Review[]>(endpoints.reviews.list(offerId))`
   ([OfferReviewsView.tsx:152](svap/frontend/src/components/dashboard/modules/reviews/OfferReviewsView.tsx)).
   Zmena na `{results: [...]}` by **rozbila FE** → nejde o backend-only izolovanú zmenu.
2. **Semantika viditeľnosti recenzií** (napr. odpoveď majiteľa na staršiu recenziu)
   – tichý cap by mohol skryť staršie recenzie.
3. Reálne číslo recenzií je ohraničené **počtom dokončených spoluprác** na ponuke,
   takže riziko je *stredné*, nie akútne.

**Dve možnosti na tvoje rozhodnutie:**
- **(A) Spätne kompatibilný cap (malá, bezpečná):** ponechať holé pole, ale vrátiť
  len najnovších N (napr. 100) – bez zmeny FE. Rýchle, ohraničí worst-case payload.
- **(B) Plná pagination (väčšia):** nový tvar odpovede `{results, page, …}` +
  úprava FE (infinite scroll / stránkovanie v `OfferReviewsView`). Čistejšie do
  budúcna, ale vyžaduje koordinovanú FE zmenu.

> Odporúčam **(A) ako interim** a **(B)** keď sa bude robiť FE na recenziách.
> Daj vedieť, ktorú možnosť a akú hodnotu N, a doplním aj testy + preklady.

---

## ZHRNUTIE

### Opravené rovno (Fázy B/C/E)
- **Žiadne.** Codebase je v auditovaných oblastiach už optimalizovaný; nenašiel
  som bezpečný, izolovaný a jednoznačne prínosný zásah, ktorý by chýbal.

### Nové migrácie
- **Žiadne** (`makemigrations --check` → *No changes detected*).

### Čaká na tvoje potvrdenie (s dôvodom)
| ID | Téma | Prečo nie rovno |
|---|---|---|
| A1 | daphne → gunicorn + replicas pre HTTP | Infra/deployment zmena, mimo kódu, vysoký dopad |
| A2 | PgBouncer pred Postgres | Infra zmena |
| A3 | migrácie mimo web boot | Deployment proces |
| B-pozn. | pg_trgm GIN / tsvector pre fulltext | DB extension + prepis query, nie aditívne |
| D1–D3 | global throttle / prísnejší anon-search limit | Nesprávny limit blokuje legit users |
| E1 | pagination reviews endpointu | Rozbíja FE bare-array kontrakt; treba koordinovanú FE zmenu |

### Výsledok kontrol
- `python manage.py check` → **0 issues**.
- `python manage.py makemigrations --check --dry-run` → **No changes detected**
  (audit nezanechal žiadne model zmeny).
- Žiadne zmeny kódu → **žiadne riziko regresie**; existujúce flows nedotknuté.

### Najvyššia priorita do budúcna (poradie)
1. **A1** (web server – jednoznačne najtvrdší strop priepustnosti pri raste).
2. **A2** (DB pooling – aby spojenia nevyčerpali Postgres pri viac workeroch/replikách).
3. **B-pozn.** (fulltext – `iregex` scan je hlavná DB záťaž pri 100k+ ponukách).
4. **E1 + D2** (reviews pagination, prísnejší anon-search limit).
