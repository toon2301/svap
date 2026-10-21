# Svaply – spoločná evidencia nálezov a otvorených overení

Aktualizované: 21. 10. 2026.

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
| OW-03 | Upresnená produktová úprava: skryť iba prednú Like akciu v Sledovaniach, zadný počet ponechať | Manuálne a review uzavreté podľa používateľa 15. 10. | Spoločná oprava d327b596 je pushnutá, PR #175 zlúčený do main 14c306c0. Používateľ potvrdil úspešné manuálne testy a kontrolu bez nálezov; presný rozpis scenárov a zariadení v novej správe nerozpisuje. Front-only showLikeAction ponecháva read-only súhrn na zadnej strane pre ponuky aj dopyty; ostatní calleri a Like API ostali zachované. Spoločná lokálna regresia 423 sád / 6 059 PASS, cielených 359 PASS, každý meraný súbor nad 95 % všetkých metrík. Historické detaily a pôvodné RED/PASS sú zachované v denníku. Používateľovo manuálne potvrdenie sa nezamieňa za nový automatický nasadený E2E PASS. |
| OW-04 | Potvrdený nesprávny preklad skills.likes v poľštine aj češtine | Manuálne prešiel podľa používateľa; pôvodný PR #174 zlúčený | PL Lubię to / CS Líbí se mi to; ostatné slovníky nezmenené. Používateľ uviedol body 6/7 manuálne PASS. Pôvodné RED/PASS a metriky ostávajú v denníku. V tomto kole sa skills.likes nemení, jeho real-provider testy sa prispôsobili front-only kontraktu OW-03. Nový nález Hodnotenia/Všetky recenzie je časť APP-02, nie nové zlyhanie prekladu Like. |
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
| OW-15 | Mobilný Jazyk: profilová ikona navyše a nadpis pod lištou | Manuálne a review uzavreté podľa používateľa 15. 10. | Oprava v d327b596 / zlúčenom PR #175. Používateľ potvrdil úspešné manuálne testy a čistú kontrolu; nerozpisuje všetky route/device scenáre samostatne. Oba jazykové vstupy majú spoločnú podmienku v MobileTopBar, jeden centrovaný mobilný titulok a žiadny quick-profile; desktop a jazykové handlery ostali zachované. Real-provider sada 79 PASS, spoločných 359 cielených a 6 059 plných FE PASS. Pôvodný živý baseline a coverage sú zachované v denníku; nový automatický nasadený E2E výsledok sa nevymýšľa. |
| OW-16 | Mobilné Zobraziť všetko vo vyhľadávaní používa desktopové karty/flip | Lokálne implementované a automaticky overené; autorizovaný commit/push, potom review a nasadený retest | Obe vetvy používajú nový search-only responzívny adaptér. Desktop deleguje nezmenené props na pôvodnú kartu; mobil používa profilovú kartu, pásik/prvý tap a spodný detail/druhý tap, existujúce hodiny a fungujúci Like. Nepodporované review/contact CTA nepridáva. Profilová karta má nové voliteľné props s pôvodnými defaultmi a ochranu pred keydown z potomkov. Výnimka stránky využitá iba na 2 skutočné prepojovacie riadky (import + self-closing JSX názov); žiadne dátové/URL/filter zmeny. Mobilný stav sa resetuje pri zmene ID/dotazu/stránky alebo prechode na desktop. Inicializačný Like race zachytený a opravený pred odoslaním. Finálne 300 scoped PASS / 99,12 % statements / 95,65 % branches / 100 % functions+lines, vrátane celej legacy stránky s individuálnou výnimkou TEST-08; ostatných 5 súborov má každú metriku nad 95 %. Celý FE 430 sád / 6 221 PASS. Živý WebKit na starej verzii: 4 kontrolné PASS, 2 očakávané mobilné pre-deploy RED, 6 device SKIP. Nie je tvrdený nasadený PASS novej mobilnej vetvy. |
| OW-17 | Desktopové vyhľadávanie: otvorený panel pohltí prvý klik na otočenie | Zoznam; odporúčaná samostatná oprava po OW-16, nie tichá zmena desktopu | Potvrdené na nezmenenom Railway pred nasadením OW-16. SearchLayout zatvára bočný panel pri document.mousedown, grid posunie kartu pred click. Zachytený mousedown na flip pri aria-hidden=false, žiadny click, panel sa stal aria-hidden=true a predná strana ostala; samostatný pokus po Escape s nulovou šírkou panelu otočil kartu prvým klikom. Ďalší pokus potvrdil posun x922→666 a funkčný druhý klik. Žiadne obsahové/Like zápisy. Nový desktopový E2E má výslovne zatvorený panel ako podmienku izolovanej kontroly karty; tým sa OW-17 neskrýva ani nepovažuje za opravené. SearchLayout ostáva bez zmeny. |
| OW-18 | Rovnaká ponuka sa nájde v Safari, nie v PWA/PC v úvodnom paneli | Oddelenie IP krajiny lokálne implementované a automaticky overené; po pushi review a nasadený retest | Fyzická PWA diagnostika následne zachytila Sieť / HTTP 200 / country=CZ / platné zoznamy / 0 kariet, uložená ručná krajina CZ a expirovaný IP záznam SK. To potvrdzuje konkrétne vyradenie slovenských kariet krajinou aj v tomto PWA pokuse, nie historický pôvod ručnej voľby. Pôvodný PC dôkaz mal IP cache CZ a bez viditeľnej ručnej voľby; nejde o dokázaný rovnaký pôvod. Nové searchCountry je oddelené od country/setCountry formulárov, IP sa obnoví aj pri ručnej predvoľbe; backend a pamäť výsledkov sa nemenia. Ak aktuálna IP naozaj vracia CZ, český výsledok je naďalej očakávaný: ručný výber krajiny vo filtroch a prenos do /search ostávajú samostatný neschválený nadväzujúci rozsah. Neexpirujúca cache prázdnych výsledkov bez viewer-ID zostáva otvorená; nie je týmto krokom opravená. Spoločných 507 cielených a 6 867 plných FE testov, TypeScript, lint a build PASS; každá metrika všetkých 9 produkčných súborov nad 95 %. Nové živé country regresie sú na starej produkcii očakávane RED, nie nasadený PASS opravy. |
| OW-19 | Zobraziť všetko → profil → Back stratí scroll výsledkov | Obnova vnoreného main lokálne implementovaná a automaticky overená; po pushi review a nasadený retest | Nový zachytávací krok pred profilovou navigáciou a samostatná obnova v SearchLayout zachovávajú presný záznam histórie, celé URL a účet. Pamäť obsahuje iba obmedzené metadáta (max. 10 záznamov, TTL 30 min), nie výsledky; sessionStorage umožní návrat aj po obnovení dokumentu v rámci dostupnosti úložiska. Načítavacie markery zabránia obnove na skeletonoch. Priebežne zistené pomalé načítanie po limite, starý popstate marker v novom rovnakom URL aj oživovanie opustených záznamov pri nezapisovateľnom úložisku majú opravy a regresie. Spoločných 507 cielených a 6 867 plných FE testov, TypeScript, lint a build PASS. Staré živé meranie 8 návratov a nový prednasadený beh zostávajú RED dôkazy, nie PASS opravy. Existujúci window reset, profilový pôvod a nové feed/message návraty sa nemenia. |

### Následné nálezy z manuálneho kola 18. 10. 2026

Používateľ potvrdil poslednú Rabbit kontrolu PR #183 bez nálezov a ohlásil
nasledujúcich päť bodov. Sú to samostatné následné opravy, nie dôkaz, že celé
manuálne kolo alebo všetky návraty už prešli. Pôvodné hlásenie o presune na vrch
pri „Zobraziť ďalšie“ používateľ výslovne odvolal; nie je súčasťou opráv.

| ID | Položka | Rozsah a aktuálny stav |
| --- | --- | --- |
| OW-20 | Úvodné vyhľadávanie považuje výsledky z pamäte za konečné bez overenia na serveri | Implementovaná a automaticky overená podfáza C v PR #186 na vetve search-cache-revalidation; review dopĺňa úzku opravu obnovenia jednoznakového dotazu. Náhľad je oddelený podľa účtu a dátových filtrov, TTL 5 min / LRU 50; rovnaké dokončené hľadanie vždy overí server aj pri prázdnej cache. Samostatný request guard bráni starým odpovediam zapisovať UI/cache/históriu po zmene kontextu, vyčistení, deaktivácii či unmount. Súbežný rovnaký pokus sa zdieľa iba v tej istej generácii cache; Enter/Apply/submit ruší čakajúci debounce. Platný náhľad ostáva počas overovania viditeľný so stavom načítavania; chyba ani pending empty sa nevydávajú za potvrdený výsledok. Pamäť scrollu, full-search filtre a backendové matchovanie sa nemenia. Cielených 422 testov PASS; všetkých šesť celých dotknutých produkčných modulov má každú metriku nad 95 %. Finálny celý frontend po review oprave: 476 sád / 7 126 PASS, TypeScript, lint upravených súborov a produkčný build PASS. Pôvodný nesúvisiaci testový FAIL zostáva TEST-14; upozornenie po úspešnom ukončení nového celého behu je TEST-15. Živý retest opravy až po nasadení; aktuálny Railway stále reprodukuje pôvodnú chybu. |
| OW-21 | Desktopový browser Back z profilu automaticky otvorí ľavý vyhľadávací panel | Používateľ 18. 10. potvrdil kontrolu aj manuálne testy úspešné; PR #184 je zlúčený do main 95b7a058. SearchLayout začína zatvorený, ručný toggle ostáva. Zatvorený panel má visibility:hidden bez skrytých Tab cieľov a zachováva stav. Pôvodných 538 cielených PASS a história živých behov zostávajú nižšie; používateľovo potvrdenie sa nezamieňa za nový automatický PASS. |
| OW-22 | Desktopový návrat Všetko/Ponuky ukáže vrch a až neskôr obnoví scroll | Používateľ potvrdil review aj manuálne testy úspešné; PR #184 zlúčený. Pôvodné meranie 6,0–6,3 s oproti API 0,14–0,20 s a riadenému zatvoreniu 88/91 ms preukázalo geometriu otvoreného panela. Oprava je spoločná s OW-21; obnovovací hook, slow request, user interruption aj timeout ostali nezmenené. Samostatné automatické výsledky a prípadné problémy harnessu uvádza aktuálny denník, nie toto manuálne potvrdenie. |
| OW-23 | Obe „Zobraziť viac ľudí/ponúk“ majú cieľovú záložku otvoriť od vrchu | Podfáza B lokálne implementovaná pre desktop aj mobil. Používateľ výslovne povolil iba import, zavolanie samostatného hooku a dva handlery v pôvodne 646-riadkovej page.tsx. Nový jednorazový zámer resetuje vnorený main pred vykreslením presnej cieľovej query, nie pri obyčajnej zmene záložky, dát alebo Back/Forward. Existujúce URL payloady a ostatné filtre sa nemenia. Nová logika má 100 % všetkých metrík; celá legacy stránka 93,51 % vetiev s nezmenenou výnimkou TEST-08. Podrobné kontroly a zatiaľ nenasadený stav uvádza denník podfázy B. |
| OW-24 | Desktopové „Zobraziť všetko“ má zavrieť ľavý vyhľadávací panel | Používateľ potvrdil review aj manuálne testy úspešné; PR #184 zlúčený. Cieľový layout je default closed a existujúce onClose ide zo SearchModule priamo do SearchResults pred push, aj pri query-only navigácii; syntetický mousedown je odstránený. Klik/Enter/Space, poradie close/push, presné filtre a mobil bez onClose sú komponentovo overené. Podfáza B toto správanie nemení. |

Podfáza A (OW-21/22/24) je po používateľovom úspešnom review a manuálnom kole
uzavretá v tomto rozsahu. Pre podfázu B (OW-23) boli schválené uvedená úzka
výnimka aj následný commit/push na novú vetvu `search-show-more-top`.
Aktuálna podfáza C (OW-20) je implementovaná a automaticky overená lokálne;
čaká na review a nasadený retest. Používateľ následne výslovne schválil novú
vetvu `search-cache-revalidation`, commit a push; predchádzajúce zápisy
„bez commitu/pushu“ opisujú stav pred týmto schválením. Súvisiaci audit zobrazenia a prenosu filtrov
má samostatné nadväzujúce kroky. OW-17 pri ručne otvorenom paneli nie je
automaticky opravené. Merge, deploy ani otvorenie PR tým nie sú schválené.

Testovacia medzera priamo patriaca do OW-02:

