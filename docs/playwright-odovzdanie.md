# Playwright: odovzdanie (stav k 9. 11. 2026)

Táto strana je pre agenta, ktorý má na starosti Playwright (Codex). Pravidlá spolupráce sú v `AGENTS.md`. Po každom prijatom behu (pozri nižšie) agent aktualizuje tabuľku stavu a zoznam známych pádov. Zmeny dáva do jednej vetvy naraz, nie po každom behu zvlášť.

## Aktuálny prehľad — 9. 11. 2026

Aktuálna spoločná vetva je **`e2e/209-diagnostika`**: obsahuje kód diagnostiky
aj zjednotené odovzdanie s návrhom dymovej sady. Pôvodná `e2e/dymova-sada`
a PR #248 zostávajú iba predchádzajúcou revíziou na porovnanie. Súvisiace
ďalšie opravy sa pridávajú ako commity do tej istej diagnostickej vetvy.

Zjednotené odovzdanie: celý beh na `5bf32b26` **383 PASS / 22 FAIL / 351 SKIP**,
tri diagnostické opakovania každého nového pádu, nové dôkazy 223, doplnenie
ku K14, návrh sedem- až osemsúborového dymu s príkazmi a podmienený test 320.
Prijatý základ ostáva **427 / 2 / 303**; nový beh nie je prijatý. Výsledky nie
sú opravou aplikácie a plánované testy nie sú označené za hotové.

## Ako sa beh spúšťa

- Testy sú v `frontend/e2e/` (43 špecov, pomocníci v `frontend/e2e/support/`). Beží ich Playwright, Jest ich nezbiera.
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

Rovnaký súčet dali tri samostatné behy: `chromium-desktop` 130 / 0 / 114, `webkit-mobile` 168 / 1 / 75, `webkit-desktop` 129 / 1 / 114 (prešlo / padlo / preskočené). Preskočené sú väčšinou testy určené pre iný typ obrazovky. Oprava poznámky po kontrole pôvodného výpisu 8. 11.: sedem scenárov 209 v tomto prijatom behu prešlo; historické chyby prípravy z 28. 10. sa s týmto výsledkom nesmú zamieňať.

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

- 209: historické chyby prípravy siedmich scenárov; v prijatom výpise z 29. 10. všetky prešli. Po znovuvytvorení hlavného účtu sú 8. 11. testovacie dáta opäť neúplné (pozri nižšie). To neurčuje príčinu každého pôvodného pádu.
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

## Odpovede servera a odmietnutá obnova — nález 223 (6. 11. 2026)

Základ vetvy `e2e/223-dokazy`: aktuálny main `2e84867e`. Mení sa iba diagnostika E2E, nie aplikácia, prihlásenie, asercie, retry ani časové limity testov. Táto úprava nie je opravou príčiny 223 a nemení prijatý celý porovnávací stav.

### Nové polia v bloku `[E2E-EVIDENCE]`

Pôvodný riadok požiadavky ostáva nezmenený. Pod ním sa pri **každej prijatej odpovedi obnovy** `/api/token/refresh/` (aj historický alias `/api/auth/token/refresh/`) a pri **každej pozorovanej odpovedi s trvaním striktne nad 5000 ms** doplní:

```text
        X-App-Duration-Ms: 12
```

- Číta sa len táto jedna hlavička, nie celé hlavičky či telo. Uchová sa iba nezáporné celé bezpečné číslo; hodnota `0` je platná. `chýba` znamená chýbajúcu alebo neplatnú číselnú hodnotu, `nezistiteľné` neúspešné alebo neukončené odčítanie. Surová hodnota neplatnej hlavičky sa nikdy nevypíše.
- Bežné trvanie požiadavky je meranie z prehliadača; `X-App-Duration-Ms` je odlišné meranie spracovania v Djangu. Rozdiel sám neurčuje príčinu problému.
- Hlavičky sa odčítajú pri udalosti odpovede, nie až po tele. Ak hlavičky prišli, ale telo ešte visí dlhšie než 5 s, serverové trvanie zostáva dostupné. Požiadavka bez prijatej odpovede ostáva `pending`, bez vymyslenej serverovej hodnoty.
- Zachová sa posledných 40 bežných záznamov **aj všetky staršie prijaté obnovy/pomalé odpovede**, aby podstatná odpoveď nezmizla za neskorším pollingom. Súčet `older omitted` odráža iba skutočne vynechané riadky.

Len pri odpovedi **401 alebo 403 na obnove** navyše:

```text
        refresh cookies: access_token,auth_state,csrftoken,refresh_token
        refresh X-CSRFToken: áno
```

- `refresh cookies` obsahuje jedinečné zoradené **názvy**, nikdy hodnoty, domény, cesty ani expirácie. Odčítanie kontextu sa začne súbežne s hlavičkou hneď pri pozorovaní odmietnutej odpovede. Je to asynchrónny snímok kontextu v tomto čase, nie dôkaz cookies skutočne odoslaných v hlavičke `Cookie`.
- Pevné povolené názvy: `access_token`, `refresh_token`, `auth_state`, `csrftoken`, `sessionid`, `google_oauth_state`, `google_oauth_nonce`, `csrf_token`, aj ich prefixy `__Host-` a `__Secure-`. Neznámy názov sa vypíše iba ako `other`, pretože aj názov môže niesť identifikátor. `žiadne` znamená úspešne odčítaný prázdny zoznam, `nezistiteľné` neúspešné odčítanie. Hodnota cookie sa neprečíta do vlastného diagnostického záznamu.
- `refresh X-CSRFToken` patrí k **požiadavke danej odmietnutej odpovede**: `áno` = hlavička bola prítomná (aj prázdna), `nie` = preukázateľne chýbala, `nezistiteľné` = nedala sa odčítať. Hodnota tokenu sa nikdy neuchová ani nevypíše.
- Úspešná obnova ani iná odpoveď 401/403 cookies či CSRF neodčítavajú. Nepoužíva sa `allHeaders`, telá, text odpovede ani ukladanie celého kontextu.

Odčítania majú vlastný rozpočet 1000 ms, začínajú súbežne a neblokujú sieťové požiadavky ani pôvodné asercie. Report čaká na rozpracované odčítania súbežne s už ohraničenou snímkou stránky, nie sériovo. Chyba odčítania ani zatvorený kontext neprekryjú pôvodný pád. Zdieľacie nástroje, ktoré whitelistujú riadky dôkazov, musia zachovať aj tri nové vyššie opísané riadky; nesmú kvôli tomu povoľovať surové hlavičky.

### Lokálne overenie bez Railway

Pomocníci: `support/response-diagnostics.ts` a `response-diagnostics-format.ts`. Nové kontroly sú v `diagnostics-tests/response-diagnostics.check.ts`; izolovaný browser pokus má samostatný `.scenario.ts`, konfiguráciu a `response-diagnostics-browser.check.ts`. Nepridáva produkčné varianty, nečíta `.env.e2e`, nemá global setup ani účet a všetky požiadavky synteticky zachytí na `diagnostic.invalid`.

Z `frontend`:

```powershell
node node_modules/tsx/dist/cli.mjs --test --test-reporter=spec e2e/diagnostics-tests/response-diagnostics.check.ts e2e/diagnostics-tests/page-activity.check.ts
node node_modules/tsx/dist/cli.mjs --test --test-reporter=spec e2e/diagnostics-tests/response-diagnostics-browser.check.ts
```

