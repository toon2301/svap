# Svaply – spoločná evidencia nálezov a otvorených overení

Aktualizované: 13. 10. 2026.

Tento súbor je pracovný zdroj pravdy pre túto spoluprácu. Nespoliehame sa len na
pamäť chatu. Pri každom novom náleze treba používateľovi oznámiť, či odporúčame
opravu hneď v príslušnom kroku, alebo odloženie do zoznamu, a zapísať dôvod.

## Pravidlá aktualizácie

- Existujúce položky nemažeme. Po oprave aktualizujeme stav a dôkaz overenia.
- Rozlišujeme potvrdenú chybu, požadovanú produktovú zmenu, problém prostredia
  a scenár, ktorý ešte nebol overený. Neoverený scenár nie je PASS ani potvrdená chyba.
- Bezpečnosť, strata dát, obídenie oprávnení alebo nefunkčný základný tok majú
  prednosť. Pri zistení takého problému sa jeho odloženie musí výslovne prebrať.
- Chyby priamo súvisiace s aktuálnym krokom riešime v jeho rozsahu.
- Nesúvisiace kozmetické úpravy a technické upratovanie evidujeme na samostatné kolo.
- Samotná implementácia nie je konečné uzavretie. Stav musí jasne rozlišovať
  lokálne automatické testy, review, nasadenie a požadované živé/manuálne retesty.
- SKIP, zber Playwright testov a chýbajúce prostredie nie sú úspešný E2E beh.
- Nový nález nedáva automatické povolenie na ďalšiu opravu, produkčný zápis,
  zmazanie, commit ani push. Svaply.mdc platí naďalej.
- Po každom dokončenom kroku uviesť, čo ide nasledovať.

## Otvorené položky v sekcii Sledovanie

Ide o osem následných bodov z manuálneho testovania 24.–25. 9. 2026. Nie všetky
predstavujú chyby; druh a aktuálny stupeň overenia sú uvedené samostatne.

| ID | Druh / položka | Odporúčanie | Aktuálny stav a podmienka uzavretia |
| --- | --- | --- | --- |
| OW-01 | Potvrdený nesúlad: nulové cenové hranice | Dokončiť review a spoločný živý retest | Implementované a lokálne overené. Opakovaný BE beh 185 PASS; spoločné FE OW-01/02 275 PASS a celé FE 5 458 PASS. Používateľ autorizoval commit/push oboch 13. 10. Čaká jeho Rabbit kontrola, nasadenie a migrácia 0123, reálny Playwright WebKit desktop/mobil a manuálne overenie. Pri migračnom konflikte nič automaticky nezlučovať ani nemazať. |
| OW-02 | Potvrdené UX: chyba ďalšej stránky a retry nad kartami | Dokončiť review a spoločný živý retest | Implementované 13. 10. Presunutá iba chyba ďalšej stránky pod všetky zachované karty; prvostránková a refresh chyba zostali na pôvodnom mieste. Presne jeden výsledkový alert/retry. Pred opravou nový test RED pri 1/10/20 kartách, po oprave PASS. Panel/notice/hook coverage 100 %. Hook/API sa nemenili. Čaká Rabbit, nasadenie a skutočný Playwright/manual; nie finálne uzavreté. |
| OW-03 | Produktová úprava: odstrániť Like iba vo výsledkoch Sledovaní | Samostatný nasledujúci bod Sledovania | Požiadavka z F03 zostáva otvorená. Aktuálny grid používa zdieľaný `ProfileOfferCard`; pred úpravou zmapovať jeho ovládanie. V iných sekciách Like zachovať, na zadnej strane nepridávať Správu ani Žiadosť. |
| OW-04 | Hlásená chyba prekladu: poľské „Páči sa mi to“ na zadnej strane karty | Riešiť v samostatnom kroku Sledovania | Nález F12 z manuálneho kola. Znovu overiť aktuálny kľúč a kontext; nezamieňať s tromi chýbajúcimi kľúčmi Nástenky nižšie. Potrebný retest poľštiny a kontrola ostatných jazykov. |
| OW-05 | Otvorené produktové/UX overenie: vstup do výsledkov v iOS PWA | Spojiť s plánovanými mobilnými výsledkami | M10 prešiel v Safari, v PWA nebol dostupný bežný navigačný vstup. Aktuálne existuje mobilné oznámenie so správcom, nie mobilný výsledkový zoznam. Neprezentovať to ako hotové mobilné výsledky. Pri mobilnej fáze overiť vstup, URL, Späť a dostupný obsah. |
| OW-06 | Neúplné overenie: produkčné CORS domény | Zmapovať v overovacom kroku pred uzavretím sekcie | Varovanie o fallback doménach samo nepotvrdzuje chybu. Porovnať reálne frontend/API adresy, pôvod požiadaviek a nastavenie; bez dôkazu nič neprepisovať. Ak sa potvrdí bezpečnostný alebo funkčný problém, odporučiť okamžitú opravu. |
| OW-07 | Neúplné overenie: skutočné vypršanie prihlasovacej relácie | Samostatný povinný test pred uzavretím sekcie | E12 overil odhlásenie v druhej karte a Back, nie samotnú expiráciu. Overiť skutočnú expiráciu a neprístupnosť starých výsledkov na desktope aj mobile. Potvrdený únik alebo obídenie prístupu riešiť hneď. |
| OW-08 | Opatrné upratanie historických testovacích dát a času karty | Samostatný dátový krok po presnom mapovaní a schválení | Starý súhrn uvádza dočasné účty/karty a kartu ID 165, ktorú nemažeme. Pred zásahom overiť aktuálny stav, vlastníctvo a naviazané údaje a predložiť presné ciele. Žiadne automatické hromadné mazanie podľa názvu. Historicky uvedený pôvodný čas ID 165: `2026-09-24 14:23:42.345562 UTC`; aktuálna hodnota ani potreba zmeny zatiaľ neboli znovu overené. |