| ID | Položka | Odporúčanie | Stav a podmienka uzavretia |
| --- | --- | --- | --- |
| TEST-01 | Existujúce testy nekontrolovali notice za poslednou kartou ani skutočný chybový catch loadMore | Lokálne doplnené pri OW-02; dokončiť živé overenie | Nové testy poradia, retry, zachovania kurzora/kariet, pending/stale/cancelled a unmount tokov PASS. Panel/notice/hook majú 100 % všetkých metrik, spoločné FE vetvy 99,58 % pri zachovanom 95 % gate. Playwright geometriu dopĺňa nový scenár, jeho skutočný beh čaká na nasadenie. Zber 27 project-scenárov nie je E2E PASS. |
| TEST-02 | SearchLayout testy nenapájajú reálne kliknutie na obsluhu stránky /search | Lokálne doplnené pri OW-10; živý retest po nasadení čaká | Nová sada používa reálny Sidebar aj jeho handler, 32 nových testov. Spolu s viewport sadou opakovane 37 PASS a 100 % statements/branches/functions/lines celého SearchLayout; gate 95 % nezmenený. Nový Playwright má 36 project-scenárov (22 relevantných podľa typu zariadenia), iba existujúci obsah, obe témy, povinné WebKit desktop/mobile aj Chromium. Zber nie je PASS; nasadené desktopové pokusy reprodukujú OW-10 a mobilné OW-12. |
| TEST-03 | Jednorazový 5-sekundový timeout existujúceho testu vypínania push upozornení | Zoznam testovacej stability; sledovať bez tichej zmeny timeoutov alebo logiky | Prvý plný FE beh: 399 sád PASS, jedna FAIL; 5 489 testov PASS, jeden timeout v NotificationsModule.test.tsx / persists disabling push before unregistering the current browser subscription. Bežal súbežne s ďalšími kontrolami; príčina časovania tým nie je dokázaná. Samostatne následne 5/5 PASS a druhý celý beh bez súbežných náročných kontrol: 400 sád / 5 490 testov PASS. Súbor aj produkčná notifikačná logika sú bez zmien, test nemá väzbu na SearchLayout. Prvé zlyhanie sa nezahadzuje ani neoznačuje za definitívne vyriešené. |
| TEST-04 | Jednorazový WebKit action timeout pri stabilizácii tlačidla Profil | Zoznam testovacej stability; nie potvrdená chyba navigácie OW-12 | Nasadený kontrolný test počas súbežného buildu: light zlyhal pred vstupom do Settings, dark prešiel. Opakovanie bez buildu s dotykom podľa existujúcej mobilnej navigácie: oba PASS, bez retry/force/zvýšenia timeoutu. Profil ani jeho logika sa nemenili, príčina pomalého kroku nie je definitívne vysvetlená. Skutočný produktový problém tým nie je vyhlásený ani ticho opravený. |
| TEST-05 | PR #172 CI: testy poškodili jsdom prepisovaním globalThis.window | Uzavreté: nový celý GitHub CI success | Pôvodný log run 38467261951: 3 FAIL / 5 601 PASS. Všetky tri mutácie window odstránené, SSR používa skutočné Node prostredie. Lokálne 141 scoped PASS / 100 % metrík a celé FE 412 sád / 5 636 PASS. Overený nový run 38518639147 na commite 6c196753: celý CI success vrátane frontendu, buildu a backendu. Používateľ následne potvrdil Rabbit a manuálne testy; PR #172 zlúčený. |
| TEST-06 | Živý OW-03 offer scenár nemá existujúcu vlastnú ponukovú zhodu | Zoznam testovacích fixture; dokončiť po nasadení bez automatického seedovania | GET-only discovery našlo dostupný demand fixture, ale nie vhodný offer fixture. Offer scenár sa preto preskočil a nie je PASS; lokálna regresia oba typy a 6 jazykov pokrýva. Pre finálny živý offer beh použiť existujúce sledovanie s verejnou ponukou alebo explicitne dohodnutý testovací obsah. Žiadne vytváranie/deletovanie účtov či kariet len na vynútenie zeleného výsledku. |
| TEST-07 | Kotva desktopovej Playwright karty sa stratí po skrytí prednej strany | Opravené a reálne kontrolne overené; nie produktová chyba | Nový reviews test SK aj CS sa otočil, snapshot ukazoval zadný obsah, ale getByRole na prednej review akcii bez includeHidden sa už nezhodoval. Kotva teraz includeHidden: true, explicitné visibility assertions ostávajú. Rovnaký priamy problém opravený pri Like kotve v staršom OW-04 spec. SK desktop po oprave PASS, PL Like desktop/mobile PASS, SK mobilný dark detail PASS; CS desktop sa dostal k potvrdenému starému nesprávnemu textu. Bez force/retry/zvyšovania timeoutu či produkčnej zmeny. Pôvodné dva selector FAIL sa nezahadzujú. |

### Doplnená testovacia medzera OW-16

| ID | Položka | Odporúčanie | Stav a podmienka uzavretia |
| --- | --- | --- | --- |
| TEST-08 | Historické nedosiahnuteľné vetvy veľkej stránky `/search` | Evidovať transparentne; prípadné upratanie len v samostatnom povolenom kole | Celá skutočná stránka má po 45 integračných scenároch 100 % statements/functions/lines, 93,45 % branches (200/214). Zvyšných 14 vetiev: 6 fallbackov Number(...) ?? ..., 7 null-ID fallbackov, 1 nestringové display-name; Number nikdy nevracia null/undefined a reálny mapper vždy vracia numerické ID a stringové meno. Mock mappera/Number, ignore coverage ani rozšírenie výnimky neboli použité. Samostatný page-only 95 % gate preto správne FAIL. Finálny scope meria všetkých 6 skutočne dotknutých produkčných súborov, vrátane tejto celej stránky; výsledok sa uvádza s touto individuálnou výnimkou, nie ako každý súbor nad 95 %. Konfigurácia hraníc sa nemení. |
| TEST-09 | Jednorazový mobilný WebKit timeout pred otvorením úvodného vyhľadávania | Zoznam testovacej stability; nie potvrdená príčina ani produktová oprava | Prvý spoločný živý beh OW-21/22/24 skončil v tomto variante ešte pred kontrolou panela. Test teraz po jedinom tapnutí výslovne overí URL a viditeľnosť inputu pred sledovaním odpovede; čakanie na odpoveď a vyplnenie majú spoločné Promise.all bez opustenej promise. Samostatný následný beh prešiel vstupom, reálnym HTTP 200 a prechodom na /search, potom skončil na očakávanom starom aria-hidden=false. Bez retry, force, ďalšieho kliknutia či zvýšenia timeoutov. Pôvodný timeout sa nezahadzuje; jeho príčina nie je dokázaná a stabilitu treba overiť aj po nasadení. |
| TEST-14 | Jednorazový FAIL nezmeneného OfferWatchSettingsMobileHost.openState pri browser Back | Zoznam testovacej stability; sledovať, nie tichá úprava pri OW-20 | Prvý dokončený celý frontendový beh: 475/476 sád a 7 117/7 118 testov PASS. Test reports that the screen closed in the same commit that removes it po window.history.back() a pevnom čakaní 20 ms nevidel žiadny súrodenecký layout záznam. Následný nezmenený samostatný beh 2/2 PASS a nový celý beh na finálnych zdrojoch bez súbežných náročných kontrol: 476 sád / 7 121 testov PASS. Host aj test majú nulový diff; test mockuje SettingsMobile a nemá priamu importovú väzbu na nové vyhľadávacie moduly. Príčina časovania nie je dokázaná, preto prvý FAIL zostáva evidovaný a následné PASS sa nevydávajú za jeho opravu. Žiadne zvýšenie timeoutu, preskočenie testu či úprava produkčnej navigácie. |

## Nálezy mimo aktuálneho kroku

| ID | Položka | Odporúčanie | Stav a ďalšie overenie |
| --- | --- | --- | --- |
| APP-01 | Tri chýbajúce kľúče Nástenky: `feed.captionPlaceholder`, `feed.commentsClose`, `feed.openProfile` | Zoznam; samostatná oprava po dokončení Sledovania | 13. 10. potvrdené kontrolou použitých kľúčov a nezmenenými súbormi main, 14. 10. pri OW-04 znovu rovnaké 3 missing pred aj po oprave. Doplniť vhodné texty vo všetkých šiestich jazykoch a overiť skutočné miesta zobrazenia. Nie je to OW-04. |
| APP-02 | Ďalšie slovenské texty v kartách/recenziách | Časť ratings/allReviews lokálne opravená po schválení, zvyšok ostáva v zozname | Používateľ nový nález oboch textov hlásil pre všetky jazyky. Runtime audit a real-provider RED potvrdili ratings v CS/EN/PL a allReviews v CS/PL; SK/DE/HU a EN allReviews boli správne. Opravených presne 5 leaf hodnôt v 3 JSON: CS Hodnocení/Všechny recenze, EN Ratings, PL Oceny/Wszystkie opinie. Nových 44 testov všetkých 6 jazykov desktop/mobile detail a locale-switch PASS. Bez zmeny odkazov, dát alebo pridania reviews odkazu na mobil/dopyt. Zostávajú predošlé skills.edit/message/detailedDescriptionEmpty v CS/PL a hiddenCard v PL; CS Skrytá je správne. Pri čítaní pre terminológiu boli potvrdené aj slovenské reviews.heading/rating v EN/CS: patria širšiemu samostatnému auditu, nie dvom opravovaným kľúčom. Žiadna tichá hromadná úprava. |
| APP-04 | Navrhované: zohľadnenie krajiny a okresu | Odložený produktový návrh; prebrať až po dokončení opráv vyhľadávania | Používateľ 21. 10. výslovne odložil diskusiu. Najprv zmapovať aktuálne odporúčania a dohodnúť zdroj krajiny aj správanie okresu (prísny filter alebo iba uprednostnenie). Konkrétne pravidlá zatiaľ nie sú schválené; nejde o potvrdenú chybu ani povolenie na implementáciu. Nepridávať do aktuálnej opravy vyhľadávania. |
| APP-05 | Asynchrónne overenie položky histórie môže prepísať novší dotaz | Zoznam; samostatná úzka oprava po dohode, nie tichá zmena pri opisovom matchingu | Zdrojový audit `useRecentSearches.tsx` potvrdil chýbajúcu kontrolu kontextu pred zápisom výsledku overenia histórie. Možný sled: pomalý historický klik, nový dotaz a jeho odpoveď, potom dokončenie starej histórie. Nejde o fyzickú reprodukciu pôvodnej fotografie ani o dokázanú chybu nového OW-20 request guardu. Produkčný hook v tomto kole bez zmien. |
| ENV-01 | Dva backendové testy kontroly obrázkov blokuje Windows/gRPC | Zoznam problémov prostredia; overiť pred finálnym testovacím uzavretím | Rovnaké zlyhania reprodukované aj na čistom main bez OW-01. `grpc._cython.cygrpc` blokuje Windows Application Control. Overiť v podporovanom prostredí bez vypínania ochrán; meniť kód obrázkov ani avatarov týmto krokom nie je autorizované. Celý backend preto nemožno označiť za úplne zelený. |
| TECH-01 | `DashboardContent.tsx`: 695 riadkov pri kontrole 13. 10.; 711 pri remapovaní 17. 10. | Zoznam technického dlhu; nie automatická oprava | Podľa svaply.mdc `.tsx` nad 500 riadkov nahlásiť a nemeniť. Aktuálne zmeny používateľa sú zachované a súbor sa pri OW-18/19 nemení. Pred prípadnou budúcou prácou vyžiadať potrebnú výnimku, ak pravidlo stále platí. |
| TECH-02 | `src/lib/api.ts`: 907 riadkov pri kontrole 13. 10. | Zoznam technického dlhu; nie automatická oprava | Rovnaká podmienka pre `.ts` nad 500 riadkov. Zdieľaná API/auth logika potrebuje samostatné mapovanie a regresiu, nie tichý refaktor pri Sledovaní. |
| TECH-03 | `hooks/useDashboardState.ts`: 921 riadkov | Zoznam; podľa svaply.mdc nemeniť | Nájdené pri mapovaní OW-10. Nie je príčinou tohto prechodu; malá oprava SearchLayout ho nepotrebuje. |
| TECH-04 | `app/search/page.tsx`: 646 riadkov | Zoznam; podľa svaply.mdc nemeniť | Rieši samotné výsledky, nie rodičovskú obsluhu menu. Pre OW-10 netreba meniť ani deliť tento súbor. |
| TECH-05 | `hooks/useDashboardNavigation.tsx`: pôvodne 510, pri remapovaní 17. 10. 514 riadkov | Zoznam; podľa svaply.mdc nemeniť | Používa sa v dashboarde, nie ako handler samostatného /search layoutu. Nové návraty feedu a správ používateľa sú zachované; OW-18/19 do súboru nezasahuje. |
| TECH-06 | `profile/ProfileOffersSection.tsx`: 1 108 riadkov | Zoznam; podľa svaply.mdc nemeniť | Overené na aktuálnom main 8b04f513 pri OW-03; vlastní profilové dáta a popover hodín. Zmena Like visibility sa prepája v malej zdieľanej karte bez zásahu do tohto súboru. |
| TECH-07 | `profile/ProfileOffersMobileSection.tsx`: 944 riadkov | Zoznam; podľa svaply.mdc nemeniť | Overené pri OW-03; používa samostatnú mobilnú kartu, ktorá ostáva bez zmien. Žiadny veľký refaktor pri výsledkoch Sledovaní. |
| TECH-08 | `modules/search/SearchUserProfileModule.tsx`: pôvodne 528 riadkov | Po používateľovom rozdelení už nie je nad limitom | Remapovanie aktuálneho main e7359f1b potvrdilo 235 riadkov; nové useForeignProfileData/useForeignProfileActions majú 150/171. Toto nie je naša úprava OW-18/19. Pôvodný nález zostáva zachovaný ako história, neplatí už tvrdenie o aktuálnych 528 riadkoch. |
| TECH-09 | `skills/SkillDescriptionModal.tsx`: 502 riadkov | Zoznam; podľa svaply.mdc nemeniť | Overené pri mapovaní odchodu/Zrušiť vo formulári. Krajinu oddeľujeme v malom kontexte a vyhľadávacom hooku, nie úpravou tohto modalu. |
| TECH-10 | `skills/skillDescriptionModal/hooks/useSkillsDescriptionScreenState.ts`: 638 riadkov | Zoznam; podľa svaply.mdc nemeniť | Overené pri mapovaní predvyplnenia mobilných formulárov; pôvodný kontrakt aj veľký súbor ostávajú bez zásahu. |
| TECH-11 | `components/dashboard/components/DashboardContentView.test.tsx`: 895 riadkov | Zoznam; podľa pravidla pre TS/TSX nad 500 riadkov nemeniť | Nájdené pri read-only overení zapojenia vyhľadávacieho overlayu v review PR #186. Súbor má nulový diff a oprava ho nepotrebuje; žiadne rozdeľovanie testov v tomto kole. |
| TOOL-01 | `next lint` vyžaduje interaktívnu konfiguráciu | Zoznam testovacieho tooling-u | Bez zmeny repo konfigurácie prešiel spoločný cielený ESLint cez existujúce API a `next/core-web-vitals`: 18 súborov, 0 chýb/varovaní. Prípadnú neinteraktívnu konfiguráciu riešiť samostatne, bez oslabenia pravidiel. |
| TOOL-02 | Windows WebKit a dostupnosť Docker fallbacku | Native obmedzenie evidovať; Docker pri OW-03 už funguje | 13. 10. native launch skončil pred stránkou; Code Integrity udalosti 3077/3033 potvrdili blokovanú crypto-57.dll. Pri review kole 14. 10. Docker API nebolo pripravené; ani pokus spustiť existujúci Desktop neumožnil E2E. Native kontrolný launch vtedy skončil timeoutom 10 s pred stránkou; timeout nie je nový dôkaz tej istej DLL chyby. Pri následnom OW-03 mapovaní Docker API odpovedá a existujúci Playwright v1.63.0-noble kontajner skutočne vykonal WebKit desktop/mobile proti Railway: 6 kontrolných PASS a 2 očakávané pre-deploy RED. Žiadne sťahovanie obrazu, vypínanie ochrán ani zmeny bezpečnostnej politiky. Predošlý zber 24 navigačných scenárov stále nie je ich živý PASS. |

