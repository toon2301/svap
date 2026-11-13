# -*- coding: utf-8 -*-
"""Rozhodnutia R13–R39: R13–R22 zo zoznamu majiteľa „Svaply — otvorené nálezy a rozpracovaná práca“ (Nástenka, PDF z 6. 11. 2026), R23
(súbory nad 500 riadkov pri redizajne Nástenky), R24 (výnimka z pravidla 500 riadkov pre nález 271), R25 (nález 275 je zámer
súkromného profilu), R26 (dve výnimky z pravidla 500 riadkov pre testové súbory z K8 a K9), R27 (platí pravidlo 500 riadkov aj
pre testy?), R28 (vstupné animácie modulov na mobile), R29 (animované obrázky), R30 (starý multipart endpoint ponúk, rozhodnuté (a)), R31 (výnimka z pravidla 500 riadkov pre zvyšných osem
`alert()`, rozhodnuté), R32 (kategórie upozornení: dokončiť, alebo skryť, rozhodnuté (a)), R33 (postupné zapínanie push upozornení
na správy, rozhodnuté (a)) a R34 až R36 (kategórie upozornení: priradenie udalostí ku kategóriám, hlavný vypínač a žiadosti o
zručnosť, výzva na push pre nových používateľov; rozhodnuté 10. 11. 2026) a R37 (výnimky z pravidla 500 riadkov pre opravu
mazania fotky 326 a mazania recenzie 325; rozhodnuté 11. 11. 2026) a R38 (nález 311: nechať tak a uzavrieť; rozhodnuté 12. 11. 2026) a R39 (gulička pri Žiadostiach pri vypnutej kategórii, nález 330; čaká).

R13–R19 sú rozhodnutia, ktoré majiteľ vedome prijal počas práce na Nástenke a ktoré sa nemajú prehodnocovať bez nového zistenia
(majú `odpoved`). R20, R21, R23, R27, R28, R29 a R39 sú otázky, ktoré čakajú na odpoveď; R34 až R36 majiteľ rozhodol 10. 11. 2026, R37 11. 11. 2026 a R38 12. 11. 2026; R22 a R24 majiteľ rozhodol 6. 11. 2026, R25 a R26
7. 11. 2026, R30 8. 11. 2026 a R31, R32 a R33 9. 11. 2026 (R31 výslovne udelil s podmienkou maximálnej opatrnosti, R32 zvolil (a) proti
odporúčaniu agenta a R33 podľa odporúčania).
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
    dict(id='R29', tema='Animované obrázky (298, 299)',
         otazka='Majú ponuky, avatary a správy podporovať animované obrázky (animovaný WebP, APNG, GIF), alebo sa má všade ukladať statická '
                'snímka?',
         odporucanie='Pri štarte nie: ponuky, avatary aj správy ostanú so statickou prvou snímkou (dnešné správanie hlavnej cesty cez S3 aj '
                     'zdieľanej funkcie `strip_image_metadata`). Je to jednotné a jednoduché; animácie majú zmysel skôr v správach a to až '
                     'podľa spätnej väzby. Nálezy 298 a 299 sa potom zatvoria ako zámer a kód z K12 pre animované obrázky starého endpointu '
                     'ostane len, ak ostane endpoint (R30).',
         kedy='Pred prácou na 298 a 299.'),
    dict(id='R30', tema='Starý multipart endpoint ponúk (301, 300)',
         otazka='Čo s endpointom `POST /api/auth/skills/<id>/images/`, ktorý UI na produkcii nevolá (tam ide S3) a ktorého fotky sú na '
                'produkcii neprístupné (nález 301)? (a) v produkcii ho vypnúť, keď je S3 nakonfigurované, a ponechať ako vývojovú zálohu; '
                '(b) zrušiť ho aj s vývojovou zálohou vo frontende a kódom z K12; (c) opraviť ukladanie do verejného prefixu `media/`.',
         odporucanie='(a): najmenšia zmena a odstráni plochu, cez ktorú sa priamym volaním dajú vytvárať neprístupné „schválené“ fotky a osirelé '
                     'objekty v S3; vývojová záloha pre lokálny beh bez S3 ostane, rovnako ako úpravy z K12 (EXIF, názov, animácia). (b) je '
                     'čistejšie, no vyžaduje lokálnu náhradu nahrávania pri vývoji (ako má portfólio). (c) sa neodporúča: obchádza '
                     'spracovanie cez S3 (WebP, stavy pending a approved).',
         kedy='Rozhodnuté 8. 11. 2026.',
         odpoved='(a): majiteľ poslal kolegovi text K13 s variantom (a) a PR #244 zlúčil, preto to agent zapísal ako rozhodnutie. '
                 'Kolega ho urobil v K13 (commit `68e2a28b`): pri nastavenom `AWS_STORAGE_BUCKET_NAME` vráti endpoint HTTP 400 a '
                 'nič neuloží, bez bucketu ostáva vývojová záloha. Ak majiteľ zamýšľal iný variant, treba to povedať.',
         datum='8. 11. 2026'),
    dict(id='R31', tema='Výnimka z pravidla 500 riadkov pre zvyšných osem `alert()` (302)',
         otazka='Smie sa jednorazovo zmeniť `SkillsModuleRouter.tsx` (583 riadkov, 4 volania), `OfferReviewsView.tsx` (692 riadkov, 3 '
                 'volania) a `useSkillsDescriptionScreenState.ts` (638 riadkov, 1 volanie) len na náhradu `alert()` za `toast.error` s '
                 'prekladmi, alebo sa majú súbory najprv rozdeliť (TECH-…)?',
         odporucanie='Jednorazová výnimka len na náhradu volaní: súbory nerastú (vymení sa osem volaní a pribudne import). Delenie týchto '
                        'súborov je samostatná a väčšia úloha (TECH-01…11) a zdržiavala by vzhľadovú opravu pred nasadením. Rovnaký postup ako '
                        'pri R24 a R26.',
         kedy='Rozhodnuté 9. 11. 2026.',
         odpoved='Majiteľ 9. 11. 2026 výnimku výslovne udelil s podmienkou maximálnej opatrnosti. Rozsah: `SkillsModuleRouter.tsx`, '
                  '`OfferReviewsView.tsx` a `useSkillsDescriptionScreenState.ts` sa smú zmeniť len na výmenu osmich volaní `alert()` za '
                  '`toast.error` s prekladmi v šiestich jazykoch; iná zmena v nich ostáva zakázaná. Podmienky opatrnosti pre dávku K17 '
                  '(nález 302): každé miesto vo vlastnom commite; pred výmenou test, ktorý bez zmeny padá; v diffe len pridaný import a '
                  'nahradené riadky, bez preformátovania a premenovania; kolega uvedie počet riadkov troch súborov pred zmenou a po nej a '
                  'agent pred zlúčením porovná diff týchto súborov riadok po riadku; pri každom mieste overiť, že chyba nelietá ďalej a '
                  'volajúci neukáže druhé hlásenie; spustiť testy dotknutých modulov aj celý Jest; ak by oprava vyžadovala čokoľvek iné, '
                  'kolega sa zastaví a nahlási to bez zmeny kódu. ' +
                  'Doplnenie 10. 11. 2026 (K17, PR #254): na pripomienku CodeRabbitu a na žiadosť majiteľa sa smel upraviť aj jeden '
                  'riadok `SkillsModuleRouter.tsx:461` (záložný text odstránenia fotky cez `t()` s kľúčom `skills.imageDeleteFailed`, '
                  'počet riadkov sa nezmenil). Agent po zlúčení porovnal diff troch súborov riadok po riadku: pridané sú len importy a '
                  'nahradené riadky, k tomu zmizlo päť zastaraných komentárov `eslint-disable-next-line no-alert` (štyri v '
                  '`SkillsModuleRouter.tsx` a jeden v `useSkillsDescriptionScreenState.ts`); počty riadkov 583 → 580, 692 → 692 a 638 → '
                  '639. Odstránenie štyroch nedosiahnuteľných vetiev limitu kariet v `SkillsModuleRouter.tsx` výnimka nepokrýva a agent '
                  'ho neodporúča (sú poistka pre prípad, že sa strážca v `SkillsScreen` zmení); ostáva poznámka v `poznamky.md`.',
         datum='9. 11. 2026'),
    dict(id='R32', tema='Kategórie upozornení: dokončiť pred štartom, alebo skryť (321)',
         otazka='Majú sa pred ostrým štartom dokončiť všetky kategórie upozornení v Nastaveniach (Páči sa mi to, Komentáre, Žiadosť o '
                 'zručnosť a ďalšie; dnes sú len lokálny stav), alebo sa majú nefunkčné prepínače do dokončenia skryť a Nastavenia ukážu '
                 'len funkčné Správy (push)? (a) dokončiť všetko pred štartom; (b) skryť nefunkčné prepínače a dokončiť po štarte; (c) '
                 'nechať, ako je.',
         odporucanie='(b), ak štart nezávisí od týchto upozornení: prepínač, ktorý nič nerobí, pôsobí ako chyba a zavádza (používateľ si '
                        'myslí, že upozornenia vypol); skrytie je malá zmena na jednom mieste. (a) je väčšia funkcia (model nastavení na '
                        'serveri, rozhodovanie pri doručovaní, rozhranie, testy) a patrí do plánu štartu, ak ju majiteľ chce mať na začiatku. '
                        '(c) sa neodporúča.',
         kedy='Rozhodnuté 9. 11. 2026.',
         odpoved='(a): majiteľ 9. 11. 2026 rozhodol dokončiť všetky kategórie upozornení pred štartom, lebo je to práca, ktorú bude '
                  'treba spraviť, a majiteľ sa jej nechce vyhýbať (agent odporúčal (b), skryť nefunkčné prepínače a dokončiť po štarte; majiteľ '
                  'to nezvolil). Nález 321 sa vracia do PRED NASADENÍM a nález 324 (skrytie prepínačov) sa zatvoril ako nepotrebný. Ide o '
                  'väčšiu funkciu (model nastavení na serveri, rozhranie, doručovanie v aplikácii a push podľa nastavenia, testy), preto '
                  'najprv mapovanie a plán po etapách (agent, len čítanie), až potom dávky pre kolegu.',
         datum='9. 11. 2026'),
    dict(id='R33', tema='Postupné zapínanie push upozornení na správy (rollout) v Railway a pri štarte (318)',
         otazka='Na akú hodnotu nastaviť `WEB_PUSH_MESSAGES_ROLLOUT_PERCENT`? Do 9. 11. 2026 bolo v Railway 5, takže push na správy dostal '
                 'približne každý dvadsiaty účet (podľa čísla účtu). (a) Hneď 100 aj v Railway a pri ostrom štarte podľa potreby znížiť; '
                 '(b) v Railway 100 a pri ostrom štarte začať malým percentom a zvyšovať ho; (c) nechať 5.',
         odporucanie='(a) teraz a (b) pri štarte, ktorý sa rozhodne až pri príprave štartu (N14): Railway je testovacie prostredie a pri 5 % '
                     'nemá test push zmysel (väčšina účtov, aj testovacích, push nikdy nedostane a log ukáže len `rollout_skipped_count`). '
                     'Postupné zapínanie pri ostrom štarte dáva zmysel, ak majiteľ chce sledovať záťaž a chyby doručenia pri malom počte '
                     'používateľov, no musí o ňom vedieť a zvyšovať ho (percento sa vyberá podľa čísla účtu a zmena premennej znamená nové '
                     'nasadenie, preto nie počas behu Playwrightu). (c) sa neodporúča.',
         kedy='Rozhodnuté 9. 11. 2026 (pre Railway); pre ostrý štart najneskôr pri N14.',
         odpoved='(a): majiteľ 9. 11. 2026 súhlasil s odporúčaním, v Railway nastavil `WEB_PUSH_MESSAGES_ROLLOUT_PERCENT` na 100 a '
                  'potvrdil, že upozornenia na správy fungujú (nález 318 je tým zatvorený). Postupné zapínanie pri ostrom štarte, teda '
                  'začať malým percentom a zvyšovať ho, sa rozhodne až pri príprave štartu (N14).',
         datum='9. 11. 2026'),
    dict(id='R34', tema='Kategórie upozornení: ktoré udalosti patria ku ktorej kategórii (321)',
         otazka='Ktoré druhy upozornení riadi ktorý prepínač v Nastaveniach → Upozornenia? Backend dnes vytvára 21 typov (lajky ponúk, '
                 'portfólia, profilu a príspevkov, lajky komentárov a recenzií, komentáre a odpovede, nové recenzie a odpovede na ne, '
                 'označenie a zdieľanie príspevku, žiadosti o zručnosť a ich priebeh, zhoda Sledovania, pozvánka do skupiny), rozhranie '
                 'má päť kategórií. (a) Odporúčané priradenie: Páči sa mi to = lajky ponúk, portfólia, profilu a príspevkov; Páči sa mi '
                 'to pre komentáre = lajky komentárov a recenzií; Komentáre = komentáre a odpovede na príspevky, nové recenzie a '
                 'odpovede na recenzie; Páči sa mi to a komentáre = označenie a zdieľanie príspevku (opis kategórie sa zmení, lebo '
                 'dnešný „Reakcie a komentáre na fotkách, kde ste označení“ nemá v backende žiadnu udalosť); Žiadosť o zručnosť = '
                 'žiadosti o zručnosť a ich priebeh; zhoda Sledovania a pozvánka do skupiny bez prepínača (vždy zapnuté). (b) Iné '
                 'priradenie alebo nové kategórie (napr. „Recenzie“, „Sledovanie“), čo znamená aj nové texty v šiestich jazykoch. (c) '
                 'Kategóriu „Páči sa mi to a komentáre“ z rozhrania vynechať.',
         odporucanie='(a): využije existujúcich päť prepínačov, nepridáva texty ani obrazovky a nič nepotláča mimo kategórií, ktoré '
                        'používateľ pozná. Zhoda Sledovania sa spravuje vlastným ovládaním (zmazaním sledovania) a pozvánka do skupiny čaká na '
                        'odpoveď, preto by prepínač zbytočne skrýval potrebné veci.',
         kedy='Rozhodnuté 10. 11. 2026.',
         odpoved='Majiteľ 10. 11. 2026 súhlasil s odporúčaným priradením (a) s dvoma úpravami. (1) „Páči sa mi to pre komentáre“ zahŕňa '
                  'okrem lajkov komentárov a recenzií aj lajky odpovedí na komentáre; agent overil, že odpoveď na komentár je komentár s '
                  'rodičom (`FeedPostComment.parent_comment`) a jej lajk už dnes vytvára upozornenie `feed_post_comment_liked`, takže '
                  'nový typ netreba (lajk odpovede majiteľa na recenziu v aplikácii neexistuje). (2) Kategória „Páči sa mi to a '
                  'komentáre“ sa premenuje a dostane nový opis, lebo dnešný „Reakcie a komentáre na fotkách, kde ste označení“ nemá v '
                  'backende žiadnu udalosť; majiteľov príklad je „Označenie v príspevku“. Agent navrhuje názov „Označenie a zdieľanie '
                  'príspevku“ s opisom „Keď vás niekto označí v príspevku alebo zdieľa váš príspevok“, lebo sem patrí aj zdieľanie (ak '
                  'majiteľ chce presne svoj názov, zdieľanie sa presunie k „Páči sa mi to“). Ostatné podľa návrhu: Páči sa mi to = lajky '
                  'ponúk, portfólia, profilu a príspevkov; Komentáre = komentáre a odpovede na príspevky, nové recenzie a odpovede na '
                  'recenzie; Žiadosť o zručnosť = žiadosti o zručnosť a ich priebeh; zhoda Sledovania (majiteľ výslovne súhlasil) a '
                  'pozvánka do skupiny (bola v tom istom bode návrhu) bez prepínača, vždy zapnuté.',
         datum='10. 11. 2026'),
    dict(id='R35', tema='Hlavný vypínač „Vypnúť všetko“ a žiadosti o zručnosť (321)',
         otazka='Čo má robiť hlavný vypínač „Vypnúť všetko“ a smie sa vypnúť aj nová žiadosť o zručnosť? Dnes je vypínač len lokálny a '
                 'Správy (push) nevypína; v backende existuje voľba `in_app_notifications` (pri vypnutí sa upozornenie vôbec neuloží) a '
                 'nová žiadosť o zručnosť zámerne obchádza všetky voľby, lebo niekto čaká na odpoveď (test '
                 '`test_skill_request_notification_ignores_in_app_toggle`). (a) Hlavný vypínač = voľba `in_app_notifications` na '
                 'serveri, kategórie si držia vlastné hodnoty, Správy (push) vypína len ich vlastný prepínač; nová žiadosť o zručnosť '
                 'chodí vždy a prepínač „Žiadosť o zručnosť“ riadi ich priebeh (prijatie, zamietnutie, dokončenie, zrušenie, skončenie). '
                 '(b) Ako (a), ale hlavný vypínač potlačí aj push na správy. (c) Všetko vrátane novej žiadosti sa dá vypnúť.',
         odporucanie='(a): najmenej zmien a nič sa nestratí: zhasne len to, čo používateľ naozaj nechce, a nová žiadosť sa nezmešká (zostane '
                        'aj odznak v module Žiadosti). Do opisu kategórie a hlavného vypínača pribudne jedna veta, aby to bolo čitateľné. (b) '
                        'vyžaduje nový príznak pre push, lebo vypnutie push voľby by zrušilo odber; (c) sa neodporúča, lebo druhá strana by '
                        'zbytočne čakala na odpoveď.',
         kedy='Rozhodnuté 10. 11. 2026.',
         odpoved='Majiteľ 10. 11. 2026 určil správanie sám: keď sa zapne „Vypnúť všetko“, aktivuje sa vypnutie na všetkých možnostiach v '
                  'sekcii Upozornenia okrem Správ. Agent to zapisuje ako variant (a) bez push: hlavný vypínač = serverová voľba '
                  '`in_app_notifications`; kategórie ostanú v rozhraní zobrazené ako „Vypnuté“ a zakázané a po vypnutí hlavného vypínača '
                  'sa vrátia ich uložené hodnoty; Správy (push) sa hlavným vypínačom nemenia. Nevyslovené ostalo, či pri zapnutom „Vypnúť '
                  'všetko“ chodí nová žiadosť o zručnosť; platí dnešné správanie (chodí vždy, lebo niekto čaká na odpoveď), kým majiteľ '
                  'nepovie inak; ostatné kroky žiadosti (prijatie, zamietnutie, dokončenie, zrušenie, skončenie) sa riadia kategóriou a '
                  'hlavným vypínačom.',
         datum='10. 11. 2026'),
    dict(id='R36', tema='Push na správy pre nových používateľov: kedy požiadať o povolenie (321)',
         otazka='Voľba Správy (push) je pre nových používateľov v databáze zapnutá, no doručuje sa až po povolení v prehliadači a po '
                 'zaregistrovaní odberu. Prehliadač povolenie nedá bez gesta používateľa (a na iPhone push funguje len z aplikácie '
                 'pridanej na plochu), takže „zapnuté od registrácie“ sa nedá docieliť potichu. Kedy a ako sa o povolenie požiada? (a) '
                 'Jednorazová odmietnuteľná výzva s tlačidlom „Zapnúť upozornenia na správy v tomto zariadení“ priamo v Nastaveniach → '
                 'Upozornenia, keď je voľba zapnutá a povolenie sa ešte nevyžiadalo (s návodom pre iPhone). (b) Navyše výzva po '
                 'registrácii alebo po prvej prijatej správe (väčší zásah: onboarding, nález 252). (c) Bez výzvy; používateľ si '
                 'povolenie vyžiada sám vypnutím a zapnutím voľby (dnešný stav).',
         odporucanie='(a): rieši zavádzajúci stav „Zapnuté“, pri ktorom nič nechodí (rovnaký druh chyby ako pôvodný nález 321), je to malá '
                        'zmena v jednom module a vyžaduje len nový text v šiestich jazykoch. (b) patrí do plánu onboardingu (252). (c) sa '
                        'neodporúča.',
         kedy='Rozhodnuté 10. 11. 2026.',
         odpoved='(a): majiteľ 10. 11. 2026 súhlasil s odporúčaním. V Nastaveniach → Upozornenia sa pri zapnutej voľbe Správ a '
                  'nevyžiadanom povolení v prehliadači ukáže jednorazová odmietnuteľná výzva s tlačidlom (s návodom pre iPhone); ide do '
                  'etapy 3 nálezu 321.',
         datum='10. 11. 2026'),
    dict(id='R37', tema='Výnimka z pravidla 500 riadkov: oprava mazania fotky (326) a mazania recenzie (325)',
         otazka='Oprava 326 je jeden riadok v `SkillsModuleRouter.tsx` (580 riadkov): `return data?.images || [];` (riadok 456) má '
               'vrátiť `data?.images`, aby sa pri odpovedi 204 bez tela nenahradil zoznam fotiek prázdnym poľom. Frontendová časť 325 '
               '(okno sa zavrie a recenzia zmizne zo zoznamu, aj keď zlyhá následné načítanie; toast po úspešnom vymazaní) by menila '
               '`OfferReviewsView.tsx` (692 riadkov). (a) Smie kolega opraviť 326 ako výnimku s podmienkami R31 (vlastný commit, test, '
               'ktorý bez zmeny padá, v diffe len ten riadok, počet riadkov sa nezvýši)? Alternatíva bez výnimky: backend vráti po '
               'zmazaní fotky zoznam zvyšných fotiek so stavom 200, čo mení rozhranie servera. (b) Smie kolega urobiť frontendovú časť '
               '325 ako výnimku s tými istými podmienkami, ale až po nasadení backendovej opravy 325 a len ak príznaky ostanú? (c) Má '
               'po úspešnom vymazaní recenzie pribudnúť toast „Recenzia bola vymazaná.“? Dnes sa po úspechu neukáže nič.',
         odporucanie='(a) áno: je to jeden riadok, príčina je presne ten riadok a postup je rovnaký ako pri R31; alternatíva mení rozhranie '
                        'servera kvôli jednému riadku frontendu. (b) áno, ale až po nasadení backendovej opravy a ručnom overení: oprava '
                        'odpovede 204 pravdepodobne odstráni príčinu a výnimka by nebola potrebná; ak príznaky ostanú, kolega presunie obsluhu '
                        'mazania do nového súboru tak, aby `OfferReviewsView.tsx` nenarástol. (c) áno, ako pri nahlásení recenzie '
                        '(`reports.submitSuccess`); nový text v šiestich jazykoch.',
         kedy='Rozhodnuté 11. 11. 2026.',
         odpoved='Majiteľ 11. 11. 2026: všetky tri áno, podľa odporúčania agenta. (a) Výnimka pre jeden riadok v '
                  '`SkillsModuleRouter.tsx` (nález 326) je udelená s podmienkami R31: vlastný commit, test, ktorý bez zmeny padá, v diffe '
                  'len ten riadok, počet riadkov sa nezvýši; ak by oprava vyžadovala čokoľvek iné, kolega sa zastaví a nahlási to bez '
                  'zmeny kódu; alternatíva cez backend sa nepoužije. (b) Výnimka pre frontendovú časť nálezu 325 (`OfferReviewsView.tsx`, '
                  '692 riadkov) je udelená s tými istými podmienkami v znení otázky: ide až po nasadení backendovej opravy 325 (K18) a '
                  'ručnom overení majiteľom; nová logika mazania ide do nového súboru a pôvodný súbor nesmie narásť. (c) Po úspešnom '
                  'vymazaní recenzie sa ukáže toast „Recenzia bola vymazaná.“ (nový kľúč v šiestich jazykoch). Agent to vykladá tak, že '
                  'toast (c) ide v každom prípade, lebo mení ten istý veľký súbor a pôjde v rovnakom frontendovom kroku ako (b), a '
                  'ošetrenie zlyhania načítania zoznamu (b) len ak príznaky po oprave backendu ostanú.',
         datum='11. 11. 2026'),
    dict(id='R38', tema='Nález 311: opraviť `useIsMobile()` teraz, alebo nechať tak a uzavrieť',
         otazka='Kolega zmeral v K17 pri prvom vykreslení na mobile posun 0,022 (Správy) a 0,031 (Žiadosti), lebo `useIsMobile()` vráti '
                 'v prvom vykreslení `isMobile: false` a `isResolved: false`, a navrhol opravu v hooku cez `useSyncExternalStore` (odhad '
                 'M). Hook používa veľa komponentov v celej aplikácii a oprava by nezlepšila prvé vykreslenie na serveri. Opraviť teraz '
                 '(samostatná dávka s testom hydratácie a dymom), alebo nález uzavrieť a vrátiť sa k nemu, ak sa prejav v používaní '
                 'ukáže?',
         odporucanie='Uzavrieť: dopad je nízky (posun pod 0,1, čo sa pokladá za dobrú hodnotu), prejav sa pri používaní nikomu neukázal a '
                        'oprava by menila spoločný hook pre celú aplikáciu, takže riziko nových chýb je väčšie než prínos. Ak sa prejav objaví, '
                        'otvorí sa nový nález s odkazom na 311 a s meraním kolegu.',
         kedy='Rozhodnuté 12. 11. 2026.',
         odpoved='Majiteľ 12. 11. 2026: nález 311 pri používaní nezaregistroval a nechce kvôli nemu riskovať nové chyby v spoločnom '
                  'hooku; zatiaľ ho nechá tak a nález uzatvára, ak sa prejav ukáže, dá vedieť. Agent súhlasil.',
         datum='12. 11. 2026'),
    dict(id='R39', tema='Číselná gulička pri Žiadostiach pri vypnutej kategórii „Žiadosť o zručnosť“ (330)',
         otazka='Pri vypnutej kategórii „Žiadosť o zručnosť“ sa nová žiadosť doručí a je viditeľná v Žiadostiach, no rozsvieti číselnú '
                 'guličku pri položke Žiadosti v menu, lebo nová žiadosť chodí vždy (R35; kategória riadi len jej priebeh). Majiteľ pri '
                 'ručnom teste po K20 (13. 11. 2026) očakával, že sa žiadosť doručí, ale gulička sa nezobrazí. (a) Gulička sleduje '
                 'kategóriu: pri vypnutej kategórii sa upozornenie na novú žiadosť vytvorí rovno ako prečítané (žiadosť sa doručí a je v '
                 'Žiadostiach, bez guličky); hlavný vypínač „Vypnúť všetko“ ostáva ako dnes (gulička sa pri novej žiadosti rozsvieti, '
                 'ako hovorí jeho opis). (b) Ako (a), ale gulička sa nezobrazí ani pri zapnutom hlavnom vypínači a veta v jeho opise sa '
                 'zmení (napríklad „Nové žiadosti o zručnosť sa zobrazia v Žiadostiach bez upozornenia.“). (c) Nechať ako dnes a do '
                 'opisu kategórie doplniť vetu, že nová žiadosť chodí vždy.',
         odporucanie='(b): každý vypínač potom robí to, čo hovorí; inak by hlavný vypínač „Vypnúť všetko“ ostal jediným, ktorý guličku '
                        'nechá, a vyzeralo by to ako tá istá chyba znova. Žiadosť sa nestratí: ostane doručená a viditeľná v Žiadostiach a '
                        'používateľ si guličku vypol sám. Zmena je malá (backend v jednej funkcii a jeden test, pri (b) text hlavného vypínača '
                        'v šiestich jazykoch). Ak majiteľ chce, aby hlavný vypínač nevypínal nič, čo čaká na odpoveď druhého používateľa, volí '
                        '(a).',
         kedy='Pred prácou na 330 (dávka K21).'),
]
