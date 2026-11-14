# -*- coding: utf-8 -*-
"""Nové nálezy od čísla 232 (nálezy 173 až 231 sú v `polozky_nove.py`; úlohy na prípravu ostrého nasadenia N1… v `polozky_priprava.py`).

Samostatný súbor kvôli limitu 500 riadkov. `polozky_nove.py` ich pripája do `NEW_ITEMS`, takže ostatné moduly sa nemenili.
Pravidlá sú rovnaké: otvorený nález sa po oprave odstráni odtiaľto a zapíše do `hotove.DONE_SINCE`; čísla sa nikdy nepoužívajú znova.
"""

from konstanty import A, EL, EM, ES, H, N, P, S_, V  # noqa: F401

NEW_ITEMS_DALSIE = [
    dict(n=233, bucket=A, imp=N, eff=EM, pkg='Nástroje a testy',
         kratko='E2E nemá scenár pre fotku v správach, emoji, reset hesla a O nás / FAQ / Kontakt',
         what='Codex v celom behu po nasadení (1. 11. 2026) potvrdil, že kolekcia 738 testov nemá samostatný scenár pre: odoslanie fotky v '
              'správach a zotrvanie okna dole (nález 218), výber emoji, reset hesla a verejné stránky O nás, FAQ a Kontakt; tieto funkcie '
              'preto beh nepotvrdil (manuálne ich overuje majiteľ). Odoslanie fotky na Railway je podľa odovzdania zakázané bez osobitnej '
              'dohody. Súvisiaca nepokrytá položka: `offer-watch-author-from-profile.spec.ts` (položka 16) sa v celom behu aj v opakovaniach '
              'preskočila dátovým strážcom (chýba uložené sledovanie alebo živá zhoda s autorom so slugom).',
         note='Návrh (E2E vlastní Codex): po schválení doplniť scenáre, ktoré nezapisujú do produkcie (reset hesla bez odoslania, verejné '
              'stránky, emoji výber) a pre fotku v správach bezpečný lokálny alebo riadený test medzi určenými účtami. Dátový guard položky 16 '
              'treba doplniť pevnou kategóriou preskočenia (nie ľubovoľným textom). Úlohu majiteľa (overiť uložené sledovanie a jeho živú '
              'zhodu s autorom) rieši majiteľ. Aktualizácia 1. 11. 2026 (Codex, po overení vetvy 160): návrh bezpečných scenárov je hotový, '
              'implementácia čaká na súhlas majiteľa. Verejné stránky a FAQ (bez odoslania kontaktného formulára), reset hesla (syntetický POST so '
              'strážcom zápisov, bez reálneho e-mailu), emoji (len do konceptu, bez odoslania) a fotka v správach (len lokálny produkčný build '
              's testovacou databázou, bez produkčných údajov). Pevná kategória dátového preskočenia pre položku 16: v oboch desktopových '
              'projektoch `no_live_match_with_slug` (prvé sledovanie nemá živú zhodu s autorom s adresou profilu), v mobile '
              '`not_applicable_mobile`; úloha majiteľa ostáva.',
         dec=None, src='správa Codexa z 1. 11. 2026'),
    dict(n=235, bucket=A, imp=S_, eff=EL, pkg='Funkcie – väčšie balíky',
         kratko='2FA je nedokončená funkcia: nedá sa zapnúť ani zadať pri prihlásení z aplikácie',
         what='Pri oprave nálezu 179 (vetva 161) sa ukázalo, že dvojfázové overenie (2FA, TOTP) je len polovica funkcie. Backend vie overiť kód '
              'pri prihlásení, ak je v profile `mfa_enabled` a `mfa_secret`, no nič tieto polia nenastaví: neexistuje koncový bod na zapnutie '
              '(vytvorenie secretu, QR kód, potvrdenie prvým kódom), na vypnutie ani na záložné kódy a administrácia tieto polia neponúka. '
              'Frontend o 2FA nevie nič: prihlásenie nikdy neposiela pole `totp`, nie je obrazovka na zadanie kódu ani prepínač v '
              'nastaveniach (API nastavení vracia len príznak `two_factor_auth`, ktorý frontend nepoužíva). Používateľ s 2FA by sa cez aplikáciu neprihlásil (dostal by „Vyžaduje '
              'sa 2FA kód.“); zapnúť sa dá len priamo v databáze alebo v Django shelli.',
         note='Nič z toho nebolo v zadaní nálezu 179, preto sa neopravuje. Aj v časti, ktorá existuje, chýba: (1) ochrana pred opakovaním, '
              'už použitý kód ostáva platný do konca okna (dnes ±30 s, teda až 90 s); (2) technické zlyhanie overenia (neplatný šifrovací '
              'kľúč, poškodený secret) vráti len hlášku „Chyba pri overovaní 2FA.“ a nezapíše sa do logu, takže by ostalo nepovšimnuté. '
              'CodeRabbit (PR #221) označil bod (1) ako Major; zatiaľ sa nerobí, lebo 2FA sa cez aplikáciu zapnúť nedá a ochrana patrí k '
              'dokončeniu tejto funkcie. Cesta k opakovanému použitiu kódu však existuje pre každý účet, ktorému by sa 2FA zapol ručne v '
              'databáze; či taký účet je v produkcii, nevieme (kontrola: počet profilov s `mfa_enabled`). Ak taký účet je, robí sa to hneď. '
              'Rozhodnutie R12 je na majiteľovi. Odporúčanie: dokončiť až po nasadení (väčší balík: koncové body, QR kód, záložné kódy, '
              'obrazovky vo všetkých šiestich jazykoch, ochrana pred opakovaním, testy); dovtedy sa 2FA používateľom neponúka, takže jeho '
              'chýbanie bežným používateľom neškodí. Ak má byť pri štarte, patrí do vlny 1.',
         dec='ROZHODNUTIE R12', src='vetva 161'),
    dict(n=238, bucket=A, imp=N, eff=ES, pkg='Nástroje a testy',
         kratko='zastarané npm balíky v `package-lock.json` (glob, abab, @opentelemetry/sdk-trace-base)',
         what='Kolega pri práci na nálezu 192 nahlásil zastarané npm balíky (5. 11. 2026). Overené v `frontend/package-lock.json` '
              '(označenie `deprecated`): štyri balíky. `eslint@9.39.5` (priama vývojárska závislosť) je už v nálezu 227. Ďalšie tri: '
              '`glob@10.5.0` (vývojárska závislosť, vnorený v `sucrase` pod `tailwindcss` 3.4.17), `abab@2.0.6` (vývojárska závislosť '
              'z `jsdom` 20 a `data-urls` pod `jest-environment-jsdom` 29; správa balíka odporúča natívne `atob()` a `btoa()`) a '
              '`@opentelemetry/sdk-trace-base@2.12.0` (prichádza cez Sentry aj do produkčného stromu: `@sentry/node` ho vyžaduje, '
              '`@sentry/node-core` a `@sentry/opentelemetry` ho majú ako peer; správa balíka odporúča balík `@opentelemetry/sdk-trace`).',
         note='Nedá sa opraviť ručným zásahom do `package-lock.json`: každý z balíkov si pýta nadradený balík, takže sa vymení až '
              'povýšením toho nadradeného. `@opentelemetry/sdk-trace-base`: čakať na novšiu verziu `@sentry/nextjs` (rovnaká aktualizácia '
              'ako pri nálezu 229). `eslint`: nález 227. `glob` v `sucrase` a `abab` zmiznú až s novšími verziami `tailwindcss` a '
              '`jest-environment-jsdom`, čo sú samostatné väčšie kroky s testami. Správanie aplikácie sa nemení; nerobiť pred ostrým '
              'nasadením. Pri každej aktualizácii nadradených balíkov sa dá skontrolovať, či zmizli: '
              '`npm ls glob abab @opentelemetry/sdk-trace-base`.',
         dec=None, src='kolega pri vetve K1 (nález 192)'),
    dict(n=239, bucket=A, imp=N, eff=ES, pkg='Upratovanie a architektúra',
         kratko='tri nepoužité komponenty so starou kópiou nahrávania avatara (aj s testami)',
         what='V `frontend/src/components/dashboard/modules/` sú tri komponenty, ktoré v aplikácii nikto neimportuje: '
              '`ProfileEditForm.tsx` (432 riadkov), `ProfileAvatar.tsx` (182 riadkov) a `profile-edit/shared/AvatarActionsModal.tsx` '
              '(72 riadkov; importuje ho len `ProfileEditForm.tsx`). Majú starú kópiu nahrávania avatara. Aplikácia používa '
              '`ProfileEditFormDesktop.tsx`, `ProfileEditFormMobile.tsx` a `profile/ProfileAvatarActionsModal.tsx`. Importujú ich len '
              'testy (`__tests__/ProfileEditForm.test.tsx`, `ProfileEditForm.coverage.test.tsx`, `ProfileEditForm.extra.test.tsx` a '
              '`ProfileAvatar.test.tsx`) a v `jest.config.js` sú vynechané z merania pokrytia.',
         note='Pôvodne súčasť poznámky nálezu 192 (zistené na vetve 144, znova overené 5. 11. 2026 na vetve 163); keď sa 192 presunul '
              'medzi hotové, dostala vlastné číslo, aby sa nestratila. Návrh: zmazať všetky tri súbory, štyri testy a tri výnimky v '
              '`jest.config.js`, potom overiť `tsc`, `build` a celý Jest. Žiadny z troch súborov nemá nad 500 riadkov. Mazanie len so '
              'súhlasom majiteľa.',
         dec=None, src='vetva 144, presunuté z nálezu 192'),
    dict(n=242, bucket=A, imp=N, eff=EM, pkg='Nástroje a testy',
         kratko='pokrytie docstringami (cieľ 80 %) sa v repozitári nemeria; backend má asi 41 %',
         what='Cieľ 80 % dokumentačného pokrytia (docstringov) pochádza z pre-merge kontroly CodeRabbit, ktorá ho posudzuje len pri '
              'funkciách zmenených v danom PR. Repozitár sám pokrytie nemeria: nie je v ňom `interrogate` ani iný nástroj a CI ho '
              'nekontroluje. Zmerané agentom 5. 11. 2026 (rozbor kódu, backend bez migrácií a testov): 805 z 1 962 modulov, tried a funkcií '
              'má docstring, teda 41,0 % (vrátane testov 32,1 %); odhad kolegu (asi 41 %) sedí.',
         note='Nízka závažnosť. Návrh: buď pridať meranie (napr. `interrogate` s hranicou, ktorú kód spĺňa dnes, a tú postupne zvyšovať), '
              'alebo to nechať ako pravidlo kontroly zmenených funkcií v PR a cieľ 80 % nepovažovať za pokrytie celého kódu. Súvisí s '
              'položkou DOC-03 v `docs/testing/findings-register.md`. Nahlásil kolega pri K2.',
         dec=None, src='kolega pri vetve K2'),
    dict(n=245, bucket=P, imp=S_, eff=EM, pkg='Produkčná odolnosť aplikácie',
         kratko='obnova prihlásenia: reprodukovaný defekt je opravený v K14, ostáva overenie v logoch Railway a prípadný `api.ts`',
         what='ČIASTOČNE HOTOVÉ: oprava v `frontend/src/utils/csrf.ts` je hotová v K14 (PR #245, zlúčené 8. 11. 2026, commit '
               '`c8b3ff3e`); `lib/api.ts` (912 riadkov) sa nemenil. Pôvodný nález: kontrola logov Railway (majiteľ, 6. 11. 2026, pády '
               'E2E z 5. 11.) ukázala dvakrát `POST /api/token/refresh/` s kódom 403 pre chýbajúce CSRF cookie a aj 401. Rozbor kódu '
               '(agent, 6. 11. 2026): server najprv overí, či neprišlo nič, a až potom vyžaduje cookie `csrftoken` '
               '(`EnforceCSRFMiddleware` v `swaply/middleware.py`), takže hlásenie o chýbajúcom cookie znamená, že hlavička '
               '`X-CSRFToken` prišla a cookie nie; prehliadač držal token aj v pamäti a `getCsrfToken()` ho uprednostňoval pred '
               'cookie, takže keď cookie zmizla (napr. `Clear-Site-Data: "cookies"` pri odhlásení), obnova poslala hlavičku bez '
               'cookie; `fetchCsrfToken` nemal časový limit. Oprava v K14: pri same-origin API je zdrojom pravdy cookie, ak sa v '
               'relácii dala aspoň raz prečítať; token z pamäte bez cookie sa nepošle (`getCsrfToken()` vráti `undefined`) a obnova v '
               '`api.ts` si vyžiada nový; cross-origin a HttpOnly cookie sa nemenia; `fetchCsrfToken` má limit 15 s (zvolený podľa '
               'zastavení 10 až 26 s z nálezu 223). `csrf.ts` má teraz 84 riadkov. Overenie podľa kolegu: 15 nových testov (4 so '
               'skutočným `api.ts`), mutácie 16 z 16; CI prešlo. OSTÁVA: (1) Príčina 403 vo WebKite nie je preukázaná: opravený je '
               'reprodukovaný defekt, no že práve on spôsobuje 403 na iPhone, sa nepotvrdilo; dôkazy z diagnostiky (názvy cookies a '
               'prítomnosť `X-CSRFToken` pri 401 a 403 na obnove) sú od 9. 11. v nálezu 223: pri dvoch odmietnutých obnovách bola '
               'hlavička prítomná a zoznam cookies prázdny. (2) Počet `POST /api/token/refresh/` so stavom 403 v logoch Railway '
               '(majiteľ, 10. 11. 2026): 15 za 7 dní (5. až 9. 11.), z toho 13 až po nasadení K14 (od 8. 11.; 2 z 8. 11. a 11 z 9. 11.). K behom Codexa '
               '(WebKit v Dockeri) pravdepodobne patrí 13 z 15 (2 z 5. 11. a 11 z 9. 11.; 5 podľa času pádov v jeho hlásení, 8 podľa zhody siete a rytmu) a '
               'dve z 8. 11. časovo sedia na jeho pokus; žiadna nie je preukázateľne od '
               'skutočného používateľa, produkčný problém to však nevylučuje (zaseknutie požiadaviek bez 401 a 403 sa tým nezmeria). '
               'K14 teda 403 v testoch neodstránila; podrobnosti sú v nálezu 223 (dodatok 10. 11.). (3) Do `api.ts` by patril '
               'časový limit obnovy a kontroly '
               '`/auth/me/` po 401 a jedno opakovanie po CSRF 403; súbor má 912 riadkov (limit 500), preto to vyžaduje výnimku '
               'majiteľa alebo rozdelenie súboru a zatiaľ sa nerobí.',
         note='Súvislosť s nálezom 223: zastavenia požiadaviek (10 až 26 s) to nevysvetľujú a nie je preukázané, že za pády E2E môže '
               'práve toto. V zázname Codexa (29. 10. až 5. 11. 2026) sa však 401 a 403 pri obnove vyskytujú len vo WebKite (13 zo 83 '
               'neúspešných pokusov; v Chromiu 0), pričom WebKit je engine Safari na iPhone. Zoznam majiteľa (príloha D, 6. 11. 2026) '
               'dopĺňa: scenár „cudzí profil, približne minúta“ koreloval s reálnym produkčným výpadkom a obnova mohla pri výpadku '
               'alebo preťažení visieť dlho; zhoršovalo to, že „minišatúry“ (čítam ako miniatúry obrázkov) idú cez Django namiesto CDN '
               '(N9); je to hypotéza z korelácie, nie z logov. Návrh kolegu: nález zatvoriť až po overení v logoch Railway (bod 2). '
               'Dodatok 9. a 10. 11. 2026: logy Railway z okien dvoch pádov E2E (majiteľ) potvrdili dôvod 403 na obnove „CSRF '
               'cookie not set.“, čo sedí na prázdne cookies prehliadača. Testované prostredie používa `/api` (same-origin, majiteľ '
               '10. 11.), takže K14 platí; zastaraný token z pamäte to nevysvetľuje len vtedy, keď bola cookie v relácii aspoň raz '
               'čitateľná (inak `getCsrfToken()` použije token z pamäte, pozri 223); iné aplikačné príčiny to nevylučuje (pozri '
               '223). Počty 403 (bod 2) sú v časti OSTÁVA. '
               'Dodatok 12. 11. 2026 (Codex, celý beh po K19): v pôvodných blokoch a opakovaniach je päť odpovedí 403 na obnovu v '
               'troch testových pokusoch (WebKit desktop; cookies kontextu žiadne, `X-CSRFToken` prítomná, Django 1 až 7 ms), časy a '
               'ďalšie podrobnosti sú v nálezu 223; bod 2 (počty v logoch Railway) sa nemenil.',
         dec=None, src='kontrola logov Railway od majiteľa (6., 9. a 10. 11. 2026), rozbor kódu agentom, tabuľka Codexa (pri nálezu 223) a K14'),
    dict(n=247, bucket=A, imp=N, eff=ES, pkg='Vyhľadávanie a Sledovania',
         kratko='klik na položku histórie sa pri písaní ruší až po odoslaní hľadania (debounce), nie hneď',
         what='Zvyšok po oprave APP-05 (K4, PR #231), nahlásil kolega: klik na položku histórie ruší predchádzajúce hľadanie aj klik cez '
              'zdieľaný `searchAbortControllerRef`, no opačným smerom to funguje až neskôr. Hľadanie z poľa zruší rozbehnutý klik, až keď sa '
              'po oneskorení pri písaní skutočne odošle (`handleSearch` v `search/hooks/useSearchApi.tsx` volá `previousController?.abort()` '
              'pri začatí požiadavky, nie pri zmene textu). Kým sa klik overuje a používateľ začne písať, môže klik ešte zapísať výsledky z '
              'histórie a až odoslané hľadanie ich prekryje.',
         note='Okno je veľmi krátke (oneskorenie pri písaní), preto to K4 nezahŕňa; podľa kolegu sa dá doplniť za pár riadkov. Návrh: zrušiť '
              'rozbehnutý klik hneď pri zmene textu v poli a pridať test do `useRecentSearches.race.test.tsx`. Agent overil len miesto zrušenia '
              'v `useSearchApi.tsx`; samotný záblesk výsledkov z histórie neoveroval.',
         dec=None, src='K4 (správa kolegu cez majiteľa, 6. 11. 2026)'),
    dict(n=248, bucket=A, imp=N, eff=ES, pkg='Vyhľadávanie a Sledovania',
         kratko='zrušené textové hľadanie nezresetuje `isRevalidating` (v UI nedosiahnuteľné)',
         what='Zvyšok po oprave APP-05 (K4, PR #231), nahlásil kolega: keď klik na položku histórie zruší rozbehnuté textové hľadanie, stav '
              '`isRevalidating` v `search/hooks/useSearchApi.tsx` sa nezresetuje. V UI je to nedosiahnuteľné: história sa zobrazuje len pri '
              'prázdnom poli bez hľadania a `isRevalidating` sa v `SearchResults.tsx` používa len spolu s `isSearching`.',
         note='Agent overil len umiestnenie stavu (`useSearchApi.tsx` vracia `isRevalidating && hasPanelResults`) a jeho použitie v '
              '`SearchResults.tsx`; samotný scenár neoveroval. Nízka priorita. Návrh: `setIsRevalidating(false)` aj pri zrušení z kliku '
              '(spolu s 247) a krátky test.',
         dec=None, src='K4 (správa kolegu cez majiteľa, 6. 11. 2026)'),
    dict(n=249, bucket=A, imp=N, eff=EM, pkg='Prístupnosť',
         kratko='plynulé posúvanie cez JavaScript nekontroluje „Znížiť pohyb“ (11 miest v 9 súboroch, 6 z nich nad 500 riadkov)',
         what='Oprava 134 (K5, PR #232: `MotionConfig reducedMotion="user"`) platí len pre komponenty framer-motion; CSS animácie riadi '
              'globálny blok `prefers-reduced-motion` v `globals.css`. Plynulé posúvanie cez JavaScript (`behavior` s hodnotou `smooth`) sa '
              'nastavením „Znížiť pohyb“ neriadi; CSS `scroll-behavior` ani Tailwind `scroll-smooth` sa v zdrojoch nepoužívajú. Agent '
              'našiel (6. 11. 2026, bez testov) 11 miest v 9 súboroch: `FeedPostComments.tsx` (1 487 riadkov), `ProfileOffersSection.tsx` '
              '(1 108), `ProfileOffersMobileSection.tsx` (945), `app/search/page.tsx` (648), `FeedPostMobileDetail.tsx` (594), '
              '`useConversationThreadController.ts` (505; 3 miesta) a menšie `useFeedShareLanding.ts`, `useTargetReviewScroll.ts` a '
              '`districtValidation.ts`. Šesť z deviatich súborov má nad 500 riadkov, takže sa podľa pravidiel nemenia, len sa hlásia.',
         note='Nález pôvodne nahlásil kolega pri K5; počty a veľkosti súborov agent prepočítal. Návrh: spoločný pomocník v novom súbore (funkcia, '
              'ktorá pri `prefers-reduced-motion: reduce` vráti `auto` a inak `smooth`) a jeho použitie v troch malých súboroch hneď; v '
              'súboroch nad 500 riadkov až pri ich rozdelení (TECH-01…11) alebo s výnimkou majiteľa.',
         dec=None, src='K5 (správa kolegu cez majiteľa, 6. 11. 2026)'),
    dict(n=250, bucket=A, imp=N, eff=ES, pkg='Nástroje a testy',
         kratko='chýbajúci test resetu súhrnu profilu pri otvorení profilu z vyhľadávania (`useDashboardNavigation.tsx:289`)',
         what='Reset `setViewedUserSummary(null)` vo funkcii `handleViewUserSkillFromSearch` (`dashboard/hooks/useDashboardNavigation.tsx`, '
              'riadok 289, overil agent) nemá žiadny test: po jeho odstránení podľa kolegu prejde všetkých 2 244 testov Dashboardu. Po '
              'prepísaní troch testov v časti 136b (K5) už nechytí žiadny test ani štyri ďalšie resety súhrnu mimo vetvy profilu; boli kryté '
              'len odstránenými kontrolami a podľa kolegu ide o hygienu.',
         note='Návrh: jeden test v `hooks/__tests__` (otvoriť profil z vyhľadávania po predošlom profile so súhrnom a overiť, že sa súhrn '
              'nepreniesol do nového). `useDashboardNavigation.tsx` má 514 riadkov (nad 500), takže sa nemení, pridáva sa len test.',
         dec=None, src='K5 (správa kolegu cez majiteľa, 6. 11. 2026)'),
]
