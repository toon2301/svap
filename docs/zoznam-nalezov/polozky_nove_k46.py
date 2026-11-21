# -*- coding: utf-8 -*-
"""Nové nálezy od čísla 355: chyby nájdené pri dvojitom mapovaní delenia `FeedPostCard.tsx` (K46, 21. 11. 2026).

Samostatný súbor kvôli limitu 500 riadkov; `polozky_nove.py` ich pripája do `NEW_ITEMS`. Pravidlá sú rovnaké ako inde: otvorený nález sa
po oprave odstráni odtiaľto a zapíše do `hotove_k40.DONE_SINCE_K40`; čísla sa nikdy nepoužívajú znova.
"""

from konstanty import A, EL, EM, ES, H, N, P, S_, V  # noqa: F401

NEW_ITEMS_K46 = [
    dict(n=355, bucket=P, imp=N, eff=ES, pkg='Vzhľad Nástenky',
         kratko='okno zdieľania príspevku ukáže po úprave vlastného príspevku starý text a staré fotky (`FeedPostCard.tsx` '
                'dáva dialógu `post` namiesto `currentPost`)',
         what='Mapovanie K46 (21. 11. 2026), kolega aj agent nezávisle a rovnako: `FeedPostCard.tsx:1028` dáva dialógu '
              '`FeedPostShareModal` vlastnosť `post` (príspevok z feedu), kým po úprave vlastného príspevku drží novú '
              'verziu `currentPost` všetko ostatné v karte (text, fotky aj ostatné vrstvy); mobilný detail dáva tomu '
              'istému dialógu `currentPost` (`FeedPostMobileDetail.tsx:562`). Náhľad v dialógu skladá '
              '`FeedPostShareModal.tsx:39-47` z `post.caption` a `post.images`. Dôkaz kolegu aj agenta (sonda v kópii '
              'na pôvodnej karte): po uložení nového textu ukazuje karta „Novy text“ a okno zdieľania z tej istej karty '
              '„Povodny text“; zásah `post={currentPost}` prežil všetky existujúce testy. Dopad nízky: náhľad sa líši od '
              'výsledku (podľa kolegu server zdieľa aktuálny obsah príspevku; agent to v kóde servera nekontroloval).',
         note='Oprava je jeden riadok (`post={currentPost}`) a patrí do dávky K56 po poslednom presune, keď bude dialóg v '
              'malom súbore (`FeedPostCard.tsx` má 1 033 riadkov a podľa R23 sa nemení); test (úprava vlastného '
              'príspevku, otvorenie okna zdieľania, náhľad ukáže nový text) ide do nového súboru (R27) spolu s opravou. '
              'Dávka K48 test na dnešné chybné správanie nepíše, aby ho po oprave nebolo treba prepisovať. Podľa '
              'R66 (a) (majiteľ 21. 11. 2026) ide oprava v dávke K56 po poslednom presune. Dôležitosť a skupina sú '
              'predbežný návrh agenta (nízka; PRED NASADENÍM spolu s '
              'ostatnými chybami Nástenky). Odhad: nízky · S.',
         dec='ROZHODNUTIE R66', src='K46 (kolega aj agent nezávisle, 21. 11. 2026)'),
    dict(n=356, bucket=P, imp=N, eff=EM, pkg='Vzhľad Nástenky',
         kratko='obnova feedu počas prebiehajúceho lajku nechá v `currentPost` starý lajk: mobilný detail a prehliadač '
                'fotky sa otvoria s nesprávnym lajkom a počtom',
         what='Mapovanie K46 (21. 11. 2026): kolega našiel, agent reprodukoval na pôvodnej karte. V `FeedPostCard.tsx` '
              'efekt `:407-409` pri novom `post` z feedu vráti `currentPost` na hodnoty z feedu a efekt `:420-426`, ktorý '
              'premieta lajk do `currentPost`, beží len pri zmene lajku, takže sa po obnove feedu nespustí; hook lajku '
              'medzitým preberanie z feedu preskočí, lebo lajk práve beží. Dôkaz agenta (sonda v kópii): ťuk na lajk, '
              'obnova feedu so starým snapshotom príspevku, dokončenie lajku a otvorenie mobilného detailu: karta '
              'ukazuje lajk a počet 4, detail `aria-pressed="false"` a počet 3; rovnako sa správa prehliadač fotky. '
              'Dopad nízky (úzke časové okno medzi lajkom a odpoveďou feedu; stav sa napraví, až keď sa lajk alebo počet '
              'znova zmení).',
         note='Oprava je v efektoch (premietnutie lajku do `currentPost` musí bežať aj po zmene `post`; efekt s '
              '`setCurrentPost(post)` musí ostať pred ním) a po delení bude v hooku synchronizácie stavu (K54), preto '
              'ide až v dávke K56 s vlastnými testami (ukážka v `karty/K46_podklady.md`, časť 2.3). Dávka K48 test na dnešné '
              'chybné správanie nepíše a na chybu sa nespolieha. Možnosti (neoverené): spojiť prepis `currentPost` a '
              'premietnutie lajku do jedného efektu, alebo pridať `post` do závislostí efektu premietnutia; vyberie '
              'kolega pri oprave a odôvodní v commite. Podľa R66 (a) (majiteľ 21. 11. 2026) ide oprava v dávke K56 '
              'po poslednom presune. Dôležitosť a skupina sú predbežný návrh agenta. Odhad: nízky · M.',
         dec='ROZHODNUTIE R66', src='K46 (kolega, 21. 11. 2026) a overenie agenta sondou v kópii'),
]
