# OW-10 – mapovanie nefunkčného vstupu do Sledovaní zo stránky /search

Dátum: 13. 10. 2026. Dokument zachováva pôvodné mapovanie aj následné overenie.
Používateľ po mapovaní schválil implementáciu; aktuálny výsledok je v poslednej
sekcii. Oprava je iba lokálna. Bez commitu, pushu, zmeny vetvy alebo nasadenia.

## Verzia a reprodukcia

- Lokálny checkout: `offer-watch-zero-prices`, HEAD `f95e8eff6b9cfb7edfa059915ffe397c385bff74`.
- PR #168 je zlúčené od 13. 10. 2026; aktuálne main pri overení:
  `aa38fdfc69aa1cb99b5335cb4191f0edd0a32456`.
- `SearchLayout.tsx` z main je obsahovo identický s lokálnym súborom
  po normalizácii koncov riadkov. GitHub blob: `140c22227bd1d0810dd9977878582c8dd1fa2fc2`.
- Používateľova reprodukcia: desktop → panel Vyhľadávanie → text `te` →
  Zobraziť všetko → `/search?q=te` → klik na Sledovania v hlavnom ľavom menu.
  Obsah aj URL zostanú na vyhľadávaní.
- V tomto kole nebola spustená nová fyzická browser/PWA reprodukcia.
  Príčina je podložená používateľovým manuálnym výsledkom, aktuálnym kódom
  a spustením pôvodných callbackov, nie iba odhadom.

## Potvrdená príčina

1. [SearchResults.tsx](../../frontend/src/components/dashboard/modules/search/components/SearchResults.tsx)
   má `handleViewAllClick` (riadky 63–77). Pre `te`, oba typy výsledkov a bez
   filtrov skutočne volá `router.push('/search?q=te')`. Tento cieľ nie je
   dashboardový vyhľadávací panel `/dashboard/search`.
2. [search/layout.tsx](../../frontend/src/app/search/layout.tsx) používa samostatný
   [SearchLayout.tsx](../../frontend/src/components/search/SearchLayout.tsx), nie navigáciu Dashboardu.
3. [Sidebar.tsx](../../frontend/src/components/dashboard/Sidebar.tsx) vykresľuje
   položku `watches` a odovzdáva klik do `onItemClick(itemId)` (riadok 237).
   Sledovania nemajú výnimku ani deaktivované tlačidlo.
4. `SearchLayout` pripája `onItemClick={handleItemClick}` (riadok 129).
   Jeho handler na riadkoch 26–40 pozná `home`, `favorites`, `requests`,
   `profile` a `settings`; `search` sa rieši osobitne otvorením panela.
5. Pre `watches` chýba vetva. Kód na riadku 37 vykoná `else return`, ešte
   pred `router.push(url)` na riadku 38. Preto sa nemení URL ani hlavný obsah.

Kód dashboardovej cieľovej obrazovky naopak existuje:

- [dashboardRoutes.ts](../../frontend/src/components/dashboard/components/dashboardRoutes.ts),
  riadok 151: modul `watches` má adresu `/dashboard/watches`.
- [dashboard/watches/page.tsx](../../frontend/src/app/dashboard/watches/page.tsx)
  odovzdáva `initialRoute="watches"`.
- [ModuleRouter.tsx](../../frontend/src/components/dashboard/ModuleRouter.tsx),
  riadok 250: desktop vykreslí `OfferWatchResultsDesktop`, mobil existujúce oznámenie.

Nejde teda o neexistujúcu výsledkovú stránku, chybu cenového filtra, API,
čakanie na odpoveď ani neschopnosť rozpoznať dvojznakové `te`. V tejto vetve
sa presmerovanie vôbec nevolá. Samotný text `q` handler `SearchLayout` nečíta;
problém nie je obmedzený iba na konkrétny výraz `te`.

## Vykonaná diagnostika bez zmeny aplikácie

Pomocou TypeScript AST sa zo súborov načítali pôvodné deklarácie callbackov.
Po odstránení typov sa spustili vo VM s pamäťovým `router.push` spy a testovacím
identifikátorom, bez siete a bez produkčných účtov. Logika sa nereimplementovala
do kópie. Klik sa preniesol cez pôvodný callback Sidebaru do pôvodného handlera
SearchLayout. Nejde o úplný React alebo Playwright E2E beh.

