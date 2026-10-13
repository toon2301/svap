# OW-02 – mapovanie chyby stránkovania vo výsledkoch Sledovaní

Dátum: 13. 10. 2026. Mapované na lokálnej vetve `offer-watch-zero-prices`,
HEAD `25ed763045c9c0daecf6d7ec5a5e9d5d4fa79014`, spolu s necommitnutou opravou OW-01.
Tento dokument je plán; implementácia OW-02 ešte nezačala.

## Potvrdená príčina

V [OfferWatchResultsMatchesPanel.tsx](../../frontend/src/components/dashboard/modules/offer-watch/results/OfferWatchResultsMatchesPanel.tsx)
sa spoločný chybový blok vykresľuje pred samotným gridom kariet. Podmienka
je iba existencia `error`, bez rozlíšenia miesta zlyhania. Preto sa aj chyba
načítania ďalšej stránky ukazuje nad už načítaným obsahom.

Nie je potrebné meniť backendové stránkovanie ani spôsob skladania výsledkov.

- [useOfferWatchMatches.ts](../../frontend/src/components/dashboard/modules/offer-watch/useOfferWatchMatches.ts)
  pri `loadMore()` odošle uložený kurzor, pri zlyhaní nezmaže karty ani kurzor
  a vo `finally` uvoľní iba zámok aktuálnej požiadavky.
- Pri `refresh()` sa kurzor najprv vynuluje. Pri neúspechu zostanú aktuálne
  karty zachované; retry preto správne volá obnovenie prvej stránky.
- Prvá stránka sa pri úspechu nahradí, ďalšia sa pridá s deduplikáciou ID.
- Panel už pri chybe skrýva obyčajné „Zobraziť ďalšie“. Toto zachovať.
- Zmenené sledovanie má v rodičovi vlastný React `key`, čo oddelí stav načítania.
- Chybu zoznamu uložených sledovaní riadi rodič, nie výsledkový panel.
  Tento odlišný chybový blok sa v OW-02 nemá presúvať.

## Presný rozsah opravy

| Situácia | Kde bude chyba | Čo urobí Skúsiť znova |
| --- | --- | --- |
| Zlyhá prvá stránka, ešte nie sú karty | Zachovať existujúce miesto pod hlavičkou | Obnoviť prvú stránku |
| Zlyhá ďalšia stránka, sú karty aj uložený ďalší kurzor | Presunúť POD poslednú načítanú kartu | Zopakovať ten istý kurzor |
| Zlyhá Obnoviť, staré karty zostali | Zachovať existujúce upozornenie nad kartami | Znovu obnoviť prvú stránku |
| Prebieha úspešné načítanie alebo retry | Existujúce loading správanie, bez druhého error bloku | Ovládanie počas požiadavky deaktivované |

Nezamieňať zlyhanie stránkovania so zlyhaním obnovenia len preto, že obe situácie
majú na obrazovke karty. V aktuálnom toku ich odlišuje zachovaný alebo vynulovaný
kurzor. Hypotéza, že refresh omylom opakuje ďalšiu stránku, sa nepotvrdila:
`refresh()` vynuluje kurzor ešte pred požiadavkou.

## Minimálne riešenie podľa svaply.mdc

1. Vytvoriť samostatný malý komponent `OfferWatchMatchesErrorNotice.tsx` pre
   existujúci chybový blok. Zachovať text, farby, ikonu, `role="alert"`,
   fokus štýl a deaktiváciu tlačidla.
2. V paneli vypočítať, či ide o chybu ďalšej stránky: chyba + už načítané
   karty + neprázdny ďalší kurzor. Nepridávať nový stav do hooku.
3. Pre ostatné chyby vykresliť notice na pôvodnom mieste. Pre chybu stránkovania
   ho vykresliť až za `OfferWatchMatchGrid`, s primeraným horným odstupom.
4. Podmienky musia byť vzájomne výlučné: presne jeden výsledkový error blok
   a jeden výsledkový retry. Hlavičkové Obnoviť zostáva samostatnou akciou.
