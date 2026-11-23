# -*- coding: utf-8 -*-
"""Stav zoznamu: dátum, položky opravené po prvom vydaní, tabuľka PR, rozhodnutia a denník zmien.

Tento súbor sa upravuje pri každej zmene stavu (nový nález, oprava, odpoveď na rozhodnutie); postup je v `README.md`.
"""

# Hlavička dokumentu: kedy sa naposledy menil a z akého stavu `main` sa vychádzalo.
STAV = dict(
    datum='23. 11. 2026',
    kod='`main` `a9e70eef` (po PR #321: K56; PR #320 je zoznam 199 a karta K56, PR #319 je K55, PR #318 karta K55 (vetva 198), PR #317 je K54, PR #316 zoznam 197, PR #315 je K53, PR #314 zoznam 196, PR #313 je K52, PR #312 zoznam 195, PR #311 je K51, PR #310 zoznam 194, PR #309 je K50, PR #308 zoznam 193, PR #307 je K49, PR #306 je K48, PR #305 zoznam 192)',
    register='21. 10. 2026 + PR #193',
)

# Denník zmien dokumentu, najnovšie hore: (dátum, čo sa zmenilo). Záznamy do 19. 11. 2026 sú v `zmeny_starsie_2.py` a `zmeny_starsie.py`.
from zmeny_starsie import ZMENY_STARSIE  # noqa: E402
from zmeny_starsie_2 import ZMENY_STARSIE_2  # noqa: E402