| Položka v SearchLayout | Výsledok pôvodnej obsluhy |
| --- | --- |
| Nástenka | `/dashboard` |
| Vyhľadávanie | prepnutie bočného search panela bez nového URL, zámerné |
| Správy | ID doručené, 0 volaní router.push |
| Obľúbené | `/dashboard/favorites` |
| Spolupráce | `/dashboard/requests` |
| Upozornenia | ID doručené, 0 volaní router.push; SearchLayout nedáva onNotificationsClick |
| Štatistiky | ID doručené, 0 volaní router.push |
| Sledovania | ID `watches` doručené, 0 volaní router.push – OW-10 potvrdené |
| Profil | vlastný profil podľa slugu testovacej fixture |
| Nastavenia | `/dashboard/settings` |

Existujúce regresné testy: **5 sád / 108 testov PASS**:

- `SearchLayout.viewportHeight.test.tsx`
- `Sidebar.test.tsx`
- `Sidebar.extra.test.tsx`
- `dashboardRoutes.test.tsx`
- `OfferWatchResultsDesktop.test.tsx`

Samostatný diagnostický coverage beh SearchLayout:

- 5 testov viewport sady PASS.
- Riadky 48,43 %, funkcie 25 %, vetvy 8,82 %, statements 41,89 %.
- Príkaz skončil **exit 1**, pretože existujúci 95 % gate nebol splnený.
  Prah sa neznižoval; nie je to zlyhanie testovacieho tvrdenia.
- Celý blok navigácie, riadky 28–38, je v tejto sade nepokrytý.

## Prečo doterajšie testy chybu nezachytili

- `SearchLayout.viewportHeight.test.tsx` nahrádza Sidebar jednoduchým `<div>`.
  Kontroluje výšku a scroll okna, nie reálny klik alebo cieľ navigácie.
- Test Sidebaru overuje prítomnosť/poradie položky Sledovania; callback rodiča
  je mock. Neoveruje handler samotnej stránky `/search`.
- Test trás overuje existenciu cieľovej obrazovky a správny modul. Neoveruje,
  že sa do nej dá dostať z každého iného rozloženia.
- Doterajší Offer Watch Playwright vstupuje do výsledkov cez priamu adresu.
  Neobsahuje celý reťazec Zobraziť všetko → `/search` → Sledovania.
- Ide o chýbajúci integračný scenár medzi dvoma rozloženiami, nie dôkaz,
  že vykonané cenové alebo stránkovacie testy boli neúspešné.

## Navrhnutý minimálny rozsah opravy OW-10 – až po pokyne používateľa

- Upraviť iba navigačný handler v `SearchLayout.tsx` (168 riadkov): podporiť
  `watches` a existujúci cieľ `/dashboard/watches`.
- Neobchádzať Next router prechodom cez samotné `history.pushState`: odchádza
  sa z iného rozloženia a musí sa namountovať skutočná dashboardová stránka.
- Nepreniesť vyhľadávací parameter `q` ako filter sledovania. Výsledky si naďalej
  vyberajú vlastné sledovanie; následné `?watch=ID` je normálne správanie cieľa.
- Zachovať vyhľadávací panel, pôvodné profilové cesty, Nastavenia, neznáme ID,
  uzatváranie panela a Back/Forward. Neprerábať sidebar ani routing celej appky.
- Bez backendu, migrácií, zmien oprávnení, cien, avatarov alebo nových UI textov.
- Nový samostatný Jest súbor `SearchLayout.navigation.test.tsx`; nová
  Playwright regresia v `frontend/e2e/`, nie zásah do existujúceho veľkého testu.
- Cieľ po implementácii: 95 % a viac pre reálne upravovaný SearchLayout,
  nie iba pre extrahovaný drobný helper. Pokryť aj ostatné existujúce handlery
  a interakcie tak, aby sa rozsah nezakrýval mockom rodičovskej navigácie.

### Plán regresií po oprave

1. Reálny Sidebar v SearchLayout: klik Sledovania → presne jeden push na `/dashboard/watches`.
2. Rovnaký klik pri otvorenom aj zavretom vyhľadávacom paneli; mousedown + click.
3. Vstup z `/search?q=te`, iného výrazu, users/offers tabov, filtrov a pri prázdnych
   alebo načítavaných výsledkoch. URL sa zmení a cieľový obsah naozaj existuje.
