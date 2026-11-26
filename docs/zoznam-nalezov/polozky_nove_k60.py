# -*- coding: utf-8 -*-
"""Nové nálezy od čísla 378: kandidáti z mapovania K60 (kolega, PR #336), ktoré agent overil čítaním kódu a sondami 25. 11. 2026.

Samostatný súbor kvôli limitu 500 riadkov; `polozky_nove.py` ich pripája do `NEW_ITEMS`. Pravidlá sú rovnaké ako inde: otvorený nález sa po oprave odstráni odtiaľto a zapíše do `hotove_k59.DONE_SINCE_K59` (alebo do novšieho súboru hotových); čísla sa nikdy nepoužívajú znova.
"""

from konstanty import A, EL, EM, ES, H, N, P, S_, V  # noqa: F401

NEW_ITEMS_K60 = [
    dict(n=378, bucket=P, imp=S_, eff=ES, pkg='Zdieľanie a obrázky',
         kratko='fotka ponuky prepnutá na zamietnutú sa po zdieľaní naďalej posiela cudzím používateľom cez náhľad prezdieľaného '
                'príspevku',
         what='Mapovanie K60 (kolega, `karty/K60_vysledok.md`, PR #336; agent overil nezávislou sondou cez API 25. 11. 2026): '
              'endpoint náhľadu zdieľaného obsahu (`views/feed_image_files.py:99-111`) kontroluje len viditeľnosť príspevku a '
              'zdroja, nie stav fotky, a uložený kľúč (`sharing.py:246-255`) sa po zdieľaní nikdy neobnovuje. Keď sa schválená '
              'fotka ponuky prepne na zamietnutú, zdroj už nemá schválenú fotku, no náhľad sa cudzím (aj anonymovi) naďalej '
              'posiela (odpoveď 200, `thumbnail_url` zadaná), kým sa nezmaže zdieľanie alebo fotka.',
         note='JASNÉ: rieši ho karta K61 spolu s 371 (možnosť 1, náhľad naživo zo zdroja s kontrolou stavu fotky), osobitná '
              'oprava netreba. ÚZKE: v dnešnom kóde žiadna cesta schválenú fotku automaticky nezamietne '
              '(`feed_image_processing.py:62-79` sa pri schválenej fotke hneď vráti, fotky ponúk nemajú kód, ktorý by stav '
              'nastavil na zamietnutý, nahlásenie stav nemení), stav sa dá zmeniť len ručne v administrácii '
              '(`OfferedSkillImageAdmin`), preto stredná dôležitosť. Test (nový súbor pri oprave 371): zamietnutá fotka dá '
              '`thumbnail_url` `null` a endpoint 404. Dopad na E2E: žiadny. Odhad: nízky · S (v rámci 371).',
         dec=None, src='mapovanie K60 (kolega, PR #336; overil agent 25. 11. 2026)'),
    dict(n=379, bucket=A, imp=N, eff=ES, pkg='Nástenka a zdieľanie',
         kratko='ponuka s fotkou zo starého nahrávania (schválená, ale bez `approved_key`) sa zdieľa bez náhľadu',
         what='Mapovanie K60 (kolega, `karty/K60_vysledok.md`, PR #336; agent overil čítaním kódu a sondou 25. 11. 2026): starý '
              'synchrónny endpoint na nahrávanie fotky ponuky (`views/skills.py` okolo r.423) zakladá riadok '
              '`OfferedSkillImage` len s poľom `image`: stav je predvolene schválený a `approved_key` je prázdny. Zdieľanie '
              'ponuky (`sharing.py:246-255`) preberá len riadky s neprázdnym `approved_key`, takže ponuka s takouto fotkou sa '
              'zdieľa bez náhľadu už pred akoukoľvek zmenou fotky (na karte „Bez fotografie“), hoci sama ponuka fotku ukazuje. '
              'Endpoint je pri nastavenom úložisku vypnutý (`views/skills.py:352-360`), riadky však mohli zostať z čias, keď '
              'bol zapnutý.',
         note='NEJASNÉ: výskyt v produkcii neviem. Najprv dopyt len na čítanie v prostredí s dátami (spúšťa majiteľ alebo '
              'agent): počet `OfferedSkillImage` so stavom `approved` a prázdnym `approved_key`. Ak je počet nulový, nález sa '
              'zatvorí; ak nie, oprava je jednorazové doplnenie `approved_key` (príkaz alebo migrácia, rozhodne majiteľ) alebo '
              'čítanie aj poľa `image` v náhľade. Pozor: oprava 371 (možnosť 1) tieto riadky sama nevylieči, ak číta len '
              '`approved_key`. Dopad na E2E: žiadny. Odhad: nízky · S.',
         dec=None, src='mapovanie K60 (kolega, PR #336; overil agent 25. 11. 2026)'),
]
