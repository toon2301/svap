# -*- coding: utf-8 -*-
"""Stav zoznamu: dátum, položky opravené po prvom vydaní, tabuľka PR, rozhodnutia a denník zmien.

Tento súbor sa upravuje pri každej zmene stavu (nový nález, oprava, odpoveď na rozhodnutie); postup je v `README.md`.
"""

# Hlavička dokumentu: kedy sa naposledy menil a z akého stavu `main` sa vychádzalo.
STAV = dict(
    datum='24. 11. 2026',
    kod='`main` `3d0b74ce` (po PR #323: K57; PR #322 je zoznam 200 a karta K57, PR #321 je K56, PR #320 je zoznam 199 a karta K56, PR #319 je K55, PR #318 karta K55 (vetva 198), PR #317 je K54, PR #316 zoznam 197, PR #315 je K53, PR #314 zoznam 196, PR #313 je K52, PR #312 zoznam 195, PR #311 je K51, PR #310 zoznam 194, PR #309 je K50, PR #308 zoznam 193, PR #307 je K49, PR #306 je K48, PR #305 zoznam 192)',
    register='21. 10. 2026 + PR #193',
)

# Denník zmien dokumentu, najnovšie hore: (dátum, čo sa zmenilo). Záznamy do 21. 11. 2026 sú v `zmeny_starsie_3.py`, `zmeny_starsie_2.py` a `zmeny_starsie.py`.
from zmeny_starsie import ZMENY_STARSIE  # noqa: E402
from zmeny_starsie_2 import ZMENY_STARSIE_2  # noqa: E402
from zmeny_starsie_3 import ZMENY_STARSIE_3  # noqa: E402

