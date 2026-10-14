# Svaply – spoločná evidencia nálezov a otvorených overení

Aktualizované: 14. 10. 2026.

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
| OW-01 | Potvrdený nesúlad: nulové cenové hranice | Evidovať výsledky a dokončiť chýbajúce explicitné overenia | Implementované a lokálne overené: BE 185 PASS, spoločné FE OW-01/02 275 PASS, celé FE 5 458 PASS. Používateľ 13. 10. uvádza čistý Rabbit a ostatné vykonané manuálne testy OK; PR #168 je zlúčené. Rozpis zariadení/ID, produkčná 0123 a živý Playwright v tejto novej správe nie sú samostatne potvrdené. Nový navigačný nález je OW-10, nie zlyhanie nulových cien. Pri migračnom konflikte nič automaticky nezlučovať ani nemazať. |
| OW-02 | Potvrdené UX: chyba ďalšej stránky a retry nad kartami | Evidovať úspešný manuálny výsledok; nemiešať s OW-10 | Implementované 13. 10., panel/notice/hook coverage 100 %, hook/API bez zmien. Používateľ uvádza Rabbit bez nálezov a ostatné vykonané manuálne testy OK; PR #168 zlúčené. Živý Playwright nemožno označiť PASS bez výsledku konkrétneho behu. Výsledok manuálneho kola sa nezahadzuje kvôli novému chýbajúcemu prechodu z /search. |
| OW-03 | Produktová úprava: odstrániť Like iba vo výsledkoch Sledovaní | Lokálne implementované; review/nasadený retest ešte čakajú | Zmapovaný celý tok Grid → ProfileOfferCard → Front/Back aj ostatní calleri. showLikes má predvolene true, iba OfferWatchMatchGrid posiela false: predné tlačidlo aj celý zadný riadok s textom/srdcom/počtom chýbajú v DOM. Like API, iné kontexty, mobilná karta, rozmery, otočenie a ostatné akcie nezmenené; na zadnú stranu sa nepridáva Správa ani Žiadosť. Pred opravou 4 regresné FAIL, potom opakovane 171 cielených PASS; whole-file coverage 98,08 % statements / 97,83 % branches / 100 % functions+lines, každý dotknutý produkčný súbor má všetky metriky nad 95 %. Celé FE 420 sád / 5 887 PASS, TypeScript, lint a build PASS. Skutočný WebKit na Railway: kontrolné vyhľadávanie a mobilné guidance/profil spolu light/dark 6 PASS, 8 SKIP (7 zámerných device skip a 1 chýbajúci offer fixture); nový demand scenár light/dark 2 pre-deploy RED na stále prítomnom Like. Oprava ešte nie je nasadená, tieto RED ani zber 36 scenárov nie sú nový E2E PASS. |
| OW-04 | Potvrdený nesprávny preklad skills.likes v poľštine aj češtine | Opravené; spoločný commit/push schválený, review/nasadený retest čakajú | Jeden runtime kľúč používa desktop Front/Back, mobilnú kartu a mobilný detail vrátane aria-label/title. Iba PL leaf → Lubię to a identicky chybný CS leaf → Líbí se mi to; SK/EN/DE/HU nezmenené. Pred opravou real-provider regresia 15 FAIL / 28 PASS, po oprave 43 PASS, všetkých 6 jazykov × ponuka/dopyt × desktop/mobile/detail aj prepínanie bez remountu a OW-03 opt-out. Spoločné cielené OW-03/04 214 PASS / všetky merané súbory nad 95 %, celý frontend 421 sád / 5 930 PASS, TypeScript, 13-file lint a build PASS. Jazykový key parity 0 missing/extra; used-key check stále 3 staré APP-01, nie nový PASS. WebKit desktop/mobile na Railway PL/light 2 pre-deploy RED; diagnostický snapshot potvrdzuje starý slovenský label. Zber 12 nových E2E scenárov nie je nasadený PASS. Nie je to APP-01 ani širší APP-02. |
| OW-05 | Otvorené produktové/UX overenie: vstup do výsledkov v iOS PWA | Spojiť s plánovanými mobilnými výsledkami | M10 prešiel v Safari, v PWA nebol dostupný bežný navigačný vstup. Aktuálne existuje mobilné oznámenie so správcom, nie mobilný výsledkový zoznam. Neprezentovať to ako hotové mobilné výsledky. Pri mobilnej fáze overiť vstup, URL, Späť a dostupný obsah. |
| OW-06 | Neúplné overenie: produkčné CORS domény | Zmapovať v overovacom kroku pred uzavretím sekcie | Varovanie o fallback doménach samo nepotvrdzuje chybu. Porovnať reálne frontend/API adresy, pôvod požiadaviek a nastavenie; bez dôkazu nič neprepisovať. Ak sa potvrdí bezpečnostný alebo funkčný problém, odporučiť okamžitú opravu. |
| OW-07 | Neúplné overenie: skutočné vypršanie prihlasovacej relácie | Samostatný povinný test pred uzavretím sekcie | E12 overil odhlásenie v druhej karte a Back, nie samotnú expiráciu. Overiť skutočnú expiráciu a neprístupnosť starých výsledkov na desktope aj mobile. Potvrdený únik alebo obídenie prístupu riešiť hneď. |
| OW-08 | Opatrné upratanie historických testovacích dát a času karty | Samostatný dátový krok po presnom mapovaní a schválení | Starý súhrn uvádza dočasné účty/karty a kartu ID 165, ktorú nemažeme. Pred zásahom overiť aktuálny stav, vlastníctvo a naviazané údaje a predložiť presné ciele. Žiadne automatické hromadné mazanie podľa názvu. Historicky uvedený pôvodný čas ID 165: `2026-09-24 14:23:42.345562 UTC`; aktuálna hodnota ani potreba zmeny zatiaľ neboli znovu overené. |

