# -*- coding: utf-8 -*-
"""Rozhodnutia od R66 (21. 11. 2026), po dvojitom mapovaní delenia `FeedPostCard.tsx` (K46): R66, R67 (23. 11. 2026, zmena R64), R68, R69 a R70 až R74 (24. 11. 2026).

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
                 'majiteľ podľa R49, pri nejasnosti sa pýta majiteľa). ZMENENÉ 24. 11. 2026 (R74 a R76): nález 368 a redizajn komentárov (K44) '
                 'píše agent; okno detailu (K58) píše kolega podľa karty.',
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
                 '`pc-viac-menej-okno-nizka-obrazovka-schvalene.png`. Rieši nálezy 357, 364 a 365 (karta K58, krok 1). '
                 'ZMENENÉ 24. 11. 2026 (R77): detaily majú 5 riadkov pri fotke, ponuke, portfóliu a náhľade zdieľaného obsahu (okno na '
                 'počítači s fotkou aj detail na mobile) a 10 riadkov len pri textovom príspevku na mobile; jednostĺpcové okno pod 1 024 px '
                 'a náhľady (3 riadky) ostávajú; ostatné z tejto odpovede platí.',
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
                 'v tomto bode neplatí. Rieši nález 367 (karta K58, krok 3). '
                 'ZMENENÉ 24. 11. 2026 (R77): text voľného príspevku len s textom ostáva celý, no repost textového príspevku už nemá '
                 'texty celé: text zdieľajúceho má 10 riadkov a pôvodný text 5 (s „Viac“); ostatné z tejto odpovede platí.',
         datum='24. 11. 2026'),
    dict(id='R74', tema='Nález 368 (označení používatelia v okne s fotkou): vzhľad schválený, opraví ho agent po K58 (výnimka z R67)',
         otazka='Agent pri kontrole K58 zistil, že v okne detailu s fotkou a označenými používateľmi si blok so štítkami berie polovicu '
                'voľného miesta (štítky 20 px, ich blok 307 px, fotka 283 px pri výške obrazovky 800 px, pod štítkami prázdno). Oprava je '
                'jedna podmienka, no zmení vzhľad (fotka sa zväčší na 545 px pri 800 px a na 403 px pri 650 px), preto R49. Agent ukázal '
                'obrázok Dnes a Po. Kedy a kto? (a) Po K58 ako samostatná malá oprava; (b) v K58 ako ďalší krok; (c) nechať. Kód '
                'opraví (1) kolega podľa karty (R67), alebo (2) agent.',
         odporucanie='(a) po K58: K58 už mení rovnaký súbor (`FeedPostSharedBlock.tsx`) a okno len s textom, takže oprava ide '
                     'samostatne a po jej zlúčení. Kto ju urobí, je rozhodnutie majiteľa (R67 dáva kód redizajnu kolegovi).',
         kedy='Rozhodnuté 24. 11. 2026.',
         odpoved='Majiteľ 24. 11. 2026 po obrázku Dnes a Po (`navrhy/pc-okno-fotka-oznaceni-dnes-a-po-schvalene.png`): „Opravíme ho dobre '
                 'po K58. Budem chcieť, aby si ju potom opravil ty, ale po K58.“ Platí: (a) vzhľad je schválený (fotka sa zväčší, blok so '
                 'štítkami má prirodzenú výšku) a oprava ide samostatne až po zlúčení K58; opraví ju agent (2), nie kolega: výnimka z R67 '
                 'a z pravidla, že agent kód nepíše, kým majiteľ nepovie. Agent ju urobí v samostatnej očíslovanej vetve, keď majiteľ '
                 'po zlúčení K58 dá pokyn (nič nepripravuje vopred). K58 sa nemení: nález 368 do nej nepatrí. Rieši nález 368.',
         datum='24. 11. 2026'),
    dict(id='R75', tema='Pole na komentár a odpoveď na mobile (nález 261, skupina 7): jedno pole dole, krížik, riadok „Odpovedáš: Meno“, vždy nad klávesnicou',
         otazka='R52 nechal pole na komentár a odpoveď „zatiaľ ako dnes“ a R59 uložilo majiteľovi dodať, čo je s poľom pri odpovedi. '
                'Dnes je pole pri odpovedi samostatné pole pod komentárom v zozname (dva riadky, počítadlo, „Zrušiť“ a „Odpovedať“) a '
                'scrolluje sa so zoznamom; hlavné pole na nový komentár je jednoriadkové s ikonou odoslania (`compactComposer`) a stojí '
                'mimo zoznamu (v detaile na mobile aj v paneli nad fotkou). Majiteľ 24. 11. 2026 opísal, aké to má byť (len mobil): '
                'jedno pole dole slúži na komentár aj na odpoveď, v režime odpovede je vpravo vedľa poľa krížik a pole je vždy '
                'viditeľné dole, pri klávesnici nad ňou, a nescrolluje sa; to isté v komentároch pri fotke. Agent ukázal obrázky '
                '(detail príspevku a panel nad fotkou, tri stavy) a položil podrobnosti: (a) čo s rozpísaným komentárom po ťuknutí na '
                '„Odpovedať“; (b) či má pole ukázať, komu sa odpovedá; (c) či sa po odoslaní odpovede zoznam posunie na novú odpoveď; '
                '(d) čo s textom odpovede pri prepnutí na iný komentár.',
         odporucanie='(a) koncept komentára sa zachová a po krížiku sa vráti (komentár a odpoveď majú každý svoj text); (b) áno, malý riadok '
                     '„Odpovedáš: Meno“, lebo zoznam sa dá posúvať a komentár, na ktorý sa odpovedá, môže zmiznúť z obrazovky; (c) áno; (d) '
                     'text odpovede ostane, mení sa len cieľ (dnes sa text pri prepnutí maže).',
         kedy='Rozhodnuté 24. 11. 2026.',
         odpoved='Majiteľ 24. 11. 2026: (a) a (b) „oboje podľa tvojho odporúčania“, (c) „podľa odporúčaní“, (d) „súhlasím s '
                 'odporúčaním“; obrázky `navrhy/mobil-pole-komentar-odpoved-detail-schvalene.png` a '
                 '`navrhy/mobil-pole-komentar-odpoved-foto-schvalene.png` „áno sedia, schvaľujem“. Platí: (1) len mobil (pod 1 024 px); '
                 'na počítači ostáva pole pri odpovedi ako dnes. (2) Jedno pole dole (jednoriadkové s ikonou odoslania v poli ako dnes '
                 '`compactComposer`) slúži na komentár aj na odpoveď: po ťuknutí na „Odpovedať“ sa jeho text zmení na „Napíš '
                 'odpoveď...“, nad poľom je riadok „Odpovedáš: Meno“, vpravo vedľa poľa je krížik a „Odpovedať“ pri komentári, na ktorý '
                 'sa odpovedá, sa zafarbí fialovo; pole pod komentárom sa na mobile ruší. (3) Rozpísaný komentár sa nestratí (dva '
                 'oddelené texty); krížik aj odoslanie odpovede vrátia pole na komentár. (4) Po odoslaní odpovede sa zoznam posunie na '
                 'novú odpoveď; pri prepnutí na iný komentár text odpovede ostane. (5) Pole je vždy dole a mimo zoznamu; pri otvorenej '
                 'klávesnici stojí tesne nad ňou (výška obrazovky podľa viditeľnej plochy, rovnako ako v chate) a nedá sa odscrollovať; '
                 'rovnako v paneli komentárov nad fotkou. (6) Automatický posun detailu na komentáre (fotka alebo náhľad zdieľaného '
                 'obsahu a aspoň tri komentáre, `feedMobileDetailAutoScroll.ts`) a posun na nový komentár po odoslaní (K40) platia dnes '
                 'a ostávajú; nesmú sa pokaziť. Staršie prianie skupiny 6 (komentárová textarea vyššia a väčšia, neprilepená na spodok) '
                 'R75 nerieši (pole ostáva jednoriadkové ako dnes); ostáva v skupine 6. Zodpovedá otázku R59 o poli pri odpovedi a mení '
                 'R52 len v bode „pole na komentár zatiaľ ostáva ako dnes“. Rieši nález 261 (skupina 7, K44) a súvisí s nálezmi 369 a '
                 '370. '
                 'REALIZOVANÉ 25. 11. 2026 (vetva 206, PR #330, zlúčené 25. 11. 2026 o 14:28 UTC, kolo 3b podľa R79): body (1) až '
                 '(4) urobené podľa schválených obrázkov (jedno pole `FeedCommentMobileComposer`, riadok „Odpovedáš: Meno“, '
                 'krížik, fialové „Odpovedať“, dva oddelené texty, posun na novú odpoveď), bod (5) pripnutím vrstvy na viditeľnú '
                 'plochu nad klávesnicou a poistkou proti gumovému efektu, bod (6) sa nedotkol. RUČNÝ TEST MAJITEĽA (25. 11. 2026, '
                 'iPhone) neprešiel na 100 %: majiteľ nahlásil tri chyby, všetky v paneli komentárov nad otvorenou fotkou (pole je '
                 'pri klávesnici príliš vysoko: 375; hýbe sa fotka za panelom: 376; pod panelom je vidieť Nástenku: 377), v '
                 'detaile príspevku sa podľa neho neprejavila žiadna. Bod (5) sa teda v paneli nad fotkou nepodaril; oprava je urobená '
                 'v kole 3c (R79; vetva 208, čaká na zlúčenie (PR #333) a ručný test majiteľa na iPhone).',
         datum='24. 11. 2026'),
    dict(id='R76', tema='Redizajn komentárov (K44): kód píše agent, nie kolega (výnimka z R67)',
         otazka='R67 (23. 11. 2026) určilo, že kód redizajnu píše kolega z presnej karty agenta a agent kontroluje; možnosť, že kód '
                'píše aj kontroluje agent, agent v R67 neodporúčal (autor a kontrolór by bol ten istý). R74 (24. 11. 2026) urobilo '
                'výnimku pre nález 368. Majiteľ po schválení poľa na komentár a odpoveď (R75) určil, že redizajn komentárov má robiť '
                'tiež agent.',
         odporucanie='Možné, ak sa kontrola druhou reláciou nahradí inými poistkami: poistky z R64 ostávajú (testy v nových súboroch podľa '
                     'R27, mutačné kontroly v kópii mimo repozitára, kontrola PR botmi CodeRabbit a Codex a CI, kontrola rozloženia od '
                     'Codexa po nasadení, ručný test majiteľa; PR otvára a zlučuje len majiteľ); navyše agent odporúča, aby diff pred '
                     'zlúčením prečítal aj kolega (nezávislé oči). Jeden človek v kóde naraz: kedy agent vetvu nahrá, sa dohodne s '
                     'majiteľom.',
         kedy='Rozhodnuté 24. 11. 2026.',
         odpoved='Majiteľ 24. 11. 2026 po schválení obrázkov poľa: „áno sedia, schvaľujem a chcem, aby si tento redizajn tiež robil ty, '
                 'okej?“ Platí: (a) kód redizajnu komentárov (K44: plochý vzhľad komentárov R52, pole na komentár a odpoveď na mobile '
                 'R75, nálezy 369 a 370) píše agent v samostatnej očíslovanej vetve, kolega ho nerobí; mení R67 len pre K44 (okno '
                 'detailu K58 píše kolega podľa karty, nález 368 píše agent podľa R74). (b) Poistky podľa R64 (poznámka z 20. 11. 2026) '
                 'ostávajú: testy v nových súboroch (R27), mutačné kontroly v kópii mimo repozitára, kontrola PR botmi (CodeRabbit, '
                 'Codex) a CI, kontrola rozloženia od Codexa po nasadení, ručný test majiteľa; PR otvára a zlučuje len majiteľ. (c) '
                 'Rozsah je redizajn komentárov (K44); tagy (359, skupina 8) a ostatné mobilné doladenia (skupina 6) sa rozhodnú '
                 'osobitne. Rieši nález 261 (skupina 7).',
         datum='24. 11. 2026'),
    dict(id='R77', tema='Počty riadkov „Viac“ v detaile príspevku po ručnom teste K58 (zmena R71)',
         otazka='Majiteľ po ručnom teste K58 (24. 11. 2026): 10 riadkov je veľa. Chce: (1) pri otvorenom detaile s fotkou, portfóliom a '
                'ponukou „Viac“ od šiesteho riadku (5 riadkov); (2) na počítači pri prezdieľanom príspevku len s textom bez fotky: pri '
                'texte zdieľajúceho (majiteľ prezdieľaného príspevku) „Viac“ od jedenásteho riadku (10 riadkov), pri texte pôvodného '
                '(zdieľaného) príspevku „Viac“ od šiesteho riadku (5 riadkov). Dnes po K58 (z kódu): voľný príspevok s fotkou v okne 10 '
                'riadkov (`DETAIL_CAPTION_LINES`); text zdieľajúceho nad ponukou, portfóliom a repostom s fotkou v dvojstĺpcovom okne 5 '
                '(`SPLIT_SHARED_CAPTION_LINES`); text pôvodného príspevku v reposte v okne 3; repost len s textom v okne celý bez '
                '„Viac“ (R73); voľný príspevok len s textom v okne celý bez „Viac“ (R73); detail na mobile 10; karta a fotoprehliadač '
                '3. Čo presne platí na miestach, ktoré majiteľ nespomenul? (a) Platí (1) aj pre detail príspevku na mobile (dnes 10)? '
                '(b) Repost s fotkou v okne: text zdieľajúceho 5 (ako dnes) a pôvodný 3 (dnes) alebo 5? (c) Voľný príspevok len s '
                'textom na počítači ostáva celý bez „Viac“ (R73)? (d) Karta (3) a fotoprehliadač (3) bez zmeny?',
         odporucanie='(a) áno: detail na mobile s fotkou, ponukou, portfóliom alebo náhľadom zdieľaného obsahu 5 riadkov, len text 10, aby '
                     'boli obe zariadenia rovnaké a mobil (menej miesta) nemal viac než počítač; (b) 5 a 5 (s fotkou 5); (c) áno, ostáva '
                     'celý (okno je na to postavené a posúva sa v stĺpci); (d) áno, bez zmeny. Zmena je malá (konštanty a podmienky vo '
                     '`FeedPostCardCaption.tsx`, `FeedPostSharedBlock.tsx`, `SharedContentPreviewCard.tsx` a '
                     '`FeedPostMobileDetailContent.tsx` a úprava testov, ktoré dnes čakajú 10 a 0) a odporúča sa ju urobiť v krátkej '
                     'samostatnej vetve, nie čakať na K44.',
         kedy='Rozhodnuté 24. 11. 2026.',
         odpoved='Majiteľ 24. 11. 2026: (a) áno, upraví sa aj detail na mobile: príspevok s fotkou, zdieľanou ponukou, portfóliom '
                 'alebo náhľadom zdieľaného obsahu má 5 riadkov („Viac“ od 6. riadku), obyčajný textový príspevok 10 riadkov („Viac“ '
                 'od 11.); (b) repost s fotkou v okne na počítači ostáva ako dnes: text zdieľajúceho 5 riadkov a pôvodný text 3 („Viac“ '
                 'od 4.); (c) voľný príspevok len s textom v okne na počítači ostáva celý bez „Viac“ (R73); prezdieľaný textový '
                 'príspevok bez fotky má text zdieľajúceho na 10 riadkoch („Viac“ od 11.) a pôvodný text na 5 („Viac“ od 6.); (d) karta '
                 'na Nástenke a prehliadač fotky ostávajú na 3 riadkoch („Viac“ od 4.); (e) zmena ide v samostatnej vetve 204 z '
                 'aktuálneho `main`. Z pôvodnej poznámky majiteľa z ručného testu vyplýva aj to, že voľný príspevok s fotkou v okne na '
                 'počítači má 5 riadkov (predtým 10). Mení R71 (detaily mali 10 riadkov) a R73 (repost textového príspevku už nie je '
                 'celý). Miesta, ktoré majiteľ nespomenul, agent nemenil: jednostĺpcové okno pod 1 024 px (okno zúžené po otvorení) '
                 'ostáva na 10 riadkoch ako po K58 a jeho testy ostali; text zdieľajúceho pri repostoch textového príspevku má na '
                 'mobile 5 riadkov, lebo ide o náhľad zdieľaného obsahu (podľa znenia odpovede (a)), na počítači v okne len s textom '
                 '10. Ak majiteľ pre niektoré z týchto miest chce iný počet, je to jedna podmienka. Rieši nález 373 (vetva 204).',
         datum='24. 11. 2026'),
    dict(id='R78', tema='Nález 343 (úchytka panela komentárov nad fotkou) ide vo vetve agenta s K44; K59 sa zatiaľ nepripravuje (od 25. 11. 2026 je pripravená, R80)',
         otazka='Nález 343 mal ísť ako dávka K33 kolegu (R55: tenká úchytka 40×6 px, súbor `FeedPhotoCommentsSheet.tsx`). K44 (R76) '
                'mení ten istý súbor (pole na komentár a odpoveď, zamknutie stránky a výška pri klávesnici v paneli nad fotkou). Kto ho '
                'urobí a kedy? (a) Kolega samostatne (dvaja menia ten istý súbor); (b) agent vo vetve K44 ako samostatný krok. Kolega '
                'po K58 nemá kartu: pripraviť K59 (361 a 362)?',
         odporucanie='(b): jeden autor jedného súboru, bez zrážky vetiev. K59 sa nepripravuje, kým majiteľ nepovie.',
         kedy='Rozhodnuté 24. 11. 2026.',
         odpoved='Majiteľ 24. 11. 2026: „áno 343 urob v mojej vetve a K59 nemusíš ešte chystať“. Platí: (a) nález 343 (úchytka 40×6 px '
                 'podľa R55 a obrázka `navrhy/mobil-uchytka.png`) robí agent vo vetve K44 ako samostatný krok; dávka K33 zaniká; (b) K59 '
                 '(361 a 362) sa zatiaľ nepripravuje a kolegovi sa zatiaľ nezadáva nič ďalšie. Nález 343 je hotový: urobený vo vetve 205 (kolo 3a podľa R79), '
                 'PR #329, zlúčené 25. 11. 2026. '
                 'K59 (361 a 362) je od 25. 11. 2026 pripravená na pokyn majiteľa (R80; `karty/K59.md`).',
         datum='24. 11. 2026'),
    dict(id='R79', tema='Redizajn komentárov (K44) ide v dvoch kolách: 3a plochý vzhľad s nálezmi 343 a 369 (vetva 205), 3b pole na '
                 'komentár a odpoveď na mobile s nálezom 370 až po ručnom teste kola 3a',
         otazka='K44 (R76) obsahuje dve rôzne práce. (1) Plochý vzhľad komentárov podľa R52: zmena tried a rozloženia v '
                '`FeedCommentItem.tsx`, `FeedCommentLikeButton.tsx`, `FeedPostComments.tsx` a dvoch kostrách načítania, na '
                'počítači, na mobile aj v paneli nad fotkou, spolu s malými nálezmi 343 (úchytka panela) a 369 (vodorovné '
                'posúvanie detailu s fotkou). (2) Pole na komentár a odpoveď na mobile podľa R75: zmena správania (jedno pole pre '
                'komentár aj odpoveď, riadok „Odpovedáš: Meno“, koncept, posun na novú odpoveď, pole nad klávesnicou) a nález 370 '
                '(pole sa na iPhone hýbe; príčina nepotvrdená). Urobiť všetko naraz, alebo v dvoch kolách? Majiteľ sa pýtal, či '
                'delenie zníži riziko chýb, a dodal, že mu dlhé testovanie nevadí.',
         odporucanie='V dvoch kolách. Kolo 3a mení len vzhľad (triedy a rozloženie) a dá sa overiť meraním v prehliadači proti '
                      'schváleným obrázkom aj testami tried. Kolo 3b mení správanie a stav poľa, príčinu 370 nepozná a bez ručného '
                      'testu majiteľa na iPhone sa overiť nedá. V jednej vetve by chyba v správaní poľa zablokovala aj hotový vzhľad a '
                      'pri chybe v ručnom teste by nebolo jasné, ktorá časť ju spôsobila.',
         kedy='Rozhodnuté 25. 11. 2026.',
         odpoved='Majiteľ 25. 11. 2026: „Jasne začni. Dávaj si pozor na chyby“ (po odporúčaní rozdeliť). Platí: (a) kolo 3a (vetva '
                 '205): plochý vzhľad komentárov podľa R52 na počítači, na mobile aj v paneli nad fotkou, nález 343 (úchytka 40×6 '
                 'px, R55 a R78) a nález 369 (vodorovné posúvanie detailu s fotkou); (b) kolo 3b: pole na komentár a odpoveď na '
                 'mobile podľa R75 a nález 370 sa začnú až po ručnom teste majiteľa po kole 3a (nález 370 si vyžaduje test na '
                 'iPhone); (c) ďalšie kolá, tagy (372, 359, 368 a skupina 8 v 261; najprv návrh vzhľadu, R49) a nález 371, sa '
                 'nezačínajú, kým majiteľ nedá pokyn. '
                 'KOLO 3a je hotové: PR #329, zlúčené 25. 11. 2026, ručný test majiteľa prešiel na 100 %, CodeRabbit bez nálezov. '
                 'KOLO 3b (pole na komentár a odpoveď na mobile podľa R75 a nález 370) je urobené po pokyne majiteľa „Pusť sa do '
                 'kola 3b“ vo vetve 206: PR #330, zlúčené 25. 11. 2026 o 14:28 UTC; CodeRabbit dvakrát (päť pripomienok stupňa '
                 'Minor, všetky opravené vo vetve), CI zelené. RUČNÝ TEST MAJITEĽA (25. 11. 2026, iPhone) neprešiel na 100 %: v '
                 'detaile príspevku je všetko v poriadku, v paneli komentárov nad otvorenou fotkou sú tri chyby (nálezy 375, 376 a '
                 '377). KOLO 3c: po zlúčení vetvy 207 (PR #331, 25. 11. 2026) dal majiteľ pokyn pustiť sa do práce; oprava 375 až 377 je '
                 'urobená vo vetve 208 (píše agent, R76) a čaká na zlúčenie (PR #333) a ručný test majiteľa na iPhone; súbežne s ňou ide karta K59 '
                 'kolegu (R80). Nález 370 sa zatvorí po úspešnom teste panela.',
         datum='25. 11. 2026'),
    dict(id='R80', tema='Súbežná práca agenta a kolegu: výnimka z pravidla „v kóde pracuje len jeden“ pre kolo 3c agenta a kartu K59 '
                 'kolegu',
         otazka='Dohoda z 5. 11. 2026 (README, „Postup s kolegom“, upravená 6., 7. a 21. 11. 2026): v kóde pracuje vždy len jeden '
                '(agent, kolega alebo Codex) a kolegovi ide vždy len jedna karta; agent bez pokynu majiteľa nič nepripravuje '
                'dopredu. Majiteľ po ručnom teste kola 3b (25. 11. 2026; tri chyby v paneli komentárov nad fotkou, nálezy 375 až '
                '377) požiadal, aby agent pripravil kolegovi prácu, ktorá sa neprekrýva s prácou agenta, lebo chce, aby agent už '
                'teraz naplánoval aj svoj ďalší krok. Smú teda agent a kolega teraz pracovať súčasne?',
         odporucanie='Áno, tentoraz a len pre dve práce, ktoré nemenia tie isté implementačné súbory: (1) kolo 3c agenta (oprava 375 '
                     'až 377: `ImageLightbox.tsx`, `useFeedKeyboardViewport.ts`, `FeedPhotoViewer.tsx`, `FeedPhotoCommentsSheet.tsx`, '
                     '`useFeedOverscrollLock.ts`, prípadne nové súbory a testy k nim) a (2) karta K59 kolegu (361 a 362: '
                     '`FeedPostCardHeader.tsx`, `SharedContentPreviewCard.tsx`, `sharedContentCard.ts`, `FeedPostSharedBlock.tsx`, '
                     '`FeedPostMobileDetailContent.tsx` a nové testy). Zákaz prekrytia platí pre implementačné súbory '
                     '(`frontend/src/**` a ich testy). Spoločná dokumentácia: (a) zoznam (`ZOZNAM.md`, `stav.py` a ostatné zdroje v '
                     '`docs/zoznam-nalezov`) píše len agent a kolega ho nemení, takže tam k prekrytiu nedôjde; agent začne kolo 3c z '
                     'čerstvého `main` po zlúčení vetvy 207 a `ZOZNAM.md` prebuduje (`build.py`) vo svojej vetve; (b) manuál ručných '
                     'testov (`sablony/dymovy_test.md`) je spoločný, no každý upravuje inú časť: kolega len odrážky uvedené v karte '
                     'K59 (zdieľaný obsah, hlavička karty a nová odrážka na konci kroku 9), agent odrážky o poli na komentár, paneli '
                     'komentárov a ťahu prstom; ten, komu sa vetva zlúči neskôr, si zlúči `main`, v manuáli ponechá obe úpravy a '
                     'zopakuje `build.py --check`. Vetvy sú oddelené a každý si pred začiatkom aj pred odoslaním stiahne aktuálny '
                     '`main`; ak by sa niektorý implementačný súbor ukázal ako spoločný, kolega sa zastaví a napíše stranu a agent nič '
                     'v jeho súboroch nemení. Ako trvalé pravidlo sa to nenavrhuje.',
         kedy='Rozhodnuté 25. 11. 2026 (pokyn majiteľa).',
         odpoved='Majiteľ 25. 11. 2026 (po ručnom teste kola 3b): pripraviť kolegovi prácu, ktorá sa neprekrýva s prácou agenta, a '
                 'agent si má aj teraz naplánovať ďalší krok; „ak rozumieš, pusti sa do práce“. Platí: (a) K59 (nálezy 361 a 362; '
                 '`karty/K59.md`) je pripravená (otázka R78 (b) o K59 je tým splnená) a majiteľ ju odovzdal kolegovi; (b) agent mal '
                 'naplánované kolo 3c (oprava 375 až 377, vetva 208) a kód nezačal, kým majiteľ nedal pokyn; ten dal po zlúčení vetvy 207 '
                 '(PR #331) a kolo 3c je urobené (čaká na zlúčenie (PR #333) a ručný test); (c) implementačné '
                 'súbory oboch prác sa neprekrývajú (zoznam v odporúčaní a v karte), čo je podmienka súbežnej práce; spoločný je '
                 'len manuál ručných testov (každý upravuje iné odrážky) a zoznam píše len agent (podrobnosti v odporúčaní; '
                 'doplnené 25. 11. 2026 po kontrole CodeRabbitu na PR #331); (d) výnimka platí len pre túto dvojicu prác: majiteľ '
                 '25. 11. 2026 po odovzdaní K59 potvrdil, že súbežná práca bola výnimka len na teraz a ďalej neplatí; po tejto '
                 'dvojici prác pracuje v kóde opäť len jeden, kým majiteľ nepovie inak.',
         datum='25. 11. 2026'),
    dict(id='R81', tema='Po každej kontrole CodeRabbitu s pripomienkami agent odporučí, či treba ďalšiu kontrolu',
         otazka='CodeRabbit sa spúšťa na poslednom commite PR a plán dovoľuje jednu kontrolu za hodinu (README, krok „PR a '
                 'boty“). Majiteľ sa po kontrole vetvy 207 (PR #331, 25. 11. 2026) pýtal, či treba ďalšiu kontrolu, a požiadal, '
                 'aby mu agent po každej kontrole s nálezmi povedal, či ďalšia kontrola treba, podľa náročnosti chyby. Podľa čoho '
                 'sa to rozhodne?',
         odporucanie='Po každej kontrole CodeRabbitu s pripomienkami agent v správe napíše riadok „Ďalšia kontrola: netreba“, '
                     '„odporúčam“ alebo „treba“ a dôvod jednou vetou. NETREBA: pripomienky stupňa Minor alebo nit len v dokumentácii, '
                     'komentároch alebo texte, bez zmeny správania, a CI je zelené. ODPORÚČAM: oprava v logike kódu alebo testu, '
                     'pripomienka stupňa Major alebo oprava vo viacerých súboroch (jedna ďalšia kontrola, zlúči sa až po nej). TREBA: '
                     'bezpečnosť, dáta, backend a migrácie, zmena rozhrania alebo správania, stupeň Critical. Kontrolu spúšťa majiteľ '
                     'komentárom `@coderabbitai full review` (limit je jedna za hodinu); odporúčanie agenta je rada, rozhoduje '
                     'majiteľ. Pravidlo sa zapisuje do README (krok „PR a boty“); do `AGENTS.md` ho agent dá, len ak majiteľ povie.',
         kedy='Rozhodnuté 25. 11. 2026 (pokyn majiteľa).',
         odpoved='Majiteľ 25. 11. 2026: „Ocenil by som keby si mi za každým keď sa nájdu nejaké nálezy na rabbit odporucoval že či '
                 'treba ďalšiu kontrolu podľa náročnosti chyby dobre?“ Stupnicu (netreba, odporúčam, treba) navrhol agent v '
                 'odpovedi a majiteľ na ňu odpovedal „Okej“ (v správe, v ktorej dal pokyn na kolo 3c). Platí: (a) agent napíše '
                 'riadok „Ďalšia kontrola“ po každom kole pripomienok CodeRabbitu; (b) stupnica je v odporúčaní a v README (krok '
                 '„PR a boty“), ak chce majiteľ iné hranice, upraví ich; (c) ďalšie kontroly spúšťa len majiteľ.',
         datum='25. 11. 2026'),
]
