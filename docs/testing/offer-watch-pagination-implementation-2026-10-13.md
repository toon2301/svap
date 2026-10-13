# OW-02 – implementácia a overenie stránkovacej chyby

Dátum: 13. 10. 2026. Vetva: `offer-watch-zero-prices`.
OW-02 nadväzuje na OW-01; používateľ v tomto kole autorizoval commit a push oboch.
Rabbit kontrolu odosiela používateľ. Nič nebolo zlúčené ani nasadené.

## Výsledok a rozsah

- Chyba ďalšej stránky je pod všetkými zachovanými výsledkovými kartami.
- Presne jeden výsledkový alert a Skúsiť znova; obyčajné Zobraziť ďalšie je pri chybe skryté.
- Retry opakuje existujúci kurzor. API, backend a načítavací hook sa nemenili.
- Chyba prvej stránky zostáva pod hlavičkou, bez falošného empty-state.
- Chyba Obnoviť zostáva nad zachovanými kartami a opakuje prvú stránku.
- Existujúce texty, preklady, červené/jantárové light/dark štýly, Escape/navigácia
  okolitej aplikácie a ovládanie načítania zostávajú nezmenené.
- Nie je zmenený Like, formulár OW-01, routing, DashboardContent ani auth.

Nový samostatný `OfferWatchMatchesErrorNotice.tsx` obsahuje iba pôvodné upozornenie.
Panel ho vykreslí na jednom z dvoch vzájomne výlučných miest. Rozhoduje existujúci
stav chyba + karty + zachovaný kurzor, nie nový pomocný stav.

## Dôkaz pôvodnej chyby a regresné testy

Pred opravou nový DOM-order test zlyhal vo všetkých troch variantoch: 1, 10, 20 kariet.
Po oprave rovnaké testy prešli. Test neoveruje len prítomnosť textu: alert musí
nasledovať až za POSLEDNOU kartou. Neúspešný predopravový beh bol očakávaný RED,
nie zamlčané zlyhanie finálneho stavu.

Nové sady kontrolujú umiestnenie, počet alertov/tlačidiel, oba typy retry,
opakované zlyhanie, loading, klávesnicu, zachovanie poradia, poslednú stránku,
prvé načítanie, empty-state a jednorazové zotavenie z nenájdeného sledovania.
Test skutočného hooku overuje aj chybný loadMore catch, identický opakovaný kurzor,
deduplikáciu, dvojité spustenie, zrušenie, prepnutie sledovania, odmountovanie
a zámok novšej požiadavky pri neskoro dobehnutej starej chybe.

## Vykonané kontroly v tomto kole

| Kontrola | Výsledok |
| --- | --- |
| Celý frontend Jest | 399 sád / 5 458 testov PASS |
| Celá sekcia Sledovanie Jest | 35 sád / 275 testov PASS |
| Pokrytie panelu, notice a existujúceho hooku | Všetky štyri metriky 100 % |
| Spoločné pokrytie 7 FE produkčných súborov OW-01 + OW-02 | Riadky 100 %, funkcie 100 %, vetvy 99,58 %, statements 99,64 % |
| Cielená backendová regresia OW-01 vrátane results API | 185 PASS |
| Pokrytie BE modelu a migrácie 0123 | 100 %, prah 95 % splnený |
| TypeScript | PASS |
| Cielený ESLint cez existujúce Next API, 18 súborov | 0 chýb / 0 upozornení |
| Produkčný build | PASS; existujúce odporúčanie Sentry o globálnom error handleri nie je chyba kompilácie |
| Django check | PASS |
| `makemigrations --check --dry-run` | Žiadne ďalšie migrácie |
| Python dokumentácia (opakovaná AST kontrola) | Model 83,33 %; upravené/nové BE testy a migrácia 100 %, bez zníženia oproti HEAD |
| Rozsah a čistota diffu | `git diff --check` PASS; všetky zmenené/nové kódové súbory do 500 riadkov |
| Ochrana rozpracovanej práce | SHA-256 aj Git stav všetkých 9 používateľových súborov nezmenené |
| Parita prekladov SK/CS/EN/DE/PL/HU | 0 missing / 0 extra |
| Použité prekladové kľúče | Existujúce 3 chýbajúce kľúče Nástenky (APP-01), kontrola má exit 1 |
| Playwright zber | 27 project-scenárov v 2 súboroch, WebKit desktop/mobil + Chromium desktop |
| Živý Playwright OW-01/02 | ČAKÁ na nasadenie; NIE PASS |
| Fyzický iPhone Safari/PWA a manuálne testy | ČAKÁ na nasadenie a používateľov retest |

