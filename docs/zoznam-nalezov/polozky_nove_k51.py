# -*- coding: utf-8 -*-
"""Nové nálezy od čísla 357: ručný test majiteľa po K51 (22. 11. 2026).

Samostatný súbor kvôli limitu 500 riadkov; `polozky_nove.py` ich pripája do `NEW_ITEMS`. Pravidlá sú rovnaké ako inde: otvorený nález sa
po oprave odstráni odtiaľto a zapíše do `hotove_k40.DONE_SINCE_K40`; čísla sa nikdy nepoužívajú znova.

Majiteľ ich chce opraviť hneď po redizajne komentárov a rozložení príspevkov (261 a 344), lebo sa dotýkajú tých istých miest. Agent ich
zatiaľ nemapoval (pokyn majiteľa z 22. 11. 2026: najprv vysvetlenie, potom zápis); všetky sú NEJASNÉ a kód sa nemení, kým majiteľ nepovie.
K51 je podľa kontroly agenta doslovný presun kódu (z 812 neprázdnych riadkov pôvodnej karty chýbajú v nových súboroch len dva riadky
obalu ternára), takže správanie nezmenila a nálezy sú staršie správanie.
"""

from konstanty import A, EL, EM, ES, H, N, P, S_, V  # noqa: F401

NEW_ITEMS_K51 = [
    dict(n=357, bucket=P, imp=S_, eff=EM, pkg='Vzhľad Nástenky',
         kratko='prezdieľaný príspevok (repost): text pôvodného príspevku sa v náhľade skracuje na 4 až 5 riadkov a '
                'chýba „Viac“, takže sa nedá prečítať celý (Nástenka aj detail, počítač aj iPhone)',
         what='Ručný test majiteľa po K51 (22. 11. 2026): keď používateľ prezdieľa príspevok s dlhším textom, z '
              'pôvodného príspevku sa v náhľade zobrazia len prvé 4 až 5 riadkov a chýba tlačidlo „Viac“, takže si '
              'celý text nemožno prečítať. Výskyt: Nástenka aj detail príspevku, počítač aj mobil (iPhone). '
              'Očakávanie majiteľa: pri skrátenom texte pôvodného príspevku je dostupné „Viac“, ktoré zobrazí celý '
              'text. Agent kód nemapoval a príčinu nezisťoval. K51 správanie nezmenila (doslovný presun, pozri '
              'hlavičku tohto súboru), ide o staršie správanie.',
         note='NEJASNÉ: najprv mapovanie (kolega podľa pravidla z 18. 11. 2026, ak majiteľ nepovie inak), kód sa '
              'nemení, kým majiteľ nepovie. Ide po redizajne komentárov a rozložení príspevkov (261 a 344), lebo sa '
              'týka tých istých miest (náhľad zdieľaného príspevku `SharedContentPreviewCard.tsx` a blok '
              '`FeedPostSharedBlock.tsx`; miesta sú len predbežný odhad z toho, kde sa náhľad kreslí). Vzhľad „Viac“ '
              'sa nemení (R49): použije sa ten, ktorý v appke už je. Odhad: stredný · M.',
         dec=None, src='ručný test majiteľa po K51 (22. 11. 2026)'),
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
         note='NEJASNÉ: najprv mapovanie (kolega podľa pravidla z 18. 11. 2026, ak majiteľ nepovie inak; treba '
              'zistiť, či text pri zdieľaní ponuky a portfólia vzniká a ukladá sa, a prečo sa nezobrazí), kód sa '
              'nemení, kým majiteľ nepovie. Ide po redizajne komentárov a rozložení príspevkov (261 a 344). Môže '
              'siahnuť aj na backend (zápis textu pri zdieľaní ponuky a portfólia). Manuál ručných testov '
              '(`sablony/dymovy_test.md`, krok 9) tvrdí, že text zdieľajúceho je nad náhľadom; kým sa nález '
              'neopraví, uvádza tam výnimku. Odhad: stredný · M.',
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
         note='NEJASNÉ: ide spolu s redizajnom (261, skupina 8; implementuje agent podľa R64) a zoznam označených je od '
              'K51 v `FeedPostSharedBlock.tsx` (`<ul data-testid="feed-post-tags">`). Vzhľad zadal majiteľ '
              '(obyčajný text bez bubliny), detaily (farba vo svetlom a tmavom režime, medzery, či meno vedie na '
              'profil) agent podľa R49 najprv potvrdí s majiteľom v návrhu; bez schváleného vzhľadu sa kód '
              'nemení. Odhad: nízky · S.',
         dec=None, src='ručný test majiteľa po K51 (22. 11. 2026) a snímka z počítača'),
    dict(n=360, bucket=P, imp=S_, eff=EM, pkg='Navigácia a Späť',
         kratko='mobil: po kliknutí na upozornenie k príspevku alebo na príspevok na Nástenke sa niekedy neotvorí '
                'dnešná obrazovka detailu, ale starý spôsob (stránka príspevku); starý spôsob sa má odstrániť aj z kódu',
         what='Ručný test majiteľa po K51 (22. 11. 2026), len mobil, dve snímky z mobilu. NOVÝ spôsob je samostatná '
              'obrazovka detailu (hlavička s krížikom a menu „…“, komentáre pod príspevkom, pole na komentár pri '
              'spodku bez spodnej lišty). STARÝ spôsob je príspevok otvorený ako stránka vnútri aplikácie (hore ikona '
              'profilu, dole spodná lišta, komentáre priamo pod príspevkom; pole na komentár je čiastočne zakryté '
              'spodnou lištou). Po kliknutí na upozornenie k príspevku alebo na príspevok na Nástenke sa niekedy '
              'otvorí starý spôsob namiesto nového. Požiadavka majiteľa: vždy nový spôsob a starý úplne odstrániť '
              'aj z kódu, aby sa už nepletol do budúcna. Pozorovanie agenta z čítania kódu (nie je to mapovanie): existuje '
              'samostatná stránka príspevku (`FeedPostDetailModule`, adresa príspevku), na ktorú vedie napríklad '
              'preklik z repostnutého príspevku na pôvodný príspevok (`feedSharedContentNavigation.ts`); či je to '
              'starý spôsob z tohto nálezu a ktoré cesty ho otvárajú, zistí mapovanie.',
         note='NEJASNÉ: najprv mapovanie (kolega podľa pravidla z 18. 11. 2026, ak majiteľ nepovie inak): ktoré '
              'cesty otvárajú starý spôsob (upozornenia, Nástenka, preklik z repostu, adresa príspevku), čo '
              'z kódu odstrániť a čo ho má nahradiť na mobile aj na počítači; kód sa nemení, kým majiteľ nepovie. Ide '
              'po redizajne komentárov a rozložení príspevkov (261 a 344). Možný dopad na E2E (neoverené): špecy '
              '`feed-post-detail.spec.ts` a `notification-click.spec.ts`. Odhad: stredný · M.',
         dec=None, src='ručný test majiteľa po K51 (22. 11. 2026) a dve snímky z mobilu'),
]