Ďalší nález z aktuálneho mapovania (nie jeden z pôvodných ôsmich bodov):

| ID | Položka | Odporúčanie | Stav a ďalšie overenie |
| --- | --- | --- | --- |
| OW-09 | Poškodený kurzor a neexistujúce sledovanie sa na frontende nerozlišujú | Zoznam; samostatné mapovanie pred prípadnou opravou, nie tichá zmena API pri OW-02 | Backendový test a lokálna diagnostika potvrdili 404 pre poškodený kurzor; normalizer mapuje každé 404 na not_found a panel obnovuje zoznam sledovaní. Nejde o novú fyzickú produkčnú reprodukciu ani potvrdený bezpečnostný problém. Bežné serverové kurzory nemajú potvrdené poškodzovanie; Obnoviť umožňuje návrat na prvú stránku. |

Testovacia medzera priamo patriaca do OW-02:

| ID | Položka | Odporúčanie | Stav a podmienka uzavretia |
| --- | --- | --- | --- |
| TEST-01 | Existujúce testy nekontrolovali notice za poslednou kartou ani skutočný chybový catch loadMore | Lokálne doplnené pri OW-02; dokončiť živé overenie | Nové testy poradia, retry, zachovania kurzora/kariet, pending/stale/cancelled a unmount tokov PASS. Panel/notice/hook majú 100 % všetkých metrik, spoločné FE vetvy 99,58 % pri zachovanom 95 % gate. Playwright geometriu dopĺňa nový scenár, jeho skutočný beh čaká na nasadenie. Zber 27 project-scenárov nie je E2E PASS. |

## Nálezy mimo aktuálneho kroku

