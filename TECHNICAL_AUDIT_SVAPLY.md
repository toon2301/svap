# Technický audit – Svaply (Swaply)

Čistý technický prehľad z kódu. Ak niečo nie je z kódu zistené, je explicitne uvedené.

---

## 1. Aktuálna architektúra

| Vrstva | Technológia |
|--------|-------------|
| **Backend** | Django 4.2.7, DRF, ASGI (Daphne) – jediný proces (HTTP + WebSocket) |
| **Frontend** | Next.js 14 (App Router), React 18, samostatná aplikácia na inej doméne/origin |
| **Databáza** | PostgreSQL (cez `DATABASE_URL`) alebo SQLite fallback |
| **Cache / session** | Redis (cez `REDIS_URL`) alebo `LocMemCache` fallback |
| **WebSocket** | Django Channels + Redis Channel Layer (alebo InMemory ak nie je REDIS_URL) |
| **Infra** | Docker (Python 3.11-slim), Procfile pre Daphne, Railway (z ALLOWED_HOSTS / settings_production), S3 pre media (produkcia) |

Backend nepodáva frontendové HTML; frontend beží oddelene (napr. Next na inom hoste).

---

## 2. Technológie a verzie

**Backend (requirements.txt):**
- Django 4.2.7, djangorestframework 3.14.0, djangorestframework-simplejwt 5.3.0
- django-cors-headers 4.3.1, django-filter 23.3
- psycopg2-binary 2.9.7, redis 5.0.1, django-redis 5.4.0
- channels 4.1.0, channels-redis 4.2.0, daphne 4.1.2
- Pillow 10.1.0, whitenoise 6.6.0, django-storages[boto3] 1.14.2, boto3 1.34.50
- gunicorn 21.2.0 (v Procfile sa nepoužíva – beží Daphne)
- python-dotenv 1.1.1, django-allauth 0.57.0 (v kóde DOČASNE VYPNUTÉ)
- requests 2.31.0, pyotp 2.9.0, bleach 6.1.0
- google-cloud-vision 3.4.5
- pytest / pytest-django / pytest-cov pre testy

**Frontend (package.json):**
- Next 14.2.x, React 18.3.1
- axios 1.6.2, js-cookie 3.0.5
- @tanstack/react-query 5.89.x, framer-motion, next-intl, react-google-recaptcha-v3
- Tailwind 3.4.x, TypeScript 5.x
- Jest + Testing Library pre testy

**Python:** 3.11 (z Dockerfile).

---

## 3. Štruktúra priečinkov

**Backend (výber):**
```
backend/
├── accounts/                    # Hlavná app – User, auth, profil, skills, requests, reviews, notifications
│   ├── models.py                # User, UserProfile, EmailVerification, OfferedSkill, OfferedSkillImage, SkillRequest, Notification, Review
│   ├── authentication.py       # SwaplyJWTAuthentication, SwaplyRefreshToken (cookie-only, blacklist Redis/fallback)
│   ├── serializers.py
│   ├── urls.py                  # Všetky /api/auth/... routes
│   ├── views/
│   │   ├── auth.py              # register, login, logout, me, verify-email, resend-verification, csrf-token
│   │   ├── token_refresh_cookie.py
│   │   ├── google_oauth_simple.py
│   │   ├── password_reset.py
│   │   ├── profile.py, skills.py, skill_requests.py, reviews.py, notifications.py
│   │   ├── dashboard_views/    # home, search, favorites, profile, public_profiles, settings
│   │   └── email_check.py
│   ├── consumers.py             # NotificationConsumer (WebSocket)
│   ├── management/commands/
│   └── test/
├── swaply/                      # Projekt settings + middleware + routing
│   ├── settings.py              # Facade, import z settings_split
│   ├── settings_production.py   # Production overrides (DEBUG=False, ALLOWED_HOSTS, S3, CORS, …)
│   ├── settings_split/          # base, security, apps, database, jwt, cors_csrf, cache, rate_limiting_cfg, auth, channels_cfg, …
│   ├── settings_parts/         # cache (build_caches)
│   ├── middleware.py            # GlobalErrorHandling, SecurityHeaders, EnforceCSRFMiddleware
│   ├── rate_limiting.py         # RateLimiter, decorators (login, register, password_reset, email_verification, api, email_check)
│   ├── ws_auth.py               # JWT auth pre WebSocket (cookie access_token)
│   ├── routing.py               # websocket_urlpatterns -> /ws/notifications/
│   ├── asgi.py                  # ProtocolTypeRouter (http + websocket)
│   ├── urls.py                  # api/, api/token/, api/auth/, api/profile/, api/admin/init-db/, api/csrf-token/, admin/
│   ├── migrate_api.py           # init-db endpoint (MIGRATE_SECRET, MIGRATIONS_API_ENABLED)
│   ├── audit_logger.py
│   └── test/
├── requirements.txt, Dockerfile, Procfile, start.sh
```

