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
         kratko='Nástenka: rozdeliť veľké súbory (`FeedPostComments.tsx`, `FeedPostCard.tsx`, '
                '`FeedPostMobileDetail.tsx`) bez zmeny vzhľadu, až potom redizajn (R23); `FeedPostComments.tsx`: '
                'mapovanie (K26), dávka 1 z 5 (K28), dávka 2 z 5 (K29), dávka 3 z 5 (K37) a dávka 4 z 5 (K38) hotové '
                '(573 riadkov), ďalšia je dávka 5 z 5 (kroky 7 a 8; K42)',
         what='Rozhodnutie R23 (13. 11. 2026): pred redizajnom Nástenky (nález 261) sa tri súbory nad 500 riadkov '
              'rozdelia po jednom: `feed/FeedPostComments.tsx` 1 487 riadkov (prvý), `feed/FeedPostCard.tsx` 1 033 a '
              '`feed/FeedPostMobileDetail.tsx` 594 (počty agent overil 13. 11. 2026). Delenie nesmie zmeniť '
              'správanie ani vzhľad; každý súbor ide vo vlastnej vetve s vlastnou kartou dávky a s ručným testom '
              'majiteľa (komentáre, odpovede, lajky komentárov, tagy, fotky v príspevku, mobilný detail) a až potom '
              'sa redizajn (261) robí nad menšími súbormi. Výnimka z pravidla 500 riadkov sa neudeľuje: povolenie '
              'platí len pre delenie týchto troch súborov.',
         note='Majiteľ vzhľad Nástenky zatiaľ sám neupravuje (13. 11. 2026), takže delenie môže ísť hneď; ak začne '
              'upravovať, dá vedieť. Súvisí s 261 (redizajn), 288 (vlastná vstupná animácia v `FeedPostCard.tsx` sa '
              'upraví samostatne až po dokončení a overení delenia, R28 a R23), 259 a 256. Postup pre každú kartu: '
              'najprv mapovanie hraníc (čo je komentár, odpoveď, zoznam, formulár, hooky; kód sa nemení), potom '
              'presun po jednom celku do nových súborov so zachovaním verejného rozhrania, po každom kroku celý Jest '
              'a existujúce testy komentárov; E2E sa po delení spustí (Codex). Odhad: stredný · L (tri samostatné '
              'dávky). VÝSLEDOK MAPOVANIA K26 (kolega, 16. 11. 2026, kód sa nemenil; čítané z `main` `910700ea`; '
              'celé znenie je v `karty/K26_vysledok.md` a `karty/K26_podklady.md`): čísla z karty sedia (20 '
              '`useState`, 17 `useRef`, 7 efektov, 5 importérov; `onCommentsReady` volá len '
              '`FeedPostMobileDetail.tsx` a žiadny test ho nemenuje). Pokrytie celým Jestom je 97,9 % riadkov a 85,7 '
              '% vetiev; z 39 skúšobných pokazení kódu existujúce testy zachytili 13 a 26 prežilo. Opravy '
              'predbežného rozboru agenta: hľadanie cieľa, strop 20 stránok a zvýraznenie na 3 s strážia 21 testov, '
              'skutočné medzery sú inde (zastarané odpovede po zmene, chyby pridania, odpovede a zmazania, reset '
              'hľadania pri zmene cieľa, signál `onCommentsReady`); chýbal krok „posun a indikátor nových“; hooky '
              'samy nestačia (ostane asi 700 riadkov), preto sa riadok komentára, pole na komentár a indikátor '
              'vyčleňujú skôr. PLÁN (9 krokov, každý vlastný commit a po ňom celý Jest, `tsc`, ESLint, kontroly '
              'prekladov a build): 0 charakterizačné testy (len nové súbory); 1 konštanty a čisté funkcie '
              '(`feedCommentsLogic.ts`, asi 175 riadkov; hlavný súbor potom 1 335); 2 riadok komentára '
              '(`FeedCommentItem.tsx`, asi 170; 1 215); 3 pole na komentár, indikátor a kostra (3 súbory, asi 190; 1 '
              '110); 4 hľadanie cieľa (`useFeedCommentsSeek.ts`, asi 255; 905; riziko stredné); 5 posun a indikátor '
              'nových (`useFeedCommentsScroll.ts`, asi 85; 865; stredné); 6 načítanie a polling '
              '(`useFeedCommentsLoader.ts`, asi 340; 600; vysoké); 7 mutácie (`useFeedCommentMutations.ts`, asi 200; '
              '470; stredné až vysoké); 8 typ vlastností a importy (asi 60; 420). Veľkosti sú odhad (±40 riadkov), '
              'názvy súborov návrh. V komponente ostáva signál `onCommentsReady`, efekt posunu navrch a odvodené '
              'hodnoty; poradie efektov sa nemení. ROZHODNUTIA MAJITEĽA (16. 11. 2026, podľa odporúčaní agenta): R45 '
              'odtlačok HTML šiestich stavov len dočasne (vznikne v kroku 0, zmaže sa v poslednej dávke); R46 päť '
              'dávok (0 | 1–3 | 4 | 5–6 | 7–8) s jedným ručným testom po každej okrem dávky 0; R47 redizajn 261 až '
              'po poslednej dávke; R48 oprava 338 po kroku 6 v novom súbore; R49 trvalé pravidlo: vzhľad sa najprv '
              'konzultuje s majiteľom. Dávka 1 je K28 (`karty/K28.md`); ďalšie dávky sa pripravia po zlúčení '
              'predchádzajúcej. RUČNE po každej dávke okrem dávky 0: okno detailu na počítači (pridať, odpovedať, '
              'upraviť, zmazať s potvrdením, lajknúť, rozbaliť odpovede); z upozornenia (okno aj adresa '
              '`?comment=`): doskroluje a zvýrazní komentár asi 3 s, odpoveď v zbalenom vlákne sa rozbalí; mobilný '
              'detail na iPhone (pri fotke alebo zdieľanom náhľade a aspoň 3 komentároch sa otvorí rovno pri '
              'komentároch); panel nad fotkou na mobile; živé komentáre z druhého účtu (polling 8 s). E2E: '
              'komentárov sa dotýkajú len `feed-post-detail.spec.ts` a `notification-click.spec.ts`; návrh pre '
              'Codexa: pridať a zmazať vlastný komentár (okno aj mobilný detail), odpoveď a úprava s upratovaním, po '
              'kliku na upozornenie cieľový komentár v zornom poli; E2E nepokryje stránkovanie, polling, 3 s '
              'zvýraznenie ani iPhone. Súvislosti: 261 (skupiny 6 a 7) sa dotýka riadku komentára a poľa na '
              'komentár; 288 je vo `FeedPostCard.tsx` (po jeho delení, R28); 259 a 256 sú na delení nezávislé; z '
              'mapovania vznikol nález 338. DÁVKA 1 Z 5 HOTOVÁ (K28, PR #278, zlúčené 17. 11. 2026 o 06:33 UTC, '
              'merge `4c342f72`; päť commitov `eb86d9a5`, `33a81b9b`, `ffcfad33`, `e8991819` a `b737a0f9`): len '
              'testy, produkčný kód nezmenený (rovnaký kontrolný súčet, 1 487 riadkov); päť nových súborov testov '
              '(39 nových testov: `staleResponses` 12, `mutationErrors` 8, `seekReset` 5, `commentsReady` 4 a '
              'odtlačok HTML 10 stavov) a DOČASNÝ súbor `.snap` (3 499 riadkov), ktorý zmaže dávka 5 z 5 a ktorý sa '
              'počas delenia neupravuje ani neprepisuje. Celý Jest 608 sád a 9 133 testov prešlo; všetkých 17 '
              'mutácií z karty zachytených (v K26 ich neodhalil žiadny existujúci test) a navyše A1, A9 a D1. '
              'Kontrola agenta z GitHubu: CI, CodeRabbit aj Codex review bez pripomienok a vlákna nie sú. Odchýlky '
              'od karty: odtlačok má desať stavov namiesto šiestich; pri zmiznutom príspevku kód ukáže jednu '
              'neutrálnu hlášku (karta písala „bez toastu“) a test overuje to; chyby `markSeen` vlastného komentára '
              'a odpovede (D7 a D8) chytá len test, ktorý vyrobí okno pred prekreslením, preto sa pri delení zápis '
              '`markSeen` v obslužných funkciách musí ponechať; strop 20 stránok sa z komponentu neexportuje, takže '
              'ho test nezafixúva presne (mutácia K1 je mimo dávky); zvýraznenie sa pozná podľa triedy '
              '`bg-purple-100/80` vo viacerých testoch, ktoré sa pri redizajne 261 upravia spolu. Kandidáti kolegu '
              'sú nálezy 341 a 342. DÁVKA 2 Z 5 HOTOVÁ (K29, PR #283, zlúčené 18. 11. 2026 o 07:21 UTC, merge '
              '`a9d0fc0c`; tri commity `a042993f`, `9b5a5f89` a `eca1e650`; 7 súborov): kroky 1 až 3 plánu ako čisté '
              'presuny (správanie, DOM, `data-testid` ani vzhľad sa nemenia). `FeedPostComments.tsx` 1 487 → 1 332 → '
              '1 213 → 1 098 riadkov (stále nad 500); nové súbory `feedCommentsLogic.ts` 178, `FeedCommentItem.tsx` '
              '206, `FeedCommentComposer.tsx` 135, `FeedCommentsNewIndicator.tsx` 70, `FeedCommentsLoadingMore.tsx` '
              '25 a nový súbor testov `__tests__/feedCommentsLogic.test.ts` 319 riadkov (34 testov čistých funkcií). '
              'PODĽA TEXTOV COMMITOV: celý Jest po každom kroku 609 sád a 9 167 testov prešlo; odtlačok HTML (10 '
              'stavov) aj existujúce testy bezo zmeny; `tsc`, ESLint a kontrola prekladov čisté; mutácie 19 z 19 '
              '(krok 1), 8 z 9 (krok 2) a 10 z 11 (krok 3), pričom dve prežili ako existujúce medzery v testoch (nie '
              'dôsledok presunu): `disabled` na avatare autora bez profilu a zvýraznenie počítadla pri prekročení '
              'dĺžky v bežnom poli; lokálny `npm run build` skončil v každom z troch krokov pri prvom behu výpisom '
              '`SecurityFatalError` a druhý beh prešiel (pozri 341). KONTROLA AGENTA z GitHubu a z `main`: CI '
              '(`checks`, `backend-postgres`) aj CodeRabbit zelené, vlákna nie sú; počty riadkov na `main` sedia s '
              'textami commitov; odtlačok HTML ani existujúce testy sa v PR nemenili; dotknutý je jediný súbor nad '
              '500 riadkov (`FeedPostComments.tsx`, výnimka R23). Kandidáti kolegu: žiadni. RUČNÝ TEST MAJITEĽA (18. '
              '11. 2026): 14 z 14 vykonaných, 12 prešlo bez novej chyby v hodnotenom rozsahu a 2 prešli čiastočne '
              '(testy 6 a 13); z nich vznikli kandidáti 345 (počítač: detail príspevku ostane otvorený po prechode '
              'na profil autora komentára) a 346 (iPhone: nový komentár nie je celý viditeľný). MAPOVANIE KANDIDÁTOV '
              'K36 (18. 11. 2026): oba sú starší stav, nie dôsledok K29; príčiny sú v nálezoch 345 a 346 '
              '(`karty/K36_vysledok.md`), 345 sa opraví mimo `FeedPostComments.tsx`, 346 patrí do kroku 5. DÁVKA 3 Z '
              '5 HOTOVÁ (K37, PR #289, zlúčené 18. 11. 2026 o 17:51 UTC, merge `e10a2256`; commit `c1480fae`; 2 '
              'súbory, 292 pridaných a 219 odstránených riadkov): krok 4 plánu, hľadanie cieľa z upozornenia sa '
              'presunulo do nového hooku `useFeedCommentsSeek.ts` (287 riadkov), `FeedPostComments.tsx` 1 098 → 884 '
              'riadkov (presunuté 224 riadkov v štyroch blokoch); čistý presun, správanie, DOM, `data-testid` ani '
              'vzhľad sa nemenia. PODĽA TEXTU COMMITU: skript poskladal pôvodný súbor bajt po bajte (jediný rozdiel '
              'je jedna pridaná závislosť), celý Jest 609 sád a 9 167 testov prešlo pred zmenou aj po nej, odtlačok '
              'HTML 10 z 10 bezo zmeny, `tsc`, ESLint a kontrola prekladov čisté, lokálny build pri prvom behu opäť '
              '`SecurityFatalError` a druhý prešiel (pozri 341); mutácie 24, zachytených 21 a prežili 3 (C9 len '
              'zdržanie; W4 a W5, `loadingMore` vždy false a `loadingRepliesFor` vždy null, prežili aj v pôvodnom '
              'kóde, takže ide o existujúcu medzeru v testoch: poistky proti súbehu pri hľadaní nestráži žiadny '
              'test). Odchýlky od karty: v efekte hľadania pribudla 13. závislosť `setExpandedReplies` (stabilný '
              'setter, vyžaduje ju `react-hooks/exhaustive-deps`), nový súbor má 287 riadkov namiesto odhadovaných '
              '255 a komentár nad `commentsRef` stojí priamo nad ním. Brána K37 splnená (výsledok K36 prečítaný). '
              'KONTROLA AGENTA z GitHubu a z `main`: CI (`checks`, `backend-postgres`) aj CodeRabbit zelené, vlákna '
              'nie sú; počty riadkov na `main` sedia (884 a 287); odtlačok HTML ani existujúce testy sa v PR '
              'nemenili; dotknutý je jediný súbor nad 500 riadkov (`FeedPostComments.tsx`, výnimka R23); prvý riadok '
              'commitu má 69 znakov. Kandidáti kolegu: žiadni. RUČNÝ TEST MAJITEĽA po K37 (18. 11. 2026): bez nových '
              'nálezov. DÁVKA 4 Z 5 HOTOVÁ (K38, PR #291, zlúčené 18. 11. 2026 o 21:31 UTC, merge `88b1aae4`; dva '
              'commity `fcde6240` (krok 5) a `7b719340` (krok 6); 3 súbory): posun a indikátor nových komentárov sú '
              'v novom hooku `useFeedCommentsScroll.ts` (82 riadkov) a načítanie, donačítanie, polling a odpovede v '
              '`useFeedCommentsLoader.ts` (349 riadkov); `FeedPostComments.tsx` 884 → 842 → 573 riadkov (stále nad '
              '500); čisté presuny, správanie, DOM, `data-testid` ani vzhľad sa nemenia (posun na vrch plochy ostal '
              'taký, aký bol, preto 346 pretrváva). PODĽA TEXTOV COMMITOV: skript poskladal pôvodný súbor po oboch '
              'krokoch bajt po bajte (krok 5 s dvoma rozšírenými závislosťami efektov), poradie efektov je pred '
              'krokom 6 aj po ňom rovnaké (sonda, 30 registrácií), celý Jest 609 sád a 9 167 testov prešlo pred '
              'oboma krokmi aj po nich, odtlačok HTML 10 z 10 bezo zmeny, `tsc`, ESLint a kontrola prekladov čisté, '
              'lokálny build pri prvom behu v oboch krokoch `SecurityFatalError` a druhý prešiel (pozri 341); '
              'mutácie: krok 5 spolu 30, zachytených 22 a prežilo 8 (S3, S5, S7, S8, S13, S14, S18 a S19), krok 6 '
              'spolu 63, zachytených 45 a prežilo 18 (A5, A6, A7, C3, D6, LD2, LD3, LD6, D5, LM2, R3, R4, R6, R7, '
              'LR1, LR4, LR7 a W5); všetky prežité zásahy prežili aj v pôvodnom kóde pred presunom, takže ide o '
              'existujúce medzery v testoch (nie dôsledok presunu): chýba napríklad test, že komentár pridaný počas '
              'prvého načítania nezostane bez zoznamu (A5 až A7, súvisí s 338), test dvoch súbežných donačítaní '
              '(LM2), test zlyhania donačítania odpovedí (LR7) a test dvoch nových komentárov naraz (S8). Odchýlky '
              'od karty: v kroku 5 pribudli dvom efektom závislosti `scrollRef` a `scrollToTopRef` so '
              '`setNewCommentsCount` (vyžaduje ich `react-hooks/exhaustive-deps`, identita sa nemení); v kroku 6 sa '
              'so zapisujúcim kódom presunuli aj stavy zoznamu (`comments`, `loading`, `loadingMore`, `failed`, '
              '`gone`, `hasMore` a `loadingRepliesFor`) a hook vracia aj `setComments`, `loadSeqRef` a `markSeen`, '
              'ktoré komponent ďalej používa pri pridaní, úprave, odpovedi a zmazaní (kroky 7 a 8); nové testy sa '
              'nepridávali. KONTROLA AGENTA z GitHubu a z `main`: CI (`checks`, `backend-postgres`) aj CodeRabbit '
              'zelené, vlákna nie sú; počty riadkov na `main` sedia (573, 82 a 349); odtlačok HTML ani existujúce '
              'testy sa v PR nemenili; dotknutý je jediný súbor nad 500 riadkov (`FeedPostComments.tsx`, výnimka '
              'R23); prvé riadky commitov majú 70 a 72 znakov. Kandidáti kolegu: žiadni. RUČNÝ TEST MAJITEĽA po K38 '
              'a K39 (19. 11. 2026, 16 testov): v správe sú dve odchýlky: test 10 (iPhone, nález 346 pretrváva, čo '
              'predpovedala karta K38) a test 13 (kandidát, z ktorého vznikol nález 351: opakované chybové toasty '
              'pri donačítaní starších komentárov bez internetu); ďalšie chyby majiteľ nenahlásil. SAMOSTATNÉ OPRAVY '
              'PO DÁVKE 4 (19. 11. 2026): K40 (PR #294, oprava 346) a K41 (PR #295, oprava 338 a mapovanie 351) sú '
              'hotové a `FeedPostComments.tsx` nezmenili (ostáva 573 riadkov); ručný test majiteľa prešiel. Ďalšia '
              'dávka je 5 z 5 (kroky 7 a 8: mutácie, typ vlastností a importy; posledná, zmaže aj dočasný odtlačok '
              'HTML): karta K42 (`karty/K42.md`) je pripravená 19. 11. 2026, mapovanie si robí kolega sám; po nej je '
              '`FeedPostComments.tsx` asi 420 riadkov.',
         dec='ROZHODNUTIE R23', src='rozhodnutie majiteľa R23 (13. 11. 2026) a výsledok K26 (kolega, 16. 11. 2026)'),
    dict(n=341, bucket=P, imp=S_, eff=ES, pkg='Bezpečnosť a produkčná odolnosť',
         kratko='Next.js 16.4.3 je v rozsahu bezpečnostného upozornenia GHSA-mfr8-8qww-v76h (stredná závažnosť); '
                'lokálny build pri prvom behu skončil `SecurityFatalError` (K28 raz, K29 v každom z troch krokov, '
                'K37 raz, K38 v oboch krokoch, K39, K40 a K41 po jednom; druhý beh vždy prešiel); upgrade ako '
                'samostatná dávka závislostí',
         what='Kolega pri K28 (17. 11. 2026): nainštalovaný Next.js 16.4.3 (`frontend/package.json` `^16.4.3`, '
              '`package-lock.json` 16.4.3) je v rozsahu upozornenia GHSA-mfr8-8qww-v76h (stupeň moderate, rozsah '
              '16.3.0 až 16.4.4, oprava je dostupná). Dôkaz kolegu: `npm audit --omit=dev --json` vo `frontend` '
              'hlási pre `next` stupeň moderate (celkovo 6 moderate, 0 high, 0 critical); prvý lokálny `npm run '
              'build` skončil po úspešnom skompilovaní výpisom Next.js `SecurityFatalError` o zraniteľnej verzii a '
              'pri zopakovaní prešiel. Kontrola agenta: CI build na `main` (úloha `checks`, 17. 11. 2026 o 06:22 '
              'UTC, Next.js 16.4.3) prešiel bez takého výpisu; týždenný workflow `dependency-audit` '
              '(`.github/workflows/dependency-audit.yml`) padá až od stupňa high, takže tento nález nenahlási. '
              'Neoverené: či build na Railway niekedy skončí rovnakou chybou (treba pozrieť log nasadenia). '
              'Opakovanie v K29 (18. 11. 2026, podľa textov commitov kolegu): v každom z troch krokov skončil prvý '
              'lokálny `npm run build` rovnakým výpisom `SecurityFatalError` a druhý beh prešiel, takže sa to '
              'opakuje pri prvom builde. Opakovanie v K37 (18. 11. 2026): prvý lokálny build znova '
              '`SecurityFatalError`, druhý prešiel. Opakovanie v K38 (v oboch krokoch) a v K39 (18. 11. 2026): prvý '
              'lokálny build znova `SecurityFatalError`, druhý vždy prešiel; spolu osem hlásených prvých buildov z '
              'osmich (K28 1, K29 3, K37 1, K38 2 a K39 1). Opakovanie v K40 a K41 (19. 11. 2026): prvý lokálny '
              'build znova `SecurityFatalError`, druhý prešiel; spolu desať hlásených prvých buildov z desiatich '
              '(K28 1, K29 3, K37 1, K38 2, K39 1, K40 1 a K41 1).',
         note='Návrh (neoverený): upgrade `next` na opravenú verziu v rámci rozsahu `^16.4.3` ako samostatná dávka '
              'závislostí (tretí druh rizika ide vždy samostatne): `package.json` a `package-lock.json`, celý Jest, '
              '`tsc`, build, kontrola prekladov a ručný dymový test majiteľa po nasadení. Majiteľ by mal pozrieť '
              'posledné nasadenia na Railway (zelené, bez chyby `SecurityFatalError`); ak by nasadenie padalo, nález '
              'sa posúva na začiatok poradia. Odhad: stredný · S až M. OPAKOVANIE: desať z desiatich hlásených '
              'prvých lokálnych buildov (K28 až K41) skončilo týmto výpisom, preto agent navrhuje zaradiť K31 hneď '
              'po K43 (päť krokov pred redizajnom komentárov je vo fronte); majiteľ môže nasadenia na Railway '
              'pozrieť hneď.',
         dec=None, src='K28 (kolega, 17. 11. 2026) a kontrola agenta z logu CI'),
    dict(n=342, bucket=P, imp=N, eff=ES, pkg='Vzhľad Nástenky',
         kratko='komentáre: odpoveď, úprava a zmazanie pri zmiznutom príspevku nepoužijú spoločné spracovanie ako '
                'pridanie; oprava ide v K43 po delení (R60)',
         what='Kolega pri K28 (17. 11. 2026, sonda v kópii mimo repozitára): pri chybe 404 z `createFeedPostComment` '
              'ukáže pridanie komentára jednu neutrálnu hlášku „Tento príspevok už nie je dostupný.“ a pošle signál '
              'zmiznutia príspevku; odpoveď, úprava aj zmazanie pri rovnakej chybe ukážu všeobecnú chybu („Odpoveď '
              'sa nepodarilo pridať.“, „Komentár sa nepodarilo upraviť.“, „Komentár sa nepodarilo zmazať.“) a signál '
              'nepošlú, takže karta príspevku ostane v zoznamoch. Príčina: `handleFeedPostErrorIfGone` '
              '(`feedPostGone.ts`) volá len `handleSubmit`; `handleSubmitReply`, `handleSubmitEdit` a '
              '`handleConfirmDelete` ho nevolajú (`FeedPostComments.tsx`). Dopad: nízky, nejednotné správanie (po '
              'zmazaní príspevku v inej relácii vidí používateľ pri týchto troch akciách zavádzajúcu všeobecnú '
              'chybu). Pozor pri oprave: `handleFeedPostErrorIfGone` posudzuje len stav odpovede (404, 403 alebo '
              '410), no pri úprave, zmazaní a odpovedi samotný stav nestačí: backend vracia 404 aj vtedy, keď '
              'príspevok existuje a chýba len komentár (telo „Komentar nebol najdeny.“) alebo rodičovský komentár '
              'odpovede (kód `reply_parent_missing`), a 403 pri úprave a zmazaní znamená „nemáš právo“, nie '
              '„príspevok zmizol“; pri chýbajúcom príspevku je telo „Prispevok nebol najdeny.“.',
         note='Návrh: opraviť až po delení (v novom súbore `useFeedCommentMutations.ts`, krok 7, ako samostatný '
              'commit s testom), nie počas delenia, aby sa správanie pri presune nemenilo. ROZHODNUTIE MAJITEĽA ČAKÁ '
              '(R60): samotný HTTP stav nestačí, preto (a) po chybe overiť dostupnosť príspevku jedným dopytom na '
              'detail (`getFeedPost` v `lib/feedApi.ts`; ak aj ten zlyhá s 404, 403 alebo 410, príspevok zmizol a '
              'spracuje sa ako pri pridaní, inak ostane doterajšia chyba), (b) strojový kód v odpovedi servera ako '
              '`reply_parent_missing` (zmena backendu), (c) rozlišovanie podľa textu odpovede (krehké); agent '
              'odporúča (a): rovnaká myšlienka ako pri načítaní okna detailu, len frontend. Karta K43 '
              '(`karty/K43.md`, 19. 11. 2026) je napísaná podľa odporúčania; oprava ide v K43 po K42 spolu s 351, '
              'každá vo vlastnom commite s testom. Odhad: nízky · S.',
         dec='ROZHODNUTIE R60', src='K28 (kolega, 17. 11. 2026)'),
    dict(n=343, bucket=P, imp=N, eff=ES, pkg='Vzhľad Nástenky',
         kratko='úchytka panela komentárov nad fotkou na mobile je kvôli globálnemu `button { min-height: 36px }` sivý ovál 40×36 px '
                'namiesto tenkej úchytky; oprava podľa R55',
         what='Majiteľ pri návrhu vzhľadu komentárov (17. 11. 2026, snímka z mobilného zobrazenia): sivý kruh hore v paneli komentárov nad '
               'fotkou nie je kurzor z nástrojov prehliadača, ale úchytka panela (potiahnutie nadol alebo ťuk panel zatvorí; '
               '`feed/FeedPhotoCommentsSheet.tsx`, 126 riadkov). Agent overil čítaním kódu: úchytka je `button` s triedami '
               '`mx-auto block h-1.5 w-10 rounded-full`, teda 6 px vysoké tlačidlo, no globálne pravidlo `button { min-height: 36px }` '
               'v `frontend/src/app/globals.css` (riadok 263) ho natiahne na 36 px, takže vznikne sivý ovál 40×36 px, ktorý odtláča '
               'nadpis „Komentáre“ nižšie. Platí na všetkých zariadeniach (pravidlo nemá podmienku). Jednoduché hľadanie podobný '
               'prípad (tenké tlačidlo s pevnou výškou pod 36 px) inde nenašlo; ostatné úchytky v aplikácii sú `div`.',
         note='ROZHODNUTÉ (R55, majiteľ 17. 11. 2026, podľa odporúčania agenta): tenká úchytka 40×6 px (možnosť A, obrázok '
               '`navrhy/mobil-uchytka.png`), nie šípka ani bez úchytky; ťuk aj potiahnutie nadol fungujú ďalej a neviditeľná plocha na '
               'ťuk má aspoň 44 px. Návrh (neoverený): tlačidlo s priehľadnou plochou a vnútornou tenkou čiarou, globálne pravidlo '
               '`button` sa nemení. JASNÉ: jeden malý súbor pod 500 riadkov a test; nesúvisí s delením `FeedPostComments.tsx`, takže môže '
               'ísť aj pred ním. Po nasadení krátky ručný test majiteľa na mobile. Odhad: nízky · S.',
         dec='ROZHODNUTIE R55', src='majiteľ (17. 11. 2026) a kontrola agenta čítaním kódu'),
    dict(n=344, bucket=P, imp=N, eff=EM, pkg='Vzhľad Nástenky',
         kratko='okno detailu príspevku na počítači: zdieľaná ponuka a portfólio v dvoch stĺpcoch ako príspevok s fotkou a užšie okno '
                'príspevku len s textom (R53)',
         what='Prianie majiteľa (17. 11. 2026, po snímkach okien detailu): (a) okno zdieľanej ponuky a zdieľaného portfólia má mať '
               'rovnaké rozloženie a logiku ako okno príspevku s fotkou: vľavo hlavička, text, karta ponuky (portfólia) a riadok s '
               'lajkom, vpravo stĺpec „Komentáre“ s poľom na komentár dole; pevná výška okna, karta vyplní zvyšok ľavého stĺpca, riadok '
               'akcií stále dole, text so „Viac“; klik na kartu ostáva (otvorí ponuku alebo portfólio). (b) Okno príspevku len s textom '
               'bude užšie (asi 580 px namiesto 864 px; hore príspevok, pod ním komentáre, pole na komentár pri spodku); dva stĺpce pre '
               'text majiteľ zamietol. STAV V KÓDE (čítanie agenta): `FeedPostDetailOverlay.tsx` (385 riadkov) volí `splitLayout = '
               'hasPhoto && !isMobile`, kde `hasPhoto` je vlastná viditeľná fotka alebo repost foto príspevku (`sharedFeedPostPhoto`); '
               'zdieľaná ponuka a portfólio sú jednostĺpcové (`sharedFillsColumn`, karta s vlastným posunom, v okne sa orezáva); '
               '`FeedPostDetailSplitLayout.tsx` (144 riadkov) kreslí vľavo 56 % `FeedPostCard variant="detail" fillHeight` a vpravo 44 % '
               'nadpis a `FeedPostComments`; šírka okna je `max-w-[54rem]` (864 px), pri dvoch stĺpcoch pevná výška `95vh`.',
         note='Odhad dotyku (neoverený): rozšírenie podmienky `hasPhoto`, šírka okna pri texte a prípadne vzhľad karty v ľavom stĺpci; '
               '`FeedPostCard.tsx` (1 033 riadkov) a `FeedPostComments.tsx` sú nad 500 riadkov, takže zmena ide buď bez zásahu do nich, '
               'alebo až po ich delení; kolega najprv mapuje (NEJASNÉ). Dopad na E2E: špecy okna detailu (`feed-post-detail.spec.ts`) a '
               'nový scenár komentárov (257) používajú okno len s textom, treba ich pozrieť. Vzhľad schválil majiteľ (R49, R53; obrázky '
               '`navrhy/pc-okno-ponuka.png` a `navrhy/pc-okno-text.png`). Odhad: nízky · M.',
         dec='ROZHODNUTIE R53', src='majiteľ (17. 11. 2026)'),
    dict(n=347, bucket=P, imp=N, eff=ES, pkg='Súkromie a krajina',
         kratko='ponuky účtov `is_staff` a `is_superuser` sú cez priame id dostupné a dajú sa lajkovať, hoci ich vyhľadávanie ani '
                'vytvorenie žiadosti nepustí; treba rozhodnúť, či je to zámer',
         what='Kolega pri K30 (18. 11. 2026, sonda mimo repozitára: vlastník staff aj superuser, cudzí prihlásený divák): detail ponuky '
              'vráti 200, lajk 201 a riadok `OfferedSkillLike` sa uloží, kým vo vyhľadávaní ponuka nie je. Agent overil čítaním kódu '
              '(18. 11. 2026): `offer_hidden_from_user` (`accounts/services/offer_visibility.py`) nemá pravidlo pre staff ani '
              'superuser, kým `searchable_user_q` (`accounts/search_visibility.py`) vyžaduje `is_staff=False` a `is_superuser=False` '
              'a vytvorenie žiadosti o ponuku (`accounts/views/skill_requests.py` a `accounts/skill_request_serializers.py`) takéto '
              'účty odmieta. Rovnaký vzor ako 339 s iným dôvodom. Dopad: obsah administrátorských účtov je cez priame id dostupný a '
              'dá sa naň dávať lajky. Sondu agent nespúšťal.',
         note='NEJASNÉ: pred opravou treba rozhodnúť, či sa majú ponuky účtov staff a superuser skrývať aj pri priamom prístupe '
              '(konzistentne s vyhľadávaním), alebo je to zámer (napríklad ponuky vlastného administrátorského účtu majiteľa). Agent '
              'pripraví otázku s odporúčaním, keď nález príde na rad. Ak sa rozhodne skrývať: jedna podmienka v '
              '`offer_hidden_from_user` v tom istom tvare ako pri 339, testy a kontrola ostatných volajúcich pomocníka. Skupina a '
              'dôležitosť sú predbežný návrh agenta (súkromie ako 339, nízka dôležitosť, lebo ide o administrátorské účty). Odhad: '
              'nízky · S.',
         dec=None, src='K30 (kolega, 18. 11. 2026) a kontrola agenta čítaním kódu'),
    dict(n=348, bucket=P, imp=N, eff=ES, pkg='Súkromie a krajina',
         kratko='osirotená recenzia (ponuka zmazaná) neaktívneho hodnoteného používateľa je cez priame id viditeľná a dá sa lajkovať',
         what='Kolega pri K30 (18. 11. 2026, sonda mimo repozitára: ponuka zmazaná, hodnotený vlastník neaktívny, cudzí prihlásený '
              'divák): `review_hidden_from_user` vráti False, detail recenzie 200, lajk recenzie 201 a riadok `ReviewLike` sa uloží. '
              'Agent overil čítaním kódu (18. 11. 2026): vetva pre `offer=None` v `review_hidden_from_user` '
              '(`accounts/services/offer_visibility.py`) kontroluje súkromný profil a blok hodnoteného používateľa, ale nie '
              '`is_active`; pri existujúcej ponuke pomocník deleguje na `offer_hidden_from_user`, ktorý od K30 neaktívneho vlastníka '
              'skrýva. Dopad: text recenzie deaktivovaného účtu ostáva cez priame id dostupný a dá sa naň dávať lajky; prípad je '
              'zriedkavý (ponuka musí byť zmazaná). Sondu agent nespúšťal.',
         note='Návrh (neoverený): doplniť do vetvy `offer=None` kontrolu `is_active` hodnoteného používateľa (rovnaký tvar ako pri 339) '
              'a testy; malá backendová oprava, môže ísť spolu s 347. Skupina a dôležitosť sú predbežný návrh agenta (súkromie ako '
              '339, nízka dôležitosť pre zriedkavý prípad). Odhad: nízky · S.',
         dec=None, src='K30 (kolega, 18. 11. 2026) a kontrola agenta čítaním kódu'),
    dict(n=349, bucket=P, imp=S_, eff=EM, pkg='Bezpečnosť a produkčná odolnosť',
         kratko='deaktivovaný účet ostáva autentifikovaný, kým platí cache autentifikácie (predvolene 24 hodín), ak sa deaktivuje bez '
                '`save()` alebo v súbehu s vlastnou požiadavkou toho účtu',
         what='Kolega pri K30 (18. 11. 2026, druhý commit `2f5ba6ef`, sonda mimo repozitára, len stavové kódy): po prihlásení, teplej '
              'cache autentifikácie a `QuerySet.update(is_active=False)` bez `post_save` vráti detail vlastnej ponuky 200, hoci '
              'databáza má `is_active=False`; to isté cez `save()` dá 401. Agent overil čítaním kódu (18. 11. 2026): '
              '`SwaplyJWTAuthentication.get_user` (`accounts/authentication.py`) pri zásahu cache verí uloženému `is_active` a po '
              'čítaní z databázy ho zapíše na `AUTH_USER_REDIS_CACHE_TTL_SECONDS`, predvolene 86 400 s '
              '(`accounts/authentication_helpers.py`, riadok 53); cache sa zneplatňuje pri `save()` používateľa '
              '(`accounts/signals.py`, `invalidate_auth_cache_after_user_save`) a výslovnými volaniami. Súbeh (čítanie z databázy '
              'pred deaktiváciou, zápis do cache až po zneplatnení) vedie k tomu istému stavu; netestoval sa, vyplýva z poradia '
              'riadkov. Dopad: deaktivovaný účet môže až do vypršania cache používať koncové body, ktoré sa spoliehajú na autentifikáciu '
              '(pri zásahu cache sa používateľ stavia z uloženého stavu, takže aj kontrola `request.user.is_active` vidí uloženú '
              'hodnotu; koncové body, ktoré čítajú stav žiadateľa priamo z databázy, by ho mohli odmietnuť; agent ich nehľadal a '
              'kolega sondou overil jeden: detail vlastnej ponuky 200); v kóde aplikácie sa účty deaktivujú cez `save()` '
              '(administrácia, `anonymize_user`), takže ide o okrajové cesty (hromadný `update()`, SQL, zásah do databázy) a '
              'súbeh. Neoverené: účinné hodnoty `AUTH_LAZY_USER_ENABLED` (predvolene zapnuté) a '
              '`AUTH_USER_REDIS_CACHE_TTL_SECONDS` v Railway. Sondu agent nespúšťal.',
         note='NEJASNÉ: najprv rozhodnúť dôležitosť a postup; agent pripraví otázku s odporúčaním. Možnosti (neoverené): zneplatniť '
              'cache pri každej ceste deaktivácie (hromadné operácie volajú výslovnú invalidáciu), skrátiť TTL alebo overovať '
              '`is_active` pri každom zásahu cache (spomalí požiadavky); oprava súbehu pri zápise do cache je samostatná zmena. '
              'Dôležitosť je predbežná (agent: stredná, lebo ide o okrajové cesty a súbeh); ak majiteľ plánuje hromadné deaktivácie '
              'v administrácii (akcie s `update()`), zvýšiť. Súvisí s 339 (docstring v `offer_hidden_from_user` o výnimke pre '
              'vlastníka). Odhad: stredný · M.',
         dec=None, src='K30 (kolega, druhý commit `2f5ba6ef`, 18. 11. 2026) a kontrola agenta čítaním kódu'),
    dict(n=351, bucket=P, imp=S_, eff=ES, pkg='Vzhľad Nástenky',
         kratko='komentáre a odpovede: pri výpadku internetu sa pri donačítavaní starších komentárov (a odpovedí) v '
                'slučke opakujú dopyty a chybové toasty „Komentáře se nepodařilo načíst.“ namiesto jedného; príčina '
                'zmapovaná v K41 (starší stav); oprava v K43 po odpovedi na R61',
         what='Majiteľ pri ručnom teste po K38 a K39 (19. 11. 2026, test 13 zo 16, kandidát na nový nález): pri '
              'vypnutom internete a pokuse o donačítanie starších komentárov sa zobrazilo veľké množstvo rovnakých '
              'hlásení „Komentáře se nepodařilo načíst.“ namiesto jediného. Prvé načítanie komentárov bez internetu '
              'prešlo správne. Problém potvrdený iba pri donačítavaní starších komentárov; ostatné cesty (polling, '
              'donačítanie odpovedí, hľadanie cieľa z upozornenia) majiteľ neskúšal. Text hlášky je český, test teda '
              'bežal v češtine; zariadenie ani počet hlásení majiteľ neuviedol. Agent kód nečítal a príčinu nepozná '
              '(mapovanie robí kolega, rozhodnutie majiteľa 18. 11. 2026). Podľa textov commitov K38 je donačítanie '
              '(`loadMore`) od 18. 11. 2026 v `useFeedCommentsLoader.ts`, má chybový toast a voľbu `silent` a '
              'presunulo sa bez zmeny (skript poskladal pôvodný súbor bajt po bajte), takže nejde o dôsledok K38; '
              'stránkovanie spúšťa podľa plánu K26 efekt „sentinel“ vo `FeedPostComments.tsx` (neoverené čítaním '
              'kódu); mutácia LM2 z K38 (chýbajúca stráž súbehu v `loadMore`) prežila aj v pôvodnom kóde, takže '
              'stráž súbehu nemá test. HYPOTÉZY NA OVERENIE (nie zistenia): (1) po zlyhaní sa donačítanie spustí '
              'znova, kým je koniec zoznamu vo výhľade, a každý pokus dá vlastný toast (slučka opakovaní, ktorá by '
              'pri výpadku servera zaťažovala aj server); (2) toast nemá spoločné `id`, takže sa opakované chyby '
              'nezlúčia (inde v aplikácii má chyba pri offline jeden spoločný toast, napríklad chyba ukladania '
              'volieb upozornení v Nastaveniach); (3) súbežné donačítania bez stráže súbehu; (4) iná cesta '
              '(napríklad polling po 8 s) toast opakuje. MAPOVANIE (kolega, K41, 19. 11. 2026; agent overil kľúčové '
              'tvrdenia čítaním kódu na `main` `561aaa8f`, merania nespúšťal; celé znenie je v '
              '`karty/K41_vysledok.md`): STARŠÍ STAV (rovnaké čísla na `main` pred K37). Z hypotéz vyššie sa '
              'potvrdila prvá (slučka); toast bez `id`, súbežné donačítania a polling príčinou nie sú. PRÍČINA: '
              'toast `feed.commentsLoadError` je len v `loadMore` (`useFeedCommentsLoader.ts`); po zlyhaní ostáva '
              '`hasMore` pravdivé a kurzor sa neposúva; sentinel sa zapína cez `enabled: hasMore && !loading && '
              '!loadingMore` (`FeedPostComments.tsx`) a `useInfiniteScrollSentinel` (`useFeedInfiniteScroll.ts`) pri '
              'každom prepnutí `enabled` vytvorí nový `IntersectionObserver`, ktorý hneď doručí začiatočné '
              'oznámenie, takže kým je koniec zoznamu vo výhľade, platí: zlyhanie, nový observer, `loadMore()`, '
              'zlyhanie… Slučka beží sama bez zásahu používateľa; hlavný feed a profil ju majú ošetrenú (`enabled: … '
              '&& !error`, ručné tlačidlo), komentáre nie. DÔKAZ (kolega, kópia mimo repozitára, Chromium 393×659, '
              'atrapa siete so zlyhaním po 25 ms): jeden posun na koniec zoznamu = 21 dopytov a 21 toastov za 1 s a '
              '102 za 5 s, naraz vo výhľade 20 toastov (strop `react-hot-toast`); odchod z konca slučku zastaví, '
              'návrat ju spustí znova; keď sa internet vráti, jedno načítanie prejde a slučka skončí; pri '
              'nedostupnom serveri by zaťažovala aj server. ODPOVEDE: rovnakú slučku má donačítanie odpovedí '
              '(`FeedRepliesAutoLoader.tsx`, `enabled={loadingRepliesFor !== comment.id}`, toast '
              '`feed.repliesLoadError`; Jest sonda: 20 toastov a 21 dopytov za 60 snímok); majiteľ ju neskúšal, '
              'kolega ju navrhol ako kandidáta a je zahrnutá v tomto náleze. Polling je bez toastu a hľadanie cieľa '
              'je `silent` bez slučky; prvé načítanie dá jednu chybu v zozname.',
         note='MAPOVANIE HOTOVÉ (K41). ROZHODNUTIE MAJITEĽA ČAKÁ (R61): pravidlo obnovenia po zlyhaní a že oprava '
              'pokryje aj odpovede; agent odporúča (a): `useFeedCommentsLoader.ts` po zlyhaní donačítania vracia '
              '`hasMore: false`, kým sa nevráti spojenie (úspešný polling alebo udalosť `online`), takže sentinel sa '
              'nezapne. Prototyp kolegu (kópia mimo repozitára, necommitnutý, bez celej sady testov): offline na '
              'konci zoznamu = 1 dopyt a 1 toast, odchod a návrat nič nespustí, po návrate internetu sa doťahovanie '
              'obnoví samo (hneď po `online`, inak do 8 s pollingom). Odpovede len v hooku nejdú (`enabled` sa '
              'počíta vo `FeedPostComments.tsx` z `loadingRepliesFor`; jeho udržanie by nechalo kostru načítavania '
              'navždy), preto ich oprava patrí do K43 po K42, keď je `FeedPostComments.tsx` pod 500 riadkov, alebo '
              'do `FeedRepliesAutoLoader.tsx` (117 riadkov) so zmenou volania v komponente; spoločný '
              '`useInfiniteScrollSentinel` (používa ho aj feed, profil, upozornenia a správy) sa nemení. RIZIKÁ: ak '
              'zlyháva len stránka s kurzorom a polling prechádza, pokus sa opakuje každých 8 s (toast znova); '
              'obnova pri ďalšom posune používateľa sa v hooku nedá (chcela by `handleListScroll`); `online` '
              'listener je nový efekt na konci hooku (poradie existujúcich sa nemení). Fixné `id` toastu netreba, ak '
              'sa slučka zastaví; testy `FeedPostComments.scoped` a `repliesPaging` kontrolujú `toast.error` s '
              'jediným argumentom. Viditeľná zmena (tlačidlo „Skúsiť znova“ ako majú feed a profil, nové texty v '
              'šiestich jazykoch) sa nerobí; ak by ju majiteľ chcel, vzhľad sa podľa R49 najprv schváli. Test (návrh '
              'kolega): zlyhanie po `setTimeout` a atrapa observera so začiatočným oznámením (okamžité zamietnutie '
              '`mockRejectedValue` React zlúči a slučku nevidí); pred opravou desiatky dopytov a toastov po jednom '
              'posune, po oprave najviac 1 dopyt a 1 toast a obnova po úspešnom pollingu a po `online`. Súbory: '
              '`useFeedCommentsLoader.ts` 394 (po oprave asi 420), `FeedRepliesAutoLoader.tsx` 117, '
              '`FeedPostComments.tsx` 573 (po K42 asi 420). Karta K43 (`karty/K43.md`, 19. 11. 2026) je napísaná '
              'podľa odporúčania; oprava ide v K43 spolu s 342, každá vo vlastnom commite s testom. Dopad na E2E: '
              'žiadny, offline scenár komentárov E2E nepokrýva. Skupina a dôležitosť: predbežne stredná (slučka '
              'zaťažuje server pri výpadku). Odhad: stredný · M.',
         dec='ROZHODNUTIE R61', src='majiteľ (ručný test po K38 a K39, 19. 11. 2026, test 13) a kontrola agenta z textov commitov K38'),
]
