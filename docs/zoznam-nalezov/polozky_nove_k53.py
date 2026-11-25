# -*- coding: utf-8 -*-
"""Nové nálezy od čísla 361: ručný test majiteľa po K53 (22. 11. 2026). Nález 361 je od K59 (PR #332) hotový a jeho text je v `hotove_k59.py`; nález 362 je v K59 hotový len sčasti, jeho zvyšok (obrazovka detailu na iPhone) je opravený vo vetve 210 (PR #335) a čaká na zlúčenie a ručný test.

Samostatný súbor kvôli limitu 500 riadkov; `polozky_nove.py` ich pripája do `NEW_ITEMS`. Pravidlá sú rovnaké ako inde: otvorený nález sa
po oprave odstráni odtiaľto a zapíše do `hotove_k59.DONE_SINCE_K59` (staršie do `hotove_k40.DONE_SINCE_K40`); čísla sa nikdy nepoužívajú znova.

Obe zmeny zadal majiteľ presne (vzhľad aj správanie), takže R49 je splnené a návrh vzhľadu netreba. Obe menili DOM karty (trieda mena, riadok pôvodného autora v náhľade zdieľaného obsahu), preto išli až po poslednej dávke delenia K55 (dočasný odtlačok HTML karty sa počas delenia nikdy neaktualizuje, R45, a zmazala ho až K55); urobila ich dávka K59 (karta `karty/K59.md`).
"""

from konstanty import A, EL, EM, ES, H, N, P, S_, V  # noqa: F401

NEW_ITEMS_K53 = [
    dict(n=362, bucket=P, imp=S_, eff=ES, pkg='Vzhľad Nástenky',
         kratko='prezdieľaný príspevok (repost), ponuka a portfólio: po ťuknutí na avatar alebo meno pôvodného autora sa v '
                'obrazovke detailu na iPhone profil neotvoril (v karte na Nástenke a v okne detailu na počítači je preklik hotový '
                'v K59, v obrazovke detailu ho dopĺňa vetva 210, PR #335)',
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
         note='OPRAVENÉ V KÓDE, PR #335 ČAKÁ NA ZLÚČENIE A RUČNÝ TEST NA IPHONE (vetva 210, commit `082bd00a`, 25. 11. 2026; '
              'píše agent na pokyn majiteľa). HISTÓRIA: K59 (PR #332, zlúčené 25. 11. 2026 o 16:46 UTC, merge `8cced7e5`, '
              'commit `211e025c`; urobil kolega podľa karty `karty/K59.md`) napojila avatar a meno pôvodného autora na jeho '
              'profil v karte na Nástenke (počítač aj mobil) a v okne detailu na počítači (okno sa najprv zavrie); riadok je '
              'pri nedostupnom zdroji, bez id a adresy profilu, v dialógu zdieľania a pri zdieľaní vlastného obsahu naďalej bez '
              'prekliku; meno sa nepodčiarkuje; vzhľad riadka sa nezmenil (v Chromiu bajt po bajte rovnaká snímka karty). '
              'Obrazovka detailu na iPhone ostala bez prekliku: kolega sa tam zastavil, lebo obsah nad komentármi kreslí '
              '`FeedPostMobileDetailContent.tsx` bez `onClose` a `FeedPostMobileDetail.tsx` bol podľa karty v zozname súborov '
              'kola 3c (R80); zapísal to do commitu aj do manuálu ako známu odchýlku. RUČNÝ TEST MAJITEĽA (25. 11. 2026, iPhone '
              'po nasadení K59): v obrazovke detailu sa pri prezdieľanom textovom príspevku, príspevku s fotkou, zdieľanej '
              'ponuke aj portfóliu po ťuknutí na meno alebo avatar pôvodného autora nič nestalo (očakávanie: detail sa zatvorí '
              'a otvorí sa profil); na počítači a priamo na Nástenke na iPhone preklik funguje; je to presne ten zvyšok, preto '
              'k nemu nevznikol nový nález. OPRAVA: `FeedPostMobileDetail.tsx` (376 → 385 riadkov) zostavuje `openSharedOwner` '
              '(`openUserProfile` s vlastníkom zo `shared_content.owner` a `beforeNavigate: onClose`; `undefined` bez '
              'vlastníka) a cez novú voliteľnú vlastnosť `openSharedOwner` v `FeedPostMobileDetailContent.tsx` (237 → 245 '
              'riadkov) ho podáva karte ako `onOpenOwner`; kartu z K59 ani iné súbory som nemenil, takže sa obrazovka pred '
              'odchodom na profil zatvorí rovnako ako pri prekliku na zdroj, tlačidlo sa kreslí len pri dostupnom zdroji a '
              'vlastníkovi s id alebo adresou profilu a pri zdieľaní vlastného obsahu sa riadok nekreslí. OVERENIE (podľa '
              'výsledku): nový súbor testov `FeedPostMobileDetail.vlastnikZdielania.test.tsx` (13 testov, pred opravou padalo '
              '10 z 13): štyri druhy zdieľaného obsahu (meno aj avatar: najprv zatvorenie, potom profil), preklik bez otvorenia '
              'zdroja a fotoprehliadača, profil podľa id bez adresy, vlastné zdieľanie, nedostupný zdroj a vlastník bez id aj '
              'adresy bez prekliku; zásahy do kódu 6 zo 7 zachytených, prežil ekvivalentný (vlastník z vlastnosti `post` '
              'namiesto stavu `currentPost`: úprava príspevku vlastníka zdieľaného obsahu nemení); `tsc` a ESLint čisté, celý '
              'Jest 696 sád a 10 168 testov bez pádu. Po úspešnom ručnom teste sa nález presunie medzi hotové. Ručne po oprave: '
              'štyri druhy zdieľaného obsahu na iPhone v obrazovke detailu (ťuk na meno aj na avatar: obrazovka sa zavrie a '
              'otvorí sa profil) a ťuk na text alebo fotku náhľadu otvára zdroj ako doteraz. JASNÉ. Dopad na E2E: žiadny '
              '(`feed-shared-card-owner` E2E nepoužíva). Odhad: nízky · S.',
         dec=None, src='ručný test majiteľa po K53 (22. 11. 2026) a po K59 (25. 11. 2026)'),
]
