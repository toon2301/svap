# -*- coding: utf-8 -*-
"""Nálezy opravené od 6. 11. 2026 (práca kolegu K3 až K7, Codexove PR a vetva 165): `DONE_SINCE_DALSIE`.

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
]