### Ďalší nesúvisiaci jazykový nález

| ID | Položka | Odporúčanie | Stav |
| --- | --- | --- | --- |
| APP-03 | Niektoré názvy záložiek a navigačných tlačidiel vyhľadávania sú priamo slovenské literály | Zoznam; samostatný prekladový krok, nie tichá úprava pri OW-21/22/24 | Potvrdené v app/search/page.tsx: Všetko/Ľudia/Ponuky a obe Zobraziť viac; SearchResults používa literál Zobraziť všetko. Aktuálna oprava nemení žiadny používateľský text ani prekladové JSON. Pri riešení doplniť všetkých šesť jazykov a reálne miesta zobrazenia. |

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

Pôvodný OW-03/04 commit 223846e2 je odoslaný a PR #174 je zlúčený do main
a7c04647. Pred touto opravou mal pracovný checkout čistý diff a jeho relevantný
obsah sa zhodoval s novým main; používateľove opravy recenzií/scrollu ostávajú.
Používateľ uviedol manuálne body 3/4/6/7/8 PASS, pri 1/2 upresnil želaný zadný
Like súhrn a pri 5 hlásil nesprávne dva preklady. Nové mobilné nálezy sú OW-15/16.

Používateľ následne výslovne povolil druhé kolo OW-15 a spoločný commit/push
oboch opravovaných bodov po úspešných kontrolách do offer-watch-card-actions.
Tento najnovší pokyn nahrádza prvokolový zákaz odoslania, ale nepovoľuje nové PR,
merge ani nasadenie. Predchádzajúci zákaz ostáva zachovaný v historickom denníku.

Používateľ 15. 10. potvrdil úspešné manuálne testy oboch opravných bodov aj
kontrolu bez nálezov. Fetch overil zlúčený PR #175 a main 14c306c0 s rovnakým
obsahom ako pracovný d327b596. Pred OW-16 bol pracovný diff čistý.

Teraz je schválené mapovanie a oprava OW-16, potom commit/push a nové review.
Používateľ výslovne povolil úzku výnimku pre import/JSX prepojenie v nadlimitnom
app/search/page.tsx. Použité sú iba 2 prepojovacie riadky; všetka nová logika
je v malých search-only súboroch. Po dokončení kontrol oboch vstupov a desktopu
commitnúť/pushnúť, nie merge/nasadenie. OW-17 je nový potvrdený starší desktopový
nález odporúčaný na samostatný krok; TEST-08 je transparentná legacy coverage
medzera, nie dôvod falšovať testy alebo rozšíriť povolenú výnimku. Až po týchto dohodnutých opravách sa
vrátiť k OW-05 a ďalším fázam Sledovania. OW-14 patrí do samostatného rozhodnutia
o hodinách, nie do tichej opravy Like. OW-11/09 a APP/ENV/TECH/TOOL vrátane
zostávajúcej časti APP-02 zostávajú evidované. Staršie neúplné živé testy,
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
- 14. 10. 2026, prvé opravné kolo po manuálnom OW-03/04 teste: používateľ
  upresnil predný-only Like a zadný read-only súhrn, nahlásil dva texty a nové
  mobilné OW-15/16. Výslovne schválil iba mapovanie/opravu prvého kola a teraz
  zakázal commit aj push; odoslanie chce až spolu s druhým bodom. Git diff bol
  pred úpravou čistý; PR #174 je zlúčený a relevantný obsah main a7c04647 sa
  zhodoval s lokálnym 223846e2. Hlavný checkout zostal čistý na 011b6ce7.
  Celý tok Grid → Wrapper → Front/Back, ostatní calleri a backendové počty
  zmapované. showLikes nahradené presným front-only showLikeAction, Back
  podmienka/prop úplne odstránené. Zachované počty/like-state, všetky ďalšie
  callery, API a review modified-click guard; zadný riadok sa nedá aktivovať.
  Tri wrapper RED pred opravou; po úprave 264 testov v 9 sadách PASS. Päť
  celých meraných súborov má všetky metriky nad 95 %, spolu 98,08 % statements,
  97,81 % branches, 100 % functions/lines. Celý FE 422 sád / 5 980 PASS,
  TypeScript, 15-file lint bez varovaní, build a diff-check PASS. Build ponechal
  existujúce neblokujúce Sentry odporúčanie, žiadne potlačenie alebo tichá oprava.
  Dva nadpisy overené vo všetkých 6 jazykoch; opravených presne 5 leaf hodnôt
  v CS/PL/EN, správne SK/DE/HU/EN allReviews zachované. Nové
  offerReviewTranslations.test.tsx: pred opravou 17 FAIL / 27 PASS, potom
  44 PASS vrátane mobilného detailu a locale-switch. Parity 0 missing/extra,
  used-key kontrola stále 3 staré APP-01. Zvyšná APP-02 nebola potichu opravená.
  Playwright je prispôsobený readonly počtu a nový review spec zbiera 72
  project-scenárov (36 relevantných pre zariadenie), nie 72 živých PASS.
  Reálny Railway WebKit desktop/mobile prvý beh: 1 SK mobilný PASS, 5 device
  SKIP, 4 FAIL: 2 testové kotvy (TEST-07), chýbajúci zadný demand súhrn a
  nesprávny CS mobilný text na starej verzii. Kotvy includeHidden opravené;
  druhý beh 4 kontrolné PASS (SK desktop light, SK mobile dark, PL Like
  desktop/mobile light), 3 device SKIP, 1 očakávaný CS desktop pre-deploy RED
  priamo na starom nadpise. Žiadne force/retry/zvýšenie timeoutu. Nový
  offer-card-readonly.ts preflight overí už dokončený own-card hint a inak
  explicitne skipne bez PATCH; skills/watch/hints write route guard ostáva.
  Preflight predchádza nechcenému dokončeniu onboarding hintu v testoch,
  nijako nemení appku ani fixture. Nepridávali sa dáta, backend,
  migrácie, Language UI, mobilné Search UI ani avatarové súbory sa nemenili.
  Všetky upravené TS/TSX pod 500; nadlimitné profily/Search bez zásahu.
  HEAD/staging/push nezmenené, žiadny nový commit. Nasleduje OW-15 a potom
  samostatne OW-16; až po dohodnutých opravách pokračovať OW-05.
- 14. 10. 2026, druhé opravné kolo OW-15: najnovší pokyn povoľuje spoločný
  commit/push s predchádzajúcim kolom po kontrolách. Pred úpravou MobileTopBar
  aj LanguageModule mali prázdny diff; rozpracované prvé kolo sa zachovalo.
  Zmapované oba reálne route vstupy, volania a Back tok. Menia sa iba dve malé
  produkčné komponenty: spoločná podmienka jazykovej obrazovky nastaví titulok
  a vypne quick-profile, mobilné h2 sa odstráni. Existujúca symetrická grid
  lišta drží stred bez prázdneho pravého tlačidla; desktopový detail, jazykový
  state/handler, krajina, zoznam a navigačné callbacky sú nezmenené.
  Nová real-provider integračná sada pred opravou 31 FAIL / 10 PASS; finálna
  rozšírená sada 79 PASS. Spoločných 13 sád / 359 PASS, sedem celých meraných
  súborov nad 95 % statements/branches/functions/lines; spolu 97,37 % / 97,42 % /
  100 % / 98,68 %. Žiadne oslabenie gate, globálneho window alebo timeoutov.
  Celá frontendová regresia 423 sád / 6 059 PASS, TypeScript PASS, lint všetkých
  20 dotknutých/nových TS/TSX 0 chýb/varovaní. Parity všetkých 6 jazykov
  0 missing/extra; used-key script stále správne FAIL na 3 starých APP-01.
  Nový mobile-language-header Playwright zbiera 120 project-scenárov
  (52 relevantných podľa zariadenia), nie 120 živých PASS. Existujúca mobile
  settings navigačná sada teraz očakáva mobilné h1. Skutočný Railway WebKit
  baseline: desktop SK/light 1 PASS, oba mobilné vstupy 2 pre-deploy RED
  (duplicitný nadpis pri standalone, chýbajúci horný nadpis pri profile-route),
  3 opačné device SKIP. Keďže lokálna oprava ešte nie je nasadená, nejde o
  nový úspešný živý test opravy. Read-only mobilná saved-locale diagnostika
  EN na Railway potvrdila správny checkmark (English 1 / Slovak 0), 0 zápisov;
  podozrenie zo súčasného unit-mount/provider-restore sa tým nevyhlasuje za
  potvrdenú produkčnú chybu ani sa potichu nemení jazykový state.
  Nezávislý finálny audit nenašiel nový opraviteľný problém. Dotknuté TS/TSX
  zostávajú pod 500; veľké koordinátory, Search UI, backend/migrácie a avatary
  bez zásahu. Hlavný checkout čistý, stále 011b6ce7. Register uchováva všetky
  ostatné nálezy; OW-16 je ďalšie samostatné mapovanie až po tomto review/reteste.
  Produkčný build aj záverečný diff-check PASS. Build ponechal existujúce
  neblokujúce Sentry odporúčanie; registry sync nevytvoril ďalší Git diff.
  Spoločný balík má 24 súborov (19 upravených, 5 nových), z toho 6 produkčných
  komponentov, 3 slovníky, 14 testovacích/helper súborov a existujúci register.
  Nové súbory: MobileLanguageHeader.test.tsx, offerReviewTranslations.test.tsx,
  mobile-language-header.spec.ts, offer-card-review-translations.spec.ts a
  support/offer-card-readonly.ts. Migrácie 0. Nasleduje autorizovaný spoločný
  commit/push do offer-watch-card-actions; nič sa automaticky nemerguje ani
  nenasadzuje. Finálne uzavretie čaká na review a nasadený manuálny/živý retest,
  nie na samotný úspešný lokálny build.
- 15. 10. 2026, mapovanie OW-16: používateľ potvrdil manuálne testy a čisté
  review predchádzajúceho kola. Overený main 14c306c0 / zlúčený PR #175,
  relevantný tree diff voči d327b596 prázdny; hlavný checkout ani vetvy iných
  rozpracovaných prác sa nemenia. Read-only mapovanie a nezávislá kontrola
  potvrdili dve desktop-only vetvy výsledkov, spoločné mapovanie dát a Like
  controller rozdiel pri mobilnej karte. Pri priamom reuse treba zabrániť novým
  nefunkčným request/message/review CTA bez callbackov. Profilový sheet má
  tlačidlo/backdrop/drag a scroll-lock, nie deklarovaný Escape/history/focus trap;
  neprezentovať neexistujúce správanie ako už hotové. Testy musia overiť oba
  skutočné vstupy, delegovanie desktopu, pásik/detail, obsah/Like, čistý návrat,
  resize/unmount, nulové výsledky a frontend/back-end permissions bez zmien.
  svaply.mdc blokuje aj malé prepojenie v app/search/page.tsx (646 obsahových
  riadkov), preto je vyžiadaná výslovná výnimka len na tri prepojovacie miesta.
  Žiadna produkčná/testovacia implementácia, nový testový PASS, commit ani push
  sa v tomto mapovacom kroku netvrdí. Zatiaľ sa mení iba existujúca evidencia.
