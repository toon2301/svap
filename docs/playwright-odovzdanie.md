# Playwright: odovzdanie (stav k 30. 10. 2026)

Táto strana je pre agenta, ktorý má na starosti Playwright (Codex). Pravidlá spolupráce sú v `AGENTS.md`. Po každom prijatom behu (pozri nižšie) agent aktualizuje tabuľku stavu a zoznam známych pádov. Zmeny dáva do jednej vetvy naraz, nie po každom behu zvlášť.

## Ako sa beh spúšťa

- Testy sú v `frontend/e2e/` (42 špecov, pomocníci v `frontend/e2e/support/`). Beží ich Playwright, Jest ich nezbiera.
- Bežia proti produkčnej inštancii na Railway (`https://stunning-inspiration-svap.up.railway.app`). Lokálny server sa nespúšťa: appka sa v produkčnom režime správa inak (napr. `Cache-Control: no-store`).
- Projekty: `webkit-desktop`, `webkit-mobile` (iPhone 15) a `chromium-desktop`. WebKit je povinný.
- Na Windows sa beh púšťa v Dockeri (Smart App Control blokuje WebKit): z priečinka `frontend` `npm run test:e2e:docker -- --workers=1 --retries=0` (celý beh trvá okolo 40 minút). Jeden projekt: `... -- --project=webkit-mobile`. Skript je `frontend/scripts/e2e-docker.js`, obraz je `mcr.microsoft.com/playwright:v<verzia>-noble`.
- Prihlásenie berie `frontend/.env.e2e` (šablóna `.env.e2e.example`, súbor je v `.gitignore` a nikdy sa nedáva do chatu ani do repozitára). Voliteľné: `E2E_PEER_SLUG` (zapína `messages-peer-profile.spec.ts`), `E2E_SESSION_KEEPER_SECONDS`.
- Prihlásenie platí 15 minút. Strážca (`support/sessionKeeper.ts`) ho obnovuje každých 300 s a prepisuje `e2e/.auth/user.json`. Neúspešné prihlásenie sa neopakuje: backend po 5 neúspešných pokusoch za 15 minút účet dočasne zamkne.
- Pred behom skontroluj, že Railway dokončil nasadenie najnovšieho `main` (opýtaj sa majiteľa) a že sa počas behu nič nezlučuje.

## Posledný prijatý stav

Beh 29. 10. 2026 po zlúčení vetvy 151 (backend Django 4.2.30), `--workers=1 --retries=0`, 39 minút:

| Výsledok | Počet |
| --- | --- |
| prešlo | 427 |
| padlo | 2 |
| preskočené | 303 |

Rovnaký súčet dali tri samostatné behy: `chromium-desktop` 130 / 0 / 114, `webkit-mobile` 168 / 1 / 75, `webkit-desktop` 129 / 1 / 114 (prešlo / padlo / preskočené). Preskočené sú väčšinou testy určené pre iný typ obrazovky; sedem čaká na testovacie údaje na Railway (nález 209).

Od tohto behu sa zlúčila vetva 153 (len E2E úpravy: čakanie na ustálenú stránku `/search` a dôkazy pri páde). Prvý beh po jej nasadení je nový porovnávací stav, ak nemá nové pády.

## Známe jednorazové pády

Každý z nich prešiel pri samostatnom opakovaní. Podrobnosti a príčiny sú v zozname nálezov pri nálezoch 217 a 216.

1. `search-panel-return.spec.ts`, ponuky, `webkit-mobile`: po ťuknutí na autora ostala adresa `/search`. Príčina nie je známa, čaká na dôkazy z ďalšieho pádu.
2. `search-panel-return.spec.ts`, ľudia, `webkit-desktop`: odpoveď `/api/auth/search/global/` neprišla do 15 s. Príčina nie je známa.
3. `search-to-offer-watches.spec.ts`, tmavý variant, `webkit-desktop`: po kliknutí na Vyhľadávanie sa neukázalo vyhľadávacie pole. Vysvetlené (pomalá odpoveď `/api/auth/me/` na Railway), test teraz čaká na ustálenie stránky.
4. `search-country-scroll.spec.ts`, tmavý variant, Chromium: obnovená pozícia sa líšila o 14 px. Vysvetlené a opravené (stránka `/search` posiela hľadanie pri prvom načítaní dvakrát, nález 216; aplikácia sa nemenila).