**Frontend (výber):**
```
frontend/
├── src/
│   ├── app/                     # Next App Router (page.tsx, layout, auth/callback, verify-email, dashboard/…)
│   ├── components/              # LoginForm, dashboard (Dashboard, ModuleRouter, profile, skills, requests, reviews, …)
│   ├── contexts/                # AuthContext, RequestsNotificationsContext
│   ├── lib/                     # api.ts (axios, withCredentials, CSRF, refresh intercept)
│   ├── utils/                   # auth.ts (auth_state cookie), csrf.ts (fetchCsrfToken, getCsrfToken)
│   └── …
├── public/
├── package.json, next.config, tailwind.config, tsconfig, jest
```

---

## 4. Autentifikácia

- **Model:** JWT (access + refresh) cez **HttpOnly cookies**; frontend nečíta tokeny, len `auth_state` cookie pre UI.
- **Access token:** cookie `access_token`, životnosť 15 min, HS256, `user_id` claim. Backend berie **iba** cookie (Authorization header sa v `SwaplyJWTAuthentication` ignoruje).
- **Refresh token:** cookie `refresh_token`, 7 dní; rotácia zapnutá (`ROTATE_REFRESH_TOKENS`), blacklist po rotácii (`BLACKLIST_AFTER_ROTATION`).
- **Refresh mechanizmus:** POST `/api/token/refresh/` s `withCredentials`; backend číta `refresh_token` z cookie, vracia nový access (a pri rotácii nový refresh) a nastavuje cookies. Frontend pri 401 volá tento endpoint a retry pôvodnej požiadavky; pri zlyhaní refreshu vyčistí stav a redirect na `/`.
- **Login:** `/api/auth/login/` vracia access + refresh a nastaví cookies (`_set_auth_cookies`) + `auth_state=1`. Ďalej existuje account lockout (5 neúspešných pokusov / 15 min) cez cache kľúče `login_failures:{email}`, `login_locked:{email}` (len pre existujúce účty).
- **Logout:** `/api/auth/logout/` – blacklist refresh tokenu (DB + Redis/cache), vymazanie cookies.
- **WebSocket:** `JwtAuthMiddleware` číta z cookie `access_token` a nastaví `scope["user"]`; bez tokena zostane AnonymousUser.

---

## 5. Modely databázy a vzťahy

- **User (AbstractUser):** email (USERNAME_FIELD), user_type (individual/company), profilové polia (phone, bio, avatar, location, slug, …), is_verified, is_public, name_modified_by_user. `slug` pre verejné URL.
- **UserProfile:** 1:1 s User (preferencie, notifikácie, súkromie, mfa_enabled / mfa_secret).
- **EmailVerification:** FK User, token (UUID), verified_at, is_used; expirácia 48 h.
- **OfferedSkill:** FK User (vlastník), category, subcategory, description, tags, cena, district, location, is_seeking, is_hidden, atď. Unique (user, category, subcategory).
- **OfferedSkillImage:** FK OfferedSkill, image, order.
- **SkillRequest:** requester (FK User), recipient (FK User), offer (FK OfferedSkill), status (pending/accepted/rejected/cancelled), hidden_by_requester/recipient. Unique (requester, offer).
- **Notification:** FK User, type, title, body, data (JSON), FK SkillRequest (nullable), is_read, read_at.
- **Review:** reviewer (FK User), offer (FK OfferedSkill), rating (0–5, kroky 0.5), text, pros/cons (JSON). Unique (reviewer, offer).

