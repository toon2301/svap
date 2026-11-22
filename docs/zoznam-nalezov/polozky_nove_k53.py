# -*- coding: utf-8 -*-
"""Nové nálezy od čísla 361: ručný test majiteľa po K53 (22. 11. 2026).

Samostatný súbor kvôli limitu 500 riadkov; `polozky_nove.py` ich pripája do `NEW_ITEMS`. Pravidlá sú rovnaké ako inde: otvorený nález sa
po oprave odstráni odtiaľto a zapíše do `hotove_k40.DONE_SINCE_K40`; čísla sa nikdy nepoužívajú znova.

Obe zmeny zadal majiteľ presne (vzhľad aj správanie), takže R49 je splnené a návrh vzhľadu netreba. Obe menia DOM karty (trieda mena,
riadok pôvodného autora v náhľade zdieľaného obsahu), preto ich nemožno robiť pred poslednou dávkou delenia K55: dočasný odtlačok HTML
karty (44 stavov) sa počas delenia nikdy neaktualizuje (R45) a zmaže ho až K55. Majiteľ k času opravy nič nepovedal; agent ich zatiaľ
zaradil do rovnakej skupiny ako 357 až 360 (po redizajne komentárov a rozložení príspevkov), nech sa počet krokov pred redizajnom nezvyšuje.
"""

from konstanty import A, EL, EM, ES, H, N, P, S_, V  # noqa: F401

