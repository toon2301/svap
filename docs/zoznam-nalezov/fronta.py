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

Dávky K1 až K31, K36 až K43, K45 a K48 až K58 sú zlúčené (K6 až K18 sú v `hotove_dalsie.py`, K19, K20, K23 a K25 sú v nálezu 321 a K21, K22 a K24 sú v `hotove_k20.py`; z K16 zostáva ručný test nálezu 319, z K17 nič, lebo nález 311 majiteľ 12. 11. 2026 uzavrel (R38), z K18 nič, lebo toast pri nálezu 325 je v K21, a z K20 a K23 nič, lebo zvyšok E2E nálezu 321 je nález 337; K26, K27 a K28 sú zapísané v nálezoch 333 a 262, ktoré ostávajú otvorené): K8 (mapovanie nálezov 275, 274 a 276) sa robila na dva razy,
PR #237 a #238 (druhé kolo sa volalo K9), dávka drobných opráv (193, 279, 277, 281) išla ako K10 (PR #239), K11 (PR #241) bola o fotkách
na frontende (279, 293, 291 a 292, ktorý je PO NASADENÍ a majiteľ ho do dávky zaradil 7. 11. 2026), K12 (PR #242) o súkromí a CI (282, 246,
194 a časť 204), K13 (PR #244) o starom endpointe fotiek ponúk, zámkoch pri zmazaní účtu, CI prekladoch a toastoch (301, 296, 297 a časť
302), K14 (PR #245) o zámku závislostí, obnove prihlásenia a prechodných stavoch Nastavení (244, 286 a časť 245) a K15 (PR #250)
o obrazovke Popis ponuky na mobile, farbách polí pri zmene hesla a sieťovej chybe v toastoch (322, 323, 320 a 306) a K16 (PR #253) o
varovaní v Upozorneniach a o načítavaní Sledovania (308, 309 a 310) a K17 (PR #254) o ôsmich natívnych `alert()` a o roli `alert`
pri chybe Blokovaných (302 a 312) s mapovaním 311. Dávky K16 a K17 navrhol agent 8. a 9. 11. 2026 podľa ručných testov majiteľa po
K14: K16 začínala nálezom 319 (mapovanie, výsledok od kolegu čaká) a pokračovala zvyškami po 286 (308 až 310), K17 dopĺňala zvyšok
nálezov PRED NASADENÍM (302 s výnimkou R31, 311) a končila nálezom PO NASADENÍ 312 (karta `karty/K17.md`); K18 (PR #255) opravila tri chyby z ručných testov po K17 (327, 325 a 326; karta `karty/K18.md`; z 325 zostáva toast), K19 (PR #257) boli etapy 1 a 2 nálezu 321 (backend; karta `karty/K19.md`) a K20 (PR #258) etapa 3a nálezu 321 spolu s kódom opravy 319 (karta `karty/K20.md`); K21 (PR #260) boli malé opravy 331 (okno recenzie), 332 (jazyk pre zvyšok sveta), 330 (gulička Žiadostí, R39) a 325 (toast; karta `karty/K21.md`; opravu pripomienky CodeRabbitu urobil agent vo vetve K21 s povolením majiteľa); K22 (PR #264) boli dve malé opravy z ručných testov po K21, 334 (stará chybová hláška v okne „Pridať recenziu“) a 335 (atribút `lang` na `<html>`; karta `karty/K22.md`), K23 (PR #266) bola výzva na push (etapa 3b nálezu 321; karta `karty/K23.md`), K24 (PR #269) bola oprava 336 (anglické „Network Error“ v okne recenzie, výnimka R41; karta `karty/K24.md`), K25 (PR #270) opis hlavného vypínača aj na počítači (321, R42; karta `karty/K25.md`), K26 (mapovanie delenia `FeedPostComments.tsx`, 333, R23; karta `karty/K26.md`) a K27 (PR #275: backend zoznamu lajkujúcich, 262, R20; karta `karty/K27.md`) sú hotové, K28 (PR #278) je dávka 1 z 5 delenia `FeedPostComments.tsx` (333; karta `karty/K28.md`: len testy a dočasný odtlačok HTML) a hotová, K29 (PR #283) je dávka 2 z 5 delenia (333; karta `karty/K29.md`) a K30 (PR #286) oprava 339 (karta `karty/K30.md`), obe hotové, K36 (mapovanie 345 a 346; karta `karty/K36.md`), K37 (PR #289: dávka 3 z 5 delenia, 333; karta `karty/K37.md`), K38 (PR #291: dávka 4 z 5 delenia, 333; karta `karty/K38.md`), K39 (PR #292: oprava 345 a 350; karta `karty/K39.md`), K40 (PR #294: oprava 346; karta `karty/K40.md`), K41 (PR #295: oprava 338 a mapovanie 351; karta `karty/K41.md`), K42 (PR #297: posledná dávka delenia `FeedPostComments.tsx`, 333; karta `karty/K42.md`) a K43 (PR #298: opravy 342 a 351; karta `karty/K43.md`) sú hotové, K45 (PR #302: testy pre medzery z K42 a mapovanie 344; karta `karty/K45.md`) a K31 (PR #304: upgrade Next.js, 341; karta `karty/K31.md`) sú hotové, K57 (PR #323: okno detailu na počítači, 344 a 363; karta `karty/K57.md`, podklady `karty/K57_podklady.md`) je tiež zlúčená; ešte nezačaté sú K58 (text príspevku a okno detailu na počítači: nálezy 357, 364, 365, 366 a 367, tri kódové kroky; karta `karty/K58.md`, podklady `karty/K58_podklady.md`, napísaná 24. 11. 2026 po rozhodnutiach R71 až R73), K44 na redizajn komentárov (261; podľa R64 a R67 ho po rekapitulácii a 100 % dohode o vzhľade mapuje agent a kód píše kolega podľa jeho presnej karty), K32 na preklady (176, najprv mapovanie), K33 na úchytku panela nad fotkou (343) a K34 na frontend zoznamu lajkujúcich (262, etapa A, najprv mapovanie); K46 (dvojité mapovanie delenia `FeedPostCard.tsx` a `FeedPostMobileDetail.tsx`, 333; karta `karty/K46.md`, R65 (a) schválené 21. 11. 2026) je hotové a porovnané (`karty/K46_porovnanie.md`) a K48 (PR #306: ochrana karty, len testy, dočasný odtlačok HTML a sonda poradia efektov; karta `karty/K48.md`) a K49 (PR #307: ochrana mobilného detailu, len testy; karta `karty/K49.md`) sú zlúčené. Nález HNEĎ 318
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
             'PRED NASADENÍM a HNEĎ; majiteľ môže pomer dočasne zmeniť, napr. na 1 : 1). K6 až K31, K36 až K43, K45 a K48 až K58 sú hotové (z '
             'K16 čaká ručný test 319; nález 311 z K17 majiteľ uzavrel, R38); vetvy agenta 167 až 174, 177, 178, 179 (PR #272), 180 '
             '(PR #273), 181 (PR #274), 182 (PR #277), 183 (PR #279), 184 (PR #282), 185 (PR #285), 186 (PR #288), 187 (PR #290), '
             '188 (PR #293), 189 (PR #296), 190 (PR #299), 191 (PR #303), 192 (PR #305), 193 (PR #308), 194 (PR #310), 195 (PR #312), 196 (PR #314), 197 (PR #316), 198 (PR #318; len karta K55), 199 (PR #320; zápis a karta K56), 200 (PR #322; karta K57, nálezy 363 a 364 a R69), 201 (PR #324), 202 (PR #325; karta K58, rozhodnutia R71 až R74, nálezy 365 až 368 a obrázky v `navrhy/`) a 203 (PR #327; oprava vety o nálezu 364 vo vlne 2 po druhej kontrole CodeRabbitu, rozhodnutia R75 a R76, nálezy 369 a 370 a obrázky v `navrhy/`) sú len zoznam alebo karta, vetvy 204 (PR #328; počty riadkov „Viac“, nález 373, R77), 205 (PR #329; kolo 3a redizajnu komentárov: plochý vzhľad podľa R52, nálezy 343 a 369, R79) a 206 (PR #330; kolo 3b: jedno pole na komentár a odpoveď na mobile podľa R75 a nález 370, R79) menia kód Nástenky a obsahujú aj zápis do zoznamu, vetva 207 (PR #331; len zoznam a karta K59: nálezy 375 až 377 z ručného testu kola 3b a R80), vetva 208 (PR #333; kolo 3c: oprava nálezov 375 až 377 v paneli komentárov nad fotkou, skrytá diagnostika, zápis do zoznamu a R81; zlúčené 25. 11. 2026 a ručný test prešiel), vetva 209 (PR #334; karta K60: mapovanie 360, 13, 70, 371 a 358 bez zmeny kódu; zlúčené 25. 11. 2026 o 19:36 UTC) a vetva 210 (PR #335; zápis K59 a kola 3c a K60 vo fronte a oprava zvyšku nálezu 362 v obrazovke detailu na iPhone; čaká na zlúčenie a ručný test), vetva 176 sú pravidlá pre agentov (`AGENTS.md`, R27) '
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
             '2026; výsledok `karty/K45_vysledok.md`) a K31 je zlúčená (PR #304, 21. 11. 2026 o 07:11 UTC; commit `906f7c32`; '
             'výsledok `karty/K31_vysledok.md`); mapovanie si robil kolega sám. Okno detailu '
             'príspevku na počítači (344) je zmapované kolegom; podľa R64 (20. 11. 2026) ho aj redizajn komentárov (261) po '
             'rekapitulácii a vizuálnom návrhu s odporúčaním a po 100 % dohode s majiteľom mal implementovať agent, no majiteľ to '
             '23. 11. 2026 zmenil (R67): po dohode napíše agent presné karty a kód píše kolega; pred tým majiteľ 21. 11. 2026 potvrdil krok kolegu K31 (upgrade Next.js), ktorý je zlúčený. Na jeho '
             'otázku, či sa pred redizajnom poriadne delí `FeedPostCard.tsx`, agent odporučil áno a majiteľ 21. 11. 2026 R65 (a) '
             'schválil: kolega mapuje podľa karty `karty/K46.md` a majiteľ chce navyše dvojité mapovanie (nezávisle mapuje aj '
             'agent a po dokončení kolegu sa oba výsledky porovnajú); potom delenie po malých krokoch a redizajn až po zlúčení '
             'posledného kroku; poradie okna na počítači a komentárov rozhodne R63; K32 (preklady, najprv mapovanie), nové K33 '
             '(úchytka panela nad fotkou, 343; dávka zanikla, nález ide vo vetve K44, R78) a K34 (frontend zoznamu lajkujúcich 262, etapa A, najprv mapovanie) sú návrh a '
             'K46 (delenie `FeedPostCard.tsx` a `FeedPostMobileDetail.tsx`, najprv mapovanie) mapovali kolega aj agent nezávisle a '
             'agent obe mapovania 21. 11. 2026 porovnal a overil vlastnými skúškami v kópii mimo repozitára (`karty/K46_porovnanie.md`): '
             'obe dospeli k čistým presunom, najväčším rizikom sú medzery v testoch, a preto agent pripravil karty K48 (ochrana karty) '
             'a K49 (ochrana mobilného detailu), obe len testy; kolega ich dokončil a majiteľ zlúčil: K48 (PR #306, 21. 11. 2026 o '
             '18:20 UTC) a K49 (PR #307, o 19:35 UTC); agent ich overil z GitHubu a vlastnými skúškami v kópii mimo repozitára '
             '(výsledky sú v nálezu 333, ručný test netreba). K50 (PR #309, 21. 11. 2026 o 21:35 UTC; kroky a, g a b, prvé presuny kódu; '
             'karta `karty/K50.md`) kolega dokončil a majiteľ zlúčil; agent ju overil z GitHubu a vlastnými skúškami v kópii mimo '
             'repozitára (výsledky sú v nálezu 333); majiteľ jej ručný test urobil. Majiteľ 21. 11. 2026 dal kolegovi ďalšiu dávku '
             'hneď, kým testoval K50: K51 (PR #311, 22. 11. 2026 o 08:58 UTC; krok d, zdieľaný blok a označenia; karta `karty/K51.md`) '
             'je zlúčená a agent ju overil rovnako ako K50 (výsledky sú v nálezu 333); pri ručnom teste K51 našiel majiteľ nálezy '
             '357 až 360 (staršie správanie, nie dôsledok K51), ktoré chce opraviť hneď po redizajne komentárov a rozložení '
             'príspevkov (261 a 344), lebo sa dotýkajú tých istých miest; zatiaľ sa nemapujú. K52 (PR #313, 22. 11. 2026 o 12:35 UTC; '
             'krok c, vrstvy a dialógy a stav deviatich vlajok; karta `karty/K52.md`) je zlúčená a agent ju overil rovnako (výsledky '
             'sú v nálezu 333). K53 (PR #315, 22. 11. 2026 o 15:53 UTC; krok e, hlavička s menu; karta `karty/K53.md`) je zlúčená a agent ju '
             'overil rovnako (výsledky sú v nálezu 333); pri jej ručnom teste našiel majiteľ nálezy 361 a 362 (staršie správanie, nie '
             'dôsledok K53), ktoré agent zaradil do rovnakej skupiny ako 357 až 360 (po redizajne). K54 (PR #317, '
             '22. 11. 2026 o 19:06 UTC; krok f, obsluhy, počty s pollingom a mobilné vrstvy s efektmi do troch hookov; karta '
             '`karty/K54.md`) a K55 (PR #319, 23. 11. 2026 o 06:19 UTC; mobilný detail v dvoch presunoch a zmazanie dočasných '
             'odtlačkov a sond; karta `karty/K55.md`) sú zlúčené, agent ich overil rovnako (výsledky sú v nálezu 333, ktorý je '
             'tým hotový) a ručné testy majiteľa po nich prešli bez nových nálezov; delenie je dokončené (`FeedPostComments.tsx` '
             '401, `FeedPostCard.tsx` 493 a `FeedPostMobileDetail.tsx` 358 riadkov). K56 (PR #321, 23. 11. 2026 '
             'o 09:42 UTC; opravy 355 a 356, posledný krok pred redizajnom; karta `karty/K56.md`) je zlúčená, agent ju overil rovnako '
             'a jej ručný test majiteľa prešiel; tým sa podľa R66 (a) začína redizajn: majiteľ 23. 11. 2026 zmenil R64 (R67), takže po '
             'rekapitulácii a vizuálnom návrhu s odporúčaním a po 100 % dohode napíše agent presné karty a kód píše kolega; agent '
             'bez pokynu majiteľa nič nepripravuje mimo tohto postupu. K57 (PR #323, 23. 11. 2026 o 21:55 UTC; okno detailu na počítači, nálezy 344 a 363, prvá časť redizajnu; karta `karty/K57.md`) je zlúčená a agent ju overil rovnako (výsledky sú v nálezoch 344 a 363); verdikt ručného testu majiteľ zatiaľ nepovedal a drobné vzhľadové úpravy chce urobiť sám vo vetve `VU1` (R70), ktorú agent po oznámení skontroluje; po odpovediach majiteľa na návrh textu príspevku a okna detailu (R71 až R73, 24. 11. 2026) napísal agent kartu K58 (`karty/K58.md`, podklady `karty/K58_podklady.md`; tri kódové kroky, nálezy 357, 364, 365, 366 a 367) a kolega ju urobil: K58 je zlúčená (PR #326, 24. 11. 2026 o 19:29 UTC, merge `828753ff`; karta `karty/K58.md`), agent ju overil rovnako (výsledky sú v nálezoch 357 a 364 až 367) a ručný test majiteľa po nasadení prešiel s jednou výhradou, počtami riadkov „Viac“ (R77, nález 373; po odpovediach majiteľa ich opravil agent vo vetve 204, PR #328, zlúčené 25. 11. 2026 o 06:44 UTC), a priniesol nálezy 371 a 372; nález 368 (označení používatelia v okne s fotkou; vzhľad schválil majiteľ po obrázku Dnes a Po, R74) opraví po zlúčení K58 sám agent, keď majiteľ dá pokyn (výnimka z R67), preto nie je vo fronte kolegu; redizajn komentárov (K44: plochý vzhľad podľa R52, pole na komentár a odpoveď na mobile podľa R75 a nálezy 369 a 370) má od 24. 11. 2026 schválený vzhľad a podľa R76 ho píše sám agent (výnimka z R67), preto ho fronta kolegu nemá (podľa R79 ide v dvoch kolách: kolo 3a, plochý vzhľad podľa R52 s nálezmi 343 a 369, je zlúčené (PR #329, 25. 11. 2026) a ručný test majiteľa prešiel; kolo 3b, pole na komentár a odpoveď na mobile podľa R75 a nález 370, je zlúčené (PR #330, 25. 11. 2026) a jeho ručný test majiteľa neprešiel na 100 %: v detaile príspevku je všetko v poriadku, v paneli komentárov nad fotkou sú tri chyby (375 až 377), ktoré opravilo kolo 3c agenta (vetva 208, PR #333, zlúčené 25. 11. 2026; ručný test majiteľa prešiel)); úchytku panela nad fotkou (343) urobil podľa R78 agent v kole 3a; K59 (nálezy 361 a 362; `karty/K59.md`) pripravil agent 25. 11. 2026 na pokyn majiteľa tak, aby sa jej súbory neprekrývali s kolom 3c agenta (R80) a kolega ju urobil: je zlúčená (PR #332, 25. 11. 2026 o 16:46 UTC, merge `8cced7e5`), agent ju overil (výsledky sú v nálezoch 361 a 362) a ručný test majiteľa prešiel okrem zvyšku 362 (obrazovka detailu na iPhone; opravuje ho vetva 210, PR #335); K60 (mapovanie 360, 13, 70, 371 a 358 bez zmeny kódu; `karty/K60.md`, vetva 209, PR #334, zlúčené 25. 11. 2026 o 19:36 UTC) pripravil agent 25. 11. 2026 na pokyn majiteľa, aby kolega mal zatiaľ prácu, a kolega na nej pracuje; ďalšie dávky agent nepripravuje, kým majiteľ nepovie. Pri každej dávke má kolega doplniť aj manuál ručných '
             'testov `sablony/dymovy_test.md`, ak dávka ručné testy má (K50 pridala krok 9, K51 až K58 odrážky). Codex dokončil dve dávky (PR #300 a #301, 20. 11. 2026): živé overenie šiestich preklikov '
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
    dict(n='360', davka='K60',
         co='Mobil: po kliknutí na upozornenie k príspevku alebo na príspevok na Nástenke sa niekedy otvorí starý spôsob '
            '(stránka príspevku) namiesto dnešnej obrazovky detailu; starý spôsob sa má odstrániť aj z kódu.',
         preco='NEJASNÉ (karta `karty/K60.md`, skupina A, pripravená 25. 11. 2026 na pokyn majiteľa; vetva 209, PR #334: len '
               'mapovanie spolu s 13 a 70 (súvis 46), kód nemeň; redizajn komentárov a rozloženie príspevkov sú hotové, takže '
               'nič nebrzdí; ručný test majiteľa po K51; možný dopad na E2E: `feed-post-detail.spec.ts` a '
               '`notification-click.spec.ts`).'),
    dict(n='13', davka='K60',
         co='Chýba `Späť` v mobilnej hornej lište plnostránkového detailu príspevku (v iPhone PWA tam používateľ uviazne); po '
            'odstránení starého spôsobu detailu (360) by odpadla.',
         preco='NEJASNÉ (karta `karty/K60.md`, skupina A: mapovanie spolu s 360 a 70; ak sa starý spôsob odstráni, 13 odpadne; '
               'kód nemeň).'),
    dict(n='70', davka='K60',
         co='Mobil: dve obrazovky detailu príspevku; niektoré upozornenia stále vedú na staršiu (zjednotenie).',
         preco='NEJASNÉ (karta `karty/K60.md`, skupina A: mapovanie všetkých vstupných bodov spolu s 360 a 13, súvisí 46; kód '
               'nemeň).'),
    dict(n='371', davka='K60',
         co='Prezdieľaná ponuka alebo portfólio bez fotky: keď vlastník dodatočne pridá fotku, na Nástenke sa to neobnoví a '
            'stále ukazuje „bez fotky“.',
         preco='NEJASNÉ (karta `karty/K60.md`, skupina B: najprv mapovanie vrátane backendovej časti 91, kód nemeň; spôsob '
               'opravy určí majiteľ po mapovaní; ručný test majiteľa po K58).'),
    dict(n='358', davka='K60',
         co='Zdieľaná ponuka alebo portfólio: sprievodný text, ktorý zdieľajúci napísal, sa nad náhľadom nezobrazuje vôbec.',
         preco='NEJASNÉ (karta `karty/K60.md`, skupina C: najprv overiť na čerstvom `main` po K58 a K59, či chyba platí, potom '
               'mapovanie, kód nemeň; ručný test majiteľa po K51).'),
    dict(n='359', davka='po redizajne',
         co='Označení používatelia sú fialové bubliny `@Meno`; majiteľ chce obyčajný text bez bubliny (podmnožina 261, '
            'skupina 8).',
         preco='NEJASNÉ (ide spolu s redizajnom tagov v 261, ktorý píše kolega podľa presnej karty po 100 % dohode o vzhľade, '
               'R49 a R67; kto píše kód tagov, určí majiteľ osobitne, R76; ručný test majiteľa po K51).'),
    dict(n='372', davka='po redizajne',
         co='Označení používatelia: v detaile príspevku na mobile a vo fotoprehliadači sa nezobrazujú; pri príspevku s fotkou '
            'majú byť nad fotkou (mobil aj počítač), dnes sú pod ňou.',
         preco='NEJASNÉ (najprv návrh vzhľadu s možnosťami a odporúčaním od agenta a schválenie majiteľom, R49; súvisí s 359, '
               '368 a skupinou 8 v 261, preto jedným návrhom; kto píše kód, určí majiteľ osobitne, R76; ručný test majiteľa po '
               'K58).'),
    dict(n='176', davka='K32',
         co='Preklady: zvyšné slovenské kópie v češtine, poľštine, nemčine a maďarčine (R2: všetkých šesť jazykov pred '
            'štartom).',
         preco='NEJASNÉ (najprv mapovanie po jazykoch, kód nemeň: oddeliť legitímne rovnaké slová od nepreložených textov; '
               'meranie z 6. 11. 2026: cs 247, pl 49, de 3 a hu 1 hodnôt zhodných so slovenčinou). R2 je zodpovedané (13. 11. '
               '2026). Zahŕňa 175 a APP-03 a maďarské pomenovanie sekcie Žiadosti (Kérelmek a Kérések); veľká práca (L), po '
               'jazykoch.'),
    dict(n='262', davka='K34',
         co='Zoznam „kto lajkol“: frontend, etapa A (zoznam a bublinka pri ponuke a dopyte, portfóliu, profile a fotke na '
            'celú obrazovku; text pri skrytých lajkujúcich).',
         preco='NEJASNÉ (najprv mapovanie etapy A podľa R51 a R56, kód nemeň, kým majiteľ nepovie; plán etáp je v nálezu 262). '
               'Vzhľad je schválený (R51 a R56, obrázky v `navrhy/`), takže R49 je splnené. Etapa B (príspevok a detail '
               'príspevku) ide až po delení `FeedPostCard.tsx` a `FeedPostMobileDetail.tsx` (hotové, K55) a po opravách 355 a '
               '356 (hotové, K56), etapa C (komentáre s redizajnom 261) až po delení `FeedPostComments.tsx` (R47); súbory nad '
               '500 riadkov sa nemenia.'),
    dict(n='24', davka='PO-A',
         co='`setHighlightedSkillId(null)` necháva hodnotu v `sessionStorage` (priame volania setteru namiesto '
            '`clearHighlighting()`).',
         preco='NEJASNÉ (najprv overiť, ktoré volania nulujú surový setter). Zoznam majiteľa ho vedie ako pravdepodobne reálnu '
               'chybu; hook `useDashboardHighlighting.tsx` má 346 riadkov. Najprv overiť, ktoré volania nulujú surový setter, a '
               'doplniť test.'),
    dict(n='22', davka='PO-A',
         co='`useDashboardHighlighting` prijíma 0, −3 a 1,5 ako ID zvýraznenia; handler upozornení vyžaduje celé číslo od 1.',
         preco='JASNÉ. Malá validácia v tom istom hooku ako 24, jeden súbor a test.'),
    dict(n='23', davka='PO-A',
         co='Nedosiahnuteľná vetva `null` v `parseRequestsTargetUrl`.',
         preco='JASNÉ. Odstránenie mŕtveho kódu v krátkom súbore `requestsRouting.ts` (56 riadkov); správanie stráži existujúci '
               'test.'),
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
         preco='JASNÉ. Jeden malý súbor (209 riadkov), vzor je v `feedProfileNavigation.ts`; doplniť test rovnako ako pri '
               'ostatných miestach.'),
]