ZMENY = [
    ('23. 11. 2026',
      'Doplnok vetvy 200 (PR #322 je ešte otvorené; `main` ostáva `a9e70eef`). (1) Pripomienka CodeRabbitu k PR #322 (jedna, '
      'Minor, k `stav.py:354` a k dvom miestam v `README.md`: stále hovorili, že redizajn komentárov a okna príspevkov na '
      'počítači (261, 344) implementuje agent, hoci podľa R67 kód píše kolega): platná, opravená v commite `548deadd`; agent '
      'našiel rovnakú chybu aj vo `fronta.py` (nenahlásenú) a pri historickom zázname vo `stav.py` (doplnok 3 vetvy 191) '
      'doplnil poznámku o zmene R67; CI zelené (CodeRabbit, `checks`, `backend-postgres`). (2) Odpoveď majiteľa 23. 11. 2026 '
      'na otázky agenta k oknu detailu na počítači (344), po štyroch obrázkoch s variantmi A a B z prototypu („idem podľa '
      'tvojich odporúčaní, vyzerá to dobre“): R63 je zodpovedané (kostra a chybové okno úzke, repost textu úzky, fotka karty '
      'spolu s oknom, šírka 576 px, 344 ako prvá časť redizajnu) a nové R68 (natiahne sa aj náhrada za fotku; plocha sa '
      'zmenší najmenej na 128 px: agent po vykreslení obrázkov zmenil odporúčanie z pevných 256 px na zmenšenie, lebo na malom '
      'notebooku inak názov a cena ponuky padnú pod okraj). (3) Karta K57 (`karty/K57.md`: tri kódové kroky a manuál ručných '
      'testov), podklady `karty/K57_podklady.md` a tri schválené obrázky v `navrhy/` (`pc-okno-ponuka-portfolio-schvalene.png`, '
      '`pc-okno-text-uzke-schvalene.png`, `pc-okno-male-obrazovky-schvalene.png`). Prototyp agenta (kópia `frontend` z `main` '
      '`a9e70eef` mimo repozitára): 4 produkčné súbory (+120 a −49 riadkov) a nový `FeedDetailSplitContext.tsx` (22 riadkov), '
      'všetky pod 500 riadkov, `FeedPostCard.tsx` sa nemení (498); 4 nové súbory testov (66 testov), existujúce testy sa menia '
      'len štyri (R27); 31 zásahov z 31 zachytených; celý Jest 641 sád a 9 563 testov (na `main` 637 a 9 497), `tsc` a ESLint '
      'čisté; každý z troch krokov prechádza samostatne; scény, ktoré sa nemajú zmeniť, sú v Chromiu pixel po pixeli rovnaké. '
      'Zistenie z merania: pružná plocha fotky bez podmienky by v jednostĺpcovom okne pod 1 024 px klesla zo 256 na 128 px '
      '(karta 177 px namiesto 305 px), preto sa zapína len v ľavom stĺpci dvojstĺpcového okna cez kontext. (4) Upravené: R63, '
      'nové R68, nález 344 (K47 sa stalo K57), fronta, README a stav. (5) Prehľad: nálezy 1–362, zatvorené 14, hotové 145, '
      'PRED 51, PO 132; čakajúcich rozhodnutí 9 z 68. Dopad na E2E: žiadny (Codex po nasadení pridá kontrolu rozloženia na '
      'čítanie).'),
    ('23. 11. 2026',
      'Vetva 200 (vychádza z `main` `a9e70eef`, teda po PR #321). (1) Zlúčené od vetvy 199: PR #320 (vetva 199; 23. 11. 2026 o '
      '08:23 UTC, merge `8d15bc40`; zápis K54 a K55, nález 333 uzavretý a karta K56; CI zelené) a PR #321 (K56; o 09:42 UTC, merge '
      '`a9e70eef`). (2) K56 (PR #321): opravy 355 a 356, tri commity (`b651df1c` pre 355, `8e96b7bc` pre 356 a manuál `8955e61d`), '
      '6 súborov, +469 a −8 riadkov: `FeedPostCardLayers.tsx` dáva oknu zdieľania `currentPost` (204 riadkov) a v '
      '`FeedPostCard.tsx` je `post` v závislostiach efektu E5 (493 → 498 riadkov); dva nové súbory testov '
      '(`FeedPostCard.shareAfterEdit.test.tsx` 170 riadkov a 3 testy, `FeedPostCard.feedRefreshDuringLike.test.tsx` 285 riadkov a '
      '6 testov), jedna veta komentára v `FeedPostCard.feedSync.test.tsx` a manuál ručných testov (krok 9). Kolega prevzal kód aj '
      'testy z podkladov agenta: produkčné súbory sa líšia jedným slovom komentára, testy sú bajt po bajte rovnaké. (3) Kontrola '
      'agenta (z GitHubu a v kópii `main` mimo repozitára): CI zelené, CodeRabbit bez pripomienok (len kozmetické hlásenie o '
      'názve PR) a Codex bez väčších problémov, vlákna ani recenzie nie sú, prvé riadky commitov 62, 63 a 65 znakov; `tsc` a '
      'ESLint (0 varovaní) čisté, celý Jest 637 sád, 9 497 testov a 0 snapshotov (na `main` pred K56 635, 9 488 a 0); zásahy Q1 '
      'až Q9 na zlúčenom kóde zachytených 9 z 9 novými testami. (4) Ručný test majiteľa K56: hotová, nasadená a otestovaná, '
      'nové nálezy nenahlásené; nálezy 355 a 356 sú HOTOVÉ. (5) Rozhodnutie R67 (zmena R64): na otázku agenta, či vie zadať '
      'redizajn kolegovi tak, aby ho urobil presne podľa dohody, majiteľ 23. 11. 2026 určil podľa odporúčania, že redizajn '
      'komentárov (261) a okna príspevkov na počítači (344) píše kolega podľa presnej karty agenta (obrázok, tabuľka hodnôt, čo '
      'sa nesmie zmeniť, malé časti); agent po každej časti kontroluje výsledok voči odsúhlasenému vzhľadu v prehliadači a '
      'majiteľ testuje ručne; všetko ostatné z R64 platí (rekapitulácia a vizuál s odporúčaním od agenta, R49). Postup, ktorý '
      'majiteľ určil: najprv zápis tejto zmeny, potom doriešenie otvorených vecí a krátka rekapitulácia, aby si bol na 100 % '
      'istý. (6) Upravené: nálezy 355 a 356 (hotové), rozhodnutie R64 (poznámka o zmene) a nové R67, nálezy 261, 344 a 359 (kto '
      'píše kód), fronta (355 a 356 už nie sú, texty o R64 a K56), tabuľka PR (#321), README (rozdelenie práce) a stav. (7) '
      'Prehľad: nálezy 1–362, zatvorené 14, hotové 145, PRED 51, PO 132; čakajúcich rozhodnutí 10 z 67. Dopad na E2E: žiadny.'),
    ('23. 11. 2026',
      'Vetva 199 (vychádza z `main` `46eb8d0b`, teda po PR #319). (1) Zlúčené od vetvy 197: PR #316 (vetva 197; 22. 11. 2026 o '
      '17:28 UTC, merge `9961c254`; zápis K53, nálezy 361 a 362 a karta K54), PR #317 (K54; o 19:06 UTC, merge `fb43add0`), PR #318 '
      '(vetva 198, len karta K55; o 20:08 UTC, merge `252960f4`) a PR #319 (K55; 23. 11. 2026 o 06:19 UTC, merge `46eb8d0b`). '
      '(2) K54 (PR #317): krok f delenia karty: 4 commity (tri etapy `800c91d6`, `1e6fab10` a `f1deacb7` a manuál `f37f501a`), 5 '
      'súborov, +265 a −127 riadkov: nové hooky `useFeedPostCardActions.ts` 94, `useFeedPostCounts.ts` 79 a '
      '`useFeedPostMobileLayers.ts` 60 riadkov, `FeedPostCard.tsx` 590 → 549 → 515 → 493 (teda pod limitom 500) a '
      '`sablony/dymovy_test.md` (+2 odrážky kroku 9); podľa textov commitov čisté presuny (pôvodná karta poskladaná späť bajt po '
      'bajte po každej etape), celý Jest 638 sád, 9 561 testov a 73 snapshotov pred etapou aj po nej, `tsc`, ESLint, preklady a build '
      'čisté, paritné mutácie z 46 zachytených 41 a prežilo päť očakávaných (D1, D8, R3b, R4 a R5). (3) K55 (PR #319): '
      '`FeedPostMobileDetail.tsx` 594 → 464 → 358 dvoma presunmi (nové `FeedPostMobileDetailContent.tsx` 225 a '
      '`FeedPostMobileDetailHeader.tsx` 172) a zmazanie šiestich dočasných súborov (odtlačky HTML a sonda poradia efektov, 73 '
      'testov a 73 snapshotov) s úpravou jednej vety komentára; 4 commity (`afca350a`, `6b15e283`, `2f501c7b` a manuál `65c56c18` '
      'so štyrmi odrážkami), 11 súborov, +438 a −8 452 riadkov; celý Jest po zmazaní 635 sád, 9 488 testov a 0 snapshotov. '
      '(4) Kontrola agenta (23. 11. 2026, z GitHubu a v kópii mimo repozitára zo zlúčeného `main`): v oboch PR CI zelené, CodeRabbit '
      'zelený a bez pripomienok (spustil ho majiteľ pred zlúčením; len kozmetické hlásenie o názve PR), Codex bez väčších '
      'problémov, vlákna ani recenzie nie sú, prvé riadky commitov najviac 72 znakov; presuny po etapách z git objektov sedia '
      '(odstránené riadky sú v nových súboroch, výnimky sú len rámce viacriadkových importov a komentár hlavičky `{/* … */}` → '
      '`//`); `tsc` a ESLint (0 varovaní) čisté, celý Jest 635 sád, 9 488 testov a 0 snapshotov (presne ako udáva kolega); '
      'paritné zásahy na zlúčenom kóde: K54 zo 48 zachytených 41 (prežilo päť očakávaných D1, D8, R3b, R4 a R5 a dva zásahy na poradie '
      'volania hookov, P1 a P2, ktoré predtým zachytávala dočasná sonda; všetkých 22 zásahov do efektov ostalo zachytených aj bez nej), K55 z '
      '34 zachytených 31 (prežili MD1, C14 a H7: ochrana pred dvojitým volaním, farba aktívneho srdiečka a čas v hlavičke), prežívajúce vždy aj '
      'proti všetkým 95 súvisiacim sadám. (5) Ručné testy majiteľa K54 aj K55: všetko v poriadku, žiadne nové nálezy. Nález 333 je tým HOTOVÝ (presunutý do '
      '`hotove_k40.py`, text zhustený; z ručných testov vznikli nálezy 357 až 362, ktoré idú po redizajne). (6) Na pokyn '
      'majiteľa agent napísal kartu K56 (posledný krok pred redizajnom: oprava 355, okno zdieľania po úprave ukáže `currentPost`, a '
      'oprava 356, `post` do závislostí efektu E5; `karty/K56.md`, overené testy a mutácie v `karty/K56_podklady.md`); prototyp v '
      'kópii mimo repozitára: z 9 nových testov 4 pred opravami padajú a po nich prejdú všetky, celý Jest 637 sád, 9 497 testov a 0 snapshotov, `tsc` a ESLint čisté, všetkých 9 zásahov Q1 až Q9 zachytených novými testami a päť '
      'opakovaných behov nových súborov bez pádu. Redizajn (rekapitulácia a '
      'vizuálny návrh, R64) začne, až keď majiteľ potvrdí, že K56 je nasadená a otestovaná. (7) Upravené: nález 333 (hotový), '
      'nálezy 355 a 356, tabuľka PR (K54 a K55), fronta (355 a 356 sú dávka K56 a idú prvé; 333 už nie je vo fronte; 361 a 362 už '
      'nebrzdí K55), prehľad vĺn a stav. (8) Prehľad: nálezy 1–362, zatvorené 14, hotové 143, PRED 53, PO 132; čakajúcich '
      'rozhodnutí 10 z 66. Dopad na E2E: žiadny.'),
    ('22. 11. 2026',
      'Vetva 197 (vychádza z `main` `0c2be295`, teda po PR #315). (1) Zlúčené: PR #314 (vetva 196; 22. 11. 2026 o 13:50 UTC, '
      'merge `cc728394`; zápis K52 a karta K53; CI a CodeRabbit zelené, vlákna ani recenzie nie sú) a PR #315 (K53; o 15:53 UTC, '
      'merge `0c2be295`). (2) K53 (PR #315): krok e delenia karty: 2 commity, 3 súbory: nový `FeedPostCardHeader.tsx` 211 riadkov, '
      '`FeedPostCard.tsx` 722 → 590 a `sablony/dymovy_test.md` (+4 odrážky kroku 9); podľa textu commitu čistý presun (pôvodná '
      'karta poskladaná späť bajt po bajte), celý Jest 638 sád, 9 561 testov a 73 snapshotov, `tsc`, ESLint (0 varovaní), preklady '
      'a build čisté, paritné mutácie H1 až H22 (23) zachytené pred presunom aj po ňom; zásah X4 (`closeMenu` bez `useCallback`) '
      'prežil, takže stabilitu `onClose` nestráži žiadny test (poznámka, nie nález). (3) Kontrola agenta (dodatočná, lebo PR bol '
      'zlúčený skôr, než majiteľ poslal jeho číslo) z GitHubu a v kópii mimo repozitára: CI zelené, Codex bez väčších problémov, '
      'vlákna ani recenzie nie sú; CodeRabbit K53 nekontroloval (automatické recenzie sú vypnuté a príkaz `@coderabbitai review` prišiel '
      'o 15:55 UTC, po zlúčení o 15:53 UTC); 149 odstránených a 17 pridaných riadkov karty sedí s novým súborom; `tsc` a ESLint '
      'čisté, 98 sád s 1 346 testami a 73 snapshotmi prešlo; 26 paritných mutácií (H1 až H22 a tri navyše) zachytených 26 z 26. '
      '(4) Ručný test K53 (majiteľ): K53 nič nepokazila; nové nálezy 361 (meno autora príspevku sa podčiarkuje pri prejdení kurzorom '
      'alebo po ťuknutí) a 362 (avatar a meno pôvodného autora v prezdieľanom príspevku nevedú na profil), obe staršie správanie, '
      'zadané presne (vzhľad aj správanie), takže R49 je splnené. Agent ich zaradil po redizajne spolu s 357 až 360 a nie pred K55, '
      'lebo menia DOM, ktorý stráži dočasný odtlačok HTML; manuál ručných testov má známe odchýlky 361 a 362. (5) Na pokyn majiteľa '
      'agent napísal kartu K54 (krok f: obsluhy, počty s pollingom a mobilné vrstvy s efektmi E6 a E7 do troch hookov v troch '
      'commitoch; `karty/K54.md`, najrizikovejšia dávka); prototyp v kópii mimo repozitára prešiel po každej etape `tsc`, ESLintom '
      'bez varovania a 98 sadami bez zmeny odtlačkov a sondy (karta 590 → 549 → 516 → 495 riadkov), zásahy D1 až D14, E1a až E7e a R1 '
      'až R9 a dva zásahy na poradie volania hookov zachytených 43 zo 48 (prežili len D1, D8, R3b, R4 a R5, ktoré prežívajú už dnes, K48), obe zmeny poradia zhodila sonda. K54 sa nezlúči s K55: tá čaká na ručný test K54. Majiteľ sa opýtal, koľko '
      'krokov je do redizajnu: tri dávky kolegu (K54, K55, K56) a potom návrh vzhľadu od agenta (R64). (6) Upravené: nález 333 '
      '(výsledky K53 a plán K54), nové 361 a 362 (`polozky_nove_k53.py`), tabuľka PR, fronta (333 je teraz dávka K54; nálezy 361 a 362 '
      'idú po redizajne), manuál ručných testov (známe odchýlky) a stav. (7) Prehľad: nálezy 1–362, zatvorené 14, hotové 142, PRED 54, '
      'PO 132; čakajúcich rozhodnutí 10 z 66. Dopad na E2E: žiadny (žiadny špec nepoužíva riadok pôvodného autora v náhľade).'),
    ('22. 11. 2026',
      'Vetva 196 (vychádza z `main` `8c9e636d`, teda po PR #313). (1) Zlúčené: PR #312 (vetva 195; 22. 11. 2026 o 11:18 UTC, '
      'merge `20cac81c`; zápis K51, nálezy 357 až 360 a karta K52; CI zelené, CodeRabbit bez pripomienok, vlákna nie sú) a PR #313 '
      '(K52; o 12:35 UTC, merge `8c9e636d`). (2) K52 (PR #313): krok c delenia karty: 2 commity, 4 súbory: nové '
      '`FeedPostCardLayers.tsx` 204 riadkov a `useFeedPostCardLayers.ts` 51 riadkov, `FeedPostCard.tsx` 774 → 722 a '
      '`sablony/dymovy_test.md` (+4 odrážky kroku 9); podľa textu commitu čistý presun (pôvodná karta poskladaná späť bajt po '
      'bajte), celý Jest 638 sád, 9 561 testov a 73 snapshotov, `tsc`, ESLint (0 varovaní), preklady a build čisté, paritné '
      'mutácie L1 až L27 vrátane L25b 27 z 28 (prežila len L20 = chyba 355). Odchýlky od karty: hook má deväť vlajok namiesto '
      'dvanástich (tri vlajky ostali v karte kvôli efektom E6 a E7 a pravidlu `exhaustive-deps`), nové súbory 255 riadkov '
      '(karta asi 240) a karta 722 riadkov (karta asi 695 ±25). (3) Kontrola agenta (dodatočná, lebo PR bol zlúčený skôr, než '
      'majiteľ poslal jeho číslo) z GitHubu a v kópii mimo repozitára: CI a CodeRabbit zelené, Codex bez väčších problémov, '
      'vlákna ani recenzie nie sú; telo pôvodnej karty sa poskladá späť bajt po bajte (703 z 703 riadkov), všetkých 99 '
      'neprázdnych odstránených riadkov je v nových súboroch; `tsc` a ESLint čisté, 98 sád s 1 346 testami a 73 snapshotmi '
      'prešlo; zo 41 paritných mutácií (L1 až L27 vrátane L25b, S1 až S9 a X1 až X4) zachytených 40, prežila len L20; manuál '
      'ručných testov (krok 9) zodpovedá kódu. (4) Na pokyn majiteľa agent napísal kartu K53 (krok e: hlavička s menu a stav '
      'menu do `FeedPostCardHeader.tsx`, `karty/K53.md`); prototyp kroku e v kópii mimo repozitára prešiel `tsc`, ESLintom bez '
      'varovania a 98 sadami bez zmeny odtlačkov a sondy (karta 722 → 590 riadkov, nový súbor 201), zásahy H1 až H22 (23) '
      'zachytené pred presunom aj po ňom (23 z 23, vždy tým istým prvým padnutým testom) a tri zásahy navyše tiež (26 z 26). '
      'K53 sa zlúči až po ručnom teste K52 (majiteľ ho robí). (5) Upravené: nález 333 (výsledky K52 a plán K53), tabuľka PR, '
      'fronta (333 je teraz dávka K53) a stav. (6) Prehľad: nálezy 1–360, zatvorené 14, hotové 142, PRED 52, PO 132; '
      'čakajúcich rozhodnutí 10 z 66. Dopad na E2E: žiadny.'),
    ('22. 11. 2026',
      'Vetva 195 (vychádza z `main` `39f6e1a7`, teda po PR #311). (1) Zlúčené: PR #310 (vetva 194; 22. 11. 2026 o 06:37 UTC, '
      'merge `ee374c4c`; zápis K50 a karta K51; CodeRabbit dal jednu platnú pripomienku, podmienku zlúčenia K51 po ručnom teste '
      'K50, opravenú pred zlúčením) a PR #311 (K51; o 08:58 UTC, merge `39f6e1a7`). (2) K51 (PR #311): krok d delenia karty: 2 '
      'commity, 3 súbory: nový `FeedPostSharedBlock.tsx` 163 riadkov, `FeedPostCard.tsx` 852 → 774 a `sablony/dymovy_test.md`; '
      'podľa textu commitu čistý presun (pôvodná karta poskladaná späť bajt po bajte), celý Jest 638 sád a 9 561 testov, `tsc`, '
      'ESLint, preklady a build čisté, paritné mutácie 12 z 12; kolega opravil dve tvrdenia v karte (odstránenie `fixedBlock` je '
      'ekvivalent; „len odtlačok“ neplatí pri B2) a priradil jednorazový pád `FeedHomeEntryScroll` k nálezu 31. (3) Kontrola agenta '
      'z GitHubu a v kópii mimo repozitára: CI a CodeRabbit zelené, vlákna nie sú; z 812 neprázdnych riadkov pôvodnej karty '
      'chýbajú v nových súboroch len dva (obal ternára); `tsc` a ESLint čisté, 40 sád s 439 testami a 73 snapshotmi prešlo; '
      'paritné mutácie 12 z 12 zachytených, odstránenie `fixedBlock` prežilo (ekvivalent, kolega mal pravdu) a vynechanie '
      'skorého `return null` zhodilo odtlačok. (4) Ručný test K51 (majiteľ): nové nálezy 357 (repost: text pôvodného príspevku bez '
      '„Viac“), 358 (zdieľaná ponuka a portfólio: text zdieľajúceho sa nezobrazuje), 359 (označenia ako obyčajný text bez '
      'bubliny; podmnožina skupiny 8 v nálezu 261) a 360 (mobil: starý spôsob zobrazenia príspevku namiesto dnešnej obrazovky '
      'detailu; odstrániť aj z kódu). Majiteľ ich chce opraviť hneď po redizajne komentárov a rozložení príspevkov (261 a 344), '
      'lebo sa dotýkajú tých istých miest; agent ich podľa jeho pokynu nemapoval a zapísal ich až po vysvetlení (dve snímky z '
      'počítača a dve z mobilu). K51 je doslovný presun, takže nálezy sú staršie správanie. Manuál ručných testov '
      '(`sablony/dymovy_test.md`, krok 9) tvrdil, že text zdieľajúceho je nad náhľadom a dá sa rozbaliť (z karty K51); opravený '
      'o známe odchýlky 357 a 358. (5) Ďalší krok: K52 (krok c: vrstvy a dialógy a hook vlajok; karta `karty/K52.md`). (6) '
      'Upravené: nález 333 a nové 357 až 360 (`polozky_nove_k51.py`), tabuľka PR, fronta (333 je teraz dávka K52; nálezy 357 '
      'až 360 idú po redizajne), poradie a manuál ručných testov. (7) Prehľad: nálezy 1–360, zatvorené 14, hotové 142, PRED 52, '
      'PO 132; čakajúcich rozhodnutí 10 z 66. Dopad na E2E: žiadny na špecy; nález 360 môže zasiahnuť špecy upozornení a detailu '
      'príspevku (neoverené).'),
    ('21. 11. 2026',
      'Vetva 194 (vychádza z `main` `1c054479`, teda po PR #309). (1) Zlúčené: PR #308 (vetva 193; 21. 11. 2026 o 20:40 UTC, '
      'merge `6a059c14`; zápis K48 a K49, karta K50 a pokyn o manuáli ručných testov; CodeRabbit dal jednu platnú pripomienku, '
      'ručný test komentárov na počítači, opravenú pred zlúčením; vlákno zatvára majiteľ) a PR #309 (K50; o 21:35 UTC, merge '
      '`1c054479`). (2) K50 (PR #309): kroky a, g a b delenia karty, prvé presuny kódu: 4 commity, 5 súborov (tri nové: '
      '`FeedPostActionButton.tsx` 94, `FeedPostCard.types.ts` 58 a `FeedPostActions.tsx` 121 riadkov; `FeedPostCard.tsx` 1 033 '
      '→ 852; `sablony/dymovy_test.md` +6 riadkov, nový krok 9); podľa textov commitov čisté presuny (pôvodná karta poskladaná '
      'späť bajt po bajte), celý Jest 638 sád a 9 561 testov, `tsc`, ESLint, preklady a build čisté, paritné mutácie 14 zo 14. '
      '(3) Kontrola agenta z GitHubu a v kópii mimo repozitára: CI (`checks`, `backend-postgres`) a CodeRabbit zelené, vlákna '
      'nie sú; z 988 neprázdnych riadkov pôvodnej karty chýba v nových súboroch len šesť, všetky vysvetliteľné (importy typov, '
      '`export`, hlavička typu a `post.id` → `postId`); `tsc` a ESLint čisté; 40 sád (22 sád karty, K48 a K49) s 439 testami a 73 '
      'snapshotmi prešlo, odtlačky bezo zmeny; paritné mutácie 14 zo 14 zachytených, odstránenie `fixedBlock` zhodilo 8 stavov '
      'okna; krok 9 v manuáli ručných testov zodpovedá opravenej karte. Kandidáti na nové nálezy: žiadni. (4) Majiteľ 21. 11. '
      '2026: ručný test K50 robí sám a ďalšiu prácu dáva kolegovi hneď, kým testuje (nálezy hlási hneď); preto agent napísal kartu '
      'K51 (krok d, zdieľaný blok a označenia, `karty/K51.md`; K51 sa zlúčí až po ručnom teste K50). (5) Upravené: nález 333 '
      '(výsledky K50), tabuľka PR, fronta (333 je teraz dávka K51) a stav. (6) Prehľad: nálezy 1–356, zatvorené 14, hotové 142, '
      'PRED 48, PO 132; čakajúcich rozhodnutí 10 z 66. Dopad na E2E: žiadny.'),
    ('21. 11. 2026',
      'Vetva 193 (vychádza z `main` `c16b97df`, teda po PR #307). (1) Zlúčené: PR #305 (vetva 192; 21. 11. 2026 o 16:18 UTC), '
      'PR #306 (K48; o 18:20 UTC, merge `c573f502`) a PR #307 (K49; o 19:35 UTC, merge `c16b97df`). (2) K48 (PR #306): ochrana '
      'karty pred delením, len testy: 11 commitov, 13 nových súborov (11 súborov testov a 2 `.snap`, +9 681 riadkov, nič zmenené '
      'ani zmazané), deväť súborov testov správania (60 testov), dočasný odtlačok HTML (44 stavov) a dočasná sonda poradia '
      'efektov (24 stavov); podľa textov commitov celý Jest 631 sád a 9 514 testov, `tsc`, ESLint, preklady a build čisté, '
      'z 49 prežívajúcich mutácií kolegu nové súbory zachytili 44 (všetkých 41 skutočných medzier) a zo 84 agentových 77; '
      'odchýlky od karty: podpis kódu v sonde z identifikátorov kvôli `--coverage`, odtlačok má 44 stavov a dva testy '
      'navyše. (3) K49 (PR #307): ochrana mobilného detailu, len testy: 7 commitov, 8 nových súborov (7 súborov testov a 1 '
      '`.snap`, +2 687 riadkov), šesť súborov testov správania (42 testov) a dočasný odtlačok HTML (5 stavov); Jest 638 sád a '
      '9 561 testov; zo 70 pokazení zachytených 66, prežili 4 (MD1 je nepozorovateľná, tri držia existujúce testy). (4) '
      'Kontrola agenta z GitHubu a v kópii `frontend` mimo repozitára: CI (`checks`, `backend-postgres`) a CodeRabbit (bez '
      'pripomienok) zelené, Codex bez väčších problémov, vlákna nie sú; menili sa len nové súbory v `__tests__`; nové testy '
      'prechádzajú na pôvodnom kóde (128 a 47 testov) aj na prototype rozdelenej karty a detailu bez zmeny odtlačkov; '
      'pokazenia agent zopakoval nezávisle: K48 77 zo 84 (7 nezachytených je očakávaných: chyba 355, nepozorovateľné a '
      'ekvivalentné), K49 12 z 13 (nezachytené len MD1). Kandidáti na nové nálezy: žiadni. (5) Ručný test netreba (zmenili sa '
      'len testy); kontrola K31 po nasadení (log Railway a dym `@smoke`) ostáva nepotvrdená. (6) Ďalší krok: K50 (kroky a, g '
      'a b delenia karty, prvé presuny kódu); majiteľ 21. 11. 2026 po odpovedi, že K50 je zmapovaná v K46 (nič sa nemapuje '
      'znova), povedal, že sa začína, a agent napísal kartu `karty/K50.md` (tri commity: `FeedPostActionButton.tsx`, '
      '`FeedPostCard.types.ts` a `FeedPostActions.tsx`; karta po nej asi 860 riadkov; paritné mutácie A1, A2, A4 až A6 a F1 '
      'až F8 a F10 z `K46_podklady.md`). Karta ide do vetvy 193 spolu so zápisom K48 a K49 a majiteľ ju pošle kolegovi po '
      'zlúčení vetvy. Podľa pokynu majiteľa sa ide postupne a agent nič nemapuje ani nepripravuje dopredu (ďalšia karta až '
      'na pokyn). Pokyn majiteľa 21. 11. 2026: kolega má pri každej dávke doplniť aj manuál ručných testov, ak dávka ručné '
      'testy má; jediný manuál v repozitári je `sablony/dymovy_test.md`, preto je pokyn v šablóne karty, v README a v každom '
      'texte pre kolegu (agent predpokladá tento súbor a opýta sa, ak majiteľ myslí iný). (7) Upravené: nález 333 '
      '(výsledky K48 a K49; presunutý do `polozky_nove_333.py` kvôli limitu 500 riadkov), tabuľka PR, fronta (333 je teraz '
      'dávka K50), poradie, README, šablóna karty a stav. '
      '(8) Prehľad: nálezy 1–356, zatvorené 14, hotové 142, PRED 48, PO 132; čakajúcich rozhodnutí 10 z 66. Dopad na E2E: '
      'žiadny.'),
    ('21. 11. 2026',
      'Doplnok 2 vetvy 192 (PR #305; `main` ostáva `8c49c5b7`). (1) Kontrola PR #305: CI (`checks`, `backend-postgres`) zelené, '
      'CodeRabbit 3 pripomienky (všetky Minor). Agent ich overil voči súborom, všetky tri sú platné a opravené v tejto vetve: (a) '
      'skript `compare.py` v `karty/K46_podklady.md` končil pri rozdieloch s kódom 0 (pridané ukončenie s kódom 1, ak je `bad` '
      'nenulové); (b) odporúčanie R63 stále vyberalo (3a), hoci text otázky po R65 (a) ponecháva len (3c) (odporúčanie je teraz '
      '(3c) s odôvodnením podľa R65 (a) a R66 (a); ostatné štyri otázky sa nezmenili); (c) pole `kedy` pri R66 žiadalo odpoveď '
      'až pred K56, čím by sa vylúčili možnosti (b) a (d); po odpovedi majiteľa je rozhodnutie zodpovedané. Vlákna na GitHube '
      'zatvára majiteľ. (2) Odpoveď majiteľa 21. 11. 2026: R66 podľa odporúčania (a): opravy 355 a 356 idú v samostatnej malej '
      'dávke K56 po poslednom presune a redizajn (344 a 261) začne až po nej. Kolegovi pošle majiteľ prácu (kartu K48) až po '
      'zlúčení vetvy 192; chce ísť postupne, jedna vec naraz (výslovne: toto treba rešpektovať), preto agent nemapuje a '
      'nepripravuje nič ďalšie (ani rekapituláciu a vizuálny návrh redizajnu, ani ďalšie karty), kým majiteľ nepovie; agent z '
      'toho vyvodil, že karta K49 ide kolegovi až po zlúčení K48 (karty K48 a K49 a porovnanie K46 sú upravené). (3) Upravené: '
      'R63, R66, nálezy 333, 355 a 356, fronta, README, karty K48, K49 a porovnanie K46 a podklady K46. (4) Prehľad: nálezy '
      '1–356, zatvorené 14, hotové 142, PRED 48, PO 132; čakajúcich rozhodnutí 10 z 66. Dopad na E2E: žiadny.'),
    ('21. 11. 2026',
      'Doplnok vetvy 192 (`main` ostáva `8c49c5b7`; PR k vetve 192 ešte nie je). (1) Porovnanie dvoch nezávislých mapovaní K46: '
      'kolega (`karty/K46_vysledok.md`, prevzaté bez zmeny obsahu) a agent (`karty/K46_agent.md`; podklady so sondou, ukážkami '
      'testov a tabuľkou 166 skúšobných pokazení sú v `karty/K46_podklady.md`); porovnanie a dohodnutý postup sú v '
      '`karty/K46_porovnanie.md`. Zhoda: karta aj mobilný detail sa dajú deliť čistými presunmi (karta 1 033 → asi 440 až 480 '
      'riadkov, mobilný detail 594 → asi 350), najväčším rizikom sú medzery v existujúcich testoch (kolega 49 zo 121 '
      'pokazení karty, agent 84 zo 166 neodhalili žiadne testy), pružný stĺpec okna stráži len odtlačok HTML a obe mapovania '
      'našli tú istú chybu okna zdieľania. (2) Overenie agenta v kópii `frontend` mimo repozitára (`main` `8c49c5b7`): chyba, '
      'ktorú našiel kolega (obnova feedu počas lajku), sa reprodukuje na pôvodnej karte; zmazanie z mobilného detailu nemá žiadny test (8 z '
      '8 pokazení prežilo aj proti 80 súborom testov, prežili aj zásahy do menu a zdieľania); test fokusu po Escape prechádza '
      'na dnešnom kóde a zachytí pokazenie H1; prototyp agenta (karta 1 033 → 481, mobilný detail 594 → 368) prešiel celým '
      'Jestom (620 sád, 9 386 testov), `tsc`, ESLint a `npm run build`, 82 z 82 pokazení po delení zachytených a 952 z 988 '
      'riadkov pôvodnej karty je doslovne v nových súboroch. (3) Dohodnutý postup (postup kolegu s doplnkami agenta): K48 '
      'ochrana karty (asi 35 testov v 9 súboroch, dočasný odtlačok HTML zo stavov oboch mapovaní a dočasná sonda poradia '
      'efektov), K49 ochrana mobilného detailu (asi 25 testov a odtlačok 4 až 5 stavov), K50 kroky a, g a b, K51 zdieľaný '
      'blok, K52 vrstvy a dialógy, K53 hlavička s menu, K54 efekty (tri hooky v troch commitoch, najrizikovejšia), K55 mobilný '
      'detail a zmazanie dočasných odtlačkov a sond, K56 opravy 355 a 356; odhad kolegu 5 až 7 dní práce (7 až 9 '
      'kalendárnych s ručnými testami); karty K48 a K49 sú napísané, ďalšie pripraví agent po zlúčení predchádzajúcej. (4) '
      'Nové nálezy: 355 (okno zdieľania ukáže po úprave vlastného príspevku starý text; obe mapovania) a 356 (obnova feedu '
      'počas prebiehajúceho lajku nechá v `currentPost` starý lajk; kolega, agent reprodukoval). Nové rozhodnutie R66 (kedy '
      'ich opraviť a kedy začne redizajn) čaká na majiteľa. (5) Upravené: fronta (333 je teraz dávka K48), nález 333, '
      'poradie, README a karta K46 (odkaz na výsledok). (6) Prehľad: nálezy 1–356, zatvorené 14, hotové 142, PRED 48, PO 132; '
      'čakajúcich rozhodnutí 11 z 66. Dopad na E2E: žiadny.'),
    ('21. 11. 2026',
      'Vetva 192 (vychádza z `main` `8c49c5b7`, teda po PR #304). (1) Zlúčené: PR #303 (vetva 191; 21. 11. 2026 o 06:55 UTC, '
      'merge `b2e7dc54`; len zoznam; CI zelené; vlákno CodeRabbitu k README ostalo formálne otvorené, no je zastarané a zatvára '
      'ho majiteľ) a PR #304 (K31, nález 341; o 07:11 UTC, merge `8c49c5b7`; jeden commit `906f7c32`, 2 súbory, +41 a −41 '
      'riadkov: `frontend/package.json` a `frontend/package-lock.json`). Kontrola agenta z GitHubu: CI (`checks`, '
      '`backend-postgres`) zelené, CodeRabbit (spustený ručne) bez pripomienok, Codex bez väčších problémov, otvorené vlákna '
      'nie sú; zmena sedí s popisom (`next` 16.4.3 → 16.4.5, `@next/env` a osem balíkov `@next/swc-*`, kód aplikácie sa '
      'nemenil). Neoverené ostáva: log nasadenia na Railway (build už nemá končiť výpisom o zraniteľnej verzii), dymový test '
      'majiteľa po nasadení a dym `@smoke` od Codexu. (2) Správa majiteľa 21. 11. 2026: zlúčil oba PR a dal kartu K46 '
      'kolegovi, teda R65 (a) je schválené (poriadne delenie `FeedPostCard.tsx` pred redizajnom, najprv mapovanie). Navyše '
      'chce dvojité mapovanie pre istotu: kým mapuje kolega, mapuje nezávisle aj agent; po dokončení kolegu pošle majiteľ '
      'agentovi jeho výsledok a agent obe mapovania porovná. Agent svoje mapovanie do porovnania nezverejní v repozitári, '
      'aby ostalo nezávislé. (3) Upravené: README (výnimka z pravidla, že mapuje kolega), fronta, poradie, nález 341 '
      '(hotový, PR #304), nálezy 229, 261, 333 a 344, rozhodnutie R65 (zodpovedané) a karta K46 (poznámka o dvojitom '
      'mapovaní). (4) Prehľad: nálezy 1–354, zatvorené 14, hotové 142, PRED 46, PO 132; čakajúcich rozhodnutí 10 z 65.'),
    ('21. 11. 2026',
      'Doplnok 3 vetvy 191 (PR #303; `main` ostáva `f0c4b789`; K31 stále nemá PR). (1) Odpoveď majiteľa 21. 11. 2026: krokom '
      'kolegu pred redizajnom je K31 (upgrade Next.js); plán, ktorý agent zhrnul (kolega urobí ten krok, po jeho zlúčení príde '
      'rekapitulácia a vizuálny návrh s odporúčaním, po 100 % dohode mapuje a implementuje agent; R67 z 23. 11. 2026 to zmenilo: kód píše kolega podľa presnej karty agenta), majiteľ potvrdil. (2) Otázka '
      'majiteľa: či nie je bezpečnejšie a lepšie rozdeliť `FeedPostCard.tsx` poriadne ešte pred redizajnom. Agent odporúča '
      'áno: nové rozhodnutie R65 (možnosti a až d, odporúčanie (a)) a napísaná karta `karty/K46.md` (mapovanie delenia '
      '`FeedPostCard.tsx` a posúdenie `FeedPostMobileDetail.tsx`, kód sa nemení, deväť bodov na overenie; predbežný rozbor '
      'agenta z čítania kódu: `ActionButton` 74-158, jediný komponent 160-1033 s 17 volaniami `useState` a 7 `useEffect`, '
      'JSX 555-1033; kartu vykresľuje 22 testových súborov). Mapovanie na K31 nezávisí; samotné delenie sa začne po zlúčení '
      'K31 a po schválení výsledku mapovania; odoslanie karty kolegovi je súhlas s R65 (a). Hrubý odhad agenta (neoverený): '
      '4 až 6 dní. (3) Upravené: fronta (K46 je prvá, 344 a 261 idú po delení), nálezy 333, 344 a 261, rozhodnutie R63 (bod '
      '3 závisí od R65), README a poradie (vlny 0 a 2). (4) Prehľad: nálezy 1–354, zatvorené 14, hotové 141 (+1 čaká na '
      'zlúčenie: 341), PRED 46, PO 132; čakajúcich rozhodnutí 11 z 65.'),
    ('20. 11. 2026',
      'Doplnok 2 vetvy 191 (PR #303; `main` ostáva `f0c4b789`). (1) Nález CodeRabbitu, ktorý majiteľ spomenul 20. 11. 2026, '
      'je jediný, ktorý bot k PR #303 dal (README, mapovanie pri nálezoch HNEĎ); je opravený v commite `bd694e02` (vlákno je '
      'zastarané, no otvorené; zatvára ho majiteľ) a README je teraz zosúladené aj s dohodou nižšie. (2) Rozhodnutia majiteľa '
      '20. 11. 2026: (a) R64 zodpovedané: keď sa na 100 % dohodne, čo a ako bude vyzerať, mapovanie (znova) aj implementáciu '
      'redizajnu komentárov (261) a rozloženia okna príspevkov na počítači (344: ponuka, portfólio a text) robí agent, nie '
      'kolega; ak má agent nejasnosť, pýta sa; (b) pred tým urobí kolega ešte jeden krok a po jeho zlúčení príde '
      'rekapitulácia: agent pošle vizuálny návrh, ako to bude vyzerať, s odporúčaním (nie hneď, R49), a až po 100 % dohode sa '
      'začne mapovanie a implementácia; ktorý krok kolegu to je (K31, alebo delenie `FeedPostCard.tsx` kvôli natiahnutiu '
      'fotky karty ako pri príspevku s foto), sa upresňuje; (c) R63 ostáva otvorené a rozhodne sa pri rekapitulácii. (3) '
      'Upravené: README (výnimky z mapovania kolegom, tabuľka „Kto čo robí“), fronta (344 a 261 robí agent po 100 % dohode, '
      'karta pre kolegu sa nepíše), stav, nálezy 344 a 261 a rozhodnutia R63 a R64. (4) Prehľad: nálezy 1–354, zatvorené 14, '
      'hotové 141 (+1 čaká na zlúčenie: 341), PRED 46, PO 132; čakajúcich rozhodnutí 10 z 64.'),
    ('20. 11. 2026',
      'Doplnok vetvy 191 (PR #303; `main` ostáva `f0c4b789`). (1) Kontrola PR #303 (20. 11. 2026): CodeRabbit 1 pripomienka '
      '(Minor, platná): rozpor v README medzi pravidlom, že mapovanie nálezov od 18. 11. 2026 robí kolega a agent ich '
      'nemapuje, a časťou „Keď niečo zlyhá (nález HNEĎ)“, kde príčinu mapuje agent; opravené výslovnou výnimkou pre nález '
      'HNEĎ v oboch častiach (do rozhodnutia R64). CI zelené. (2) Správa majiteľa 20. 11. 2026 k bodu 3 v R63: ponuka a '
      'portfólio majú v okne na počítači fungovať „tak ako príspevok s foto“, teda fotka karty vyplní zvyšok ľavého stĺpca. '
      'Agent overil čítaním kódu, že tvrdenie z mapovania 344, že natiahnutie karty ide bez zásahu do `FeedPostCard.tsx`, sa '
      'nepotvrdilo (kartu vykresľuje len `FeedPostCard.tsx:803-815` bez výšky a obal `:781-799` je blok, nie flex stĺpec; pri '
      'fotke príspevku je fotka v pružnom bloku `feed-post-media-fill`, `:742-760`). Dva stĺpce a úzke okno len s textom bez '
      'zásahu do `FeedPostCard.tsx` ostávajú v platnosti. Opravený je nález 344, rozhodnutie R63 (bod 3: najprv rozloženie a '
      'natiahnutie po vyčlenení zdieľaného bloku, alebo jednorazová výnimka pre `FeedPostCard.tsx`, alebo všetko po delení '
      'K46), záznam vo fronte, poznámka v `karty/K45_vysledok.md` a README. (3) Prehľad nezmenený: nálezy 1–354, zatvorené '
      '14, hotové 141 (+1 čaká na zlúčenie: 341), PRED 46, PO 132; čakajúcich rozhodnutí 11 z 64.'),
    ('20. 11. 2026',
      'Vetva 191 (vychádza z `main` `f0c4b789`, teda po PR #302). (1) Zlúčené: PR #299 (vetva 190; 20. 11. 2026 o 06:10 UTC, '
      'merge `77204a57`), PR #300 (Codex, `e2e/notifikacie-prekliky`; o 06:37 UTC, merge `1c454330`; len dokumentácia: živé '
      'overenie šiestich preklikov upozornení z 19. 11. na `main` `bc4391dc`, 6 prešlo, 0 zlyhalo, 0 preskočených), PR #301 '
      '(Codex, `e2e/komentare-345-346`; o 10:54 UTC, merge `7481c4e4`; 18 súborov, +876 a −33 riadkov: E2E regresie 345 a '
      '346, lokálne overené, živý beh zatiaľ nebehol; kontrola CodeRabbitu a Codexu mala 6 pripomienok, riešené v troch '
      'ďalších commitoch, štyri vlákna ostali formálne otvorené, no sú zastarané; CI zelené) a PR #302 (K45; o 11:12 UTC, '
      'merge `f0c4b789`; päť nových súborov testov, +1 198 riadkov; CI zelené, CodeRabbit nebehol (repozitár nemá automatické '
      'kontroly), Codex bez väčších problémov). (2) K45 (PR #302): časť 1: päť nových súborov testov (34 testov: poradie '
      'zápisu pri mutáciách, výsledky a stav „odosiela sa“, ochrany hooku, medzery načítania), celý Jest 620 sád a 9 386 '
      'testov, z 47 mutácií zachytených 42 (pred novými testami 9), prežilo 5 nepozorovateľných (W7, R3, R6, R7, LR1; agent '
      'overil čítaním servera, že LR1 je nepozorovateľná: náhľad vkladá 10 najnovších odpovedí a donačítavanie berie len '
      'staršie); produkčný kód ani existujúce testy sa nemenili. Časť 2: mapovanie 344 (výsledok `karty/K45_vysledok.md`, '
      'zapísané v náleze 344): obe zmeny sa dajú urobiť bez zásahu do `FeedPostCard.tsx` (dve malé úpravy v '
      '`FeedPostDetailOverlay.tsx` a `FeedPostDetailSplitLayout.tsx`, jedna dávka v dvoch commitoch), prototyp v kópii zlomil '
      'presne 4 existujúce testy, žiadny špec E2E nepadne; agent overil kľúčové tvrdenia čítaním kódu na `main` (riadky v '
      'piatich súboroch, štyri testy a E2E odkazy sedia). Delenie `FeedPostCard.tsx` nie je podmienkou. Odporúčané poradie: '
      '344 pred redizajnom komentárov; päť drobností na rozhodnutie je nové R63. (3) K31 (Next.js 16.4.5, nález 341): vetva '
      '`K31` (commit `906f7c32` nad `1c454330`) je nahratá, PR k nej ešte nie je a v `main` nie je (CI nebežalo); agent '
      'overil obsah (2 súbory, 10 balíkov v zámku, všetko z `registry.npmjs.org`, bez konfliktu s `main`) a vlastným `npm '
      'audit --omit=dev`: `main` 6 záznamov (`next` so siedmimi upozorneniami), vetva 5 záznamov bez `next` (nález 229). '
      'Nález 341 je zapísaný ako opravený, čaká na PR a zlúčenie. (4) Ručné testy majiteľa (20. 11. 2026): otestované, čo '
      'išlo, bez nálezov (K45 nemení produkčný kód a K31 nie je zlúčená, takže sa nenasadila). (5) Kandidát z K31: nový nález '
      '354 (prázdny koreňový `package-lock.json`, varovanie pri zostavení). K nálezu 229 pribudol doplnok (po K31 ostáva 5 '
      'záznamov, `npm audit` ponúka `@sentry/nextjs` 11.15.0, nová hlavná verzia). (6) Otázky majiteľa 20. 11. 2026: čo ešte '
      'treba pred redizajnom komentárov a oknom na počítači a prečo mapoval kolega: odpoveď v správe; rozdelenie práce (kto '
      'navrhuje vzhľad, kto mapuje, kto píše kód, kto kontroluje) je nové rozhodnutie R64. (7) Prehľad: nálezy 1–354, '
      'zatvorené 14, hotové 141 (+1 čaká na zlúčenie: 341), PRED 46, PO 132; čakajúcich rozhodnutí 11 z 64. Dopad na E2E: '
      'Codex po zlúčení a nasadení K31 spustí dym `@smoke`; živý beh nových regresií 345 a 346 čaká na okno a údaje.'),
    ('20. 11. 2026',
      'Doplnok vetvy 190 (PR #299; `main` ostáva `bc4391dc`). (1) Kontrola PR #299 (20. 11. 2026): CodeRabbit 1 pripomienka '
      '(Minor, platná), Codex bez nálezov, CI (`checks`, `backend-postgres`) zelené. Pripomienka: údaj „najneskôr do 8 s“ pri '
      'obnove po zlyhaní donačítania (nález 351, K43) platí len pri aktívnom pollingu. Agent to overil čítaním '
      '`useFeedCommentsPolling.ts`: polling beží každých 8 s, no tik sa preskočí pri skrytej karte a po piatich minútach bez '
      'činnosti používateľa; po udalosti `online` sa obnova robí hneď (`useFeedCommentsLoader.ts`). Opravené je znenie v '
      '`hotove_k40.py`, v rozhodnutí R61 (otázka a odporúčanie) a v `karty/K43_vysledok.md` (dve spresnenia v hranatých '
      'zátvorkách, obsah strany inak bez zmeny); rovnaké staršie znenie v už zlúčených stranách (`karty/K41_vysledok.md`, '
      '`karty/K43.md`) sa neupravovalo, lebo ide o históriu. (2) Majiteľ 20. 11. 2026: rozhodnutie R62 podľa odporúčania (a): '
      'popisy nových testov po slovensky, staré sa neprekladajú; veta je doplnená do `AGENTS.md` a do '
      '`.cursor/rules/svaply.mdc`, karta K45 aj poznámka sú zosúladené. Pole na text pri odpovedi na komentár sa rieši až pri '
      'redizajne (K44), nič sa kvôli tomu nezapisuje. (3) Prehľad: nálezy 1–353, zatvorené 14, hotové 141, PRED 47, PO 131; '
      'čakajúcich rozhodnutí 9 z 62. Dopad na E2E: žiadny.'),
] + ZMENY_STARSIE_2 + ZMENY_STARSIE

