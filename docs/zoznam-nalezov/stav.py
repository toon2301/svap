# -*- coding: utf-8 -*-
"""Stav zoznamu: dátum, položky opravené po prvom vydaní, tabuľka PR, rozhodnutia a denník zmien.

Tento súbor sa upravuje pri každej zmene stavu (nový nález, oprava, odpoveď na rozhodnutie); postup je v `README.md`.
"""

# Hlavička dokumentu: kedy sa naposledy menil a z akého stavu `main` sa vychádzalo.
STAV = dict(
    datum='21. 11. 2026',
    kod='`main` `8c49c5b7` (po PR #304: K31; PR #303 je zoznam 191, PR #302 je K45, PR #301 a #300 sú Codex, PR #299 zoznam 190, PR #298 je K43)',
    register='21. 10. 2026 + PR #193',
)

# Denník zmien dokumentu, najnovšie hore: (dátum, čo sa zmenilo). Záznamy do 17. 11. 2026 sú v `zmeny_starsie_2.py` a `zmeny_starsie.py`.
from zmeny_starsie import ZMENY_STARSIE  # noqa: E402
from zmeny_starsie_2 import ZMENY_STARSIE_2  # noqa: E402

ZMENY = [
    ('21. 11. 2026',
      'Doplnok 2 vetvy 192 (PR #305; `main` ostáva `8c49c5b7`). (1) Kontrola PR #305: CI (`checks`, `backend-postgres`) zelené, '
      'CodeRabbit 3 pripomienky (všetky Minor). Agent ich overil voči súborom, všetky tri sú platné a opravené v tejto vetve: (a) '
      'skript `compare.py` v `karty/K46_podklady.md` končil pri rozdieloch s kódom 0 (pridané ukončenie s kódom 1, ak je `bad` '
      'nenulové); (b) odporúčanie R63 stále vyberalo (3a), hoci text otázky po R65 (a) ponecháva len (3c) (odporúčanie je teraz '
      '(3c) s odôvodnením podľa R65 (a) a R66 (a); ostatné štyri otázky sa nezmenili); (c) pole `kedy` pri R66 žiadalo odpoveď '
      'až pred K56, čím by sa vylúčili možnosti (b) a (d); po odpovedi majiteľa je rozhodnutie zodpovedané. Vlákna na GitHube '
      'zatvára majiteľ. (2) Odpoveď majiteľa 21. 11. 2026: R66 podľa odporúčania (a): opravy 355 a 356 idú v samostatnej malej '
      'dávke K56 po poslednom presune a redizajn (344 a 261) začne až po nej. Kolegovi pošle majiteľ prácu (kartu K48) až po '
      'zlúčení vetvy 192; chce ísť postupne, jedna vec naraz (výslovne: toto treba rešpektovať), preto agent nemapuje a '
      'nepripravuje nič ďalšie (ani rekapituláciu a vizuálny návrh redizajnu, ani ďalšie karty), kým majiteľ nepovie; agent z '
      'toho vyvodil, že karta K49 ide kolegovi až po zlúčení K48 (karty K48 a K49 a porovnanie K46 sú upravené). (3) Upravené: '
      'R63, R66, nálezy 333, 355 a 356, fronta, README, karty K48, K49 a porovnanie K46 a podklady K46. (4) Prehľad: nálezy '
      '1–356, zatvorené 14, hotové 142, PRED 48, PO 132; čakajúcich rozhodnutí 10 z 66. Dopad na E2E: žiadny.'),
    ('21. 11. 2026',
      'Doplnok vetvy 192 (`main` ostáva `8c49c5b7`; PR k vetve 192 ešte nie je). (1) Porovnanie dvoch nezávislých mapovaní K46: '
      'kolega (`karty/K46_vysledok.md`, prevzaté bez zmeny obsahu) a agent (`karty/K46_agent.md`; podklady so sondou, ukážkami '
      'testov a tabuľkou 166 skúšobných pokazení sú v `karty/K46_podklady.md`); porovnanie a dohodnutý postup sú v '
      '`karty/K46_porovnanie.md`. Zhoda: karta aj mobilný detail sa dajú deliť čistými presunmi (karta 1 033 → asi 440 až 480 '
      'riadkov, mobilný detail 594 → asi 350), najväčším rizikom sú medzery v existujúcich testoch (kolega 49 zo 121 '
      'pokazení karty, agent 84 zo 166 neodhalili žiadne testy), pružný stĺpec okna stráži len odtlačok HTML a obe mapovania '
      'našli tú istú chybu okna zdieľania. (2) Overenie agenta v kópii `frontend` mimo repozitára (`main` `8c49c5b7`): chyba, '
      'ktorú našiel kolega (obnova feedu počas lajku), sa reprodukuje na pôvodnej karte; zmazanie z mobilného detailu nemá žiadny test (8 z '
      '8 pokazení prežilo aj proti 80 súborom testov, prežili aj zásahy do menu a zdieľania); test fokusu po Escape prechádza '
      'na dnešnom kóde a zachytí pokazenie H1; prototyp agenta (karta 1 033 → 481, mobilný detail 594 → 368) prešiel celým '
      'Jestom (620 sád, 9 386 testov), `tsc`, ESLint a `npm run build`, 82 z 82 pokazení po delení zachytených a 952 z 988 '
      'riadkov pôvodnej karty je doslovne v nových súboroch. (3) Dohodnutý postup (postup kolegu s doplnkami agenta): K48 '
      'ochrana karty (asi 35 testov v 9 súboroch, dočasný odtlačok HTML zo stavov oboch mapovaní a dočasná sonda poradia '
      'efektov), K49 ochrana mobilného detailu (asi 25 testov a odtlačok 4 až 5 stavov), K50 kroky a, g a b, K51 zdieľaný '
      'blok, K52 vrstvy a dialógy, K53 hlavička s menu, K54 efekty (tri hooky v troch commitoch, najrizikovejšia), K55 mobilný '
      'detail a zmazanie dočasných odtlačkov a sond, K56 opravy 355 a 356; odhad kolegu 5 až 7 dní práce (7 až 9 '
      'kalendárnych s ručnými testami); karty K48 a K49 sú napísané, ďalšie pripraví agent po zlúčení predchádzajúcej. (4) '
      'Nové nálezy: 355 (okno zdieľania ukáže po úprave vlastného príspevku starý text; obe mapovania) a 356 (obnova feedu '
      'počas prebiehajúceho lajku nechá v `currentPost` starý lajk; kolega, agent reprodukoval). Nové rozhodnutie R66 (kedy '
      'ich opraviť a kedy začne redizajn) čaká na majiteľa. (5) Upravené: fronta (333 je teraz dávka K48), nález 333, '
      'poradie, README a karta K46 (odkaz na výsledok). (6) Prehľad: nálezy 1–356, zatvorené 14, hotové 142, PRED 48, PO 132; '
      'čakajúcich rozhodnutí 11 z 66. Dopad na E2E: žiadny.'),
    ('21. 11. 2026',
      'Vetva 192 (vychádza z `main` `8c49c5b7`, teda po PR #304). (1) Zlúčené: PR #303 (vetva 191; 21. 11. 2026 o 06:55 UTC, '
      'merge `b2e7dc54`; len zoznam; CI zelené; vlákno CodeRabbitu k README ostalo formálne otvorené, no je zastarané a zatvára '
      'ho majiteľ) a PR #304 (K31, nález 341; o 07:11 UTC, merge `8c49c5b7`; jeden commit `906f7c32`, 2 súbory, +41 a −41 '
      'riadkov: `frontend/package.json` a `frontend/package-lock.json`). Kontrola agenta z GitHubu: CI (`checks`, '
      '`backend-postgres`) zelené, CodeRabbit (spustený ručne) bez pripomienok, Codex bez väčších problémov, otvorené vlákna '
      'nie sú; zmena sedí s popisom (`next` 16.4.3 → 16.4.5, `@next/env` a osem balíkov `@next/swc-*`, kód aplikácie sa '
      'nemenil). Neoverené ostáva: log nasadenia na Railway (build už nemá končiť výpisom o zraniteľnej verzii), dymový test '
      'majiteľa po nasadení a dym `@smoke` od Codexu. (2) Správa majiteľa 21. 11. 2026: zlúčil oba PR a dal kartu K46 '
      'kolegovi, teda R65 (a) je schválené (poriadne delenie `FeedPostCard.tsx` pred redizajnom, najprv mapovanie). Navyše '
      'chce dvojité mapovanie pre istotu: kým mapuje kolega, mapuje nezávisle aj agent; po dokončení kolegu pošle majiteľ '
      'agentovi jeho výsledok a agent obe mapovania porovná. Agent svoje mapovanie do porovnania nezverejní v repozitári, '
      'aby ostalo nezávislé. (3) Upravené: README (výnimka z pravidla, že mapuje kolega), fronta, poradie, nález 341 '
      '(hotový, PR #304), nálezy 229, 261, 333 a 344, rozhodnutie R65 (zodpovedané) a karta K46 (poznámka o dvojitom '
      'mapovaní). (4) Prehľad: nálezy 1–354, zatvorené 14, hotové 142, PRED 46, PO 132; čakajúcich rozhodnutí 10 z 65.'),
    ('21. 11. 2026',
      'Doplnok 3 vetvy 191 (PR #303; `main` ostáva `f0c4b789`; K31 stále nemá PR). (1) Odpoveď majiteľa 21. 11. 2026: krokom '
      'kolegu pred redizajnom je K31 (upgrade Next.js); plán, ktorý agent zhrnul (kolega urobí ten krok, po jeho zlúčení príde '
      'rekapitulácia a vizuálny návrh s odporúčaním, po 100 % dohode mapuje a implementuje agent), majiteľ potvrdil. (2) Otázka '
      'majiteľa: či nie je bezpečnejšie a lepšie rozdeliť `FeedPostCard.tsx` poriadne ešte pred redizajnom. Agent odporúča '
      'áno: nové rozhodnutie R65 (možnosti a až d, odporúčanie (a)) a napísaná karta `karty/K46.md` (mapovanie delenia '
      '`FeedPostCard.tsx` a posúdenie `FeedPostMobileDetail.tsx`, kód sa nemení, deväť bodov na overenie; predbežný rozbor '
      'agenta z čítania kódu: `ActionButton` 74-158, jediný komponent 160-1033 s 17 volaniami `useState` a 7 `useEffect`, '
      'JSX 555-1033; kartu vykresľuje 22 testových súborov). Mapovanie na K31 nezávisí; samotné delenie sa začne po zlúčení '
      'K31 a po schválení výsledku mapovania; odoslanie karty kolegovi je súhlas s R65 (a). Hrubý odhad agenta (neoverený): '
      '4 až 6 dní. (3) Upravené: fronta (K46 je prvá, 344 a 261 idú po delení), nálezy 333, 344 a 261, rozhodnutie R63 (bod '
      '3 závisí od R65), README a poradie (vlny 0 a 2). (4) Prehľad: nálezy 1–354, zatvorené 14, hotové 141 (+1 čaká na '
      'zlúčenie: 341), PRED 46, PO 132; čakajúcich rozhodnutí 11 z 65.'),
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
    ('19. 11. 2026',
      'Vetva 190 (vychádza z `main` `bc4391dc`, teda po PR #298). (1) Zlúčené: PR #296 (vetva 189; 19. 11. 2026 o 17:33 UTC, '
      'merge `2e8ab826`), PR #297 (K42; o 19:19 UTC, merge `33d2b8cc`) a PR #298 (K43; o 21:49 UTC, merge `bc4391dc`). (2) '
      'K42 (PR #297): dávka 5 z 5 delenia `FeedPostComments.tsx` (nález 333): obsluhy mutácií do `useFeedCommentMutations.ts` '
      '(226 riadkov), typ vlastností do `FeedPostComments.types.ts` (68) a zmazanie dočasného odtlačku HTML (R45); '
      '`FeedPostComments.tsx` 573 → 396 riadkov (po K43 401), pôvodne 1 487; tri commity, 5 súborov, +328 a −4 046 riadkov; '
      'podľa textov commitov čisté presuny (skladanie späť bajt po bajte, rovnaké poradie efektov), celý Jest 612 sád a 9 289 '
      'testov po krokoch 7 a 8 a 611 sád a 9 279 testov po zmazaní odtlačku, mutácie v kroku 7: 70, zachytených 40 (30 '
      'prežilo: existujúce medzery v testoch). Kontrola agenta z GitHubu a z `main`: CI aj CodeRabbit zelené, vlákna nie sú, '
      'počty riadkov sedia, odtlačok HTML sa zmazal až posledným commitom a existujúce testy sa nemenili, prvé riadky '
      'commitov 71, 68 a 54 znakov. (3) K43 (PR #298): oprava 342 podľa R60 (a) a oprava 351 podľa R61 (a): `feedPostGone.ts` '
      '83 → 114, `useFeedCommentMutations.ts` 226 → 239, `useFeedCommentsLoader.ts` 394 → 447, `FeedPostComments.tsx` 396 → '
      '401 a `FeedRepliesAutoLoader.tsx` 117 → 124 riadkov; päť commitov, 9 súborov, +1 953 a −16 riadkov; štyri nové súbory '
      'testov (398, 526, 616 a 288 riadkov, spolu 73 testov), celý Jest 615 sád a 9 352 testov, mutácie 23 z 23 (342) a 10 z '
      '11, 12 z 13 a 4 zo 4 (351). CodeRabbit 1 pripomienka (platná, opravená, vlákno zatvorené), Codex 1 pripomienka (P1, '
      'platná, opravená: popisy nových testov po slovensky; vlákno ostalo formálne otvorené, no je zastarané). Kontrola '
      'agenta: CI aj CodeRabbit zelené, počty riadkov sedia (114, 239, 447, 124 a 401), existujúce testy sa nemenili, prvé '
      'riadky commitov 61 až 69 znakov. (4) Ručný test majiteľa po K42 a K43 (19. 11. 2026) a kontrola CodeRabbitom: všetko '
      'prešlo v poriadku, nové nálezy nie sú. Nálezy 342 a 351 sú hotové; delenie `FeedPostComments.tsx` je hotové (1 487 → '
      '401 riadkov), nález 333 ostáva otvorený pre `FeedPostCard.tsx` (1 033) a `FeedPostMobileDetail.tsx` (594), R23. '
      'Výsledky kolegu sú uložené v `karty/K42_vysledok.md` a `karty/K43_vysledok.md`. (5) Kandidát kolegu z K43 (zbytočná '
      'hláška pri zastaranom zlyhaní donačítania odpovedí) je nový nález 353 (nízka); agent overil čítaním kódu, že '
      '`loadMoreReplies` kontroluje aktuálnosť len pri pozastavení, nie pri hláške, kým `loadMore` pri oboch. (6) Rozhodnutia '
      'R60 a R61 zodpovedané (podľa odporúčania; kartu K43 napísanú podľa neho majiteľ poslal kolegovi); nové rozhodnutie R62 '
      '(popisy nových testov po slovensky, pravidlo v `AGENTS.md`) čaká na majiteľa. (7) Pripravené ďalšie dva kroky pred '
      'redizajnom komentárov (dohoda s majiteľom 19. 11. 2026; mapovanie si robí kolega sám): K31 (upgrade Next.js, 341; '
      'karta `karty/K31.md`) a K45 (návrh agenta: testy pre medzery z K42 a mapovanie 344; karta `karty/K45.md`, bez zmeny '
      'produkčného kódu). Nález 341 doplnený: `SecurityFatalError` pri prvom builde štrnásť zo štrnástich. Odpoveď na otázku '
      'majiteľa: rozloženie okna detailu na počítači pri ponukách, portfóliu a príspevkoch len s textom (344, R53) nie je '
      'súčasťou redizajnu komentárov (K44); mapuje sa v K45 (časť 2) a o poradí voči K44 rozhodne majiteľ po mapovaní. '
      'Redizajn komentárov začne podľa R59 po K31 a K45; najprv treba od majiteľa podrobnosti k poľu na text pri odpovedi '
      '(R49). (8) Prehľad: nálezy 1–353, zatvorené 14, hotové 141 (pribudli 342 a 351), PRED 47, PO 131; čakajúcich '
      'rozhodnutí 10 z 62. Dopad na E2E: žiadny na špecy; K31 mení framework, preto Codex po jej nasadení spustí dym `@smoke` '
      'v okne dohodnutom s majiteľom.'),
    ('19. 11. 2026',
      'Vetva 189 (vychádza z `main` `561aaa8f`, teda po PR #295). (1) Zlúčené: PR #293 (vetva 188; 19. 11. 2026 o 10:47 UTC, '
      'merge `4ed26cd9`), PR #294 (K40; o 13:47 UTC, merge `b2df1852`) a PR #295 (K41; o 16:31 UTC, merge `561aaa8f`). (2) '
      'K40 (PR #294): oprava 346 podľa R58 (a, a): `useFeedCommentsScroll.ts` 82 → 125 a `feedCommentsLogic.ts` 178 → 223 '
      'riadkov, nový súbor testov (924 riadkov, 73 testov), mutácie 30 z 30 a 13 z 13, celý Jest 611 sád a 9 274 testov, '
      'odtlačok HTML 10 z 10 bezo zmeny; CodeRabbit 1 pripomienka (platná, opravená druhým commitom). Kontrola agenta z '
      'GitHubu a z `main`: CI aj CodeRabbit zelené, vlákno zatvorené, počty riadkov sedia, menili sa len tri súbory, prvé '
      'riadky commitov 69 a 63 znakov. (3) K41 (PR #295): oprava 338 podľa R48: `useFeedCommentsLoader.ts` 349 → 394 riadkov, '
      'nový súbor testov (494 riadkov, 15 testov), mutácie 11 z 11 a 17 zo 17, celý Jest 612 sád a 9 289 testov; CodeRabbit 2 '
      'pripomienky (platné, opravené druhým commitom, jedna presahuje kartu a schválil ju majiteľ). Kontrola agenta: CI '
      'zelené, vlákna zatvorené, počet riadkov sedí, menili sa len dva súbory, prvé riadky commitov 68 a 59 znakov. (4) Ručný '
      'test majiteľa 19. 11. 2026 (iPhone a pomalá sieť): prešlo všetko v poriadku, nálezy 346 a 338 sú hotové. Výsledky '
      'kolegu sú uložené v `karty/K40_vysledok.md` a `karty/K41_vysledok.md`. (5) Mapovanie 351 (K41): príčina je slučka (po '
      'zlyhaní ostáva `hasMore` pravdivé a sentinel sa zapína znova; v Chromiu s atrapou siete 21 dopytov a toastov za '
      'sekundu), starší stav; rovnaká slučka je pri donačítaní odpovedí (Jest sonda) a je zahrnutá v náleze 351, nové číslo '
      'netreba. Agent overil kľúčové tvrdenia čítaním kódu na `main` `561aaa8f` (toast len v `loadMore`, `enabled` sentinelu, '
      'nový observer pri každom prepnutí, ochrana vo feede a profile, `FeedRepliesAutoLoader`). (6) Rozhodnutie R58 '
      'zodpovedané (podľa odporúčania); nové rozhodnutia R60 (oprava 342: po chybe overiť dostupnosť príspevku dopytom na '
      'detail) a R61 (oprava 351: pozastaviť doťahovanie po zlyhaní a obnoviť po pollingu alebo `online`) čakajú na majiteľa, '
      'karta K43 je napísaná podľa odporúčania. (7) Pripravené dve dávky dopredu bez mapovania agentom (rozhodnutie '
      'majiteľa): K42 (posledná dávka delenia, kroky 7 a 8 a zmazanie dočasného odtlačku HTML) a K43 (opravy 342 a 351; '
      'kolega ju začína až po zlúčení K42). Nález 341 doplnený: `SecurityFatalError` pri prvom builde desať z desiatich. (8) '
      'Prehľad: nálezy 1–352, zatvorené 14, hotové 139 (pribudli 346 a 338), PRED 48, PO 131; čakajúcich rozhodnutí 11 z 61. '
      'Dopad na E2E: Codex stojí; čaká ho kontrola prekliku z komentára (345), kontrola viditeľnosti nového komentára na '
      '`webkit-mobile` s fotopríspevkom (346) a cielený beh špecov komentárov v okne dohodnutom s majiteľom.'),
    ('19. 11. 2026',
      'Vetva 188 (vychádza z `main` `dd6ca703`, teda po PR #292). (1) Zlúčené: PR #290 (vetva 187; 18. 11. 2026 o 19:11 UTC, '
      'merge `f790fe0f`), PR #291 (K38; o 21:31 UTC, merge `88b1aae4`) a PR #292 (K39; 19. 11. 2026 o 06:44 UTC, merge '
      '`dd6ca703`). (2) K38 (PR #291): dávka 4 z 5 delenia `FeedPostComments.tsx` (nález 333), kroky 5 a 6 ako čisté presuny: '
      'posun a indikátor nových do `useFeedCommentsScroll.ts` (82 riadkov) a načítanie a polling do '
      '`useFeedCommentsLoader.ts` (349 riadkov), `FeedPostComments.tsx` 884 → 842 → 573 riadkov; dva commity `fcde6240` a '
      '`7b719340`, 3 súbory; podľa textov commitov celý Jest 609 sád a 9 167 testov pred zmenou aj po nej, odtlačok HTML 10 z '
      '10 bezo zmeny, mutácie 22 z 30 a 45 z 63 zachytených (prežité sú existujúce medzery v testoch, rovnaké v pôvodnom '
      'kóde), build pri prvom behu opäť `SecurityFatalError`. Kontrola agenta z GitHubu a z `main`: CI (`checks`, '
      '`backend-postgres`) aj CodeRabbit zelené, vlákna nie sú; počty riadkov sedia (573, 82 a 349); odtlačok HTML ani '
      'existujúce testy sa nemenili; prvé riadky commitov 70 a 72 znakov. Kandidáti kolegu: žiadni. (3) K39 (PR #292): oprava '
      '345 a 350 podľa odpovede R57 (možnosť a, okno sa zatvorí aj pri „Môj profil“): `useFeedOverlayTarget.ts` 65 → 115 '
      'riadkov a nový súbor testov (571 riadkov, 34 testov; pred opravou padalo 17 z 34), mutácie 13 z 13, celý Jest 610 sád '
      'a 9 201 testov; „Späť z profilu“ kolega overil kódom a dvoma testami, nie skutočným routerom ani Safari. Kontrola '
      'agenta: CI aj CodeRabbit zelené, vlákna nie sú, v PR sa menili len hook a nový súbor testov, prvý riadok commitu 65 '
      'znakov. Nálezy 345 a 350 sú hotové. (4) Ručný test majiteľa po K38 a K39 (19. 11. 2026, 16 testov): v správe sú dve '
      'odchýlky. Nález 346 pretrváva na iPhone (test 10; po pridaní komentára aj po ťuknutí na indikátor sa zoznam posunie, '
      'ale spodná časť komentára ostáva zakrytá poľom na písanie; fotografia je u majiteľa), čo K38 predpovedala (čistý '
      'presun, posun na vrch plochy sa nemenil). Nový nález 351 (test 13): pri vypnutom internete a donačítavaní starších '
      'komentárov sa ukáže veľa rovnakých toastov namiesto jedného (prvé načítanie bez internetu je v poriadku); príčinu '
      'agent nezisťoval, mapovanie robí kolega v K41. (5) Rozhodnutie R57 zodpovedané (kartu K39 napísanú podľa odporúčania '
      'majiteľ poslal kolegovi 18. 11. 2026); nové rozhodnutie R58 (oprava 346: kam posunúť nový komentár a čo má robiť '
      'indikátor) čaká na majiteľa, karta K40 je napísaná podľa odporúčania. (6) Pripravené dve dávky dopredu bez mapovania '
      'agentom (rozhodnutie majiteľa): K40 (oprava 346 podľa R58) a K41 (oprava 338 podľa R48 a mapovanie 351); posledná '
      'dávka delenia (5 z 5, K42) a oprava 342 po kroku 7 sa pripravia po zlúčení predchádzajúcej. Nález 341 doplnený: '
      '`SecurityFatalError` pri prvom lokálnom builde sa opakuje (osem z osmich hlásených prvých buildov). (7) Odpovede '
      'majiteľa 19. 11. 2026: bod 3 karty K39 (Späť z profilu) je v poriadku; fotografiu z iPhonu ku K40 netreba prikladať. '
      'Redizajn komentárov podľa R47 smie začať po poslednej dávke delenia `FeedPostComments.tsx` (K42) a nečaká na delenie '
      '`FeedPostCard.tsx` a `FeedPostMobileDetail.tsx` (tagy a ostatné mobilné doladenia, 261 skupiny 8 a 6, čakajú aj na '
      'ne), no majiteľ rozhodol (nové rozhodnutie R59, zodpovedané), že sa nebude siliť a redizajn začne až po piatich '
      'najbližších krokoch (K40, K41, K42, K43 a K31). Pri redizajne treba vyriešiť aj pole na text pri odpovedi na komentár '
      '(podrobnosti dodá majiteľ, vzhľad sa najprv prebere, R49) a majiteľ v komentároch objavil vzhľadové chyby, ktoré '
      'zámerne nenahlásil, lebo ich redizajn zmení. Vo fronte pribudol záznam K44 (redizajn komentárov) a upravené sú K34, '
      'K31 a K42, v nálezu 261 je poznámka. (8) Kontrola CodeRabbitu k PR #293 (1 pripomienka k prvému commitu, v jadre '
      'platná, závažnosť Minor): tvrdenie z K39, že zastaraná kópia cieľa v kontexte okna nemá dosah, neplatí presne. Strážca '
      '`postOverlay?.target` vo `FeedPostComments.tsx` ju číta, takže klik na autora komentára mimo okna zavolá zbytočné '
      '`close({ keepHistory: true })` a to `forgetFeedOverlayHistory()`, ktoré môže v milisekundách po zatvorení okna (kým '
      'beží krok späť) predčasne zhasnúť príznak `closing`; zatvorenie v hooku (`handleFeedOverlayTargetChange`) `targetRef` '
      'neskúma. Pravdepodobnosť je veľmi nízka. Opravené je znenie v poznámkach a v nálezu 345, pribudol nález 352 (po '
      'nasadení, nízka); kód sa nemení a vlákno zatvára majiteľ. Druhá kontrola CodeRabbitu (po commite f8c98af2, 1 '
      'pripomienka, platná): zaradenie opravy 351 sa rozchádzalo (nález 261 a R59 mali opravu v K43, vo fronte mala K43 len '
      '342 a pri 351 stála „samostatná dávka“); zosúladené: oprava 351 ide v dávke K43 spolu s 342, až po mapovaní v K41 a po '
      'rozhodnutí majiteľa, a ak by čakala na rozhodnutie, agent sa opýta majiteľa, či redizajn komentárov na ňu počká. (9) '
      'Prehľad: nálezy 1–352 (nové 351 a 352), zatvorené 14, hotové 137 (pribudli 345 a 350), PRED 50, PO 131; čakajúcich '
      'rozhodnutí 10 z 59. Dopad na E2E: žiadny na špecy; po oprave 345 doplní Codex kontrolu prekliku z komentára, po oprave '
      '346 kontrolu viditeľnosti nového komentára na `webkit-mobile` s fotopríspevkom.'),
    ('18. 11. 2026',
      'Vetva 187 (vychádza z `main` `044a748e`, teda po PR #288). (1) Zlúčené: PR #289 (K37; 18. 11. 2026 o 17:51 UTC, merge '
      '`e10a2256`) a PR #288 (vetva 186; o 17:54 UTC, merge `044a748e`). (2) K37 (PR #289): dávka 3 z 5 delenia '
      '`FeedPostComments.tsx` (nález 333), krok 4: hľadanie cieľa do hooku `useFeedCommentsSeek.ts` (287 riadkov), '
      '`FeedPostComments.tsx` 1 098 → 884 riadkov; jeden commit `c1480fae`, 2 súbory (292 pridaných a 219 odstránených '
      'riadkov); podľa textu commitu celý Jest 609 sád a 9 167 testov pred zmenou aj po nej, odtlačok HTML 10 z 10 bezo '
      'zmeny, mutácie zachytených 21 z 24 (prežili C9 a dve staré medzery W4 a W5), build pri prvom behu opäť '
      '`SecurityFatalError`. Kontrola agenta z GitHubu a z `main`: CI (`checks`, `backend-postgres`) aj CodeRabbit zelené, '
      'vlákna nie sú; počty riadkov sedia (884 a 287); odtlačok HTML ani existujúce testy sa nemenili; prvý riadok commitu 69 '
      'znakov; brána K37 splnená (kolega čítal kartu z vetvy 186 s prísnejším znením brány). Kandidáti kolegu: žiadni; ručný '
      'test majiteľa bez nových nálezov. (3) K36 (mapovanie 345 a 346 bez vetvy; výsledok uložený v `karty/K36_vysledok.md`): '
      'oba nálezy sú starší stav, nie dôsledok K29. 345: stav okna vlastní hook `useFeedOverlayTarget.ts`, kontext okna drží '
      'druhú kópiu cieľa a strážca komentárov číta len tú, takže okno otvorené z upozornenia alebo z adresy ostane; oprava je '
      'mimo súborov nad 500 riadkov, dve možnosti (rozhodnutie R57, odporúčanie a). 346: posun na vrch plochy namiesto na '
      'prvý komentár, na mobile je nad komentármi hlavička; oprava patrí do kroku 5 delenia. Nový kandidát 350 (zoznam '
      'lajkujúcich v okne: preklik zavrie len dialóg). Agent overil kľúčové tvrdenia čítaním kódu na `main` `60c28963` (stav '
      'okna v hooku, druhá kópia v kontexte, strážca, posun a `listHeader`), merania nespúšťal; karta K36 mala nesprávny tip, '
      'že stav okna vlastní `FeedPostDetailOverlay.tsx`. (4) Nové rozhodnutie R57 (oprava 345) čaká na majiteľa. (5) '
      'Pripravené dve dávky dopredu bez mapovania agentom (rozhodnutie majiteľa): K38 (delenie, dávka 4 z 5: kroky 5 a 6) a '
      'K39 (oprava 345 podľa odporúčania R57); oprava 346 (K40) ide po K38. S Codexom ešte prebieha dlhšia práca; cielený beh '
      'po K37 čaká na nové okno. (6) Kontrola CodeRabbitu k PR #290 (1 pripomienka, platná): karta K39 tvrdila, že pri ceste '
      'cez kartu listener nič neurobí; listener však môže v tej istej obsluhe kliknutia vidieť zastaraný cieľ a okno zavrieť '
      'druhýkrát (predčasné zhasnutie príznaku `closing` v `feedOverlayHistory.ts`); karta teraz vyžaduje čítanie aktuálneho '
      'stavu a test sekvencie so zatvorením s `keepHistory` aj bez neho, doplnené aj pri nálezu 345 a v R57; vlákno zatvára '
      'majiteľ. (7) Prehľad: nálezy 1–350 (nový 350), zatvorené 14, hotové 135, PRED 51, PO 130; čakajúcich rozhodnutí 10 z '
      '57. Dopad na E2E: žiadny na špecy; po oprave 345 a 346 doplní Codex kontroly (pozri nálezy).'),
    ('18. 11. 2026',
      'Vetva 186 (vychádza z `main` `83b26a23`, teda po PR #284; po zlúčení PR #287 doplnená o jeho zápis a opravená po '
      'kontrole CodeRabbitu k PR #288). (1) Zlúčené: PR #285 (vetva 185; 18. 11. 2026 o 11:27 UTC, merge `701b7808`), PR #286 '
      '(K30; o 12:22 UTC, merge `611df449`), PR #284 (Codex; o 12:29 UTC, merge `83b26a23`) a PR #287 (Codex, zápis živého '
      'overenia; o 14:35 UTC, merge `60c28963`; commit `7fdd5718`, jediný súbor `docs/playwright-odovzdanie.md`). (2) K30 (PR '
      '#286): oprava nálezu 339, jedna podmienka v `offer_hidden_from_user`, dva commity `9fd8db45` a `2f5ba6ef` (druhý po '
      'kontrole PR: 2 z 3 pripomienok CodeRabbitu platili, jedna nie), 2 súbory (392 pridaných a 1 odstránený riadok), 17 '
      'nových testov (10 padalo pred opravou), mutácie 8 z 8 a po úprave ďalšie 3 z 3, celý backend zelený na SQLite aj '
      'PostgreSQL 16 (podľa textov commitov); CI (`checks`, `backend-postgres`) zelené, Codex review bez nálezov. Mapovanie '
      'si kolega urobil sám (rozhodnutie majiteľa 18. 11. 2026, len tentoraz); ručný test majiteľa bez chýb; nález 339 je '
      'hotový. Z K30 tri nové nálezy, ktorých citované miesta agent overil čítaním kódu (sondy nespúšťal): 347 (ponuky účtov '
      'staff a superuser cez priame id; najprv rozhodnúť, či je to zámer), 348 (osirotená recenzia neaktívneho hodnoteného '
      'používateľa) a 349 (deaktivovaný účet ostáva autentifikovaný, kým platí cache autentifikácie); skupinu a dôležitosť '
      'navrhol agent predbežne. (3) Codex: PR #284 (tri commity, 7 súborov) opravil všetky tri pripomienky z PR #281 (agent '
      'overil v kóde), CI zelené, dve nové pripomienky CodeRabbitu sú opravené neskoršími commitmi, vlákna neuzavreté. PR '
      '#287: živý beh 18. 11. 2026 na `main` `83b26a23` (obsahuje K29 aj K30), všetky tri projekty, oba živé behy bez pádu: '
      '10 prešlo, 0 zlyhalo a 20 preskočených; scenár komentárov 257 prešiel 3 z 3 a upratanie je overené; regresie po K29 7 '
      '/ 0 / 20 (14 preskočených podľa projektu a 6 pre chýbajúce prečítané upozornenia na lajk a odpoveď); 345 a 346 beh '
      'nepokrýval; agent overil čísla v odovzdaní na `main`. Codex pripraví dáta a v novom potvrdenom okne zopakuje šesť '
      'neoverených variantov; podľa trvalého pokynu majiteľa Codex dokončenú overenú prácu sám commitne a pushne (bez PR, '
      'zlúčenia a nasadenia). (4) Pripravené dve dávky dopredu bez mapovania agentom (rozhodnutie majiteľa): K36 (mapovanie '
      '345 a 346) a K37 (delenie, dávka 3 z 5, s bránou po K36). (5) Kontrola CodeRabbitu k PR #288 (9 pripomienok, v jadre '
      'platné; v nálezu 349 bol nesprávny príklad) je opravená v druhom commite vetvy: jednotná podmienka brány K37 (zastaviť '
      'pri príčine v kroku 4, pri nerozhodnom alebo chýbajúcom výsledku K36; príčina v krokoch 5 a 6 K37 neblokuje), oddelená '
      'kontrola PR od ručného testu v K37, rozsah dopadu nálezu 349 (nie celé API), nález 257 (pokryté a otvorené, historický '
      'stav po PR #281), riadok PR #281, úvod fronty (K29 a K30 hotové) a návod generátora (`polozky_nove_223.py` a '
      '`polozky_nove_k14.py`); vlákna zatvára majiteľ. (6) Prehľad: nálezy 1–349 (nové 347 až 349), zatvorené 14, hotové 135 '
      '(pribudol 339), PRED 50, PO 130; čakajúcich rozhodnutí 9 z 56. Dopad na E2E: žiadny na špecy; Codex pokračuje podľa '
      'vlastného plánu (okno určí majiteľ).'),
] + ZMENY_STARSIE_2 + ZMENY_STARSIE

