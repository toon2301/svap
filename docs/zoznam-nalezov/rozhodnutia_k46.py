# -*- coding: utf-8 -*-
"""Rozhodnutia od R66 (21. 11. 2026), po dvojitom mapovaní delenia `FeedPostCard.tsx` (K46): R66, R67 (23. 11. 2026, zmena R64), R68 a R69.

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
]
