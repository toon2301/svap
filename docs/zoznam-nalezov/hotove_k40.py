# -*- coding: utf-8 -*-
"""Nálezy opravené od PR #297 (19. 11. 2026): `DONE_SINCE_K40` (zatiaľ dávka K43: 342 a 351).

Samostatný súbor kvôli limitu 500 riadkov (`hotove_k20.py` má 481 riadkov); `hotove.py` ich pripája do `DONE_SINCE`. Opravený
nález sa odstráni z `NEW_ITEMS` a pridá sa sem: dict(n=…, vetva='K43', pr='#298', zlucene=True, text='HOTOVÉ …').
"""

DONE_SINCE_K40 = [
    dict(n=342, vetva='K43', pr='#298', zlucene=True,
         text='HOTOVÉ (K43, PR #298, zlúčené 19. 11. 2026 o 21:49 UTC, merge `bc4391dc`; pre 342 commit `d240a0c0`, '
              'spolu s 351 päť commitov, 9 súborov, +1 953 a −16 riadkov). MEDZERA (K28): pri chybe 404 z pridania '
              'komentára kód ukázal jednu neutrálnu hlášku „Tento príspevok už nie je dostupný.“ a poslal signál '
              'zmiznutia príspevku, no odpoveď, úprava a zmazanie pri rovnakej chybe ukázali všeobecnú chybu a '
              'signál neposlali, takže karta príspevku ostala v zoznamoch; samotný stav odpovede nestačí (server '
              'vracia 404 aj pre chýbajúci komentár a 403 pri úprave a zmazaní znamená „nemáš právo“). OPRAVA '
              '(rozhodnutie R60, možnosť a): `feedPostGone.ts` (83 → 114 riadkov) má novú '
              '`handleCommentActionErrorIfPostGone` a obsluhy odpovede, úpravy a zmazania v '
              '`useFeedCommentMutations.ts` (226 → 239) ju volajú v `catch`: po chybe 404, 403 alebo 410 sa '
              'príspevok overí jedným dopytom na jeho detail a len keď aj ten zlyhá s 404, 403 alebo 410, ukáže sa '
              'jedna hláška a príspevok zmizne zo zoznamov; inak ostáva doterajšia špecifická chyba; pridanie '
              'komentára sa nemení. Odchýlky od karty: pomocná funkcia je vo `feedPostGone.ts` (jediné miesto '
              'spracovania zmiznutého príspevku); overovací dopyt beží pred `finally`, takže tlačidlá ostávajú '
              'vypnuté, kým výsledok nie je známy; ak sa zoznam zatvorí skôr, hláška a signál prejdú aj tak (sú '
              'globálne) a do stavu odmontovanej inštancie sa nič nezapisuje; 403 sa overuje aj pri odpovedi. '
              'OVERENIE (podľa výsledku): nový súbor `FeedPostComments.postGone.test.tsx` (398 riadkov, 41 testov; '
              'pred opravou padalo 19 z 41), mutácie 23 z 23 zachytených, celý Jest 615 sád a 9 352 testov (spolu s '
              '351), `tsc`, ESLint a preklady čisté, build pri prvom behu `SecurityFatalError` (pozri 341). KONTROLA '
              'AGENTA (19. 11. 2026, z GitHubu a z `main`): CI (`checks`, `backend-postgres`) aj CodeRabbit zelené, '
              '`feedPostGone.ts` a `useFeedCommentMutations.ts` majú na `main` 114 a 239 riadkov, prvý riadok '
              'commitu 62 znakov. RUČNÝ TEST MAJITEĽA (19. 11. 2026): všetko prešlo v poriadku. Dopad na E2E: '
              'žiadny.'),
    dict(n=351, vetva='K43', pr='#298', zlucene=True,
         text='HOTOVÉ (K43, PR #298, zlúčené 19. 11. 2026 o 21:49 UTC, merge `bc4391dc`; commity `c7e971e0` '
              '(komentáre), `df1b75aa` (odpovede) a `c50a66a0` (po pripomienke CodeRabbitu); mapovanie bolo v K41, '
              '`karty/K41_vysledok.md`). MEDZERA: pri výpadku internetu sa po zlyhaní donačítania komentárov (aj '
              'odpovedí) sentinel zapínal znova a dopyt s chybovým toastom sa opakoval v slučke (v Chromiu s atrapou '
              'siete 21 dopytov a toastov za sekundu). OPRAVA (rozhodnutie R61, možnosť a): komentáre: '
              '`useFeedCommentsLoader.ts` (394 → 447 riadkov) má stav `loadMorePaused`, ktorý sa nastaví po zlyhaní '
              '`loadMore`; sentinel komentárov (`FeedPostComments.tsx`) ho berie ako ďalšiu podmienku `enabled`; '
              'odpovede: stav `repliesPaused` a nová vlastnosť `paused` vo `FeedRepliesAutoLoader.tsx` (117 → 124). '
              'Po zlyhaní ostane jeden dopyt a jedna hláška a nový observer sa nevytvára; obnova je samočinná a bez '
              'viditeľnej zmeny: po udalosti `online` (hneď), po úspešnom pollingu a po novom načítaní, dotiahne sa '
              'len keď je koniec zoznamu vo výhľade; polling beží každých 8 s len pri viditeľnej karte a do piatich '
              'minút od poslednej činnosti používateľa (8 s je jeho interval, nie zaručený čas obnovy), takže pri '
              'stojacom pollingu a bez udalosti `online` sa obnova čaká na ďalší polling; tiché hľadanie z '
              'upozornenia (`silent`) ani zastaraný dopyt nepozastavujú nič. Nepribudlo tlačidlo ani text, toast '
              'ostáva bez `id`, '
              '`useInfiniteScrollSentinel` ani `lib/feedApi.ts` sa nemenili. Odchýlky od karty: samostatný príznak '
              'namiesto zhodenia `hasMore` (berie ho aj hľadanie komentára z upozornenia); odpovede majú vlastnosť '
              '`paused`, nie podmienku v `enabled`, aby záložné tlačidlo v prostredí bez `IntersectionObserver` '
              'ostalo použiteľné; obnova pollingom je až za kontrolou zastaranej odpovede; 351 ide v dvoch '
              'commitoch. Prijaté správanie: ak zlyháva len stránka s kurzorom alebo len dávka odpovedí a polling '
              'prechádza, pokus sa opakuje najviac raz za 8 s a hláška sa ukáže znova. OVERENIE (podľa výsledku): '
              'nové súbory `FeedPostComments.loadMorePause.test.tsx` (526 riadkov, 15 testov; pred opravou padalo 13 '
              'z 15, 41 dopytov namiesto 1), `FeedPostComments.repliesPause.test.tsx` (616 riadkov, 15 testov) a '
              '`FeedPostComments.repliesPauseStale.test.tsx` (288 riadkov, 2 testy); zlyhanie prichádza až po '
              '`setTimeout` s atrapou observera so začiatočným oznámením; mutácie komentáre 10 z 11, odpovede 12 z '
              '13 a oprava z kontroly PR 4 zo 4 (prežili dva ekvivalentné zásahy). CodeRabbit: 1 pripomienka (Minor, '
              'platná): zlyhanie starého dopytu odpovedí po zmene príspevku alebo po mutácii mohlo pozastaviť '
              'sentinely nového stavu; opravené v `c50a66a0` (generácia načítania ako pri `loadMore`). Codex: 1 '
              'pripomienka (P1, platná): popisy nových testov boli po anglicky, no AGENTS.md žiada kód po slovensky; '
              'preložené v `b6b999fa` (42 popisov a 3 pomenovania; vlákno ostalo formálne otvorené, no je zastarané; '
              'pravidlo rieši R62, rozhodnuté 20. 11. 2026: veta v `AGENTS.md`). KONTROLA AGENTA (19. 11. 2026, z '
              'GitHubu a z `main`): CI aj CodeRabbit zelené, '
              'vlákno CodeRabbitu zatvorené, počty riadkov na `main` sedia (447, 124 a 401), existujúce testy sa '
              'nemenili, prvé riadky commitov 61 až 69 znakov. NEOVERENÉ: skutočný `IntersectionObserver` na iPhone '
              'alebo v Safari sa pri obnove môže správať inak než atrapa; obnova závisí od pollingu (jeho brzdy sú skrytá karta a '
              'päť minút nečinnosti) a od udalosti '
              '`online`. RUČNÝ TEST MAJITEĽA (19. 11. 2026): všetko prešlo v poriadku. Dopad na E2E: žiadny. '
              'Kandidát z K43: nález 353.'),
    dict(n=341, vetva='K31', pr='#304', zlucene=True,
         text='HOTOVÉ (K31, PR #304, zlúčené 21. 11. 2026 o 07:11 UTC, merge `8c49c5b7`; jeden commit `906f7c32` '
              'nad `main` `1c454330`, 2 súbory, +41 a −41 riadkov; kolega ju urobil podľa karty '
              '`karty/K31.md`, výsledok `karty/K31_vysledok.md`). MEDZERA: nainštalovaný Next.js 16.4.3 bol v '
              'rozsahu upozornenia GHSA-mfr8-8qww-v76h a prvý lokálny build po kompilácii vypisoval '
              '`SecurityFatalError` (štrnásť zo štrnástich hlásených prvých buildov K28 až K43). OPRAVA: `next` '
              '`^16.4.3` → `^16.4.5` vo `frontend/package.json` a zámok upravený príkazom `npm install next@16.4.5` '
              '(10 balíkov: `next`, `@next/env` a osem `@next/swc-*`, všetko 16.4.3 → 16.4.5; nič sa nepridalo ani '
              'neodstránilo); kód aplikácie, `next.config.js`, `eslint-config-next`, `react` ani `overrides` sa '
              'nemenili a nová hlavná verzia ani zmena kódu netreba. Verzia 16.4.5 je najnižšia opravená v rámci '
              '`^16`: karta uvádza jedno upozornenie, `npm audit` ich pre `next` hlási sedem (rozsahy končia na '
              '16.4.4) a 16.4.5 opravuje všetky; verzia `latest` (16.4.6) sa nebrala, lebo karta žiada najnižšiu '
              'opravenú a 16.4.6 navyše mení správanie (kompresia odpovedí route handlerov). OVERENIE (podľa '
              'výsledku): celý Jest 615 sád a 9 352 testov prešlo pred upgradom aj po ňom; `tsc` a '
              '`check:missing-translations` (0 a 0) čisté; ESLint celého `frontend` pred aj po rovnaký (326 chýb a '
              '429 varovaní, existujú už na `main`, CI ESLint nespúšťa); `npm audit --omit=dev`: pre `next` sedem '
              'upozornení pred a žiadne po; `npm run build` dvakrát z čistého `.next`: pred upgradom prvý beh '
              '`SecurityFatalError` (kód 1), druhý kódom 0, po upgrade oba behy kódom 0 a bez toho výpisu; zoznam '
              'ciest pred a po rovnaký (48 riadkov); produkčný beh v Chromiu bez backendu (`/`, `/login`, `/about`, '
              '`/faq` a `/contact` v sk aj en, 10 načítaní) pred aj po rovnaký, rozdiel 0. Riziko nízke: 16.4.4 '
              '(zmeny Turbopacku, `fast-jwt` namiesto `jsonwebtoken` vo vnútri Next.js) a 16.4.5 (len bezpečnostné '
              'opravy), produkčný build beží cez webpack; aplikácia nepoužíva `use cache`, `unstable_cache`, Cache '
              'Components, PPR, Edge runtime, middleware, route handlery ani `draftMode`. Odchýlky od karty: karta '
              'hovorí o jednom upozornení, ide o sedem; veľkosti ciest sa neporovnávali (výpis buildu Next.js 16 ich '
              'neuvádza), porovnal sa zoznam ciest; `eslint-config-next` ostáva 16.4.3 (nemá peer závislosť na '
              '`next`); ESLint sa spustil nad celým `frontend`, lebo sa žiadny súbor nezmenil. KONTROLA AGENTA (20. '
              '11. 2026, z gitu a z npm): vetva má jediný commit nad `1c454330`, mení len `frontend/package.json` '
              '(jeden riadok) a `frontend/package-lock.json` (80 riadkov: 10 balíkov, všetky odkazy `resolved` z '
              '`registry.npmjs.org`, verzia 16.4.5, kontrolný súčet sha512, žiadna iná zmena); oproti `main` '
              '`f0c4b789` bez konfliktu; vlastný `npm audit --omit=dev` nad zámkom: `main` 6 záznamov (z toho `next` '
              'so siedmimi upozorneniami), vetva K31 5 záznamov bez `next` (`@sentry/bundler-plugins`, '
              '`@sentry/nextjs`, `@sentry/webpack-plugin`, `glob` a `minimatch`, nález 229). KONTROLA PR (21. 11. 2026, z GitHubu): CI '
              '(`checks`, `backend-postgres`) zelené, CodeRabbit (spustený ručne majiteľom) bez pripomienok, Codex bez '
              'väčších problémov, vlákna nie sú; PR zlúčil majiteľ. ČAKÁ (od majiteľa nepotvrdené): kontrola logu '
              'nasadenia na Railway (build už nemá končiť výpisom o zraniteľnej verzii), ručný dymový test majiteľa '
              '(`sablony/dymovy_test.md` aj bod 8) a dym `@smoke` od Codexu. '
              'Dopad na E2E: DOM ani `data-testid` sa nemenia, framework sa mení pre celú aplikáciu. Kandidát z K31: '
              'nález 354.'),
]

