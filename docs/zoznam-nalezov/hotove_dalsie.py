# -*- coding: utf-8 -*-
"""Nálezy opravené od 6. 11. 2026 (práca kolegu K3, K4 a K5, Codexove PR a vetva 165): `DONE_SINCE_DALSIE`.

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
    dict(n=214, vetva='165', pr='#230', zlucene=True,
         text='HOTOVÉ (vetva 165, zlúčené v PR #230 dňa 6. 11. 2026, nasadené, manuálne testy majiteľa prešli): '
              '`capture_reportable_exception` v `swaply/sentry_reporting.py` prešiel zo zastaraného '
              '`sentry_sdk.push_scope()` na `sentry_sdk.new_scope()` (rovnaké správanie: značky a používateľ platia len pre hlásenú '
              'chybu), hlásenie je obalené `try/except` (chyba hlásenia sa nepreniesie k volajúcemu a do logu ide len jej typ, nie text) a '
              '`backend/requirements.txt` pripína `sentry-sdk[django]>=2,<3` (dovtedy bez verzie; čerstvá inštalácia dá 2.74.0, hlavná '
              'verzia 3 zatiaľ nie je). Pomocníka volajú bez ochrany `GlobalErrorHandlingMiddleware.process_exception` aj obsluha '
              'výnimiek DRF, takže pád hlásenia by nahradil zamýšľanú JSON odpoveď všeobecnou chybou 500. Päť nových testov v '
              '`swaply/test/test_sentry_reporting.py` (tri zlyhali pred opravou): žiadne `DeprecationWarning`, zlyhanie SDK ani '
              'otvorenia scope sa nepreniesie k volajúcemu, log obsahuje len typ chyby a so skutočným SDK (bez siete) dostane udalosť '
              'značky aj používateľa a nasledujúca udalosť ich nemá; štyri mutácie test zachytí. Prechod na sentry-sdk 3, keď vyjde, '
              'je samostatná úloha. Dopad na E2E: žiadny.'),
    dict(n=236, vetva='165', pr='#230', zlucene=True,
         text='HOTOVÉ (vetva 165, zlúčené v PR #230 dňa 6. 11. 2026, nasadené): neznáma cesta WebSocketu sa zatvorí hneď kódom 4404 (zatvorenie pred `accept()`, '
              '`daphne` odpovie 403) namiesto výnimky `ValueError: No route found`, ktorá končila HTTP 500 a výpisom „Exception inside '
              'application“ v logu. Záverečná cesta `(?s)^.*$` s konzumentom `UnknownRouteConsumer` (`swaply/ws_unknown_route.py`) je '
              'v `swaply/routing.py` posledná; známa cesta `/ws/notifications/` ostáva pri svojom konzumentovi (bez tokenu dostane '
              'stále 4401). Osem nových testov v `swaply/test/test_ws_unknown_route.py` (sedem zlyhalo pred opravou): sedem neznámych '
              'ciest (aj bez koncového lomítka, s `%00` a `%0A` a mimo `/ws/`) a jedna známa; štyri mutácie (záverečná cesta prvá, '
              'bez `(?s)`, prijať a zavrieť, zlý kód) test zachytí. Na skutočnom `daphne`: pred opravou HTTP 500 po 939 až 1 001 ms a '
              'dva výpisy „Exception inside application“ v logu, po oprave HTTP 403 za 2 až 3 ms a žiadny výpis. Dopad na E2E: žiadny.'),
    dict(n=232, vetva='165', pr='#230', zlucene=True,
         text='HOTOVÉ (vetva 165, zlúčené v PR #230 dňa 6. 11. 2026, nasadené; príčina potvrdená logom Railway 1. 11. 2026): zmazanie príspevku, ktorý sa práve zdieľa, '
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
    dict(n=153, vetva='K4', pr='#231', zlucene=True,
         text='HOTOVÉ (štvrtá práca kolegu, K4, zlúčené v PR #231 dňa 6. 11. 2026, commit `ae7b83e1`): v '
              '`frontend/src/components/dashboard/modules/offer-watch/mobile/OfferWatchSettingsMobile.tsx` je `inert={!isPresent}` priamo '
              'na `<motion.div>` (prop, ako to chce React 19) a efekt s imperatívnym `toggleAttribute` je preč. Ostal jednoriadkový '
              'komentár k vete, ktorá stále platí (`pointer-events` oproti `inert`); `rootRef` ostáva, lebo ho používa '
              '`useModalFocusTrap`. Overenie: CI prešlo (`checks` aj `backend-postgres`), kontrola CodeRabbit prešla, nasadenie na '
              'Railway je v poriadku a manuálne testy majiteľa prešli. Dopad na E2E: žiadny (správanie sa nemení).'),
    dict(n=178, vetva='K4', pr='#231', zlucene=True,
         text='HOTOVÉ (K4, zlúčené v PR #231 dňa 6. 11. 2026, commit `363d53d9`): ESLint na `search/hooks/useRecentSearches.tsx` je '
              'z 6 chýb a 5 varovaní na 0 a 0. `any` je nahradené typmi z `../types` (vo filtri je typový strážca, ktorý údaje z '
              '`localStorage` overuje aj za behu), nepoužité premenné sú preč a `setIsSearching` je v závislostiach `useCallback`. '
              'Správanie sa nemení. Overenie: ako pri nálezu 153. Dopad na E2E: žiadny.'),
    dict(n=213, vetva='K5', pr='#232', zlucene=True,
         text='HOTOVÉ (piata práca kolegu, K5, zlúčené v PR #232 dňa 6. 11. 2026, commit `f73cbf5a`): argument `check=` v '
              '`CheckConstraint` je nahradený argumentom `condition=` na 21 miestach v siedmich súboroch modelov aj na 27 miestach v 16 '
              'starých migráciách (spolu 48 riadkov, každý je presne zámena `check=` za `condition=`). Prepis išiel cez AST, aby sa '
              'nedotkol iných volaní s `check=` (`call_command`, `subprocess.run`). Overenie podľa kolegu: `deconstruct()` všetkých 48 '
              'ohraničení je pred zmenou aj po nej rovnaký, `makemigrations --check` hlási „No changes detected“ (nová migrácia nevznikla), '
              'varovania `RemovedInDjango60Warning` pri načítaní modelov a migrácií klesli zo 48 na 0 a backendová sada prechádza pred '
              'zmenou aj po nej rovnako (2 043 prešlo, 13 preskočených), aj s týmto varovaním ako chybou. Job `backend-postgres` v CI '
              'prešiel. Skok na Django 6.0 tým už nie je blokovaný týmto argumentom. Overenie: ako pri nálezu 153. Dopad na E2E: žiadny '
              '(schéma databázy sa nemení).'),
    dict(n=136, vetva='K5', pr='#232', zlucene=True,
         text='HOTOVÉ (K5, zlúčené v PR #232 dňa 6. 11. 2026, commity `93c53241` a `d5b53661`): (a) nepoužívané props `onBack`, '
              '`onSendMessage` a `initialSummary` sú z `SearchUserProfileModule` odstránené; typy ich teraz odmietnu (po vrátení do '
              'volania vznikne chyba TS2322) a 42 súvisiacich súborov Jest (1 102 testov) prechádza; (b) zmizol aj prenos '
              '`viewedUserSummary` do `ModuleRouter` a tri testy, ktorých jediným obsahom bol súhrn, sú prepísané na pozorovateľný '
              'dôsledok (slug predošlého profilu sa nesmie dostať do adresy nového). Mutáciou overené: keď sa odstráni príslušný reset '
              'súhrnu, práve tieto testy zlyhajú. Štyri resety súhrnu mimo vetvy profilu už nechytí žiadny test (boli kryté len odstránenými '
              'kontrolami; ide o hygienu), pozri nález 250. Overenie: ako pri nálezu 153. Dopad na E2E: žiadny.'),
    dict(n=134, vetva='K5', pr='#232', zlucene=True,
         text='HOTOVÉ (K5, zlúčené v PR #232 dňa 6. 11. 2026, commit `d2585500`): jeden `MotionConfig reducedMotion="user"` pri koreni '
              '(`frontend/src/components/providers.tsx`) robí z nastavenia „Znížiť pohyb“ v systéme jedno pravidlo pre všetky animácie '
              'framer-motion: posun, mierka a rozmery sa vykonajú okamžite, priehľadnosť a farba sa animujú ďalej. Nový test '
              '`Providers.reducedMotion.test.tsx` (4 testy nad skutočným framer-motion): hodnota `never` zhodí 2 testy, `always` 1 test '
              'a bez `MotionConfig` v globálnom mocku padne 6 pôvodných testov `Providers`. Podľa kolegu overené aj v skutočnom Chromiu na '
              'produkčnom builde úvodnej stránky: s emulovaným „Znížiť pohyb“ mal posun pred zmenou 48 krokov a po zmene 1 skok, '
              'priehľadnosť sa animuje ďalej; bez emulácie 50 krokov pred zmenou aj po nej. Nastavenie platí len pre komponenty `motion`: '
              'CSS animácie riadi globálny blok `prefers-reduced-motion` v `globals.css` a plynulé posúvanie cez JavaScript sa ním neriadi, '
              'pozri nález 249. Celý K5 podľa kolegu: typová kontrola čistá, build prešiel s rovnakou tabuľkou trás ako po K4, Jest 524 '
              'súborov a 8 112 testov (základ 523 a 8 108, teda +1 súbor a +4 testy), preklady bez zmeny (6 známych kľúčov = nález 204), '
              'ESLint na zmenených súboroch čistý (`jest.setup.js` má 3 staré chyby `require()`, rovnaké ako pred zmenou). Overenie: '
              'ako pri nálezu 153. Dopad na E2E: žiadny (Playwright nenastavuje `reducedMotion`).'),
]