## Pravidlo porovnania behov

Platí od 29. 10. 2026 a nahrádza pôvodné „tri čisté behy po sebe“, ktoré bolo pri náhodných pádoch nesplniteľné a blokovalo všetko ostatné.

1. Po dávke zmien (zlúčené vetvy a nasadenie na Railway) sa spustí jeden celý beh.
2. Výsledok sa porovná s posledným prijatým behom podľa dvojice „špec a názov testu, projekt“.
3. Nový pád (test, ktorý naposledy prešiel alebo bol preskočený) je chyba na vyšetrenie. Pád zo zoznamu známych pádov je len poznámka a pripíše sa mu výskyt.
4. Nový pád sa samostatne zopakuje (3×, rovnaké podmienky). Ak prejde vždy, ide o ďalší jednorazový pád: zapíše sa do zoznamu s dôkazmi. Ak padá, je to chyba testu alebo aplikácie a rieši sa. Opakovanie slúži len na diagnostiku, nie na to, aby sa beh zmenil na zelený.
5. Beh bez nových pádov je prijatý a stáva sa novým porovnávacím stavom.

## Bloky dôkazov

Špecy `search-country-scroll`, `search-panel-return` a `search-to-offer-watches` majú vypnutý trace, screenshot aj video (súkromie). Pri páde preto vypíšu a pripoja ako `failure-evidence` blok `[E2E-EVIDENCE] <test> | <projekt> | <čas>`: adresa (cesta bez ID, názvy parametrov), stav stránky (načítanie, panel, posun, aktívny prvok), požiadavky s časmi a stavmi a počty chýb stránky a konzoly. Žiadne telá odpovedí ani texty stránky v ňom nie sú a nesmú byť. Kód: `frontend/e2e/support/page-activity.ts` a `page-activity-format.ts`, Jest `E2ePageActivity.test.ts`.

## Čo sa osvedčilo a na čo si dať pozor

- Špecy, ktoré používajú `page.route` alebo `context.route`, musia mať `serviceWorkers: 'block'`, inak požiadavky vybavené service workerom obídu trasu. Stráži to Jest test `E2eServiceWorker.guard.test.ts`.
- `actionTimeout` (15 s) platí aj pre `page.waitForResponse` a časovač beží od vytvorenia sľubu, teda aj pred `page.goto`.
- Stránka `/search` posiela hľadanie pri prvom načítaní dvakrát. Pred meraním pozície alebo klikaním použi `waitForSearchSettled` (`support/search-settled.ts`).
- Chromium pri zmenšení rozloženia nad čitateľom posunie `scrollTop` (scroll anchoring), WebKit nie.
- Testy na Railway nič neodosielajú ani nemažú, pokiaľ to nie je výslovne dohodnuté. Odoslanie fotky v správach sa preto neskúša na Railway, ale lokálne.
- Tolerancie a timeouty meň len s dôkazom príčiny. Čakanie na stav stránky je v poriadku, predĺženie času „pre istotu“ nie.

## Otvorené nálezy, ktoré sa týkajú testov

Podrobnosti sú v `docs/zoznam-nalezov/ZOZNAM.md`:

- 209: sedem testov čaká na testovacie údaje na Railway (pripraví majiteľ).
- 216: stránka `/search` posiela hľadanie dvakrát (chyba aplikácie, rieši Claude).
- 219: dôkazy pri páde bez časového limitu pre snímku stránky (`page.evaluate`) a text hlášky v `search-settled.ts`.
- Register: položky v balíku „Nástroje a testy“ (napr. TEST-06, TEST-08).

## Diagnostika prípravy a relácie (30. 10. 2026)

Táto úprava nemení posledný prijatý stav, asercie, interval obnovy, retry ani timeouty aplikácie/testov. Nie je opravou príčiny predchádzajúcich 401/403 alebo nedokončených požiadaviek.

