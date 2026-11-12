# -*- coding: utf-8 -*-
"""Poradie prác pre kolegu (dávky) a voliteľný stav ich riešenia.

Poradie je návrh agenta (malé, lokálne zmeny s nízkym rizikom, ktoré nemenia súbory nad 500 riadkov); schvaľuje majiteľ. Od 6. 11. 2026 smie
kolega robiť aj nálezy PRED NASADENÍM a HNEĎ (predtým len PO NASADENÍ), preto fronta smie obsahovať ktorýkoľvek otvorený nález. Súbor sa
upravuje len pri zmene poradia alebo keď je nález hotový:
- keď je nález hotový, záznam sa odstráni odtiaľto a nález sa presunie do `hotove_dalsie.DONE_SINCE_DALSIE`;
- stav riešenia je voliteľný: ak sa zapíše, vyplnia sa spolu `kto`, `stav` (`STAV_ROZROBENE` alebo `STAV_CAKA`) a `od` (dátum).

Od 5. 11. 2026 sa polia `kto`, `stav` a `od` pri práci kolegu nevyplňujú: v kóde pracuje vždy len jeden a začiatok aj koniec práce
hlási majiteľ (postup je v `README.md`, časť „Postup s kolegom“). Záznam bez týchto polí sa v zozname zobrazí ako „nesleduje sa“,
nie ako voľný, lebo kým kolega pracuje, zoznam o tom nevie. Polia a ich kontrola ostávajú pre prípad, že by sa postup zmenil.

Dávky K1 až K19 sú zlúčené (K6 až K18 sú v `hotove_dalsie.py`, K19 je v nálezu 321; z K16 zostáva mapovanie nálezu 319, z K17 nič, lebo nález 311 majiteľ 12. 11. 2026 uzavrel (R38), z K18 toast pri nálezu 325 a z K19 rozhranie nálezu 321): K8 (mapovanie nálezov 275, 274 a 276) sa robila na dva razy,
PR #237 a #238 (druhé kolo sa volalo K9), dávka drobných opráv (193, 279, 277, 281) išla ako K10 (PR #239), K11 (PR #241) bola o fotkách
na frontende (279, 293, 291 a 292, ktorý je PO NASADENÍ a majiteľ ho do dávky zaradil 7. 11. 2026), K12 (PR #242) o súkromí a CI (282, 246,
194 a časť 204), K13 (PR #244) o starom endpointe fotiek ponúk, zámkoch pri zmazaní účtu, CI prekladoch a toastoch (301, 296, 297 a časť
302), K14 (PR #245) o zámku závislostí, obnove prihlásenia a prechodných stavoch Nastavení (244, 286 a časť 245) a K15 (PR #250)
o obrazovke Popis ponuky na mobile, farbách polí pri zmene hesla a sieťovej chybe v toastoch (322, 323, 320 a 306) a K16 (PR #253) o
varovaní v Upozorneniach a o načítavaní Sledovania (308, 309 a 310) a K17 (PR #254) o ôsmich natívnych `alert()` a o roli `alert`
pri chybe Blokovaných (302 a 312) s mapovaním 311. Dávky K16 a K17 navrhol agent 8. a 9. 11. 2026 podľa ručných testov majiteľa po
K14: K16 začínala nálezom 319 (mapovanie, výsledok od kolegu čaká) a pokračovala zvyškami po 286 (308 až 310), K17 dopĺňala zvyšok
nálezov PRED NASADENÍM (302 s výnimkou R31, 311) a končila nálezom PO NASADENÍ 312 (karta `karty/K17.md`); K18 (PR #255) opravila tri chyby z ručných testov po K17 (327, 325 a 326; karta `karty/K18.md`; z 325 zostáva toast), K19 (PR #257) boli etapy 1 a 2 nálezu 321 (backend; karta `karty/K19.md`), K20 je etapa 3a nálezu 321 spolu s 319 (karta `karty/K20.md`) a K21 toast pri 325 spolu s výzvou na push (etapa 3b nálezu 321). Nález HNEĎ 318
(push na iPhone) je zatvorený: príčinou bolo nastavenie v Railway (rollout 5 %), nie kód (R33). Zvyšok nálezu 245 (overenie v logoch Railway, prípadný `api.ts` s výnimkou) v poradí nie je: čaká na majiteľa. Nález 321 (kategórie upozornení; R32 (a): pred štartom) má plán po etapách v nálezu 321: etapy 1 a 2 sú zlúčené v K19 a etapa 3 ide ako K20 a K21. Dávky PO-A a PO-B sú pôvodne navrhnuté dávky zo 6. 11. 2026 (24, 22, 23, 26 a 247, 248, 250, 256) z nálezov
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
             'NASADENÍM a HNEĎ; majiteľ môže pomer dočasne zmeniť, napr. na 1 : 1). K6 až K19 sú hotové (z K16 čaká mapovanie 319, z K18 toast '
             'pri 325, z K19 rozhranie nálezu 321; nález 311 z K17 majiteľ uzavrel, R38); '
             'vetvy agenta 167 až 174 sú len zoznam (majiteľ 7. 11. 2026: opravy nálezov agentom sa odkladajú, kým majiteľ nedá '
             'vedieť). Dávku K20 (etapa 3a nálezu 321 spolu s 319 a štyrmi docstringami, frontend) navrhol agent 12. 11. 2026 po zlúčení K19 '
             'a čaká na schválenie; K21 (toast pri 325 a výzva na push, etapa 3b nálezu 321) ide po nej; '
             'dávky PO-A a PO-B sú staršie návrhy z nálezov PO NASADENÍ a číslo K dostanú, až keď pôjdu kolegovi.')

STAV_ROZROBENE = 'rozrobené'
STAV_CAKA = 'čaká na zlúčenie'
STAVY = (STAV_ROZROBENE, STAV_CAKA)

# Záznam: dict(n='221', co='krátky popis', preco='prečo je v dávke a v tomto poradí'); voliteľne navyše davka='K13' a
# kto='kolega', stav=STAV_ROZROBENE, od='3. 11. 2026' (od 5. 11. 2026 sa nepoužíva). ID je reťazec (číslo nálezu alebo ID z
# registra, napr. 'APP-05').
FRONTA = [
    dict(n='321', davka='K20',
         co='Upozornenia: kategórie v rozhraní (etapa 3a): sedem volieb zo servera, hlavný vypínač podľa R35, premenovaná '
            'kategória a preklady; server je hotový v K19.',
         preco='JASNÉ. Rozhodnutia R34 až R36 sú zodpovedané; server (etapy 1 a 2) je zlúčený a nasadený (K19, PR #257) a '
               'manuálne testy prešli. Rozhranie ide v dvoch dávkach: K20 (sedem volieb, hlavný vypínač, názov a opis kategórie, '
               'preklady, oprava 319 a štyri docstringy v teste) a K21 (výzva na push, R36 a). Dotknuté súbory majú pod 500 '
               'riadkov (`NotificationSettingsModule.tsx` 150, `notifications/Desktop.tsx` 293, `Mobile.tsx` 220, '
               '`useNotificationPreferences.ts` 123, `usePushMessagesPreference.ts` 311). Etapa 4 (E2E) je úloha Codexa po '
               'nasadení K20.'),
    dict(n='319', davka='K20',
         co='Upozornenia: pri vypnutom internete sa prepínač Správ prepne bez chybovej hlášky a stav ostane po pripojení.',
         preco='NEJASNÉ (najprv mapovanie). Mapovanie z K16 od kolegu nedošlo, K20 ho urobí ako krok 0 na čistom `main` (kód '
               'nemení, kým ho nenapíše); oprava ide spolu s etapou 3 nálezu 321, lebo oba menia tie isté súbory (offline zmenu '
               'neodoslať a ukázať chybu, pri zlyhaní vrátiť len zmenenú hodnotu, preložené texty s diakritikou pre všetkých '
               'sedem volieb). Ak sa prejav ukáže aj po K20, ide o nový nález.'),
    dict(n='325', davka='K21',
         co='Mazanie recenzie: po úspešnom zmazaní ukázať toast „Recenzia bola vymazaná.“ (zvyšok po K18).',
         preco='JASNÉ. Backendová časť je hotová v K18 (PR #255) a manuálne testy prešli; zostáva toast (R37 c). Výnimka pre '
               '`OfferReviewsView.tsx` (692 riadkov) je udelená (R37 b a c) s podmienkou, že nová logika mazania ide do nového súboru '
               'a pôvodný súbor nenarastie; ak sa to bez rastu nedá, kolega sa zastaví a nahlási to bez zmeny kódu. K21 pridá aj '
               'výzvu na povolenie push z etapy 3 nálezu 321 (R36 a), takže ide o dva nezávislé celky v jednej dávke.'),
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
