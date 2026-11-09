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
    dict(n=318, bucket=H, imp=S_, eff=ES, pkg='Produkčná odolnosť aplikácie',
         kratko='push upozornenia na správy neprichádzajú, lebo backend ich preskakuje pri nastavení rollout 5 % (príčina nájdená: '
                'nastavenie v Railway, nie chyba kódu)',
         what='Ručný test majiteľa po K14 (8. 11. 2026, produkcia, iPhone s nainštalovanou PWA): hlásenia pre Svaply sú v iPhone '
               'povolené, upozornenia na správy vo Svaply zapnuté, telefón je zamknutý a z druhého testovacieho účtu sa pošle správa. '
               'Správa sa doručí do konverzácie, no push nepríde. Majiteľ potvrdil, že pred nasadením K14 push fungoval. PRÍČINA '
               'NÁJDENÁ (9. 11. 2026): logy Railway (worker) pri dvoch testovacích správach ukázali `recipient_count=1`, '
               '`rollout_skipped_count=1`, `delivered_count=0` a `skipped_reason=rollout_5`, ostatné počty (`suppressed_count`, '
               '`subscription_count`, `retry_count`, `gone_count`, `permanent_failure_count`) boli nulové. Backend teda obe doručenia '
               'preskočil kvôli nastaveniu postupného zapínania (rollout) na 5 % a k odoslaniu službe Apple vôbec nedošlo.',
         note='Mapovanie agenta: podľa `accounts/services/webpush_rollout.py` je príjemca v zapnutej skupine, len ak `ID účtu % 100` '
               'je menšie ako nastavené percento, takže pri 5 % dostane push približne každý dvadsiaty účet. Kód má predvolenú hodnotu '
               '100 (`swaply/settings_split/webpush.py`); hodnota 5 prichádza z premennej prostredia '
               '`WEB_PUSH_MESSAGES_ROLLOUT_PERCENT` v Railway. Kto a kedy ju nastavil, z repozitára nevidno; že push pred K14 '
               'fungoval, vysvetľuje buď neskoršia zmena premennej, alebo skorší test s účtom, ktorý v päťpercentnej skupine je (agent '
               'to nerozlíši). Regresia K14 sa nepotvrdila: K14 zmenila `usePushMessagesPreference.ts` len pridaním `initialLoading`, '
               'zámok závislostí (244) balíky pre push nepohol a šifrovanie s podpisom VAPID fungujú so zamknutými verziami (skúška '
               'proti lokálnemu falošnému koncovému bodu: HTTP 201). Oprava je zmena nastavenia, nie kódu: v Railway tam, kde je '
               'premenná nastavená (zrejme worker, prípadne aj ostatné služby backendu), nastaviť `WEB_PUSH_MESSAGES_ROLLOUT_PERCENT` '
               'na 100 alebo ju odstrániť (spustí sa nové nasadenie, preto nie počas behu Playwrightu) a po nasadení zopakovať test: '
               'telefón zamknúť a pred odoslaním správy počkať 40 s; v logu má byť `rollout_skipped_count=0`. Nález sa zatvorí, keď '
               'majiteľ potvrdí, že push na iPhone prišiel. Úloha pre kolegu odpadá. Rozsah pri ostrom štarte rieši R33. Odhad: nízky '
               '· S. Dopad na E2E: žiadny.',
         dec='ROZHODNUTIE R33', src='ručný test majiteľa po K14 a mapovanie agenta (8. 11. 2026) a logy Railway od majiteľa (9. 11. 2026)'),
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
               'hneď ukázať chybu; súvisí s nálezom 306. Odhad: nízky · M. Po 324 ostane v Upozorneniach len prepínač Správ, takže otázka, '
               'ktorý prepínač sa testoval, odpadne.',
         dec=None, src='ručný test majiteľa po K14 a mapovanie agenta (8. 11. 2026)'),
    dict(n=320, bucket=P, imp=S_, eff=ES, pkg='Profil a identita',
         kratko='Zmena hesla: na iPhone sú polia čierne na svetlej karte (príčina pravdepodobne `color-scheme`, na zariadení nepotvrdená)',
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
    dict(n=321, bucket=A, imp=S_, eff=EL, pkg='Funkcie – väčšie balíky',
         kratko='Upozornenia: päť kategórií a hlavný vypínač nie sú napojené na server (nedokončená funkcia; dokončiť po štarte, '
                'dovtedy ich skrýva 324)',
         what='Ručný test majiteľa po K14 (8. 11. 2026) a nález kolegu z K14: v Nastaveniach → Upozornenia je šesť kategórií: Správy, '
               'Páči sa mi to, Páči sa mi to a komentáre (reakcie a komentáre na fotkách, kde je používateľ označený), Komentáre, Páči '
               'sa mi to pre komentáre a Žiadosť o zručnosť. Podľa majiteľa je to nedokončená práca: kategórie neposkytujú funkčný '
               'systém upozornení. Agent to v kóde overil: `frontend/src/components/dashboard/modules/NotificationSettingsModule.tsx` '
               'drží hlavný vypínač a päť kategórií (všetky okrem Správ) len ako lokálny `useState(false)`; nič sa neukladá na server '
               'a po novom otvorení sa vrátia na „Vypnuté“. Napojená je len voľba Správy (push): `useNotificationPreferences` načíta a '
               'ukladá dve nastavenia servera (`in_app_notifications`, `push_notifications`) a Správy používajú `push_notifications`.',
         note='Očakávané správanie (majiteľ): každá kategória sa dá zapnúť a vypnúť, nastavenie sa uloží a príslušné upozornenie sa '
               'doručí alebo potlačí. Ide o väčšiu funkciu (model nastavení na serveri, rozhranie, doručovanie v aplikácii aj push '
               'podľa nastavenia); odhad: stredný · L. Rozhodnuté R32 (b), 9. 11. 2026 (majiteľ nechal na odporúčanie agenta): '
               'nefunkčné prepínače sa do dokončenia skryjú (nález 324, PRED NASADENÍM) a dokončenie ostáva po štarte. Ak sa majiteľ '
               'rozhodne mať kategórie pred štartom, nález sa vráti do PRED NASADENÍM. Súvisí s nálezmi 319 a 308.',
         dec='ROZHODNUTIE R32', src='ručný test majiteľa po K14 (8. 11. 2026) a kolega (K14)'),
    dict(n=322, bucket=P, imp=S_, eff=ES, pkg='Ponuky (úprava a tagy)',
         kratko='nová ponuka na mobile: tag pridaný okrúhlym tlačidlom sa nezobrazí (obrazovka Popis ponuky ho zmaže pri prekreslení '
                'rodiča)',
         what='Ručný test majiteľa (9. 11. 2026, mobil, video): pri vytváraní novej ponuky (obrazovka Popis ponuky → Tagy) sa tag '
               'napíše do poľa a potvrdí okrúhlym tlačidlom s fajkou. Očakávané: tag sa zobrazí nad poľom ako `#tag`. Skutočnosť: pole '
               'sa vyprázdni, no tag sa nezobrazí (na snímkach videa nie je). Mapovanie agenta (9. 11. 2026) v dočasných testoch so '
               'skutočným `SkillsModuleRouter` a obrazovkou (v repozitári nie sú): `SkillsModuleRouter.tsx` (583 riadkov, riadok 384) '
               'odovzdáva obrazovke `initialTags={selectedSkillsCategory.tags || []}`, čo je pri novej ponuke bez tagov pri každom '
               'prekreslení smerovača NOVÉ prázdne pole. `useSkillsDescriptionScreenState.ts` (638 riadkov, riadky 121 až 126) má '
               'efekt so závislosťou `[initialTags]`, ktorý pri novej referencii porovná zoznam s aktuálnym stavom a vráti ho na '
               'prázdny, takže zmaže tag pridaný používateľom. Test: tag pridaný okrúhlym tlačidlom bol viditeľný, no jedno vynútené '
               'prekreslenie rodiča ho zmazalo (v aplikácii prekresľovanie spôsobuje 323). Vzor je z PR #127 (24. 9. 2026), nie z K13 '
               'ani K14. `TagsSection.tsx` si pred nesúvisiacim prekreslením chráni vlastnú kópiu (komentár v kóde), stav v hooku nie.',
         note='Návrh (vyskúšaný dočasným testom so skutočným smerovačom a obrazovkou): v `SkillsDescriptionScreen.tsx` (26 riadkov) '
               'odovzdať hooku stabilné vstupy, a to `initialTags` podľa obsahu (rovnaká referencia, kým sa obsah nezmení) a obslužné '
               'funkcie `on…` so stabilnou identitou (volajú vždy najnovšiu funkciu), cez nový malý hook v novom súbore; súbory nad '
               '500 riadkov sa nemenia. S touto úpravou tag ostal viditeľný aj po prekreslení rodiča. Test: pridať tag okrúhlym '
               'tlačidlom, vynútiť prekreslenie rodiča a overiť, že tag ostane (pred opravou padá). Oprava je rovnaká ako pri 323, '
               'preto idú spolu. E2E špec s tagmi na mobile agent nenašiel. Odhad: stredný · S.',
         dec=None, src='video majiteľa a mapovanie agenta (9. 11. 2026)'),
    dict(n=323, bucket=P, imp=S_, eff=ES, pkg='Ponuky (úprava a tagy)',
         kratko='obrazovka Popis ponuky sa neprestajne prekresľuje (slučka efektov medzi smerovačom a obrazovkou; nepotvrdené v '
                'prehliadači)',
         what='Agent pri mapovaní nálezu 322 (9. 11. 2026): v dočasnom teste so skutočným `SkillsModuleRouter` a obrazovkou '
               '„skills-describe“ pre novú ponuku sa smerovač po pripojení prekreslil 76-krát a stav vybranej ponuky sa zapísal '
               '152-krát, kým test nezastavila poistka; React hlási „Maximum update depth exceeded“. Príčina z kódu: '
               '`useSkillsDescriptionScreenState.ts` (riadky 136 až 142) má efekty so závislosťami `[countryCode, '
               'onCountryCodeChange]` a `[districtCode, onDistrictCodeChange]`, ktoré pri každom spustení zavolajú obslužnú funkciu '
               'rodiča; smerovač ju vytvára priamo v zápise (nová funkcia pri každom prekreslení) a `updateSelectedSkill` vždy vytvorí '
               'nový objekt stavu, takže sa efekt spustí znova a slučka sa neukončí. Vzor je z PR #127 (24. 9. 2026). V prehliadači to '
               'agent neoveril.',
         note='Dôsledok pre používateľa: ak slučka beží aj v aplikácii, obrazovka Popis ponuky stále zaťažuje procesor a batériu '
               'telefónu a každé prekreslenie rodiča zmaže rozpísané tagy (322). Oprava je rovnaká ako pri 322 (stabilné obslužné '
               'funkcie vo `SkillsDescriptionScreen.tsx`): v dočasnom teste ostali po pripojení 2 prekreslenia a 2 zápisy stavu a '
               'varovanie zmizlo. Overenie v prehliadači (kolega alebo majiteľ): v dev builde sa pri otvorení obrazovky nemá objaviť '
               'varovanie „Maximum update depth exceeded“ a počet prekreslení po pripojení má byť malý. Pri oprave prehľadať podobný '
               'vzor inde (efekt s `on…Change` v závislostiach, ktorý zapisuje do stavu rodiča); nájdené miesta len nahlásiť ako '
               'kandidátov. Odhad: stredný · S.',
         dec=None, src='mapovanie agenta pri nálezu 322 (9. 11. 2026)'),
    dict(n=324, bucket=P, imp=S_, eff=ES, pkg='Upozornenia a push',
         kratko='Nastavenia → Upozornenia: skryť hlavný vypínač a päť kategórií, ktoré nič neukladajú, a nechať len Správy (rozhodnutie '
                'R32 (b))',
         what='Rozhodnutie R32 (b) z 9. 11. 2026 (majiteľ nechal na odporúčanie agenta): kým nie je dokončená funkcia upozornení '
               '(321), hlavný vypínač a päť kategórií (Páči sa mi to, Páči sa mi to a komentáre, Komentáre, Páči sa mi to pre '
               'komentáre, Žiadosť o zručnosť), ktoré sú len lokálny stav bez volania servera, sa v Nastaveniach → Upozornenia '
               'nezobrazujú. Ostáva voľba Správy (push) s uložením, vrátením späť a chybou. Prepínač, ktorý nič nerobí, pôsobí ako '
               'chyba: používateľ si myslí, že upozornenia vypol. Mapovanie agenta (9. 11. 2026, podľa 321): '
               '`NotificationSettingsModule.tsx` (150 riadkov) drží stav, vzhľad je v `notifications/Desktop.tsx` (293 riadkov) a '
               '`notifications/Mobile.tsx` (220 riadkov); žiadny z nich nie je nad 500 riadkov.',
         note='Návrh: skryť riadky piatich kategórií a hlavný vypínač (kód a preklady nemazať, ak sa 321 chystá čoskoro; stačí jedno '
               'miesto, napr. konštanta, ktorú 321 prepne) a upraviť testy. Test: v Upozorneniach je len voľba Správy. Texty hlavného '
               'vypínača a kategórií ostanú v prekladoch. E2E špec s týmito prepínačmi agent nenašiel. Odhad: nízky · S.',
         dec='ROZHODNUTIE R32', src='rozhodnutie R32 (b) a mapovanie agenta (9. 11. 2026)'),
]