Kontroly zahŕňajú chýbajúcu/neplatnú hlavičku, hranicu 5000/5001 ms, pomalé nedokončené telo, všetky tri stavy CSRF, prázdne či neodčítateľné cookies, ochranu starších odpovedí aj výpis a prílohu. Cookie s getterom `value`, ktorý by test zhodil, dokazuje, že sa číta iba `name`; súkromné syntetické značky nesmú byť ani vo výpise, ani v prílohe. Browser pokus kontroluje 401, 403, úspešnú obnovu a skutočne oneskorenú syntetickú odpoveď vo WebKite desktop, WebKite mobile a Chromiu. Docker dostane knižnice iba na čítanie; surový report sa nevypisuje.

Dlhý ani prihlasovaný beh proti Railway sa v tejto úlohe nespúšťa. Pri 223 sa naďalej čaká na HTTP logy Railway.

Lokálne overenie: 42/42 Node kontrol novej diagnostiky a existujúcich page/deadline/session poistiek, 52/52 existujúcich Jest kontrol formátu a service workerov, TypeScript aplikácie aj explicitne nových E2E súborov, cielený ESLint a `git diff --check` prešli. Nové dva pomocníky majú 97,98 % riadkov / 96,39 % vetiev / 100 % funkcií; nejde o pokrytie celej aplikácie. Izolovaná browser kontrola prešla 3/3 projektov. Existujúci self-test fixture navyše zachoval svoje riadené PASS/FAIL/SKIP a po jednom bezpečnom bloku pri úmyselnom páde prípravy. Kolekcia na tomto maine má 43 špecov / 756 variantov, po 252 na projekt; táto diagnostika nepridáva produkčné testy.

## Počty prvej stránky konverzácií — 209(b), 8. 11. 2026

`messages-peer-profile.spec.ts` zachováva pôvodný výber aj tvrdé chyby prípravy.
`requirePeerConversation` nad jedinou pôvodnou odpoveďou API priloží a vypíše:

```text
[E2E-PEER] firstPage=4 slugMatches=1 deletedMatches=0 namedMatches=1 nameMatches=1
```

- `firstPage`: všetky konverzácie na prvej stránke, bez načítania ďalšej.
- `slugMatches`: priame konverzácie so zhodou nakonfigurovaného slugu.
- `deletedMatches`: koľko týchto zhôd má pravdivý príznak odstránenia.
- `namedMatches`: koľko zhôd nie je odstránených a má neprázdne meno.
- `nameMatches`: počet priamych aj skupinových riadkov s menom pôvodného prvého
  aktívneho kandidáta (bez odstránených používateľov). Bez mena je 0.

Do diagnostiky nikdy nejde ID, meno, slug, telo odpovede ani hodnoty cookies.
Chybné diagnostické hodnoty majú iba pevný výstup `counts=unavailable`; chyba
prílohy nemení pôvodný výsledok. Priloženie má samostatný rozpočet 1000 ms.
Špec používa existujúci bezpečný evidence fixture vrátane prípravy; pri páde
nevytvára screenshot, trace ani textový snímok stránky.

Počty v Správach samy nepotvrdzujú dostupnosť verejného profilu. Odpoveď
„vidí profil E2E_PEER_SLUG: áno/nie“ treba doložiť profilovým krokom alebo
samostatne dohodnutým čítaním jeho prístupnosti. Súkromie je platný stav, nie
automaticky chyba aplikácie či nestabilita prostredia; účet sa kvôli testu
automaticky neprepína na verejný.

Lokálne kontroly bez env, prihlásenia a siete Railway:

**Podmienka:** nasledujúce dva príkazy vyžadujú kód z
`e2e/209-diagnostika` (teraz spoločná vetva) alebo main až po jeho zlúčení.
V pôvodnej samostatnej `e2e/dymova-sada` na `d8e2b566` tieto súbory neboli.
Najprv treba získať správnu vetvu/revíziu a závislosti podľa zámku; až potom
spustiť príkazy z jej `frontend`. Nie sú samostatne použiteľným návodom pre
čistý checkout pôvodnej dokumentačnej vetvy.

```powershell
node node_modules/tsx/dist/cli.mjs --test --test-reporter=spec e2e/diagnostics-tests/peer-conversation.check.ts
node node_modules/tsx/dist/cli.mjs --test --test-reporter=spec e2e/diagnostics-tests/peer-conversation-browser.check.ts
```

Izolovaný browser pokus zachytáva všetky požiadavky na syntetickej `.invalid`
a overuje aj serializáciu helpera cez `page.evaluate` vo všetkých troch
projektoch. Nepridáva varianty do hlavného produkčného behu.

### Pokus o celý beh na main `92fb1b7d`

Majiteľ potvrdil nasadenie aj okno bez zmien. Pokus 8. 11. 2026 o
19:12:50.929 UTC cez kanonický príkaz (`workers=1`, `retries=0`) skončil
po 9 s v `global-setup.ts:44`, keď prihlasovací formulár oznámil chybu.
Nespustil sa žiadny test ani projekt; toto nie je celý ani prijatý beh,
nová chyba aplikácie alebo dôkaz nedostupnosti druhého účtu. Pôvodný
porovnávací stav ostáva nezmenený.

Bol len jeden prihlasovací pokus, bez automatického opakovania. Text
formulára ani odpoveď servera sa nečítali; `E2E-EVIDENCE` pre globálnu
prípravu nevznikol. Pred ďalším pokusom má majiteľ preveriť bežné
prihlásenie hlavného E2E účtu; ďalšie nasadenie a okno bez zmien sa
potvrdia pred pokračovaním. Dostupnosť `E2E_PEER_SLUG` zatiaľ nie je
overená, nemožno ju poctivo označiť áno ani nie.

Po výslovnej výzve majiteľa „skús teraz“ bol povolený jeden nový pokus.
Main po novom fetchi ostal `92fb1b7d`. Spustenie 8. 11. 2026 o
19:19:36.791 UTC skončilo po 6 s rovnakým výsledkom `alert` v globálnej
príprave (nie timeout), opäť 0 spustených testov. Nejde o automatický retry
predošlého behu ani nový výsledok kolekcie. Ďalšie prihlásenie sa nespúšťa,
kým sa nepreverí jeho príčina; samotný `alert` nedokazuje nesprávne heslo.

Pri nasledujúcom celom behu osobitne sledovať mobilné
`mobile-settings-navigation.spec.ts` a `mobile-settings-offer-watch-motion.spec.ts`
(zmenené Nastavenia v K9 a K14) a oba špecy zdieľania s kontrolou upratania
(K12, zámky pri súbehu, nález 246). HTTP 500 nesmie byť maskované ďalším mazaním.

Až potom samostatne dohodnúť vykonanie pokrytia 295: syntetické fotky do
príspevku, portfólia a ponuky s uprataním; skutočné BMP/TIFF vrátane prezlečenia
za `.jpg`; načítanie fotky prihláseného súkromného autora (274); viditeľná
náhrada po zlyhaní (279, K11). Správy iba medzi dvoma dohodnutými testovacími
účtami. Starý multipart endpoint ponúk (301) UI nevolá a týmto pokrytý nebude.
Nastavenia súkromia sa bez dohody nemenia; dostupná konverzácia automaticky
neznamená dostupný cudzí profil.

### Prihlásenie prešlo, beh bol na pokyn majiteľa ukončený

Tretí, znovu výslovne povolený pokus začal 8. 11. 2026 o 19:22:45.924 UTC
na nezmenenom maine `92fb1b7d`. Prihlásenie tentoraz prešlo. Až počas behu
majiteľ potvrdil, že hlavný E2E účet bol vymazaný a vytvorený znova, a rozhodol
beh ukončiť a najprv obnoviť testovacie dáta. Pôvodná identita a jej dáta
sa preto nesmú predpokladať ani pri zachovaní rovnakej prihlasovacej adresy.

