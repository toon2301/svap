# -*- coding: utf-8 -*-
"""Poradie prác pre kolegu (dávky) a voliteľný stav ich riešenia.

Poradie je návrh agenta (malé, lokálne zmeny s nízkym rizikom, ktoré nemenia súbory nad 500 riadkov); schvaľuje majiteľ. Od 6. 11. 2026 smie
kolega robiť aj nálezy PRED NASADENÍM a HNEĎ (predtým len PO NASADENÍ), preto fronta smie obsahovať ktorýkoľvek otvorený nález. Súbor sa
upravuje len pri zmene poradia alebo keď je nález hotový:
- keď je nález hotový, záznam sa odstráni odtiaľto a nález sa presunie do `hotove_k40.DONE_SINCE_K40` (nálezy opravené od PR #297, 19. 11. 2026; z 13. 11. 2026 do PR #295 sú v `hotove_k20.DONE_SINCE_K20`, staršie v `hotove_dalsie.py` a `hotove.py`);
- stav riešenia je voliteľný: ak sa zapíše, vyplnia sa spolu `kto`, `stav` (`STAV_ROZROBENE` alebo `STAV_CAKA`) a `od` (dátum).

Od 5. 11. 2026 sa polia `kto`, `stav` a `od` pri práci kolegu nevyplňujú: v kóde pracuje vždy len jeden a začiatok aj koniec práce
hlási majiteľ (postup je v `README.md`, časť „Postup s kolegom“). Záznam bez týchto polí sa v zozname zobrazí ako „nesleduje sa“,
nie ako voľný, lebo kým kolega pracuje, zoznam o tom nevie. Polia a ich kontrola ostávajú pre prípad, že by sa postup zmenil.

Dávky K1 až K30, K36 až K43 a K45 sú zlúčené (K6 až K18 sú v `hotove_dalsie.py`, K19, K20, K23 a K25 sú v nálezu 321 a K21, K22 a K24 sú v `hotove_k20.py`; z K16 zostáva ručný test nálezu 319, z K17 nič, lebo nález 311 majiteľ 12. 11. 2026 uzavrel (R38), z K18 nič, lebo toast pri nálezu 325 je v K21, a z K20 a K23 nič, lebo zvyšok E2E nálezu 321 je nález 337; K26, K27 a K28 sú zapísané v nálezoch 333 a 262, ktoré ostávajú otvorené): K8 (mapovanie nálezov 275, 274 a 276) sa robila na dva razy,
PR #237 a #238 (druhé kolo sa volalo K9), dávka drobných opráv (193, 279, 277, 281) išla ako K10 (PR #239), K11 (PR #241) bola o fotkách
na frontende (279, 293, 291 a 292, ktorý je PO NASADENÍ a majiteľ ho do dávky zaradil 7. 11. 2026), K12 (PR #242) o súkromí a CI (282, 246,
194 a časť 204), K13 (PR #244) o starom endpointe fotiek ponúk, zámkoch pri zmazaní účtu, CI prekladoch a toastoch (301, 296, 297 a časť
302), K14 (PR #245) o zámku závislostí, obnove prihlásenia a prechodných stavoch Nastavení (244, 286 a časť 245) a K15 (PR #250)
o obrazovke Popis ponuky na mobile, farbách polí pri zmene hesla a sieťovej chybe v toastoch (322, 323, 320 a 306) a K16 (PR #253) o
varovaní v Upozorneniach a o načítavaní Sledovania (308, 309 a 310) a K17 (PR #254) o ôsmich natívnych `alert()` a o roli `alert`
pri chybe Blokovaných (302 a 312) s mapovaním 311. Dávky K16 a K17 navrhol agent 8. a 9. 11. 2026 podľa ručných testov majiteľa po
K14: K16 začínala nálezom 319 (mapovanie, výsledok od kolegu čaká) a pokračovala zvyškami po 286 (308 až 310), K17 dopĺňala zvyšok
nálezov PRED NASADENÍM (302 s výnimkou R31, 311) a končila nálezom PO NASADENÍ 312 (karta `karty/K17.md`); K18 (PR #255) opravila tri chyby z ručných testov po K17 (327, 325 a 326; karta `karty/K18.md`; z 325 zostáva toast), K19 (PR #257) boli etapy 1 a 2 nálezu 321 (backend; karta `karty/K19.md`) a K20 (PR #258) etapa 3a nálezu 321 spolu s kódom opravy 319 (karta `karty/K20.md`); K21 (PR #260) boli malé opravy 331 (okno recenzie), 332 (jazyk pre zvyšok sveta), 330 (gulička Žiadostí, R39) a 325 (toast; karta `karty/K21.md`; opravu pripomienky CodeRabbitu urobil agent vo vetve K21 s povolením majiteľa); K22 (PR #264) boli dve malé opravy z ručných testov po K21, 334 (stará chybová hláška v okne „Pridať recenziu“) a 335 (atribút `lang` na `<html>`; karta `karty/K22.md`), K23 (PR #266) bola výzva na push (etapa 3b nálezu 321; karta `karty/K23.md`), K24 (PR #269) bola oprava 336 (anglické „Network Error“ v okne recenzie, výnimka R41; karta `karty/K24.md`), K25 (PR #270) opis hlavného vypínača aj na počítači (321, R42; karta `karty/K25.md`), K26 (mapovanie delenia `FeedPostComments.tsx`, 333, R23; karta `karty/K26.md`) a K27 (PR #275: backend zoznamu lajkujúcich, 262, R20; karta `karty/K27.md`) sú hotové, K28 (PR #278) je dávka 1 z 5 delenia `FeedPostComments.tsx` (333; karta `karty/K28.md`: len testy a dočasný odtlačok HTML) a hotová, K29 (PR #283) je dávka 2 z 5 delenia (333; karta `karty/K29.md`) a K30 (PR #286) oprava 339 (karta `karty/K30.md`), obe hotové, K36 (mapovanie 345 a 346; karta `karty/K36.md`), K37 (PR #289: dávka 3 z 5 delenia, 333; karta `karty/K37.md`), K38 (PR #291: dávka 4 z 5 delenia, 333; karta `karty/K38.md`), K39 (PR #292: oprava 345 a 350; karta `karty/K39.md`), K40 (PR #294: oprava 346; karta `karty/K40.md`), K41 (PR #295: oprava 338 a mapovanie 351; karta `karty/K41.md`), K42 (PR #297: posledná dávka delenia `FeedPostComments.tsx`, 333; karta `karty/K42.md`) a K43 (PR #298: opravy 342 a 351; karta `karty/K43.md`) sú hotové, K45 (PR #302: testy pre medzery z K42 a mapovanie 344; karta `karty/K45.md`) je hotová a K31 (upgrade Next.js, 341; karta `karty/K31.md`) je hotová vo vetve `K31`, PR ešte nie je, K47 na okno detailu na počítači (344; karta sa pripraví po odpovedi na R63), K44 na redizajn komentárov (261), K32 na preklady (176, najprv mapovanie), K33 na úchytku panela nad fotkou (343), K34 na frontend zoznamu lajkujúcich (262, etapa A, najprv mapovanie) a K46 na delenie `FeedPostCard.tsx` a `FeedPostMobileDetail.tsx` (333, najprv mapovanie). Nález HNEĎ 318
(push na iPhone) je zatvorený: príčinou bolo nastavenie v Railway (rollout 5 %), nie kód (R33). Zvyšok nálezu 245 (overenie v logoch Railway, prípadný `api.ts` s výnimkou) v poradí nie je: čaká na majiteľa. Nález 321 (kategórie upozornení; R32 (a): pred štartom) má plán po etapách v nálezu 321: etapy 1 a 2 sú zlúčené v K19, etapa 3a v K20 a etapa 3b (výzva na push) v K23 a opis vypínača na počítači v K25, takže nález 321 je hotový; E2E zvyšok je nález 337 (Codex). Dávky PO-A a PO-B sú pôvodne navrhnuté dávky zo 6. 11. 2026 (24, 22, 23, 26 a 247, 248, 250, 256) z nálezov
PO NASADENÍ; v zozname sa volali K9 a K10, potom K13 a K14, K15 a K16, K17 a K18, no tie označenia sa použili na iné dávky, preto
dostanú číslo K až vtedy, keď pôjdu kolegovi (pred ne pribudnú etapy nálezu 321). Kľúč `davka` je len označenie dávky pre čitateľa. Poradie dávok
určuje majiteľ (`SCHVALENE`). V poradí idú všetky nálezy HNEĎ a PRED NASADENÍM pred nálezmi PO NASADENÍ. Výnimku schvaľuje majiteľ a
zapíše sa slovom „Výnimka“ do textu `preco` pri nálezu (naposledy 292 v K11 a 302 v K17).

Každý záznam začína v `preco` slovom JASNÉ (kolega len rýchlo overí, že nález platí, a opraví) alebo NEJASNÉ (kolega najprv mapuje a vráti
zistenie; kód nemení, kým majiteľ nepovie); model to kontroluje (postup od K15, pozri `README.md`).

Kontrola v `model.py` zlyhá, ak záznam odkazuje na nález, ktorý už nie je otvorený (je hotový, zatvorený alebo neexistuje), takže
zoznam nemôže ticho zastarať.
"""

