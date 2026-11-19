# -*- coding: utf-8 -*-
"""Rozhodnutia R41 a ďalšie (od 15. 11. 2026): R41 (výnimka z pravidla 500 riadkov pre opravu 336, rozhodnuté 15. 11. 2026), R42 (opis
hlavného vypínača aj na počítači, rozhodnuté 16. 11. 2026), R43 (E2E scenár odznaku Žiadostí sa nerobí, rozhodnuté 16. 11. 2026) a R44
(E2E UI scenár kategórií a kontrola výzvy na push, rozhodnuté 16. 11. 2026), R45 až R48 (delenie `FeedPostComments.tsx`, rozhodnuté 16. 11. 2026), R49 (trvalé pravidlo: vzhľad sa najprv konzultuje s majiteľom, 16. 11. 2026), R50 (poistka `--repeat-each` v staršom API scenári volieb, rozhodnuté 17. 11. 2026) a R51 až R56 (vzhľad lajkov a komentárov, okná detailu, prehliadač fotky zo zdieľania, úchytka panela a text pri skrytých lajkujúcich, rozhodnuté 17. 11. 2026; obrázky v `navrhy/`). R57 (oprava nálezu 345: zatváranie okna detailu pri prekliku na profil, čaká na odpoveď majiteľa).

Samostatný súbor kvôli limitu 500 riadkov (`rozhodnutia_nastenka.py` má vyše 380 riadkov); `stav.py` ich pripája do `DECISIONS` za R13–R40.
Čísla rozhodnutí sa nikdy nepoužívajú znova; nové rozhodnutie sa pridáva na koniec zoznamu.
"""

