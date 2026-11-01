# Playwright: odovzdanie (stav k 31. 10. 2026)

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

## Porovnanie jazykového špecu a diagnostika ťuku (31. 10. 2026)

Základ: čerstvo overený main `e261243825a4625f6bfd38079aa4ecd0d5d3c660`, majiteľom potvrdené nasadenie a zákaz zmien počas porovnania. Toto nie je nový celý ani prijatý beh; porovnávací stav **427 / 2 / 303 sa nemení**.

- V jednom fyzickom Docker kontajneri s Playwright 1.63.0 prebehli striedavo tri spustenia historického `mobile-language-header.spec.ts` z `9346520e` a tri spustenia aktuálneho špecu. Každé vybralo iba dva testy `mobile: light/dark language changes update the top title and survive reload`, projekt `webkit-mobile`, `--workers=1 --retries=0`.
- Historická kópia mala zhodný Git blob `e517a74f9c331975718b4342863cecf51d0ab323`; aktuálna pred doplnením diagnostiky `29ba48d8de013657c1f728dcac3fdde1eb688eed`. Ostatné závislosti, konfigurácia, pomocníci, preklady a nasadená aplikácia boli spoločné aktuálne. Nešlo o spustenie celej historickej aplikácie ani celého historického testového prostredia.
- Starý špec: svetlý **FAIL/FAIL/FAIL**, tmavý **FAIL/FAIL/FAIL**. Aktuálny špec: svetlý **FAIL/FAIL/FAIL**, tmavý **FAIL/FAIL/FAIL**. Všetkých 12 pokusov skončilo na rovnakej asercii pre preložené tlačidlo Späť (historicky riadok 77, aktuálne pred diagnostikou 60). Porovnanie nepotvrdilo regresiu zavedenú novším špecom; samo osebe nerozhoduje medzi pôvodnou chybou testu a aplikácie/prehliadača.
- A/B beh trval 3 min 26 s (2026-10-31 06:54:57.272–06:58:23.312 UTC). Dočasná historická kópia bola odstránená; hlavná kolekcia zostáva **42 špecov / 738 variantov**.

`support/language-tap-diagnostics.ts` teraz pasívne sleduje iba šesť mobilných jazykových volieb v uvedených dvoch testoch. Nevyvoláva ani neruší udalosti, nevolá API, nečíta cookies či texty stránky a nič neukladá do úložiska. Výstup `[E2E-TAP]` povoľuje len enumy, booleany, počty a časy (najviac 80 udalostí). Medzi pôvodným `.tap()` a aserciou nie je nové čakanie ani náhradná akcia. Snímky vznikajú až po aserciách pred F5 a vo `finally`; samostatné rozpočty diagnostiky nemenia limit asercie a jej chyba nezakryje pôvodný pád.

Následné tri diagnostické vykonania každého variantu (`--repeat-each=3 --retries=0`) dali **0 PASS / 6 FAIL / 0 SKIP**, 118 s procesu:

- V piatich pokusoch pozorovateľ zachytil dôveryhodné pointer/touch udalosti pre SK aj CZ, ale žiadny `click`. Úložisko aj označená voľba ostali SK; asercia českého tlačidla Späť preto neprešla. Prečo `click` nevznikol, ešte nie je preukázané; samotné `preventDefault` ani chybu prekladu z týchto údajov nemožno označiť za príčinu.
- Posledný tmavý variant sa odlišoval: po úvodnej voľbe SK skončilo čakanie na locale; zachytili sa sieťové chyby, následné 401 a POST `/api/token/refresh/` 403. Snímka pádu **2026-10-31 07:10:09.741 UTC**. Nezlučovať automaticky s príčinou chýbajúceho kliku; súvis s nálezom 223 má preveriť Claude.

Lokálne kontroly: 11 Node kontrol formátu/súkromia a zachovania gesta, izolovaný self-test vo WebKite desktop, WebKite mobile a Chromiu (**3/3 PASS**), explicitný TypeScript E2E súborov, TypeScript aplikácie a cielený ESLint s `next/core-web-vitals`. Izolovaný self-test nečíta `.env.e2e`, nemá prihlasovanie a všetky požiadavky vybaví na `diagnostic.invalid`.

Ďalších päť produkčných špecov sa podľa zadania nemenilo. Diagnostika je podklad, nie oprava aplikácie, dôkaz celkovej chyby aplikácie ani dôvod nahradiť `.tap()` za `.click()`. Ďalší krok: oddelene overiť, prečo tento WebKit nevytvorí `click`, bez oslabovania pôvodného scenára; autentifikačné dôkazy odovzdať majiteľovi pre Claude.

## Nálezy 225 a 223 — izolovaný pokus a sieťová sonda (31. 10. 2026)