Ďalšie nálezy z mapovania (nie pôvodných osem bodov):

| ID | Položka | Odporúčanie | Stav a ďalšie overenie |
| --- | --- | --- | --- |
| OW-09 | Poškodený kurzor a neexistujúce sledovanie sa na frontende nerozlišujú | Zoznam; samostatné mapovanie pred prípadnou opravou, nie tichá zmena API pri OW-02 | Backendový test a lokálna diagnostika potvrdili 404 pre poškodený kurzor; normalizer mapuje každé 404 na not_found a panel obnovuje zoznam sledovaní. Nejde o novú fyzickú produkčnú reprodukciu ani potvrdený bezpečnostný problém. Bežné serverové kurzory nemajú potvrdené poškodzovanie; Obnoviť umožňuje návrat na prvú stránku. |
| OW-10 | Desktop /search → hlavné Sledovania nič neurobí | Manuálne a review uzavreté podľa správy používateľa 14. 10. | Oprava v PR #172 zlúčená, nový GitHub CI run 38518639147 celý success. Používateľ potvrdil úspešné manuálne testy a Rabbit kontrolu; presné ID/zariadenia v správe nerozpisuje. Historické RED/PASS a príčina sú zachované v denníku nižšie. Samostatný nasadený automatický Playwright výsledok tejto opravy stále nie je doložený a nenahrádza sa manuálnym hlásením. |
| OW-11 | V SearchLayout chýba aj obsluha Správ, Upozornení a Štatistík | Zoznam; dohodnúť rozsah pred rozšírením OW-10 | Diagnostika pôvodných callbackov potvrdila rovnaký no-op iba v rozložení /search. Nie je to nový fyzický test týchto troch položiek. Upozornenia majú desktopový panelový kontrakt, preto bez ďalšieho mapovania a dohody nepridať presmerovanie na celé okno. Zatiaľ neopravovať. |
| OW-12 | Mobilný návrat zo správcu otvoreného z oznámenia výsledkov končí v Nastaveniach | Manuálne a review uzavreté podľa správy používateľa 14. 10. | PR #172 zlúčený, nový GitHub CI celý success, používateľ uvádza manuálne testy a Rabbit bez nálezov. Pri OW-03 reálny nasadený WebKit-mobile guidance → správca → app Back v light aj dark prešiel bez zápisov. To je konkrétny automatický kontrolný variant; nenahrádza všetky ostatné query/reload/Forward/handoff scenáre. Historické detaily zostávajú v denníku. |
| OW-13 | Review PR #172: results pôvod sa stratí pri mobil → desktop handoff | Manuálne a review uzavreté podľa správy používateľa 14. 10. | Oprava presného returnTarget/depth aj nested responsive roundtrip je zlúčená, GitHub CI celý success. Používateľ potvrdil úspešné manuálne testy a Rabbit; nerozpisuje jednotlivé resize ID, preto sa nevymýšľajú. Lokálna integrácia 16 PASS a spoločná regresia 141 PASS / 100 % scoped metrík. Kompletný nasadený handoff Playwright ešte nie je doložený. |
| OW-14 | Existujúce nefunkčné Otváracie hodiny pri firemnej ponuke vo výsledkoch | Zoznam; samostatné rozhodnutie, nie tichá oprava pri OW-03 | Kód pred aj po OW-03: grid neposiela onOpenHoursClick, Card iba preposiela undefined, Back pri business ponuke vždy vykreslí button. Rodičia nemajú handler; funkčný popover patrí profilu. API údaje hodín poskytuje. Je to potvrdený nesúlad zapojenia podľa kódu, nie nový manuálny produkčný test. Rozhodnúť doplniť popover vs. nezobraziť nefunkčný ovládač; nespájať s odstraňovaním Like. |

