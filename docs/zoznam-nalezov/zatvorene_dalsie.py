# -*- coding: utf-8 -*-
"""Nálezy zatvorené rozhodnutím majiteľa po prvom vydaní zoznamu: `CLOSED_SINCE`.

Zatvorený nález nie je opravený v kóde, preto nepatrí do `hotove_dalsie.DONE_SINCE_DALSIE`; zobrazí sa v časti 8 spolu s pôvodnými
zatvorenými (`povodny_zoznam.json`). Postup: nález odstrániť z `ORIG_OPEN` (`polozky_povodne.py`) alebo z `NEW_ITEMS` a pridať sem s číslom,
rozhodnutím z `stav.DECISIONS` (musí byť rozhodnuté, teda mať `odpoved`), dátumom a textom, ktorý hovorí, prečo sa nález zatvoril.
Kontrola v `model.py` overí číslovanie, existenciu rozhodnutia a že zatvorený nález nie je zároveň otvorený ani hotový.
"""

CLOSED_SINCE = [
    dict(n=12, rozhodnutie='R17', datum='6. 11. 2026',
         text='ZATVORENÉ rozhodnutím R17 (6. 11. 2026): presakujúce `?tab=offers` v adrese (mobilné nastavenia, prvé otvorenie cudzieho '
              'profilu z hlavičky konverzácie, stránka vyhľadávania) je kozmetika, nie chyba. Overené v kóde: parameter `tab` čítajú len '
              'profil (`profile/profileTabQuery.ts`, neznáme hodnoty zahodí) a žiadosti (`requests/requestsRouting.ts`, neznáme hodnoty '
              'padnú na predvolenú), takže zvyšok v adrese nič nemení.'),
    dict(n=121, rozhodnutie='R17', datum='6. 11. 2026',
         text='ZATVORENÉ rozhodnutím R17 (6. 11. 2026): záznam stránky vyhľadávania dostane `?tab=offers` pri otvorení profilu z výsledkov; '
              'je to kozmetika. Overené v kóde: stránka vyhľadávania parameter `tab` nečíta (čítajú ho len profil a žiadosti).'),
    dict(n=269, rozhodnutie='R22', datum='6. 11. 2026',
         text='ZATVORENÉ rozhodnutím R22 (6. 11. 2026; nález zo zoznamu majiteľa, ktorý odznak vedel ako novú funkciu): odznak „overený '
              'účet“ znamená potvrdený e-mail a je to zámer majiteľa. Používateľ ho získa overením e-mailu (odkaz z registrácie, alebo '
              'Nastavenia, záložka Účet, `VerifyEmailSection`) a ukazuje sa pri avatare profilu, vo vyhľadávaní a v zozname konverzácií '
              '(`User.is_verified`). Príznak `can_use_verified_badge` pre prémiovú úroveň v `accounts/services/entitlements.py` sa nikde '
              'nepoužíva a ostáva na prípadnú budúcu funkciu.'),
    dict(n=275, rozhodnutie='R25', datum='7. 11. 2026',
         text='ZATVORENÉ rozhodnutím R25 (7. 11. 2026; nález majiteľa z manuálneho testu po K7, príčinu našiel kolega v K8, PR #237, bez '
              'zmeny kódu): účet B nevidel účet A (hľadanie, ponuky, príspevky na Nástenke, profil z konverzácie „Profil používateľa sa '
              'nepodarilo načítať.“), lebo účet A má súkromný profil (`is_public = false`), čo je zámerné správanie aplikácie. Po '
              'prepnutí A na verejný ho B našiel (potvrdil majiteľ). Nešlo o chybu v databáze ani o blokovanie. Tá istá príčina '
              'spôsobila nenačítané fotky účtu A (nález 274, oprava v K9). Účty A a B sú účty z E2E testov (`.env.e2e`; majiteľ '
              '7. 11. 2026): E2E, ktoré hľadajú A z B, ho pri súkromnom A nenájdu (stav dát), čo sa môže týkať nálezu 209. Text pri '
              'súkromnom profile pôsobí ako chyba: nález 290. Skupina HNEĎ je tým prázdna.'),
]