5. Zachovať podmienku, ktorá pri chybe skrýva obyčajné Zobraziť ďalšie.
6. Nemení sa hook, API, backend, dátový model, migrácie, routing, DashboardContent,
   karty/Like ani formuláre OW-01. Nepridávajú sa nové používateľské texty.

Existujúce kľúče `offerWatchResults.matchesLoadFailed`, `offerWatch.retry`,
`offerWatchResults.loadMore` a `offerWatchResults.loadingMore` sú v SK/CS/EN/DE/PL/HU.
Ak sa pri realizácii navrhne odlišný text, musí byť samostatne dohodnutý
a doplnený vo všetkých šiestich jazykoch.

## Súbory, do ktorých má zasiahnuť implementácia

Produkčné:

- Upravený: `frontend/src/components/dashboard/modules/offer-watch/results/OfferWatchResultsMatchesPanel.tsx`
  (teraz 150 riadkov).
- Nový: `frontend/src/components/dashboard/modules/offer-watch/results/OfferWatchMatchesErrorNotice.tsx`.

Testy:

- Nový: `frontend/src/components/dashboard/modules/offer-watch/results/OfferWatchResultsMatchesPanel.test.tsx`.
- Nový: `frontend/src/components/dashboard/modules/offer-watch/results/OfferWatchMatchesErrorNotice.test.tsx`.
- Nový: `frontend/src/components/dashboard/modules/offer-watch/__tests__/useOfferWatchMatches.retry.test.tsx`
  pre skutočný chybový tok hooku, bez zmeny jeho produkčnej logiky.
- Nový: `frontend/e2e/offer-watch-pagination-errors.spec.ts`.

Existujúce testy rodiča (291 riadkov), hooku (219 riadkov) a API zostávajú
regresnou základňou. Rozsah OW-01 ani chránené používateľské zmeny sa neprepisujú.
Nie je potrebná backendová implementácia alebo migrácia.

## Doteraz reálne vykonané overenie

- Päť existujúcich frontendových sád: všetkých 30 testov prešlo.
- Diagnostické pokrytie panelu a hooku: riadky 95,49 %, vetvy 83,07 %, funkcie 100 %.
  Príkaz s existujúcim 95 % prahom skončil neúspešne KVÔLI vetvám, nie kvôli
  zlyhanému testovaciemu tvrdeniu. Prah sa neznižoval.
- Panel: vetvy 82,05 %, riadky 95,23 %; hook: vetvy 84,61 %, riadky 95,55 %.
- Žiadny existujúci test neoveruje, že error blok je až za POSLEDNOU kartou.
  Chybový `catch` pri skutočnom `loadMore()` nie je pokrytý existujúcou sadou;
  rodičovský UI test iba podvrhne už existujúci error stav.
- Backendová sada `test_offer_watch_results_api.py`: 16 testov prešlo v izolovanej
  in-memory testovacej databáze. Overuje aj 10/10/3 stránkovanie, neduplikovanie,
  oprávnenia, skryté/blokované karty a odmietnutie poškodeného kurzora.
- Playwright konfigurácia a Docker pomocník boli prečítané. Žiadny živý E2E beh
  OW-02 nebol vykonaný a nový E2E súbor zatiaľ nebol vytvorený.
- Nešlo o celý frontendový/backendový beh ani o nový produkčný audit.
- Hash kontrola potvrdila, že všetkých 19 už rozpracovaných kódových/testovacích
  súborov OW-01 a všetkých deväť používateľských súborov v hlavnom checkoute ostalo
  nezmenených. Dotknuté OW-02 produkčné súbory majú stále prázdny git diff.
- V tomto kole pribudol iba tento plán a aktualizácia registra. Bez nových
  migrácií, implementácie, commitu, pushu alebo produkčného zápisu.

Frontendový diagnostický príkaz z priečinka `frontend`:

