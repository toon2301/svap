# -*- coding: utf-8 -*-
"""Rozhodnutia R13–R24: R13–R22 zo zoznamu majiteľa „Svaply — otvorené nálezy a rozpracovaná práca“ (Nástenka, PDF z 6. 11. 2026), R23
(súbory nad 500 riadkov pri redizajne Nástenky) a R24 (výnimka z pravidla 500 riadkov pre nález 271).

R13–R19 sú rozhodnutia, ktoré majiteľ vedome prijal počas práce na Nástenke a ktoré sa nemajú prehodnocovať bez nového zistenia
(majú `odpoved`). R20, R21 a R23 sú otázky, ktoré čakajú na odpoveď; R22 a R24 majiteľ rozhodol 6. 11. 2026.
Samostatný súbor kvôli limitu 500 riadkov; `stav.py` ich pripája do `DECISIONS`. Čísla rozhodnutí sa nikdy nepoužívajú znova.
"""

DATUM_PDF = 'pred 6. 11. 2026 (zoznam majiteľa)'
NEMENIT = 'Rozhodnuté majiteľom počas práce na Nástenke; neprehodnocovať bez nového zistenia.'

DECISIONS_NASTENKA = [
    dict(id='R13', tema='Radenie komentárov a odpovedí',
         otazka='Ako sa radia komentáre a odpovede a kedy sa načítajú staršie?', odporucanie=NEMENIT, kedy='—',
         odpoved='Komentáre a odpovede sa radia od najnovších; staršie odpovede sa donačítavajú automaticky pri scrolle.',
         datum=DATUM_PDF),
    dict(id='R14', tema='Späť po zdieľaní na mobile',
         otazka='Kam vedie Späť po zdieľaní na mobile?', odporucanie=NEMENIT, kedy='—',
         odpoved='Späť po zdieľaní ostáva na Nástenke (mobilný detail nemá vlastnú adresu ani históriu).',
         datum=DATUM_PDF),
    dict(id='R15', tema='Šípka Späť a Domov na profile',
         otazka='Kedy má profil šípku Späť a kam vedie Domov?', odporucanie=NEMENIT, kedy='—',
         odpoved='Šípka späť je len na cudzom profile. Vlastný profil ju nemá nikdy, ani keď bol otvorený z niečoho, čo appka vie sledovať '
                 'späť (napr. z karty vlastnej ponuky na Nástenke); namiesto šípky má skratku na Štatistiky. Časť zo zoznamu majiteľa '
                 '„Domov z vlastného profilu vždy vedie na čistú Nástenku od vrchu“ prekonala oprava 159 (PR #180): Domov vráti na '
                 'zapamätané miesto a druhý klik ide na vrch.',
         datum=DATUM_PDF),
    dict(id='R16', tema='Zvýraznenie nového príspevku po zdieľaní',
         otazka='Má sa nový príspevok po zdieľaní zvýrazniť?', odporucanie=NEMENIT, kedy='—',
         odpoved='Po úspešnom zdieľaní sa nový príspevok len doscrolluje do viewportu, bez zvýraznenia alebo žiary.',
         datum=DATUM_PDF),
    dict(id='R17', tema='`?tab=offers` v adrese profilu',
         otazka='Má sa `?tab=offers` z adresy odstraňovať pre predvolený tab?', odporucanie=NEMENIT, kedy='—',
         odpoved='Pre predvolený tab sa `?tab=offers` v adrese nepotláča: je to kozmetika, nie chyba (Next.js tento parameter krátko po '
                 'zápise ticho vráti späť bez neho; zdokumentované zvlášť, samo osebe neurgentné). Majiteľ 6. 11. 2026 potvrdil, že podľa '
                 'toho sa zatvárajú aj nálezy 12 a 121 (presakujúce `?tab=offers` v iných adresách).',
         datum=DATUM_PDF),
    dict(id='R18', tema='E2E testy proti produkcii',
         otazka='Proti čomu bežia Playwright testy?', odporucanie=NEMENIT, kedy='Prehodnotiť, keď appka bude mať reálnych používateľov (N4).',
         odpoved='Playwright testy bežia zámerne proti produkcii (Railway), nie lokálne; prehodnotiť, keď appka bude mať reálnych '
                 'používateľov (pozri N4).',
         datum=DATUM_PDF),
    dict(id='R19', tema='E2E testovací účet',
         otazka='Čí účet používajú E2E testy?', odporucanie=NEMENIT, kedy='—',
         odpoved='E2E testovací účet je vyhradený jednorazový účet, nie osobný profil majiteľa.',
         datum=DATUM_PDF),
    dict(id='R20', tema='Zoznam „kto lajkol“ mimo Nástenky (262)',
         otazka='Má sa zoznam lajkujúcich rozšíriť na ponuky, portfólio a profil a kto ho smie vidieť?',
         odporucanie='Zatiaľ nie. Ak sa to bude robiť, najprv ho vidí len vlastník obsahu (podobne ako počet lajkov) a verejný zoznam až '
                     'neskôr a len pri obsahu, ktorý je sám verejný; na Nástenke ostáva ako dnes.',
         kedy='Pred prácou na 262.'),
    dict(id='R21', tema='Zobrazenie Nástenky podľa krajiny (263)',
         otazka='Má krajina okrem poradia ovplyvniť aj to, čo sa na Nástenke zobrazí (filter, oddelené feedy)?',
         odporucanie='Nie pred štartom: pri malom počte používateľov by filter len zmenšil obsah. Nechať krajinu ako dnes (len radenie) '
                     'a vrátiť sa k tomu podľa spätnej väzby.',
         kedy='Pred prácou na 263.'),
    dict(id='R22', tema='Význam overovacieho odznaku (269)',
         otazka='Čo má odznak „overený účet“ znamenať a komu sa má ukazovať?',
         odporucanie='Agent odporúčal pred štartom odznak skryť alebo premenovať na „overený e-mail“, lebo ho dostane každý s overeným '
                     'e-mailom (`is_verified`); udeľovanie podľa kritérií (ručne administrátorom, alebo ako prémiová funkcia '
                     '`can_use_verified_badge`) by mohlo prísť až po štarte.',
         kedy='Rozhodnuté 6. 11. 2026.',
         odpoved='Majiteľ rozhodol, že odznak má znamenať potvrdený e-mail a že je to zámer aplikácie: používateľ ho získa tým, že '
                 'e-mail naozaj overí (odkaz z registrácie, alebo Nastavenia, záložka Účet). Odznak ostáva tak, ako je; nález 269 je '
                 'zatvorený. Overené v kóde: `VerifyEmailSection` v `AccountSettingsModule` posiela overovací e-mail a `is_verified` sa '
                 'nastaví až po potvrdení odkazu.',
         datum='6. 11. 2026'),
    dict(id='R23', tema='Vzhľadové úpravy Nástenky a súbory nad 500 riadkov (261)',
         otazka='Redizajn komentárov, tagov a mobilné úpravy Nástenky sa dotýkajú súborov nad 500 riadkov (`FeedPostComments.tsx` '
                '1 487, `FeedPostCard.tsx` 1 033, `FeedPostMobileDetail.tsx` 594). Najprv súbory rozdeliť (bez zmeny vzhľadu), alebo '
                'udeliť výnimku z pravidla 500 riadkov?',
         odporucanie='Najprv rozdeliť, po jednom súbore (začať `FeedPostComments.tsx`), každé delenie vo vlastnej vetve bez zmeny '
                     'vzhľadu a s manuálnym testom (aj zoznam majiteľa označuje delenie týchto súborov za rizikové). Redizajn potom '
                     'prebehne nad menšími súbormi s menším rizikom regresie. Výnimka je rýchlejšia, no mení veľký súbor naraz. '
                     'Ak vizuálnu stránku Nástenky upraví majiteľ sám, treba dohodnúť, či sa súbory delia pred jeho úpravami alebo po nich.',
         kedy='Pred prácou na 261 (vzhľadové veci sú pred nasadením).'),
    dict(id='R24', tema='Výnimka z pravidla 500 riadkov pre nález 271',
         otazka='Smie sa jednorazovo zmeniť jeden riadok v `hooks/useDashboardState.ts` (921 riadkov, nad limitom 500), aby sa opravil nález '
                '271 (po zmene typu účtu zmizne na mobile spodný panel)?',
         odporucanie='Áno, len pre ten jeden riadok a s novým testom. Bez výnimky šla len obchádzka v `DashboardLayout.tsx`, ktorá by panel '
                     'vrátila, ale aplikácia by ostala na profile s adresou „Typ účtu“ a príčina (prepnutie na profil s otvoreným pravým '
                     'panelom) by ostala.',
         kedy='Pred prácou na 271.',
         odpoved='Majiteľ výnimku schválil tým, že K7 s touto opravou poslal kolegovi. Použitá je raz: +1 −0 v `useDashboardState.ts` (teraz '
                 '922 riadkov), commit `4f28c539` (PR #235). Pravidlo 500 riadkov platí ďalej; ďalšia výnimka potrebuje nové rozhodnutie.',
         datum='6. 11. 2026'),
]
