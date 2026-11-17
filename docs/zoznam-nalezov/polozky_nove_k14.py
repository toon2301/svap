# -*- coding: utf-8 -*-
"""Nové nálezy od čísla 305: kandidáti kolegu z K13 a K14, ručné testy majiteľa po K14 (8. 11. 2026) a diagnostika a video majiteľa
z 9. 11. 2026 (322 až 324) a ručné testy majiteľa po K17 s mapovaním agenta z 11. 11. 2026 (325 až 327; 325, 326 a 327 sú hotové v K18 a K21) a report Codexa po K19 (328) a ručné testy majiteľa po K20 s mapovaním agenta z 13. 11. 2026 (330 a 331; hotové 329, 330, 331 a 332 sú v `hotove_k20.py`), pravidlo majiteľa pri R2 (332), rozhodnutie R23 (333) a ručné testy majiteľa po K21 s kandidátmi kolegu (334 a 335; obe hotové v K22) a kandidát kolegu z K15 a K22 (336); hotové 328, 334 a 335 sú v `hotove_k20.py`.

Samostatný súbor kvôli limitu 500 riadkov; `polozky_nove.py` ich pripája do `NEW_ITEMS`. Pravidlá sú rovnaké ako inde: otvorený nález sa
po oprave odstráni odtiaľto a zapíše do `hotove_k20.DONE_SINCE_K20`; čísla sa nikdy nepoužívajú znova. Kandidát B kolegu (osem
`alert()` v súboroch nad 500 riadkov) je v nálezu 302, kandidát L (`require()` v `csrf.test.ts`) v nálezu 206 a kandidát N (kategórie
upozornení nie sú napojené na server) je spolu s nálezom majiteľa v 321.
"""

from konstanty import A, EL, EM, ES, H, N, P, S_, V  # noqa: F401

