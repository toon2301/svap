# -*- coding: utf-8 -*-
"""Stav zoznamu: dátum, položky opravené po prvom vydaní, tabuľka PR, rozhodnutia a denník zmien.

Tento súbor sa upravuje pri každej zmene stavu (nový nález, oprava, odpoveď na rozhodnutie); postup je v `README.md`.
"""

# Hlavička dokumentu: kedy sa naposledy menil a z akého stavu `main` sa vychádzalo.
STAV = dict(
    datum='10. 11. 2026',
    kod='`main` `29052576` (po PR #253, K16)',
    register='21. 10. 2026 + PR #193',
)

# Denník zmien dokumentu, najnovšie hore: (dátum, čo sa zmenilo). Záznamy do 6. 11. 2026 sú v `zmeny_starsie.py`.
from zmeny_starsie import ZMENY_STARSIE  # noqa: E402

ZMENY = [
    ('10. 11. 2026',
     'Vetva 173 (len zoznam podľa pokynu majiteľa z 7. 11.; vychádza z `main` `29052576`, teda po PR #253). (1) Zápis '
     'šestnástej práce kolegu: K16 (PR #253, zlúčené 10. 11. 2026 o 11:03 UTC; 4 commity: tri na nález a JSDoc po kontrole '
     'pokrytia docstringov od CodeRabbit; 9 súborov, žiadny nad 500 riadkov). Agent ju overil z GitHubu bez samostatného '
     'výsledku dávky: CI (`checks` aj `backend-postgres`) prešlo, Codex bol bez nálezov, riadkové pripomienky bota nie sú a '
     'texty commitov nesú overenie, mutácie aj odchýlky od karty. Hotové sú 308 (s odchýlkou: posun pri výmene kostry za '
     'voľbu ostáva, CLS 0,0334 na mobile), 309 (cena: rezerva 18 px pod tlačidlom) a 310; mapovanie 319 ostáva, výsledok od '
     'kolegu ešte nedošiel. Majiteľ oznámil, že nasadenie aj manuálne testy prešli bez nových nálezov; kolega nahlásil dve '
     'poznámky bez čísla (odznak „0 / 5“ pri chybe načítania a zvyšný posun kostry Správ). (2) Odpovede majiteľa k 223: '
     '`NEXT_PUBLIC_API_URL` vo frontende na Railway je `/api` (API cez rovnaký pôvod, takže oprava K14 platí aj v testovanom '
     'prostredí); či 8. 11. o 19:29 UTC bežal Codexov beh, nevie. Agent z toho a z `csrf.ts` odvodil, že hlavička '
     '`X-CSRFToken` pri prázdnych cookies sedí na to, že prehliadač cookie z odpovede neuložil alebo nepripojil; nález 223 '
     'ostáva otvorený a má nový krok (logy Railway: `GET /api/auth/csrf-token/` tesne pred obnovou). Codex čaká na okno po '
     'nasadení K16 (dym `@smoke`, potom plný beh); jeho návrhy (natívny beh na Windows, doplnenie dôkazov obnovy) sú v 223. '
     '(3) Mapovanie nálezu 321 (kategórie upozornení) na žiadosť majiteľa vrátane požiadavky, aby boli všetky upozornenia '
     'pre nového používateľa predvolene zapnuté: server to už dnes spĺňa pre obe existujúce voľby, nové kategórie sa majú '
     'ukladať v tvare „zapnuté, kým používateľ nevypne“ (bez dátovej migrácie); plán má štyri etapy a tri rozhodnutia R34 až '
     'R36. (4) Dávka K17 (302 s výnimkou R31, 311, 312) má kartu `karty/K17.md`. (5) Skúška postupu po K15 a K16: nové '
     'číslované nálezy 0 a chyby zachytené dymovým testom 0, výsledok dávky z PR stačil (samostatná strana len pri 319); '
     'odporúčanie agenta je postup ponechať. Dopad na E2E tejto vetvy: žiadny.'),
    ('10. 11. 2026',
     'Vetva 172, doplnok po kontrole CodeRabbitu (PR #252) a logoch majiteľa. (1) CodeRabbit: tri pripomienky platné a opravené '
     '(záver pri 223 nesmie z chýbajúceho cookie vylúčiť aplikačnú príčinu; počet 403 mimo testov nevylučuje dopad na '
     'používateľov; tabuľka rolí v README zosúladená s pravidlom o výsledku dávky). K tomu je v kartách a šablóne jednotne '
     '„kým majiteľ nepovie“ (bez „alebo agent“). (2) Logy majiteľa k 223 a 245 (prvé 401 z 9. 11. a 15 × 403 na obnove za 7 '
     'dní): 13 z 15 pravdepodobne patrí k behom Codexa, dve z 8. 11. časovo sedia na jeho pokus; žiadna nie je preukázateľne od '
     'skutočného používateľa, dopad na používateľov nie je ani potvrdený, ani vylúčený. Ďalšie kroky sú v 223 (tvar '
     '`NEXT_PUBLIC_API_URL`, natívny beh Codexa, voliteľne logovanie dôvodu 401). (3) Dávka Codexa K15 je zlúčená (PR #251, '
     '`main` `7243f020`); zlúčenie nezmenilo aplikáciu. Dopad na E2E tejto vetvy: žiadny.'),
    ('9. 11. 2026',
     'Vetva 172 (len zoznam podľa pokynu majiteľa z 7. 11.; vychádza z `main` `b3d7983a`, teda po PR #250). (1) Zápis '
     'pätnástej práce kolegu: K15 (PR #250, zlúčené 9. 11. 2026 o 19:29 UTC; 3 commity, jeden na nález, 322 a 323 spolu; 9 '
     'súborov, súbory nad 500 riadkov sa nemenili). Agent ju overil priamo z GitHubu bez samostatného výsledku dávky: CI '
     '(`checks` aj `backend-postgres`) a CodeRabbit prešli bez pripomienok a texty commitov nesú overenie, mutácie aj '
     'odchýlky od karty. Hotové sú 322, 323, 320 a 306; kolega slučku z 323 potvrdil aj v prehliadači (produkčný build pred '
     'opravou 7 575 potvrdení Reactu za 4 s po otvorení obrazovky, po oprave 3). Majiteľ oznámil, že K15 prešla testami po '
     'nasadení bez nových nálezov. (2) Dôkazy k 223: majiteľ prešiel logy Railway pre dve okná pádov (všetky požiadavky '
     'dorazili na backend, 401 a 403 s dôvodom „CSRF cookie not set.“, bez chýb spojenia, jeden zahodený paket TCP bez '
     'dokázaného súvisu) a Codex v dávke K15 zmeral 80 pokusov (väčšie `shm` nepomohlo; v jednom pokuse sa zachytilo, že '
     'cookies zmizli pred odmietnutou obnovou, po spoločnom zlyhaní dvoch požiadaviek). Agent: najpravdepodobnejšie '
     'prostredie testov (WebKit v Dockeri), nie aplikácia; nález 223 ostáva otvorený a má ďalšie kroky, doplnok je aj pri '
     '245. (3) Dávka Codexa K15 (PR #251, zlúčené 10. 11. 2026 o 06:27 UTC; 23 súborov len v `frontend/e2e/**` a `docs/playwright-odovzdanie.md`): značky `@smoke` na siedmich špecoch (51 variantov, jedno '
     'meranie 2 min 36 s: 40 prešlo, 1 padlo, 10 projektových SKIP; nový pád `auth-session` po F5 pri vyčistených cookies vo '
     'WebKite mobile, 3 opakovania prešli), test farieb 320 (4 zo 4), sonda cookies a dôkazy pre dva špecy; E2E má 44 špecov '
     'a 762 variantov; prijatý stav 427 / 2 / 303 sa nemení. (4) Poradie prác pre kolegu: K16 = 319, 308, 309, 310; K17 = '
     '302, 311, 312; karta K16 je v `karty/K16.md`. (5) Výsledok dávky: ak texty commitov nesú overenie, agent ich číta z PR '
     'a kolega samostatnú stranu nepíše (README). Dopad na E2E tejto vetvy: žiadny.'),
    ('9. 11. 2026',
     'Vetva 171 (len zoznam podľa pokynu majiteľa z 7. 11.; vychádza z `main` `5bf32b26`, teda po PR #246; PR #247). (1) '
     'Nález HNEĎ 318 (push na iPhone) je zatvorený: logy Railway (worker, dve testovacie správy) ukázali '
     '`rollout_skipped_count=1`, `delivered_count=0` a `skipped_reason=rollout_5`, teda push preskočil backend kvôli '
     'premennej `WEB_PUSH_MESSAGES_ROLLOUT_PERCENT` nastavenej v Railway na 5; nebola to chyba kódu ani K14. Majiteľ ju '
     'zmenil na 100 a potvrdil, že upozornenia na správy fungujú; skupina HNEĎ je prázdna. Rozhodnutie R33 (a). (2) Video '
     'majiteľa z 9. 11.: pri novej ponuke na mobile sa pridaný tag nezobrazí. Agent ho zmapoval v dočasných testoch so '
     'skutočným smerovačom a obrazovkou: nové nálezy 322 (tag sa zmaže, keď rodič obrazovke odovzdá nové prázdne pole) a 323 '
     '(obrazovka Popis ponuky sa po pripojení neprestajne prekresľuje: 76 prekreslení a 152 zápisov stavu do zastavenia '
     'poistkou). Spoločná oprava (stabilné vstupy v `SkillsDescriptionScreen.tsx`) je vyskúšaná v teste; v prehliadači to '
     'agent neoveril. Nový balík „Ponuky (úprava a tagy)“. (3) Rozhodnutia majiteľa z 9. 11.: R31 výnimku z pravidla 500 '
     'riadkov udelil s podmienkou maximálnej opatrnosti (len výmena osmich `alert()` v K17, podmienky sú v odpovedi na R31); '
     'R32 zvolil (a), teda kategórie upozornení sa dokončia pred štartom a nesmú sa skrývať: nález 321 je znova PRED '
     'NASADENÍM (najprv mapovanie a plán po etapách) a nález 324 (skryť prepínače), ktorý vznikol z odporúčania (b), sa '
     'zatvoril; R33 (a). (4) Poradie prác pre kolegu: K15 = 322, 323, 320, 306; K16 = 319, 308, 309, 310; K17 = 302, 311, '
     '312; staršie dávky 24, 22, 23, 26 a 247, 248, 250, 256 majú dočasné označenie PO-A a PO-B, lebo pred ne pribudnú etapy '
     'nálezu 321. Karta dávky K15 je v `karty/K15.md`. (5) Kontrola CodeRabbit k PR #247: jedna pripomienka k dymovému testu '
     'platila (`delivered_count` potvrdzuje prijatie požiadavky službou push pre aspoň jeden odber účtu, nie zobrazenie na '
     'iPhone); krok 3 v `sablony/dymovy_test.md` je opravený. (6) Celkový report Codexa z 9. 11. (celý beh na `5bf32b26`: '
     '383 prešlo, 22 zlyhalo, 351 preskočených, neprijatý; 22 pádov nových podľa kľúča, 66 diagnostických pokusov 50 / 8 / '
     '8): doplnky k 223 (dva priebehy s 401 a odmietnutou obnovou, hypotéza o strate cookies vo WebKite a úloha pre Codexa; '
     'nález 223 sa presunul do `polozky_nove_223.py`), k 209 (konverzačné testy a návraty prešli, ostávajú dátové medzery) a '
     'k 295 (ôsmy špec dymu s fotkou až v 295); plán testu farieb pre 320 po oprave; návrh dymovej sady (sedem existujúcich '
     'špecov, značky `@smoke`) v `README.md`. Podklad Codexa o číselnej adrese vlastného profilu je z 30. 10.: nález 222 je '
     'hotový (PR #215) a špec 9. 11. prešiel 2 z 2. (7) Doplnky: úloha N5 spomína premenné postupného zapínania push; '
     '`poznamky.md` má prvú poznámku (zapísať nastavenie rollout do logu pri štarte). Dopad na E2E tejto vetvy: žiadny.'),
    ('8. 11. 2026',
     'Vetva 170 (len zoznam podľa pokynu majiteľa z 7. 11.; vychádza z `main` `92fb1b7d`, teda po PR #245; čaká na PR). (1) '
     'Zápis trinástej a štrnástej práce kolegu: K13 (PR #244, zlúčené 8. 11. 2026 o 15:20; 17 súborov, +839/−19; backend, '
     'frontend a CI) a K14 (PR #245, zlúčené 8. 11. 2026 o 19:42; 39 súborov, +3 157/−123). Agent porovnal správu kolegu s '
     'PR, s CI a s kódom na `main`: CI (`checks` aj `backend-postgres`) prešlo v oboch PR aj na `main` po oboch zlúčeniach; '
     'CodeRabbit mal v každom PR dve pripomienky a výhradu k názvu PR (v #244 jedna platila len sčasti, v #245 obe platné; '
     'všetky opravené), pri poslednom commite oboch PR preskočil (limit) a Codex nemal nálezy. Hotové sú 301, 296, 297, 244 '
     'a 286 (všetky štyri sekcie); 302 a 245 sú hotové len sčasti. Návrh agenta pre 296 (mazať po jednej) sám nestačil: '
     'kolega našiel deadlock a doplnil zámok riadku používateľa. Merania kolegu v prehliadači (px, ms, CLS) agent '
     'nezopakoval. (2) Ručné testy majiteľa po K14: push na iPhone neprichádza (nález 318, HNEĎ; podozrenie na regresiu, '
     'príčina nepotvrdená; agent mapoval kód a zámok závislostí), prepínač upozornení offline (319), zmena hesla s čiernymi '
     'poľami (320, príčina `color-scheme` a polia bez pozadia) a nedokončené kategórie upozornení (321, spolu s kandidátom N '
     'kolegu). (3) Nové nálezy 305 až 321: kandidáti kolegu A, C, D, E, F, G, H, I, J, K, M, O a P (305 až 317); kandidát B '
     'je v 302, L v 206 a N v 321. (4) Doplnky: 183, 194, 196, 206 a 240 (príčina incidentu je odstránená v 244). (5) '
     'Rozhodnutie R30 zapísané ako (a) (majiteľ poslal kolegovi text K13 s týmto variantom a PR zlúčil); nové čakajúce R31 '
     '(výnimka pre osem `alert()`) a R32 (kategórie upozornení: dokončiť, alebo skryť). (6) Poradie prác pre kolegu: K13 a '
     'K14 sú hotové; nová dávka K15 (318 diagnostika, 320, 306, 319) a K16 (308 až 311 a 312); staršie dávky 24, 22, 23, 26 '
     'a 247, 248, 250, 256 sa premenovali z K15 a K16 na K17 a K18; 302 a 245 čakajú na rozhodnutie a dôkazy, preto nie sú v '
     'poradí. (7) Nové balíky „Upozornenia a push“ (P) a „Produkčná odolnosť aplikácie“ (aj v skupine HNEĎ). (8) Od K15 skúška '
     'nového postupu (odsúhlasil majiteľ 8. 11. 2026): karta dávky s označením JASNÉ alebo NEJASNÉ, výsledok dávky na jednu stranu, '
     'kontrola výsledku agentom pred zlúčením, dymový test majiteľa po nasadení, filter nových nálezov (číslo len s dôkazom a '
     'dopadom, najviac 5 na dávku; ostatné do `poznamky.md`) a zastavenie radu pri chybe HNEĎ; šablóny sú v `sablony/` a pravidlá '
     'v `README.md`. Dopad na E2E tejto vetvy: žiadny.'),
    ('8. 11. 2026',
     'Vetva 169 (len zoznam podľa pokynu majiteľa z 7. 11.; vychádza z `main` `95fee208`, teda po PR #242; čaká na PR). (1) Zápis '
     'jedenástej a dvanástej práce kolegu: K11 (PR #241, zlúčené 7. 11. 2026; frontend, 27 súborov) a K12 (PR #242, zlúčené 8. 11. 2026; '
     'backend a `.github`, 18 súborov); CI (`checks` aj `backend-postgres`) prešlo v oboch, pri #241 kontrola CodeRabbit na poslednom '
     'commite preskočila (jej pripomienka k dostupnosti dlaždice galérie je opravená a uzavretá), pri #242 prešla a Codex mal jednu platnú '
     'pripomienku (animovaný WebP a APNG, opravené v `331e06ef`). Hotové sú 279 (viditeľná náhrada zlyhanej fotky), 291, 292 (PO NASADENÍ, '
     'v K11 na pokyn majiteľa), 293, 282, 246 a 194; 204 je hotová v časti CI, ostáva len `ProfileModule.tsx:468`. (2) Ručný test majiteľa '
     'po K12: fotka z priamo volaného starého endpointu ponúk je na produkcii neprístupná (S3 `AccessDenied`) a v ponuke sa nezobrazí: nový '
     'nález 301; podľa kódu to zrejme nie je regresia K12 (endpoint ukladá do `offers/`, kým verejné sú schválené fotky z `media/`). '
     '(3) Nové nálezy 296 až 304: z K12 296 (hromadné `QuerySet.delete()` obchádza zámky z 246), 297 (`check:missing-translations` nie je v '
     'CI), 298 a 299 (animované obrázky: avatary, správy a hlavná cesta cez S3 ukladajú len prvú snímku), 300 (telo chyby starého endpointu '
     'je Python zoznam); z K11 302 (14 natívnych `alert()` ostáva v 6 súboroch) a 303 (32 zo 43 súborov s `<img>` nemá `onError`, '
     'netriedené); z mapovania nálezu 301 ešte 304 (`README.md` radí sprístupniť na čítanie celý S3 bucket, kým kód počíta s tým, že '
     'priame adresy fotiek sú zablokované). (4) Doplnky: 196 (nový workflow používa staršie akcie), 229 (`glob` a `minimatch` pri prahu '
     '`high` audit nehlási), 183 '
     '(výnimka pre pytest sa po pytest 9 ohlási ako zastaraná), 227 (37 zápisov `ref.current` počas renderu v 27 súboroch), 36 (trieda '
     '`max-h-[calc(100vh-2rem)]` fotky je v `LightboxPhoto.tsx`), 209 (re-check Codexu: súkromie môže vysvetliť (a), čiastočne (c), nie '
     '(b)) a 295 (plán Codexa). (5) Nové rozhodnutia R29 (animované obrázky) a R30 (starý endpoint ponúk). (6) Poradie prác pre kolegu: K11 '
     'a K12 sú hotové; nová dávka K13 (301, 296, 297, 302 len súbory do 500 riadkov) a K14 (244, 245 s mapovaním, 286); staršie dávky 24, '
     '22, 23, 26 a 247, 248, 250, 256 sa premenovali z K13 a K14 na K15 a K16. (7) Starší denník zmien (do 6. 11. 2026) je v novom súbore '
     '`zmeny_starsie.py`, aby `stav.py` ostal pod 500 riadkov.'),
    ('7. 11. 2026',
     'Vetva 168 (len zoznam podľa pokynu majiteľa z 7. 11.; vychádza z `main` `4e57b990`, teda po PR #239; čaká na PR). (1) Zápis ôsmej až '
     'desiatej práce kolegu: K8 sa robila na dva razy (PR #237 a #238; druhé kolo sa volalo K9) a dávka drobných opráv išla ako K10 '
     '(PR #239); všetky tri sú zlúčené a CI (`checks` aj `backend-postgres`) prešlo; kontrola CodeRabbit prešla pri #237 a #238, pri #239 '
     'na poslednom commite preskočila a jej skoršia pripomienka (zápis do `ref` počas renderu v karuseli ponúk) je opravená. Hotové sú '
     '274 (fotky súkromného autora idú cez doménu frontendu), 276 (preblik na mobile: Nástenka a zoznam Nastavení), 277 (`role` a '
     '`aria-live` na pruhu pripojenia) a 281 (diakritika záložných textov Obľúbených). 275 sa zatvára rozhodnutím R25: účet A má súkromný '
     'profil, čo je zámer; skupina HNEĎ je prázdna. 193 a 279 ostávajú otvorené: kód z K10 je zlúčený, no ručný test majiteľa k 279 '
     'neprešiel (zlyhaná fotka je prázdna čierna plocha bez ikony a textu) a pri 193 majiteľ pozoroval prijatie súboru BMP v portfóliu a '
     'na Nástenke, čo sa podľa kódu nemalo stať (klient aj server odmietajú príponu `.bmp`, prekódovanie v prehliadači nie je). '
     '(2) Nové nálezy 282 až 295: z K8 až K10 282 (starý endpoint ponúk ukladá polohu GPS), 283 až 289 (zvyšky preblikov na mobile, nový '
     'balík „Plynulosť prechodov (mobil)“), 290 (text pri súkromnom profile), 291 (lightboxy bez `onError`) a 292 (zápis do `ref` počas '
     'renderu); z ručných testov majiteľa 293 (natívne `alert()` namiesto toastu pri chybe nahrávania fotky, v rade portfólia chýba '
     'toast) a 294 (ručný test VoiceOverom pre 277); z analýzy Codexu a správ kolegu 295 (E2E nepokrýva fotky). (3) Doplnky: 209 (Codex: '
     'vysvetlenie „iba chýbajúce dáta“ nie je preukázané; účty A a B sú E2E účty), 204 (oprava poznámky: `ProfileEditForm.tsx` je '
     'nepoužitý, nález 239), 206 (druhé miesto s `no-explicit-any`) a 91 (manuálny test sa po oprave 274 dá urobiť). (4) Rozhodnutia: '
     'R25 (275 je zámer), R26 (dve výnimky z pravidla 500 riadkov pre testové súbory z K8 a K9, schválené majiteľom na vláknach '
     'Codexu), nové čakajúce R27 (platí pravidlo 500 riadkov aj pre testy?) a R28 (zjednotiť vstupné animácie modulov?). (5) Poradie '
     'prác pre kolegu: nové dávky K11 (fotky na frontende: 279, 293, 291) a K12 (súkromie a CI: 282, 246, 194 a časť 204 s CI); '
     'staršie dávky 24, 22, 23, 26 a 247, 248, 250, 256 sa z K9 a K10 premenovali na K13 a K14. Nález 292 (PO NASADENÍ) ide na '
     'začiatku K13, aby poradie dodržalo pravidlo, že nálezy PRED NASADENÍM idú pred nálezmi PO NASADENÍ (pripomienka CodeRabbit '
     'k PR #240). Vlna HNEĎ zmizla z časti 2.'),
    ('7. 11. 2026',
     'Vetva 167 (len zoznam podľa pokynu majiteľa z 7. 11.: opravy nálezov agentom sa odkladajú, kým majiteľ nedá vedieť; vychádza z `main` '
     '`cbbee6e1`, teda po PR #235; čaká na PR). (1) Zápis šiestej a siedmej práce kolegu: obe sú zlúčené, nasadené na Railway, CI (`checks` aj '
     '`backend-postgres`) prešlo a kontrola CodeRabbit prešla. K6 (PR #234, zlúčené 6. 11. 2026): nálezy 120, 177, 119 a 228 sú hotové, 204 '
     'čiastočne (tri kľúče a skript sú hotové, ostáva `profile.photoRemovedError`) a APP-01 z registra je zatvorené. K7 (PR #235, zlúčené 7. 11. '
     '2026): nálezy 271, 270 a 273 (vznikli pri K6 a opravené sú v K7) sú hotové; 91 a 175 čiastočne (91: frontend hotový, backendový zvyšok '
     'sa presúva do PO NASADENÍ; 175: hotová časť Obľúbené, ostávajú Spolupráce). Manuálne testy majiteľa prešli okrem testu zdieľanej karty po '
     'zmazaní fotky, ktorý sa nedal urobiť kvôli nálezu 274. (2) Nové nálezy majiteľa z manuálneho testu 7. 11. 2026, zapísané presne podľa '
     'jeho opisu a nezmapované (majiteľ: príčinu nájde kolega): 274 (fotky v príspevkoch sa na jednom testovacom účte nenačítajú, na druhom sú '
     'v poriadku), 275 (účet B nevidí účet A: hľadanie, ponuky, Nástenka aj profil, bez blokovania; HNEĎ, nový balík „Viditeľnosť medzi účtami“) a '
     '276 (mobil: pri prepínaní obrazoviek obsah krátko preblikne). (3) Nové nálezy kolegu: z K6 272 (meno recenzenta v okne „Pridať recenziu“), '
     'z K7 277 (pruh pripojenia bez `role` a `aria-live`), 278 (prázdny updater v `handleUserUpdate`), 279 (`BlurredContainImage` bez `onError` na '
     'ďalších šiestich miestach), 280 (priamy vstup do sekcie Nastavení nastaví `isRightSidebarOpen`) a 281 (šesť záložných textov Obľúbených bez '
     'diakritiky). Doplnky: 176 a R2 (meranie hodnôt zhodných so slovenčinou: cs 247, pl 49, de 3, hu 1), 206 (jeden `no-explicit-any` v '
     '`FavoritesModule.test.tsx`) a 224 (počet riadkov `useDashboardState.ts`). (4) Nové rozhodnutie R24: jednorazová výnimka z pravidla 500 '
     'riadkov pre nález 271 (jeden riadok v `useDashboardState.ts`, ktorý má teraz 922 riadkov); majiteľ ju schválil odovzdaním K7. (5) Pravidlá '
     'práce: striedanie 2 : 1 (dve dávky kolegu, potom jedna vetva agenta; kolega smie robiť aj nálezy PRED NASADENÍM a HNEĎ; majiteľ môže pomer '
     'dočasne zmeniť). Fronta prác pre kolegu je teraz všeobecná, je v časti 2 a jej prvá dávka K8 je mapovanie nálezov 275, 274 a 276 '
     'kolegom (rozhodnutie majiteľa 7. 11.); dávky z fronty, ktoré sa pôvodne volali K6 a K7 (24, 22, 23, 26 a 247, 248, 250, 256), sa nerobili '
     'a sú teraz K9 a K10.'),
] + ZMENY_STARSIE