Prvý SIGINT adresovaný vlastnému kontajneru sa neprejavil zastavením testov;
druhý bol poslaný priamo jedinému overenému Playwright CLI procesu v tomto
kontajneri. Ten skončil so stavom 130 a uložil report. Iné kontajnery,
aplikácia, testové podmienky ani súkromie účtov sa nemenili.

| Projekt | Prešlo | Padlo | Skutočný SKIP | Prerušené | Nespustené |
| --- | ---: | ---: | ---: | ---: | ---: |
| webkit-desktop | 88 | 14 | 150 | 0 | 0 |
| webkit-mobile | 32 | 8 | 27 | 1 | 184 |
| chromium-desktop | 0 | 0 | 0 | 0 | 252 |
| **Spolu** | **120** | **22** | **177** | **1** | **436** |

Proces trval 17 min 32 s; report 17 min 26,3 s. Desktopový WebKit 13 min
1,3 s, mobilný 4 min 12,6 s; Chromium nezačal. Štandardný HTML súčet SKIP
zahŕňa aj nevykonané a prerušené prípady; tabuľka ich odlišuje podľa
skutočných výsledkov pokusov. Toto **nie je celý ani prijatý porovnávací
beh**. Pôvodný stav 427 / 2 / 303 ostáva nezmenený. Nové pády sa na pokyn
majiteľa zatiaľ neopakovali; nie všetky sú automaticky vysvetlené dátami.

Potvrdené čiastočné výsledky:

- Hlavný účet **vidí profil E2E_PEER_SLUG: áno** — priamy scenár cudzieho
  profilu po F5 vrátane recenzií prešiel 1/1 v desktopovom WebKite. Opačný
  smer ani ostatné projekty sa tým nepotvrdzujú.
- Oba mobilné scenáre Správ skončili na príprave (2/2): zoznam konverzácií
  vrátil HTTP 200, všetkých päť počtov bolo 0. Nešlo o chybu siete, 401 ani
  403 v týchto dvoch konkrétnych pokusoch. Profilový krok sa ešte nevykonal.
- `mobile-settings-navigation.spec.ts` 1/1 a
  `mobile-settings-offer-watch-motion.spec.ts` 3/3 na mobile prešli.
- Zdieľanie z Nástenky prešlo 2/2 (WebKit desktop/mobile); všetky štyri
  známe vytvorené príspevky boli odstránené (4 kontroly HTTP 204). Zdieľanie
  z profilu zlyhalo v oboch prípadoch na riadku 78 pred otvorením dialógu a
  POST, teda nič nevytvorilo. Pri prerušení bežal nezápisový test prekladov.
  Toto samo nepotvrdzuje samostatný súbehový scenár 246.

Skutočný nový blok 209(b), zhodný v oboch pokusoch:

```text
[E2E-PEER] firstPage=0 slugMatches=0 deletedMatches=0 namedMatches=0 nameMatches=0
```

Následná inventúra o 19:43:12.339 UTC použila iba existujúcu reláciu
Playwright API klienta a GET; bez nového prihlásenia alebo čítania `.env.e2e`.
HTTP 200 potvrdil verejný hlavný účet, 0 ponúk/dopytov, 0 portfólií,
0 sledovaní, 0 konverzácií a 0 vlastných/zdieľaných príspevkov na celej
jedinej dostupnej stránke feedu. Obľúbené majú objektový formát; všeobecný
čítač zoznamov ich počet nevyhodnotil, preto sa nesmie uvádzať 0.
Neboli vytvorené nové testovacie dáta ani zmenené nastavenia.

### Obnova dát pred ďalším celým behom — najprv dohoda s majiteľom

Zo skutočných požiadaviek existujúcich špecov:

1. Hlavný účet: vlastná ponuka aj dopyt; profil musí umožniť aspoň 30 px
   posunu pre scenáre recenzií. Aspoň jedna vlastná položka portfólia.
2. Vlastná zdieľaná živá ponuka na Nástenke na prvých piatich stranách,
   ale hlbšie než 1000 px. Nesmie sa len odhadnúť jej poloha.
3. Prijatá priama konverzácia medzi novým hlavným účtom a skutočným
   druhým testovacím účtom, s aspoň jednou správou, na prvej stránke zoznamu
   a s jedinečným zobrazovaným menom. Prijatie druhou stranou dohodnúť.
4. Opakovane použiteľné sledovanie ponúk aj dopytov s živými výsledkami;
   pre otvorenie autora musí mať výsledok dostupný verejný profil.
   Ponechať voľný slot, ak majiteľ zapne voliteľné zápisové testy.
5. Obľúbený dostupný cudzí profil s jedinečným menom pre príslušné scenáre.
   Reálne vyhľadávanie musí mať dostupné karty oboch typov pre zvolené
   dotazy a krajinu (špecy majú aj predvolený dotaz `te`).

Základné dáta ešte nezaručia nulový dátový SKIP: stránkovanie Sledovaní
potrebuje aspoň 11 živých zhôd a scenáre otváracích hodín firemný profil
s hodinami. Také rozšírenie sa dohodne samostatne; nevytvárať ďalšie účty
ani rozsiahly verejný obsah len na odstránenie SKIP. Žiadna príprava nesmie
obísť autorizáciu, potichu meniť súkromie či používať účty mimo dohody.

Diagnostika 209(b) má 12/12 nových Node kontrol, 42/42 existujúcich kontrol
diagnostiky a izolované 3/3 browser projekty. TypeScript aplikácie aj
explicitných E2E súborov, cielený lint a kontrola diffu prešli. Ide len
o diagnostiku, nie opravu aplikácie alebo oslabenie testov.

## Obnovené dáta a celý beh na `5bf32b26` — 9. 11. 2026

Majiteľ potvrdil nasadenie a okno bez zlučovania, nasadení a zmien účtov.
`origin/main` bol pred behom aj po ňom `5bf32b26` (PR #246, iba dokumentácia
oproti K14 `92fb1b7d`). Vlastná vetva `e2e/209-diagnostika` ostala bez commitu
a pushu. Aplikácia, závislosti, Jest, migrácie ani register nálezov sa nemenili.

Predbežné GET overenie: verejný hlavný profil, 2 vlastné karty (ponuka/dopyt),
1 obľúbený, 2 sledovania s jednou živou zhodou každé, priama konverzácia a
dostupný profil druhého účtu (HTTP 200). Majiteľ doplnil portfólio; následný
GET potvrdil 1 položku. WebKit mobil nameral pri existujúcej živej zdieľanej
ponuke hĺbku 1428 px. Toto nepotvrdzuje všetky voliteľné dátové podmienky.

Kanonický príkaz z `frontend`, všetky tri projekty, workers=1, retries=0:

| Projekt | Prešlo | Padlo | Preskočené | Trvanie |
| --- | ---: | ---: | ---: | --- |
| webkit-desktop | 110 | 6 | 136 | 10 min 55,3 s |
| webkit-mobile | 159 | 16 | 77 | 19 min 27,6 s |
| chromium-desktop | 114 | 0 | 138 | 5 min 6,4 s |
| **Spolu** | **383** | **22** | **351** | **35 min 39,8 s** |