# Zlúčené PR, v ktorých nie je hotový celý nález (len časť otvoreného nálezu alebo nález nemá číslo); `hotove.py` ich pripája do
# `DONE_PR_TABLE_CASTOCNE`.
DONE_PR_TABLE_CASTOCNE_K40 = [
    ('#297', 'K42', '333 (dávka 5 z 5 delenia `FeedPostComments.tsx`: mutácie do `useFeedCommentMutations.ts`, typ vlastností do '
     '`FeedPostComments.types.ts` a zmazanie dočasného odtlačku HTML; ostáva `FeedPostCard.tsx` a `FeedPostMobileDetail.tsx`)'),
    ('#300', 'e2e/notifikacie-prekliky', 'bez nálezu (Codex, len dokumentácia): živé overenie šiestich preklikov upozornení '
     'z 18. 11. (lajk a odpoveď na komentár v troch projektoch) z 19. 11. 2026 na `main` `bc4391dc`: 6 prešlo, 0 zlyhalo, 0 '
     'preskočených'),
    ('#301', 'e2e/komentare-345-346', '345 a 346 (časť: E2E regresie od Codexu: preklik mena autora komentára z okna otvoreného '
     'z upozornenia na desktope a celý nový komentár na iPhone 15 s fotopríspevkom; lokálne overené, živý beh zatiaľ nebehol)'),
    ('#302', 'K45', 'bez nálezu (príprava redizajnu komentárov: päť nových súborov testov so 34 testami pre medzery z K38 až '
     'K42; mapovanie 344 je zapísané v náleze 344)'),
    ('#306', 'K48', '333 (dávka 0 delenia `FeedPostCard.tsx`, len testy: deväť súborov testov správania (60 testov), dočasný '
     'odtlačok HTML (44 stavov) a dočasná sonda poradia efektov (24 stavov); produkčný kód sa nemenil; ostáva delenie karty a '
     'mobilného detailu)'),
    ('#307', 'K49', '333 (dávka 0m delenia `FeedPostMobileDetail.tsx`, len testy: šesť súborov testov správania (42 testov) a '
     'dočasný odtlačok HTML (5 stavov); produkčný kód sa nemenil)'),
]
