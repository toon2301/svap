# -*- coding: utf-8 -*-
"""Nové nálezy od čísla 363: obrázky agenta k oknu detailu príspevku na počítači (23. 11. 2026).

Samostatný súbor kvôli limitu 500 riadkov; `polozky_nove.py` ich pripája do `NEW_ITEMS`. Pravidlá sú rovnaké ako inde: otvorený nález sa
po oprave odstráni odtiaľto a zapíše do `hotove_k40.DONE_SINCE_K40`; čísla sa nikdy nepoužívajú znova.

Oba nálezy zistil agent pri vykresľovaní okna s dlhým textom a veľa komentármi (výber majiteľa po obrázkoch, R69); oba existovali už pred
K57 a nie sú jej dôsledkom. Nález 363 (komentáre v jednostĺpcovom okne) je od dávky K57 (PR #323) hotový; jeho text je v `hotove_k40.py`.
Otvorený je len 364.
"""

from konstanty import A, EL, EM, ES, H, N, P, S_, V  # noqa: F401

NEW_ITEMS_K57 = [
    dict(n=364, bucket=P, imp=N, eff=ES, pkg='Vzhľad Nástenky',
         kratko='okno detailu len s textom na počítači: rozbalený dlhý text („Menej“) má strop štvrtinu výšky obrazovky, '
                'takže pod 800 px ukáže menej riadkov než zbalený',
         what='Zistil agent 23. 11. 2026 pri obrázkoch okna s textom s 15 riadkami; existuje už dnes. Zbalený text ukáže 10 '
              'riadkov (`DETAIL_CAPTION_LINES`, `line-clamp-[10]`), rozbalený v jednostĺpcovom okne má strop `max-h-[25vh]` '
              '(`FeedPostCaption.tsx:68`, `BOUNDED_EXPANDED_MAX_HEIGHT.compact`) s vlastným posunom; riadok má 20 px, takže '
              'strop je 10 riadkov pri výške obrazovky 800 px. Zmerané v Chromiu (text s 15 riadkami, vidno riadkov zbalený / '
              'rozbalený): výška obrazovky 650 px 10 / 8, 720 px 10 / 9, 760 px 10 / 10, 800 px 10 / 10, 950 px 10 / 12, '
              '1 000 px 10 / 13. Pod 800 px je teda rozbalený rámik KRATŠÍ než zbalený (po „Viac“ riadkov ubudne) a pri 800 px '
              'rovnaký (po „Viac“ zmizne len „…“ a zvyšných 5 riadkov sa doscrolluje vnútri textu). Dnes to v okne s komentármi '
              'nebolo vidno, lebo sa pri štyroch a viac komentároch pevný blok zmáčkol (nález 363). R49: zmena vzhľadu zbaleného '
              'alebo rozbaleného textu potrebuje návrh a schválenie majiteľa. Možnosti, ktoré agent ukázal: (A) nechať; (B) '
              'rozbalený rámik nikdy nižší než zbalený (`max-h-[max(25vh,12.5rem)]`); (C) zbalený text kratší (napríklad 6 '
              'riadkov); (D) strop 40 % výšky obrazovky (pri 650 px by sa zapla poistka pevného bloku).',
         note='NEJASNÉ (najprv návrh vzhľadu s možnosťami a odporúčaním, R49; kód nemeň). Majiteľ 23. 11. 2026 podľa R69 (2a): '
              'správanie sa nemení a zapisuje sa ako nález; rieši sa s redizajnom komentárov (261, R59), kde sa rozhoduje o '
              'rovnováhe medzi textom a komentármi v malých oknách. Odporúčanie agenta: (A) nechať, kým sa nerieši spolu s '
              'komentármi. Odhad: nízky · S až M podľa zvolenej možnosti.',
         dec='ROZHODNUTIE R69', src='obrázky agenta k oknu detailu (23. 11. 2026)'),
]