Proces 10:30:21–11:06:06 UTC, vrátane prípravy 35 min 45 s. Kolekcia má
756 variantov v 43 špecoch, flaky=0. Oproti prijatému stavu 427 / 2 / 303 sa
našlo všetkých pôvodných 732 variantov, žiadny nezmizol; pribudlo 24 (HTML18
a numerická adresa6). Prechody: 21 PASS→FAIL, 1 SKIP→FAIL, 55 PASS→SKIP,
10 SKIP→PASS, 2 FAIL→PASS. Oproti poslednému uloženému platnému celému behu
z 1. 11. (427 / 4 / 307, 738 variantov) pribudlo iba HTML18; všetky vtedajšie
4 pády teraz prešli. Neúplný beh z 8. 11. sa nepoužíva ako platný základ.

Všetkých 22 pádov je podľa presného kľúča špec/názov/projekt nových; žiadny
nie je známym pádom č. 1–4. Každý sa samostatne zopakoval 3× v rovnakom
Dockeri: **66 pokusov = 50 PASS / 8 FAIL / 8 SKIP**, 12 min 53 s, bez
automatického retry. Dvanásť testov malo 3× PASS; osem znovu padlo; dva
mali iba SKIP. Pôvodný výsledok 383 / 22 / 351 sa tým nemení a **beh nie je
prijatý**. Prijatý základ ostáva 427 / 2 / 303.

Opakovaný FAIL (poradie P=prešlo, F=padlo, S=preskočené):

- `search-mobile-cards`, tmavé firemné hodiny, WK mobil: S/S/F; FAIL pred
  scenárom pri GET identity. Žiadny opakovaný PASS tohto scenára.
- `offer-watch-results-handoff`, svetlý mobile→desktop app Back, WK mobil:
  P/F/P; nový FAIL pri GET sledovaní, pôvodný pri navigácii pred Back.
- `search-panel-fixture`, ponuky, WK mobil: P/F/P; po ťuku sa nepotvrdila
  profilová URL. Ľudia: P/P/F; opakovaný FAIL bol na loading markeri, teda
  v inom kroku než pôvodný. Vlastné bloky dôkazov nevznikli.
- `offer-card-review-translations`, PL/svetlý mobil: F/P/P; GET vlastných
  kariet zlyhal pred kontrolou prekladu. Vlastný blok dôkazov nevznikol.
- `offer-reviews-back`, cudzí profil po F5, WK desktop: P/P/F. Pôvodne
  neprišlo tlačidlo recenzií; pri opakovaní zlyhal vstup do recenzií pred F5
  a nasledovali 401/403. Nezamieňať s opraveným scroll scenárom 231.
- `search-country-scroll`, typing alone, WK desktop: P/F/P; zlyhanie GET
  odporúčaní a následné 401/403. Nie je preukázaná chyba krajiny.
- `search-to-offer-watches`, tmavý mobil: P/P/F; po HTML 200 sa neobjavilo
  mobilné upozornenie, viewerReady=false. Príčina inicializácie nie je dokázaná.

Iba SKIP pri opakovaní: PL/svetlý desktop `offer-card-translations` (3×
priamo potvrdený `own_card_hint_not_completed`) a tmavé prvé chybné
stránkovanie `offer-watch-pagination-errors` (3× `no_paginated_watch`,
strážca vyžaduje 11 živých zhôd). Ich pôvodné pády boli pred týmito
strážcami. SKIP nie je úspešný retest ani jednorazový pád s 3× PASS.

Z 55 nových PASS→SKIP patrí 24 desktopovým prekladom recenzií, 7 desktopovým
Like prekladom, 11 stránkovaniu, 12 upozorneniam a 1 firemným hodinám. Nie
všetky konkrétne dôvody pôvodných SKIP ostali v bezpečnom súhrne; strážca
zistený v kóde je možnosť, nie automaticky runtime dôkaz. Budúcu prípravu
dát dohodnúť aj pre návody otáčania, existujúce prečítané upozornenia a
históriu. Bez tichého dokončovania návodov či vytvárania verejného obsahu.

Potvrdené: oba konverzačné testy 209(b) PASS, hlavný účet druhý profil vidí
(áno). V oboch `[E2E-PEER] firstPage=1 slugMatches=1 deletedMatches=0
namedMatches=1 nameMatches=1`. Oba feed návraty 209(c) PASS. Mobile Settings
navigation PASS; motion Jazyk po prípravnom FAIL 3× PASS, ostatné motion2
PASS. Konkrétny scroll scenár 231 PASS vo všetkých troch projektoch. HTML
no-store 18/18 PASS, numerický vstup do Jazyk na mobile 2/2 PASS. Zdieľanie
feed/profil 6/6 PASS a všetkých 9 kontrol odstránenia známeho vytvoreného
obsahu úspešných; nejde o samostatný záťažový dôkaz súbehu 246.

### Nové dôkazy k 223, nie preukázaná príčina

WK desktop, `offer-reviews-back` opakovanie3: okno 11:15:51–11:16:17 UTC;
RSC recenzií FAILED po 14037 ms, API 401, refresh 403 približne 11:16:12.
`search-country-scroll` opakovanie2: 11:17:39–11:18:03 UTC; odporúčania FAILED
po 20105 ms, API 401, refresh 403 približne 11:18:01. Obe odmietnuté obnovy
majú `X-App-Duration-Ms: 1`, cookies kontextu `žiadne`, CSRF hlavičku `áno`.
Časy požiadaviek sú približné z klienta. Zoznam cookies pri odpovedi nie
je dôkazom ich prítomnosti v odoslanej Cookie hlavičke ani príčiny straty.
Počas pôvodného celého behu strážca úspešne obnovil reláciu 7× bez chyby.
401/403 priebeh je zachytený 1× zo 4 pokusov na každý z týchto dvoch testov,
nie pri oboch ich pádoch. Majiteľovi poslať na porovnanie HTTP logov.

Úplná lokálna bezpečná správa (presné názvy všetkých 22 nových pádov,
opakovania, šablóny pre Claude a 20 vzniknutých blokov):
`C:/Projects/svap-e2e-vysledok-20261109.md`. Podkladové bezpečné JSON súhrny
majú prefix `C:/Projects/svap-e2e-full-5bf32b26-1794220214309` a prípony
`-details.json`, `-comparison.json`, `-diagnostic.json`, `-extra-evidence.json`.
Nie sú to surové reporty ani prílohy a nepatria do commitu.

Poznámka k exportu: pôvodný bezpečný export celého behu nezachoval číselné
X-App-Duration-Ms; ich neprítomnosť nie je dôkaz chýbajúcej hlavičky servera.
Pri cielených blokoch 223 je zachované reálne číslo1 zo samostatného čítania.
Lokálne Node kontroly diagnostiky 209(b) po behu znova 12/12 PASS.

Ďalší krok: rozhodnutie majiteľa/Claude podľa dôkazov 223 a načítania
mobilnej route; samostatne dohodnúť dátové medzery a prípadné rozšírenie
anonymnej diagnostiky pádov bez bloku. Bez súhlasu sa testy nezmäkčujú ani
opravujú. Pokrytie fotiek 295 zostáva ďalšia dohodnutá úloha, tu sa nerobilo.

### Doplnok po upozornení na K14 a plán 320 — 9. 11. 2026

Z dokončeného behu na rovnakom main `5bf32b26`: `auth-session.spec.ts`
**9/9 PASS** (po tri v každom projekte). To nie je dôkaz opravy 223: dva
odmietnuté refresh priebehy sa zachytili v iných špecoch pri opakovaniach.
Pri ich ďalšom mapovaní patrí medzi miesta na preverenie aj zmenený
`frontend/src/utils/csrf.ts`, bez tvrdenia o preukázanej príčine.

