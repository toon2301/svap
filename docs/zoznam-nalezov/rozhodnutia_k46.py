# -*- coding: utf-8 -*-
"""Rozhodnutia od R66 (21. 11. 2026), po dvojitom mapovaní delenia `FeedPostCard.tsx` (K46): R66, R67 (23. 11. 2026, zmena R64), R68, R69 a R70 až R73 (24. 11. 2026).

Samostatný súbor kvôli limitu 500 riadkov; `stav.py` ich pripája do `DECISIONS`. Po odpovedi majiteľa sa doplní `odpoved` a `datum`.
"""

DECISIONS_K46 = [
    dict(id='R66', tema='Delenie karty Nástenky: kedy opraviť 355 a 356 a kedy začne redizajn (333, 344, 261)',
         otazka='Po porovnaní dvoch nezávislých mapovaní K46 (kolega aj agent; `karty/K46_porovnanie.md`) je dohodnutý '
                'postup: dve dávky ochrany bez zmeny kódu (K48 karta, K49 mobilný detail), päť dávok presunov karty '
                '(K50 až K54), K55 (mobilný detail a zmazanie dočasných odtlačkov a sond) a K56. Mapovania našli dve '
                'nízke chyby: 355 (okno zdieľania ukáže po úprave vlastného príspevku starý text) a 356 (obnova feedu '
                'počas prebiehajúceho lajku nechá mobilný detail a prehliadač fotky so starým lajkom). Kedy ich opraviť '
                'a kedy začne redizajn (344 a 261)? (a) Opravy v samostatnej malej dávke K56 po poslednom presune '
                '(v malých súboroch a s vlastnými testami), redizajn začne po K56. (b) Opravy ako v (a), no redizajn '
                'začne už po K54 (karta rozdelená), kým kolega robí K55 a K56. (c) Opravy sa nerobia osobitne, agent '
                'ich opraví v rámci redizajnu. (d) Opravy hneď po K48 v pôvodných súboroch: vyžaduje jednorazovú '
                'výnimku z pravidla 500 riadkov pre `FeedPostCard.tsx`.',
         odporucanie='(a). (1) Presuny ostanú čisté (opravy sa s nimi nemiešajú), takže ak sa po niektorej dávke '
                     'niečo zmení, vieme, že to nespôsobila oprava. (2) Po delení sú obe opravy v malých súboroch '
                     '(okno zdieľania vo vrstvách karty, efekty v hooku), takže pravidlo 500 riadkov sa neobchádza. '
                     '(3) Redizajn dostane úplne rozdelenú kartu aj mobilný detail a opravené chyby; pri (b) by sa '
                     'zmeny agenta prekrývali s K55 (duplicity karty a mobilného detailu, mobilné doladenia 261/6). '
                     '(4) Odklad je krátky: K56 je malá dávka (asi pol dňa). (c) nechá dve známe chyby dlhšie a '
                     'zväčší redizajn; (d) sa neodporúča: R23 výnimku neudeľuje a oprava 356 je práve v efektoch, '
                     'ktoré najrizikovejšia dávka K54 presúva.',
         kedy='Rozhodnuté 21. 11. 2026.',
         odpoved='Majiteľ 21. 11. 2026: (a) podľa odporúčania: opravy 355 a 356 idú v samostatnej malej dávke K56 '
                 'po poslednom presune a redizajn (344 a 261) začne až po nej. Navyše majiteľ určil tempo: ide sa '
                 'postupne, jedna vec naraz (výslovne: toto treba rešpektovať). Kolegovi pošle prácu (kartu K48) '
                 'až po zlúčení vetvy 192 (PR #305) a agent zatiaľ nič nemapuje ani nepripravuje (ani rekapituláciu '
                 'a vizuálny návrh redizajnu, ani ďalšie karty), kým majiteľ nepovie. Agent z toho vyvodil, že '
                 'karta K49 ide kolegovi až po zlúčení K48 (majiteľ to môže zmeniť). Testy v K48 a K49 sa píšu '
                 'tak, aby nezachytávali dnešné chybné správanie nálezov 355 a 356.',
         datum='21. 11. 2026'),
    dict(id='R67', tema='Redizajn Nástenky: kto píše kód a ako sa zaistí, že vyjde presne podľa dohody (zmena R64)',
         otazka='Po dokončení delenia a opráv (K56) sa majiteľ opýtal, či agent vie kolegovi zadať redizajn tak, aby ho '
                'kolega urobil presne podľa dohody. R64 (20. 11. 2026) určilo, že redizajn komentárov (261) a okna '
                'príspevkov na počítači (344) mapuje a implementuje agent. Má sa to zmeniť? (a) Kód píše kolega z presnej '
                'karty agenta (schválený obrázok z `navrhy/`, tabuľka presných hodnôt, zoznam toho, čo sa nesmie zmeniť, '
                'malé časti), agent po každej časti kontroluje výsledok voči odsúhlasenému vzhľadu a majiteľ testuje ručne. '
                '(b) Ostáva R64: kód píše agent, kontroluje kolega. (c) Kód píše aj kontroluje agent (neodporúča sa).',
         odporucanie='(a). (1) Autor kódu a kontrolór sú dve rôzne relácie, čo je poistka, ktorá sa pri K50 až K56 '
                     'osvedčila (kolega píše, agent kontroluje z GitHubu a v kópii mimo repozitára). (2) Kolega túto prácu '
                     'robí podľa kariet a agent medzitým pripravuje ďalšiu kartu. (3) Presnosť stojí na zápise: každá karta '
                     'nesie odsúhlasený obrázok a tabuľku hodnôt a pri nejasnosti sa kolega zastaví a pýta; čo sa dohodne '
                     'len slovom, kolega vedieť nemôže. (4) Riziko: drobnosti (rozdiel 1 až 2 px, tmavý režim, správanie na '
                     'iPhone) neodhalia samotné testy, preto malé časti, porovnanie agenta v prehliadači (kópia mimo '
                     'repozitára, vymyslené údaje, šírky iPhonu a počítača, svetlý aj tmavý režim) a ručný test majiteľa '
                     'po každej časti.',
         kedy='Rozhodnuté 23. 11. 2026.',
         odpoved='Majiteľ 23. 11. 2026: podľa odporúčania (a): agent podá zadanie tak, aby kolega urobil všetko presne '
                 'tak, ako sa dohodne; kód redizajnu teda píše kolega. Postup, ktorý majiteľ určil: najprv agent '
                 'aktualizuje zoznam a zapíše túto zmenu, potom sa dohodnú a doklepnú veci, ktoré treba doriešiť, a potom '
                 'agent spraví krátku rekapituláciu, aby si bol majiteľ na 100 % istý, že výsledok bude vyzerať tak, ako '
                 'chce. Všetko ostatné z R64 platí (rekapitulácia a vizuál s odporúčaním od agenta, vzhľad schvaľuje '
                 'majiteľ podľa R49, pri nejasnosti sa pýta majiteľa).',
         datum='23. 11. 2026'),
    dict(id='R68', tema='Okno detailu príspevku na počítači (344): plocha fotky karty ponuky a portfólia bez fotky a pri nedostatku miesta',
         otazka='R53 hovorí, že karta ponuky a portfólia vyplní zvyšok ľavého stĺpca okna. Prototyp v prehliadači (obrázky '
                'z 23. 11. 2026) ukázal dve podrobnosti, ktoré R53 nerozhoduje. (1) Čo s plochou karty, keď fotka chýba '
                '(sivá náhrada „Bez fotografie“ pri ponuke, „Bez titulnej fotky“ pri portfóliu)? (a) Natiahne sa aj '
                'náhrada, takže okno vyzerá rovnako s fotkou aj bez nej. (b) Náhrada ostane 256 px a pod kartou je prázdne '
                'miesto až po riadok s lajkom. (2) Čo sa stane, keď sa dlhý text zdieľajúceho a karta nezmestia (nízka '
                'obrazovka, napríklad 650 px)? (a) Plocha fotky sa nezmenší pod dnešných 256 px a posúva sa ľavý stĺpec '
                '(názov a cena karty sú pod okrajom). (b) Plocha sa zmenší, najmenej na 128 px (ako médiová plocha '
                'príspevku s fotkou), a až potom sa posúva ľavý stĺpec.',
         odporucanie='(1a) a (2b). (1a): jedno pravidlo pre fotku aj náhradu; (1b) je pokojnejšie na pohľad, no okno by '
                     'vyzeralo inak s fotkou a bez nej a plocha by mala dve pravidlá. (2b): agent pôvodne odporúčal (2a), '
                     'no po vykreslení obrázkov zo skutočného kódu sa ukázalo, že (2a) na malom notebooku (výška 650 px) '
                     'schová názov a cenu ponuky pod okraj a treba ich hľadať posúvaním, čo je horšie než menšia plocha; '
                     '(2b) sa správa ako fotka pri príspevku s fotkou (minimum 128 px); minimum sa preto zmenilo zo 160 na '
                     '128 px.',
         kedy='Rozhodnuté 23. 11. 2026.',
         odpoved='Majiteľ 23. 11. 2026: podľa odporúčaní agenta (po štyroch obrázkoch s variantmi A a B, vrátane zmeny '
                 'odporúčania k bodu 2): (1a) natiahne sa aj náhrada; (2b) plocha sa zmenší najmenej na 128 px a až potom '
                 'sa posúva ľavý stĺpec. Schválený vzhľad je v karte K57 (`navrhy/pc-okno-ponuka-portfolio-schvalene.png`, '
                 '`pc-okno-text-uzke-schvalene.png` a `pc-okno-male-obrazovky-schvalene.png`). Náhrada pri portfóliu je dnes '
                 'iná než pri ponuke (nález 259); jej zjednotenie nie je súčasťou tohto kroku.',
         datum='23. 11. 2026'),
    dict(id='R69', tema='Okno detailu príspevku len s textom na počítači (344): komentáre pri štyroch a viac komentároch (nález 363) a „Viac“ pod 800 px (nález 364)',
         otazka='Obrázky agenta z 23. 11. 2026 (text s 15 riadkami, 14 komentárov, výšky obrazovky 800 a 950 px) ukázali dve veci. '
                '(1) V jednostĺpcovom okne (príspevok len s textom, repost textového príspevku) sa pri štyroch a viac '
                'komentároch zoznam komentárov neposúva, pevný blok sa zmáčkne a pole „Napíš komentár“ vypadne pod okno '
                '(nález 363; existuje už dnes). Kedy ho opraviť? (a) Ako krok 4 dávky K57 (okno detailu na počítači). (b) '
                'Samostatne po K57 (dávka K58). (2) Rozbalený dlhý text má strop štvrtinu výšky obrazovky, takže pod 800 px '
                'výšky ukáže menej riadkov než zbalený (text s 15 riadkami, zbalený / rozbalený: 650 px 10 / 8, 720 px 10 / 9, '
                '800 px 10 / 10, 950 px 10 / 12; nález 364). Čo s tým? (a) Nechať a zapísať ako nález, riešiť s redizajnom '
                'komentárov (R59). (b) Rozbalený rámik nikdy nižší než zbalený. (c) Zbalený text kratší (napríklad 6 riadkov). '
                '(d) Strop 40 % výšky obrazovky.',
         odporucanie='(1a) a (2a). (1a): oprava je v tom istom okne a v tých istých súboroch (`FeedPostDetailOverlay.tsx`) '
                     'ako zmena šírky okna len s textom v kroku 3, takže kolega ich dostane naraz a okno ide na jeden ručný '
                     'test; oprava má vlastný krok a commit, takže sa dá samostatne vrátiť. (2a): zmena vzhľadu zbaleného '
                     'alebo rozbaleného textu potrebuje návrh a schválenie (R49) a patrí k redizajnu komentárov (R59), kde sa '
                     'rozhodne o rovnováhe medzi textom a komentármi v malých oknách.',
         kedy='Rozhodnuté 23. 11. 2026.',
         odpoved='Majiteľ 23. 11. 2026: podľa odporúčaní agenta. (1a) Oprava komentárov v jednostĺpcovom okne ide ako krok 4 '
                 'dávky K57 (nález 363). (2a) Správanie „Viac“ pod 800 px sa nemení a zapisuje sa ako nález 364 (rieši sa '
                 's redizajnom komentárov, R59). Schválený vzhľad: `navrhy/pc-okno-dlhy-text-komentare-800-schvalene.png`, '
                 '`pc-okno-dlhy-text-komentare-950-schvalene.png` a `pc-okno-dlhy-text-dnes-a-navrh-800-schvalene.png`.',
         datum='23. 11. 2026'),
    dict(id='R70', tema='Vlastné vzhľadové úpravy majiteľa po K57: vetva `VU` a ako ich agent skontroluje',
         otazka='Po zlúčení K57 (okno detailu príspevku na počítači) chce majiteľ niektoré drobné vzhľadové veci, ktoré sa mu nepáčia, '
                'upraviť sám a hodiť ich do vlastnej vetvy `VU1` (ďalšie by boli `VU2` a tak ďalej). Vie ich agent z tej vetvy pozrieť, '
                'skontrolovať, či v nich nie je chyba, a podľa toho aktualizovať zoznam? Ako sa to má robiť, aby sa vetva majiteľa '
                'nemiešala s vetvami agenta a kolegu? (a) Majiteľ oznámi vetvu (názov alebo číslo PR) a čo chcel zmeniť; agent zmeny '
                'prečíta z GitHubu, skontroluje ich v kópii mimo repozitára a výsledok zapíše vo vlastnej očíslovanej vetve; do `VU` '
                'nikdy nepíše. (b) Agent chyby priamo opravuje vo vetve `VU`. (c) Majiteľ si vetvu kontroluje sám a agent ju nepozerá.',
         odporucanie='(a): vetva `VU` je vetva majiteľa, tak ako `K…` je vetva kolegu a `e2e/…` vetva Codexu, a agent do cudzej vetvy nepíše '
                     '(AGENTS.md). Kontrola je rovnaká ako pri dávke kolegu: GitHub (súbory, CI, boty, otvorené vlákna), `tsc`, ESLint a '
                     'Jest v kópii `main` s vetvou, a pri zmene rozmerov alebo farieb vykreslenie v Chromiu oproti schválenému vzhľadu. '
                     'Vzhľad, ktorý majiteľ zmení sám, je nový schválený vzhľad (R49), takže agent kontroluje len to, či zmena nerozbila '
                     'správanie, testy alebo iné miesta. Ak nájde chybu, napíše majiteľovi, čo a kde (číslo nálezu pridelí agent), a opravu '
                     'urobí majiteľ vo `VU` alebo pôjde ako dávka kolegu podľa jeho rozhodnutia. Zápis do zoznamu robí agent vo vlastnej '
                     'vetve.',
         kedy='Rozhodnuté 24. 11. 2026.',
         odpoved='Majiteľ 24. 11. 2026: po zlúčení K57 upraví niektoré vzhľadové veci, ktoré sa mu nepáčia (len vzhľadové a jednoduché), '
                 'sám a hodí ich do vetvy `VU1`; na odpoveď agenta, že vetvu po oznámení skontroluje a zoznam podľa toho aktualizuje, '
                 'odpovedal, že je to dohodnuté (možnosť a). Zároveň určil, že agent teraz len aktualizuje zoznam a kartu K58 '
                 'nepripravuje.',
         datum='24. 11. 2026'),
    dict(id='R71', tema='Text príspevku: jedno pravidlo pre „Viac“ a „Menej“ na všetkých miestach (nálezy 357, 364 a 365)',
         otazka='Majiteľ 24. 11. 2026: „Viac“ pri príspevku s viacerými riadkami textu pôsobí dosť divoko; chce to zjednotiť všade '
                '(Nástenka, detail príspevku, detail fotky, zdieľaný príspevok; počítač aj mobil). Agent zmeral dnešný stav v kópii '
                '`main` na piatich miestach: karta vo feede (3 riadky a „Viac“ len pri presahu, po rozbalení „Menej“), repost (text '
                'pôvodného príspevku orezaný na 4 riadky s trojbodkou, bez „Viac“; nález 357), detail príspevku na mobile (5 riadkov), '
                'okno detailu na počítači (10 riadkov; rozbalený strop štvrtina výšky obrazovky, takže pod 800 px ukáže menej než '
                'zbalený text; nález 364) a prehliadač fotky na mobile („Viac“ stále aj pri krátkom texte, 2 riadky, bez „Menej“). '
                'Ako to zjednotiť? (a) Jedno pravidlo: „Viac“ len keď text presahuje, „Menej“ vždy po rozbalení, rovnaké miesto a '
                'vzhľad (na fotke biele písmo); náhľady (karta, repost, prehliadač fotky) 3 riadky, detaily (okno na počítači, detail '
                'na mobile) 10 riadkov; rozbalený text s vlastným posunom v rámiku. (b) Nechať dnešný stav. (c) Zjednotiť len mobil.',
         odporucanie='(a). Komponent `FeedPostCaption.tsx` už rieši „Viac“ a „Menej“ na karte a v okne, takže zjednotenie je hlavne '
                     'o tom, aby ho použili aj repost a prehliadač fotky a aby sa miesta líšili len počtom riadkov podľa toho, či ide o '
                     'náhľad (3) alebo detail (10). Rozbalený strop v okne sa nesmie zmenšiť pod výšku zbaleného textu '
                     '(`max(25vh, 14rem)`), čím sa rieši aj nález 364. Je to zmena vzhľadu, preto návrh s obrázkami (R49).',
         kedy='Rozhodnuté 24. 11. 2026.',
         odpoved='Majiteľ 24. 11. 2026 po štyroch obrázkoch návrhu („Okej schvaľujem“): (a) podľa odporúčania. Platí: „Viac“ len '
                 'pri presahu a „Menej“ vždy; náhľady 3 riadky (karta, repost vrátane náhľadu v dialógu zdieľania, prehliadač fotky), '
                 'detaily 10 riadkov (okno na počítači aj detail na mobile; na mobile zmena z 5 riadkov); rozbalený text s vlastným '
                 'posunom: v jednostĺpcovom okne strop `max(25vh, 14rem)`, v dvojstĺpcovom ostáva 40 % výšky obrazovky, v prehliadači '
                 'fotky najviac 40 % na tmavom podklade. Schválený vzhľad: `navrhy/mobil-viac-menej-fotoprehliadac-schvalene.png`, '
                 '`mobil-viac-menej-detail-schvalene.png`, `viac-menej-repost-schvalene.png` a '
                 '`pc-viac-menej-okno-nizka-obrazovka-schvalene.png`. Rieši nálezy 357, 364 a 365 (karta K58, krok 1).',
         datum='24. 11. 2026'),
    dict(id='R72', tema='Okno detailu na počítači: ponuka, portfólio a repost s fotkou sa neposúvajú, ako fotka (nález 366)',
         otazka='Majiteľ 24. 11. 2026: pri rozbalenom texte nad ponukou alebo portfóliom v okne detailu vznikne posúvanie na karte a '
                'to nechce; chce, aby sa ponuka, portfólio aj fotka správali rovnako (zmenšujú sa, neposúvajú). Agent zmeral v '
                'Chromiu (kópia `main`, text s 15 riadkami): fotka sa zmenšuje (141 px pri výške obrazovky 600 px) a neposúva, ale '
                'ponuka a portfólio posúvajú blok (zbalený text 80 px pri 600 px a 32 px pri 650 px, rozbalený 120 px a 92 px; pri '
                '800 px nič) a repost s fotkou má fotku pevných 256 px a posúva sa o 247, 199, 133 a 57 px pri 600, 650, 720 a 800 px. '
                'Ako to urobiť? (a) Plocha karty (fotka alebo náhrada) sa zmenší najmenej na 128 px a ako prvé ustupuje text nad kartou '
                '(zbalený na 5 riadkov); rozbalený text vyplní zvyšok miesta a posúva sa len vo svojom rámčeku; to isté pri reposte '
                's fotkou (pružná plocha fotky, text zdieľajúceho aj pôvodný text ustupujú). (b) Nechať a len skrátiť text. (c) Karta '
                'sa pri nedostatku miesta posúva.',
         odporucanie='(a). Príspevok s fotkou sa už dnes správa takto; ponuka, portfólio a repost majú dostať rovnaké pravidlo. '
                     'Technicky musia byť texty a plocha fotky súrodenci v jednom stĺpci (rozbalený text v zanorenom bloku inak '
                     'neustúpi a posúva sa celý blok), preto sa pri reposte obal karty a rám „rozpustia“ (`display: contents`). '
                     'Posúvanie bloku ostane len ako poistka v krajných prípadoch.',
         kedy='Rozhodnuté 24. 11. 2026.',
         odpoved='Majiteľ 24. 11. 2026 po obrázku `navrhy/pc-okno-fotka-ponuka-portfolio-bez-posuvania-schvalene.png` („Áno '
                 'súhlasím“) a po obrázku reposta s fotkou `pc-okno-repost-s-fotkou-bez-posuvania-schvalene.png`: (a) podľa '
                 'odporúčania. Karta ponuky, portfólia a reposta s fotkou sa neposúva; plocha sa zmenší najmenej na 128 px a ako prvé '
                 'ustupuje text nad kartou (zbalený text zdieľajúceho 5 riadkov, pôvodný text reposta 3 riadky); rozbalený text vyplní '
                 'zvyšok miesta a posúva sa len vo svojom rámčeku. Posúvanie bloku ostáva len ako poistka v krajných prípadoch (dva '
                 'dlhé texty naraz a výška obrazovky pod 720 px; najviac 85 px pri 600 px). Mení rozhodnutie K57, že repost s fotkou sa '
                 'nemení (R68 sa týkalo len ponuky a portfólia). Rieši nález 366 (karta K58, krok 2).',
         datum='24. 11. 2026'),
    dict(id='R73', tema='Okno detailu na počítači: príspevok len s textom v dvoch stĺpcoch, komentáre vpravo (nález 367; mení R53 (b) a R63)',
         otazka='Majiteľ 24. 11. 2026: chce rozloženie okna aj pri príspevku len s textom (aj repost textového príspevku) ako pri '
                'fotke, ponuke a portfóliu, teda komentáre vpravo; chcel návrh vo všetkých situáciách (dlhý text, krátky text a '
                'podobne). Dnes (R53 (b) a R63, K57) má taký príspevok jednostĺpcové okno 576 px s komentármi pod príspevkom. Agent '
                'ukázal tri tabule s dvoma stĺpcami: bez komentárov, s troma a so štrnástimi, text s 2 až 28 riadkami, repost textu a '
                'nízku obrazovku (650 px). Rozhodnúť: (1) výška okna: (a) podľa obsahu (najmenej 20 rem = 320 px, najviac 95 % '
                'obrazovky), (b) vždy 95 % ako pri fotke; (2) krátky text (do 140 znakov bez zalomenia): (A3) väčšie písmo (20 px) a '
                'na stred ľavého stĺpca, (A1) bežné písmo hore hneď pod hlavičkou; (3) dlhý text: ukáže sa celý bez „Viac“ a '
                'posúva sa len on, keď sa nezmestí.',
         odporucanie='(1a), (A3) a (3). (1a): ľavý stĺpec nemá nič pružné, takže pevná výška by len zväčšila prázdnu plochu; (A3): '
                     'ľavý stĺpec pri krátkom texte nepôsobí prázdne; (3): ľavý stĺpec nemá s čím o miesto súperiť.',
         kedy='Rozhodnuté 24. 11. 2026.',
         odpoved='Majiteľ 24. 11. 2026: súhlasí so všetkým okrem (A3): chce písmo vždy rovnakej veľkosti bez ohľadu na počet znakov '
                 'a riadkov a text vždy zhora, hneď pod avatarom a menom. Platí teda (1a) výška podľa obsahu (najmenej 320 px, '
                 'najviac 95 % obrazovky; bez námietky majiteľa), (A1) bežné písmo hneď pod avatarom a menom pri každom texte a (3) '
                 'text sa ukáže celý bez „Viac“ a posúva sa len on vo svojom rámčeku, keď sa nezmestí. Okno je pri všetkých '
                 'príspevkoch na počítači (od 1 024 px) široké 864 px a dvojstĺpcové; pod 1 024 px a na mobile sa nič nemení (text '
                 'ostáva jednostĺpcový, 576 px). Schválený vzhľad: `navrhy/pc-okno-text-dva-stlpce-schvalene.png` a '
                 '`pc-okno-text-dva-stlpce-dlhsie-texty-schvalene.png`; väčšie písmo na stred sa zamietlo a obrázok s ním sa do '
                 'repozitára nedáva. Mení R53 (b) a R63 (úzke okno pre text) a obrázok `pc-okno-text-uzke-schvalene.png` z K57 '
                 'v tomto bode neplatí. Rieši nález 367 (karta K58, krok 3).',
         datum='24. 11. 2026'),
]
