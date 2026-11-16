# -*- coding: utf-8 -*-
"""Rozhodnutia R41 a ďalšie (od 15. 11. 2026): R41 (výnimka z pravidla 500 riadkov pre opravu 336, rozhodnuté 15. 11. 2026), R42 (opis
hlavného vypínača aj na počítači, rozhodnuté 16. 11. 2026), R43 (E2E scenár odznaku Žiadostí sa nerobí, rozhodnuté 16. 11. 2026) a R44
(E2E UI scenár kategórií a kontrola výzvy na push, čaká na majiteľa).

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
         kedy='Pred ďalšou prácou Codexa na týchto scenároch.'),
]