`mobile-settings-navigation.spec.ts` na WK mobile PASS, motion Jazyk mal
pôvodný FAIL na Menu pri príprave a potom 3× PASS; Sledovanie a scroll lock
PASS. **Tieto špecy neotvárajú Súkromie** (navigation: Jazyk/Upozornenia;
motion: Jazyk/Sledovanie), preto sa ich výsledok nesmie vydávať za overenie
nového PrivacySettings. V hlavnej E2E kolekcii sa nenašiel priamy scenár
Privacy/Súkromie. Kód PrivacySettings naozaj drží obe rozloženia v DOM a
CSS ukazuje jedno; budúce duplicitné textové/DOM selektory treba zúžiť na
viditeľný prvok, nie zmäkčiť asercie. Kvôli úspešnému behu sa teraz nič
neprepisovalo a nemenilo sa súkromie účtov.

Po potvrdenej oprave a nasadení **320** doplniť samostatný WebKit E2E:
stránka Zmena hesla pri `colorScheme: 'dark'` má obe polia svetlé a čitateľné.
Bez odoslania formulára a bez reálnej zmeny hesla či vyžiadania e-mailu.
Oprava 320 je v tomto main stále otvorená; nový test zatiaľ nie je hotový
ani spustený. Vetva 170 nemá priamy dopad na E2E. Overenie push 318 na
reálnom iPhone, AWS prefixov 301/304, nastavení Railway 315, rozhodnutí a
ručných testov 279/293 nie je týmto behom vykonané ani uzavreté.

### Presný zoznam 22 nových pádov a tri opakovania

P = prešlo, F = padlo, S = preskočené. Všetky riadky sú **nové podľa
presného kľúča špec/názov/projekt**, nie známe pády č. 1–4. Čísla v tabuľke
sú iba poradie správy, nie čísla nálezov. Pôvodný celý beh má pri každom FAIL;
opakovania ho neprepisujú. Tri SKIP nie sú tri PASS.

| # | Špec | Presný názov testu | Projekt | Opakovania 1 / 2 / 3 |
| ---: | --- | --- | --- | --- |
| 1 | `e2e/search-mobile-cards.spec.ts` | Search mobile-card parity – light › mobile: all author returns to the exact search URL | `webkit-mobile` | P / P / P |
| 2 | `e2e/search-mobile-cards.spec.ts` | Search mobile-card parity – light › mobile: all detail closes via backdrop and downward pointer drag | `webkit-mobile` | P / P / P |
| 3 | `e2e/search-mobile-cards.spec.ts` | Search mobile-card parity – dark › mobile: all author returns to the exact search URL | `webkit-mobile` | P / P / P |
| 4 | `e2e/search-mobile-cards.spec.ts` | Search mobile-card parity – dark › mobile: an existing business offer opens hours and returns to its detail | `webkit-mobile` | S / S / F |
| 5 | `e2e/offer-watch-results-handoff.spec.ts` | Offer Watch results responsive handoff – light › mobile → desktop app Back returns directly to the exact results URL | `webkit-mobile` | P / F / P |
| 6 | `e2e/offer-watch-results-handoff.spec.ts` | Offer Watch results responsive handoff – light › edit country picker → desktop → mobile list Back leaves the nested session without saving | `webkit-mobile` | P / P / P |
| 7 | `e2e/offer-watch-results-handoff.spec.ts` | Offer Watch results responsive handoff – dark › mobile → desktop app Back returns directly to the exact results URL | `webkit-mobile` | P / P / P |
| 8 | `e2e/mobile-language-header.spec.ts` | Language header – pl / light › mobile: profile-section has one centered title, no profile shortcut, and six choices | `webkit-mobile` | P / P / P |
| 9 | `e2e/mobile-language-header.spec.ts` | Language header – pl / dark › mobile: standalone has one centered title, no profile shortcut, and six choices | `webkit-mobile` | P / P / P |
| 10 | `e2e/search-panel-fixture.spec.ts` | Search return harness fixture geometry › offers: short real geometry is rejected before navigation; normal geometry permits deep profile entry | `webkit-mobile` | P / F / P |
| 11 | `e2e/search-panel-fixture.spec.ts` | Search return harness fixture geometry › users: short real geometry is rejected before navigation; normal geometry permits deep profile entry | `webkit-mobile` | P / P / F |
| 12 | `e2e/mobile-settings-offer-watch-motion.spec.ts` | the Jazyk row slides the Settings list away to the left and brings it back from the left on Back | `webkit-mobile` | P / P / P |
| 13 | `e2e/offer-card-review-translations.spec.ts` | Offer-card review translations – pl / light › mobile: the existing offer bottom detail translates ratings without adding a review link | `webkit-mobile` | F / P / P |
| 14 | `e2e/offer-card-translations.spec.ts` | OW-04 profile Like translation – pl / light › existing profile card exposes the translated Like control; desktop back uses the same text | `webkit-desktop` | S / S / S |
| 15 | `e2e/offer-reviews-back.spec.ts` | cudzí profil po F5 › after a reload the arrow returns to the plain profile without a highlighted or flipped card | `webkit-desktop` | P / P / F |
| 16 | `e2e/offer-watch-pagination-errors.spec.ts` | Offer Watch pagination errors – dark › desktop: first-page failure retries the first page without showing a false empty state | `webkit-desktop` | S / S / S |
| 17 | `e2e/profile-block-back-home.spec.ts` | blocking from a profile opened from Favorites shows the feed, and Back or Forward right after it never show the blocked profile | `webkit-desktop` | P / P / P |
| 18 | `e2e/search-cache-revalidation.spec.ts` | OW-20 real search cache revalidation › an identical repeat sends real HTTP while retaining the existing preview and exposing revalidation | `webkit-mobile` | P / P / P |
| 19 | `e2e/search-country-scroll.spec.ts` | OW-18 independent search country and OW-19 result return position › typing alone automatically searches, without Enter, and uses the independent IP country | `webkit-desktop` | P / F / P |
| 20 | `e2e/search-panel-return.spec.ts` | Search panel visibility and prompt profile returns › all: browser Back restores deep results promptly without opening the desktop panel | `webkit-desktop` | P / P / P |
| 21 | `e2e/search-preview-tab-top.spec.ts` | Search preview Show More starts the selected tab at the top › users: Show More resets nested scroll immediately but profile Back/Forward retains deep position | `webkit-mobile` | P / P / P |
| 22 | `e2e/search-to-offer-watches.spec.ts` | Search → Offer Watch navigation – dark › mobile: hidden desktop navigation; results guidance still opens management and returns | `webkit-mobile` | P / P / F |

### Priamo priložené bezpečné dôkazy 223

Oba bloky sú z diagnostických opakovaní na WK desktop. Prvý patrí k
`offer-reviews-back` (tretie opakovanie), druhý k `search-country-scroll`
(druhé opakovanie). Neobsahujú telá odpovedí, texty používateľov ani hodnoty
cookies/tokenov. Príčina nezistenej prítomnosti cookies nie je preukázaná.