Testovacia medzera priamo patriaca do OW-02:

| ID | Položka | Odporúčanie | Stav a podmienka uzavretia |
| --- | --- | --- | --- |
| TEST-01 | Existujúce testy nekontrolovali notice za poslednou kartou ani skutočný chybový catch loadMore | Lokálne doplnené pri OW-02; dokončiť živé overenie | Nové testy poradia, retry, zachovania kurzora/kariet, pending/stale/cancelled a unmount tokov PASS. Panel/notice/hook majú 100 % všetkých metrik, spoločné FE vetvy 99,58 % pri zachovanom 95 % gate. Playwright geometriu dopĺňa nový scenár, jeho skutočný beh čaká na nasadenie. Zber 27 project-scenárov nie je E2E PASS. |
| TEST-02 | SearchLayout testy nenapájajú reálne kliknutie na obsluhu stránky /search | Lokálne doplnené pri OW-10; živý retest po nasadení čaká | Nová sada používa reálny Sidebar aj jeho handler, 32 nových testov. Spolu s viewport sadou opakovane 37 PASS a 100 % statements/branches/functions/lines celého SearchLayout; gate 95 % nezmenený. Nový Playwright má 36 project-scenárov (22 relevantných podľa typu zariadenia), iba existujúci obsah, obe témy, povinné WebKit desktop/mobile aj Chromium. Zber nie je PASS; nasadené desktopové pokusy reprodukujú OW-10 a mobilné OW-12. |
| TEST-03 | Jednorazový 5-sekundový timeout existujúceho testu vypínania push upozornení | Zoznam testovacej stability; sledovať bez tichej zmeny timeoutov alebo logiky | Prvý plný FE beh: 399 sád PASS, jedna FAIL; 5 489 testov PASS, jeden timeout v NotificationsModule.test.tsx / persists disabling push before unregistering the current browser subscription. Bežal súbežne s ďalšími kontrolami; príčina časovania tým nie je dokázaná. Samostatne následne 5/5 PASS a druhý celý beh bez súbežných náročných kontrol: 400 sád / 5 490 testov PASS. Súbor aj produkčná notifikačná logika sú bez zmien, test nemá väzbu na SearchLayout. Prvé zlyhanie sa nezahadzuje ani neoznačuje za definitívne vyriešené. |
| TEST-04 | Jednorazový WebKit action timeout pri stabilizácii tlačidla Profil | Zoznam testovacej stability; nie potvrdená chyba navigácie OW-12 | Nasadený kontrolný test počas súbežného buildu: light zlyhal pred vstupom do Settings, dark prešiel. Opakovanie bez buildu s dotykom podľa existujúcej mobilnej navigácie: oba PASS, bez retry/force/zvýšenia timeoutu. Profil ani jeho logika sa nemenili, príčina pomalého kroku nie je definitívne vysvetlená. Skutočný produktový problém tým nie je vyhlásený ani ticho opravený. |
| TEST-05 | PR #172 CI: testy poškodili jsdom prepisovaním globalThis.window | Uzavreté: nový celý GitHub CI success | Pôvodný log run 38467261951: 3 FAIL / 5 601 PASS. Všetky tri mutácie window odstránené, SSR používa skutočné Node prostredie. Lokálne 141 scoped PASS / 100 % metrík a celé FE 412 sád / 5 636 PASS. Overený nový run 38518639147 na commite 6c196753: celý CI success vrátane frontendu, buildu a backendu. Používateľ následne potvrdil Rabbit a manuálne testy; PR #172 zlúčený. |
| TEST-06 | Živý OW-03 offer scenár nemá existujúcu vlastnú ponukovú zhodu | Zoznam testovacích fixture; dokončiť po nasadení bez automatického seedovania | GET-only discovery našlo dostupný demand fixture, ale nie vhodný offer fixture. Offer scenár sa preto preskočil a nie je PASS; lokálna regresia oba typy a 6 jazykov pokrýva. Pre finálny živý offer beh použiť existujúce sledovanie s verejnou ponukou alebo explicitne dohodnutý testovací obsah. Žiadne vytváranie/deletovanie účtov či kariet len na vynútenie zeleného výsledku. |

