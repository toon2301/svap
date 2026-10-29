# Playwright: odovzdanie (stav k 29. 10. 2026)

Táto strana je pre agenta, ktorý má na starosti Playwright (Codex). Pravidlá spolupráce sú v `AGENTS.md`. Po každom prijatom behu (pozri nižšie) agent aktualizuje tabuľku stavu a zoznam známych pádov. Zmeny dáva do jednej vetvy naraz, nie po každom behu zvlášť.

## Ako sa beh spúšťa

- Testy sú v `frontend/e2e/` (41 špecov, pomocníci v `frontend/e2e/support/`). Beží ich Playwright, Jest ich nezbiera.
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

## Ako nahlásiť chybu aplikácie

Pozri koniec `AGENTS.md`. Krátky popis pošle majiteľovi, ten ho odovzdá Claudovi.