ZMENY = [
    ('24. 11. 2026',
      'Doplnok vetvy 201 (PR #324 je ešte otvorené; `main` ostáva `3d0b74ce`). (1) Kontrola PR #324 na hlave `1f783dd9`: CI '
      '(`checks`, `backend-postgres`) zelené, CodeRabbit jedna pripomienka (Minor, platná, opravená v commite s týmto '
      'záznamom): `stav.py:271` (vlna 2): veta „úchytka panela nad fotkou 343, okno detailu na počítači 344 a oprava '
      'komentárov v ňom 363 sú hotové v K57“ zaradila medzi hotové aj nález 343, hoci ten ostáva otvorený (`polozky_nove_k14.py` '
      'a vo fronte ako K33; PR #323 uzatvára len 344 a 363). Chybu urobil agent pri prepisovaní vety: z dvoch samostatných '
      'položiek vlny sa stala jedna skupina „sú hotové“. Veta teraz hovorí, že 343 je otvorená (návrh K33), a že 344 a 363 sú '
      'hotové v K57; inde (otvorené nálezy, hotové nálezy, položky vo fronte, tabuľka PR) bol stav nálezov 343, 344 a 363 správny, '
      'takže sa opravuje len táto veta. (2) Agent prešiel aj ostatné svoje vety o K57 a opravil tri ďalšie nepresnosti: v tej istej vete „čaká na '
      'rekapitulácii a vizuálnom návrhu“ (správne „čaká na rekapituláciu a vizuálny návrh“); vo vlne 2 „redizajn komentárov a '
      'okno (344) začali až po opravách“ (komentáre 261 sa nezačali, teraz „redizajn sa začal“); v úvodnom texte `fronta.py` stáli '
      'ešte nezačaté dávky K44, K32, K33 (343) a K34 za slovesom „je zlúčená“ (teraz „ešte nezačaté sú …“) a pri K44 ostalo „ich“ po '
      'odstránenom 344 (teraz „ho“). (3) Vlákno k pripomienke zatvára majiteľ. (4) Prehľad sa nemení: '
      'nálezy 1–364, zatvorené 14, hotové 147, PRED 51, PO 132; čakajúcich rozhodnutí 9 z 70. Dopad na E2E: žiadny.'),
    ('24. 11. 2026',
      'Vetva 201 (vychádza z `main` `3d0b74ce`, teda po PR #323). (1) Zlúčené od vetvy 200: PR #322 (vetva 200; 23. 11. 2026 '
      'o 18:45 UTC, merge `0ebe420b`; karta K57, nálezy 363 a 364, rozhodnutie R69, tri obrázky a opravy pripomienok '
      'CodeRabbitu) a PR #323 (K57; o 21:55 UTC, merge `3d0b74ce`). (2) K57 (PR #323): okno detailu príspevku na počítači, '
      'deväť commitov, 25 súborov, +3 992 a −76 riadkov: štyri kódové kroky podľa karty (`cb4a5db1` ponuka a portfólio v '
      'dvoch stĺpcoch, `17ec55b3` pružná plocha fotky karty, `cefa99a9` okno len s textom 576 px a `dde7c38c` komentáre v '
      'jednostĺpcovom okne, nález 363), manuál ručných testov (`27df3866`) a tri opravy po pripomienkach botov (`d0ea7af3`, '
      '`c44c14ae` a `44fa6f1e`, manuál `5c6045e6`). Nové sú `FeedDetailSplitContext.tsx` (22 riadkov) a '
      '`useFeedCommentDraft.ts` (62); `FeedPostDetailOverlay.tsx` 385 → 420 riadkov, `FeedPostDetailSplitLayout.tsx` 144 → '
      '165, `FeedPostSharedBlock.tsx` 163 → 170, `SharedContentPreviewCard.tsx` 355 → 393, `FeedPostComments.tsx` 401 → 443 a '
      '`FeedPostComments.types.ts` 68 → 105; `FeedPostCard.tsx` sa nemení (498); 15 nových súborov testov a jeden upravený '
      '(`FeedPostDetailOverlay.test.tsx` 797 → 803 riadkov, štyri testy, R27). (3) Pripomienky botov (tri, všetky platné, '
      'všetky opravené v PR): (a) CodeRabbit: kostra pri prepnutí na iný príspevok zdedila šírku a výšku predošlého; (b) '
      'CodeRabbit: rozpísaný komentár sa pri prechode cez 1 024 px stratil (pred K57 len pri príspevkoch s fotkou, K57 to '
      'rozšírila na ponuky a portfólio); (c) Codex a CodeRabbit nezávisle: pri prepnutí rozloženia počas odosielania sa dal '
      'ten istý komentár odoslať druhýkrát. Vlákna CodeRabbitu sú zatvorené, vlákno Codexu ostalo po zlúčení otvorené (oprava '
      'je v `44fa6f1e`; zatvára ho majiteľ). (4) Kontrola agenta (z GitHubu a v kópii `main` mimo repozitára): CI a '
      'CodeRabbit zelené na hlave `44fa6f1e`, prvé riadky commitov 61 až 66 znakov; `tsc` a ESLint čisté; celý Jest 652 sád, '
      '9 646 testov a 0 snapshotov (pred K57 637, 9 497 a 0); produkčný kód krokov 1 až 4 je rovnaký ako prototyp agenta '
      '(líši sa len o opravy (a) až (c) a jedno slovo komentára) a vykreslené HTML 25 scén na počítači aj pod 1 024 px je '
      'bajt po bajte rovnaké; zásahy 65 z 65 zachytených (51 z prototypu a 14 nových na koncept komentára a kostru). Dve '
      'zistenia, oba v `poznamky.md`: (i) zastaraný komentár o `max-h-[90vh]` (`FeedPostDetailOverlay.tsx:392`) ostal, lebo '
      'karta K57 ho neobsahovala, hoci zápis z 20. 11. sľuboval opravu pri tejto dávke (chyba agenta); (ii) pri písaní '
      'komentára sa karta príspevku v okne prekreslí raz na každý znak (pred K57 nikdy), lebo koncept žije v okne; dopad na '
      'plynulosť nezmeraný. (5) Nálezy 344 a 363 sú HOTOVÉ, 364 ostáva otvorený. Ručný test majiteľa: verdikt zatiaľ '
      'nepovedal. (6) Majiteľ 24. 11. 2026: niektoré vzhľadové veci z K57 sa mu nepáčia a drobné vzhľadové úpravy urobí sám '
      'vo vetve `VU1`; agent odpovedal, že vetvu po oznámení skontroluje a zoznam podľa toho aktualizuje, a majiteľ to '
      'potvrdil (dohodnuté): nové rozhodnutie R70 (možnosť a: agent kontroluje, do vetvy `VU` nepíše). Na pokyn majiteľa '
      'agent len aktualizuje zoznam: kartu K58 ani inú dávku nepripravuje. (7) Upravené: nálezy 344 a 363 (hotové), nové R70, '
      'fronta (344 a 363 už nie sú, K57 zlúčená, vetva `VU1`), tabuľka PR (#323), `poznamky.md`, README (vetvy `VU`), denník '
      '(záznamy z 21. 11. 2026 sú presunuté do `zmeny_starsie_3.py`) a stav. (8) Prehľad: nálezy 1–364, zatvorené 14, hotové '
      '147, PRED 51, PO 132; čakajúcich rozhodnutí 9 z 70. Dopad na E2E: žiadny.'),
    ('23. 11. 2026',
      'Doplnok 3 vetvy 200 (PR #322 je ešte otvorené; `main` ostáva `a9e70eef`). (1) Kontrola PR #322 na hlave `f4a46587` '
      '(23. 11. 2026): CI (`checks`, `backend-postgres`) zelené, Codex bez nálezov, CodeRabbit dve pripomienky (obe Minor, obe '
      'platné, opravené v commite s týmto záznamom): (a) `README.md:105` (mimo zmeneného rozsahu): tabuľka „Kto čo robí“ uvádzala '
      'v riadku Agent medzi výnimkami z mapovania kolegom len nález HNEĎ a dvojité mapovanie K46, hoci pravidlo vyššie (riadok '
      '80) aj R64 a R67 určujú, že redizajn komentárov (261) a okna príspevkov na počítači (344) po schválení vzhľadu mapuje '
      'agent a kód píše kolega podľa jeho karty; výnimka je doplnená aj do tabuľky; (b) `karty/K57.md:82`: ručný test po '
      'nasadení (bod 6) vyžadoval, aby malo okno pevnú výšku, no jednostĺpcové okno má len strop `max-h-[95vh]` (pevnú výšku '
      '`h-[95vh]` má len dvojstĺpcové okno), takže pri krátkom texte a štyroch krátkych komentároch by správna implementácia '
      'kritérium nesplnila; požiadavka je teraz „okno neprekročí 95 % výšky obrazovky“. Rovnaká nepresnosť bola v úvode merania '
      'v podkladoch (`karty/K57_podklady.md`, časť 4: „Okno je `h-[95vh]`“), ktorú pripomienka nespomínala; opravená tiež. '
      'Vlákno k pripomienke (b) zatvára majiteľ. (2) Prehľad sa nemení: nálezy 1–364, zatvorené 14, hotové 145, PRED 53, PO 132; '
      'čakajúcich rozhodnutí 9 z 69. Dopad na E2E: žiadny.'),
    ('23. 11. 2026',
      'Doplnok 2 vetvy 200 (PR #322 je ešte otvorené; `main` ostáva `a9e70eef`). (1) Obrázky k oknu detailu s dlhým textom a veľa '
      'komentármi (na žiadosť majiteľa 23. 11. 2026): agent vykreslil zo skutočného kódu v Chromiu (vymyslené údaje, svetlý režim) '
      'príspevok len s textom s 15 riadkami a 14 komentármi: zbalený („Viac“), rozbalený („Menej“) a rozbalený s textom posunutým na '
      'koniec, pri výškach obrazovky 800 a 950 px, a porovnanie s dneškom. Ukázali dve veci, obe existujú už dnes: (a) v jednostĺpcovom '
      'okne sa pri štyroch a viac komentároch zoznam komentárov neposúva, pevný blok sa zmáčkne (pri 14 komentároch na 128 px) a pole '
      '„Napíš komentár“ vypadne pod okno (nový nález 363); (b) rozbalený dlhý text má strop štvrtinu výšky obrazovky, takže pod 800 px '
      'ukáže menej riadkov než zbalený (650 px: 8 namiesto 10; nový nález 364). (2) Rozhodnutie R69 (majiteľ 23. 11. 2026, podľa '
      'odporúčaní agenta): (1a) oprava komentárov ide ako krok 4 dávky K57; (2a) správanie „Viac“ sa nemení, zapisuje sa ako nález 364 a '
      'rieši sa s redizajnom komentárov (R59). Tri obrázky sú v `navrhy/` ako schválený vzhľad (`pc-okno-dlhy-text-komentare-800-schvalene.png`, '
      '`pc-okno-dlhy-text-komentare-950-schvalene.png`, `pc-okno-dlhy-text-dnes-a-navrh-800-schvalene.png`). (3) Karta K57 '
      '(`karty/K57.md`) má teraz štyri kódové kroky; krok 4: `FeedPostComments.tsx` a `FeedPostComments.types.ts` dostanú vlastnosť '
      '`flexFill` (výška cez flex celým reťazcom namiesto `h-full`; ostatné miesta ju nedostávajú), v `FeedPostDetailOverlay.tsx` sa '
      'pevný blok nezmenšuje (`shrink-0`) a má strop poistky `calc(95vh-11rem)`, sekcia komentárov je flex stĺpec. Podklady '
      '`karty/K57_podklady.md` sú prepočítané. Zistenia z prototypu: pomer zmrštenia (`flex-[1_100_0%]`) nechal pevnému bloku 3 až 4 px '
      'preteku (na Windowse by mohol naskočiť posuvník) a ani väčší pomer ho pri zlomkových výškach nevyhol (1 px), preto `shrink-0` so '
      'stropom; rezerva stropu 10 rem orezala text „Zatiaľ žiadne komentáre“ v nízkom úzkom okne bez komentárov (13 px), preto 11 rem. '
      '(4) Prototyp agenta (kópia `frontend` z `main` `a9e70eef` mimo repozitára): šesť produkčných súborov (+174 a −60 riadkov, z '
      'pridaných je 80 komentárov) a nový `FeedDetailSplitContext.tsx` (22 riadkov), všetky pod 500 riadkov (najväčší '
      '`FeedPostComments.tsx` 423), `FeedPostCard.tsx` sa nemení (498); sedem nových súborov testov (83 testov; krok 4 pridal tri súbory '
      'a 17 testov: 7 pred zmenou padá a 10 stráži, že sa panel nad fotkou, mobilný detail a dvojstĺpcové okno nemenia), existujúce '
      'testy krok 4 nemení; 51 zásahov z 51 zachytených (nových 20); každý zo štyroch krokov prechádza samostatne (po kroku 4 priečinok '
      'Nástenky 102 sád a 1 212 testov); celý Jest 644 sád a 9 580 testov (na `main` 637 a 9 497), `tsc` a ESLint čisté; v Chromiu je '
      'krok 4 rovnaký ako prototyp, ktorý majiteľ videl na obrázkoch (650, 800 a 950 px), a dvojstĺpcové okno je po kroku 4 rovnaké ako '
      'pred ním. (5) Upravené: nové nálezy 363 a 364 (`polozky_nove_k57.py`), nové R69, nález 344 (štyri kroky), fronta, karta K57 a '
      'podklady, tri obrázky v `navrhy/`, denník (záznamy z 20. 11. 2026 sú presunuté do `zmeny_starsie_3.py`) a stav. (6) Prehľad: '
      'nálezy 1–364, zatvorené 14, hotové 145, PRED 53, PO 132; čakajúcich rozhodnutí 9 z 69. Dopad na E2E: žiadny (krok 4 nemení ani '
      'nepridáva `data-testid`).'),
    ('23. 11. 2026',
      'Doplnok vetvy 200 (PR #322 je ešte otvorené; `main` ostáva `a9e70eef`). (1) Pripomienka CodeRabbitu k PR #322 (jedna, '
      'Minor, k `stav.py:354` a k dvom miestam v `README.md`: stále hovorili, že redizajn komentárov a okna príspevkov na '
      'počítači (261, 344) implementuje agent, hoci podľa R67 kód píše kolega): platná, opravená v commite `548deadd`; agent '
      'našiel rovnakú chybu aj vo `fronta.py` (nenahlásenú) a pri historickom zázname vo `stav.py` (doplnok 3 vetvy 191) '
      'doplnil poznámku o zmene R67; CI zelené (CodeRabbit, `checks`, `backend-postgres`). (2) Odpoveď majiteľa 23. 11. 2026 '
      'na otázky agenta k oknu detailu na počítači (344), po štyroch obrázkoch s variantmi A a B z prototypu („idem podľa '
      'tvojich odporúčaní, vyzerá to dobre“): R63 je zodpovedané (kostra a chybové okno úzke, repost textu úzky, fotka karty '
      'spolu s oknom, šírka 576 px, 344 ako prvá časť redizajnu) a nové R68 (natiahne sa aj náhrada za fotku; plocha sa '
      'zmenší najmenej na 128 px: agent po vykreslení obrázkov zmenil odporúčanie z pevných 256 px na zmenšenie, lebo na malom '
      'notebooku inak názov a cena ponuky padnú pod okraj). (3) Karta K57 (`karty/K57.md`: tri kódové kroky a manuál ručných '
      'testov), podklady `karty/K57_podklady.md` a tri schválené obrázky v `navrhy/` (`pc-okno-ponuka-portfolio-schvalene.png`, '
      '`pc-okno-text-uzke-schvalene.png`, `pc-okno-male-obrazovky-schvalene.png`). Prototyp agenta (kópia `frontend` z `main` '
      '`a9e70eef` mimo repozitára): 4 produkčné súbory (+120 a −49 riadkov) a nový `FeedDetailSplitContext.tsx` (22 riadkov), '
      'všetky pod 500 riadkov, `FeedPostCard.tsx` sa nemení (498); 4 nové súbory testov (66 testov), existujúce testy sa menia '
      'len štyri (R27); 31 zásahov z 31 zachytených; celý Jest 641 sád a 9 563 testov (na `main` 637 a 9 497), `tsc` a ESLint '
      'čisté; každý z troch krokov prechádza samostatne; scény, ktoré sa nemajú zmeniť, sú v Chromiu pixel po pixeli rovnaké. '
      'Zistenie z merania: pružná plocha fotky bez podmienky by v jednostĺpcovom okne pod 1 024 px klesla zo 256 na 128 px '
      '(karta 177 px namiesto 305 px), preto sa zapína len v ľavom stĺpci dvojstĺpcového okna cez kontext. (4) Upravené: R63, '
      'nové R68, nález 344 (K47 sa stalo K57), fronta, README a stav. (5) Prehľad: nálezy 1–362, zatvorené 14, hotové 145, '
      'PRED 51, PO 132; čakajúcich rozhodnutí 9 z 68. Dopad na E2E: žiadny (Codex po nasadení pridá kontrolu rozloženia na '
      'čítanie).'),
    ('23. 11. 2026',
      'Vetva 200 (vychádza z `main` `a9e70eef`, teda po PR #321). (1) Zlúčené od vetvy 199: PR #320 (vetva 199; 23. 11. 2026 o '
      '08:23 UTC, merge `8d15bc40`; zápis K54 a K55, nález 333 uzavretý a karta K56; CI zelené) a PR #321 (K56; o 09:42 UTC, merge '
      '`a9e70eef`). (2) K56 (PR #321): opravy 355 a 356, tri commity (`b651df1c` pre 355, `8e96b7bc` pre 356 a manuál `8955e61d`), '
      '6 súborov, +469 a −8 riadkov: `FeedPostCardLayers.tsx` dáva oknu zdieľania `currentPost` (204 riadkov) a v '
      '`FeedPostCard.tsx` je `post` v závislostiach efektu E5 (493 → 498 riadkov); dva nové súbory testov '
      '(`FeedPostCard.shareAfterEdit.test.tsx` 170 riadkov a 3 testy, `FeedPostCard.feedRefreshDuringLike.test.tsx` 285 riadkov a '
      '6 testov), jedna veta komentára v `FeedPostCard.feedSync.test.tsx` a manuál ručných testov (krok 9). Kolega prevzal kód aj '
      'testy z podkladov agenta: produkčné súbory sa líšia jedným slovom komentára, testy sú bajt po bajte rovnaké. (3) Kontrola '
      'agenta (z GitHubu a v kópii `main` mimo repozitára): CI zelené, CodeRabbit bez pripomienok (len kozmetické hlásenie o '
      'názve PR) a Codex bez väčších problémov, vlákna ani recenzie nie sú, prvé riadky commitov 62, 63 a 65 znakov; `tsc` a '
      'ESLint (0 varovaní) čisté, celý Jest 637 sád, 9 497 testov a 0 snapshotov (na `main` pred K56 635, 9 488 a 0); zásahy Q1 '
      'až Q9 na zlúčenom kóde zachytených 9 z 9 novými testami. (4) Ručný test majiteľa K56: hotová, nasadená a otestovaná, '
      'nové nálezy nenahlásené; nálezy 355 a 356 sú HOTOVÉ. (5) Rozhodnutie R67 (zmena R64): na otázku agenta, či vie zadať '
      'redizajn kolegovi tak, aby ho urobil presne podľa dohody, majiteľ 23. 11. 2026 určil podľa odporúčania, že redizajn '
      'komentárov (261) a okna príspevkov na počítači (344) píše kolega podľa presnej karty agenta (obrázok, tabuľka hodnôt, čo '
      'sa nesmie zmeniť, malé časti); agent po každej časti kontroluje výsledok voči odsúhlasenému vzhľadu v prehliadači a '
      'majiteľ testuje ručne; všetko ostatné z R64 platí (rekapitulácia a vizuál s odporúčaním od agenta, R49). Postup, ktorý '
      'majiteľ určil: najprv zápis tejto zmeny, potom doriešenie otvorených vecí a krátka rekapitulácia, aby si bol na 100 % '
      'istý. (6) Upravené: nálezy 355 a 356 (hotové), rozhodnutie R64 (poznámka o zmene) a nové R67, nálezy 261, 344 a 359 (kto '
      'píše kód), fronta (355 a 356 už nie sú, texty o R64 a K56), tabuľka PR (#321), README (rozdelenie práce) a stav. (7) '
      'Prehľad: nálezy 1–362, zatvorené 14, hotové 145, PRED 51, PO 132; čakajúcich rozhodnutí 10 z 67. Dopad na E2E: žiadny.'),
    ('23. 11. 2026',
      'Vetva 199 (vychádza z `main` `46eb8d0b`, teda po PR #319). (1) Zlúčené od vetvy 197: PR #316 (vetva 197; 22. 11. 2026 o '
      '17:28 UTC, merge `9961c254`; zápis K53, nálezy 361 a 362 a karta K54), PR #317 (K54; o 19:06 UTC, merge `fb43add0`), PR #318 '
      '(vetva 198, len karta K55; o 20:08 UTC, merge `252960f4`) a PR #319 (K55; 23. 11. 2026 o 06:19 UTC, merge `46eb8d0b`). '
      '(2) K54 (PR #317): krok f delenia karty: 4 commity (tri etapy `800c91d6`, `1e6fab10` a `f1deacb7` a manuál `f37f501a`), 5 '
      'súborov, +265 a −127 riadkov: nové hooky `useFeedPostCardActions.ts` 94, `useFeedPostCounts.ts` 79 a '
      '`useFeedPostMobileLayers.ts` 60 riadkov, `FeedPostCard.tsx` 590 → 549 → 515 → 493 (teda pod limitom 500) a '
      '`sablony/dymovy_test.md` (+2 odrážky kroku 9); podľa textov commitov čisté presuny (pôvodná karta poskladaná späť bajt po '
      'bajte po každej etape), celý Jest 638 sád, 9 561 testov a 73 snapshotov pred etapou aj po nej, `tsc`, ESLint, preklady a build '
      'čisté, paritné mutácie z 46 zachytených 41 a prežilo päť očakávaných (D1, D8, R3b, R4 a R5). (3) K55 (PR #319): '
      '`FeedPostMobileDetail.tsx` 594 → 464 → 358 dvoma presunmi (nové `FeedPostMobileDetailContent.tsx` 225 a '
      '`FeedPostMobileDetailHeader.tsx` 172) a zmazanie šiestich dočasných súborov (odtlačky HTML a sonda poradia efektov, 73 '
      'testov a 73 snapshotov) s úpravou jednej vety komentára; 4 commity (`afca350a`, `6b15e283`, `2f501c7b` a manuál `65c56c18` '
      'so štyrmi odrážkami), 11 súborov, +438 a −8 452 riadkov; celý Jest po zmazaní 635 sád, 9 488 testov a 0 snapshotov. '
      '(4) Kontrola agenta (23. 11. 2026, z GitHubu a v kópii mimo repozitára zo zlúčeného `main`): v oboch PR CI zelené, CodeRabbit '
      'zelený a bez pripomienok (spustil ho majiteľ pred zlúčením; len kozmetické hlásenie o názve PR), Codex bez väčších '
      'problémov, vlákna ani recenzie nie sú, prvé riadky commitov najviac 72 znakov; presuny po etapách z git objektov sedia '
      '(odstránené riadky sú v nových súboroch, výnimky sú len rámce viacriadkových importov a komentár hlavičky `{/* … */}` → '
      '`//`); `tsc` a ESLint (0 varovaní) čisté, celý Jest 635 sád, 9 488 testov a 0 snapshotov (presne ako udáva kolega); '
      'paritné zásahy na zlúčenom kóde: K54 zo 48 zachytených 41 (prežilo päť očakávaných D1, D8, R3b, R4 a R5 a dva zásahy na poradie '
      'volania hookov, P1 a P2, ktoré predtým zachytávala dočasná sonda; všetkých 22 zásahov do efektov ostalo zachytených aj bez nej), K55 z '
      '34 zachytených 31 (prežili MD1, C14 a H7: ochrana pred dvojitým volaním, farba aktívneho srdiečka a čas v hlavičke), prežívajúce vždy aj '
      'proti všetkým 95 súvisiacim sadám. (5) Ručné testy majiteľa K54 aj K55: všetko v poriadku, žiadne nové nálezy. Nález 333 je tým HOTOVÝ (presunutý do '
      '`hotove_k40.py`, text zhustený; z ručných testov vznikli nálezy 357 až 362, ktoré idú po redizajne). (6) Na pokyn '
      'majiteľa agent napísal kartu K56 (posledný krok pred redizajnom: oprava 355, okno zdieľania po úprave ukáže `currentPost`, a '
      'oprava 356, `post` do závislostí efektu E5; `karty/K56.md`, overené testy a mutácie v `karty/K56_podklady.md`); prototyp v '
      'kópii mimo repozitára: z 9 nových testov 4 pred opravami padajú a po nich prejdú všetky, celý Jest 637 sád, 9 497 testov a 0 snapshotov, `tsc` a ESLint čisté, všetkých 9 zásahov Q1 až Q9 zachytených novými testami a päť '
      'opakovaných behov nových súborov bez pádu. Redizajn (rekapitulácia a '
      'vizuálny návrh, R64) začne, až keď majiteľ potvrdí, že K56 je nasadená a otestovaná. (7) Upravené: nález 333 (hotový), '
      'nálezy 355 a 356, tabuľka PR (K54 a K55), fronta (355 a 356 sú dávka K56 a idú prvé; 333 už nie je vo fronte; 361 a 362 už '
      'nebrzdí K55), prehľad vĺn a stav. (8) Prehľad: nálezy 1–362, zatvorené 14, hotové 143, PRED 53, PO 132; čakajúcich '
      'rozhodnutí 10 z 66. Dopad na E2E: žiadny.'),
    ('22. 11. 2026',
      'Vetva 197 (vychádza z `main` `0c2be295`, teda po PR #315). (1) Zlúčené: PR #314 (vetva 196; 22. 11. 2026 o 13:50 UTC, '
      'merge `cc728394`; zápis K52 a karta K53; CI a CodeRabbit zelené, vlákna ani recenzie nie sú) a PR #315 (K53; o 15:53 UTC, '
      'merge `0c2be295`). (2) K53 (PR #315): krok e delenia karty: 2 commity, 3 súbory: nový `FeedPostCardHeader.tsx` 211 riadkov, '
      '`FeedPostCard.tsx` 722 → 590 a `sablony/dymovy_test.md` (+4 odrážky kroku 9); podľa textu commitu čistý presun (pôvodná '
      'karta poskladaná späť bajt po bajte), celý Jest 638 sád, 9 561 testov a 73 snapshotov, `tsc`, ESLint (0 varovaní), preklady '
      'a build čisté, paritné mutácie H1 až H22 (23) zachytené pred presunom aj po ňom; zásah X4 (`closeMenu` bez `useCallback`) '
      'prežil, takže stabilitu `onClose` nestráži žiadny test (poznámka, nie nález). (3) Kontrola agenta (dodatočná, lebo PR bol '
      'zlúčený skôr, než majiteľ poslal jeho číslo) z GitHubu a v kópii mimo repozitára: CI zelené, Codex bez väčších problémov, '
      'vlákna ani recenzie nie sú; CodeRabbit K53 nekontroloval (automatické recenzie sú vypnuté a príkaz `@coderabbitai review` prišiel '
      'o 15:55 UTC, po zlúčení o 15:53 UTC); 149 odstránených a 17 pridaných riadkov karty sedí s novým súborom; `tsc` a ESLint '
      'čisté, 98 sád s 1 346 testami a 73 snapshotmi prešlo; 26 paritných mutácií (H1 až H22 a tri navyše) zachytených 26 z 26. '
      '(4) Ručný test K53 (majiteľ): K53 nič nepokazila; nové nálezy 361 (meno autora príspevku sa podčiarkuje pri prejdení kurzorom '
      'alebo po ťuknutí) a 362 (avatar a meno pôvodného autora v prezdieľanom príspevku nevedú na profil), obe staršie správanie, '
      'zadané presne (vzhľad aj správanie), takže R49 je splnené. Agent ich zaradil po redizajne spolu s 357 až 360 a nie pred K55, '
      'lebo menia DOM, ktorý stráži dočasný odtlačok HTML; manuál ručných testov má známe odchýlky 361 a 362. (5) Na pokyn majiteľa '
      'agent napísal kartu K54 (krok f: obsluhy, počty s pollingom a mobilné vrstvy s efektmi E6 a E7 do troch hookov v troch '
      'commitoch; `karty/K54.md`, najrizikovejšia dávka); prototyp v kópii mimo repozitára prešiel po každej etape `tsc`, ESLintom '
      'bez varovania a 98 sadami bez zmeny odtlačkov a sondy (karta 590 → 549 → 516 → 495 riadkov), zásahy D1 až D14, E1a až E7e a R1 '
      'až R9 a dva zásahy na poradie volania hookov zachytených 43 zo 48 (prežili len D1, D8, R3b, R4 a R5, ktoré prežívajú už dnes, K48), obe zmeny poradia zhodila sonda. K54 sa nezlúči s K55: tá čaká na ručný test K54. Majiteľ sa opýtal, koľko '
      'krokov je do redizajnu: tri dávky kolegu (K54, K55, K56) a potom návrh vzhľadu od agenta (R64). (6) Upravené: nález 333 '
      '(výsledky K53 a plán K54), nové 361 a 362 (`polozky_nove_k53.py`), tabuľka PR, fronta (333 je teraz dávka K54; nálezy 361 a 362 '
      'idú po redizajne), manuál ručných testov (známe odchýlky) a stav. (7) Prehľad: nálezy 1–362, zatvorené 14, hotové 142, PRED 54, '
      'PO 132; čakajúcich rozhodnutí 10 z 66. Dopad na E2E: žiadny (žiadny špec nepoužíva riadok pôvodného autora v náhľade).'),
    ('22. 11. 2026',
      'Vetva 196 (vychádza z `main` `8c9e636d`, teda po PR #313). (1) Zlúčené: PR #312 (vetva 195; 22. 11. 2026 o 11:18 UTC, '
      'merge `20cac81c`; zápis K51, nálezy 357 až 360 a karta K52; CI zelené, CodeRabbit bez pripomienok, vlákna nie sú) a PR #313 '
      '(K52; o 12:35 UTC, merge `8c9e636d`). (2) K52 (PR #313): krok c delenia karty: 2 commity, 4 súbory: nové '
      '`FeedPostCardLayers.tsx` 204 riadkov a `useFeedPostCardLayers.ts` 51 riadkov, `FeedPostCard.tsx` 774 → 722 a '
      '`sablony/dymovy_test.md` (+4 odrážky kroku 9); podľa textu commitu čistý presun (pôvodná karta poskladaná späť bajt po '
      'bajte), celý Jest 638 sád, 9 561 testov a 73 snapshotov, `tsc`, ESLint (0 varovaní), preklady a build čisté, paritné '
      'mutácie L1 až L27 vrátane L25b 27 z 28 (prežila len L20 = chyba 355). Odchýlky od karty: hook má deväť vlajok namiesto '
      'dvanástich (tri vlajky ostali v karte kvôli efektom E6 a E7 a pravidlu `exhaustive-deps`), nové súbory 255 riadkov '
      '(karta asi 240) a karta 722 riadkov (karta asi 695 ±25). (3) Kontrola agenta (dodatočná, lebo PR bol zlúčený skôr, než '
      'majiteľ poslal jeho číslo) z GitHubu a v kópii mimo repozitára: CI a CodeRabbit zelené, Codex bez väčších problémov, '
      'vlákna ani recenzie nie sú; telo pôvodnej karty sa poskladá späť bajt po bajte (703 z 703 riadkov), všetkých 99 '
      'neprázdnych odstránených riadkov je v nových súboroch; `tsc` a ESLint čisté, 98 sád s 1 346 testami a 73 snapshotmi '
      'prešlo; zo 41 paritných mutácií (L1 až L27 vrátane L25b, S1 až S9 a X1 až X4) zachytených 40, prežila len L20; manuál '
      'ručných testov (krok 9) zodpovedá kódu. (4) Na pokyn majiteľa agent napísal kartu K53 (krok e: hlavička s menu a stav '
      'menu do `FeedPostCardHeader.tsx`, `karty/K53.md`); prototyp kroku e v kópii mimo repozitára prešiel `tsc`, ESLintom bez '
      'varovania a 98 sadami bez zmeny odtlačkov a sondy (karta 722 → 590 riadkov, nový súbor 201), zásahy H1 až H22 (23) '
      'zachytené pred presunom aj po ňom (23 z 23, vždy tým istým prvým padnutým testom) a tri zásahy navyše tiež (26 z 26). '
      'K53 sa zlúči až po ručnom teste K52 (majiteľ ho robí). (5) Upravené: nález 333 (výsledky K52 a plán K53), tabuľka PR, '
      'fronta (333 je teraz dávka K53) a stav. (6) Prehľad: nálezy 1–360, zatvorené 14, hotové 142, PRED 52, PO 132; '
      'čakajúcich rozhodnutí 10 z 66. Dopad na E2E: žiadny.'),
    ('22. 11. 2026',
      'Vetva 195 (vychádza z `main` `39f6e1a7`, teda po PR #311). (1) Zlúčené: PR #310 (vetva 194; 22. 11. 2026 o 06:37 UTC, '
      'merge `ee374c4c`; zápis K50 a karta K51; CodeRabbit dal jednu platnú pripomienku, podmienku zlúčenia K51 po ručnom teste '
      'K50, opravenú pred zlúčením) a PR #311 (K51; o 08:58 UTC, merge `39f6e1a7`). (2) K51 (PR #311): krok d delenia karty: 2 '
      'commity, 3 súbory: nový `FeedPostSharedBlock.tsx` 163 riadkov, `FeedPostCard.tsx` 852 → 774 a `sablony/dymovy_test.md`; '
      'podľa textu commitu čistý presun (pôvodná karta poskladaná späť bajt po bajte), celý Jest 638 sád a 9 561 testov, `tsc`, '
      'ESLint, preklady a build čisté, paritné mutácie 12 z 12; kolega opravil dve tvrdenia v karte (odstránenie `fixedBlock` je '
      'ekvivalent; „len odtlačok“ neplatí pri B2) a priradil jednorazový pád `FeedHomeEntryScroll` k nálezu 31. (3) Kontrola agenta '
      'z GitHubu a v kópii mimo repozitára: CI a CodeRabbit zelené, vlákna nie sú; z 812 neprázdnych riadkov pôvodnej karty '
      'chýbajú v nových súboroch len dva (obal ternára); `tsc` a ESLint čisté, 40 sád s 439 testami a 73 snapshotmi prešlo; '
      'paritné mutácie 12 z 12 zachytených, odstránenie `fixedBlock` prežilo (ekvivalent, kolega mal pravdu) a vynechanie '
      'skorého `return null` zhodilo odtlačok. (4) Ručný test K51 (majiteľ): nové nálezy 357 (repost: text pôvodného príspevku bez '
      '„Viac“), 358 (zdieľaná ponuka a portfólio: text zdieľajúceho sa nezobrazuje), 359 (označenia ako obyčajný text bez '
      'bubliny; podmnožina skupiny 8 v nálezu 261) a 360 (mobil: starý spôsob zobrazenia príspevku namiesto dnešnej obrazovky '
      'detailu; odstrániť aj z kódu). Majiteľ ich chce opraviť hneď po redizajne komentárov a rozložení príspevkov (261 a 344), '
      'lebo sa dotýkajú tých istých miest; agent ich podľa jeho pokynu nemapoval a zapísal ich až po vysvetlení (dve snímky z '
      'počítača a dve z mobilu). K51 je doslovný presun, takže nálezy sú staršie správanie. Manuál ručných testov '
      '(`sablony/dymovy_test.md`, krok 9) tvrdil, že text zdieľajúceho je nad náhľadom a dá sa rozbaliť (z karty K51); opravený '
      'o známe odchýlky 357 a 358. (5) Ďalší krok: K52 (krok c: vrstvy a dialógy a hook vlajok; karta `karty/K52.md`). (6) '
      'Upravené: nález 333 a nové 357 až 360 (`polozky_nove_k51.py`), tabuľka PR, fronta (333 je teraz dávka K52; nálezy 357 '
      'až 360 idú po redizajne), poradie a manuál ručných testov. (7) Prehľad: nálezy 1–360, zatvorené 14, hotové 142, PRED 52, '
      'PO 132; čakajúcich rozhodnutí 10 z 66. Dopad na E2E: žiadny na špecy; nález 360 môže zasiahnuť špecy upozornení a detailu '
      'príspevku (neoverené).'),
] + ZMENY_STARSIE_3 + ZMENY_STARSIE_2 + ZMENY_STARSIE

