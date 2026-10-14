# OW-12 – mobilný návrat zo správy sledovaní do výsledkov

Dátum: 13. 10. 2026. Mapovanie a lokálna implementácia po schválení používateľom.
Spoločný commit/push OW-10 a OW-12 je výslovne povolený až po kontrolách.
Nasadenie ani vytvorenie nového PR tým nie je automaticky povolené.

## Potvrdená príčina a rozsah

Nasadený WebKit mobile v light aj dark: `/dashboard/watches` → Spravovať
sledovania → `/dashboard/settings/watches` → browser Back končil na
`/dashboard/settings?tab=offers`, nie na pôvodnom oznámení výsledkov.

- [Opener výsledkov](../../frontend/src/components/dashboard/modules/offer-watch/results/offerWatchResultsNavigation.ts)
  volal rovnaké `requestOfferWatchMobile()` ako položka Nastavení v Sidebar.
- [História a udalosť](../../frontend/src/components/dashboard/modules/offer-watch/mobile/offerWatchMobileNavigation.ts)
  nemali výsledkový pôvod: existovali iba `settings` a `direct`.
- [Mobilný host](../../frontend/src/components/dashboard/modules/offer-watch/mobile/OfferWatchSettingsMobileHost.tsx)
  preto každý event označil ako vstup z Nastavení, označil pôvodný záznam
  štítkom na obnovenie Nastavení a pri opustení mobilného správcu vždy odložene
  zavolal `onReturnToSettings`. Obyčajný mock tohto callbacku v starších testoch
  zachoval URL výsledkov, ale nevystihol jeho skutočné presmerovanie v aplikácii.
- DashboardLayout predáva `onMobileMenuOpen`; rodičovský popstate synchronizer
  už správne pozná cestu výsledkov a vie obnoviť modul `watches`. Netreba meniť
  router, DashboardContent, useDashboardState alebo useDashboardNavigation.

Existujú dva skutočné dispatch callery: Sidebar (ponechaný bez zmeny) a opener
výsledkov. História aj host majú vlastné malé moduly, všetky upravené TS/TSX
súbory ostávajú pod 500 riadkami. Veľké riadiace súbory sa neupravujú.

## Implementovaný kontrakt

1. Výsledkový opener explicitne žiada `results` cez CustomEvent. Pôvodný event
   bez detailu zostáva nezmenený pre Sidebar/Nastavenia.
2. Detail sa prijme len na kanonickej ceste výsledkov (aj s koncovou lomkou).
   Iné alebo poškodené detaily ostanú pôvodným vstupom z Nastavení. Nepridáva
   sa ľubovoľná návratová URL ani nový serverový údaj.
3. `results` je nová podporovaná hodnota existujúceho history markeru verzie 2.
   Staré `settings`/`direct` záznamy ostávajú kompatibilné. Formuláre a výbery
   zachovajú svoj pôvod pri každom vnorenom kroku.
4. Výsledkový zdroj sa neoznačí na návrat do Nastavení; prípadný starý settings
   marker sa odstráni bez straty Next.js a ostatných history polí. Pôvodná
   cesta, query aj fragment zostanú nedotknuté.
5. Pri odchode z výsledkového správcu host iba zatvorí portál. Browser Back
   obnoví svoj presný záznam; existujúci rodič zosúladí modul. Forward aj reload
   správcu čítajú uložený výsledkový pôvod a znova funguje správny Back.
6. Skutočný vstup z Nastavení stále obnoví Nastavenia a ich fokus. Samotná URL
   nestačí na odhad pôvodu: Nastavenia môžu byť otvorené nad výsledkovou URL.
7. Priamy odkaz bez markeru stále používa existujúci bezpečný návrat do Nastavení.
   Desktopový opener a existujúci handover pri zmene šírky ostávajú zachované.

Okrajový prípad priamo patriaci do OW-12: už odložená legacy obnova Nastavení
môže dobehnúť po novom explicitnom otvorení z výsledkov. Test po prvej oprave
naozaj zlyhal (1 FAIL / 12 PASS). Nové výsledkové otvorenie preto zruší tento
starý timeout a resetuje jeho pending príznak. Iné otvorenia nemení. Tento
súvisiaci problém sa opravuje v rovnakom kroku, nie je ticho odložený.

Starý záznam `origin=settings` sa spätne nepreklasifikuje podľa URL – z neho
nevieme bezpečne zistiť, ktorý starý opener ho vytvoril. Nové retesty začínajú
čerstvým otvorením správcu po nasadení.

## Testy a výsledky

- Nová [návratová integračná sada](../../frontend/src/components/dashboard/modules/offer-watch/mobile/OfferWatchSettingsMobileHost.results.test.tsx)
  používa reálny opener, dispatcher, host, history reader a rodičovský
  `usePopstateModuleSync`. Mockuje iba formulár/API a overuje aj neprítomnosť
  nesprávneho Settings callbacku. Pred opravou: 7 FAIL / 4 PASS.
