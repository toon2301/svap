# -*- coding: utf-8 -*-
"""Starší denník zmien dokumentu (20. 11. 2026): `ZMENY_STARSIE_3`, najnovšie hore.

Samostatný súbor kvôli limitu 500 riadkov; `stav.py` ho pripája za `ZMENY` a pred `ZMENY_STARSIE_2` (z `zmeny_starsie_2.py`). Nový záznam sa pridáva na začiatok `stav.ZMENY`.
"""

ZMENY_STARSIE_3 = [
    ('20. 11. 2026',
      'Doplnok 2 vetvy 191 (PR #303; `main` ostáva `f0c4b789`). (1) Nález CodeRabbitu, ktorý majiteľ spomenul 20. 11. 2026, '
      'je jediný, ktorý bot k PR #303 dal (README, mapovanie pri nálezoch HNEĎ); je opravený v commite `bd694e02` (vlákno je '
      'zastarané, no otvorené; zatvára ho majiteľ) a README je teraz zosúladené aj s dohodou nižšie. (2) Rozhodnutia majiteľa '
      '20. 11. 2026: (a) R64 zodpovedané: keď sa na 100 % dohodne, čo a ako bude vyzerať, mapovanie (znova) aj implementáciu '
      'redizajnu komentárov (261) a rozloženia okna príspevkov na počítači (344: ponuka, portfólio a text) robí agent, nie '
      'kolega; ak má agent nejasnosť, pýta sa; (b) pred tým urobí kolega ešte jeden krok a po jeho zlúčení príde '
      'rekapitulácia: agent pošle vizuálny návrh, ako to bude vyzerať, s odporúčaním (nie hneď, R49), a až po 100 % dohode sa '
      'začne mapovanie a implementácia; ktorý krok kolegu to je (K31, alebo delenie `FeedPostCard.tsx` kvôli natiahnutiu '
      'fotky karty ako pri príspevku s foto), sa upresňuje; (c) R63 ostáva otvorené a rozhodne sa pri rekapitulácii. (3) '
      'Upravené: README (výnimky z mapovania kolegom, tabuľka „Kto čo robí“), fronta (344 a 261 robí agent po 100 % dohode, '
      'karta pre kolegu sa nepíše), stav, nálezy 344 a 261 a rozhodnutia R63 a R64. (4) Prehľad: nálezy 1–354, zatvorené 14, '
      'hotové 141 (+1 čaká na zlúčenie: 341), PRED 46, PO 132; čakajúcich rozhodnutí 10 z 64.'),
    ('20. 11. 2026',
      'Doplnok vetvy 191 (PR #303; `main` ostáva `f0c4b789`). (1) Kontrola PR #303 (20. 11. 2026): CodeRabbit 1 pripomienka '
      '(Minor, platná): rozpor v README medzi pravidlom, že mapovanie nálezov od 18. 11. 2026 robí kolega a agent ich '
      'nemapuje, a časťou „Keď niečo zlyhá (nález HNEĎ)“, kde príčinu mapuje agent; opravené výslovnou výnimkou pre nález '
      'HNEĎ v oboch častiach (do rozhodnutia R64). CI zelené. (2) Správa majiteľa 20. 11. 2026 k bodu 3 v R63: ponuka a '
      'portfólio majú v okne na počítači fungovať „tak ako príspevok s foto“, teda fotka karty vyplní zvyšok ľavého stĺpca. '
      'Agent overil čítaním kódu, že tvrdenie z mapovania 344, že natiahnutie karty ide bez zásahu do `FeedPostCard.tsx`, sa '
      'nepotvrdilo (kartu vykresľuje len `FeedPostCard.tsx:803-815` bez výšky a obal `:781-799` je blok, nie flex stĺpec; pri '
      'fotke príspevku je fotka v pružnom bloku `feed-post-media-fill`, `:742-760`). Dva stĺpce a úzke okno len s textom bez '
      'zásahu do `FeedPostCard.tsx` ostávajú v platnosti. Opravený je nález 344, rozhodnutie R63 (bod 3: najprv rozloženie a '
      'natiahnutie po vyčlenení zdieľaného bloku, alebo jednorazová výnimka pre `FeedPostCard.tsx`, alebo všetko po delení '
      'K46), záznam vo fronte, poznámka v `karty/K45_vysledok.md` a README. (3) Prehľad nezmenený: nálezy 1–354, zatvorené '
      '14, hotové 141 (+1 čaká na zlúčenie: 341), PRED 46, PO 132; čakajúcich rozhodnutí 11 z 64.'),
    ('20. 11. 2026',
      'Vetva 191 (vychádza z `main` `f0c4b789`, teda po PR #302). (1) Zlúčené: PR #299 (vetva 190; 20. 11. 2026 o 06:10 UTC, '
      'merge `77204a57`), PR #300 (Codex, `e2e/notifikacie-prekliky`; o 06:37 UTC, merge `1c454330`; len dokumentácia: živé '
      'overenie šiestich preklikov upozornení z 19. 11. na `main` `bc4391dc`, 6 prešlo, 0 zlyhalo, 0 preskočených), PR #301 '
      '(Codex, `e2e/komentare-345-346`; o 10:54 UTC, merge `7481c4e4`; 18 súborov, +876 a −33 riadkov: E2E regresie 345 a '
      '346, lokálne overené, živý beh zatiaľ nebehol; kontrola CodeRabbitu a Codexu mala 6 pripomienok, riešené v troch '
      'ďalších commitoch, štyri vlákna ostali formálne otvorené, no sú zastarané; CI zelené) a PR #302 (K45; o 11:12 UTC, '
      'merge `f0c4b789`; päť nových súborov testov, +1 198 riadkov; CI zelené, CodeRabbit nebehol (repozitár nemá automatické '
      'kontroly), Codex bez väčších problémov). (2) K45 (PR #302): časť 1: päť nových súborov testov (34 testov: poradie '
      'zápisu pri mutáciách, výsledky a stav „odosiela sa“, ochrany hooku, medzery načítania), celý Jest 620 sád a 9 386 '
      'testov, z 47 mutácií zachytených 42 (pred novými testami 9), prežilo 5 nepozorovateľných (W7, R3, R6, R7, LR1; agent '
      'overil čítaním servera, že LR1 je nepozorovateľná: náhľad vkladá 10 najnovších odpovedí a donačítavanie berie len '
      'staršie); produkčný kód ani existujúce testy sa nemenili. Časť 2: mapovanie 344 (výsledok `karty/K45_vysledok.md`, '
      'zapísané v náleze 344): obe zmeny sa dajú urobiť bez zásahu do `FeedPostCard.tsx` (dve malé úpravy v '
      '`FeedPostDetailOverlay.tsx` a `FeedPostDetailSplitLayout.tsx`, jedna dávka v dvoch commitoch), prototyp v kópii zlomil '
      'presne 4 existujúce testy, žiadny špec E2E nepadne; agent overil kľúčové tvrdenia čítaním kódu na `main` (riadky v '
      'piatich súboroch, štyri testy a E2E odkazy sedia). Delenie `FeedPostCard.tsx` nie je podmienkou. Odporúčané poradie: '
      '344 pred redizajnom komentárov; päť drobností na rozhodnutie je nové R63. (3) K31 (Next.js 16.4.5, nález 341): vetva '
      '`K31` (commit `906f7c32` nad `1c454330`) je nahratá, PR k nej ešte nie je a v `main` nie je (CI nebežalo); agent '
      'overil obsah (2 súbory, 10 balíkov v zámku, všetko z `registry.npmjs.org`, bez konfliktu s `main`) a vlastným `npm '
      'audit --omit=dev`: `main` 6 záznamov (`next` so siedmimi upozorneniami), vetva 5 záznamov bez `next` (nález 229). '
      'Nález 341 je zapísaný ako opravený, čaká na PR a zlúčenie. (4) Ručné testy majiteľa (20. 11. 2026): otestované, čo '
      'išlo, bez nálezov (K45 nemení produkčný kód a K31 nie je zlúčená, takže sa nenasadila). (5) Kandidát z K31: nový nález '
      '354 (prázdny koreňový `package-lock.json`, varovanie pri zostavení). K nálezu 229 pribudol doplnok (po K31 ostáva 5 '
      'záznamov, `npm audit` ponúka `@sentry/nextjs` 11.15.0, nová hlavná verzia). (6) Otázky majiteľa 20. 11. 2026: čo ešte '
      'treba pred redizajnom komentárov a oknom na počítači a prečo mapoval kolega: odpoveď v správe; rozdelenie práce (kto '
      'navrhuje vzhľad, kto mapuje, kto píše kód, kto kontroluje) je nové rozhodnutie R64. (7) Prehľad: nálezy 1–354, '
      'zatvorené 14, hotové 141 (+1 čaká na zlúčenie: 341), PRED 46, PO 132; čakajúcich rozhodnutí 11 z 64. Dopad na E2E: '
      'Codex po zlúčení a nasadení K31 spustí dym `@smoke`; živý beh nových regresií 345 a 346 čaká na okno a údaje.'),
    ('20. 11. 2026',
      'Doplnok vetvy 190 (PR #299; `main` ostáva `bc4391dc`). (1) Kontrola PR #299 (20. 11. 2026): CodeRabbit 1 pripomienka '
      '(Minor, platná), Codex bez nálezov, CI (`checks`, `backend-postgres`) zelené. Pripomienka: údaj „najneskôr do 8 s“ pri '
      'obnove po zlyhaní donačítania (nález 351, K43) platí len pri aktívnom pollingu. Agent to overil čítaním '
      '`useFeedCommentsPolling.ts`: polling beží každých 8 s, no tik sa preskočí pri skrytej karte a po piatich minútach bez '
      'činnosti používateľa; po udalosti `online` sa obnova robí hneď (`useFeedCommentsLoader.ts`). Opravené je znenie v '
      '`hotove_k40.py`, v rozhodnutí R61 (otázka a odporúčanie) a v `karty/K43_vysledok.md` (dve spresnenia v hranatých '
      'zátvorkách, obsah strany inak bez zmeny); rovnaké staršie znenie v už zlúčených stranách (`karty/K41_vysledok.md`, '
      '`karty/K43.md`) sa neupravovalo, lebo ide o históriu. (2) Majiteľ 20. 11. 2026: rozhodnutie R62 podľa odporúčania (a): '
      'popisy nových testov po slovensky, staré sa neprekladajú; veta je doplnená do `AGENTS.md` a do '
      '`.cursor/rules/svaply.mdc`, karta K45 aj poznámka sú zosúladené. Pole na text pri odpovedi na komentár sa rieši až pri '
      'redizajne (K44), nič sa kvôli tomu nezapisuje. (3) Prehľad: nálezy 1–353, zatvorené 14, hotové 141, PRED 47, PO 131; '
      'čakajúcich rozhodnutí 9 z 62. Dopad na E2E: žiadny.'),
]