SCHVALENE = ('Majiteľ 6. 11. 2026 schválil striedanie 2 : 1 (dve dávky kolegu, potom jedna vetva agenta; kolega smie robiť aj nálezy '
             'PRED NASADENÍM a HNEĎ; majiteľ môže pomer dočasne zmeniť, napr. na 1 : 1). K6 až K30, K36 až K43 a K45 sú hotové (z '
             'K16 čaká ručný test 319; nález 311 z K17 majiteľ uzavrel, R38); vetvy agenta 167 až 174, 177, 178, 179 (PR #272), 180 '
             '(PR #273), 181 (PR #274), 182 (PR #277), 183 (PR #279), 184 (PR #282), 185 (PR #285), 186 (PR #288), 187 (PR #290), '
             '188 (PR #293), 189 (PR #296), 190 (PR #299) a 191 sú len zoznam, vetva 176 sú pravidlá pre agentov (`AGENTS.md`, R27) '
             'a vetva 175 (oprava vyhľadávania, PR #259) bola jednorazová výnimka majiteľa z 13. 11. 2026 (majiteľ 7. 11. 2026: '
             'opravy nálezov agentom sa odkladajú, kým majiteľ nedá vedieť); oprava pripomienky CodeRabbitu vo vetve K21 (commit '
             '`71f9cff4`) bola druhá jednorazová výnimka majiteľa z 13. 11. 2026, lebo kolega už nemohol vetvu upraviť. Dávku K21 '
             '(331 okno recenzie, 332 jazyk pre zvyšok sveta, 330 gulička Žiadostí a 325 toast; karta `karty/K21.md`) majiteľ '
             'schválil a kolega ju dokončil (PR #260, zlúčené 13. 11. 2026). Dávku K22 (334 stará chybová hláška v okne recenzie a '
             '335 atribút `lang`; karta `karty/K22.md`) navrhol agent 13. 11. 2026 po ručných testoch K21, majiteľ ju schválil a '
             'kolega ju dokončil (PR #264, zlúčené 15. 11. 2026). Dávku K23 (výzva na push, etapa 3b nálezu 321; karta '
             '`karty/K23.md`) pripravil agent 15. 11. 2026, majiteľ ju schválil a kolega ju dokončil (PR #266, zlúčené 15. 11. '
             '2026). Dávky K24 (oprava 336, výnimka R41; karta `karty/K24.md`) a K25 (opis hlavného vypínača aj na počítači, R42; '
             'karta `karty/K25.md`) majiteľ schválil a kolega ich dokončil (PR #269 a #270, zlúčené 16. 11. 2026). Dávku K26 '
             '(mapovanie delenia `FeedPostComments.tsx`, nález 333, R23; karta `karty/K26.md`) pripravil agent 16. 11. 2026 (PR '
             '#272), kolega ju dokončil a výsledok je zapísaný v nálezu 333 (`karty/K26_vysledok.md`). Dávku K27 (backend nálezu '
             '262: tri koncové body „kto dal lajk“; karta `karty/K27.md`) majiteľ schválil a kolega ju dokončil (PR #275, zlúčené '
             '16. 11. 2026); vzhľad frontendu nálezu 262 majiteľ schválil 17. 11. 2026 (R51 a R56) a ide ako K34 (návrh). Dávku K28 '
             '(delenie `FeedPostComments.tsx`, dávka 1 z 5: krok 0, len testy a dočasný odtlačok HTML; karta `karty/K28.md`; R45 a '
             'R46) majiteľ schválil a kolega ju dokončil (PR #278, zlúčené 17. 11. 2026). Dávku K29 (delenie, dávka 2 z 5: kroky 1 '
             'až 3; karta `karty/K29.md`) majiteľ schválil 17. 11. 2026 a kolega ju dokončil (PR #283, zlúčené 18. 11. 2026); ručný '
             'test majiteľa 18. 11. 2026: 14 z 14 vykonaných, 12 prešlo a 2 čiastočne, kandidáti sú nálezy 345 a 346. Dávku K30 '
             '(oprava 339; karta `karty/K30.md`) majiteľ schválil a kolega ju dokončil (PR #286, zlúčené 18. 11. 2026); mapovanie si '
             'urobil kolega sám (rozhodnutie majiteľa, len pre tento raz) a ručný test majiteľa bol bez chýb; z K30 vznikli nálezy '
             '347 až 349. Dávky K36 (mapovanie 345 a 346; karta `karty/K36.md`, výsledok `karty/K36_vysledok.md`) a K37 (delenie, '
             'dávka 3 z 5, krok 4; karta `karty/K37.md`) majiteľ schválil a kolega ich dokončil (K37: PR #289, zlúčené 18. 11. 2026; '
             'ručný test majiteľa bez nových nálezov); mapovanie si robil kolega sám (rozhodnutie majiteľa). Dávky K38 (delenie, '
             'dávka 4 z 5: kroky 5 a 6; karta `karty/K38.md`) a K39 (oprava 345 a 350 podľa odpovede R57; karta `karty/K39.md`) '
             'pripravil agent 18. 11. 2026 a kolega ich dokončil (K38: PR #291, K39: PR #292; zlúčené 18. a 19. 11. 2026); mapovanie '
             'si robil kolega sám. Ručný test majiteľa po K38 a K39 (19. 11. 2026, 16 testov): 346 pretrváva a vznikol kandidát 351. '
             'Dávky K40 (oprava 346 podľa odporúčania R58; karta `karty/K40.md`) a K41 (oprava 338 a mapovanie 351; karta '
             '`karty/K41.md`) pripravil agent 19. 11. 2026 a kolega ich dokončil (K40: PR #294, K41: PR #295; zlúčené 19. 11. 2026; '
             'výsledky `karty/K40_vysledok.md` a `karty/K41_vysledok.md`); ručný test majiteľa 19. 11. 2026 prešiel. Dávky K42 '
             '(posledná dávka delenia, 5 z 5; karta `karty/K42.md`) a K43 (opravy 342 a 351 podľa R60 a R61; karta `karty/K43.md`) '
             'pripravil agent 19. 11. 2026 a kolega ich dokončil (K42: PR #297, K43: PR #298; zlúčené 19. 11. 2026; výsledky '
             '`karty/K42_vysledok.md` a `karty/K43_vysledok.md`); mapovanie si robil kolega sám; ručný test majiteľa po nich (19. '
             '11. 2026) prešiel bez nových nálezov. Dávky K31 (upgrade Next.js, 341; karta `karty/K31.md`) a K45 (príprava '
             'redizajnu: testy pre medzery z K42 a mapovanie 344; karta `karty/K45.md`, návrh agenta) pripravil agent 19. 11. 2026 '
             'ako ďalšie dva kroky pred redizajnom komentárov (261, K44) a kolega ich dokončil: K45 je zlúčená (PR #302, 20. 11. '
             '2026; výsledok `karty/K45_vysledok.md`), K31 je hotová vo vetve `K31` (commit `906f7c32`; výsledok '
             '`karty/K31_vysledok.md`), no PR k nej ešte nie je a v `main` nie je; mapovanie si robil kolega sám. Okno detailu '
             'príspevku na počítači (344) je zmapované a čaká na odpoveď majiteľa na R63 (potom karta K47, podľa odporúčania pred '
             'redizajnom komentárov); K32 (preklady, najprv mapovanie), nové K33 (úchytka panela nad fotkou, 343), K34 (frontend '
             'zoznamu lajkujúcich 262, etapa A, najprv mapovanie) a K46 (delenie `FeedPostCard.tsx` a `FeedPostMobileDetail.tsx`, '
             'najprv mapovanie) sú návrh. Codex dokončil dve dávky (PR #300 a #301, 20. 11. 2026): živé overenie šiestich preklikov '
             'upozornení a E2E regresie 345 a 346 (zatiaľ len lokálne overené). Údržba zoznamu (jedna dokumentačná vetva agenta; '
             'majiteľ súhlasil 16. 11. 2026) ide ako ďalšia vetva agenta, kým majiteľ testuje poslednú dávku kolegu; dávky PO-A a '
             'PO-B sú staršie návrhy z nálezov PO NASADENÍ a číslo K dostanú, až keď pôjdu kolegovi.')