Coverage platí iba pre uvedené súbory, nie celú aplikáciu. Žiadny prah sa neznižoval.
Celý backend sa v OW-02 znovu nespúšťal, pretože OW-02 nemení backend a cielená
185-testová regresia sa zopakovala. Posledný celý beh pri OW-01 ostáva
1 810 PASS / 10 SKIP / 2 FAIL: oba FAIL nezávisle reprodukované aj na čistom main
kvôli Windows/gRPC (ENV-01). Celý backend neoznačujeme za úplne zelený.

## Playwright: pripravené, nie zamieňané so živým overením

`offer-watch-pagination-errors.spec.ts` používa reálnu Railway aplikáciu.
Na prípravu číta len sledovania prihláseného testovacieho účtu a existujúce zhody.
Nevytvára karty, nemení sledovania ani fixture účet. Voliteľné ID sa overí voči
zoznamu vlastných sledovaní; bez fixture s 11+ zhodami test spraví SKIP.

Výpadok sa simuluje iba blokovaním GET matches konkrétneho sledovania. Login,
token refresh, zoznam sledovaní a ostatné endpointy sa neblokujú.
Retry už ide cez skutočný backend. Overenie zahŕňa DOM poradie a fyzickú geometriu
pod posledným riadkom, zachovanie označených DOM kariet, identický kurzor,
loading, keyboard retry, prvostránkovú aj refresh chybu v light/dark.
Mobilný projekt overuje existujúce oznámenie a funkčnú správu, nie mobilné výsledky.

Sú to 8 logických scenárov OW-02 (6 desktopových + 2 mobilné) a 1 zápisový
scenár OW-01. Pri zbere na 3 projektoch vzniká 27 položiek; neplatné kombinácie
desktopového scenára na mobile a naopak sa zámerne preskočia.
Pri dostupných fixtures a voľnom slote pre OW-01 je plánovaných 17 aplikovateľných behov:
12 desktopových OW-02 + 2 mobilné OW-02 + 3 OW-01. Ani ich zber nie je PASS.
Trace/screenshot/video sú vypnuté; testovacie tagy sa pridávajú iba do DOM testu,
nie do produkčného komponentu. Zachytávanie výpadku sa na konci odstráni.

## Zmenené a nové súbory OW-02

Upravený produkčný súbor:

- `frontend/src/components/dashboard/modules/offer-watch/results/OfferWatchResultsMatchesPanel.tsx`

Nové produkčné/testovacie súbory:

- `frontend/src/components/dashboard/modules/offer-watch/results/OfferWatchMatchesErrorNotice.tsx`
- `frontend/src/components/dashboard/modules/offer-watch/results/OfferWatchResultsMatchesPanel.test.tsx`
- `frontend/src/components/dashboard/modules/offer-watch/results/OfferWatchMatchesErrorNotice.test.tsx`
- `frontend/src/components/dashboard/modules/offer-watch/__tests__/useOfferWatchMatches.retry.test.tsx`
- `frontend/e2e/offer-watch-pagination-errors.spec.ts`
- `frontend/e2e/support/offer-watch-results.ts`

Dokumentácia: tento súhrn, spoločný manuálny checklist, aktualizovaný register
a historický súhrn OW-01. Mapovanie OW-02 ostáva historickým plánom.
OW-02 nemá migráciu. Spoločná vetva obsahuje iba jednu novú migráciu OW-01: 0123.
Deväť používateľových rozpracovaných súborov v hlavnom checkoute sa kontroluje
SHA-256; nezahrnú sa do commitu.

## Otvorené veci a ďalší krok

TEST-01 je lokálne doplnený a 95 % gate je splnený, ale živá geometria ešte čaká.
OW-09 (nerozlíšenie poškodeného kurzora od neexistujúceho sledovania) zostáva
samostatný nález do zoznamu. Nepribudla potvrdená nová používateľská chyba
z vykonaných finálnych lokálnych kontrol; to nie je záruka bezchybnosti aplikácie.
APP-01, ENV-01, TECH/TOOL a OW-03 až OW-08 sa týmto kolom neopravovali.

Nasleduje používateľova Rabbit kontrola, potom nasadenie (vrátane 0123),
reálny Playwright a
[spoločné manuálne testy](C:/Projects/svap-google-login-audit/docs/testing/offer-watch-ow01-ow02-manual-2026-10-13.md).
Povinne zopakovať M13, M14, M33 a regresiu M32/R05. Pri úspešnom uzavretí
OW-01/OW-02 sa mapuje OW-03 – odstránenie Like iba vo výsledkoch Sledovaní.
