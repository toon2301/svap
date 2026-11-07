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

Dávky K1 až K7 sú hotové a zlúčené (K6 a K7 sú v `hotove_dalsie.py`). Dávka K8 je mapovanie nových nálezov 275, 274 a 276 kolegom (majiteľ
7. 11. 2026: príčinu nájde kolega, agent ich nemapuje). Dávky K9 a K10 sú pôvodne navrhnuté dávky z 6. 11. 2026 (24, 22, 23, 26 a 247,
248, 250, 256) z nálezov PO NASADENÍ; neurobili sa, lebo majiteľ 6. 11. 2026 určil, že kolega začne nálezmi PRED NASADENÍM, takže K6 a K7
boli iné nálezy. Kľúč `davka` je len označenie dávky pre čitateľa. Poradie dávok určuje majiteľ (`SCHVALENE`).

Kontrola v `model.py` zlyhá, ak záznam odkazuje na nález, ktorý už nie je otvorený (je hotový, zatvorený alebo neexistuje), takže
zoznam nemôže ticho zastarať.
"""

SCHVALENE = ('Majiteľ 6. 11. 2026 schválil striedanie 2 : 1 (dve dávky kolegu, potom jedna vetva agenta; kolega smie robiť aj nálezy PRED '
             'NASADENÍM a HNEĎ; majiteľ môže pomer dočasne zmeniť, napr. na 1 : 1). K6 a K7 sú hotové; vetva agenta 167 je len zoznam '
             '(majiteľ 7. 11. 2026: opravy nálezov agentom sa odkladajú, kým majiteľ nedá vedieť). Majiteľ 7. 11. 2026 určil, že nálezy 274, '
             '275 a 276 zmapuje kolega (dávka K8). Dávky K9 a K10 sú návrh agenta a čakajú na schválenie.')

STAV_ROZROBENE = 'rozrobené'
STAV_CAKA = 'čaká na zlúčenie'
STAVY = (STAV_ROZROBENE, STAV_CAKA)

# Záznam: dict(n='221', co='krátky popis', preco='prečo je v dávke a v tomto poradí'); voliteľne navyše davka='K8' a
# kto='kolega', stav=STAV_ROZROBENE, od='3. 11. 2026' (od 5. 11. 2026 sa nepoužíva). ID je reťazec (číslo nálezu alebo ID z
# registra, napr. 'APP-05').
FRONTA = [
    dict(n='275', davka='K8', co='Účet B nevidí účet A (hľadanie, ponuky, príspevky, profil „Profil používateľa sa nepodarilo načítať.“), '
                                'hoci medzi nimi nie je blokovanie; účet A vidí účet B normálne.',
         preco='Najzávažnejší z nových nálezov (HNEĎ), možný problém v dátach. Majiteľ 7. 11. 2026: príčinu nájde kolega, agent ho nemapuje.'),
    dict(n='274', davka='K8', co='Fotky v príspevkoch na Nástenke sa na účte A nenačítajú (pokazený obrázok), na účte B sú v poriadku.',
         preco='Deje sa na tých istých testovacích účtoch ako 275, spoločná príčina nie je preukázaná; mapovanie ju potvrdí alebo vyvráti. '
               'Kvôli nemu sa nedal urobiť manuálny test nálezu 91.'),
    dict(n='276', davka='K8', co='Mobil: pri prepínaní medzi hlavnými obrazovkami (profil, Nástenka, Správy…) obsah krátko preblikne.',
         preco='Vzhľadová vec, preto pred nasadením; mapovanie rovnako patrí kolegovi (majiteľ 7. 11. 2026).'),
    dict(n='24', davka='K9', co='`setHighlightedSkillId(null)` necháva hodnotu v `sessionStorage` (priame volania setteru namiesto '
                                '`clearHighlighting()`).',
         preco='Zoznam majiteľa ho vedie ako pravdepodobne reálnu chybu; hook `useDashboardHighlighting.tsx` má 346 riadkov. Najprv overiť, '
               'ktoré volania nulujú surový setter, a doplniť test.'),
    dict(n='22', davka='K9', co='`useDashboardHighlighting` prijíma 0, −3 a 1,5 ako ID zvýraznenia; handler upozornení vyžaduje celé číslo od 1.',
         preco='Malá validácia v tom istom hooku ako 24, jeden súbor a test.'),
    dict(n='23', davka='K9', co='Nedosiahnuteľná vetva `null` v `parseRequestsTargetUrl`.',
         preco='Odstránenie mŕtveho kódu v krátkom súbore `requestsRouting.ts` (56 riadkov); správanie stráži existujúci test.'),
    dict(n='26', davka='K9', co='Nadbytočný alebo nedosiahnuteľný kód na viacerých miestach (napr. `setIsSearchOpen(false)`, zdvojené '
                                '`?? null`, zbytočné `Number.isFinite`; konkrétne miesta si kolega overí).',
         preco='Upratanie malých miest v navigačných hookoch; každé miesto vo vlastnom commite, súbory nad 500 riadkov sa nemenia '
               '(`DashboardContent.tsx` má 711).'),
    dict(n='247', davka='K10', co='Klik na položku histórie sa pri písaní ruší až po odoslaní hľadania, nie hneď.',
         preco='Dohrávka po APP-05 (K4): zrušiť rozbehnutý klik hneď pri zmene textu, test do `useRecentSearches.race.test.tsx`.'),
    dict(n='248', davka='K10', co='Zrušené textové hľadanie nezresetuje `isRevalidating` (v UI nedosiahnuteľné).',
         preco='Ten istý súbor `useSearchApi.tsx` (223 riadkov) ako 247; riešiť spolu.'),
    dict(n='250', davka='K10', co='Chýba test resetu súhrnu profilu pri otvorení profilu z vyhľadávania (`useDashboardNavigation.tsx:289`).',
         preco='Len test; `useDashboardNavigation.tsx` má 514 riadkov, takže sa súbor nemení.'),
    dict(n='256', davka='K10', co='`FeedLikersDialog.tsx` otvára profil vlastným eventom namiesto spoločného `openUserProfile()`.',
         preco='Jeden malý súbor (209 riadkov), vzor je v `feedProfileNavigation.ts`; doplniť test rovnako ako pri ostatných miestach.'),
]
