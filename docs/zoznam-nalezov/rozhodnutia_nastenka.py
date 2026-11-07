# -*- coding: utf-8 -*-
"""Rozhodnutia R13–R28: R13–R22 zo zoznamu majiteľa „Svaply — otvorené nálezy a rozpracovaná práca“ (Nástenka, PDF z 6. 11. 2026), R23
(súbory nad 500 riadkov pri redizajne Nástenky), R24 (výnimka z pravidla 500 riadkov pre nález 271), R25 (nález 275 je zámer
súkromného profilu), R26 (dve výnimky z pravidla 500 riadkov pre testové súbory z K8 a K9), R27 (platí pravidlo 500 riadkov aj
pre testy?) a R28 (vstupné animácie modulov na mobile).

R13–R19 sú rozhodnutia, ktoré majiteľ vedome prijal počas práce na Nástenke a ktoré sa nemajú prehodnocovať bez nového zistenia
(majú `odpoved`). R20, R21, R23, R27 a R28 sú otázky, ktoré čakajú na odpoveď; R22 a R24 majiteľ rozhodol 6. 11. 2026 a R25 a R26
7. 11. 2026.
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
    dict(id='R25', tema='Účet B nevidí účet A: súkromný profil (275)',
         otazka='Zatvoriť nález 275 (účet B nevidí účet A) ako zámer súkromného profilu, keď príčinou je `is_public = false` účtu A?',
         odporucanie='Áno: je to zámerné správanie aplikácie (súkromný profil sa nevyhľadáva a neukazuje), nie chyba v dátach ani '
                     'blokovanie. Samostatne zostáva nález 290 (text pri súkromnom profile pôsobí ako chyba).',
         kedy='Rozhodnuté 7. 11. 2026.',
         odpoved='Kolega v K8 (PR #237) zistil, že príčinou je súkromný profil účtu A (`is_public = false`); po prepnutí A na verejný ho B '
                 'našiel (potvrdil majiteľ) a návrh „zatvoriť ako zámer“ majiteľ poslal do zápisu zoznamu. Nález 275 je zatvorený a skupina '
                 'HNEĎ je prázdna. Účty A a B sú účty z E2E testov (`.env.e2e`).',
         datum='7. 11. 2026'),
    dict(id='R26', tema='Výnimky z pravidla 500 riadkov pre dva testové súbory (K8, K9)',
         otazka='Smie sa jednorazovo zmeniť `FeedReturnState.test.tsx` (572 riadkov, nad limitom 500) kvôli K8 a `FeedPostEditPhotos.test.tsx` '
                '(565 riadkov, nad limitom 500) kvôli K9? Codex to v oboch PR označil za porušenie `AGENTS.md` (P1).',
         odporucanie='Len pre tieto dve malé zmeny: dva riadky v mocku `AnimatePresence` (K8) a jeden nový test (K9). Delenie testových '
                     'súborov kvôli tomu nestojí za riziko; otázku, či pravidlo platí aj pre testy, rieši R27.',
         kedy='Rozhodnuté 7. 11. 2026.',
         odpoved='Majiteľ výnimky schválil odpoveďami na vláknach Codexu: v PR #237 „Výnimka od majiteľa bola udelená.“ a v PR #238 '
                 '„Výnimka bola udelená majiteľom.“ (7. 11. 2026). Použité sú raz: `FeedReturnState.test.tsx` 572 → 574 riadkov (+2 riadky '
                 'v mocku `AnimatePresence`, K8, commit `dc418ca8`) a `FeedPostEditPhotos.test.tsx` 565 → 588 riadkov (+1 test, K9). Pravidlo '
                 '500 riadkov platí ďalej; ďalšia výnimka potrebuje nové rozhodnutie.',
         datum='7. 11. 2026'),
    dict(id='R27', tema='Pravidlo 500 riadkov a testové súbory',
         otazka='Má pravidlo „súbory `.ts` a `.tsx` nad 500 riadkov sa nemenia“ platiť aj pre testové súbory? Kolega v K8 a K9 tvrdí, že '
                'sa na testy nevzťahuje; `AGENTS.md` (riadok 9) a `.cursor/rules/svaply.mdc` (riadok 11) výnimku pre testy nemajú, '
                'riadok 10 v `svaply.mdc` testy z limitu veľkosti vyníma, a zoznam vedie testový súbor nad limit ako TECH-11.',
         odporucanie='Spresniť znenie: malé zmeny existujúcich testových súborov nad 500 riadkov (pridať test, upraviť mock) povoliť, nové '
                     'testy dávať radšej do nového súboru, a TECH-11 prestať viesť ako „nemeniť“. Inak Codex pri každom takom PR hlási P1 '
                     'a majiteľ musí výnimku udeľovať znova (R26). Produkčné súbory nad 500 riadkov ostávajú bez zmeny.',
         kedy='Pred ďalšou zmenou testového súboru nad 500 riadkov; stačí upraviť `AGENTS.md` a `svaply.mdc`.'),
    dict(id='R28', tema='Vstupné animácie modulov na mobile (287, 288)',
         otazka='Zjednotiť vstupné animácie modulov tak, aby sa pri otvorení modulu nezačínalo od priehľadnosti 0 (a pri „Znížiť pohyb“ '
                'sa neanimovala ani priehľadnosť), alebo ich nechať ako dnes?',
         odporucanie='Zjednotiť, ale až po overení na iPhone: po K8 a K9 zostal preblik hlavne pri zapnutom „Znížiť pohyb“, kde sa '
                     'animuje len priehľadnosť, takže vstupný fade z 0 môže byť práve ten preblik (hypotéza). Jeden pomocník pre vstup '
                     'modulu (bez fadu z 0 pri návrate a pri „Znížiť pohyb“) je lacnejší než oprava po moduloch; `FeedPostCard.tsx` '
                     '(1 033 riadkov) a profilové sekcie nad 500 riadkov by vyžadovali výnimku.',
         kedy='Pred prácou na 287 a 288 (289 je samostatná oprava, rozhodnutie ju ovplyvní len čiastočne).'),
]
