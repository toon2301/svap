# -*- coding: utf-8 -*-
"""Stav položiek z `docs/testing/findings-register.md` (OW-, TEST-, APP-, TECH-, TOOL-, ENV-, DOC-, RET-, REG-).

Každé ID z registra musí byť práve v jednej z týchto štruktúr: `REG_ITEMS` (otvorené), `REG_AWAIT_LIVE`
(zlúčené, čaká živé overenie), `REG_CLOSED` (zatvorené) alebo `REG_MAPPED` (kryje ich číslovaný nález).
Skript `build.py` to kontroluje voči registru.
"""

from konstanty import A, EL, EM, ES, H, N, P, S_, V  # noqa: F401

REG_ITEMS = [
    # otvorené, PRED
    dict(id='OW-05', bucket=P, imp=S_, eff=EM, pkg='Vyhľadávanie a Sledovania', what='Vstup do výsledkov Sledovaní v iOS PWA chýba (v Safari prešlo).', note='Súvisí s plánom mobilných výsledkov.', dec='ROZHODNUTIE R6'),
    dict(id='OW-06', bucket=P, imp=V, eff=ES, pkg='Produkčná odolnosť aplikácie', what='Overiť produkčné CORS domény (varovanie o záložných doménach).', note='Rieši sa pri nasadení (N5); potvrdený bezpečnostný problém = okamžitá oprava.', dec=None),
    dict(id='OW-07', bucket=P, imp=V, eff=ES, pkg='Produkčná odolnosť aplikácie', what='Overiť skutočné vypršanie prihlásenia (staré výsledky nesmú byť prístupné).', note='Povinný test; potvrdený únik = hneď.', dec=None),
    dict(id='OW-11', bucket=P, imp=S_, eff=EM, pkg='Vyhľadávanie a Sledovania', what='Rozloženie `/search` nemá obsluhu Správ, Upozornení a Štatistík: kliknutie v ľavom menu nič nerobí.', note='Pre používateľa je to „rozbité“ menu na stránke vyhľadávania; rozsah dohodnúť.', dec=None),
    dict(id='OW-14', bucket=P, imp=S_, eff=ES, pkg='Vyhľadávanie a Sledovania', what='Otváracie hodiny pri firemnej ponuke vo výsledkoch sú nefunkčné (tlačidlo bez obsluhy).', note='Buď doplniť popover, alebo ovládač nezobraziť.', dec='ROZHODNUTIE R5'),
    dict(id='OW-17', bucket=P, imp=S_, eff=EM, pkg='Vyhľadávanie a Sledovania', what='Desktop vyhľadávanie: otvorený panel pohltí prvý klik na otočenie karty.', note='Potvrdené na Railway; každý desktopový používateľ s otvoreným panelom to zažije.', dec=None),
    dict(id='RET-01', bucket=P, imp=N, eff=ES, pkg='iPhone overenia', what='iPhone: zapamätaný text nad systémovou lištou pri „Cena od“ (M13).', note='Odložené manuálne overenie.', dec=None),
    dict(id='RET-02', bucket=P, imp=N, eff=ES, pkg='iPhone overenia', what='To isté pri „Cena do“ (M14).', note='Spolu s RET-01.', dec=None),
    dict(id='RET-03', bucket=P, imp=N, eff=ES, pkg='iPhone overenia', what='Porovnanie Cena od / do a systémovej lišty v Safari a v nainštalovanej PWA (M33).', note='Spolu s RET-01.', dec=None),
    dict(id='TEST-03/04/09/12/13/14/15/16/18', label='TEST-03, 04, 09, 12–16, 18', bucket=P, imp=S_, eff=EM, pkg='Spoľahlivosť CI a testov',
         what='Jednorazové a neobjasnené zlyhania a upozornenia testov: push-timeout (03), WebKit timeouty (04, 09, 12, 13), '
              '`OfferWatchSettingsMobileHost.openState` (14), Jest nekončí (15), vlákno registračného e-mailu v SQLite testoch (16), '
              'dlhšie živé E2E skončili pred overením (18).',
         note='Spolu s 31 a 179. Bez diagnostiky ich neoznačovať za opravené; ak CI blokuje nasadenie, treba ich stabilizovať.', dec=None),
    dict(id='APP-03', bucket=P, imp=S_, eff=ES, pkg='Preklady a hlášky', what='Záložky a tlačidlá vyhľadávania (Všetko / Ľudia / Ponuky, Zobraziť viac / všetko) sú slovenské literály, nie `t()`.', note='Súčasť 176; ak štart nie je viacjazyčný, môže počkať (R2).', dec='ROZHODNUTIE R2'),
    # otvorené, PO
    dict(id='OW-08', bucket=A, imp=N, eff=ES, pkg='Nástroje a testy', what='Upratať historické testovacie dáta v Railway (karta ID 165 sa nemaže).', note='Na novej, čistej databáze odpadá.', dec=None),
    dict(id='OW-09', bucket=A, imp=N, eff=EM, pkg='Vyhľadávanie a Sledovania', what='Poškodený kurzor a neexistujúce sledovanie sa na frontende nerozlišujú.', note='Samostatné mapovanie; nie bezpečnostný problém.', dec=None),
    dict(id='TEST-06', bucket=A, imp=N, eff=ES, pkg='Nástroje a testy', what='Živý OW-03 scenár nemá vlastnú ponukovú fixture.', note='Použiť existujúce sledovanie; nič nevytvárať.', dec=None),
    dict(id='TEST-08', bucket=A, imp=N, eff=ES, pkg='Nástroje a testy', what='Historické nedosiahnuteľné vetvy stránky `/search` (93,45 % vetiev) – výnimka z 95 %.', note='Transparentne evidované.', dec=None),
    dict(id='APP-04', bucket=A, imp=N, eff=EL, pkg='Funkcie – väčšie balíky', what='Zohľadnenie krajiny a okresu vo vyhľadávaní (produktový návrh).', note='Odložené používateľom 21. 10.; nie je to chyba.', dec=None),
    dict(id='APP-05', bucket=A, imp=N, eff=ES, pkg='Nástroje a testy', what='Asynchrónne overenie položky histórie môže prepísať novší dotaz (`useRecentSearches.tsx`).', note='Spolu s 178.', dec=None),
    dict(id='ENV-01', bucket=A, imp=N, eff=ES, pkg='Nástroje a testy', what='Dva backendové testy obrazovej moderácie blokuje Windows / gRPC (na Linuxe CI prejdú).', note='Prostredie, nie produkt.', dec=None),
    dict(id='TECH-01…11', bucket=A, imp=N, eff=EL, pkg='Upratovanie a architektúra',
         what='Nadlimitné súbory (>500 riadkov): `DashboardContent` 711, `lib/api.ts` 907, `useDashboardState` 921, `app/search/page.tsx` 648, '
              '`useDashboardNavigation` 514, `ProfileOffersSection` 1108, `ProfileOffersMobileSection` 945, `SkillDescriptionModal` 502, '
              '`useSkillsDescriptionScreenState` 638, `DashboardContentView.test` 895 (počty riadkov z 26. 10. 2026; TECH-08 už nie je nad limitom).',
         note='Technický dlh; podľa `svaply.mdc` len nahlásiť.', dec=None),
    dict(id='TOOL-01', bucket=A, imp=N, eff=ES, pkg='Nástroje a testy', what='`next lint` vyžaduje interaktívnu konfiguráciu; CI lint nespúšťa.', note='Pridať neinteraktívny lint do CI až po vyčistení chýb (178).', dec=None),
    dict(id='TOOL-02', bucket=A, imp=N, eff=ES, pkg='Nástroje a testy', what='Windows WebKit natívne nejde (Code Integrity); funguje cez Docker kontajner.', note='Obmedzenie prostredia.', dec=None),
]