# Nálezy opravené po prvom vydaní (`DONE_SINCE`), tabuľka PR (`DONE_PR_TABLE`) a popis série Upozornenia (`SERIA_UPOZORNENIA`) sú v
# `hotove.py`; tu sa len sprístupňujú pod pôvodnými názvami, aby ostatné moduly ostali nezmenené.
from hotove import DONE_PR_TABLE, DONE_PR_TABLE_CASTOCNE, DONE_SINCE, SERIA_UPOZORNENIA  # noqa: F401

# Odporúčané poradie práce (vlny). `polozky` sú ID, ktoré text vlny spomína: kontrola v `model.py` zlyhá, ak nejaké z nich
# už nie je otvorené, aby text vlny nezostal zastaraný.
PORADIE = [
    dict(vlna='0 – najprv',
         co='Rýchle upgrady z 183 a 184 bez veľkého rizika: backend (Pillow, gunicorn, requests, DRF, simplejwt, daphne, python-dotenv, bleach, '
            'Django 4.2.30, odstránenie allauth) je hotový a zlúčený (vetva 143, PR #203), frontend (`npm audit fix`, odstránený `next-intl`) je '
            'zlúčený (vetva 142). Skok `next` 14 → 16 je hotový vo vetve 159; Django 5.2 je zlúčený (vetva 154, PR #214), protobuf opravený '
            '(vetva 158, PR #217) a zo 183 ostáva len vývojový `pytest` (skupina po nasadení); upgrade `next` na 16.4.5 (341, bezpečnostné upozornenie) je hotový a zlúčený (K31, PR #304, 21. 11. 2026)',
         preco='Malé a bezpečné. Zraniteľné verzie zmiznú skôr, než pribudne ďalší kód.',
         polozky=['183']),
    dict(vlna='1 – základ, kým sa aplikácia dokončuje',
         co='Veľké skoky verzií sú hotové (Django 5.2 LTS s DRF 3.18.3 vo vetve 154, `google-cloud-vision` s protobuf vo vetve 158, '
            'Next 16 s Reactom 19 vo vetve 159) a balík „Produkčná odolnosť aplikácie“ (179, 234, 33, 9, 52 vo vetve 161; 214, 236 a 232 '
            'zlúčené vo vetve 165, PR #230; 246 v K12, PR #242; 296 v K13, PR #244; ostáva 245: overenie v logoch Railway; nový nález HNEĎ '
            '318 je zatvorený: push na iPhone nechodil pre nastavenie rollout 5 % v Railway, R33); ďalej 185, OW-07, '
            'overenie súkromia obrázkov správ (266), politika S3 bucketu v README (304) a balík „Spoľahlivosť CI a testov“ (31, TEST-…, 189, 209, 223, '
            '225, 295; 212 je '
            'hotová vo vetve 157, 228 v K6, 194 a časť 204 v K12, 244 v K14, 328 v PR #261)',
         preco='Veľké skoky verzií sú najlacnejšie teraz, kým je kódu najmenej, a hneď po nich treba spustiť celé testy.',
         polozky=['245', '185', 'OW-07', '266', '304', '31', '189', '209', '223', '225', '295']),
    dict(vlna='2 – viditeľné chyby a overenia (iPhone a mobil)',
         co='Navigácia a Späť (13, 14, 174), plynulosť prechodov na mobile (283 až 285 a 289: zvyšky po 276; 286 je hotová v K14, jej zvyšky 308 až 310 sú hotové v K16 a 311 je zatvorený rozhodnutím R38; 287 a 288 '
            'idú podľa R28 po overení na iPhone), Profil a identita (81, 272; 320 je hotová v K15), Zdieľanie a obrázky '
            '(92, 207; 301 je hotová v K13), ponuky a tagy (322 a 323 sú hotové v K15), '
            'natívne okná `alert()` namiesto toastov (302 je hotová v K17), recenzie (325 a 331 sú hotové v K21, 334 v K22, 336 v K24 a 326 a 327 v K18), Upozornenia a '
            'push (319 prepínač offline: kód je v K20, čaká na ručný test; 321 kategórie upozornení sú hotové (K19, K20, K23 a K25; zvyšok E2E je nález 337); 330 gulička Žiadostí pri vypnutej kategórii je hotová v K21, R39), Upozornenia '
            'na zmazaný obsah (74), Žiadosti (17), '
            'Vyhľadávanie a Sledovania (OW-11, OW-14, OW-17, OW-05), mobilný onboarding nových používateľov (252), vzhľad Nástenky '
            '(259 a 261; redizajn komentárov má schválený vzhľad (R52); delenie veľkých súborov Nástenky je hotové (nález 333: `FeedPostComments.tsx` K28 až K42, `FeedPostCard.tsx` a `FeedPostMobileDetail.tsx` K46 až K55), K40 až K43 a K45 sú hotové, K31 je zlúčená (PR #304) a podľa R59, dohody s majiteľom (20. a 21. 11. 2026) a R65 (a) sa redizajn komentárov a okno na počítači (344) začnú až po opravách 355 a 356 v K56 (delenie `FeedPostCard.tsx` a mobilného detailu je hotové), rekapitulácii a vizuálnom návrhu; karty píše agent a kód kolega (R67, zmena R64); rieši sa pri ňom aj pole na text pri odpovedi na komentár; 338 zaseknuté načítavanie komentárov je hotové v K41, 342 zmiznutý príspevok pri odpovedi, úprave a zmazaní a 351 slučka chybových hlásení pri donačítaní komentárov a odpovedí bez internetu sú hotové v K43; 353 drobná hláška pri zastaranom zlyhaní odpovedí; 355 okno zdieľania po úprave a 356 starý lajk v detaile po obnove feedu počas lajku (z mapovania K46) sú hotové v K56; 357 až 360 (ručný test K51: repost bez „Viac“, text pri zdieľanej ponuke a portfóliu, označenia ako obyčajný text, starý spôsob zobrazenia príspevku na mobile; idú po redizajne); zoznam lajkujúcich pri ponukách, portfóliu a profile 262, R20: backend je hotový v K27, vzhľad je schválený (R51 a R56) a frontend ide po etapách; úchytka panela nad fotkou 343, okno detailu na počítači 344 (mapovanie kolegu hotové v K45; po odpovediach majiteľa 23. 11. 2026 na R63 a R68 napísal agent kartu K57, kód píše kolega, R67); 345 a 350 sú hotové v K39 a 346 viditeľnosť nového komentára na iPhone v K40) a drobnosti zo 36, živé '
            'overenie N16, RET-01..03 a ručný test VoiceOverom (294)',
         preco='To uvidí každý nový používateľ hneď prvý deň. Overenia (N16, RET-01..03, 294) sa dajú robiť už teraz na Railway a na iPhone.',
         polozky=['13', '14', '174', '283', '284', '285', '287', '288', '289', '81', '272', '92', '207', '319', '262', '343', '344', '353', '357', '358', '359', '360', '74', '17', 'OW-11', 'OW-14', 'OW-17', 'OW-05', '252', '259', '261', '36', '294', 'N16', 'RET-01', 'RET-02', 'RET-03']),
    dict(vlna='3 – texty a súkromie',
         co='175, 176, 204, APP-03 a 186 (R2: všetkých šesť jazykov pred štartom; 332 je hotová v K21, 335 (atribút `lang` na `<html>`) v K22; 120 a 177 sú hotové v K6; 297 v K13; 306 surový „Network Error“ v toastoch v K15) a súkromie: 347 (ponuky účtov staff a superuser cez priame id; najprv rozhodnúť, či je to zámer), 348 (osirotená recenzia '
            'neaktívneho hodnoteného používateľa) a 349 (deaktivovaný účet a cache autentifikácie; najprv rozhodnúť dôležitosť); 339 je hotová v K30',
         preco='Všetkých šesť jazykov (sk, cs, hu, de, pl, en) musí byť pri štarte hotových (R2, 13. 11. 2026).',
         polozky=['175', '176', '204', 'APP-03', '186', '347', '348', '349']),
    dict(vlna='4 – keď bude aplikácia hotová',
         co='Príprava ostrého nasadenia N1–N15 (hosting, doména, právne dokumenty, server, zálohy, monitoring, smoke test), OW-06 a 180 '
            '(diagnostiku 180 možno začať už teraz)',
         preco='Robí sa na novom serveri po dokončení aplikácie.',
         polozky=['N%d' % i for i in range(1, 16)] + ['OW-06', '180']),
    dict(vlna='5 – po nasadení',
         co='Časť 5: funkcie, upratovanie, výkon, nástroje',
         preco='Podľa spätnej väzby od prvých používateľov.',
         polozky=[]),
]