```powershell
npx jest src/components/dashboard/modules/offer-watch/results/OfferWatchResultsDesktop.test.tsx src/components/dashboard/modules/offer-watch/__tests__/useOfferWatchMatches.test.tsx src/components/dashboard/modules/offer-watch/__tests__/offerWatchApi.test.ts src/components/dashboard/modules/offer-watch/results/OfferWatchResultsMobileUnavailable.test.tsx src/components/dashboard/modules/offer-watch/results/offerWatchResultsNavigation.test.ts --runInBand --silent --coverage --collectCoverageFrom=src/components/dashboard/modules/offer-watch/useOfferWatchMatches.ts --collectCoverageFrom=src/components/dashboard/modules/offer-watch/results/OfferWatchResultsMatchesPanel.tsx --coverageDirectory=coverage/watch-pagination-map
```

## Testy, ktoré treba doplniť pri implementácii

### Jest – panel a komponent chyby

1. Zlyhanie ďalšej stránky: všetky už načítané karty ostanú viditeľné a v rovnakom poradí.
2. Error blok nasleduje až za poslednou kartou podľa DOM poradia; nestačí existencia textu.
3. Presne jeden výsledkový alert/retry, bez obyčajného Zobraziť ďalšie pri chybe.
4. Retry volá `loadMore`, nikdy `refresh`, pri platnom chybovom stave stránkovania.
5. Chyba prvej stránky bez kariet: červený blok, žiadny falošný empty-state; retry volá refresh.
6. Chyba obnovenia s kartami: pôvodný horný warning, zachované karty; retry volá refresh.
7. Pending retry: deaktivácia ovládania a pôvodný loading text, bez paralelnej požiadavky.
8. Opakované zlyhanie ponechá výsledky a obnoví jedno dostupné retry pod gridom.
9. Úspešný retry odstráni chybu a obnoví bežné stránkovanie, ak ešte existuje kurzor.
10. Posledná stránka: po úspechu sa tlačidlo ďalších výsledkov už nezobrazí.
11. Loading prvej stránky, prázdny úspešný výsledok a obyčajné úspešné výsledky zostanú nezmenené.
12. Not-found recovery sa spustí najviac raz pre daný panel; ostáva v existujúcom rozsahu.
13. Jedna karta aj viac plných dávok: správne umiestnenie notice.
14. Svetlé/tmavé triedy, existujúce preklady, alert role a klávesové ovládanie tlačidla.

### Jest – skutočný tok hooku

15. Reálne odmietnutá požiadavka ďalšej stránky zachová pôvodné ID a presný kurzor.
16. Opakovanie používa ten istý kurzor; úspešná odpoveď sa pridá s deduplikáciou.
17. Dvojklik/pending zámok nevytvorí druhú požiadavku.
18. Prepnutie sledovania počas retry nedovolí oneskorenej odpovedi alebo chybe
    prepísať nové sledovanie.
19. Refresh počas stránkovania zruší starú požiadavku a nastaví nový prvostránkový tok.
20. Zrušená požiadavka nevytvorí používateľské hlásenie sieťovej chyby.
21. Odmountovanie neaktualizuje už neexistujúci panel.

Prijímací prah: aspoň 95 % riadkov, vetiev, statements a funkcií nového/upraveného
produkčného UI. Navyše po doplnení retry regresií overiť aspoň 95 % aj pre sledovaný
panel a hook; neskrývať nepokryté vetvy znížením prahu alebo zúžením merania na helper.
Ďalej celý frontend Jest, TypeScript, cielený lint a produkčný build.

## Playwright – plán po implementácii/nasadení

Proti skutočnej Railway aplikácii, nie lokálnemu serveru. Povinný WebKit desktop
aj mobilná emulácia; Chromium je doplnok. Nepoužiť podvrhnutú celú aplikáciu.

