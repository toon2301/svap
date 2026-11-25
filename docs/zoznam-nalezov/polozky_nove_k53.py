# -*- coding: utf-8 -*-
"""Nové nálezy od čísla 361: ručný test majiteľa po K53 (22. 11. 2026). Nález 361 je od K59 (PR #332) hotový a jeho text je v `hotove_k59.py`; nález 362 je v K59 hotový len sčasti a ostáva otvorený s užším rozsahom (obrazovka detailu na iPhone).

Samostatný súbor kvôli limitu 500 riadkov; `polozky_nove.py` ich pripája do `NEW_ITEMS`. Pravidlá sú rovnaké ako inde: otvorený nález sa
po oprave odstráni odtiaľto a zapíše do `hotove_k59.DONE_SINCE_K59` (staršie do `hotove_k40.DONE_SINCE_K40`); čísla sa nikdy nepoužívajú znova.

Obe zmeny zadal majiteľ presne (vzhľad aj správanie), takže R49 je splnené a návrh vzhľadu netreba. Obe menili DOM karty (trieda mena, riadok pôvodného autora v náhľade zdieľaného obsahu), preto išli až po poslednej dávke delenia K55 (dočasný odtlačok HTML karty sa počas delenia nikdy neaktualizuje, R45, a zmazala ho až K55); urobila ich dávka K59 (karta `karty/K59.md`).
"""

from konstanty import A, EL, EM, ES, H, N, P, S_, V  # noqa: F401

NEW_ITEMS_K53 = [
    dict(n=362, bucket=P, imp=S_, eff=ES, pkg='Vzhľad Nástenky',
         kratko='prezdieľaný príspevok (repost), ponuka a portfólio: po ťuknutí na avatar alebo meno pôvodného autora sa v '
                'obrazovke detailu na iPhone profil neotvorí (v karte na Nástenke a v okne detailu na počítači je preklik hotový '
                'v K59)',
         what='Ručný test majiteľa po K53 (22. 11. 2026): v prezdieľanom príspevku sa zobrazuje avatar a meno pôvodného autora; '
              'po kliknutí na avatar alebo meno sa nič nestane a profil sa neotvorí. Výskyt: počítač aj mobil. Požiadavka '
              'majiteľa: kliknutie na avatar alebo meno pôvodného autora musí otvoriť jeho profil na počítači aj na mobile; '
              'meno pôvodného autora sa nesmie podčiarkovať pri prejdení kurzorom ani po kliknutí. Pozorovanie agenta z čítania '
              'kódu (nie je to mapovanie): avatar a meno kreslí `SharedContentPreviewCard.tsx` (riadok '
              '`data-testid="feed-shared-card-owner"`) ako obyčajný `div` s `InitialsAvatar` a `span`, bez tlačidla a bez '
              'obsluhy kliku, a leží mimo tlačidla textu náhľadu; preto sa nestane nič ani na mobile. Dáta karty '
              '(`SharedContentCardOwner` v `sharedContentCard.ts`) nesú len meno a adresu avatara, no feed API pri zdieľanom '
              'obsahu posiela aj objekt vlastníka (`shared_content.owner` s `id` a `slug`; je `null`, keď je zdroj nedostupný), '
              'na ktorom sa dá postaviť preklik cez `openUserProfile` (`feedProfileNavigation.ts`). Ten istý riadok sa kreslí '
              'aj pri zdieľanej ponuke a portfóliu (vlastník ponuky alebo portfólia); agent predpokladá, že požiadavka platí aj '
              'tam, lebo ide o ten istý prvok, ak by majiteľ chcel len repost, povie. Náhľad v dialógu zdieľania používa tú '
              'istú kartu bez objektu vlastníka z API, tam má riadok ostať bez prekliku.',
         note='ČIASTOČNE HOTOVÉ (K59, PR #332, zlúčené 25. 11. 2026 o 16:46 UTC, merge `8cced7e5`; commit `211e025c`; kolega ju '
              'urobil podľa karty `karty/K59.md`): avatar a meno pôvodného autora sú tlačidlo a otvoria jeho profil v karte na '
              'Nástenke (počítač aj mobil) a v okne detailu na počítači (okno sa najprv zavrie); riadok je pri nedostupnom '
              'zdroji, bez id a adresy profilu, v dialógu zdieľania a pri zdieľaní vlastného obsahu naďalej bez prekliku; meno '
              'sa nepodčiarkuje; vzhľad riadka sa nezmenil (v Chromiu bajt po bajte rovnaká snímka karty). OSTÁVA obrazovka '
              'detailu na iPhone: kolega sa tam zastavil, lebo obsah nad komentármi kreslí `FeedPostMobileDetailContent.tsx` '
              'bez `onClose` a `FeedPostMobileDetail.tsx` bol podľa karty v zozname súborov kola 3c (R80); riadok pôvodného '
              'autora tam ostal `div` bez prekliku a v manuáli ručných testov je zapísaný ako známa odchýlka. RUČNÝ TEST '
              'MAJITEĽA (25. 11. 2026, iPhone po nasadení K59): v obrazovke detailu sa pri prezdieľanom textovom príspevku, '
              'príspevku s fotkou, zdieľanej ponuke aj portfóliu po ťuknutí na meno alebo avatar pôvodného autora nič nestane '
              '(očakávanie: detail sa zatvorí a otvorí sa profil); na počítači a priamo na Nástenke na iPhone preklik funguje. '
              'Je to presne ten zvyšok, preto k nemu nevznikol nový nález. JASNÉ: súbory kola 3c sú zlúčené (PR #333), takže '
              'nič nebrzdí. NÁVRH OPRAVY (agent, z čítania kódu; neoverený; kolega napísal vlastný návrh v správe majiteľovi): '
              '`FeedPostMobileDetail.tsx` (376 riadkov) zostaví `openSharedOwner` rovnako ako `FeedPostSharedBlock.tsx` '
              '(`openUserProfile(owner, { beforeNavigate: onClose })` s vlastníkom zo `shared_content.owner`; `undefined`, keď '
              'vlastník nie je) a podá ho novou vlastnosťou cez `FeedPostMobileDetailContent.tsx` (237 riadkov) do '
              '`SharedContentPreviewCard` ako `onOpenOwner`; pri zdieľaní vlastného obsahu (`hideOwner`) a pri nedostupnom '
              'zdroji ostane riadok bez prekliku; nový súbor testov (preklik zavrie obrazovku a pošle `goToUserProfile`; štyri '
              'druhy zdieľaného obsahu). Ručne po oprave: štyri druhy zdieľaného obsahu na iPhone v obrazovke detailu. Dopad na '
              'E2E: žiadny (`feed-shared-card-owner` E2E nepoužíva). Odhad: nízky · S.',
         dec=None, src='ručný test majiteľa po K53 (22. 11. 2026) a po K59 (25. 11. 2026)'),
]