- Štrnásť špecov z posledných pádov používa `support/diagnostic-test.ts`. Automatický fixture zapne `observePage` pred `beforeEach`, teda aj pred prípravou údajov. Pri páde vytvorí jediný `[E2E-EVIDENCE]` blok a textovú prílohu; PASS, očakávaný pád a SKIP dôkazy nevytvárajú. Pôvodné ručné evidence hooks v troch search špecoch sú nahradené fixture; guard asercie zostali.
- Zber snímky stránky aj priloženie vlastných dôkazov majú samostatný rozpočet 1000 ms. To nie je predĺženie ani skrátenie limitu pôvodnej asercie. Chyba diagnostiky sa neprepisuje do výsledku testu.
- Nové výpisy používajú iba povolené statické segmenty ciest, názvy parametrov, HTTP metódy, stavy, kategórie, počty a časy. Neznámy segment je `:other`, neznámy parameter `:param`. Hodnoty parametrov sa nevypisujú; pri `q` zostáva len dĺžka.
- `support/session-diagnostics.ts` vedľa prihlasovacieho súboru ukladá iba anonymný `session-diagnostics.json` do ignorovaného `e2e/.auth/`. Nikdy nečíta cookies ani samotný storageState. Generácia rastie po úspešnom zápise stavu, nie po samotnom refreshi. Zaznamenáva najviac 40 udalostí obnovy/zápisu s časmi a bezpečnými stavmi; chýbajúci alebo poškodený sidecar znamená `snapshot=unavailable`.
- `[E2E-CONTEXT]` označuje prvé pozorovanie **už vytvoreného** kontextu a snímku pri páde. `[E2E-SESSION] relation=temporal-only` výslovne nepreukazuje, aké cookies kontext skutočne dostal. Sidecar je asynchrónny časový snímok a môže za zápisom zaostávať. Žiadne hashe tokenov, ID účtov ani obsah relácie sa nepridávajú.
- Diagnostikované špecy majú vypnuté trace, screenshot aj video. Fixture nastavuje `PLAYWRIGHT_NO_COPY_PROMPT`, pretože Playwright 1.63 inak automaticky číta `ariaSnapshot` do `error-context.md` aj pri vypnutom trace. Toto správanie stráži izolovaný self-test. **Štandardný Playwright report môže stále obsahovať pôvodné texty chýb alebo matcher errorContext. Na zdieľanie sú určené len whitelistované vlastné bloky, nie surové reporty a prílohy.**
- Global setup pri neúspešnom prihlásení nevypisuje ani nečíta text hlášky formulára. Počet prihlasovacích pokusov a pôvodná podmienka úspechu sa nemenia.

### Lokálne kontroly diagnostiky bez aplikácie a prihlásenia

Súbory v `e2e/diagnostics-tests/` používajú prípony `.check.ts` a `.scenario.ts`, nie `.test.ts` alebo `.spec.ts`; samotná diagnostika preto nepridáva varianty do hlavného produkčného behu. Node kontroly nespúšťa Jest. Izolovaná konfigurácia nemá globalSetup, nečíta `.env.e2e`, používa prázdny inline storageState a všetky požiadavky synteticky zachytáva na rezervovanej doméne `.invalid`. Nejde o funkčné testovanie aplikácie na lokálnom serveri.

Z `frontend` na Windows s bežiacim Dockerom:

```powershell
$env:E2E_DIAGNOSTICS_DOCKER='1'
$diagnosticChecks = Get-ChildItem -LiteralPath e2e/diagnostics-tests -Filter '*.check.ts' | ForEach-Object FullName
node node_modules/tsx/dist/cli.mjs --test --test-reporter=spec @diagnosticChecks
Remove-Item Env:E2E_DIAGNOSTICS_DOCKER
```

Docker self-test pripája nainštalované knižnice iba na čítanie a spúšťa ich presnú verziu bez doinštalovania cez npx. Overuje WebKit desktop, WebKit mobil a Chromium. Jeho **vnútorný** beh má zámerne 3 PASS / 3 FAIL / 3 SKIP: každý FAIL je riadený pád `beforeEach`, ktorý musí zostať neúspešný a vytvoriť presne jeden bezpečný dôkaz. Vonkajší kontrolný test má prejsť. Toto nie je nový produkčný výsledok ani oslabenie asercie.

