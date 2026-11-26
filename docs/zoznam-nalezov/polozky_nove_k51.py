# -*- coding: utf-8 -*-
"""Nové nálezy od čísla 357: ručný test majiteľa po K51 (22. 11. 2026). Nález 357 je od dávky K58 (PR #326) hotový, jeho text je v `hotove_k40.py`.

Samostatný súbor kvôli limitu 500 riadkov; `polozky_nove.py` ich pripája do `NEW_ITEMS`. Pravidlá sú rovnaké ako inde: otvorený nález sa
po oprave odstráni odtiaľto a zapíše do `hotove_k40.DONE_SINCE_K40`; čísla sa nikdy nepoužívajú znova.

Majiteľ ich chce opraviť hneď po redizajne komentárov a rozložení príspevkov (261 a 344), lebo sa dotýkajú tých istých miest. Agent ich
zatiaľ nemapoval (pokyn majiteľa z 22. 11. 2026: najprv vysvetlenie, potom zápis); všetky sú NEJASNÉ a kód sa nemení, kým majiteľ nepovie.
K51 je podľa kontroly agenta doslovný presun kódu (z 812 neprázdnych riadkov pôvodnej karty chýbajú v nových súboroch len dva riadky
obalu ternára), takže správanie nezmenila a nálezy sú staršie správanie.
"""

from konstanty import A, EL, EM, ES, H, N, P, S_, V  # noqa: F401

NEW_ITEMS_K51 = [
    dict(n=358, bucket=P, imp=S_, eff=EM, pkg='Vzhľad Nástenky',
         kratko='zdieľaná ponuka alebo portfólio: sprievodný text, ktorý zdieľajúci napísal, sa nad náhľadom '
                'nezobrazuje vôbec',
         what='Ručný test majiteľa po K51 (22. 11. 2026): keď používateľ zdieľa ponuku alebo portfólio, nad náhľadom '
              'zdieľaného obsahu sa nezobrazuje sprievodný text príspevku; používateľ vidí len náhľad ponuky alebo '
              'portfólia, nie text, ktorý k nemu patril. Výskyt: počítač aj mobil (iPhone). Očakávanie majiteľa: '
              'nad náhľadom sa zobrazí sprievodný text a ak je dlhý, má „Viac“ na rozbalenie. Pozorovanie agenta z '
              'čítania kódu pri K51 (nie je to mapovanie): karta text zdieľajúceho nad náhľadom kresliť má, keď ho '
              'príspevok obsahuje (`sharedCaptionNode` v `FeedPostSharedBlock.tsx`, pred K51 v `FeedPostCard.tsx`), '
              'takže príčina môže byť inde (text sa pri zdieľaní nezapíše alebo nepríde zo servera); agent to '
              'nezisťoval. K51 správanie nezmenila (doslovný presun).',
         note='NEJASNÉ: na čerstvom `main` sa NEREPRODUKUJE (mapovanie K60, kolega, `karty/K60_vysledok.md`, PR #336; agent to '
              'overil nezávisle 25. 11. 2026 na `main` `2384db22`). Text zdieľajúceho je `currentPost.caption` v karte, v okne '
              'aj v obrazovke detailu a kreslí sa nad náhľadom (`FeedPostSharedBlock.tsx:105-152`, '
              '`FeedPostMobileDetailContent.tsx:131-143`; poradie strážia testy `FeedMobileSharedContent.test.tsx:290` a '
              '`FeedPostDetailOverlay.offerPortfolioSplit.test.tsx:257`); všetky tri vstupy zdieľania posielajú '
              '`caption.trim()` a backend ho pri ponuke, portfóliu aj reposte uloží a vráti rovnako (odpoveď na vytvorenie, '
              'detail aj zoznam; samé biele znaky dajú prázdny text, 500 znakov prejde, 501 vráti 400; sondy cez API). Kolega '
              'to potvrdil aj v Chromiu (30 scén: tri druhy zdieľania, päť kontextov, svetlý a tmavý režim). Možné vysvetlenia '
              '(neoverené): text nebol napísaný alebo bol len z bielych znakov; v čase testu bola nasadená iná verzia okna (K58 '
              'menila rozloženie). ČAKÁ NA MAJITEĽA: jedno zdieľanie ponuky s textom na produkcii a pohľad na kartu, okno aj '
              'obrazovku na iPhone; ak text chýba, pošle čas, snímku a pole `caption` z odpovede `POST /feed/posts/` (bez '
              'osobných údajov); ak sa zobrazí, 358 sa zatvorí a agent odstráni výnimku v `sablony/dymovy_test.md`. Kód ani E2E '
              'sa nemení (E2E text zdieľajúceho nepoužíva). Odhad: stredný · M.',
         dec=None, src='ručný test majiteľa po K51 (22. 11. 2026)'),
    dict(n=359, bucket=P, imp=N, eff=ES, pkg='Vzhľad Nástenky',
         kratko='označení používatelia sú v karte príspevku fialové bubliny `@Meno`; majiteľ chce obyčajný text bez '
                'bubliny (podmnožina skupiny 8 z nálezu 261)',
         what='Ručný test majiteľa po K51 (22. 11. 2026), so snímkou z počítača: označení používatelia pod príspevkom '
              '(aj pri prezdieľanom príspevku) sú fialové zaoblené bubliny `@Meno` nad riadkom akcií. Majiteľ bublinu '
              'nechce: označené meno má byť obyčajný text `@Meno` bez pozadia, na počítači aj na mobile. Funkčnosť '
              'musí ostať: krížik pri vlastnom označení a potvrdenie odstránenia (majiteľ spomenul aj klikateľnosť '
              'mena; agent pri K51 videl, že meno dnes v karte klikateľné nie je, je to text v bubline a „x“ pri '
              'vlastnom označení, takže či má byť klikateľné, vysvetlí majiteľ). Zhoduje sa so skupinou 8 v nálezu '
              '261 (redizajn tagov: zrušiť farebné čipy a nahradiť ich obyčajným textom `@Meno`, tagy na vlastný '
              'riadok pod textom, ktoré sa balia a rozbaľujú spolu s „Viac“); tento nález je jej podmnožina.',
         note='NEJASNÉ: ide spolu s redizajnom (261, skupina 8; kód píše kolega podľa presnej karty agenta, R67; kto píše kód tagov, určí majiteľ osobitne, R76) a zoznam označených je od '
              'K51 v `FeedPostSharedBlock.tsx` (`<ul data-testid="feed-post-tags">`). Vzhľad zadal majiteľ '
              '(obyčajný text bez bubliny), detaily (farba vo svetlom a tmavom režime, medzery, či meno vedie na '
              'profil) agent podľa R49 najprv potvrdí s majiteľom v návrhu; bez schváleného vzhľadu sa kód '
              'nemení. Odhad: nízky · S.',
         dec=None, src='ručný test majiteľa po K51 (22. 11. 2026) a snímka z počítača'),
]
