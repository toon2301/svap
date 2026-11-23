# -*- coding: utf-8 -*-
"""Nové nálezy od čísla 363: obrázky agenta k oknu detailu príspevku na počítači (23. 11. 2026).

Samostatný súbor kvôli limitu 500 riadkov; `polozky_nove.py` ich pripája do `NEW_ITEMS`. Pravidlá sú rovnaké ako inde: otvorený nález sa
po oprave odstráni odtiaľto a zapíše do `hotove_k40.DONE_SINCE_K40`; čísla sa nikdy nepoužívajú znova.

Oba nálezy zistil agent pri vykresľovaní okna s dlhým textom a veľa komentármi (výber majiteľa po obrázkoch, R69); oba existujú už dnes a
nie sú dôsledkom K57.
"""

from konstanty import A, EL, EM, ES, H, N, P, S_, V  # noqa: F401

NEW_ITEMS_K57 = [
    dict(n=363, bucket=P, imp=S_, eff=EM, pkg='Vzhľad Nástenky',
         kratko='okno detailu príspevku len s textom (aj repost textu) na počítači: pri štyroch a viac komentároch sa zoznam '
                'komentárov neposúva, pevný blok sa zmáčkne a pole „Napíš komentár“ vypadne pod okno',
         what='Zistil agent 23. 11. 2026 pri vykresľovaní okna detailu v Chromiu (vymyslené údaje; text s 15 riadkami, 14 '
              'komentárov, výška obrazovky 800 px); existuje už dnes, nie je to dôsledok K57. Jednostĺpcové okno (príspevok '
              'len s textom, repost textového príspevku, pod 1 024 px aj ponuka, portfólio a príspevok s fotkou) má len strop '
              'výšky `max-h-[95vh]`, nie pevnú výšku. Pri štyroch a viac komentároch sa zoznam komentárov neposúva: pevný blok '
              '(hlavička, text, riadok akcií) sa zmáčkne (pri 14 komentároch a texte s 15 riadkami na 128 px, text vidno na 2 '
              'riadky bez „Viac“), pole „Napíš komentár“ s tlačidlom „Pridať“ vypadne pod dolný okraj okna a komentáre '
              'pokračujú pod okraj, kde sa k nim nedá doscrollovať (posúvať sa dá len zmáčknutý pevný blok). PRÍČINA (zmerané '
              'v Chromiu): `flex-1` sekcie komentárov je `flex: 1 1 0%` a percentuálny základ sa pri nedefinitnej výške rodiča '
              '(okno má strop `max-h`, nie `h`) vyhodnotí ako obsah, takže sa zmrštenie rozdelí medzi pevný blok a komentáre '
              'podľa ich veľkosti; navyše `h-full` v koreni komentárov a v posuvnom ráme (`FeedPostComments.tsx:264` a `:287`, '
              'vetva `fillHeight`) sa v takom okne nevyhodnotí. Dvojstĺpcové okno (pevná výška `h-[95vh]`), mobilný detail '
              'a panel komentárov nad fotkou majú výšku pevnú a nie sú dotknuté. OPRAVA (R69 (1a): krok 4 dávky K57; prototyp '
              'agenta, zmerané v Chromiu): pevný blok sa nezmenšuje (`shrink-0`) a má strop poistky `max-h-[calc(95vh-11rem)]`, '
              'sekcia komentárov je flex stĺpec a nová vlastnosť `flexFill` komponentu `FeedPostComments` odovzdáva výšku '
              'flexom celým reťazcom; ostatné miesta ostávajú pri `h-full` (strážia to testy). Výsledok pri texte s 15 '
              'riadkami a 14 komentároch: zoznam komentárov má 226 px pri obrazovke 800 px, 369 px pri 950 px a 84 px pri '
              '650 px; pole „Napíš komentár“ a „Pridať“ je celé v okne vo všetkých meraných výškach od 650 px. Schválený '
              'vzhľad: `navrhy/pc-okno-dlhy-text-komentare-800-schvalene.png`, `pc-okno-dlhy-text-komentare-950-schvalene.png` '
              'a `pc-okno-dlhy-text-dnes-a-navrh-800-schvalene.png`.',
         note='JASNÉ (krok 4 dávky K57; karta `karty/K57.md`, podklady `karty/K57_podklady.md`; kód píše kolega, R67). '
              'Prototyp agenta (kópia mimo repozitára): 17 nových testov v troch nových súboroch (7 z nich pred zmenou padá, '
              'ďalších 10 stráži, že sa ostatné miesta nemenia), 20 zásahov z 20 zachytených, existujúce testy bez úpravy; '
              'menia sa `FeedPostDetailOverlay.tsx`, `FeedPostComments.tsx` (401 → 423 riadkov) a `FeedPostComments.types.ts` '
              '(68 → 76), žiadne `data-testid` sa nemení ani nepribúda. Dopad na E2E: žiadny (`support/feed-comments-ui.ts` '
              'hľadá len `feed-post-overlay-comments` a `feed-post-comments`). Odhad: stredný · M.',
         dec='ROZHODNUTIE R69', src='obrázky agenta k oknu detailu (23. 11. 2026)'),
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