# Nálezy opravené po prvom vydaní (`DONE_SINCE`), tabuľka PR (`DONE_PR_TABLE`) a popis série Upozornenia (`SERIA_UPOZORNENIA`) sú v
# `hotove.py`; tu sa len sprístupňujú pod pôvodnými názvami, aby ostatné moduly ostali nezmenené.
from hotove import DONE_PR_TABLE, DONE_PR_TABLE_CASTOCNE, DONE_SINCE, SERIA_UPOZORNENIA  # noqa: F401

# Odporúčané poradie práce (vlny). `polozky` sú ID, ktoré text vlny spomína: kontrola v `model.py` zlyhá, ak nejaké z nich
# už nie je otvorené, aby text vlny nezostal zastaraný.
PORADIE = [
    dict(vlna='0 – najprv',
         co='Rýchle upgrady z 183 a 184 bez veľkého rizika: backend (Pillow, gunicorn, requests, DRF, simplejwt, daphne, python-dotenv, bleach, '
            'Django 4.2.30, odstránenie allauth) je hotový a zlúčený (vetva 143, PR #203), frontend (`npm audit fix`, odstránený `next-intl`) je '
            'zlúčený (vetva 142). Skok `next` 14 → 16 je hotový vo vetve 159; Django 5.2 je zlúčený (vetva 154, PR #214), protobuf opravený '
            '(vetva 158, PR #217) a zo 183 ostáva len vývojový `pytest` (skupina po nasadení); upgrade `next` na 16.4.5 (341, bezpečnostné upozornenie) je hotový a zlúčený (K31, PR #304, 21. 11. 2026)',
         preco='Malé a bezpečné. Zraniteľné verzie zmiznú skôr, než pribudne ďalší kód.',
         polozky=['183']),
    dict(vlna='1 – základ, kým sa aplikácia dokončuje',
         co='Veľké skoky verzií sú hotové (Django 5.2 LTS s DRF 3.18.3 vo vetve 154, `google-cloud-vision` s protobuf vo vetve 158, '
            'Next 16 s Reactom 19 vo vetve 159) a balík „Produkčná odolnosť aplikácie“ (179, 234, 33, 9, 52 vo vetve 161; 214, 236 a 232 '
            'zlúčené vo vetve 165, PR #230; 246 v K12, PR #242; 296 v K13, PR #244; ostáva 245: overenie v logoch Railway; nový nález HNEĎ '
            '318 je zatvorený: push na iPhone nechodil pre nastavenie rollout 5 % v Railway, R33); ďalej 185, OW-07, '
            'overenie súkromia obrázkov správ (266), politika S3 bucketu v README (304) a balík „Spoľahlivosť CI a testov“ (31, TEST-…, 189, 209, 223, '
            '225, 295; 212 je '
            'hotová vo vetve 157, 228 v K6, 194 a časť 204 v K12, 244 v K14, 328 v PR #261)',
         preco='Veľké skoky verzií sú najlacnejšie teraz, kým je kódu najmenej, a hneď po nich treba spustiť celé testy.',
         polozky=['245', '185', 'OW-07', '266', '304', '31', '189', '209', '223', '225', '295']),
    dict(vlna='2 – viditeľné chyby a overenia (iPhone a mobil)',
         co='Navigácia a Späť (13, 14, 174), plynulosť prechodov na mobile (283 až 285 a 289: zvyšky po 276; 286 je hotová v K14, jej zvyšky 308 až 310 sú hotové v K16 a 311 je zatvorený rozhodnutím R38; 287 a 288 '
            'idú podľa R28 po overení na iPhone), Profil a identita (81, 272; 320 je hotová v K15), Zdieľanie a obrázky '
            '(92, 207; 301 je hotová v K13), ponuky a tagy (322 a 323 sú hotové v K15), '
            'natívne okná `alert()` namiesto toastov (302 je hotová v K17), recenzie (325 a 331 sú hotové v K21, 334 v K22, 336 v K24 a 326 a 327 v K18), Upozornenia a '
            'push (319 prepínač offline: kód je v K20, čaká na ručný test; 321 kategórie upozornení sú hotové (K19, K20, K23 a K25; zvyšok E2E je nález 337); 330 gulička Žiadostí pri vypnutej kategórii je hotová v K21, R39), Upozornenia '
            'na zmazaný obsah (74), Žiadosti (17), '
            'Vyhľadávanie a Sledovania (OW-11, OW-14, OW-17, OW-05), mobilný onboarding nových používateľov (252), vzhľad Nástenky '
            '(259 a 261; redizajn komentárov má schválený vzhľad (R52); delenie `FeedPostComments.tsx` je hotové (nález 333, K28 až K42; ostáva delenie `FeedPostCard.tsx` a `FeedPostMobileDetail.tsx`), K40 až K43 a K45 sú hotové, K31 je zlúčená (PR #304) a podľa R59, dohody s majiteľom (20. a 21. 11. 2026) a R65 (a) sa redizajn komentárov a okno na počítači (344) začnú až po delení `FeedPostCard.tsx` (K46: dvojité mapovanie je hotové a porovnané, delenie ide v dávkach K48 až K55 a opravy 355 a 356 v K56), rekapitulácii a vizuálnom návrhu; mapuje a implementuje ich agent (R64); rieši sa pri ňom aj pole na text pri odpovedi na komentár; 338 zaseknuté načítavanie komentárov je hotové v K41, 342 zmiznutý príspevok pri odpovedi, úprave a zmazaní a 351 slučka chybových hlásení pri donačítaní komentárov a odpovedí bez internetu sú hotové v K43; 353 drobná hláška pri zastaranom zlyhaní odpovedí; 355 okno zdieľania po úprave ukáže starý text a 356 starý lajk v detaile po obnove feedu počas lajku (z mapovania K46); zoznam lajkujúcich pri ponukách, portfóliu a profile 262, R20: backend je hotový v K27, vzhľad je schválený (R51 a R56) a frontend ide po etapách; úchytka panela nad fotkou 343, okno detailu na počítači 344 (mapovanie kolegu hotové v K45; po rekapitulácii a dohode ho implementuje agent, R63 a R64); 345 a 350 sú hotové v K39 a 346 viditeľnosť nového komentára na iPhone v K40) a drobnosti zo 36, živé '
            'overenie N16, RET-01..03 a ručný test VoiceOverom (294)',
         preco='To uvidí každý nový používateľ hneď prvý deň. Overenia (N16, RET-01..03, 294) sa dajú robiť už teraz na Railway a na iPhone.',
         polozky=['13', '14', '174', '283', '284', '285', '287', '288', '289', '81', '272', '92', '207', '319', '262', '333', '343', '344', '353', '355', '356', '74', '17', 'OW-11', 'OW-14', 'OW-17', 'OW-05', '252', '259', '261', '36', '294', 'N16', 'RET-01', 'RET-02', 'RET-03']),
    dict(vlna='3 – texty a súkromie',
         co='175, 176, 204, APP-03 a 186 (R2: všetkých šesť jazykov pred štartom; 332 je hotová v K21, 335 (atribút `lang` na `<html>`) v K22; 120 a 177 sú hotové v K6; 297 v K13; 306 surový „Network Error“ v toastoch v K15) a súkromie: 347 (ponuky účtov staff a superuser cez priame id; najprv rozhodnúť, či je to zámer), 348 (osirotená recenzia '
            'neaktívneho hodnoteného používateľa) a 349 (deaktivovaný účet a cache autentifikácie; najprv rozhodnúť dôležitosť); 339 je hotová v K30',
         preco='Všetkých šesť jazykov (sk, cs, hu, de, pl, en) musí byť pri štarte hotových (R2, 13. 11. 2026).',
         polozky=['175', '176', '204', 'APP-03', '186', '347', '348', '349']),
    dict(vlna='4 – keď bude aplikácia hotová',
         co='Príprava ostrého nasadenia N1–N15 (hosting, doména, právne dokumenty, server, zálohy, monitoring, smoke test), OW-06 a 180 '
            '(diagnostiku 180 možno začať už teraz)',
         preco='Robí sa na novom serveri po dokončení aplikácie.',
         polozky=['N%d' % i for i in range(1, 16)] + ['OW-06', '180']),
    dict(vlna='5 – po nasadení',
         co='Časť 5: funkcie, upratovanie, výkon, nástroje',
         preco='Podľa spätnej väzby od prvých používateľov.',
         polozky=[]),
]