NEW_ITEMS_K53 = [
    dict(n=361, bucket=P, imp=N, eff=ES, pkg='Vzhľad Nástenky',
         kratko='meno autora príspevku sa podčiarkuje pri prejdení kurzorom (počítač) a po ťuknutí (mobil), na Nástenke aj v '
                'detaile príspevku, pri vlastných aj cudzích príspevkoch; podčiarkovanie sa má zrušiť, klik na meno má '
                'ďalej otvárať profil',
         what='Ručný test majiteľa po K53 (22. 11. 2026): na Nástenke aj v detaile príspevku sa meno autora príspevku '
              'podčiarkuje: na počítači pri prejdení kurzorom, na mobile po ťuknutí; platí pri vlastných aj cudzích '
              'príspevkoch. Požiadavka majiteľa: meno autora sa nesmie podčiarkovať pri žiadnej interakcii (kurzor, ťuk, '
              'kliknutie); kliknutie na meno musí naďalej otvárať profil autora. Vzhľad zadal majiteľ, takže R49 je '
              'splnené. Pozorovanie agenta z čítania kódu (nie je to mapovanie): podčiarkovanie robí trieda '
              '`hover:underline` (spolu s `underline-offset-2` a `disabled:no-underline`) na tlačidle s menom v hlavičke '
              'karty (`FeedPostCardHeader.tsx`, od K53 samostatný súbor; tá istá hlavička je na Nástenke aj v okne '
              'detailu na počítači); na mobile ju spúšťa stav `hover`, ktorý po ťuknutí ostáva. Obrazovka detailu na '
              'mobile (`FeedPostMobileDetail.tsx`) a fotoprehliadač (`FeedPhotoViewerChrome.tsx`) podčiarkovanie pri mene '
              'autora nemajú. Rovnaká trieda je pri mene autora komentára (`FeedCommentItem.tsx`); majiteľ ju nežiadal '
              '(rozsah je len meno autora príspevku), ak chce rovnako aj mená autorov komentárov, povie.',
         note='JASNÉ (po K55): zmena je jedna trieda na jednom mieste a test, kolega ju urobí bez mapovania. NIE PRED K55: '
              'zmena triedy zmení dočasný odtlačok HTML karty (44 stavov), ktorý sa počas delenia nikdy neaktualizuje (R45) '
              'a ktorý zmaže až K55; po K55 sa dá triedu zmeniť spolu s novým testom (názvy po slovensky, R62). Zatiaľ ide po '
              'redizajne spolu s 357 až 360 a 362; ak majiteľ chce nález skôr, ide to ako jedna malá zmena hneď po K55 bez '
              'ďalšej dávky navyše. Po oprave sa v manuáli ručných testov (`sablony/dymovy_test.md`, krok 9) odstráni známa '
              'odchýlka. Odhad: nízky · S.',
         dec=None, src='ručný test majiteľa po K53 (22. 11. 2026)'),
    dict(n=362, bucket=P, imp=S_, eff=EM, pkg='Vzhľad Nástenky',
         kratko='prezdieľaný príspevok (repost): po kliknutí na avatar alebo meno pôvodného autora sa nič nestane, profil '
                'sa neotvorí (počítač aj mobil); má sa otvoriť profil pôvodného autora a meno sa nesmie podčiarkovať',
         what='Ručný test majiteľa po K53 (22. 11. 2026): v prezdieľanom príspevku sa zobrazuje avatar a meno pôvodného '
              'autora; po kliknutí na avatar alebo meno sa nič nestane a profil sa neotvorí. Výskyt: počítač aj mobil. '
              'Požiadavka majiteľa: kliknutie na avatar alebo meno pôvodného autora musí otvoriť jeho profil na počítači '
              'aj na mobile; meno pôvodného autora sa nesmie podčiarkovať pri prejdení kurzorom ani po kliknutí. '
              'Pozorovanie agenta z čítania kódu (nie je to mapovanie): avatar a meno kreslí `SharedContentPreviewCard.tsx` '
              '(riadok `data-testid="feed-shared-card-owner"`) ako obyčajný `div` s `InitialsAvatar` a `span`, bez tlačidla '
              'a bez obsluhy kliku, a leží mimo tlačidla textu náhľadu; preto sa nestane nič ani na mobile. Dáta karty '
              '(`SharedContentCardOwner` v `sharedContentCard.ts`) nesú len meno a adresu avatara, no feed API pri '
              'zdieľanom obsahu posiela aj objekt vlastníka (`shared_content.owner` s `id` a `slug`; je `null`, keď je '
              'zdroj nedostupný), na ktorom sa dá postaviť preklik cez `openUserProfile` '
              '(`feedProfileNavigation.ts`). Ten istý riadok sa kreslí aj pri zdieľanej ponuke a portfóliu (vlastník '
              'ponuky alebo portfólia); agent predpokladá, že požiadavka platí aj tam, lebo ide o ten istý prvok, ak by '
              'majiteľ chcel len repost, povie. Náhľad v dialógu zdieľania používa tú istú kartu bez objektu vlastníka z '
              'API, tam má riadok ostať bez prekliku.',
         note='JASNÉ (po K55): požiadavka je úplná a príčina známa (neinteraktívny riadok), kolega ju overí a opraví; ak sa '
              'ukáže, že `shared_content.owner` nie je dostupný vo všetkých tokoch (nedostupný zdroj má `owner` `null`, vtedy '
              'riadok ostáva bez prekliku; ak by bolo treba zásah do backendu), napíše krátku stranu a zastaví sa. NIE PRED K55: zmena riadku zmení dočasný odtlačok HTML karty (44 stavov; '
              'stavy s reposterom, ponukou a portfóliom), ktorý sa počas delenia nikdy neaktualizuje (R45) a ktorý zmaže '
              'až K55; mení sa `SharedContentPreviewCard.tsx` (355 riadkov) a `sharedContentCard.ts`, nie súbory nad 500 '
              'riadkov. Ide po redizajne spolu s 357 až 361, lebo sa dotýka toho istého náhľadu (357 text pôvodného '
              'príspevku, 344 natiahnutie fotky); ak majiteľ chce nález skôr, povie. Dôležité pri práci: avatar a meno sú '
              'samostatný ovládací prvok vedľa tlačidla textu náhľadu (tlačidlo v tlačidle je neplatné HTML), v okne '
              'detailu sa pred odchodom zatvára okno (`beforeNavigate`, ako pri hlavičke karty), meno sa nepodčiarkuje '
              '(rovnako ako 361). Dopad na E2E: žiadny špec v `frontend/e2e` nepoužíva `feed-shared-card-owner` '
              '(vyhľadávanie: 0 výskytov). Odhad: stredný · M.',
         dec=None, src='ručný test majiteľa po K53 (22. 11. 2026)'),
]