# Nálezy opravené po prvom vydaní (`DONE_SINCE`), tabuľka PR (`DONE_PR_TABLE`) a popis série Upozornenia (`SERIA_UPOZORNENIA`) sú v
# `hotove.py`; tu sa len sprístupňujú pod pôvodnými názvami, aby ostatné moduly ostali nezmenené.
from hotove import DONE_PR_TABLE, DONE_SINCE, SERIA_UPOZORNENIA  # noqa: F401

# Odporúčané poradie práce (vlny). `polozky` sú ID, ktoré text vlny spomína: kontrola v `model.py` zlyhá, ak nejaké z nich
# už nie je otvorené, aby text vlny nezostal zastaraný.
PORADIE = [
    dict(vlna='0 – najprv',
         co='Rýchle upgrady z 183 a 184 bez veľkého rizika: backend (Pillow, gunicorn, requests, DRF, simplejwt, daphne, python-dotenv, bleach, '
            'Django 4.2.30, odstránenie allauth) je hotový a zlúčený (vetva 143, PR #203), frontend (`npm audit fix`, odstránený `next-intl`) je '
            'zlúčený (vetva 142). Skok `next` 14 → 16 je hotový vo vetve 159; Django 5.2 je zlúčený (vetva 154, PR #214), protobuf opravený '
            '(vetva 158, PR #217) a zo 183 ostáva len vývojový `pytest` (skupina po nasadení)',
         preco='Malé a bezpečné. Zraniteľné verzie zmiznú skôr, než pribudne ďalší kód.',
         polozky=['183']),
    dict(vlna='1 – základ, kým sa aplikácia dokončuje',
         co='Veľké skoky verzií sú hotové (Django 5.2 LTS s DRF 3.18.3 vo vetve 154, `google-cloud-vision` s protobuf vo vetve 158, '
            'Next 16 s Reactom 19 vo vetve 159) a balík „Produkčná odolnosť aplikácie“ (179, 234, 33, 9, 52 vo vetve 161; 214, 236 a 232 '
            'zlúčené vo vetve 165, PR #230; 246 v K12, PR #242; 296 v K13, PR #244; ostáva 245: overenie v logoch Railway; nový nález HNEĎ '
            '318 je zatvorený: push na iPhone nechodil pre nastavenie rollout 5 % v Railway, R33); ďalej 185, OW-07, '
            'overenie súkromia obrázkov správ (266), politika S3 bucketu v README (304) a balík „Spoľahlivosť CI a testov“ (31, TEST-…, 189, 209, 223, '
            '225, 295; 212 je '
            'hotová vo vetve 157, 228 v K6, 194 a časť 204 v K12, 244 v K14)',
         preco='Veľké skoky verzií sú najlacnejšie teraz, kým je kódu najmenej, a hneď po nich treba spustiť celé testy.',
         polozky=['245', '185', 'OW-07', '266', '304', '31', '189', '209', '223', '225', '295']),
    dict(vlna='2 – viditeľné chyby a overenia (iPhone a mobil)',
         co='Navigácia a Späť (13, 14, 174), plynulosť prechodov na mobile (283 až 285 a 289: zvyšky po 276; 286 je hotová v K14, jej zvyšky 308 až 310 sú hotové v K16 a ostáva 311; 287 a 288 '
            'čakajú na rozhodnutie R28), Profil a identita (81, 272; 320 je hotová v K15), Zdieľanie a obrázky '
            '(92, 207; 301 je hotová v K13), ponuky a tagy (322 a 323 sú hotové v K15), '
            'natívne okná `alert()` namiesto toastov (302: zostáva osem, výnimka R31 udelená s maximálnou opatrnosťou), Upozornenia a '
            'push (319 prepínač offline, 321 dokončiť kategórie upozornení pred štartom, R32 (a); plán po etapách je hotový a čaká na R34 až R36), Upozornenia '
            'na zmazaný obsah (74), Žiadosti (17), '
            'Vyhľadávanie a Sledovania (OW-11, OW-14, OW-17, OW-05), mobilný onboarding nových používateľov (252), vzhľad Nástenky '
            '(259 a 261; redizajn komentárov najprv vyžaduje rozhodnutie R23 o súboroch nad 500 riadkov) a drobnosti zo 36, živé '
            'overenie N16, RET-01..03 a ručný test VoiceOverom (294)',
         preco='To uvidí každý nový používateľ hneď prvý deň. Overenia (N16, RET-01..03, 294) sa dajú robiť už teraz na Railway a na iPhone.',
         polozky=['13', '14', '174', '283', '284', '285', '287', '288', '289', '311', '81', '272', '92', '207', '302', '319', '321', '74', '17', 'OW-11', 'OW-14', 'OW-17', 'OW-05', '252', '259', '261', '36', '294', 'N16', 'RET-01', 'RET-02', 'RET-03']),
    dict(vlna='3 – texty a súkromie',
         co='175, 176, 204, APP-03, 186 (a podľa R2 poradie jazykov; 120 a 177 sú hotové v K6; 297 v K13; 306 surový „Network Error“ v toastoch v K15)',
         preco='Závisí od toho, ktoré jazyky budú pri štarte (R2).',
         polozky=['175', '176', '204', 'APP-03', '186']),
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
         kedy='Pred prácou na 176 (určuje poradie prekladov), najneskôr pred štartom.'),
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

# Rozhodnutia R13–R33 (zoznam majiteľa v prílohe D a rozhodnutia po ňom) sú v `rozhodnutia_nastenka.py` (kvôli limitu 500 riadkov); pripájajú sa sem.
from rozhodnutia_nastenka import DECISIONS_NASTENKA  # noqa: E402

DECISIONS.extend(DECISIONS_NASTENKA)