- Nové [host lifecycle guardy](../../frontend/src/components/dashboard/modules/offer-watch/mobile/OfferWatchSettingsMobileHost.guards.test.tsx)
  a [event/history guardy](../../frontend/src/components/dashboard/modules/offer-watch/mobile/offerWatchMobileNavigation.guards.test.ts)
  pokrývajú chýbajúci browser/matchMedia, oneskorené callbacky, timer/unmount,
  neplatné metadáta/view, registry fallbacky a pôvodné návratové markery.
- [Existujúci opener test](../../frontend/src/components/dashboard/modules/offer-watch/results/offerWatchResultsNavigation.test.ts)
  overuje nový argument iba v mobile; desktopové návratové údaje sú zachované.
- Spoločný OW-10/12 gate: **9 sád / 111 testov PASS**, celé štyri produkčné
  súbory **100 % statements, branches, functions, lines**, gate 95 % nezmenený.
  Úvodných 41 PASS malo iba 87,5 % vetiev; medzery boli doplnené, nie ignorované.
- TypeScript a scoped ESLint pre 11 dotknutých TS/TSX: PASS, 0 chýb/varovaní.
- Produkčný build: PASS; generované registre bez zmeny. Existujúce Sentry SDK
  odporúčanie na globálny error handler nie je zlyhanie buildu; kód monitoringu
  ani jeho nastavenia sa neupravovali.
- Druhá kontrola komentárov: emitovaný JS všetkých štyroch produkčných súborov
  zhodný pred/po doplnení JSDoc. Dokumentácia nemení správanie.
- Kompletný frontend z aktuálneho main + oboch opráv: **409 sád / 5 604 testov
  PASS** za 358,168 s. Bez súbežných náročných kontrol; žiadna nová chyba.
  Predošlý OW-10 výsledok 400/5 490 ostáva samostatným historickým behom.

## Playwright a hranice živého overenia

[Spoločný navigačný scenár](../../frontend/e2e/search-to-offer-watches.spec.ts)
zachováva produkčne potvrdené OW-10 aj OW-12 RED scenáre. Mobilná regresia teraz
overuje aj Forward a appkovú šípku, nevyžaduje voľný slot pri platnom limite 5/5.

[Nové mobilné scenáre](../../frontend/e2e/offer-watch-mobile-results-return.spec.ts)
testujú reload, zachovanie query/fragmentu, create → country picker → form →
list → výsledky bez uloženia a pôvodné Settings/direct vstupy. Neočakávané
POST/PATCH/DELETE sledovaní zablokujú a označia test za neúspešný; nijaký watch
sa nevytvára, nemení ani nemaže. Pri limite 5/5 je iba nested-create scenár
explicitný SKIP, nie PASS. Auth/permissions ostávajú skutočné.

- Zber: 54 project-scenárov v 2 súboroch; WebKit desktop, WebKit mobile a
  Chromium desktop. Podľa zariadenia relevantných 28; zvyšok zámerne SKIP.
- Skutočný Linux/Docker WebKit mobile na Railway: pôvodné vstupy cez
  Profil → Menu → Sledovanie aj priamy odkaz prešli v light aj dark (**2 PASS**).
  Prvé testovacie pokusy nesprávne predpokladali Menu na Nástenke; vstup bol
  zosúladený s existujúcou mobilnou navigáciou. Ďalší pokus mal jeden 15 s
  timeout pri stabilizácii Profil tlačidla počas súbežného buildu (dark PASS).
  Opakovanie bez buildu a s dotykom podľa existujúcich mobilných testov: oba
  PASS, bez zvýšenia timeoutov, retry alebo vynútených klikov. Príčina jedného
  pomalého kroku nie je dokázaná ako chyba aplikácie.
- Tieto 2 PASS potvrdzujú existujúci nasadený kontrolný tok, nie úspech ešte
  nenasadeného OW-12. Výsledkový návrat aj desktopový OW-10 zostávajú živými
  retestami po spoločnom nasadení. Emulácia nie je fyzický iPhone/PWA test.

## Bezpečnosť a ďalší krok

Nová vetva `offer-watch-navigation-fixes` vychádza z aktuálneho origin/main
`011b6ce75653573e7ca49d2149a985711d8ce1b5`; starý PR #168 je už zlúčený.
Pred prepnutím bol diff dotknutých zdrojov oproti main prázdny. Všetky vlastné
rozpracované OW-10 dokumenty/testy/oprava sa zachovali. Primárny checkout main
a jeho HEAD ostávajú nedotknuté. Backend, migrácie, preklady, avatary a veľké
koordinátory bez zásahu; bezpečnostné nastavenia Windows sa nevypínajú.

Po úspešných lokálnych kontrolách spoločný commit a push; potom používateľom
spustené review a jeden cielený manuálny cyklus OW-10/12. Nový PR sa bez pokynu
nevytvára. Po uzavretí týchto navigačných opráv je ďalší plánovaný bod OW-03
(odstrániť Like iba vo výsledkoch Sledovania). OW-11/09 a ostatné otvorené
položky sa potichu nepripájajú ani neoznačujú za hotové.