# Rozhodnutia, ktoré patria používateľovi. Po odpovedi sa vyplní `odpoved` a `datum` (zobrazí sa v časti „Rozhodnuté“).
DECISIONS = [
    dict(id='R1', tema='Hosting (N1)',
         otazka='Kam nasadiť ostrú verziu pre ostatných používateľov (Railway ostáva len na testy)?',
         odporucanie='Hetzner Cloud (EÚ) + Coolify + Cloudflare + R2 (príloha C). Pre čo najmenej starostí so serverom, ak to rozpočet unesie: '
                     'Render (Frankfurt) alebo Scalingo.',
         kedy='Až keď bude aplikácia hotová. Teraz netreba.'),
    dict(id='R2', tema='Jazyky pri štarte (176, 175, APP-03)',
         otazka='Ktoré jazyky majú byť pri štarte plne preložené?',
         odporucanie='Podľa cieľového trhu. V profile a vyhľadávaní chýbajú preklady hlavne v češtine (~30) a poľštine (~14), v nemčine jeden; '
                     'v celej aplikácii má čeština asi 210 a poľština asi 90 slovenských kópií (176). Meranie kolegu z 6. 11. 2026 (hodnoty zhodné so '
                     'slovenčinou) ukázalo viac: v `cs.json` 247 (aspoň 29 určite slovenských), v `pl.json` 49, v `de.json` 3 a v `hu.json` 1, '
                     'takže rozsah 176 je väčší, než sa čakalo. Ak štart cieli len na Slovensko, 176 môže ísť po nasadení; ak aj na Česko a '
                     'Poľsko, patrí pred štart. Malé veci (120 a 177 sú hotové v K6, ostáva zvyšok 175) idú pred štart v každom prípade.',
         kedy='Rozhodnuté 13. 11. 2026.',
         odpoved='Majiteľ 13. 11. 2026: všetkých šesť jazykov aplikácie (slovenčina, čeština, maďarčina, nemčina, poľština a angličtina) '
                 'má byť pri štarte plne preložených. Majiteľ najprv odpovedal na inú vec: ako sa má jazyk vyberať (Slovensko '
                 'slovenčina, Česko čeština, Maďarsko maďarčina, Rakúsko nemčina, Poľsko poľština a zvyšok sveta angličtina); agent '
                 'vysvetlil, že R2 sa pýtal na rozsah prekladov, a z odpovede vyvodil, že každý z týchto jazykov musí byť hotový, čo '
                 'majiteľ potvrdil („určite áno“). Nález 176 (zvyšné slovenské kópie v češtine, poľštine, nemčine a maďarčine; meranie '
                 'kolegu z 6. 11. 2026: cs 247, pl 49, de 3 a hu 1 hodnôt zhodných so slovenčinou, časť sú legitímne rovnaké slová) a '
                 'súvisiace 175 a APP-03 idú pred štart a poradie jazykov netreba určovať. Výber jazyka podľa krajiny aplikácia už robí '
                 '(`LanguageContext.tsx`: krajina z IP adresy dá PL, SK, CZ a HU ich jazyk a DE a AT nemčinu, inak jazyk prehliadača, '
                 'inak slovenčina; ručná voľba v Nastaveniach má prednosť a ukladá sa v prehliadači). Rozdiel oproti pravidlu majiteľa '
                 '(zvyšok sveta má dostať angličtinu) rieši nález 332 (hotový v K21, PR #260); jazyk prehliadača alebo telefónu ostáva druhým signálom '
                 '(majiteľ 13. 11. 2026: podľa odporúčania agenta). Spôsob zisťovania krajiny (dnes cudzia služba `ipapi.co` z '
                 'prehliadača) rieši nález 186 a R7 pred štartom.',
         datum='13. 11. 2026'),
    dict(id='R3', tema='Číselné slugy (81)',
         otazka='Zakázať slug zložený len z číslic, alebo ho vo frontende uprednostniť pred ID?',
         odporucanie='Zakázať pri generovaní (predpona `u-`) a doplniť migráciu existujúcich. Frontendová záplata nerieši, že dve rôzne veci majú '
                     'rovnaký tvar.',
         kedy='Pred prácou na 81.'),
    dict(id='R4', tema='Zmazaný komentár v upozornení (74)',
         otazka='Čo má urobiť klik na upozornenie, ktorého komentár už neexistuje?',
         odporucanie='Otvoriť príspevok a ukázať krátku hlášku „komentár už nie je“, aby používateľ nezostal na slepej ceste. Pri zmazanom '
                     'príspevku platí hláška z opravy 111.',
         kedy='Pred prácou na 74.'),
    dict(id='R5', tema='Otváracie hodiny vo výsledkoch (OW-14)',
         otazka='Čo s nefunkčným tlačidlom Otváracie hodiny pri firemnej ponuke vo výsledkoch?',
         odporucanie='Doplniť popover (API údaje posiela, vzor je v profile). Ak by to bolo príliš veľké, dočasne tlačidlo skryť, aby tam nebolo '
                     'mŕtve.',
         kedy='Pred prácou na OW-14.'),
    dict(id='R6', tema='Mobilné výsledky Sledovaní v iOS PWA (OW-05)',
         otazka='Majú byť hotové pred štartom?',
         odporucanie='Až po štarte, ak Sledovania nie sú hlavná funkcia pri štarte. Je to rozšírenie (plán mobilných výsledkov), nie oprava. '
                     'Pred štartom stačí overiť, že používateľ nenarazí na slepú uličku.',
         kedy='Pred prácou na OW-05.'),
    dict(id='R7', tema='Zistenie krajiny (186)',
         otazka='Ako zisťovať krajinu používateľa bez volania cudzej služby z prehliadača?',
         odporucanie='Ak ostane Cloudflare: hlavička `CF-IPCountry` (bez tretej strany v prehliadači). Inak GeoIP databáza na backende. Volanie '
                     '`ipapi.co` z prehliadača odstrániť.',
         kedy='Až pri príprave štartu (186).'),
    dict(id='R8', tema='Django a backend balíky (183)',
         otazka='V akom poradí robiť upgrady backendu?',
         odporucanie='Najprv rýchle upgrady bez veľkého rizika (Pillow, gunicorn, requests, DRF, simplejwt, daphne, python-dotenv, bleach) a '
                     'odstránenie nepoužívaného allauth, potom samostatný balík Django 5.2 LTS. Každý na vlastnej vetve s celými backendovými testami.',
         kedy='Pred prácou na 183.',
         odpoved='Podľa odporúčania: najprv rýchle upgrady a odstránenie allauth (183a, vetva 143), potom samostatný balík Django 5.2 LTS (183b); '
                 'každý na vlastnej vetve s celými backendovými testami.',
         datum='27. 10. 2026'),
    dict(id='R9', tema='Next.js 14 → 15 / 16 (184)',
         otazka='Povýšiť Next pred štartom a kde bude frontend bežať?',
         odporucanie='Samostatný balík pred štartom (pravdepodobne aj React 19, viď 153). Frontend nechať na vlastnom serveri a zraniteľnosť '
                     'odstrániť upgradom, nie presunom na Vercel (C.4).',
         kedy='Pred prácou na 184; časť o hostingu frontendu až neskôr (R1).',
         odpoved='Podľa odporúčania: samostatná vetva 159 pred štartom s Next 16.4.3 a Reactom 19.3.1; frontend ostáva na vlastnom serveri, '
                 'nie na Verceli. Majiteľ odsúhlasil aj plán s upozornením na novú minimálnu podporu Safari 16.4 (iOS 16.4).',
         datum='31. 10. 2026'),
    dict(id='R10', tema='Obrazová moderácia pri výpadku (N10)',
         otazka='Čo robiť, keď Google Vision nie je dostupný?',
         odporucanie='Produkcia je už nastavená „fail-closed“: obrázok sa odmietne s hláškou „Kontrola bezpečnosti obrázka zlyhala, skúste neskôr.“ '
                     'Odporúčanie je ponechať (bezpečnejšie), len počítať s tým, že pri výpadku Google sa nedajú nahrať obrázky, a sledovať kvóty.',
         kedy='Až pri príprave štartu (N10); stačí potvrdiť.'),
    dict(id='R11', tema='Stará bezpečnostná správa (185)',
         otazka='Čo so zastaranou správou `SECURITY_AUDIT_REPORT.md` z roku 2024?',
         odporucanie='Archivovať mimo repozitára (alebo prepísať podľa dnešného stavu) a overiť, či je repozitár verejný: interné audity a poznámky '
                     'o rizikách tam nepatria.',
         kedy='Pred prácou na 185.'),
    dict(id='R12', tema='Dvojfázové overenie – 2FA (235)',
         otazka='Dokončiť 2FA (zapnutie, QR kód, záložné kódy, zadanie kódu pri prihlásení) pred štartom, alebo až po ňom?',
         odporucanie='Až po nasadení. Cez aplikáciu si ho dnes nemôže zapnúť nikto (zapnúť sa dá len ručne v databáze), takže jeho chýbanie bežným používateľom '
                     'neškodí; dokončenie je väčšia práca '
                     '(koncové body, QR kód, záložné kódy, obrazovky vo všetkých jazykoch, ochrana pred opakovaním kódu, testy). Ak má byť '
                     '2FA pri štarte (napr. kvôli firemným účtom), patrí do vlny 1.',
         kedy='Pred prácou na 235; dovtedy sa 2FA používateľom neponúka.'),
]

# Rozhodnutia R13–R40 (zoznam majiteľa v prílohe D a rozhodnutia po ňom) sú v `rozhodnutia_nastenka.py` a R41 a ďalšie v
# `rozhodnutia_dalsie.py` (kvôli limitu 500 riadkov); pripájajú sa sem.
from rozhodnutia_nastenka import DECISIONS_NASTENKA  # noqa: E402
from rozhodnutia_dalsie import DECISIONS_DALSIE  # noqa: E402

DECISIONS.extend(DECISIONS_NASTENKA)
DECISIONS.extend(DECISIONS_DALSIE)

# Rozhodnutia od R66 (po dvojitom mapovaní K46) sú v `rozhodnutia_k46.py`.
from rozhodnutia_k46 import DECISIONS_K46  # noqa: E402

DECISIONS.extend(DECISIONS_K46)
