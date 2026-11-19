# -*- coding: utf-8 -*-
"""Stav zoznamu: dátum, položky opravené po prvom vydaní, tabuľka PR, rozhodnutia a denník zmien.

Tento súbor sa upravuje pri každej zmene stavu (nový nález, oprava, odpoveď na rozhodnutie); postup je v `README.md`.
"""

# Hlavička dokumentu: kedy sa naposledy menil a z akého stavu `main` sa vychádzalo.
STAV = dict(
    datum='19. 11. 2026',
    kod='`main` `bc4391dc` (po PR #298: K43; PR #297 je K42, PR #296 zoznam 189, PR #295 je K41)',
    register='21. 10. 2026 + PR #193',
)

# Denník zmien dokumentu, najnovšie hore: (dátum, čo sa zmenilo). Záznamy do 16. 11. 2026 sú v `zmeny_starsie_2.py` a `zmeny_starsie.py`.
from zmeny_starsie import ZMENY_STARSIE  # noqa: E402
from zmeny_starsie_2 import ZMENY_STARSIE_2  # noqa: E402

ZMENY = [
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
    ('18. 11. 2026',
      'Vetva 185 (vychádza z `main` `a9d0fc0c`, teda po PR #283). (1) Vetva 184 (PR #282, zlúčené 18. 11. 2026 o 06:11 UTC, '
      'merge `8f059cf7`; tri commity `550de6f1`, `0416caf3` a `96b48163`) je zlúčená: pripomienka CodeRabbitu k nej (nález '
      '261: prianie o šípke je prekonané R55) bola platná a je opravená a nález 265 je na žiadosť majiteľa presunutý z PO do '
      'PRED. (2) K29 (PR #283, zlúčené 18. 11. 2026 o 07:21 UTC, merge `a9d0fc0c`; tri commity `a042993f`, `9b5a5f89` a '
      '`eca1e650`; 7 súborov): dávka 2 z 5 delenia `FeedPostComments.tsx` (nález 333), čisté presuny: 1 487 → 1 098 riadkov a '
      'šesť nových súborov (`feedCommentsLogic.ts` 178, `FeedCommentItem.tsx` 206, `FeedCommentComposer.tsx` 135, '
      '`FeedCommentsNewIndicator.tsx` 70, `FeedCommentsLoadingMore.tsx` 25 a nový súbor testov 319 riadkov). Podľa textov '
      'commitov: celý Jest po každom kroku 609 sád a 9 167 testov prešlo, odtlačok HTML bezo zmeny, mutácie 19 z 19, 8 z 9 a '
      '10 z 11 (dve prežili ako staré medzery v testoch), lokálny build pri prvom behu v každom kroku `SecurityFatalError` '
      '(pozri 341). Kontrola agenta z GitHubu a z `main`: CI (`checks`, `backend-postgres`) aj CodeRabbit zelené, vlákna nie '
      'sú; počty riadkov na `main` sedia s commitmi; odtlačok HTML ani existujúce testy sa v PR nemenili; dotknutý je jediný '
      'súbor nad 500 riadkov (`FeedPostComments.tsx`, R23). Kandidáti kolegu: žiadni. (3) Ručný test majiteľa 18. 11. 2026: '
      '14 z 14 vykonaných, 12 prešlo bez novej chyby v hodnotenom rozsahu a 2 čiastočne (testy 6 a 13). Nové nálezy podľa '
      'opisu majiteľa, bez mapovania agentom: 345 (počítač: detail príspevku ostane otvorený po prechode na profil autora '
      'komentára) a 346 (iPhone: nový komentár nie je celý viditeľný po vlastnom odoslaní ani po kliknutí na upozornenie o '
      'nových komentároch); či ide o starší stav alebo dôsledok K29, zistí kolega. (4) Rozhodnutie majiteľa 18. 11. 2026: '
      'mapovanie si tentoraz robí kolega sám, agent kód nečíta. (5) Codex (PR #284, vetva `e2e/komentare-257-opravy`, tri '
      'commity `90ee57b8`, `1e9110ae` a `e58274c4`, 7 súborov; v čase zápisu otvorený a nezlúčený, CI zelené): opravuje '
      'všetky tri pripomienky z PR #281 a dve nové pripomienky CodeRabbitu sú v kóde opravené neskoršími commitmi; vlákna sú '
      'na GitHube neuzavreté (zatvára majiteľ). (6) Fronta: karta K30 (oprava 339; mapovanie robí kolega), potom návrh K36 '
      '(mapovanie 345 a 346), dávka 3 z 5 delenia a K31 až K35. (7) Prehľad: nálezy 1–346 (nové 345 a 346), zatvorené 14, '
      'hotové 134, PRED 48, PO 130; čakajúcich rozhodnutí 9 z 56. Dopad na E2E: žiadny; po zlúčení PR #284 ostáva Codexovi '
      'živý beh scenára komentárov a po K29 cielený beh špecov `feed-post-detail.spec.ts` a `notification-click.spec.ts` v '
      'okne dohodnutom s majiteľom.'),
    ('17. 11. 2026',
      'Vetva 184 (vychádza z `main` `eac245bf`, teda po PR #281). (1) Vetva 183 (PR #279, zlúčené 17. 11. 2026 o 09:56 UTC, merge '
      '`7134cab6`; dva commity `3e417e56` a `9de4d792`) je zlúčená; dve pripomienky CodeRabbitu k nej agent opravil v `9de4d792` a ich '
      'vlákna ostali na GitHube neuzavreté (zatvára majiteľ). (2) Codex (PR #280, vetva `e2e/api-repeat-340`, zlúčené 17. 11. 2026 o '
      '10:48 UTC, merge `d600b925`; commit `c511b99d`; 6 súborov v `frontend/e2e/**`): hotová oprava poistky `--repeat-each` (nález 340, '
      'R50), lokálne overená (49 z 49 čistých a 5 z 5 prehliadačových kontrol); kontrola agenta z GitHubu: CI (`checks`, '
      '`backend-postgres`) a CodeRabbit zelené, vlákna nie sú. (3) Codex (PR #281, vetva `e2e/komentare-257`, zlúčené 17. 11. 2026 o '
      '11:53 UTC, merge `eac245bf`; commit `7225cc82`; 15 súborov, z toho 14 nových súborov E2E a `docs/playwright-odovzdanie.md`): '
      'pripravený bezpečný scenár pridania a zmazania vlastného komentára (nález 257; vlastný textový príspevok, desktop aj mobil, '
      'upratanie; lokálne 20 z 20 kontrol logiky, 11 z 11 prehliadačových kontrol a 24 z 24 zámerných chýb odhalených; živý beh čaká '
      'na samostatné okno majiteľa). Odovzdanie nesie aj živé overenie 337: prvý pokus v okne 09:00 až 09:15 skončil na podmienke '
      '`in_app_notifications` (0 prešlo, 1 zlyhalo, 1 preskočené, žiadny zápis; nie chyba aplikácie), po ručnej príprave účtu '
      'majiteľom a novom okne 09:25 až 09:40 dal beh 2 prešlo, 0 zlyhalo a 0 preskočených (WebKit desktop aj mobil, všetkých sedem '
      'hodnôt overených), preto je nález 337 hotový. Kontrola agenta z GitHubu: CI (`checks`, `backend-postgres`) a CodeRabbit zelené, '
      'no PR bolo zlúčené s tromi neuzavretými vláknami (Codex review P2 a dve pripomienky CodeRabbitu Minor); agent ich overil v '
      'kóde a všetky tri platia (pozri nález 257), opraví ich Codex v malej vetve pred živým behom. (4) Rozhodnutia majiteľa zo 17. '
      '11. 2026 pri návrhu vzhľadu zoznamu lajkujúcich a komentárov (mobil aj počítač; obrázky v `navrhy/`): R51 (bublinka so '
      'zoznamom lajkujúcich na všetkých miestach), R52 (vzhľad komentárov a odpovedí s bublinkou), R53 (okno detailu na počítači: '
      'ponuka a portfólio v dvoch stĺpcoch, okno len s textom užšie), R54 (prehliadač fotky zo zdieľania ostáva pri pôvodnom '
      'príspevku), R55 (tenká úchytka panela nad fotkou) a R56 (text pri skrytých lajkujúcich). Nové nálezy: 343 (úchytka je kvôli '
      '`button { min-height: 36px }` ovál 40×36 px; overené čítaním kódu) a 344 (okno detailu na počítači). Frontend nálezu 262 má '
      'schválený vzhľad a ide po etapách (K34, najprv mapovanie); redizajn komentárov (261) až po delení (R47). (5) Karta K29 je '
      'schválená majiteľom a posiela sa kolegovi; fronta: K29 (333), K30 (339), K31 (341), K32 (176) a nové návrhy K33 (343), K34 '
      '(262, etapa A) a K35 (344). (6) Číselný prehľad: nálezy 1–344 (nové 343 a 344), zatvorené 14, hotové 134 (pribudli 337 a 340); '
      'čakajúcich rozhodnutí 9 z 56. Dopad na E2E: žiadny na existujúce špecy; po K29 spustí Codex v dohodnutom okne cielený beh '
      'špecov komentárov. (7) Kontrola CodeRabbitu k PR #282 (jedna pripomienka, platná; druhý commit vetvy 184): v náleze 261 ostalo '
      'staré prianie „drag handle vo fotoprehliadači zjednodušiť na šípku“, ktoré rozhodnutie R55 prekonalo (majiteľ zvolil tenkú '
      'úchytku 40×6 px, nález 343; vo fotoprehliadači je jediná úchytka, tá na paneli komentárov); v zozname je prianie označené ako '
      'prekonané a vlákno na GitHube zatvára majiteľ. (8) Na žiadosť majiteľa (17. 11. 2026) je nález 265 (verejné SEO stránky) '
      'presunutý z PO NASADENÍ do PRED NASADENÍM (tretí commit vetvy 184); zatiaľ sa nemapuje, do žiadnej vlny poradia nie je zaradený '
      'a dôležitosť (nízka) a odhad (veľký) sa nemenili; prehľad nálezov: HNEĎ 0, PRED 46, PO 130.'),
    ('17. 11. 2026',
      'Vetva 183 (vychádza z `main` `4c342f72`, teda po PR #278). (1) Vetva 182 (PR #277) je zlúčená 17. 11. 2026 o 05:33 UTC. '
      '(2) K28 (PR #278, zlúčené 17. 11. 2026 o 06:33 UTC, merge `4c342f72`; päť commitov `eb86d9a5`, `33a81b9b`, `ffcfad33`, '
      '`e8991819` a `b737a0f9`): hotová dávka 1 z 5 delenia `FeedPostComments.tsx` (nález 333): päť nových súborov testov (39 '
      'nových testov) a dočasný odtlačok HTML (desať stavov, súbor `.snap` s 3 499 riadkami, ktorý zmaže dávka 5 z 5); produkčný '
      'kód nezmenený. Kontrola agenta z GitHubu: CI (`checks`, `backend-postgres`) zelené, CodeRabbit aj Codex review bez '
      'pripomienok, vlákna nie sú a zmenené sú len nové súbory testov a jeden `.snap`; overenie je v textoch commitov (celý Jest '
      '608 sád a 9 133 testov prešlo, všetkých 17 mutácií z karty zachytených, `tsc`, ESLint, kontrola prekladov a build čisté). '
      'Kandidáti kolegu sú nové nálezy 341 (Next.js 16.4.3 je v rozsahu bezpečnostného upozornenia, CI build na `main` prešiel) a '
      '342 (zmiznutý príspevok pri odpovedi, úprave a zmazaní komentára). (3) Odpovede majiteľa zo 17. 11. 2026 podľa odporúčaní '
      'agenta: vzhľad zoznamu lajkujúcich sa prebere hneď (R49; majiteľ najprv povie svoj návrh), R50 (a): Codex opraví poistku '
      '`--repeat-each` ako samostatnú malú vetvu, pravidlo R49 je zapísané aj v `AGENTS.md` a po živom behu 337 pripraví Codex '
      'E2E scenár komentárov (nález 257). (4) Karta K29 (`karty/K29.md`): delenie `FeedPostComments.tsx`, dávka 2 z 5 (kroky 1 až '
      '3, s ručným testom majiteľa); fronta: K29 (333), K30 (339), K31 (341), K32 (176). (5) Číselný prehľad: nálezy 1–342 (nové '
      '341 a 342), zatvorené 14, hotové 132; čakajúcich rozhodnutí 9 z 50. Dopad na E2E: žiadny.'),
    ('16. 11. 2026',
      'Vetva 182 (vychádza z `main` `da27a931`, teda po PR #276). (1) K27 (PR #275, zlúčené 16. 11. 2026 o 19:34 UTC, merge '
      '`bf754de0`; commity `7eed510a`, `c26f314e` a `a894dc23`): hotová backendová časť nálezu 262 (tri nové koncové body na '
      'čítanie, `GET skills/<id>/likes/`, `GET portfolio/<id>/likes/` a `GET dashboard/users/<id>/profile/likes/`; nové súbory '
      'a 69 nových testov; bez migrácie a bez zmeny Nástenky). Kontrola agenta z GitHubu a z kódu: CI (`checks`, '
      '`backend-postgres`) je zelené, CodeRabbit bez pripomienok, Codex review bez nálezov a vlákna nie sú; pohľady '
      'zodpovedajú karte (ponuka `AllowAny` s kontrolou viditeľnosti a aktívneho vlastníka, portfólio a profil '
      '`IsAuthenticated`, spoločný pomocník `_likers_response`); overenie je v textoch commitov (celý backend 2 590 prešlo a 24 '
      'preskočených na SQLite a 2 612 prešlo a 2 preskočené na PostgreSQL; mutácie 15 z 15, 17 zo 17 a 16 zo 16 zachytených). '
      'Kandidát kolegu o neaktívnom vlastníkovi ponuky je nový nález 339. Frontend nálezu 262 čaká na schválenie vzhľadu '
      'majiteľom (R49). Vetvy 180 (PR #273) a 181 (PR #274) sú zlúčené. (2) Codex (PR #276, vetva `e2e/ui-kategoria-337`, '
      'zlúčené 16. 11. 2026 o 21:39 UTC, merge `da27a931`; commity `9ccc972d` a `93b1210e`): implementovaný UI scenár zmeny '
      'kategórie upozornení (nález 337, R44 (b)) v samostatnej konfigurácii (2 varianty, WebKit desktop aj mobil, mimo bežného '
      'celého behu a dymu), lokálne overený bez Railway (45/45 kontrol logiky, 18/18 prehliadačových kontrol, 0 SKIP); '
      'CodeRabbit mal jednu platnú pripomienku (odpoveď 3xx nesmie potvrdiť bezpečný návrat), opravenú v `93b1210e`. Živý beh '
      'ešte nebol: čaká na nové okno potvrdené majiteľom (návrh z 20:00 uplynul). Codex nahlásil aj medzeru staršej poistky '
      'proti `--repeat-each` (nález 340, rozhodnutie R50). (3) Výsledok K26 (kolega, mapovanie delenia `FeedPostComments.tsx`, '
      'kód sa nemenil; `karty/K26_vysledok.md` a `karty/K26_podklady.md`): plán 9 krokov (0 až 8) v piatich dávkach, hlavný '
      'súbor klesne z 1 487 na asi 420 riadkov; z 39 skúšobných pokazení kódu existujúce testy zachytili 13, preto krok 0 '
      'pridá testy a dočasný odtlačok HTML; nový nález 338 (zaseknuté „Načítavam…“ pri pridaní komentára počas prvého '
      'načítania, agent overil čítaním kódu); nález 257 mal zastaranú vetu (testy úpravy komentára na frontende existujú). '
      'Odpovede majiteľa podľa odporúčaní agenta: R45 (a) odtlačok len dočasne, R46 (a) päť dávok, R47 (a) redizajn 261 až po '
      'poslednej dávke, R48 (a) oprava 338 po kroku 6; trvalé pravidlo R49: redizajn Nástenky, komentárov a podobné '
      'vzhľadové zmeny sa vždy najprv konzultujú s majiteľom. (4) Karta K28 (`karty/K28.md`): delenie `FeedPostComments.tsx`, '
      'dávka 1 z 5 (krok 0, len testy a dočasný odtlačok HTML); karta a šablóna kariet nesú nové pravidlo o konzultácii '
      'vzhľadu. (5) Číselný prehľad: nálezy 1–340 (nové 338, 339 a 340), zatvorené 14, hotové 132; čakajúcich rozhodnutí '
      '10 z 50. Dopad na E2E: žiadny na existujúce špecy; Codex čaká na okno pre 337.'),
    ('16. 11. 2026',
      'Vetva 181 (vychádza z `main` `910700ea`, teda po PR #273). (1) Vetva 180 (PR #273, zlúčené 16. 11. 2026 o 13:56 UTC, '
      'merge `910700ea`; commit `9431c3c7`) je zlúčená: CI (`checks`, `backend-postgres`) je zelené a k PR nie sú žiadne '
      'komentáre k riadkom ani vlákna; kontrolu CodeRabbitu majiteľ nevyžiadal (preskočená). (2) Mapovanie nálezu 262 (zoznam '
      '„kto dal lajk“ pri ponukách, portfóliu a profile, R20) agentom z čítania kódu, kód sa nemenil: model lajku portfólia '
      'existuje (`PortfolioItemLike`), všetky tri modely lajkov majú rovnaký tvar, takže spoločný pomocník `_likers_response` '
      'pôjde použiť bezo zmeny a migrácia netreba; ponuky vidí aj neprihlásený (vyhľadávanie je `AllowAny`), profil a '
      'portfólio len prihlásený; `offer_hidden_from_user` nekontroluje aktívneho vlastníka; adresy a funkcie frontendu '
      'nemôžu ísť do `lib/api.ts` (912 riadkov) ani `lib/feedApi.ts` (545 riadkov). Podrobnosti sú v nálezu 262. (3) Karta '
      'K27 (`karty/K27.md`): backendová časť nálezu 262 (tri nové koncové body na čítanie s testami súkromia, JASNÉ s krokom '
      '0), posiela sa kolegovi po K26; frontend nálezu 262 ide ako ďalšia dávka po jej zlúčení; K28 (preklady) ostáva návrh, '
      'najprv mapovanie. (4) Číselný prehľad bez zmeny: nálezy 1–337, zatvorené 14, hotové 132; čakajúcich rozhodnutí 9 z 44. '
      'Dopad na E2E: žiadny.'),
    ('16. 11. 2026',
      'Vetva 180 (vychádza z `main` `13a9d95b`, teda po PR #272). (1) Vetva 179 (PR #272, zlúčené 16. 11. 2026 o 13:39 UTC, '
      'merge `13a9d95b`; commit `56d14142`) je zlúčená: CI (`checks`, `backend-postgres`) a CodeRabbit sú zelené, CodeRabbit '
      'aj Codex review bez pripomienok a vlákna nie sú. (2) Odpoveď majiteľa na R44: (b) podľa odporúčania agenta, teda '
      'robí sa len UI scenár zmeny kategórie upozornení (nález 337) a kontrola výzvy na push sa v E2E nerobí; implementuje '
      'Codex v `frontend/e2e/**`, pred implementáciou skontroluje, že testovací účet má zapnuté upozornenia v aplikácii, '
      'a živé okno proti Railway oznámi majiteľ samostatne. (3) Majiteľ súhlasil s jednou dokumentačnou vetvou agenta po '
      'výsledku K26 (údržba zoznamu: aktuálny stav na jednom mieste, staré dáta do archívnych súborov, menej opakovaných '
      'faktov; cieľom je menej chýb); K26 posiela majiteľ kolegovi. (4) Číselný prehľad: nálezy 1–337, zatvorené 14, hotové 132, '
      'čakajúcich rozhodnutí 9 z 44. Dopad na E2E: Codex dostáva pokyn implementovať UI scenár kategórií (nález 337); '
      'aplikácia sa nemení.'),
    ('16. 11. 2026',
      'Vetva 179 (vychádza z `main` `93bd8677`, teda po PR #271). (1) K24 (PR #269, zlúčené 16. 11. 2026 o 08:39 UTC, '
      'merge `fa049c61`; commity `09563623` a `7f8bc410`): hotový nález 336 (anglické „Network Error“ v okne „Pridať '
      'recenziu“; výnimka R41: v `OfferReviewsView.tsx` sa zmenili len riadky 657 až 660, súbor má 683 riadkov pred aj '
      'po). K25 (PR #270, zlúčené o 10:36 UTC, merge `91f58dbe`; commit `f022161b`): opis hlavného vypínača „Vypnúť '
      'všetko“ aj na počítači (R42); tým je aplikačná časť nálezu 321 hotová, nález 321 je v časti Hotové a E2E zvyšok je '
      'nový nález 337. Kontrola agenta z GitHubu: CI (`checks`, `backend-postgres`) a CodeRabbit sú pri oboch zelené a bez '
      'pripomienok; Codex review K24 mala jednu neplatnú pripomienku P1 (zákaz úprav súboru nad 500 riadkov; výnimka R41, '
      'majiteľ na vlákno odpovedal), pri K25 bola bez nálezov; samostatná strana kolegu nebola potrebná, overenie je v '
      'textoch commitov (K24: 601 súborov a 9 062 testov, mutácie 10 z 10 a 11 z 11; K25: 603 súborov a 9 094 testov, '
      'mutácie 14 zo 14). Ručné testy majiteľa po nasadení K24 a K25 prešli bez nového nálezu. Karta K25 nepoznala päť '
      'ďalších používateľov `MasterToggle`; kolega ich kryl referenčnými testami (`poznamky.md`). Vetva 178 (PR #268) je '
      'zlúčená; CodeRabbit k nej mal dve platné pripomienky (zastaraný prísľub scenára 330 a zlé číslo dávky v karte K24), '
      'obe opravené. (2) Codex (PR #271, vetva `e2e/k23-overenie-a-wsl`, zlúčené o 13:03 UTC, merge `93bd8677`; len '
      '`docs/playwright-odovzdanie.md`): živé overenie na `main` `91f58dbe` (po K24 a K25): dym `@smoke` 41 prešlo, 0 '
      'zlyhalo a 10 preskočených (rovnaké kľúče ako prijatý dym po K22) a API kontrakt volieb vo WebKite desktop aj mobil '
      '2 / 0 / 0 (obnova všetkých siedmich hodnôt overená); nejde o celý beh, prijatý základ ostáva 427 / 2 / 303. '
      'Mapovanie UI scenára kategórií a schopností prehliadačov pre výzvu K23 (WebKit desktop má push API a povolenie '
      '`default`, WebKit mobil ich nemá, Chromium má povolenie `denied`) je nový nález 337 a rozhodnutie R44 (rozhodnuté '
      'neskôr, pozri vetvu 180). R40 (a): oddelené Ubuntu vo WSL je pripravené (`Svaply-E2E-Ubuntu-24.04`, Ubuntu 24.04.5, Node 24.20.0, '
      'Playwright 1.63.0, WebKit 26.6); prázdna stránka bez siete prešla 1 / 1 a prostredie je zastavené; na porovnanie '
      'treba ešte izolovaný Chromium pre prihlasovanie a okno od majiteľa; nález 223 ostáva otvorený. (3) Číselný prehľad: '
      'nálezy 1–337, zatvorené 14, hotové 132 (pribudli 336 a 321), jedno nové číslo (337). (4) Karta K26 '
      '(`karty/K26.md`): mapovanie delenia `FeedPostComments.tsx` (1 487 riadkov, R23; NEJASNÉ, kód sa nemení); poradie je '
      'K26 (333) a potom návrh K27 a K28 (zoznam lajkujúcich a preklady, každá najprv ako mapovanie). Dopad na E2E: K24 a '
      'K25 žiadny, mapovanie K26 žiadny.'),
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
            '(vetva 158, PR #217) a zo 183 ostáva len vývojový `pytest` (skupina po nasadení); nový je upgrade `next` 16.4.3 na opravenú verziu (341, bezpečnostné upozornenie)',
         preco='Malé a bezpečné. Zraniteľné verzie zmiznú skôr, než pribudne ďalší kód.',
         polozky=['183', '341']),
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
            '(259 a 261; redizajn komentárov má schválený vzhľad (R52); delenie `FeedPostComments.tsx` je hotové (nález 333, K28 až K42; ostáva delenie `FeedPostCard.tsx` a `FeedPostMobileDetail.tsx`), K40 až K43 sú hotové a podľa R59 a dohody s majiteľom (19. 11. 2026) redizajn začne po K31 a K45; rieši sa pri ňom aj pole na text pri odpovedi na komentár; 338 zaseknuté načítavanie komentárov je hotové v K41, 342 zmiznutý príspevok pri odpovedi, úprave a zmazaní a 351 slučka chybových hlásení pri donačítaní komentárov a odpovedí bez internetu sú hotové v K43; 353 drobná hláška pri zastaranom zlyhaní odpovedí; zoznam lajkujúcich pri ponukách, portfóliu a profile 262, R20: backend je hotový v K27, vzhľad je schválený (R51 a R56) a frontend ide po etapách; úchytka panela nad fotkou 343, okno detailu na počítači 344 (najprv mapovanie v K45); 345 a 350 sú hotové v K39 a 346 viditeľnosť nového komentára na iPhone v K40) a drobnosti zo 36, živé '
            'overenie N16, RET-01..03 a ručný test VoiceOverom (294)',
         preco='To uvidí každý nový používateľ hneď prvý deň. Overenia (N16, RET-01..03, 294) sa dajú robiť už teraz na Railway a na iPhone.',
         polozky=['13', '14', '174', '283', '284', '285', '287', '288', '289', '81', '272', '92', '207', '319', '262', '333', '343', '344', '353', '74', '17', 'OW-11', 'OW-14', 'OW-17', 'OW-05', '252', '259', '261', '36', '294', 'N16', 'RET-01', 'RET-02', 'RET-03']),
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
