# -*- coding: utf-8 -*-
"""Rozhodnutia R41 a ďalšie (od 15. 11. 2026): R41 (výnimka z pravidla 500 riadkov pre opravu 336, rozhodnuté 15. 11. 2026), R42 (opis
hlavného vypínača aj na počítači, rozhodnuté 16. 11. 2026), R43 (E2E scenár odznaku Žiadostí sa nerobí, rozhodnuté 16. 11. 2026) a R44
(E2E UI scenár kategórií a kontrola výzvy na push, rozhodnuté 16. 11. 2026), R45 až R48 (delenie `FeedPostComments.tsx`, rozhodnuté 16. 11. 2026), R49 (trvalé pravidlo: vzhľad sa najprv konzultuje s majiteľom, 16. 11. 2026) a R50 (poistka `--repeat-each` v staršom API scenári volieb, čaká na majiteľa).

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
                  'karte. Platí najmä pre frontend zoznamu lajkujúcich (262) a pre redizajn 261.',
         datum='16. 11. 2026'),
    dict(id='R50', tema='Poistka proti `--repeat-each` v staršom API scenári volieb (nález 340): súhlas na opravu',
         otazka='Codex zistil, že v Playwrighte 1.63 sa voľba `--repeat-each` nepremietne do `testInfo.project.repeatEach`, takže '
                 'starší `notification-preferences-test.ts` ju nezachytí a API scenár volieb by sa pri nesprávnom ručnom spustení '
                 'vykonal viackrát (v lokálnej syntetickej skúške 2x, štyri simulované PATCH). Predpísaný príkaz bez opakovania '
                 'medzeru nevyvolá. Dať Codexovi súhlas na samostatnú malú opravu poistky (len `frontend/e2e/**`)? (a) Áno, ako '
                 'samostatná malá vetva Codexa. (b) Nie, stačí pravidlo nespúšťať scenár s `--repeat-each`.',
         odporucanie='(a): zmena je malá a len v E2E; poistka chráni hlavný testovací účet pred nechceným opakovaným zápisom pri '
                      'nesprávnom spustení.',
         kedy='Pred ďalšou prácou Codexa na API scenári volieb.'),
]