- 15. 10. 2026, implementácia OW-16 po úzkej výnimke: nový SearchOfferCard
  prepája oba skutočné výsledkové vstupy, SearchOfferCardMobile skladá existujúcu
  profilovú kartu/detail/hodiny a useSearchOfferLike spravuje existujúce API.
  Profilová karta dostala defaultne zachované compactTop/showProfileActions
  voľby; iba search vypne neexistujúce profilové akcie. Enter/Space potomkov
  neaktivuje zároveň kartu. Nové query/ID kľúče čistia detail a pending pri
  prechodoch; žiadne nové history/Escape semantics sa nevymýšľajú.
  Predopravový test zachytil keydown konflikt; chybný príliš jednoduchý gallery
  mock sa osobitne opravil, neoznačil sa za produktový nález. Prvé lokálne sady
  81 + 23 + 11 PASS, staršia regresia 112 PASS. Následná skutočná integrácia
  celej stránky zachytila ďalší novozavedený Like race, nie iba pomalú aserciu:
  klik revision=0/mounted=false predbehol pasívne efekty, source zvýšil revíziu
  na 1 a platná odpoveď sa ignorovala. Pridanie waitFor samo nepomohlo.
  Diagnostický trace potvrdil poradie bez osobných údajov; všetky dočasné logy
  odstránené. Mount a source refs sa teraz nastavujú useLayoutEffect pred
  interakciou, iba v už klientsky rozpoznanej mobilnej vetve. Opakovaná skutočná
  stránková/mobilná/hook regresia 4 sady / 97 PASS, bez oslabovania testu.
  Nový test-only helper premenovaný na existujúci podporovaný .test-utils.ts
  suffix po TypeScript chybe; tsconfig sa nemenil. TypeScript potom PASS.
  Plná stránka má 45 scenárov a zdokumentovanú TEST-08 hranicu.
  Playwright zbiera 120 project-scenárov (48 device-relevantných naprieč
  WebKit/Chromium), nie 120 živých PASS. Prvý Railway WebKit baseline: 2 FAIL
  (očakávaná stará mobilná karta + nový starší OW-17), 2 device SKIP. Dve
  samostatné read-only diagnostiky potvrdili OW-17; používateľovi nahlásené
  hneď a odporúčané na samostatný krok. Explicitne izolovaná desktopová karta
  po zatvorení panelu a mobilné author-return kontroly: 4 PASS, 2 mobilné
  pre-deploy RED na chýbajúcej novej karte, 6 device SKIP. Žiadne force/retry,
  dvojklik na vynútenie PASS, tvorba obsahu ani Like/request/message/hint zápisy.
  Finálne spoločné overenie: 13 sád / 300 PASS, 6 skutočne dotknutých celých
  produkčných súborov 99,12 % statements (453/457), 95,65 % branches (396/414),
  100 % functions (88/88), 100 % lines (425/425). Individuálna legacy stránka
  má TEST-08, ostatných 5 súborov má každú metriku nad 95 %. Merané sú presne
  dotknuté súbory, nie nedotknutý filler na zvyšovanie priemeru. Celý frontend
  430 sád / 6 221 PASS. TypeScript a 16-file lint 0 chýb/varovaní PASS.
  Parity 0 missing/extra, used-key script stále len tri staré APP-01.
  Nezávislý finálny read-only audit nenašiel nový opraviteľný problém; dočasné
  diagnostiky/logy odstránené. Automatická kontrola potvrdila page diff presne
  podľa schválenej výnimky a ostatné veľké TS/TSX bez zmien. Celkový balík
  17 súborov (4 upravené, 13 nových): 6 produkčných, 7 nových Jest sád,
  1 test-only helper, 2 nové Playwright súbory a existujúci register. Migrácie 0,
  backend, prekladové JSON, testovacie hranice, tsconfig a SearchLayout bez zmien.
  Produkčný build PASS vrátane typov a statických stránok. Registry sync
  nevytvoril ďalší Git diff. Ponechané existujúce neblokujúce Sentry odporúčanie
  bez potlačenia. Hlavný checkout zostal čistý na 011b6ce7. Nasleduje
  autorizovaný commit/push, nie PR/merge/nasadenie. Po review a cielenom reteste
  odporúčané samostatne rozhodnúť OW-17 pred návratom k OW-05; žiadne ďalšie
  otvorené nálezy ani odložené M13/M14/M33 sa tým neuzatvárajú.
- 16. 10. 2026, OW-18/19: používateľ ohlásil rozdiel úvodného vyhľadávania
  Safari/PWA/PC pri rovnakom účte a filtroch a chýbajúcu pamäť scrollu návratu
  zo zobrazenia profilu. Mapovanie bolo read-only. Existujúce cielené sady
  92 PASS; nezachytávali stale cache ani skutočné scrollTop pred/po. Riadený
  pokus s reálnym transpilovaným hookom potvrdil neexpirujúci prázdny cache
  hit aj po novom mount; novú ponuku ukázal až explicitný invalidate. Nejde
  o dôkaz historickej udalosti PWA. Čerstvý Railway WebKit desktop/mobile
  vrátil kartu s týmto názvom pri Mo aj plnom názve a country SK; priamy
  request s CZ mal nulu, bez krajiny/SK kartu obsahoval. Žiadne obsahové zápisy.
  Následný údaj používateľa PC q=MoNiTo/country=CZ/HTTP200 + ponuka SK a
  IP cache CZ/status ok potvrdili konkrétne vyradenie krajinou na PC. Jazyk
  systému nie je zdrojom krajiny. Nový zmiešaný zápis PWA stále nič nenašiel;
  country/HTTP/body PWA sa zatiaľ nepodarilo zachytiť. Windows nemá v tomto
  pracovnom prostredí priamy Safari inspector; žiadne proxy/certifikáty či
  bezpečnostné nastavenia sa nemenili. Scroll potvrdený v 8 živých variantoch
  a oddelene evidovaný OW-19; zostáva neopravovaný.
- 16. 10. 2026, schválená iba dočasná lokálna opt-in diagnostika OW-18:
  nový malý helper/hook/panel, krátke zapojenie v SearchModule/useSearchApi;
  bez zmeny vyhľadávacích pravidiel, cache kľúča/expirácie, API parametrov,
  permissions, request ordering alebo debounce. Tlačidlo je dostupné priamo
  v PWA bez URL triku; zapnutie/vypnutie neposiela request. Záznam obsahuje
  len krajiny, dĺžku dotazu, filter flags, zdroj, stav a počty; nie text dotazu,
  ID, používateľské dáta, cookies/tokeny, IP alebo surový payload. Uložené
  preferencie sú výslovne len aktuálny snapshot, nie tvrdenie o pôvode krajiny.
  Close/reopen/active/account/unmount generácia zneplatní starých reportérov;
  zapnutie počas requestu spätne nevyrába diagnostiku. Dáta zostávajú iba v
  React pamäti; nič sa neukladá ani automaticky neposiela. Nasadenie/reset
  dokumentu odstráni starú Map, preto nemožno spätne dokazovať pôvodný stav.
  Nových 7 Jest sád / 151 PASS; presne päť produkčných súborov má každú
  metriku nad 95 % (spolu 98,87 statements / 98,77 branches / 100 functions /
  98,81 lines). API aj všetky tri diagnostické súbory majú 100 %; iba pôvodné
  tri clear-ref riadky SearchModule nepokryté. Preklady 39 keys vo všetkých
  šiestich jazykoch, parity 0 missing/extra. Used-key kontrola hlási iba
  tri nezmenené APP-01. ESLint 13 súborov: 0 errors/warnings. TypeScript PASS.
  Nový Playwright má 9 zozbieraných scenárov, nie 9 PASS. Skutočný prednasadený
  light beh WebKit desktop/mobile + Chromium: 3 očakávané RED, chýba nové
  tlačidlo; žiadny retry, obsahové zápisy, screenshot/trace/video ani raw dáta.
  Lokálny stav nie je nasadený PASS. Commit/push/merge/deploy nie sú povolené.
  Následná celá FE regresia 437 sád / 6 372 PASS (880,905 s); opakovaný finálny
  scoped beh 7 sád / 151 PASS potvrdil rovnaké percentá bez zmeny hraníc.
  Automatické porovnanie pôvodného/nového cache key a API parametrov je
  identické. Všetkých päť produkčných TS/TSX má menej než 500 riadkov.
  Produkčný build najprv skončil EPERM pri mkdir v generovanom .next/server/app;
  priečinky neboli junction a opakovanie rovnakého buildu s povoleným zápisom
  prešlo vrátane kompilácie, typov a 38 statických stránok. Žiadne ručné mazanie,
  bezpečnostné zmeny či potláčanie kontrol. Existujúce Sentry odporúčanie global
  error handleru ostalo neblokujúce a nepotlačené; registry sync nezmenil zdroje.
  Hlavný checkout je naďalej čistý 011b6ce7; pracovný HEAD zostáva 0d547de0.

Rozsah lokálnej diagnostiky OW-18 (20 súborov, migrácie 0):

- Upravené produkčné: `frontend/src/components/dashboard/modules/SearchModule.tsx`,
  `frontend/src/components/dashboard/modules/search/hooks/useSearchApi.tsx`.
- Nové produkčné v `frontend/src/components/dashboard/modules/search/diagnostics/`:
  `searchDiagnostics.ts`, `useSearchDiagnostics.ts`, `SearchDiagnosticsPanel.tsx`.
- Nové Jest v tom istom diagnostickom priečinku: `searchDiagnostics.test.ts`,
  `useSearchDiagnostics.test.tsx`, `useSearchDiagnostics.ssr.test.tsx`,
  `SearchDiagnosticsPanel.test.tsx`; v `search/hooks/`: `useSearchApi.behavior.test.tsx`,
  `useSearchApi.diagnostics.test.tsx`; v `search/`: `SearchModule.diagnostics.test.tsx`.
- Nový Playwright: `frontend/e2e/search-diagnostics.spec.ts`.
- Upravené preklady: `frontend/messages/sk.json`, `cs.json`, `en.json`, `de.json`,
  `pl.json`, `hu.json` (všetky v rovnakom priečinku).
- Aktualizovaná iba existujúca evidencia: `docs/testing/findings-register.md`.

16. 10. 2026, následné výslovné schválenie používateľa: tento pripravený
20-súborový balík diagnostiky možno commitnúť a pushnúť do existujúcej vetvy
`offer-watch-card-actions`. Predchádzajúci zákaz commit/push vyššie opisuje
stav pred týmto súhlasom. Rabbit kontrolu odošle používateľ; vytvorenie PR,
merge ani nasadenie nie sú súčasťou tohto kroku. OW-18 ani OW-19 sa tým
neoznačujú za opravené.

## 17. 10. 2026 – schválené opravy OW-18 a OW-19

- Používateľ po opakovanom mapovaní schválil implementáciu oboch pôvodných
  nálezov a následný spoločný commit/push. Nový výber krajiny vo filtroch,
  zjednotenie filtrov `/search`, úpravy výsledkovej cache, PR, merge ani nasadenie
  nie sú súčasťou tohto povolenia.
- Základom je aktuálny hlavný projekt `e7359f1b`, nie starý diagnostický checkout.
  Pracovná vetva bola posunutá iba fast-forward; používateľove úpravy profilov,
  návratov feedu/správ a animácií mobilného sledovania sú zachované. Hlavný
  checkout zostáva bez našich zmien.
- OW-18: nový `searchCountry` pochádza výhradne z platnej IP detekcie/cache.
  Pôvodné `country`/`setCountry` zostávajú predvoľbou formulárov. Ručná krajina
  už nezablokuje obnovu IP. Chyba detekcie nepreberá manuálnu krajinu ani pevné
  SK; hľadanie vtedy posiela požiadavku bez country, rovnako ako doterajšia
  vetva neurčenej krajiny. Neskorá detekcia neprepíše výslovne zvolený jazyk.
  Reálna komponentová integrácia overuje ponuku/dopyt aj formulár sledovania:
  výber CZ, zrušenie, zachovaná predvoľba CZ, následný search request s IP SK.
- OW-19: zachytenie je pred `router.push`; nový hook obnovuje vnorený výsledkový
  main až bez loading markerov. Nepoužíva výšku skeletonov ako dôkaz hotových
  dát. Čakajúce API sa môže dokončiť aj po šiestich sekundách bez zrušenia
  návratu a bez neustáleho pollingovania. Zmena účtu, vstup používateľa,
  presný history entry aj celé URL majú regresie. Next/profile/feed history
  kľúče zostávajú zachované a výsledky/profily sa do tejto pamäte neukladajú.
- Priebežné nezávislé kontroly odhalili dva varianty zastaraného popstate
  handoff a obnovovanie opustených záznamov po opakovaných chybách zápisu do
  úložiska. Najprv bol pridaný RED dôkaz, následne oprava a PASS regresia.
  Pri odmietnutom zápise je aktuálna pamäť autoritatívna, kým sa zápis znovu
  nepodarí; staré čitateľné úložisko už nevráti zrušenú pozíciu.
- Spoločné lokálne overenie: 35 sád / 507 testov PASS. Meraných je presne
  všetkých deväť dotknutých celých produkčných súborov, nie pridaný filler:
  99,37 % statements, 98,63 % branches, 100 % functions, 99,47 % lines.
  Každý súbor má každú metriku nad 95 %. LanguageContext, useSearchApi,
  SearchLayout, profilový navigačný helper, skeleton aj obnovovací hook majú
  100 % všetkých metrík. Globálny gate a konfigurácia pokrytia sa nemenia.
  TypeScript PASS, finálny ESLint všetkých 27 dotknutých JS/TS/TSX:
  0 chýb / 0 varovaní. Celý frontend: 464 sád / 6 867 testov PASS.
  Produkčný build PASS vrátane typov a všetkých 38 statických stránok;
  registry sync nevytvoril ďalší Git diff. Existujúce neblokujúce Sentry
  odporúčanie globálneho error handlera zostalo nepotlačené.
- Nový Playwright na zatiaľ starej Railway produkcii: 21 vykonaných scenárov,
  všetkých 21 očakávaných RED na pôvodných chybách; 0 SKIP a 0 retry. Deväť
  krajinných variantov poslalo CZ napriek čerstvému IP SK a ručnej voľbe CZ.
  Dvanásť návratových variantov zachovalo URL, ale resetovalo vnorený scroll
  (desktop rozdiel 1 330/1 334 px, mobil 3 867/4 508 px). WebKit desktop/mobile
  aj Chromium použili skutočné GET odpovede bez obsahových zápisov, API mockov,
  screenshotov, trace alebo videa. Automatické písanie bez Enteru spustilo
  request vo všetkých troch projektoch: všeobecná chyba debounce nie je týmto
  behom potvrdená. Mobilný app Back subkrok sa pre skorší browser Back RED
  ešte nevykonal; celý nový beh treba zopakovať po schválenom nasadení.
