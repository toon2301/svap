# -*- coding: utf-8 -*-
"""Poradie prác na nálezoch „po nasadení“ (dávky pre kolegu) a voliteľný stav ich riešenia.

Poradie je návrh agenta (malé, lokálne zmeny s nízkym rizikom, ktoré nekolidujú s prácou pred nasadením); schvaľuje majiteľ.
Súbor sa upravuje len pri zmene poradia alebo keď je nález hotový:
- keď je nález hotový, záznam sa odstráni odtiaľto a nález sa presunie do `hotove.DONE_SINCE`;
- stav riešenia je voliteľný: ak sa zapíše, vyplnia sa spolu `kto`, `stav` (`STAV_ROZROBENE` alebo `STAV_CAKA`) a `od` (dátum).

Od 5. 11. 2026 sa polia `kto`, `stav` a `od` pri práci kolegu nevyplňujú: v kóde pracuje vždy len jeden a začiatok aj koniec práce
hlási majiteľ (postup je v `README.md`, časť „Postup s kolegom“). Záznam bez týchto polí sa v zozname zobrazí ako „nesleduje sa“,
nie ako voľný, lebo kým kolega pracuje, zoznam o tom nevie. Polia a ich kontrola ostávajú pre prípad, že by sa postup zmenil.

Kontrola v `model.py` zlyhá, ak záznam odkazuje na nález, ktorý už nie je otvorený alebo nie je zo skupiny PO NASADENÍ, takže
zoznam nemôže ticho zastarať.
"""

STAV_ROZROBENE = 'rozrobené'
STAV_CAKA = 'čaká na zlúčenie'
STAVY = (STAV_ROZROBENE, STAV_CAKA)

# Záznam: dict(n='221', co='krátky popis', preco='prečo je v dávke a v tomto poradí'); voliteľne navyše
# kto='kolega', stav=STAV_ROZROBENE, od='3. 11. 2026' (od 5. 11. 2026 sa nepoužíva). ID je reťazec (číslo nálezu alebo ID z
# registra, napr. 'APP-05').
FRONTA_PO_NASADENI = [
    dict(n='221', co='Nepoužívaný súbor `backend/swaply/test_settings.py`.',
         preco='Zahrievacie, backend: žiadny import ho nepoužíva; overí sa spustením backendových testov.'),
    dict(n='195', co='`backend/.coveragerc`: zoznam `omit` obsahuje súbory, ktoré neexistujú.',
         preco='Zahrievacie, backend: oprava nastavenia; CI beží bez merania pokrytia (`--no-cov`), takže sa správanie nezmení.'),
    dict(n='226', co='Mŕtvy `frontend/middleware.ts` (Next ho v priečinku `src/` nehľadá).',
         preco='Zahrievacie, frontend: súbor sa nikdy nespúšťa a hlavičku `Cache-Control` posiela Next sám. Zmazať, nepresúvať '
               '(presun do `src/` by ho aktivoval pre celú aplikáciu).'),
    dict(n='32', co='Len koreňový sledovaný `.coverage` (98 KB, 241 absolútnych ciest z Windowsu): zmazať (`git rm`).',
         preco='Súhlas majiteľa 5. 11. 2026 (dávka K2). Nič ho nepoužíva; v histórii ostane. Ostatné časti nálezu 32 sa nemenia.'),
    dict(n='103', co='Mŕtvy súbor `SkillModals.tsx` (428 riadkov), nikde nepoužitý.',
         preco='Frontend: nikto ho neimportuje; overí sa `tsc`, buildom a Jestom.'),
    dict(n='58', co='`skillActionError.ts` (aj s testom) patrí k hooku `useOwnProfileOfferActions`, nie do `components/`.',
         preco='Frontend: presun jedného súboru a jedného importu; overí sa `tsc` a Jestom.'),
    dict(n='153', co='`OfferWatchSettingsMobile.tsx`: `inert` sa nastavuje imperatívne, v Reacte 19 má byť prop.',
         preco='Prvá skutočná zmena kódu: jeden súbor (268 riadkov), správanie stráži existujúci test '
               '`OfferWatchSettingsMobile.motion.test.tsx`.'),
    dict(n='178', co='ESLint hlási chyby a varovania v `search/hooks/useRecentSearches.tsx`.',
         preco='Typy a lint v jednom súbore (278 riadkov). Pozor na varovanie o závislostiach `useCallback`: oprava môže zmeniť správanie.'),
    dict(n='APP-05', co='Asynchrónne overenie položky histórie môže prepísať novší dotaz (`useRecentSearches.tsx`).',
         preco='Oprava preteku v tom istom súbore ako 178; potrebuje nový test.'),
    dict(n='134', co='Žiadna z mobilných animácií nerešpektuje `prefers-reduced-motion`.',
         preco='Používateľsky viditeľné (prístupnosť). Najprv zistiť rozsah, lebo niekoľko miest to už rieši; súbory nad 500 riadkov sa nemenia.'),
    dict(n='213', co='`CheckConstraint(check=…)` je od Djanga 5.1 zastarané a Django 6.0 `check` odstráni (21 miest v 7 súboroch modelov, '
                     '27 miest v 16 starých migráciách).',
         preco='Backend: premenovať `check` na `condition` v modeloch aj v starých migráciách (mení sa len názov argumentu, schéma nie); '
               'nesmie vzniknúť nová migrácia (stráži to `tests/test_migrations_up_to_date.py`, overiť aj `makemigrations --check`).'),
]
