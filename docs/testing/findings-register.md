# Svaply – spoločná evidencia nálezov a otvorených overení

Aktualizované: 18. 10. 2026.

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
| OW-20 | Úvodné vyhľadávanie považuje výsledky z pamäte za konečné bez overenia na serveri | Potvrdené riadeným vykonaním existujúceho hooku: rovnaký dotaz po zmene odpovede nevolá API. Map nemá expiráciu ani viewer ID. Samostatná podfáza C: rýchle predbežné zobrazenie a bezpečné serverové overovanie, bez zmeny pamäte návratového scrollu alebo full-search filtrov. Zatiaľ neimplementované. |
| OW-21 | Desktopový browser Back z profilu automaticky otvorí ľavý vyhľadávací panel | Podfáza A lokálne implementovaná: SearchLayout začína zatvorený, ručný toggle ostáva. Zatvorený panel používa aj visibility:hidden cez invisible, takže jeho DOM a rozpracovaný stav ostávajú zachované bez skrytých Tab cieľov. Regresie všetkých troch záložiek a 538 spoločných cielených testov PASS; produkčný retest novej vetvy čaká na nasadenie. |
| OW-22 | Desktopový návrat Všetko/Ponuky ukáže vrch a až neskôr obnoví scroll | Produkčné Chromium/WebKit meranie potvrdilo 6,0–6,3 s: otvorený panel zúži a skráti karty, dostupná výška nedosiahne uloženú pozíciu, hook čaká na height deadline. API už odpovedalo za približne 0,14–0,20 s. Ručné zatvorenie panela obnovilo správne miesto za 88/91 ms bez ďalšieho API. Podfáza A opravuje príčinu spolu s OW-21; existujúci obnovovací hook, loading/slow request/user interruption aj timeout ostávajú bez zmeny. Lokálna regresia promptného obnovenia PASS; živý PASS opravy až po nasadení. |
| OW-23 | Obe „Zobraziť viac ľudí/ponúk“ majú cieľovú záložku otvoriť od vrchu | Platí pre desktop aj mobil; explicitná zmena produktového správania. Tlačidlá iba menia URL so scroll:false, existujúci reset nesleduje tab a posúva window namiesto vnoreného main. Samostatná podfáza B, zatiaľ neimplementované. Presné prepojenie nového malého hooku do 646-riadkovej page.tsx potrebuje novú úzku výnimku; stará OW-16 výnimka ju nenahrádza. Žiadny plošný reset pri Back/Forward. |
| OW-24 | Desktopové „Zobraziť všetko“ má zavrieť ľavý vyhľadávací panel | Podfáza A lokálne implementovaná: default closed v cieľovom rozložení plus existujúce onClose odovzdané cez SearchModule priamo do SearchResults a zavolané pred push, aj pri query-only navigácii v už otvorenom /search. Syntetický mousedown odstránený. Reálna komponentová integrácia overuje klik/Enter/Space, poradie close/push, presné query/filtre a mobil bez onClose. Produkčný PASS čaká na nasadenie. |

Najbližší schválený rozsah je iba podfáza A (OW-21/22/24), potom po kontrolách
commit/push na novú vetvu a cielené manuálne testy. Podfázy B/C zostávajú otvorené;
OW-17 pri ručne otvorenom paneli tým nie je automaticky opravené. Žiadny merge,
nasadenie ani otvorenie PR nie sú týmto implementačným pokynom autorizované.

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

## Nálezy mimo aktuálneho kroku

| ID | Položka | Odporúčanie | Stav a ďalšie overenie |
| --- | --- | --- | --- |
| APP-01 | Tri chýbajúce kľúče Nástenky: `feed.captionPlaceholder`, `feed.commentsClose`, `feed.openProfile` | Zoznam; samostatná oprava po dokončení Sledovania | 13. 10. potvrdené kontrolou použitých kľúčov a nezmenenými súbormi main, 14. 10. pri OW-04 znovu rovnaké 3 missing pred aj po oprave. Doplniť vhodné texty vo všetkých šiestich jazykoch a overiť skutočné miesta zobrazenia. Nie je to OW-04. |
| APP-02 | Ďalšie slovenské texty v kartách/recenziách | Časť ratings/allReviews lokálne opravená po schválení, zvyšok ostáva v zozname | Používateľ nový nález oboch textov hlásil pre všetky jazyky. Runtime audit a real-provider RED potvrdili ratings v CS/EN/PL a allReviews v CS/PL; SK/DE/HU a EN allReviews boli správne. Opravených presne 5 leaf hodnôt v 3 JSON: CS Hodnocení/Všechny recenze, EN Ratings, PL Oceny/Wszystkie opinie. Nových 44 testov všetkých 6 jazykov desktop/mobile detail a locale-switch PASS. Bez zmeny odkazov, dát alebo pridania reviews odkazu na mobil/dopyt. Zostávajú predošlé skills.edit/message/detailedDescriptionEmpty v CS/PL a hiddenCard v PL; CS Skrytá je správne. Pri čítaní pre terminológiu boli potvrdené aj slovenské reviews.heading/rating v EN/CS: patria širšiemu samostatnému auditu, nie dvom opravovaným kľúčom. Žiadna tichá hromadná úprava. |
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