- Existujúci diagnostický Playwright setup bol úzko doplnený o čerstvú IP cache
  SK: po oddelení krajín už samotná ručná SK nie je platný predpoklad testu.
  Žiadne API odpovede sa nenahrádzajú. Všetky tri dotknuté Playwright súbory
  prešli lintom bez chýb/varovaní. Táto úprava fixture nie je produkčné PASS
  oddelenia krajín; živé overenie novej vetvy naďalej čaká na nasadenie.
  Následný skutočný kontrolný beh pôvodnej diagnostiky na starej produkcii:
  9 PASS, 0 FAIL, 0 SKIP, 0 retry (WebKit desktop/mobile aj Chromium).
  Nezamieňa sa s novými 21 prednasadenými RED regresiami opráv.
- Pri blokovanom zápise je pamäťový fallback zámerne viazaný na aktuálny
  dokument. Ak prehliadač nedovolí zmeniť úložisko a dokument sa znovu načíta,
  presná perzistentná obnova či odstránenie jeho starého fyzického záznamu nie
  sú garantované. Nejde o uchovávanie výsledkov ani obídenie oprávnení.
- Finálny rozsah: 28 súborov (9 produkčných vrátane 2 nových malých modulov,
  14 Jest súborov vrátane 11 nových, 1 úzky mock v jest.setup, 3 Playwright
  súbory vrátane 2 nových a táto existujúca evidencia). Žiadne backendové zmeny ani migrácie,
  žiadne nové texty alebo zmeny prekladových JSON, žiadny zásah do nadlimitných
  TS/TSX. Hlavný checkout zostal čistý na e7359f1b. Nasleduje schválený
  spoločný commit/push do offer-watch-card-actions, potom používateľova Rabbit
  kontrola a po schválenom nasadení živý/manuálny retest oboch opráv.
  Žiadny PR, merge ani nasadenie sa týmto krokom automaticky nevykonávajú.

## 17. 10. 2026 – overenie review PR #183

- Používateľ schválil overenie aktuálnych nálezov, opravu platných problémov
  a následný commit/push do rovnakej vetvy. Začiatok bol čistý na b18db607;
  otvorený PR #183 má rovnaký HEAD a jeho pôvodný CI run 39045080372 je success.
  Rabbit nevytvoril funkčný komentár; dva konkrétne P2 nálezy pochádzajú z
  Codex review. Oba sú overené ako platné, nie mechanicky prijaté podľa textu.
- OW-19 / trailing slash: next.config.js má skipTrailingSlashRedirect=true,
  ale currentSearchUrl aj validSnapshot odmietali `/search/`. Najprv nové
  regresie 5 FAIL / 40 PASS, potom úzka dvojriadková oprava: povolené sú presne
  `/search` a `/search/`. Celé query/hash sa nemenia a obe adresy sa nezlučujú.
  Neplatné podcesty sa naďalej odmietajú. Nový záznam, načítanie zo sessionStorage,
  popstate handoff a presná izolácia URL/účtu majú regresie; samotná memory/SSR
  sada následne 46 PASS. Integračný SearchLayout test prechádza oboma cestami
  pre všetky tri výsledkové záložky cez reálny profilový navigačný helper.
- OW-19 / aktualizácia obnovy: finish predtým ponechal úspešne použitý snapshot,
  takže neskorší posun, odchod sidebarom a browser Back obnovili starých 1 200 px.
  Nová regresia to najprv potvrdila RED. Pôvodne vyskúšané spotrebovanie po
  úspechu by však zrušilo existujúcu garanciu opakovaného Forward/Back bez
  nového kliknutia na profil. Pri finálnom produktovom audite bolo preto
  nahradené druhou možnosťou z review: aktualizovať existujúci snapshot podľa
  skutočných scroll udalostí po úspešnej obnove. Pending requesty a ich cleanup
  sa nemenia. Aktualizácia overuje presnú URL, aktuálny účet, history ID a
  existujúci platný snapshot, nezaloží nový a nemôže prepísať novší capture.
  Cudzie history state ostávajú zachované. Nový profilový vstup naďalej
  zachytáva novú aktuálnu pozíciu; StrictMode a clamp majú regresie.
- Priebežná regresia pred finálnym refresh riešením: 35 sád / 523 testov PASS.
  Presne dva vtedy merané
  celé produkčné súbory: 99,34 % statements, 98,79 % branches, 100 % functions
  a lines; každý má každú metriku nad 95 %. Bez zmeny coverage gate alebo ignore.
  TypeScript PASS a lint všetkých 7 dotknutých TS/TSX: 0 chýb / 0 varovaní.
- Rabbitovo všeobecné upozornenie Docstring Coverage 38,89 % analyzuje JS/TS
  funkcie naprieč PR, nejde o Python kontrolu. Povinné dokumentačné pravidlá
  svaply.mdc s prahom 80 % sú v sekcii Python; v tomto PR ani opravnom kole sa
  Python nemení. Nepridávali sa formálne komentáre do nesúvisiacich komponentov
  a testov iba na zvýšenie tohto automatického skóre. Nie je to opravený funkčný
  nález ani dôvod meniť aplikáciu alebo oslabovať kontrolu.
- Doplnené sú iba dva nové Playwright scenáre × tri projekty: `/search/`
  profilový roundtrip a úspešná obnova → reálny posun → obyčajný odchod → Back
  bez prepisu zastaranou pozíciou. Desktop použije Sidebar; mobilný full-search nemá
  sidebar, preto použije viditeľnú existujúcu šípku na `/dashboard/search`.
  Pôvodných 21 scenárov zostalo zachovaných. Nasadený výsledok opravy sa
  nepovažuje za PASS na základe zberu ani behu starej produkcie.
  Skutočný živý beh nových šiestich variantov na starej produkcii: 6 RED,
  0 SKIP, 0 retry, bez aplikačných zápisov. `/search/` sa zachovalo, ale scroll
  sa resetoval (odchýlka desktop 1 334 px, mobil 4 508 px). Následné scenáre
  skončili na chýbajúcom prvotnom snapshote starej verzie; následný posun a
  odchod/Back sa v tomto behu nevykonali. Nie je tým preukázaná review chyba
  stale snapshotu na starej produkcii ani úspech jej opravy; ten dokladajú
  zatiaľ lokálne RED/PASS testy. Finálny druhý scenár namiesto spotrebovania
  overuje aktualizovanú pozíciu; živý beh sa zastavil na rovnakej skoršej
  podmienke starej verzie. Po nasadení zopakovať všetkých 27 scenárov.
- Dve priebežné nezávislé read-only kontroly produkčných opráv a integračných
  regresií nenašli ďalší preukázaný problém. Žiadna časť povinného overenia sa
  tým nenahrádza ani nevydáva za automatickú záruku bezchybnosti.
- Rozsah tohto opravného kola: 9 upravených existujúcich súborov, žiadne nové
  súbory: 2 malé produkčné moduly, 4 Jest súbory, 2 Playwright súbory a táto
  evidencia. Backend, migrácie, preklady, krajinná logika/filtrová cache a
  nadlimitné TS/TSX bez zmien. Hlavný checkout zostáva nedotknutý.
  Prvý celý FE beh bol zámerne zastavený pred dokončením pri zmene riešenia;
  nie je považovaný za PASS. Nový celý beh finálnej verzie prešiel:
  464 sád / 6 894 testov PASS, bez zvyšovania timeoutov alebo retry.
- Finálne refresh riešenie: spoločná cielená regresia 35 sád / 534 testov PASS;
  oba celé teraz upravené produkčné súbory majú každú metriku nad 95 %.
  Spolu 99,44 % statements, 98,97 % branches, 100 % functions a lines;
  obnovovací hook má 100 % všetkých metrík. TypeScript PASS, finálny lint
  všetkých 8 dotknutých TS/TSX: 0 chýb / 0 varovaní. Opakovaná nezávislá
  read-only kontrola finálneho refreshu nenašla ďalší preukázaný problém.
- Produkčný build finálnej verzie PASS vrátane kompilácie, typov a 38 statických
  stránok; registry sync nevytvoril ďalšie zmeny. Existujúce neblokujúce Sentry
  odporúčanie globálneho error handlera zostalo nepotlačené. Diff check PASS,
  všetky dotknuté TS/TSX zostávajú pod 500 riadkov; hlavný checkout čistý na
  e7359f1b. Nasleduje schválený commit/push do PR #183, potom nové review a po
  schválenom nasadení cielený manuálny/Playwright retest. Žiadny merge/deploy.

Zmenené existujúce súbory tohto review kola:

- Produkčné v `frontend/src/components/search/`: `searchScrollMemory.ts`,
  `useSearchScrollRestoration.ts`.
- Jest v rovnakom priečinku: `SearchLayout.scroll.test.tsx`,
  `searchScrollMemory.ssr.test.ts`, `searchScrollMemory.test.ts`,
  `useSearchScrollRestoration.test.tsx`.
- Playwright: `frontend/e2e/search-country-scroll.spec.ts`,
  `frontend/e2e/support/search-country-scroll.ts`.
- Evidencia: `docs/testing/findings-register.md`. Nové súbory 0, migrácie 0.

## 17.–18. 10. 2026 – následný Rabbit nitpick PR #183: zápisy počas scrollovania

- Používateľ povolil overenie, opravu platného nálezu a nový commit/push do
  rovnakej vetvy. Začiatok čistý na 66c15acc; PR #183 má rovnaký HEAD a jeho
  CI run 39048195882 je success. Nový komentár Rabbit review 5558814371
  označuje synchrónny zápis pri každom scroll evente ako výkonnostný nitpick.
  Opakované čítanie/parsovanie/zápis je potvrdené kódom a testom; reálny jank
  ani konkrétne zrýchlenie na fyzickom zariadení namerané neboli.
- Nová frame regresia najprv 6 FAIL / 3 PASS na pôvodnej implementácii:
  tri scroll udalosti spustili tri čítania/zápisy ešte pred vykresľovacím frame.
  Finálne sledovanie drží iba posledný pripravený zápis a najviac jeden RAF.
  Burst 320/410/510 robí pred RAF nula čítaní/zápisov, v RAF presne jedno
  čítanie a jeden zápis hodnoty 510; ďalší frame opäť najviac jeden.
- Naivné odloženie pôvodného refreshSearchScroll by porušilo existujúci test
  scroll 310 → okamžitý push → unmount bez ďalšieho frame: v cleanup už môže
  byť iná URL/history ID a odpojený mainRef. Tento test NEBOL oslabený pridaním
  čakania. prepareSearchScrollRefresh preto pri udalosti iba lacno overí
  aktuálnu zdrojovú URL, účet, history ID a pozíciu; nečíta úložisko.
  Jednorazová closure si drží iba overené primitívne zdrojové hodnoty.
  Pri RAF alebo poslednom cleanup flush overí aktuálny účet a existujúci
  platný snapshot s presne tým istým ID/URL/viewer; neobnoví expirovaný či
  zmazaný záznam, nevytvorí nový, nemení cieľovú históriu ani novší capture.
  Cleanup zapíše pripravených 310, nie už odpojený/cieľový main s hodnotou 0.
  Pôvodný synchrónny refresh wrapper používa prípravu a okamžitý commit, takže
  jeho existujúce current-entry ochrany aj načasovanie zostávajú zachované.
- stopTracking zruší čakajúci frame, vykoná posledný oprávnený zápis a vyčistí
  poslucháče. Zrušený RAF alebo už odobratý scroll callback nesmie nič znovu
  naplánovať. Regresie pokrývajú ID frame 0, popstate, zmenu URL bez popstate,
  okamžitý unmount/navigáciu, zmenu účtu, nový capture, loading, StrictMode,
  quota fallback a opakované Back/Forward. Dve existujúce kontroly, ktoré
  čítali výsledok okamžite po scroll udalosti bez odchodu, teraz čakajú na RAF;
  kritický okamžitý navigačný test naďalej žiadny frame pred push nečaká.
  Pri pagehide sa čakajúci zápis tiež flushne, ale tracker sa nezastaví:
  po bfcache-style pageshow môže normálne pokračovať. Callback porovná vlastné
  RAF ID s aktuálnym, takže starý zrušený callback nezruší ani predčasne
  neuloží nový čakajúci frame. Obe správania majú osobitné regresie. Priebežný
  celý beh bol pred doplnením tejto priamej RAF poistky zastavený bez testového
  zlyhania; neoznačuje sa za PASS. Finálna verzia má nový samostatný celý beh.
- Spoločná finálna cielená regresia: 37 sád / 557 testov PASS. Merané sú presne
  oba celé upravené produkčné súbory: 99,53 % statements, 99,05 % branches,
  100 % functions a lines. Každý súbor má každú metriku nad 95 %, hook 100 %
  všetkých metrík. Bez ignore, zvýšenia timeoutov alebo oslabenia coverage gate.
  TypeScript PASS; ESLint všetkých 6 dotknutých TS/TSX 0 chýb / 0 varovaní.
- Playwright súbory sa nemenia. Reálne vykonané presne tri existujúce refresh
  varianty na Railway (WebKit desktop/mobile, Chromium): 3 RED, 0 SKIP,
  0 retry, bez artefaktov či aplikačných zápisov. Všetky sa zastavili už na
  chýbajúcom prvotnom snapshote starej produkcie; RAF/refresh/návrat sa tým
  nedostali do runtime overenia. Nie je to PASS tejto opravy ani nový dôkaz
  chyby RAF. Po schválenom nasadení zostáva povinný živý a cielený manuálny retest.
