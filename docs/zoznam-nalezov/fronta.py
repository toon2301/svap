# -*- coding: utf-8 -*-
"""Poradie prác pre kolegu (dávky) a voliteľný stav ich riešenia.

Poradie je návrh agenta (malé, lokálne zmeny s nízkym rizikom, ktoré nemenia súbory nad 500 riadkov); schvaľuje majiteľ. Od 6. 11. 2026 smie
kolega robiť aj nálezy PRED NASADENÍM a HNEĎ (predtým len PO NASADENÍ), preto fronta smie obsahovať ktorýkoľvek otvorený nález. Súbor sa
upravuje len pri zmene poradia alebo keď je nález hotový:
- keď je nález hotový, záznam sa odstráni odtiaľto a nález sa presunie do `hotove_k20.DONE_SINCE_K20`;
- stav riešenia je voliteľný: ak sa zapíše, vyplnia sa spolu `kto`, `stav` (`STAV_ROZROBENE` alebo `STAV_CAKA`) a `od` (dátum).

Od 5. 11. 2026 sa polia `kto`, `stav` a `od` pri práci kolegu nevyplňujú: v kóde pracuje vždy len jeden a začiatok aj koniec práce
hlási majiteľ (postup je v `README.md`, časť „Postup s kolegom“). Záznam bez týchto polí sa v zozname zobrazí ako „nesleduje sa“,
nie ako voľný, lebo kým kolega pracuje, zoznam o tom nevie. Polia a ich kontrola ostávajú pre prípad, že by sa postup zmenil.

Dávky K1 až K29 sú zlúčené (K6 až K18 sú v `hotove_dalsie.py`, K19, K20, K23 a K25 sú v nálezu 321 a K21, K22 a K24 sú v `hotove_k20.py`; z K16 zostáva ručný test nálezu 319, z K17 nič, lebo nález 311 majiteľ 12. 11. 2026 uzavrel (R38), z K18 nič, lebo toast pri nálezu 325 je v K21, a z K20 a K23 nič, lebo zvyšok E2E nálezu 321 je nález 337; K26, K27 a K28 sú zapísané v nálezoch 333 a 262, ktoré ostávajú otvorené): K8 (mapovanie nálezov 275, 274 a 276) sa robila na dva razy,
PR #237 a #238 (druhé kolo sa volalo K9), dávka drobných opráv (193, 279, 277, 281) išla ako K10 (PR #239), K11 (PR #241) bola o fotkách
na frontende (279, 293, 291 a 292, ktorý je PO NASADENÍ a majiteľ ho do dávky zaradil 7. 11. 2026), K12 (PR #242) o súkromí a CI (282, 246,
194 a časť 204), K13 (PR #244) o starom endpointe fotiek ponúk, zámkoch pri zmazaní účtu, CI prekladoch a toastoch (301, 296, 297 a časť
302), K14 (PR #245) o zámku závislostí, obnove prihlásenia a prechodných stavoch Nastavení (244, 286 a časť 245) a K15 (PR #250)
o obrazovke Popis ponuky na mobile, farbách polí pri zmene hesla a sieťovej chybe v toastoch (322, 323, 320 a 306) a K16 (PR #253) o
varovaní v Upozorneniach a o načítavaní Sledovania (308, 309 a 310) a K17 (PR #254) o ôsmich natívnych `alert()` a o roli `alert`
pri chybe Blokovaných (302 a 312) s mapovaním 311. Dávky K16 a K17 navrhol agent 8. a 9. 11. 2026 podľa ručných testov majiteľa po
K14: K16 začínala nálezom 319 (mapovanie, výsledok od kolegu čaká) a pokračovala zvyškami po 286 (308 až 310), K17 dopĺňala zvyšok
nálezov PRED NASADENÍM (302 s výnimkou R31, 311) a končila nálezom PO NASADENÍ 312 (karta `karty/K17.md`); K18 (PR #255) opravila tri chyby z ručných testov po K17 (327, 325 a 326; karta `karty/K18.md`; z 325 zostáva toast), K19 (PR #257) boli etapy 1 a 2 nálezu 321 (backend; karta `karty/K19.md`) a K20 (PR #258) etapa 3a nálezu 321 spolu s kódom opravy 319 (karta `karty/K20.md`); K21 (PR #260) boli malé opravy 331 (okno recenzie), 332 (jazyk pre zvyšok sveta), 330 (gulička Žiadostí, R39) a 325 (toast; karta `karty/K21.md`; opravu pripomienky CodeRabbitu urobil agent vo vetve K21 s povolením majiteľa); K22 (PR #264) boli dve malé opravy z ručných testov po K21, 334 (stará chybová hláška v okne „Pridať recenziu“) a 335 (atribút `lang` na `<html>`; karta `karty/K22.md`), K23 (PR #266) bola výzva na push (etapa 3b nálezu 321; karta `karty/K23.md`), K24 (PR #269) bola oprava 336 (anglické „Network Error“ v okne recenzie, výnimka R41; karta `karty/K24.md`), K25 (PR #270) opis hlavného vypínača aj na počítači (321, R42; karta `karty/K25.md`), K26 (mapovanie delenia `FeedPostComments.tsx`, 333, R23; karta `karty/K26.md`) a K27 (PR #275: backend zoznamu lajkujúcich, 262, R20; karta `karty/K27.md`) sú hotové, K28 (PR #278) je dávka 1 z 5 delenia `FeedPostComments.tsx` (333; karta `karty/K28.md`: len testy a dočasný odtlačok HTML) a hotová, K29 je dávka 2 z 5 delenia (333; karta `karty/K29.md`), K30 je návrh na opravu 339, K31 na upgrade Next.js (341) a K32 na preklady (176, najprv mapovanie), K33 na úchytku panela nad fotkou (343), K34 na frontend zoznamu lajkujúcich (262, etapa A, najprv mapovanie) a K35 na okno detailu na počítači (344, najprv mapovanie). Nález HNEĎ 318
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

SCHVALENE = ('Majiteľ 6. 11. 2026 schválil striedanie 2 : 1 (dve dávky kolegu, potom jedna vetva agenta; kolega smie robiť aj nálezy PRED '
             'NASADENÍM a HNEĎ; majiteľ môže pomer dočasne zmeniť, napr. na 1 : 1). K6 až K29 sú hotové (z K16 čaká ručný test 319; nález 311 z K17 majiteľ uzavrel, R38); '
             'vetvy agenta 167 až 174, 177, 178, 179 (PR #272), 180 (PR #273), 181 (PR #274), 182 (PR #277), 183 (PR #279), 184 (PR #282) a 185 sú len zoznam, vetva 176 sú pravidlá pre agentov (`AGENTS.md`, R27) a vetva 175 (oprava vyhľadávania, PR #259) bola jednorazová výnimka majiteľa z '
             '13. 11. 2026 (majiteľ 7. 11. 2026: opravy nálezov agentom sa odkladajú, kým majiteľ nedá vedieť); oprava pripomienky '
             'CodeRabbitu vo vetve K21 (commit `71f9cff4`) bola druhá jednorazová výnimka majiteľa z 13. 11. 2026, lebo kolega už '
             'nemohol vetvu upraviť. Dávku K21 (331 okno recenzie, 332 jazyk pre zvyšok sveta, 330 gulička Žiadostí a 325 toast; karta '
             '`karty/K21.md`) majiteľ schválil a kolega ju dokončil (PR #260, zlúčené 13. 11. 2026). Dávku K22 (334 stará chybová '
             'hláška v okne recenzie a 335 atribút `lang`; karta `karty/K22.md`) navrhol agent 13. 11. 2026 po ručných testoch K21, '
             'majiteľ ju schválil a kolega ju dokončil (PR #264, zlúčené 15. 11. 2026). Dávku K23 (výzva na push, etapa 3b nálezu 321; '
             'karta `karty/K23.md`) pripravil agent 15. 11. 2026, majiteľ ju schválil a kolega ju dokončil (PR #266, zlúčené 15. 11. 2026). '
             'Dávky K24 (oprava 336, výnimka R41; karta `karty/K24.md`) a K25 (opis hlavného vypínača aj na '
               'počítači, R42; karta `karty/K25.md`) majiteľ schválil a kolega ich dokončil (PR #269 a #270, zlúčené '
               '16. 11. 2026). Dávku K26 (mapovanie delenia `FeedPostComments.tsx`, nález 333, R23; karta '
               '`karty/K26.md`) pripravil agent 16. 11. 2026 (PR #272), kolega ju dokončil a výsledok je zapísaný v nálezu 333 '
               '(`karty/K26_vysledok.md`). Dávku K27 (backend nálezu 262: tri koncové body „kto dal lajk“; karta `karty/K27.md`) '
               'majiteľ schválil a kolega ju dokončil (PR #275, zlúčené 16. 11. 2026); vzhľad frontendu nálezu 262 majiteľ schválil '
               '17. 11. 2026 (R51 a R56) a ide ako K34 (návrh). Dávku K28 (delenie `FeedPostComments.tsx`, dávka 1 z 5: krok 0, len '
               'testy a dočasný odtlačok HTML; karta `karty/K28.md`; R45 a R46) majiteľ schválil a kolega ju dokončil (PR #278, '
               'zlúčené 17. 11. 2026). Dávku K29 (delenie, dávka 2 z 5: kroky 1 až 3; karta `karty/K29.md`) majiteľ schválil '
               '17. 11. 2026 a kolega ju dokončil (PR #283, zlúčené 18. 11. 2026); ručný test majiteľa 18. 11. 2026: 14 z 14 vykonaných, '
               '12 prešlo a 2 čiastočne, kandidáti sú nálezy 345 a 346. Dávku K30 (oprava 339; karta `karty/K30.md`) pripravil agent '
               '18. 11. 2026; mapovanie si robí kolega sám (rozhodnutie majiteľa, len pre tento raz). Ďalšie tri dávky delenia (3 až 5 '
               'z 5) sa pripravia po zlúčení predchádzajúcej; návrh poradia: K36 (mapovanie 345 a 346), dávka 3 delenia, K31 (upgrade '
               'Next.js, 341), K32 (preklady, najprv mapovanie) a nové K33 (úchytka panela nad fotkou, 343), K34 (frontend zoznamu '
               'lajkujúcich 262, etapa A, najprv mapovanie) a K35 (okno detailu na počítači, 344, najprv mapovanie) sú návrh. '
               'Údržba zoznamu (jedna dokumentačná vetva agenta; majiteľ súhlasil 16. 11. 2026) ide ako ďalšia vetva agenta, kým majiteľ testuje poslednú dávku kolegu; '
             'dávky PO-A a PO-B sú staršie návrhy z nálezov PO NASADENÍ a číslo K dostanú, až keď pôjdu kolegovi.')

STAV_ROZROBENE = 'rozrobené'
STAV_CAKA = 'čaká na zlúčenie'
STAVY = (STAV_ROZROBENE, STAV_CAKA)

# Záznam: dict(n='221', co='krátky popis', preco='prečo je v dávke a v tomto poradí'); voliteľne navyše davka='K13' a
# kto='kolega', stav=STAV_ROZROBENE, od='3. 11. 2026' (od 5. 11. 2026 sa nepoužíva). ID je reťazec (číslo nálezu alebo ID z
# registra, napr. 'APP-05').
FRONTA = [
    dict(n='339', davka='K30',
         co='Ponuka neaktívneho vlastníka: detail aj lajk prejdú cez priame id (vyhľadávanie ju vynecháva).',
         preco='JASNÉ (karta `karty/K30.md`, pripravená 18. 11. 2026; mapovanie si robí kolega sám, rozhodnutie majiteľa len pre tento '
               'raz, agent kód nečítal). Malá backendová oprava v `offer_hidden_from_user` s testami, bez ručného testu; kandidát kolegu '
               'z K27, agent ho potvrdil čítaním kódu už skôr. Dá sa poslať kolegovi aj medzi dávkami delenia.'),
    dict(n='345', davka='K36',
         co='Okno detailu príspevku na počítači ostane otvorené po prechode na profil autora komentára (kandidát z ručného testu K29, '
            'test 6).',
         preco='NEJASNÉ (najprv mapovanie kolegu: kde sa prechod na profil spúšťa, prečo sa okno nezatvorí a či ide o starší stav alebo '
               'dôsledok K29; kód nemeň, kým majiteľ nepovie). Mapovanie robí kolega sám (rozhodnutie majiteľa 18. 11. 2026); '
               '`FeedPostComments.tsx` (1 098 riadkov) sa mení len ako presun (R23), takže oprava logiky v ňom počká na delenie.'),
    dict(n='346', davka='K36',
         co='iPhone: nový komentár nie je celý viditeľný vrátane tlačidiel po vlastnom odoslaní ani po kliknutí na upozornenie o '
            'nových komentároch (kandidát z ručného testu K29, test 13).',
         preco='NEJASNÉ (najprv mapovanie kolegu: ktorý posun a ktorá výška sa uplatňujú, rozdiel medzi oboma prípadmi a či ide o starší '
               'stav alebo dôsledok K29; kód nemeň, kým majiteľ nepovie). Plán delenia má krok 5 „posun a indikátor nových“; ak sa '
               'príčina ukáže tam, oprava ide po tomto kroku ako samostatný commit v novom súbore (ako 338 po kroku 6).'),
    dict(n='333', davka='DEL-3',
         co='Nástenka: delenie `FeedPostComments.tsx` (1 098 riadkov po K29) bez zmeny vzhľadu: dávka 3 z 5 (krok 4: hľadanie cieľa v '
            'hooku); potom dávky 4 a 5 a `FeedPostCard.tsx` a `FeedPostMobileDetail.tsx` (R23).',
         preco='JASNÉ (karta sa pripraví po K30 a po zmapovaní kandidátov 345 a 346 (K36), ak majiteľ nepovie inak; dávky 1 a 2 z 5 sú '
               'zlúčené v K28 a K29). Čisté presuny kódu, správanie ani vzhľad sa nemenia; dočasný odtlačok HTML z K28 sa neprepisuje a '
               'po dávke robí majiteľ ručný test. Zvyšné dávky: 3 = krok 4, 4 = kroky 5 a 6, 5 = kroky 7 a 8 (R46); redizajn 261 až po '
               'poslednej dávke (R47), vzhľad sa nemení bez schválenia majiteľa (R49), oprava 338 po kroku 6 (R48) a oprava 342 po kroku '
               '7. Mapovanie K36 určí, či sa kandidáti 345 a 346 dotýkajú krokov 4 až 6 (posun a indikátor nových komentárov je krok 5); '
               'podľa toho sa upraví poradie. Výnimka z pravidla 500 riadkov sa neudeľuje, povolenie platí len pre delenie troch '
               'súborov Nástenky.'),
    dict(n='341', davka='K31',
         co='Upgrade Next.js 16.4.3 na opravenú verziu (bezpečnostné upozornenie GHSA-mfr8-8qww-v76h, stredná závažnosť).',
         preco='JASNÉ (karta sa pripraví po K30; dávka závislostí ide samostatne). Najprv majiteľ pozrie posledné nasadenia na '
               'Railway: ak padajú, nález ide na začiatok poradia. Po nasadení ručný dymový test majiteľa.'),
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
         co='Zoznam „kto lajkol“: frontend, etapa A (zoznam a bublinka pri ponuke a dopyte, portfóliu, profile a fotke na celú obrazovku; '
            'text pri skrytých lajkujúcich).',
         preco='NEJASNÉ (najprv mapovanie etapy A podľa R51 a R56, kód nemeň, kým majiteľ nepovie; plán etáp je v nálezu 262). Vzhľad je '
               'schválený (R51 a R56, obrázky v `navrhy/`), takže R49 je splnené. Etapa B (príspevok a detail príspevku) a etapa C '
               '(komentáre s redizajnom 261) idú až po delení `FeedPostCard.tsx`, `FeedPostMobileDetail.tsx` a `FeedPostComments.tsx`; '
               'súbory nad 500 riadkov sa nemenia.'),
    dict(n='344', davka='K35',
         co='Okno detailu príspevku na počítači: zdieľaná ponuka a portfólio v dvoch stĺpcoch a užšie okno len s textom (R53).',
         preco='NEJASNÉ (najprv mapovanie: dotyk `FeedPostDetailOverlay.tsx` a `FeedPostDetailSplitLayout.tsx` a či treba zásah do '
               '`FeedPostCard.tsx`, ktorý má 1 033 riadkov; kód nemeň, kým majiteľ nepovie). Vzhľad je schválený (R53, obrázky '
               '`navrhy/pc-okno-ponuka.png` a `navrhy/pc-okno-text.png`).'),
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