Vzťahy: User → offered_skills, sent_skill_requests, received_skill_requests, notifications, reviews_written; OfferedSkill → skill_requests, reviews; SkillRequest → notifications.

---

## 6. Autorizácia a permissions

- **Globálne (DRF):** `DEFAULT_PERMISSION_CLASSES = [IsAuthenticated]`; `DEFAULT_AUTHENTICATION_CLASSES = [SwaplyJWTAuthentication]`.
- **Endpointy:** Väčšina dashboard/skills/requests/reviews/notifications má `@permission_classes([IsAuthenticated])`. Verejné: register, login, logout, verify-email, resend-verification, csrf-token, password-reset, OAuth callbacky, token/refresh, check-email, init-db (chránené MIGRATE_SECRET) – tieto majú `AllowAny`.
- **Objektová autorizácia** je riešená manuálne v view vrstve (nie Django/DRF object permissions):
  - **Skills:** `skills_detail_view` – GET zobrazí cudziu kartu len ak nie je skrytá a profil je verejný; PUT/PATCH/DELETE len ak `skill.user_id == request.user.id`, inak 404.
  - **Skill requests:** Zoznam filtrovaný podľa requester/recipient; detail a akcie (accept/reject/cancel/hide) – kontrola `requester_id` / `recipient_id` vs `request.user.id`.
  - **Reviews:** POST – zákaz recenzovať vlastnú ponuku; GET – zoznam recenzií len ak ponuka nie je skrytá a profil verejný; detail a DELETE – len vlastník recenzie (`review.reviewer_id == request.user.id`) resp. vlastník ponuky pre „zmazať cudziu recenziu“ (ak je to v kóde).
  - **Profil/draft:** `user_id = request.user.id` pri ukladaní draftu a profile; dashboard user profile detail podľa user_id/slug – zmeny len pre vlastníka.

Žiadna jednotná vrstva typu DRF `ObjectLevelPermission` ani Django `ModelAdmin`/guard – všetko je explicitná logika v views.

---

## 7. Rate limiting a brute-force ochrana

- **Implementácia:** `swaply.rate_limiting` – trieda `RateLimiter` (cache-backed), decorator `rate_limit(max_attempts, window_minutes, block_minutes, action)`.
- **Identifikátor:** ak je používateľ prihlásený: `user:{user.id}`, inak `ip:{REMOTE_ADDR}`. X-Forwarded-For sa v decoratori nepoužíva (len v `get_client_ip`), t.j. limit je väčšinou podľa IP.
- **Aplikované limity:**
  - **login:** 20 (DEBUG) / 10 (prod) pokusov / 15 min, block 5 / 30 min – `@login_rate_limit` na `login_view`.
  - **register:** 3 / 15 min, block 30 min – `@register_rate_limit` na `register_view`.
  - **email_verification:** 5 / 15 min, block 60 min – na verify a resend.
  - **api:** 1000 / 60 min, block 60 min – na skills, skill_requests, reviews (api_rate_limit).
  - **email_check:** 30 / 10 min, block 30 min.
