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
               'vzhľadu, až potom redizajn (R23)',
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
               'existujúce testy komentárov; E2E sa po delení spustí (Codex). Odhad: stredný · L (tri samostatné dávky).',
         dec='ROZHODNUTIE R23', src='rozhodnutie majiteľa R23 (13. 11. 2026)'),
    dict(n=337, bucket=A, imp=N, eff=EM, pkg='Nástroje a testy',
         kratko='E2E: UI scenár zmeny kategórie upozornení s vrátením pôvodnej hodnoty (zvyšok etapy 4 nálezu 321); čaká na '
                'rozhodnutie majiteľa (R44)',
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
         note='Návrh agenta (rozhodnutie R44): UI scenár kategórií robiť (je to posledná položka plánu etapy 4; zápis je '
               'malý, návrat sa overuje a WebKit ostáva povinný), E2E pre výzvu na push nerobiť (pokrývajú ju desiatky '
               'jednotkových testov hooku, komponentu a celého modulu, ručný test na iPhone prešiel a v E2E by ju videl '
               'len jeden z troch projektov). Odhad: stredný · M. Dopad na aplikáciu: žiadny.',
         dec='ROZHODNUTIE R44', src='report Codexa z 16. 11. 2026 (mapovanie UI kategórií a schopností prehliadačov) a rozhodnutie majiteľa R43'),
]
