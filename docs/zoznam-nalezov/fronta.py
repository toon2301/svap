# -*- coding: utf-8 -*-
"""Poradie prác na nálezoch „po nasadení“ (dávky pre kolegu) a voliteľný stav ich riešenia.

Poradie je návrh agenta (malé, lokálne zmeny s nízkym rizikom, ktoré nekolidujú s prácou pred nasadením); schvaľuje majiteľ.
Súbor sa upravuje len pri zmene poradia alebo keď je nález hotový:
- keď je nález hotový, záznam sa odstráni odtiaľto a nález sa presunie do `hotove_dalsie.DONE_SINCE_DALSIE`;
- stav riešenia je voliteľný: ak sa zapíše, vyplnia sa spolu `kto`, `stav` (`STAV_ROZROBENE` alebo `STAV_CAKA`) a `od` (dátum).

Od 5. 11. 2026 sa polia `kto`, `stav` a `od` pri práci kolegu nevyplňujú: v kóde pracuje vždy len jeden a začiatok aj koniec práce
hlási majiteľ (postup je v `README.md`, časť „Postup s kolegom“). Záznam bez týchto polí sa v zozname zobrazí ako „nesleduje sa“,
nie ako voľný, lebo kým kolega pracuje, zoznam o tom nevie. Polia a ich kontrola ostávajú pre prípad, že by sa postup zmenil.

Dávky K1 až K5 sú hotové a zlúčené. Od 6. 11. 2026 fronta obsahuje dve ďalšie dávky (K6 a K7); kľúč `davka` je len označenie dávky
pre čitateľa. Poradie dávok schválil majiteľ 6. 11. 2026 (`SCHVALENE`).

Kontrola v `model.py` zlyhá, ak záznam odkazuje na nález, ktorý už nie je otvorený alebo nie je zo skupiny PO NASADENÍ, takže
zoznam nemôže ticho zastarať.
"""

SCHVALENE = 'Majiteľ 6. 11. 2026 schválil poradie: kolega K6, potom vetva agenta 167, potom kolega K7 a ďalej striedavo 1:1.'

STAV_ROZROBENE = 'rozrobené'
STAV_CAKA = 'čaká na zlúčenie'
STAVY = (STAV_ROZROBENE, STAV_CAKA)

# Záznam: dict(n='221', co='krátky popis', preco='prečo je v dávke a v tomto poradí'); voliteľne navyše davka='K6' a
# kto='kolega', stav=STAV_ROZROBENE, od='3. 11. 2026' (od 5. 11. 2026 sa nepoužíva). ID je reťazec (číslo nálezu alebo ID z
# registra, napr. 'APP-05').
FRONTA_PO_NASADENI = [
    dict(n='24', davka='K6', co='`setHighlightedSkillId(null)` necháva hodnotu v `sessionStorage` (priame volania setteru namiesto '
                                '`clearHighlighting()`).',
         preco='Zoznam majiteľa ho vedie ako pravdepodobne reálnu chybu; hook `useDashboardHighlighting.tsx` má 346 riadkov. Najprv overiť, '
               'ktoré volania nulujú surový setter, a doplniť test.'),
    dict(n='22', davka='K6', co='`useDashboardHighlighting` prijíma 0, −3 a 1,5 ako ID zvýraznenia; handler upozornení vyžaduje celé číslo od 1.',
         preco='Malá validácia v tom istom hooku ako 24, jeden súbor a test.'),
    dict(n='23', davka='K6', co='Nedosiahnuteľná vetva `null` v `parseRequestsTargetUrl`.',
         preco='Odstránenie mŕtveho kódu v krátkom súbore `requestsRouting.ts` (56 riadkov); správanie stráži existujúci test.'),
    dict(n='26', davka='K6', co='Nadbytočný alebo nedosiahnuteľný kód na viacerých miestach (napr. `setIsSearchOpen(false)`, zdvojené '
                                '`?? null`, zbytočné `Number.isFinite`; konkrétne miesta si kolega overí).',
         preco='Upratanie malých miest v navigačných hookoch; každé miesto vo vlastnom commite, súbory nad 500 riadkov sa nemenia '
               '(`DashboardContent.tsx` má 711).'),
    dict(n='247', davka='K7', co='Klik na položku histórie sa pri písaní ruší až po odoslaní hľadania, nie hneď.',
         preco='Dohrávka po APP-05 (K4): zrušiť rozbehnutý klik hneď pri zmene textu, test do `useRecentSearches.race.test.tsx`.'),
    dict(n='248', davka='K7', co='Zrušené textové hľadanie nezresetuje `isRevalidating` (v UI nedosiahnuteľné).',
         preco='Ten istý súbor `useSearchApi.tsx` (223 riadkov) ako 247; riešiť spolu.'),
    dict(n='250', davka='K7', co='Chýba test resetu súhrnu profilu pri otvorení profilu z vyhľadávania (`useDashboardNavigation.tsx:289`).',
         preco='Len test; `useDashboardNavigation.tsx` má 514 riadkov, takže sa súbor nemení.'),
    dict(n='256', davka='K7', co='`FeedLikersDialog.tsx` otvára profil vlastným eventom namiesto spoločného `openUserProfile()`.',
         preco='Jeden malý súbor (209 riadkov), vzor je v `feedProfileNavigation.ts`; doplniť test rovnako ako pri ostatných miestach.'),
]