DECISIONS_DALSIE = [
    dict(id='R41', tema='Výnimka z pravidla 500 riadkov: oprava anglického „Network Error“ v okne recenzie (336)',
         otazka='Oprava 336 je v `onSubmit` v `OfferReviewsView.tsx` (683 riadkov, riadky 655 až 661): záložný text sa skladá ako '
                 '`error.message || …`, takže pri výpadku siete ukáže okno recenzie anglické „Network Error“ a pri chybe servera bez '
                 'textu anglické „Request failed with status code …“; okná dostanú už hotovú správu, preto sa oprava bez zásahu do tohto '
                 'súboru dá len obísť (porovnávanie anglického textu v oknách alebo zmena spoločného pomocníka), čo je horšie. Smie '
                 'kolega túto opravu urobiť ako výnimku z pravidla 500 riadkov s podmienkami R31 a R37 (vlastný commit, test, ktorý bez '
                 'zmeny padá, v diffe len nevyhnutné riadky `catch` bloku, počet riadkov súboru sa nezvýši)?',
         odporucanie='Áno, s maximálnou opatrnosťou: jeden `catch` blok, záložný text cez `t()` v šiestich jazykoch bez `error.message`, '
                      'charakterizačné testy ciest, ktoré sa nemajú zmeniť (text zo servera, chyby polí), pred zmenou, mutácie, skúška v '
                      'prehliadači bez internetu v oboch oknách a zastavenie pri akejkoľvek ďalšej potrebe zmeny v súbore. Dve poznámky k tomu '
                      'istému `onSubmit` (duplicitné zneplatnenie cache ponúk a načítanie zoznamu po úspešnom odoslaní) ostávajú mimo '
                      'výnimky.',
         kedy='Rozhodnuté 15. 11. 2026.',
         odpoved='Majiteľ 15. 11. 2026: výnimka je udelená, s tým, že pri oprave platí maximálna opatrnosť. Agent to vykladá ako '
                  'podmienky R31 a R37 (vlastný commit, test, ktorý bez zmeny padá, v diffe len nevyhnutné riadky `catch` bloku v '
                  '`onSubmit`, počet riadkov súboru sa nezvýši) a navyše: charakterizačné testy pred zmenou, mutácie, skúška v prehliadači '
                  'bez internetu v oboch oknách a zastavenie pri akejkoľvek ďalšej potrebe zmeny v súbore. Povolenie platí len pre nález '
                  '336; poznámky k `onSubmit` sa týmto neudeľujú. Oprava ide ako K24 (karta `karty/K24.md`).',
         datum='15. 11. 2026'),
    dict(id='R42', tema='Opis hlavného vypínača „Vypnúť všetko“ aj na počítači (321)',
         otazka='Veta v opise hlavného vypínača („Vypne všetky upozornenia okrem Správ. Nové žiadosti o zručnosť sa aj tak zobrazia v '
                 'Žiadostiach, len bez odznaku.“) sa ukáže len v mobilnom rozložení; rozloženie na počítači opis nikdy nemalo (K20 a '
                 'K21). Má sa opis ukázať aj na počítači? (a) Áno: opis sa zobrazí pod názvom vypínača aj na počítači, rovnaký text '
                 'vo všetkých šiestich jazykoch (texty už existujú). (b) Nie: ostáva len na mobile.',
         odporucanie='(a): bez opisu na počítači nie je vidieť, že pri zapnutom „Vypnúť všetko“ nové žiadosti o zručnosť stále prídu '
                      'do Žiadostí (len bez odznaku, R39), takže používateľ na počítači môže čakať, že žiadosť nepríde vôbec. Zmena je '
                      'malá (rozloženie na počítači a vypínač, žiadny nový text).',
         kedy='Rozhodnuté 16. 11. 2026.',
         odpoved='Majiteľ 16. 11. 2026: áno, opis sa má ukázať aj na počítači (podľa odporúčania agenta). Ide ako dávka K25 (karta '
                  '`karty/K25.md`), po K24.',
         datum='16. 11. 2026'),
    dict(id='R43', tema='E2E scenár odznaku Žiadostí s dvoma účtami (330): robiť, alebo nie',
         otazka='Codex scenár zmapoval (nová žiadosť o zručnosť medzi dvoma testovacími účtami pri vypnutej kategórii alebo zapnutom '
                 '„Vypnúť všetko“: žiadosť je v Žiadostiach, no počet neprečítaných sa nezvýši; po zapnutí kategórie ďalšia žiadosť odznak '
                 'rozsvieti) a nespustil ho: potrebuje dva účty, existujúcu ponuku, dve nové žiadosti a dočasnú zmenu volieb príjemcu, a '
                 'bežné API nové žiadosti ani ich upozornenia nezmaže (zrušenie a skrytie nezmaže riadok ani upozornenie). (a) Scenár '
                 'nerobiť. (b) Robiť a pripustiť, že zrušené žiadosti a ich upozornenia zostanú v testovacích účtoch a upratať ich by '
                 'musel majiteľ ručne. (c) Robiť s novou backendovou funkciou na upratanie len pre testy (neodporúča sa).',
         odporucanie='(a): správanie stráži 12 backendových testov s mutáciami 9 z 9 a majiteľ ho overil ručne (R39); E2E by pridalo '
                      'údaje, ktoré bežné API neupracie, a testovacie účty by sa postupne znečisťovali. Ak sa odznak niekedy pokazí, '
                      'zachytia to backendové testy.',
         kedy='Rozhodnuté 16. 11. 2026.',
         odpoved='Majiteľ 16. 11. 2026: podľa odporúčania agenta, teda (a): scenár sa nerobí. Nález 330 ostáva hotový (K21); Codex '
                  'kvôli nemu nič nevytvára ani nespúšťa.',
         datum='16. 11. 2026'),
    dict(id='R44', tema='E2E: UI scenár zmeny kategórie upozornení a kontrola výzvy na push (zvyšok etapy 4 nálezu 321, nález 337)',
         otazka='Codex zmapoval (bez implementácie) dva E2E scenáre. (1) UI scenár kategórií: cez rozhranie zmeniť jednu '
                 'kategóriu (`notify_likes`), overiť uloženie (PATCH, GET, obnovenie stránky) a vo `finally` vrátiť '
                 'všetkých sedem hodnôt s overením; WebKit desktop aj mobil je povinný, účet sa dočasne zmení a vráti. (2) '
                 'Kontrola výzvy na push z K23: len pri už zapnutých Správach, bez kliknutia na „Povoliť“, odmietnutie '
                 '„Nie teraz“ a jeho zmiznutie po obnovení (príznak v úložisku prehliadača sa vráti); výzvu s tlačidlom by '
                 'videl len desktopový WebKit (mobilný WebKit push API nemá a Chromium má povolenie `denied`). Robiť? (a) '
                 'Oba scenáre. (b) Len UI scenár kategórií. (c) Žiadny.',
         odporucanie='(b): UI scenár kategórií uzatvára plán etapy 4 nálezu 321 a overuje celý reťazec rozhranie, server '
                      'a obnovenie v skutočných prehliadačoch vrátane mobilného ťuku; zásah do účtu je malý a návrat sa '
                      'overuje. Výzvu na push dobre pokrývajú jednotkové testy a ručný test na iPhone prešiel; E2E by ju '
                      'videlo len v jednom projekte a pri zmene stavu účtu (zapnuté Správy). (c) je v poriadku, ak majiteľ '
                      'nechce ďalšiu prácu v E2E: nález 337 sa vtedy uzavrie rozhodnutím.',
         kedy='Rozhodnuté 16. 11. 2026.',
         odpoved='Majiteľ 16. 11. 2026: súhlas s odporúčaním agenta, teda (b): robí sa len UI scenár zmeny kategórie upozornení '
                  '(nález 337); kontrola výzvy na push sa v E2E nerobí (ostáva jednotkovými testami a ručným testom na iPhone). '
                  'Agent to vykladá tak, že Codex scenár implementuje v `frontend/e2e/**` podľa vlastného mapovania (zmena jednej '
                  'voľby cez rozhranie, overenie uloženia po obnovení stránky, vrátenie všetkých siedmich hodnôt s overením, WebKit '
                  'desktop aj mobil povinný), pred implementáciou skontroluje, že testovací účet má zapnuté upozornenia v aplikácii '
                  '(`in_app_notifications`; inak scenár nahlási majiteľovi a nič potichu nezapína), a že živé okno proti Railway '
                  'oznámi majiteľ samostatne.',
         datum='16. 11. 2026'),
    dict(id='R45', tema='Delenie `FeedPostComments.tsx` (333): uložiť odtlačok HTML šiestich stavov na kontrolu vzhľadu?',
         otazka='Kolega pri mapovaní K26 pýta, či sa pre zhodu vzhľadu uloží HTML šiestich stavov komponentu komentárov (kolega ich '
                 'určí; napríklad načítavanie, zlyhanie, prázdny zoznam, zoznam s odpoveďami, úprava a potvrdenie mazania) a po '
                 'každom kroku delenia sa porovná; v projekte je dnes 0 snapshotov. (a) Áno, ale len dočasne: odtlačok vznikne v '
                 'kroku 0 a zmaže sa v poslednej dávke delenia. (b) Áno, natrvalo. (c) Nie, vzhľad sa overí len ručne a '
                 'existujúcimi testami.',
         odporucanie='(a): delenie nesmie zmeniť vzhľad, no existujúce testy čítajú hlavne texty a identifikátory `data-testid`; '
                      'triedy a obaly strážia len na pár miestach, takže stratená trieda alebo obal by prešli. Odtlačok je dočasný, '
                      'lebo redizajn (261) štruktúru zámerne zmení a trvalý odtlačok by sa po ňom len prepisoval.',
         kedy='Rozhodnuté 16. 11. 2026.',
         odpoved='Majiteľ 16. 11. 2026: podľa odporúčania agenta, teda (a): odtlačok HTML šiestich stavov sa vytvorí v kroku 0 '
                  '(dávka 1 z 5, K28) a zmaže sa v poslednej dávke delenia.',
         datum='16. 11. 2026'),
    dict(id='R46', tema='Delenie `FeedPostComments.tsx` (333): deväť vetiev, alebo päť dávok s jedným ručným testom',
         otazka='Plán kolegu z K26 má deväť krokov (0 až 8). (a) Päť dávok s jedným ručným testom majiteľa po každej (0 | 1–3 | 4 | '
                 '5–6 | 7–8); každý krok ostane vlastným commitom a po ňom beží celý Jest. (b) Deväť krokov v deviatich vetvách '
                 's deviatimi ručnými testami.',
         odporucanie='(a): chybu vieme vystopovať na jeden krok aj pri dávke, no majiteľ robí päť ručných testov namiesto deviatich. '
                      'Ak by ručný test po niektorej dávke zlyhal, rozdelí sa len tá dávka.',
         kedy='Rozhodnuté 16. 11. 2026.',
         odpoved='Majiteľ 16. 11. 2026: podľa odporúčania agenta, teda (a): päť dávok (0 | 1–3 | 4 | 5–6 | 7–8). Dávka 1 je K28 '
                  '(len testy, bez ručného testu); ďalšie dostanú číslo K, keď pôjdu kolegovi.',
         datum='16. 11. 2026'),
    dict(id='R47', tema='Redizajn 261 (skupiny 6 a 7) a delenie `FeedPostComments.tsx` (333): kedy smie redizajn začať',
         otazka='Smie redizajn 261 (skupiny 6 a 7: pole na text, „Zobraziť odpovede (N)“, bubliny) začať už po kroku 3 delenia, '
                 'nad vyčlenenými komponentmi komentára a poľa na komentár? (a) Nie, až po poslednej dávke delenia. (b) Áno, '
                 'už po kroku 3.',
         odporucanie='(a): ručný test majiteľa po dávke je jednoduchý („musí vyzerať presne rovnako“), čo sa pri súbežnom '
                      'redizajne stratí; najrizikovejšie kroky 4 až 7 idú až po kroku 3 a majú ísť na nemennom vzhľade; kroky 5 až '
                      '7 menia, čo komponent komentára dostáva (úprava, odpoveď, mazanie), takže by sa redizajn s delením '
                      'prekrýval v tých istých súboroch. Čakanie stojí málo, lebo majiteľ vzhľad Nástenky sám neupravuje. Ak by '
                      'sa ponáhľalo, najskôr po dávke 5–6.',
         kedy='Rozhodnuté 16. 11. 2026.',
         odpoved='Majiteľ 16. 11. 2026: podľa odporúčania agenta, teda (a): redizajn 261 začne až po poslednej dávke delenia.',
         datum='16. 11. 2026'),
    dict(id='R48', tema='Nález 338 (zaseknuté „Načítavam…“ pri pridaní komentára počas prvého načítania): kedy a ako opraviť',
         otazka='Oprava mení správanie v `FeedPostComments.tsx` (1 487 riadkov). (a) Až po kroku 6 delenia, v novom súbore '
                 '(`useFeedCommentsLoader.ts`), ako samostatný commit s testom; výnimka z pravidla 500 riadkov netreba. (b) '
                 'Hneď, s výnimkou z pravidla 500 riadkov pre ten súbor. (c) Neopravovať.',
         odporucanie='(a): pravdepodobnosť je nízka (pomalá sieť a pridanie komentára skôr, než sa zoznam načíta), delenie nesmie '
                      'meniť správanie a oprava v novom súbore výnimku nepotrebuje.',
         kedy='Rozhodnuté 16. 11. 2026.',
         odpoved='Majiteľ 16. 11. 2026: podľa odporúčania agenta, teda (a): oprava 338 ide po kroku 6 delenia, v novom súbore, ako '
                  'samostatný commit s testom.',
         datum='16. 11. 2026'),
    dict(id='R49', tema='Trvalé pravidlo: redizajn a vzhľadové zmeny sa najprv konzultujú s majiteľom',
         otazka='Ako sa majú riešiť zmeny vzhľadu (redizajn Nástenky a komentárov, vzhľad zoznamu lajkujúcich a podobne)? (a) '
                 'Najprv sa vzhľad prebere s majiteľom (agent pripraví návrh s možnosťami a odporúčaním), až potom sa píše karta '
                 'pre kolegu. (b) Kolega navrhne a urobí vzhľad sám.',
         odporucanie='(a): vzhľad je rozhodnutie majiteľa a po zlúčení sa ťažko vracia; kolega kóduje podľa schváleného vzhľadu.',
         kedy='Rozhodnuté 16. 11. 2026.',
         odpoved='Majiteľ 16. 11. 2026: redizajn Nástenky, komentárov a podobné vzhľadové zmeny treba vždy najprv prekonzultovať. '
                  'Agent to vykladá ako trvalé pravidlo: pred každou kartou so zmenou vzhľadu agent pripraví návrh (možnosti a '
                  'odporúčanie), majiteľ ho schváli a až potom ide karta kolegovi; kolega vzhľad nemení bez schváleného vzhľadu v '
                  'karte. Platí najmä pre frontend zoznamu lajkujúcich (262) a pre redizajn 261. Majiteľ 17. 11. 2026 súhlasil (podľa '
                  'odporúčania agenta) aj so zápisom pravidla do `AGENTS.md`, aby ho mali všetci agenti vrátane nových relácií.',
         datum='16. 11. 2026'),
    dict(id='R50', tema='Poistka proti `--repeat-each` v staršom API scenári volieb (nález 340): súhlas na opravu',
         otazka='Codex zistil, že v Playwrighte 1.63 sa voľba `--repeat-each` nepremietne do `testInfo.project.repeatEach`, takže '
                 'starší `notification-preferences-test.ts` ju nezachytí a API scenár volieb by sa pri nesprávnom ručnom spustení '
                 'vykonal viackrát (v lokálnej syntetickej skúške 2x, štyri simulované PATCH). Predpísaný príkaz bez opakovania '
                 'medzeru nevyvolá. Dať Codexovi súhlas na samostatnú malú opravu poistky (len `frontend/e2e/**`)? (a) Áno, ako '
                 'samostatná malá vetva Codexa. (b) Nie, stačí pravidlo nespúšťať scenár s `--repeat-each`.',
         odporucanie='(a): zmena je malá a len v E2E; poistka chráni hlavný testovací účet pred nechceným opakovaným zápisom pri '
                      'nesprávnom spustení.',
         kedy='Rozhodnuté 17. 11. 2026.',
         odpoved='Majiteľ 17. 11. 2026: podľa odporúčania agenta, teda (a): Codex smie opraviť poistku `--repeat-each` ako '
                  'samostatnú malú vetvu (len `frontend/e2e/**`); dovtedy sa API scenár volieb s touto voľbou nespúšťa.',
         datum='17. 11. 2026'),
    dict(id='R51', tema='Vzhľad bubliny so zoznamom lajkujúcich na všetkých miestach, mobil aj počítač (nález 262)',
         otazka='Ako má vyzerať otvorenie zoznamu „Páči sa im to“ pri príspevku, portfóliu, profile, ponuke, dopyte a komentári (R49: '
                 'vzhľad sa najprv konzultuje s majiteľom)? Agent kreslil návrhy na snímkach majiteľa z mobilu aj z počítača a majiteľ ich '
                 'upravoval po jednom mieste.',
         odporucanie='Jedna malá bublinka s ikonou lajku pri každom mieste, ktorá otvorí ten istý existujúci zoznam; pravidlá viditeľnosti '
                      'ostávajú podľa R20 (variant A). Pri komentároch agent najprv odporúčal ponechať dnešné klikateľné číslo; majiteľ '
                      'chcel bublinku aj tam (R52).',
         kedy='Rozhodnuté 17. 11. 2026.',
         odpoved='Majiteľ 17. 11. 2026 schválil tieto pravidlá (obrázky v `docs/zoznam-nalezov/navrhy/`). SPOLOČNE: bublinka otvorí '
                  'existujúci zoznam (vzhľad zoznamu sa nemení); zobrazí sa len pri aspoň jednom lajku, aj keď ho dal niekto iný; číslo pri '
                  'srdiečku ostáva a nie je klikateľné; farba srdiečka sa nemení; svetlý režim: bublinka (237, 233, 254) s okrajom (221, '
                  '214, 254) a srdiečko (147, 51, 234), tmavý režim: bublinka (52, 55, 64) a srdiečko (217, 179, 254); štítok pre čítačky je '
                  'existujúci text „Páči sa im to“ (`feed.likersTitle`); preklik na profil z avatara a mena ostáva všade. MOBIL: príspevok a '
                  'detail príspevku (text, text s fotkou, zdieľané portfólio a ponuka): bublinka úplne vpravo v riadku s ikonami, v osi s '
                  'menu „…“ hore, číslo je bližšie k srdiečku (`mobil-prispevok.png`); fotka na celú obrazovku: bublinka dole vpravo na '
                  'mieste „…“, ktoré sa presunie hore naľavo od krížika (`mobil-fotka.png`); portfólio: bublinka vpravo dole v riadku s '
                  'názvom, pravý okraj presne pod pravým okrajom lajku hore, dlhý názov sa skráti trojbodkou len pri zobrazenej bublinke, '
                  'vlastný aj cudzí profil rovnako, detail položky sa nemení (`mobil-portfolio.png`); profil: palec s číslom spolu v jednej '
                  'bublinke, len zobrazenie (nie tlačidlo lajku, to ostáva na cudzom profile bezo zmeny), pri nule NIE JE ani bublinka, ani '
                  'čiara, celý riadok zmizne (platí aj na počítači; agent to berie tak, že aj s miestom) (`mobil-profil.png`); ponuka a '
                  'dopyt (obrazovka „Popis“): srdiečko s číslom spolu v bublinke, väčšia a trochu vyššie, ťuk na text „Páči sa mi to“ aj na '
                  'bublinku otvorí zoznam, text sa nepodčiarkuje, zobrazuje sa vždy aj pri nule a pri nule sa nič neotvorí; platí aj vo '
                  'výsledkoch vyhľadávania, lebo ide o tú istú kartu a obrazovku (`mobil-ponuka.png`). POČÍTAČ: karta na Nástenke a okná '
                  'príspevku (len text, s fotkou): rovnako ako na mobile, v osi s menu „…“ (`pc-prispevok.png`); portfólio: veľká aj malá '
                  'karta rovnako, rozloženie portfólií sa nemení (`pc-portfolio.png`); profil: celý prvok „Palec hore • N“ v jednej '
                  'bublinke, čiary po stranách ostávajú (`pc-profil.png`); ponuka a dopyt (zadná strana karty): bublinka okolo srdiečka a '
                  'čísla bez zväčšovania a posúvania, aj pri nule (`pc-ponuka.png`); rovnakú kartu ponuky používa profil, vyhľadávanie, '
                  'Sledovania aj Žiadosti, takže bublinka bude vo všetkých. KOMENTÁRE a odpovede: pozri R52; text pri skrytých lajkujúcich: '
                  'pozri R56.',
         datum='17. 11. 2026'),
    dict(id='R52', tema='Vzhľad komentárov a odpovedí vrátane bubliny pri lajkoch (nález 261, skupina 7), mobil aj počítač',
         otazka='Pôvodné priania majiteľa (nález 261, skupina 7): plochý vzhľad komentárov bez sivých bublín, vnorené a prepojené '
                 'odpovede, jemný oddeľovač, „Zobraziť odpovede (N)“ bližšie k riadku akcií. Majiteľ 17. 11. 2026 chcel k nim pridať '
                 'bublinku pri lajkoch komentárov a odpovedí a návrh vzhľadu prebrať hneď (R49), kód až po delení (R47). Ako majú '
                 'komentáre vyzerať?',
         odporucanie='Jeden vzhľad pre všetky miesta (komentáre kreslí vždy ten istý komponent `FeedPostComments`): plochý riadok bez sivej '
                      'bubliny a bublinka s lajkom rovnako ako pri príspevku. Agent pôvodne odporúčal komentáre nechať, kým majiteľ '
                      'nezvolil bublinku.',
         kedy='Rozhodnuté 17. 11. 2026.',
         odpoved='Majiteľ 17. 11. 2026 schválil návrh („presne tak som si to predstavoval“): plochý vzhľad bez sivých bublín (avatar, '
                  'meno, text a pod nimi riadok akcií); bublinka s lajkom (bez čísla) vpravo v riadku akcií, aj pri odpovedi, len pri aspoň '
                  'jednom lajku, číslo pri srdiečku ostáva a nie je klikateľné (zoznam otvára bublinka); „Zobraziť / Skryť odpovede“ bližšie '
                  'pod riadkom akcií ako jemný text s čiarkou; odpovede so zvislou čiarou z avatara, menší avatar, bez bubliny; jemný '
                  'oddeľovač medzi komentármi najvyššej úrovne; kôš, „Upraviť“ a pole na komentár zatiaľ ostávajú ako dnes; čas pri '
                  'komentári ostáva ako dnes (mobil áno, počítač nie); preklik na profil z avatara a mena ostáva pri komentári aj pri '
                  'odpovedi. Obrázky `mobil-komentare.png` (miesto pri príspevku a miesto nad fotkou, oba rovnaký vzhľad) a '
                  '`pc-komentare.png` (pravý stĺpec okna). Zoznam lajkujúcich pri komentároch a odpovediach už funguje (číslo vedľa '
                  'srdiečka), nová je bublinka. Implementácia v jednej dávke až po delení `FeedPostComments.tsx` (R47); kolega vzhľad '
                  'nemení bez tohto schváleného vzhľadu v karte (R49).',
         datum='17. 11. 2026'),
    dict(id='R53', tema='Okno detailu príspevku na počítači: zdieľaná ponuka a portfólio v dvoch stĺpcoch, okno len s textom užšie (nález 344)',
         otazka='Dnes sú dva stĺpce (hlavička, text, fotka a akcie vľavo, komentáre vpravo) len pri príspevku s fotkou; zdieľaná ponuka '
                 'a portfólio majú jeden stĺpec, v ktorom sa karta orezáva, a okno len s textom je široké 864 px, takže krátky text aj '
                 'komentáre sú roztiahnuté. Aké rozloženie majú mať? (a) Zdieľaná ponuka a portfólio v dvoch stĺpcoch ako pri fotke. '
                 '(b) Okno len s textom užšie (asi 580 px) alebo (c) tiež v dvoch stĺpcoch.',
         odporucanie='(a) podľa želania majiteľa; pri texte (b): je to najmenšia zmena, text ani komentáre nie sú roztiahnuté a bublinka s '
                      'lajkom je blízko textu; (c) zjednocuje rozloženie, no pri krátkom texte by bol ľavý stĺpec prázdny a zmena je väčšia '
                      '(jednostĺpcové rozloženie by sa zrušilo).',
         kedy='Rozhodnuté 17. 11. 2026.',
         odpoved='Majiteľ 17. 11. 2026: (a) zdieľaná ponuka a portfólio v dvoch stĺpcoch s rovnakou logikou ako pri fotke (pevná výška '
                  'okna, karta vyplní zvyšok ľavého stĺpca, riadok akcií stále dole, text so „Viac“, komentáre vpravo s poľom dole); klik '
                  'na kartu ostáva (otvorí ponuku alebo portfólio); zdieľaný príspevok sa nemení; a (b) okno len s textom užšie (asi 580 '
                  'px, hore príspevok, pod ním komentáre, pole na komentár pri spodku); okno s fotkou, ponukou a portfóliom ostáva 864 px. '
                  'Obrázky `pc-okno-ponuka.png` a `pc-okno-text.png` (možnosť A). Ide ako nález 344.',
         datum='17. 11. 2026'),
    dict(id='R54', tema='Prehliadač fotky otvorený zo zdieľaného príspevku na mobile ukazuje komentáre pôvodného príspevku',
         otazka='Majiteľ otvoril fotku zo zdieľaného príspevku a panel komentárov nad fotkou bol prázdny, hoci zdieľanie malo 11 '
                 'komentárov. Agent overil čítaním kódu: ťuk na fotku v zdieľanom príspevku otvorí `FeedSharedPhotoViewer`, ktorý dotiahne '
                 'PÔVODNÝ príspevok, takže lajky, komentáre a zdieľanie vo vrstve patria originálu (ten mal 0 komentárov). Nie je to chyba '
                 'načítania. (a) Nechať: komentáre, lajky a zdieľanie patria v prehliadači fotky pôvodnému príspevku (ako na Facebooku; '
                 'jeden príspevok = jeden prehliadač). (b) Ukázať komentáre zdieľania.',
         odporucanie='(a): vo vrstve by sa inak miešali dva príspevky (fotka a hlavička originálu, komentáre zdieľania).',
         kedy='Rozhodnuté 17. 11. 2026.',
         odpoved='Majiteľ 17. 11. 2026: podľa odporúčania agenta, teda (a): ostáva ako dnes. Nevzniká nález.',
         datum='17. 11. 2026'),
    dict(id='R55', tema='Úchytka panela komentárov nad fotkou na mobile (nález 343)',
         otazka='Sivý kruh hore v paneli komentárov nad fotkou je úchytka (potiahnutie nadol alebo ťuk panel zatvorí); kvôli globálnemu '
                 'pravidlu `button { min-height: 36px }` je z pôvodne 6 px vysokej úchytky ovál 40×36 px. Čo s ním? (a) Tenká úchytka '
                 '40×6 px, ako sa pôvodne mala zobrazovať. (b) Šípka nadol (staršie prianie z nálezu 261). (c) Bez úchytky.',
         odporucanie='(a): obvyklý znak „potiahni nadol“; ťuk aj potiahnutie fungujú ďalej a neviditeľná plocha na ťuk má aspoň 44 px.',
         kedy='Rozhodnuté 17. 11. 2026.',
         odpoved='Majiteľ 17. 11. 2026: podľa odporúčania agenta, teda (a): tenká úchytka 40×6 px (`mobil-uchytka.png`). Ide ako nález 343.',
         datum='17. 11. 2026'),
    dict(id='R56', tema='Zoznam lajkujúcich, keď sú všetci lajkujúci skrytí (súkromné, blokované alebo neaktívne účty)',
         otazka='Číslo pri srdiečku zahŕňa aj skrytých lajkujúcich, takže zoznam môže byť prázdny, hoci číslo je väčšie ako nula; dnes sa '
                 'ukáže „Zatiaľ nikto.“ Čo má zoznam ukázať? (a) Nechať „Zatiaľ nikto.“ (b) Neutrálny text „Zoznam lajkujúcich nie je '
                 'dostupný.“, ktorý nehovorí prečo (R25: neprezradiť súkromie). (c) Divákovi bublinku nezobraziť (server by musel povedať '
                 'počet viditeľných lajkujúcich).',
         odporucanie='(b): pri čísle 2 by „Zatiaľ nikto.“ pôsobilo ako chyba; (c) je väčšia zmena na serveri. Pri nule sa zoznam podľa '
                      'R51 neotvára, takže „Zatiaľ nikto.“ ostáva len pre výnimočný prípad.',
         kedy='Rozhodnuté 17. 11. 2026.',
         odpoved='Majiteľ 17. 11. 2026: podľa odporúčania agenta, teda (b): text „Zoznam lajkujúcich nie je dostupný.“ (preklad do šiestich '
                  'jazykov pri implementácii nálezu 262).',
         datum='17. 11. 2026'),
    dict(id='R57', tema='Oprava nálezu 345: ako zavrieť okno detailu príspevku pri prekliku na profil (počítač)',
         otazka='Okno detailu príspevku ostane otvorené nad profilom, keď sa na profil prejde z komentára (a zo zoznamu lajkujúcich) a okno '
                'bolo otvorené z upozornenia alebo z adresy. K36: stav okna vlastní hook `useFeedOverlayTarget.ts`, kontext okna drží '
                'druhú kópiu cieľa a strážca komentárov číta len tú. Ako to opraviť? (a) Všeobecné pravidlo v '
                '`useFeedOverlayTarget.ts` (65 riadkov): pri otvorenom okne a udalosti `goToUserProfile` okno zavrieť. (b) Oprava '
                'príčiny: kontext okna dostane riadený cieľ z hooku (`FeedPostOverlayContext.tsx`, `DashboardContentView.tsx`; zlyhá '
                'jeden existujúci test v súbore s 895 riadkami, treba upraviť jednu aserciu). (c) Obe. Druhá otázka: má okno zavrieť '
                'aj preklik na „Môj profil“ (`goToMyProfile`)?',
         odporucanie='(a) a zavrieť aj pri `goToMyProfile`: najmenšia zmena v jednom malom súbore, rieši aj preklik zo zoznamu lajkujúcich '
                      '(nález 350) a budúce miesta; prototyp kolegu prešiel (7 súvisiacich sád, 220 testov a celý Jest bez zmeny testov). '
                      '(b) rieši príčinu, no nerieši zoznam lajkujúcich a vyžaduje úpravu testu v súbore nad 500 riadkov; ak sa neskôr '
                      'ukáže potreba, ide samostatne. Riziko (a): po „Späť“ z profilu sa má okno znova otvoriť z adresy ako pri hlavičke '
                      '(podľa kódu, sondou neoverené), preto je v karte K39 ručný test aj na túto cestu. Druhé riziko (a): listener môže v tej istej obsluhe kliknutia '
                      'vidieť zastaraný cieľ a zavrieť okno druhýkrát (predčasné zhasnutie príznaku `closing` v histórii), preto karta K39 '
                      'vyžaduje čítanie aktuálneho stavu a test sekvencie.',
         kedy='Rozhodnuté 18. 11. 2026.',
         odpoved='Majiteľ 18. 11. 2026: podľa odporúčania agenta (kartu K39 napísanú podľa neho poslal kolegovi), '
                 'teda (a): všeobecné pravidlo v `useFeedOverlayTarget.ts`, ktoré zatvorí okno pri `goToUserProfile` '
                 'aj pri `goToMyProfile`; možnosť b (riadený cieľ v kontexte okna) sa nerobí. Oprava je zlúčená v PR '
                 '#292 (K39) a vyrieši aj nález 350.',
         datum='18. 11. 2026'),
    dict(id='R58', tema='Oprava nálezu 346: kam posunúť nový komentár na iPhone a čo má robiť indikátor nových komentárov',
         otazka='Po vlastnom odoslaní komentára aj po ťuknutí na „N nových komentárov“ sa zoznam na iPhone posunie '
                'na vrch plochy, kde je nad komentármi hlavička príspevku (text, fotka, akcie), takže nový komentár '
                'je čiastočne zakrytý poľom na písanie (K36: pri 393×659 a príspevku s fotkou vidno 63 zo 112 px; '
                'ručný test majiteľa po K38 a K39 to potvrdil). Prvá otázka: kam sa má zoznam posunúť? (a) Nový '
                '(prvý) komentár na vrch viditeľnej plochy s malou rezervou; hlavička príspevku sa posunie nad '
                'plochu. (b) Len doscrollovať, aby bol komentár celý vidieť; hlavička ostane čiastočne viditeľná. '
                'Druhá otázka: čo má robiť indikátor, keď je čitateľ už na začiatku komentárov (dnes sa „vrch“ '
                'počíta od vrchu hlavičky, takže sa mu indikátor ukáže, hoci nové komentáre sú hneď pod ním)? (a) '
                '„Pri vrchu“ počítať od prvého komentára: čitateľ na začiatku komentárov uvidí nový komentár hneď '
                '(posun sa vykoná sám) a indikátor sa mu neukáže; čitateľ nižšie v zozname dostane indikátor ako '
                'dnes. (b) Nechať ako dnes.',
         odporucanie='Obe (a): (1) prvý komentár na vrchu plochy je odolný voči výške viditeľnej plochy, ktorá sa na '
                     'iPhone mení s klávesnicou a lištou Safari (prototyp kolegu v K36: komentár celý viditeľný vo '
                     'všetkých meraných rozmeroch od 375×553 do 390×844, krátky aj päťriadkový text); „len '
                     'doscrollovať“ závisí od výšky plochy v čase posunu. Hlavička príspevku sa pri tom posunie nad '
                     'plochu, čitateľ ju vráti posunom späť. (2) Bez toho by čitateľ na začiatku komentárov dostal '
                     'indikátor, hoci nový komentár je hneď pod ním. Riziko stredné: mení sa správanie indikátora; '
                     'platí len pri mobilnej hlavičke, desktop a panel nad fotkou sa nemenia.',
         kedy='Pred poslaním karty K40 kolegovi; karta je napísaná podľa odporúčania.'),
    dict(id='R59', tema='Kedy začať redizajn komentárov (261, skupina 7) a čo sa pri ňom musí vyriešiť navyše',
         otazka='Redizajn komentárov (261, skupina 7, vzhľad schválený v R52) smie podľa R47 začať po poslednej '
                'dávke delenia `FeedPostComments.tsx` (K42). Majiteľ navrhol (19. 11. 2026) nič nesiliť a začať ho '
                'až po piatich najbližších krokoch: K40 (oprava 346), K41 (oprava 338 a mapovanie 351), K42 '
                '(posledná dávka delenia), K43 (opravy 342 a 351) a K31 (upgrade Next.js, 341). (a) Hneď po K42. (b) '
                'Až po piatich krokoch.',
         odporucanie='(b), agent súhlasí: upgrade Next.js je dávka závislostí a ide vždy samostatne, takže je '
                     'lepšie, aby prebehol pred redizajnom a nezmiešal sa s vizuálnymi zmenami; opravy 338, 342 a '
                     '351 menia načítanie a obsluhu zmien, nie vzhľad, takže je čistejšie mať ich hotové a '
                     'otestované skôr, ako sa začnú meniť riadky komentárov; majiteľ vzhľad Nástenky sám neupravuje, '
                     'takže čakanie stojí málo, a medzitým sa dá s majiteľom prebrať vzhľad poľa na text pri '
                     'odpovedi (R49).',
         kedy='Rozhodnuté 19. 11. 2026.',
         odpoved='Majiteľ 19. 11. 2026: (b): redizajn komentárov začne až po piatich najbližších krokoch (K40, K41, '
                 'K42, K43 a K31); nič sa nesilí. Pri redizajne sa musí vyriešiť aj pole na text pri odpovedi na '
                 'komentár (R52 ho nechával ako dnes); čo presne treba zmeniť, dodá majiteľ pri príprave vzhľadu, '
                 'ktorý sa podľa R49 najprv prebere. Majiteľ v komentároch objavil aj vzhľadové chyby, ktoré zámerne '
                 'nenahlásil, lebo ich redizajn zmení.',
         datum='19. 11. 2026'),
]