Desktop potrebuje existujúce sledovanie vyhradeného testovacieho účtu s aspoň
11 skutočnými dostupnými zhodami. Použiť existujúci opakovane použiteľný obsah,
nehardcodovať historické ID ako aktuálnu produkčnú pravdu. Nevytvárať nové účty,
ponuky ani sledovania len pre tento čisto čítací test. Ak fixture chýba, uviesť
nesplnenú podmienku/SKIP a scenár neoznačiť za overený.

- Zobraziť prvú stránku skutočných výsledkov.
- Prerušiť iba konkrétnu GET požiadavku `/auth/offer-watches/<id>/matches/`
  s parametrom cursor pomocou Playwright route; nezablokovať zoznam sledovaní,
  autentifikáciu, obnovu session ani iné endpointy. Použiť sieťové `failed`,
  nie zrušenie vyvolané vlastným AbortControllerom.
- Overiť, že posledná načítaná karta geometricky končí nad horným okrajom
  chybového notice (`boundingBox`), nie iba poradie v DOM.
- Overiť viditeľné jedno retry, žiadne druhé stránkovacie tlačidlo a zachované ID kariet.
- Odstrániť dočasné blokovanie a nechať retry prejsť do reálneho backendu.
  Požiadavka musí mať ten istý kurzor; ďalšie ID bez duplicít.
- Samostatne otestovať prvostránkové zlyhanie a neúspešné Obnoviť, v light/dark
  a klávesnicou. Obe musia používať refresh, nie ďalší kurzor.
- Mobilný WebKit v tejto fáze overí nezmenené oznámenie a vstup do správcu.
  ModulRouter na mobile výsledkový panel vôbec nepoužíva; nejde o mobilné
  stránkovacie testovanie ešte neimplementovaných mobilných výsledkov.
- Blokovanie vo `finally` odstrániť; neukladať osobné údaje ani poverenia do
  logov/traces/screenshotov. Nič nezapisovať do produkčných dát.

Zber testov nie je reálny beh. Lokálny Jest nezaručuje geometriu na Safari.

## Nálezy a rozhodnutia z mapovania

### TEST-01 – riešiť priamo pri OW-02

Medzera v testovaní poradia notice a chybového toku loadMore. Nie je to ďalšia
potvrdená produkčná porucha, ale súčasné testy nedokážu ochrániť požadovanú opravu.
Odporúčanie: zahrnúť doplnenie testov do implementácie OW-02.

### OW-09 – samostatný nález do zoznamu

Poškodený kurzor vyvolá v DRF `NotFound` s HTTP 404 a telom `detail`, aj keď
sledovanie existuje. Potvrdzuje to vykonaný backendový test a samostatná čisto
lokálna diagnostika parsera pre `not-base64`/`invalid` (bez prístupu do databázy).

`normalizeOfferWatchApiError` v `offerWatchApi.ts:224` však každý stav 404 klasifikuje
ako `not_found`; panel potom spustí obnovu zoznamu sledovaní. Nerozlišuje teda
poškodený kurzor od chýbajúceho sledovania. Toto je doložené spojením testu a kódu,
nie novým fyzickým produkčným reprodukovaním.

Odporúčanie: samostatne zmapovať rozlíšenie chýb endpointu a vhodný recovery.
Nemiešať ho do čisto vizuálnej opravy OW-02. Nie je dokázané, že bežný serverom
vygenerovaný kurzor sa pri aktuálnom používaní poškodzuje; zostáva dostupné Obnoviť,
ktoré začne od prvej stránky. Nejde o potvrdený bezpečnostný problém.

## Handoff

Mapovanie je pripravené na malú frontendovú implementáciu OW-02. Pred úpravou
znovu skontrolovať git diff oboch dotknutých produkčných súborov a zachovať OW-01
aj používateľské zmeny. Commit, push, PR a nasadenie iba po výslovnom pokyne.
Po oprave uviesť výsledky kontrol, aktualizovať register a pripraviť retest.
Následný plánovaný obsahový bod po uzavretí OW-02 je OW-03: odstrániť Like iba
vo výsledkoch Sledovaní.
