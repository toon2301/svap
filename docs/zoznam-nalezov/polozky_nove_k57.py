# -*- coding: utf-8 -*-
"""Nové nálezy od čísla 363: obrázky agenta k oknu detailu príspevku na počítači (23. 11. 2026) a text príspevku v okne (365 až 368, 24. 11. 2026; nález 373 je od 25. 11. 2026 hotový a jeho text je v `hotove_k40.py`; nálezy 370 a 375 až 377 sú od 25. 11. 2026 hotové (kolo 3c, vetva 208, PR #333) a ich text je v `hotove_k59.py`).

Samostatný súbor kvôli limitu 500 riadkov; `polozky_nove.py` ich pripája do `NEW_ITEMS`. Pravidlá sú rovnaké ako inde: otvorený nález sa
po oprave odstráni odtiaľto a zapíše do `hotove_k59.DONE_SINCE_K59` (staršie do `hotove_k40.DONE_SINCE_K40`); čísla sa nikdy nepoužívajú znova.

Oba nálezy zistil agent pri vykresľovaní okna s dlhým textom a veľa komentármi (výber majiteľa po obrázkoch, R69); oba existovali už pred
K57 a nie sú jej dôsledkom. Nález 363 (komentáre v jednostĺpcovom okne) je od dávky K57 (PR #323) hotový; jeho text je v `hotove_k40.py`.
Nález 364 je od dávky K58 (PR #326) hotový.

Nálezy 365 až 367 vznikli z návrhu majiteľa k textu príspevku a oknu detailu na počítači (24. 11. 2026; rozhodnutia R71 až R73)
a vyriešila ich jedna dávka K58 (`karty/K58.md`, PR #326, hotové; ich text je v `hotove_k40.py`); nález 368 zistil agent pri kontrole krokov K58 a vzhľad jeho opravy schválil majiteľ (R74); opraví ho agent po K58.
Nálezy 369 a 370 ohlásil majiteľ 24. 11. 2026 pri schvaľovaní poľa na komentár a odpoveď na mobile (R75); oba patria do dávky K44, ktorú podľa R76 píše agent; podľa R79 ide K44 v dvoch kolách: 369 je od kola 3a (vetva 205, PR #329) hotový (jeho text je v `hotove_k40.py`); 370 bol opravený v kole 3b (vetva 206, PR #330), no ručný test majiteľa 25. 11. 2026 ukázal tri chyby v paneli nad fotkou (375 až 377), ktoré opravilo kolo 3c (vetva 208, PR #333); po jeho ručnom teste (bez nových nálezov) sú 370 aj 375 až 377 hotové (text je v `hotove_k59.py`). Nález 374 zistil agent 25. 11. 2026 pri kole 3b. Nálezy 371 a 372 ohlásil majiteľ po ručnom teste K58 (24. 11. 2026).
"""

from konstanty import A, EL, EM, ES, H, N, P, S_, V  # noqa: F401

