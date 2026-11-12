# -*- coding: utf-8 -*-
"""Nové nálezy od čísla 305: kandidáti kolegu z K13 a K14, ručné testy majiteľa po K14 (8. 11. 2026) a diagnostika a video majiteľa
z 9. 11. 2026 (322 až 324) a ručné testy majiteľa po K17 s mapovaním agenta z 11. 11. 2026 (325 až 327).

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
               'Odhad kolegu: nízky · M. MAPOVANIE K17 (kolega, 10. 11. 2026; agentovi zatiaľ prišlo len zhrnutie, úplná strana '
               'mapovania so zoznamom modulov a meraniami ešte nie): moduly Správy a Žiadosti majú napriek stráži `isResolved` posun '
               '0,022 a 0,031; kolega navrhuje opravu v hooku `useIsMobile` cez `useSyncExternalStore` (odhad M) a žiada súhlas '
               'majiteľa (karta K17: kód sa nemení, kým nepovie majiteľ). Agent: spoločný hook používa veľa komponentov a oprava '
               'nezlepší prvé vykreslenie na serveri (SSR), preto najprv potrebuje zoznam modulov a merania pred a po; ak majiteľ '
               'súhlasí, ide samostatne s testom hydratácie a s dymom `@smoke` pred zlúčením.',
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
               'a); mapovanie, plán a rozhodnutia R34 až R36 sú hotové; ďalej dávka K19 (etapy 1 a 2, backend)',
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
               'inak. Výzva na povolenie push pre nových používateľov ide do etapy 3 (R36 a). Najbližšie: karta K19 (etapy 1 a 2, '
               'backend), potom etapa 3 spolu s opravou 319.',
         dec='ROZHODNUTIE R36', src='ručný test majiteľa po K14 (8. 11. 2026), kolega (K14) a mapovanie agenta (10. 11. 2026)'),
    dict(n=325, bucket=P, imp=S_, eff=EM, pkg='Recenzie',
         kratko='Mazanie recenzie: po úspešnom zmazaní ostane otvorené okno aj recenzia a ukáže sa chybový toast; príčinou je odpoveď '
               '204 s telom, po ktorej zlyhá nasledujúca požiadavka',
         what='Ručný test majiteľa po K17 (10. 11. 2026): po úspešnom vymazaní recenzie zostáva otvorené potvrdzovacie okno, recenzia '
               'ostáva viditeľná až do opätovného otvorenia sekcie a nezobrazuje sa správny toast. Nie je to regresia z K17: K17 '
               'zmenila v `OfferReviewsView.tsx` len `alert()` na `toast.error` v chybovej vetve (diff má tri riadky). MAPOVANIE '
               '(agent, 11. 11. 2026, čítanie kódu na `main` `f9b2a1d4` a lokálna reprodukcia mechanizmu; v produkcii nepotvrdené). '
               'FRONTEND: obsluha potvrdenia v `OfferReviewsView.tsx` (riadky 583 až 605) po `api.delete` najprv čaká na '
               '`reloadReviews()` (ďalšia požiadavka, `GET` zoznamu recenzií) a až potom zavrie okno (`setReviewIdToDelete(null)`); '
               'akákoľvek výnimka z načítania zoznamu skončí v `catch`, ktorý ukáže „Nepodarilo sa vymazať recenziu.“ '
               '(`reviews.deleteReviewFailed`), okno nechá otvorené a zoznam neobnoví, hoci recenzia na serveri už neexistuje. Toast '
               'po úspešnom vymazaní kód neukazuje vôbec (kľúč neexistuje). BACKEND: `review_detail_view` '
               '(`accounts/views/reviews.py`, riadok 270) vracia pri `DELETE` stav 204 s telom `{"message": ...}`; HTTP zakazuje telo '
               'pri 204 a je to jediné z 13 miest s 204 v backende, ostatných 12 vracia 204 bez tela. REPRODUKCIA (agent, lokálne): '
               'gunicorn 23.0.0 (ako v produkcii) a klient Node 22 s keep-alive spojeniami (rovnako ako proxy `rewrites` v Next.js, '
               'cez ktorú ide `/api`): `DELETE` prejde so stavom 204, no hneď nasledujúca požiadavka na tom istom spojení zlyhá s '
               'chybou `HPE_INVALID_CONSTANT Parse Error: Expected HTTP/` a až ďalšia prejde; pri 204 bez tela prejdú všetky. '
               'Nasledujúca požiadavka je presne načítanie zoznamu z `reloadReviews()`, čo vysvetľuje všetky tri príznaky (chybový '
               'toast, otvorené okno, neobnovený zoznam). Nepotvrdené: pokus bol bez Railway a bez celého Next.js, takže v produkcii '
               'treba overiť v logoch frontendu na Railway, či sa v čase testu objavila chyba `Failed to proxy` s textom `Parse '
               'Error`, alebo v prehliadači stavy `DELETE` a hneď nasledujúceho `GET` (204 a potom 5xx).',
         note='Návrh v dvoch krokoch. (1) Backend (dávka K18): pri `DELETE` vrátiť `Response(status=status.HTTP_204_NO_CONTENT)` bez '
               'tela, ako ostatné miesta; frontend správu `message` nečíta (`OfferReviewsView.tsx` výsledok `api.delete` nepoužíva, '
               'agent overil). Test volá pohľad priamo (`APIRequestFactory`), lebo testovací klient Djanga telo pri 204 sám odstráni a '
               'cez `APIClient` by chybu nezachytil. `accounts/views/reviews.py` má 511 riadkov (pravidlo pre produkčný backend: '
               'rozdeliť, ak je to bezpečné, inak nahlásiť a pokračovať), zmena je jeden riadok. (2) Frontend (samostatná karta po '
               'nasadení kroku (1) a ručnom overení majiteľom): po úspechu vždy ukázať toast „Recenzia bola vymazaná.“ (nový kľúč '
               '`reviews.deleteReviewSuccess` v šiestich jazykoch) a len ak príznaky po kroku (1) ostanú, po úspešnom `api.delete` '
               'hneď zavrieť okno a odstrániť recenziu zo stavu a načítanie zoznamu dať do vlastného `try/catch`, aby jeho zlyhanie '
               'nezobrazilo chybu o mazaní. `OfferReviewsView.tsx` má 692 riadkov; majiteľ 11. 11. 2026 udelil výnimku (R37 b a c) s '
               'podmienkami R31: nová logika mazania ide do nového súboru a pôvodný súbor nesmie narásť. Odhad: stredný · M (backend '
               'S).',
         dec='ROZHODNUTIE R37', src='ručný test majiteľa po K17 (10. 11. 2026) a mapovanie agenta (11. 11. 2026)'),
    dict(n=326, bucket=P, imp=S_, eff=ES, pkg='Ponuky (úprava a tagy)',
         kratko='Mobilná úprava ponuky: zmazanie jednej fotky zmaže z editora vizuálne všetky (server zmaže len jednu); príčinou je '
               '`return data?.images || []` pri odpovedi 204 bez tela',
         what='Ručný test majiteľa po K17 (10. 11. 2026): po odstránení jednej fotografie z editora vizuálne zmiznú všetky '
               'fotografie; po aktualizácii karty zostanú ostatné správne zachované. Nie je to regresia z K17 (K17 zmenila len chybové '
               'vetvy, úspešná vetva je rovnaká ako v najstaršej stope histórie z 24. 9. 2026). MAPOVANIE (agent, 11. 11. 2026, '
               'čítanie kódu na `main` `f9b2a1d4`): v mobilnej obrazovke Popis ponuky `handleRemoveExistingImageClick` '
               '(`useSkillsDescriptionScreenState.ts`, riadok 503; volá ho `SkillsDescriptionMobileLayout.tsx`, riadok 404) hneď zmaže '
               'fotku na serveri cez `onRemoveExistingImage` zo `SkillsModuleRouter.tsx` (riadky 452 až 466), ktorá vracia '
               '`data?.images || []`. Server (`skill_image_detail_view`, `accounts/views/skills.py`, riadok 482) vracia 204 bez tela, '
               'takže `data` je prázdny reťazec a funkcia vráti `[]`; hook pokladá prázdne pole za nový zoznam fotiek '
               '(`Array.isArray([])` je pravda) a nahradí ním všetky existujúce fotky, aj keď server zmazal len jednu. Vetva, ktorá by '
               'z lokálneho stavu odstránila len zmazanú fotku (`existingImages.filter(...)`), sa tak nikdy nevykoná. Desktopová cesta '
               '(`useSkillsModals.handleRemoveSkillImage`) po zmazaní načíta detail ponuky a vracia skutočný zoznam, takže sa netýka. '
               'Na údajoch škoda nie je: ostatné fotky ostávajú na serveri, preto ich po aktualizácii karty vidno; hypotéza '
               '(neoverené): počítadlo povolených nových fotiek v editore počíta s prázdnym zoznamom a dovolí vybrať viac fotiek, než '
               'je limit.',
         note='Návrh: vrátiť zo `SkillsModuleRouter.tsx` `data?.images` (bez `|| []`), takže pri odpovedi bez zoznamu funkcia vráti '
               '`undefined` a hook odstráni z lokálneho stavu len zmazanú fotku; typ `Promise<SkillImage[] | void>` to už dovoľuje. Je '
               'to jeden riadok v súbore nad 500 riadkov (`SkillsModuleRouter.tsx`, 580 riadkov); majiteľ 11. 11. 2026 udelil výnimku '
               'R37 (a) s podmienkami ako pri R31 (vlastný commit, test, ktorý bez zmeny padá, v diffe len ten riadok, počet riadkov '
               'sa nezvýši), takže alternatíva cez backend (zoznam zvyšných fotiek so stavom 200) sa nepoužije. Test: smerovač s '
               'odpoveďou `{ status: 204, data: "" }` nesmie vrátiť prázdne pole a hook s dvoma fotkami po zmazaní jednej druhú '
               'ponechá (existujúci test z K17 používa `mockResolvedValue([])`, čo je presne chybný predpoklad). Odhad: stredný · S.',
         dec='ROZHODNUTIE R37', src='ručný test majiteľa po K17 (10. 11. 2026) a mapovanie agenta (11. 11. 2026)'),
    dict(n=327, bucket=P, imp=S_, eff=EM, pkg='Recenzie',
         kratko='Formulár recenzie (mobil aj desktop): plus a mínus sa pridá len klávesom Enter, tlačidlo chýba a nepotvrdený text sa '
               'pri uložení potichu zahodí',
         what='Ručný test majiteľa po K17 (10. 11. 2026): na mobile pri vytváraní aj úprave recenzie chýba možnosť potvrdiť zadaný '
               'plus alebo mínus, preto sa položka neuloží. Nie je to regresia z K17 (súbory formulára K17 nemenila). MAPOVANIE '
               '(agent, 11. 11. 2026, čítanie kódu na `main` `f9b2a1d4`): v `AddReviewModalMobile.tsx` (307 riadkov, riadky 93 až 107 '
               'a 219 až 267) aj v `AddReviewModalDesktop.tsx` (317 riadkov) sa plus a mínus pridá do zoznamu iba klávesom Enter '
               '(`onKeyDown`, funkcie `addPro` a `addCon`); tlačidlo na potvrdenie neexistuje a text napísaný do vstupu, ktorý sa '
               'nepotvrdil, `handleSubmit` do odoslania nezahrnie (posiela len `pros` a `cons`), takže sa potichu zahodí. Opis v poli '
               '(„Napíšte plus a stlačte Enter“) na mobile nepomáha, ak používateľ nevie, že má použiť Enter, alebo ak klávesnica '
               'Enter neodošle. Či Enter na iPhone odošle `keydown`, z kódu nepoznať (neoverené: treba v prehliadači s emuláciou '
               'iPhonu a na zariadení).',
         note='Návrh: (1) pri oboch vstupoch v mobilnom formulári viditeľné tlačidlo na pridanie (ikona plus, `aria-label` s novými '
               'kľúčmi v šiestich jazykoch), ktoré zavolá existujúce `addPro` a `addCon`; (2) pri odoslaní (`handleSubmit`) sa '
               'nepotvrdený text vo vstupoch pridá do `pros` a `cons` (v rámci limitu 10 položiek a 120 znakov), v mobilnom aj '
               'desktopovom formulári, aby sa nič potichu nestratilo; spoločná pomocná funkcia môže ísť do `addReviewModalShared.ts` '
               '(31 riadkov). Oba formuláre majú pod 320 riadkov, výnimka netreba. Test: napísať text do vstupu a kliknúť na tlačidlo '
               '(položka sa objaví a vstup sa vyčistí), napísať text a rovno odoslať (`onSubmit` dostane položku), limit 10 položiek, '
               'úprava existujúcej recenzie. Odhad: stredný · M.',
         dec=None, src='ručný test majiteľa po K17 (10. 11. 2026) a mapovanie agenta (11. 11. 2026)'),
]
