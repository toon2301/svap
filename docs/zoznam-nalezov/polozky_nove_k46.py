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
         note='Oprava je jeden riadok (`post={currentPost}`, dnes `FeedPostCardLayers.tsx:199`; dialóg je po delení karty v malom '
              'súbore s 204 riadkami) a ide v dávke K56 (R66 (a); karta `karty/K56.md`, napísaná 23. 11. 2026); test (úprava '
              'vlastného príspevku, otvorenie okna zdieľania, náhľad ukáže nový text) ide do nového súboru (R27) spolu s '
              'opravou. Dávka K48 test na dnešné chybné správanie nepísala, aby ho po oprave nebolo treba prepisovať. PROTOTYP '
              'AGENTA (23. 11. 2026, kópia `frontend` z `main` `46eb8d0b` mimo repozitára; overená verzia testov je v '
              '`karty/K56_podklady.md`): nový súbor testov má 3 testy, z nich 1 (náhľad po úprave ukáže nový text) pred '
              'opravou padá a po oprave prejde, ďalšie dva (pôvodný text pred úpravou a text z čerstvého feedu po úprave) '
              'prechádzajú pred opravou aj po nej; zásah späť na `post={post}` zachytí. Oprava sa dotýka aj dvoch komentárov v '
              '`FeedPostCardLayers.tsx`, ktoré o chybe hovoria. Dôležitosť a skupina sú predbežný návrh agenta (nízka; PRED '
              'NASADENÍM spolu s ostatnými chybami Nástenky). Odhad: nízky · S.',
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
         note='Oprava je v efektoch: premietnutie lajku do `currentPost` (E5) musí bežať aj po zmene `post`; efekt s '
              '`setCurrentPost(post)` (E4) musí ostať pred ním. Efekty E4 a E5 ostali po delení v `FeedPostCard.tsx` (K54 '
              'presunula do hookov len E6 a E7), preto ide oprava v dávke K56 (R66 (a); karta `karty/K56.md`) s vlastnými '
              'testami (ukážka v `karty/K46_podklady.md`, časť 2.3, a overená verzia v `karty/K56_podklady.md`). PROTOTYP '
              'AGENTA (23. 11. 2026, kópia z `main` `46eb8d0b` mimo repozitára): najmenšia oprava je pridať `post` do '
              'závislostí E5 (`[post, isLiked, likesCount]`), bez nového varovania ESLint; nový súbor testov má 6 testov, z '
              'nich 3 (detail po lajku, prehliadač fotky po lajku a detail po odobratí lajku, vždy po obnove feedu počas '
              'lajku) pred opravou padajú a po oprave prechádzajú. Iné možnosti sa nehodia: spojiť E4 a E5 do jedného '
              'efektu s `{ ...post, lajk }` by pri ďalšom lajku vrátilo starý text po úprave príspevku (E5 zámerne mení '
              '`previous`) a závislosť na `post.is_liked_by_me` a `post.likes_count` by chybu nechala (zastaraný snapshot má '
              'tie isté hodnoty ako pred lajkom, efekt by sa nespustil). Dôležitosť a skupina sú predbežný návrh agenta. '
              'Odhad: nízky · M.',
         dec='ROZHODNUTIE R66', src='K46 (kolega, 21. 11. 2026) a overenie agenta sondou v kópii'),
]