```text
[E2E-EVIDENCE] cudzí profil po F5 › after a reload the arrow returns to the plain profile without a highlighted or flipped card | webkit-desktop | 25.0 s
url: /dashboard/users/:id [tab]
page state: readyState=complete viewerReady=true loadingMarkers=0 panelAriaHidden=n/a
document timing (ms since navigation start): domContentLoaded=247 load=537
scroll root: scrollTop=0 scrollHeight=785 clientHeight=720
active element: [omitted]
requests (ms since test start):
23  GET  /dashboard/users/:id  200  130 ms
505  GET  /api/auth/me/  200  107 ms
519  GET  /api/auth/dashboard/users/:id/:id/profile/  200  114 ms
678  GET  /api/auth/dashboard/users/:id/profile/  200  93 ms
679  GET  /api/auth/dashboard/users/:id/skills/  200  87 ms
679  GET  /api/auth/messaging/conversations/unread-summary/  200  64 ms
679  GET  /api/auth/notifications/unread-count/ [type]  200  65 ms
806  GET  /api/auth/skill-requests/:other/ [:param]  200  62 ms
868  GET  /api/auth/skill-requests/:other/ [:param]  200  65 ms
1157  GET  /dashboard/offers/:n/reviews [_rsc,returnTo]  FAILED(failed)  14037 ms
20811  GET  /api/auth/skill-requests/:other/ [:param]  401  56 ms
20866  POST /api/token/refresh/  403  111 ms
X-App-Duration-Ms: 1
refresh cookies: žiadne
refresh X-CSRFToken: áno
page errors: 0 | console errors: 7
[E2E-CONTEXT] moment=first-observed at=1794222951901 relation=temporal-only
[E2E-SESSION] snapshot=available observedAt=1794222951901 runStartedAt=1794222933460 generation=1 storedAt=1794222933460 relation=temporal-only
[E2E-SESSION] kind=initial-storage at=1794222933460 attempt=0 generation=1 status=n/a errorKind=n/a
[E2E-CONTEXT] moment=failure-observed at=1794222976899 relation=temporal-only
[E2E-SESSION] snapshot=available observedAt=1794222976899 runStartedAt=1794222933460 generation=1 storedAt=1794222933460 relation=temporal-only
[E2E-SESSION] kind=initial-storage at=1794222933460 attempt=0 generation=1 status=n/a errorKind=n/a
```

```text
[E2E-EVIDENCE] OW-18 independent search country and OW-19 result return position › typing alone automatically searches, without Enter, and uses the independent IP country | webkit-desktop | 23.1 s
url: /dashboard
page state: readyState=complete viewerReady=true loadingMarkers=0 panelAriaHidden=n/a
document timing (ms since navigation start): domContentLoaded=273 load=565
scroll root: scrollTop=0 scrollHeight=10876 clientHeight=720
active element: [omitted]
requests (ms since test start):
28  GET  /dashboard  200  167 ms
570  GET  /api/auth/me/  200  122 ms
800  GET  /api/auth/feed/posts/  200  117 ms
804  GET  /api/auth/messaging/conversations/unread-summary/  200  81 ms
809  GET  /api/auth/notifications/unread-count/ [type]  200  77 ms
1576  GET  /api/auth/dashboard/search/recommendations/ [limit]  FAILED(failed)  20105 ms
21728  GET  /api/auth/feed/posts/:n/  200  238 ms
21729  GET  /api/auth/notifications/unread-count/ [type]  401  236 ms
21731  GET  /api/auth/notifications/unread-count/ [type]  401  233 ms
21733  GET  /api/auth/messaging/conversations/unread-summary/  401  231 ms
21962  POST /api/token/refresh/  403  1124 ms
X-App-Duration-Ms: 1
refresh cookies: žiadne
refresh X-CSRFToken: áno
22758  GET  /api/auth/dashboard/search/ [country,location,offer_type,only_my_location,price_max,price_min,q(2)]  401  336 ms
23093  POST /api/token/refresh/  pending  …
page errors: 0 | console errors: 12
[E2E-CONTEXT] moment=first-observed at=1794223059750 relation=temporal-only
[E2E-SESSION] snapshot=available observedAt=1794223059750 runStartedAt=1794223050411 generation=1 storedAt=1794223050411 relation=temporal-only
[E2E-SESSION] kind=initial-storage at=1794223050411 attempt=0 generation=1 status=n/a errorKind=n/a
[E2E-CONTEXT] moment=failure-observed at=1794223082838 relation=temporal-only
[E2E-SESSION] snapshot=available observedAt=1794223082838 runStartedAt=1794223050411 generation=1 storedAt=1794223050411 relation=temporal-only
[E2E-SESSION] kind=initial-storage at=1794223050411 attempt=0 generation=1 status=n/a errorKind=n/a
```

## Návrh malej dymovej sady po nasadení — od K15 (9. 11. 2026)

**Stav: návrh, nie nová implementovaná sada ani nameraný päťminútový beh.**
Podklad merania je `main 5bf32b26` a dokončený celý beh z 9. 11. Nižšie je
príkaz na výber siedmich už existujúcich špecov a cieľ následného označenia
`@smoke`. V tejto dokumentačnej úlohe sa značky, testy ani aplikácia nemenia.
Návrh pôvodne vznikol vo vetve `e2e/dymova-sada`. Po kontrole PR #248 sa
presunul ku kódu do spoločnej `e2e/209-diagnostika`; ďalej sa aktualizuje iba
v tejto jednej vetve.

### Základ: sedem existujúcich špecov

| Špec v `frontend/e2e/` | Čo skutočne overí | Zápisy a upratanie |
| --- | --- | --- |
| `smoke.spec.ts` | Verejný vstup, úspešná HTML odpoveď a titulok Svaply. | Bez prihlásenej relácie a bez vytvárania obsahu. |
| `auth-session.spec.ts` | Prihlásenie cez formulár, odhlásenie, ochrana dashboardu po Back/F5 a po vyčistení cookies. | Len relácie vyhradeného účtu, žiadna zmena hesla či nastavení. |
| `messages-peer-profile.spec.ts` | Otvorenie existujúcej konverzácie s druhým testovacím účtom, hlavička, návrat a profil. | Neodosiela správy. Otvorenie môže označiť existujúcu správu za prečítanú a zapísať návštevu profilu; preto iba dohodnuté testovacie účty. |
| `mobile-settings-navigation.spec.ts` | Mobil: Profil → Menu → Jazyk/Upozornenia → Späť → Zatvoriť → profil. | Bez prepínania a ukladania. Zatiaľ neoveruje Súkromie, Blokované ani Sledovanie. |
| `dashboard-history-navigation.spec.ts` | Mobilné/desktopové menu, správna URL a obsah pri Späť/Dopredu. | Nezapisuje obsah; zachovať zákaz opakovaného kliknutia na aktívne Žiadosti. |
| `html-cache-control.spec.ts` | Prvé otvorenie aj F5 na šiestich stránkach vracajú HTML `no-store`, vrátane dashboardu. | Len skutočné GET, nie podvrhnuté API; 18 variantov na troch projektoch. |
| `sharing-from-feed.spec.ts` | Vytvorenie dočasného zdroja, reálne zdieľanie z UI, správne pristátie na Nástenke. | Dva vlastné dočasné príspevky na projekt. Existujúci `finally` maže najprv repost, potom zdroj; kontroluje výsledky upratania. **Nie je to test nahratia fotky.**  **Obmedzenie:** ak ID nie je známe, náhradný GET v `cleanupFeedPosts` nekontroluje HTTP stav; jeho zlyhanie môže zostať bez hlásenia a príspevok bez upratania. |

Na zdokumentovanom celom behu mali tieto špecy spolu **51 variantov:
41 PASS / 0 FAIL / 10 projektových SKIP**. Súčet zaznamenaných trvaní samotných
testov bol **90 821 ms**. Nie je to trvanie samostatného dymového procesu:
treba prirátať Docker, global setup, prehliadače, kontexty a upratanie. Cieľ
**približne 3–5 minút** je zatiaľ odhad; pred zavedením ho zmerať jedným
samostatným behom. Odhad nie je záruka pri otvorenom probléme 223.

