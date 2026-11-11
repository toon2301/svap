# -*- coding: utf-8 -*-
"""Nálezy opravené od 6. 11. 2026 (práca kolegu K3 až K17, Codexove PR a vetva 165): `DONE_SINCE_DALSIE`.

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
    dict(n=120, vetva='K6', pr='#234', zlucene=True,
         text='HOTOVÉ (šiesta práca kolegu, K6, zlúčené v PR #234 dňa 6. 11. 2026, commit `6fe2c8ea`; spolu s časťou nálezu 204 s tromi '
              'kľúčmi: je to ten istý problém, v registri APP-01): `feed.captionPlaceholder`, `feed.commentsClose` a `feed.openProfile` sú '
              'vo všetkých šiestich súboroch `frontend/messages/*.json` (3 riadky v každom jazyku, spolu 18, nič iné sa v JSON nezmenilo; '
              'slovenčina je presne text z kódu, ostatné jazyky sú doplnené ručne; diakritika je overená aj bajtovo). Skript '
              '`npm run check:used-translation-keys` už nekontroluje testové súbory (predtým z nich hlásil tri falošné kľúče `common`, '
              '`common.save.unavailable` a `missing.path`): pred opravou končil so 6 chýbajúcimi kľúčmi (exit 1), teraz s 0 (exit 0, 745 '
              'súborov). Po odstránení `feed.openProfile` z kópie `sk.json` skončí znova s exit 1 a kľúč nahlási, takže vylúčenie testov '
              'skutočné chyby neskrýva; `check:missing-translations` ostáva na 0. Nový test `feedTranslations.test.ts` (33 testov) bol pred '
              'opravou celý červený a teraz prechádza; slovenský text vrátený do `cs.json` zhodí 2 testy. Agent po zlúčení overil na `main`: '
              'skript hlási 0 chýbajúcich kľúčov z 1 395 použitých a všetkých 5 kľúčov z K6 (`feed.*` a `common.*`) je v šiestich jazykoch. '
              'Zostáva zvyšok nálezu 204 (`profile.photoRemovedError`). Celý K6 podľa kolegu: plná sada Jest 526 súborov a 8 165 testov '
              '(základ 524 a 8 112, teda +2 a +53), typová kontrola čistá, ESLint na zmenených súboroch čistý, build prešiel s rovnakou '
              'tabuľkou trás ako po K5. Overenie: CI prešlo (`checks` aj `backend-postgres`), kontrola CodeRabbit prešla (jedna pripomienka '
              'k JSDoc pri `collectSourceFiles`, doplnená v `ecbe28e5`), nasadenie na Railway je v poriadku a manuálne testy majiteľa '
              'prešli. Dopad na E2E: žiadny (žiadny E2E test nehľadá tieto texty).'),
    dict(n=177, vetva='K6', pr='#234', zlucene=True,
         text='HOTOVÉ (K6, zlúčené v PR #234 dňa 6. 11. 2026, commit `24947b0a`): `OfflineIndicator.tsx` berie oba texty cez `useLanguage()` '
              '(`common.offlineBanner` a `common.backOnlineBanner`); slovenčina je presne pôvodný text, ostatné jazyky sú doplnené ručne. '
              'Nový test `OfflineIndicator.locales.test.tsx` (12 testov: 6 jazykov × pruh pri výpadku aj po návrate online): pred zmenou '
              'zlyhalo 10 z 12, po nej prechádza všetkých 12; premenovaný kľúč v `de.json` zhodí test nemčiny. Pôvodný '
              '`OfflineIndicator.test.tsx` ostal bez zmeny a prechádza. Podľa kolegu je v skutočnom Chromiu na produkčnom builde pruh správny '
              'vo všetkých 6 jazykoch, offline aj po návrate online. Že zelený pruh po obnovení pripojenia nie je prakticky vidieť, riešil '
              'nález 270 (K7). Overenie: ako pri nálezu 120. Dopad na E2E: žiadny.'),
    dict(n=119, vetva='K6', pr='#234', zlucene=True,
         text='HOTOVÉ (K6, zlúčené v PR #234 dňa 6. 11. 2026, commit `d3b3a97b`): `mobileAccountName` v '
              '`frontend/src/components/dashboard/components/dashboardRenderValues.ts` má pre firemný účet (`user_type === "company"`) poradie '
              'názov firmy → meno a priezvisko → používateľské meno → „Profil“; ostatné typy účtov majú doterajšie poradie, takže existujúce '
              'testy ostali platné. Firemný účet, ktorý bol pôvodne osobný, tak ukáže v hornej lište mobilu názov firmy. Šesť nových testov '
              'v `dashboardRenderValues.test.ts`: na starom kóde zlyhali 2 (firma s názvom aj s osobným menom), zvyšné pinujú nezmenené '
              'správanie; keď sa názov firmy použije prednostne pre všetky typy účtov, zlyhá test osobného účtu. Rovnakú chybu má meno '
              'recenzenta v okne „Pridať recenziu“, pozri nález 272. Overenie: ako pri nálezu 120. Dopad na E2E: žiadny.'),
    dict(n=228, vetva='K6', pr='#234', zlucene=True,
         text='HOTOVÉ (K6, zlúčené v PR #234 dňa 6. 11. 2026, commit `4539d0ac`): nový test v `useGoogleLogin.probeFailure.test.tsx` s dvoma '
              'prípadmi (odpojenie komponentu a explicitné zrušenie počas čakania po odpovedi 401): po nich nezostane žiadny časovač. Podľa '
              'kolegu bez mutácie prechádza všetkých 81 testov `useGoogleLogin*` (bolo 79) a po odstránení `clearTimeout(delayTimer)` (riadok '
              '111) zlyhajú práve 2 nové testy s `Expected: 0, Received: 1`. Kód sa nemenil: riadok je správne upratanie a test ho teraz '
              'stráži. Overenie: ako pri nálezu 120. Dopad na E2E: žiadny.'),
    dict(n=271, vetva='K7', pr='#235', zlucene=True,
         text='HOTOVÉ (siedma práca kolegu, K7, zlúčené v PR #235 dňa 7. 11. 2026, commit `4f28c539`; nález majiteľa z manuálneho testu po K6, '
              'číslo pridelil agent): po zmene typu účtu (osobný ↔ firemný) na mobile aplikácia automaticky preskočila na profil a zmizol '
              'hlavný spodný navigačný panel; chyba sa zopakovala pri každej ďalšej zmene a pomohlo len obnovenie aplikácie. Príčinu agent '
              'overil skúšobným testom (dočasný, nie je v repozitári): `handleUserUpdate` v `hooks/useDashboardState.ts` ošetroval v '
              '`setActiveModule` len `settings`, `privacy` a `profile`; mobilné sekcie Nastavení (Typ účtu, Jazyk, Účet, Blokovaní, '
              'Upozornenia) sú moduly a padli do poslednej vetvy „prepnúť na profil s edit módom“: modul sa prepol na `profile`, '
              '`isRightSidebarOpen` ostal `true` s prázdnou položkou a adresa ostala stará, a `DashboardLayout.tsx` pri '
              '`isRightSidebarOpen && activeModule === "profile"` skrýva spodný panel (je to určené pre úpravu profilu). Oprava je jeden '
              'riadok `if (isSettingsSectionModule(prevModule)) return prevModule;` (+1 −0): jediná použitá výnimka z pravidla 500 riadkov '
              '(R24; súbor má teraz 922 riadkov). Po zmene typu účtu používateľ ostane na obrazovke Typ účtu s novým zaškrtnutím, ako na '
              'desktope (už nie na profile). Nový test `settingsSectionUserUpdate.test.tsx` (8 prípadov): pred opravou zlyhalo 5 z 8 '
              '(preskočilo 5 zo 6 sekcií: otvoril sa pravý panel, `localStorage` sa prepísal na `profile` a adresa ostala stará), po oprave '
              'prechádza 8 z 8 a po zmazaní riadku test padá. Overenie: CI prešlo (`checks`, `backend-postgres`, CodeRabbit), nasadenie na '
              'Railway je v poriadku a manuálny test majiteľa po nasadení prešiel. Dopad na E2E: žiadny (E2E nemá nič o zmene typu účtu).'),
    dict(n=270, vetva='K7', pr='#235', zlucene=True,
         text='HOTOVÉ (K7, zlúčené v PR #235 dňa 7. 11. 2026, commit `b6373409`; nález kolegu z K6, agent ho v kóde potvrdil, číslo pridelil '
              'agent): zelený pruh „Pripojenie obnovené“ v `OfflineIndicator.tsx` mal v online stave triedu `-translate-y-full`, takže bol '
              'mimo obrazovky: viditeľný asi 0,3 s pri zasúvaní (potvrdené v Chromiu) a potom 3 s skrytý, takže používateľ text prakticky '
              'nevidel. Teraz je po obnovení pripojenia 3 s na obrazovke a potom sa schová. Časovač skrývania sa ruší pri novej udalosti '
              'pripojenia aj pri odpojení komponentu (predtým po odchode zostal a pri rýchlom striedaní výpadku a obnovy mohol pruh schovať '
              'predčasne). Štyri nové testy; podľa kolegu je v Chromiu na produkčnom builde pruh viditeľný 0 až asi 3 s a rýchle striedanie '
              'funguje správne. Overenie: ako pri nálezu 271; manuálny test majiteľa prešiel. Pruh ešte nemá `role` ani `aria-live`, pozri '
              'nález 277. Dopad na E2E: žiadny.'),
    dict(n=273, vetva='K7', pr='#235', zlucene=True,
         text='HOTOVÉ (K7, zlúčené v PR #235 dňa 7. 11. 2026, commit `612f32e1`; nález kolegu z K6, číslo pridelil agent): `"school"` je '
              'odstránené z oboch zjednotení `user_type` v `frontend/src/types/index.ts` (riadky 70 a 124). Backend (`UserType` v '
              '`accounts/models/enums.py`) pozná len `individual` a `company` a v kóde sa `"school"` nikde inde nepoužíva. Typová kontrola '
              'je čistá a podľa kolegu negatívna kontrola potvrdila, že sa typ zúžil. Overenie: ako pri nálezu 271. Dopad na E2E: žiadny.'),
    dict(n=274, vetva='K9', pr='#238', zlucene=True,
         text='HOTOVÉ (K9, zlúčené v PR #238 dňa 7. 11. 2026, commit `01739dac`; príčinu zmapoval kolega v K8, PR #237, bez zmeny kódu; '
              'nález majiteľa z manuálneho testu po K7): fotky v príspevkoch na Nástenke sa na účte A (súkromný profil, `is_public = false`; '
              'rovnaká príčina ako pri nálezu 275) nenačítali. Príčina: fotky príspevkov sa servírovali adresou na doméne backendu, takže '
              '`<img>` bol cross-site a bez prihlasovacieho cookie; súkromný autor dostal na vlastné fotky HTTP 404. Oprava: fotky '
              'príspevkov idú teraz cez doménu frontendu (`/api/auth/feed/...`; nový `feedImageUrl.ts` s funkciou `sameOriginFeedImageUrl`), '
              'zapojené v karuseli s prehliadačom fotiek, v náhľade zdieľaného príspevku, v okne úpravy a v okne zdieľania; adresy úložiska, '
              'portfólia a avatarov a backend sa nemenia. Overenie podľa kolegu: v Chromiu 10 z 10 požiadaviek HTTP 200 (predtým 404), 11 '
              'mutácií zachytili testy; majiteľ po nasadení potvrdil, že fotky fungujú. Vedľajší účinok: požiadavka na fotku teraz nesie '
              'cookie, takže z kódu `visible_feed_posts` platí aj blokovanie (netestované). Účty A a B sú účty z E2E testov (`.env.e2e`; '
              'majiteľ 7. 11. 2026); fotky Nástenky E2E nepokrýva (nález 295). Overenie: CI prešlo (`checks` aj `backend-postgres`), kontrola '
              'CodeRabbit prešla. Dopad na E2E: žiadny.'),
    dict(n=276, vetva='K8, K9', pr='#237, #238', zlucene=True,
         text='HOTOVÉ (K8 a K9: PR #237 zlúčené 7. 11. 2026, commit `dc418ca8`, a PR #238 zlúčené 7. 11. 2026, commit `bf05d175`; nález '
              'majiteľa z manuálneho testu po K7, príčiny našiel kolega): preblik obsahu na mobile pri prepínaní obrazoviek. Nástenka (K8): '
              'karty sú v `AnimatePresence` s `initial={false}`, takže sa po návrate zoznam neukáže vyfadovaním z prázdna; nové príspevky '
              'sa vyfadujú ako predtým (majiteľ potvrdil). Zoznam Nastavení (K9): pod vsúvajúcim sa panelom stála zástupná stránka modulu '
              '`settings` (~400 ms sivá); `ModuleRouter` teraz drží pod panelom obrazovku spred otvorenia a `DashboardLayout` drží kľúč '
              '`<main>` (`useDashboardMainKey(screen, hold)`), len na mobile a len kým je zoznam otvorený; overené v Chromiu na všetkých 7 '
              'sekciách, na iPhone sa overiť nedalo. Zvyšok preblikov na iPhone je podľa majiteľa nastavenie telefónu (nahrávka sedí na '
              'zapnuté „Znížiť pohyb“; presné nastavenie neuviedol); zostávajúce prechody sú nové nálezy 283 až 289 (balík „Plynulosť '
              'prechodov (mobil)“). Poučenie: pri mapovaní preblikov najprv zistiť zariadenie, Safari alebo PWA a prístupnostné nastavenia '
              '(Znížiť pohyb), lebo menia, čo používateľ vidí. Overenie: CI prešlo (`checks` aj `backend-postgres`), kontrola CodeRabbit '
              'prešla. Dopad na E2E: pri najbližšom behu stojí za pozornosť `mobile-settings-navigation.spec.ts` a '
              '`mobile-settings-offer-watch-motion.spec.ts` (webkit-mobile); `dashboard-main-identity.spec.ts` testuje len prechody spodnej '
              'navigácie, takže ho zmena nezasiahla.'),
    dict(n=277, vetva='K10', pr='#239', zlucene=True,
         text='HOTOVÉ (K10, zlúčené v PR #239 dňa 7. 11. 2026, commit `facc740c`; nález kolegu z K7): pruh o stave pripojenia v '
              '`OfflineIndicator.tsx` má `role` a `aria-live`. Oprava: dva stále prítomné prázdne obaly, `role="alert"` pre výpadok a '
              '`role="status"` s `aria-atomic="true"` pre obnovenie; pruh sa vkladá ako ich obsah, rola sa neprepína a emoji je '
              '`aria-hidden` (čítače obrazovky oznámia zmenu spoľahlivo len v obale, ktorý už v stránke je). Overenie podľa kolegu: v '
              'Chromiu zostávajú uzly rovnaké a strom prístupnosti ich vystavuje ako assertive a polite; 8 nových testov a 7 mutácií '
              'zachytili testy. Chýba ručný test s VoiceOverom na iPhone (nález 294). Overenie: CI prešlo (`checks` aj `backend-postgres`); '
              'kontrola CodeRabbit na poslednom commite PR #239 preskočila, skoršia pripomienka (zápis do `ref` počas renderu v karuseli '
              'ponúk) je opravená v `a6513c0d`. Dopad na E2E: žiadny (nové prázdne obaly sú v koreni stránky a všetky dnešné '
              '`getByRole("alert"/"status")` v `e2e/` sú obmedzené na podstrom).'),
    dict(n=281, vetva='K10', pr='#239', zlucene=True,
         text='HOTOVÉ (K10, zlúčené v PR #239 dňa 7. 11. 2026, commit `a7472c2f`; nález kolegu z K7): šesť záložných textov vo '
              '`FavoritesModule.tsx` (`favorites.loading`, `favorites.emptyTitle`, `favorites.emptyHint`, `favorites.unknownUser`, '
              '`skills.message` a `favorites.removeAction`) má diakritiku presne podľa `messages/sk.json`. Upravené sú testy v oboch '
              'súboroch `FavoritesModule.test.tsx` (`dashboard/__tests__/` aj `dashboard/modules/__tests__/`; čakali texty bez diakritiky) '
              'a nový test porovná všetkých šesť záložných textov so `sk.json`; 6 mutácií zo 6 zachytili testy. Overenie: ako pri nálezu '
              '277. Dopad na E2E: žiadny.'),
    dict(n=279, vetva='K10, K11', pr='#239, #241', zlucene=True,
         text='HOTOVÉ (K10: PR #239, zlúčené 7. 11. 2026, commity `0025c124` a `a6513c0d`, `onError` na všetkých šiestich miestach s '
              '`BlurredContainImage`; K11: PR #241, zlúčené 7. 11. 2026, commit `a67fff5d`, viditeľná náhrada po neúspešnom ručnom teste majiteľa; '
              'nález kolegu z K7): po K10 ukázal karusel príspevku pri zlyhanej fotke len prázdny obdĺžnik (v tmavom režime `#0e0e0f`, teda '
              'veľkú čiernu plochu bez ikony a textu), preto ručný test majiteľa 7. 11. 2026 neprešiel. K11: `shared/ImageLoadFailed.tsx` má tri '
              'varianty: `default` (ikona a text na neutrálnej ploche, karusel príspevku), `compact` (len ikona s `aria-label`, malá dlaždica '
              'galérie portfólia) a `onDark` (svetlé farby pre fullscreen prehliadač). Nový preklad `common.imageLoadFailed` je vo všetkých '
              'šiestich jazykoch (sk „Fotku sa nepodarilo načítať“), kontrast textu 6,87 : 1 a 7,6 : 1; rozloženie a počítadlo fotiek ostávajú. '
              'Overenie podľa kolegu: mutácie 11 z 12 (prežila ekvivalentná). Po pripomienke CodeRabbitu k PR #241 je dôvod zlyhania v dlaždici '
              'galérie v názve tlačidla (`78b3b3ef`: hook `useImageLoadFailedLabel`, test cez `toHaveAccessibleName`, mutácie 7 zo 7), lebo text '
              'vnorený v `<button aria-label>` čítačka obrazovky neoznámi; JSDoc k zmeneným funkciám je v `290b3c7c`. K10 pritom doplnil aj '
              'ďalšie miesta: karusel ponúk preskočí zlyhanú fotku, portfólio ukáže „Bez titulnej fotky“ a Obľúbené iniciály (`FavoriteAvatar`). '
              'Opakovaný ručný test majiteľa po K11 (zablokovanie fotky v DevTools) zatiaľ nie je zapísaný. Overenie: CI prešlo (`checks` aj '
              '`backend-postgres`). Dopad na E2E: žiadny (v `frontend/e2e` nič nehľadá túto náhradu).'),
    dict(n=291, vetva='K11', pr='#241', zlucene=True,
         text='HOTOVÉ (K11, zlúčené v PR #241 dňa 7. 11. 2026, commit `f04876c2`; nález kolegu z K10): `ImageLightbox.tsx` a '
              '`OfferImageGalleryLightbox.tsx` (fullscreen prehliadače fotiek) nemali `onError`, takže zlyhaná fotka ukázala pokazený obrázok '
              'alebo prázdny rámik. Nový `shared/LightboxPhoto.tsx` rieši načítanie chránenej adresy aj zlyhanie a pri zlyhaní ukáže '
              '`ImageLoadFailed` (variant `onDark`). Oba prehliadače ho vykresľujú s `key` = adresa fotky, takže zlyhanie neprejde na ďalšiu '
              'fotku; ovládanie sa nemení. Overenie podľa kolegu: 8 z 11 nových testov zlyhalo na pôvodnom kóde, mutácie 13 z 13. Ostatné '
              'súbory s `<img>` bez `onError` (32 zo 43, netriedené) sú nález 303; fotka v správach (`MessageImageLightbox.tsx`) tam patrí '
              'tiež. Triedy `max-h-[calc(100vh-2rem)]` fotky sú teraz v `LightboxPhoto.tsx` (nálezy 36 a 92). Overenie: ako pri nálezu 279. '
              'Dopad na E2E: žiadny.'),
    dict(n=292, vetva='K11', pr='#241', zlucene=True,
         text='HOTOVÉ (K11, zlúčené v PR #241 dňa 7. 11. 2026, commit `1ee82c1a`; nález kolegu z K10; PO NASADENÍ, no v K11 na pokyn '
              'majiteľa 7. 11. 2026): `shared/BlurredContainImage.tsx` zapisoval `onErrorRef.current` počas renderu; zápis je teraz v `useEffect` '
              'pred efektom, ktorý hlási chybu, správanie sa nemení. Overenie podľa kolegu: test stráži poradie efektov, mutácie 5 z 5. '
              'Overenie: ako pri nálezu 279. Dopad na E2E: žiadny.'),
    dict(n=293, vetva='K11', pr='#241', zlucene=True,
         text='HOTOVÉ (K11, zlúčené v PR #241 dňa 7. 11. 2026, commit `da6c2324`; nález majiteľa z manuálneho testu po K10): okno ponúk '
              '(`DashboardModals.tsx`) ukázalo pri chybe nahrávania fotky natívne `alert()` s textom bez prekladu a chybu hodilo ďalej, takže '
              'vonkajší `catch` ukázal ešte „Ponuku sa nepodarilo uložiť“, hoci ponuka už bola uložená; pri vytváraní ostal koncept bez `id` a '
              'ďalšie uloženie spravilo druhý POST a skončilo na `duplicate_offer`. V rade nahrávania portfólia chýbal toast pri zamietnutých '
              'súboroch. Oprava: nový pomocník `getOfferImageUploadErrorMessage` (`modules/skills/offerSaveErrors.ts`); `uploadImagesIfNeeded` '
              'nevolá `alert()` ani nehádže chybu, ukáže toast za každú fotku, nahrá ostatné a ponuku dokončí; mobilná úprava '
              '(`useSkillSaveHandler.ts`) používa ten istý pomocník; rada portfólia (`usePortfolioImageUploadQueue.ts`) dáva jeden toast na '
              'dôvod a dávku. Overenie podľa kolegu: mutácie 16 zo 16, na pôvodnom kóde zlyhávalo okno ponúk aj rada. `DashboardModals.tsx` má '
              'teraz 485 riadkov. Natívne `alert()` ostáva na 14 miestach v 6 súboroch (nález 302). Overenie: ako pri nálezu 279; ručný test '
              'majiteľa po K11 (zlý formát v okne ponúk a v rade portfólia) zatiaľ nie je zapísaný. Dopad na E2E: žiadny.'),
    dict(n=282, vetva='K12', pr='#242', zlucene=True,
         text='HOTOVÉ (K12, zlúčené v PR #242 dňa 8. 11. 2026, commity `74d66e89` a `331e06ef`; nález kolegu z K10): starý multipart endpoint '
              '`POST /api/auth/skills/<id>/images/` ukladal originál fotky aj s polohou GPS a s pôvodným názvom súboru, ktorý sa stával súčasťou '
              'verejnej adresy. Nová `prepare_offer_image_upload` (`accounts/offer_image_upload.py`) odstráni EXIF (orientáciu pred tým zapečie '
              'do pixelov), HEIC a MPO vyjdú ako JPEG a názov je náhodný (`uuid`); čo sa očistiť nedá, dostane HTTP 400 a originál sa neuloží; GIF '
              'ostane nezmenený, len keď prípona aj obsah sú GIF. Po pripomienke Codexu (PR #242, P2) sa animovaný WebP a APNG nesplošťujú na '
              'prvú snímku: nový `swaply/animated_image_metadata.py` neprekódúva, ale prejde kontajner a skopíruje len chunky potrebné na '
              'zobrazenie, takže snímky a ich časovanie ostanú bajt po bajte rovnaké (EXIF a GPS, XMP, textové chunky, neznáme chunky a údaje '
              'za koncom zmiznú; výsledok sa overí a inak sa použije bežné prekódovanie; orientácia z EXIF sa pri animáciách nezapeká). Zdieľané '
              '`strip_image_metadata` sa nemení, takže avatary a správy sú bez zmeny (animované PNG a WebP tam ostávajú sploštené, nález 298). '
              'Overenie podľa kolegu: 23 testov v `test_offer_image_upload.py` (9 z 12 testov endpointu zlyhalo pred opravou), mutácie 10 z 10; '
              'k animácii 36 testov (4 zlyhali na starom kóde), mutácie 30 z 30; SQLite 2 270 testov a PostgreSQL 16 2 286 testov prešlo, CI '
              'prešlo (`checks` aj `backend-postgres`). Na Railway sa endpoint z UI nevolá (tam ide S3), takže ho možno overiť len priamym '
              'volaním: ručný test majiteľa po K12 potvrdil anonymný názov súboru, no fotka bola neprístupná (nález 301), preto sa odstránenie '
              'GPS ručne neoverilo. Dopad na E2E: žiadny.'),
    dict(n=246, vetva='K12', pr='#242', zlucene=True,
         text='HOTOVÉ (K12, zlúčené v PR #242 dňa 8. 11. 2026, commit `85dbd5fd`; sonda agenta z vetvy 165): súbeh zdieľania a zmazania ponuky '
              'alebo položky portfólia dával na PostgreSQL HTTP 500 (cudzí kľúč sa kontroluje až pri COMMIT; rovnaký mechanizmus ako pri nálezu '
              '232). Nová `FeedPost._lock_shared_source` (`accounts/models/feed_posts/sharing.py`; predtým `_lock_shared_feed_post_source`) '
              'zamkne zdroj (príspevok, ponuku alebo položku portfólia; `select_for_update`) v tej istej transakcii ako INSERT zdieľania; zdroj '
              'zmazaný medzitým dá HTTP 400 namiesto 500. `OfferedSkill.delete()` a `PortfolioItem.delete()` zamykajú riadok pred zmazaním. '
              '`portfolio/views.py` (507 riadkov) sa nemenil. Overenie podľa kolegu: 15 testov so súbehom dvoch vlákien '
              '(`test_feed_share_source_delete_race.py`, len PostgreSQL; na SQLite sa preskočia a pokrýva ich job `backend-postgres`), pred '
              'opravou 11 zlyhaní a 2 chyby, mutácie 12 z 12, osemkrát opakované bez nestabilného pádu. Zámky platia pre zdieľanie a model '
              '`delete()`, nie pre hromadné `QuerySet.delete()` (nález 296). Overenie: ako pri nálezu 282. Dopad na E2E: žiadny.'),
    dict(n=194, vetva='K12', pr='#242', zlucene=True,
         text='HOTOVÉ (K12, zlúčené v PR #242 dňa 8. 11. 2026, commit `73928b7d`): týždenný workflow `.github/workflows/dependency-audit.yml` '
              '(pondelok 05:23 UTC a ručne, nie pri PR ani pushi; nezastavuje PR a Railway naň nečaká) spustí `pip-audit` '
              '(`requirements.txt` a `requirements-test.txt`) a `npm audit --omit=dev` a skript `.github/scripts/check_dependency_audit.py` '
              'porovná výsledok (prah `high` pre npm) so zoznamom výnimiek `.github/dependency-audit-exceptions.json` (každá má `id`, `reason` '
              'a `remove_when`); kód 0 je čisté, 1 nový záznam, 2 chýbajúci alebo poškodený vstup (audit sa nevykonal, napr. výpadok registra). '
              'Dnes je vo výnimkách jediný záznam: `PYSEC-2026-1845` (pytest 8.3.2; čaká na pytest 9, nález 183). Overenie podľa kolegu: 35 '
              'testov (`backend/tests/test_dependency_audit_script.py`), mutácie 30 z 30; na GitHube je beh 1 na `main` zelený a skúšobný beh 2 '
              'na vetve `test-audit` (upravený zoznam výnimiek) červený presne v kroku „Compare with known exceptions“, so zhrnutím nového '
              'záznamu aj zastaranej výnimky. Prvý plánovaný beh je v pondelok 9. 11. 2026 okolo 06:23 (05:23 UTC). Audit pokrýva len '
              '`requirements*.txt` a produkčné npm balíky. E-mail o červenom plánovanom behu dostane ten, kto naposledy zmenil riadok `cron`; '
              'commit je od autora „Claude“ (noreply@anthropic.com), nie z účtu majiteľa, takže e-mail nemusí prísť majiteľovi: kým majiteľ '
              'riadok `cron` sám nezmení, treba v pondelok skontrolovať záložku Actions ručne. Doplnky: nové akcie `checkout@v4`, `setup-node@v4` '
              'a `setup-python@v5` hlásia „Node.js 20 is deprecated“ (nález 196); `glob` a `minimatch` (moderate, nález 229) pri prahu `high` '
              'audit nehlási. Doplnok z K14 (PR #245, 8. 11. 2026): audit teraz číta `backend/constraints.txt` (aj tranzitívne balíky); '
              'lokálny audit zámku ukázal podľa kolegu len `pytest` 8.3.2 (`PYSEC-2026-1845`), ktorý je vo výnimkách. Prvý plánovaný '
              'beh (9. 11. 2026 05:23 UTC) teda prvýkrát audituje celý zámok; červený beh znamená nový záznam mimo výnimiek, nie '
              'chybu K14. Dopad na E2E: žiadny.'),
    dict(n=301, vetva='K13', pr='#244', zlucene=True,
         text='HOTOVÉ (K13, zlúčené v PR #244 dňa 8. 11. 2026, commit `68e2a28b`; variant (a) z rozhodnutia R30): `skill_images_view` '
              '(`accounts/views/skills.py`, teraz 482 riadkov) vráti pri nastavenom `AWS_STORAGE_BUCKET_NAME` HTTP 400 s textom, že '
              'fotky ponúk idú cez úložisko (`upload-init` a `upload-complete`), a nič neuloží. Overenie vlastníka (404 pre cudziu '
              'ponuku) ide pred touto kontrolou a GET ostáva. Bez bucketu (lokálny vývoj, testy) sa nič nemení; podmienka je v '
              'samostatnej funkcii `_offer_images_use_storage_upload`, lebo `skill_images_view` má lokálne importy `settings`. '
              'Overenie podľa kolegu: 7 testov (5 padalo pred opravou, ďalšie dva strážia poradie kontrol), mutácie 9 z 9; CI prešlo '
              '(`checks` aj `backend-postgres`). Pozor: dôvod („súbor sa uloží mimo verejného prefixu `media/`“) je v komentári v '
              'kóde napísaný ako fakt, no ide o odhad z kódu; skutočná politika bucketu v repozitári nie je (nález 304) a overenie v '
              'AWS konzole čaká na majiteľa. Fotka z ručného testu ostáva v testovacej ponuke: zmazať ju treba v aplikácii. Zostáva '
              'nález 300 (telo chyby vývojovej zálohy). Dopad na E2E: žiadny (špecy starý endpoint nevolajú).'),
    dict(n=296, vetva='K13', pr='#244', zlucene=True,
         text='HOTOVÉ (K13, zlúčené v PR #244 dňa 8. 11. 2026, commit `b43a40fb`): `anonymize_user` (`accounts/account_deletion.py`, '
              'teraz 353 riadkov) mazal ponuky, portfólio a príspevky hromadným `QuerySet.delete()`, ktoré obchádza zámky z 246 a '
              '232; pri súbežnom zdieľaní vznikala chyba 500 (na PostgreSQL 16 reprodukované, 6 súbehových testov padalo). Oprava: '
              'riadok používateľa sa zamyká `FOR NO KEY UPDATE` (`select_for_update(no_key=True)`; zamykanie sa naďalej vylučuje s '
              '`lock_users_for_update`), ponuky a položky portfólia sa mažú po jednej cez `delete()` modelu v poradí `pk` a príspevky '
              'autora sa pred zmazaním zamknú tiež v poradí `pk`. Samotné mazanie po jednej (návrh z textu pre kolegu) skončilo v '
              'jednom poradí deadlockom, potvrdeným v logu PostgreSQL; zámok používateľa ho odstránil. Overenie podľa kolegu: 10 '
              'testov (9 padalo pred opravou), mutácie 9 z 9 (dve najprv prežili a pribudli testy), súbehové testy 5× po sebe bez '
              'pádu. Z kontroly CodeRabbit (PR #244): job `backend-postgres` v `deploy.yml` teraz najprv overí, že Django používa '
              'PostgreSQL, inak skončí chybou (commit `5158aeb0`, overené v piatich scenároch), lebo súbehové testy sa pri zlom alebo '
              'chýbajúcom `DATABASE_URL` ticho preskakovali. Mazanie cez administráciu a príkaz `delete_all_users` ostáva mimo (nález '
              '305). Dopad na E2E: žiadny.'),
    dict(n=297, vetva='K13', pr='#244', zlucene=True,
         text='HOTOVÉ (K13, zlúčené v PR #244 dňa 8. 11. 2026, commit `06e68e2e`): v jobe `checks` v `.github/workflows/deploy.yml` '
              'beží krok „Check missing translations“ hneď za krokom „Check used translation keys“ (po `npm ci`, pred testami); '
              'komentár nad ním vysvetľuje, že dopĺňa prvú kontrolu a že nehľadá slovenské kópie v iných jazykoch (nález 176). '
              'Overenie: v CI zelený, 4 409 kľúčov, 0 chýbajúcich a 0 navyše v piatich jazykoch (agent 8. 11. 2026 lokálne rovnako). '
              'Dopad na E2E: žiadny.'),
    dict(n=244, vetva='K14', pr='#245', zlucene=True,
         text='HOTOVÉ (K14, zlúčené v PR #245 dňa 8. 11. 2026, commit `1e4f35fd`): nový `backend/constraints.txt` pripína 115 balíkov '
              'vrátane tranzitívnych z čistého prostredia Python 3.11 (postup obnovy je v jeho hlavičke). `-c constraints.txt` je '
              'prvý riadok `requirements.txt` aj `requirements-test.txt`, takže zámok platí pri každej inštalácii vrátane ciest, '
              'ktoré v Railway nevidno; chýbajúci súbor zhodí build. `backend/Dockerfile` kopíruje `constraints.txt` (`COPY '
              'requirements.txt constraints.txt ./`) a týždenný `dependency-audit.yml` audituje presne zámok, teda aj tranzitívne '
              'balíky. V CI pribudol krok „Check dependency lock“ (`.github/scripts/check_dependency_lock.py`): piny sú presné, '
              '`requirements*.txt` ich spĺňajú a nainštalované balíky sa rovnajú zámku. `railway.json` sa nemení: kolega tvrdí, že ho '
              'Railway nečíta a stavia z `backend/Dockerfile` (potvrdiť môže len majiteľ v nastaveniach Railway, nález 315). Príčina '
              'incidentu z nálezu 240 je tým odstránená. Overenie podľa kolegu: 35 testov, mutácie 22 z 22, čisté prostredie s `-c`, '
              '`pip check` a `manage.py check` čisté, SQLite 2 316 prešlo a 24 preskočených, PostgreSQL 2 338 prešlo a 2 preskočené; '
              'CI prešlo vrátane nového kroku. Po zmene `requirements*.txt` treba zámok obnoviť, inak je krok červený a „Wait for CI“ '
              'nasadenie zastaví. `pip`, `setuptools` a `wheel` v zámku nie sú (patria základnému obrazu). Prvé nasadenie nainštaluje '
              'presne tieto verzie; podľa kolegu sa oproti jeho staršiemu prostrediu pohlo 5 zo 115 balíkov (napr. `celery` 5.6.3 → '
              '5.7.0). Agent rekonštruoval rozlíšenie pôvodného `requirements.txt` k 5. až 6. 11. 2026 (nástroj `uv`, '
              '`--exclude-newer`): proti zámku sa líšili len `cbor2` (6.2.0.post2 → 6.2.1) a `click` (8.5.0 → 8.5.1), takže produkčný '
              'build zámok takmer nezmenil; je to odhad, skutočné verzie ukáže `pip freeze` z `backend-http`. Zostáva nález 317 '
              '(zámok je bez hashov). Dopad na E2E: žiadny priamy.'),
    dict(n=286, vetva='K14', pr='#245', zlucene=True,
         text='HOTOVÉ (K14, zlúčené v PR #245 dňa 8. 11. 2026, commity `ef4fa87d` (základ a Blokované), `b1ed7146` (Upozornenia), '
              '`53b9c7d3` (Súkromie) a `84438a5b` (Sledovanie na mobile)): spoločný základ je hook `useDelayedLoading` a obal '
              '`DelayedSkeleton` (kostra je v DOM od prvého snímku, prvých 200 ms neviditeľná a drží miesto, potom pulzuje; '
              '`role=status`, `aria-busy` a text pre čítače) a animácia `content-in` (150 ms, len priehľadnosť; existujúca '
              '`animate-fade-in` je v `globals.css` dvakrát a posledná posúva obsah o 20 px). „Znížený pohyb“ rieši globálny blok '
              '`prefers-reduced-motion`. Blokované: kostra aj zoznam 244 × 358 px, CLS 0 (predtým kostra 267 px a prázdny stav 236 '
              'px). Upozornenia: pod voľbou Správ sa už nepridáva riadok „Načítavam nastavenia…“ (posun 24 px, pri uloženom „Zapnuté“ '
              '44 px); `usePushMessagesPreference` vracia `initialLoading`, kostra `OptionRowsSkeleton` drží výšku a stavový riadok '
              '`PushMessagesStatus` je v DOM vždy; blok Správ sa nehýbe (CLS 0). Súkromie: prázdny snímok (12 ms pri ťuknutí, 24 ms '
              'pri priamom vstupe) vznikal v `ModuleRouter`, kde je `useIsMobile()` v prvom vykreslení vždy „desktop“; nový '
              '`PrivacySettings.tsx` vykreslí obe rozloženia a vyberie CSS (pôvodné dva komponenty sa nemenia). Sledovanie na mobile: '
              'kostra až po 200 ms a obsah sa po načítaní vyfaduje (okno Sledovania sa nemení). Čísla (px, ms, CLS) sú merania kolegu '
              'v Chromiu, agent ich nezopakoval a iPhone sa neoveril. Overenie podľa kolegu: 24, 36, 14 a 7 testov, mutácie 25 z 25, '
              '25 z 25, 14 z 14 a 11 z 11 (niektoré najprv prežili a pribudli testy). Z kontroly CodeRabbit (PR #245): chyba pod '
              'voľbou Správ má `role=alert` (`e61d44f8`) a JSDoc k dotknutým funkciám (`29d4755e`; kontrola pokrytia hlásila 78,13 % '
              'pri prahu 80 %). Obmedzenia podľa kolegu: kostra sa ukáže až po 200 ms bez minimálnej doby zobrazenia, takže pri '
              'odpovedi za 0,2 až 0,25 s môže krátko bliknúť; `PrivacySettings` drží v DOM obe rozloženia (jedno je `display: none`), '
              'preto treba selektory v testoch a E2E zužovať na viditeľné (dnes žiadny taký nie je). Zvyšky sú nálezy 308 až 311. '
              'Dopad na E2E: žiadny podľa kolegu (`mobile-settings-navigation.spec.ts:41` stále vidí '
              '`notifications-push-messages-mobile`).'),
    dict(n=322, vetva='K15', pr='#250', zlucene=True,
         text='HOTOVÉ (K15, zlúčené v PR #250 dňa 9. 11. 2026, commit `3d24eb54`; spolu s 323): nový malý hook `useStableScreenProps` '
              '(nový súbor, 78 riadkov) odovzdáva hooku obrazovky Popis ponuky stabilné vstupy: `initialTags` má rovnakú referenciu, '
              'kým sa nezmení obsah poľa, a každá zo 17 funkcií `on…` je stabilná a volá vždy najnovšiu funkciu rodiča (zoznam '
              'funkcií je typovo úplný, takže nová funkcia bez zápisu v zozname sa nepreloží). `SkillsDescriptionScreen.tsx` (teraz '
              '28 riadkov) ho volá; `SkillsModuleRouter.tsx` (583 riadkov), `useSkillsDescriptionScreenState.ts` (638 riadkov) ani '
              '`TagsSection.tsx` sa nemenili a návrh z karty držal bez zmeny. Overenie podľa kolegu: 15 nových testov (päť so '
              'skutočným `SkillsModuleRouter`, z toho štyri padali pred opravou; deväť testov hooku; jeden test na serveri bez '
              'varovania), mutácie 14 zo 14, Jest v module skills 19 sád a 109 testov, ESLint a tsc bez chýb. V Chromiu (emulácia '
              'iPhone 13): tag „kvet“ pridaný okrúhlym tlačidlom a uložený: pred opravou ostal riadok Tagy „Pridať tagy“ (tag sa '
              'stratil), po oprave „1 tag“. CI (`checks`, `backend-postgres`) prešlo a CodeRabbit bol bez pripomienok. Majiteľ 9. 11. '
              '2026 po nasadení oznámil, že K15 prešla testami bez nových nálezov. Dopad na E2E: žiadny špec s tagmi ani s touto '
              'obrazovkou na mobile.'),
    dict(n=323, vetva='K15', pr='#250', zlucene=True,
         text='HOTOVÉ (K15, zlúčené v PR #250 dňa 9. 11. 2026, commit `3d24eb54`; spolu s 322): slučka prekresľovania obrazovky Popis '
              'ponuky je odstránená rovnakou opravou (stabilné obslužné funkcie vo `SkillsDescriptionScreen.tsx`). Kolega slučku '
              'potvrdil aj v prehliadači (Chromium, emulácia iPhone 13, aplikácia ako v prehliadači so simulovaným API): produkčný '
              'build pred opravou 7 575 potvrdení Reactu za 4 s po otvorení obrazovky (nepretržite), po oprave 3; vývojový build pred '
              'opravou 8 až 9 chýb „Maximum update depth exceeded“, po oprave 0. V teste so skutočným smerovačom bolo pred opravou 62 '
              'prekreslení a 122 zápisov do rodiča (poistka testu), po oprave 3 a 2. Podobné miesta (efekt s `on…Change` v '
              'závislostiach, ktorý zapisuje do rodiča) kolega nenahlásil. Testy a overenie ako pri 322.'),
    dict(n=320, vetva='K15', pr='#250', zlucene=True,
         text='HOTOVÉ (K15, zlúčené v PR #250 dňa 9. 11. 2026, commit `3cceeba1`): polia „Nové heslo“ a „Potvrdenie hesla“ v '
              '`ResetPasswordClient.tsx` majú výslovne `text-gray-900` a v bežnom stave `bg-white`; v stave s chybou ostáva '
              '`bg-red-50` (dve pozadia sa nebijú). `color-scheme` v `layout.tsx` sa nemenilo. Príčina z karty sa potvrdila. Odchýlka '
              'od karty: `forgot-password` už má `bg-white dark:bg-black text-gray-900 dark:text-white` (riadok 232), `verify-email` '
              'a `delete-account/confirm` nemajú žiadne pole, takže sa nemenili. Overenie podľa kolegu: 3 nové testy (všetky padali '
              'pred opravou), mutácie 7 zo 7; Chromium (emulácia iPhone 13): pri tmavej systémovej schéme malo pole pred opravou '
              'pozadie `rgb(59, 59, 59)` a biely text, po oprave `rgb(255, 255, 255)` a `rgb(17, 24, 39)`; pri svetlej schéme bolo '
              'biele pred aj po. Codex po nasadení K15 (9. 11. 2026): nový WebKit test `reset-password-colors.spec.ts` (svetlá aj '
              'tmavá schéma, WebKit desktop aj mobil) prešiel 4 zo 4 (Chromium 2 projektové SKIP); overenie odkazu je v ňom zachytené '
              'a odpoveď syntetická, takže netestuje skutočnú platnosť odkazu; test je zatiaľ lokálny a čaká na PR. Majiteľ po '
              'nasadení oznámil, že K15 prešla testami bez nových nálezov. ESLint hlási v súbore dve staré chyby mimo zmeny (riadok '
              '56 nepoužitá premenná, riadok 129 `any`): zapísané v `poznamky.md`.'),
    dict(n=306, vetva='K15', pr='#250', zlucene=True,
         text='HOTOVÉ (K15, zlúčené v PR #250 dňa 9. 11. 2026, commit `60fe0dec`): `getApiErrorMessage` v `lib/apiError.ts` (90 '
              'riadkov) vráti záložný text, ak chyba nemá `response` a je to chyba axiosu (`isAxiosError`) alebo nesie kód '
              '`ERR_NETWORK`, `ECONNABORTED` alebo `ETIMEDOUT`; text od servera má prednosť vždy a obyčajné `Error` s vlastnou '
              'správou ostáva ako dnes. Odchýlka od karty: pridaný `ETIMEDOUT` a príznak `isAxiosError`, aby sa pokryla aj chyba '
              'knižnice bez kódu a zrušená požiadavka (`ERR_CANCELED`), ktorá by inak ukázala anglické „canceled“. Overenie podľa '
              'kolegu: 10 nových testov (päť padalo pred opravou), mutácie 12 z 12; Jest 83 sád a 1 590 testov závislých od '
              '`apiError.ts` prešlo bez zmeny, ESLint a tsc bez chýb. Texty chýb v `useNotificationPreferences.ts` a '
              '`usePushMessagesPreference.ts` sa nemenili (nález 319 je v K16). Dopad na E2E: žiadny (E2E nehľadá text „Network '
              'Error“).'),
    dict(n=308, vetva='K16', pr='#253', zlucene=True,
         text='HOTOVÉ (K16, zlúčené v PR #253 dňa 10. 11. 2026, commit `b800f209`): pasívne varovanie pod voľbou Správy (push je '
              'zablokovaný, nepodporovaný alebo tento prehliadač nie je zaregistrovaný) sa odvodzuje počas vykresľovania novou čistou '
              'funkciou `getPassiveBrowserWarning` v `usePushMessagesPreference.ts` (288 → 298 riadkov, po JSDoc z commitu `045267c1` '
              '311), nie v efekte; chyby po akcii ostávajú stavom `actionError` a `error` ich skladá v poradí chyba uloženia či '
              'načítania, chyba po akcii, pasívne varovanie. Počiatočné povolenie sa zisťuje už pri prvom vykreslení na klientovi, na '
              'serveri ostáva „unsupported“ (bez rozdielu pri hydratácii, test). Príčinu z karty kolega potvrdil: pred opravou sa '
              'varovanie objavilo 62 ms po riadkoch voľby a blok Správ vyrástol o 28 px (desktop) a o 68 px (mobil). Odchýlka od '
              'karty: návrh drží len čiastočne. Druhý, neskorší skok je preč (varovanie je v rovnakom snímku ako riadky voľby), no '
              'posun pri výmene kostry za hotovú voľbu ostáva (CLS 0,0334 na mobile a 0,0054 na desktope, rovnako ako pred opravou), '
              'lebo kostra nevie vopred, či varovanie bude; nulový posun by vyžadoval dimenzovať kostru podľa naposledy známej voľby '
              'uloženej v zariadení, čo je zmena návrhu a nerobila sa (poznámka v `poznamky.md`). Overenie podľa kolegu: 21 nových '
              'testov (pred opravou padá 12), mutácie 14 z 14, Chromium (produkčný build, simulované API), Jest 43 sád a 966 testov, '
              'ESLint a tsc bez chýb. Texty varovaní sa nemenili (nález 319). Manuálne testy majiteľa po nasadení prešli. Dopad na '
              'E2E: žiadny.'),
    dict(n=309, vetva='K16', pr='#253', zlucene=True,
         text='HOTOVÉ (K16, zlúčené v PR #253 dňa 10. 11. 2026, commit `c14db2dd`): v `OfferWatchMobileListScreen.tsx` (151 → 183 '
              'riadkov) ukazuje odznak počas načítavania „− / 5“ (znamienko mínus U+2212 má v písme Inter s tabuľkovými číslicami '
              'rovnakú šírku ako číslica, odznak má 55 px pred aj po príchode počtu; pomlčka z návrhu karty bola o 2 px užšia) a '
              'tlačidlo aj hláška o limite sú v jednom mriežkovom políčku, v ktorom miesto druhého drží neviditeľná rezerva '
              '(`aria-hidden`, text v atribúte `data-ghost`), takže výmena nehýbe obsahom. Návrh drží: CLS pri načítaní piatich '
              'sledovaní 0,0325 → 0,0000 (cieľ pod 0,01), s nulou a tromi sledovaniami tiež 0,0000. Cena opravy: pri menej ako '
              'piatich sledovaniach je pod tlačidlom neviditeľná rezerva na výšku hlášky (políčko 66 px namiesto 48 px, teda 18 px '
              'navyše; na úzkych telefónoch a v nemčine pri 360 px až 38 px); jediná alternatíva je ponechať posun pri piatich '
              'sledovaniach. Mimo karty kolega nahlásil, že pri chybe načítania ukazuje odznak „0 / 5“ (poznámka v `poznamky.md`). '
              'Overenie podľa kolegu: 12 nových testov (pred opravou padá 6), mutácie 16 z 16, Chromium (iPhone 13, produkčný build), '
              'Jest 54 sád a 1 170 testov, ESLint a tsc bez chýb. Texty, `MAX_OFFER_WATCHES` ani '
              '`data-testid="offer-watch-list-loading"` sa nemenili (pribudli `offer-watch-create-slot` a '
              '`offer-watch-limit-reserve`). Manuálne testy majiteľa po nasadení prešli. Dopad na E2E: žiadny.'),
    dict(n=310, vetva='K16', pr='#253', zlucene=True,
         text='HOTOVÉ (K16, zlúčené v PR #253 dňa 10. 11. 2026, commit `c262e5ae`): kostra celej stránky aj kostra zoznamu v '
              '`OfferWatchSettingsDesktop.tsx` (251 → 280 riadkov) sú v `DelayedSkeleton` s `pulse={false}` (viditeľné až po 200 ms; '
              'existujúce preklady `common.loading` a `offerWatchResults.loading`), obsah po načítaní sa krátko vyfaduje '
              '(`animate-content-in`, len po načítaní, nie pri návrate z dialógu). Pred opravou bola kostra pri odpovedi za 60 ms '
              'viditeľná 93 ms, po oprave nikdy. Odchýlky od karty: `role="status"`, `aria-busy` a skrytý text sa presunuli z '
              '`OfferWatchSettingsSkeleton.tsx` (74 → 66 riadkov, prop `loadingLabel` zanikol) na obal `DelayedSkeleton`, inak by '
              'vznikla druhá rola; názov jedného existujúceho testu sa upravil (tvrdenia ostali); zoznam, ktorý sa pri neskoršom '
              'načítavaní len vymení za kostru, sa nevyfaduje. Overenie podľa kolegu: 9 nových testov (pred opravou padá 8), mutácie '
              '16 z 16, Chromium (1280 × 900, produkčný build), Jest 40 sád a 944 testov, ESLint a tsc bez chýb. Vnútorné '
              '`data-testid` kostry ostali (pribudli obaly `offer-watch-settings-loading` a `offer-watch-desktop-list-loading`). '
              'Manuálne testy majiteľa po nasadení prešli. Dopad na E2E: žiadny nájdený (čas zobrazenia kostry sa posúva o 200 ms).'),
    dict(n=302, vetva='K17', pr='#254', zlucene=True,
         text='HOTOVÉ (K13 šesť miest, K17 osem miest; K17 zlúčené v PR #254 dňa 10. 11. 2026): všetkých štrnásť natívnych `alert()` '
              'z pôvodného rozsahu je toast s prekladmi. K13 (PR #244, commit `e83100db`): `useSkillsModals.ts` 3, '
              '`DashboardModals.tsx` 2 a `TagsSection.tsx` 1, nový preklad `accountType.changeFailed`. K17 (výnimka R31, každé miesto '
              'vo vlastnom commite): `SkillsModuleRouter.tsx` 4 (limit kariet; commity `2c065c79`, `a2cc112d`, `5bd8dd2b`, '
              '`568506a9`), `OfferReviewsView.tsx` 3 (`14b3f4de`, `c2bfd472`, `1921a638`) a `useSkillsDescriptionScreenState.ts` 1 '
              '(`37490596`); nový preklad `reviews.deleteReviewFailed` v šiestich jazykoch a použitie existujúceho '
              '`skills.imageDeleteFailed`. Pripomienku CodeRabbitu k PR #254 (slovenský záložný text pri sieťovej chybe cez smerovač) '
              'opravil commit `69231ddc` jedným riadkom `SkillsModuleRouter.tsx:461` (mimo pôvodného rozsahu, na žiadosť majiteľa). '
              'Kontrola agenta po zlúčení (R31): diff troch súborov sú len importy, nahradené riadky a päť zastaraných komentárov '
              '`eslint-disable-next-line no-alert`; počty riadkov 583 → 580, 692 → 692, 638 → 639. Kolega zistil, že štyri `alert()` '
              'v `SkillsModuleRouter.tsx` boli cez skutočné rozhranie nedosiahnuteľné (limit stráži `SkillsScreen`), takže ich '
              'používateľ nikdy nevidel (poznámka v `poznamky.md`). Overenie podľa kolegu: celý Jest 571 sád a 8 594 testov, tsc, '
              'build a kontroly prekladov čisté, mutácie 47 z 47 (302: 37, preklad: 5, 312: 5). Dopad na E2E: žiadny. Ručný test '
              'majiteľa po nasadení K17 zatiaľ nepotvrdený.'),
    dict(n=312, vetva='K17', pr='#254', zlucene=True,
         text='HOTOVÉ (K17, zlúčené v PR #254 dňa 10. 11. 2026, commit `3d179be1`): chyba načítania v `BlockedUsersModule.tsx` (279 '
              'riadkov) má `role="alert"` (jeden riadok), takže ju čítač obrazovky oznámi. Overenie podľa kolegu: nový test (rola '
              '`alert` a text chyby), mutácie 5 z 5. Dopad na E2E: žiadny. Čítač obrazovky sa neskúšal (patrí do 294).'),
]