Ďalší celý beh proti Railway spustiť až po potvrdení aktuálneho nasadenia a zákazu zlučovania počas behu; porovnávať podľa pravidla vyššie. Register nálezov a pridelenie čísel zostávajú v správe Claude.

## Testová oprava profilových adries (30. 10. 2026)

Základ vetvy `e2e/profilove-adresy`: potvrdený a nasadený main `e3ed0f4235f630cc9686dbccef7357f9485fda9e`. Nový main obsahuje Django 5.2.18, DRF 3.18.3 a backendové testovacie zmeny, nie zmenu frontendu. Rýchly hasher je iba pre pytest; produkčné E2E prihlásenie nemení.

- Pôvodný helper v `mobile-language-header.spec.ts` odmietal bodky v slugu, hoci ich backend generuje. Neprávom tak volil numerické ID. `support/own-profile-paths.ts` teraz overí vlastnú identitu, použije platný kanonický slug a numerický fallback dovolí iba pri chýbajúcom historickom slugu. Chybný prítomný slug vyvolá bezpečnú chybu bez jeho hodnoty.
- `support/own-profile-fixture.ts` prenáša z odpovede iba stav a vlastné ID/slug, nikdy ich neloguje. Overenie návratu porovná presnú doménu a cestu, nie prefix ani inú sekciu. Query a fragment nie sú predmetom kontroly sekcie; testy filtrov sa nemenia.
- Zo štyroch rozpracovaných lokálnych úprav pôvodného špecu sa týmto rieši bodkovaný slug a kontrola profilovej cesty. Náhrada `tap` za `click` ani presun čakania na locale sa nepreberajú: samy nedokazujú opravu samostatného problému prepínania jazyka/tlačidla Späť. Pôvodná pracovná kópia a jej staged zmeny ostali nedotknuté.
- `profile-numeric-language.spec.ts` samostatne stráži numerický hlboký vstup, dva režimy a zamýšľanú kontrolu po F5. Aplikačný pád nie je označený `test.fail`, vypnutý ani maskovaný zmenou adresy; skip zostáva iba pre iný typ obrazovky. Blokujú sa zápisy API okrem obnovy relácie.
- Pribudol jeden produkčný špec: aktuálna kolekcia má **42 špecov / 738 variantov**, po 246 na projekt. Samotné diagnostické kontroly sa do nej nezbierajú. Posledný prijatý celý beh **427 / 2 / 303 sa nemení**; toto nie je nový celý ani prijatý beh.

### Overenie opravy testov

Cielený beh cez kanonický Docker skript, `--workers=1 --retries=0`, výber `profile-section|language app Back and browser Back|desktop: retains|číselná adresa`:

| Projekt | Prešlo | Padlo | Preskočené | Trvanie projektu |
| --- | ---: | ---: | ---: | --- |
| webkit-desktop | 12 | 0 | 16 | 24,6 s |
| webkit-mobile | 13 | 3 | 12 | 1 min 58,6 s |
| chromium-desktop | 12 | 0 | 16 | 12,8 s |
| **Spolu** | **37** | **3** | **44** | **2 min 52,8 s** |

Celkové trvanie procesu vrátane spustenia: 2 min 59 s. Preskočené varianty sú určené pre iné rozloženie.

Všetky tri pády sú nové kľúče oproti prijatému porovnaniu; nejde o známe pády č. 1–4. Numerické varianty sú nové pokrytie už skôr pozorovaného problému, nie dôkaz novej regresie alebo dôsledku aktualizácie Django. Cielene sa zopakovali po trikrát v projekte `webkit-mobile`, bez automatických retry. Diagnostické opakovanie trvalo 1 min 47,7 s a nemení pôvodný výsledok:

