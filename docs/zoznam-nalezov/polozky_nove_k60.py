# -*- coding: utf-8 -*-
"""Nové nálezy od čísla 378: 379 je kandidát z mapovania K60 (kolega, PR #336; agent ho overil čítaním kódu a sondou 25. 11. 2026; 378 je hotový v K61, PR #338), 380 je z ručného testu vetvy 213 (majiteľ, 26. 11. 2026) a 381 z odovzdania Codexu (PR #341).

Samostatný súbor kvôli limitu 500 riadkov; `polozky_nove.py` ich pripája do `NEW_ITEMS`. Pravidlá sú rovnaké ako inde: otvorený nález sa po oprave odstráni odtiaľto a zapíše do `hotove_k59.DONE_SINCE_K59` (alebo do novšieho súboru hotových); čísla sa nikdy nepoužívajú znova.
"""

from konstanty import A, EL, EM, ES, H, N, P, S_, V  # noqa: F401

NEW_ITEMS_K60 = [
    dict(n=379, bucket=A, imp=N, eff=ES, pkg='Nástenka a zdieľanie',
         kratko='ponuka s fotkou zo starého nahrávania (schválená, ale bez `approved_key`) sa zdieľa bez náhľadu',
         what='Mapovanie K60 (kolega, `karty/K60_vysledok.md`, PR #336; agent overil čítaním kódu a sondou 25. 11. 2026): starý '
              'synchrónny endpoint na nahrávanie fotky ponuky (`views/skills.py` okolo r.423) zakladá riadok '
              '`OfferedSkillImage` len s poľom `image`: stav je predvolene schválený a `approved_key` je prázdny. Zdieľanie '
              'ponuky (`sharing.py:246-255`) preberá len riadky s neprázdnym `approved_key`, takže ponuka s takouto fotkou sa '
              'zdieľa bez náhľadu už pred akoukoľvek zmenou fotky (na karte „Bez fotografie“), hoci sama ponuka fotku ukazuje. '
              'Endpoint je pri nastavenom úložisku vypnutý (`views/skills.py:352-360`), riadky však mohli zostať z čias, keď '
              'bol zapnutý.',
         note='NEJASNÉ: výskyt v produkcii neviem. Najprv dopyt len na čítanie v prostredí s dátami (spúšťa majiteľ alebo '
              'agent): počet `OfferedSkillImage` so stavom `approved` a prázdnym `approved_key`. Ak je počet nulový, nález sa '
              'zatvorí; ak nie, oprava je jednorazové doplnenie `approved_key` (príkaz alebo migrácia, rozhodne majiteľ) alebo '
              'čítanie aj poľa `image` v náhľade. Oprava 371 (K61, zlúčená) tieto riadky nevyliečila: číta len '
              '`approved_key` a test K61 to potvrdzuje (riadok bez `approved_key` sa preskočí). Dopad na E2E: žiadny. Odhad: nízky · S.',
         dec=None, src='mapovanie K60 (kolega, PR #336; overil agent 25. 11. 2026)'),
    dict(n=380, bucket=P, imp=S_, eff=EM, pkg='Vyhľadávanie a Sledovania',
         kratko='počítač: na stránke úplných výsledkov vyhľadávania (`/search`) sa nedá otvoriť panel upozornení; v ľavom menu tej '
                'istej stránky nefungujú ani Správy a Štatistiky',
         what='Zistil majiteľ pri ručnom teste vetvy 213 (26. 11. 2026), počítač. Postup: otvoriť vyhľadávanie, zadať výraz '
              '(napríklad „ap“), kliknúť na „Zobraziť všetko“ a na samostatnej stránke výsledkov (`/search?q=ap`) kliknúť v ľavom '
              'navigačnom paneli na „Upozornenia“. Skutočný výsledok: panel upozornení sa neotvorí. Očakávaný výsledok: panel sa '
              'otvorí rovnako ako v ostatných sekciách aplikácie. S opravou A (vetvy 212 a 213) to nesúvisí, ide o staršie správanie '
              'samostatnej stránky `/search`. PRÍČINA (agent, čítanie kódu a prototyp, 26. 11. 2026): stránka `/search` má vlastné '
              'rozloženie `components/search/SearchLayout.tsx` (181 riadkov), nie `DashboardLayout.tsx`. Do ľavého menu (`Sidebar`) '
              'podáva `onItemClick`, `onLogout` a `onSearchClick`, ale nie `onNotificationsClick`; `Sidebar` preto pri ťuku na '
              'Upozornenia zavolá `onItemClick` s hodnotou `notifications`, ktorú `SearchLayout.handleItemClick` nepozná a skončí bez '
              'akcie. To isté platí pre `messages` a `statistics`: sú v menu, no `handleItemClick` v `SearchLayout` ich nemá, takže '
              'nefungujú ani Správy a Štatistiky. `SearchLayout` navyše panel upozornení vôbec nemá (druhý stĺpec mriežky patrí len '
              'vyhľadávaciemu panelu) a `RequestsNotificationsProvider` nedostáva `acknowledgeNotificationsBadge`. Ľavé menu sa '
              'kreslí len v týchto dvoch rozloženiach, takže `/search` je jediné miesto s touto chybou. REPRODUKCIA (prototyp v kópii '
              'mimo repozitára, zloženej z `main` `8afe1fd6`): nový súbor testov s 23 testami pred opravou padá 16, medzi nimi '
              'otvorenie panela upozornení, prechod Správ na `/dashboard/messages` a Štatistík na `/dashboard/statistics`.',
         note='JASNÉ (karta `karty/K62.md`, podklady `karty/K62_podklady.md`, pripravená 26. 11. 2026 pre kolegu; vzhľad sa nemení: '
              'panel je ten istý `NotificationsFeed variant="panel"` ako v dashboarde a stĺpec je ten istý ako pri vyhľadávaní, R49 '
              'sa netýka). NÁVRH OPRAVY (overený prototypom, len `SearchLayout.tsx`, 181 → asi 215 riadkov): nový stav '
              '`isNotificationsPanelOpen`; vyhľadávanie a upozornenia sa v jednom stĺpci striedajú (`SearchModule` ostáva '
              'namontovaný, len skrytý, aby sa zachoval napísaný dopyt); preklik z panela volá `router.push` len pre adresy '
              '`/dashboard` a `/dashboard/…`; zatvorenie klikom mimo a klávesom Escape platí pre oba panely; Správy a Štatistiky vedú '
              'na `/dashboard/messages` a `/dashboard/statistics`; poskytovateľ upozornení dostane potvrdenie odznaku, kým je panel '
              'otvorený. PROTOTYP: 23 testov (pred opravou padá 16, po oprave prechádza všetkých 23), zásahy do kódu 14 zo 14 '
              'zachytených, `components/search` a `app/search` (22 sád, 345 testov) bez pádu, `tsc` čisté, ESLint 0 chýb. Dopad na '
              'E2E: žiadny teraz; po zlúčení pridá Codex jeden desktopový scenár (otvorenie a zatvorenie panela upozornení na stránke '
              'výsledkov, len čítanie). Odhad: stredný · M.',
         dec=None, src='ručný test majiteľa po vetve 213 (26. 11. 2026), čítanie kódu a prototyp agenta'),
    dict(n=381, bucket=P, imp=N, eff=ES, pkg='Spoľahlivosť CI a testov',
         kratko='Windows a macOS: `FeedKeyboardDiagnostics.tsx` a `feedKeyboardDiagnostics.ts` (aj dva súbory testov) sa líšia len '
                'veľkosťou písmen, takže `tsc` hlási chyby a čerstvý checkout nie je čistý',
         what='Nahlásil Codex pri práci na vetve `e2e/detail-prispevku-mobil` (26. 11. 2026, `docs/playwright-odovzdanie.md`). Na '
              'Windows hlási `tsc --noEmit --incremental false` celej aplikácie štyri chyby (TS1149, TS1261 a TS1192): import '
              'komponentu `FeedKeyboardDiagnostics.tsx` sa stretáva s modulom `feedKeyboardDiagnostics.ts` v tom istom priečinku '
              '(`components/dashboard/modules/feed/`), ktoré sa líšia len veľkosťou prvého písmena. Git obsahuje aj oba súbory '
              'testov, `__tests__/FeedKeyboardDiagnostics.test.tsx` (komponent, 186 riadkov) a '
              '`__tests__/feedKeyboardDiagnostics.test.tsx` (modul, 295 riadkov), ktoré sa na Windows (a v predvolenom nastavení aj '
              'na macOS) nedajú odlíšiť: aj čerstvý checkout preto ukazuje miestnu zmenu prvého z nich. Všetky štyri súbory vznikli v '
              'kole 3c (commit `79a34b6c`, skrytá diagnostika viditeľnej plochy, nález 375). Na Linuxe, v CI ani na Railway to nemá '
              'dopad a E2E typy prešli samostatne. Komponent importujú `FeedPostMobileDetail.tsx` (r. 56) a `FeedPhotoViewer.tsx` (r. '
              '37), modul `FeedPhotoCommentsSheet.tsx` a testy `FeedPhotoViewer.diagnostika.test.tsx` a '
              '`FeedPostMobileDetail.diagnostika.test.tsx`.',
         note='JASNÉ (malé premenovanie; píše agent po zlúčení K62 a jej ručnom teste, R84). NÁVRH OPRAVY: komponent '
              '`FeedKeyboardDiagnostics.tsx` a jeho test sa premenujú na `FeedKeyboardDiagnosticsPanel.tsx` a '
              '`FeedKeyboardDiagnosticsPanel.test.tsx` (`git mv`, aby sa zachovala história) a aktualizujú sa importy v '
              '`FeedPostMobileDetail.tsx`, `FeedPhotoViewer.tsx` a v samotnom teste; modul `feedKeyboardDiagnostics.ts` a jeho test '
              'ostávajú. Oba produkčné súbory sú pod 500 riadkov. Overenie: `tsc` bez chýb, Jest oboch súborov testov a celého stromu '
              '`feed`, a na Windows (majiteľ alebo Codex) `tsc --noEmit --incremental false` bez chýb a čistý `git status` po '
              'čerstvom checkoute. Dopad na E2E: žiadny. Odhad: nízky · S.',
         dec=None, src='Codex (odovzdanie PR #341, 26. 11. 2026)'),
]