REG_CLOSED = {
    'OW-01': 'PR #168; manuálne testy OK podľa používateľa (13. 10.)',
    'OW-02': 'PR #168; manuálne testy OK',
    'OW-03': 'PR #175; manuálne a review uzavreté (15. 10.)',
    'OW-04': 'PR #174; manuálne PASS',
    'OW-10': 'PR #172; manuálne a review uzavreté (14. 10.)',
    'OW-12': 'PR #172; manuálne a review uzavreté',
    'OW-13': 'PR #172; manuálne a review uzavreté',
    'OW-15': 'PR #175; manuálne a review uzavreté (15. 10.)',
    'OW-21': 'PR #184; potvrdené používateľom (18. 10.)',
    'OW-22': 'PR #184; potvrdené používateľom',
    'OW-24': 'PR #184; potvrdené používateľom',
    'TEST-05': 'opravené, celé CI zelené',
    'TEST-07': 'opravené a overené (nebola to chyba produktu)',
    'TEST-10': 'opravené v review kole (hlboký scroll)',
    'TEST-11': 'opravené v review kole',
    'TEST-17': 'opravené na vetve 151 (nález 210): diagnostický E2E podľa kontraktu OW-20, opakované hľadanie ide cez sieť',
    'DOC-01': 'opravené v review kole',
    'DOC-02': 'opravené v review kole',
    'DOC-03': 'opravené v review kole',
    'REG-01': 'historická chyba opravená, nie je otvorená; držať ako regresiu pri zásahu do formulára',
}
REG_AWAIT_LIVE = {
    'OW-16': 'PR #178', 'OW-18': 'PR #179 + #183', 'OW-19': 'PR #183', 'OW-20': 'PR #186', 'OW-23': 'PR #185',
    'TEST-01': 'k OW-02 (PR #168)', 'TEST-02': 'k OW-10 (PR #172)',
}
REG_MAPPED = {
    'APP-01': 'rovnaké ako nález 120 (otvorené)',
    'APP-02': '5 hodnôt opravených; zvyšok je súčasťou nálezu 176',
}