| Špec a test | Výsledok troch opakovaní | Rozlíšenie |
| --- | --- | --- |
| `mobile-language-header.spec.ts` — `Language header – pl / dark › mobile: profile-section has one centered title, no profile shortcut, and six choices` | PASS / PASS / PASS | Pôvodne zlyhal prípravný GET `/api/auth/me/`; opakovania neoprávňujú príčinu označiť za opravenú. |
| `profile-numeric-language.spec.ts` — `mobile: light číselná adresa zachová jazykovú podstránku aj po F5` | FAIL / FAIL / FAIL | Dvakrát strata jazykovej podstránky, raz zlyhanie siete už počas prípravy. |
| `profile-numeric-language.spec.ts` — `mobile: dark číselná adresa zachová jazykovú podstránku aj po F5` | FAIL / FAIL / FAIL | Trikrát strata jazykovej podstránky; v úvodnom behu zlyhala sieťová príprava. |

Lokálne kontroly: **43/43** Node kontrol vrátane izolovaného Docker self-testu diagnostiky v troch projektoch, **71/71** existujúcich Jest kontrol infraštruktúry, TypeScript aplikácie aj explicitne oboch produkčných špecov a `git diff --check` prešli. Nový čistý pomocník má pokrytie **100 % riadkov, 97,44 % vetiev, 100 % funkcií**; nie je to údaj o pokrytí celej aplikácie. Lokálne kontroly pracujúce so súbormi sa na Windows spúšťali mimo obmedzenia, ktoré blokovalo premenovanie dočasných súborov.

### Podklad chyby aplikácie pre Claude

**Názov:** Numerická adresa vlastného profilu stratí jazykovú podstránku.

**Špec/projekt:** `profile-numeric-language.spec.ts`, oba režimy, `webkit-mobile`.

**Kroky:** Prihlásený vlastník otvorí `/dashboard/users/:id/language` cez svoje číselné ID.

**Očakávané:** Jazyková podstránka ostane otvorená, prípadne sa zmení len identifikátor na kanonický slug so zachovaním `/language`.

**Skutočné:** Po úvodnej kanonizácii ostane základný profil `/dashboard/users/:id` s parametrom `tab`, jazyková hlavička chýba. Etapa F5 sa kvôli tomuto prvému pádu ešte neoverila.

**Opakovateľnosť:** **6/6 pokusov, ktoré dokončili prípravu a otvorili numerický vstup**, spojené oba režimy a oba behy. Ďalšie 2/8 numerických pokusov skončili už pri sieťovej príprave; nie sú dôkazom tohto UI problému.

**Podozrivé miesto, nie zásah Codexu:** route `frontend/src/app/dashboard/users/[userId]/language/page.tsx` podporuje ID aj slug. V `frontend/src/components/dashboard/hooks/useDashboardUserProfile.tsx:234` sa však počiatočná podsekcia aplikuje len pri zhode so slugom; vetva numerickej kanonizácie pri riadkoch 342–345 zvolí základný profil. Overí a opraví Claude na svojej vetve.

Reprezentatívny bezpečný blok z opakovania numerického vstupu:

```text
[E2E-EVIDENCE] Numerický vstup do vlastného jazyka › mobile: light číselná adresa zachová jazykovú podstránku aj po F5 | webkit-mobile | 11.3 s
url: /dashboard/users/:id [tab]
page state: readyState=complete viewerReady=true loadingMarkers=0 panelAriaHidden=n/a
document timing (ms since navigation start): domContentLoaded=225 load=288
scroll root: scrollTop=0 scrollHeight=1610 clientHeight=659
active element: [omitted]
requests (ms since test start):
17  GET  /dashboard  200  109 ms
458  GET  /api/auth/me/  200  95 ms
617  GET  /api/auth/feed/posts/  200  179 ms
619  GET  /api/auth/messaging/conversations/unread-summary/  200  141 ms
622  GET  /api/auth/notifications/unread-count/ [type]  200  130 ms
925  GET  /api/auth/me/  200  81 ms
1011  GET  /dashboard/users/:id/language  200  81 ms
1311  GET  /api/auth/me/  200  97 ms
1451  GET  /api/auth/dashboard/users/:id/skills/  200  152 ms
1454  GET  /api/auth/messaging/conversations/unread-summary/  200  139 ms
1456  GET  /api/auth/notifications/unread-count/ [type]  200  140 ms
page errors: 0 | console errors: 0
[E2E-CONTEXT] moment=first-observed at=1793367092594 relation=temporal-only
[E2E-SESSION] snapshot=available observedAt=1793367092594 runStartedAt=1793367086572 generation=1 storedAt=1793367086572 relation=temporal-only
[E2E-SESSION] kind=initial-storage at=1793367086572 attempt=0 generation=1 status=n/a errorKind=n/a
[E2E-CONTEXT] moment=failure-observed at=1793367103900 relation=temporal-only
[E2E-SESSION] snapshot=available observedAt=1793367103900 runStartedAt=1793367086572 generation=1 storedAt=1793367086572 relation=temporal-only
[E2E-SESSION] kind=initial-storage at=1793367086572 attempt=0 generation=1 status=n/a errorKind=n/a
```

