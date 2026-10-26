# -*- coding: utf-8 -*-
"""Príloha C zoznamu nálezov: podklad pre výber hostingu ostrej prevádzky (rozhoduje sa až po dokončení aplikácie)."""


def priloha_c(d):
    """Zapíše do dokumentu `d` prílohu C (čo aplikácia potrebuje, odporúčanie, alternatívy, kontrolný zoznam)."""
    d.w('Rozhodnutie o hostingu netreba teraz. Používateľ uviedol (26. 10. 2026), že ostrú verziu pre ostatných používateľov nasadí na iný server '
        'než Railway, a to až keď bude aplikácia hotová; Railway ostáva na testy. Príloha je podklad, aby sa pri vývoji nič nezabetónovalo na Railway.')
    d.w()
    d.w('### C.1 Čo aplikácia potrebuje (zistené z repozitára)')
    d.w()
    d.tabulka(['Súčasť', 'Technológia', 'Poznámka'], [
        ['Frontend', 'Next.js 14 (Node, `next start`), service worker',
         'Podľa `next.config.js` Next preposiela `/api/*`, `/media/*` aj `/ws/*` na backend (`BACKEND_ORIGIN`, `BACKEND_WS_ORIGIN`). '
         'Pri `NEXT_PUBLIC_API_URL=/api` sa prehliadač pripája na WebSocket cez doménu frontendu, takže Next je v ceste aj pre WebSocket (viď 180).'],
        ['Backend HTTP', 'Django 4.2 + DRF, gunicorn (2 workery × 4 vlákna)', 'Pozor na koniec podpory Django 4.2 (nález 183).'],
        ['Backend WebSocket', 'Django Channels, daphne',
         'Potrebuje dlhé nečinné spojenia a kontrolu `Origin` (`ws_origins.py`). Pravidelný ping sa v kóde nenašiel.'],
        ['Úlohy na pozadí', 'Celery worker (concurrency 2) + beat (1 replika)', 'Plánovač v databáze (`django_celery_beat`).'],
        ['Databáza', 'PostgreSQL (`DATABASE_URL`)', 'Migrácie 0124 / 0125 vytvárajú GIN indexy `CONCURRENTLY`.'],
        ['Cache a broker', 'Redis 7 (`django-redis`, `channels-redis`, Celery)', 'Oddeliť cache od brokera (N7).'],
        ['Médiá', 'S3-kompatibilné úložisko (`django-storages` + boto3)',
         'Obrázky Nástenky dnes streamuje Django cez `_stream_key` (`feed_image_files.py`).'],
        ['E-mail', 'Resend (`django-anymail`)', 'SPF / DKIM / DMARC pre doménu (N2).'],
        ['Moderácia obrázkov', 'Google Cloud Vision (SafeSearch)', 'V produkcii „fail-closed“: pri výpadku sa obrázok odmietne (R10).'],
        ['Monitoring', 'Sentry (backend aj frontend)', 'Chýba `global-error` (nález 33).'],
        ['Ďalšie', 'Web Push (VAPID), prihlásenie cez Google (vlastný kód `google_oauth_simple.py`), reCAPTCHA, MFA (pyotp), '
                   'HEIC obrázky (`pillow-heif`)',
         'Všetky kľúče nové pre novú doménu (N5). `django-allauth` je pripnutý, no vypnutý.'],
        ['CI', 'GitHub Actions: Jest, build, pytest', 'Nasadenie dnes rieši Railway auto-deploy mimo repozitára.'],
    ])
    d.w('`docker-compose.prod.yml` v repozitári je **zastaraný** (nemá Redis, Celery, daphne ani rozdelenie HTTP / WS), '
        'nedá sa použiť ako hotový predpis nasadenia. Skutočný predpis je `railway.json`, `backend/Dockerfile` a `backend/start-*.sh`.')
    d.w()
    d.w('### C.2 Odporúčanie')
    d.w()
    d.w('**Hetzner Cloud (región Nemecko alebo Fínsko) + Coolify (alebo Dokploy) + Cloudflare + Cloudflare R2.**')
    d.w()
    d.w('- **Prečo:** najlepší pomer cena / výkon pre EÚ; WebSocket bez umelých obmedzení; všetko v kontajneroch, čo aplikácia už má '
        '(`Dockerfile`, `start-http.sh`, `start-ws.sh`); Coolify dáva nasadenie z GitHubu, certifikáty a zálohy cez rozhranie, takže netreba byť '
        'správca servera; Cloudflare (bezplatný plán) dá DNS, TLS, CDN a základnú ochranu, a ako bonus hlavičku `CF-IPCountry` (rieši nález 186); '
        'R2 je S3-kompatibilné úložisko bez poplatkov za prenos, takže `django-storages` ostane bez zmeny.')
    d.w('- **Štart:** jeden server (4 vCPU, 8 GB RAM) pre všetko; zálohy databázy mimo servera (R2 alebo Backblaze B2) a **vyskúšaná obnova**; '
        'neskôr vyčlenená databáza (vlastný server alebo spravovaný PostgreSQL), keď porastie prevádzka.')
    d.w('- **Orientačné náklady:** rádovo 20–40 € mesačne na štart (server, zálohy, doména). Ceny treba overiť pred rozhodnutím, cenníky sa menia.')
    d.w('- **Cloudflare a WebSocket:** WebSocket cez Cloudflare funguje, no nečinné spojenie môže proxy po čase (podľa skúseností asi 100 s) zatvoriť. '
        'Aplikácia dnes nemá pravidelný ping (viď 180), preto to treba overiť pri teste N14, alebo ping doplniť, alebo WebSocket viesť cez samostatnú '
        'doménu bez proxy Cloudflare. Reverzný proxy (Traefik v Coolify) vie smerovať `/ws/` priamo na daphne, takže Next v ceste nemusí byť.')
    d.w('- **Nevýhody, ktoré treba prijať:** jeden server je jediný bod zlyhania; aktualizácie systému a záložné kópie sú na majiteľovi '
        '(Coolify to uľahčí, ale nezruší); reakcia na výpadok o 3. v noci je tiež jeho. Konfiguráciu (Dockerfile, compose, CI nasadenie) vie '
        'pripraviť agent, server však prevádzkovať nemôže.')
    d.w()
    d.w('### C.3 Alternatívy')
    d.w()
    d.tabulka(['Možnosť', 'Pre', 'Proti', 'Kedy ju vybrať'], [
        ['**Render** (región Frankfurt) alebo **Scalingo** (EÚ)', 'Spravované databázy, Redis, workery; WebSocket; minimum správy; nasadenie z GitHubu',
         'Rádovo 100–200 € mesačne pri tomto počte služieb; menej kontroly', 'Ak sa chce minimum starostí a rozpočet to unesie'],
        ['**Railway** v EÚ regióne (platená úroveň)', 'Nulová migrácia, už je nakonfigurované',
         'Príčina prerušovania WebSocketu na iPhone (180) nie je objasnená a môže byť aj mimo Railway; v repozitári sú stopy po problémoch '
         's Redis (`RAILWAY_REDIS_FIX.md`); závislosť od jednej platformy',
         'Používateľ sa rozhodol ostrú prevádzku na Railway nedávať; ostáva na testy'],
        ['**AWS / Google Cloud / Azure**', 'Neobmedzené možnosti', 'Zložitosť a náklady neprimerané tejto fáze', 'Až pri veľkom raste'],
        ['**Zdieľaný hosting**', 'Lacný', 'Nepodporuje WebSocket, Celery, Redis', 'Nevhodné'],
    ])
    d.w('**Pravidlo výberu:** minimum starostí → Render alebo Scalingo; najnižšia cena a ochota učiť sa správu servera → Hetzner + Coolify. '
        'Nech sa zvolí čokoľvek, doménu, e-mail a úložisko médií treba držať oddelene od hostingu (N2, N9), aby sa dalo neskôr presunúť.')
    d.w()
    d.w('### C.4 Frontend: vlastný server alebo Vercel')
    d.w()
    d.w('Nález 184 (zraniteľnosti `next` 14.2.35) sa týka najmä **vlastného hostingu** (Image Optimizer, deserializácia RSC). Vercel '
        'takéto veci opravuje na úrovni platformy, ale pridáva ďalšieho dodávateľa a cenu podľa využitia. Odporúčanie: ostať na jednom '
        'serveri a **najprv povýšiť Next** (balík 184), nie sa pred zraniteľnosťou schovať za iného poskytovateľa.')
    d.w()
    d.w('### C.5 Kontrolný zoznam nasadenia')
    d.w()
    d.w('Úlohy N1–N16 sú v časti 4 (balík „Príprava ostrého nasadenia“; N16, živé overenie vyhľadávania, je pri Vyhľadávaní a Sledovaniach). '
        'Poradie práce je v časti 2.')
    d.w()
    d.w('### C.6 Čo vie agent pripraviť, keď používateľ povie')
    d.w()
    d.w('1. Aktualizovaný `Dockerfile` pre frontend a backend, `docker-compose` pre produkciu (s Redis, Celery, daphne, rozdelenie HTTP / WS) '
        'a zoznam premenných prostredia.')
    d.w('2. CI krok nasadenia po zelených testoch s migráciami pred novou verziou a postupom späť.')
    d.w('3. Návrh zálohovania a obnovy PostgreSQL a kontrolný skript.')
    d.w('4. Rýchle upgrady závislostí (183 a 184) ako samostatné vetvy so spusteným celým Jestom a backendovými testami.')
    d.w()