- Rozsah: 7 súborov; 2 upravené malé produkčné moduly, 2 upravené existujúce
  Jest súbory, 2 nové Jest súbory a táto existujúca evidencia. Backend,
  migrácie, preklady, krajinná logika/cache, Playwright konfigurácia a
  nadlimitné TS/TSX bez zmien. Finálny celý frontend prešiel: 466 sád /
  6 917 testov PASS, bez zmeny timeoutov alebo retry. Produkčný build PASS
  vrátane kompilácie, typov a 38 statických stránok. Prvý pokus zastavilo
  EPERM pri mkdir v generovanom .next; po overení, že rodičovské priečinky
  nie sú reparse/junction, prešiel rovnaký build s povoleným zápisom. Žiadne
  ručné mazanie, ACL ani bezpečnostné nastavenia sa nemenili. Existujúce
  neblokujúce Sentry odporúčanie globálneho error handlera zostalo zachované.
  Registry sync nepridal Git diff. Všetky dotknuté TS/TSX sú pod 500 riadkov,
  diff check PASS a hlavný checkout zostáva čistý na e7359f1b. Vzdialená
  pracovná vetva bola pred commitom stále 66c15acc. Nasleduje schválený
  commit/push do PR #183, potom nové review a po schválenom nasadení retest.
  Nič sa týmto krokom automaticky nezlučuje ani nenasadzuje.

Súbory v `frontend/src/components/search/`: upravené `searchScrollMemory.ts`,
`useSearchScrollRestoration.ts`, `searchScrollMemory.ssr.test.ts`,
`useSearchScrollRestoration.test.tsx`; nové `searchScrollMemory.refresh.test.ts`
a `useSearchScrollRestoration.frames.test.tsx`. Evidencia:
`docs/testing/findings-register.md`. Migrácie 0.

## 18. 10. 2026 – podfáza A: zatváranie vyhľadávacej lišty a návratový scroll

- Používateľ po mapovaní schválil prvú podfázu (body 2/3/5, OW-21/22/24),
  následný commit/push na novú vetvu a cielené manuálne testy v chate.
  Nová vetva `search-panel-return-fixes` vychádza z aktuálneho main 74fca266.
  Pred začatím bol audit checkout čistý; GitHub porovnanie predchádzajúcej
  opravy 7de1bb07 s main malo nulový obsahový diff. Hlavný používateľov
  checkout zostáva nedotknutý na e7359f1b.
- Produkčná zmena má iba tri malé existujúce súbory: default closed a
  visibility:hidden pre zatvorený panel v SearchLayout, odovzdanie existujúceho
  onClose v SearchModule a jeho priame zavolanie pred navigáciou v SearchResults.
  Krehké simulované mousedown je odstránené. Žiadne zmeny API, backendu,
  používateľských textov, prekladových JSON, filtrov, histórie, obnovovacieho
  hooku ani jeho šesťsekundovej ochrany. OW-20/23 a OW-17 ostávajú otvorené.
- RED pred produkčnou opravou: layout regresie 17 FAIL / 28 PASS; reálna
  SearchModule → SearchResults integrácia 7 FAIL / 4 PASS. Po oprave nové
  kontrakty prechádzajú. Pôvodné testy otvoreného panela boli upravené tak,
  aby ho otvorili ručným kliknutím; obsluha Escape/modal/outside/cleanup,
  navigácia a návraty neboli vynechané ani oslabené.
- Cielená finálna regresia: 34 sád / 538 testov PASS. Merané sú presne všetky
  tri celé dotknuté produkčné súbory: spolu 98,34 % statements, 97,46 % branches,
  100 % functions, 98,59 % lines. Každý súbor má každú metriku nad 95 %;
  SearchLayout má 100 % všetkých metrík. Prvý meraný beh síce vykonal 515
  úspešných testov, ale správne zlyhal na coverage gate historicky nepokrytého
  SearchResults. Doplnené sú legitímne regresie kariet, histórie a odporúčaní,
  nie filler produkčné moduly, umelé neplatné typy či ignore. Hranice coverage
  a timeouty sa nemenili.
- Celý finálny frontend: 468 sád / 6 961 testov PASS. TypeScript PASS.
  Lint všetkých 10 dotknutých TS/TSX: 0 chýb a 1 pôvodné upozornenie
  no-img-element v SearchResults. Rovnaké upozornenie bolo overené na obsahu
  HEAD pred zmenou; nesúvisiace obrázkové správanie sa nemení.
- Produkčný build PASS vrátane kompilácie, typov a 38 statických stránok.
  Prvý pokus zablokovalo EPERM pri vytváraní generovaného .next/server/app/dashboard.
  Po overení neodkazových rodičov prešiel rovnaký build s povoleným zápisom;
  žiadne ručné mazanie, ACL ani bezpečnostné nastavenia sa nemenili. Registry
  sync nevytvoril ďalší zdrojový diff. Pôvodné neblokujúce Sentry odporúčanie
  globálneho error handlera zostalo zachované.
- Nový Playwright obsahuje presne 15 variantov v troch projektoch (WebKit
  desktop/mobile a Chromium), bez skipov. Skutočná pripravenosť výsledkov,
  šírka main, uložený scroll a krátky interval od vykreslenia reálnych dát
  po obnovu sa sledujú samostatne od sieťovej latencie. Meranie prežije
  SPA, nový dokument aj bfcache a kontroluje aj prechodné otvorenie panela.
  Zber testov nie je ich produkčný PASS. Živý spoločný beh proti nezmenenej
  Railway produkcii vykonal 24 scenárov bez retry a skipov: 9 existujúcich
  diagnostických kontrol PASS, 14 nových regresií skončilo na očakávanom
  pôvodnom otvorenom paneli, 1 mobilný variant skončil skôr pri vstupe do
  vyhľadávania. Celkový príkaz preto správne FAIL, nie zelené E2E opravy.
  Po spresnení vstupných assertions (TEST-09) samostatný mobilný WebKit beh
  prešiel vstupom, HTTP 200 aj prechodom na /search a skončil až na rovnakom
  pôvodnom aria-hidden=false. Prvý timeout sa nepovažuje za dokázanú race
  ani zahodený výsledok. Kontroly nového časovania a klávesnice sa v živom
  behu za túto predpodmienku nedostali; ich nasadený výsledok zostáva otvorený.
- Rozsah je 11 súborov: 3 produkčné, 4 Jest (2 upravené a 2 nové),
  3 Playwright (1 upravený a 2 nové) a táto existujúca evidencia.
  Všetky dotknuté TS/TSX majú menej ako 500 riadkov. Nadlimitné page.tsx
  (646), api.ts (907), DashboardContent.tsx (711) a useDashboardState.ts (921)
  zostávajú bez zmien. Migrácie 0. Nasleduje autorizovaný commit/push,
  používateľova Rabbit kontrola a po nasadení manuálny/živý retest; žiadny
  automatický PR, merge ani deploy.

## 18. 10. 2026 – review PR #184: dokumentácia a predpoklady E2E

Používateľ schválil preverenie nálezov, opravu platných bodov a následný
commit/push na tú istú vetvu `search-panel-return-fixes`. Lokálny aj vzdialený
východiskový commit bol 183a09f8, audit checkout bol čistý. PR #184 je otvorený;
jeho pôvodný CI run 39131324996 skončil success. To nie je výsledok CI nového
review commitu.

| ID | Overený bod | Oprava a hranice overenia |
| --- | --- | --- |
| TEST-10 | Codex review: tri vykreslené výsledky nezaručujú dosiahnuteľný hlboký scroll | Platné. `openReturnFixture` overuje server, prihlásený obsah a aspoň jeden výsledok; samostatný View All scenár žiadny hlboký scroll nepotrebuje. `openLastAuthor` pred scrollovaním alebo kliknutím vyžaduje skutočné `scrollHeight - clientHeight > 250`. Zachované je aj následné overenie dosiahnutého `top > 250`, snapshotu a časovania návratu. Nízky počet/výška fixture vedie k vysvetlenej chybe s odporúčaním vhodného existujúceho dotazu, nie k skipu, seedovaniu alebo falošnému PASS. |
| DOC-03 | Rabbit Docstring Coverage 77,78 % pri požadovaných 80 % | Platné dokumentačné upozornenie, nie nájdená funkčná chyba. Zmysluplný JSDoc dostalo sedem nových alebo priamo dotknutých pomenovaných funkcií: SearchModule, handleViewAllClick, testový translator a helpery sample/searchPanel/searchPanelInput/resultSelector. Vlastný AST audit pôvodných 10 TS/TSX má podľa explicitnej definície 33/40 pomenovaných funkcií s JSDoc; všetkých sedem identifikovaných priamo dotknutých funkcií je dokumentovaných. Toto nie je interné percento Rabbitu a nepredpovedá jeho ďalší výsledok. |

- Bez zmeny logiky aplikácie: in-memory transpile všetkých troch produkčných
  TSX oproti 183a09f8 po odstránení komentárov dáva identický JavaScript.
  Cache, obnovovací hook, URL, filtre, backend, preklady a migrácie sa nemenia.
- Opakovaná cielená regresia: 34 sád / 538 testov PASS. Všetky tri celé
  produkčné komponenty zostávajú nad 95 % každej metriky; spolu 98,34 %
  statements, 97,46 % branches, 100 % functions, 98,59 % lines. TypeScript PASS;
  lint piatich TS/TSX 0 chýb, 1 pôvodné no-img-element upozornenie.
  Pôvodný celý FE a build sa týmto zápisom nevydávajú za nové celé behy.
- Nový `e2e/search-panel-fixture.spec.ts`: skutočne vykonaných 6/6 PASS na
  Railway, WebKit desktop/mobile aj Chromium, bez retry alebo skipov. Ponuky
  aj používatelia: reálne výsledky v dostatočne vysokom viewporte nestačia na
  hlboký scroll a helper ich odmietne pred profilovou navigáciou aj zápisom
  snapshotu; po obnovení normálneho viewportu rovnaké výsledky umožnia hlboký
  vstup a skutočnú profilovú navigáciu. Žiadne náhrady API alebo obsahové zápisy.
- Týchto šesť PASS overuje testovací helper, nie nasadenie OW-21/22/24.
  Tento izolovaný harness výslovne zatvára starý panel cez Escape; pôvodný
  produktový návratový spec tento krok stále nemá a očakáva zatvorený panel
  ešte pred volaním geometrického helpera. Pôvodné živé RED zostávajú otvorené
  až do nasadenia opravy a jej retestu. TEST-09 sa týmto nezahadzuje.
- Rozsah review opravy: štyri upravené TS/TSX (tri iba dokumentačne), jeden
  nový Playwright spec a táto existujúca evidencia. Všetky dotknuté TS/TSX
  sú pod 500 riadkov; veľké súbory ani hlavný checkout sa nemenili.
  Nasleduje autorizovaný commit/push do PR #184, ďalšia kontrola a po nasadení
  už dodané cielené manuálne testy. Nové manuálne testy samotných komentárov
  alebo harnessu nie sú potrebné. Potom podfáza B (OW-23), následne C (OW-20).

## 18. 10. 2026 – podfáza B: OW-23, explicitné Zobraziť viac od vrchu

- Používateľ potvrdil predchádzajúce review aj manuálne kolo úspešné.
  PR #184 je zlúčený; nová vetva `search-show-more-top` vychádza z main
  95b7a058. Audit checkout bol čistý a hlavný používateľov checkout zostal
  nedotknutý na e7359f1b. Nová výslovná výnimka dovoľuje v page.tsx iba
  import, jedno zapojenie samostatného hooku a dva handlery. Samostatne je
  schválený následný commit/push na túto novú vetvu, nie PR, merge alebo deploy.
- Produkčný diff má iba tieto štyri prepojenia a nový 67-riadkový
  `useSearchPreviewTabNavigation.ts`. Hook si drží jednorazový zámer pre presnú
  cieľovú query; vnorený main posunie na nulu v layout efekte až pri jej
  potvrdení, nie pred dokončením navigácie alebo pri neskoršej API odpovedi.
  Bežné horné záložky, mount, Back/Forward a dátové rerendery reset nepridávajú.
  Cudzie URL, popstate a unmount zámer zrušia; rýchle známe staršie ciele
  neprepíšu najnovší zámer. Chyba routera aj chýbajúci main sú ošetrené.
- URL kontrakt zostáva presný: Ľudia mení iba tab a odstráni users_page;
  Ponuky mení iba tab a page=1. Žiadne tiché zjednotenie ostatných parametrov,
  zmena filtrov, histórie alebo API. Cache, backend, preklady, migračné súbory,
  veľký api.ts a existujúci obnovovací hook či pamäť scrollu sa nemenia.
- RED pred prepojením stránky: 10 skutočných FAIL (1430 namiesto 0),
  2 negatívne PASS. Po prepojení nová reálna page integrácia 12/12 PASS,
  hook 19/19 PASS a súbeh oboch skutočných hookov/pamäte 4/4 PASS.
  Overené je aj click-only ovládanie bez mousedown, zachovanie pôvodných
  snapshotov a ďalší profilový návrat do novej cieľovej záložky.
- Širšia regresia: 39 sád / 618 testov PASS. Celý frontend: 471 sád /
  6 996 testov PASS (681,183 s). TypeScript PASS; cielený lint všetkých
  siedmich TS/TSX bez chýb aj upozornení. Nové pomenované helpery majú JSDoc.
- Samostatný nový hook má 100 % statements/branches/functions/lines,
  95 % gate PASS na 23 unit/restore testoch. Celé dva dotknuté produkčné
  súbory boli zmerané bez vynechania stránky: 100 % statements/functions/lines,
  ale spoločný 95 % branch gate správne FAIL na 217/231 = 93,93 %.
  Stránka má 202/216 = 93,51 % vetiev (predtým 200/214 = 93,45 %).
  Všetkých 14 chýbajúcich vetiev je presne historický TEST-08: šesť Number
  nullish fallbackov, sedem fallbackov pri null ID karty a jeden nestringový
  display-name, ktoré reálny mapper neprodukuje. Obe nové vetvy sú pokryté.
  Žiadny mock Number/mappera, ignore coverage, filler modul ani zníženie prahu.
  Úzka výnimka pre stránku sa nerozširuje na nesúvisiace legacy upratovanie.
