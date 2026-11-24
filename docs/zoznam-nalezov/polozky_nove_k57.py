# -*- coding: utf-8 -*-
"""Nové nálezy od čísla 363: obrázky agenta k oknu detailu príspevku na počítači (23. 11. 2026) a text príspevku v okne (365 až 368, 24. 11. 2026).

Samostatný súbor kvôli limitu 500 riadkov; `polozky_nove.py` ich pripája do `NEW_ITEMS`. Pravidlá sú rovnaké ako inde: otvorený nález sa
po oprave odstráni odtiaľto a zapíše do `hotove_k40.DONE_SINCE_K40`; čísla sa nikdy nepoužívajú znova.

Oba nálezy zistil agent pri vykresľovaní okna s dlhým textom a veľa komentármi (výber majiteľa po obrázkoch, R69); oba existovali už pred
K57 a nie sú jej dôsledkom. Nález 363 (komentáre v jednostĺpcovom okne) je od dávky K57 (PR #323) hotový; jeho text je v `hotove_k40.py`.
Otvorený je len 364.

Nálezy 365 až 367 vznikli z návrhu majiteľa k textu príspevku a oknu detailu na počítači (24. 11. 2026; rozhodnutia R71 až R73)
a rieši ich jedna dávka K58 (`karty/K58.md`); nález 368 zistil agent pri kontrole krokov K58 a vzhľad jeho opravy schválil majiteľ (R74); opraví ho agent po K58.
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
         note='JASNÉ (rieši K58, krok 1: rozbalený strop v jednostĺpcovom okne `max(25vh, 14rem)`, nikdy nižší než zbalený text; '
              'vzhľad schválil majiteľ 24. 11. 2026, R71). História: majiteľ 23. 11. 2026 podľa R69 (2a) rozhodol správanie '
              'nemeniť a zapísať ho ako nález; po návrhu jednotného „Viac“ a „Menej“ to 24. 11. 2026 zmenil (R71). Odhad: nízky · S.',
         dec='ROZHODNUTIE R71', src='obrázky agenta k oknu detailu (23. 11. 2026)'),
    dict(n=365, bucket=P, imp=N, eff=EM, pkg='Vzhľad Nástenky',
         kratko='text príspevku: „Viac“ a „Menej“ sa správajú na piatich miestach inak (karta 3 riadky, repost 4 riadky bez „Viac“, '
                'detail na mobile 5, okno na počítači 10, prehliadač fotky vždy „Viac“ pri 2 riadkoch)',
         what='Pripomienka majiteľa 24. 11. 2026: „Viac“ pri príspevku s viacerými riadkami textu pôsobí dosť divoko, chce to zjednotiť '
              'všade (Nástenka, detail príspevku, detail fotky, zdieľaný príspevok; počítač aj mobil). Agent zmeral dnešný stav v '
              'kópii `main` mimo repozitára: karta vo feede (`FeedPostCard.tsx`, `FeedPostCaption.tsx`): 3 riadky, „Viac“ len pri '
              'presahu, po rozbalení „Menej“; repost: text pôvodného príspevku je odsek `line-clamp-4` bez prepínača '
              '(`SharedContentPreviewCard.tsx:283`; nález 357); detail na mobile: 5 riadkov (`FeedPostMobileDetailContent.tsx:29`); '
              'okno na počítači: 10 riadkov a rozbalený strop `max-h-[25vh]` (nález 364); prehliadač fotky na mobile: vlastný '
              'text `line-clamp-2` so „Viac“ stále (aj pri krátkom texte) a bez „Menej“ (`FeedPhotoViewerChrome.tsx:99` a '
              '`:155`). Rozhodnutie R71: jedno pravidlo; návrh a obrázky schválil majiteľ.',
         note='JASNÉ (vzhľad schválený, R71; karta K58, krok 1; obrázky `navrhy/*viac-menej*-schvalene.png`). Rieši spolu s 357 a 364. '
              'Odhad: nízky · M.',
         dec='ROZHODNUTIE R71', src='majiteľ (24. 11. 2026), meranie agenta'),
    dict(n=366, bucket=P, imp=N, eff=EM, pkg='Vzhľad Nástenky',
         kratko='okno detailu na počítači: ponuka, portfólio a repost s fotkou sa pri dlhom alebo rozbalenom texte posúvajú '
                '(karta sa odrezáva), fotka sa pritom zmenšuje a neposúva',
         what='Pripomienka majiteľa 24. 11. 2026: pri rozbalenom texte nad ponukou alebo portfóliom vznikne v okne posúvanie na '
              'karte a to nechce; ponuka, portfólio aj fotka sa majú správať rovnako. Zmerané v Chromiu (kópia `main`, text s 15 '
              'riadkami, dvojstĺpcové okno): fotka sa zmenšuje a neposúva (141 px pri výške obrazovky 600 px); ponuka a portfólio '
              'posúvajú blok s textom a kartou (zbalený text 80 px pri 600 px a 32 px pri 650 px, rozbalený 120 px a 92 px, pri '
              '800 px nič); repost s fotkou má fotku pevných 256 px a posúva sa o 247, 199, 133 a 57 px pri 600, 650, 720 a 800 px '
              '(rozbalený text zdieľajúceho 287 px pri 600 px). Príčina: plocha karty ponuky a portfólia je pružná len po '
              'minimum 128 px a text nad ňou pružný nie je; pri reposte nie je pružná ani plocha (`SharedContentPreviewCard.tsx:158`, '
              '`stretch = fillHeight && !isPost`). Rozhodnutie R72: karta sa neposúva, ako prvé ustupuje text.',
         note='JASNÉ (vzhľad schválený, R72; karta K58, krok 2; obrázky `navrhy/pc-okno-fotka-ponuka-portfolio-bez-posuvania-schvalene.png` '
              'a `pc-okno-repost-s-fotkou-bez-posuvania-schvalene.png`). Odhad: nízky · M.',
         dec='ROZHODNUTIE R72', src='majiteľ (24. 11. 2026), meranie agenta'),
    dict(n=367, bucket=P, imp=N, eff=EM, pkg='Vzhľad Nástenky',
         kratko='okno detailu na počítači: príspevok len s textom (aj repost textového príspevku) má jeden stĺpec a užšie okno '
                '(576 px); majiteľ chce komentáre vpravo ako pri fotke, ponuke a portfóliu',
         what='Požiadavka majiteľa 24. 11. 2026. Dnes (R53 (b), R63; K57): príspevok len s textom a repost textu majú jednostĺpcové '
              'okno `max-w-xl` (576 px) s komentármi pod príspevkom, príspevok s fotkou, ponuka a portfólio dva stĺpce a 864 px. '
              'Rozhodnutie R73: dva stĺpce a 864 px aj pri texte (od 1 024 px), výška okna podľa obsahu (najmenej 20 rem, najviac '
              '95 % obrazovky), text sa ukáže celý bez „Viac“ a posúva sa len on, ak sa nezmestí; písmo je vždy rovnaké a text začína '
              'hneď pod avatarom a menom (väčšie písmo na stred majiteľ zamietol). Pod 1 024 px a na mobile sa nič nemení.',
         note='JASNÉ (vzhľad schválený, R73; karta K58, krok 3; obrázky `navrhy/pc-okno-text-dva-stlpce-schvalene.png` a '
              '`pc-okno-text-dva-stlpce-dlhsie-texty-schvalene.png`). Mení R53 (b) a R63. Odhad: nízky · M.',
         dec='ROZHODNUTIE R73', src='majiteľ (24. 11. 2026)'),
    dict(n=368, bucket=P, imp=N, eff=ES, pkg='Vzhľad Nástenky',
         kratko='okno detailu s fotkou a označenými používateľmi: blok s označenými si berie polovicu voľného miesta, fotka je menšia '
                'a pod štítkami je prázdno',
         what='Zistil agent 24. 11. 2026 pri kontrole krokov K58; existuje už na `main`. V ľavom stĺpci dvojstĺpcového okna je blok '
              's označenými (`FeedPostSharedBlock.tsx:89`: `min-h-0 flex-1 overflow-y-auto` pri `fillHeight`) pružný rovnako ako '
              'plocha fotky (`min-h-[8rem] flex-1`), takže si zo zvyšku stĺpca berú obe rovnako, hoci blok s troma štítkami potrebuje '
              'asi 20 px. Zmerané v Chromiu (kópia `main`, príspevok s fotkou, troma označenými a troma komentármi): pri výške '
              'obrazovky 800 px má blok 307 px (štítky 20 px) a fotka 283 px, pri 650 px blok 235 px a fotka 211 px; pod štítkami je '
              'prázdna plocha až po riadok s lajkom. Komentár v `FeedPostSharedBlock.tsx` hovorí, že vlastné fotky a zdieľaný '
              'obsah sa nestretnú, takže o `flex-1` nie je s kým súperiť; označení sa s vlastnými fotkami stretnú. Oprava je jedna '
              'podmienka (blok bez zdieľaného obsahu nie je pružný), no zmení vzhľad (fotka sa zväčší): agent ukázal obrázok Dnes a Po '
              '(`navrhy/pc-okno-fotka-oznaceni-dnes-a-po-schvalene.png`: po oprave má blok 44 px a fotka 545 px pri 800 px a '
              '403 px pri 650 px) a majiteľ ho 24. 11. 2026 schválil (R74). Krok 3 karty K58 rieši rovnaký problém len pre '
              'príspevok len s textom (blok s označenými má prirodzenú výšku; premenná `flexible` v `FeedPostSharedBlock.tsx`).',
         note='JASNÉ (vzhľad schválený, R74). Opraví ho **agent** (nie kolega; výnimka z R67) samostatne až po zlúčení K58, keď majiteľ '
              'dá pokyn: podmienka `flexible` v `FeedPostSharedBlock.tsx` bude po oprave len `fillHeight && isShared`, takže blok s '
              'označenými bez zdieľaného obsahu bude mať prirodzenú výšku aj pri príspevku s fotkou. Odhad: nízky · S.',
         dec='ROZHODNUTIE R74', src='agent (24. 11. 2026), meranie v kópii `main`'),
]