Základ tejto pokračujúcej úlohy je nový main `0905aeddf284b41ccaf879ba079683dcf6ac3261` (PR #217), majiteľom potvrdený ako nasadený a bez zmien počas merania. Predchádzajúce poznámky vyššie sú historické výsledky pred týmto pokusom. Prijatý celý stav **427 / 2 / 303 sa nemení**.

### 225 — podmienka výnimky sa potvrdila

- `diagnostics-tests/language-properties.scenario.ts` je samostatný pokus na `diagnostic.invalid`, nie produkčný regresný špec. Porovnáva natívne DOM a React 18 tlačidlo v troch kolách: bez vlastností, iba `tabindex=-1`, iba `pointerdown.preventDefault`, obe vlastnosti. Mobilný WebKit skúša tap aj click, desktopový WebKit a Chromium click ako kontrolu. Spolu 96 pozorovaní; všetky tri projekty dokončili pokus. Pevné 500-ms okno iba meria udalosti izolovaného pokusu, nemení produkčný timeout.
- Pri mobilnom tap sa click vytvoril 3/3 bez vlastností a 3/3 s iba tabindex, ale 0/3 s preventDefault aj 0/3 s oboma vlastnosťami, zhodne pre natívne aj React tlačidlo. Handler preventDefault sa skutočne vykonal. Priamy click fungoval všade 3/3; desktopové kontroly tiež.
- Majiteľ potvrdil, že na skutočnom iPhone jazyk funguje, a výslovne povolil click iba po takomto preukázaní. Preto sa **iba krok výberu jazykovej voľby** v dvoch testoch `mobile: light/dark language changes update the top title and survive reload` mení na `.click()` s komentárom a odkazom na 225. Nie ticho, nie globálnou náhradou tap, nie zmenou aplikácie. Ostatné gestá, asercie vrátane šiestich jazykov a F5, tolerancie, timeouty a retry ostali nezmenené. Lokálny guard stráži zdôvodnenie aj pôvodné asercie.
- Cielené overenie proti potvrdenému nasadeniu: webkit-mobile, oba varianty po trikrát, workers=1, retries=0: **6 PASS / 0 FAIL / 0 SKIP**, report 42,0 s, proces približne 50 s. Toto nie je nový celý beh.

### 223 — mimo Playwrightu sa výpadok nezopakoval

- `diagnostics-tests/railway-network.probe.cjs` používa iba Node https: verejné GET `/` a `/api/`, približne každých 10 s, strieda nové a keep-alive spojenia, deadline 30 s. Bez prihlasovania, cookies, čítania .env, tiel a hlavičiek odpovedí, presmerovaní alebo automatických retry. Výstup sú len pevné kategórie, stavy a časy DNS/TCP/TLS/prvého bajtu/celku.
- Node sonda aj izolovaný browser pokus vyššie bežali v tom istom kontajneri s Playwright 1.63.0. UTC **2026-10-31 13:06:15.750–13:16:15.898**, monotónne 600 288 ms: **122/122 HTTP 200**, **0 transportných chýb**, **0 timeoutov**, **0 volaní nad 10 s**. Dve merania prekročili 2 s, maximum bolo 2 843,6 ms. Existujúce spojenie sa reálne použilo 58×. Kontajner sa po sonde odstránil.
- Mediány frontend nové/keep-alive: 239,9/104,6 ms; API nové/keep-alive: 189,6/74,7 ms. Maximum API 2 775,2 ms. Všetky stavy sa počítajú, HTTP chyba sa odlišuje od transportnej.
- Toto zužuje ďalšie preverovanie, **nepreukazuje však definitívne príčinu vo WebKite alebo relácii**. Verejné Node volanie bez autentifikácie netestuje JWT obnovu ani úplne rovnaký prehliadačový protokol a aplikačnú cestu. Nález 223 sa neuzatvára. Následné overenie dvoch produkčných jazykových testov bežalo samostatným kanonickým Docker skriptom s rovnakým obrazom, nie s prihlasovacími údajmi v sonde.

Lokálne kontroly: 5/5 Node testov sondy (aj vynútený timeout a chyby bez siete), 11/11 kontrol diagnostiky a výnimky 225, cielený aj úplný TypeScript aplikácie a cielený ESLint. Hlavná kolekcia zostáva 738 variantov v 42 špecoch; produkčné `.spec.ts` varianty nepribudli. Register nálezov vlastní Claude a v tejto dávke sa nemenil.

### 224 — vedome odložené

Nález „Zatvoriť po F5 vedie na Nástenku“ sa teraz neopravuje ani sa nepridáva produkčný test pred odloženou opravou. Pri budúcej oprave treba pripraviť samostatný E2E scenár: **vlastný profil → Menu → Jazyk → F5 → Späť → Zatvoriť → pôvodný profil**, nie Nástenka, a jeho úspech overiť po potvrdenom nasadení opravy. Ide o budúcu úlohu; neopomenúť F5 ani záverečné Zatvoriť.

Ďalší krok pre 223: porovnať verejné volania zo samotného WebKitu a z Node v rovnakom čase, prípadne následne samostatne preveriť reláciu. Ďalších päť odložených produkčných špecov zostáva nezmenených. Nič sa nezlučuje ani nenasadzuje automaticky.