4. Sledovania bez uložených podmienok: platný empty-state a správca, nie prázdna plocha.
5. Po navigácii Back obnoví pôvodnú `/search` adresu vrátane query; Forward vráti Sledovania.
6. Existujúce Nástenka/Obľúbené/Spolupráce/Profil/Nastavenia ostanú funkčné.
7. Vyhľadávanie ostane panelovou akciou; neznámy identifikátor neskladá ľubovoľnú URL.
8. Rozlíšiť hlavné Sledovania od Nastavenia → Sledovanie; ide o dve rôzne obrazovky.
9. Desktop svetlý/tmavý režim, klávesnica, Chrome a WebKit Desktop Safari.
10. Reálny Railway Playwright po nasadení: úplný reťazec so Zobraziť všetko aj
    priama `/search` adresa. Použiť existujúce hľadateľné testovacie dáta; nevytvárať karty.
    Ak query nemá výsledky a View All nevznikne, daný full-flow test je SKIP, nie PASS.
11. WebKit mobile povinne regresne overí existujúci návrat z `/search` a mobilné
    oznámenie/správu sledovaní, nie skryté desktopové ľavé menu.
12. Uzatváranie search panela, Escape mimo/vo filtrovej modálnej obrazovke,
    klik mimo aj dovnútra, callbacky profilu/karty, logout a null používateľ:
    doplniť lokálne kontrolované testy pre 95 % gate bez zmien existujúceho správania.

V samotnom mapovacom kole ešte nebol pridaný nový regresný test ani Playwright
súbor. Následné implementačné kolo je zaznamenané na konci dokumentu.

## Ďalšie nálezy a guardrails

- **OW-11:** Správy, Upozornenia a Štatistiky majú v tom istom SearchLayout
  rovnaký nedoriešený výstup. Odporúčanie: najprv dohodnúť rozsah samostatnej
  alebo spoločnej opravy. Nepridať ich potichu k OW-10, predovšetkým nezmeniť
  Upozornenia na celé okno bez preverenia ich desktopového panelového kontraktu.
  Ide o výsledok kódovej diagnostiky, nie nové fyzické manuálne testy používateľa.
- **TEST-02:** nepokrytý prechod a slabá coverage SearchLayout. Doplniť priamo
  v oprave OW-10; neznižovať gate ani zamieňať 108 PASS za pokrytie tohto prechodu.
- `.ts/.tsx` nad 500 riadkov, podľa svaply.mdc len nahlásiť a nemeniť:
  `app/search/page.tsx` 646, `hooks/useDashboardState.ts` 921,
  `hooks/useDashboardNavigation.tsx` 510. `DashboardContent.tsx` 695 je už TECH-01.
- Žiadny z týchto veľkých súborov nie je potrebné meniť pre navrhnutú opravu OW-10.
- Používateľ označil ostatné vykonané manuálne testy OW-01/02 ako úspešné a Rabbit
  ako bez nálezov. Nový nález navigácie zostáva oddelený. Bez samostatných výsledkov
  sa nevymýšľa nový živý Playwright PASS, stav produkčnej migrácie alebo presný
  zoznam zariadení/odložených iOS scenárov.

## Záver mapovacieho kola (historický stav)

Príčina OW-10 je potvrdená. Oprava je malá a lokalizovaná mimo veľkých riadiacich
súborov, ale ešte sa nezačala. V tomto kole sa mení iba tento plán a register.
Po dokončení mapovania počkať na používateľovu správu. Až potom potvrdiť rozsah
opravy a implementovať; staré povolenie na push review opráv neplatí pre toto kolo.

## Následná implementácia a druhé overenie

Používateľ 13. 10. schválil opravu OW-10. Pred úpravou bol diff frontend/backend
v našom worktree prázdny; zostávali iba vlastné mapovacie dokumenty. Primárny
checkout bol čistý na main `011b6ce75653573e7ca49d2149a985711d8ce1b5`.
Jeho SearchLayout bol bajtovo rovnaký ako náš pôvodný súbor.

- Jediná runtime zmena v [SearchLayout](../../frontend/src/components/search/SearchLayout.tsx):
  rozpoznanie `watches` a existujúci `router.push('/dashboard/watches')`.
  Komentáre vysvetľujú nezávislé rozloženie. Emitovaný JavaScript po odstránení
  presne tejto novej podmienky je identický s HEAD; žiadna iná runtime zmena.