# Rozhodnutia, ktoré patria používateľovi. Po odpovedi sa vyplní `odpoved` a `datum` (zobrazí sa v časti „Rozhodnuté“).
DECISIONS = [
    dict(id='R1', tema='Hosting (N1)',
         otazka='Kam nasadiť ostrú verziu pre ostatných používateľov (Railway ostáva len na testy)?',
         odporucanie='Hetzner Cloud (EÚ) + Coolify + Cloudflare + R2 (príloha C). Pre čo najmenej starostí so serverom, ak to rozpočet unesie: '
                     'Render (Frankfurt) alebo Scalingo.',
         kedy='Až keď bude aplikácia hotová. Teraz netreba.'),
    dict(id='R2', tema='Jazyky pri štarte (176, 175, APP-03)',
         otazka='Ktoré jazyky majú byť pri štarte plne preložené?',
         odporucanie='Podľa cieľového trhu. V profile a vyhľadávaní chýbajú preklady hlavne v češtine (~30) a poľštine (~14), v nemčine jeden; '
                     'v celej aplikácii má čeština asi 210 a poľština asi 90 slovenských kópií (176). Meranie kolegu z 6. 11. 2026 (hodnoty zhodné so '
                     'slovenčinou) ukázalo viac: v `cs.json` 247 (aspoň 29 určite slovenských), v `pl.json` 49, v `de.json` 3 a v `hu.json` 1, '
                     'takže rozsah 176 je väčší, než sa čakalo. Ak štart cieli len na Slovensko, 176 môže ísť po nasadení; ak aj na Česko a '
                     'Poľsko, patrí pred štart. Malé veci (120 a 177 sú hotové v K6, ostáva zvyšok 175) idú pred štart v každom prípade.',
         kedy='Rozhodnuté 13. 11. 2026.',
         odpoved='Majiteľ 13. 11. 2026: všetkých šesť jazykov aplikácie (slovenčina, čeština, maďarčina, nemčina, poľština a angličtina) '
                 'má byť pri štarte plne preložených. Majiteľ najprv odpovedal na inú vec: ako sa má jazyk vyberať (Slovensko '
                 'slovenčina, Česko čeština, Maďarsko maďarčina, Rakúsko nemčina, Poľsko poľština a zvyšok sveta angličtina); agent '
                 'vysvetlil, že R2 sa pýtal na rozsah prekladov, a z odpovede vyvodil, že každý z týchto jazykov musí byť hotový, čo '
                 'majiteľ potvrdil („určite áno“). Nález 176 (zvyšné slovenské kópie v češtine, poľštine, nemčine a maďarčine; meranie '
                 'kolegu z 6. 11. 2026: cs 247, pl 49, de 3 a hu 1 hodnôt zhodných so slovenčinou, časť sú legitímne rovnaké slová) a '
                 'súvisiace 175 a APP-03 idú pred štart a poradie jazykov netreba určovať. Výber jazyka podľa krajiny aplikácia už robí '
                 '(`LanguageContext.tsx`: krajina z IP adresy dá PL, SK, CZ a HU ich jazyk a DE a AT nemčinu, inak jazyk prehliadača, '
                 'inak slovenčina; ručná voľba v Nastaveniach má prednosť a ukladá sa v prehliadači). Rozdiel oproti pravidlu majiteľa '
                 '(zvyšok sveta má dostať angličtinu) rieši nález 332 (hotový v K21, PR #260); jazyk prehliadača alebo telefónu ostáva druhým signálom '
                 '(majiteľ 13. 11. 2026: podľa odporúčania agenta). Spôsob zisťovania krajiny (dnes cudzia služba `ipapi.co` z '
                 'prehliadača) rieši nález 186 a R7 pred štartom.',
         datum='13. 11. 2026'),
    dict(id='R3', tema='Číselné slugy (81)',
         otazka='Zakázať slug zložený len z číslic, alebo ho vo frontende uprednostniť pred ID?',
         odporucanie='Zakázať pri generovaní (predpona `u-`) a doplniť migráciu existujúcich. Frontendová záplata nerieši, že dve rôzne veci majú '
                     'rovnaký tvar.',
         kedy='Pred prácou na 81.'),
    dict(id='R4', tema='Zmazaný komentár v upozornení (74)',
         otazka='Čo má urobiť klik na upozornenie, ktorého komentár už neexistuje?',
         odporucanie='Otvoriť príspevok a ukázať krátku hlášku „komentár už nie je“, aby používateľ nezostal na slepej ceste. Pri zmazanom '
                     'príspevku platí hláška z opravy 111.',
         kedy='Pred prácou na 74.'),
    dict(id='R5', tema='Otváracie hodiny vo výsledkoch (OW-14)',
         otazka='Čo s nefunkčným tlačidlom Otváracie hodiny pri firemnej ponuke vo výsledkoch?',
         odporucanie='Doplniť popover (API údaje posiela, vzor je v profile). Ak by to bolo príliš veľké, dočasne tlačidlo skryť, aby tam nebolo '
                     'mŕtve.',
         kedy='Pred prácou na OW-14.'),
    dict(id='R6', tema='Mobilné výsledky Sledovaní v iOS PWA (OW-05)',
         otazka='Majú byť hotové pred štartom?',
         odporucanie='Až po štarte, ak Sledovania nie sú hlavná funkcia pri štarte. Je to rozšírenie (plán mobilných výsledkov), nie oprava. '
                     'Pred štartom stačí overiť, že používateľ nenarazí na slepú uličku.',
         kedy='Pred prácou na OW-05.'),
    dict(id='R7', tema='Zistenie krajiny (186)',
         otazka='Ako zisťovať krajinu používateľa bez volania cudzej služby z prehliadača?',
         odporucanie='Ak ostane Cloudflare: hlavička `CF-IPCountry` (bez tretej strany v prehliadači). Inak GeoIP databáza na backende. Volanie '
                     '`ipapi.co` z prehliadača odstrániť.',
         kedy='Až pri príprave štartu (186).'),
    dict(id='R8', tema='Django a backend balíky (183)',
         otazka='V akom poradí robiť upgrady backendu?',
         odporucanie='Najprv rýchle upgrady bez veľkého rizika (Pillow, gunicorn, requests, DRF, simplejwt, daphne, python-dotenv, bleach) a '
                     'odstránenie nepoužívaného allauth, potom samostatný balík Django 5.2 LTS. Každý na vlastnej vetve s celými backendovými testami.',
         kedy='Pred prácou na 183.',
         odpoved='Podľa odporúčania: najprv rýchle upgrady a odstránenie allauth (183a, vetva 143), potom samostatný balík Django 5.2 LTS (183b); '
                 'každý na vlastnej vetve s celými backendovými testami.',
         datum='27. 10. 2026'),
    dict(id='R9', tema='Next.js 14 → 15 / 16 (184)',
         otazka='Povýšiť Next pred štartom a kde bude frontend bežať?',
         odporucanie='Samostatný balík pred štartom (pravdepodobne aj React 19, viď 153). Frontend nechať na vlastnom serveri a zraniteľnosť '
                     'odstrániť upgradom, nie presunom na Vercel (C.4).',
         kedy='Pred prácou na 184; časť o hostingu frontendu až neskôr (R1).',
         odpoved='Podľa odporúčania: samostatná vetva 159 pred štartom s Next 16.4.3 a Reactom 19.3.1; frontend ostáva na vlastnom serveri, '
                 'nie na Verceli. Majiteľ odsúhlasil aj plán s upozornením na novú minimálnu podporu Safari 16.4 (iOS 16.4).',
         datum='31. 10. 2026'),
    dict(id='R10', tema='Obrazová moderácia pri výpadku (N10)',
         otazka='Čo robiť, keď Google Vision nie je dostupný?',
         odporucanie='Produkcia je už nastavená „fail-closed“: obrázok sa odmietne s hláškou „Kontrola bezpečnosti obrázka zlyhala, skúste neskôr.“ '
                     'Odporúčanie je ponechať (bezpečnejšie), len počítať s tým, že pri výpadku Google sa nedajú nahrať obrázky, a sledovať kvóty.',
         kedy='Až pri príprave štartu (N10); stačí potvrdiť.'),
    dict(id='R11', tema='Stará bezpečnostná správa (185)',
         otazka='Čo so zastaranou správou `SECURITY_AUDIT_REPORT.md` z roku 2024?',
         odporucanie='Archivovať mimo repozitára (alebo prepísať podľa dnešného stavu) a overiť, či je repozitár verejný: interné audity a poznámky '
                     'o rizikách tam nepatria.',
         kedy='Pred prácou na 185.'),
    dict(id='R12', tema='Dvojfázové overenie – 2FA (235)',
         otazka='Dokončiť 2FA (zapnutie, QR kód, záložné kódy, zadanie kódu pri prihlásení) pred štartom, alebo až po ňom?',
         odporucanie='Až po nasadení. Cez aplikáciu si ho dnes nemôže zapnúť nikto (zapnúť sa dá len ručne v databáze), takže jeho chýbanie bežným používateľom '
                     'neškodí; dokončenie je väčšia práca '
                     '(koncové body, QR kód, záložné kódy, obrazovky vo všetkých jazykoch, ochrana pred opakovaním kódu, testy). Ak má byť '
                     '2FA pri štarte (napr. kvôli firemným účtom), patrí do vlny 1.',
         kedy='Pred prácou na 235; dovtedy sa 2FA používateľom neponúka.'),
]

# Rozhodnutia R13–R40 (zoznam majiteľa v prílohe D a rozhodnutia po ňom) sú v `rozhodnutia_nastenka.py` a R41 a ďalšie v
# `rozhodnutia_dalsie.py` (kvôli limitu 500 riadkov); pripájajú sa sem.
from rozhodnutia_nastenka import DECISIONS_NASTENKA  # noqa: E402
from rozhodnutia_dalsie import DECISIONS_DALSIE  # noqa: E402

DECISIONS.extend(DECISIONS_NASTENKA)
DECISIONS.extend(DECISIONS_DALSIE)

# Rozhodnutia od R66 (po dvojitom mapovaní K46) sú v `rozhodnutia_k46.py`.
from rozhodnutia_k46 import DECISIONS_K46  # noqa: E402

DECISIONS.extend(DECISIONS_K46)
