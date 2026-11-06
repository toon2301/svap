# -*- coding: utf-8 -*-
"""Nálezy opravené od 6. 11. 2026 (práca kolegu K3, Codexove PR a vetva 165): `DONE_SINCE_DALSIE`.

Samostatný súbor kvôli limitu 500 riadkov; `hotove.py` ich pripája do `DONE_SINCE`. Nový opravený nález sa pridáva sem.
"""

DONE_SINCE_DALSIE = [
    dict(n=241, vetva='K3', pr='#228', zlucene=True,
         text='HOTOVÉ (tretia práca kolegu, zlúčené v PR #228 dňa 6. 11. 2026, commit `62dcd3b6`): zmazaný nepoužívaný '
              '`backend/swaply/settings_test.py` a jeho dva zápisy v konfigurácii (riadok v zozname `omit` v `backend/.coveragerc` a '
              'výnimka ruff v `backend/pyproject.toml`). Overenie: CI prešlo, kontrola CodeRabbit prešla, nasadenie na Railway je v '
              'poriadku a manuálne testy majiteľa prešli. Starý report `CLEANUP_REPORT_FINAL.md` ho stále spomína ako text (patrí pod '
              'nález 32). Dopad na E2E: žiadny.'),
    dict(n=103, vetva='K3', pr='#228', zlucene=True,
         text='HOTOVÉ (zlúčené v PR #228 dňa 6. 11. 2026, commit `db3ebebb`): zmazaný mŕtvy '
              '`frontend/src/components/dashboard/modules/skills/SkillModals.tsx` (428 riadkov), ktorý nikto neimportoval. Podľa kolegu '
              'jeho závislosti používa aj iný kód, takže žiadny súbor neosirel. Overenie: ako pri nálezu 241. Dopad na E2E: žiadny.'),
    dict(n=58, vetva='K3', pr='#228', zlucene=True,
         text='HOTOVÉ (zlúčené v PR #228 dňa 6. 11. 2026, commit `932ded7f`): `skillActionError.ts` sa presunul z '
              '`frontend/src/components/dashboard/components/` do `frontend/src/components/dashboard/hooks/` k hooku '
              '`useOwnProfileOfferActions` a jeho test `skillActionError.test.ts` do `hooks/__tests__/` (cez `git mv`, takže história '
              'súborov ostala). Upravené sú len dva importy, správanie sa nemení. Overenie: ako pri nálezu 241. Dopad na E2E: žiadny.'),
    dict(n=243, vetva='e2e/html-no-store', pr='#227', zlucene=True,
         text='HOTOVÉ (Codex, zlúčené v PR #227 dňa 5. 11. 2026, nasadené): nový E2E test, že odpoveď na HTML dokument nesie '
              '`Cache-Control` s `no-store` pri prvom otvorení aj po F5 na šiestich stránkach (`/`, `/about`, `/faq`, `/contact` bez '
              'prihlásenia a `/dashboard`, `/search` po prihlásení) v troch projektoch (WebKit desktop, WebKit mobil, Chromium '
              'desktop), spolu 18 variantov. Proti Railway (`main` `00d627ba`) prešlo 18 z 18; test blokuje service worker, takže kontroluje '
              'odpoveď servera. '
              'Aplikácia sa nemenila. Overenie: CI prešlo, kontrola CodeRabbit prešla, nasadenie je v poriadku.'),
    dict(n=214, vetva='165', pr=None, zlucene=False,
         text='HOTOVÉ (vetva 165, čaká na PR): `capture_reportable_exception` v `swaply/sentry_reporting.py` prešiel zo zastaraného '
              '`sentry_sdk.push_scope()` na `sentry_sdk.new_scope()` (rovnaké správanie: značky a používateľ platia len pre hlásenú '
              'chybu), hlásenie je obalené `try/except` (chyba hlásenia sa nepreniesie k volajúcemu a do logu ide len jej typ, nie text) a '
              '`backend/requirements.txt` pripína `sentry-sdk[django]>=2,<3` (dovtedy bez verzie; čerstvá inštalácia dá 2.74.0, hlavná '
              'verzia 3 zatiaľ nie je). Pomocníka volajú bez ochrany `GlobalErrorHandlingMiddleware.process_exception` aj obsluha '
              'výnimiek DRF, takže pád hlásenia by nahradil zamýšľanú JSON odpoveď všeobecnou chybou 500. Päť nových testov v '
              '`swaply/test/test_sentry_reporting.py` (tri zlyhali pred opravou): žiadne `DeprecationWarning`, zlyhanie SDK ani '
              'otvorenia scope sa nepreniesie k volajúcemu, log obsahuje len typ chyby a so skutočným SDK (bez siete) dostane udalosť '
              'značky aj používateľa a nasledujúca udalosť ich nemá; štyri mutácie test zachytí. Prechod na sentry-sdk 3, keď vyjde, '
              'je samostatná úloha. Dopad na E2E: žiadny.'),
    dict(n=236, vetva='165', pr=None, zlucene=False,
         text='HOTOVÉ (vetva 165, čaká na PR): neznáma cesta WebSocketu sa zatvorí hneď kódom 4404 (zatvorenie pred `accept()`, '
              '`daphne` odpovie 403) namiesto výnimky `ValueError: No route found`, ktorá končila HTTP 500 a výpisom „Exception inside '
              'application“ v logu. Záverečná cesta `(?s)^.*$` s konzumentom `UnknownRouteConsumer` (`swaply/ws_unknown_route.py`) je '
              'v `swaply/routing.py` posledná; známa cesta `/ws/notifications/` ostáva pri svojom konzumentovi (bez tokenu dostane '
              'stále 4401). Osem nových testov v `swaply/test/test_ws_unknown_route.py` (sedem zlyhalo pred opravou): sedem neznámych '
              'ciest (aj bez koncového lomítka, s `%00` a `%0A` a mimo `/ws/`) a jedna známa; štyri mutácie (záverečná cesta prvá, '
              'bez `(?s)`, prijať a zavrieť, zlý kód) test zachytí. Na skutočnom `daphne`: pred opravou HTTP 500 po 939 až 1 001 ms a '
              'dva výpisy „Exception inside application“ v logu, po oprave HTTP 403 za 2 až 3 ms a žiadny výpis. Dopad na E2E: žiadny.'),
    dict(n=232, vetva='165', pr=None, zlucene=False,
         text='HOTOVÉ (vetva 165, čaká na PR; príčina potvrdená logom Railway 1. 11. 2026): zmazanie príspevku, ktorý sa práve zdieľa, '
              'skončilo HTTP 500 (`DELETE /api/auth/feed/posts/<id>/`, PostgreSQL `ForeignKeyViolation` na obmedzení '
              '`accounts_feedpost_shared_feed_post_id_…`). Cudzí kľúč zdieľania sa kontroluje až pri COMMIT a Django odpojí existujúce '
              'zdieľania (`SET_NULL`) až tesne pred zmazaním zdroja, takže zdieľanie potvrdené v tomto okne zmazanie pokazilo; v opačnom '
              'poradí (zdroj sa zmazal, kým bolo zdieľanie vložené, ale nepotvrdené) zlyhalo vytvorenie zdieľania. Oprava: '
              '`FeedPost.save()` pri vzniku zdieľania zamkne (`SELECT ... FOR UPDATE`) skutočný zdroj, na ktorý cudzí kľúč ukazuje '
              '(po sploštení na koreň), a vloží riadok v tej istej transakcii (`_lock_shared_feed_post_source` v '
              '`accounts/models/feed_posts/sharing.py`); zdroj, ktorý medzitým zmizol, dá `shared_source_missing` (HTTP 400, rovnaká '
              'odpoveď ako pri neexistujúcom zdroji); `DELETE` zamkne riadok príspevku ešte pred odpojením zdieľaní a zmazaním a už '
              'zmazaný príspevok dá 404. Päť nových testov v `accounts/test/test_feed_share_delete_race.py`: obe poradia súbehu a '
              'súbežné dvojité zmazanie s dvoma vláknami (poradie vynucujú udalosti, nie spánok; len PostgreSQL, na SQLite sa '
              'preskočia a vykoná ich beh `backend-postgres` v CI) a dve na každej databáze (zdroj zmiznutý po načítaní, sekvenčné '
              'dvojité zmazanie). Pred opravou: zmazanie 500, zdieľanie 500 a zdroj zmiznutý 500; šesť mutácií test zachytí. Rovnaký '
              'súbeh potvrdila sonda aj pri ponuke a položke portfólia (nález 246). Dopad na E2E (Codex): serverový súbeh je opravený; '
              'návrh Codexa z 1. 11. 2026 upratovať zdieľanie pred zdrojom (poradie upratovania v `e2e/support/feed.ts`) je samostatná '
              'E2E úprava, ktorú rieši Codex.'),
]