- Nová [Jest sada](../../frontend/src/components/search/SearchLayout.navigation.test.tsx):
  32 scenárov, reálny Sidebar a jeho skutočná obsluha kliknutia. Pokrýva
  mousedown + click, otvorený/zavretý/znovuotvorený panel, query izoláciu,
  klávesnicu, null používateľa, existujúce ciele, unknown guard, profil/kartu,
  logout, filtre/Escape/outside click a odstránenie event listenerov.
- Predopravový beh: 8 nových scenárov FAIL presne na chýbajúcej navigácii,
  ostatných 24 PASS. Po oprave cielená regresia 9 sád / 150 testov PASS.
  Opakované samostatné kontroly layoutu: 37 PASS a 100 % statements, branches,
  functions aj lines celého SearchLayout, bez zmeny 95 % gate.
- TypeScript a opakovaný scoped ESLint: PASS, 0 chýb/varovaní.
  Súbory majú 171 / 286 / 123 riadkov; žiadny upravovaný TS/TSX nad 500.
- Celý prvý frontendový beh: 399 sád PASS, jedna FAIL; 5 489 testov PASS,
  jeden 5-sekundový timeout existujúcej NotificationSettingsModule sady
  pri vypínaní push subscription. Samostatné opakovanie: 5/5 PASS.
  TEST-03 eviduje nestabilitu; timeout ani logika sa potichu nemenia.
  Druhý celý beh bez súbežných náročných kontrol: 400 sád / 5 490 testov PASS
  za 390,108 s. Prvé zlyhanie ostáva evidované ako nestabilita, nie potvrdená
  chyba aplikácie alebo definitívne vyriešený problém.
- Nový [Railway Playwright](../../frontend/e2e/search-to-offer-watches.spec.ts):
  36 zozbieraných project-scenárov, 22 použiteľných podľa zariadenia;
  WebKit desktop/mobile a Chromium, obe témy. Nevytvára ani neupravuje obsah,
  používa existujúce výsledky a nevypisuje prihlasovacie údaje. Chýbajúci
  full-flow fixture je explicitný SKIP, nie PASS.
- Native Windows WebKit launch blokuje crypto-57.dll; potvrdené Code Integrity
  udalosťami 3077/3033. Existujúci Linux image v1.63.0-noble následne reálne
  spustil prehliadače; ochrany nezmenené, nič nové sa nesťahovalo (TOOL-02).
  Prvý Linuxový pokus ukázal nezhodu testovacieho názvu s existujúcim slovenským
  prekladom; test zosúladený s aktuálnym textom, preklady aplikácie nezmenené.
- Finálne nasadené desktopové pokusy vo WebKit: priama `/search?q=te` aj
  úplný reťazec panel → vyhľadávanie → Zobraziť všetko prešli po samotný klik
  na Sledovania; potom oba FAIL s nezmenenou `/search?q=te`. Potvrdzujú
  pôvodnú produkčnú chybu, nie úspech ešte nenasadenej opravy.
- Nasadený WebKit mobile v light/dark overil skryté desktopové menu, oznámenie
  výsledkov a otvorenie správcu, ale browser Back skončil na
  `/dashboard/settings?tab=offers` namiesto pôvodného oznámenia (2 FAIL).
  Tento samostatný OW-12 ostáva vo výsledkoch a registri, nie je zmenený na PASS.
  Existujúci návratový host je orientovaný na Nastavenia a má rovnaký kód
  v aktuálnom main. Pred opravou treba samostatne zmapovať všetky jeho vstupy.

Na konci samostatného OW-10 kola boli backend, migrácie, API/auth/permissions,
preklady, veľké dashboardové súbory a avatary bez zmien. Primárny checkout
a jeho HEAD ostali nedotknuté; vtedy commit/push ešte nebol povolený.

Následne používateľ schválil mapovanie aj opravu OW-12 a spoločný commit/push
po úspešných kontrolách. [Aktuálny spoločný výsledok](offer-watch-mobile-return-2026-10-13.md)
je 111 scoped testov PASS / 100 % všetkých štyroch produkčných súborov,
409 frontendových sád / 5 604 testov PASS, TypeScript/lint/build PASS a
2 nasadené WebKit kontrolné Settings/direct scenáre PASS. Nová vetva vychádza
z aktuálneho main; nasadený výsledkový retest oboch opráv ešte čaká.
Ďalej spoločné review/testovanie, potom OW-03. OW-11 sa potichu nepripája.
