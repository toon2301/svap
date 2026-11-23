# -*- coding: utf-8 -*-
"""Rozhodnutia od R66 (21. 11. 2026), po dvojitom mapovaní delenia `FeedPostCard.tsx` (K46): R66 a R67 (23. 11. 2026, zmena R64).

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
]
