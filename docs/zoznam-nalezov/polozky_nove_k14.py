# -*- coding: utf-8 -*-
"""Nové nálezy od čísla 305: kandidáti kolegu z K13 a K14, ručné testy majiteľa po K14 (8. 11. 2026) a diagnostika a video majiteľa
z 9. 11. 2026 (322 až 324) a ručné testy majiteľa po K17 s mapovaním agenta z 11. 11. 2026 (325 až 327; 326 a 327 sú hotové v K18, z 325 zostáva toast) a report Codexa po K19 (328).

Samostatný súbor kvôli limitu 500 riadkov; `polozky_nove.py` ich pripája do `NEW_ITEMS`. Pravidlá sú rovnaké ako inde: otvorený nález sa
po oprave odstráni odtiaľto a zapíše do `hotove_dalsie.DONE_SINCE_DALSIE`; čísla sa nikdy nepoužívajú znova. Kandidát B kolegu (osem
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
                'nejasná)',
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
               'krok 0. Ak sa prejav (zmena offline bez chyby) ukáže aj po K20, ide o nový nález.',
         dec=None, src='ručný test majiteľa po K14 a mapovanie agenta (8. 11. 2026)'),
    dict(n=321, bucket=P, imp=S_, eff=EL, pkg='Upozornenia a push',
         kratko='Upozornenia: päť kategórií a hlavný vypínač nie sú napojené v rozhraní (nedokončená funkcia; dokončiť pred štartom, R32 '
               'a); server (etapy 1 a 2) je hotový v K19, zostáva rozhranie (etapa 3: K20 a K21) a E2E (etapa 4)',
         what='ČIASTOČNE HOTOVÉ (K19, zlúčené v PR #257 dňa 12. 11. 2026 o 13:02 UTC, merge `73173920`; commity `204f8154`, '
               '`3246efe7`, `9fa9b2ad`, `c63d972a` a opravy po CodeRabbite `3fb38817` a `4a44c1e1`): etapy 1 a 2 sú hotové na serveri, '
               'frontend sa nezmenil. ETAPA 1 (ukladanie): `UserProfile` má päť nových polí `BooleanField(default=True)` '
               '(`notify_likes`, `notify_comment_likes`, `notify_comments`, `notify_tags_and_shares`, `notify_skill_requests`), '
               'migrácia `0126_userprofile_notification_categories` (len `AddField`, bez dátovej migrácie: existujúce riadky dostanú '
               'zapnuté), polia sú v administrácii a nový profil ich má zapnuté vždy (priamo, cez službu aj pri registrácii e-mailom). '
               '`GET` a `PATCH /api/auth/push/preferences/` vracajú a prijímajú sedem volieb (dve staré a päť nových, ľubovoľná '
               'podmnožina); každý neznámy kľúč sa odmietne (400, nič sa neuloží), aj v požiadavke, ktorá obsahuje aj známy kľúč '
               '(jediný klient `useNotificationPreferences.ts` posiela vždy jeden známy kľúč). Rovnako je rozšírená cesta '
               '`dashboard/settings/` (blok `notifications` nesie sedem volieb, neznáme kľúče sa tam ticho ignorujú ako doteraz) a po '
               'pripomienke CodeRabbitu sa hodnoty overujú pravdivostným typom DRF: reťazec „false“ sa už neuloží ako zapnuté a '
               'neplatná hodnota (aj `null`) je 400 bez zápisu (pri dvoch starých vypínačoch to tak bolo už pred K19; frontend túto '
               'cestu nevolá). ETAPA 2 (potlačenie): nový modul `accounts/services/notification_categories.py` (87 riadkov) má tabuľku '
               'typ → kategória pre 18 typov a zoznam troch typov, ktoré chodia vždy (`offer_watch_match`, `group_invitation` a '
               'počiatočný `skill_request`); poistný test vyžaduje, aby bol každý z 21 typov `NotificationType` zaradený práve raz; '
               '`create_notification` hneď za hlavným vypínačom skontroluje kategóriu (pri vypnutej sa upozornenie neuloží a funkcia '
               'vráti `None`; profil sa číta jediným dopytom); `create_skill_request_notification` sa nemenila a obchádza obe '
               'kontroly; vypnutie kategórie platí len pre nové upozornenia. Nemenilo sa: push na správy, `WEB_PUSH_*`, význam '
               '`in_app_notifications` a `push_notifications`. Overenie kolegom: pred zmenou padalo 6 z 6 testov profilu, 42 zo 45 '
               'testov API a 21 zo 76 testov kontroly, test tabuľky (27) sa nedal ani načítať, lebo modul neexistoval; SQLite aj '
               'PostgreSQL 16.15; celý backend po druhom commite 2 366 prešlo, 24 preskočených, 0 zlyhalo; mutácie 9 z 9, 11 z 11, 11 '
               'z 11 a 9 z 9; odchýlky od karty: lokálne len PostgreSQL 16.15 (verziu 17 overuje CI) a štyri povolené úpravy porovnaní '
               'v `test_dashboard_settings_preferences.py`. KONTROLA AGENTA PO ZLÚČENÍ (12. 11. 2026): majiteľ PR zlúčil po kontrole '
               'CodeRabbitu ešte pred kontrolou agenta; CI (`checks`, `backend-postgres`) je zelené na PR aj na `main` (beh č. 1184), '
               'Codex bez nálezov, CodeRabbit mal v prvom kole tri pripomienky (docstring triedy `Migration` a prevod `bool()` kolega '
               'opravil, docstringy v štyroch upravených testoch ostávajú) a druhé kolo bolo bez pripomienok; tabuľka sedí na R34 (18 '
               'typov v piatich kategóriách a 3 vždy zapnuté, spolu 21); lokálne prešlo 325 testov (183 nových a 142 súvisiacich), '
               '`makemigrations --check` bez zmien a tri vlastné mutácie tabuľky (zámena kategórie, chýbajúci profil ako vypnuté, '
               'počiatočná žiadosť v kategórii) test zachytil 3 z 3. Manuálne testy majiteľa po nasadení nenašli nález. ZOSTÁVA: etapa '
               '3a (K20): `useNotificationPreferences` pre všetkých sedem volieb s optimistickým ukladaním, vrátením len zmenenej '
               'hodnoty a prekladanou chybou, `NotificationSettingsModule` bez lokálnych `useState` (päť kategórií zo servera, kostra '
               'namiesto falošného „Vypnuté“ počas načítania), hlavný vypínač podľa R35 (`in_app_notifications`, inverzne), '
               'premenovanie kategórie `notify_tags_and_shares` a nový opis vo všetkých šiestich jazykoch, oprava 319 a štyri '
               'docstringy v `test_dashboard_settings_preferences.py` (otvorené vlákno CodeRabbitu v PR #257; vznikli, lebo karta K19 '
               'zakazovala inú úpravu existujúcich testov); etapa 3b (K21): výzva na povolenie push (R36 a); etapa 4 (Codex po '
               'nasadení K20): E2E zmena kategórie s vrátením pôvodnej hodnoty, API test siedmich volieb a vypnutá kategória (dva '
               'účty, upratanie). PÔVODNÝ OPIS A MAPOVANIE (8. a 10. 11. 2026): '
               'Ručný test majiteľa po K14 (8. 11. 2026) a nález kolegu z K14: v Nastaveniach → Upozornenia je šesť kategórií: Správy, '
               'Páči sa mi to, Páči sa mi to a komentáre (reakcie a komentáre na fotkách, kde je používateľ označený), Komentáre, Páči '
               'sa mi to pre komentáre a Žiadosť o zručnosť. Podľa majiteľa je to nedokončená práca: kategórie neposkytujú funkčný '
               'systém upozornení. Agent to v kóde overil: `frontend/src/components/dashboard/modules/NotificationSettingsModule.tsx` '
               'drží hlavný vypínač a päť kategórií (všetky okrem Správ) len ako lokálny `useState(false)`; nič sa neukladá na server '
               'a po novom otvorení sa vrátia na „Vypnuté“. Napojená je len voľba Správy (push): `useNotificationPreferences` načíta a '
               'ukladá dve nastavenia servera (`in_app_notifications`, `push_notifications`) a Správy používajú `push_notifications`.',
         note='Očakávané správanie (majiteľ): každá kategória sa dá zapnúť a vypnúť, nastavenie sa uloží a príslušné upozornenie sa '
               'doručí alebo potlačí; od 10. 11. 2026 aj: nový používateľ má mať všetky upozornenia predvolene zapnuté a vypne si ich '
               'sám. Rozhodnuté R32 (a), 9. 11. 2026: majiteľ chce kategórie dokončiť pred štartom a nechce sa tejto práci vyhýbať '
               '(agent odporúčal (b), skryť prepínače a dokončiť po štarte; majiteľ to nezvolil, preto sa nález 324 o skrytí '
               'zatvoril). Ide o väčšiu funkciu (odhad: stredný · L). MAPOVANIE 10. 11. 2026 (agent, čítanie kódu na `main` '
               '`29052576`; návrh, nie dôkaz). STAV DNES: (1) Server: `UserProfile` (`accounts/models/user.py`) má len dve voľby, '
               '`in_app_notifications` a `push_notifications`, obe s predvolenou hodnotou zapnuté (aj pre nových používateľov; profil '
               'vzniká pri e-mailovej registrácii v `auth_serializers.py`, inak pri prvom čítaní nastavení, a chýbajúci profil sa '
               'berie ako všetko zapnuté). Rozhranie API: `GET` a `PATCH /api/auth/push/preferences/` (`views/push.py`, '
               '`PushPreferencesSerializer`) a druhá cesta `dashboard/settings/` (`services/settings.py`) s tými istými dvoma poľami, '
               'ktorú frontend nepoužíva. (2) Vytváranie upozornení: všetky typy idú cez `create_notification` v '
               '`services/notification_core.py`, ktorý pri vypnutej voľbe `in_app_notifications` upozornenie vôbec neuloží '
               '(minimalizácia údajov); jediná výnimka je nová žiadosť o zručnosť (`notification_events/skill_requests.py`, zámerne '
               'obchádza voľbu, lebo niekto čaká na odpoveď; test `test_skill_request_notification_ignores_in_app_toggle`). Backend '
               'vytvára 21 typov (`NotificationType`): lajky ponúk, portfólia, profilu a príspevkov, lajky komentárov a recenzií, '
               'komentáre a odpovede na komentáre, nové recenzie a odpovede na ne, označenie a zdieľanie príspevku, žiadosti o '
               'zručnosť a ich priebeh, zhoda Sledovania a pozvánka do skupiny. (3) Push existuje len pre správy '
               '(`webpush_delivery.deliver_message_push`, odbery vyberá `webpush_subscriptions.py` podľa `push_notifications`); iné '
               'upozornenia push nemajú a e-mailové upozornenia backend neposiela (len overenie a obnova hesla). (4) Rozhranie: '
               '`NotificationSettingsModule.tsx` (150 riadkov) drží hlavný vypínač „Vypnúť všetko“ a päť kategórií ako lokálny '
               '`useState(false)` (pri zapnutí hlavného si zapamätá predošlé hodnoty); hlavný vypínač Správy nevypína; '
               '`useNotificationPreferences.ts` (123) pozná len dve serverové voľby a má texty chýb bez diakritiky a bez prekladu '
               '(nález 319); `Desktop.tsx` 293 a `Mobile.tsx` 220 riadkov; preklady sú v `frontend/messages/*.json` (šesť jazykov, '
               'blok `notifications`). (5) Kategória „Páči sa mi to a komentáre“ (opis „Reakcie a komentáre na fotkách, kde ste '
               'označení“) nemá v backende zodpovedajúcu udalosť: lajk a komentár dostane len autor príspevku a označený používateľ '
               'dostane len upozornenie o označení. PREDNASTAVENÉ ZAPNUTÉ (požiadavka majiteľa z 10. 11. 2026): server to už dnes '
               'spĺňa pre obe existujúce voľby; nové kategórie sa majú ukladať tak, aby „zapnuté“ bolo predvolené (zapnuté je každý, '
               'kto nič nevypol), vďaka čomu netreba dátovú migráciu ani kód pri registrácii a platí to rovnako pre nových aj '
               'existujúcich používateľov (tí dnes dostávajú všetko, takže sa pre nich nič nezmení). V rozhraní sa dnes kategórie len '
               'zdanlivo ukazujú ako „Vypnuté“, lebo ide o lokálny stav; po etape 3 ukážu skutočný stav (predvolene Zapnuté, bez '
               'falošného „Vypnuté“ počas načítania). Výnimka sú Správy (push): voľba je zapnutá, no doručuje sa až po povolení v '
               'prehliadači a registrácii odberu; to sa potichu nedá a na iPhone push funguje len z aplikácie pridanej na plochu, '
               'preto je potrebná výzva (R36). PLÁN PO ETAPÁCH: Etapa 0 (majiteľ): R34 (priradenie typov ku kategóriám), R35 (hlavný '
               'vypínač a žiadosti o zručnosť), R36 (výzva na povolenie push). Etapa 1 (backend, kolega, nasadí sa samostatne, lebo '
               'obsahuje migráciu): päť nových predvolene zapnutých polí v `UserProfile` (alebo jedno pole s vypnutými kategóriami), '
               'migrácia, rozšírenie `get_notification_preferences` a `update_notification_preferences`, `PushPreferencesSerializer` '
               '(spätne kompatibilné; nové kľúče voliteľné, neznámy kľúč sa odmietne), cesty `dashboard/settings/`, administrácie a '
               'testy (predvolené zapnuté pre nového aj starého používateľa, zmena po jednej kategórii, neznámy kľúč). Etapa 2 '
               '(backend, kolega): jedna tabuľka typ → kategória (alebo „vždy zapnuté“) a kontrola v `create_notification` hneď za '
               '`in_app_notifications`, nová žiadosť o zručnosť podľa R35, test, že každý `NotificationType` je v tabuľke alebo v '
               'zozname „vždy zapnuté“ (poistka pre nový typ), testy potlačenia a doručenia pre každú kategóriu. Etapa 3 (frontend, '
               'kolega; spolu s opravou 319, lebo menia tie isté súbory): `useNotificationPreferences` pre všetky kategórie s '
               'optimistickým ukladaním, vrátením hodnoty a prekladanou chybou, `NotificationSettingsModule` bez lokálnych `useState`, '
               'hlavný vypínač podľa R35, kostra alebo „načítavam“ namiesto falošného „Vypnuté“, výzva podľa R36, preklady v šiestich '
               'jazykoch a testy; všetky dotknuté súbory majú pod 320 riadkov. Etapa 4 (Codex, po etapách 2 a 3): E2E: zmena kategórie '
               'prežije obnovenie stránky (s vrátením pôvodnej hodnoty), vypnutá kategória nevytvorí upozornenie (dva testovacie účty '
               'a upratanie), `mobile-settings-navigation.spec.ts` po zmene rozhrania. Etapy vstúpia do fronty po rozhodnutiach R34 až '
               'R36; súvisí s nálezom 319 a s hotovým 308. '
               'ROZHODNUTÉ 10. 11. 2026 (majiteľ, R34 až R36): priradenie typov podľa návrhu: Páči sa mi to = lajky ponúk, portfólia, '
               'profilu a príspevkov; Páči sa mi to pre komentáre = lajky komentárov, aj odpovedí na komentáre (odpoveď je komentár s '
               'rodičom a jej lajk už dnes vytvára upozornenie), a recenzií; Komentáre = komentáre a odpovede na príspevky, nové '
               'recenzie a odpovede na recenzie; kategória „Páči sa mi to a komentáre“ sa premenuje a dostane nový opis (majiteľov '
               'príklad „Označenie v príspevku“, agent navrhuje „Označenie a zdieľanie príspevku“, lebo patrí sem aj zdieľanie); '
               'Žiadosť o zručnosť = žiadosti o zručnosť a ich priebeh; zhoda Sledovania a pozvánka do skupiny bez prepínača, vždy '
               'zapnuté. Hlavný vypínač „Vypnúť všetko“ vypne všetky možnosti v Upozorneniach okrem Správ (kategórie ostanú viditeľne '
               'vypnuté a po návrate sa vrátia ich hodnoty); nová žiadosť o zručnosť chodí aj pri ňom, ako dnes, kým majiteľ nepovie '
               'inak. Výzva na povolenie push pre nových používateľov ide do etapy 3 (R36 a). Najbližšie (12. 11. 2026): karta K20 (etapa '
               '3a: rozhranie kategórií a hlavný vypínač spolu s opravou 319), potom K21 (výzva na push, R36 a, spolu s toastom pri '
               '325) a E2E (Codex).',
         dec='ROZHODNUTIE R36', src='ručný test majiteľa po K14 (8. 11. 2026), kolega (K14), mapovanie agenta (10. 11. 2026) a K19 '
                                    '(kolega, 12. 11. 2026) s kontrolou agenta po zlúčení'),
    dict(n=325, bucket=P, imp=N, eff=EM, pkg='Recenzie',
         kratko='Mazanie recenzie: backend (odpoveď 204 bez tela) je hotový v K18 a manuálne testy prešli; zostáva toast „Recenzia bola '
               'vymazaná.“ po úspešnom zmazaní (R37 c)',
         what='ČIASTOČNE HOTOVÉ (K18, zlúčené v PR #255 dňa 12. 11. 2026, commit `f48d963e`): `review_detail_view` vracia pri '
               '`DELETE` `Response(status=204)` bez tela; nový test `accounts/test/test_review_delete_response.py` (3 testy, pohľad sa '
               'volá priamo, lebo testovací klient telo pri 204 sám odstráni; pred opravou padá 1, mutácie 5 z 5). Kolega to overil '
               'naživo (produkčný build Next s `BACKEND_ORIGIN` na lokálny gunicorn): so starým kódom DELETE skončil chybou '
               '`HPE_INVALID_CONSTANT`, cez proxy Next chybou `ECONNRESET` a v logu Next sa trikrát objavilo `Failed to proxy` (3 z '
               '3); s opraveným kódom prešiel DELETE (204, 0 B) aj nasledujúci GET zoznamu (200; 3 z 3). Odchýlka od mapovania agenta: '
               'zlyháva už samotný DELETE, nie až nasledujúci GET; príčina je tá istá (204 s telom), prejav závisí od miesta, kde '
               'parser narazí na zvyšné bajty. Ako sa to správalo za proxy na Railway, tu overiť nešlo. Agent nezávisle: 45 '
               'backendových testov prešlo, nový test pred opravou padá. Manuálne testy majiteľa po nasadení prešli (podľa karty '
               'vrátane vymazania vlastnej recenzie), takže príznaky zmizli a podmienka pre frontendové ošetrenie zlyhania načítania '
               '(R37 b) sa nenaplnila. ZOSTÁVA: toast „Recenzia bola vymazaná.“ po úspešnom zmazaní (R37 c). PÔVODNÝ OPIS A MAPOVANIE '
               '(10. a 11. 11. 2026): Ručný test majiteľa po K17 (10. 11. 2026): po úspešnom vymazaní recenzie zostáva otvorené '
               'potvrdzovacie okno, recenzia ostáva viditeľná až do opätovného otvorenia sekcie a nezobrazuje sa správny toast. Nie je '
               'to regresia z K17: K17 zmenila v `OfferReviewsView.tsx` len `alert()` na `toast.error` v chybovej vetve (diff má tri '
               'riadky). MAPOVANIE (agent, 11. 11. 2026, čítanie kódu na `main` `f9b2a1d4` a lokálna reprodukcia mechanizmu; v '
               'produkcii nepotvrdené). FRONTEND: obsluha potvrdenia v `OfferReviewsView.tsx` (riadky 583 až 605) po `api.delete` '
               'najprv čaká na `reloadReviews()` (ďalšia požiadavka, `GET` zoznamu recenzií) a až potom zavrie okno '
               '(`setReviewIdToDelete(null)`); akákoľvek výnimka z načítania zoznamu skončí v `catch`, ktorý ukáže „Nepodarilo sa '
               'vymazať recenziu.“ (`reviews.deleteReviewFailed`), okno nechá otvorené a zoznam neobnoví, hoci recenzia na serveri už '
               'neexistuje. Toast po úspešnom vymazaní kód neukazuje vôbec (kľúč neexistuje). BACKEND: `review_detail_view` '
               '(`accounts/views/reviews.py`, riadok 270) vracia pri `DELETE` stav 204 s telom `{"message": ...}`; HTTP zakazuje telo '
               'pri 204 a je to jediné z 13 miest s 204 v backende, ostatných 12 vracia 204 bez tela. REPRODUKCIA (agent, lokálne): '
               'gunicorn 23.0.0 (ako v produkcii) a klient Node 22 s keep-alive spojeniami (rovnako ako proxy `rewrites` v Next.js, '
               'cez ktorú ide `/api`): `DELETE` prejde so stavom 204, no hneď nasledujúca požiadavka na tom istom spojení zlyhá s '
               'chybou `HPE_INVALID_CONSTANT Parse Error: Expected HTTP/` a až ďalšia prejde; pri 204 bez tela prejdú všetky. '
               'Nasledujúca požiadavka je presne načítanie zoznamu z `reloadReviews()`, čo vysvetľuje všetky tri príznaky (chybový '
               'toast, otvorené okno, neobnovený zoznam). Nepotvrdené: pokus bol bez Railway a bez celého Next.js, takže v produkcii '
               'treba overiť v logoch frontendu na Railway, či sa v čase testu objavila chyba `Failed to proxy` s textom `Parse '
               'Error`, alebo v prehliadači stavy `DELETE` a hneď nasledujúceho `GET` (204 a potom 5xx).',
         note='Zostáva toast „Recenzia bola vymazaná.“ po úspešnom zmazaní (nový kľúč `reviews.deleteReviewSuccess` v šiestich '
               'jazykoch; R37 c). `OfferReviewsView.tsx` má 692 riadkov; majiteľ 11. 11. 2026 udelil výnimku (R37 b a c) s podmienkami '
               'R31: nová logika mazania (obsluha potvrdenia) ide do nového súboru a pôvodný súbor nesmie narásť, vlastný commit, '
               'test, ktorý bez zmeny padá, počty riadkov pred a po v texte commitu; ak sa to bez rastu súboru nedá, kolega sa zastaví '
               'a nahlási to bez zmeny kódu. Zavretie okna a odstránenie recenzie aj pri zlyhaní načítania zoznamu (R37 b) sa nerobí: '
               'príznaky po oprave backendu zmizli. Odhad: nízky · M.',
         dec='ROZHODNUTIE R37', src='ručný test majiteľa po K17 (10. 11. 2026), mapovanie agenta (11. 11. 2026) a K18 (kolega, 12. 11. 2026)'),
    dict(n=328, bucket=P, imp=N, eff=ES, pkg='Spoľahlivosť CI a testov',
         kratko='E2E: test `offer-watch-pagination-errors` (mobilný variant) vyžaduje tlačidlo „Vytvoriť sledovanie“ aj pri plnom '
                'limite piatich sledovaní',
         what='Report Codexa (celý beh na `main` `73173920`, 12. 11. 2026, pád č. 16, webkit-mobile, svetlý aj tmavý variant): test '
               '„results route shows guidance and opens management, not an empty desktop panel“ '
               '(`frontend/e2e/offer-watch-pagination-errors.spec.ts`, riadok 184) po otvorení správy sledovaní bezpodmienečne čaká na '
               'viditeľné tlačidlo „Vytvoriť sledovanie“. Agent overil v kóde (12. 11. 2026): `OfferWatchMobileListScreen.tsx` pri '
               '`watches.length >= MAX_OFFER_WATCHES` (riadok 62; limit je 5, backend `MAX_OFFER_WATCHES_PER_USER = 5`) tlačidlo '
               'odstráni a ukáže hlášku o limite (`role="status"`, riadok 91; od K16 s rezervou miesta, nález 309), kým sa zoznam '
               'načítava, je tlačidlo viditeľné, ale zakázané. Podľa Codexa má testovací účet päť sledovaní (súvisiaci scenár OW-12 sa '
               'v troch opakovaniach preskočil na dátovom strážcovi `owned.length >= 5` a účty sa počas merania nemenili), takže '
               'kontrola prejde len vtedy, keď trafí načítavací stav, a padne, keď sa zoznam stihne ustáliť; tri úspešné opakovania '
               'preto nie sú dôkaz ustáleného stavu. Aplikácia sa správa správne, chyba je v očakávaní testu. Dopad na používateľov: '
               'žiadny.',
         note='Návrh Codexa (až po súhlase majiteľa; E2E vlastní Codex, agent len eviduje): počkať na pôvodný `GET` uložených '
               'sledovaní a ustálený zoznam, overiť správny počet a podľa neho očakávať buď aktívne tlačidlo pri voľnom mieste, alebo '
               'hlášku a neprítomné tlačidlo pri limite; zachovať kontrolu správy, navigácie a Späť; nie slabé „alebo“ a nemazať '
               'existujúce sledovanie kvôli zelenému testu. Poznámka agenta: očakávanie sa odvodí z odpovede servera, takže test sa '
               'nezmäkčuje, no aby chyba v skrývaní tlačidla pri menej ako piatich sledovaniach nezostala nezachytená, treba overiť '
               'oba stavy (napr. skúška so zoznamom štyroch a piatich sledovaní, ak sa dá bez zmeny údajov účtu). Odhad: nízky · S.',
         dec=None, src='report Codexa (celý beh po K19, 12. 11. 2026) a kontrola agenta v kóde'),
]