Z `frontend`, po potvrdení nasadenia a okna bez zlučovania, nasadení a zmien
testovacích účtov (bez `--project` sa použijú všetky tri projekty):

**Podmienka zápisovej časti:** kým sa samostatne neopraví a neoverí
náhradné vyhľadanie pri neznámom ID, `sharing-from-feed.spec.ts` nezaraďovať
do pravidelného automatického dymu. Nižšie je iba sedemsúborový výber návrhu,
nie bezvýhradné odporúčanie na jeho spúšťanie po každom nasadení. Historické
úspešné kontroly známych ID túto medzeru nepotvrdzujú ako vyriešenú. Helper sa
v tejto dokumentačnej oprave nemenil.

```powershell
npm run test:e2e:docker -- e2e/smoke.spec.ts e2e/auth-session.spec.ts e2e/messages-peer-profile.spec.ts e2e/mobile-settings-navigation.spec.ts e2e/dashboard-history-navigation.spec.ts e2e/html-cache-control.spec.ts e2e/sharing-from-feed.spec.ts --workers=1 --retries=0
```

Tento výber je technicky spustiteľný z existujúcich špecov. **Touto úlohou sa
proti Railway nespúšťal a nepredstavuje súhlas s ďalším zápisovým behom bez
dohodnutého okna.** Použiť pôvodnú konfiguráciu a lokálny `.env.e2e`; nikdy ho
nevypisovať ani nekopírovať do iného worktree či prílohy.

### Cieľ: najviac osem špecov so značkou `@smoke`

Po schválení návrhu označiť iba konkrétne krátke produkčné scenáre, nie celé
rozsiahle parametrizované skupiny. WebKit desktop aj mobil ostávajú povinné,
Chromium je kontrolný tretí projekt. Bez zmeny asercií, tolerancií a timeoutov,
bez automatických retry. Päťminútový cieľ sa nesmie dosiahnuť vypínaním pádov.

Základ zostane sedem špecov vyššie. **Ôsmy navrhovaný špec**
`feed-photo-smoke.spec.ts` vznikne až v dohodnutej implementácii 295: syntetická
fotka bez osobných údajov/EXIF → skutočný UI upload a publikovanie vlastného
príspevku → vykreslený obrázok má `naturalWidth > 0` → odstránenie iba vlastného
príspevku tohto behu. Overí sa aktuálna upload cesta aj spracovanie a doručenie
obrázka, nie iba HTTP 200 obrázkovej URL. Pred zaradením preveriť aj upratanie
pri nedokončenom uploade alebo neúspešnom publikovaní. Netvrdiť, že samotná
neprítomnosť príspevku dokazuje fyzické vymazanie objektu zo S3. Portfólio,
ponuky, odmietnutie BMP/TIFF a fotky v správach patria do širšej 295, nie do
päťminútového dymu.

**Medzera Správ:** otvorenie konverzácie nie je dôkaz nového odoslania ani
doručenia. `backend/messaging/services/messages.py::delete_message_for_all`
aktuálne robí soft-delete: záznam ostáva a klient ho vidí ako odstránený.
Automatické posielanie po každom nasadení by tak nechávalo históriu odstránených
správ. Zatiaľ ho nenavrhujem potichu zapnúť. Majiteľ musí buď výslovne schváliť
tieto zvyšky medzi dvoma vyhradenými účtami, alebo dohodnúť riadené prostredie
a upratanie. Potom možno doplniť/vymeniť správový scenár v jednom špecu bez
prekročenia ôsmich súborov. Test by kontroloval serverom potvrdenú správu v UI;
príjem druhým klientom vyžaduje druhú povolenú reláciu. **Odoslanie správy aj
push dovtedy ostávajú súčasťou ručného dymu.** Push na skutočnom iPhone ostáva
ručne aj po prípadnom doplnení automatického odoslania.

Pri budúcom rozšírení Nastavení do dymu otvoriť aj Súkromie, Blokované a
Sledovanie bez zmeny preferencií. `PrivacySettings` má obe rozloženia v DOM;
duplicitné DOM/textové selektory zúžiť na viditeľné prvky. Samotný dnešný
PASS navigácie nie je dôkazom pokrytia týchto troch sekcií.

Cieľový príkaz **až po implementácii a kontrole značiek**:

```powershell
npm run test:e2e:docker -- --grep '@smoke' --workers=1 --retries=0
```

Na tomto maine ešte výber `@smoke` nie je zavedený. Názov `smoke.spec.ts`
automaticky nie je značka. Pred prvým produkčným použitím cez `--list` overiť
presný neprázdny výber, projekty a počty. Nesprávny či prázdny výber nie je PASS.

### Podmienky úspechu, súkromie a upratanie

- Pred behom preveriť určené účty a existujúcu priamu konverzáciu na prvej
  strane; nemení sa súkromie ani prístupové práva. Neočakávaný dátový SKIP =
  **NEOVERENÉ**, nie zelený dym. Očakávané projektové SKIP sa uvádzajú osobitne.
- Každý nový objekt označiť jedinečnou značkou behu a ID zaradiť na upratanie
  pred aserciami. `finally` platí aj pri páde. Pri výpadku použiť iba presnú
  identifikáciu vlastného obsahu tohto behu, nikdy hromadné mazanie či obsah
  iných behov. Chyba/500 pri uprataní sa neschová opakovaným mazaním; nahlásiť
  nezaručené upratanie spolu s pôvodným pádom.
- Diagnostika len bezpečným `[E2E-EVIDENCE]`: časy, počty, anonymné cesty a
  HTTP stavy, vrátane existujúcich polí 223. Žiadne účty, text správ, telá
  odpovedí, hodnoty cookies/tokenov ani surové reporty do chatu/commitu.
- Bezpečný blok dôkazov nie je to isté ako všetky lokálne artefakty. Globálny
  `playwright.config.ts` má `screenshot: 'only-on-failure'`; nie všetky vybrané
  špecy ho prepisujú. Snímky a surové reporty môžu obsahovať obsah stránky,
  zostávajú súkromné a nepatria do chatu, commitu ani verejného CI artefaktu.
  `messages-peer-profile.spec.ts` v aktuálnej diagnostickej vetve už používa
  `diagnostic-test`, ktorý vypína screenshot, trace aj video. Tvrdenie o jeho
  nevypnutých screenshotoch platilo pre pôvodnú samostatnú dokumentačnú vetvu,
  nie pre tento aktuálny kód; netreba ho vypínať druhýkrát.
- Dym nenahrádza ručný test iPhonu/PWA ani celý regresný beh. Nový pád sa
  neposunie na PASS len opakovaním; zápisový scenár sa bez preverenia
  upratania automaticky neopakuje. Päťminútový odhad nie je nový testový limit.

### Po oprave 320: WebKit regresia farieb formulára

`320` je na `5bf32b26` stále otvorený; oba vstupy
`reset-password/[uidb64]/[token]/ResetPasswordClient.tsx` zatiaľ nemajú vlastné
pozadie. **Až po oprave aplikácie a potvrdení nasadenia** pridať samostatný
`reset-password-colors.spec.ts` (navrhovaný názov), `colorScheme: 'dark'`, vo
WebKite desktop aj mobil. Overiť obe polia, svetlé skutočné pozadie/účinnú
svetlú schému ovládacích prvkov a čitateľný text; nestačí kontrola názvu CSS
triedy. Bez vyžiadania e-mailu, skutočného reset tokenu, odoslania formulára
alebo zmeny hesla. Pred implementáciou preveriť bezpečný vstup formulára bez
platného odkazu. Je to samostatná podmienená regresia, **nie deviaty špec
pridávaný automaticky do malej sady**. V tejto úlohe nevznikol ani nebežal.

