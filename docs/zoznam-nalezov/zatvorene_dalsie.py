# -*- coding: utf-8 -*-
"""Nálezy zatvorené rozhodnutím majiteľa po prvom vydaní zoznamu: `CLOSED_SINCE`.

Zatvorený nález nie je opravený v kóde, preto nepatrí do `hotove_k20.DONE_SINCE_K20`; zobrazí sa v časti 8 spolu s pôvodnými
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
    dict(n=318, rozhodnutie='R33', datum='9. 11. 2026',
         text='ZATVORENÉ (9. 11. 2026, rozhodnutie R33 (a); nález HNEĎ z ručného testu majiteľa po K14, príčinu našla diagnostika z '
              'logov Railway, bez zmeny kódu): push upozornenia na správy na iPhone po K14 nechodili, lebo premenná '
              '`WEB_PUSH_MESSAGES_ROLLOUT_PERCENT` bola v Railway nastavená na 5. Log workera pri dvoch testovacích správach ukázal '
              '`recipient_count=1`, `rollout_skipped_count=1`, `delivered_count=0` a `skipped_reason=rollout_5`, teda backend push '
              'preskočil a k odoslaniu službe Apple nedošlo (`accounts/services/webpush_rollout.py`: príjemca je v zapnutej skupine, '
              'len ak `ID účtu % 100` je menšie ako nastavené percento). Majiteľ potvrdil príčinu v nastaveniach Railway, zmenil '
              'premennú na 100 a oznámil, že upozornenia na správy fungujú. Nebola to chyba kódu ani regresia K14. Rozsah postupného '
              'zapínania pri ostrom štarte rieši R33. Skupina HNEĎ je tým prázdna. Poznámka bez čísla: zapísať nastavenie rollout do '
              'logu pri štarte (`poznamky.md`).'),
    dict(n=324, rozhodnutie='R32', datum='9. 11. 2026',
         text='ZATVORENÉ rozhodnutím R32 (9. 11. 2026): nález vznikol z odporúčania agenta (b), teda skryť hlavný vypínač a päť '
              'kategórií upozornení, ktoré nič neukladajú, kým sa nedokončia. Majiteľ zvolil (a): kategórie sa dokončia pred štartom '
              '(nález 321) a nefunkčné prepínače sa dovtedy skrývať nebudú. Kód sa nemenil.'),
    dict(n=311, rozhodnutie='R38', datum='12. 11. 2026',
         text='ZATVORENÉ rozhodnutím R38 (12. 11. 2026; nález kolegu z K14, mapovanie K17, bez zmeny kódu): `useIsMobile()` '
               '(`frontend/src/hooks/useIsMobile.ts`) vráti v prvom vykreslení `isMobile: false` a `isResolved: false` a pravdivú '
               'hodnotu až po efekte, takže vetvy `isMobile ? A : B` v `ModuleRouter.tsx` (439 riadkov) môžu mať na mobile krátko iný '
               'alebo prázdny prvý snímok. Kolega pri K17 zmeral posun 0,022 (Správy) a 0,031 (Žiadosti) a navrhol opravu v hooku cez '
               '`useSyncExternalStore` (odhad M); spoločný hook používa veľa komponentov a oprava by nezlepšila prvé vykreslenie na '
               'serveri. Majiteľ prejav pri používaní nezaregistroval a nechce kvôli nemu riskovať nové chyby, preto sa nález '
               'uzatvára; ak sa prejav v používaní ukáže, majiteľ dá vedieť a otvorí sa nový nález s odkazom na 311. Zvyšky po 286 sú '
               'tým uzavreté (308 až 310 sú hotové v K16).'),
]
