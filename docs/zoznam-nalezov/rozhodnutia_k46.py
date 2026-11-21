# -*- coding: utf-8 -*-
"""Rozhodnutia od R66 (21. 11. 2026), po dvojitom mapovaní delenia `FeedPostCard.tsx` (K46).

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
]