- Nový Playwright má 6 scenárov (obe tlačidlá × WebKit desktop/mobile a
  Chromium), skutočné Railway odpovede a existujúci obsah. Kontroluje nenulový
  zdrojový scroll, prvý cieľový frame, skutočné výsledky aj scrollovateľnú
  kapacitu, URL a history length, následne profilový návrat a Forward/Back.
  Žiadne seedovanie, náhrady API, skip, force alebo automatický retry.
- Prvý spoločný živý beh 21 scenárov: 6 kontrolných PASS, 4 očakávané
  desktopové OW-23 RED, 9 chýb staršieho browser helpera a 2 nepodporované
  mobilné wheel akcie. Druhý beh po opravách harnessu: 14 kontrolných PASS,
  6 očakávaných OW-23 RED na starej produkcii (prvý cieľový scroll PC 103/64,
  mobil 120/32 namiesto 0) a 1 kontrolný timing FAIL 1791 ms pri limite 1500 ms.
  Žiadny z týchto behov sa nevydáva za zelené nasadené OW-23 overenie.
- Samostatný 15-scenárový návratový beh bez Jestu/buildu: 14 PASS vrátane
  pôvodne pomalšieho WebKit-desktop návratu do Ponúk; 1 mobilný users scenár
  neotvoril profil po jednom tapnutí. Bez akejkoľvek ďalšej zmeny testu sa
  tento konkrétny mobilný scenár samostatne vykonal 1/1 PASS (15,3 s), vrátane
  browser aj app návratu. Prvé zlyhania sa zachovávajú ako TEST-12/13, nie
  ako dokázané nové chyby appky alebo úspešne opravené príčiny.
- Produkčný build PASS vrátane kompilácie, typov a 38 statických stránok.
  Prvý sandbox pokus zablokovalo EPERM mkdir v generovanom dashboard/users/
  [userId]/posts. Po overení všetkých rodičov ako bežných priečinkov prešiel
  rovnaký príkaz s povoleným zápisom; bez ručného mazania, zmien ACL alebo
  oslabovania bezpečnosti. Registry sync nemá ďalší zdrojový diff a pôvodné
  neblokujúce Sentry odporúčanie zostáva. Nasadený PASS nového OW-23 sa netvrdí.

| ID | Nový bod | Rozhodnutie |
| --- | --- | --- |
| TEST-11 | Starší measureReturn používal v browser evaluate neprenesenú premennú position; nový mobilný setup použil nepodporované mouse.wheel | Opravené hneď, pretože priamo blokujú overenie OW-23. Jediná zmena staršieho helpera odovzdáva position.top ako explicitný argument. Mobil posúva iba skutočný nezmenený scroller a používa tap; desktop ponecháva wheel. Prvé zlyhania sú zachované vyššie, nie premenované na chyby appky. |
| TEST-12 | Jeden WebKit-desktop návrat do Ponúk prekročil budget 1500 ms: 1791 ms počas súbežného celého Jest behu | Zoznam testovacieho časovania. Ten istý variant následne bez Jestu/buildu PASS, bez úpravy limitu alebo automatického retry. Príčina prvého prekročenia nie je dokázaná; neoznačiť za novú produkčnú chybu ani za potvrdený dôsledok CPU záťaže. Pôvodný FAIL zostáva zachovaný. |
| TEST-13 | Jeden WebKit-mobile users scenár po prvom tapnutí zostal na /search namiesto otvorenia profilu | Zoznam neobjasnenej jednorazovej odchýlky: v predchádzajúcom spoločnom behu PASS a po tomto zlyhaní samostatne 1/1 PASS bez akejkoľvek zmeny testu, force, druhého tapu či zvýšenia limitov. Nejde o potvrdenú príčinu ani deklarovanú opravu navigácie appky; nový OW-23 v testovanej produkcii ešte nebol. Pri cielenom manuálnom profile-return kroku preveriť prvý tap a pri opakovaní dôsledne diagnostikovať. |

Súbory: upravené `src/app/search/page.tsx` (teraz 648 riadkov, iba povolené
prepojenia) a `e2e/support/search-panel-return.ts`; nové
`src/components/search/useSearchPreviewTabNavigation.ts`,
`src/components/search/useSearchPreviewTabNavigation.test.tsx`,
`src/components/search/useSearchPreviewTabNavigation.restore.test.tsx`,
`src/app/search/page.previewNavigation.test.tsx`,
`e2e/search-preview-tab-top.spec.ts` (všetko pod `frontend/`) a táto existujúca
evidencia. Ostatné dotknuté TS/TSX sú pod 500 riadkov. Migrácie 0.
Po review a nasadení nasledujú cielené manuálne/živé testy oboch tlačidiel
a návratov. Ďalšia implementačná podfáza je C (OW-20), najprv čerstvé mapovanie.

## 19. 10. 2026 – podfáza C: OW-20, bezpečný predbežný výsledok a overenie serverom

- Schválený je iba OW-20. Backendové matchovanie opisov, protirečivý finálny
  empty-state/CTA a prenos filtrov do úplných výsledkov zostávajú ďalšie kroky.
  Pri implementácii bez commitu/pushu; následná používateľova žiadosť povoľuje
  samostatnú vetvu `search-cache-revalidation`, commit a push na review.
  Bez PR, merge alebo nasadenia.
- Nový `searchResultsCache.ts`: viewer + dátové filtre a podmienená profilová
  lokalita v kľúči, TTL 5 minút, LRU 50 odpovedí, generation-aware zápisy.
  TTL obmedzuje iba použiteľnosť náhľadu, nie frekvenciu overovania: každý
  nový dokončený pokus vždy žiada server, aj po prázdnom výsledku.
- Nový `useSearchRequestGuard.ts`: aktuálny committed kontext, owned abort,
  deduplikácia pending požiadavky a ochrana UI/cache/histórie pred starým
  success/error, zmenou účtu/filtrov/krajiny, vyčistením, deaktiváciou a unmount.
  Invalidácia eviktuje celé zasiahnuté odpovede; lokálne filtrovanie sa
  nevydáva za novú potvrdenú serverovú odpoveď.
- `useSearchApi` koordinuje náhľad a povinné overenie. Overený prázdny
  výsledok nahradí staré karty; chyby 401/403 eviktujú príslušné cache.
  Chybný refresh nenechá starý náhľad zobrazený ako aktuálny. Záznam histórie
  vzniká až po oprávnenej úspešnej odpovedi. Samostatný historický klik a jeho
  staré snapshoty neboli touto opravou prepracované.
- `SearchModule` zruší čakajúci debounce pri Enter/submit/Apply a po otvorení
  s ponechaným dotazom overuje okamžite. `clearSearch` zruší aj owned request.
  `SearchResults` ponechá iba viditeľný predbežný náhľad so stavom načítavania;
  cached empty sa pred serverom nevydáva za dokončený nulový výsledok.
  Existujúci `search.loadingResults` je prítomný vo všetkých šiestich jazykoch.
- Dodatočný skutočný React Suspense/startTransition test zachytil chybu novej
  ochrany pri zahodenom speculative renderi B: committed A nesmel stratiť
  právo dokončiť platnú požiadavku. Najprv reprodukované RED, potom opravené
  presunom kontextu/generácie výhradne do layout commit fázy. Test overuje
  aj jednorazové dokončenie A a vyčistenie controlleru/promise. Následné
  štyri cielené sady 76/76 PASS a celý guard 100 % všetkých metrík.
- Nezávislé záverečné review zachytilo ešte deduplikáciu už zneplatnenej
  pending požiadavky pri okamžitom retry. Opravené porovnaním cache revision
  pred zdieľaním pending promise. Tri nové skutočné lifecycle regresie
  (celá cache / vlastník výsledku / aktuálny používateľ) overujú nový request,
  abort starého, prijatie novej odpovede a zákaz neskorého prepísania
  UI/cache/histórie. Vlastné nové nedostatky opravené hneď v rozsahu OW-20.
- Finálna cielená regresia: 22 sád / 417 testov PASS. Coverage celých šiestich
  produkčných súborov: 98,90 % statements, 97,53 % branches, 100 % functions,
  99,26 % lines. Každý jednotlivý súbor má každú metriku nad 95 %; cache,
  request guard a state majú všetky metriky 100 %. Bez coverage-ignore,
  vynechania častí súborov či zníženia existujúceho gate.
- TypeScript PASS. Produkčný build PASS po zopakovaní mimo sandboxu;
  prvý pokus zastavilo EPERM pri vytvorení dočasného priečinka `.next`, nie
  chyba kompilácie. Žiadne ACL zmeny či ručné mazanie. Lint všetkých šestnástich
  TS/TSX súborov: 0 chýb a jedno pôvodné nezmenené upozornenie na `<img>`
  v `SearchResults.tsx`; formát kontroly prispôsobený existujúcemu ESLint API,
  konfigurácia projektu sa nemení. `git diff --check` PASS.
- Prvý dokončený celý frontendový beh: 475/476 sád a 7 117/7 118 testov PASS,
  jediný FAIL evidovaný v TEST-14. Nezmenená sada následne izolovane 2/2 PASS;
  tento prvý celý beh sa preto neoznačuje za zelený. Po poslednej drobnej
  oprave deduplikácie prešiel nový celý beh nad finálnymi zdrojmi bez súbežných
  náročných kontrol: 476/476 sád a 7 121/7 121 testov PASS. Pôvodný FAIL
  ani jeho neobjasnená príčina sa tým nezahadzujú.
- Nový Playwright `search-cache-revalidation.spec.ts`: 3 scenáre × povinné
  WebKit desktop/mobile a Chromium = 9. Reálne Railway odpovede, GET-only
  obsahový guard, bez náhradných dát a obsahových zápisov, bez trace/snímok.
  Service workers sú v tomto transportnom teste blokované; nejde o test
  fyzickej nainštalovanej PWA. Druhá nezmenená skutočná odpoveď je držaná
  bariérou iba na pozorovanie pending stavu.
- Živý beh na nezmenenej produkcii: 9/9 RED na pôvodnom chýbajúcom druhom GET.
  Šesť variantov priamo potvrdzuje chýbajúcu revalidáciu, tri clear-flow
  varianty sa zastavili už na tejto vstupnej podmienke, nie na finálnom
  clear/history overení. Po nasadení treba zopakovať všetkých deväť;
  nasadený PASS lokálnej opravy sa netvrdí. Prvý pokus skončil ešte pred
  testami na read-only output adresári kontajnera; CLI output sa presunul
  iba do dočasného `/tmp`, bez zmeny testu alebo aplikácie.
- Veľké `src/app/search/page.tsx` (648), `src/lib/api.ts` (907) a
  `useDashboardState.ts` (921) zostali nedotknuté. Všetky dotknuté TS/TSX
  súbory sú pod 500 riadkov. Migrácie a zmeny závislostí: 0.
- Presný rozsah súborov (cesty pod `frontend/`, okrem tejto evidencie):
  - Upravené produkčné: `src/components/dashboard/modules/SearchModule.tsx`,
    `src/components/dashboard/modules/search/components/SearchResults.tsx`,
    `src/components/dashboard/modules/search/hooks/useSearchApi.tsx`,
    `src/components/dashboard/modules/search/hooks/useSearchState.tsx`.
  - Nové produkčné pod `src/components/dashboard/modules/search/hooks/`:
    `searchResultsCache.ts`, `useSearchRequestGuard.ts`.
  - Upravené testy pod `src/components/dashboard/modules/search/`:
    `SearchModule.diagnostics.test.tsx`, `components/SearchResults.behavior.test.tsx`,
    `hooks/useSearchApi.behavior.test.tsx`, `hooks/useSearchApi.diagnostics.test.tsx`.
  - Nové Jest testy v tom istom adresári: `SearchModule.revalidation.test.tsx`,
    `hooks/searchResultsCache.test.ts`, `hooks/useSearchRequestGuard.test.tsx`,
    `hooks/useSearchApi.revalidation.test.tsx`, `hooks/useSearchApi.lifecycle.test.tsx`.
  - Nový živý test: `e2e/search-cache-revalidation.spec.ts`.
  - Upravený existujúci register: `docs/testing/findings-register.md`.
- Nadväzujúce nálezy sa nestrácajú: lišta nehľadá v opisoch, no full-search
  áno; CTA počíta aj skryté typy výsledkov. `onlyMyLocation` sa ďalej
  nepoužije, Všetko ignoruje kartový typ/cenu, krajina je už známy OW-18
  nadväzujúci rozsah. Cancel filtrov priebežné zmeny nevracia. Tieto body
  sú iba zaznamenané, nie potichu opravené v OW-20.

## 19. 10. 2026 – review PR #186: obnovenie jednoznakového hľadania

- Používateľ schválil preveriť aktuálne nálezy, bezpečne opraviť platné a
  commitnúť/pushnúť na existujúcu vetvu `search-cache-revalidation`.
  Žiadny merge, deploy, nový PR ani manuálne uzatváranie review vlákien.
- Overený head `f5656aec`: CodeRabbit nemá actionable komentár, GitHub CI je
  success. Jeden platný inline nález je od `chatgpt-codex-connector`, nie od
  Rabbitu: https://github.com/toon2301/svap/pull/186#discussion_r4312962228.
- Jednoznakový dotaz je existujúca podporovaná akcia cez Enter/form submit;
  panelový backend nemá minimálnu dĺžku dva. Dvojznakový limit patrí bežnému
  automatickému písaniu. Po reopen layout efekt zmazal starý stav, ale
  debounce guard ukončil efekt pred obnovením, takže zostal prázdny panel.
