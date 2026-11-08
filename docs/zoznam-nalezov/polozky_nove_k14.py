# -*- coding: utf-8 -*-
"""Nové nálezy od čísla 305: kandidáti kolegu z K13 a K14 a ručné testy majiteľa po K14 (8. 11. 2026).

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
    dict(n=306, bucket=P, imp=N, eff=ES, pkg='Preklady a hlášky',
         kratko='`getApiErrorMessage` ukáže surový „Network Error“ z axiosu skôr než preložený záložný text',
         what='Kolega pri K13 a K14 (8. 11. 2026): `frontend/src/lib/apiError.ts` (`getApiErrorMessage`) berie text v poradí '
               '`data.error`, `data.detail`, `data.message`, `error.message` axiosu a až potom záložný text. Pri sieťovej chybe '
               '(offline, výpadok) preto používateľ dostane v toaste anglické „Network Error“ namiesto preloženého záložného textu. '
               'Agent poradie overil v kóde.',
         note='Návrh kolegu: pri chybe bez odpovede servera (v axiosu chýba `error.response`) uprednostniť preložený záložný text. '
               'Súvisí s nálezom 319 (hlášky pri offline). Odhad kolegu: nízky · S. Vzhľadová vec, preto PRED NASADENÍM.',
         dec=None, src='K14 (kolega)'),
    dict(n=307, bucket=A, imp=N, eff=EM, pkg='Nástroje a testy',
         kratko='doslovné testovacie heslo `StrongPass123` v 94 súboroch (206 výskytov)',
         what='Kolega pri K14 (8. 11. 2026): doslovné testovacie heslo `StrongPass123` je v starých testoch backendu aj frontendu v '
               '206 výskytoch v 94 súboroch (agent 8. 11. 2026 spočítal rovnako). Je to testovací údaj, no `AGENTS.md` hovorí o '
               'heslách v kóde a nástroje na hľadanie tajomstiev ho môžu hlásiť.',
         note='Návrh kolegu: nahradiť heslom generovaným v teste alebo spoločnou konštantou. Veľký mechanický zásah bez zmeny '
               'správania, preto po nasadení. Odhad kolegu: nízky · M.',
         dec=None, src='K14 (kolega)'),
    dict(n=308, bucket=P, imp=N, eff=EM, pkg='Plynulosť prechodov (mobil)',
         kratko='Upozornenia: varovanie pri uloženom „Zapnuté“ a blokovanom alebo nepodporovanom push po načítaní posunie obsah',
         what='Kolega pri K14 (8. 11. 2026, merané v Chromiu): keď je uložená voľba Správ „Zapnuté“, no push je v prehliadači '
               'blokovaný alebo nepodporovaný, varovanie sa objaví až po načítaní a posunie obsah o 28 px na desktope a o 68 px na '
               'mobile. Chyba sa počíta v efekte (`usePushMessagesPreference.ts`), takže príde o snímok neskôr než voľba.',
         note='Zvyšok po 286. Návrh kolegu: odvodiť chybu počas renderu (nie v efekte) alebo vyhradiť miesto. Odhad kolegu: nízky · '
               'M. Merania agent nezopakoval.',
         dec=None, src='K14 (kolega)'),
    dict(n=309, bucket=P, imp=N, eff=ES, pkg='Plynulosť prechodov (mobil)',
         kratko='Sledovanie na mobile: odznak „0 / 5“ počas načítavania a po načítaní nahradí tlačidlo hláška o limite',
         what='Kolega pri K14 (8. 11. 2026, Chromium): na mobilnom zozname Sledovaní odznak ukáže „0 / 5“ počas načítavania a pri 5 / '
               '5 po načítaní nahradí tlačidlo „Vytvoriť sledovanie“ hláška o limite (CLS 0,033). Týka sa '
               '`offer-watch/mobile/OfferWatchMobileListScreen.tsx` (151 riadkov).',
         note='Zvyšok po 286. Návrh kolegu: počas načítavania počet neukazovať a miesto vyhradiť. Odhad kolegu: nízky · S.',
         dec=None, src='K14 (kolega)'),
    dict(n=310, bucket=P, imp=N, eff=ES, pkg='Plynulosť prechodov (mobil)',
         kratko='desktopové Sledovanie ukáže kostru hneď a tá problikne pred prázdnym stavom',
         what='Kolega pri K14 (8. 11. 2026): desktopové Sledovanie (`OfferWatchSettingsDesktop`, `OfferWatchSettingsSkeleton`) ukáže '
               'kostru hneď a tá problikne pred prázdnym stavom, rovnako ako mobilné pred K14.',
         note='Zvyšok po 286 (K14 opravila mobil, Blokované, Upozornenia a Súkromie). Návrh kolegu: použiť `DelayedSkeleton`. Odhad '
               'kolegu: nízky · S.',
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
    dict(n=318, bucket=H, imp=S_, eff=EM, pkg='Produkčná odolnosť aplikácie',
         kratko='push upozornenia na správy na iPhone neprichádzajú po nasadení K14 (podozrenie na regresiu, príčina nepotvrdená)',
         what='Ručný test majiteľa po K14 (8. 11. 2026, produkcia, iPhone s nainštalovanou PWA): hlásenia pre Svaply sú v iPhone '
               'povolené, upozornenia na správy vo Svaply zapnuté, telefón je zamknutý a z druhého testovacieho účtu sa pošle správa. '
               'Správa sa doručí do konverzácie, no push nepríde. Majiteľ potvrdil, že pred nasadením K14 push fungoval. Príčina nie '
               'je potvrdená; ide o jeden test bez logov.',
         note='Mapovanie agenta (8. 11. 2026, len čítanie a skúška v oddelenom prostredí). (1) K14 zmenila '
               '`usePushMessagesPreference.ts` len pridaním `initialLoading`; logika zapnutia, registrácie a zrušenia odberu je '
               'nezmenená, ostatné zmeny sú vzhľad sekcie Upozornenia. (2) Zámok závislostí (nález 244) balíky pre push zrejme '
               'nepohol: agent rekonštruoval rozlíšenie pôvodného `requirements.txt` k 5. a 6. 11. 2026 a proti zámku sa líšili len '
               '`cbor2` a `click`; `pywebpush` 2.5.0, `py-vapid` 1.9.6, `http_ece` 1.2.1, `cryptography` 50.0.2 a `celery` 5.7.0 sú '
               'rovnaké (skutočné verzie na Railway ukáže `pip freeze` z `backend-http`). (3) Šifrovanie a podpis VAPID so zamknutými '
               'verziami fungujú: skúška proti lokálnemu falošnému koncovému bodu dala HTTP 201 (`aes128gcm`, schéma `vapid`) pre kľúč '
               'v oboch formátoch. (4) Doručenie je v `accounts/services/webpush_delivery.py` a každé volanie zapíše riadok '
               '`message_push_delivery_summary` s počtami `recipient_count`, `rollout_skipped_count`, `suppressed_count`, '
               '`subscription_count`, `delivered_count`, `retry_count`, `gone_count`, `permanent_failure_count` a prípadne '
               '`skipped_reason`. Z neho sa dá určiť, kde push zanikol: vypnuté alebo rollout pod 100 %, potlačené prítomnosťou '
               '(príjemca mal tú konverzáciu viditeľnú do 35 s od poslednej aktivity), žiadny aktívny odber, zrušený odber '
               '(`gone_count`), trvalá chyba, alebo doručené službe Apple a problém je na zariadení. Odpoveď 404 alebo 410 odber '
               'natrvalo deaktivuje, takže potom push nepríde, kým ho používateľ nevypne a nezapne. Ďalší krok: majiteľ z logov '
               'Railway (worker a web) okolo času testu pošle len počty a `skipped_reason` z tohto riadku, bez ID. Ak riadok chýba, '
               'úloha sa nespustila (pozrieť logy workera). Ak je `delivered_count` rovné 1, ide o zariadenie (nastavenia iPhonu, '
               'režim Sústredenie, PWA pridaná na plochu). Za dokázanú regresiu K14 to nepovažovať, kým logy nepovedia inak. Dopad na '
               'E2E: žiadny.',
         dec=None, src='ručný test majiteľa po K14 a mapovanie agenta (8. 11. 2026)'),
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
               'hneď ukázať chybu; súvisí s nálezom 306. Odhad: nízky · M.',
         dec=None, src='ručný test majiteľa po K14 a mapovanie agenta (8. 11. 2026)'),
    dict(n=320, bucket=P, imp=S_, eff=ES, pkg='Profil a identita',
         kratko='Zmena hesla: na iPhone s tmavým systémom sú polia čierne na svetlej karte',
         what='Ručný test majiteľa po K14 (8. 11. 2026, iPhone, odkaz z e-mailu otvorený v Safari, stránka „Zmena hesla“; screenshot '
               'dostal agent): obe polia („Nové heslo“ a „Potvrdenie hesla“) majú čierne pozadie, hoci zvyšok stránky je svetlý (biela '
               'karta, tmavý text, modré tlačidlo). Očakávané: polia v rovnakom vzhľade ako zvyšok formulára. Potvrdená vizuálna '
               'chyba.',
         note='Mapovanie agenta (8. 11. 2026, len čítanie; príčina je z kódu, nie z ladenia na iPhone): '
               '`frontend/src/app/reset-password/[uidb64]/[token]/ResetPasswordClient.tsx` (350 riadkov) je navrhnutý len ako svetlá '
               'stránka (`bg-white`, `text-gray-900`), no oba vstupy nemajú žiadnu triedu pozadia ani farby textu. '
               '`frontend/src/app/layout.tsx` (riadky 70 a 71) pritom hlási `color-scheme` „light dark“, takže WebKit kreslí ovládacie '
               'prvky bez vlastného pozadia podľa systému: na iPhone v tmavom vzhľade sú čierne (majiteľ označil režim ako svetlý, '
               'treba overiť vzhľad iPhonu). Ostatné formuláre to majú ošetrené (`CredentialsSection.tsx` registrácie: `bg-white '
               'dark:bg-black text-gray-900 dark:text-white`). Pole e-mailu na `forgot-password/page.tsx` tiež nemá triedu pozadia; '
               'stránka používa tmavé varianty (`dark:`), takže rozpor tam môže vzniknúť, keď je téma aplikácie svetlá a systém tmavý '
               '(neoverené). Návrh: do oboch polí `bg-white text-gray-900` (alebo `[color-scheme:light]` na karte) a rovnaká kontrola '
               'na `forgot-password`, `verify-email` a `delete-account`; test tried. Odhad: stredný · S.',
         dec=None, src='ručný test majiteľa po K14 a mapovanie agenta (8. 11. 2026)'),
    dict(n=321, bucket=P, imp=S_, eff=EL, pkg='Upozornenia a push',
         kratko='Upozornenia: päť kategórií a hlavný vypínač nie sú napojené na server (nedokončená funkcia)',
         what='Ručný test majiteľa po K14 (8. 11. 2026) a nález kolegu z K14: v Nastaveniach → Upozornenia je šesť kategórií: Správy, '
               'Páči sa mi to, Páči sa mi to a komentáre (reakcie a komentáre na fotkách, kde je používateľ označený), Komentáre, Páči '
               'sa mi to pre komentáre a Žiadosť o zručnosť. Podľa majiteľa je to nedokončená práca: kategórie neposkytujú funkčný '
               'systém upozornení. Agent to v kóde overil: `frontend/src/components/dashboard/modules/NotificationSettingsModule.tsx` '
               'drží hlavný vypínač a päť kategórií (všetky okrem Správ) len ako lokálny `useState(false)`; nič sa neukladá na server '
               'a po novom otvorení sa vrátia na „Vypnuté“. Napojená je len voľba Správy (push): `useNotificationPreferences` načíta a '
               'ukladá dve nastavenia servera (`in_app_notifications`, `push_notifications`) a Správy používajú `push_notifications`.',
         note='Očakávané správanie (majiteľ): každá kategória sa dá zapnúť a vypnúť, nastavenie sa uloží a príslušné upozornenie sa '
               'doručí alebo potlačí. Ide o väčšiu funkciu (model nastavení na serveri, rozhranie, doručovanie v aplikácii aj push '
               'podľa nastavenia); odhad: stredný · L. Pred štartom sa rozhoduje rozsah (R32): dokončiť, alebo nefunkčné prepínače '
               'dovtedy skryť. Súvisí s nálezmi 319 a 308.',
         dec='ROZHODNUTIE R32', src='ručný test majiteľa po K14 (8. 11. 2026) a kolega (K14)'),
]