| ID | Položka | Odporúčanie | Stav a ďalšie overenie |
| --- | --- | --- | --- |
| APP-01 | Tri chýbajúce kľúče Nástenky: `feed.captionPlaceholder`, `feed.commentsClose`, `feed.openProfile` | Zoznam; samostatná oprava po dokončení Sledovania | 13. 10. potvrdené kontrolou použitých kľúčov a nezmenenými súbormi main. Doplniť vhodné texty vo všetkých šiestich jazykoch a overiť skutočné miesta zobrazenia. Nie je to OW-04. |
| ENV-01 | Dva backendové testy kontroly obrázkov blokuje Windows/gRPC | Zoznam problémov prostredia; overiť pred finálnym testovacím uzavretím | Rovnaké zlyhania reprodukované aj na čistom main bez OW-01. `grpc._cython.cygrpc` blokuje Windows Application Control. Overiť v podporovanom prostredí bez vypínania ochrán; meniť kód obrázkov ani avatarov týmto krokom nie je autorizované. Celý backend preto nemožno označiť za úplne zelený. |
| TECH-01 | `DashboardContent.tsx`: 695 riadkov pri kontrole 13. 10. | Zoznam technického dlhu; nie automatická oprava | Podľa svaply.mdc `.tsx` nad 500 riadkov nahlásiť a nemeniť. Pred prípadnou budúcou prácou znovu overiť aktuálny súbor a vyžiadať potrebnú výnimku, ak pravidlo stále platí. |
| TECH-02 | `src/lib/api.ts`: 907 riadkov pri kontrole 13. 10. | Zoznam technického dlhu; nie automatická oprava | Rovnaká podmienka pre `.ts` nad 500 riadkov. Zdieľaná API/auth logika potrebuje samostatné mapovanie a regresiu, nie tichý refaktor pri Sledovaní. |
| TOOL-01 | `next lint` vyžaduje interaktívnu konfiguráciu | Zoznam testovacieho tooling-u | Bez zmeny repo konfigurácie prešiel spoločný cielený ESLint cez existujúce API a `next/core-web-vitals`: 18 súborov, 0 chýb/varovaní. Prípadnú neinteraktívnu konfiguráciu riešiť samostatne, bez oslabenia pravidiel. |

## Nálezy Rabbit review PR #168

| ID | Položka | Odporúčanie | Stav a ďalšie overenie |
| --- | --- | --- | --- |
| DOC-01 | Dva platné review komentáre: lokálne Markdown odkazy sú mimo autorovho checkoutu nefunkčné | Opraviť hneď v tomto review kole; nejde o chybu logiky aplikácie | Opravené relatívne odkazy v štyroch dokumentoch. Súkromná chatová príloha je označená ako neprístupná mimo chatu; nekopíruje sa do verejného Gitu. Všetky lokálne repo odkazy boli overené voči existujúcim cieľom. Čaká následná Rabbit kontrola. |
| DOC-02 | Pre-merge upozornenie: Rabbit dokumentačné pokrytie 67,96 % naprieč FE/BE | Doplniť popisy hneď bez zmeny správania; neodkladať do funkčných fáz | Doplnený JSDoc chýbajúcich pomenovaných FE funkcií a pomocníkov v rozsahu OW-01/02. Lokálny TS AST audit: 55/55, 100 %. Toto nie je rovnaký algoritmus ako Rabbit; jeho nové skóre zatiaľ nepotvrdené. Emitovaný JavaScript všetkých 16 upravených TS/TSX súborov je pri odstránení komentárov identický s HEAD 1265d1d1. Python sa v tomto kole nemenil. |

