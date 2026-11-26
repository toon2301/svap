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
    dict(n=360, bucket=P, imp=S_, eff=EL, pkg='Navigácia a Späť',
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
         note='JASNÉ (rozhodnutia majiteľa 1 až 4 sú hotové, R82; ide až po oprave B (K61) a jej ručnom teste, píše agent, '
              'potom Codex upraví dva špecy, R84; mapovanie K60 hotové: kolega, `karty/K60_vysledok.md`, PR #336; agent ho '
              'overil čítaním kódu a sondami `tsc` a Jest v kópii mimo repozitára, `karty/K60_overenie_agenta.md`). ZISTENIE: '
              'starý spôsob (`FeedPostDetailModule`, modul `feed-post-detail`) sa na mobile otvára DETERMINISTICKY pri každom '
              'upozornení na príspevok (šesť typov), priamom odkaze, F5, kroku v histórii a po ťuku na text pôvodného príspevku '
              'v novej obrazovke pri reposte (`feedSharedContentNavigation.ts:66-69`); ostatné cesty z Nástenky idú na novú '
              'obrazovku, takže „niekedy“ znamená rôznu cestu, nie náhodnosť. Nová obrazovka NEMÁ cieľový komentár '
              '(`highlightCommentId`), preto sa starý spôsob nedá zrušiť len presmerovaním. PLÁN (každý krok samostatný commit, '
              'spolu L, asi 5 commitov a 2 PR): (1) `highlightCommentId` do `FeedPostMobileDetail.tsx` a nový súbor testov (S); '
              '(2) nový hostiteľ `FeedPostMobileDetailHost.tsx` (načíta príspevok, nedostupný 404, 403 a 410, zmazanie, '
              'pristátie po zdieľaní, história rovnako ako okno na počítači) a jeho výber podľa `useIsMobile` v '
              '`DashboardContentView.tsx:404-409` (M až L); (3a) upozornenie na mobile otvára okno '
              '(`useNotificationNavigation.ts:74` bez `!isMobile`), (3b) priamy odkaz, F5 a krok v histórii: '
              '`feedPostEntryDecision.ts` vráti pre mobil `overlay`, úprava `usePathModuleEffects.ts`, '
              '`usePopstateModuleSync.ts:37` a `dashboardRoutes.ts:177` (`initialRoute: home`) (S až M); (4) E2E (Codex); (5) '
              'zrušenie starého spôsobu: zmazať `FeedPostDetailModule.tsx` (140 r.) a jeho dva súbory testov, najprv preniesť '
              '13 scenárov cieľového komentára do nových testov. OPRAVA PLÁNU KOLEGU (agent, sondy): '
              '`DashboardModuleContent.tsx` musí ponechať vlastnosť `effectiveFeedPostId` v type, lebo '
              '`DashboardContent.tsx:577` (711 r., nemení sa, TECH-01) ju podáva (inak `tsc` hlási TS2322); testov na úpravu je '
              '10 súborov (sondy rozbijú 26 a 16 testov), štyri z nich v zozname kolegu chýbali; čísla riadkov v '
              '`FeedPostMobileDetail.tsx` sa po PR #335 posunuli o +9. RIZIKÁ (len iPhone): plynulý posun na cieľový komentár '
              'sa môže biť s jednorazovým posunom obrazovky ku komentárom; história pri troch pôvodoch (upozornenia, odkaz, '
              'preklik z reposta). DOPAD NA E2E: `feed-post-detail.spec.ts` (mobilný test r.59-76) a '
              '`notification-click.spec.ts` (3 mobilné testy r.112-141): upraví Codex. ROZHODNUTIA MAJITEĽA (26. 11. 2026, R82; '
              'súhlas s odporúčaním agenta): (1) po zatvorení pri upozornení sa vrátiť na stránku, na ktorej používateľ bol, '
              'ako na počítači, (2) 46 sa nerobí spolu, (3) nepoužitý kód `initialFeedPostId` a `effectiveFeedPostId` v '
              '`DashboardContent.tsx` ostáva do delenia (TECH-01), (4) po F5 sa otvorí Nástenka s obrazovkou. Vzhľad sa nemení '
              '(obrazovka je schválená), R49 sa netýka. Ručne po oprave: päť testov na iPhone (upozornenie na komentár aj '
              'starší než prvá stránka, upozornenia bez komentára bez spodnej lišty, odkaz a F5, zmazaný príspevok, repost). '
              'Odhad: veľký · L.',
         dec=None, src='ručný test majiteľa po K51 (22. 11. 2026) a dve snímky z mobilu'),
]