## Nálezy mimo aktuálneho kroku

| ID | Položka | Odporúčanie | Stav a ďalšie overenie |
| --- | --- | --- | --- |
| APP-01 | Tri chýbajúce kľúče Nástenky: `feed.captionPlaceholder`, `feed.commentsClose`, `feed.openProfile` | Zoznam; samostatná oprava po dokončení Sledovania | 13. 10. potvrdené kontrolou použitých kľúčov a nezmenenými súbormi main, 14. 10. pri OW-04 znovu rovnaké 3 missing pred aj po oprave. Doplniť vhodné texty vo všetkých šiestich jazykoch a overiť skutočné miesta zobrazenia. Nie je to OW-04. |
| APP-02 | Ďalšie slovenské texty v poľských/českých kartách | Zoznam; samostatná prekladová oprava, nie rozšírenie OW-04 | Pri mapovaní 14. 10. potvrdené runtime hodnoty aj calleri: PL/CS skills.allReviews, skills.edit, skills.message, skills.ratings a skills.detailedDescriptionEmpty zostali slovenské. PL skills.hiddenCard je tiež slovenské; CS Skrytá je však správne a nemá sa mechanicky prekladať. Tieto kľúče používa Back, mobilný detail/karta a mobilná úprava opisu. OW-04 opravuje iba skills.likes v oboch jazykoch; ostatné texty bez tichej hromadnej zmeny. Pred samostatnou opravou znovu skontrolovať aktuálne hodnoty a všetkých 6 jazykov. |
| ENV-01 | Dva backendové testy kontroly obrázkov blokuje Windows/gRPC | Zoznam problémov prostredia; overiť pred finálnym testovacím uzavretím | Rovnaké zlyhania reprodukované aj na čistom main bez OW-01. `grpc._cython.cygrpc` blokuje Windows Application Control. Overiť v podporovanom prostredí bez vypínania ochrán; meniť kód obrázkov ani avatarov týmto krokom nie je autorizované. Celý backend preto nemožno označiť za úplne zelený. |
| TECH-01 | `DashboardContent.tsx`: 695 riadkov pri kontrole 13. 10. | Zoznam technického dlhu; nie automatická oprava | Podľa svaply.mdc `.tsx` nad 500 riadkov nahlásiť a nemeniť. Pred prípadnou budúcou prácou znovu overiť aktuálny súbor a vyžiadať potrebnú výnimku, ak pravidlo stále platí. |
| TECH-02 | `src/lib/api.ts`: 907 riadkov pri kontrole 13. 10. | Zoznam technického dlhu; nie automatická oprava | Rovnaká podmienka pre `.ts` nad 500 riadkov. Zdieľaná API/auth logika potrebuje samostatné mapovanie a regresiu, nie tichý refaktor pri Sledovaní. |
| TECH-03 | `hooks/useDashboardState.ts`: 921 riadkov | Zoznam; podľa svaply.mdc nemeniť | Nájdené pri mapovaní OW-10. Nie je príčinou tohto prechodu; malá oprava SearchLayout ho nepotrebuje. |
| TECH-04 | `app/search/page.tsx`: 646 riadkov | Zoznam; podľa svaply.mdc nemeniť | Rieši samotné výsledky, nie rodičovskú obsluhu menu. Pre OW-10 netreba meniť ani deliť tento súbor. |
| TECH-05 | `hooks/useDashboardNavigation.tsx`: 510 riadkov | Zoznam; podľa svaply.mdc nemeniť | Používa sa v dashboarde, nie ako handler samostatného /search layoutu. Pre OW-10 zostáva bez zásahu. |
| TECH-06 | `profile/ProfileOffersSection.tsx`: 1 108 riadkov | Zoznam; podľa svaply.mdc nemeniť | Overené na aktuálnom main 8b04f513 pri OW-03; vlastní profilové dáta a popover hodín. Zmena Like visibility sa prepája v malej zdieľanej karte bez zásahu do tohto súboru. |
| TECH-07 | `profile/ProfileOffersMobileSection.tsx`: 944 riadkov | Zoznam; podľa svaply.mdc nemeniť | Overené pri OW-03; používa samostatnú mobilnú kartu, ktorá ostáva bez zmien. Žiadny veľký refaktor pri výsledkoch Sledovaní. |
| TOOL-01 | `next lint` vyžaduje interaktívnu konfiguráciu | Zoznam testovacieho tooling-u | Bez zmeny repo konfigurácie prešiel spoločný cielený ESLint cez existujúce API a `next/core-web-vitals`: 18 súborov, 0 chýb/varovaní. Prípadnú neinteraktívnu konfiguráciu riešiť samostatne, bez oslabenia pravidiel. |
| TOOL-02 | Windows WebKit a dostupnosť Docker fallbacku | Native obmedzenie evidovať; Docker pri OW-03 už funguje | 13. 10. native launch skončil pred stránkou; Code Integrity udalosti 3077/3033 potvrdili blokovanú crypto-57.dll. Pri review kole 14. 10. Docker API nebolo pripravené; ani pokus spustiť existujúci Desktop neumožnil E2E. Native kontrolný launch vtedy skončil timeoutom 10 s pred stránkou; timeout nie je nový dôkaz tej istej DLL chyby. Pri následnom OW-03 mapovaní Docker API odpovedá a existujúci Playwright v1.63.0-noble kontajner skutočne vykonal WebKit desktop/mobile proti Railway: 6 kontrolných PASS a 2 očakávané pre-deploy RED. Žiadne sťahovanie obrazu, vypínanie ochrán ani zmeny bezpečnostnej politiky. Predošlý zber 24 navigačných scenárov stále nie je ich živý PASS. |