- **Password reset:** V `rate_limiting.py` je definovaný `password_reset_rate_limit` (3/60 min, block 120 min), ale **nie je aplikovaný** na views v `password_reset.py` – endpointy pre password reset nie sú rate-limited.
- **Config:** V testoch je rate limiting vypnutý (`RATE_LIMIT_DISABLED` / `RATE_LIMITING_ENABLED`). V DEBUG je `/api/auth/register/` v `RATE_LIMIT_ALLOW_PATHS` a miernejšie overrides pre register.
- **Brute-force:** Login má navyše account lockout (5 failures / 15 min) per email v cache; rate limit je navyše per IP/user. Spolu rozumná ochrana prihlásenia; chýba rate limit na password reset.

---

## 8. CSRF, CORS, HTTPS

**CSRF:**
- Pre API (cesty začínajúce `/api/`) je vynucovaný CSRF cez `EnforceCSRFMiddleware` pre POST/PUT/PATCH/DELETE; token z hlavičky `X-CSRFToken` alebo cookie `csrftoken`.
- `CSRF_ENFORCE_API` = True v produkcii; v DEBUG môže byť False (a v testoch sa nevyžaduje).
- `CSRF_TRUSTED_ORIGINS` z env (alebo z CORS_ALLOWED_ORIGINS). Cookie: `CSRF_COOKIE_HTTPONLY = False` (aby ho frontend mohol poslať v hlavičke), SameSite=None v prod (cross-origin), Lax v DEBUG.
- Frontend: pred mutujúcimi requestmi volá `getCsrfToken()` (z response body pri cross-origin alebo z cookie) a posiela `X-CSRFToken`.

**CORS:**
- `django-cors-headers`: `CORS_ALLOWED_ORIGINS` z env (default localhost:3000, 127.0.0.1:3000), `CORS_ALLOW_CREDENTIALS = True`, `CORS_ALLOW_ALL_ORIGINS = False`. Explicitný zoznam allowed headers (vrátane x-csrftoken, authorization) a methods.

**HTTPS / security headers:**
- `SECURE_SSL_REDIRECT` = not DEBUG; `SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")`; HSTS 1 rok v prod; X-Frame-Options DENY; X-Content-Type-Options nosniff; Referrer-Policy strict-origin-when-cross-origin; SecurityHeadersMiddleware pridáva ďalšie hlavičky.
- Session/CSRF cookies: Secure v prod, HttpOnly pre session (pre JWT sú access/refresh v HttpOnly).

---

## 9. API endpointy – zoznam a účel