NEW_ITEMS_K14 = [
    dict(n=305, bucket=A, imp=N, eff=ES, pkg='Mazanie ponuky',
         kratko='hromadné mazanie mimo `anonymize_user` (administrácia, `delete_all_users`, kaskáda `User.delete()`) obchádza zámky z '
                '246, 232 a 296',
         what='Kolega pri K13 (8. 11. 2026): zámky z nálezov 246, 232 a 296 platia pre `delete()` modelov a pre `anonymize_user`, no '
               'hromadné `QuerySet.delete()` ich obchádza aj inde: akcia „Delete selected“ v Django administrácii (vstavaná akcia maže '
               'cez `queryset.delete()`), príkaz `delete_all_users` (`accounts/management/commands/delete_all_users.py`) a kaskáda pri '
               '`User.delete()`. Ak sa počas takého mazania potvrdí zdieľanie obsahu mazaného používateľa, vzniká ten istý súbeh ako v '
               '246 (HTTP 500 pri COMMIT). Agent overil, že príkaz `delete_all_users` existuje; správanie administrácie vyplýva z '
               'Djanga a neskúšalo sa.',
         note='Návrh kolegu: v administrácii mazať po jednom cez `delete_queryset` (a obdobne v príkaze). Ide o zriedkavé, ručné '
               'operácie majiteľa, preto skupina po nasadení. Odhad kolegu: nízky · S.',
         dec=None, src='K13 (kolega)'),
    dict(n=307, bucket=A, imp=N, eff=EM, pkg='Nástroje a testy',
         kratko='doslovné testovacie heslo `StrongPass123` v 94 súboroch (206 výskytov)',
         what='Kolega pri K14 (8. 11. 2026): doslovné testovacie heslo `StrongPass123` je v starých testoch backendu aj frontendu v '
               '206 výskytoch v 94 súboroch (agent 8. 11. 2026 spočítal rovnako). Je to testovací údaj, no `AGENTS.md` hovorí o '
               'heslách v kóde a nástroje na hľadanie tajomstiev ho môžu hlásiť.',
         note='Návrh kolegu: nahradiť heslom generovaným v teste alebo spoločnou konštantou. Veľký mechanický zásah bez zmeny '
               'správania, preto po nasadení. Odhad kolegu: nízky · M.',
         dec=None, src='K14 (kolega)'),
    dict(n=313, bucket=A, imp=N, eff=ES, pkg='Upratovanie a architektúra',
         kratko='`.animate-fade-in` je v `globals.css` definovaná dvakrát',
         what='Kolega pri K14 (8. 11. 2026): trieda `.animate-fade-in` je v `frontend/src/app/globals.css` definovaná dvakrát (riadky '
               '111 a 381; posledná posúva obsah o 20 px a trvá 0,6 s) a ďalší výskyt je v bloku `prefers-reduced-motion`. K14 preto '
               'zaviedla vlastnú animáciu `content-in`. Agent výskyty overil.',
         note='Návrh: zjednotiť definície (platí tá, ktorá je v súbore neskôr) a po zmene skontrolovať miesta, kde sa trieda používa. '
               'Odhad kolegu: nízky · S.',
         dec=None, src='K14 (kolega)'),
    dict(n=314, bucket=A, imp=N, eff=EM, pkg='Nástroje a testy',
         kratko='Jest hlási „A worker process has failed to exit gracefully“, aj na čistom `main`',
         what='Kolega pri K14 (8. 11. 2026): celý Jest vypíše „A worker process has failed to exit gracefully“ aj na čistom `main`; '
               'niektorý test po sebe nechá otvorený časovač alebo spojenie. Agent to nereprodukoval.',
         note='Návrh kolegu: nájsť test cez `--detectOpenHandles`. Odhad kolegu: nízky · M.',
         dec=None, src='K14 (kolega)'),
    dict(n=315, bucket=A, imp=N, eff=ES, pkg='Upratovanie a architektúra',
         kratko='mŕtve alebo zavádzajúce konfigurácie: `railway.json`, `backend/nixpacks.toml`, `Procfile`, `backend/Procfile`, '
                '`Dockerfile.backup`',
         what='Kolega pri K14 (8. 11. 2026): Railway podľa neho nečíta `railway.json` (pole `services` nie je schéma Railway) a '
               'backend stavia z `backend/Dockerfile`; `backend/nixpacks.toml`, `Procfile` v koreni, `backend/Procfile` a '
               '`Dockerfile.backup` v koreni sú podľa neho mŕtve alebo zavádzajú. Agent overil, že súbory existujú a že `railway.json` '
               'má len kľúče `$schema` a `services`; či ich Railway číta, z repozitára nevidno. Príloha C (hosting) pritom uvádza '
               '`railway.json` ako súčasť skutočného predpisu nasadenia a `Dockerfile.backup` je už v zozname cudzích súborov (nález '
               '32).',
         note='Treba potvrdenie majiteľa v nastaveniach Railway: majú backend-http, backend-ws, worker a beat Root Directory '
               '`backend` a builder Dockerfile? Až potom súbory odstrániť a opraviť prílohu C. Odhad kolegu: nízky · S.',
         dec=None, src='K14 (kolega)'),
    dict(n=316, bucket=A, imp=N, eff=ES, pkg='Nástroje a testy',
         kratko='`next dev` generuje nesledovaný `frontend/AGENTS.md`; hrozí náhodný commit',
         what='Kolega pri K14 (8. 11. 2026): `next dev` (Next 16) vygeneruje nesledovaný `frontend/AGENTS.md` (nastavenie '
               '`agentRules`). Hrozí jeho náhodný commit a zásah do pravidiel agentov, lebo agenti čítajú `AGENTS.md` aj v '
               'podpriečinkoch. Agent v čistom klone súbor nenašiel (vzniká až za behu) a nastavenie `agentRules` v Next neoveril.',
         note='Návrh kolegu: `agentRules: false` v `next.config.js` alebo záznam v `.gitignore`. Odhad kolegu: nízky · S.',
         dec=None, src='K14 (kolega)'),
    dict(n=317, bucket=A, imp=N, eff=EM, pkg='Nástroje a testy',
         kratko='zámok závislostí backendu je bez hashov',
         what='Kolega pri K14 (8. 11. 2026): `backend/constraints.txt` pripína verzie, no bez hashov súborov, takže neochráni pred '
               'podvrhnutým balíkom s rovnakou verziou.',
         note='Návrh kolegu: `pip-compile --generate-hashes` a `--require-hashes` ako dodatočné spevnenie; vyžaduje zmenu postupu '
               'obnovy a všetkých inštalácií. Odhad kolegu: nízky · M.',
         dec=None, src='K14 (kolega)'),
    dict(n=319, bucket=P, imp=N, eff=EM, pkg='Upozornenia a push',
         kratko='Upozornenia: pri vypnutom internete sa prepínač Správ prepne bez chybovej hlášky a stav ostane po pripojení (príčina '
                'nejasná); oprava je v kóde (K20), čaká na ručný test na iPhone)',
         what='Ručný test majiteľa po K14 (8. 11. 2026, iPhone, Nastavenia → Upozornenia): pri vypnutej Wi-Fi aj mobilných dátach (aj '
               'v režime lietadlo) sa dá meniť nastavenie upozornení na správy a prepínač reaguje bez chybovej hlášky; po opätovnom '
               'pripojení a obnovení stránky ostane zmenený stav. Očakávané: pri nemožnosti uložiť sa ukáže chyba „Nepodarilo sa '
               'uložiť nastavenia upozornení.“ Nie je potvrdené, či sa zmena naozaj uložila na server, alebo ide o problém zobrazenia.',
         note='Mapovanie agenta (8. 11. 2026, len čítanie): voľba Správy (push) je napojená na server. '
               '`useNotificationPreferences.ts` pri uložení najprv zmení hodnotu v rozhraní, pošle `PATCH` a pri zlyhaní hodnotu vráti '
               'a chybu ukáže `PushMessagesStatus` (`role=alert`); service worker posiela `/api/` priamo do siete bez náhradnej '
               'odpovede, takže pri skutočnom offline by sa chyba mala ukázať. Pozorovanie sa preto z kódu nedá vysvetliť. Možnosti: '
               '(1) otestovaný bol jeden z piatich ostatných prepínačov alebo hlavný vypínač, ktoré sú len lokálny stav bez volania '
               'servera (nález 321) a po „obnovení“ ostali v otvorenej aplikácii; (2) požiadavka na iPhone nezlyhala hneď, ale čakala '
               'na obnovenie spojenia a potom prešla (hypotéza). Pri overení treba vedieť, ktorý prepínač a či sa hodnota zmenila aj '
               'po úplnom zatvorení a novom otvorení PWA. Ďalšie zistenie: texty chýb v `useNotificationPreferences.ts` a '
               '`usePushMessagesPreference.ts` sú napevno v kóde bez diakritiky a bez prekladu („Nepodarilo sa ulozit nastavenia '
               'upozorneni.“ a ďalšie), takže aj správne zobrazená chyba by mala iné znenie, než majiteľ očakáva, a nepreložila by sa. '
               'Návrh: texty cez `t()` s diakritikou v šiestich jazykoch; pri `navigator.onLine` rovnom `false` prepínač neprepínať a '
               'hneď ukázať chybu; súvisí s nálezom 306. Odhad: nízky · M. Otázka, ktorý prepínač sa testoval, ostáva, '
               'kým 321 neprepojí aj ostatné kategórie. STAV 12. 11. 2026: server je pripravený (K19) a oprava ide v K20 spolu s etapou 3 '
               'nálezu 321, lebo oba menia tie isté súbory; po K20 majú všetkých sedem volieb rovnaké ukladanie, vrátenie hodnoty a '
               'chybu, takže otázka, ktorý prepínač sa testoval, stratí význam. Mapovanie z K16 od kolegu nedošlo, K20 ho urobí ako '
               'krok 0. Ak sa prejav (zmena offline bez chyby) ukáže aj po K20, ide o nový nález. '
               'STAV 13. 11. 2026: KÓD JE HOTOVÝ V K20 (PR #258, zlúčené 12. 11. 2026, commit `8525ce0e`): pre všetkých sedem volieb '
               'vrátane Správ platí, že pri `navigator.onLine === false` sa nič neodošle, hodnota sa nezmení a hneď sa ukáže preložený '
               'toast s chybou; pri zlyhaní `PATCH` sa vráti len zmenená hodnota a ukáže sa preložená chyba; texty sú cez `t()` s '
               'diakritikou vo všetkých šiestich jazykoch (`preferencesLoadFailed`, `preferencesSaveFailed`, `preferencesOffline` a '
               'osem kľúčov `push*`); zapnutie Správ bez internetu sa zastaví hneď, ešte pred vyžiadaním povolenia a registráciou '
               'odberu. Časový limit pre visiacu požiadavku sa nezaviedol (karta ho zakazovala, `lib/api.ts` sa nemenil), takže pri '
               '`navigator.onLine === true` môže požiadavka visieť do globálnych 30 s a zmena sa vtedy ukáže až po jej skončení. '
               'Strana k mapovaniu (krok 0) sa k agentovi nedostala, preto príčina pôvodného pozorovania ostáva nezdokumentovaná. '
               'Overenie podľa kolegu: 37 testov hooku (pred zmenou padalo 23 z vtedajších 35) a 3 testy offline pre Správy; mutácia '
               '„odstrániť kontrolu `navigator.onLine`“ je zachytená. ZOSTÁVA: ručný test (c) z karty K20 (režim lietadlo na iPhone: '
               'prepínač sa neprepne a ukáže sa preložená chyba, po pripojení a obnovení ostane pôvodná hodnota), ktorý majiteľ zatiaľ '
               'nepotvrdil; nález sa zatvorí po jeho potvrdení. Dopad na E2E: žiadny.',
         dec=None, src='ručný test majiteľa po K14 a mapovanie agenta (8. 11. 2026)'),
    dict(n=333, bucket=P, imp=N, eff=EL, pkg='Vzhľad Nástenky',
         kratko='Nástenka: rozdeliť veľké súbory (`FeedPostComments.tsx`, `FeedPostCard.tsx`, `FeedPostMobileDetail.tsx`) bez zmeny '
               'vzhľadu, až potom redizajn (R23); `FeedPostComments.tsx`: mapovanie (K26) a dávka 1 z 5 (K28) hotové, ďalšia je K29',
         what='Rozhodnutie R23 (13. 11. 2026): pred redizajnom Nástenky (nález 261) sa tri súbory nad 500 riadkov rozdelia po jednom: '
               '`feed/FeedPostComments.tsx` 1 487 riadkov (prvý), `feed/FeedPostCard.tsx` 1 033 a `feed/FeedPostMobileDetail.tsx` 594 '
               '(počty agent overil 13. 11. 2026). Delenie nesmie zmeniť správanie ani vzhľad; každý súbor ide vo vlastnej vetve s '
               'vlastnou kartou dávky a s ručným testom majiteľa (komentáre, odpovede, lajky komentárov, tagy, fotky v príspevku, '
               'mobilný detail) a až potom sa redizajn (261) robí nad menšími súbormi. Výnimka z pravidla 500 riadkov sa neudeľuje: '
               'povolenie platí len pre delenie týchto troch súborov.',
         note='Majiteľ vzhľad Nástenky zatiaľ sám neupravuje (13. 11. 2026), takže delenie môže ísť hneď; ak začne upravovať, dá '
               'vedieť. Súvisí s 261 (redizajn), 288 (vlastná vstupná animácia v `FeedPostCard.tsx` sa upraví samostatne až po dokončení a overení delenia, R28 a R23), 259 a '
               '256. Postup pre každú kartu: najprv mapovanie hraníc (čo je komentár, odpoveď, zoznam, formulár, hooky; kód sa '
               'nemení), potom presun po jednom celku do nových súborov so zachovaním verejného rozhrania, po každom kroku celý Jest a '
               'existujúce testy komentárov; E2E sa po delení spustí (Codex). Odhad: stredný · L (tri samostatné dávky). '
               'VÝSLEDOK MAPOVANIA K26 (kolega, 16. 11. 2026, kód sa nemenil; čítané z `main` `910700ea`; celé znenie je v '
               '`karty/K26_vysledok.md` a `karty/K26_podklady.md`): čísla z karty sedia (20 `useState`, 17 `useRef`, 7 efektov, 5 '
               'importérov; `onCommentsReady` volá len `FeedPostMobileDetail.tsx` a žiadny test ho nemenuje). Pokrytie celým Jestom '
               'je 97,9 % riadkov a 85,7 % vetiev; z 39 skúšobných pokazení kódu existujúce testy zachytili 13 a 26 prežilo. Opravy '
               'predbežného rozboru agenta: hľadanie cieľa, strop 20 stránok a zvýraznenie na 3 s strážia 21 testov, skutočné medzery '
               'sú inde (zastarané odpovede po zmene, chyby pridania, odpovede a zmazania, reset hľadania pri zmene cieľa, signál '
               '`onCommentsReady`); chýbal krok „posun a indikátor nových“; hooky samy nestačia (ostane asi 700 riadkov), preto sa '
               'riadok komentára, pole na komentár a indikátor vyčleňujú skôr. PLÁN (9 krokov, každý vlastný commit a po ňom celý '
               'Jest, `tsc`, ESLint, kontroly prekladov a build): 0 charakterizačné testy (len nové súbory); 1 konštanty a čisté '
               'funkcie (`feedCommentsLogic.ts`, asi 175 riadkov; hlavný súbor potom 1 335); 2 riadok komentára (`FeedCommentItem.tsx`, '
               'asi 170; 1 215); 3 pole na komentár, indikátor a kostra (3 súbory, asi 190; 1 110); 4 hľadanie cieľa '
               '(`useFeedCommentsSeek.ts`, asi 255; 905; riziko stredné); 5 posun a indikátor nových (`useFeedCommentsScroll.ts`, asi '
               '85; 865; stredné); 6 načítanie a polling (`useFeedCommentsLoader.ts`, asi 340; 600; vysoké); 7 mutácie '
               '(`useFeedCommentMutations.ts`, asi 200; 470; stredné až vysoké); 8 typ vlastností a importy (asi 60; 420). Veľkosti '
               'sú odhad (±40 riadkov), názvy súborov návrh. V komponente ostáva signál `onCommentsReady`, efekt posunu navrch a '
               'odvodené hodnoty; poradie efektov sa nemení. ROZHODNUTIA MAJITEĽA (16. 11. 2026, podľa odporúčaní agenta): R45 '
               'odtlačok HTML šiestich stavov len dočasne (vznikne v kroku 0, zmaže sa v poslednej dávke); R46 päť dávok (0 | 1–3 | '
               '4 | 5–6 | 7–8) s jedným ručným testom po každej okrem dávky 0; R47 redizajn 261 až po poslednej dávke; R48 oprava 338 '
               'po kroku 6 v novom súbore; R49 trvalé pravidlo: vzhľad sa najprv konzultuje s majiteľom. Dávka 1 je K28 '
               '(`karty/K28.md`); ďalšie dávky sa pripravia po zlúčení predchádzajúcej. RUČNE po každej dávke okrem dávky 0: okno '
               'detailu na počítači (pridať, odpovedať, upraviť, zmazať s potvrdením, lajknúť, rozbaliť odpovede); z upozornenia '
               '(okno aj adresa `?comment=`): doskroluje a zvýrazní komentár asi 3 s, odpoveď v zbalenom vlákne sa rozbalí; mobilný '
               'detail na iPhone (pri fotke alebo zdieľanom náhľade a aspoň 3 komentároch sa otvorí rovno pri komentároch); panel '
               'nad fotkou na mobile; živé komentáre z druhého účtu (polling 8 s). E2E: komentárov sa dotýkajú len '
               '`feed-post-detail.spec.ts` a `notification-click.spec.ts`; návrh pre Codexa: pridať a zmazať vlastný komentár (okno '
               'aj mobilný detail), odpoveď a úprava s upratovaním, po kliku na upozornenie cieľový komentár v zornom poli; E2E '
               'nepokryje stránkovanie, polling, 3 s zvýraznenie ani iPhone. Súvislosti: 261 (skupiny 6 a 7) sa dotýka riadku '
               'komentára a poľa na komentár; 288 je vo `FeedPostCard.tsx` (po jeho delení, R28); 259 a 256 sú na delení nezávislé; '
               'z mapovania vznikol nález 338. DÁVKA 1 Z 5 HOTOVÁ (K28, PR #278, zlúčené 17. 11. 2026 o 06:33 UTC, merge `4c342f72`; '
               'päť commitov `eb86d9a5`, `33a81b9b`, `ffcfad33`, `e8991819` a `b737a0f9`): len testy, produkčný kód nezmenený '
               '(rovnaký kontrolný súčet, 1 487 riadkov); päť nových súborov testov (39 nových testov: `staleResponses` 12, '
               '`mutationErrors` 8, `seekReset` 5, `commentsReady` 4 a odtlačok HTML 10 stavov) a DOČASNÝ súbor `.snap` (3 499 '
               'riadkov), ktorý zmaže dávka 5 z 5 a ktorý sa počas delenia neupravuje ani neprepisuje. Celý Jest 608 sád a 9 133 '
               'testov prešlo; všetkých 17 mutácií z karty zachytených (v K26 ich neodhalil žiadny existujúci test) a navyše A1, '
               'A9 a D1. Kontrola agenta z GitHubu: CI, CodeRabbit aj Codex review bez pripomienok a vlákna nie sú. Odchýlky od '
               'karty: odtlačok má desať stavov namiesto šiestich; pri zmiznutom príspevku kód ukáže jednu neutrálnu hlášku (karta '
               'písala „bez toastu“) a test overuje to; chyby `markSeen` vlastného komentára a odpovede (D7 a D8) chytá len test, '
               'ktorý vyrobí okno pred prekreslením, preto sa pri delení zápis `markSeen` v obslužných funkciách musí ponechať; '
               'strop 20 stránok sa z komponentu neexportuje, takže ho test nezafixúva presne (mutácia K1 je mimo dávky); '
               'zvýraznenie sa pozná podľa triedy `bg-purple-100/80` vo viacerých testoch, ktoré sa pri redizajne 261 upravia '
               'spolu. Kandidáti kolegu sú nálezy 341 a 342. Ďalšia dávka je 2 z 5 (kroky 1 až 3; K29 s ručným testom majiteľa).',
         dec='ROZHODNUTIE R23', src='rozhodnutie majiteľa R23 (13. 11. 2026) a výsledok K26 (kolega, 16. 11. 2026)'),
    dict(n=337, bucket=A, imp=N, eff=EM, pkg='Nástroje a testy',
         kratko='E2E: UI scenár zmeny kategórie upozornení s vrátením pôvodnej hodnoty (zvyšok etapy 4 nálezu 321); scenár '
                'zlúčený (PR #276), živý beh čaká na okno majiteľa',
         what='Zvyšok etapy 4 nálezu 321 (Codex): API kontrakt siedmich volieb a kontrola atribútu `lang` sú zlúčené (PR '
               '#267) a overené naživo, no samotná zmena kategórie cez rozhranie (klik alebo ťuk, uloženie na server, '
               'obnovenie stránky a návrat hodnoty) nemá E2E scenár. MAPOVANIE CODEXA (16. 11. 2026, '
               '`docs/playwright-odovzdanie.md`, bez implementácie a bez živého zápisu): bežný setup, stránka '
               '`/dashboard/settings/notifications` a pôvodných sedem hodnôt len v pamäti; predpoklad, že hlavný vypínač '
               '(`in_app_notifications`) je zapnutý, inak sú kategórie zakázané a ukazujú vypnutý stav bez ohľadu na '
               'uloženú hodnotu; viditeľný obal `notifications-category-likes-desktop` alebo '
               '`notifications-category-likes-mobile` (obe rozloženia sú v DOM); voľby sú tlačidlá bez `aria-checked`, '
               'označenie sa overí SVG fajkou v konkrétnom tlačidle; cez rozhranie sa zmení iba `notify_likes` (v mobilnom '
               'WebKite skutočný `tap`), zachytí sa jediný PATCH s jediným kľúčom a stavom 200 a potvrdí sa GET; po F5 je '
               'zmenená len zvolená kategória; v `finally` sa obnoví všetkých sedem hodnôt a záverečný GET to potvrdí '
               '(chyba obnovy je hlasný pád); workers 1, retries 0, maxFailures 1 a WebKit desktop aj mobil povinný. '
               'Existujúci fixture robí prvý PATCH priamo, takže treba nový malý fixture, ktorý dovolí skutočnú akciu v '
               'rozhraní. VÝZVA NA PUSH (K23): Codex zmeral schopnosti prehliadačov (WebKit desktop má push API a '
               'povolenie `default`, WebKit mobil, teda iPhone 15, nemá `Notification` ani `PushManager` a Chromium má API '
               's povolením `denied`), takže výzvu typu `enable` by v E2E videl len desktopový WebKit; scenár „Nie teraz“ '
               'by bol možný len pri už zapnutých Správach a bez kliknutia na „Povoliť“ (zápis '
               '`svaplyPushPromptDismissedV1` do úložiska prehliadača sa vráti).',
         note='Rozhodnutie R44 (majiteľ, 16. 11. 2026, podľa odporúčania agenta): UI scenár kategórií robiť (je to posledná '
               'položka plánu etapy 4; zápis je malý, návrat sa overuje a WebKit ostáva povinný), E2E pre výzvu na push '
               'nerobiť (pokrývajú ju desiatky jednotkových testov hooku, komponentu a celého modulu, ručný test na iPhone '
               'prešiel a v E2E by ju videl len jeden z troch projektov). Implementuje Codex; pred implementáciou '
               'skontroluje, že testovací účet má zapnuté upozornenia v aplikácii (inak scenár nahlási majiteľovi a hlavný '
               'vypínač potichu nezapína) a živé okno proti Railway oznámi majiteľ samostatne. IMPLEMENTÁCIA (Codex, PR #276, zlúčené 16. '
               '11. 2026 o 21:39 UTC, merge `da27a931`; commity `9ccc972d` a `93b1210e`): samostatná konfigurácia '
               '`notification-category.playwright.config.ts` a scenár `notification-category.ui.ts` (2 varianty, WebKit desktop '
               'aj mobil; mimo bežného celého behu a dymu), nové pomocné súbory v `frontend/e2e/support/` a '
               '`frontend/e2e/diagnostics-tests/`; majiteľ potvrdil, že hlavný E2E účet má upozornenia v aplikácii zapnuté. '
               'Lokálne overené bez Railway (45/45 kontrol logiky, 18/18 prehliadačových kontrol v oboch WebKitoch, 0 SKIP, bez '
               'retry); CodeRabbit mal jednu platnú pripomienku (odpoveď 3xx nesmie potvrdiť bezpečný návrat), opravenú v '
               '`93b1210e`. ŽIVÝ BEH ešte nebol: čaká na nové okno potvrdené majiteľom (návrh z 20:00 uplynul; počas okna sa '
               'nezlučuje ani nenasadzuje). Nález sa uzavrie, keď scenár prejde naživo vo WebKite desktop aj mobil. Odhad: '
               'stredný · M. Dopad na aplikáciu: žiadny.',
         dec='ROZHODNUTIE R44', src='report Codexa z 16. 11. 2026 (mapovanie UI kategórií a schopností prehliadačov) a rozhodnutia majiteľa R43 a R44'),
    dict(n=338, bucket=P, imp=N, eff=ES, pkg='Vzhľad Nástenky',
         kratko='komentáre: zoznam ostane na „Načítavam…“, keď sa počas prvého načítania úspešne pridá komentár; oprava až po '
                'kroku 6 delenia (R48)',
         what='Kolega pri mapovaní K26 (16. 11. 2026; agent overil čítaním kódu): v `FeedPostComments.tsx` `load()` (riadky 446 až '
               '481) zahodí zastaranú odpoveď cez `return` v `try` aj v `catch` (riadky 456 a 470) a `finally` zhasne načítavanie '
               'len pri zhode poradia (riadok 479); `handleSubmit` (riadok 949) po úspešnom pridaní komentára zvýši `loadSeqRef`. '
               'Pole na komentár je dostupné aj počas načítavania, takže ak sa komentár pridá skôr, než dobehne prvé načítanie, '
               'odpoveď načítania sa zahodí a `loading` ostane `true`: zoznam, chyba aj polling sa neukážu a signál '
               '`onCommentsReady` nepadne, kým sa komentáre neotvoria znova. Dôkaz: sonda kolegu v kópii mimo repozitára '
               '(úspešné aj zlyhané načítanie po pridaní komentára): po 300 ms „Načítavam…“ ostáva a zoznam sa dopytoval '
               '1×; kontrola bez pridania prejde; riadky 456 a 470 nevykoná žiadny test. Dopad: pri pomalej sieti sa komentár '
               'uloží, no zoznam sa neukáže do znovuotvorenia; pravdepodobnosť nízka.',
         note='ROZHODNUTÉ (R48, majiteľ 16. 11. 2026, podľa odporúčania agenta): opraviť až po kroku 6 delenia `FeedPostComments.tsx` '
               '(333), v novom súbore `useFeedCommentsLoader.ts`, ako samostatný commit s testom; výnimka z pravidla 500 riadkov '
               'netreba (oprava priamo v súbore s 1 487 riadkami by ju chcela a miešala by sa so správaním pri delení). Odhad: '
               'nízky · S.',
         dec='ROZHODNUTIE R48', src='K26 (kolega) a kontrola agenta čítaním kódu (16. 11. 2026)'),
    dict(n=339, bucket=P, imp=S_, eff=ES, pkg='Súkromie a krajina',
         kratko='ponuka neaktívneho vlastníka: detail aj lajk prejdú cez priame id (vyhľadávanie ju vynecháva)',
         what='Kolega pri K27 (16. 11. 2026, sonda mimo repozitára: vlastník s `is_active=False`, prihlásený divák): '
               '`GET skills/<id>/` vráti 200 a `POST skills/<id>/like/` vráti 201 a lajk sa uloží, kým vo vyhľadávaní ponuka nie '
               'je. Príčina: `offer_hidden_from_user` (`accounts/services/offer_visibility.py`) nekontroluje `is_active` vlastníka, '
               'rovnako ako ho nekontrolujú `skills_detail_view` (`accounts/views/skills.py`) ani `offer_like_view` '
               '(`accounts/views/offer_likes.py`); vyhľadávanie ho vynecháva cez `searchable_user_q`. Pri zmazaní účtu '
               'používateľom sa ponuky mažú (`accounts/account_deletion.py`), takže sa to týka účtov deaktivovaných inak (napríklad '
               'administráciou). Nový pohľad zoznamu lajkujúcich ponuky (K27) aktívneho vlastníka kontroluje. Dopad: obsah ponuky '
               'deaktivovaného účtu je cez priame id dostupný každému prihlásenému a dá sa naň dávať lajky.',
         note='Návrh (neoverený): jedna podmienka v `offer_hidden_from_user` (neaktívny vlastník = skrytá ponuka pre cudzieho '
               'diváka; vlastník ju vidí vždy) a testy detailu, lajku a zoznamu; po zmene skontrolovať ostatných volajúcich '
               'pomocníka (napríklad `review_hidden_from_user`). Malá backendová dávka bez ručného testu. Odhad: nízky · S.',
         dec=None, src='K27 (kolega, 16. 11. 2026)'),
    dict(n=340, bucket=A, imp=N, eff=ES, pkg='Nástroje a testy',
         kratko='E2E: poistka proti `--repeat-each` v staršom API scenári volieb nefunguje v Playwrighte 1.63; oprava schválená (R50)',
         what='Codex pri PR #276 (16. 11. 2026, `docs/playwright-odovzdanie.md`): v Playwrighte 1.63 sa voľba `--repeat-each=2` '
               'nepremietne do `testInfo.project.repeatEach`, ako predpokladá starší `frontend/e2e/support/notification-preferences-test.ts`, '
               'takže poistka proti opakovaniu API scenára volieb nezaberie: bez siete a účtov sa syntetický scenár pri tejto voľbe '
               'vykonal 2×, štyri simulované PATCH, oba návraty overené. Predpísaný príkaz bez opakovania medzeru nevyvolá; ide o '
               'poistku proti nesprávnemu ručnému spusteniu (stredné prevádzkové riziko E2E), nie o chybu aplikácie. Nový UI scenár '
               '(337) opakovanie odmieta už v rodičovskej konfigurácii pred prípravou, overené negatívnym behom.',
         note='Rozhodnutie R50 (majiteľ, 17. 11. 2026, podľa odporúčania agenta): áno, Codex ju opraví ako malú samostatnú vetvu (len '
               '`frontend/e2e/**`, bez zásahu do aplikácie); dovtedy API scenár volieb nespúšťať s `--repeat-each`. Odhad: nízky · S.',
         dec='ROZHODNUTIE R50', src='report Codexa z 16. 11. 2026 (PR #276)'),
    dict(n=341, bucket=P, imp=S_, eff=ES, pkg='Bezpečnosť a produkčná odolnosť',
         kratko='Next.js 16.4.3 je v rozsahu bezpečnostného upozornenia GHSA-mfr8-8qww-v76h (stredná závažnosť); lokálny build '
                'raz skončil `SecurityFatalError`; upgrade ako samostatná dávka závislostí',
         what='Kolega pri K28 (17. 11. 2026): nainštalovaný Next.js 16.4.3 (`frontend/package.json` `^16.4.3`, `package-lock.json` '
               '16.4.3) je v rozsahu upozornenia GHSA-mfr8-8qww-v76h (stupeň moderate, rozsah 16.3.0 až 16.4.4, oprava je '
               'dostupná). Dôkaz kolegu: `npm audit --omit=dev --json` vo `frontend` hlási pre `next` stupeň moderate (celkovo 6 '
               'moderate, 0 high, 0 critical); prvý lokálny `npm run build` skončil po úspešnom skompilovaní výpisom Next.js '
               '`SecurityFatalError` o zraniteľnej verzii a pri zopakovaní prešiel. Kontrola agenta: CI build na `main` (úloha '
               '`checks`, 17. 11. 2026 o 06:22 UTC, Next.js 16.4.3) prešiel bez takého výpisu; týždenný workflow `dependency-audit` '
               '(`.github/workflows/dependency-audit.yml`) padá až od stupňa high, takže tento nález nenahlási. Neoverené: či '
               'build na Railway niekedy skončí rovnakou chybou (treba pozrieť log nasadenia).',
         note='Návrh (neoverený): upgrade `next` na opravenú verziu v rámci rozsahu `^16.4.3` ako samostatná dávka závislostí '
               '(tretí druh rizika ide vždy samostatne): `package.json` a `package-lock.json`, celý Jest, `tsc`, build, kontrola '
               'prekladov a ručný dymový test majiteľa po nasadení. Majiteľ by mal pozrieť posledné nasadenia na Railway (zelené, '
               'bez chyby `SecurityFatalError`); ak by nasadenie padalo, nález sa posúva na začiatok poradia. Odhad: stredný · S až M.',
         dec=None, src='K28 (kolega, 17. 11. 2026) a kontrola agenta z logu CI'),
    dict(n=342, bucket=P, imp=N, eff=ES, pkg='Vzhľad Nástenky',
         kratko='komentáre: odpoveď, úprava a zmazanie pri zmiznutom príspevku nepoužijú spoločné spracovanie ako pridanie; oprava '
                'po kroku 7 delenia',
         what='Kolega pri K28 (17. 11. 2026, sonda v kópii mimo repozitára): pri chybe 404 z `createFeedPostComment` ukáže pridanie '
               'komentára jednu neutrálnu hlášku „Tento príspevok už nie je dostupný.“ a pošle signál zmiznutia príspevku; odpoveď, '
               'úprava aj zmazanie pri rovnakej chybe ukážu všeobecnú chybu („Odpoveď sa nepodarilo pridať.“, „Komentár sa '
               'nepodarilo upraviť.“, „Komentár sa nepodarilo zmazať.“) a signál nepošlú, takže karta príspevku ostane v '
               'zoznamoch. Príčina: `handleFeedPostErrorIfGone` (`feedPostGone.ts`) volá len `handleSubmit`; `handleSubmitReply`, '
               '`handleSubmitEdit` a `handleConfirmDelete` ho nevolajú (`FeedPostComments.tsx`). Dopad: nízky, nejednotné '
               'správanie (po zmazaní príspevku v inej relácii vidí používateľ pri týchto troch akciách zavádzajúcu všeobecnú '
               'chybu). Pozor pri oprave: `handleFeedPostErrorIfGone` berie za zmiznutý príspevok aj 403, no pri úprave a zmazaní '
               'komentára môže 403 znamenať „nemáš právo“, nie „príspevok zmizol“.',
         note='Návrh: opraviť až po delení (v novom súbore `useFeedCommentMutations.ts`, krok 7, ako samostatný commit s testom), '
               'nie počas delenia, aby sa správanie pri presune nemenilo. Pred opravou treba rozhodnúť, ktoré stavy sa pri úprave a '
               'zmazaní považujú za zmiznutý príspevok (agent pripraví otázku s odporúčaním; návrh: len 404 a 410, 403 nie). Odhad: '
               'nízky · S.',
         dec=None, src='K28 (kolega, 17. 11. 2026)'),
]