## Nálezy Rabbit review PR #168

| ID | Položka | Odporúčanie | Stav a ďalšie overenie |
| --- | --- | --- | --- |
| DOC-01 | Dva platné review komentáre: lokálne Markdown odkazy sú mimo autorovho checkoutu nefunkčné | Opravené v review kole | Relatívne odkazy overené, súkromná príloha nepublikovaná. Používateľ následne uvádza Rabbit bez nálezov; PR #168 je zlúčené. |
| DOC-02 | Pre-merge upozornenie: Rabbit dokumentačné pokrytie 67,96 % naprieč FE/BE | Opravená dokumentačná medzera, bez zmeny správania | Doplnený JSDoc, lokálny audit 55/55 a identický emitovaný JS vo všetkých 16 súboroch. Používateľ uvádza novú Rabbit kontrolu bez nálezov; presné nové Rabbit percento nie je v správe, nevymýšľa sa. Python nezmenený. |

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
- Nový desktopový nález a mapovanie prechodu medzi rozloženiami:
  [mapovanie /search → Sledovania](offer-watch-search-navigation-map-2026-10-13.md).
- Nový mobilný návratový nález a spoločné overenie OW-10/12:
  [mapovanie/implementácia mobilného návratu](offer-watch-mobile-return-2026-10-13.md).
