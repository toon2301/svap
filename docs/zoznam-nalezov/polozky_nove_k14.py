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
    dict(n=321, bucket=P, imp=S_, eff=EL, pkg='Upozornenia a push',
         kratko='Upozornenia: kategórie a hlavný vypínač (nedokončená funkcia; dokončiť pred štartom, R32 '
               'a); server (K19) aj rozhranie kategórií s hlavným vypínačom (K20, etapa 3a) sú hotové, zostáva výzva na push (K23) '
                'a E2E (etapa 4); odznak Žiadostí pri vypnutej kategórii (R39, nález 330) je hotový v K21',
         what='ČIASTOČNE HOTOVÉ (K19 a K20). '
               'ETAPA 3a (K20, zlúčené v PR #258 dňa 12. 11. 2026 o 21:56 UTC, merge `e26caa31`; päť commitov podľa karty `8525ce0e`, '
               '`cf22717e`, `02ea322b`, `a8f3ccf4` a `4a80caf0` a päť opráv po kontrolách botov `ddaf3a64`, `888762a4`, `6543df31`, '
               '`cd2c7fa0` a `dabf2e0b`): rozhranie je napojené na server. `useNotificationPreferences.ts` (245 riadkov po opravách) pozná '
               'všetkých sedem volieb, ukladá ich po jednej a optimisticky, pri zlyhaní vráti len zmenenú hodnotu a zápisy tej istej '
               'voľby idú po jednej, takže návrat po chybe vychádza z potvrdenej hodnoty; nové súbory `notificationPreferenceKeys.ts` '
               '(70), `useNotificationCategories.ts`, `useNotificationMaster.ts`, `preferenceSaveError.ts` a `settingsTypes.ts`. '
               '`NotificationSettingsModule.tsx` (150 → 73 riadkov) nemá lokálne `useState` kategórií; kým sa voľby načítavajú, je '
               'kostra rovnakej výšky (nie falošné „Vypnuté“), po zlyhaní načítania sú riadky zakázané a bez vybranej hodnoty (neznáma '
               'hodnota je `null`, aj pri Správach a hlavnom vypínači); chyba ukladania (aj bez internetu) je toast s jedným spoločným '
               'id. Hlavný vypínač „Vypnúť všetko“ je zapnutý práve vtedy, keď je `in_app_notifications` na serveri `false` (inverzne, '
               'R35): kategórie sa pri ňom ukážu ako „Vypnuté“ a zakázané, ich uložené hodnoty sa nemenia a po vypnutí sa vrátia, '
               'Správy ostávajú; `MasterToggle.tsx` má `role=switch` a `aria-checked` len pri známej polohe mimo načítavania a '
               'prístupný názov a opis cez `aria-labelledby` a `aria-describedby`. Kategória „Páči sa mi to a komentáre“ je '
               'premenovaná na „Označenie a zdieľanie príspevku“ (R34; kľúče `tagsAndShares` a `tagsAndSharesDesc`), '
               '`notifications.turnOffAllDesc` má novú vetu „Nové žiadosti o zručnosť budú chodiť ďalej.“ a pribudlo 11 kľúčov chýb v '
               'bloku `notifications`, všetko vo všetkých šiestich jazykoch. Štyri docstringy v '
               '`test_dashboard_settings_preferences.py` (len komentáre) sú doplnené. Oprava nálezu 319 je v tej istej dávke (pozri '
               'nález 319). ODCHÝLKY OD KARTY (podľa kolegu): `usePushMessagesPreference.ts` je rozdelený na '
               '`usePushMessagesPreferenceWith(controller)` a tenký obal (jeden zdieľaný stav volieb pre hlavný vypínač, Správy a '
               'kategórie); opis hlavného vypínača vidno len v mobilnom rozložení (desktopové rozloženie opis nikdy nemalo a karta '
               'menila len jeho text; otázka pre majiteľa, či chce vetu aj na počítači); časový limit visiacej požiadavky sa '
               'nezaviedol (karta ho zakazuje, `lib/api.ts` sa nemenil). OVERENIE PODĽA KOLEGU: nové testy hooku (37), offline pre '
               'Správy (3), kategórií (13 a 19), hlavného vypínača (13, 5, 4 a 7) a prekladov; mutácie 15 z 15, 11 z 11 a ďalšie v '
               'opravách; celý Jest po prvom commite 579 sád a 8 676 testov prešlo; tsc, ESLint a kontroly prekladov čisté; všetky '
               'dotknuté súbory pod 450 riadkov. KONTROLA AGENTA PO ZLÚČENÍ (13. 11. 2026, z GitHubu a z histórie): CI (`checks` a '
               '`backend-postgres`) a CodeRabbit sú zelené na hlavičke PR; štyri platné pripomienky botov sú opravené (Codex P2 a '
               'CodeRabbit Major: rýchle dvojité prepnutie dalo po zlyhaní zlú hodnotu; CodeRabbit Minor: predvolená hodnota sa po '
               'zlyhaní načítania ukazovala ako vybraná; dve pripomienky CodeRabbitu k prístupnosti hlavného vypínača); na GitHube '
               'ostali neuzavreté tri vlákna (zatvára majiteľ): Codex P1 (tvrdí, že autorom commitu je Codex a že zmeny patria Claude; '
               'autor všetkých desiatich commitov je Claude a oblasť aplikácie je Claudova, takže ide o chybné tvrdenie bota), Codex '
               'P2 (zastarané, opravené v `ddaf3a64`) a CodeRabbit Minor (opravené v `888762a4`). Samostatná strana kolegu prišla len '
               'pri 319 (krok 0 mapovania) a k agentovi sa nedostala. RUČNÉ TESTY MAJITEĽA PO NASADENÍ (13. 11. 2026, ešte '
               'prebiehajú): našli dve chyby: gulička pri Žiadostiach pri vypnutej kategórii (nález 330, rozhodnutie R39) a zaseknuté '
               'tlačidlo v okne „Pridať recenziu“ (nález 331, nesúvisí s K20). '
               'ETAPY 1 A 2 (K19, zlúčené v PR #257 dňa 12. 11. 2026 o 13:02 UTC, merge `73173920`; commity `204f8154`, '
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
               'počiatočná žiadosť v kategórii) test zachytil 3 z 3. Manuálne testy majiteľa po nasadení nenašli nález. ZOSTÁVA (stav 15. 11. 2026, po K22): (a) etapa 3b (K23, karta `karty/K23.md`): výzva na '
               'povolenie push pre Správy (R36 a: jednorazová odmietnuteľná výzva s tlačidlom v Nastaveniach → Upozornenia a s návodom pre '
               'iPhone; mapovanie agenta je nižšie); (b) hotové v K21 (PR #260, nález 330): odznak Žiadostí pri vypnutej kategórii „Žiadosť o '
               'zručnosť“ sa nerozsvieti (rozhodnutie R39); (c) rozhodnutie majiteľa, či sa nová veta v opise hlavného vypínača má ukázať aj '
               'na počítači; (d) etapa 4 (Codex; K20 aj K21 sú nasadené): API test siedmich volieb (jedna zmena a návrat pôvodnej hodnoty) '
               'a scenár so žiadosťou o zručnosť a odznakom (dva účty a upratanie) môžu ísť hneď, E2E zmena kategórie s vrátením pôvodnej '
               'hodnoty a kontrola `mobile-settings-navigation.spec.ts` až po nasadení K23, lebo K23 mení tú istú obrazovku; (e) ručné testy '
               'majiteľa po K20 priniesli 330 a 331 (obe hotové v K21), po K21 priniesli 334 a 335 (obe hotové v K22) a po K22 prešli bez '
               'nového nálezu. '
               'MAPOVANIE K23 (agent, 15. 11. 2026, len čítanie kódu na `main` `52626ab7`; návrh, nie dôkaz): `Notification.requestPermission()` '
               'sa v aplikácii volá na jedinom mieste, v `enablePushMessages()` (`usePushMessagesPreference.ts`, 368 riadkov, riadok 267), a '
               'to len keď používateľ sám stlačí „Zapnuté“ pri Správach. Nový používateľ má v databáze `push_notifications` zapnuté; pri '
               'povolení `default` ukáže obrazovka „Zapnuté“ a žiadne varovanie (`getPassiveBrowserWarning` pozná len nepodporu, `denied` a '
               '`granted` bez odberu) a automatická registrácia odberu čaká na `granted`, takže nič nechodí a nič to nenaznačuje. Návrh: '
               'nový hook `usePushPermissionPrompt.ts` (variant `enable` je viditeľný, keď je voľba Správ výslovne zapnutá, voľby sa '
               'načítali, prehliadač push podporuje, povolenie je `default` a výzvu používateľ neodmietol; variant `ios-install` je '
               'viditeľný, keď je voľba Správ výslovne zapnutá, voľby sa načítali, iPhone alebo iPad je mimo nainštalovanej aplikácie a '
               'výzvu používateľ neodmietol, bez ohľadu na podporu push, lebo ju Safari tam nezverejňuje; výsledok sa počíta počas '
               'vykresľovania ako pasívne '
               'varovanie, nález 308), komponent `PushPermissionPrompt.tsx` pod voľbou Správy v oboch rozloženiach (vlastné `data-testid`, '
               'obal `notifications-push-messages-*` ostáva) s tlačidlom „Zapnúť upozornenia na správy v tomto zariadení“ (volá existujúce '
               '`enablePushMessages`) a odmietnutím „Nie teraz“ (príznak v `localStorage` tohto prehliadača, výzva sa nevráti), pomocník '
               '`pushPlatform.ts` na zistenie iPhonu a iPadu mimo nainštalovanej aplikácie (podľa dokumentácie Apple tam Safari '
               '`Notification` a `PushManager` nezverejňuje, takže tlačidlo by nič neurobilo a výzva ukáže len návod: Zdieľať, Pridať na '
               'plochu a Svaply otvoriť z ikony), päť nových kľúčov v bloku `notifications` v šiestich jazykoch a testy hooku, komponentu a '
               'celého modulu. Backend, `sw.js`, `pushBrowser.ts` a existujúce pasívne varovania (308) sa nemenia a všetky dotknuté súbory '
               'ostanú pod 400 riadkov. Výzva sa ukáže aj existujúcim používateľom so zapnutými Správami a povolením `default`. Správanie '
               'iOS z kódu nemožno overiť, overí majiteľ na iPhone. Dopad na E2E: `mobile-settings-navigation.spec.ts` overuje len '
               'viditeľnosť obalu `notifications-push-messages-mobile`; v Playwrighte je povolenie `default`, takže účty so zapnutými '
               'Správami uvidia novú výzvu pod voľbou Správy. '
               'PÔVODNÝ OPIS A MAPOVANIE (8. a 10. 11. 2026): '
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
               'vypnuté a po návrate sa vrátia ich hodnoty); nová žiadosť o zručnosť sa pri ňom doručí do Žiadostí, no bez odznaku (R39 b, K21). '
               'Výzva na povolenie push pre nových používateľov ide do etapy 3 (R36 a). Najbližšie (15. 11. 2026): K20 (etapa '
               '3a), K21 (odznak Žiadostí, nález 330) a K22 sú zlúčené; teraz K23 (výzva na push, R36 a; karta `karty/K23.md`) a E2E (Codex).',
         dec='ROZHODNUTIE R36', src='ručný test majiteľa po K14 (8. 11. 2026), kolega (K14), mapovanie agenta (10. 11. 2026) a K19 a K20 '
                                    '(kolega, 12. 11. 2026), ručný test po K20 (13. 11. 2026) s kontrolou agenta po zlúčení a mapovanie K23 (agent, 15. 11. 2026)'),
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
    dict(n=336, bucket=P, imp=N, eff=ES, pkg='Recenzie',
         kratko='Recenzie: pri vypnutom internete ukáže okno „Pridať recenziu“ anglické „Network Error“ (záložný text v `onSubmit`; '
                'súbor nad 500 riadkov, treba výnimku majiteľa)',
         what='Kandidát kolegu (K15 a znova K22, 15. 11. 2026): pri vypnutom internete ukáže okno „Pridať recenziu“ (mobil aj počítač) '
               'surovú anglickú hlášku „Network Error“ namiesto preloženého textu; kolega to v K22 potvrdil v prehliadači v oboch oknách. '
               'PRÍČINA (kód, agent 15. 11. 2026): `OfferReviewsView.tsx` (683 riadkov), `onSubmit` (riadky 655 až 661) skladá záložný '
               'text ako `error.message || …`; chyba axiosu bez odpovede servera (výpadok siete) nesie len `error.message` „Network '
               'Error“, takže `getFieldErrorMessage(error, fallback)` vráti práve tento text a okná ho ukážu (`AddReviewModalMobile.tsx` '
               'riadok 144 a `AddReviewModalDesktop.tsx` riadok 141 zobrazia `err.message`). Rovnaký druh chyby ako nález 306 (surový '
               '„Network Error“ v hláškach, v K15 hotový pre iné miesta); `getApiErrorMessage` v `lib/apiError.ts` pri výpadku siete '
               'vracia záložný text a túto medzeru nemá. Záložné slovenské texty pri pridaní a úprave sú navyše napevno v kóde bez '
               '`t()`.',
         note='Návrh opravy (agent z čítania kódu, nie dôkaz): v `onSubmit` nepoužiť `error.message` ako záložný text a pri výpadku '
               'siete vrátiť preložený text cez `t()` (rovnaká logika ako `getApiErrorMessage`); texty pri pridaní a úprave cez `t()` v '
               'šiestich jazykoch. `OfferReviewsView.tsx` má nad 500 riadkov, takže oprava vyžaduje výnimku majiteľa (vzor: R37 b a c v '
               'K21: nová logika do nového súboru, pôvodný súbor nesmie narásť); logické je spojiť ju s dvoma poznámkami kolegu k tomu '
               'istému `onSubmit` (duplicitný blok zneplatnenia cache ponúk a prípad, keď odoslanie prejde a načítanie zoznamu zlyhá; '
               'obe v `poznamky.md`). Zatiaľ nie je vo fronte: čaká na výnimku majiteľa. Odhad: nízky · S. Dopad na E2E: žiadny.',
         dec=None, src='kandidát kolegu (K15 a K22) a kontrola agenta v kóde (15. 11. 2026)'),
]
