# -*- coding: utf-8 -*-
"""Stav zoznamu: dátum, položky opravené po prvom vydaní, tabuľka PR, rozhodnutia a denník zmien.

Tento súbor sa upravuje pri každej zmene stavu (nový nález, oprava, odpoveď na rozhodnutie); postup je v `README.md`.
"""

# Hlavička dokumentu: kedy sa naposledy menil a z akého stavu `main` sa vychádzalo.
STAV = dict(
    datum='8. 11. 2026',
    kod='`main` `95fee208` (po PR #242)',
    register='21. 10. 2026 + PR #193',
)

# Denník zmien dokumentu, najnovšie hore: (dátum, čo sa zmenilo). Záznamy do 6. 11. 2026 sú v `zmeny_starsie.py`.
from zmeny_starsie import ZMENY_STARSIE  # noqa: E402

ZMENY = [
    ('8. 11. 2026',
     'Vetva 169 (len zoznam podľa pokynu majiteľa z 7. 11.; vychádza z `main` `95fee208`, teda po PR #242; čaká na PR). (1) Zápis '
     'jedenástej a dvanástej práce kolegu: K11 (PR #241, zlúčené 7. 11. 2026; frontend, 27 súborov) a K12 (PR #242, zlúčené 8. 11. 2026; '
     'backend a `.github`, 18 súborov); CI (`checks` aj `backend-postgres`) prešlo v oboch, pri #241 kontrola CodeRabbit na poslednom '
     'commite preskočila (jej pripomienka k dostupnosti dlaždice galérie je opravená a uzavretá), pri #242 prešla a Codex mal jednu platnú '
     'pripomienku (animovaný WebP a APNG, opravené v `331e06ef`). Hotové sú 279 (viditeľná náhrada zlyhanej fotky), 291, 292 (PO NASADENÍ, '
     'v K11 na pokyn majiteľa), 293, 282, 246 a 194; 204 je hotová v časti CI, ostáva len `ProfileModule.tsx:468`. (2) Ručný test majiteľa '
     'po K12: fotka z priamo volaného starého endpointu ponúk je na produkcii neprístupná (S3 `AccessDenied`) a v ponuke sa nezobrazí: nový '
     'nález 301; podľa kódu to zrejme nie je regresia K12 (endpoint ukladá do `offers/`, kým verejné sú schválené fotky z `media/`). '
     '(3) Nové nálezy 296 až 303: z K12 296 (hromadné `QuerySet.delete()` obchádza zámky z 246), 297 (`check:missing-translations` nie je v '
     'CI), 298 a 299 (animované obrázky: avatary, správy a hlavná cesta cez S3 ukladajú len prvú snímku), 300 (telo chyby starého endpointu '
     'je Python zoznam); z K11 302 (14 natívnych `alert()` ostáva v 6 súboroch) a 303 (32 zo 43 súborov s `<img>` nemá `onError`, '
     'netriedené). (4) Doplnky: 196 (nový workflow používa staršie akcie), 229 (`glob` a `minimatch` pri prahu `high` audit nehlási), 183 '
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
            'zlúčené vo vetve 165, PR #230; 246 v K12, PR #242; ostáva 245 a 296); ďalej 185, OW-07, 244 (zámok závislostí backendu), '
            'overenie súkromia obrázkov správ (266) a balík „Spoľahlivosť CI a testov“ (31, TEST-…, 189, 209, 223, 225, 295; 212 je '
            'hotová vo vetve 157, 228 v K6, 194 a časť 204 v K12)',
         preco='Veľké skoky verzií sú najlacnejšie teraz, kým je kódu najmenej, a hneď po nich treba spustiť celé testy.',
         polozky=['185', '245', '296', 'OW-07', '244', '266', '31', '189', '209', '223', '225', '295']),
    dict(vlna='2 – viditeľné chyby a overenia (iPhone a mobil)',
         co='Navigácia a Späť (13, 14, 174), plynulosť prechodov na mobile (283 až 289: zvyšky po 276; 287 a 288 čakajú na rozhodnutie '
            'R28), Profil a identita (81, 272), Zdieľanie a obrázky (92, 207, 301 neprístupná fotka starého endpointu ponúk), natívne '
            'okná `alert()` namiesto toastov (302), Upozornenia na zmazaný obsah (74), Žiadosti (17), '
            'Vyhľadávanie a Sledovania (OW-11, OW-14, OW-17, OW-05), mobilný onboarding nových používateľov (252), vzhľad Nástenky '
            '(259 a 261; redizajn komentárov najprv vyžaduje rozhodnutie R23 o súboroch nad 500 riadkov) a drobnosti zo 36, živé '
            'overenie N16, RET-01..03 a ručný test VoiceOverom (294)',
         preco='To uvidí každý nový používateľ hneď prvý deň. Overenia (N16, RET-01..03, 294) sa dajú robiť už teraz na Railway a na iPhone.',
         polozky=['13', '14', '174', '283', '284', '285', '286', '287', '288', '289', '81', '272', '92', '207', '301', '302', '74', '17', 'OW-11', 'OW-14', 'OW-17', 'OW-05', '252', '259', '261', '36', '294', 'N16', 'RET-01', 'RET-02', 'RET-03']),
    dict(vlna='3 – texty a súkromie',
         co='175, 176, 204, 297, APP-03, 186 (a podľa R2 poradie jazykov; 120 a 177 sú hotové v K6)',
         preco='Závisí od toho, ktoré jazyky budú pri štarte (R2).',
         polozky=['175', '176', '204', '297', 'APP-03', '186']),
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

# Rozhodnutia R13–R30 (zoznam majiteľa v prílohe D a rozhodnutia po ňom) sú v `rozhodnutia_nastenka.py` (kvôli limitu 500 riadkov); pripájajú sa sem.
from rozhodnutia_nastenka import DECISIONS_NASTENKA  # noqa: E402

DECISIONS.extend(DECISIONS_NASTENKA)