- M13/M14/M33 pochádzajú z používateľovho odloženého iOS testovania; nie sú
  nahradené automatickými testami alebo zberom Playwright scenárov.
- Pri starších nálezoch nie je bez nového overenia tvrdené, že sa odvtedy
  nezmenil kód alebo produkčné dáta. Pri mapovaní sa vždy overí aktuálny stav.
- Toto je register známych položiek, nie dôkaz, že celá aplikácia nemá ďalšie chyby.
- Mobilné výsledky, ďalšie funkčné fázy a finálna stabilizácia zostávajú v pláne
  práce. Nie sú automaticky označené ako chyby ani ako dokončené.
- Avatar je podľa používateľa mimo našej ďalšej práce.

## Terajšie odporúčanie

Používateľ 14. 10. potvrdil manuálne testy a Rabbit po navigačnom review kole.
PR #172 je zlúčený a jeho nový GitHub CI celý prešiel. Tieto výsledky sa
nezamieňajú za automatický PASS všetkých historických Playwright scenárov.

Aktuálne je schválené mapovanie a implementácia OW-03 aj OW-04. Pracuje sa v samostatnej
lokálnej vetve offer-watch-card-actions z aktuálneho main 8b04f513, ktorý už
obsahuje aj používateľove opravy scrollu/recenzií z PR #173. Hlavný checkout
ani tieto opravy sa nemenia. Obe úpravy sú lokálne implementované. Používateľ
následne výslovne povolil spoločný commit a push OW-03/04 po kontrolách;
nevzniká tým povolenie na PR, merge, nasadenie ani opravu ďalších položiek.

Po kontrolách a dohodnutom nasadení overiť priamo dotknuté karty. Ďalší
plánovaný bod je OW-05 (mobilný vstup do výsledkov a väzba na mobilnú fázu;
najprv nové mapovanie a dohoda o rozsahu). OW-14
patrí do samostatného rozhodnutia o hodinách, nie do tichej opravy Like.
OW-11/09 a APP/ENV/TECH/TOOL vrátane APP-02 zostávajú evidované. Staršie neúplné živé testy,
migrácia 0123 a odložené M13/M14/M33 nemajú týmto kolom nový úplný výsledok;
pripomenúť ich pri ďalšom relevantnom iOS/formulárovom testovaní. TEST-03/04
ostávajú históriou nestability, nie potvrdenými novými chybami aplikácie.

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
- 13. 10. 2026, mapovanie nového desktopového nálezu: používateľ uvádza čistý
  Rabbit a ostatné vykonané manuálne testy OK, ale /search → Sledovania je no-op.
  Zmapované OW-10 a ďalšie OW-11, doplnené TEST-02 a hlásenia veľkých súborov.
  Príčina potvrdená kódom z aktuálneho main aj spustením pôvodných callbackov.
  108 existujúcich testov PASS; diagnostický 95 % gate SearchLayout FAIL.
  Mení sa iba mapovací dokument a register. Implementácia výslovne čaká na
  nasledujúcu správu používateľa; žiadny commit, push ani produkčný zásah.
- 13. 10. 2026, implementácia OW-10 po schválení používateľom: jedna nová
  navigačná podmienka v SearchLayout, dva nové testovacie súbory. Ostatný
  emitovaný runtime kód zhodný s HEAD. Predopravovo 8 nových testov FAIL,
  následne 150 cielených testov PASS a opakovane 37 layout testov PASS / 100 %
  všetkých scoped coverage metrik. TypeScript a lint PASS. Prvý plný frontend
  mal jeden timeout (TEST-03); izolované opakovanie 5 PASS a finálny celý beh
  400 sád / 5 490 PASS. Produkčný Linux/WebKit potvrdil pôvodný OW-10 pri
  priamej /search aj reťazci Zobraziť všetko; úspech lokálnej opravy čaká na
  nasadenie. Mobilné light/dark pokusy odhalili samostatný OW-12, zachovaný
  ako FAIL a odporúčaný na najbližšie mapovanie. Windows launcher limit
  zaznamenaný ako TOOL-02, použitý existujúci Docker fallback. Primárny main
  aj jeho HEAD bez zmeny, žiadny commit/push/nasadenie ani zmeny backendu,
  migrácií, oprávnení, prekladov alebo avatarov. Používateľ dostane súhrn
  priamo v chate; manuálny retest sa obmedzí na dotknutý navigačný tok.