Lokálne overenie návrhu: presný sedemsúborový výber s `--list` dal
`Total: 51 tests in 7 files` (exit 0), všetkých sedem ciest existuje a
`git diff --check` prešiel. `--list` nevykonal testy ani prihlasovací setup;
proti Railway sa nič nespustilo. Zmenená je iba táto dokumentácia.

## Historický stav zmien pri prvom zjednotení reportu — 9. 11. 2026

Toto odovzdanie teraz zhromažďuje výsledok behu, všetkých 22 pádov a ich
opakovania, dôkazy 223, doplnenie K14 a návrh dymovej sady vrátane podmienky
320. Podrobný lokálny report `C:/Projects/svap-e2e-vysledok-20261109.md` má
takisto doplnené K14 aj dymový návrh a zachováva všetkých 20 vzniknutých
bezpečných blokov. Nejde o surový Playwright HTML report.

| Vlastná vetva / pracovný priečinok | Stav pred schválením commitu |
| --- | --- |
| `e2e/dymova-sada` — `C:/Projects/svap-e2e-dymova-sada` | Iba toto zjednotené `docs/playwright-odovzdanie.md`. Žiadne zmeny aplikácie ani testov. |
| `e2e/209-diagnostika` — `C:/Projects/svap-e2e-223-dokazy` | Skoršia diagnostika 209(b): upravený `messages-peer-profile.spec.ts`, nový pomocník `support/peer-conversation-diagnostics.ts` a štyri kontroly v `diagnostics-tests/` (peer-conversation.check.ts, peer-conversation-browser.check.ts, peer-conversation.playwright.config.ts, peer-conversation.scenario.ts). Spolu so staršou pracovnou verziou odovzdania je to 7 súborov. |

Kód diagnostiky 209 sa týmto zjednotením **nekopíroval do dokumentačnej vetvy**
a starší worktree ostal nedotknutý. Historické časti o 209 preto opisujú túto
samostatnú rozpracovanú vetvu, nie kód už zlúčený do main. Vtedy bola kanonická
dokumentácia v `e2e/dymova-sada`; po kontrole PR #248 je spolu s kódom v
`e2e/209-diagnostika`. Dve pôvodné verzie odovzdania sa preto nemajú zlučovať
ako dve nezávislé opravy.

Pri zjednotení mali obe vetvy lokálne necommitnuté zmeny. Nie sú v hlavnom
pracovnom priečinku `C:/Projects/svap`; doň sa nezasahovalo. Následne majiteľ
9. 11. výslovne schválil commit a push oboch vetiev. Vybrať konkrétnu vlastnú
vetvu a súbory, nebrať `git add .` v hlavnom projekte. Súbor s prihlásením,
auth stav, JSON súhrny, surové reporty, prílohy a pomocné lokálne skripty
zostávajú mimo commitu.

Návrh dymu ešte nie je implementácia značiek `@smoke`; test 320 ešte nevznikol,
lebo čaká na opravu aplikácie a potvrdenie nasadenia. Celý beh je ukončený,
proti Railway sa pri zjednocovaní nič nespúšťalo. Register nálezov, AWS,
nastavenia Railway a rozhodnutia sa nemenili.


## Predcommitové overenie — 9. 11. 2026

Majiteľ výslovne schválil commit a push oboch vlastných vetiev. Pred prípravou
bol stiahnutý aktuálny main `352fc9eb` (PR #247, vetva 171, iba register a
dokumentácia) a obe vetvy boli posunuté fast-forward z `5bf32b26` bez kolízie.
Historický produkčný beh vyššie stále patrí nasadeniu `5bf32b26`; žiadny nový
prihlasovaný beh proti Railway sa pri príprave commitov nespustil.

Kontroly diagnostiky 209 na aktualizovanom základe: **54/54 Node kontrol**
(12 nových + 42 existujúcich), **3/3 syntetických browser projektov**
(WebKit desktop/mobil, Chromium) v Dockeri bez Railway a prihlasovania,
úplný TypeScript aplikácie, samostatný striktný TypeScript šiestich dotknutých
E2E súborov a cielený ESLint prešli. Nové/upravené TS súbory majú najviac
171 riadkov. Pred zaradením súborov preveriť `git diff --check` aj presný
staged zoznam. Do commitov patria iba vlastné E2E súbory a toto odovzdanie,
nie prihlasovacie údaje, auth stav, JSON/HTML reporty alebo prílohy.

Značky `@smoke` ani regresia 320 nie sú týmto commitom implementované.
Otvorenie PR, zlúčenie do main a nasadenie zostávajú majiteľovi.

## Overenie a oprava pripomienok PR #248 — 9. 11. 2026

Najnovší overený main ostáva `352fc9eb`. Na výslovný pokyn majiteľa bol
zjednotený dokument z `d8e2b566` prenesený do `e2e/209-diagnostika` ako
samostatný commit; táto následná oprava je ďalší commit v rovnakej vetve.
Pôvodná dymová vetva ani PR #248 sa neprepisujú a PR sa automaticky nezatvára.

- **Platné v kontrolovanej revízii:** príkazy pre peer diagnostiku odkazovali
  na súbory, ktoré v samostatnej dymovej vetve chýbali (overené Git stromom:
  0 z 3 diagnostických súborov oproti 3 z 3 v cieľovej diagnostickej vetve).
  Pred príkazmi je teraz uvedená požadovaná vetva/revízia a miesto spustenia.
- **Platné:** náhradné vyhľadanie príspevkov v `cleanupFeedPosts` zahodí
  HTTP stav GET. Lokálna syntetická sonda s prázdnym zoznamom známych ID a
  odpoveďou 500 potvrdila 1 GET a 0 hlásených chýb upratania. Na Railway
  nič nevolala. Opravený je opis a podmienka zaradenia zápisového kandidáta,
  **nie samotný helper**; jeho kód a existujúce asercie ostali nedotknuté.
- **Neaktuálne pre cieľový konverzačný špec:** poznámka o screenshote sa týka
  starej dokumentačnej vetvy bez bezpečného fixture. V diagnostickej vetve
  má tento špec screenshot/trace/video vypnuté. Všeobecné riziko lokálnych
  artefaktov ostatných špecov je v pravidlách výslovne odlíšené.

Dohoda do budúcna: súvisiaca práca, jej výsledky a opravy z review ostávajú
ako viac commitov v jednej vlastnej E2E vetve; nezakladať kvôli nim ďalšiu
dokumentačnú vetvu. Pred ďalšou úlohou naďalej overiť aktuálny main.
Zoznam nálezov vlastní Claude; nemenil sa. Značky `@smoke`, test 320 ani
oprava produkčnej aplikácie sa touto dokumentačnou opravou neimplementujú.

Overenie po oprave opisu: 54/54 lokálnych Node kontrol diagnostiky a ochrany
údajov, 3/3 syntetických browser projektov v Dockeri a statická kontrola
podmienky pred príkazmi prešli. Lokálny `--list` znovu potvrdil 51 variantov
v 7 súboroch; nespustil testy, setup ani Railway. Zmenená je iba dokumentácia,
aplikácia a testová logika ostali rovnaké. `git diff --check` prešiel.
