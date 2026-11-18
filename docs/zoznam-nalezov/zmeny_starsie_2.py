# -*- coding: utf-8 -*-
"""Starší denník zmien dokumentu (12. 11. 2026 až 12. 11. 2026): `ZMENY_STARSIE_2`, najnovšie hore.

Samostatný súbor kvôli limitu 500 riadkov; `stav.py` ho pripája pred `ZMENY_STARSIE` (z `zmeny_starsie.py`). Nový záznam sa pridáva na začiatok `stav.ZMENY`.
"""

ZMENY_STARSIE_2 = [
    ('12. 11. 2026',
      'Vetva 173, doplnok po kontrole CodeRabbitu (PR #256, hlavička `8f5ada90`; CI `checks` a `backend-postgres` zelené, '
      'Codex bez nálezov, názov PR „173“ je len neurčitá kontrola). (1) Tri pripomienky CodeRabbitu sú platné a opravené: '
      'karta K19 hovorila, že existujúce testy prejdú bez zmeny, hoci rozšírená odpoveď `push/preferences/` zmení presné '
      'porovnanie dvoch kľúčov v `test_dashboard_settings_preferences.py` (štyri tvrdenia; karta teraz povoľuje len ich '
      'úpravu a spätnú kompatibilitu opisuje ako zachovanie pôvodných dvoch kľúčov); záver pri 223 o vylúčení zastaranej '
      'pamäte platí len vtedy, keď bola cookie v relácii aspoň raz čitateľná (`getCsrfToken()` inak vráti token z odpovede '
      'z pamäte); `PushPreferencesSerializer` neznáme kľúče pri známom kľúči ticho ignoruje (agent overil v kóde), preto '
      'karta K19 žiada odmietnuť každý neznámy kľúč a test zmiešanej požiadavky (jediný klient posiela vždy jeden známy '
      'kľúč). (2) Rozhodnutie R38: majiteľ nález 311 pri používaní nezaregistroval a nechce riskovať nové chyby v spoločnom '
      'hooku `useIsMobile()`, preto sa nález uzatvára; ak sa prejav objaví, dá vedieť a otvorí sa nový nález s odkazom na '
      '311. Z K17 tým nezostáva nič otvorené. (3) Druhé kolo CodeRabbitu (09:50 UTC, hlavička `f9ca9ebe`) malo dve drobné '
      'pripomienky k textu pri 223 a 245, obe platné a opravené: tvrdenie, odkiaľ pochádza hlavička `X-CSRFToken`, je teraz '
      'podmienené stavom `cookieWasReadable` (aj pri 245) a úspešné `GET /api/auth/csrf-token/` v logu servera sa nepokladá '
      'za dôkaz, že prehliadač cookie uložil alebo neskôr poslal. Dopad na E2E: žiadny.'),
    ('12. 11. 2026',
      'Vetva 173, doplnok po K18 (vychádza z `main` `65cb117e`, teda po PR #255; main je zlúčený do vetvy). (1) K18 (PR '
      '#255, zlúčené 12. 11. 2026 o 07:02 UTC; 3 commity): hotové 326 a 327, z 325 je hotová backendová časť (odpoveď 204 '
      'bez tela). Agent vetvu pred otvorením PR skontroloval (hlavička PR `7482f0a8` je tá istá): backendové testy recenzií '
      '45 prešlo, celý Jest 577 sád a 8 636 testov, tsc, ESLint a kontroly prekladov čisté, nové testy pred opravou padajú. '
      'CI (`checks`, `backend-postgres`) zelené; Codex (P1) aj CodeRabbit (Major) mali po jednej pripomienke k pravidlu 500 '
      'riadkov pri `SkillsModuleRouter.tsx`, ktorú majiteľ zodpovedal udelením výnimky R37 (a), CodeRabbit to vzal na '
      'vedomie; názov PR „K18“ bez popisu je len neurčitá kontrola. Manuálne testy majiteľa prešli. Kolega pri 325 živo '
      'overil príčinu na produkčnom builde Next s gunicornom (zlyháva už samotný DELETE, nie až nasledujúci GET) a ohlásil '
      'dva kandidáty bez čísla: zástupné texty „… a stlačte Enter“ a 511 riadkov v `reviews.py` (obe v `poznamky.md`). Z '
      '325 zostáva toast „Recenzia bola vymazaná.“ (R37 c), ošetrenie zlyhania načítania (R37 b) sa nerobí, lebo príznaky '
      'zmizli. (2) Výsledok Codexa: dym na `main` `65cb117e` prešiel bez pádu (41 / 0 / 10 za 1 min 51 s); pád otvorenia '
      'konverzácie z K16 sa nezopakoval (doplnok v 223); plný beh čaká na okno. (3) Poradie: K19 (etapy 1 a 2 nálezu 321, '
      'backend) je ďalšia, K20 bude etapa 3 spolu s 319 a K21 toast pri 325. (4) Postup od K15: nové číslované nálezy z '
      'dávky 0 (325 až 327 vznikli z ručných testov po K17), samostatná strana nebola potrebná, chyby zachytené dymovým '
      'testom 0; odporúčanie agenta je postup ponechať. Dopad na E2E: žiadny.'),
]