| Endpoint | Metóda | Auth | Účel |
|----------|--------|------|------|
| `/api/` | GET | - | Root / info |
| `/api/token/` | POST | - | JWT obtain pair (DRF default; možno menej používaný pri cookie flow) |
| `/api/token/refresh/` | POST | - | Refresh token z cookie, vráti nové cookies |
| `/api/csrf-token/` | GET | - | CSRF token (pre cross-origin) |
| `/api/auth/` | include | - | Všetky nižšie pod /api/auth/ |
| `/api/auth/csrf-token/` | GET | - | CSRF token |
| `/api/auth/register/` | POST | - | Registrácia (rate limit 3/15min) |
| `/api/auth/login/` | POST | - | Prihlásenie, cookies (rate limit + lockout) |
| `/api/auth/logout/` | POST | cookie | Logout, blacklist refresh |
| `/api/auth/me/` | GET | cookie | Aktuálny user |
| `/api/auth/ping/` | GET | - | Ping |
| `/api/auth/verify-email/` | POST | - | Overenie emailu (token) |
| `/api/auth/resend-verification/` | POST | - | Znovu poslať verifikačný email |
| `/api/auth/check-email/<email>/` | GET | - | Dostupnosť emailu |
| `/api/auth/password-reset/` | POST | - | Žiadosť o reset hesla (bez rate limitu) |
| `/api/auth/password-reset/<uidb64>/<token>/` | POST | - | Potvrdenie nového hesla |
| `/api/auth/password-reset-verify/<uidb64>/<token>/` | GET | - | Overenie platnosti tokenu |
| `/api/auth/oauth/google/login/` | GET | - | Redirect na Google OAuth |
| `/api/auth/oauth/google/callback/` | GET | - | Google callback, nastavenie cookies |
| `/api/auth/profile/` | GET/PUT/PATCH | cookie | Profil aktuálneho usera |
| `/api/auth/draft/`, `.../clear/` | GET/POST/DELETE | cookie | Drafty podľa typu |
| `/api/auth/dashboard/home/` | GET | cookie | Dashboard home |
| `/api/auth/dashboard/search/` | GET | cookie | Vyhľadávanie |
| `/api/auth/dashboard/favorites/` | GET | cookie | Obľúbené |
| `/api/auth/dashboard/profile/` | GET | cookie | Dashboard profil |
| `/api/auth/dashboard/users/<id>/profile/` | GET | cookie | Verejný profil usera |
| `/api/auth/dashboard/users/<id>/skills/` | GET | cookie | Zručnosti usera |
| `/api/auth/dashboard/users/slug/<slug>/profile/` | GET | cookie | Profil podľa slug |
| `/api/auth/dashboard/users/slug/<slug>/skills/` | GET | cookie | Zručnosti podľa slug |
| `/api/auth/dashboard/settings/` | GET | cookie | Nastavenia |
| `/api/auth/skills/` | GET, POST | cookie | Zoznam / vytvorenie skillov |
| `/api/auth/skills/<id>/` | GET, PUT, PATCH, DELETE | cookie | Detail skillu (vlastník len pre zápis) |
| `/api/auth/skills/<id>/images/`, `.../<img_id>/` | GET, POST, DELETE | cookie | Obrázky ponuky |
| `/api/auth/skills/<offer_id>/reviews/` | GET, POST | cookie | Zoznam / vytvorenie recenzií |
| `/api/auth/reviews/<id>/` | GET, DELETE | cookie | Detail / zmazanie recenzie |
| `/api/auth/skill-requests/` | GET, POST | cookie | Zoznam / vytvorenie žiadostí |
| `/api/auth/skill-requests/status/` | GET | cookie | Stav žiadostí |
| `/api/auth/skill-requests/<id>/` | GET, PATCH | cookie | Detail, accept/reject/cancel/hide |
| `/api/auth/notifications/` | GET | cookie | Zoznam notifikácií |
| `/api/auth/notifications/unread-count/` | GET | cookie | Počet neprečítaných |
| `/api/auth/notifications/mark-all-read/` | POST | cookie | Označiť všetko ako prečítané |
| `/api/profile/` | GET/PUT/PATCH | cookie | Alias profilu (update_profile_view) |
| `/api/oauth/google/login/`, `callback/` | GET | - | Aliasy pre Google OAuth |
| `/api/admin/init-db/` | POST (GET v DEBUG) | MIGRATE_SECRET | Spustenie migrácií (MIGRATIONS_API_ENABLED=1) |
| `/admin/` | - | Django admin | Admin rozhranie |

WebSocket: `ws/notifications/` – JWT z cookie, notifikácie v reálnom čase.

---

## 10. Potenciálne bezpečnostné slabiny

1. **Password reset bez rate limitu** – `password_reset_request_view` a súvisiace endpointy nemajú `@password_reset_rate_limit`; možný abuse (spam emailov, enumerácia emailov).
2. **Token refresh bez rate limitu** – `/api/token/refresh/` je AllowAny a nie je rate-limited; pri cookie theft možný vysoký počet refreshov (obmedzuje to hlavne rotácia a blacklist).
3. **Init-db endpoint** – závisí od `MIGRATE_SECRET` a `MIGRATIONS_API_ENABLED`; ak niekto zapne a secret unikne, možnosť spúšťať migrácie. GET v DEBUG s secret v query môže byť v logoch.
4. **ALLOW_UNVERIFIED_LOGIN = True** – prihlásenie bez overeného emailu je povolené (aj v prod ak sa nezmení); závisí od produktovej politiky.
5. **CORS v produkcii** – v `settings_production.py` je fallback `CORS_ALLOWED_ORIGINS = ["https://antonchudjak.pythonanywhere.com"]` ak env je prázdny; doména by mala zodpovedať skutočnému frontendu (svaply.com / Railway).
6. **IP pre rate limit** – bez spoľahlivého nastavenia X-Forwarded-For (napr. v proxy) sa používa REMOTE_ADDR; za spoločným NAT/proxy môžu používatelia zdieľať limit.
7. **Objektová autorizácia** – je v views roztrúsená; ľahko pri novom endpointe zabudnúť na kontrolu vlastníctva. Odporúčanie: jednotná vrstva (napr. DRF permission classes) pre objekty.
8. **Fail-open pri rate limit** – pri zlyhaní cache (Redis down) decorator povoľuje request; zámerné, ale znamená to dočasné vypnutie rate limitov.