- 13. 10. 2026, OW-12: zmapované všetky dva skutočné event callery a návratové
  vstupy, potom explicitný výsledkový pôvod + výsledkový Back bez Settings
  callbacku. Staré Settings/direct markery zachované; nový výsledkový vstup
  ruší preukázanú zastaranú Settings obnovu. Opakovaný scoped gate 111 PASS,
  štyri celé produkčné súbory 100 % všetkých metrík. Celý frontend z aktuálneho
  main + oboch opráv: 409 sád / 5 604 PASS. TypeScript, lint a produkčný build
  PASS. Skutočný Linux/WebKit kontrolný Settings/direct tok v oboch témach:
  2 PASS, bez zápisov; TEST-04 eviduje jednorazový pomalý Profil krok pred
  opakovaním. Playwright zber 54 scenárov nie je živý PASS oboch opráv; čaká
  spoločné nasadenie a výsledkový retest. Named production JSDoc audit 33/33,
  emitovaný JS pred/po komentároch zhodný. Všetky upravené TS/TSX pod 500,
  primárny main a jeho HEAD/súbory bez zmeny. Používateľ explicitne povolil
  spoločný commit/push po kontrolách do novej vetvy offer-watch-navigation-fixes;
  nie automatické nasadenie alebo vytvorenie PR. OW-11/09 a staršie odložené
  overenia vrátane M13/M14/M33 ostávajú otvorené.
- 14. 10. 2026, PR #172 review/CI: presný GitHub log potvrdil tri testové
  browser-global chyby (TEST-05); osobitný reálny integračný RED potvrdil
  responsive handoff (OW-13). Oba nálezy riešené teraz v priamom rozsahu.
  SSR testy presunuté do skutočného Node prostredia, viewport helper oddelený;
  prepísanie window odstránené zo všetkých troch dotknutých sád. Results
  management drží desktop returnTarget/depth, resize nepoužíva ordinary
  klik a nepridáva history záznam; reverse resize/Forward obnovia mobilný
  zoznam. Dva následne preukázané nested-roundtrip FAIL tiež opravené:
  zoznamová app šípka použije existujúcu hĺbku, ostatné kroky nezmenené.
  Finálna scoped regresia 11 sád / 141 PASS, šesť celých produkčných súborov
  100 % statements/branches/functions/lines; 95 % prah ostáva. Celé FE
  412 sád / 5 636 PASS, TypeScript, 12-file lint a produkčný build PASS.
  Playwright doplnený o 24 device/theme scenárov na skutočný Railway;
  pokus o živé overenie blokuje TOOL-02 ešte pred stránkou. Zber, blokované
  prostredie ani lokálny Jest nie sú prezentované ako živý E2E PASS.
  Prvé results markery vznikli iba v nezlúčenom PR #172, nie na overenom
  main; neukladali presný source/depth. Ak niekto manuálne používal práve
  túto predopravovú vetvu, musí po aktualizácii správcu nanovo otvoriť z
  výsledkov. Neexistujúca historická URL sa nevymýšľa.
  Všetky dotknuté TS/TSX pod 500; veľké koordinátory a hlavný checkout
  nezmenené, backend/migrácie/avatary bez zásahu. Používateľ výslovne povolil
  commit/push opráv do existujúceho PR #172, nie merge/nasadenie. Ďalej
  overiť nové GitHub CI/review a po nasadení dotknuté návratové scenáre;
  po uzavretí OW-10/12/13 pokračovať OW-03. Ostatné otvorené položky sa nemažú.