- Minimal fix v `SearchModule.tsx` iba presúva okamžité overenie neprázdneho
  dotazu pri reopen pred dvojznakový debounce guard. Reopen je explicitná
  používateľská akcia a overí aj ponechaný jeden znak; samotné písanie jedného
  znaku bez odoslania počas otvoreného panela automatický request nespustí.
  Prázdny/whitespace reopen request nevytvára. Backend, API, cache, filtre,
  URL, scroll, používateľské texty a preklady ostávajú nezmenené.
- Päť nových skutočných modulových regresií v existujúcom
  `SearchModule.revalidation.test.tsx`: aktualizovaná/prázdna nová odpoveď po
  jednoznakovom Enter → close → reopen, obyčajné jednoznakové písanie,
  prázdny a whitespace reopen. Pred opravou 12 PASS / 2 vecné FAIL na
  chýbajúcom druhom requeste, po oprave 14/14 PASS.
- Cielené celé vyhľadávanie: 22 sád / 422 testov PASS. Coverage celých šiestich
  funkčných súborov 98,90 % statements / 97,54 % branches / 100 % functions /
  99,26 % lines; každá metrika každého súboru nad 95 %. Žiadne zníženie gate.
- TypeScript, produkčný build a lint troch upravených TS/TSX súborov PASS;
  lint má 0 chýb aj 0 varovaní. `git diff --check` PASS. Kontroly nemenia
  konfiguráciu, timeouty ani pravidlá projektu.
- Finálny celý frontend: 476/476 sád a 7 126/7 126 testov PASS, exit 0.
  Po súhrne sa objavilo upozornenie na oneskorené ukončenie asynchrónnej
  činnosti. Doplnkové `--detectOpenHandles` nad celou upravenou modulovou
  sadou: 14/14 PASS, exit 0 a žiadny nahlásený handle. Príčina upozornenia
  celého behu nie je dokázaná; eviduje sa ako TEST-15 nižšie, nie ako
  zlyhanie alebo automaticky opravená chyba aplikácie.
- Rozšírený existujúci `e2e/search-cache-revalidation.spec.ts` o desktopový
  retained-query reopen bez ďalšieho Enteru. Dva reálne Railway varianty
  WebKit-desktop aj Chromium sú očakávané pre-deploy RED na chýbajúcom druhom
  GET; počiatočný skutočný jednoznakový request v oboch vrátil HTTP 200.
  Mobilný variant je explicitný device SKIP, nie PASS: samostatná mobilná
  obrazovka nemá tento retained desktop overlay tok. Predošlé tri mobilné
  cache scenáre ostávajú súčasťou specu a stále čakajú na nasadený retest.
- Prvý živý pokus nového scenára neprešiel vlastným nesprávnym predpokladom
  testu o neviditeľnosti vnoreného inputu po zavretí. Dashboard overlay ostáva
  v DOM a skrýva obsah orezaním nulovej šírky a opacity. Test bol opravený
  podľa overeného layout kontraktu: aria-hidden true aj skutočná šírka 0,
  potom aria-hidden false po reopen. Žiadny produkčný layout zásah, force,
  zvýšenie timeoutu ani oslabenie kontroly zatvorenia. Pôvodné dva testové
  FAIL sa zachovávajú tu; až druhý beh dosiahol vecnú chýbajúcu revalidáciu.
- Obsahové zápisy v živom teste: 0; odpovede sú skutočné, bez náhradných dát.
  Nový kód nie je nasadený a nový automatický E2E PASS opravy sa netvrdí.
- Upravené iba `SearchModule.tsx`, `SearchModule.revalidation.test.tsx`,
  `e2e/search-cache-revalidation.spec.ts` a táto evidencia. Nové súbory,
  migrácie a závislosti: 0. TS/TSX zostávajú pod 500 riadkov.
- Následný krok: review nového commitu, po schválenom nasadení existujúce
  OW-20 manuálne testy plus PC Enter s jedným znakom → zavrieť → otvoriť,
  bez ďalšieho Enteru očakávať serverové overenie a ukončené načítavanie.
  Súvisiace zobrazenie výsledkov/CTA a prenos filtrov zostávajú ďalšie podfázy.

### Doplnkový nález testovacej stability z review kola

| ID | Položka | Odporúčanie | Dôkaz a stav |
| --- | --- | --- | --- |
| TEST-15 | Upozornenie Jest na oneskorené ukončenie po úspešnom celom FE behu | Zoznam stability; sledovať a prípadne samostatne diagnostikovať, bez zásahu do nesúvisiacich testov či aplikácie pri OW-20 | Celý beh 476 sád / 7 126 PASS, exit 0, potom upozornenie Jest did not exit one second after the test run has completed. Následne celá priamo upravená modulová sada s detectOpenHandles 14/14 PASS, exit 0, bez nahláseného handle. To neidentifikuje príčinu celého behu ani nedokazuje jeho definitívne vyriešenie. Bez forceExit, preskočených testov, zvýšenia limitov alebo oslabenia konfigurácie. |
| TEST-16 | Výnimky registračného e-mailového vlákna pri kompletných SQLite testoch | Zoznam testovacej izolácie; neopravovať registračný tok v kroku vyhľadávania | Prvý celý Linux beh 21. 10.: 1 894 PASS / 10 SKIP, exit 0, súčasne `PytestUnhandledThreadExceptionWarning` z `_send_email_async` s uzamknutou testovacou tabuľkou alebo prístupom k DB mimo povolenej fixture. Finálny beh po poslednom teste 1 895 PASS / 10 SKIP, exit 0, warnings pretrvali. Registračné súbory majú nulový diff. Toto nie je dôkaz produkčného zlyhania e-mailu ani vyhlásenie, že všetky upozornenia sú odstránené; presnú stabilitu a izoláciu treba riešiť oddelene. |
| TEST-17 | Starší diagnostický E2E test očakáva po opakovaní iba pamäť bez HTTP | Zoznam; aktualizovať samostatne podľa dokončeného kontraktu OW-20 | `e2e/search-diagnostics.spec.ts:106–141` stále očakáva po druhom Enter nulový request a zdroj Pamäť výsledkov. OW-20 zámerne vyžaduje nové overenie na serveri. Nový `search-cache-revalidation.spec.ts` už má správny kontrakt. Starý súbor sa pri tejto oprave nemení; jeho nesprávne očakávanie sa nesmie označiť za regresiu aplikácie. |
| TEST-18 | Niektoré dlhšie živé E2E pokusy skončili pred produktovým overením | Zoznam neobjasneného prostredia/prenosu; zachovať výsledky a po nasadení cielene zopakovať | Finálny 12-scenárový čítací beh 21. 10. mal 5 očakávaných RED na starej aplikácii, 1 WebKit-mobile transportný neúspech pred kontrolou obsahu a 6 chýb ešte pri čakaní na feed-list. Príčina týchto 7 neúspechov nie je dokázaná; nie sú PASS ani automaticky rovnaká chyba vyhľadávania. Helper doplnil iba bezpečné HTTP/fromServiceWorker/completed údaje, bez URL, textu či osobných dát. Žiadne opakovanie v rámci testu, zvýšenie timeoutu alebo oslabenie bariéry. |

## 21. 10. 2026 – nadväzujúca podfáza 2: opisy a viditeľné výsledky úvodnej lišty

- Používateľ potvrdil úspešné manuálne testy a Rabbit predchádzajúcej opravy OW-20;
  PR #186 je zlúčený. Toto potvrdenie nie je nový automatický živý beh.
- Aktuálny čistý `main` `8c9ec309` bol pred implementáciou znovu zmapovaný.
  Pracovná vetva: `search-panel-description-results`. Schválené sú dve chyby:
  chýbajúci krátky/podrobný opis v dashboard matchingu a rozdielny predikát
  tlačidla Zobraziť všetko oproti skutočne viditeľným výsledkom.
- Backend kopíruje oba texty do existujúcej projekcie a obe query vetvy ich
  prehľadávajú. Pôvodné OR/synonymá, ranking, ceny, kanonická krajina/okres,
  vlastné/skryté karty, verejnosť účtu a obojstranné blokovanie sa nemenia.
  Finálny payload sa stále hydratuje z reálnych kariet s kontrolou viditeľnosti.
- CTA používa rovnaký `hasPanelResults` ako zoznam a prázdny stav; raw výsledky
  ani účet/krajina/filter cache z OW-20 sa nemenia. Nové používateľské texty: 0.
- `0124_dashboard_search_projection_descriptions`: krátka atomická zmena schémy.
  `0125_dashboard_search_description_indexes`: historický backfill po 500,
  správny DB alias, krátke transakcie a row locks, živý SQL zdroj namiesto
  starého Python snapshotu; dva concurrent GIN indexy s retry invalidného indexu.
  Backfill je ohraničený pôvodnou hornou PK hranicou a opakovateľný.
- **Povinná podmienka nasadenia, nie splnený produkčný krok:** počas migrácií
  až do spustenia novej verzie backendu a workerov nesmú zapisovať staré procesy
  tvorbu/úpravy kariet. Starý ORM nové nenulové stĺpce nepozná a starý sync by
  neaktualizoval opisy. Bez kontrolovaného prechodu treba samostatne navrhnúť
  kompatibilnú viacstupňovú migráciu vrátane catch-up chýbajúcich projekcií.
  Používateľ dostal otázku na tento postup; nepredpokladáme jeho vykonanie.
  Nulový výpadok pri zapisujúcom starom deployi sa touto vetvou nesľubuje.
- Finálne nové BE testy: 45; rozšírená cielená regresia 172 PASS.
  Pokrytie celých 5 zmenených modulov vrátane oboch migrácií 99,71 %;
  builder/model/migrácie 100 %, projection 98 % spolu a 95 % vetiev.
  Žiadne nové coverage exclusions ani znížené prahy. Interrogate: 100 %,
  požadovaných aspoň 80 %. Nové testy/migrácie prešli Black formátovaním.
- Skutočný dočasný PostgreSQL 16: 44 nových testov PASS pred posledným
  samostatným fixture kontraktom; migrácia zo stavu 0123 s 1 201 historickými
  syntetickými kartami doplnila oba opisy bez jedinej nezhody, oba indexy platné.
  Selektívny testovací opisový dotaz reálne použil Bitmap Index Scan.
  Rollback 0125 a opätovné aplikovanie prešli. Nie je to benchmark produkčnej záťaže.
- Kompletný finálny Linux backend: 1 895 PASS / 10 SKIP, exit 0; varovania
  registračných vlákien sa nezamlčujú (TEST-16). Databázy len v pamäti alebo
  jednorazovom PostgreSQL, vypnuté načítanie súkromného .env; produkčná DB bez zásahu.
- FE cielená regresia: 76 PASS; celý SearchResults má 98,71 % statements,
  97,47 % branches, 100 % functions/lines. Celý frontend: 487 sád / 7 309 PASS.
  TypeScript PASS. Cielený lint: 0 chýb, 1 pôvodné nezmenené img varovanie.
  Prvý build zablokovalo DNS načítania existujúceho fontu Inter; následný
  rovnaký build s povolenou sieťou PASS, bez mockovania fontu alebo zmien aplikácie.
- Nový produkčný read-only E2E kontroluje reálne GET oproti UI, oba typy kariet,
  checkboxy a CTA/empty. Opisová fixture je existujúca karta s doslovným koncovým
  interpunkčným tokenom, bez smart-keyword alternatívy a bez verejného user matchu.
  Žiadne profile GET, tvorba kariet, zmeny preferencií, response mock, trace,
  screenshot či export identít. Chýbajúca fixture je FAIL, nie SKIP.
  Railway stále obsahuje pôvodné chyby: priebežný prvý beh 12 RED; ďalší
  finálny beh 5 produktových RED a 7 neobjasnených skorších neúspechov (TEST-18).
  Následný krátky beh s čerstvým prihlásením a finálnou sprísnenou fixture
  potvrdil opisový RED vo všetkých 3 projektoch (WebKit desktop/mobile, Chromium),
  bez chýb vstupu či prenosu. Tým sa nezahadzujú predchádzajúce neobjasnené pokusy.
  Žiadny z týchto výsledkov nie je nasadený PASS opravy.
- Zmenené produkčné súbory: `backend/accounts/models/skills.py`,
  `backend/accounts/search_projection.py`, `backend/accounts/views/search_query_builders.py`,
  `frontend/src/components/dashboard/modules/search/components/SearchResults.tsx`.
  Nové migrácie: `backend/accounts/migrations/0124_dashboard_search_projection_descriptions.py`,
  `backend/accounts/migrations/0125_dashboard_search_description_indexes.py`.
  Nové BE testy: `test_dashboard_search_description_matching.py`,
  `test_search_query_builders.py`, `test_search_projection_descriptions.py`,
  `test_search_description_migrations.py` v `backend/accounts/test/`.
  Upravené FE testy: `SearchResults.behavior.test.tsx`, `SearchModule.viewAll.test.tsx`.
  Nové E2E: `frontend/e2e/search-panel-matching.spec.ts`,
  `frontend/e2e/support/search-panel-matching.ts`. Upravený aj tento register.
- Nadlimitné `page.tsx` 648, `api.ts` 907 a `useDashboardState.ts` 921 ostali
  nedotknuté. Navrhované sú odložený APP-04. História APP-05 a starý diagnostický
  test TEST-17 sa v tomto kole neopravujú potichu.
- Ďalej: commit/push po kontrolách, Rabbit review, dohodnuté bezpečné nasadenie
  a cielený manuálny/živý retest. Potom samostatná podfáza 3: prenos a spracovanie
  všetkých filtrov v plnom vyhľadávaní; súčasná oprava túto zhodu ešte nesľubuje.
