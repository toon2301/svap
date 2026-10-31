# Svaply – zoznam nálezov, plán opráv a príprava nasadenia

> Hlavný zoznam nálezov projektu. Súbor je **generovaný** z dát v tomto priečinku (`build.py`) a neupravuje sa ručne: pozri časť 10.

Posledná aktualizácia: **31. 10. 2026**. Stav kódu: `main` `0905aedd` (po PR #217); register: 21. 10. 2026 + PR #193. Zlučuje tri zdroje: (1) pôvodný zoznam 1–172 (viedol sa v samostatnej konverzácii), (2) nálezy z práce na vetvách od 127 (čísla 173–230) a (3) evidenciu OW- / TEST- / APP- / TECH- z `docs/testing/findings-register.md`, ktorá ostáva podrobným denníkom týchto položiek. Súčasťou sú aj kontroly z 26. 10. 2026 (`pip-audit`, `npm audit`, prehľad repozitára a nasadzovacích súborov).

**Dôležité:** roztriedenie na HNEĎ / PRED NASADENÍM / PO NASADENÍ je návrh agenta; nič sa neopravuje bez výberu používateľa. Čísla nálezov sú stabilné, nikdy sa nemenia ani nepoužívajú znova; nový nález dostane číslo 231. Aktuálne je v zozname 230 nálezov.

## V skratke

- Nálezy 1–230: hotové 65 (z toho 1 čaká na zlúčenie), zatvorené 4, informačné 20; otvorené: **HNEĎ 0**, **PRED NASADENÍM 31**, **PO NASADENÍ 110**.
- Z pôvodných 101 otvorených položiek je dnes otvorených 101 (13 pred nasadením, 88 po nasadení, 0 hneď). Pri vzniku dokumentu (26. 10. 2026) nebola žiadna z nich kritická.
- **Hneď** (časť 3): nič nie je otvorené.
- **Pred nasadením** (časť 4): 31 nálezov, 19 ID z registra a 16 úloh na prípravu nasadenia. Odporúčané poradie je v časti 2.
- **Po nasadení** (časť 5): 110 nálezov a 20 ID z registra (upratovanie, mikrovýkon, kozmetika, väčšie funkcie).
- **Rozhodnutia** (časť 6): čaká 9 z 11; každé má v stĺpci „Kedy“ uvedené, od akej práce je potrebné.
- **Hosting** nového servera sa rieši až keď bude aplikácia hotová (Railway ostáva na testy); odporúčanie je v prílohe C.

## Obsah

- [V skratke](#v-skratke)
- [0. Ako to čítať](#0-ako-to-čítať)
- [1. Prehľad v číslach](#1-prehľad-v-číslach)
- [2. Odporúčané poradie práce](#2-odporúčané-poradie-práce)
- [3. HNEĎ](#3-hneď)
- [4. PRED NASADENÍM](#4-pred-nasadením)
- [5. PO NASADENÍ](#5-po-nasadení)
- [6. Rozhodnutia](#6-rozhodnutia)
- [7. Hotové](#7-hotové)
- [8. Zatvorené a informačné (bez akcie)](#8-zatvorené-a-informačné-bez-akcie)
- [9. Register: čo je zatvorené a čo čaká na živé overenie](#9-register-čo-je-zatvorené-a-čo-čaká-na-živé-overenie)
- [10. Ako sa dokument udržiava](#10-ako-sa-dokument-udržiava)
- [11. Zmeny v dokumente](#11-zmeny-v-dokumente)
- [Príloha A: kontrola úplnosti](#príloha-a-kontrola-úplnosti)
- [Príloha B: zdroje, zistenia a obmedzenia](#príloha-b-zdroje-zistenia-a-obmedzenia)
- [Príloha C: kam nasadiť (až keď bude aplikácia hotová)](#príloha-c-kam-nasadiť-až-keď-bude-aplikácia-hotová)

## 0. Ako to čítať

| Skupina | Význam | Kritérium |
| --- | --- | --- |
| **HNEĎ** | Riešiť teraz, ešte pred ďalšou funkčnou prácou. | Bezpečnosť, strata alebo poškodenie dát, rozbitý základný tok; alebo vec, ktorá bráni bezpečnému testovaniu; alebo vec, ktorá je lacná teraz a drahá neskôr (veľké skoky verzií knižníc). |
| **PRED NASADENÍM** | Musí byť hotové pred ostrým štartom pre používateľov, nie nutne teraz. | Viditeľné chyby, chyby na iPhone, preklady pre jazyky štartu, spoľahlivosť CI a monitoringu. Príprava servera (úlohy N) sa robí až keď bude aplikácia hotová. |
| **PO NASADENÍ** | Môže počkať aj po štarte. | Kozmetika, upratovanie, mikrovýkon, architektonický dlh, väčšie nové funkcie, okrajové správanie. |

V tabuľkách je stĺpec **Dopad · Zl.**: dopad je **vysoký** (bezpečnosť, dáta, základný tok), **stredný** (viditeľná chyba, iPhone, jazyk) alebo **nízky**; zložitosť (**Zl.**) je **S** do pol dňa vrátane testov, **M** 1–2 dni, **L** viac dní alebo viac krokov. Sú to odhady, nie sľuby. Pri položkách, ktoré čakajú na rozhodnutie používateľa, je odkaz na časť 6. Stĺpec **Čo** je pri číslach 1–172 pôvodný text zo zoznamu, **Poznámka** pridáva agent.

Pravidlá práce: každá oprava ide na novú očíslovanú vetvu z `main`, najprv mapovanie a plán, kód až po výslovnom „poď na to“ používateľa, testy + mutačné kontroly, PR otvára používateľ. Registrové pravidlo: bezpečnosť, strata dát, obídenie oprávnení a nefunkčný základný tok majú prednosť.

## 1. Prehľad v číslach

Očíslované nálezy 1–230:

| Skupina | Počet | Poznámka |
| --- | --- | --- |
| Hotové (zlúčené do `main`) | 64 | tabuľka v časti 7 |
| Opravené, čaká na zlúčenie | 1 | tabuľka v časti 7 |
| Zatvorené rozhodnutím | 4 | časť 8 |
| Informačné bez akcie | 20 | časť 8 |
| **HNEĎ** | 0 | časť 3 (–) |
| **PRED NASADENÍM** | 31 | časť 4 |
| **PO NASADENÍ** | 110 | časť 5 |
| **Spolu** | 230 | 172 pôvodných + 58 nových (173–230) |

Okrem toho (mimo číslovania 1–230):

| Zdroj | HNEĎ | PRED | PO | Zlúčené, čaká živé overenie (N16) | Zatvorené alebo pokryté nálezom |
| --- | --- | --- | --- | --- | --- |
| Úlohy na prípravu nasadenia N1–N16 | 0 | 16 | 0 | – | – |
| Register: 68 ID (OW- / TEST- / APP- / TECH- / TOOL- / ENV- / DOC- / RET- / REG-) | 0 | 19 | 20 | 7 | 22 |

## 2. Odporúčané poradie práce

| Vlna | Čo | Prečo v tomto poradí |
| --- | --- | --- |
| **0 – najprv** | Rýchle upgrady z 183 a 184 bez veľkého rizika: backend (Pillow, gunicorn, requests, DRF, simplejwt, daphne, python-dotenv, bleach, Django 4.2.30, odstránenie allauth) je hotový a zlúčený (vetva 143, PR #203), frontend (`npm audit fix`, odstránený `next-intl`) je zlúčený (vetva 142). Skok `next` 14 → 16 je hotový vo vetve 159; Django 5.2 je zlúčený (vetva 154, PR #214), protobuf opravený (vetva 158, PR #217) a zo 183 ostáva len vývojový `pytest` (skupina po nasadení) | Malé a bezpečné. Zraniteľné verzie zmiznú skôr, než pribudne ďalší kód. |
| **1 – základ, kým sa aplikácia dokončuje** | Veľké skoky verzií sú hotové (Django 5.2 LTS s DRF 3.18.3 vo vetve 154, `google-cloud-vision` s protobuf vo vetve 158, Next 16 s Reactom 19 vo vetve 159); ďalej 179 (2FA), 9, 33, 52, 185, 214, OW-07 a balík „Spoľahlivosť CI a testov“ (31, TEST-…, 189, 209, 223, 225, 228; 212 je hotová vo vetve 157) | Veľké skoky verzií sú najlacnejšie teraz, kým je kódu najmenej, a hneď po nich treba spustiť celé testy. |
| **2 – viditeľné chyby a overenia (iPhone a mobil)** | Navigácia a Späť (13, 14, 174), Profil a identita (81, 119), Zdieľanie (91, 92, 207), Upozornenia na zmazaný obsah (74), Žiadosti (17), Vyhľadávanie a Sledovania (OW-11, OW-14, OW-17, OW-05), živé overenie N16 a RET-01..03 | To uvidí každý nový používateľ hneď prvý deň. Overenia (N16, RET-01..03) sa dajú robiť už teraz na Railway a na iPhone. |
| **3 – texty a súkromie** | 120, 175, 176, 177, 204, APP-03, 186 (a podľa R2 poradie jazykov) | Závisí od toho, ktoré jazyky budú pri štarte (R2). |
| **4 – keď bude aplikácia hotová** | Príprava ostrého nasadenia N1–N15 (hosting, doména, právne dokumenty, server, zálohy, monitoring, smoke test), OW-06 a 180 (diagnostiku 180 možno začať už teraz) | Robí sa na novom serveri po dokončení aplikácie. |
| **5 – po nasadení** | Časť 5: funkcie, upratovanie, výkon, nástroje | Podľa spätnej väzby od prvých používateľov. |

## 3. HNEĎ

Nič nie je otvorené.

## 4. PRED NASADENÍM

58 riadkov v 14 balíkoch (jeden riadok registra môže spájať viac ID). Balík „Príprava ostrého nasadenia“ sa robí až keď bude aplikácia hotová. Každý balík je jedna alebo dve vetvy z `main` (číslo vetvy sa pridelí pri štarte).

### Bezpečnosť a produkčná odolnosť

| Č. | Čo | Poznámka / prečo | Dopad · Zl. |
| --- | --- | --- | --- |
| 185 | `SECURITY_AUDIT_REPORT.md` v koreni repozitára je z roku 2024 (názov Swaply) a vedie R1–R7 ako „neriešené“, hoci kód už väčšinou obsahuje riešenia (95× `transaction.atomic`, 75× `select_for_update`, SameSite, rate limity pri resete hesla). | Prejsť R1–R10 z tej správy voči dnešnému kódu a správu aktualizovať alebo archivovať. Zavádzajúca zastaraná správa zhoršuje rozhodovanie aj verejný repozitár (ak je verejný). **Rozhodnutie R11** (časť 6). | stredný · M |
| 193 | Obrázky sa dekódujú cez `Image.open(...)` bez parametra `formats=` na piatich miestach produkčného kódu (`staged_image_moderation.py:96`, `tasks/offer_images.py:88`, `image_metadata.py:82`, `portfolio/image_processing.py:81`, `messaging/services/image_thumbnails.py:50`), takže Pillow skúsi ľubovoľný formát, ktorý pozná (TIFF, BMP, EPS, PSD, JPEG 2000 …), nielen JPEG, PNG, WebP, GIF a HEIC, ktoré aplikácia prijíma. Cesta cez staged S3 (`moderate_staged_s3_image`; volá ju portfólio, ponuky aj príspevky) dekóduje bajty priamo zo S3 bez predchádzajúcej kontroly podpisu súboru (`sniff_image_format` sa volá len v validátore `ImageField` a pri avatare). | Zistené pri mapovaní 183a: Pillow 12.3.0 mal 37 známych chýb, časť z nich v dekóderoch formátov, ktoré aplikácia neprijíma (TIFF, BMP, MIC, SPIDER, MSP, XBM, EPS); Pillow 13.0.0 ich nemá žiadnu, no obmedzenie formátov je lacná poistka proti budúcim. Overené 27. 10. na kópii: `_decode_to_webp`, `build_message_thumbnail` aj varianty portfólia dekódujú súbor TIFF aj BMP bez odmietnutia. Návrh: spoločná konštanta povolených formátov a `formats=` na všetkých piatich miestach + test, že TIFF/BMP súbor sa odmietne. Pozor na HEIC: pillow-heif sa v Pillow hlási ako `HEIF`; overiť na skutočných fotkách z iPhonu (aj kvôli `MPO` pri JPEG z fotoaparátu). | stredný · S |
| 194 | Ani CI (`.github/workflows/deploy.yml`), ani iný plánovaný workflow nekontroluje zraniteľné závislosti: nebeží `pip-audit` ani `npm audit` a v repozitári nie je Dependabot. Zoznam zraniteľných balíkov (191 záznamov backendu, 19 balíkov frontendu) preto narástol nepozorovane a odhalila ho až jednorazová kontrola 26. 10. | Návrh: plánovaný týždenný workflow (`schedule` + `workflow_dispatch`) s `pip-audit -r backend/requirements.txt` a `npm audit --omit=dev`, ktorý len hlási (nezastavuje PR), alebo Dependabot pre `pip` a `npm`. Pozor: kým nie sú hotové `pytest` z 183 a build nástroj Sentry z 229, audit hlási známe zraniteľnosti (backend 2 záznamy: vývojový pytest ×2; frontend 5 stredných v build nástroji Sentry) pri každom behu, takže opakované hlásenie samo o sebe neznamená novú zraniteľnosť. Workflow preto musí porovnávať výsledok so zoznamom známych výnimiek: ID záznamov vedené v repozitári (pri `pip-audit` priamo cez `--ignore-vuln <ID>`, pri `npm audit` porovnaním s uloženým zoznamom), každé s dôvodom a podmienkou odstránenia (napr. „zatvorí 229“); upozorniť má len záznam, ktorý v zozname nie je. Pozor na hluk: `npm audit` hlási aj tranzitívne balíky, preto začať s prahom `high`. | stredný · S |
| 214 | `swaply/sentry_reporting.py:24` (`capture_reportable_exception`) používa `sentry_sdk.push_scope()`, ktoré je v `sentry-sdk` 2.x zastarané („will be removed in the next major version“), a `backend/requirements.txt` má `sentry-sdk[django]` bez verzie. Pomocníka volajú bez ochrany `GlobalErrorHandlingMiddleware.process_exception` (`swaply/middleware.py:135`) a obsluha výnimiek DRF (`middleware.py:196`). | Dnes (verzia 2.73.0) to len vypíše `DeprecationWarning`. Odhad, nie skúška: ak by build nainštaloval novú hlavnú verziu bez `push_scope`, pád by vznikol priamo v obsluhe chýb API, takže namiesto zamýšľanej JSON odpovede by klient dostal všeobecnú chybu 500. Návrh: pripnúť `sentry-sdk[django]>=2,<3` (ako pri `celery` a `django-anymail`), prejsť na nové API (`sentry_sdk.new_scope()`, v 2.73.0 existuje) a hlásenie do Sentry obaliť `try/except`, aby chyba hlásenia nikdy nepokazila odpoveď. Zistené pri mapovaní 183b (varovanie v teste na Djangu 5.2). | stredný · S |

### Produkčná odolnosť aplikácie

| Č. | Čo | Poznámka / prečo | Dopad · Zl. |
| --- | --- | --- | --- |
| 9 | WebSocket `missing_token` odmietne až po ~31 s. | Na internete drží neautentifikované spojenie zdroje (cieľ pre zahltenie); odmietnuť hneď po handshake. Neoverené, najprv prečítať `ws_auth.py`. | stredný · S |
| 33 | Varovanie Sentry `global-error` pri `npm run build`. | Chýba `global-error.js`: chyby vykresľovania v app routeri sa nehlásia do Sentry. Pre ostrú prevádzku je to základ monitoringu. | stredný · S |
| 52 | `ServiceWorker.tsx`: zastaraný text v konzole o aktivácii a spúšťač aktualizácie SW. | Po nasadení môže zariadenie bežať so starým service workerom až 10 min (`registration.update()` len každých 10 min). Pri častých nasadeniach po štarte zavolať `update()` hneď po `register()` a opraviť zavádzajúci text v konzole. | stredný · S |
| 179 | `TestBioAnd2FAFlows::test_login_requires_totp_when_enabled` občas zlyháva. Príčina: `totp.verify(totp_code)` (`auth_serializers.py:220`) bez `valid_window`. | Nie je to len test: používateľ s 2FA, ktorého hodiny meškajú o pár sekúnd alebo ktorý zadá kód na konci 30 s okna, môže mať správny kód odmietnutý. Oprava `valid_window=1` + test. | stredný · S |
| OW-06 | Overiť produkčné CORS domény (varovanie o záložných doménach). | Rieši sa pri nasadení (N5); potvrdený bezpečnostný problém = okamžitá oprava. | vysoký · S |
| OW-07 | Overiť skutočné vypršanie prihlásenia (staré výsledky nesmú byť prístupné). | Povinný test; potvrdený únik = hneď. | vysoký · S |

### Spoľahlivosť CI a testov

| Č. | Čo | Poznámka / prečo | Dopad · Zl. |
| --- | --- | --- | --- |
| 31 | Spevnenie nestabilných Jest testov (časové limity) – čaká na tvoj súhlas. | Nestabilné Jest testy (časové limity). Ak nasadenie čaká na zelené CI, náhodné zlyhanie zablokuje vydanie. Návrh: `asyncUtilTimeout` + `jest.setTimeout`, len testové súbory. | stredný · S |
| 189 | `e2e/mobile-language-header.spec.ts`: pomocník `ownProfilePath` (riadok 36) pustí len slug zo znakov `A-Za-z0-9_-` (riadok 42), no backend generuje slugy s bodkami (medzery sa menia na bodky, napr. `svaplynko.malicky.mlady`). Pre taký účet vezme pomocník číselné ID, aplikácia číselnú adresu prepíše na slug a stratí pod-cestu `/language`. Vo webkit-mobile preto padá 12 scenárov `profile-section` a 2 scenáre „app Back and browser Back“ (beh 26. 10.). | Reprodukované lokálne v Chromiu s iPhone emuláciou na produkčnom builde: so slugom s bodkami rovnaké chyby ako na Railway (s workerom aj bez neho), so slugom bez bodiek „app Back“ prejde. Oprava: povoliť bodku v regulárnom výraze. Pozor: aplikácia pridáva k adrese profilu sama `?tab=offers` (`profileTabQuery.ts`), takže `profile-section` môže po oprave padnúť ešte na poslednej kontrole adresy (riadok 136); tú treba porovnávať bez query. Overiť behom na Railway. | nízky · S |
| 209 | Druhý celý beh E2E na Railway (28. 10.) mal sedem pádov s hláškou „Príprava:“, lebo testy potrebujú údaje, ktoré si nevytvárajú a ktoré na Railway chýbajú: (a) `offer-reviews-back.spec.ts:185` (3×, všetky tri projekty): druhý testovací účet (`E2E_PEER_SLUG`) nemá ponuku s tlačidlom „Pridať recenziu“; (b) `messages-peer-profile.spec.ts:139` a `:157` (2×, webkit-mobile): medzi najnovšími konverzáciami v Správach (prvá stránka zoznamu) nie je prijatá priama konverzácia s účtom z `E2E_PEER_SLUG` alebo ten účet nemá zobrazované meno; (c) `profile-entry-scroll.spec.ts:218` a `:237` (2×, webkit-mobile): na prvých piatich stranách Nástenky nie je zdieľaná vlastná ponuka hlavného testovacieho účtu. | Nie je to chyba aplikácie ani testov: testy zámerne zlyhajú s hláškou „Príprava:“ (nepreskočia), aby chýbajúce údaje nevyzerali ako úspešný beh. Údaje pripravuje používateľ na Railway (jedna ponuka druhého účtu, prijatá konverzácia medzi oboma účtami medzi najnovšími a jedna zdieľaná ponuka hlavného účtu na Nástenke); potom sa zopakuje celý beh. Pri stagingu (N4) treba tieto tri položky pripraviť v testovacích dátach od začiatku. | nízky · S |
| 223 | Codex pri behu špecu `profile-numeric-language` (nasadený `main` `e3ed0f42`) hlásil občasné zlyhanie siete pri prípravnom `GET /api/auth/me/`: z 8 pokusov 2 zastavilo toto zlyhanie už počas prípravy a poľský tmavý profilový variant preto raz padol, pri troch opakovaniach potom prešiel (3 z 3). Presná príčina nie je preukázaná. Ďalšie dôkazy: v celom behu 30. 10. (`main` `e2612438`, 19:08 až 19:45 UTC) skončil druhý `GET /api/auth/me/` sieťovou chybou po 24 178 ms (19:30:21 UTC), 25 246 ms (19:35:09) a 24 430 ms (19:36:43); v diagnostických opakovaniach `mobile-settings-navigation` (20:00:30 UTC) prišli 401 na pollingových GET a 403 na `POST /api/token/refresh/` a v `offer-watch-card-actions` (20:02:46 UTC) vrátil `GET /api/auth/me/` 401 a adresa skončila na `/`. Dňa 31. 10. (07:09 až 07:10 UTC) sa v tmavom variante jazykového špecu po úvodnom `GET /api/auth/me/` 200 dve požiadavky zasekli na 21 s (sieťová chyba) a potom prišli 401 (asi 1,3 s) a 403 pri obnove (asi 1,1 s), teda odpovede boli pomalé, nielen odmietnuté. | Codex výslovne žiada nepripisovať ju automaticky Railway ani povýšeniu na Django 5.2 (nasadené 30. 10. 2026). Kontrola logov Railway majiteľom (okná 20:29 až 20:40 a 21:00 až 21:03 nášho času, teda 19:29 až 19:40 a 20:00 až 20:03 UTC; dátum v jeho súhrne bol 29. 10., čaká na potvrdenie, že išlo o 30. 10.): žiadne reštarty ani pády, žiadne HTTP 500 až 504, PostgreSQL a Redis bez zjavných problémov, Celery úspešne; opakované `WSREJECT` s `missing_token` pri WebSockete (pravdepodobne odhlásený testovací prehliadač, súvisí s nálezom 9); metriky CPU a RAM v logoch nie sú a zaseknuté požiadavky sa nepotvrdili. V dostupných logoch teda nie je dôkaz, že za pády testov môže Railway; príčina ostáva neurčená. V kóde je zapnutá rotácia obnovovacích tokenov (`ROTATE_REFRESH_TOKENS`, `BLACKLIST_AFTER_ROTATION`, prístupový token 15 minút, `swaply/settings_split/jwt.py`), čo je relevantné pri 401 a 403, no nie je to dôkaz. Návrh pre Codexa: sonda z toho istého Dockeru mimo Playwrightu (asi 10 minút opakovaného jednoduchého volania Railway s meraním oneskorení a zlyhaní): ak sa zasekne aj tam, ide o sieť alebo prostredie, ak nie, o WebKit v Dockeri alebo reláciu testov. Ak sa to zopakuje, treba k hláseniu pripojiť blok `[E2E-EVIDENCE]`. Dovtedy nič neopravovať. | nízky · M |
| 225 | Testy `mobile: light language changes update the top title and survive reload` a ich tmavý variant (`mobile-language-header.spec.ts`, `webkit-mobile`) padajú vo WebKite v Dockeri: celý beh 30. 10. (`main` `e2612438`) 2 z 2, diagnostické opakovania 6 z 6 a porovnanie A/B 31. 10. v jednom kontajneri (obraz `mcr.microsoft.com/playwright:v1.63.0-noble`) 6 z 6 s historickou verziou špecu z `9346520e` aj 6 z 6 s aktuálnou; následný beh s pasívnou diagnostikou 0 PASS a 6 FAIL. Padajú na asercii prekladu tlačidla Späť po prvom prepnutí slovenčina → čeština (prvý krok, v ktorom sa nadpis nezmení, ale názov tlačidla áno). Pasívna diagnostika ťuku (Codex): dotyk na voľbu SK aj CZ vyvolá udalosti pointerdown, touchstart, pointerup a touchend, ale žiadny click; uložený aj označený jazyk ostane SK. Na reálnom iPhone (manuálny test majiteľa, 31. 10.) sa po výbere češtiny zmení text aj nadpis a v Chromiu s rozmermi iPhonu oba testy prechádzajú (30. 10., proti lokálnej kópii). Kód jazyka (`LanguageModule.tsx`, `MobileTopBar.tsx`, `LanguageContext.tsx`) ani preklady sa od posledného zeleného behu (29. 10., `main` `9346520e`) nezmenili. | Najpravdepodobnejšia príčina je pod aplikáciou (emulácia gesta → klik vo WebKite v Dockeri); prečo klik nevznikne, nie je preukázané. Aplikácia sa nemení, lebo na reálnom iPhone funguje. Test sa nemá potichu prepnúť na `click`. Voľba jazyka má `onPointerDown` s `preventDefault()` a `tabIndex={-1}`; pozorovateľ však nevidel `defaultPrevented`, takže ani toto nie je preukázaná príčina. Návrh pre Codexa: izolovaná skúšobná stránka s tlačidlom s rovnakými vlastnosťami a bez nich (ak klik vznikne len bez nich, ide o vlastnosť emulácie; potom v tomto kroku použiť `click` s odôvodnením a odkazom, že na iPhone funguje). Posledný pokus tmavého variantu (31. 10.) skončil inak (sieťové chyby, 401 a 403) a patrí k nálezu 223, nie sem. | nízky · M |
| 228 | Pri mutačných kontrolách vetvy 159: keď sa v `useGoogleLogin.ts` (upratanie efektu) odstráni `clearTimeout(delayTimer)`, nepadne žiadny zo 79 testov `useGoogleLogin*`, ani na pôvodnej verzii (Next 14), ani po aktualizácii. Vynechané `clearInterval(poll)` testy zachytia (20 pádov). | Zadržaný časovač oneskorenia po odpojení pravdepodobne nič nepokazí (`resolveDelay?.(false)` čakanie hneď ukončí), takže môže ísť o nadbytočný riadok, nie o chýbajúci test. Návrh: buď pridať test, že po odpojení počas čakania nezostane žiadny časovač (`jest.getTimerCount()` je 0), alebo riadok odstrániť. Nezmenené, len hlásim. | nízky · S |
| TEST-03, 04, 09, 12–16, 18 | Jednorazové a neobjasnené zlyhania a upozornenia testov: push-timeout (03), WebKit timeouty (04, 09, 12, 13), `OfferWatchSettingsMobileHost.openState` (14), Jest nekončí (15), vlákno registračného e-mailu v SQLite testoch (16), dlhšie živé E2E skončili pred overením (18). | Spolu s 31 a 179. Bez diagnostiky ich neoznačovať za opravené; ak CI blokuje nasadenie, treba ich stabilizovať. | stredný · M |

### Navigácia a Späť

| Č. | Čo | Poznámka / prečo | Dopad · Zl. |
| --- | --- | --- | --- |
| 13 | Chýba `Späť` v mobilnej hornej lište plnostránkového detailu príspevku. | V iPhone PWA nie je prehliadačové Späť. Bez šípky v hornej lište plnostránkového detailu príspevku (vstup z upozornenia alebo odkazu) používateľ uviazne. | stredný · S |
| 14 | Mobilné `Späť` v konverzácii pridá nový záznam `/dashboard/messages` namiesto kroku späť. | Šípka v konverzácii pridáva záznam do histórie namiesto kroku späť. Nález 160 to vyriešil len pre konverzáciu otvorenú z profilu, ostatné vstupy ostávajú. | stredný · M |
| 174 | `OfferReviewsView.tsx:189`: pri upozornení na recenziu zmazanej ponuky, keď sa profil nedá otvoriť (blokovanie, súkromný profil, recenzia neexistuje), sa na Nástenku ide cez `router.push` namiesto `replace`. Pasca na tlačidle Späť: každé Späť vráti na recenzie a tie vložia `/dashboard` znova. | Vzácny okrajový prípad; nezasekáva sa (modul sa tu odmountuje), je to len pasca na Späť. Súbor má 692 riadkov (chránený), takže ide o jednoriadkovú zmenu `push` → `replace` + test; rieši sa spolu s balíkom 13 / 14. | nízky · S |

### Profil a identita

| Č. | Čo | Poznámka / prečo | Dopad · Zl. |
| --- | --- | --- | --- |
| 81 | Slug zložený len z číslic je nejednoznačný s ID používateľa (reálny, zriedkavý okrajový prípad). | Slug zložený len z číslic sa na ≥ 9 miestach číta ako ID používateľa, takže profil môže ukázať iného človeka. Pri verejnom štarte si ľubovoľné meno (napr. „12345“, firma „2024“) vyberie ktokoľvek. Oprava: zakázať číselné slugy (predpona `u-`) + migrácia existujúcich, alebo uprednostniť slug vo frontende. **Rozhodnutie R3** (časť 6). | stredný · M |
| 119 | Mobilný názov účtu nie je ohľaduplný k firmám: meno + priezvisko má prednosť pred `company_name`. | Firemný účet, ktorý bol pôvodne osobný, ukazuje v hornej lište mobilu osobné meno namiesto názvu firmy. Oprava je 1–2 riadky + test. | stredný · S |

### Zdieľanie a obrázky

| Č. | Čo | Poznámka / prečo | Dopad · Zl. |
| --- | --- | --- | --- |
| 91 | REÁLNA chyba: zdieľaná karta na Nástenke ukazuje pokazený obrázok po zmazaní pôvodnej fotky (chýba záložný obrázok a snímok je zastaraný). | Pokazený obrázok je viditeľný pre každého, kto zdieľanú kartu uvidí. Frontend oprava je malá (záložný obrázok), obnova snímku na backende je väčšia a môže prísť potom. | stredný · S |
| 92 | iPhone: okná zdieľania sa otvárajú „posunuté“ (horná časť orezaná) – hypotéza `90vh` vs `dvh`, neoverené. | iPhone: okná zdieľania sa otvárajú orezané hore (hypotéza `90vh` vs `dvh`, neoverené). Je to prvé, čo používateľ vidí pri zdieľaní; treba overiť na zariadení. Rovnaký vzor je v 36 (lightboxy). | stredný · M |
| 207 | Po oprave 197 sa fotky z iPhonu v správach odosielajú, no podľa manuálneho testu (28. 10.) odoslanie trvá dlhšie, než by používateľ čakal; nie je to chyba, preto sa nerieši hneď. Cesta jednej fotky: appka ju neprepočíta ani nezmenší (v správach ani v `lib` nie je žiadne zmenšovanie), nahrá sa celý súbor z telefónu (snímka z iPhonu má niekoľko MB); v požiadavke beží kontrola obrazu cez Google Vision (`check_image_safety` vo `validate_image_file`, limit `SAFESEARCH_TIMEOUT` 5 s); potom v transakcii so zámkom konverzácie `strip_image_metadata` (odstránenie EXIF prekódovaním), uloženie originálu a miniatúry do úložiska (S3). Počas odosielania sa len zablokujú tlačidlá (`sending`, nižšia priehľadnosť), bez indikátora priebehu. | Meranie na iPhone 28. 10. (jedna fotka, stopky od ťuknutia po zobrazenie správy): Wi-Fi približne 5 s, mobilné dáta 4,25 s. Rozdiel medzi sieťami je malý a mobilné dáta vyšli rýchlejšie, čo naznačuje, že väčšinu času netvorí nahranie z telefónu; je to len hypotéza z jedného merania. Lokálne meranie 28. 10. (v sandboxe bez Google Vision a S3, snímka 4032 × 3024 JPEG 3,3 MB): spracovanie na serveri 0,4 až 0,8 s (medián 0,59 s), z toho prekódovanie `strip_image_metadata` 0,25 s a miniatúra 0,16 s. Obe merania prebehli v rôznych prostrediach (iPhone a Railway oproti lokálnemu stroju bez Vision a S3), preto z ich rozdielu nemožno určiť, koľko času pripadá na náš kód, Vision, S3 alebo siete; Railway môže mať pomalší procesor, takže aj náš kód tam môže trvať dlhšie než 0,6 s. Všetko to sú zatiaľ hypotézy. Prvý krok bez zmeny kódu: na Railway zapnúť `SAFESEARCH_TIMING_LOG=true` a porovnať čas Vision s celkovým časom (podľa výsledku doplniť meranie krokov spracovania priamo na serveri). Možné zlepšenia: zmenšiť fotku v prehliadači pred odoslaním (napr. dlhšia strana 2048 px, výrazne menej dát aj práce servera; zasahuje do kvality a do pravidla 5 MB, treba rozhodnúť), ukázať indikátor odosielania, spracovanie obrazu mimo transakcie so zámkom konverzácie. | nízky · M |

### Upozornenia na zmazaný obsah

| Č. | Čo | Poznámka / prečo | Dopad · Zl. |
| --- | --- | --- | --- |
| 74 | ROZHODNUTÉ: rozšíriť opravu 111 (kontrola existencie cieľa → toast + označiť ako prečítané) na všetky typy notifikácií; koniec plánu. | Rozšíriť kontrolu existencie cieľa (oprava 111) na všetky typy upozornení: portfólio, príspevky, komentáre, pozvánky do skupiny (dnes mŕtve tlačidlo bez hlášky). Backend aj frontend naraz. **Rozhodnutie R4** (časť 6). | stredný · L |

### Žiadosti

| Č. | Čo | Poznámka / prečo | Dopad · Zl. |
| --- | --- | --- | --- |
| 17 | Opätovný klik na aktívne „Žiadosti“ volá `markAllRead`. | Obyčajné opätovné kliknutie na tú istú položku menu neočakávane zmení údaje (všetko sa označí ako prečítané). | stredný · S |

### Vyhľadávanie a Sledovania

| Č. | Čo | Poznámka / prečo | Dopad · Zl. |
| --- | --- | --- | --- |
| OW-05 | Vstup do výsledkov Sledovaní v iOS PWA chýba (v Safari prešlo). | Súvisí s plánom mobilných výsledkov. **Rozhodnutie R6** (časť 6). | stredný · M |
| OW-11 | Rozloženie `/search` nemá obsluhu Správ, Upozornení a Štatistík: kliknutie v ľavom menu nič nerobí. | Pre používateľa je to „rozbité“ menu na stránke vyhľadávania; rozsah dohodnúť. | stredný · M |
| OW-14 | Otváracie hodiny pri firemnej ponuke vo výsledkoch sú nefunkčné (tlačidlo bez obsluhy). | Buď doplniť popover, alebo ovládač nezobraziť. **Rozhodnutie R5** (časť 6). | stredný · S |
| OW-17 | Desktop vyhľadávanie: otvorený panel pohltí prvý klik na otočenie karty. | Potvrdené na Railway; každý desktopový používateľ s otvoreným panelom to zažije. | stredný · M |
| N16 | Živé overenie zlúčených opráv vyhľadávania a Sledovaní: OW-16 (mobilné karty), OW-18 (krajina), OW-19 (scroll), OW-20 (cache), OW-23 (viac ľudí / ponúk), TEST-01, TEST-02 a PR #193 (opisy a výsledky); vrátane migrácií 0124 / 0125. | Všetko je zlúčené v `main` a nasadené na Railway, takže sa dá urobiť už teraz (ručne alebo cieleným E2E); register výslovne vedie nasadený retest ako otvorený. Pred štartom stačí krátko zopakovať na novom serveri (N14). | – · M |

### Preklady a hlášky

| Č. | Čo | Poznámka / prečo | Dopad · Zl. |
| --- | --- | --- | --- |
| 120 | Tri použité kľúče prekladov chýbajú vo všetkých šiestich jazykových súboroch (`feed.captionPlaceholder`, `feed.commentsClose`, `feed.openProfile`). | Tri použité kľúče chýbajú vo všetkých jazykoch, takže cs / pl / de / hu / en vidia slovenský text (=APP-01 z registra). Overené 26. 10. 2026: stále chýbajú. | stredný · S |
| 175 | Surový `error.message` z knižnice axios (napr. „Network Error“) sa ukazuje aj v Obľúbených (`FavoritesModule.tsx:35`) a v Spoluprácach (`RequestsDesktop.tsx:636`, `RequestsMobile.tsx:698`). | Použiť pomocníka z `foreignProfileHelpers.ts` (`profileActionErrorMessage`) alebo ho presunúť do spoločného modulu. Neoverené: či backend niekde posiela anglické `detail` texty (DRF). | stredný · S |
| 176 | Zvyšné slovenské kópie v češtine a poľštine (a jedna v nemčine). V profile a vyhľadávaní je to asi 30 hodnôt v češtine a 14 v poľštine (karty ponúk „Správa“, „Cena do“, „Skrytá“, vyhľadávanie „PONÚKAM/HĽADÁM“, „Posledné vyhľadávania“, portfólio); v nemčine ostáva „Vyčistiť vyhľadávanie“. V celej aplikácii mimo katalógu zručností je to hrubo cs ~210 a pl ~90 (časť sú legitímne rovnaké slová). Poľské texty bez diakritiky: heuristika našla 27 kľúčov (najmä `messages.*` a `requests.*`, napr. „Nie udalo sie wyslac wiadomosci.“). | Zahŕňa APP-02 a APP-03 z registra. Ak štart nepokryje češtinu a poľštinu, môže počkať (rozhodnutie R2). Odporúčanie: jeden preklad naraz, najprv profil, vyhľadávanie a karty ponúk. **Rozhodnutie R2** (časť 6). | stredný · L |
| 177 | Pruh o stave pripojenia je natvrdo po slovensky (`OfflineIndicator.tsx:54–55`: „Offline režim - niektoré funkcie môžu byť obmedzené.“ a „Pripojenie obnovené! Aplikácia je online.“); pri výpadku ho vidno v každom jazyku. | Pridať dva kľúče do všetkých šiestich jazykov. | nízky · S |
| 204 | `npm run check:used-translation-keys` hlási kľúče, ktoré kód používa, ale nie sú v `messages/sk.json`: `feed.captionPlaceholder` (`FeedPostEditModal.tsx`), `feed.commentsClose` (`FeedPhotoCommentsSheet.tsx`) a `feed.openProfile` (`FeedPhotoViewerChrome.tsx`, `FeedPostCard.tsx`, `FeedPostComments.tsx`, `FeedPostMobileDetail.tsx`), takže sa vo všetkých jazykoch ukáže natvrdo zadaná slovenčina. Naopak `profile.photoRemovedError` je preložený vo všetkých jazykoch, no kód ho nepoužíva a ukazuje doslovný text „Nepodarilo sa odstrániť fotku. Skúste znova.“ (`ProfileModule.tsx`). | Skript hlási ešte tri kľúče z testu (`common`, `common.save.unavailable`, `missing.path` v `LanguageContext.locale.test.tsx`), ktoré sú falošný poplach. Skript nie je súčasťou CI. Oprava: doplniť tri kľúče do všetkých šiestich jazykov, použiť `profile.photoRemovedError` a vylúčiť test zo skriptu. | nízky · S |
| APP-03 | Záložky a tlačidlá vyhľadávania (Všetko / Ľudia / Ponuky, Zobraziť viac / všetko) sú slovenské literály, nie `t()`. | Súčasť 176; ak štart nie je viacjazyčný, môže počkať (R2). **Rozhodnutie R2** (časť 6). | stredný · S |

### Súkromie a krajina

| Č. | Čo | Poznámka / prečo | Dopad · Zl. |
| --- | --- | --- | --- |
| 186 | Zistenie krajiny volá z prehliadača `https://ipapi.co/json/` (`LanguageContext.tsx`): tretia strana dostane IP každého používateľa; závislosť od cudzej služby a jej limitov. | Pre ostrý štart v EÚ treba buď súhlas a zápis do zásad ochrany údajov, alebo zistiť krajinu na vlastnej strane (hlavička `CF-IPCountry` pri Cloudflare, GeoIP na backende). Súvisí s OW-18 (krajina vo vyhľadávaní). **Rozhodnutie R7** (časť 6). | stredný · M |

### iPhone a WebSocket

| Č. | Čo | Poznámka / prečo | Dopad · Zl. |
| --- | --- | --- | --- |
| 180 | Upozornenia: na iPhone sa občas preruší WebSocket (kód 1006); na diagnostiku treba logy servera. | V predvolenej konfigurácii (`NEXT_PUBLIC_API_URL=/api`) ide WebSocket na doménu frontendu a Next ho preposiela na backend (`rewrites` pre `/ws/*`), takže v ceste je ďalší článok. V kóde sa nenašiel pravidelný ping a nečinné spojenie môže proxy zatvoriť. Diagnostiku možno robiť už teraz na Railway (PR #191, vetva `134-diag`); riešenie na novom serveri: smerovať `/ws/` priamo na daphne (N8). | stredný · M |

### iPhone overenia

| Č. | Čo | Poznámka / prečo | Dopad · Zl. |
| --- | --- | --- | --- |
| RET-01 | iPhone: zapamätaný text nad systémovou lištou pri „Cena od“ (M13). | Odložené manuálne overenie. | nízky · S |
| RET-02 | To isté pri „Cena do“ (M14). | Spolu s RET-01. | nízky · S |
| RET-03 | Porovnanie Cena od / do a systémovej lišty v Safari a v nainštalovanej PWA (M33). | Spolu s RET-01. | nízky · S |

### Príprava ostrého nasadenia (až keď bude aplikácia hotová)

| Č. | Čo | Poznámka / prečo | Dopad · Zl. |
| --- | --- | --- | --- |
| N1 | Rozhodnúť hosting a región EÚ (odporúčanie v prílohe C). | Až keď bude aplikácia hotová; teraz netreba (Railway ostáva na testy). Od rozhodnutia závisí zvyšok prípravy (reverzný proxy, WebSocket, zálohy, náklady). Rozhodnutie R1. | – · S |
| N2 | Doména a e-mail: v kóde sa už používa `svaply.com` (a `api.svaply.com`). Ak je doména vlastnená, treba nasmerovať DNS na nový server a nastaviť SPF / DKIM / DMARC pre odosielateľa (Resend, `DEFAULT_FROM_EMAIL`) a schránku `info@svaply.com`. | Dlhá dodacia lehota (šírenie DNS, reputácia odosielateľa): začať asi 2–3 mesiace pred plánovaným štartom. Ak doména ešte nie je zaregistrovaná, treba ju najprv získať. | – · S |
| N3 | Právne dokumenty: podmienky používania, ochrana osobných údajov (GDPR), cookies / súhlas, zmluvy so spracovateľmi (hosting, Cloudflare, Resend, Google Vision, Sentry). | Dlhá dodacia lehota (právnik), nie je to kód. Začať s dostatočným predstihom pred štartom. Pozor na prenosy osobných údajov mimo EÚ (Google, Sentry, Resend, Cloudflare). Súvisí s nálezom 186. | – · M |
| N4 | Oddeliť prostredia: ostrá prevádzka bez testovacích účtov; staging pre E2E a testy. | Pravidlo v `.cursor/rules/svaply.mdc` hovorí, že E2E bežia proti produkcii (Railway). Po štarte so skutočnými používateľmi musia bežať proti stagingu, ktorý je kópiou ostrej prevádzky (inak by testy zasahovali do cudzích dát), a pravidlo sa musí upraviť (rozhodnutie majiteľa). Railway môže slúžiť ako staging; nezachytí však chyby viazané na hosting (proxy, WebSocket). Súvisí s 173, 16, OW-08. | – · M |
| N5 | Konfigurácia a tajomstvá: nové `SECRET_KEY`, `JWT_SIGNING_KEY`, `MFA_ENCRYPTION_KEY`, VAPID, OAuth redirect URI a reCAPTCHA pre novú doménu, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`, `FRONTEND_ORIGIN`. | Zahŕňa OW-06 (produkčné CORS domény). Žiadne kľúče z Railway nepreberať. | – · M |
| N6 | PostgreSQL v EÚ: zálohy (denné + PITR), vyskúšaná obnova, migrácie od nuly (0125 vytvára dva GIN indexy `CONCURRENTLY`). | Register: pri migráciách 0124 / 0125 nesmú staré procesy zapisovať; zaviesť politiku „rozšír, potom zmenši“. | – · M |
| N7 | Redis: oddeliť cache a broker pre Celery (politika vyhadzovania, perzistencia), sledovať pamäť. | V repozitári je `RAILWAY_REDIS_FIX.md` – problémy s Redis už boli. | – · S |
| N8 | Procesy a proxy: gunicorn (HTTP), daphne (WS), Celery worker + beat, healthchecky, WebSocket časové limity, `TRUSTED_PROXY_HOPS` podľa skutočného reťazca proxy. | Zlé `TRUSTED_PROXY_HOPS` rozbije rate limity podľa IP (nález 429 z histórie). Návrh: reverzný proxy smeruje `/api/`, `/ws/` a `/media/` priamo na backend (rovnaká doména, cookies ostanú first-party) a Next v ceste nie je. Súvisí s 180. | – · M |
| N9 | Médiá: S3-kompatibilné úložisko a CDN, CORS bucketu, podpísané alebo verejné URL; zvážiť, aby obrázky nešli cez Django. | Obrázky Nástenky dnes streamuje Django (`feed_image_files.py`, `_stream_key`); `/media/*` ide cez Next proxy na backend. | – · M |
| N10 | Obrazová moderácia: účet Google Cloud, kľúč služby (`GCP_VISION_SERVICE_ACCOUNT_JSON`), kvóty a sledovanie nákladov. V produkcii je zapnutá a nastavená „fail-closed“: pri výpadku Google Vision sa nahranie obrázka odmietne s hláškou. | Rozhodnutie R10 (odporúčanie: ponechať). Overiť pri smoke teste N14. | – · S |
| N11 | Monitoring: Sentry (backend + frontend, `global-error`), kontrola dostupnosti, logy, upozornenia na disk a pamäť, kontrola Celery beat. | Zahŕňa 33. | – · S |
| N12 | CI/CD: nasadenie až po zelenom CI, rollback, migrácie pred novou verziou, bez výpadku pri zápise starých procesov. | Dnes: Railway auto-deploy + „Wait for CI“ mimo repozitára (poznámka v `.github/workflows/deploy.yml`). | – · M |
| N13 | Bezpečnostné nastavenia: `manage.py check --deploy`, HSTS, secure cookies, CSP, ochrana admin URL, rate limity. | Nadväzuje na 183 / 185. | – · S |
| N14 | Záťažový a smoke test na novom serveri: WebSocket, nahrávanie obrázkov, e-mail, push, registrácia, prihlásenie cez Google. | Pred pozvaním prvých používateľov. | – · M |
| N15 | Čo s Railway po štarte: ostane na testy / staging, alebo sa vypne (sú tam len testovacie dáta, pravdepodobne sa nič neprenáša). | Rozhodne sa spolu s N4; až po N14. | – · S |

## 5. PO NASADENÍ

120 riadkov v 17 skupinách. Dopad je všade nízky okrem uvedených výnimiek; poradie podľa potreby po štarte.

### Pravdepodobne už vyriešené

| Č. | Čo | Poznámka / prečo | Dopad · Zl. |
| --- | --- | --- | --- |
| 18 | Mobilná hlavička konverzácie nevie pomenovať konverzácie mimo 20 najnovších (titulok „Používateľ“, zablokované tlačidlo). | OVERIŤ A ZATVORIŤ: hlavička konverzácie mimo prvej stránky zoznamu sa teraz dohľadá cez detail (`useMobileMessagePeer` → `listMessages`), čo prinieslo nález 161. Overené čítaním kódu 26. 10. 2026, chýba manuálny test. | nízky · S |

### Funkcie – väčšie balíky

| Č. | Čo | Poznámka / prečo | Dopad · Zl. |
| --- | --- | --- | --- |
| 46 | (mobil) Detail príspevku na Nástenke: adresa ostáva `/dashboard`, F5 detail zavrie – ODLOŽENÉ na úplný koniec. |  | stredný · L |
| 70 | Mobil: dve obrazovky detailu príspevku – zjednotenie je FUNKCIA, ostáva na zozname (balík po rozdelení). |  | stredný · L |
| APP-04 | Zohľadnenie krajiny a okresu vo vyhľadávaní (produktový návrh). | Odložené používateľom 21. 10.; nie je to chyba. | nízky · L |

### Navigácia – scroll

| Č. | Čo | Poznámka / prečo | Dopad · Zl. |
| --- | --- | --- | --- |
| 125 | Pamätanie scrollu pokrýva len návrat z recenzií; ostatné toky (detail portfólia, zdieľanie, iný profil…) idú na vrch. |  | nízky · M |
| 129 | Obnova scrollu nebeží pri viackrokovom skoku v histórii na uložený záznam, kým modul ostáva pripojený. |  | nízky · M |

### Navigácia – drobnosti

| Č. | Čo | Poznámka / prečo | Dopad · Zl. |
| --- | --- | --- | --- |
| 5 | `SettingsDetailHeader`: klik-udalosť presakuje do `onBack` (`onClick={onBack}`); zdieľané 8 obrazovkami. |  | nízky · S |
| 6 | `ModuleRouter`: `onEditCancel={closeOwnProfileEdit}` – dnes bez udalosti, rozhodnúť spolu s 5. |  | nízky · S |
| 7 | Šípka z `/edit` ponecháva starý replaceState chvost; zastaraná adresa `/edit`; prepis záznamov po `go(-n)`. |  | nízky · M |
| 8 | Zvýraznenie v ľavom menu je prázdne pri nastaveniach upozornení (vstup cez Profil → Upraviť profil). |  | nízky · S |
| 11 | Desktopový overlay `goForward` vykreslí plný detail s novým `<main>`; Späť z neho pristane na `/dashboard/home`. |  | nízky · M |
| 12 | Presakujúce `?tab=offers` v adrese mobilných nastavení, pri prvom otvorení cudzieho profilu z hlavičky konverzácie a na stránke vyhľadávania. |  | nízky · S |
| 15 | Desktopový vyhľadávací panel nie je route (nemá záznam v histórii). |  | nízky · M |
| 21 | Ochrana cieľov notifikácií odmieta `/dashboard?from=push` a `/dashboard#top`. |  | nízky · S |
| 22 | `useDashboardHighlighting` prijíma 0 / −3 / 1,5 ako ID zvýraznenia, handler notifikácií vyžaduje celé číslo ≥ 1. |  | nízky · S |
| 24 | `highlighting.setHighlightedSkillId(null)` necháva `sessionStorage.highlightedSkillId`. |  | nízky · S |
| 27 | Popstate na `/dashboard/users/<cudzí>/edit` sa kanonizuje na adresu vlastného profilu. |  | nízky · S |
| 28 | `offerId: 0` zamaskuje platné `highlightId` v `goToUserProfile`; `goToMyProfile` ignoruje `offerId`. |  | nízky · S |
| 38 | Efekt záložky vlastného profilu závisí od identity objektu `user` – záložka sa môže vrátiť na pôvodnú (overiť reálny dopad). |  | nízky · S |
| 40 | Hlavný efekt `useDashboardHighlighting` číta starú adresu: zvýraznenie na 10–70 ms zhasne a vráti sa. |  | nízky · M |
| 73 | `FeedPostDetailModule`: chýbajúce ID príspevku sa berie ako zmazaný príspevok (spevnenie, nízka priorita). |  | nízky · S |
| 86 | `goToUserProfile` očakáva reťazec; nereťazcový identifikátor by vyhodil TypeError. |  | nízky · S |
| 87 | Handlery `goToUserProfile` / `goToMyProfile` neukladajú modul do `localStorage(activeModule)`. | Handlery neukladajú modul do `localStorage` (pravdepodobne zámer). | nízky · S |
| 121 | Záznam stránky vyhľadávania dostane `?tab=offers` pri otvorení profilu z výsledkov (kozmetika). |  | nízky · S |
| 124 | Po F5 router prepíše `history.state` bez vlastných kľúčov (pozorovanie). |  | nízky · S |
| 149 | Kozmetika: menu meny vo formulári prežije výstup obrazovky Sledovanie (~0,5 s). |  | nízky · S |
| 191 | Číselná adresa profilu s pod-cestou, napr. `/dashboard/users/<id>/language`, sa po načítaní prepíše na `/dashboard/users/<slug>?tab=offers` a pod-cesta sa stratí (`useDashboardUserProfile.tsx`: prepis číselného ID na slug zachová len `/edit`). | Zmerané 26. 10. v Chromiu na produkčnom builde. Dotýka sa len starých odkazov s číselným ID (route ich podporuje kvôli spätnej kompatibilite). Nízka priorita; vyplynulo z nálezu 189. | nízky · S |
| 224 | Nález majiteľa z manuálneho testu na iPhone Safari (30. 10. 2026): vo vlastnom profile → Menu → zoznam Nastavení (Upozornenia, Jazyk, Typ účtu, Sledovanie, Nastavenia súkromia, Blokované, Účet) po otvorení ktorejkoľvek sekcie a obnovení stránky (F5) vedie šípka Späť správne na zoznam Nastavení, ale Zatvoriť potom nevedie na profil, odkiaľ sa Nastavenia otvorili, ale na Nástenku. Lokálne reprodukované (30. 10., Chromium s rozmermi iPhonu): bez F5 vedie Zatvoriť na profil, po F5 v sekcii aj po F5 priamo na zozname vedie na Nástenku. | Príčina: záznam histórie Nastavení nesie značku s identitou načítania stránky (`PAGE_LOAD_ID` v `hooks/mobileSettingsOrigin.ts`), takže po F5 neplatí a `handleMobileSettingsClose` (`hooks/useMobileSettings.ts`) použije deterministický cieľ, teda Nástenku. Pôvod Nastavení (vlastný alebo cudzí profil, hamburger je na oboch) sa nikde neukladá. Šípka zo sekcie po F5 navyše vloží nový záznam zoznamu s prázdnym stavom (`pushState(null, …)` v `hooks/useDashboardState.ts`, 921 riadkov, súbor sa nemení, pozri TECH-01…11), takže ani zoznam už pôvod nenesie. Návrh: pôvod (adresu) uložiť do `history.state` záznamov Nastavení (prežije F5), alebo pre kartu do `sessionStorage`, a pri zatvorení po F5 ísť naň; zmena v `mobileSettingsOrigin.ts` a `useMobileSettings.ts` plus Jest testy. Zasahuje do histórie prehliadača, preto patrí do jedného balíka s nálezmi 13, 14 a 174 (Späť na mobile). Dopad na E2E: nový test pre Codexa (profil → Menu → Jazyk → F5 → Späť → Zatvoriť → profil). Majiteľ ho vedome odkladá na čas po nasadení. | nízky · M |

### Zvýraznenie ponuky

| Č. | Čo | Poznámka / prečo | Dopad · Zl. |
| --- | --- | --- | --- |
| 51 | Perzistované zvýraznenie sa môže obnoviť na nesúvisiacom profile po tvrdej navigácii do 60 s (zvyšok po 104). | Zvyšok po oprave 104; po oprave 49 / 105 (service worker) sa tvrdé navigácie takmer nevyskytujú. | nízky · M |

### Údaje a cache

| Č. | Čo | Poznámka / prečo | Dopad · Zl. |
| --- | --- | --- | --- |
| 104 | Zastaraná vybraná karta po odloženom zmazaní fotky (`handleRemoveSkillImage`). |  | nízky · M |
| 107 | Zastaraná odpoveď v lete môže prepísať novšie ponuky a znova naplniť cache. | Zastaraná odpoveď v lete môže prepísať novšie ponuky; nízke riziko, zdieľaný modul PC + mobil. | nízky · M |

### Profil a identita

| Č. | Čo | Poznámka / prečo | Dopad · Zl. |
| --- | --- | --- | --- |
| 141 | Výsledok obľúbený / „páči sa mi“ sa zapisoval do práve zobrazeného profilu (táto polovica OPRAVENÁ v #177); stavy „prebieha“ žijú v module (OTVORENÉ, neoverené). |  | nízky · M |

### Mazanie ponuky

| Č. | Čo | Poznámka / prečo | Dopad · Zl. |
| --- | --- | --- | --- |
| 57 | Mazanie vlastnej ponuky: lokálne kroky po úspešnom DELETE sú v tom istom `try` (slabé miesto správania). | Prakticky nedosiahnuteľné (pomocné funkcie nevyhadzujú výnimky); stačí spresniť spracovanie chýb. | nízky · S |

### Výkon a plynulosť

| Č. | Čo | Poznámka / prečo | Dopad · Zl. |
| --- | --- | --- | --- |
| 53 | `useMobileMessagePeer` beží na každom viewporte, hoci jeho jediný konzument je od 1024 px skrytý. | `useMobileMessagePeer` beží aj na desktope: zbytočné požiadavky a druhý POST pri otvorení konverzácie (zaťažuje aj rate limit). | nízky · M |
| 79 | Inline šípka `onSkillsCategoryBackHandlerSet` vzniká pri každom vykreslení (problém nezistený, len pozorovanie). |  | nízky · S |
| 106 | Mobilné `initialTags // []` = nové pole pri každom vykreslení (neoverené, pravdepodobne nedosiahnuteľné). |  | nízky · S |
| 132 | Obrazovka Sledovanie najprv ukáže kostru a ~120–200 ms potom zoznam „vyskočí“. |  | nízky · S |
| 142 | Po prepnutí cez číselné ID kanonizácia znovu načíta stránku (~50 ms „Načítavam profil…“). |  | nízky · S |
| 143 | Vstup na vlastný profil z Nástenky čaká na API (~815 ms bez zmeny na obrazovke). | Na pomalej sieti pôsobí vstup na vlastný profil z Nástenky ako „mŕtve“ ťuknutie (~0,8 s). Premerať na novom serveri, kde bude latencia iná. | stredný · M |
| 216 | Stránka `/search` pošle pri prvom načítaní to isté hľadanie dvakrát: hneď (prihlásený používateľ ešte nie je známy) a znova po odpovedi `/api/auth/me/`, lebo `user?.id` je v závislostiach `fetchSearch` a `fetchGlobal` (`app/search/page.tsx`). Na kartách „Všetko“ a „Ľudia“ druhé hľadanie na chvíľu nahradí sekciu „Ľudia“ kostrou, ktorá je o 14 px vyššia, takže sa obsah po prvom vykreslení posunie a vzápätí vráti (výška `main` 2 175 → 2 189 → 2 175 px). Zmerané 29. 10. 2026 v Chromiu na produkčnom builde; na Railway trvá medzistav tak dlho ako druhá odpoveď, teda aj stovky ms. | Súbor `app/search/page.tsx` má 648 riadkov (chránený podľa `svaply.mdc`), preto sa nemenil. Klientske filtrovanie vlastných ponúk podľa `user?.id` je pri prihlásených zbytočné: backend ich vynecháva sám (`accounts/views/search.py:65`, `search_global.py:236`). Návrh: nechať `user?.id` mimo závislostí načítania (filter pri vykreslení alebo bez filtra), čím zostane jedno hľadanie a zmizne posun obsahu. Chyba sa prejavila v E2E testoch ako nález 217 (testy sa kvôli nej teraz čakajú na ustálenie stránky). | nízky · S |

### Výkon (memoizácia)

| Č. | Čo | Poznámka / prečo | Dopad · Zl. |
| --- | --- | --- | --- |
| 62 | `handleNotificationNavigate` má v závislostiach celý objekt `highlighting` – handler sa vytvára pri každom vykreslení (výkon). |  | nízky · S |
| 65 | Pozorovanie: priame volanie `highlighting.setHighlightedSkillId` v hooku notifikácií nie je pozorovateľné (možno nadbytočné). |  | nízky · S |
| 76 | `handleDesktopOnboardingProfileOpen` má v závislostiach celý objekt `highlighting` (výkon, rodina 62). |  | nízky · S |
| 88 | Celé objekty `userProfile` a `highlighting` v závislostiach efektov `useProfileWindowEvents` – poslucháči sa registrujú pri každom vykreslení. |  | nízky · S |

### Prístupnosť

| Č. | Čo | Poznámka / prečo | Dopad · Zl. |
| --- | --- | --- | --- |
| 134 | Žiadna z mobilných animácií nerešpektuje `prefers-reduced-motion`. | Rešpektovať `prefers-reduced-motion`: jeden `MotionConfig` pri koreni (rýchla výhra). Pre mikropodnik zákon nevyžaduje, no je to lacné. | nízky · S |

### iPhone overenia

| Č. | Čo | Poznámka / prečo | Dopad · Zl. |
| --- | --- | --- | --- |
| 135 | Neoverené (potrebný iPhone): systémové gesto späť + naša animácia = možná dvojitá animácia. | Neoverené: systémové gesto späť + naša animácia = možná dvojitá animácia; pravdepodobne prijateľné. | nízky · S |

### iPhone a WebSocket

| Č. | Čo | Poznámka / prečo | Dopad · Zl. |
| --- | --- | --- | --- |
| 181 | Upozornenia: WebKit scroll anchoring v zozname (vedľajší nález zo série Upozornenia). | Overiť na iPhone po ďalšom nasadení. | nízky · S |

### Service worker a PWA

| Č. | Čo | Poznámka / prečo | Dopad · Zl. |
| --- | --- | --- | --- |
| 187 | `public/sw.js`: vetvy `respondWith(fetch(request))` pre `/api/*`, dokumenty a `/_next/` len znovu vydajú tú istú požiadavku (bez cache a bez offline náhrady). Sú zbytočné a robia `page.route` v Playwrighte slepým (príčina nálezu 173). | Overené v Chromiu na produkčnom builde: keď worker tieto požiadavky nevybavuje, `page.route` funguje aj s aktívnym workerom. Lokálne meranie nepreukázalo rozdiel v latencii (medián 5,8 ms s workerom, 4,6 ms bez). Zmena `sw.js` je produkčná (PWA, iPhone), preto samostatne a s overením na iPhone; rieši sa spolu s 52. Po nej by `serviceWorkers: 'block'` v špecoch nebolo nutné (poistka `E2eServiceWorker.guard.test.ts` by sa upravila). Vetva 144: rovnaký vzorec je podľa hlásení iných projektov spúšťačom chyby WebKitu pri nahrávaní z iPhonu (nález 197); appka ju obchádza kopírovaním súborov do pamäte, takže zmena `sw.js` už nie je naliehavá, no vynechanie `respondWith` pri POST a PATCH by bolo ďalšou poistkou. Vetva 151: blok workera sa dnes vyžaduje aj pri `context.route` (Playwright pri ňom upozorňuje na to isté ako pri `page.route`; desať testov `google-login-completion` padalo vo WebKite) a poistka to stráži. | nízky · M |

### Vyhľadávanie a Sledovania

| Č. | Čo | Poznámka / prečo | Dopad · Zl. |
| --- | --- | --- | --- |
| OW-09 | Poškodený kurzor a neexistujúce sledovanie sa na frontende nerozlišujú. | Samostatné mapovanie; nie bezpečnostný problém. | nízky · M |

### Upratovanie a architektúra

| Č. | Čo | Poznámka / prečo | Dopad · Zl. |
| --- | --- | --- | --- |
| 3 | Kozmetika: nadbytočné `Number.isFinite`, nedosiahnuteľný `catch` pri parsovaní cieľov notifikácií. |  | nízky · S |
| 10 | `handleUserUpdate` robí vedľajšie efekty vo vnútri updatera stavu. |  | nízky · S |
| 23 | Nedosiahnuteľná vetva `null` v `parseRequestsTargetUrl`. |  | nízky · S |
| 26 | Nadbytočný / nedosiahnuteľný kód (`setIsSearchOpen(false)` v onboardingu, `user?.id ?? null`, ochrana pri mazaní ponuky, SSR ochrana). |  | nízky · S |
| 29 | Priame zápisy handlerov do sessionStorage a vyhľadanie ID z cache sú väčšinou nadbytočné oproti efektom hookov. |  | nízky · S |
| 30 | Mojibake (pokazené kódovanie) v komentároch `DashboardContent.tsx`. |  | nízky · S |
| 36 | Rôzne drobnosti: ESLint v `SearchLayout`, tri lightboxy s `max-h-[calc(100vh-2rem)]`, mŕtve `max-lg:` triedy, `min-h-screen` vo `FeedPostCreateScreen` a ďalšie. | Rôzne drobnosti. Pozor: tri lightboxy s `max-h-[calc(100vh-2rem)]` patria do rodiny `vh` z nálezu 92. | nízky · M |
| 39 | Kontrola „vlastný profil“ je napísaná dvakrát; `/dashboard/messages/0` dá `selectedConversationId` 0. |  | nízky · S |
| 54 | Nadbytočný / mŕtvy kód v efekte bloku 15 (`useMobileMessagePeer`). |  | nízky · S |
| 55 | `useOwnProfileOfferActions` vracia surový setter `setPendingDeleteOffer` len kvôli dialógu v `DashboardContent` (štruktúra). |  | nízky · S |
| 56 | Zdvojená alebo mŕtva logika pri mazaní vlastnej ponuky (napr. `offer.id` sa validuje dvakrát). |  | nízky · S |
| 58 | `skillActionError.ts` patrí k hooku, nie do `components/` (štruktúra, triviálne). |  | nízky · S |
| 61 | Slovenské texty mazania ponuky: „Vymazať“ vs „Odstrániť“ nie sú jednotné. |  | nízky · S |
| 64 | Kozmetika: zbytočná ochrana `typeof window` v popstate efekte bloku 8; komentáre bez diakritiky. |  | nízky · S |
| 75 | Nadbytočné / nedosiahnuteľné ochrany v štyroch nových hookoch kroku 6. |  | nízky · S |
| 77 | Zvyšky v presunutom kóde: komentáre bez diakritiky a anglické komentáre (upratovanie po rozdelení). |  | nízky · S |
| 82 | Nadbytočný kód v dvoch nových hookoch kroku 7. |  | nízky · S |
| 83 | Komentáre bez diakritiky a mojibake pri popstate efekte (krok 7). |  | nízky · S |
| 85 | Nadbytočný / nedosiahnuteľný kód v `useProfileWindowEvents` (krok 8). |  | nízky · S |
| 89 | Mojibake komentáre bloku 17 sa presunuli správne; 8 pokazených riadkov ostáva v `DashboardContent.tsx`. |  | nízky · S |
| 93 | `DashboardContent.tsx` má stále 695 riadkov (nad 500) – rozhodnutie: zoskupiť vstupy / ďalší hook / prijať. | `DashboardContent.tsx` má dnes 711 riadkov (limit 500); rozhodnúť: zoskupiť vstupy / ďalší hook / prijať (=TECH-01). | nízky · M |
| 94 | Veľmi široké rozhrania nových komponentov (49 a 88 vstupov). | Veľmi široké rozhrania (49 / 88 vstupov); riešiť spolu s 93. | nízky · M |
| 95 | Zvláštne odsadenie detí `FeedPostOverlayProvider` v `DashboardContentView.tsx`. |  | nízky · S |
| 96 | Zvyšky v súboroch kroku 9 (mojibake – 8 riadkov, a pod.). |  | nízky · S |
| 97 | Nadbytočný kód v presunutom JSX (10 ekvivalentných mutantov). |  | nízky · S |
| 103 | Mŕtvy súbor `SkillModals.tsx` (428 riadkov) nikde nepoužitý. |  | nízky · S |
| 105 | `SkillDescriptionModal.tsx` má 502 riadkov (nad limitom, len nahlásené). | `SkillDescriptionModal.tsx` má 502 riadkov (=TECH-09). | nízky · M |
| 133 | Riadok „Sledovanie“ volá `onClose?.()`, ktoré je zámerne bez účinku (zbytočné, stačí komentár). |  | nízky · S |
| 136 | `SearchUserProfileModule` prijíma nepoužívané props `onBack`, `onSendMessage`, `initialSummary`. |  | nízky · S |
| 138 | Kozmetika modulu cudzieho profilu (duplicitné zoznamy 26 props, trojitá reťaz chyby…). |  | nízky · M |
| 145 | Nadbytočné príkazy v dátovom hooku cudzieho profilu po oprave 128. |  | nízky · S |
| 148 | Systémové: ~13 komponentov zamyká stránku krehkým spôsobom (spoločný počítaný zámok). | Spoločný počítaný zámok scrollu pre ~13 komponentov (trieda chýb 116 / 147); návrh balíka. Do tej doby držať E2E stráž, že sa zámok vždy uvoľní. | stredný · L |
| 152 | Audit: `Sidebar.tsx` a `RightSidebar.tsx` (ďalší používatelia `AnimatePresence`) môžu držať globálne efekty počas výstupu. |  | nízky · M |
| 153 | Poznámka k upgradu: `inert` je nastavené imperatívne; pri Reacte 19 použiť prop. |  | nízky · S |
| 156 | Pozorovania pre všetky riadky Nastavení (panel sa vytvára nanovo, zástupná obrazovka pri Späť, stmievač blokuje ťuknutia, fokus). |  | nízky · M |
| 192 | V repozitári sú sledované dva zbytočné súbory: `frontend/backend/.coverage` (53 KB, databáza pokrytia Pythonu v priečinku frontendu) a `frontend/profilecard-test.txt` (15 KB, výstup PowerShellu z behu `jest --testPathPattern=ProfileCard`). | Oba pridal merge PR #127 (24. 9.). Koreňový `.gitignore` ignoruje len `backend/.coverage`, nie `frontend/backend/.coverage`. Odporúčanie: `git rm` oboch súborov a do `.gitignore` doplniť `**/.coverage`. Mazanie len so súhlasom používateľa. Na vetve 144 sa zistili aj tri nepoužité komponenty so starou kópiou nahrávania avatara (nikde sa neimportujú, v meraní pokrytia sú vynechané): `ProfileEditForm.tsx`, `ProfileAvatar.tsx` a `profile-edit/shared/AvatarActionsModal.tsx` (aj s testami). | nízky · S |
| 205 | `register_heif_opener()` sa volá lenivo v piatich moduloch spracovania obrázkov: `swaply/image_metadata.py`, `swaply/staged_image_moderation.py`, `swaply/tasks/offer_images.py`, `portfolio/image_processing.py` a `messaging/services/image_thumbnails.py`. Od opravy 200 sa podpora HEIC registruje raz pri štarte aplikácie (`swaply/heif_support.py`), takže tieto volania sú nadbytočné. | Neškodné (registrácia je opakovateľná), preto sa v oprave 200 nemenili, aby zmena ostala malá a ľahko vrátiteľná. Upratanie: volania zmazať alebo nahradiť jedným `register_heif_support()`; prirodzene to ide spolu s nálezom 193 (`Image.open` bez `formats=`), ktorý tie isté miesta tiež rieši. | nízky · S |
| 211 | Kľúč `skills.openingHours.title` má v kóde tri rôzne záložné texty: „Otváracia doba“ (`OpeningHoursModal.tsx`, `SkillsDescriptionMobileLayout.tsx`, `SkillsDescriptionMobileModals.tsx`), „Otváracia doba (voliteľné)“ (`OpeningHoursSection.tsx`) a „Otváracie hodiny“ (`ProfileOfferDetailMobileContent.tsx`, `ProfileOpeningHoursMobileModal.tsx`, `OfferCardBack.tsx`, `ProfileOffersSection.tsx`, `OfferReviewsDesktop.tsx`). Používateľ rozdiel nevidí, lebo preklad existuje vo všetkých šiestich jazykoch (sk: „Otváracia doba“). | Záložný text sa zobrazí len pri chýbajúcom preklade. Rozdiel stál jeden E2E test: `search-mobile-cards.spec.ts` hľadal tlačidlo podľa záložného textu „Otváracie hodiny“ a padal (vetva 151). Upratanie: jeden záložný text zhodný so slovenským prekladom. | nízky · S |
| 213 | Django 5.1 nahradilo argument `check` v `CheckConstraint` argumentom `condition` a Django 6.0 `check` odstráni. Aplikácia používa `check=` na 21 miestach v siedmich súboroch modelov (`accounts/models/offer_watches.py` 9×, `reports.py` 4×, `bug_reports.py` 4×, `feed_posts/post.py`, `profile_likes.py`, `profile_visits.py` a `user_blocks.py` po 1×) a na 27 miestach v 16 migráciách. Celá backendová sada na Djangu 5.2 z toho vypíše 48 varovaní `RemovedInDjango60Warning`. | Na Djangu 5.2 (LTS do 04/2028) nič nepadá, preto to nie je naliehavé; treba to urobiť pred skokom na Django 6.0. Premenovať sa dá od povýšenia na Django 5.2 (vetva 154; Django 4.2 argument `condition` nepoznalo). Týka sa aj starých migrácií: v nich ide len o názov argumentu a schéma sa nemení; po zmene overiť `makemigrations --check`, že nevznikne nová migrácia. Zistené pri mapovaní 183b. | nízky · S |
| 215 | Po povýšení na Django 5.2 (vetva 154) ostanú pripnuté verzie, ktoré Django 5.2 oficiálne ešte neuvádzajú (podľa klasifikátorov na PyPI): `django-cors-headers` 4.3.1 (Django 5.2 uvádza od 4.7.0), `django-filter` 23.3 (od 25.1), `django-redis` 5.4.0 (od 6.0.0), `channels` 4.1.0 (od 4.2.1) a `whitenoise` 6.6.0 (od 6.9.0). Pri `channels-redis` 4.2.0 (najnovšia 4.3.0) a `django-storages` 1.14.2 (najnovšia 1.14.6) klasifikátor Djanga 5.2 neuvádza žiadna verzia. | Skúška 29. 10. 2026 (Django 5.2.18 + DRF 3.18.3 s týmito verziami): celá backendová sada, 38 kontrol s produkčnými nastaveniami (PostgreSQL, Redis, simulované S3), servery daphne a gunicorn s WebSocketom, Celery aj admin prešli, takže nič nehorí. Ide o oficiálnu podporu a opravy chýb, nie o súčasný problém. Povyšovať po jednej knižnici a po každej spustiť celú sadu; pred každým povýšením prečítať zápis zmien. | nízky · M |
| 221 | Súbor `backend/swaply/test_settings.py` (rýchly hasher MD5, e-mail do pamäte, pamäťová cache, úprava limitov, SQLite v pamäti) nepoužíva ani `pytest.ini` (`DJANGO_SETTINGS_MODULE = swaply.settings`), ani CI; spomína sa len v súhrnoch `REVIEW_SUMMARY.md` a `FINAL_RESULTS.md`, v zozname vynechaných súborov `.coveragerc` a vo výnimke v `pyproject.toml`. Jeho komentár „Use fast password hasher for tests“ vyvoláva dojem, že testy bežia rýchlo, a práve preto zostalo spomalenie od Djanga 5.2 (nález 220) nepovšimnuté. | Návrh: buď prepnúť `pytest.ini` na tento modul (zmení sa viac než hasher: cache, limity, e-mail, logovanie, takže treba prejsť celú sadu), alebo súbor zmazať a odstrániť jeho zmienky (`.coveragerc`, výnimka v `pyproject.toml`). Mazanie len na pokyn používateľa. Rýchly hasher je už zachránený v `backend/conftest.py` (nález 220). Zistené pri vetve 154. | nízky · S |
| 226 | `frontend/middleware.ts` (37 riadkov) má pre HTML dokumenty v produkcii nastaviť `Cache-Control: no-store`, ale leží v koreni frontendu a aplikácia má priečinok `src/`, v ktorom Next hľadá middleware len ako `src/middleware.ts`. Súbor sa preto nikdy nespúšťa: `middleware-manifest.json` je pri Next 14 aj Next 16 prázdny (`"middleware": {}`). | Skutočnú hlavičku `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate` posiela Next sám, lebo koreňový layout má `dynamic = "force-dynamic"` a `revalidate = 0` (overené na Next 14 aj 16 na `/`, `/about`, `/login`, `/reset-password/…` a `/dashboard/settings`; `Content-Security-Policy` je rovnaká). Súbor teda nič nerozbíja, len klame, a poznámka v pôvodnom texte nálezu 184 („middleware.ts len nastavuje Cache-Control“) bola zavádzajúca. Návrh: súbor zmazať. Presun do `src/` (v Next 16 sa volá `proxy.ts`, `middleware` je zastaraný) by ho aktivoval pre celú aplikáciu, preto až s testom hlavičiek a po rozhodnutí majiteľa. Zistené pri 184b. | nízky · S |
| 230 | Next 16 používa predvolene Turbopack; aplikácia ho zatiaľ nepoužíva: `build` a `dev` majú od 184b `--webpack`, lebo Turbopack padá pri tvorbe stránok `/404` a `/500` na starom `src/pages/_document.tsx` (`PageNotFoundError: /_document`) a `next.config.js` má vlastný blok `webpack` (alias `@`, vypnutá cache vo vývoji). | Návrh: zmazať `src/pages/_document.tsx` (16 riadkov, `<Html lang="sk">`; jazyk rieši koreňový layout) a overiť, že sa `/404` a `/500` zostavia; potom zvážiť Turbopack najprv len pre `dev`. Nízka priorita, nič nehorí. | nízky · M |
| TECH-01…11 | Nadlimitné súbory (>500 riadkov, bez testov), stav 29. 10. 2026, spolu 33: `FeedPostComments` 1 487, `ProfileOffersSection` 1 108, `RequestsNotificationsContext` 1 034, `FeedPostCard` 1 033, `ProfileOffersMobileSection` 945, `useDashboardState` 921, `lib/api.ts` 912, `ConversationsList` 864, `ProfileMobileView` 768, `MobileOnboardingOverlay` 763, `DashboardContent` 711, `DesktopOnboardingContext` 706, `RequestsMobile` 706, `OfferReviewsView` 692, `RequestSummaryCard` 683, `MobileOnboardingContext` 661, `app/search/page.tsx` 648, `RequestsDesktop` 646, `useSkillsDescriptionScreenState` 638, `DesktopOnboardingOverlay` 612, `FeedPostMobileDetail` 594, `RequestDetailModal` 587, `SkillsModuleRouter` 583, `ProfileModule` 563, `ConversationDetail` 556, `lib/feedApi.ts` 545, `OfferReviewsMobile` 545, `messagingApi` 542, `DraftConversationDetail` 527, `useDashboardNavigation` 514, `useConversationThreadController` 505, `districts` 502, `SkillDescriptionModal` 502. | Technický dlh; podľa `svaply.mdc` len nahlásiť, nič s nimi nerobiť. Zoznam prepočítaný 29. 10. 2026 (predtým desať súborov z 26. 10.). Pri nálezoch v správach to znamená, že nová logika ide do nového súboru a do `ConversationDetail` ani `useConversationThreadController` sa nezasahuje (nález 218). | nízky · L |

### Nástroje a testy

| Č. | Čo | Poznámka / prečo | Dopad · Zl. |
| --- | --- | --- | --- |
| 4 | `tsc` nekontroluje testy (chýba `@types/jest`), testy sa typovo nikdy nekontrolujú. | `tsc` nekontroluje testy; zapnutie môže odhaliť veľa chýb. | nízky · M |
| 16 | Nástenka testovacieho účtu drží 20+ vlastných zdieľaných/voľných príspevkov (možné pozostatky). | Testovací účet drží 20+ vlastných príspevkov. Na novom serveri nebudú testovacie účty; riešené cez N4 (staging). | nízky · S |
| 19 | Dva E2E testy majú vlastné kópie `recordMainInstance` – prejsť na spoločného pomocníka. |  | nízky · S |
| 20 | E2E S6/S7 (`messages-peer-profile.spec.ts`) sa nikdy nespustili na produkcii (treba `E2E_PEER_SLUG` a tvoj súhlas). |  | nízky · S |
| 32 | Cudzie súbory v repozitári: 3 sledované súbory v koreni `components/…`, `postcss.config.mjs`, `.backup` súbory. | Cudzie súbory v repozitári. Rozšírené 26. 10. 2026: v koreni sú navyše commitnuté `cd`, `git`, `main`, `out)`, `.mp4`, `frontend-build.zip`, dva prázdne WinRAR zipy, `Dockerfile.backup`, `test-autosave.html`, `linecount*`. Tajomstvá som v repozitári ani v histórii nenašiel. Doplnené 29. 10. 2026 (vetva 152): v `backend/` sú sledované aj štyri prázdne súbory `list`, `x.id`, `{` a `r.json())`, v koreni druhé video `ezgif.com-video-to-gif-converter-desktop.mp4` (0,6 MB) a `.coverage` (98 KB). | nízky · S |
| 34 | Zmiešané konce riadkov: `autocrlf=true` bez `.gitattributes`; `DashboardContent.tsx` je BOM + CRLF. |  | nízky · S |
| 35 | Zabudnuté nečinné Jest procesy z 2026-09-26 (pýtať sa pred ukončením). |  | nízky · S |
| 78 | Testy `DashboardContent.onboardingHandlers.test.tsx` majú 3 TypeScript chyby (už pred rozdelením). |  | nízky · S |
| 110 | Medzera v testoch: žiadne E2E pre Vyhľadávanie → profil → detail → Späť; synchrónne mocky routera skrývajú závody. |  | nízky · M |
| 113 | Chýba E2E pre režim nízkeho okna mobilných Nastavení. |  | nízky · S |
| 157 | Medzera v testoch: preteky „Viac počas výstupu“ pre umiestnenie nad appkou majú len unit testy. |  | nízky · S |
| 178 | ESLint hlási 10 chýb a 1 varovanie v nezmenenom súbore `search/hooks/useRecentSearches.tsx` (už na `main`). | CI lint nespúšťa (TOOL-01), preto si to nikto nevšimol. V tom istom súbore je aj APP-05 (závod pri overení histórie); riešiť spolu. | nízky · S |
| 182 | PR #191 / vetva `134-diag`: len diagnostika, nikdy nezlúčiť; po vyriešení 180 uzavrieť a vetvu zmazať. | Vetva sa maže len na pokyn používateľa. | nízky · S |
| 183 | Backend: `pip-audit` celého prostredia (aj tranzitívne balíky) hlásil 191 záznamov v 14 balíkoch (prvý sken 26. 10. bral len pripnuté balíky: 180 záznamov). Časť 183a (vetva 143, 27. 10.) je hotová: Pillow 13.0.0, pillow-heif 1.x, DRF 3.17.2, simplejwt 5.5.1, gunicorn 23.0.0, daphne 4.2.3, requests 2.33.0, python-dotenv 1.2.2, bleach 6.4.0, Django 4.2.30 a odstránený nepoužívaný `django-allauth`; CI beží na Pythone 3.11 (191 → 22 záznamov v 5 balíkoch). Časť 183b je hotová v dvoch krokoch: nastavenia úložísk sú presunuté do `STORAGES` (vetva 152, zlúčená v PR #209) a backend je povýšený na Django 5.2.18 s DRF 3.18.3 (vetva 154, zlúčená v PR #214; 22 → 4 záznamy bez nástrojov samotného prostredia `pip` a `setuptools`). Časť 183c je hotová (vetva 158, zlúčená v PR #217): `google-cloud-vision` 3.4.5 → 3.16.0 vyžaduje protobuf od 6.33.5 (čerstvá inštalácia dá 7.36.2), takže hlásenie CVE-2026-0994 zmizlo (4 → 2 záznamy). Zostáva len `pytest` 8.3.2 (2 záznamy, len vývoj; oprava až v 9.0.3), preto sa nález presúva do skupiny po nasadení. Twisted 26.10.0, ktoré medzitým vyšlo, berie čerstvá inštalácia sama, takže jeho 6 záznamov zmizlo. | Django 4.2 LTS už nemá podporu (skončila 04/2026), preto 9 zvyšných záznamov nikto pre 4.2 nevyhodnotil (popisy sa týkajú Djanga 5.2 a 6.0: cache middleware, signed cookies, GeoDjango/GDAL, `DomainNameValidator`; aplikácia nič z toho v kóde nepoužíva). Riešenie 183b (vetva 154): samostatný balík Django 4.2 → 5.2 LTS spolu s DRF 3.18.3 (3.18.0 a 3.18.1 ešte neopravujú nič; všetky 3 záznamy DRF majú opravu až v 3.18.2). Dva z nich sú DoS bez prihlásenia na verejných endpointoch (hlavička `Accept` a netextový `charset` v `Content-Type`), tretí sa týka DRF tokenov, ktoré aplikácia nepoužíva, prihlasuje len JWT. Pred ním bolo treba presunúť `STATICFILES_STORAGE` a `DEFAULT_FILE_STORAGE` do `STORAGES`: Django 5.1+ ich ticho ignoruje, aplikácia by bežala ďalej, no fotky (avatary, ponuky, správy) by sa ukladali na lokálny disk servera a po každom nasadení by zmizli (skúška na Djangu 5.2 bez presunu: úložisko bolo lokálny disk a 3 z 38 kontrol zlyhali). Presun je na vetve 152: `STORAGES` je v `static_media.py` a `settings_production.py`, `messaging/storage.py` ho číta (záložnú vetvu na `DEFAULT_FILE_STORAGE` odstránila) a stráži ho `tests/test_production_settings_storages.py` (načíta produkčné nastavenia v samostatnom procese a zakáže staré nastavenia) spolu s `tests/test_messaging_storage_selection.py` (výber súkromného úložiska fotiek správ, ktorý doteraz nemal test). Django 4.2 odvodzuje `STORAGES` zo starých nastavení, preto je súkromné úložisko správ (ACL private, podpísané adresy) v produkcii aktívne už dnes a po presune ostáva rovnaké. Povýšenie (vetva 154): Django 5.2 vyžaduje PostgreSQL 14 a novší (Railway má 17), prihlásenie je asi 1,7-krát náročnejšie na procesor (hashovanie hesiel 1 000 000 iterácií namiesto 600 000; staré heslá sa prepíšu pri prihlásení a Django 4.2 overí aj nový hash, takže rollback je bezpečný; dôsledok pre CI je v náleze 220) a DRF 3.18 vyžaduje Django 5.2, preto sa povyšujú spolu. 183c (vetva 158): `google-cloud-vision` 3.4.5 → 3.16.0 kvôli protobuf (CVE-2026-0994: zacyklenie `json_format.ParseDict` pri vnorených `Any`, oprava od 5.29.6 alebo 6.33.5; aplikácia protobuf priamo nepoužíva). Produkcia má `SAFESEARCH_FAIL_OPEN=False`, takže pokazená knižnica by zamietla každé nahrávanie obrázka; preto pribudol test `swaply/test/test_vision_client_contract.py`, ktorý spúšťa skutočného klienta proti falošnému gRPC serveru (bez účtu a bez siete). Overené: čerstvé prostredie, `pip check` čistý, celá sada na SQLite (1 993 prešlo a 10 preskočených) aj na PostgreSQL 16 (2 001 prešlo a 2 preskočené), päť zámerných chýb test zachytil, nahratie obrázka správy cez API proti falošnému serveru prešlo. Skutočné volanie serverov Google sa lokálne overiť nedá (potrebuje účet); overil ho majiteľ po nasadení 31. 10. 2026 (PC aj mobil): obyčajná fotka prešla, nevhodná sa nepridala so správnym hlásením a dobrá prešla so správnym hlásením (produkcia je fail-closed, takže úspech znamená, že kontrola funguje). Twisted: päť zo šiestich hlásení je v moduloch, ktoré aplikácia nepoužíva (IMAP, telnet, IRC, XMPP); šieste sa týka HTTP servera v daphne (holý CR/LF v hlavičke, request smuggling za proxy). Opravy prišli vo finálnom 26.10.0 (30. 10. 2026 ho už berie čerstvá inštalácia a `pip-audit` pri ňom nehlási nič); `daphne` Twisted nepripína, preto by sa dala doplniť dolná hranica `Twisted>=26.10.0` (zatiaľ len návrh, mimo vetvy 154). pytest 8 → 9 je vývojový balík (spolu s pytest-django a pytest-cov). Pillow 13 vyžaduje Python 3.11: CI sa prepol z 3.10, `backend/Dockerfile` je na 3.11 od začiatku a lokálne prostredie treba mať tiež na 3.11. Presne na 3.11: `psycopg2-binary==2.9.7` má hotové balíky najviac pre Python 3.11, takže na 3.12 a vyššom by sa musel najprv povýšiť aj on. Python 3.11 má podporu do 10/2027 (Google knižnice na to už upozorňujú), prechod na 3.12+ spolu s povýšením `psycopg2-binary` preto patrí do plánu. Overené na vetve 143: celá backend sada (1955 testov, aj v CI na PR #203), porovnanie skutočných obrazových funkcií so starým Pillow (146 prípadov, rovnaké výsledky aj pixely), migrácie (nové sú len `token_blacklist.0013` a `authtoken.0004`, obe bez zmeny schémy), tokeny platia v oboch smeroch (nasadenie aj rollback). Spustené 26. 10. 2026, časť 183a 27. 10. 2026, časť 183b (vetva 154) 30. 10. 2026; počty sú záznamy nástroja, nie doslovný zoznam zneužiteľných chýb. **Rozhodnutie R8** (rozhodnuté, časť 6). | nízky · M |
| 195 | `backend/.coveragerc`: zoznam `omit` obsahuje päť neexistujúcich súborov (`swaply/settings_clean.py`, `swaply/migrate_api.py`, `accounts/views/google_oauth.py`, `accounts/views/simple_google_oauth.py`, `accounts/views/oauth.py`) a prah `fail_under = 94.8` sa líši od `--cov-fail-under=85` v `pytest.ini`. Riadok `accounts/views/*` navyše vynecháva z merania pokrytia všetky views. | CI beží s `--no-cov` (pokrytie sa nevynucuje), takže nič z toho nespôsobuje chybu; číslo pokrytia však o views nič nehovorí. Zistené pri odstraňovaní allauth (143), kde som z `omit` zmazal len riadky pre zmazané allauth súbory. Patrí k téme „pokrytie sa rieši samostatne“ z komentára v `deploy.yml`: treba rozhodnúť, aký prah platí a čo sa meria. | nízky · S |
| 196 | `.github/workflows/deploy.yml`: akcie `actions/checkout@v4`, `actions/setup-node@v4` a `actions/setup-python@v4` sú staršie než verzie pre Node.js 24 (`setup-python@v4` deklaruje `node16`, ostatné dve `node20`). GitHub ich dnes núti bežať na Node.js 24 a v logu každého behu vypíše varovanie „Node.js 20 is deprecated“ (beh CI na PR #203, 27. 10.). CI pritom prechádza a krok `Setup Python` nezlyhal. | Overené v `action.yml` jednotlivých tagov: `setup-python@v5` deklaruje `node20` (varovanie by zostalo), až `setup-python@v6` `node24`; `checkout@v5` a `setup-node@v5` už `node24`. CodeRabbit (PR #203) navrhol len `setup-python@v5` s tvrdením, že krok môže zlyhať; beh CI to nepotvrdil a samotné v5 by varovanie neodstránilo. Oprava: povýšiť všetky tri akcie naraz na verzie pre Node 24 a overiť behom CI; robiť spolu s nálezom 194 (úprava workflow). | nízky · S |
| 206 | `npx eslint src` hlási 681 chýb a 31 varovaní v 124 z 1 255 súborov frontendu (104 súborov s chybou, z toho 51 testov a 53 produkčných). Najviac je `no-unused-vars` (359), `no-explicit-any` (213), `no-require-imports` (66) a `no-unused-expressions` (29, najmä modaly úpravy profilu `profile-edit/modals/*`). Deväť chýb `react-hooks/rules-of-hooks` je v `messages/ConversationMessageRow.tsx` (riadky 173–233: hooky stoja za predčasným `return` pre skupinové pozvánky a systémové správy). | Zmerané 27. 10. na vetve 147. Rozširuje nález 178 (ten opisuje jediný súbor) a súvisí s TOOL-01 (CI lint nespúšťa). `ConversationMessageRow` dnes nepadá, lebo typ správy sa pri tom istom `id` nemení; ak by sa niekedy zmenil (napr. skupinová pozvánka na obyčajnú správu), React hodí „Rendered more hooks than during the previous render“. Odporúčanie: najprv hooky pred `return`, potom rozhodnúť, či lint dať do CI, a upratať zvyšok po balíkoch (najprv produkčné súbory). | nízky · M |
| 219 | `PageActivity.report()` (`e2e/support/page-activity.ts`) čaká na `page.evaluate(readPageSnapshot)` bez časového limitu. Ak hlavné vlákno stránky zamrzne (napr. nekonečný cyklus), `evaluate` sa nevráti ani nevyhodí chybu, `afterEach` visí do limitu hooku, pôvodné zlyhanie sa stratí a dôkazy o požiadavkách sa nevypíšu práve v prípade, na ktorý sú určené (CodeRabbit, PR #210, Minor). | Návrh: obmedziť čakanie na snímku na 3 s pomocou pomôcky `withTimeout` v `page-activity-format.ts` (časovač sa musí zrušiť; test s nikdy nekončiacim sľubom) a pri vypršaní vypísať „page state: unavailable“ spolu s požiadavkami. Spolu s tým upraviť hlášku v `search-settled.ts` („Both initial searches…“ → „The initial search requests…“): CodeRabbit ju čítal ako požiadavku na dve hľadania, no kód čaká len na 0,4 s ticha po načítaní používateľa a jedno hľadanie stačí, takže jeho druhý bod (zaseknutie pri už inicializovanom `authBootstrapSnapshot`) neplatí. Dve štylistické poznámky k `ZOZNAM.md` (rozdeliť dlhé súvetia pri nálezoch o diagnostike a o dôkazoch) sú kozmetika a CodeRabbit ich sám označil za nepotvrdené. Vetva 153 sa zlúčila bez nich. | nízky · S |
| 227 | Po 184b (vetva 159) funguje `npm run lint` (`eslint .`); predtým sa pýtal na interaktívne nastavenie a v CI sa nespúšťa. Nový `eslint-config-next` 16 prináša pravidlá „React Compiler“ z `eslint-plugin-react-hooks` 7; na dnešnom kóde by pridali ~340 hlásení (`set-state-in-effect` 255, `refs` 57, `preserve-manual-memoization` 20, `immutability` 6, `purity` 1), preto sú v `eslint.config.mjs` vypnuté. Lint hlási 779 problémov (336 chýb a 443 varovaní): `no-unused-vars` 363, `no-explicit-any` 213, `no-require-imports` 101 a drobnosti; pred 184b to bolo 752 (721 chýb). | Návrh: najprv vyčistiť `no-unused-vars` a `no-explicit-any`, potom zapínať vypnuté pravidlá po jednom (najprv `purity`, `immutability`) a lint zapojiť do CI s prahom chýb. `npm ci` hlási, že `eslint@9.39.5` už nie je podporovaný; `eslint-config-next` 16 vyžaduje `eslint >=9.0.0`, takže povýšenie na novšiu hlavnú verziu je samostatný malý krok. | nízky · M |
| 229 | `npm audit --omit=dev` hlási po 184b 5 stredných záznamov: `@sentry/nextjs` → `@sentry/bundler-plugins` a `@sentry/webpack-plugin` → `glob` a `minimatch` (DoS cez zosilnenie `globparts` a obídenie zrušenia cez `AbortSignal`). Všetko je v nástroji, ktorý beží len pri zostavení; nahrávanie zdrojových máp je vypnuté, kým nie je nastavený `SENTRY_AUTH_TOKEN`. | Nástroj navrhuje `npm audit fix --force`, no ponúka `@sentry/nextjs` 10.76.1, teda nižšiu verziu než dnešné `^10.76.2`, takže to nie je oprava. Čakať na novšiu verziu `@sentry/nextjs`, ktorá bundler plugin aktualizuje, a medzitým ich viesť ako známu výnimku v kontrole z nálezu 194. | nízky · S |
| APP-05 | Asynchrónne overenie položky histórie môže prepísať novší dotaz (`useRecentSearches.tsx`). | Spolu s 178. | nízky · S |
| ENV-01 | Dva backendové testy obrazovej moderácie blokuje Windows / gRPC (na Linuxe CI prejdú). | Prostredie, nie produkt. | nízky · S |
| OW-08 | Upratať historické testovacie dáta v Railway (karta ID 165 sa nemaže). | Na novej, čistej databáze odpadá. | nízky · S |
| TEST-06 | Živý OW-03 scenár nemá vlastnú ponukovú fixture. | Použiť existujúce sledovanie; nič nevytvárať. | nízky · S |
| TEST-08 | Historické nedosiahnuteľné vetvy stránky `/search` (93,45 % vetiev) – výnimka z 95 %. | Transparentne evidované. | nízky · S |
| TOOL-01 | `next lint` vyžaduje interaktívnu konfiguráciu; CI lint nespúšťa. | Pridať neinteraktívny lint do CI až po vyčistení chýb (178). | nízky · S |
| TOOL-02 | Windows WebKit natívne nejde (Code Integrity); funguje cez Docker kontajner. | Obmedzenie prostredia. | nízky · S |

## 6. Rozhodnutia

Pri každom čakajúcom rozhodnutí je odporúčanie agenta. Odpovedať stačí číslom, napr. „R2: len slovenčina, R3: súhlasím“. Bez odpovede používateľa sa nič z toho nerobí.

| Č. | Téma | Otázka | Odporúčanie | Kedy |
| --- | --- | --- | --- | --- |
| R1 | Hosting (N1) | Kam nasadiť ostrú verziu pre ostatných používateľov (Railway ostáva len na testy)? | Hetzner Cloud (EÚ) + Coolify + Cloudflare + R2 (príloha C). Pre čo najmenej starostí so serverom, ak to rozpočet unesie: Render (Frankfurt) alebo Scalingo. | Až keď bude aplikácia hotová. Teraz netreba. |
| R2 | Jazyky pri štarte (176, 120, 175, 177, APP-03) | Ktoré jazyky majú byť pri štarte plne preložené? | Podľa cieľového trhu. V profile a vyhľadávaní chýbajú preklady hlavne v češtine (~30) a poľštine (~14), v nemčine jeden; v celej aplikácii má čeština asi 210 a poľština asi 90 slovenských kópií (176). Ak štart cieli len na Slovensko, 176 môže ísť po nasadení; ak aj na Česko a Poľsko, patrí pred štart. Malé veci 120, 175 a 177 idú pred štart v každom prípade. | Pred prácou na 176 (určuje poradie prekladov), najneskôr pred štartom. |
| R3 | Číselné slugy (81) | Zakázať slug zložený len z číslic, alebo ho vo frontende uprednostniť pred ID? | Zakázať pri generovaní (predpona `u-`) a doplniť migráciu existujúcich. Frontendová záplata nerieši, že dve rôzne veci majú rovnaký tvar. | Pred prácou na 81. |
| R4 | Zmazaný komentár v upozornení (74) | Čo má urobiť klik na upozornenie, ktorého komentár už neexistuje? | Otvoriť príspevok a ukázať krátku hlášku „komentár už nie je“, aby používateľ nezostal na slepej ceste. Pri zmazanom príspevku platí hláška z opravy 111. | Pred prácou na 74. |
| R5 | Otváracie hodiny vo výsledkoch (OW-14) | Čo s nefunkčným tlačidlom Otváracie hodiny pri firemnej ponuke vo výsledkoch? | Doplniť popover (API údaje posiela, vzor je v profile). Ak by to bolo príliš veľké, dočasne tlačidlo skryť, aby tam nebolo mŕtve. | Pred prácou na OW-14. |
| R6 | Mobilné výsledky Sledovaní v iOS PWA (OW-05) | Majú byť hotové pred štartom? | Až po štarte, ak Sledovania nie sú hlavná funkcia pri štarte. Je to rozšírenie (plán mobilných výsledkov), nie oprava. Pred štartom stačí overiť, že používateľ nenarazí na slepú uličku. | Pred prácou na OW-05. |
| R7 | Zistenie krajiny (186) | Ako zisťovať krajinu používateľa bez volania cudzej služby z prehliadača? | Ak ostane Cloudflare: hlavička `CF-IPCountry` (bez tretej strany v prehliadači). Inak GeoIP databáza na backende. Volanie `ipapi.co` z prehliadača odstrániť. | Až pri príprave štartu (186). |
| R10 | Obrazová moderácia pri výpadku (N10) | Čo robiť, keď Google Vision nie je dostupný? | Produkcia je už nastavená „fail-closed“: obrázok sa odmietne s hláškou „Kontrola bezpečnosti obrázka zlyhala, skúste neskôr.“ Odporúčanie je ponechať (bezpečnejšie), len počítať s tým, že pri výpadku Google sa nedajú nahrať obrázky, a sledovať kvóty. | Až pri príprave štartu (N10); stačí potvrdiť. |
| R11 | Stará bezpečnostná správa (185) | Čo so zastaranou správou `SECURITY_AUDIT_REPORT.md` z roku 2024? | Archivovať mimo repozitára (alebo prepísať podľa dnešného stavu) a overiť, či je repozitár verejný: interné audity a poznámky o rizikách tam nepatria. | Pred prácou na 185. |

**Rozhodnuté:**

| Č. | Téma | Odpoveď | Dátum |
| --- | --- | --- | --- |
| R8 | Django a backend balíky (183) | Podľa odporúčania: najprv rýchle upgrady a odstránenie allauth (183a, vetva 143), potom samostatný balík Django 5.2 LTS (183b); každý na vlastnej vetve s celými backendovými testami. | 27. 10. 2026 |
| R9 | Next.js 14 → 15 / 16 (184) | Podľa odporúčania: samostatná vetva 159 pred štartom s Next 16.4.3 a Reactom 19.3.1; frontend ostáva na vlastnom serveri, nie na Verceli. Majiteľ odsúhlasil aj plán s upozornením na novú minimálnu podporu Safari 16.4 (iOS 16.4). | 31. 10. 2026 |

## 7. Hotové

65 položiek. Pri položkách 159–172 a novších platí: opravené a zlúčené (alebo označené ako čakajúce na zlúčenie); či ich používateľ overil manuálne, zoznam neeviduje.

| PR | Vetva | Položky |
| --- | --- | --- |
| #177 | 126 | 128, 137, 141 (prvá polovica), 155 |
| #176 | 125 | 116, 147 (+ odstránený ladiaci pás 126) |
| #180 | 127 | 159 |
| #181 | 128 | 160, 161 |
| #182 | 129 | 167, 168, 169, 170 (+ opravy po CodeRabbit) |
| #187 #188 #189 #190 #192 #194 | 130–135 | séria Upozornenia (nálezy sa v zozname nečíslovali, viď nižšie) |
| #196 | 136 | 162, 163, 164 |
| #197 | 137 | 171, 172 |
| #198 | 138 | 154, 165, 166 (+ „a ďalší (N)“ a hlášky pri Obľúbených) |
| #200 | 140 | 173 |
| #201 | 141 | 188 |
| #204 | 144 | 197, 198 |
| #204 | 145 | 199 |
| #204 | 146 | 200 |
| #204 | 147 | 201 |
| #205 | 148 | 203 |
| #206 | 149 | 202 |
| #207 | 150 | 208 |
| #208 | 151 | 190, 210 |
| #210 | 153 | 217 |
| #211 | 155 | 218 |
| #214 | 154 | 220 |
| #216 | 157 | 212 |
| #215 | e2e/profilove-adresy | 222 |
| PR čaká | 159 | 184 |

Séria Upozornenia (nečíslované nálezy): #187 riadky upozornení na mobile majú 72 px ako riadky konverzácií, #188 dlhé slová sa zalamujú a obnovenie drží načítané dávky, #189 chyba „Zobraziť ďalšie“ sa ukáže pri tlačidle, #190 scroll desktopového panela neodpojí aplikáciu od okna, #192 realtime resync pri návrate / pripojení / online + polling 30 s (nad 90 načítaných vypnutý), #194 nekonečný scroll s kostrami a opakovaním s odstupom. PR #191 (vetva `134-diag`) je len diagnostika a nesmie sa zlúčiť (nález 182).

Všetky hotové položky:

| Č. | O čom |
| --- | --- |
| 37 | VYRIEŠENÉ: chybné percentuálne kódovanie v adrese portfólia už nehádže `URIError` (nález CodeRabbitu, krok 2). |
| 41 | ROZHODNUTÉ balík 41+42+43: Späť z recenzií = skutočný krok histórie + zapamätaný scroll profilu. |
| 42 | (mobil) Späť môže vytvoriť slučku Profil ↔ Recenzie (aj app Späť, aj prehliadač). |
| 43 | (desktop) Stránka recenzií nemá šípku „Späť“ pri nadpise. |
| 44 | HOTOVÉ: skrytá spodná navigácia na stránke recenzií (mobil). |
| 45 | HOTOVÉ + ZATVORENÉ: spodná navigácia skrytá pri detaile portfólia; záložka Portfólio na profile ostáva (tvoje rozhodnutie). |
| 47 | (mobil) Späť z cudzieho profilu po F5 – mäkká časť opravená (108), tvrdé načítanie ostáva známym obmedzením. |
| 48 | Chyba z testov notifikácií (vlastný profil cez „páči sa mi“): oprava (a) zlúčená, zvyšok = 49 + 50. |
| 49 | Service worker cachuje RSC odpovede, po nasadení vznikajú tvrdé načítania – opravené vetvou `105`. |
| 50 | Perzistované zvýraznenie ponuky (sessionStorage) – opravené vetvou `104`. |
| 69 | Test 5 + Test 9 (desktop): toast, blikanie, scroll po opätovnom otvorení – opravené vetvami 109 + 110. |
| 71 | Upozornenie „páči sa mi“ na zmazanú ponuku otvorilo profil až po druhom otvorení – opravené (111). |
| 99 | HOTOVÉ (#167): zmena typu účtu zmazala názov firmy / priezvisko a zmenila slug (backend `name_normalization.py`). |
| 100 | HOTOVÉ: desktopové okno úpravy skrývalo uložené tagy a pridanie jedného ich zahodilo (`TagsSection`). |
| 101 | HOTOVÉ: profil si ponechal staré fotky po pridaní / zmazaní fotky (obnova pred odloženým mazaním). |
| 102 | iPhone: známa slučka Späť Profil ↔ Recenzie (= 41/42) – vyriešené balíkom 41–43 (vetvy 121–124). |
| 108 | HOTOVÉ (#166): Späť z cudzieho profilu profil neopustila hneď (čakajúci pôvod zahodený skorým mountom). |
| 109 | HOTOVÉ: tlačidlo „Viac“ v mobilných Nastaveniach pripnuté dole. |
| 111 | HOTOVÉ: pripnuté „Viac“ nechávalo málo miesta na nízkych oknách (nález CodeRabbitu). |
| 112 | Trvalé prázdne miesto pod „Viac“ v pripnutom portrétovom rozložení (vyriešené položkou 114). |
| 114 | HOTOVÉ (#164): tenká lišta pre „Viac“ (pôvodne „strašne vysoké“). |
| 115 | HOTOVÉ (#165): lišta bola stále 116 px nad lištou Safari (môj odhad odstupu bol zlý), potvrdené na tvojej fotke. |
| 116 | HOTOVÉ (#176): riadok „Sledovanie“ v mobilných Nastaveniach blikal namiesto plynulého posunu (oprava + dve kolá kontroly). |
| 117 | HOTOVÉ (#166): 15 s limit čakajúceho pôvodu profilu rozbíjal pomalú navigáciu (nález CodeRabbitu). |
| 118 | HOTOVÉ (#166): zrušiť čakajúci pôvod profilu, keď `router.push` zlyhá (nález CodeRabbitu). |
| 122 | HOTOVÉ (#170): šípka z recenzií po F5 otvárala cudzí profil s otočenou kartou a zvýraznením. |
| 123 | HOTOVÉ (#171): po F5 a šípke z recenzií vznikol duplicitný záznam profilu v histórii. |
| 126 | HOTOVÉ: volanie `scrollDebugTag("profile restore")` odstránené spolu s ladiacim pásom. |
| 128 | HOTOVÉ (#177): po prepnutí z profilu na profil sa už neukazuje zoznam ponúk predošlého profilu. |
| 137 | HOTOVÉ (#177): medzera v testoch modulu cudzieho profilu doplnená (správanie, prepínanie, neskoré akcie). |
| 147 | HOTOVÉ (#176): odmountovanie obrazovky Sledovanie s otvoreným dialógom nechalo zámok scrollu natrvalo. |
| 154 | HOTOVÉ (#198): anglické „Network Error“ na obrazovke profilu a v hláškach akcií nahradené prekladom. |
| 155 | HOTOVÉ (#177): riadok Sledovanie sa hýbe ako ostatné riadky Nastavení (zoznam sa odsúva doľava). |
| 159 | HOTOVÉ (#180): Domov po profile otvorenom z Nástenky vráti na zapamätané miesto, druhý klik ide na vrch (PC vlastný aj cudzí profil, mobil len vlastný). |
| 160 | HOTOVÉ (#181): šípka späť v konverzácii otvorenej z profilu vráti na profil (mobil). |
| 161 | HOTOVÉ (#181): hlavička konverzácie ukazuje meno a avatar aj pri žiadosti o správu (backend aj frontend). |
| 162 | HOTOVÉ (#196): klik na meno / hlavičku karty v Obľúbených na PC otvorí profil. |
| 163 | HOTOVÉ (#196): „+ Pridať k obľúbeným“ a „Páči sa mi profil“ na PC sa po zapnutí zvýraznia fialovou. |
| 164 | HOTOVÉ (#196): ikona obľúbených na mobile sa po pridaní zmení z + na −. |
| 165 | HOTOVÉ (#198): „Dokončené spolupráce“ a menu cudzieho profilu preložené do všetkých jazykov. |
| 166 | HOTOVÉ (#198): chybová obrazovka a načítavanie cudzieho profilu, hlášky akcií a „a ďalší (N)“ preložené do všetkých jazykov. |
| 167 | HOTOVÉ (#182): „Poslať správu“ z profilu otvoreného z konverzácie hneď otvorí konverzáciu (predtým sa zmenila len adresa). |
| 168 | HOTOVÉ (#182): zoznam Správ a Žiadostí sa dotahuje po dávkach (limit 20 preč) + oprava N+1 dotazov na backende. |
| 169 | HOTOVÉ (#182): posledná konverzácia v zozname Správ sa dá odscrollovať nad spodnú lištu (mobil). |
| 170 | HOTOVÉ (#182): pole vyhľadávania v zozname Správ sa na mobile scrolluje spolu s prepínačom a tlačidlom skupiny. |
| 171 | HOTOVÉ (#197): klik na autora karty zhody v Sledovaniach otvorí profil aj pri stojacej stránke toho istého profilu (PC). |
| 172 | HOTOVÉ (#197): po zablokovaní a z chybovej obrazovky profilu sa zobrazí Nástenka, nie zablokovaný profil. |
| 173 | HOTOVÉ: E2E špecy, ktoré strážia zápisy alebo podvrhujú sieť cez `page.route`, blokujú service worker (`serviceWorkers: 'block'`); nové špecy stráži Jest poistka `E2eServiceWorker.guard.test.ts`. Overené v Chromiu na produkčnom builde (Playwright 1.63): bez bloku strážca zápis 1,5 s po načítaní nezachytí. Vetva 151 (nález 210) poistku rozšírila aj na `context.route` a blok doplnila do `google-login-completion.spec.ts`, kde vo WebKite padalo desať testov. |
| 184 | HOTOVÉ (časť 184a: vetva 142, PR #202; časť 184b: vetva 159, čaká na zlúčenie): frontend je povýšený z Next 14.2.35 a Reactu 18.3.1 na Next 16.4.3 a React 19.3.1 (rozhodnutie R9). Zmizla kritická zraniteľnosť `next` aj vysoká `postcss`: `npm audit --omit=dev` 7 → 5, zostáva 5 stredných v build nástroji Sentry (nález 229). Zmeny: (1) závislosti: framer-motion 12, Testing Library 16 s novou povinnou `@testing-library/dom`, ESLint 9 a `eslint-config-next` 16, `overrides` pre `@emoji-mart/react` (oficiálne React 19 nepodporuje, v skúške funguje); lockfile 964 → 990 balíkov; (2) skripty: `build` a `dev` s `--webpack` (Turbopack padá na `src/pages/_document.tsx`, nález 230), `lint` ako `eslint .` (nález 227); (3) `tsconfig.json` (tri zmeny, ktoré si Next 16 robí sám) a `images.qualities: [75, 80]` v `next.config.js` (Next 16 inak zníži kvalitu loga z 80 na 75; overené v prehliadači); (4) 12 stránok v `src/app/dashboard/**` s `await params`; (5) typové opravy v 13 súboroch (`ease: "easeOut" as const`, `RefObject<T \| null>`, `useRef(undefined)`); (6) opravy 11 testových súborov: po samotnej zmene knižníc padalo 65 testov (stránky sú `async`; React 19 volá komponenty s iným druhým argumentom; jsdom nemá `MessageChannel`; `jest.getTimerCount()` počíta aj interné mikroúlohy Reactu; tri testy záviseli od poradia dobehnutia efektov). Aplikačný kód sa kvôli testom nemenil, deväť súborov funguje na starej aj novej verzii a išlo do samostatného commitu. Overené z čistej inštalácie (`npm ci`): `tsc` bez chýb (po samotnej zmene knižníc 26), celý Jest 518 sád a 8 002 testov, `npm run build` prejde, mutačné kontroly všetkých opráv (nový aj pôvodný test padá rovnako), 94 testov z Codexových špecov v Chromiu (rozmery iPhonu aj desktop) proti lokálnemu backendu: 63 prešlo, 8 padlo a 23 preskočených (pred aktualizáciou 64, 7 a 23); šesť pádov je rovnakých ako pred aktualizáciou a nesúvisí s ňou (2× časový limit pri prihlásení, 2× chýbajúce testovacie dáta v kópii, 2× zámerný test nálezu 224) a dva sú časovo citlivý test fotiek, ktorý padal na kontrole pred odoslaním (okno nebolo na spodku ešte pred odoslaním; padal raz aj v behu pred aktualizáciou; v štyroch čistých kolách prešiel 12 z 12), 15 stránok bez nových chýb konzoly, hlavičky odpovedí (CSP, `Cache-Control: no-store`) rovnaké a obrázky cez `next/image` sa načítajú (optimalizáciu odteraz robí `sharp`). WebKit/iPhone a Railway sa lokálne neskúšali: čaká plný beh Playwrightu po nasadení a test majiteľa na iPhone. Nová minimálna podpora prehliadačov (overené v balíkoch Next): Safari 16.4 (iOS 16.4, 03/2023) a Chrome, Edge a Firefox 111; Next 14 mal Safari 12 a Chrome 64, preto iPhony s iOS 15 a starším aplikáciu prestanú správne zobrazovať (majiteľ plán odsúhlasil 31. 10. 2026). Stránka `/reset-password/…` sa vykresľuje na požiadanie (v Next 14 bola predgenerovaná; pre používateľa rovnaké, overené bez chýb). Dopad na E2E: žiadna zmena E2E súborov; po nasadení plný beh Playwrightu na všetkých troch projektoch a porovnanie s posledným behom (427 prešlo, 2 padli, 303 preskočených). |
| 188 | HOTOVÉ: test „rejects expired records and future timestamps“ v `searchScrollMemory.test.ts` zafixuje hodiny pred zápisom záznamu, takže už nepadá náhodne. Starý variant: 16 pádov zo 4 000 bez záťaže a približne 104 zo 4 000 pod záťažou, nový 0 z 12 000. Mutácie expirácie a odmietania budúcich časov test stále zabijú. |
| 190 | HOTOVÉ: scenár „review: a restored profile-return snapshot follows user scrolling…“ v `search-country-scroll.spec.ts` sa v mobilnom WebKite preskočí (`test.skip(isMobile, …)` s vysvetlením), lebo Playwright v ňom koliesko myši nepozná („Mouse wheel is not supported in mobile WebKit“). Skutočný ťah prstom sa v Playwrighte nedá nahradiť rovnako verne a priamy zápis `scrollTop` by scenár o skutočnom vstupe zmenil na iný. Rovnaký scenár beží ďalej v desktopových projektoch (webkit-desktop, chromium-desktop); mobilná vetva odchodu cez tlačidlo Späť, ktorá je po preskočení nedosiahnuteľná, sa odstránila. Overené v Chromiu proti lokálnej kópii: v rozmeroch iPhonu sa test preskočí, v desktope prechádza. Súčasť opravy 210. |
| 197 | HOTOVÉ (overené používateľom na iPhone 28. 10.): nahrávanie fotiek z iPhonu (iOS 27.0.1, podľa hlásení aj Safari 26.5.x) prišlo cez `/api` na server s prázdnym telom, takže správa skončila hláškou „Neplatné údaje“ a zmena avatara všeobecnou chybou. Príčina je chyba WebKitu: `File` z `<input type="file">` sa cez XHR/fetch pošle s `Content-Length: 0` (hlásia ju aj iné projekty; oprava je v WebKite zlúčená, vydanie nie je známe). Appka teraz pred odoslaním kopíruje súbory z `FormData` do pamäte (`lib/materializeUploadFiles.ts`, jeden axios interceptor v `lib/api.ts`) a pri zlyhaní čítania pošle pôvodný súbor. Backend rozpoznáva prázdny multipart zdieľanou strážou `swaply/empty_upload.py` (správy: kód `empty_message_upload`, avatar: `empty_avatar_upload`) a zapíše ho do logu s user-agentom. Priame nahrávanie na S3 (príspevky, ponuky, portfólio) sa nemenilo, z iPhonu funguje. Overené Jestom, pytestom a mutačnými kontrolami a v Chromiu so simuláciou chyby. |
| 198 | HOTOVÉ: pri 400 na odoslanie správy appka ukazovala všeobecné „Neplatné údaje“, aj keď backend poslal dôvod pri fotke (príliš veľká, zlý formát, zlyhaná kontrola obsahu); `getMessagingErrorMessage` teraz ukáže dôvod z `validation_errors.image`. Fotka, ktorá na server nedorazila, má vlastné preložené hlášky (`messages.uploadEmpty`, `profile.photoUploadEmpty`) vo všetkých šiestich jazykoch a pri avatare sa namiesto doslovného textu v kóde používa existujúci preklad `profile.photoUploadError`. |
| 199 | HOTOVÉ (overené používateľom na iPhone 28. 10.): mobilný prehliadač fotky na Nástenke dostával od karty zastaraný príspevok bez adries fotiek (fotky, ktoré sa po vytvorení príspevku ešte spracúvali, dosleduje polling len v stave karty), takže sa `ImageLightbox` hneď po otvorení zavrel a ťuk na hotovú fotku „nič neurobil“, kým sa feed nenačítal znova. Prehliadač teraz dostane príspevok s živými fotkami karty (`feed/useViewerPost.ts`); polling sa nereštartuje a objekt sa mení len pri zmene príspevku alebo fotiek. Overené Jestom (dva regresné testy zlyhajú, keď sa zapojenie vráti) a v Chromiu s rozmermi iPhonu na produkčnom builde. |
| 200 | HOTOVÉ (overené používateľom na iPhone 28. 10.): podpora HEIC (`pillow-heif`) sa registruje pri štarte aplikácie (`swaply/heif_support.py`, volané z `AccountsConfig.ready()`), takže HEIC z iPhonu prejde validáciou `ImageField` v DRF už od prvej požiadavky v každom procese; predtým len v procese, ktorý už predtým spracoval iný obrázok. Chýbajúca knižnica štart nezhodí, zapíše varovanie. Overené: test v čerstvom procese (pred opravou zlyhal s „Uploadujte prosím obrázok…“, po oprave prejde) a odoslanie HEIC správy cez HTTP v čerstvom procese (pred opravou 400 „Neplatné údaje“, po oprave 201 aj s miniatúrou). Päť lenivých registrácií v moduloch spracovania obrázkov sa nemenilo (nález 205). |
| 201 | HOTOVÉ (overené používateľom na iPhone 28. 10.): výber fotky avatara cez „Zmeniť fotku“ (profil aj mobilná úprava profilu) a v desktopovom formulári úpravy profilu používal `document.createElement('input')`, ktorý sa nikdy nepripojil do DOM; WebKit na iOS takýto element po zatvorení modalu môže odpratať a `change` sa nespustí, takže sa po výbere fotky nestalo nič (ani chyba). Nový pomocník `lib/pickImageFile.ts` drží skrytý vstup v `document.body` až do výberu alebo zrušenia a používa ho modal aj formulár. Overené Jestom (tri mutácie testy zabijú: odpojený vstup v modale aj vo formulári a pomocník bez pripojenia do DOM). Príčinu na iPhone som pri oprave nemohol reprodukovať (chýba WebKit); manuálny test používateľa na iPhone po nasadení prešiel. |
| 202 | HOTOVÉ: E2E testy po približne 15 minútach strácali prihlásenie. `global-setup.ts` sa prihlási raz, prihlásenie platí 15 minút a jeho obnova je jednorazová (rotácia refresh tokenu), takže ju spravil len prvý test a ostatné ostali so zablokovaným tokenom. Backend navyše dovolí len 10 obnovení za minútu z jednej adresy, čo pád po vypršaní ešte zhoršilo. Nový strážca prihlásenia (`e2e/support/sessionKeeper.ts`, obnova v `e2e/support/refreshStorageState.ts`, zapojenie v `global-setup.ts`) počas behu každých 5 minút (voliteľne `E2E_SESSION_KEEPER_SECONDS`) obnoví prihlásenie rovnako ako appka (`POST /api/token/refresh/` s CSRF hlavičkou a pôvodom požiadavky) a atomicky prepíše súbor s prihlásením, takže každý nový test štartuje s čerstvým; ak zápis po úspešnej obnove zlyhá, nový stav ostane v pamäti a zapíše sa pri ďalšom pokuse (obnova je jednorazová, zo zastaraného súboru by už neprešla); na konci behu počká na rozbehnutú obnovu. Zmena sa týka len testov. Overené Jestom (19 testov, 14 skúšobných poškodení zabitých, testy strážcu nespoliehajú na presné načasovanie a 12 behov pri plne vyťaženom procesore prešlo; tri testy proti zástupnému serveru, ktorý kontroluje CSRF a pôvod, bežia len na Node 20 a novšom; v CI sa na Node 18 preskakovali, od vetvy 150 (nález 208) beží CI na Node 22 a bežia aj tam) a v Chromiu proti lokálnej kópii s prihlásením platným 90 s: bez strážcu padol test hneď po vypršaní (test 7 po 113 s), so strážcom prešlo všetkých 10 testov za 3 minúty (súbor s prihlásením mal pri štarte testov najviac 27 s). Celý beh na Railway a vo WebKite sa tu overiť nedal; zvyšných približne 21 pádov z iných príčin (napr. 189, 190) táto oprava nerieši. |
| 203 | HOTOVÉ: v `messages/{cs,de,hu,pl}.json` mali texty o fotkách v časti Správy namiesto písmen s diakritikou znak `?` (23 hodnôt: cs 6, de 4, hu 7, pl 6; pôvodný zápis uvádzal 20, lebo dvojité `??` v „p??lohu“, „Do??cz“ a „za??cznik“ vzor písmeno–`?`–písmeno nezachytil). Zistené pri manuálnom teste na iPhone s českým rozhraním: pri fotke nad 5 MB sa ukázalo „Obr?zek je p??li? velk?“. Poškodenie je v súboroch od prvého importu repozitára, nie je to nová regresia a mimo týchto štyroch súborov sa v repozitári nenašlo. Texty sú doplnené a test `translationsDiacritics.test.ts` zakazuje `?` v slove, posledné písmeno slova nahradené `?` pred bodkou alebo čiarkou (doplnené po kontrole CodeRabbit na PR #205) a náhradný znak U+FFFD vo všetkých šiestich jazykoch. Pred opravou zlyhal na týchto 23 hodnotách, skúšobné poškodenia zabije a bežné otázky (aj „zmazať?...“) nepovažuje za chybu. Overené aj v Chromiu na produkčnom builde: toast pri fotke nad 5 MB aj pri zlom type súboru je vo všetkých šiestich jazykoch správny. |
| 208 | HOTOVÉ (overené používateľom na Railway 28. 10.): CI (`.github/workflows/deploy.yml`) beží na Node 22 LTS namiesto Node 18, ktorý skončil podporu v apríli 2025 (Node 20 ju skončil 30. 4. 2026, Node 22 ju má do 30. 4. 2027). `frontend/package.json` má `engines.node` `22.x` (zapísané aj v `package-lock.json`), takže je verzia Node zafixovaná na jednom mieste (predtým nikde). Railway ju pri builde prečíta: Nixpacks aj Railpack čítajú `engines.node`; bez nej má Nixpacks predvolene Node 18 a Railpack najnovší LTS, premenná `NIXPACKS_NODE_VERSION` alebo `RAILPACK_NODE_VERSION` v nastaveniach služby by `engines` prebila. Playwright 1.63 vyžaduje Node 20 alebo novší a `next` 16 (nález 184) Node 20.9 alebo novší. Tri testy strážcu prihlásenia proti zástupnému serveru v `E2eSessionKeeper.test.ts`, ktoré sa na Node 18 preskakovali, bežia teraz aj v CI. Overené na Node 22 podľa krokov workflow: čistá inštalácia (`npm ci`) bez varovaní o nepodporovanej verzii, celý Jest (513 sád, 7 901 testov, žiadny preskočený) a `npm run build` (prešiel aj s kontrolou typov). Po zlúčení (PR #207) používateľ overil, že Railway beží na Node 22. Akú verziu Node Railway používalo predtým, sa nedalo zistiť (v repozitári nebolo nič zafixované). Úprava workflow pre nálezy 194 a 196 sa nerobila. |
| 210 | HOTOVÉ: oprava 27 zastaraných alebo chybných E2E testov z druhého celého behu na Railway 28. 10. (395 prešlo, 35 padlo, 302 preskočených; Docker, 2 workery, 29,4 min). Príčiny a opravy: (1) `search-diagnostics.spec.ts` (9 pádov) a `search-cache-revalidation.spec.ts` (2) čakali správanie spred OW-20 (opakované hľadanie bez HTTP, diagnostika po znovuotvorení panela), čo je register TEST-17; testy teraz zachytia skutočnú odpoveď na opakovanie a diagnostiku po znovuotvorení panela nečakajú; (2) `notifications-infinite-scroll.spec.ts` (2) hľadal tlačidlo „Zobraziť ďalšie“ v celej stránke, no na desktope ho má aj Nástenka pod panelom upozornení, lokátor sa zúžil na zoznam upozornení; (3) `google-login-completion.spec.ts` (10, len WebKit) podvrhuje odpoveď `/me` cez `context.route`, ktorý podľa Playwrightu nezaručuje zachytenie požiadaviek vybavených service workerom: spec blokuje worker a Jest poistka `E2eServiceWorker.guard.test.ts` to vyžaduje aj pri `context.route`; (4) `search-panel-return.spec.ts` (1): rozpočet obnovy pozície 1,5 s bol tesný (namerané 1 508 a 1 662 ms vo WebKite na desktope), je 3 s a stále je kratší než šesťsekundový časovač obnovy; (5) `search-country-scroll.spec.ts` (1, nález 190): scenár s kolieskom myši sa v mobilnom WebKite preskočí; (6) `search-mobile-cards.spec.ts` (2, webkit-mobile): test hľadal náhradný text „Otváracie hodiny“, no v slovenčine sa zobrazí „Otváracia doba“ (nález 211). Overené v Chromiu (rozmery počítača aj iPhonu) proti lokálnej kópii na produkčnom builde: zlyhanie sa podarilo reprodukovať pri (1), (2) a (6) a po úprave tieto testy prechádzajú; (3), (4) a (5) sa v Chromiu reprodukovať nedali (správanie WebKitu a časovanie Railway), preto je tam overené len to, že upravené testy prechádzajú alebo sa preskočia. Spolu 146 testov dotknutých špecov: 90 prešlo, 56 sa preskočilo (testy pre iný typ obrazovky, chýbajúce ponuky „Hľadám“ v lokálnej kópii, scenár z nálezu 190), žiadny nepadol; Jest poistka 21/21 a mutačná kontrola (bez bloku v `google-login-completion.spec.ts` poistka zlyhá). Účinok opráv (3) a (4) vo WebKite potvrdí až ďalší celý beh na Railway. Neopravené: sedem testov čaká na testovacie údaje na Railway (nález 209) a jeden jednorazový pád (`search-country-scroll.spec.ts:74`, tmavý variant, ponuky, webkit-mobile: odpoveď hľadania neprišla do 15 s) sa nedal vysvetliť ani reprodukovať, preto sa neopravuje; ak sa zopakuje, treba ho vyšetriť. |
| 212 | HOTOVÉ (zlúčené v PR #216; PostgreSQL 17 v CI potvrdené): CI testovalo backend len na SQLite, no produkcia beží na PostgreSQL 17 (Railway). Osem testov so zámkami riadkov (`select_for_update`: limit ponúk 1, značky príspevkov 2, blokovanie žiadostí 1, blokovanie v správach 4) sa na SQLite preskakuje, takže v CI nebežali nikdy. Oprava: do `.github/workflows/deploy.yml` pribudol druhý job `backend-postgres` so službou `postgres:17` (celá sada `pytest --no-cov` s `DATABASE_URL`, limit 30 min); beží súbežne s jobom `checks` (ten trvá po zrýchlení 5 min 19 s), takže by sa čas CI nemal predĺžiť. SQLite beh ostáva (pokrýva záložnú cestu bez `DATABASE_URL`). Po zrýchlení testov z nálezu 220 trvá sada na PostgreSQL lokálne 3 až 4 minúty (3 min 9 s pri vetve 154, 4 min 19 s pri vetve 157, kde súbežne bežal aj celý Jest). Overené: YAML sa načíta a obsahuje oba joby; presný strom vetvy 157 prešiel lokálne na PostgreSQL 16 (CI používa 17): 1 995 prešlo a 2 preskočené za 4 min 19 s. GitHub runner a PostgreSQL 17 sa lokálne overiť nedali; overenie priniesol prvý beh na GitHube: job `backend-postgres` prešiel v PR (2 min 46 s, z toho testy 2 min 9 s) aj na `main` po zlúčení (3 min 24 s), súbežne s jobom `checks` (v PR 6 min 13 s). |
| 217 | HOTOVÉ (účinok vo WebKite potvrdí až ďalší celý beh na Railway): štyri jednorazové pády záverečných behov E2E 29. 10. 2026 (tri samostatné behy aj spoločný beh dali 427 prešlo, 2 padli, 303 preskočených; každý pád prešiel pri samostatnom opakovaní): (1) `search-panel-return.spec.ts:111`, ponuky, webkit-mobile: po ťuknutí na autora ostala adresa `/search` (`toHaveURL` 10 s, `support/search-panel-return.ts:103`); (2) ten istý špec, ľudia, webkit-desktop: `page.waitForResponse` na `/api/auth/search/global/` nedostal odpoveď do 15 s (`:71`); (3) `search-to-offer-watches.spec.ts:88`, tmavý variant, webkit-desktop: po kliknutí na Vyhľadávanie sa nezobrazilo vyhľadávacie pole (`:97`); (4) `search-country-scroll.spec.ts:74`, tmavý variant, všetko, Chromium: obnovená pozícia sa líšila o 14 px oproti toleranci 2 px (`support/search-country-scroll.ts:106`). Príčina (4) je nájdená a reprodukovaná: stránka `/search` posiela hľadanie pri prvom načítaní dvakrát, pred a po `/api/auth/me/` (nález 216), a druhé hľadanie na chvíľu nahradí sekciu „Ľudia“ kostrou vyššou o 14 px. Test zmeral `scrollTop` v tomto medzistave a Chromium ho po skončení načítania posunul o 14 px späť (scroll anchoring), takže uložená pozícia už nezodpovedala meraniu; aplikácia obnovuje správne. S pôvodnými pomocníkmi z `origin/main` a oneskorením `/me` a druhého hľadania zlyhalo 9 z 10 kombinácií rovnakou hláškou (rozmery počítača aj iPhonu), s novými 0 z 10. Príčina (3): panel s vyhľadávacím poľom sa pripojí až po odpovedi `/api/auth/me/`, no test klikol hneď po zobrazení nadpisu (`toHaveCount(0)` prešlo len preto, že panel ešte neexistoval). Pri `/me` do 6 s sa panel po skorom kliknutí otvoril, rovnaké zlyhanie vznikne až pri `/me` pomalšom než 10 s, takže na Railway išlo o pomalý alebo neúspešný `/me`. Príčiny (1) a (2) sa lokálne reprodukovať nedali (WebKit, Railway). Oprava (len testy, aplikácia sa nemenila): `e2e/support/search-settled.ts` (`waitForSearchSettled`: čaká na pripojený panel, koniec oboch hľadaní a nemennú výšku výsledkov) sa volá v `openScrollableResults`, `openReturnFixture` a v teste panela; `openDeepResultAuthor` navyše overí, že pozícia uložená pri odchode zodpovedá zmeranej (poistka, ktorú mal už `openLastAuthor`). Asercie a tolerancie sú nezmenené. Pozorovateľ požiadaviek `e2e/support/page-activity.ts` (a čisté pomôcky `page-activity-format.ts`) pri páde špecov `search-country-scroll`, `search-panel-return` a `search-to-offer-watches` vypíše a pripojí blok dôkazov bez osobných údajov: požiadavky s časmi a stavmi, čas načítania dokumentu, stav panela, aktívny prvok, počty chýb; cesty bez slugov, parametre bez hodnôt, žiadne telá odpovedí, texty z konzoly ani texty chýb stránky (z chyby sa vypíše len druh, napr. `TypeError`; zlyhanie siete len ako druh a aktívny prvok len z pevných zoznamov). Pád (1) alebo (2) sa tak pri ďalšom výskyte vysvetlí sám (uvidí sa, či po ťuknutí vznikla požiadavka na profil a ako dlho trvala, a ako dlho trvalo načítanie stránky). Overené: celý Jest (514 sád, 7 932 testov, z toho nový `E2ePageActivity.test.ts` s 31 testami), `tsc` a `eslint` čisté; v Chromiu proti lokálnej kópii (rozmery počítača aj iPhonu) prešlo všetkých 39 testov troch špecov (13 sa preskočilo podľa návrhu); tie isté špecy šesťkrát za sebou pri 4-násobne spomalenom procesore prehliadača: 234 prešlo, 0 padlo, 78 preskočených (20 min). Poistka súkromia: desať zámerne vnesených chýb v pomôckach (napr. výpis surového textu zlyhania alebo surovej hodnoty atribútu) testy odhalili všetkých desať; blok dôkazov sa skúšal aj v skutočnom Chromiu na stránke so slugom a e-mailom v adrese a atribútoch, tokenom v ceste a zlyhaniami siete a nič z toho sa nevypísalo. WebKit a Railway sa tu overiť nedali; to ukáže ďalší celý beh. |
| 218 | HOTOVÉ (účinok na iPhone a na Railway potvrdí manuálny test): po odoslaní fotky v správach ostalo okno na mieste a fotka bola schovaná pod ním a bolo ju treba nájsť ďalším posúvaním (PC aj mobil; našiel to používateľ manuálnym testom po nasadení vetvy 152, 29. 10. 2026). Príčina: po odoslaní `refresh({ scrollBehavior: 'force_latest' })` posunie okno na spodok jedenkrát, hneď po zobrazení nového riadku (`useConversationThreadController.ts`). `<img>` v riadku (`ConversationMessageRow.tsx`) má `loading="lazy"` a nemá rozmery, takže nemá výšku, kým sa nenačíta; po načítaní obsah vyrastie o jej výšku (najviac 352 px, `max-h-[22rem]`) pod okno a nič ho už neposunie. Pri otvorení konverzácie to rieši `useInitialBottomPin` (sleduje zmenu výšky a načítanie obrázkov až 8 s), po odoslaní nič. Zreprodukované v Chromiu proti lokálnej kópii (produkčný build, odoslanie fotky 1 200 × 1 500 px s oneskorením obrázka 0, 600 a 1 500 ms, rozmery počítača aj iPhonu): bez opravy 6 z 6 pádov, okno 316 px nad spodkom a z 352 px vysokej fotky schovaných 291 px (PC) a 299 px (iPhone). Oprava: nový hook `useStickToBottomOnGrowth.ts` sleduje obsah okna správ a ak bolo okno pred zväčšením na spodku (najviac 80 px nad ním), po zväčšení ho posunie znova na spodok; ak používateľ odišiel vyššie, nehýbe sa. Posúva len pri raste výšky obsahu, nie pri zmenšení ani pri zmene šírky bez zmeny výšky. Poloha sa zisťuje pri každom posune (aj programovom), nie porovnaním s výškou spred zmeny: kontrola Codexu (PR #211) upozornila, že pri načítaní starších správ aplikácia vráti čitateľa na jeho miesto a pôvodné porovnanie by ho mohlo hodiť na spodok. V Jeste sa to s pôvodnou logikou zreprodukovalo (poradie „vrátenie polohy, potom oznam o zmene rozloženia“), v Chromiu nie (8 pokusov na počítači aj na mobile; poradie závisí od časovania prehliadača), preto je oprava obranná a pokrytá testom. Zapojený je jedným volaním v `ConversationMessagesPane.tsx`; `useConversationThreadController.ts` (505 riadkov) a `ConversationDetail.tsx` (556) sa nemenia, lebo sú nad limitom 500 riadkov (TECH-01…11). Hook nerozlišuje odoslanú a prijatú fotku: platí pre každé zväčšenie obsahu, keď je okno pri spodku (napr. aj fotka od druhého používateľa alebo štítok „Videné“); to sa v prehliadači neskúšalo. Overené: 18 nových testov Jest (15 testov hooku a 3 integračné cez `ConversationDetail`: odoslanie fotky, odscrollovanie pred načítaním fotky a načítanie starších správ), šestnásť zámerne vnesených chýb v hooku a zapojení testy odhalili všetkých šestnásť (aj návrat k pôvodnej logike a posúvanie pri zmenšení obsahu); celý Jest 516 sád a 7 950 testov, `tsc` a `eslint` čisté. V Chromiu s opravou prešlo 6 z 6 pri odoslaní fotky (okno na spodku, fotka celá) a 8 z 8 pokusov pri načítaní starších správ, na počítači aj na mobile. WebKit (iPhone) a Railway sa tu overiť nedali. Playwright test sa nepridal: odoslanie fotky vytvára správu a súbor na Railway aj S3, čo je presne ten druh testu, ktorý má obsah po sebe upratať (rozhodnutie majiteľa). |
| 220 | HOTOVÉ (v CI potvrdené po zlúčení PR #214): po povýšení na Django 5.2 by sa backendové testy predĺžili, lebo Django 5.2 hashuje heslá algoritmom PBKDF2 s 1 000 000 iteráciami (Django 4.2: 600 000) a sada hashuje pri každom vytvorení používateľa. Zmerané na SQLite: Django 4.2.30 13 min (29. 10.), Django 5.2.18 19 min (29. 10.), Django 5.2.18 s rýchlym hasherom 2 min 7 s (30. 10.) pri rovnakom výsledku (1 983 prešlo, 10 preskočených). `pytest.ini` používa `swaply.settings`, takže rýchly hasher MD5 zo súboru `swaply/test_settings.py` nikdy nepomáhal (súbor sa nikde nepoužíva, pozri nález 221). Oprava: nový `backend/conftest.py` nastaví na celú reláciu testov MD5 pre nové heslá a PBKDF2 nechá na overenie hashov pripravených vopred; produkčné nastavenia sa nemenia. Fixture je na úrovni relácie, aby pokryla aj používateľov vytváraných v `setUpTestData` (oproti fixture na úrovni testu je rozdiel v rámci chyby merania: 2 min 7 s a 2 min 11 s). Poistka: `tests/test_password_hasher_in_tests.py` (nové heslo je md5, PBKDF2 hash sa stále overí); tri zámerné chyby (odstránený `conftest.py`, zoznam bez PBKDF2, PBKDF2 na prvom mieste) ju vždy zhodili. Konečný strom vetvy: SQLite 1 987 prešlo a 10 preskočených za 2 min 8 s, PostgreSQL 16 1 995 prešlo a 2 preskočené za 3 min 9 s. Skutočný čas v CI (GitHub, krok „Run backend tests“ na SQLite): 11 min 30 s na Djangu 4.2.30 (beh po zlúčení PR #213, `main` `9bf1142d`) a 1 min 40 s na Djangu 5.2.18 s rýchlym hasherom (beh po zlúčení PR #214, `main` `e3ed0f42`); celý job `checks` 15 min 52 s → 5 min 19 s. |
| 222 | HOTOVÉ (zlúčené v PR #215; overené Codexom na Railway): číselná adresa vlastného profilu `/dashboard/users/<id>/language` stratila jazykovú podstránku a skončila na základnom profile bez jazykovej hlavičky (hlásenie Codexa z 30. 10. 2026, `main` `e3ed0f42`, webkit-mobile, svetlý aj tmavý režim, 6 z 6 pokusov, špec `profile-numeric-language.spec.ts`). Príčina v `useDashboardUserProfile.tsx`: (1) počiatočná pravá položka (jazyk, účet, súkromie, úprava) sa otvárala len pri zhode slugu v adrese, takže pri číselnom ID sa nikdy neotvorila; (2) kanonizácia ID → slug prepísala adresu na holý profil a podstránku zahodila (rovnako `/account`, `/privacy` a `/edit`). Oprava: nový súbor `ownProfileAddress.ts` (`isOwnProfileIdentifier` pozná vlastný profil podľa slugu aj číselného ID, `canonicalOwnProfilePath` ponechá podstránku pri výmene ID za slug, ale len pri identifikátore, ktorý patrí tomuto používateľovi); v hooku sa menia štyri miesta (súbor má 491 riadkov, pod limitom 500). Kód je na Codexovej vetve `e2e/profilove-adresy` na pokyn majiteľa (AGENTS.md inak zakazuje zápis do vetvy druhého agenta). Overené: 23 nových testov Jest (8 cez hook, 15 na pomocníka; na pôvodnom hooku z `main` 5 z 8 testov hooku padá), deväť zámerne vnesených chýb všetky zachytené, `tsc` a `eslint` čisté, celý Jest na čistej kópii vetvy 518 sád a 7 973 testov prešlo; v Chromiu s rozmermi iPhonu proti lokálnej kópii špec Codexa pred opravou zlyhal v oboch režimoch (rovnaký obraz ako v hlásení: adresa na základnom profile, bez jazykovej hlavičky), po oprave prešli oba testy (2 z 2, vrátane F5). Do tej istej vetvy pribudol pred zlúčením ešte commit `de91273f`: pomocník porovnáva číselné ID ako číslo, takže prejde aj adresa s úvodnými nulami (`/dashboard/users/007/language`), a testy pribudli pre vlastné ID `007` a `0007` a cudzie `099` a `00099`. Testy hooku a pomocníka (4 súbory, 65 testov) prechádzajú aj na stave `main` `bd9131e6`. Moje lokálne overenie nemalo WebKit ani Railway; Codex ich doplnil v celom behu 30. 10. na reálnom WebKite proti Railway (`main` `e2612438`): oba mobilné varianty `profile-numeric-language.spec.ts` (svetlý aj tmavý) vrátane F5 a oba varianty profilového návratu (app Back aj browser Back) prešli; varianty s úvodnými nulami, s query a fragmentom ani voliteľné `/account`, `/privacy` a `/edit` s číselným ID sa v reálnom prehliadači osobitne neskúšali. Súvisiace, nehlásené a preto nezmenené: pri starom slugu v adrese (`/dashboard/users/<starý-slug>/language`) kanonizácia podstránku stále zahodí. |

## 8. Zatvorené a informačné (bez akcie)

**Zatvorené rozhodnutím (4):**

| Č. | O čom |
| --- | --- |
| 1 | Zoznam trás cieľov notifikácií pozná menej trás než cesta modulov (ROZHODNUTÉ: nechať tak). |
| 2 | Prázdny `?offer=` zablokuje platné `?highlight=` (ROZHODNUTÉ: nechať tak). |
| 67 | Testovací balík J15/J17/J18 (diery v charakterizačných testoch) – uzavreté hook testami. |
| 131 | ZATVORENÉ: reset scrollu pri novom vstupe v pasívnom efekte – možný záblesk starej pozície sa nepodarilo reprodukovať. |

**Informačné / ponaučenia / účtovanie mutantov (20):**

| Č. | O čom |
| --- | --- |
| 25 | Vlastný profil `/dashboard/profile` sa na slug mení iným mechanizmom (len informácia). |
| 59 | Pozorovanie: `loadSkills` má 2 s cooldown a ticho prehĺta chyby. |
| 60 | Pozorovania z 193 mutantov kroku 4 (4 skutočné diery v testoch uzavreté). |
| 63 | Pozorovanie: parsery cieľov notifikácií sa nezhodnú pri nezvyčajných tvaroch URL. |
| 66 | Pomenovanie: dve rôzne veci sa v `DashboardContent` volajú `isMobileMenuOpen`. |
| 68 | Informácia: účtovanie 183 mutantov kroku 5. |
| 72 | Informácia: Test 14 PASS; starší problém cudzieho profilu nepatrí do kroku 5. |
| 80 | Informácia: účtovanie 402 mutantov kroku 6. |
| 84 | Informácia: účtovanie 171 mutantov kroku 7. |
| 90 | Informácia: účtovanie 248 mutantov kroku 8. |
| 98 | Informácia: účtovanie 617 mutantov kroku 9. |
| 127 | Kozmetika vetvy 124 a účtovanie 72 mutantov (`useProfileFreshEntry` robí dve veci…). |
| 130 | Platformová poznámka: Win/Meta + klik je na Windows/Linuxe navigácia v tej istej karte. |
| 139 | Architektonická poznámka k 128: `ModuleRouter` renderuje modul bez `key` zámerne. |
| 140 | Medzera E2E: prepnutie cudzí → cudzí profil sa na produkcii nedá otestovať (jediný peer účet). |
| 144 | Poznámka k nástrojom: prvý test v sandboxe WebKit môže mať nemaľujúcu stránku; metrika = trvanie. |
| 146 | Poučenie o testoch: aktualizácie stavu mimo `act` sa neprejavia – čakať na nový stav. |
| 150 | Poučenie: `rerender(rovnaký element)` v RTL nevykreslí znova. |
| 151 | Poznámka: lokálny sandbox nespustí niektoré E2E (`profile-entry-scroll`, `portfolio-detail-back`, mobilný `dashboard-history-navigation`). |
| 158 | Poznámky k nástrojom (sampler stmievača, screenshoty skresľujú čas, `-g` je regex, AnimatePresence bez výstupu). |

## 9. Register: čo je zatvorené a čo čaká na živé overenie

Register `docs/testing/findings-register.md` má 68 ID. Otvorené sú v častiach 4 a 5 (19 pred nasadením, 20 po nasadení). Zvyšok:

**Zlúčené do `main`, no register ešte vedie nasadený (živý) retest (7) – úloha N16:**

| ID | Kde je zlúčené |
| --- | --- |
| OW-16 | PR #178 |
| OW-18 | PR #179 + #183 |
| OW-19 | PR #183 |
| OW-20 | PR #186 |
| OW-23 | PR #185 |
| TEST-01 | k OW-02 (PR #168) |
| TEST-02 | k OW-10 (PR #172) |

**Zatvorené (20):**

| ID | Stav |
| --- | --- |
| OW-01 | PR #168; manuálne testy OK podľa používateľa (13. 10.) |
| OW-02 | PR #168; manuálne testy OK |
| OW-03 | PR #175; manuálne a review uzavreté (15. 10.) |
| OW-04 | PR #174; manuálne PASS |
| OW-10 | PR #172; manuálne a review uzavreté (14. 10.) |
| OW-12 | PR #172; manuálne a review uzavreté |
| OW-13 | PR #172; manuálne a review uzavreté |
| OW-15 | PR #175; manuálne a review uzavreté (15. 10.) |
| OW-21 | PR #184; potvrdené používateľom (18. 10.) |
| OW-22 | PR #184; potvrdené používateľom |
| OW-24 | PR #184; potvrdené používateľom |
| TEST-05 | opravené, celé CI zelené |
| TEST-07 | opravené a overené (nebola to chyba produktu) |
| TEST-10 | opravené v review kole (hlboký scroll) |
| TEST-11 | opravené v review kole |
| TEST-17 | opravené na vetve 151 (nález 210): diagnostický E2E podľa kontraktu OW-20, opakované hľadanie ide cez sieť |
| DOC-01 | opravené v review kole |
| DOC-02 | opravené v review kole |
| DOC-03 | opravené v review kole |
| REG-01 | historická chyba opravená, nie je otvorená; držať ako regresiu pri zásahu do formulára |

**Pokryté číslovaným nálezom (2):**

| ID | Kde |
| --- | --- |
| APP-01 | rovnaké ako nález 120 (otvorené) |
| APP-02 | 5 hodnôt opravených; zvyšok je súčasťou nálezu 176 |

Zlúčené PR podľa histórie `main`: #168 (OW-01, OW-02), #172 (OW-10, OW-12, OW-13), #174 (OW-04), #175 (OW-03, OW-15), #178 (OW-16), #179 (diagnostika OW-18), #183 (OW-18, OW-19), #184 (OW-21, OW-22, OW-24), #185 (OW-23), #186 (OW-20), #193 (opisy a výsledky vyhľadávania). PR #195 je oprava dekódovania databázovej adresy (dôležité pri novom serveri, N5 / N6).

## 10. Ako sa dokument udržiava

Tento dokument je jediný hlavný zoznam nálezov. Postup pri udržiavaní:

- **Po každom novom nálezi alebo oprave** sa dokument aktualizuje v tej istej vetve, v ktorej sa zmena robí: nález = nový riadok, oprava = presun do časti 7. Zoznam tak vždy zodpovedá kódu na vetve.
- **Čísla:** nový nález dostane ďalšie voľné číslo (231); čísla sa nikdy nemenia ani nepoužívajú znova. Úlohy na prípravu nasadenia majú vlastné číslovanie N1…, rozhodnutia R1….
- **Ako:** upraviť dáta (`polozky_nove.py`, `polozky_povodne.py`, `register.py`, `stav.py`), spustiť z koreňa repozitára `python docs/zoznam-nalezov/build.py` a pridať do commitu aj `ZOZNAM.md`. Skript overí úplnosť: čísla nálezov a ID z registra sú práve raz, súčty sedia, odkazy na rozhodnutia a balíky existujú a vlny v časti 2 nespomínajú hotové položky.
- **Oprava nálezu:** položku odstrániť z `ORIG_OPEN` / `NEW_ITEMS` a pridať do `stav.DONE_SINCE` (číslo vetvy, PR keď je známe, `zlucene=True` po zlúčení). Upraviť aj vlny `stav.PORADIE`, ak ju spomínali.
- **Rozhodnutie:** vyplniť `odpoved` a `datum` v `stav.DECISIONS`.
- **Vždy:** posunúť `stav.STAV` (dátum, stav kódu) a doplniť riadok do `stav.ZMENY`.
- **Kontrola:** `python docs/zoznam-nalezov/build.py --check` skončí chybou, ak sa `ZOZNAM.md` líši od dát.
- Podrobný denník položiek OW- / TEST- ostáva v `docs/testing/findings-register.md`; nové ID, ktoré tam pribudnú, treba zaradiť do `register.py`, inak skript zlyhá.

## 11. Zmeny v dokumente

| Dátum | Zmena |
| --- | --- |
| 31. 10. 2026 | Vetva 159 (čaká na zlúčenie): nález 184b – frontend sa povyšuje z Next 14.2.35 a Reactu 18.3.1 na Next 16.4.3 a React 19.3.1 (rozhodnutie R9, odpoveď majiteľa 31. 10. 2026). Štyri commity: (1) deväť testov upravených tak, aby fungovali na starej aj novej verzii (celý Jest na Next 14 prešiel: 518 sád a 8 002 testov), (2) závislosti a konfigurácia (`package.json` a lockfile, skripty `build` a `dev` s `--webpack`, `lint` ako `eslint .`, `eslint.config.mjs`, `tsconfig.json`, `images.qualities`), (3) `await params` v 12 stránkach, typové opravy v 13 súboroch a dva testy stránok, (4) dokumentácia. `npm audit --omit=dev` 7 → 5 (zmizla kritická zraniteľnosť `next` aj vysoká `postcss`). Nová minimálna podpora prehliadačov: Safari 16.4 (Next 14 mal Safari 12). Nález 184 je hotový (čaká na zlúčenie). Nové nálezy: 226 (mŕtvy `frontend/middleware.ts`), 227 (lint: vypnuté nové pravidlá, ESLint 9), 228 (testy `useGoogleLogin` nezachytia vynechané `clearTimeout(delayTimer)`), 229 (5 stredných zraniteľností v build nástroji Sentry), 230 (prechod na Turbopack). Doplnené: 183 (test majiteľa po nasadení vetvy 158 prešiel: obyčajná fotka prešla, nevhodná sa nepridala, obe so správnym hlásením) a 194 (zostávajúce výnimky). Zlúčené: vetva 158 (PR #217), `main` `0905aedd`. |
| 31. 10. 2026 | Vetva 158 (zlúčená v PR #217): časť 183c nálezu 183 – `google-cloud-vision` 3.4.5 → 3.16.0 (vyžaduje protobuf od 6.33.5, dnes 7.36.2), čím zmizlo hlásenie CVE-2026-0994; `pip-audit` projektových závislostí 4 → 2 záznamy (zostáva len vývojový `pytest`). Nový test `swaply/test/test_vision_client_contract.py` (6 testov) spúšťa skutočného klienta Google Vision proti falošnému gRPC serveru, lebo doterajšie testy používajú atrapu a produkcia je fail-closed. Overené: čerstvé prostredie, `pip check` čistý, celá backendová sada na SQLite (1 993 prešlo a 10 preskočených) aj PostgreSQL 16 (2 001 prešlo a 2 preskočené), päť zámerných chýb test zachytil, nahratie obrázka správy cez API proti falošnému serveru prešlo na starých aj nových knižniciach. Skutočné volanie serverov Google sa lokálne overiť nedá: čaká na test majiteľa po nasadení. Zo 183 zostal len `pytest`, preto sa nález presúva zo skupiny HNEĎ do skupiny PO NASADENÍ. Nové nálezy: 224 (mobilné Nastavenia: po F5 vedie Zatvoriť na Nástenku, nie na profil; nález majiteľa z iPhonu, odložený na čas po nasadení) a 225 (jazyk v emulovanom WebKite: dotyk bez kliku, na reálnom iPhone v poriadku). Doplnené nálezy 222 (Codex ho overil v reálnom WebKite) a 223 (nové dôkazy a výsledok kontroly logov Railway). Zlúčené: vetva 157 (PR #216) a E2E vetva `e2e/profilove-adresy` (PR #215), `main` `e2612438`. |
| 30. 10. 2026 | Vetva 157 (čaká na zlúčenie): nález 212 – CI beží backendovú sadu aj na PostgreSQL 17 (nový job `backend-postgres` súbežne s `checks`; osem testov so zámkami riadkov sa na SQLite preskakovalo a v CI nebežalo nikdy). Súčasne oprava nálezu 222 z Codexovej správy (číselná adresa vlastného profilu stratila podstránku `/language`; príčina: pravá položka sa otvárala len pri zhode slugu a kanonizácia ID → slug zahodila podstránku): na pokyn majiteľa je kód na Codexovej vetve `e2e/profilove-adresy` (zlúčená v PR #215), záznam v zozname je tu, aby sa dokumentácia nerozchádzala medzi dvoma vetvami. Nový otvorený nález 223 (občasné zlyhanie siete pri `GET /api/auth/me/` počas prípravy E2E; príčina nepreukázaná, nič sa neopravuje). Vetvy 154 (PR #214) a `e2e/profilove-adresy` (PR #215) sú zlúčené, `main` `bd9131e6`. |
| 30. 10. 2026 | Vetva 154 (čaká na zlúčenie): časť 183b nálezu 183 – backend sa povyšuje z Djanga 4.2.30 na 5.2.18 a z DRF 3.17.2 na 3.18.3 (v `backend/requirements.txt` sa menia dva riadky; DRF 3.18 vyžaduje Django 5.2, preto spolu). Pribudli dve poistky: test, že modely a migrácie sedia (`tests/test_migrations_up_to_date.py`; v CI ani v testoch sa to dosiaľ nekontrolovalo), a rýchly hasher hesiel len v testoch (`backend/conftest.py` s testom; nález 220: Django 5.2 hashuje heslá 1 000 000 iteráciami, takže by sa backendová sada predĺžila z 13 na 19 minút, s hasherom trvá 2). Od poslednej úpravy zoznamu sa zlúčili vetvy 155 (oprava posunu pri fotke, PR #211; Railway ju nasadil po dokončení behu Playwrightu), 156 (odovzdanie Playwrightu druhému agentovi, PR #212) a Codexova vetva `e2e/bezpecna-diagnostika` (PR #213, len E2E). Overené v čistom prostredí z reálnych súborov závislostí (Python 3.11): `pip check`, `manage.py check` a `makemigrations --check` čisté; celá backendová sada s pôvodným hasherom, teda ako v produkcii: SQLite 1 983 prešlo a 10 preskočených, PostgreSQL 16 1 991 prešlo a 2 preskočené; konečný strom vetvy (s novými testami a rýchlym hasherom): SQLite 1 987 prešlo a 10 preskočených za 2 min 8 s, PostgreSQL 16 1 995 prešlo a 2 preskočené; v produkčných nastaveniach (PostgreSQL, Redis, simulované S3) 38 z 38 kontrol, servery daphne a gunicorn s WebSocketom 15 z 15, Celery worker a beat 4 z 4, admin rovnako ako na Djangu 4.2 (67 stránok 200, tri zámerne zakázané formuláre „pridať“), hlavičky odpovedí a CORS rovnaké. `pip-audit` projektových závislostí: 22 → 4 záznamy (zostáva protobuf 4.25.9 a pytest 8.3.2); Twisted 26.10.0, ktoré medzitým vyšlo, berie čerstvá inštalácia sama (6 záznamov zmizlo). Nové nálezy: 220 (hotový v tejto vetve) a 221 (nepoužívaný `swaply/test_settings.py`). Nález 218 má už vetvu 155 zlúčenú (PR #211). |
| 29. 10. 2026 | Vetva 155 (čaká na zlúčenie): nález 218 – po odoslaní fotky v správach sa okno drží na spodku, kým sa fotka načíta (PC aj mobil; našiel ho používateľ manuálnym testom po nasadení vetvy 152). Príčina a overenie sú v zázname nálezu; oprava je nový hook `useStickToBottomOnGrowth` s jedným zapojením v `ConversationMessagesPane`. Vetva 153 je zlúčená (PR #210), z jej kontroly CodeRabbit ostáva nový nález 219 (časový limit pre snímku stránky v dôkazoch, text hlášky v `search-settled.ts`; nič z toho nie je vážne). Zoznam nadlimitných súborov (TECH-01…11) je prepočítaný: 33 produkčných súborov nad 500 riadkov namiesto desiatich, medzi nimi `ConversationDetail.tsx` 556 a `useConversationThreadController.ts` 505, ktoré sa podľa `svaply.mdc` nemenia, preto oprava posunu v správach vznikla v novom súbore. Po kontrole PR #211: Codex upozornil na možný skok na spodok pri načítaní starších správ (platné, opravené: poloha sa zisťuje pri posune a test to stráži), CodeRabbit na nejasný text nálezu 218 a chýbajúci opis funkcie panela správ. Po tretej kontrole: CodeRabbit upozornil na chýbajúce číslo PR v zázname nálezu 218 (opravené), na posúvanie aj pri zmenšení obsahu (platné, hook posúva len pri raste výšky a test to stráži) a na možný skok pri načítaní starších správ blízko spodku (neplatné: staršie správy sa načítavajú až po plnej stránke 100 správ, takže poloha pri začiatku konverzácie nikdy nie je „blízko spodku“; zapísané do popisu hooku). |
| 29. 10. 2026 | Vetva 153 (čaká na zlúčenie): nález 217 – štyri jednorazové pády záverečných behov E2E (29. 10.: tri samostatné behy aj spoločný beh dali 427 prešlo, 2 padli, 303 preskočených; každý pád prešiel pri samostatnom opakovaní). Pád s posunom o 14 px v Chromiu je vysvetlený a reprodukovaný: stránka `/search` posiela hľadanie pri prvom načítaní dvakrát a medzistav je o 14 px vyšší (nový nález 216; aplikácia sa nemenila). Testy teraz pred meraním a klikaním čakajú, kým sa stránka ustáli, a špecy hľadania pri páde vypíšu dôkazy bez osobných údajov (požiadavky s časmi, stav stránky). Pre dva pády vo WebKite (ťuknutie na autora, odpoveď hľadania do 15 s) príčina zatiaľ nie je známa; vysvetlia ich dôkazy z ďalšieho behu. Opravy z vetvy 151 sa potvrdili: žiadny z desiatich testov `google-login-completion` vo WebKite nepadol a rozpočet obnovy 3 s stačil. Vetva 152 je zlúčená (PR #209). Povýšenie na Django 5.2 sa posúva na vetvu 154. Po kontrole CodeRabbit (PR #210): dôkazy pri páde neobsahujú text chyby stránky (môže niesť kus spracúvaných údajov, napr. pri `JSON.parse`), vypíše sa len druh chyby, a nález 183 uvádza vetvu 152 ako zlúčenú. Po druhej kontrole sa nič z prehliadača nevypisuje „očistené“: zlyhanie siete sa vypíše len ako druh (kód Chromia alebo pevné slovo), aktívny prvok len z pevných zoznamov (značka, `role`, `type`, `data-sidebar-nav-item`, `data-onboarding`; `data-testid` sa už nečíta) a všetko mimo zoznamu ako `other`, takže ani IP adresa, názov servera či slug z atribútu sa do výstupu nedostanú; cesty za `reset-password`, `password-reset`, `password-reset-verify` a `check-email` sa nahradia. Doplnené sú aj opisy funkcií (CodeRabbit uviedol pokrytie opismi 66,67 % pri prahu 80 %). |
| 29. 10. 2026 | Vetva 152 (čaká na zlúčenie): prvý krok časti 183b nálezu 183 – úložiská (médiá na S3, statické súbory bez manifestu) sú nastavené cez `STORAGES` namiesto `DEFAULT_FILE_STORAGE` a `STATICFILES_STORAGE`, ktoré Django 5.1+ ticho ignoruje (fotky by sa ukladali na lokálny disk servera). Na Djangu 4.2 sa správanie nemení; výber súkromného úložiska fotiek správ číta už len `STORAGES`. Dva nové súbory testov (7 testov): produkčné nastavenia v samostatnom procese a výber úložiska správ, ktorý doteraz nemal test. Celá backendová sada: Django 4.2.30 na SQLite 1 983 prešlo a 10 preskočených, na PostgreSQL 16 1 991 a 2, Django 5.2.18 na SQLite 1 983 a 10. Skúška povýšenia na Django 5.2.18 s DRF 3.18.3 v oddelenom prostredí (sada na SQLite aj PostgreSQL, 38 kontrol s produkčnými nastaveniami, servery s WebSocketom, Celery, admin, migrácie od nuly aj nad databázou z 4.2, tokeny v oboch smeroch) neukázala žiadnu prekážku; samotné povýšenie je vetva 153. Nové nálezy 212 (CI testuje backend len na SQLite), 213 (`CheckConstraint(check=…)`), 214 (`sentry_sdk.push_scope`) a 215 (knižnice staršie než oficiálna podpora Djanga 5.2); nález 32 doplnený o ďalšie zbytočné súbory. Vetva 151 je zlúčená (PR #208), nálezy 190 a 210 sú zlúčené. |
| 29. 10. 2026 | Vetva 151 (čaká na zlúčenie): nález 210 – oprava 27 zastaraných alebo chybných E2E testov z druhého celého behu na Railway (28. 10.: 395 prešlo, 35 padlo, 302 preskočených): diagnostika vyhľadávania podľa kontraktu OW-20 (TEST-17), tlačidlo „Zobraziť ďalšie“ v upozorneniach, blok service workera v testoch prihlásenia cez Google (desať pádov vo WebKite), preskočenie scenára s kolieskom myši v mobilnom WebKite (nález 190), názov tlačidla „Otváracia doba“ a rozpočet obnovy pozície 3 s. Sedem testov čaká na testovacie údaje na Railway (nový nález 209, pripraví ich používateľ), jeden jednorazový pád (`search-country-scroll.spec.ts:74`) sa nedal vysvetliť ani reprodukovať a neopravuje sa. Nový nález 211 (tri rôzne záložné texty pre názov otváracích hodín). Vetva 150 je zlúčená (PR #207) a používateľ overil, že Railway beží na Node 22 (nález 208 je overený). |
| 28. 10. 2026 | Vetva 150 (čaká na zlúčenie): nález 208 – CI beží na Node 22 LTS namiesto Node 18 a `frontend/package.json` (aj zámok) zafixuje `engines.node` na `22.x`, takže Railway pri builde použije tú istú verziu. Tri testy strážcu prihlásenia proti zástupnému serveru, ktoré sa na Node 18 preskakovali, bežia teraz aj v CI. Vetva 149 je zlúčená (PR #206). Po kontrole CodeRabbit (PR #206) sa v zázname vetvy 149 opravilo slovo „vedie“ na „uvádza“. |
| 28. 10. 2026 | Vetva 149 (čaká na zlúčenie): nález 202 – strážca prihlásenia v E2E testoch: počas behu každých 5 minút obnoví prihlásenie a prepíše súbor, z ktorého štartujú testy, takže dlhý beh sa po 15 minútach nerozpadne (297 z 318 pádov celého behu). Vetva 148 je zlúčená (PR #205). Do nálezu 207 doplnené meranie na iPhone (Wi-Fi približne 5 s, mobilné dáta 4,25 s). CI na PR #206 zlyhalo, lebo Playwright sa na Node 18 (verzia v CI) pri načítaní sám ukončí a zhodil Jest; test strážcu je upravený a nový nález 208 (CI beží na Node 18). Po kontrole CodeRabbit (PR #206): dočasný súbor s prihlásením sa odstráni aj vtedy, keď zlyhá až jeho zápis, text nálezu 207 uvádza príčinu spomalenia ako hypotézu a nový stav po úspešnej obnove sa nestratí, keď zlyhá zápis súboru (ostane v pamäti a zapíše sa pri ďalšom pokuse). Tretia kontrola CodeRabbit: testy strážcu už nezávisia od načasovania (druhú obnovu test zadrží a kontroluje poradie volaní) a návrh zvýšiť Node v CI na 20 sa rieši samostatne v náleze 208 (odporúčanie 22 LTS, lebo Node 20 už tiež nemá podporu). |
| 28. 10. 2026 | Vetva 148 (čaká na zlúčenie): nález 203 – opravená poškodená diakritika (`?`) v prekladoch cs, de, hu a pl a test, ktorý ju hlási; ukázala ju veľká fotka v správach pri českom rozhraní (toast „Obr?zek je p??li? velk?“). Poškodených hodnôt je 23, nie 20. Nový nález 207 (odoslanie fotky v správach trvá dlhšie). Vetvy 144–147 sú zlúčené (PR #204) a manuálny test na iPhone prešiel (správy s fotkou, avatar, Nástenka), takže nálezy 197–201 sú overené. Po kontrole CodeRabbit (PR #205) test diakritiky zachytí aj posledné písmeno slova nahradené `?` pred bodkou alebo čiarkou. |
| 27. 10. 2026 | Vetva 147 (čaká na zlúčenie, nadväzuje na vetvu 146): nález 201 – výber fotky avatara cez vstup, ktorý žije v DOM (iOS). Nový nález 206 (ESLint hlási 681 chýb v 104 súboroch frontendu, deväť z nich `rules-of-hooks` v `ConversationMessageRow.tsx`). |
| 27. 10. 2026 | Vetva 146 (čaká na zlúčenie, nadväzuje na vetvu 145): nález 200 – HEIC z iPhonu prejde validáciou obrázka hneď od prvej požiadavky, pretože sa `pillow-heif` registruje pri štarte aplikácie. Nový nález 205 (päť lenivých registrácií HEIC je nadbytočných). |
| 27. 10. 2026 | Vetva 145 (čaká na zlúčenie, nadväzuje na vetvu 144): nález 199 – mobilný prehliadač fotky na Nástenke dostane od karty príspevok s živými fotkami, takže sa po vytvorení príspevku fotka po ťuknutí otvorí aj bez opätovného načítania feedu. |
| 27. 10. 2026 | Vetva 144 (čaká na zlúčenie): manuálne testy na iPhone (iOS 27.0.1) po PR #203 odhalili, že fotka z iPhonu príde cez `/api` na server s prázdnym telom (chyba WebKitu). Nález 197 (appka kopíruje súbory do pamäte pred odoslaním, backend stráž `swaply/empty_upload.py` a log so zariadením) a 198 (dôvod odmietnutia fotky a preložené hlášky pri nahrávaní správ a avatara). Nové nálezy 199 (Nástenka: fotka sa po vytvorení príspevku nedá otvoriť na mobile), 200 (HEIC padá na validácii), 201 (avatar: vstup súboru mimo DOM), 202 (E2E: beh dlhší než 15 minút stratí prihlásenie; z 318 pádov celého behu má túto príčinu 297), 203 (`?` namiesto diakritiky v textoch o fotkách) a 204 (chýbajúce a nepoužité kľúče prekladov). Vetva 143 je zlúčená (PR #203). |
| 27. 10. 2026 | Vetva 143 (čaká na zlúčenie): časť 183a nálezu 183 – rýchle upgrady backendu (Pillow 13.0.0, pillow-heif 1.x, DRF 3.17.2, simplejwt 5.5.1, gunicorn 23.0.0, daphne 4.2.3, requests 2.33.0, python-dotenv 1.2.2, bleach 6.4.0, Django 4.2.30), odstránený nepoužívaný `django-allauth` aj jeho mŕtve nastavenia a CI na Pythone 3.11 (záznamy `pip-audit` 191 → 22; zostáva Django 5.2, Twisted, protobuf, pytest). Rozhodnutie R8 je zodpovedané. Vetva 142 je zlúčená (PR #202). Nové nálezy 193 (`Image.open` bez `formats=`), 194 (CI nekontroluje zraniteľné závislosti), 195 (`.coveragerc`) a 196 (akcie CI cielia na Node.js 20). Po kontrole CodeRabbit (PR #203): minimálna opravená verzia DRF je 3.18.2 a audit z nálezu 194 musí porovnávať výsledok so známymi výnimkami. |
| 27. 10. 2026 | Vetva 142 (zlúčená, PR #202): časť 184a nálezu 184 – odstránený nepoužívaný `next-intl`, `npm audit fix` a vyššie dolné hranice `axios`, `@sentry/nextjs`, `js-cookie` (zraniteľné balíky frontendu 19 → 2; zostáva `next` 14 → 16 a vnorený `postcss`), import `withSentryConfig` z `@sentry/nextjs/config`. Nález 188 je zlúčený (PR #201). Nový nález 192 (zbytočné súbory v repozitári). Úvod dokumentu podľa CodeRabbit (PR #201): rozsah čísel nálezov sa dopočítava z dát a už nezostarne. |
| 26. 10. 2026 | Nález 188 opravený na vetve 141 (čaká na zlúčenie): v teste `searchScrollMemory` sú hodiny pevné už pri zápise záznamu (starý variant padal v 0,4 % pokusov, pod záťažou v 2,6 %, nový v 0 z 12 000). Nález 173 je zlúčený (PR #200). Z celého behu E2E na vetve 140 (30 pádov) sú nové nálezy 189–191; ostatné pády sú už zapísané (TEST-17, TEST-12) alebo čakajú na overenie (jazykový test pri zmene jazyka vo webkit-mobile). |
| 26. 10. 2026 | Nález 173 opravený na vetve 140 (čaká na zlúčenie): 13 špecov s `page.route` a `feed-cleanup` blokuje service worker a Jest poistka to stráži pre nové špecy. Spresnenie: v Playwrighte 1.63 zachytáva `context.route` v Chromiu aj požiadavky workera, takže blok sa vyžaduje len pri `page.route` (`google-login-completion` sa nemenilo). Nové nálezy 187 (`public/sw.js`) a 188 (náhodne padajúci test `searchScrollMemory`, zistený pri celom behu Jestu). |
| 26. 10. 2026 | Prvé vydanie v repozitári. Zlúčený zoznam nálezov 1–186 (pôvodný zoznam 1–172, nové nálezy 173–186, register OW- / TEST-), úlohy N1–N16 a rozhodnutia R1–R11. Podľa spresnenia používateľa sa hosting na novom serveri rieši až po dokončení aplikácie (Railway ostáva na testy), preto N1–N3 nie sú v skupine HNEĎ. |

## Príloha A: kontrola úplnosti

Generátor pri zostavení overil:

- pôvodný zoznam má presne čísla 1–172 raz (47 + 4 + 20 + 101 = 172); všetky pôvodne otvorené sú buď roztriedené, alebo zapísané ako opravené;
- nové nálezy majú súvislé čísla 173–230;
- súčet skupín 64 + 1 + 4 + 20 + 0 + 31 + 110 = **230**;
- všetkých 68 ID z registra je zaradených práve v jednej skupine (otvorené / čaká živé overenie / zatvorené / pokryté nálezom); žiadne nechýba a žiadne nie je dvakrát;
- úlohy N1–N16 a rozhodnutia R1–R11 majú súvislé čísla; vlny v časti 2 spomínajú len otvorené položky.

## Príloha B: zdroje, zistenia a obmedzenia

- **Prečítané pri vzniku (26. 10. 2026):** pôvodný zoznam v plnom rozsahu, register z repozitára (stav 21. 10. + denník do PR #193), kód a nasadzovacie súbory na `main` (`d4207583`).
- **Spustené 26. 10. 2026:** `pip-audit` na 23 presne pripnutých backendových balíkoch, `npm audit --omit=dev` vo frontende, hľadanie tajomstiev v sledovaných súboroch a histórii (nič sa nenašlo; je to vzorové hľadanie, nie úplný audit), bodová kontrola rizík z auditu 2024 v kóde.
- **Zistenia z 26. 10. 2026:** najväčšie riziko pre ostrý štart nie sú staré nálezy, ale zraniteľné knižnice (183, 184), príprava servera (N1–N16) a veci s dlhou dodacou lehotou mimo kódu (doména a e-mail N2, právne dokumenty N3). Z pôvodných 101 otvorených položiek nebola žiadna kritická.
- **Neoverené:** obsah starších nálezov zo zoznamu 1–172 sa neprepočítaval v kóde (zdrojom je pôvodný zoznam). Odhady zložitosti a dopadu sú odhady agenta. Nález 9 (WebSocket bez tokenu) a hodnotenie 180 treba najprv overiť čítaním `ws_auth.py` a logmi servera. `pip-audit` a `npm audit` počítajú aj aliasy a závislosti, počty záznamov nie sú počty zneužiteľných chýb. Preklady v angličtine, nemčine a maďarčine mimo profilu a vyhľadávania sa nekontrolovali do hĺbky (meranie našlo mimo katalógu zručností 39 / 19 / 14 hodnôt zhodných so slovenčinou, časť z nich je legitímna). Hosting a ceny v prílohe C sú odborný odhad bez živého porovnania cenníkov.
- **Zdroje s dátumom:** pôvodný zoznam 1–172 (26. 10. 2026), register (21. 10. 2026), kód `main` `d4207583`.

## Príloha C: kam nasadiť (až keď bude aplikácia hotová)

Rozhodnutie o hostingu netreba teraz. Používateľ uviedol (26. 10. 2026), že ostrú verziu pre ostatných používateľov nasadí na iný server než Railway, a to až keď bude aplikácia hotová; Railway ostáva na testy. Príloha je podklad, aby sa pri vývoji nič nezabetónovalo na Railway.

### C.1 Čo aplikácia potrebuje (zistené z repozitára)

| Súčasť | Technológia | Poznámka |
| --- | --- | --- |
| Frontend | Next.js 16 a React 19 (Node, `next start`, zostavenie `--webpack`), service worker | Podľa `next.config.js` Next preposiela `/api/*`, `/media/*` aj `/ws/*` na backend (`BACKEND_ORIGIN`, `BACKEND_WS_ORIGIN`). Pri `NEXT_PUBLIC_API_URL=/api` sa prehliadač pripája na WebSocket cez doménu frontendu, takže Next je v ceste aj pre WebSocket (viď 180). |
| Backend HTTP | Django 5.2 LTS + DRF 3.18, gunicorn (2 workery × 4 vlákna) | Django 5.2 má podporu do 04/2028 (nález 183, vetva 154). |
| Backend WebSocket | Django Channels, daphne | Potrebuje dlhé nečinné spojenia a kontrolu `Origin` (`ws_origins.py`). Pravidelný ping sa v kóde nenašiel. |
| Úlohy na pozadí | Celery worker (concurrency 2) + beat (1 replika) | Plánovač v databáze (`django_celery_beat`). |
| Databáza | PostgreSQL (`DATABASE_URL`) | Migrácie 0124 / 0125 vytvárajú GIN indexy `CONCURRENTLY`. |
| Cache a broker | Redis 7 (`django-redis`, `channels-redis`, Celery) | Oddeliť cache od brokera (N7). |
| Médiá | S3-kompatibilné úložisko (`django-storages` + boto3) | Obrázky Nástenky dnes streamuje Django cez `_stream_key` (`feed_image_files.py`). |
| E-mail | Resend (`django-anymail`) | SPF / DKIM / DMARC pre doménu (N2). |
| Moderácia obrázkov | Google Cloud Vision (SafeSearch) | V produkcii „fail-closed“: pri výpadku sa obrázok odmietne (R10). |
| Monitoring | Sentry (backend aj frontend) | Chýba `global-error` (nález 33). |
| Ďalšie | Web Push (VAPID), prihlásenie cez Google (vlastný kód `google_oauth_simple.py`), reCAPTCHA, MFA (pyotp), HEIC obrázky (`pillow-heif`) | Všetky kľúče nové pre novú doménu (N5). `django-allauth` sa už nepoužíva (odstránený na vetve 143). |
| CI | GitHub Actions: Jest, build, pytest (Python 3.11) | Nasadenie dnes rieši Railway auto-deploy mimo repozitára. |

`docker-compose.prod.yml` v repozitári je **zastaraný** (nemá Redis, Celery, daphne ani rozdelenie HTTP / WS), nedá sa použiť ako hotový predpis nasadenia. Skutočný predpis je `railway.json`, `backend/Dockerfile` a `backend/start-*.sh`.

### C.2 Odporúčanie

**Hetzner Cloud (región Nemecko alebo Fínsko) + Coolify (alebo Dokploy) + Cloudflare + Cloudflare R2.**

- **Prečo:** najlepší pomer cena / výkon pre EÚ; WebSocket bez umelých obmedzení; všetko v kontajneroch, čo aplikácia už má (`Dockerfile`, `start-http.sh`, `start-ws.sh`); Coolify dáva nasadenie z GitHubu, certifikáty a zálohy cez rozhranie, takže netreba byť správca servera; Cloudflare (bezplatný plán) dá DNS, TLS, CDN a základnú ochranu, a ako bonus hlavičku `CF-IPCountry` (rieši nález 186); R2 je S3-kompatibilné úložisko bez poplatkov za prenos, takže `django-storages` ostane bez zmeny.
- **Štart:** jeden server (4 vCPU, 8 GB RAM) pre všetko; zálohy databázy mimo servera (R2 alebo Backblaze B2) a **vyskúšaná obnova**; neskôr vyčlenená databáza (vlastný server alebo spravovaný PostgreSQL), keď porastie prevádzka.
- **Orientačné náklady:** rádovo 20–40 € mesačne na štart (server, zálohy, doména). Ceny treba overiť pred rozhodnutím, cenníky sa menia.
- **Cloudflare a WebSocket:** WebSocket cez Cloudflare funguje, no nečinné spojenie môže proxy po čase (podľa skúseností asi 100 s) zatvoriť. Aplikácia dnes nemá pravidelný ping (viď 180), preto to treba overiť pri teste N14, alebo ping doplniť, alebo WebSocket viesť cez samostatnú doménu bez proxy Cloudflare. Reverzný proxy (Traefik v Coolify) vie smerovať `/ws/` priamo na daphne, takže Next v ceste nemusí byť.
- **Nevýhody, ktoré treba prijať:** jeden server je jediný bod zlyhania; aktualizácie systému a záložné kópie sú na majiteľovi (Coolify to uľahčí, ale nezruší); reakcia na výpadok o 3. v noci je tiež jeho. Konfiguráciu (Dockerfile, compose, CI nasadenie) vie pripraviť agent, server však prevádzkovať nemôže.

### C.3 Alternatívy

| Možnosť | Pre | Proti | Kedy ju vybrať |
| --- | --- | --- | --- |
| **Render** (región Frankfurt) alebo **Scalingo** (EÚ) | Spravované databázy, Redis, workery; WebSocket; minimum správy; nasadenie z GitHubu | Rádovo 100–200 € mesačne pri tomto počte služieb; menej kontroly | Ak sa chce minimum starostí a rozpočet to unesie |
| **Railway** v EÚ regióne (platená úroveň) | Nulová migrácia, už je nakonfigurované | Príčina prerušovania WebSocketu na iPhone (180) nie je objasnená a môže byť aj mimo Railway; v repozitári sú stopy po problémoch s Redis (`RAILWAY_REDIS_FIX.md`); závislosť od jednej platformy | Používateľ sa rozhodol ostrú prevádzku na Railway nedávať; ostáva na testy |
| **AWS / Google Cloud / Azure** | Neobmedzené možnosti | Zložitosť a náklady neprimerané tejto fáze | Až pri veľkom raste |
| **Zdieľaný hosting** | Lacný | Nepodporuje WebSocket, Celery, Redis | Nevhodné |

**Pravidlo výberu:** minimum starostí → Render alebo Scalingo; najnižšia cena a ochota učiť sa správu servera → Hetzner + Coolify. Nech sa zvolí čokoľvek, doménu, e-mail a úložisko médií treba držať oddelene od hostingu (N2, N9), aby sa dalo neskôr presunúť.

### C.4 Frontend: vlastný server alebo Vercel

Nález 184 (zraniteľnosti `next` 14.2.35) sa týka najmä **vlastného hostingu** (Image Optimizer, deserializácia RSC). Vercel takéto veci opravuje na úrovni platformy, ale pridáva ďalšieho dodávateľa a cenu podľa využitia. Odporúčanie: ostať na jednom serveri a **najprv povýšiť Next** (balík 184), nie sa pred zraniteľnosťou schovať za iného poskytovateľa.

### C.5 Kontrolný zoznam nasadenia

Úlohy N1–N16 sú v časti 4 (balík „Príprava ostrého nasadenia“; N16, živé overenie vyhľadávania, je pri Vyhľadávaní a Sledovaniach). Poradie práce je v časti 2.

### C.6 Čo vie agent pripraviť, keď používateľ povie

1. Aktualizovaný `Dockerfile` pre frontend a backend, `docker-compose` pre produkciu (s Redis, Celery, daphne, rozdelenie HTTP / WS) a zoznam premenných prostredia.
2. CI krok nasadenia po zelených testoch s migráciami pred novou verziou a postupom späť.
3. Návrh zálohovania a obnovy PostgreSQL a kontrolný skript.
4. Rýchle upgrady závislostí (183 a 184) ako samostatné vetvy so spusteným celým Jestom a backendovými testami.