Samostatne zostáva neurčená príčina občasného sieťového zlyhania už pri príprave. Z blokov je preukázaná neúspešná požiadavka, nie pôvod chyby v Railway, prehliadači alebo aplikácii. Nezvyšovali sa timeouty, nepridali sa retry ani náhradné prihlasovanie. Reprezentatívny blok:

```text
[E2E-EVIDENCE] Language header – pl / dark › mobile: profile-section has one centered title, no profile shortcut, and six choices | webkit-mobile | 23.7 s
url: /dashboard
page state: readyState=complete viewerReady=true loadingMarkers=0 panelAriaHidden=n/a
document timing (ms since navigation start): domContentLoaded=262 load=487
scroll root: scrollTop=0 scrollHeight=10515 clientHeight=640
active element: [omitted]
requests (ms since test start):
21  GET  /dashboard  200  161 ms
569  GET  /api/auth/me/  200  81 ms
710  GET  /api/auth/feed/posts/  200  119 ms
712  GET  /api/auth/messaging/conversations/unread-summary/  200  80 ms
714  GET  /api/auth/notifications/unread-count/ [type]  200  76 ms
1069  GET  /api/auth/me/  FAILED(failed)  22609 ms
9069  GET  /api/auth/feed/posts/:n/  FAILED(failed)  14621 ms
9070  GET  /api/auth/feed/posts/:n/  FAILED(failed)  14618 ms
20714  GET  /api/auth/notifications/unread-count/ [type]  FAILED(failed)  2963 ms
20716  GET  /api/auth/notifications/unread-count/ [type]  FAILED(failed)  2962 ms
20717  GET  /api/auth/messaging/conversations/unread-summary/  FAILED(failed)  2973 ms
page errors: 0 | console errors: 22
[E2E-CONTEXT] moment=first-observed at=1793366898646 relation=temporal-only
[E2E-SESSION] snapshot=available observedAt=1793366898646 runStartedAt=1793366835236 generation=1 storedAt=1793366835236 relation=temporal-only
[E2E-SESSION] kind=initial-storage at=1793366835236 attempt=0 generation=1 status=n/a errorKind=n/a
[E2E-CONTEXT] moment=failure-observed at=1793366922341 relation=temporal-only
[E2E-SESSION] snapshot=available observedAt=1793366922341 runStartedAt=1793366835236 generation=1 storedAt=1793366835236 relation=temporal-only
[E2E-SESSION] kind=initial-storage at=1793366835236 attempt=0 generation=1 status=n/a errorKind=n/a
```

**Ďalší krok:** majiteľ odovzdá aplikačný podklad Claudovi. Po jeho oprave a potvrdenom nasadení sa zopakuje číselný vstup vrátane F5 a dotknuté profilové návraty; až následný celý beh môže aktualizovať prijatý porovnávací stav. Táto dávka neopravuje predchádzajúci nález pri samotnom prepínaní jazyka/tlačidle Späť.

## Ako nahlásiť chybu aplikácie

Pozri koniec `AGENTS.md`. Krátky popis pošle majiteľovi, ten ho odovzdá Claudovi.
