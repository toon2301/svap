# -*- coding: utf-8 -*-
"""Nové nálezy od čísla 363: obrázky agenta k oknu detailu príspevku na počítači (23. 11. 2026) a text príspevku v okne (365 až 368, 24. 11. 2026; nález 373 je od 25. 11. 2026 hotový a jeho text je v `hotove_k40.py`; nálezy 375 až 377 sú z ručného testu kola 3b, 25. 11. 2026).

Samostatný súbor kvôli limitu 500 riadkov; `polozky_nove.py` ich pripája do `NEW_ITEMS`. Pravidlá sú rovnaké ako inde: otvorený nález sa
po oprave odstráni odtiaľto a zapíše do `hotove_k40.DONE_SINCE_K40`; čísla sa nikdy nepoužívajú znova.

Oba nálezy zistil agent pri vykresľovaní okna s dlhým textom a veľa komentármi (výber majiteľa po obrázkoch, R69); oba existovali už pred
K57 a nie sú jej dôsledkom. Nález 363 (komentáre v jednostĺpcovom okne) je od dávky K57 (PR #323) hotový; jeho text je v `hotove_k40.py`.
Nález 364 je od dávky K58 (PR #326) hotový.

Nálezy 365 až 367 vznikli z návrhu majiteľa k textu príspevku a oknu detailu na počítači (24. 11. 2026; rozhodnutia R71 až R73)
a vyriešila ich jedna dávka K58 (`karty/K58.md`, PR #326, hotové; ich text je v `hotove_k40.py`); nález 368 zistil agent pri kontrole krokov K58 a vzhľad jeho opravy schválil majiteľ (R74); opraví ho agent po K58.
Nálezy 369 a 370 ohlásil majiteľ 24. 11. 2026 pri schvaľovaní poľa na komentár a odpoveď na mobile (R75); oba patria do dávky K44, ktorú podľa R76 píše agent; podľa R79 ide K44 v dvoch kolách: 369 je od kola 3a (vetva 205, PR #329) hotový (jeho text je v `hotove_k40.py`) a 370 je opravený v kole 3b (vetva 206, PR #330), no ručný test majiteľa 25. 11. 2026 ukázal tri chyby v paneli nad fotkou (375 až 377; kolo 3c) a 370 ostáva otvorený. Nález 374 zistil agent 25. 11. 2026 pri kole 3b. Nálezy 371 a 372 ohlásil majiteľ po ručnom teste K58 (24. 11. 2026).
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
         note='V RIEŠENÍ (kolo 3b podľa R79 je zlúčené: vetva 206, PR #330, 25. 11. 2026 o 14:28 UTC; zvyšok opraví kolo 3c). '
              'RUČNÝ TEST MAJITEĽA (25. 11. 2026, iPhone, po nasadení): podľa správy majiteľa sa v bežnom detaile príspevku nič '
              'z hlásených javov neprejavilo; v paneli komentárov nad otvorenou fotkou sú tri chyby (nálezy 375, 376 a 377), '
              'takže bod (5) z R75 sa v paneli nepodaril. Nález 370 preto ostáva otvorený a zatvorí sa, keď po kole 3c prejde '
              'aj panel. Oprava z kola 3b riešila dve príčiny, ktoré v kóde sedia (R75 bod 5): (1) vrstva `fixed inset-0` sa '
              'pri otvorenej klávesnici nezmenší, iPhone len posunie viditeľnú plochu: `useFeedKeyboardViewport.ts` pripne '
              'mobilný detail a prehliadač fotky na viditeľnú plochu nad klávesnicou, kým má pole fokus; (2) pri krátkom '
              'príspevku sa ťah prstom posielal stránke pod vrstvou (gumový efekt): `useFeedOverscrollLock.ts` dá `html` aj '
              '`body` `overscroll-behavior: none`, kým je detail alebo panel komentárov otvorený. KOREKCIA hypotézy (1) z '
              'opisu: zámok cez `document.body.style.overflow` by nepomohol (pri pravidlách `html, body` z `globals.css` '
              'stránku nezamkne, overené v Chromiu; nález 374) a prehliadač fotky ho cez `ImageLightbox` už mal. Po kole 3c sa '
              'test zopakuje (krátky vlastný príspevok len s textom a pár krátkymi komentármi, s klávesnicou aj bez nej, a '
              'príspevok s fotkou s panelom komentárov: panel a pole sa nesmú hýbať, pri komentároch, ktoré sa celé zmestia, '
              'ani zoznam; pri dlhších sa zoznam smie posúvať). Ak sa pole stále hýbe, treba vedieť kedy (po otvorení '
              'klávesnice, pri ťahu prstom, po zavretí klávesnice). Odhad: stredný · M.',
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
    dict(n=375, bucket=P, imp=S_, eff=EM, pkg='Vzhľad Nástenky',
         kratko='panel komentárov nad fotkou na iPhone: po otvorení klávesnice je pole na komentár príliš vysoko, medzi ním a '
                'klávesnicou je veľká prázdna medzera (vrstva je pripnutá na nižšiu výšku, než je viditeľná plocha)',
         what='Hlási majiteľ 25. 11. 2026 po ručnom teste kola 3b (iPhone s iOS 27.0.1 podľa majiteľa, Safari: nad klávesnicou '
              'je plávajúca lišta s adresou stránky). V paneli komentárov nad otvorenou fotkou sa po otvorení klávesnice pole '
              'na komentár posunie príliš vysoko a medzi poľom a klávesnicou je veľká prázdna medzera: pole nestojí tesne nad '
              'klávesnicou (R75 bod 5). V bežnom detaile príspevku sa to neprejavilo. MERANIE Z DVOCH FOTIEK majiteľa (agent, '
              '25. 11. 2026; prevod 923 px = 393 pt, teda 2,35 px na bod; pomer výšky panela k výške vrstvy vychádza na 0,78, '
              'čo je `h-[78%]` panela, takže rozmery sedia): vrstva prehliadača fotky (`ImageLightbox`) začína 59 pt od vrchu '
              'obrazovky (pod stavovým riadkom) a na fotke 1 (po ťuku na „Odpovedať“) končí v 450 pt, čo je presne horný okraj '
              'plávajúcej lišty s adresou (451 pt); na fotke 2 (prvé otvorenie klávesnice, panel bez komentárov) končí už v 352 '
              'pt, teda o 99 pt vyššie než viditeľná plocha, pole stojí v 296 až 336 pt a klávesnica začína v 551 pt (medzera '
              'asi 214 pt). Vrstva je teda pripnutá na výšku 391 pt (fotka 1) a 293 pt (fotka 2), kým viditeľná plocha nad '
              'plávajúcimi lištami má v oboch prípadoch asi 392 pt (lišty aj klávesnica sú na oboch fotkách na rovnakom '
              'mieste). HYPOTÉZA (nie dôkaz): `useFeedKeyboardViewport.ts` berie výšku vrstvy z `window.visualViewport.height` '
              'a prepočítava ju len pri udalostiach `resize` a `scroll`; iOS po otvorení klávesnice doladí viditeľnú plochu aj '
              'neskôr (plávajúca lišta s adresou a lišta so šípkami sa usadia až po zasunutí klávesnice) a nemusí poslať ďalšiu '
              'udalosť, takže vrstva ostane na zastaranej, nižšej hodnote (fotka 2); na fotke 1 sa výška dorovnala, čo mohla '
              'spôsobiť ďalšia udalosť (napríklad po prepnutí poľa na odpoveď). Ďalšia neoverená možnosť: pri prvom otvorení '
              'klávesnice sa mení aj spodná lišta Safari (veľká lišta so záložkami sa zmenší na lištu s adresou) a v detaile '
              'príspevku mohla byť už zmenšená. Prečo sa to v detaile príspevku neprejavilo (rovnaký hák), nie je jasné a '
              'neskúmalo sa.',
         note='V PLÁNE (kolo 3c podľa R79; opraví agent podľa R76 vo vetve 208 až po pokyne majiteľa; plán je v zázname z 25. '
              '11. 2026 v `stav.py`). Skutočný iPhone sa tu overiť nedá (agent má len Chromium a atrapu `visualViewport`), '
              'preto sa riešenie navrhuje tak, aby nezáviselo od jedinej hodnoty z `visualViewport`: (1) výška pripnutej vrstvy '
              'sa po získaní fokusu poľa prepočítava aspoň dve sekundy aj bez udalostí (časovač) a pri každej zmene fokusu, '
              'dotyku a veľkosti okna, takže sa nezasekne na zastaranej hodnote; (2) pod pripnutou časťou je pozadie na celú '
              'plochu (nález 377). Spolu s opravou príde skrytá diagnostika hodnôt na iPhone (zapína sa len parametrom v '
              'adrese), aby majiteľ vedel jedným testom poslať skutočné čísla z detailu aj z panela nad fotkou. Odhad: stredný '
              '· M.',
         dec='ROZHODNUTIE R79', src='ručný test majiteľa po kole 3b (25. 11. 2026; správa a dve fotky), meranie agenta z fotiek'),
    dict(n=376, bucket=P, imp=S_, eff=EM, pkg='Vzhľad Nástenky',
         kratko='panel komentárov nad fotkou na iPhone: pri ťahu prstom hore a dole sa pri otvorenej klávesnici hýbe aj fotka za '
                'panelom (pri krátkych aj dlhých komentároch); má sa hýbať nanajvýš zoznam komentárov',
         what='Hlási majiteľ 25. 11. 2026 po ručnom teste kola 3b (iPhone): pri ťahu prstom hore a dole v paneli komentárov nad '
              'otvorenou fotkou sa pohybuje aj fotka za panelom; opakovane pri krátkych aj dlhých komentároch. ODPOVEĎ MAJITEĽA '
              '(25. 11. 2026): fotka sa hýbe len pri otvorenej klávesnici, bez nej nie. Očakávanie majiteľa: pri krátkych '
              'komentároch, ktoré sa celé zmestia na obrazovku, sa nemá hýbať nič; pri dlhých sa má posúvať iba zoznam '
              'komentárov, nie fotka na pozadí. V bežnom detaile príspevku sa to neprejavilo. Neznáme: či sa hýbe len fotka, '
              'alebo celá vrstva s panelom a poľom. Z kódu: panel (`FeedPhotoCommentsSheet.tsx`) je súrodenec rámu s fotkou v '
              'tej istej vrstve `ImageLightbox` (`fixed inset-0`, portál do `body`) a ťah po ňom v kóde fotku nijako neposúva '
              '(zoznam komentárov má `overscroll-contain`, `useFeedOverscrollLock.ts` dáva `html` a `body` len '
              '`overscroll-behavior: none` a dotykové obsluhy rámu fotky len rozpoznávajú vodorovné prepnutie fotky). Fotka sa '
              'teda môže hýbať len preto, že sa hýbe celá vrstva. HYPOTÉZA (nie dôkaz; po odpovedi majiteľa '
              'najpravdepodobnejšia): pri otvorenej klávesnici je rozloženie stránky vyššie než viditeľná plocha, a preto '
              'iPhone dovolí viditeľnú plochu ťahom posúvať (`visualViewport.offsetTop` sa mení); `useFeedKeyboardViewport.ts` '
              'posúva vrstvu za ňou cez `top` až po udalosti, teda s oneskorením, a vrstva (s fotkou, panelom aj poľom) sa pred '
              'očami kýve. Bez klávesnice sa viditeľná plocha posúvať nedá, čo sedí s odpoveďou majiteľa; hypotéza o zmene '
              'výšky plochy lištami Safari bez klávesnice je tým oslabená.',
         note='V PLÁNE (kolo 3c; opraví agent po pokyne majiteľa). Zostáva neznáme len to, čo sa presne hýbe (len fotka, alebo '
              'aj panel a pole); upresní to diagnostika alebo ďalšia správa majiteľa. Možné opravy: počas dotyku (od '
              '`touchstart` po `touchend` a krátko po ňom) sa pripnutie nenasleduje, takže sa vrstva nekýva; mimo zoznamu '
              'komentárov vypnúť posun gestom (`touch-action: none` na ráme fotky, v hlavičke a pri poli; zoznam komentárov '
              '`touch-action: pan-y` s `overscroll-behavior: contain`); zámok posunu stránky, ktorý funguje aj pri pravidlách '
              '`html, body` (nález 374). Odhad: stredný · M.',
         dec='ROZHODNUTIE R79', src='ručný test majiteľa po kole 3b (25. 11. 2026; správa a odpovede), čítanie kódu agentom'),
    dict(n=377, bucket=P, imp=S_, eff=ES, pkg='Vzhľad Nástenky',
         kratko='panel komentárov nad fotkou na iPhone: pri otvorenej klávesnici je v oblasti líšt nad klávesnicou (lišta so '
                'šípkami a fajkou, plávajúca lišta s adresou) vidieť obsah Nástenky; vrstva s fotkou ho má prekrývať',
         what='Hlási majiteľ 25. 11. 2026 po ručnom teste kola 3b (iPhone): pri otvorenej klávesnici a poli prepnutom na '
              'odpoveď je v oblasti systémovej lišty iPhonu (šípky a potvrdzovacia fajka) vidieť obsah Nástenky vrátane ikon '
              'pôvodného príspevku, hoci ho má prekrývať vrstva prehliadača fotky s panelom komentárov. V bežnom detaile '
              'príspevku sa to neprejavilo; ODPOVEĎ MAJITEĽA (25. 11. 2026): deje sa to len pri otvorenej klávesnici v paneli '
              'komentárov nad fotkou, v detaile príspevku nie. FOTKA 1 (meranie agenta z 25. 11. 2026, prevod 923 px = 393 pt, '
              'teda 2,35 px na bod; pomer výšky panela k výške vrstvy vychádza na 0,78, čo je `h-[78%]` panela, takže rozmery '
              'sedia): vrstva končí v 450 pt, čo je horný okraj plávajúcej lišty s adresou; odtiaľ až po klávesnicu (551 pt) je '
              'cez priesvitné lišty vidieť stránku Nástenky (karta s ikonami lajku, komentárov a zdieľania a riadok „… zdieľa '
              'príspevok ďalej“), lebo pod pripnutou vrstvou nie je nič, čo by ten pás zakrylo. PRÍČINA (hypotéza z kódu a '
              'fotky): `useFeedKeyboardViewport.ts` pripne celú vrstvu aj s jej čiernym pozadím (`bg-black/95`) na '
              '`visualViewport`, čiže na plochu nad všetkými lištami iOS; lišty sú priesvitné a ležia nad stránkou, ktorá pod '
              'nimi pokračuje. Požiadavka majiteľa: Nástenka nemá byť pod panelom vidieť.',
         note='V PLÁNE (kolo 3c; opraví agent po pokyne majiteľa): čierne pozadie vrstvy prehliadača fotky sa oddelí od '
              'pripnutého obsahu a pokryje celú plochu stránky aj pod lištami (nová voliteľná vlastnosť `ImageLightbox`; vzhľad '
              'sa nemení, pozadie je dnes tiež čierne; pripnutý ostane len obsah, teda hlavička, fotka a panel). Detail '
              'príspevku sa nemení: majiteľ potvrdil, že sa tam jav nevidí; prečo sa detail správa inak (rovnaký hák pripnutia, '
              'nepriehľadné pozadie), ukáže diagnostika z nálezu 375. Odhad: nízky · S.',
         dec='ROZHODNUTIE R79', src='ručný test majiteľa po kole 3b (25. 11. 2026; správa, odpovede a dve fotky), meranie agenta z fotiek'),
]
