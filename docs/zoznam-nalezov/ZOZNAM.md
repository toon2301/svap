# Svaply – zoznam nálezov, plán opráv a príprava nasadenia

> Hlavný zoznam nálezov projektu. Súbor je **generovaný** z dát v tomto priečinku (`build.py`) a neupravuje sa ručne: pozri časť 10.

Posledná aktualizácia: **28. 10. 2026**. Stav kódu: `main` `6c2bfd94` (po PR #205); register: 21. 10. 2026 + PR #193. Zlučuje tri zdroje: (1) pôvodný zoznam 1–172 (viedol sa v samostatnej konverzácii), (2) nálezy z práce na vetvách od 127 (čísla 173–207) a (3) evidenciu OW- / TEST- / APP- / TECH- z `docs/testing/findings-register.md`, ktorá ostáva podrobným denníkom týchto položiek. Súčasťou sú aj kontroly z 26. 10. 2026 (`pip-audit`, `npm audit`, prehľad repozitára a nasadzovacích súborov).

**Dôležité:** roztriedenie na HNEĎ / PRED NASADENÍM / PO NASADENÍ je návrh agenta; nič sa neopravuje bez výberu používateľa. Čísla nálezov sú stabilné, nikdy sa nemenia ani nepoužívajú znova; nový nález dostane číslo 208. Aktuálne je v zozname 207 nálezov.

## V skratke

- Nálezy 1–207: hotové 56 (z toho 1 čaká na zlúčenie), zatvorené 4, informačné 20; otvorené: **HNEĎ 2**, **PRED NASADENÍM 27**, **PO NASADENÍ 98**.
- Z pôvodných 101 otvorených položiek je dnes otvorených 101 (13 pred nasadením, 88 po nasadení, 0 hneď). Pri vzniku dokumentu (26. 10. 2026) nebola žiadna z nich kritická.
- **Hneď** (časť 3): 183 – zraniteľné knižnice (backend): zostáva Django 5.2; 184 – zraniteľný `next` (frontend).
- **Pred nasadením** (časť 4): 27 nálezov, 20 ID z registra a 16 úloh na prípravu nasadenia. Odporúčané poradie je v časti 2.
- **Po nasadení** (časť 5): 98 nálezov a 20 ID z registra (upratovanie, mikrovýkon, kozmetika, väčšie funkcie).
- **Rozhodnutia** (časť 6): čaká 10 z 11; každé má v stĺpci „Kedy“ uvedené, od akej práce je potrebné.
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

Očíslované nálezy 1–207:

| Skupina | Počet | Poznámka |
| --- | --- | --- |
| Hotové (zlúčené do `main`) | 55 | tabuľka v časti 7 |
| Opravené, čaká na zlúčenie | 1 | tabuľka v časti 7 |
| Zatvorené rozhodnutím | 4 | časť 8 |
| Informačné bez akcie | 20 | časť 8 |
| **HNEĎ** | 2 | časť 3 (183, 184) |
| **PRED NASADENÍM** | 27 | časť 4 |
| **PO NASADENÍ** | 98 | časť 5 |
| **Spolu** | 207 | 172 pôvodných + 35 nových (173–207) |

Okrem toho (mimo číslovania 1–207):

| Zdroj | HNEĎ | PRED | PO | Zlúčené, čaká živé overenie (N16) | Zatvorené alebo pokryté nálezom |
| --- | --- | --- | --- | --- | --- |
| Úlohy na prípravu nasadenia N1–N16 | 0 | 16 | 0 | – | – |
| Register: 68 ID (OW- / TEST- / APP- / TECH- / TOOL- / ENV- / DOC- / RET- / REG-) | 0 | 20 | 20 | 7 | 21 |

## 2. Odporúčané poradie práce

| Vlna | Čo | Prečo v tomto poradí |
| --- | --- | --- |
| **0 – najprv** | Rýchle upgrady z 183 a 184 bez veľkého rizika: backend (Pillow, gunicorn, requests, DRF, simplejwt, daphne, python-dotenv, bleach, Django 4.2.30, odstránenie allauth) je hotový a zlúčený (vetva 143, PR #203), frontend (`npm audit fix`, odstránený `next-intl`) je zlúčený (vetva 142). Zvyšok 183 a 184 (Django 5.2, protobuf, `next` 14 → 16) je vo vlne 1 | Malé a bezpečné. Zraniteľné verzie zmiznú skôr, než pribudne ďalší kód. |
| **1 – základ, kým sa aplikácia dokončuje** | Veľké skoky verzií z 183 a 184 (Django 5.2 LTS s DRF 3.18.2 alebo novším, `google-cloud-vision` kvôli protobuf, Next 16 s Reactom 19), 179 (2FA), 9, 33, 52, 185, OW-07 a balík „Spoľahlivosť CI a testov“ (31, TEST-…, 189, 190) | Veľké skoky verzií sú najlacnejšie teraz, kým je kódu najmenej, a hneď po nich treba spustiť celé testy. |
| **2 – viditeľné chyby a overenia (iPhone a mobil)** | Navigácia a Späť (13, 14, 174), Profil a identita (81, 119), Zdieľanie (91, 92, 207), Upozornenia na zmazaný obsah (74), Žiadosti (17), Vyhľadávanie a Sledovania (OW-11, OW-14, OW-17, OW-05), živé overenie N16 a RET-01..03 | To uvidí každý nový používateľ hneď prvý deň. Overenia (N16, RET-01..03) sa dajú robiť už teraz na Railway a na iPhone. |
| **3 – texty a súkromie** | 120, 175, 176, 177, 204, APP-03, 186 (a podľa R2 poradie jazykov) | Závisí od toho, ktoré jazyky budú pri štarte (R2). |
| **4 – keď bude aplikácia hotová** | Príprava ostrého nasadenia N1–N15 (hosting, doména, právne dokumenty, server, zálohy, monitoring, smoke test), OW-06 a 180 (diagnostiku 180 možno začať už teraz) | Robí sa na novom serveri po dokončení aplikácie. |
| **5 – po nasadení** | Časť 5: funkcie, upratovanie, výkon, nástroje | Podľa spätnej väzby od prvých používateľov. |

## 3. HNEĎ

2 riadky: 183, 184.

### Bezpečnosť závislostí

| Č. | Čo | Poznámka / prečo | Dopad · Zl. |
| --- | --- | --- | --- |
| 183 | Backend: `pip-audit` celého prostredia (aj tranzitívne balíky) hlásil 191 záznamov v 14 balíkoch (prvý sken 26. 10. bral len pripnuté balíky: 180 záznamov). Časť 183a (vetva 143, 27. 10.) je hotová: Pillow 13.0.0, pillow-heif 1.x, DRF 3.17.2, simplejwt 5.5.1, gunicorn 23.0.0, daphne 4.2.3, requests 2.33.0, python-dotenv 1.2.2, bleach 6.4.0, Django 4.2.30 a odstránený nepoužívaný `django-allauth`; CI beží na Pythone 3.11 (191 → 22 záznamov v 5 balíkoch). Zostáva: Django 4.2.30 (9 záznamov), Twisted 26.4.0 (6), DRF 3.17.2 (3), protobuf 4.25.9 (2) a pytest 8.3.2 (2, len vývoj). | Django 4.2 LTS už nemá podporu (skončila 04/2026), preto 9 zvyšných záznamov nikto pre 4.2 nevyhodnotil (popisy sa týkajú Djanga 5.2 a 6.0: cache middleware, signed cookies, GeoDjango/GDAL, `DomainNameValidator`; aplikácia nič z toho v kóde nepoužíva). Čisté riešenie je 183b (pred ostrým štartom): samostatný balík Django 4.2 → 5.2 LTS spolu s DRF 3.18.2 alebo novším (3.18.0 a 3.18.1 ešte neopravujú nič; všetky 3 záznamy DRF majú opravu až v 3.18.2). Dva z nich sú DoS bez prihlásenia na verejných endpointoch (hlavička `Accept` a netextový `charset` v `Content-Type`), tretí sa týka DRF tokenov, ktoré aplikácia nepoužíva, prihlasuje len JWT. Pred ním treba nastavenia `STATICFILES_STORAGE` (`static_media.py:6`, `settings_production.py:210`) a `DEFAULT_FILE_STORAGE` (`settings_production.py:228`, číta ho aj `messaging/storage.py`) presunúť do `STORAGES`, Django 5.1+ ich nepozná. 183c: `google-cloud-vision` 3.4.5 → 3.16.0 kvôli protobuf (treba overiť skutočné volania SafeSearch). Twisted: päť zo šiestich hlásení je v moduloch, ktoré aplikácia nepoužíva (IMAP, telnet, IRC, XMPP); šieste sa týka HTTP servera v daphne (holý CR/LF v hlavičke, request smuggling za proxy). Opravy sú zatiaľ len v 26.10.0rc1 (IMAP regex nemá opravu vôbec): počkať na finálne vydanie. pytest 8 → 9 je vývojový balík (spolu s pytest-django a pytest-cov). Pillow 13 vyžaduje Python 3.11: CI sa prepol z 3.10, `backend/Dockerfile` je na 3.11 od začiatku a lokálne prostredie treba mať tiež na 3.11. Presne na 3.11: `psycopg2-binary==2.9.7` má hotové balíky najviac pre Python 3.11, takže na 3.12 a vyššom by sa musel najprv povýšiť aj on. Python 3.11 má podporu do 10/2027 (Google knižnice na to už upozorňujú), prechod na 3.12+ spolu s povýšením `psycopg2-binary` preto patrí do plánu. Overené na vetve 143: celá backend sada (1955 testov, aj v CI na PR #203), porovnanie skutočných obrazových funkcií so starým Pillow (146 prípadov, rovnaké výsledky aj pixely), migrácie (nové sú len `token_blacklist.0013` a `authtoken.0004`, obe bez zmeny schémy), tokeny platia v oboch smeroch (nasadenie aj rollback). Spustené 26. 10. 2026, časť 183a 27. 10. 2026; počty sú záznamy nástroja, nie doslovný zoznam zneužiteľných chýb. **Rozhodnutie R8** (rozhodnuté, časť 6). | vysoký · L |
| 184 | Frontend: `npm audit --omit=dev` hlásil 19 balíkov (2 kritické, 10 vysokých). Časť 184a (vetva 142, PR #202, 27. 10.) je zlúčená: odstránený nepoužívaný `next-intl`, `npm audit fix` opravil `axios`, `@sentry/nextjs`, `js-cookie`, `follow-redirects` a ďalšie tranzitívne balíky (19 → 2). Zostáva `next` 14.2.35 (kritický, 24 hlásení) a vnorený `postcss`, ktorý má `next` 14 pripnutý. | Zvyšok sa dá opraviť len skokom `next` 14 → 16 (nástroj navrhuje 16.4.3; veľký balík, pravdepodobne aj React 19, súvisí s 153); rovnaký skok potrebuje aj `eslint-config-next` (dev). Dopad pre túto aplikáciu (odhad agenta, nie overené zneužitím): nepoužíva Server Actions (`'use server'` sa nenašlo), `middleware.ts` len nastavuje `Cache-Control`, `images.remotePatterns` pustí len localhost, Sentry `tunnelRoute` nie je nastavený. Relevantné zostávajú hlásenia o DoS pri Server Components, o request smuggling v `rewrites` (`/api/*` ide cez rewrites na backend) a o Image Optimizeri. Robiť skôr ako neskôr (viď 183). Súvisí s hostingom (vlastný hosting vs Vercel): R9. Spustené 26. 10. 2026, časť 184a 27. 10. 2026. **Rozhodnutie R9** (časť 6). | vysoký · L |

## 4. PRED NASADENÍM

55 riadkov v 14 balíkoch (jeden riadok registra môže spájať viac ID). Balík „Príprava ostrého nasadenia“ sa robí až keď bude aplikácia hotová. Každý balík je jedna alebo dve vetvy z `main` (číslo vetvy sa pridelí pri štarte).

### Bezpečnosť a produkčná odolnosť

| Č. | Čo | Poznámka / prečo | Dopad · Zl. |
| --- | --- | --- | --- |
| 185 | `SECURITY_AUDIT_REPORT.md` v koreni repozitára je z roku 2024 (názov Swaply) a vedie R1–R7 ako „neriešené“, hoci kód už väčšinou obsahuje riešenia (95× `transaction.atomic`, 75× `select_for_update`, SameSite, rate limity pri resete hesla). | Prejsť R1–R10 z tej správy voči dnešnému kódu a správu aktualizovať alebo archivovať. Zavádzajúca zastaraná správa zhoršuje rozhodovanie aj verejný repozitár (ak je verejný). **Rozhodnutie R11** (časť 6). | stredný · M |
| 193 | Obrázky sa dekódujú cez `Image.open(...)` bez parametra `formats=` na piatich miestach produkčného kódu (`staged_image_moderation.py:96`, `tasks/offer_images.py:88`, `image_metadata.py:82`, `portfolio/image_processing.py:81`, `messaging/services/image_thumbnails.py:50`), takže Pillow skúsi ľubovoľný formát, ktorý pozná (TIFF, BMP, EPS, PSD, JPEG 2000 …), nielen JPEG, PNG, WebP, GIF a HEIC, ktoré aplikácia prijíma. Cesta cez staged S3 (`moderate_staged_s3_image`; volá ju portfólio, ponuky aj príspevky) dekóduje bajty priamo zo S3 bez predchádzajúcej kontroly podpisu súboru (`sniff_image_format` sa volá len v validátore `ImageField` a pri avatare). | Zistené pri mapovaní 183a: Pillow 12.3.0 mal 37 známych chýb, časť z nich v dekóderoch formátov, ktoré aplikácia neprijíma (TIFF, BMP, MIC, SPIDER, MSP, XBM, EPS); Pillow 13.0.0 ich nemá žiadnu, no obmedzenie formátov je lacná poistka proti budúcim. Overené 27. 10. na kópii: `_decode_to_webp`, `build_message_thumbnail` aj varianty portfólia dekódujú súbor TIFF aj BMP bez odmietnutia. Návrh: spoločná konštanta povolených formátov a `formats=` na všetkých piatich miestach + test, že TIFF/BMP súbor sa odmietne. Pozor na HEIC: pillow-heif sa v Pillow hlási ako `HEIF`; overiť na skutočných fotkách z iPhonu (aj kvôli `MPO` pri JPEG z fotoaparátu). | stredný · S |
| 194 | Ani CI (`.github/workflows/deploy.yml`), ani iný plánovaný workflow nekontroluje zraniteľné závislosti: nebeží `pip-audit` ani `npm audit` a v repozitári nie je Dependabot. Zoznam zraniteľných balíkov (191 záznamov backendu, 19 balíkov frontendu) preto narástol nepozorovane a odhalila ho až jednorazová kontrola 26. 10. | Návrh: plánovaný týždenný workflow (`schedule` + `workflow_dispatch`) s `pip-audit -r backend/requirements.txt` a `npm audit --omit=dev`, ktorý len hlási (nezastavuje PR), alebo Dependabot pre `pip` a `npm`. Pozor: kým nie sú hotové 183b, 183c a zvyšok 184 (`next` 14 → 16), audit hlási známe zraniteľnosti (backend 22 záznamov: Django, Twisted, DRF, protobuf, pytest; frontend `next`) pri každom behu, takže opakované hlásenie samo o sebe neznamená novú zraniteľnosť. Workflow preto musí porovnávať výsledok so zoznamom známych výnimiek: ID záznamov vedené v repozitári (pri `pip-audit` priamo cez `--ignore-vuln <ID>`, pri `npm audit` porovnaním s uloženým zoznamom), každé s dôvodom a podmienkou odstránenia (napr. „zatvorí 183b“); upozorniť má len záznam, ktorý v zozname nie je. Pozor na hluk: `npm audit` hlási aj tranzitívne balíky, preto začať s prahom `high`. | stredný · S |

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
| 190 | `e2e/search-country-scroll.spec.ts`, test „review: a restored profile-return snapshot follows user scrolling…“: volá `page.mouse.wheel(0, -700)` (riadok 125) aj v mobilnom projekte, no Playwright v mobilnom WebKite kolieskom nehýbe („Mouse wheel is not supported in mobile WebKit“). V projekte webkit-mobile preto padá vždy, od pridania 17. 10. (commit `66c15acc`). | Overené v zdroji Playwrightu 1.63 (`RawMouseImpl.wheel`). Rovnaké obmedzenie už raz zachytil TEST-11 v inom špecu. Na výber: v mobile použiť iný skutočný vstup (ťah prstom), alebo tento jeden scenár v mobilnom WebKite preskočiť s vysvetlením. | nízky · S |
| TEST-03, 04, 09, 12–16, 18 | Jednorazové a neobjasnené zlyhania a upozornenia testov: push-timeout (03), WebKit timeouty (04, 09, 12, 13), `OfferWatchSettingsMobileHost.openState` (14), Jest nekončí (15), vlákno registračného e-mailu v SQLite testoch (16), dlhšie živé E2E skončili pred overením (18). | Spolu s 31 a 179. Bez diagnostiky ich neoznačovať za opravené; ak CI blokuje nasadenie, treba ich stabilizovať. | stredný · M |
| TEST-17 | Starý diagnostický E2E (`search-diagnostics.spec.ts:106–141`) očakáva po opakovaní nulový HTTP, čo OW-20 zámerne mení. | Aktualizovať podľa nového kontraktu, inak dá falošné RED. | nízky · S |

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
| 207 | Po oprave 197 sa fotky z iPhonu v správach odosielajú, no podľa manuálneho testu (28. 10.) odoslanie trvá dlhšie, než by používateľ čakal; nie je to chyba, preto sa nerieši hneď. Cesta jednej fotky: appka ju neprepočíta ani nezmenší (v správach ani v `lib` nie je žiadne zmenšovanie), nahrá sa celý súbor z telefónu (snímka z iPhonu má niekoľko MB); v požiadavke beží kontrola obrazu cez Google Vision (`check_image_safety` vo `validate_image_file`, limit `SAFESEARCH_TIMEOUT` 5 s); potom v transakcii so zámkom konverzácie `strip_image_metadata` (odstránenie EXIF prekódovaním), uloženie originálu a miniatúry do úložiska (S3). Počas odosielania sa len zablokujú tlačidlá (`sending`, nižšia priehľadnosť), bez indikátora priebehu. | Meranie na iPhone 28. 10. (jedna fotka, stopky od ťuknutia po zobrazenie správy): Wi-Fi približne 5 s, mobilné dáta 4,25 s. Rozdiel medzi sieťami je malý a mobilné dáta vyšli rýchlejšie, takže väčšinu času zrejme netvorí nahranie z telefónu, ale spracovanie na serveri a v službách za ním; ide len o jedno meranie. Lokálne meranie 28. 10. (bez Google Vision a S3, snímka 4032 × 3024 JPEG 3,3 MB): spracovanie na serveri 0,4 až 0,8 s (medián 0,59 s), z toho prekódovanie `strip_image_metadata` 0,25 s a miniatúra 0,16 s. Zvyšok z 4 až 5 s je teda mimo nášho kódu (Vision, S3, siete), ktorý tu nemožno zmerať. Prvý krok bez zmeny kódu: na Railway zapnúť `SAFESEARCH_TIMING_LOG=true` a porovnať čas Vision s celkovým časom. Možné zlepšenia: zmenšiť fotku v prehliadači pred odoslaním (napr. dlhšia strana 2048 px, výrazne menej dát aj práce servera; zasahuje do kvality a do pravidla 5 MB, treba rozhodnúť), ukázať indikátor odosielania, spracovanie obrazu mimo transakcie so zámkom konverzácie. | nízky · M |

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

108 riadkov v 17 skupinách. Dopad je všade nízky okrem uvedených výnimiek; poradie podľa potreby po štarte.

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
| 187 | `public/sw.js`: vetvy `respondWith(fetch(request))` pre `/api/*`, dokumenty a `/_next/` len znovu vydajú tú istú požiadavku (bez cache a bez offline náhrady). Sú zbytočné a robia `page.route` v Playwrighte slepým (príčina nálezu 173). | Overené v Chromiu na produkčnom builde: keď worker tieto požiadavky nevybavuje, `page.route` funguje aj s aktívnym workerom. Lokálne meranie nepreukázalo rozdiel v latencii (medián 5,8 ms s workerom, 4,6 ms bez). Zmena `sw.js` je produkčná (PWA, iPhone), preto samostatne a s overením na iPhone; rieši sa spolu s 52. Po nej by `serviceWorkers: 'block'` v špecoch nebolo nutné (poistka `E2eServiceWorker.guard.test.ts` by sa upravila). Vetva 144: rovnaký vzorec je podľa hlásení iných projektov spúšťačom chyby WebKitu pri nahrávaní z iPhonu (nález 197); appka ju obchádza kopírovaním súborov do pamäte, takže zmena `sw.js` už nie je naliehavá, no vynechanie `respondWith` pri POST a PATCH by bolo ďalšou poistkou. | nízky · M |

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
| TECH-01…11 | Nadlimitné súbory (>500 riadkov): `DashboardContent` 711, `lib/api.ts` 907, `useDashboardState` 921, `app/search/page.tsx` 648, `useDashboardNavigation` 514, `ProfileOffersSection` 1108, `ProfileOffersMobileSection` 945, `SkillDescriptionModal` 502, `useSkillsDescriptionScreenState` 638, `DashboardContentView.test` 895 (počty riadkov z 26. 10. 2026; TECH-08 už nie je nad limitom). | Technický dlh; podľa `svaply.mdc` len nahlásiť. | nízky · L |

### Nástroje a testy

| Č. | Čo | Poznámka / prečo | Dopad · Zl. |
| --- | --- | --- | --- |
| 4 | `tsc` nekontroluje testy (chýba `@types/jest`), testy sa typovo nikdy nekontrolujú. | `tsc` nekontroluje testy; zapnutie môže odhaliť veľa chýb. | nízky · M |
| 16 | Nástenka testovacieho účtu drží 20+ vlastných zdieľaných/voľných príspevkov (možné pozostatky). | Testovací účet drží 20+ vlastných príspevkov. Na novom serveri nebudú testovacie účty; riešené cez N4 (staging). | nízky · S |
| 19 | Dva E2E testy majú vlastné kópie `recordMainInstance` – prejsť na spoločného pomocníka. |  | nízky · S |
| 20 | E2E S6/S7 (`messages-peer-profile.spec.ts`) sa nikdy nespustili na produkcii (treba `E2E_PEER_SLUG` a tvoj súhlas). |  | nízky · S |
| 32 | Cudzie súbory v repozitári: 3 sledované súbory v koreni `components/…`, `postcss.config.mjs`, `.backup` súbory. | Cudzie súbory v repozitári. Rozšírené 26. 10. 2026: v koreni sú navyše commitnuté `cd`, `git`, `main`, `out)`, `.mp4`, `frontend-build.zip`, dva prázdne WinRAR zipy, `Dockerfile.backup`, `test-autosave.html`, `linecount*`. Tajomstvá som v repozitári ani v histórii nenašiel. | nízky · S |
| 34 | Zmiešané konce riadkov: `autocrlf=true` bez `.gitattributes`; `DashboardContent.tsx` je BOM + CRLF. |  | nízky · S |
| 35 | Zabudnuté nečinné Jest procesy z 2026-09-26 (pýtať sa pred ukončením). |  | nízky · S |
| 78 | Testy `DashboardContent.onboardingHandlers.test.tsx` majú 3 TypeScript chyby (už pred rozdelením). |  | nízky · S |
| 110 | Medzera v testoch: žiadne E2E pre Vyhľadávanie → profil → detail → Späť; synchrónne mocky routera skrývajú závody. |  | nízky · M |
| 113 | Chýba E2E pre režim nízkeho okna mobilných Nastavení. |  | nízky · S |
| 157 | Medzera v testoch: preteky „Viac počas výstupu“ pre umiestnenie nad appkou majú len unit testy. |  | nízky · S |
| 178 | ESLint hlási 10 chýb a 1 varovanie v nezmenenom súbore `search/hooks/useRecentSearches.tsx` (už na `main`). | CI lint nespúšťa (TOOL-01), preto si to nikto nevšimol. V tom istom súbore je aj APP-05 (závod pri overení histórie); riešiť spolu. | nízky · S |
| 182 | PR #191 / vetva `134-diag`: len diagnostika, nikdy nezlúčiť; po vyriešení 180 uzavrieť a vetvu zmazať. | Vetva sa maže len na pokyn používateľa. | nízky · S |
| 195 | `backend/.coveragerc`: zoznam `omit` obsahuje päť neexistujúcich súborov (`swaply/settings_clean.py`, `swaply/migrate_api.py`, `accounts/views/google_oauth.py`, `accounts/views/simple_google_oauth.py`, `accounts/views/oauth.py`) a prah `fail_under = 94.8` sa líši od `--cov-fail-under=85` v `pytest.ini`. Riadok `accounts/views/*` navyše vynecháva z merania pokrytia všetky views. | CI beží s `--no-cov` (pokrytie sa nevynucuje), takže nič z toho nespôsobuje chybu; číslo pokrytia však o views nič nehovorí. Zistené pri odstraňovaní allauth (143), kde som z `omit` zmazal len riadky pre zmazané allauth súbory. Patrí k téme „pokrytie sa rieši samostatne“ z komentára v `deploy.yml`: treba rozhodnúť, aký prah platí a čo sa meria. | nízky · S |
| 196 | `.github/workflows/deploy.yml`: akcie `actions/checkout@v4`, `actions/setup-node@v4` a `actions/setup-python@v4` sú staršie než verzie pre Node.js 24 (`setup-python@v4` deklaruje `node16`, ostatné dve `node20`). GitHub ich dnes núti bežať na Node.js 24 a v logu každého behu vypíše varovanie „Node.js 20 is deprecated“ (beh CI na PR #203, 27. 10.). CI pritom prechádza a krok `Setup Python` nezlyhal. | Overené v `action.yml` jednotlivých tagov: `setup-python@v5` deklaruje `node20` (varovanie by zostalo), až `setup-python@v6` `node24`; `checkout@v5` a `setup-node@v5` už `node24`. CodeRabbit (PR #203) navrhol len `setup-python@v5` s tvrdením, že krok môže zlyhať; beh CI to nepotvrdil a samotné v5 by varovanie neodstránilo. Oprava: povýšiť všetky tri akcie naraz na verzie pre Node 24 a overiť behom CI; robiť spolu s nálezom 194 (úprava workflow). | nízky · S |
| 206 | `npx eslint src` hlási 681 chýb a 31 varovaní v 124 z 1 255 súborov frontendu (104 súborov s chybou, z toho 51 testov a 53 produkčných). Najviac je `no-unused-vars` (359), `no-explicit-any` (213), `no-require-imports` (66) a `no-unused-expressions` (29, najmä modaly úpravy profilu `profile-edit/modals/*`). Deväť chýb `react-hooks/rules-of-hooks` je v `messages/ConversationMessageRow.tsx` (riadky 173–233: hooky stoja za predčasným `return` pre skupinové pozvánky a systémové správy). | Zmerané 27. 10. na vetve 147. Rozširuje nález 178 (ten opisuje jediný súbor) a súvisí s TOOL-01 (CI lint nespúšťa). `ConversationMessageRow` dnes nepadá, lebo typ správy sa pri tom istom `id` nemení; ak by sa niekedy zmenil (napr. skupinová pozvánka na obyčajnú správu), React hodí „Rendered more hooks than during the previous render“. Odporúčanie: najprv hooky pred `return`, potom rozhodnúť, či lint dať do CI, a upratať zvyšok po balíkoch (najprv produkčné súbory). | nízky · M |
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
| R9 | Next.js 14 → 15 / 16 (184) | Povýšiť Next pred štartom a kde bude frontend bežať? | Samostatný balík pred štartom (pravdepodobne aj React 19, viď 153). Frontend nechať na vlastnom serveri a zraniteľnosť odstrániť upgradom, nie presunom na Vercel (C.4). | Pred prácou na 184; časť o hostingu frontendu až neskôr (R1). |
| R10 | Obrazová moderácia pri výpadku (N10) | Čo robiť, keď Google Vision nie je dostupný? | Produkcia je už nastavená „fail-closed“: obrázok sa odmietne s hláškou „Kontrola bezpečnosti obrázka zlyhala, skúste neskôr.“ Odporúčanie je ponechať (bezpečnejšie), len počítať s tým, že pri výpadku Google sa nedajú nahrať obrázky, a sledovať kvóty. | Až pri príprave štartu (N10); stačí potvrdiť. |
| R11 | Stará bezpečnostná správa (185) | Čo so zastaranou správou `SECURITY_AUDIT_REPORT.md` z roku 2024? | Archivovať mimo repozitára (alebo prepísať podľa dnešného stavu) a overiť, či je repozitár verejný: interné audity a poznámky o rizikách tam nepatria. | Pred prácou na 185. |

**Rozhodnuté:**

| Č. | Téma | Odpoveď | Dátum |
| --- | --- | --- | --- |
| R8 | Django a backend balíky (183) | Podľa odporúčania: najprv rýchle upgrady a odstránenie allauth (183a, vetva 143), potom samostatný balík Django 5.2 LTS (183b); každý na vlastnej vetve s celými backendovými testami. | 27. 10. 2026 |

## 7. Hotové

56 položiek. Pri položkách 159–172 a novších platí: opravené a zlúčené (alebo označené ako čakajúce na zlúčenie); či ich používateľ overil manuálne, zoznam neeviduje.

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
| PR čaká | 149 | 202 |

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
| 173 | HOTOVÉ: E2E špecy, ktoré strážia zápisy alebo podvrhujú sieť cez `page.route`, blokujú service worker (`serviceWorkers: 'block'`); nové špecy stráži Jest poistka `E2eServiceWorker.guard.test.ts`. Overené v Chromiu na produkčnom builde (Playwright 1.63): bez bloku strážca zápis 1,5 s po načítaní nezachytí. |
| 188 | HOTOVÉ: test „rejects expired records and future timestamps“ v `searchScrollMemory.test.ts` zafixuje hodiny pred zápisom záznamu, takže už nepadá náhodne. Starý variant: 16 pádov zo 4 000 bez záťaže a približne 104 zo 4 000 pod záťažou, nový 0 z 12 000. Mutácie expirácie a odmietania budúcich časov test stále zabijú. |
| 197 | HOTOVÉ (overené používateľom na iPhone 28. 10.): nahrávanie fotiek z iPhonu (iOS 27.0.1, podľa hlásení aj Safari 26.5.x) prišlo cez `/api` na server s prázdnym telom, takže správa skončila hláškou „Neplatné údaje“ a zmena avatara všeobecnou chybou. Príčina je chyba WebKitu: `File` z `<input type="file">` sa cez XHR/fetch pošle s `Content-Length: 0` (hlásia ju aj iné projekty; oprava je v WebKite zlúčená, vydanie nie je známe). Appka teraz pred odoslaním kopíruje súbory z `FormData` do pamäte (`lib/materializeUploadFiles.ts`, jeden axios interceptor v `lib/api.ts`) a pri zlyhaní čítania pošle pôvodný súbor. Backend rozpoznáva prázdny multipart zdieľanou strážou `swaply/empty_upload.py` (správy: kód `empty_message_upload`, avatar: `empty_avatar_upload`) a zapíše ho do logu s user-agentom. Priame nahrávanie na S3 (príspevky, ponuky, portfólio) sa nemenilo, z iPhonu funguje. Overené Jestom, pytestom a mutačnými kontrolami a v Chromiu so simuláciou chyby. |
| 198 | HOTOVÉ: pri 400 na odoslanie správy appka ukazovala všeobecné „Neplatné údaje“, aj keď backend poslal dôvod pri fotke (príliš veľká, zlý formát, zlyhaná kontrola obsahu); `getMessagingErrorMessage` teraz ukáže dôvod z `validation_errors.image`. Fotka, ktorá na server nedorazila, má vlastné preložené hlášky (`messages.uploadEmpty`, `profile.photoUploadEmpty`) vo všetkých šiestich jazykoch a pri avatare sa namiesto doslovného textu v kóde používa existujúci preklad `profile.photoUploadError`. |
| 199 | HOTOVÉ (overené používateľom na iPhone 28. 10.): mobilný prehliadač fotky na Nástenke dostával od karty zastaraný príspevok bez adries fotiek (fotky, ktoré sa po vytvorení príspevku ešte spracúvali, dosleduje polling len v stave karty), takže sa `ImageLightbox` hneď po otvorení zavrel a ťuk na hotovú fotku „nič neurobil“, kým sa feed nenačítal znova. Prehliadač teraz dostane príspevok s živými fotkami karty (`feed/useViewerPost.ts`); polling sa nereštartuje a objekt sa mení len pri zmene príspevku alebo fotiek. Overené Jestom (dva regresné testy zlyhajú, keď sa zapojenie vráti) a v Chromiu s rozmermi iPhonu na produkčnom builde. |
| 200 | HOTOVÉ (overené používateľom na iPhone 28. 10.): podpora HEIC (`pillow-heif`) sa registruje pri štarte aplikácie (`swaply/heif_support.py`, volané z `AccountsConfig.ready()`), takže HEIC z iPhonu prejde validáciou `ImageField` v DRF už od prvej požiadavky v každom procese; predtým len v procese, ktorý už predtým spracoval iný obrázok. Chýbajúca knižnica štart nezhodí, zapíše varovanie. Overené: test v čerstvom procese (pred opravou zlyhal s „Uploadujte prosím obrázok…“, po oprave prejde) a odoslanie HEIC správy cez HTTP v čerstvom procese (pred opravou 400 „Neplatné údaje“, po oprave 201 aj s miniatúrou). Päť lenivých registrácií v moduloch spracovania obrázkov sa nemenilo (nález 205). |
| 201 | HOTOVÉ (overené používateľom na iPhone 28. 10.): výber fotky avatara cez „Zmeniť fotku“ (profil aj mobilná úprava profilu) a v desktopovom formulári úpravy profilu používal `document.createElement('input')`, ktorý sa nikdy nepripojil do DOM; WebKit na iOS takýto element po zatvorení modalu môže odpratať a `change` sa nespustí, takže sa po výbere fotky nestalo nič (ani chyba). Nový pomocník `lib/pickImageFile.ts` drží skrytý vstup v `document.body` až do výberu alebo zrušenia a používa ho modal aj formulár. Overené Jestom (tri mutácie testy zabijú: odpojený vstup v modale aj vo formulári a pomocník bez pripojenia do DOM). Príčinu na iPhone som pri oprave nemohol reprodukovať (chýba WebKit); manuálny test používateľa na iPhone po nasadení prešiel. |
| 202 | HOTOVÉ: E2E testy po približne 15 minútach strácali prihlásenie. `global-setup.ts` sa prihlási raz, prihlásenie platí 15 minút a jeho obnova je jednorazová (rotácia refresh tokenu), takže ju spravil len prvý test a ostatné ostali so zablokovaným tokenom. Backend navyše dovolí len 10 obnovení za minútu z jednej adresy, čo pád po vypršaní ešte zhoršilo. Nový strážca prihlásenia (`e2e/support/sessionKeeper.ts`, obnova v `e2e/support/refreshStorageState.ts`, zapojenie v `global-setup.ts`) počas behu každých 5 minút (voliteľne `E2E_SESSION_KEEPER_SECONDS`) obnoví prihlásenie rovnako ako appka (`POST /api/token/refresh/` s CSRF hlavičkou a pôvodom požiadavky) a atomicky prepíše súbor s prihlásením, takže každý nový test štartuje s čerstvým; na konci behu počká na rozbehnutú obnovu. Zmena sa týka len testov. Overené Jestom (13 testov, 7 skúšobných poškodení zabité, vrátane zástupného servera, ktorý kontroluje CSRF a pôvod) a v Chromiu proti lokálnej kópii s prihlásením platným 90 s: bez strážcu padol test hneď po vypršaní (test 7 po 113 s), so strážcom prešlo všetkých 10 testov za 3 minúty (súbor s prihlásením mal pri štarte testov najviac 27 s). Celý beh na Railway a vo WebKite sa tu overiť nedal; zvyšných približne 21 pádov z iných príčin (napr. 189, 190) táto oprava nerieši. |
| 203 | HOTOVÉ: v `messages/{cs,de,hu,pl}.json` mali texty o fotkách v časti Správy namiesto písmen s diakritikou znak `?` (23 hodnôt: cs 6, de 4, hu 7, pl 6; pôvodný zápis uvádzal 20, lebo dvojité `??` v „p??lohu“, „Do??cz“ a „za??cznik“ vzor písmeno–`?`–písmeno nezachytil). Zistené pri manuálnom teste na iPhone s českým rozhraním: pri fotke nad 5 MB sa ukázalo „Obr?zek je p??li? velk?“. Poškodenie je v súboroch od prvého importu repozitára, nie je to nová regresia a mimo týchto štyroch súborov sa v repozitári nenašlo. Texty sú doplnené a test `translationsDiacritics.test.ts` zakazuje `?` v slove, posledné písmeno slova nahradené `?` pred bodkou alebo čiarkou (doplnené po kontrole CodeRabbit na PR #205) a náhradný znak U+FFFD vo všetkých šiestich jazykoch. Pred opravou zlyhal na týchto 23 hodnotách, skúšobné poškodenia zabije a bežné otázky (aj „zmazať?...“) nepovažuje za chybu. Overené aj v Chromiu na produkčnom builde: toast pri fotke nad 5 MB aj pri zlom type súboru je vo všetkých šiestich jazykoch správny. |

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

Register `docs/testing/findings-register.md` má 68 ID. Otvorené sú v častiach 4 a 5 (20 pred nasadením, 20 po nasadení). Zvyšok:

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

**Zatvorené (19):**

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
- **Čísla:** nový nález dostane ďalšie voľné číslo (208); čísla sa nikdy nemenia ani nepoužívajú znova. Úlohy na prípravu nasadenia majú vlastné číslovanie N1…, rozhodnutia R1….
- **Ako:** upraviť dáta (`polozky_nove.py`, `polozky_povodne.py`, `register.py`, `stav.py`), spustiť z koreňa repozitára `python docs/zoznam-nalezov/build.py` a pridať do commitu aj `ZOZNAM.md`. Skript overí úplnosť: čísla nálezov a ID z registra sú práve raz, súčty sedia, odkazy na rozhodnutia a balíky existujú a vlny v časti 2 nespomínajú hotové položky.
- **Oprava nálezu:** položku odstrániť z `ORIG_OPEN` / `NEW_ITEMS` a pridať do `stav.DONE_SINCE` (číslo vetvy, PR keď je známe, `zlucene=True` po zlúčení). Upraviť aj vlny `stav.PORADIE`, ak ju spomínali.
- **Rozhodnutie:** vyplniť `odpoved` a `datum` v `stav.DECISIONS`.
- **Vždy:** posunúť `stav.STAV` (dátum, stav kódu) a doplniť riadok do `stav.ZMENY`.
- **Kontrola:** `python docs/zoznam-nalezov/build.py --check` skončí chybou, ak sa `ZOZNAM.md` líši od dát.
- Podrobný denník položiek OW- / TEST- ostáva v `docs/testing/findings-register.md`; nové ID, ktoré tam pribudnú, treba zaradiť do `register.py`, inak skript zlyhá.

## 11. Zmeny v dokumente

| Dátum | Zmena |
| --- | --- |
| 28. 10. 2026 | Vetva 149 (čaká na zlúčenie): nález 202 – strážca prihlásenia v E2E testoch: počas behu každých 5 minút obnoví prihlásenie a prepíše súbor, z ktorého štartujú testy, takže dlhý beh sa po 15 minútach nerozpadne (297 z 318 pádov celého behu). Vetva 148 je zlúčená (PR #205). Do nálezu 207 doplnené meranie na iPhone (Wi-Fi približne 5 s, mobilné dáta 4,25 s). |
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
- nové nálezy majú súvislé čísla 173–207;
- súčet skupín 55 + 1 + 4 + 20 + 2 + 27 + 98 = **207**;
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
| Frontend | Next.js 14 (Node, `next start`), service worker | Podľa `next.config.js` Next preposiela `/api/*`, `/media/*` aj `/ws/*` na backend (`BACKEND_ORIGIN`, `BACKEND_WS_ORIGIN`). Pri `NEXT_PUBLIC_API_URL=/api` sa prehliadač pripája na WebSocket cez doménu frontendu, takže Next je v ceste aj pre WebSocket (viď 180). |
| Backend HTTP | Django 4.2 + DRF, gunicorn (2 workery × 4 vlákna) | Pozor na koniec podpory Django 4.2 (nález 183). |
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