- 14. 10. 2026, OW-03: po používateľovom potvrdení manuálnych testov/Rabbit
  overený úspešný nový CI PR #172 a zlúčený main. Nová lokálna vetva vychádza
  z 8b04f513 vrátane používateľových recenzií/scrollu z PR #173, ktoré zostali
  nedotknuté. Zmapovaný celý shared-card tok aj profil, vyhľadávanie a žiadosti.
  Iba results grid vypne predvolene zapnutý showLikes; Front tlačidlo a celý
  Back súhrn chýbajú v DOM, Like API a ostatné akcie/dáta/rozmery nezmenené.
  Žiadne nové zadné CTA. Predopravový RED 4 FAIL, finálna opakovaná regresia
  7 sád / 171 PASS, všetkých päť celých meraných súborov nad 95 % vo všetkých
  metrikách (spolu 98,08 % statements / 97,83 % branches / 100 % functions+lines).
  Celý frontend 420 sád / 5 887 PASS, TypeScript, 11-file lint bez varovaní,
  produkčný build a diff-check PASS. Bez zmien backendu, migrácií, prekladov
  alebo avatarov. Dotknuté TS/TSX pod 500; TECH-06/07 nahlásené a bez zásahu.
  Nových päť Jest súborov a dva Playwright súbory testuje rozsah aj zachovanie
  Like mimo Sledovaní. Reálny read-only WebKit desktop/mobile na Railway:
  svetlé kontrolné kolo 3 PASS / 5 SKIP, tmavé 3 PASS / 3 device SKIP;
  nový demand light/dark 2 pre-deploy RED na starom nasadenom Like, nie
  regresia alebo nasadený PASS lokálnej opravy. Jeden offer fixture chýba
  (TEST-06), nevytváral sa obsah len na vynútenie PASS. OW-14 s hodinami je
  pôvodný nesúlad zapojenia, používateľovi nahlásený a evidovaný na samostatné
  rozhodnutie. Hlavný checkout ostal čistý a nezmenený. Toto kolo nemá nové
  povolenie na commit/push/PR/nasadenie; po dotknutom reteste nasleduje OW-04.
- 14. 10. 2026, OW-04: používateľ následne schválil tento krok a spoločný
  commit/push OW-03/04 po kontrolách. Overené všetky runtime preklady aj štyria
  calleri; nezávislá read-only kontrola potvrdila presnú opravu jedného kľúča
  v PL a CS. Menia sa iba dva riadky v messages/pl.json a messages/cs.json,
  ostatné štyri slovníky, prekladové skripty a aplikačná logika sú nezmenené.
  Nové offerLikesTranslations.test.tsx používa skutočný LanguageProvider
  a nezávislé očakávané texty: pred opravou 15 FAIL / 28 PASS, potom 43 PASS.
  Spoločný OW-03/04 scoped beh 8 sád / 214 PASS; merané celé súbory nad 95 %
  všetkých metrík, spolu 98,08 % statements / 97,83 % branches / 100 %
  functions+lines. Celý FE 421 sád / 5 930 PASS, TypeScript, 13-file lint
  bez varovaní, produkčný build a diff-check PASS. Build vypísal existujúce
  neblokujúce odporúčanie Sentry global-error handlera; žiadne potlačenie
  upozornení alebo rozšírenie opravy. Key parity 0 missing/extra vo všetkých
  jazykoch, used-key kontrola pred aj po stále hlási 3 staré APP-01.
  Nové offer-card-translations.spec.ts zbiera 12 scenárov (8 WebKit), iba
  existujúce karty a žiadne kliknutie Like/zápisy. Reálny Railway WebKit
  desktop/mobile PL/light: 2 pre-deploy RED na chýbajúcom správnom labeli;
  diagnostika oboch snapshotov potvrdila staré Páči sa mi to. Čaká nasadený
  retest, nie je tvrdený nový E2E PASS. Osobitné APP-02 s inými slovenskými
  textami nahlásené používateľovi a evidované bez tichej hromadnej opravy.
  Hlavný checkout/recenzie a backend/migrácie ostali bez zásahu, všetky
  dotknuté TS/TSX pod 500. Spoločný commit/push je autorizovaný do vetvy
  offer-watch-card-actions, nie PR/merge/nasadenie. Manuálny checklist bude
  priamo v chate iba pre dotknuté výsledkové karty a preklady. Ďalší plánovaný
  krok po review a reteste OW-03/04 je mapovanie OW-05; ostatné nálezy vrátane
  OW-14, APP-01/02 a odložených M13/M14/M33 ostávajú zachované.