# Nálezy opravené po prvom vydaní (`DONE_SINCE`), tabuľka PR (`DONE_PR_TABLE`) a popis série Upozornenia (`SERIA_UPOZORNENIA`) sú v
# `hotove.py`; tu sa len sprístupňujú pod pôvodnými názvami, aby ostatné moduly ostali nezmenené.
from hotove import DONE_PR_TABLE, DONE_PR_TABLE_CASTOCNE, DONE_SINCE, SERIA_UPOZORNENIA  # noqa: F401

# Odporúčané poradie práce (vlny). `polozky` sú ID, ktoré text vlny spomína: kontrola v `model.py` zlyhá, ak nejaké z nich
# už nie je otvorené, aby text vlny nezostal zastaraný.
PORADIE = [
    dict(vlna='0 – najprv',
         co='Rýchle upgrady z 183 a 184 bez veľkého rizika: backend (Pillow, gunicorn, requests, DRF, simplejwt, daphne, python-dotenv, bleach, '
            'Django 4.2.30, odstránenie allauth) je hotový a zlúčený (vetva 143, PR #203), frontend (`npm audit fix`, odstránený `next-intl`) je '
            'zlúčený (vetva 142). Skok `next` 14 → 16 je hotový vo vetve 159; Django 5.2 je zlúčený (vetva 154, PR #214), protobuf opravený '
            '(vetva 158, PR #217) a zo 183 ostáva len vývojový `pytest` (skupina po nasadení); upgrade `next` na 16.4.5 (341, bezpečnostné upozornenie) je hotový a zlúčený (K31, PR #304, 21. 11. 2026)',
         preco='Malé a bezpečné. Zraniteľné verzie zmiznú skôr, než pribudne ďalší kód.',
         polozky=['183']),
    dict(vlna='1 – základ, kým sa aplikácia dokončuje',
         co='Veľké skoky verzií sú hotové (Django 5.2 LTS s DRF 3.18.3 vo vetve 154, `google-cloud-vision` s protobuf vo vetve 158, '
            'Next 16 s Reactom 19 vo vetve 159) a balík „Produkčná odolnosť aplikácie“ (179, 234, 33, 9, 52 vo vetve 161; 214, 236 a 232 '
            'zlúčené vo vetve 165, PR #230; 246 v K12, PR #242; 296 v K13, PR #244; ostáva 245: overenie v logoch Railway; nový nález HNEĎ '
            '318 je zatvorený: push na iPhone nechodil pre nastavenie rollout 5 % v Railway, R33); ďalej 185, OW-07, '
            'overenie súkromia obrázkov správ (266), politika S3 bucketu v README (304) a balík „Spoľahlivosť CI a testov“ (31, TEST-…, 189, 209, 223, '
            '225, 295; 212 je '
            'hotová vo vetve 157, 228 v K6, 194 a časť 204 v K12, 244 v K14, 328 v PR #261)',
         preco='Veľké skoky verzií sú najlacnejšie teraz, kým je kódu najmenej, a hneď po nich treba spustiť celé testy.',
         polozky=['245', '185', 'OW-07', '266', '304', '31', '189', '209', '223', '225', '295']),
    dict(vlna='2 – viditeľné chyby a overenia (iPhone a mobil)',
         co='Navigácia a Späť (13, 14, 174), plynulosť prechodov na mobile (283 až 285 a 289: zvyšky po 276; 286 je hotová v K14, jej zvyšky 308 až 310 sú hotové v K16 a 311 je zatvorený rozhodnutím R38; 287 a 288 '
            'idú podľa R28 po overení na iPhone), Profil a identita (81, 272; 320 je hotová v K15), Zdieľanie a obrázky '
            '(92, 207; 301 je hotová v K13), ponuky a tagy (322 a 323 sú hotové v K15), '
            'natívne okná `alert()` namiesto toastov (302 je hotová v K17), recenzie (325 a 331 sú hotové v K21, 334 v K22, 336 v K24 a 326 a 327 v K18), Upozornenia a '
            'push (319 prepínač offline: kód je v K20, čaká na ručný test; 321 kategórie upozornení sú hotové (K19, K20, K23 a K25; zvyšok E2E je nález 337); 330 gulička Žiadostí pri vypnutej kategórii je hotová v K21, R39), Upozornenia '
            'na zmazaný obsah (74), Žiadosti (17), '
            'Vyhľadávanie a Sledovania (OW-11, OW-14, OW-17, OW-05), mobilný onboarding nových používateľov (252), vzhľad Nástenky '
            '(259 a 261; redizajn komentárov má schválený vzhľad (R52); delenie veľkých súborov Nástenky je hotové (nález 333: `FeedPostComments.tsx` K28 až K42, `FeedPostCard.tsx` a `FeedPostMobileDetail.tsx` K46 až K55), K40 až K43 a K45 sú hotové, K31 je zlúčená (PR #304) a podľa R59, dohody s majiteľom (20. a 21. 11. 2026) a R65 (a) sa redizajn začal až po opravách 355 a 356 v K56 (delenie `FeedPostCard.tsx` a mobilného detailu je hotové): okno na počítači (344 a 363) je od 23. 11. 2026 hotové v K57 (PR #323) a redizajn komentárov (261) čaká na rekapituláciu a vizuálny návrh; karty píše agent a kód kolega (R67, zmena R64); rieši sa pri ňom aj pole na text pri odpovedi na komentár; 338 zaseknuté načítavanie komentárov je hotové v K41, 342 zmiznutý príspevok pri odpovedi, úprave a zmazaní a 351 slučka chybových hlásení pri donačítaní komentárov a odpovedí bez internetu sú hotové v K43; 353 drobná hláška pri zastaranom zlyhaní odpovedí; 355 okno zdieľania po úprave a 356 starý lajk v detaile po obnove feedu počas lajku (z mapovania K46) sú hotové v K56; 357 až 360 (ručný test K51: repost bez „Viac“, text pri zdieľanej ponuke a portfóliu, označenia ako obyčajný text, starý spôsob zobrazenia príspevku na mobile; idú po redizajne); zoznam lajkujúcich pri ponukách, portfóliu a profile 262, R20: backend je hotový v K27, vzhľad je schválený (R51 a R56) a frontend ide po etapách; úchytka panela nad fotkou 343 je otvorená (návrh K33); okno detailu na počítači 344 a oprava komentárov v ňom 363 sú hotové v K57 (PR #323; 364 rozbalený text pod 800 px ostáva otvorený a rieši sa s redizajnom komentárov); 345 a 350 sú hotové v K39 a 346 viditeľnosť nového komentára na iPhone v K40) a drobnosti zo 36, živé '
            'overenie N16, RET-01..03 a ručný test VoiceOverom (294)',
         preco='To uvidí každý nový používateľ hneď prvý deň. Overenia (N16, RET-01..03, 294) sa dajú robiť už teraz na Railway a na iPhone.',
         polozky=['13', '14', '174', '283', '284', '285', '287', '288', '289', '81', '272', '92', '207', '319', '262', '343', '353', '357', '358', '359', '360', '74', '17', 'OW-11', 'OW-14', 'OW-17', 'OW-05', '252', '259', '261', '36', '294', 'N16', 'RET-01', 'RET-02', 'RET-03']),
    dict(vlna='3 – texty a súkromie',
         co='175, 176, 204, APP-03 a 186 (R2: všetkých šesť jazykov pred štartom; 332 je hotová v K21, 335 (atribút `lang` na `<html>`) v K22; 120 a 177 sú hotové v K6; 297 v K13; 306 surový „Network Error“ v toastoch v K15) a súkromie: 347 (ponuky účtov staff a superuser cez priame id; najprv rozhodnúť, či je to zámer), 348 (osirotená recenzia '
            'neaktívneho hodnoteného používateľa) a 349 (deaktivovaný účet a cache autentifikácie; najprv rozhodnúť dôležitosť); 339 je hotová v K30',
         preco='Všetkých šesť jazykov (sk, cs, hu, de, pl, en) musí byť pri štarte hotových (R2, 13. 11. 2026).',
         polozky=['175', '176', '204', 'APP-03', '186', '347', '348', '349']),
    dict(vlna='4 – keď bude aplikácia hotová',
         co='Príprava ostrého nasadenia N1–N15 (hosting, doména, právne dokumenty, server, zálohy, monitoring, smoke test), OW-06 a 180 '
            '(diagnostiku 180 možno začať už teraz)',
         preco='Robí sa na novom serveri po dokončení aplikácie.',
         polozky=['N%d' % i for i in range(1, 16)] + ['OW-06', '180']),
    dict(vlna='5 – po nasadení',
         co='Časť 5: funkcie, upratovanie, výkon, nástroje',
         preco='Podľa spätnej väzby od prvých používateľov.',
         polozky=[]),
]

