# -*- coding: utf-8 -*-
"""Nové nálezy od čísla 363: obrázky agenta k oknu detailu príspevku na počítači (23. 11. 2026) a text príspevku v okne (365 až 368, 24. 11. 2026; nález 373 je od 25. 11. 2026 hotový a jeho text je v `hotove_k40.py`).

Samostatný súbor kvôli limitu 500 riadkov; `polozky_nove.py` ich pripája do `NEW_ITEMS`. Pravidlá sú rovnaké ako inde: otvorený nález sa
po oprave odstráni odtiaľto a zapíše do `hotove_k40.DONE_SINCE_K40`; čísla sa nikdy nepoužívajú znova.

Oba nálezy zistil agent pri vykresľovaní okna s dlhým textom a veľa komentármi (výber majiteľa po obrázkoch, R69); oba existovali už pred
K57 a nie sú jej dôsledkom. Nález 363 (komentáre v jednostĺpcovom okne) je od dávky K57 (PR #323) hotový; jeho text je v `hotove_k40.py`.
Nález 364 je od dávky K58 (PR #326) hotový.

Nálezy 365 až 367 vznikli z návrhu majiteľa k textu príspevku a oknu detailu na počítači (24. 11. 2026; rozhodnutia R71 až R73)
a vyriešila ich jedna dávka K58 (`karty/K58.md`, PR #326, hotové; ich text je v `hotove_k40.py`); nález 368 zistil agent pri kontrole krokov K58 a vzhľad jeho opravy schválil majiteľ (R74); opraví ho agent po K58.
Nálezy 369 a 370 ohlásil majiteľ 24. 11. 2026 pri schvaľovaní poľa na komentár a odpoveď na mobile (R75); oba patria do dávky K44, ktorú podľa R76 píše agent; podľa R79 ide K44 v dvoch kolách: 369 je opravený v kole 3a (vetva 205) a 370 patrí do kola 3b. Nálezy 371 a 372 ohlásil majiteľ po ručnom teste K58 (24. 11. 2026).
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
    dict(n=369, bucket=P, imp=S_, eff=ES, pkg='Vzhľad Nástenky',
         kratko='detail príspevku s fotkou na mobile: obsah sa dá posúvať vodorovne o 12 px (fotka je širšia než posúvateľný zoznam)',
         what='Zistil majiteľ 24. 11. 2026 na vlastnom príspevku s fotkou (mobil): obsah okna detailu sa dá posúvať zo strany na '
              'stranu; vodorovne má byť pevný. Agent to 24. 11. 2026 reprodukoval v Chromiu na skutočných komponentoch (kópia `main`, '
              '`FeedPostMobileDetail`, šírky 360, 390 a 430 px): netýka sa len vlastného príspevku, ale každého príspevku s fotkou '
              '(vlastného aj cudzieho; pri každej šírke 12 px). Príčina: zoznam komentárov `feed-comments-scroll` '
              '(`FeedPostComments.tsx`) je posúvateľný box s `overflow-y-auto` (preto je jeho `overflow-x` vypočítané `auto`) a s '
              'odsadením `pr-1`; blok fotky `feed-mobile-detail-photo` (`FeedPostMobileDetailContent.tsx`) je roztiahnutý na celú '
              'šírku záporným okrajom `-mx-4` a jeho pravý okraj leží o 12 px za pravým okrajom boxu (pri šírke okna 390 px: blok 0 '
              'až 386 px, box 16 až 374 px; `scrollWidth` − `clientWidth` = 12 px). Viditeľná fotka je orezaná '
              'posuvným boxom na 16 až 374 px, teda je 16 px od okrajov obrazovky z oboch strán; presah sa prejaví len tým, že sa box '
              'dá posúvať vodorovne. Príspevok len s textom a panel komentárov nad fotkou (`FeedPhotoCommentsSheet.tsx`) '
              'vodorovne nepretekajú (0 px). Meranie bolo v statickom vykreslení (HTML skutočných komponentov s reálnymi štýlmi), nie '
              'na iPhone.',
         note='JASNÉ (príčina nameraná). OPRAVENÉ vo vetve 205 (kolo 3a podľa R79; píše agent podľa R76, PR otvára majiteľ): '
              '`FeedPostMobileDetailContent.tsx` (233 → 237 riadkov) dáva bloku fotky `-mr-1` namiesto `-mx-4` (ruší práve '
              'odsadenie `pr-1` posuvného boxu, takže blok sedí presne v boxe) a `FeedPostComments.tsx` dáva posuvnému boxu '
              '`overflow-x-hidden` ako poistku. Viditeľná šírka fotky ostala rovnaká (16 px od okrajov obrazovky z oboch '
              'strán); fotka od okraja po okraj by bola samostatná vzhľadová zmena (R49), ktorú majiteľ nežiadal, preto ju '
              'agent neurobil. Overenie: v Chromiu je vodorovný presah 0 px pri šírkach 360, 390 a 430 px (predtým 12 px); nový '
              'súbor testov `FeedPostMobileDetailContent.vodorovne.test.tsx` (3 testy) a test `overflow-x-hidden` v '
              '`FeedPostComments.vlaknoAOddelovace.test.tsx`; zásahy M1 a P7 zachytené. Po zlúčení sa presunie do '
              '`hotove_k40.py`; po nasadení krátky ručný test majiteľa na iPhone (detail príspevku s fotkou sa nedá posúvať do '
              'strán). Odhad: nízky · S.',
         dec='ROZHODNUTIE R76', src='majiteľ (24. 11. 2026), meranie agenta v kópii `main`'),
    dict(n=370, bucket=P, imp=S_, eff=EM, pkg='Vzhľad Nástenky',
         kratko='detail príspevku na mobile: pole na komentár sa na iPhone hýbe pri krátkom vlastnom príspevku len s textom (príčina '
                'nepotvrdená)',
         what='Hlási majiteľ 24. 11. 2026 (iPhone): pole na písanie komentárov dole na obrazovke sa hýbe (nie je pevne fixné), podľa '
              'jeho dojmu len pri vlastnom príspevku a len pri krátkom príspevku len s textom. Agent to v Chromiu na skutočných '
              'komponentoch nezreprodukoval: hlavné pole (`FeedCommentComposer`) stojí mimo posúvateľného zoznamu a pri posune '
              'zoznamu o 400 px ani pri posune stránky sa nepohlo (detail príspevku aj panel nad fotkou, šírka 390 px); pri zmenšenej '
              'viditeľnej ploche (508 px) ostalo celé viditeľné. Pole pri odpovedi pod komentárom sa naopak hýbe so zoznamom (po '
              'posune o 400 px bolo mimo obrazovky); na mobile sa ruší (R75). Dve možné príčiny (hypotézy, nie dôkaz): (1) detail '
              'príspevku a fotoprehliadač nezamykajú posúvanie stránky pod sebou (`FeedPostMobileDetail.tsx` a `FeedPhotoViewer.tsx` '
              'nenastavujú `document.body.style.overflow`, ako to robia iné mobilné obrazovky, napr. `ProfileOfferDetailMobile.tsx`); '
              'pri krátkom príspevku nie je v zozname čo posúvať, takže ťah prstom môže posúvať Nástenku za oknom a iPhone mení výšku '
              'viditeľnej plochy; (2) komentáre neprispôsobujú výšku obrazovky klávesnici (chat to robí cez '
              '`useMobileViewportHeight`: `DashboardLayout.tsx` a `useConversationComposerController.ts`). Rozlišovací test pre '
              'majiteľa: keď sa pole pohne a detail potom zatvorí, je Nástenka pod ním posunutá inde než pred otvorením? Ak áno, ide '
              'o (1).',
         note='NEJASNÉ (príčina nepotvrdená; rozhodne až ručný test na iPhone). Súčasť dávky K44, ktorú píše agent (R76), ako '
              'samostatný krok: zamknúť posúvanie stránky pod detailom príspevku a pod fotoprehliadačom a pri aktívnom poli na '
              'komentár nastaviť výšku obrazovky podľa viditeľnej plochy (rovnako ako v chate); je to najlepšia oprava (návrh agenta, '
              'nie dôkaz). Po nasadení ručný test majiteľa na iPhone (krátky vlastný príspevok len s textom, s klávesnicou aj bez '
              'nej). Podľa R79 ide až v kole 3b, po ručnom teste majiteľa po kole 3a (vetva 205). Odhad: stredný · M.',
         dec='ROZHODNUTIE R76', src='majiteľ (24. 11. 2026), meranie agenta v kópii `main`'),
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
         note='NEJASNÉ (najprv mapovanie kolegom, kód sa nemení; zasahuje backend a asi aj frontend). Možnosti, ktoré agent vidí: (a) '
              'náhľad naživo zo zdroja rovnako ako názov, kategória a cena (odporúčanie agenta: jedno správanie; treba overiť '
              'endpoint `feed_post_shared_thumbnail`, ktorý dnes číta uložený kľúč, a súkromie: náhľad len pri živom a viditeľnom '
              'zdroji, ako dnes); (b) obnoviť uložený kľúč, keď zdroj dostane alebo zmení fotku (signál na zdroji; zložitejšie a kľúč '
              'zmazanej fotky by ostal visieť). O spôsobe rozhodne majiteľ po mapovaní. Odhad: stredný · M.',
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
]