NEW_ITEMS_K57 = [
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
         note='JASNÉ (vzhľad schválený, R74). Opraví ho **agent** (nie kolega; výnimka z R67) samostatne po zlúčení K58 (K58 je zlúčená v PR #326; pokyn majiteľa zatiaľ nepadol a oprava sa navrhuje spolu s 372 a 359, lebo poloha označených nad fotkou mení to isté miesto), keď majiteľ '
              'dá pokyn: podmienka `flexible` v `FeedPostSharedBlock.tsx` bude po oprave len `fillHeight && isShared`, takže blok s '
              'označenými bez zdieľaného obsahu bude mať prirodzenú výšku aj pri príspevku s fotkou. Odhad: nízky · S.',
         dec='ROZHODNUTIE R74', src='agent (24. 11. 2026), meranie v kópii `main`'),
    dict(n=371, bucket=P, imp=S_, eff=EM, pkg='Zdieľanie a obrázky',
         kratko='prezdieľaná ponuka alebo portfólio bez fotky: keď vlastník dodatočne pridá fotku, na Nástenke sa to neobnoví a stále '
                'ukazuje „bez fotky“',
         what='Zistil majiteľ pri ručnom teste K58 (24. 11. 2026): používateľ prezdieľa ponuku alebo portfólio iného používateľa, '
              'ktoré nemá fotku; vlastník ponuky alebo portfólia potom fotku doplní, no na Nástenke sa prezdieľaný príspevok nezmení '
              'a stále ukazuje, že je bez fotky. Agent prečítal kód (bez spúšťania): backend pri zdieľaní skopíruje kľúč náhľadu '
              'zdroja do príspevku (`shared_thumbnail_key`; `accounts/models/feed_posts/sharing.py`, `_snapshot_from_offer` a '
              '`_snapshot_from_portfolio_item`; pri zdroji bez schválenej fotky je kľúč prázdny) a serializér '
              '(`accounts/feed_serializers.py`) pošle `thumbnail_url` len keď je kľúč neprázdny. Názov, kategória, vlastník a pri '
              'ponuke aj cena sa berú naživo zo zdroja, náhľad je teda jediný údaj, ktorý sa neobnovuje. Kľúč sa dopĺňa len pri '
              'uložení zdieľaného príspevku (`overwrite=False` dopĺňa len prázdny kľúč), nie keď zdroj dostane fotku, a frontend '
              'ukáže náhradu „bez fotky“ podľa prázdneho `thumbnail_url`. Neoverené: či sa to deje aj pri zdieľanom príspevku (tam '
              '`_snapshot_from_feed_post` robí to isté) a čo sa stane s uloženým kľúčom, keď vlastník fotku zmaže.',
         note='JASNÉ (karta `karty/K61.md` je pripravená pre kolegu, 26. 11. 2026; rozhodnutia majiteľa (i) až (iv) sú hotové, '
              'R83; ide ako prvá, R84; mapovanie K60 hotové: kolega, `karty/K60_vysledok.md`, PR #336; agent ho overil čítaním '
              'kódu a nezávislými sondami cez skutočné API, `karty/K60_overenie_agenta.md`). REPRODUKOVANÉ (sondy): ponuka, '
              'portfólio aj repost, ktorým zdroj po zdieľaní dostal fotku, majú `thumbnail_url` `null` (endpoint náhľadu 404, '
              'na Nástenke „Bez fotografie“), nové zdieľanie už fotku má; po zmazaní alebo výmene fotky zdroja ostane adresa '
              'zastaraná (404; to je backendová časť nálezu 91). PRÍČINA: kľúč náhľadu sa zapisuje len pri vzniku zdieľania a '
              'pri zmene zdroja (`sharing.py:203-277` a `_revalidate_changed_shared_source`), nikdy pri zmene fotky; čítajú ho '
              'serializér (`feed_serializers.py:361-363`) a endpoint (`views/feed_image_files.py:99-111`); názov, kategória, '
              'cena a vlastník sa berú naživo, náhľad je jediný uložený údaj. ODPORÚČANÁ OPRAVA (možnosť 1, náhľad naživo zo '
              'zdroja; zhodne kolega aj agent): serializér aj endpoint odvodia fotku zo živého a viditeľného zdroja (ako dnes '
              'len pri živom a viditeľnom zdroji) a kontrolujú jej stav (tým sa uzavrie aj 378); `_annotated_queryset` už má '
              '`select_related` na zdroje, pribudnú len prefetch dopyty na ich fotky (konštantný počet, bez N+1); tvar JSON ani '
              'frontend sa nemenia; opraví hneď aj staré zdieľania (bez migrácie) aj zastarané kľúče (91). SPRESNENIE AGENTA: '
              'do adresy náhľadu pridať krátky odtlačok kľúča (`?v=`), lebo prehliadač odpoveď cachuje `private, max-age=3600` '
              'na tej istej adrese. NEODPORÚČANÉ: obnova kľúča signálmi (viac miest, zmazaný kľúč, staré príspevky aj tak '
              'potrebujú jednorazovú opravu). Súbory (všetko pod 500 r.): `feed_serializers.py` 408, '
              '`views/feed_image_files.py` 111, `views/feed_post_queries.py` 252; testy: nový súbor '
              '`accounts/test/test_feed_shared_thumbnail_live.py` (pred opravou padá: doplnená fotka sa neprejaví, zmazaná dá '
              'zastaranú adresu, zamietnutá sa posiela) a malá úprava `test_feed_api.py:734, 770, 840` (súbor má 1 211 r.). '
              'ROZHODNUTIA MAJITEĽA (26. 11. 2026, R83; súhlas s odporúčaním agenta): (i) karta nasleduje fotku zdroja ako '
              'názov a cena, (ii) len schválené fotky ako dnes a bez fotky „Bez fotografie“ (vzhľad sa nemení, R49 sa netýka), '
              '(iii) po oprave sa prestane zapisovať `shared_thumbnail_key` (stĺpec ostáva, čistenie neskôr), (iv) verzia v '
              'adrese náhľadu (`?v=`). PROTOTYP A OVERENIE (agent, 26. 11. 2026, kópia `main` `7fd08bc8` mimo repozitára; '
              '`karty/K61_podklady.md`): nový súbor testov má 14 testov a pred opravou padá 9, 10 zásahov do kódu z 10 '
              'zachytených, celá backendová sada (2 610 testov) bez pádu a zoznam feedu robí 4 dopyty pred a 7 po (konštantne '
              'pri 8 aj 20 príspevkoch). 260 ide osobitne (súkromie). Ručne po oprave: ponuka bez fotky, zdieľať iným účtom, '
              'vlastník doplní fotku (Nástenka ju ukáže); vlastník fotku zmaže (náhrada „Bez fotografie“, nie rozbitý obrázok). '
              'Dopad na E2E: žiadny. Odhad: stredný · M.',
         dec=None, src='ručný test majiteľa po K58 (24. 11. 2026), čítanie kódu agentom'),
    dict(n=372, bucket=P, imp=S_, eff=EM, pkg='Vzhľad Nástenky',
         kratko='označení používatelia: v detaile príspevku na mobile a vo fotoprehliadači sa nezobrazujú; pri príspevku s fotkou sú '
                'pod fotkou, majiteľ ich chce nad fotkou (mobil aj počítač)',
         what='Zistil majiteľ pri ručnom teste K58 (24. 11. 2026). (1) V detaile príspevku na mobile (`FeedPostMobileDetail`) a vo '
              'fotoprehliadači (`FeedPhotoViewer`) sa označení používatelia nezobrazujú: zoznam `feed-post-tags` kreslí len '
              '`FeedPostSharedBlock.tsx` v karte (`FeedPostCard.tsx`: na Nástenke aj v okne detailu na počítači); '
              '`FeedPostMobileDetailContent.tsx`, `FeedPostMobileDetail.tsx`, `FeedPhotoViewer.tsx` a `FeedPhotoViewerChrome.tsx` '
              'označených nepoužívajú. (2) Pri príspevku s fotkou sa označení zobrazujú pod fotkou (v karte je poradie hlavička, '
              'text, fotka, blok s označenými a zdieľaným obsahom, riadok akcií; mobil aj počítač); majiteľ chce, aby boli nad '
              'fotkou, na mobile aj na počítači. Vzhľad (poloha, farba a tvar označených, miesto vo fotoprehliadači) sa podľa R49 '
              'najprv navrhne a schváli.',
         note='NEJASNÉ (najprv návrh vzhľadu s možnosťami a odporúčaním agenta a schválenie majiteľom, R49; kto píše kód, určí '
              'majiteľ osobitne, R76 c). Súvisí s nálezmi 359 (označení ako obyčajný text bez bubliny), 368 (blok s označenými v okne '
              's fotkou je pružný; obrázok jeho schváleného vzhľadu ukazuje blok pod fotkou, pri presune nad fotku sa upraví) a so '
              'skupinou 8 v 261 (tagy na vlastný riadok pod textom), preto sa navrhujú jedným návrhom. Odhad: stredný · M.',
         dec=None, src='ručný test majiteľa po K58 (24. 11. 2026), čítanie kódu agentom'),
    dict(n=374, bucket=A, imp=N, eff=ES, pkg='Upratovanie a architektúra',
         kratko='zámok scrollovania cez `body.style.overflow` (hodnota `hidden`), ktorý používajú vrstvy v appke, pri pravidlách '
                '`html, body` z `globals.css` okno nezamkne',
         what='Zistil agent 25. 11. 2026 pri kole 3b (nález 370). `globals.css` dáva `html` aj `body` `overflow-x: hidden; '
              'overflow-y: auto`, takže sa `overflow` z `body` nepremieta do viewportu a `document.body.style.overflow = '
              'hidden` posúvanie okna nezamkne. Overené v Chromiu: pri stránke vyššej než okno sa po kolieskovom posune o 600 '
              'px posunie okno rovnako (`scrollY` 600) s týmto zámkom aj bez neho. Zámok používajú aspoň `ImageLightbox`, '
              '`OfferImageGalleryLightbox`, `ProfileOfferDetailMobile`, `PortfolioMobileEditFlow`, '
              '`PortfolioCreateDesktopModal` a `MobilePortfolioOrderView` (aj testy ho očakávajú). V dashboarde to dnes '
              'neprekáža: okno sa neposúva, posúva sa `<main>` (`DashboardLayout.tsx`) a vrstvy sú `fixed` portály mimo neho, '
              'takže sa ťah do `<main>` nereťazí. Gumový efekt viewportu na iPhone zámok cez `overflow` pravdepodobne nevypína '
              'tiež (neoverené, vypína ho `overscroll-behavior`).',
         note='NEJASNÉ (nízka priorita, kód sa nemení; len nahlásené podľa pravidla o práci mimo zadania). Ak by sa niekde '
              'posúvalo okno (stránka mimo dashboardu), zámok nefunguje. Oprava by bola jeden spoločný počítaný zámok namiesto '
              'kópií (vzor: `useFeedOverscrollLock.ts` z kola 3b, ktorý `overflow` nemení); pri nich treba myslieť na vnorené '
              'vrstvy: naivné uloženie a obnova `overflow` si pri súčasnom zatvorení vrstiev navzájom prepíšu hodnoty a stránka '
              'môže ostať zamknutá. Odhad: nízky · S.',
         dec=None, src='agent (25. 11. 2026), meranie v Chromiu'),
]
