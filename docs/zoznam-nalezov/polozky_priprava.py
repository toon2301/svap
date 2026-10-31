# -*- coding: utf-8 -*-
"""Úlohy na prípravu ostrého nasadenia (N1…N16).

`NTASKS` nie sú nálezy, preto majú vlastné číslovanie N1…; úloha bez kľúča `pkg` patrí do balíka „Príprava ostrého nasadenia“.
Presunuté z `polozky_nove.py`, aby žiadny súbor nepresiahol 500 riadkov; `polozky_nove.py` ich sprístupňuje pod pôvodným názvom
(`polozky_nove.NTASKS`), takže ostatné moduly sa nemenili.
"""

from konstanty import EM, ES, P

NTASKS = [
    dict(n='N1', bucket=P, eff=ES, what='Rozhodnúť hosting a región EÚ (odporúčanie v prílohe C).',
         note='Až keď bude aplikácia hotová; teraz netreba (Railway ostáva na testy). Od rozhodnutia závisí zvyšok prípravy '
              '(reverzný proxy, WebSocket, zálohy, náklady). Rozhodnutie R1.'),
    dict(n='N2', bucket=P, eff=ES,
         what='Doména a e-mail: v kóde sa už používa `svaply.com` (a `api.svaply.com`). Ak je doména vlastnená, treba nasmerovať DNS na nový '
              'server a nastaviť SPF / DKIM / DMARC pre odosielateľa (Resend, `DEFAULT_FROM_EMAIL`) a schránku `info@svaply.com`.',
         note='Dlhá dodacia lehota (šírenie DNS, reputácia odosielateľa): začať asi 2–3 mesiace pred plánovaným štartom. '
              'Ak doména ešte nie je zaregistrovaná, treba ju najprv získať.'),
    dict(n='N3', bucket=P, eff=EM,
         what='Právne dokumenty: podmienky používania, ochrana osobných údajov (GDPR), cookies / súhlas, zmluvy so spracovateľmi '
              '(hosting, Cloudflare, Resend, Google Vision, Sentry).',
         note='Dlhá dodacia lehota (právnik), nie je to kód. Začať s dostatočným predstihom pred štartom. Pozor na prenosy osobných údajov mimo EÚ '
              '(Google, Sentry, Resend, Cloudflare). Súvisí s nálezom 186.'),
    dict(n='N4', bucket=P, eff=EM, what='Oddeliť prostredia: ostrá prevádzka bez testovacích účtov; staging pre E2E a testy.',
         note='Pravidlo v `.cursor/rules/svaply.mdc` hovorí, že E2E bežia proti produkcii (Railway). Po štarte so skutočnými používateľmi musia '
              'bežať proti stagingu, ktorý je kópiou ostrej prevádzky (inak by testy zasahovali do cudzích dát), a pravidlo sa musí upraviť '
              '(rozhodnutie majiteľa). Railway môže slúžiť ako staging; nezachytí však chyby viazané na hosting (proxy, WebSocket). Súvisí s 173, 16, OW-08.'),
    dict(n='N5', bucket=P, eff=EM,
         what='Konfigurácia a tajomstvá: nové `SECRET_KEY`, `JWT_SIGNING_KEY`, `MFA_ENCRYPTION_KEY`, VAPID, '
              'OAuth redirect URI a reCAPTCHA pre novú doménu, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`, `FRONTEND_ORIGIN`.',
         note='Zahŕňa OW-06 (produkčné CORS domény). Žiadne kľúče z Railway nepreberať.'),
    dict(n='N6', bucket=P, eff=EM,
         what='PostgreSQL v EÚ: zálohy (denné + PITR), vyskúšaná obnova, migrácie od nuly (0125 vytvára dva GIN indexy `CONCURRENTLY`).',
         note='Register: pri migráciách 0124 / 0125 nesmú staré procesy zapisovať; zaviesť politiku „rozšír, potom zmenši“.'),
    dict(n='N7', bucket=P, eff=ES, what='Redis: oddeliť cache a broker pre Celery (politika vyhadzovania, perzistencia), sledovať pamäť.',
         note='V repozitári je `RAILWAY_REDIS_FIX.md` – problémy s Redis už boli.'),
    dict(n='N8', bucket=P, eff=EM,
         what='Procesy a proxy: gunicorn (HTTP), daphne (WS), Celery worker + beat, healthchecky, WebSocket časové limity, '
              '`TRUSTED_PROXY_HOPS` podľa skutočného reťazca proxy.',
         note='Zlé `TRUSTED_PROXY_HOPS` rozbije rate limity podľa IP (nález 429 z histórie). Návrh: reverzný proxy smeruje '
              '`/api/`, `/ws/` a `/media/` priamo na backend (rovnaká doména, cookies ostanú first-party) a Next v ceste nie je. Súvisí s 180.'),
    dict(n='N9', bucket=P, eff=EM,
         what='Médiá: S3-kompatibilné úložisko a CDN, CORS bucketu, podpísané alebo verejné URL; zvážiť, aby obrázky nešli cez Django.',
         note='Obrázky Nástenky dnes streamuje Django (`feed_image_files.py`, `_stream_key`); `/media/*` ide cez Next proxy na backend.'),
    dict(n='N10', bucket=P, eff=ES,
         what='Obrazová moderácia: účet Google Cloud, kľúč služby (`GCP_VISION_SERVICE_ACCOUNT_JSON`), kvóty a sledovanie nákladov. V produkcii je '
              'zapnutá a nastavená „fail-closed“: pri výpadku Google Vision sa nahranie obrázka odmietne s hláškou.',
         note='Rozhodnutie R10 (odporúčanie: ponechať). Overiť pri smoke teste N14.'),
    dict(n='N11', bucket=P, eff=ES,
         what='Monitoring: Sentry (backend + frontend, `global-error`), kontrola dostupnosti, logy, upozornenia na disk a pamäť, kontrola Celery beat.',
         note='Zahŕňa 33.'),
    dict(n='N12', bucket=P, eff=EM,
         what='CI/CD: nasadenie až po zelenom CI, rollback, migrácie pred novou verziou, bez výpadku pri zápise starých procesov.',
         note='Dnes: Railway auto-deploy + „Wait for CI“ mimo repozitára (poznámka v `.github/workflows/deploy.yml`).'),
    dict(n='N13', bucket=P, eff=ES, what='Bezpečnostné nastavenia: `manage.py check --deploy`, HSTS, secure cookies, CSP, ochrana admin URL, rate limity.',
         note='Nadväzuje na 183 / 185.'),
    dict(n='N14', bucket=P, eff=EM,
         what='Záťažový a smoke test na novom serveri: WebSocket, nahrávanie obrázkov, e-mail, push, registrácia, prihlásenie cez Google.',
         note='Pred pozvaním prvých používateľov.'),
    dict(n='N15', bucket=P, eff=ES,
         what='Čo s Railway po štarte: ostane na testy / staging, alebo sa vypne (sú tam len testovacie dáta, pravdepodobne sa nič neprenáša).',
         note='Rozhodne sa spolu s N4; až po N14.'),
    dict(n='N16', bucket=P, eff=EM, pkg='Vyhľadávanie a Sledovania',
         what='Živé overenie zlúčených opráv vyhľadávania a Sledovaní: OW-16 (mobilné karty), OW-18 (krajina), OW-19 (scroll), OW-20 (cache), '
              'OW-23 (viac ľudí / ponúk), TEST-01, TEST-02 a PR #193 (opisy a výsledky); vrátane migrácií 0124 / 0125.',
         note='Všetko je zlúčené v `main` a nasadené na Railway, takže sa dá urobiť už teraz (ručne alebo cieleným E2E); register výslovne vedie '
              'nasadený retest ako otvorený. Pred štartom stačí krátko zopakovať na novom serveri (N14).'),
]