STAV_ROZROBENE = 'rozrobené'
STAV_CAKA = 'čaká na zlúčenie'
STAVY = (STAV_ROZROBENE, STAV_CAKA)

# Záznam: dict(n='221', co='krátky popis', preco='prečo je v dávke a v tomto poradí'); voliteľne navyše davka='K13' a
# kto='kolega', stav=STAV_ROZROBENE, od='3. 11. 2026' (od 5. 11. 2026 sa nepoužíva). ID je reťazec (číslo nálezu alebo ID z
# registra, napr. 'APP-05').
FRONTA = [
    dict(n='344', davka='K47',
         co='Okno detailu príspevku na počítači: zdieľaná ponuka a portfólio v dvoch stĺpcoch a užšie okno len s '
            'textom (R53).',
         preco='JASNÉ po odpovedi na R63 (mapovanie je hotové v K45, `karty/K45_vysledok.md`; agent overil kľúčové '
               'tvrdenia čítaním kódu 20. 11. 2026; karta K47 sa pripraví po odpovedi). Obsah dávky: dve malé úpravy '
               'v `FeedPostDetailOverlay.tsx` a `FeedPostDetailSplitLayout.tsx` bez zásahu do `FeedPostCard.tsx`, '
               'dva commity (najprv ponuka a portfólio v dvoch stĺpcoch, potom užšie okno len s textom), nový súbor '
               'testov a úprava štyroch existujúcich testov v `FeedPostDetailOverlay.test.tsx` (R27). Vzhľad je '
               'schválený (R53); natiahnutie fotky karty ponuky a portfólia ako pri príspevku s foto vyžaduje zásah '
               'do `FeedPostCard.tsx`, preto podľa odporúčania ide až po vyčlenení zdieľaného bloku z neho (bod 3 v '
               'R63). Podľa odporúčania ide pred redizajnom komentárov (K44). Po nasadení kontrola rozloženia od '
               'Codexu a ručný test majiteľa v prehliadači (výška, šírka a posun sa overia len tam).'),
    dict(n='261', davka='K44',
         co='Nástenka: redizajn komentárov (skupina 7, vzhľad schválený v R52): plochý vzhľad bez sivých bublín, '
            'bublinka s lajkom, odpovede so zvislou čiarou; pri ňom sa rieši aj pole na text pri odpovedi na '
            'komentár.',
         preco='NEJASNÉ (až po zlúčení K31 a po 344 (K47), ak majiteľ potvrdí odporúčané poradie v R63; K40 až K43 a '
               'K45 sú hotové; R59 a dohoda s majiteľom 19. 11. 2026; kartu pripraví agent, keď príde na rad). '
               'Vzhľad komentárov je schválený (R52, obrázky `navrhy/mobil-komentare.png` a '
               '`navrhy/pc-komentare.png`), no pole na text pri odpovedi na komentár sa musí doriešiť: majiteľ dodá, '
               'čo je s ním (R49: najprv návrh vzhľadu s možnosťami a odporúčaním, potom karta). Ide v jednej dávke '
               'po poslednej dávke delenia `FeedPostComments.tsx` (R47; hotová v K42) a zahŕňa aj bublinku s lajkom '
               'pri komentároch (etapa C nálezu 262); vzhľadové chyby, ktoré majiteľ zámerne nenahlásil, sa po '
               'redizajne overia.'),
    dict(n='333', davka='K46',
         co='Nástenka: delenie `FeedPostCard.tsx` (1 033 riadkov) a `FeedPostMobileDetail.tsx` (594) bez zmeny '
            'vzhľadu (R23); delenie `FeedPostComments.tsx` je hotové (K28 až K42, 1 487 → 401 riadkov).',
         preco='NEJASNÉ (najprv mapovanie delenia oboch súborov, kód nemeň; kartu pripraví agent po rozhodnutí '
               'majiteľa, kedy sa začne; mapovanie 344 (K45) ukázalo, že delenie `FeedPostCard.tsx` nie je '
               'podmienkou ani pre 344, ani pre redizajn komentárov; hrubý odhad kolegu pre K46 (neoverený): 6 '
               'krokov podľa vzoru K28 až K42 (`ActionButton` 74-138, hlavička s menu 600-725, zdieľaný blok a tagy '
               '781-860, riadok akcií 862-925, dialógy 927-1033, obsluhy 228-284 a stav s efektmi 368-495), vysoké '
               'riziko pre `fillHeight` (každý priamy potomok flex stĺpca musí ostať priamym potomkom s `shrink-0`), '
               'preto najprv odtlačok HTML (R45)). Čisté presuny kódu ako pri `FeedPostComments.tsx`; výnimka z '
               'pravidla 500 riadkov sa neudeľuje, povolenie platí len pre delenie troch súborov Nástenky (R23), z '
               'ktorých je jeden hotový. Čakajú na ne tagy a ostatné mobilné doladenia (261, skupiny 8 a 6), etapa B '
               'nálezu 262 (príspevok a detail príspevku); 344 ani redizajn komentárov (K44) na ne nečakajú (R47, '
               'mapovanie K45).'),
    dict(n='176', davka='K32',
         co='Preklady: zvyšné slovenské kópie v češtine, poľštine, nemčine a maďarčine (R2: všetkých šesť jazykov pred štartom).',
         preco='NEJASNÉ (najprv mapovanie po jazykoch, kód nemeň: oddeliť legitímne rovnaké slová od nepreložených textov; '
               'meranie z 6. 11. 2026: cs 247, pl 49, de 3 a hu 1 hodnôt zhodných so slovenčinou). R2 je zodpovedané (13. 11. 2026). '
               'Zahŕňa 175 a APP-03 a maďarské pomenovanie sekcie Žiadosti (Kérelmek a Kérések); veľká práca (L), po jazykoch.'),
    dict(n='343', davka='K33',
         co='Úchytka panela komentárov nad fotkou na mobile: tenká úchytka 40×6 px namiesto ovála 40×36 px (R55).',
         preco='JASNÉ (karta sa pripraví po K30). Jeden malý súbor `FeedPhotoCommentsSheet.tsx` (126 riadkov) a test, bez súvisu s delením '
               'komentárov; vzhľad je schválený (R55, obrázok `navrhy/mobil-uchytka.png`), globálne pravidlo `button` sa nemení. Po '
               'nasadení krátky ručný test majiteľa na mobile (potiahnutie nadol aj ťuk panel zatvorí).'),
    dict(n='262', davka='K34',
         co='Zoznam „kto lajkol“: frontend, etapa A (zoznam a bublinka pri ponuke a dopyte, portfóliu, profile a '
            'fotke na celú obrazovku; text pri skrytých lajkujúcich).',
         preco='NEJASNÉ (najprv mapovanie etapy A podľa R51 a R56, kód nemeň, kým majiteľ nepovie; plán etáp je v '
               'nálezu 262). Vzhľad je schválený (R51 a R56, obrázky v `navrhy/`), takže R49 je splnené. Etapa B '
               '(príspevok a detail príspevku) ide až po delení `FeedPostCard.tsx` a `FeedPostMobileDetail.tsx`, '
               'etapa C (komentáre s redizajnom 261) až po delení `FeedPostComments.tsx` (R47); súbory nad 500 '
               'riadkov sa nemenia.'),
    dict(n='24', davka='PO-A',
         co='`setHighlightedSkillId(null)` necháva hodnotu v `sessionStorage` (priame volania setteru namiesto '
            '`clearHighlighting()`).',
         preco='NEJASNÉ (najprv overiť, ktoré volania nulujú surový setter). Zoznam majiteľa ho vedie ako pravdepodobne reálnu chybu; '
               'hook `useDashboardHighlighting.tsx` má 346 riadkov. Najprv overiť, ktoré volania nulujú surový setter, a doplniť test.'),
    dict(n='22', davka='PO-A',
         co='`useDashboardHighlighting` prijíma 0, −3 a 1,5 ako ID zvýraznenia; handler upozornení vyžaduje celé číslo od 1.',
         preco='JASNÉ. Malá validácia v tom istom hooku ako 24, jeden súbor a test.'),
    dict(n='23', davka='PO-A',
         co='Nedosiahnuteľná vetva `null` v `parseRequestsTargetUrl`.',
         preco='JASNÉ. Odstránenie mŕtveho kódu v krátkom súbore `requestsRouting.ts` (56 riadkov); správanie stráži existujúci test.'),
    dict(n='26', davka='PO-A',
         co='Nadbytočný alebo nedosiahnuteľný kód na viacerých miestach (napr. `setIsSearchOpen(false)`, zdvojené `?? null`, '
            'zbytočné `Number.isFinite`; konkrétne miesta si kolega overí).',
         preco='NEJASNÉ (kolega najprv vyberie konkrétne miesta). Upratanie malých miest v navigačných hookoch; každé miesto vo '
               'vlastnom commite, súbory nad 500 riadkov sa nemenia (`DashboardContent.tsx` má 711).'),
    dict(n='247', davka='PO-B',
         co='Klik na položku histórie sa pri písaní ruší až po odoslaní hľadania, nie hneď.',
         preco='JASNÉ. Dohrávka po APP-05 (K4): zrušiť rozbehnutý klik hneď pri zmene textu, test do '
               '`useRecentSearches.race.test.tsx`.'),
    dict(n='248', davka='PO-B',
         co='Zrušené textové hľadanie nezresetuje `isRevalidating` (v UI nedosiahnuteľné).',
         preco='JASNÉ. Ten istý súbor `useSearchApi.tsx` (223 riadkov) ako 247; riešiť spolu.'),
    dict(n='250', davka='PO-B',
         co='Chýba test resetu súhrnu profilu pri otvorení profilu z vyhľadávania (`useDashboardNavigation.tsx:289`).',
         preco='JASNÉ. Len test; `useDashboardNavigation.tsx` má 514 riadkov, takže sa súbor nemení.'),
    dict(n='256', davka='PO-B',
         co='`FeedLikersDialog.tsx` otvára profil vlastným eventom namiesto spoločného `openUserProfile()`.',
         preco='JASNÉ. Jeden malý súbor (209 riadkov), vzor je v `feedProfileNavigation.ts`; doplniť test rovnako ako pri ostatných '
               'miestach.'),
]
