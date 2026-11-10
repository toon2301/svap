# -*- coding: utf-8 -*-
"""Nové nálezy od čísla 305: kandidáti kolegu z K13 a K14, ručné testy majiteľa po K14 (8. 11. 2026) a diagnostika a video majiteľa
z 9. 11. 2026 (322 až 324).

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
    dict(n=311, bucket=P, imp=N, eff=EM, pkg='Plynulosť prechodov (mobil)',
         kratko='`useIsMobile()` začína ako „desktop“; ďalšie vetvy `ModuleRouter` môžu mať prázdny prvý snímok ako Súkromie',
         what='Kolega pri K14 (8. 11. 2026): `useIsMobile()` (`frontend/src/hooks/useIsMobile.ts`) vracia v prvom vykreslení `false` '
               '(stav `isResolved: false`). V `ModuleRouter.tsx` (439 riadkov) sú aj ďalšie vetvy `isMobile ? A : B` (napr. '
               'sledovania), ktoré môžu mať rovnaký prázdny prvý snímok ako mal modul Súkromie (12 až 24 ms), kým ho K14 nevyriešila '
               'rozložením cez CSS. Hypotéza, nezmerané.',
         note='Zvyšok po 286. Najprv mapovanie (ktoré moduly), potom podľa nálezu: rozloženie cez CSS alebo čakanie na `isResolved`. '
               'Odhad kolegu: nízky · M.',
         dec=None, src='K14 (kolega)'),
    dict(n=312, bucket=A, imp=N, eff=ES, pkg='Prístupnosť',
         kratko='Blokovaní používatelia: chyba načítania nemá `role=alert`',
         what='Kolega pri K14 (8. 11. 2026): v `BlockedUsersModule.tsx` (279 riadkov) je chyba načítania (`loadError`, riadok 223) '
               'obyčajný odsek bez `role=alert`, takže ju čítač obrazovky neoznámi. Rovnaký vzor označil CodeRabbit v PR #245 pri '
               '`PushMessagesStatus.tsx` a tam je opravený. Agent to overil v kóde.',
         note='Návrh: pridať `role=alert` a test. Odhad kolegu: nízky · S.',
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
               'kým 321 neprepojí aj ostatné kategórie.',
         dec=None, src='ručný test majiteľa po K14 a mapovanie agenta (8. 11. 2026)'),
    dict(n=321, bucket=P, imp=S_, eff=EL, pkg='Upozornenia a push',
         kratko='Upozornenia: päť kategórií a hlavný vypínač nie sú napojené na server (nedokončená funkcia; dokončiť pred štartom, R32 '
               'a); mapovanie a plán po etapách sú hotové, čaká sa na R34 až R36',
         what='Ručný test majiteľa po K14 (8. 11. 2026) a nález kolegu z K14: v Nastaveniach → Upozornenia je šesť kategórií: Správy, '
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
               'vytvára 22 typov (`NotificationType`): lajky ponúk, portfólia, profilu a príspevkov, lajky komentárov a recenzií, '
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
               'R36; súvisí s nálezom 319 a s hotovým 308.',
         dec='ROZHODNUTIE R34', src='ručný test majiteľa po K14 (8. 11. 2026), kolega (K14) a mapovanie agenta (10. 11. 2026)'),
]
