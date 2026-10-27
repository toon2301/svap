# -*- coding: utf-8 -*-
"""Stav zoznamu: dátum, položky opravené po prvom vydaní, tabuľka PR, rozhodnutia a denník zmien.

Tento súbor sa upravuje pri každej zmene stavu (nový nález, oprava, odpoveď na rozhodnutie); postup je v `README.md`.
"""

# Hlavička dokumentu: kedy sa naposledy menil a z akého stavu `main` sa vychádzalo.
STAV = dict(
    datum='27. 10. 2026',
    kod='`main` `1100c9cc` (po PR #202)',
    register='21. 10. 2026 + PR #193',
)

# Denník zmien dokumentu, najnovšie hore: (dátum, čo sa zmenilo).
ZMENY = [
    ('27. 10. 2026',
     'Vetva 143 (čaká na zlúčenie): časť 183a nálezu 183 – rýchle upgrady backendu (Pillow 13.0.0, pillow-heif 1.x, DRF 3.17.2, simplejwt 5.5.1, '
     'gunicorn 23.0.0, daphne 4.2.3, requests 2.33.0, python-dotenv 1.2.2, bleach 6.4.0, Django 4.2.30), odstránený nepoužívaný `django-allauth` '
     'aj jeho mŕtve nastavenia a CI na Pythone 3.11 (záznamy `pip-audit` 191 → 22; zostáva Django 5.2, Twisted, protobuf, pytest). Rozhodnutie R8 '
     'je zodpovedané. Vetva 142 je zlúčená (PR #202). Nové nálezy 193 (`Image.open` bez `formats=`), 194 (CI nekontroluje zraniteľné závislosti) '
     'a 195 (`.coveragerc`).'),
    ('27. 10. 2026',
     'Vetva 142 (zlúčená, PR #202): časť 184a nálezu 184 – odstránený nepoužívaný `next-intl`, `npm audit fix` a vyššie dolné hranice '
     '`axios`, `@sentry/nextjs`, `js-cookie` (zraniteľné balíky frontendu 19 → 2; zostáva `next` 14 → 16 a vnorený `postcss`), import '
     '`withSentryConfig` z `@sentry/nextjs/config`. Nález 188 je zlúčený (PR #201). Nový nález 192 (zbytočné súbory v repozitári). '
     'Úvod dokumentu podľa CodeRabbit (PR #201): rozsah čísel nálezov sa dopočítava z dát a už nezostarne.'),
    ('26. 10. 2026',
     'Nález 188 opravený na vetve 141 (čaká na zlúčenie): v teste `searchScrollMemory` sú hodiny pevné už pri zápise záznamu '
     '(starý variant padal v 0,4 % pokusov, pod záťažou v 2,6 %, nový v 0 z 12 000). Nález 173 je zlúčený (PR #200). Z celého behu E2E '
     'na vetve 140 (30 pádov) sú nové nálezy 189–191; ostatné pády sú už zapísané (TEST-17, TEST-12) alebo čakajú na overenie '
    '(jazykový test pri zmene jazyka vo webkit-mobile).'),
    ('26. 10. 2026',
     'Nález 173 opravený na vetve 140 (čaká na zlúčenie): 13 špecov s `page.route` a `feed-cleanup` blokuje service worker a Jest poistka to stráži '
     'pre nové špecy. Spresnenie: v Playwrighte 1.63 zachytáva `context.route` v Chromiu aj požiadavky workera, takže blok sa vyžaduje len pri '
     '`page.route` (`google-login-completion` sa nemenilo). Nové nálezy 187 (`public/sw.js`) a 188 (náhodne padajúci test '
     '`searchScrollMemory`, zistený pri celom behu Jestu).'),
    ('26. 10. 2026',
     'Prvé vydanie v repozitári. Zlúčený zoznam nálezov 1–186 (pôvodný zoznam 1–172, nové nálezy 173–186, register OW- / TEST-), '
     'úlohy N1–N16 a rozhodnutia R1–R11. Podľa spresnenia používateľa sa hosting na novom serveri rieši až po dokončení aplikácie '
     '(Railway ostáva na testy), preto N1–N3 nie sú v skupine HNEĎ.'),
]

# Nálezy opravené po prvom vydaní. Pri oprave sa položka odstráni z `ORIG_OPEN` / `NEW_ITEMS` a pridá sa sem:
#   dict(n=173, text='HOTOVÉ: čo sa opravilo', vetva='140', pr='#199' alebo None, zlucene=True alebo False)
DONE_SINCE = [
    dict(n=173, vetva='140', pr='#200', zlucene=True,
         text='HOTOVÉ: E2E špecy, ktoré strážia zápisy alebo podvrhujú sieť cez `page.route`, blokujú service worker (`serviceWorkers: \'block\'`); '
              'nové špecy stráži Jest poistka `E2eServiceWorker.guard.test.ts`. Overené v Chromiu na produkčnom builde (Playwright 1.63): '
              'bez bloku strážca zápis 1,5 s po načítaní nezachytí.'),
    dict(n=188, vetva='141', pr='#201', zlucene=True,
         text='HOTOVÉ: test „rejects expired records and future timestamps“ v `searchScrollMemory.test.ts` zafixuje hodiny pred zápisom '
              'záznamu, takže už nepadá náhodne. Starý variant: 16 pádov zo 4 000 bez záťaže a približne 104 zo 4 000 pod záťažou, '
              'nový 0 z 12 000. Mutácie expirácie a odmietania budúcich časov test stále zabijú.'),
]