Podrobnosti rozhodnutí a výsledkov tohto dokumentačného kola:
[overenie PR #168](offer-watch-rabbit-168-2026-10-13.md).
APP/ENV/TECH/TOOL a OW-09 týmto review kolom nie sú automaticky uzavreté.

Konkrétne testy ENV-01:

- `swaply/test/test_image_moderation_extra.py::test_racy_only_allows_when_policy_false`
- `swaply/test/test_image_moderation_extra.py::test_get_client_strict_mode_raises`

## Odložené testy a povinné regresie

| ID | Čo overiť | Stav |
| --- | --- | --- |
| RET-01 / M13 | Neželaný zapamätaný text nad systémovou lištou iPhonu pri Cena od | Odložené, nie PASS/FAIL; pripomenúť pri ďalšom fyzickom iOS testovaní. |
| RET-02 / M14 | Rovnaký jav pri Cena do | Odložené, nie PASS/FAIL. |
| RET-03 / M33 | Porovnanie Cena od/do a systémovej lišty v Safari a nainštalovanej PWA | Odložené, testovať spolu s M13/M14. |
| REG-01 / M32, neskôr R05 | Pevná šírka mobilnej editácie bez horizontálneho posúvania | Historická chyba bola opravená; neskorší manuálny R05 prešiel. Nie je to nový otvorený nález. Zachovať ako regresiu pri ďalšom zásahu do formulára. |

## Zdroje a hranice evidencie

- Manuálny súhrn 24.–25. 9. 2026:
  používateľova súkromná príloha `Pasted text.txt` z tohto chatu. Nie je súčasťou
  repozitára ani verejne dostupným zdrojom; ostatní čitatelia k nej nemajú prístup.
  Súpis otvorených bodov z nej je zachovaný v tomto registri. Príloha sa do Gitu nekopíruje.
- Implementácia a kontroly OW-01:
  [súhrn nulových cien](offer-watch-zero-prices-2026-10-13.md).
- Mapovanie, diagnostické kontroly a plán testov OW-02:
  [mapovanie stránkovania](offer-watch-pagination-map-2026-10-13.md).
- Implementácia a spoločné lokálne kontroly OW-01/02:
  [implementácia stránkovania](offer-watch-pagination-implementation-2026-10-13.md).
- Checklist po review a nasadení:
  [spoločné manuálne testy](offer-watch-ow01-ow02-manual-2026-10-13.md).
- M13/M14/M33 pochádzajú z používateľovho odloženého iOS testovania; nie sú
  nahradené automatickými testami alebo zberom Playwright scenárov.
- Pri starších nálezoch nie je bez nového overenia tvrdené, že sa odvtedy
  nezmenil kód alebo produkčné dáta. Pri mapovaní sa vždy overí aktuálny stav.
- Toto je register známych položiek, nie dôkaz, že celá aplikácia nemá ďalšie chyby.
- Mobilné výsledky, ďalšie funkčné fázy a finálna stabilizácia zostávajú v pláne
  práce. Nie sú automaticky označené ako chyby ani ako dokončené.
- Avatar je podľa používateľa mimo našej ďalšej práce.

## Terajšie odporúčanie

OW-01 aj OW-02 sú implementované a lokálne overené. Používateľ výslovne povolil
commit a push v tomto kole; Rabbit kontrolu odosiela sám. Nasleduje review,
nasadenie s 0123 a spoločný živý/manuálny retest. Pri úspechu sa mapuje OW-03.
APP/ENV/TECH/TOOL a OW-09 položky zostávajú v zozname, nie potichu opravené.
OW-01/02 ešte nie sú finálne uzavreté iba na základe lokálnych testov.
M13/M14/M33 povinne pripomenúť pri tomto testovacom cykle.

## Denník zmien

- 13. 10. 2026: založená spoločná evidencia. Zapísaných všetkých osem následných
  bodov septembrového kola, päť nálezov/problémov mimo aktuálnej opravy a odložené
  iOS overenia. OW-01 označené ako implementované, nie finálne uzavreté.
  OW-02 znovu potvrdené v aktuálnom kóde. V tomto kole sa nemenila logika aplikácie.
- 13. 10. 2026, mapovanie OW-02: uzavretá príčina a rozsah minimálnej opravy.
  Diagnostika: 30 frontendových testov PASS, coverage gate vetiev FAIL pri 83,07 %,
  16 backendových testov PASS. Pridané TEST-01 (doplniť pri OW-02) a OW-09
  (samostatný okrajový nález do zoznamu). Žiadna implementácia alebo produkčný zásah.
- 13. 10. 2026, implementácia OW-02: malý panelový presun + samostatné notice,
  žiadna zmena hooku/API/backendu. Predopravový RED a finálny PASS zaznamenané.
  399 FE sád / 5 458 testov, 35 Offer Watch sád / 275 testov, opakovane 185 BE testov PASS.
  Pridané read-only E2E stránkovania a spoločný manuálny checklist s M13/M14/M33.
  TEST-01 lokálne doplnený; živá geometria čaká. Existujúce APP-01/ENV-01
  zostávajú otvorené, nepribudla nová potvrdená chyba z finálnych lokálnych kontrol.
  Commit/push autorizovaný používateľom, review spúšťa používateľ; nič sa nenasadzuje.
- 13. 10. 2026, Rabbit PR #168 na 1265d1d1: overené dva platné komentáre o
  neprenosných odkazoch a dokumentačné pre-merge upozornenie. DOC-01/02 odporučené
  opraviť hneď a lokálne opravené. Opakovaných 275 testov PASS, cielené vetvy
  99,58 %, TypeScript a lint PASS; JSDoc audit 55/55. Správanie sa nemenilo,
  backend/migrácie ani používateľova rozpracovaná práca sa neupravujú.
  Čaká nový Rabbit výsledok a pôvodný plánovaný živý/manuálny retest OW-01/02.