# Rozhodnutia, ktoré patria používateľovi. Po odpovedi sa vyplní `odpoved` a `datum` (zobrazí sa v časti „Rozhodnuté“).
DECISIONS = [
    dict(id='R1', tema='Hosting (N1)',
         otazka='Kam nasadiť ostrú verziu pre ostatných používateľov (Railway ostáva len na testy)?',
         odporucanie='Hetzner Cloud (EÚ) + Coolify + Cloudflare + R2 (príloha C). Pre čo najmenej starostí so serverom, ak to rozpočet unesie: '
                     'Render (Frankfurt) alebo Scalingo.',
         kedy='Až keď bude aplikácia hotová. Teraz netreba.'),
    dict(id='R2', tema='Jazyky pri štarte (176, 175, APP-03)',
         otazka='Ktoré jazyky majú byť pri štarte plne preložené?',
         odporucanie='Podľa cieľového trhu. V profile a vyhľadávaní chýbajú preklady hlavne v češtine (~30) a poľštine (~14), v nemčine jeden; '
                     'v celej aplikácii má čeština asi 210 a poľština asi 90 slovenských kópií (176). Meranie kolegu z 6. 11. 2026 (hodnoty zhodné so '
                     'slovenčinou) ukázalo viac: v `cs.json` 247 (aspoň 29 určite slovenských), v `pl.json` 49, v `de.json` 3 a v `hu.json` 1, '
                     'takže rozsah 176 je väčší, než sa čakalo. Ak štart cieli len na Slovensko, 176 môže ísť po nasadení; ak aj na Česko a '
                     'Poľsko, patrí pred štart. Malé veci (120 a 177 sú hotové v K6, ostáva zvyšok 175) idú pred štart v každom prípade.',
         kedy='Rozhodnuté 13. 11. 2026.',
         odpoved='Majiteľ 13. 11. 2026: všetkých šesť jazykov aplikácie (slovenčina, čeština, maďarčina, nemčina, poľština a angličtina) '
                 'má byť pri štarte plne preložených. Majiteľ najprv odpovedal na inú vec: ako sa má jazyk vyberať (Slovensko '
                 'slovenčina, Česko čeština, Maďarsko maďarčina, Rakúsko nemčina, Poľsko poľština a zvyšok sveta angličtina); agent '
                 'vysvetlil, že R2 sa pýtal na rozsah prekladov, a z odpovede vyvodil, že každý z týchto jazykov musí byť hotový, čo '
                 'majiteľ potvrdil („určite áno“). Nález 176 (zvyšné slovenské kópie v češtine, poľštine, nemčine a maďarčine; meranie '
                 'kolegu z 6. 11. 2026: cs 247, pl 49, de 3 a hu 1 hodnôt zhodných so slovenčinou, časť sú legitímne rovnaké slová) a '
                 'súvisiace 175 a APP-03 idú pred štart a poradie jazykov netreba určovať. Výber jazyka podľa krajiny aplikácia už robí '
                 '(`LanguageContext.tsx`: krajina z IP adresy dá PL, SK, CZ a HU ich jazyk a DE a AT nemčinu, inak jazyk prehliadača, '
                 'inak slovenčina; ručná voľba v Nastaveniach má prednosť a ukladá sa v prehliadači). Rozdiel oproti pravidlu majiteľa '
                 '(zvyšok sveta má dostať angličtinu) rieši nález 332 (hotový v K21, PR #260); jazyk prehliadača alebo telefónu ostáva druhým signálom '
                 '(majiteľ 13. 11. 2026: podľa odporúčania agenta). Spôsob zisťovania krajiny (dnes cudzia služba `ipapi.co` z '
                 'prehliadača) rieši nález 186 a R7 pred štartom.',
         datum='13. 11. 2026'),
    dict(id='R3', tema='Číselné slugy (81)',
         otazka='Zakázať slug zložený len z číslic, alebo ho vo frontende uprednostniť pred ID?',
         odporucanie='Zakázať pri generovaní (predpona `u-`) a doplniť migráciu existujúcich. Frontendová záplata nerieši, že dve rôzne veci majú '
                     'rovnaký tvar.',
         kedy='Pred prácou na 81.'),
    dict(id='R4', tema='Zmazaný komentár v upozornení (74)',
         otazka='Čo má urobiť klik na upozornenie, ktorého komentár už neexistuje?',
         odporucanie='Otvoriť príspevok a ukázať krátku hlášku „komentár už nie je“, aby používateľ nezostal na slepej ceste. Pri zmazanom '
                     'príspevku platí hláška z opravy 111.',
         kedy='Pred prácou na 74.'),
    dict(id='R5', tema='Otváracie hodiny vo výsledkoch (OW-14)',
         otazka='Čo s nefunkčným tlačidlom Otváracie hodiny pri firemnej ponuke vo výsledkoch?',
         odporucanie='Doplniť popover (API údaje posiela, vzor je v profile). Ak by to bolo príliš veľké, dočasne tlačidlo skryť, aby tam nebolo '
                     'mŕtve.',
         kedy='Pred prácou na OW-14.'),
    dict(id='R6', tema='Mobilné výsledky Sledovaní v iOS PWA (OW-05)',
         otazka='Majú byť hotové pred štartom?',
         odporucanie='Až po štarte, ak Sledovania nie sú hlavná funkcia pri štarte. Je to rozšírenie (plán mobilných výsledkov), nie oprava. '
                     'Pred štartom stačí overiť, že používateľ nenarazí na slepú uličku.',
         kedy='Pred prácou na OW-05.'),
    dict(id='R7', tema='Zistenie krajiny (186)',
         otazka='Ako zisťovať krajinu používateľa bez volania cudzej služby z prehliadača?',
         odporucanie='Ak ostane Cloudflare: hlavička `CF-IPCountry` (bez tretej strany v prehliadači). Inak GeoIP databáza na backende. Volanie '
                     '`ipapi.co` z prehliadača odstrániť.',
         kedy='Až pri príprave štartu (186).'),
    dict(id='R8', tema='Django a backend balíky (183)',
         otazka='V akom poradí robiť upgrady backendu?',
         odporucanie='Najprv rýchle upgrady bez veľkého rizika (Pillow, gunicorn, requests, DRF, simplejwt, daphne, python-dotenv, bleach) a '
                     'odstránenie nepoužívaného allauth, potom samostatný balík Django 5.2 LTS. Každý na vlastnej vetve s celými backendovými testami.',
         kedy='Pred prácou na 183.',
         odpoved='Podľa odporúčania: najprv rýchle upgrady a odstránenie allauth (183a, vetva 143), potom samostatný balík Django 5.2 LTS (183b); '
                 'každý na vlastnej vetve s celými backendovými testami.',
         datum='27. 10. 2026'),
    dict(id='R9', tema='Next.js 14 → 15 / 16 (184)',
         otazka='Povýšiť Next pred štartom a kde bude frontend bežať?',
         odporucanie='Samostatný balík pred štartom (pravdepodobne aj React 19, viď 153). Frontend nechať na vlastnom serveri a zraniteľnosť '
                     'odstrániť upgradom, nie presunom na Vercel (C.4).',
         kedy='Pred prácou na 184; časť o hostingu frontendu až neskôr (R1).',
         odpoved='Podľa odporúčania: samostatná vetva 159 pred štartom s Next 16.4.3 a Reactom 19.3.1; frontend ostáva na vlastnom serveri, '
                 'nie na Verceli. Majiteľ odsúhlasil aj plán s upozornením na novú minimálnu podporu Safari 16.4 (iOS 16.4).',
         datum='31. 10. 2026'),
    dict(id='R10', tema='Obrazová moderácia pri výpadku (N10)',
         otazka='Čo robiť, keď Google Vision nie je dostupný?',
         odporucanie='Produkcia je už nastavená „fail-closed“: obrázok sa odmietne s hláškou „Kontrola bezpečnosti obrázka zlyhala, skúste neskôr.“ '
                     'Odporúčanie je ponechať (bezpečnejšie), len počítať s tým, že pri výpadku Google sa nedajú nahrať obrázky, a sledovať kvóty.',
         kedy='Až pri príprave štartu (N10); stačí potvrdiť.'),
    dict(id='R11', tema='Stará bezpečnostná správa (185)',
         otazka='Čo so zastaranou správou `SECURITY_AUDIT_REPORT.md` z roku 2024?',
         odporucanie='Archivovať mimo repozitára (alebo prepísať podľa dnešného stavu) a overiť, či je repozitár verejný: interné audity a poznámky '
                     'o rizikách tam nepatria.',
         kedy='Pred prácou na 185.'),
    dict(id='R12', tema='Dvojfázové overenie – 2FA (235)',
         otazka='Dokončiť 2FA (zapnutie, QR kód, záložné kódy, zadanie kódu pri prihlásení) pred štartom, alebo až po ňom?',
         odporucanie='Až po nasadení. Cez aplikáciu si ho dnes nemôže zapnúť nikto (zapnúť sa dá len ručne v databáze), takže jeho chýbanie bežným používateľom '
                     'neškodí; dokončenie je väčšia práca '
                     '(koncové body, QR kód, záložné kódy, obrazovky vo všetkých jazykoch, ochrana pred opakovaním kódu, testy). Ak má byť '
                     '2FA pri štarte (napr. kvôli firemným účtom), patrí do vlny 1.',
         kedy='Pred prácou na 235; dovtedy sa 2FA používateľom neponúka.'),
]

# Rozhodnutia R13–R40 (zoznam majiteľa v prílohe D a rozhodnutia po ňom) sú v `rozhodnutia_nastenka.py` a R41 a ďalšie v
# `rozhodnutia_dalsie.py` (kvôli limitu 500 riadkov); pripájajú sa sem.
from rozhodnutia_nastenka import DECISIONS_NASTENKA  # noqa: E402
from rozhodnutia_dalsie import DECISIONS_DALSIE  # noqa: E402

DECISIONS.extend(DECISIONS_NASTENKA)
DECISIONS.extend(DECISIONS_DALSIE)

# Rozhodnutia od R66 (po dvojitom mapovaní K46) sú v `rozhodnutia_k46.py`.
from rozhodnutia_k46 import DECISIONS_K46  # noqa: E402

DECISIONS.extend(DECISIONS_K46)