---

## 11. Nedokončené / rizikové časti

1. **Django Allauth** – zakomentované (INSTALLED_APPS, AUTHENTICATION_BACKENDS, allauth URLs); OAuth je riešený vlastným `google_oauth_simple` – údržba dvoch ciest ak sa allauth neskôr zapne.
2. **Produkčné emaily** – `settings_production.py` má `EMAIL_BACKEND = console`; SMTP (SendGrid/Mailgun) je zakomentovaný – verifikácia a password reset v prod neodosielajú skutočné emaily (ak nie je nastavený iný backend cez env).
3. **settings_production vs settings_split** – časť nastavení (CORS, ALLOWED_HOSTS) sa duplikuje alebo prepisuje v settings_production; CORS fallback na pythonanywhere doménu vyzerá ako starý default.
4. **Gunicorn v requirements** – v Procfile beží len Daphne; gunicorn nie je použitý (žiadna strata, len mätúce).
5. **Registrácia v DEBUG** – `RATE_LIMIT_ALLOW_PATHS` obsahuje `/api/auth/register/` v DEBUG, t.j. register v dev nemá rate limit – ak sa DEBUG omylom zapne v prod, register by bol bez limitu.
6. **2FA (UserProfile.mfa_enabled, mfa_secret)** – model je pripravený; z kódu nie je zrejmé, či je 2FA plne implementované v login flow (pyotp je v requirements).

---

## 12. Čo chýba pre škálovanie na tisíce používateľov

1. **Horizontálne škálovanie backendu** – jeden Daphne proces; pre viac inštancií treba bezštátny backend (cookies + JWT sú OK), zdieľaný Redis (cache + channel layer) a DB. Žiadny session state v procese.
2. **Databáza** – connection pooling (pgbouncer alebo ekvivalent), indexy (čiastočne sú – SkillRequest, Notification, Review); monitorovanie pomalých query.
3. **Cache** – Redis už používaný pre rate limit, blacklist, channel layer; pri viacerých workeroch je nevyhnutný. Žiadna cache vrstva pre čítanie (napr. profilov) – môže pridať.
4. **Statické/media** – S3 je v prod; treba overiť CDN a limity.
5. **Rate limiting** – pri viacerých inštanciách musí byť limit v zdieľanom úložisku (Redis) – už je (Django cache = Redis).
6. **WebSocket** – Channels s Redis layer škáluje na viac workerov; jediný Redis je single point of failure bez clusteringu.
7. **Monitoring a health** – žiadny explicitný health/readiness endpoint v urls; pre orchestration (K8s/Railway) môže byť užitočné.
8. **Obmedzenie súčasných requestov** – žiadny globálny throttling (napr. per-user request rate) okrem konkrétnych akcií; pri DDoS by pomohol reverse proxy / WAF throttling.
9. **Migrácie** – init-db je jednorazový; pri rolling deploy s viacerými replikami treba migrácie riešiť mimo requestu (job alebo init container).

---

*Audit vyhotovený z analýzy kódu; neobsahuje penetračné testy ani kontrolu deploy konfigurácie (env, Railway dashboard).*