# Tabuľka „PR → vetva → položky“ pre položky, ktoré boli hotové už pri prvom vydaní.
DONE_PR_TABLE = [
    ('#177', '126', '128, 137, 141 (prvá polovica), 155'),
    ('#176', '125', '116, 147 (+ odstránený ladiaci pás 126)'),
    ('#180', '127', '159'),
    ('#181', '128', '160, 161'),
    ('#182', '129', '167, 168, 169, 170 (+ opravy po CodeRabbit)'),
    ('#187 #188 #189 #190 #192 #194', '130–135', 'séria Upozornenia (nálezy sa v zozname nečíslovali, viď nižšie)'),
    ('#196', '136', '162, 163, 164'),
    ('#197', '137', '171, 172'),
    ('#198', '138', '154, 165, 166 (+ „a ďalší (N)“ a hlášky pri Obľúbených)'),
]

# Popis série Upozornenia (nečíslované nálezy), zobrazí sa pod tabuľkou PR.
SERIA_UPOZORNENIA = (
    'Séria Upozornenia (nečíslované nálezy): #187 riadky upozornení na mobile majú 72 px ako riadky konverzácií, '
    '#188 dlhé slová sa zalamujú a obnovenie drží načítané dávky, #189 chyba „Zobraziť ďalšie“ sa ukáže pri tlačidle, '
    '#190 scroll desktopového panela neodpojí aplikáciu od okna, #192 realtime resync pri návrate / pripojení / online + '
    'polling 30 s (nad 90 načítaných vypnutý), #194 nekonečný scroll s kostrami a opakovaním s odstupom. '
    'PR #191 (vetva `134-diag`) je len diagnostika a nesmie sa zlúčiť (nález 182).'
)

# Odporúčané poradie práce (vlny). `polozky` sú ID, ktoré text vlny spomína: kontrola v `model.py` zlyhá, ak nejaké z nich
# už nie je otvorené, aby text vlny nezostal zastaraný.
PORADIE = [
    dict(vlna='0 – najprv',
         co='Rýchle upgrady z 183 a 184 bez veľkého rizika: backend (Pillow, gunicorn, requests, DRF, simplejwt, daphne, python-dotenv, bleach, '
            'Django 4.2.30, odstránenie allauth) je hotový na vetve 143 a čaká na zlúčenie, frontend (`npm audit fix`, odstránený `next-intl`) je '
            'zlúčený (vetva 142). Zvyšok 183 a 184 (Django 5.2, protobuf, `next` 14 → 16) je vo vlne 1',
         preco='Malé a bezpečné. Zraniteľné verzie zmiznú skôr, než pribudne ďalší kód.',
         polozky=['183', '184']),
    dict(vlna='1 – základ, kým sa aplikácia dokončuje',
         co='Veľké skoky verzií z 183 a 184 (Django 5.2 LTS s DRF 3.18, `google-cloud-vision` kvôli protobuf, Next 16 s Reactom 19), 179 (2FA), '
            '9, 33, 52, 185, OW-07 a balík „Spoľahlivosť CI a testov“ (31, TEST-…, 189, 190)',
         preco='Veľké skoky verzií sú najlacnejšie teraz, kým je kódu najmenej, a hneď po nich treba spustiť celé testy.',
         polozky=['183', '184', '179', '9', '33', '52', '185', 'OW-07', '31', '189', '190']),
    dict(vlna='2 – viditeľné chyby a overenia (iPhone a mobil)',
         co='Navigácia a Späť (13, 14, 174), Profil a identita (81, 119), Zdieľanie (91, 92), Upozornenia na zmazaný obsah (74), Žiadosti (17), '
            'Vyhľadávanie a Sledovania (OW-11, OW-14, OW-17, OW-05), živé overenie N16 a RET-01..03',
         preco='To uvidí každý nový používateľ hneď prvý deň. Overenia (N16, RET-01..03) sa dajú robiť už teraz na Railway a na iPhone.',
         polozky=['13', '14', '174', '81', '119', '91', '92', '74', '17', 'OW-11', 'OW-14', 'OW-17', 'OW-05', 'N16', 'RET-01', 'RET-02', 'RET-03']),
    dict(vlna='3 – texty a súkromie',
         co='120, 175, 176, 177, APP-03, 186 (a podľa R2 poradie jazykov)',
         preco='Závisí od toho, ktoré jazyky budú pri štarte (R2).',
         polozky=['120', '175', '176', '177', 'APP-03', '186']),
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
    dict(id='R2', tema='Jazyky pri štarte (176, 120, 175, 177, APP-03)',
         otazka='Ktoré jazyky majú byť pri štarte plne preložené?',
         odporucanie='Podľa cieľového trhu. V profile a vyhľadávaní chýbajú preklady hlavne v češtine (~30) a poľštine (~14), v nemčine jeden; '
                     'v celej aplikácii má čeština asi 210 a poľština asi 90 slovenských kópií (176). Ak štart cieli len na Slovensko, 176 môže ísť po '
                     'nasadení; ak aj na Česko a Poľsko, patrí pred štart. Malé veci 120, 175 a 177 idú pred štart v každom prípade.',
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
         kedy='Pred prácou na 184; časť o hostingu frontendu až neskôr (R1).'),
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
]
