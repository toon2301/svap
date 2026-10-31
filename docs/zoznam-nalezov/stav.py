# -*- coding: utf-8 -*-
"""Stav zoznamu: dátum, položky opravené po prvom vydaní, tabuľka PR, rozhodnutia a denník zmien.

Tento súbor sa upravuje pri každej zmene stavu (nový nález, oprava, odpoveď na rozhodnutie); postup je v `README.md`.
"""

# Hlavička dokumentu: kedy sa naposledy menil a z akého stavu `main` sa vychádzalo.
STAV = dict(
    datum='30. 10. 2026',
    kod='`main` `e2612438` (po PR #216)',
    register='21. 10. 2026 + PR #193',
)

# Denník zmien dokumentu, najnovšie hore: (dátum, čo sa zmenilo).
ZMENY = [
    ('31. 10. 2026',
     'Vetva 158 (čaká na zlúčenie): časť 183c nálezu 183 – `google-cloud-vision` 3.4.5 → 3.16.0 (vyžaduje protobuf od 6.33.5, dnes 7.36.2), čím '
     'zmizlo hlásenie CVE-2026-0994; `pip-audit` projektových závislostí 4 → 2 záznamy (zostáva len vývojový `pytest`). Nový test '
     '`swaply/test/test_vision_client_contract.py` (6 testov) spúšťa skutočného klienta Google Vision proti falošnému gRPC serveru, lebo '
     'doterajšie testy používajú atrapu a produkcia je fail-closed. Overené: čerstvé prostredie, `pip check` čistý, celá backendová sada '
     'na SQLite (1 993 prešlo a 10 preskočených) aj PostgreSQL 16 (2 001 prešlo a 2 preskočené), päť zámerných chýb test zachytil, nahratie obrázka správy cez API proti falošnému '
     'serveru prešlo na starých aj nových knižniciach. Skutočné volanie serverov Google sa lokálne overiť nedá: čaká na test majiteľa po '
     'nasadení. Zo 183 zostal len `pytest`, preto sa nález presúva zo skupiny HNEĎ do skupiny PO NASADENÍ. Nové nálezy: 224 (mobilné '
     'Nastavenia: po F5 vedie Zatvoriť na Nástenku, nie na profil; nález majiteľa z iPhonu, odložený na čas po nasadení) a 225 (jazyk '
     'v emulovanom WebKite: dotyk bez kliku, na reálnom iPhone v poriadku). Doplnené nálezy 222 (Codex ho overil v reálnom WebKite) '
     'a 223 (nové dôkazy a výsledok kontroly logov Railway). Zlúčené: vetva 157 (PR #216) a E2E vetva `e2e/profilove-adresy` (PR #215), '
     '`main` `e2612438`.'),
    ('30. 10. 2026',
     'Vetva 157 (čaká na zlúčenie): nález 212 – CI beží backendovú sadu aj na PostgreSQL 17 (nový job `backend-postgres` súbežne s `checks`; '
     'osem testov so zámkami riadkov sa na SQLite preskakovalo a v CI nebežalo nikdy). Súčasne oprava nálezu 222 z Codexovej správy '
     '(číselná adresa vlastného profilu stratila podstránku `/language`; príčina: pravá položka sa otvárala len pri zhode slugu a kanonizácia '
     'ID → slug zahodila podstránku): na pokyn majiteľa je kód na Codexovej vetve `e2e/profilove-adresy` (zlúčená v PR #215), záznam v zozname '
     'je tu, aby sa dokumentácia nerozchádzala medzi dvoma vetvami. Nový otvorený nález 223 (občasné zlyhanie siete pri `GET /api/auth/me/` '
     'počas prípravy E2E; príčina nepreukázaná, nič sa neopravuje). Vetvy 154 (PR #214) a `e2e/profilove-adresy` (PR #215) sú zlúčené, `main` `bd9131e6`.'),
    ('30. 10. 2026',
     'Vetva 154 (čaká na zlúčenie): časť 183b nálezu 183 – backend sa povyšuje z Djanga 4.2.30 na 5.2.18 a z DRF 3.17.2 na 3.18.3 '
     '(v `backend/requirements.txt` sa menia dva riadky; DRF 3.18 vyžaduje Django 5.2, preto spolu). Pribudli dve poistky: test, že modely '
     'a migrácie sedia (`tests/test_migrations_up_to_date.py`; v CI ani v testoch sa to dosiaľ nekontrolovalo), a rýchly hasher hesiel len '
     'v testoch (`backend/conftest.py` s testom; nález 220: Django 5.2 hashuje heslá 1 000 000 iteráciami, takže by sa backendová sada '
     'predĺžila z 13 na 19 minút, s hasherom trvá 2). Od poslednej úpravy zoznamu sa zlúčili vetvy 155 (oprava posunu pri fotke, PR #211; '
     'Railway ju nasadil po dokončení behu Playwrightu), 156 (odovzdanie Playwrightu druhému agentovi, PR #212) a Codexova vetva '
     '`e2e/bezpecna-diagnostika` (PR #213, len E2E). Overené v čistom prostredí z reálnych súborov závislostí (Python 3.11): `pip check`, '
     '`manage.py check` a `makemigrations --check` čisté; celá backendová sada s pôvodným hasherom, teda ako v produkcii: SQLite '
     '1 983 prešlo a 10 preskočených, PostgreSQL 16 1 991 prešlo a 2 preskočené; konečný strom vetvy '
     '(s novými testami a rýchlym hasherom): SQLite 1 987 prešlo a 10 preskočených za 2 min 8 s, PostgreSQL 16 '
     '1 995 prešlo a 2 preskočené; v produkčných nastaveniach (PostgreSQL, Redis, simulované S3) 38 z 38 kontrol, '
     'servery daphne a gunicorn s WebSocketom 15 z 15, Celery worker a beat 4 z 4, admin rovnako ako na Djangu 4.2 (67 stránok 200, tri '
     'zámerne zakázané formuláre „pridať“), hlavičky odpovedí a CORS rovnaké. `pip-audit` projektových závislostí: 22 → 4 záznamy '
     '(zostáva protobuf 4.25.9 a pytest 8.3.2); Twisted 26.10.0, ktoré medzitým vyšlo, berie čerstvá inštalácia sama (6 záznamov '
     'zmizlo). Nové nálezy: 220 (hotový v tejto vetve) a 221 (nepoužívaný `swaply/test_settings.py`). Nález 218 má už vetvu 155 '
     'zlúčenú (PR #211).'),
    ('29. 10. 2026',
     'Vetva 155 (čaká na zlúčenie): nález 218 – po odoslaní fotky v správach sa okno drží na spodku, kým sa fotka načíta (PC aj mobil; našiel '
     'ho používateľ manuálnym testom po nasadení vetvy 152). Príčina a overenie sú v zázname nálezu; oprava je nový hook '
     '`useStickToBottomOnGrowth` s jedným zapojením v `ConversationMessagesPane`. Vetva 153 je zlúčená (PR #210), z jej kontroly CodeRabbit '
     'ostáva nový nález 219 (časový limit pre snímku stránky v dôkazoch, text hlášky v `search-settled.ts`; nič z toho nie je vážne). '
     'Zoznam nadlimitných súborov (TECH-01…11) je prepočítaný: 33 produkčných súborov nad 500 riadkov namiesto desiatich, medzi nimi '
     '`ConversationDetail.tsx` 556 a `useConversationThreadController.ts` 505, ktoré sa podľa `svaply.mdc` nemenia, preto oprava posunu '
     'v správach vznikla v novom súbore. Po kontrole PR #211: Codex upozornil na možný skok na spodok pri načítaní starších správ (platné, '
     'opravené: poloha sa zisťuje pri posune a test to stráži), CodeRabbit na nejasný text nálezu 218 a chýbajúci opis funkcie panela správ. '
     'Po tretej kontrole: CodeRabbit upozornil na chýbajúce číslo PR v zázname nálezu 218 (opravené), na posúvanie aj pri zmenšení obsahu '
     '(platné, hook posúva len pri raste výšky a test to stráži) a na možný skok pri načítaní starších správ blízko spodku (neplatné: staršie '
     'správy sa načítavajú až po plnej stránke 100 správ, takže poloha pri začiatku konverzácie nikdy nie je „blízko spodku“; zapísané do popisu hooku).'),
    ('29. 10. 2026',
     'Vetva 153 (čaká na zlúčenie): nález 217 – štyri jednorazové pády záverečných behov E2E (29. 10.: tri samostatné behy aj spoločný beh '
     'dali 427 prešlo, 2 padli, 303 preskočených; každý pád prešiel pri samostatnom opakovaní). Pád s posunom o 14 px v Chromiu je vysvetlený '
     'a reprodukovaný: stránka `/search` posiela hľadanie pri prvom načítaní dvakrát a medzistav je o 14 px vyšší (nový nález 216; aplikácia '
     'sa nemenila). Testy teraz pred meraním a klikaním čakajú, kým sa stránka ustáli, a špecy hľadania pri páde vypíšu dôkazy bez osobných '
     'údajov (požiadavky s časmi, stav stránky). Pre dva pády vo WebKite (ťuknutie na autora, odpoveď hľadania do 15 s) príčina zatiaľ nie je '
     'známa; vysvetlia ich dôkazy z ďalšieho behu. Opravy z vetvy 151 sa potvrdili: žiadny z desiatich testov `google-login-completion` vo '
     'WebKite nepadol a rozpočet obnovy 3 s stačil. Vetva 152 je zlúčená (PR #209). Povýšenie na Django 5.2 sa posúva na vetvu 154. '
     'Po kontrole CodeRabbit (PR #210): dôkazy pri páde neobsahujú text chyby stránky (môže niesť kus spracúvaných údajov, napr. pri '
     '`JSON.parse`), vypíše sa len druh chyby, a nález 183 uvádza vetvu 152 ako zlúčenú. Po druhej kontrole sa nič z prehliadača nevypisuje '
     '„očistené“: zlyhanie siete sa vypíše len ako druh (kód Chromia alebo pevné slovo), aktívny prvok len z pevných zoznamov (značka, '
     '`role`, `type`, `data-sidebar-nav-item`, `data-onboarding`; `data-testid` sa už nečíta) a všetko mimo zoznamu ako `other`, takže ani '
     'IP adresa, názov servera či slug z atribútu sa do výstupu nedostanú; cesty za `reset-password`, `password-reset`, '
     '`password-reset-verify` a `check-email` sa nahradia. Doplnené sú aj opisy funkcií (CodeRabbit uviedol pokrytie opismi 66,67 % pri prahu 80 %).'),
    ('29. 10. 2026',
     'Vetva 152 (čaká na zlúčenie): prvý krok časti 183b nálezu 183 – úložiská (médiá na S3, statické súbory bez manifestu) sú nastavené cez '
     '`STORAGES` namiesto `DEFAULT_FILE_STORAGE` a `STATICFILES_STORAGE`, ktoré Django 5.1+ ticho ignoruje (fotky by sa ukladali na lokálny disk '
     'servera). Na Djangu 4.2 sa správanie nemení; výber súkromného úložiska fotiek správ číta už len `STORAGES`. Dva nové súbory testov (7 testov): '
     'produkčné nastavenia v samostatnom procese a výber úložiska správ, ktorý doteraz nemal test. Celá backendová sada: Django 4.2.30 na SQLite '
     '1 983 prešlo a 10 preskočených, na PostgreSQL 16 1 991 a 2, Django 5.2.18 na SQLite 1 983 a 10. Skúška povýšenia na Django 5.2.18 s DRF 3.18.3 '
     'v oddelenom prostredí (sada na SQLite aj PostgreSQL, 38 kontrol s produkčnými nastaveniami, servery s WebSocketom, Celery, admin, migrácie '
     'od nuly aj nad databázou z 4.2, tokeny v oboch smeroch) neukázala žiadnu prekážku; samotné povýšenie je vetva 153. Nové nálezy 212 (CI '
     'testuje backend len na SQLite), 213 (`CheckConstraint(check=…)`), 214 (`sentry_sdk.push_scope`) a 215 (knižnice staršie než oficiálna podpora '
     'Djanga 5.2); nález 32 doplnený o ďalšie zbytočné súbory. Vetva 151 je zlúčená (PR #208), nálezy 190 a 210 sú zlúčené.'),
    ('29. 10. 2026',
     'Vetva 151 (čaká na zlúčenie): nález 210 – oprava 27 zastaraných alebo chybných E2E testov z druhého celého behu na Railway (28. 10.: '
     '395 prešlo, 35 padlo, 302 preskočených): diagnostika vyhľadávania podľa kontraktu OW-20 (TEST-17), tlačidlo „Zobraziť ďalšie“ v '
     'upozorneniach, blok service workera v testoch prihlásenia cez Google (desať pádov vo WebKite), preskočenie scenára s kolieskom myši v '
     'mobilnom WebKite (nález 190), názov tlačidla „Otváracia doba“ a rozpočet obnovy pozície 3 s. Sedem testov čaká na testovacie údaje na '
     'Railway (nový nález 209, pripraví ich používateľ), jeden jednorazový pád (`search-country-scroll.spec.ts:74`) sa nedal vysvetliť ani '
     'reprodukovať a neopravuje sa. Nový nález 211 (tri rôzne záložné texty pre názov otváracích hodín). Vetva 150 je zlúčená (PR #207) a '
     'používateľ overil, že Railway beží na Node 22 (nález 208 je overený).'),
    ('28. 10. 2026',
     'Vetva 150 (čaká na zlúčenie): nález 208 – CI beží na Node 22 LTS namiesto Node 18 a `frontend/package.json` (aj zámok) zafixuje '
     '`engines.node` na `22.x`, takže Railway pri builde použije tú istú verziu. Tri testy strážcu prihlásenia proti zástupnému serveru, '
     'ktoré sa na Node 18 preskakovali, bežia teraz aj v CI. Vetva 149 je zlúčená (PR #206). Po kontrole CodeRabbit (PR #206) sa v zázname '
     'vetvy 149 opravilo slovo „vedie“ na „uvádza“.'),
    ('28. 10. 2026',
     'Vetva 149 (čaká na zlúčenie): nález 202 – strážca prihlásenia v E2E testoch: počas behu každých 5 minút obnoví prihlásenie a prepíše súbor, '
     'z ktorého štartujú testy, takže dlhý beh sa po 15 minútach nerozpadne (297 z 318 pádov celého behu). Vetva 148 je zlúčená (PR #205). '
     'Do nálezu 207 doplnené meranie na iPhone (Wi-Fi približne 5 s, mobilné dáta 4,25 s). CI na PR #206 zlyhalo, lebo Playwright sa na Node 18 '
     '(verzia v CI) pri načítaní sám ukončí a zhodil Jest; test strážcu je upravený a nový nález 208 (CI beží na Node 18). Po kontrole CodeRabbit '
     '(PR #206): dočasný súbor s prihlásením sa odstráni aj vtedy, keď zlyhá až jeho zápis, text nálezu 207 uvádza príčinu spomalenia ako '
     'hypotézu a nový stav po úspešnej obnove sa nestratí, keď zlyhá zápis súboru (ostane v pamäti a zapíše sa pri ďalšom pokuse). Tretia '
     'kontrola CodeRabbit: testy strážcu už nezávisia od načasovania (druhú obnovu test zadrží a kontroluje poradie volaní) a návrh zvýšiť '
     'Node v CI na 20 sa rieši samostatne v náleze 208 (odporúčanie 22 LTS, lebo Node 20 už tiež nemá podporu).'),
    ('28. 10. 2026',
     'Vetva 148 (čaká na zlúčenie): nález 203 – opravená poškodená diakritika (`?`) v prekladoch cs, de, hu a pl a test, ktorý ju hlási; '
     'ukázala ju veľká fotka v správach pri českom rozhraní (toast „Obr?zek je p??li? velk?“). Poškodených hodnôt je 23, nie 20. Nový nález 207 '
     '(odoslanie fotky v správach trvá dlhšie). Vetvy 144–147 sú zlúčené (PR #204) a manuálny test na iPhone prešiel (správy s fotkou, avatar, '
     'Nástenka), takže nálezy 197–201 sú overené. Po kontrole CodeRabbit (PR #205) test diakritiky zachytí aj posledné písmeno slova nahradené '
     '`?` pred bodkou alebo čiarkou.'),
    ('27. 10. 2026',
     'Vetva 147 (čaká na zlúčenie, nadväzuje na vetvu 146): nález 201 – výber fotky avatara cez vstup, ktorý žije v DOM (iOS). Nový nález 206 '
     '(ESLint hlási 681 chýb v 104 súboroch frontendu, deväť z nich `rules-of-hooks` v `ConversationMessageRow.tsx`).'),
    ('27. 10. 2026',
     'Vetva 146 (čaká na zlúčenie, nadväzuje na vetvu 145): nález 200 – HEIC z iPhonu prejde validáciou obrázka hneď od prvej požiadavky, '
     'pretože sa `pillow-heif` registruje pri štarte aplikácie. Nový nález 205 (päť lenivých registrácií HEIC je nadbytočných).'),
    ('27. 10. 2026',
     'Vetva 145 (čaká na zlúčenie, nadväzuje na vetvu 144): nález 199 – mobilný prehliadač fotky na Nástenke dostane od karty príspevok '
     's živými fotkami, takže sa po vytvorení príspevku fotka po ťuknutí otvorí aj bez opätovného načítania feedu.'),
    ('27. 10. 2026',
     'Vetva 144 (čaká na zlúčenie): manuálne testy na iPhone (iOS 27.0.1) po PR #203 odhalili, že fotka z iPhonu príde cez `/api` na server s '
     'prázdnym telom (chyba WebKitu). Nález 197 (appka kopíruje súbory do pamäte pred odoslaním, backend stráž `swaply/empty_upload.py` a log so '
     'zariadením) a 198 (dôvod odmietnutia fotky a preložené hlášky pri nahrávaní správ a avatara). Nové nálezy 199 (Nástenka: fotka sa po '
     'vytvorení príspevku nedá otvoriť na mobile), 200 (HEIC padá na validácii), 201 (avatar: vstup súboru mimo DOM), 202 (E2E: beh dlhší než '
     '15 minút stratí prihlásenie; z 318 pádov celého behu má túto príčinu 297), 203 (`?` namiesto diakritiky v textoch o fotkách) a 204 '
     '(chýbajúce a nepoužité kľúče prekladov). Vetva 143 je zlúčená (PR #203).'),
    ('27. 10. 2026',
     'Vetva 143 (čaká na zlúčenie): časť 183a nálezu 183 – rýchle upgrady backendu (Pillow 13.0.0, pillow-heif 1.x, DRF 3.17.2, simplejwt 5.5.1, '
     'gunicorn 23.0.0, daphne 4.2.3, requests 2.33.0, python-dotenv 1.2.2, bleach 6.4.0, Django 4.2.30), odstránený nepoužívaný `django-allauth` '
     'aj jeho mŕtve nastavenia a CI na Pythone 3.11 (záznamy `pip-audit` 191 → 22; zostáva Django 5.2, Twisted, protobuf, pytest). Rozhodnutie R8 '
     'je zodpovedané. Vetva 142 je zlúčená (PR #202). Nové nálezy 193 (`Image.open` bez `formats=`), 194 (CI nekontroluje zraniteľné závislosti), '
     '195 (`.coveragerc`) a 196 (akcie CI cielia na Node.js 20). Po kontrole CodeRabbit (PR #203): minimálna opravená verzia DRF je 3.18.2 a audit '
     'z nálezu 194 musí porovnávať výsledok so známymi výnimkami.'),
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
              'bez bloku strážca zápis 1,5 s po načítaní nezachytí. Vetva 151 (nález 210) poistku rozšírila aj na `context.route` a blok '
              'doplnila do `google-login-completion.spec.ts`, kde vo WebKite padalo desať testov.'),
    dict(n=188, vetva='141', pr='#201', zlucene=True,
         text='HOTOVÉ: test „rejects expired records and future timestamps“ v `searchScrollMemory.test.ts` zafixuje hodiny pred zápisom '
              'záznamu, takže už nepadá náhodne. Starý variant: 16 pádov zo 4 000 bez záťaže a približne 104 zo 4 000 pod záťažou, '
              'nový 0 z 12 000. Mutácie expirácie a odmietania budúcich časov test stále zabijú.'),
    dict(n=197, vetva='144', pr='#204', zlucene=True,
         text='HOTOVÉ (overené používateľom na iPhone 28. 10.): nahrávanie fotiek z iPhonu (iOS 27.0.1, podľa hlásení aj Safari 26.5.x) prišlo cez '
              '`/api` na server s prázdnym telom, takže správa skončila hláškou „Neplatné údaje“ a zmena avatara všeobecnou chybou. Príčina je '
              'chyba WebKitu: `File` z `<input type="file">` sa cez XHR/fetch pošle s `Content-Length: 0` (hlásia ju aj iné projekty; oprava je v '
              'WebKite zlúčená, vydanie nie je známe). Appka teraz pred odoslaním kopíruje súbory z `FormData` do pamäte (`lib/materializeUploadFiles.ts`, '
              'jeden axios interceptor v `lib/api.ts`) a pri zlyhaní čítania pošle pôvodný súbor. Backend rozpoznáva prázdny multipart zdieľanou '
              'strážou `swaply/empty_upload.py` (správy: kód `empty_message_upload`, avatar: `empty_avatar_upload`) a zapíše ho do logu s '
              'user-agentom. Priame nahrávanie na S3 (príspevky, ponuky, portfólio) sa nemenilo, z iPhonu funguje. Overené Jestom, pytestom a '
              'mutačnými kontrolami a v Chromiu so simuláciou chyby.'),
    dict(n=198, vetva='144', pr='#204', zlucene=True,
         text='HOTOVÉ: pri 400 na odoslanie správy appka ukazovala všeobecné „Neplatné údaje“, aj keď backend poslal dôvod pri fotke (príliš veľká, '
              'zlý formát, zlyhaná kontrola obsahu); `getMessagingErrorMessage` teraz ukáže dôvod z `validation_errors.image`. Fotka, ktorá na server '
              'nedorazila, má vlastné preložené hlášky (`messages.uploadEmpty`, `profile.photoUploadEmpty`) vo všetkých šiestich jazykoch a pri '
              'avatare sa namiesto doslovného textu v kóde používa existujúci preklad `profile.photoUploadError`.'),
    dict(n=199, vetva='145', pr='#204', zlucene=True,
         text='HOTOVÉ (overené používateľom na iPhone 28. 10.): mobilný prehliadač fotky na Nástenke dostával od karty zastaraný príspevok bez '
              'adries fotiek (fotky, ktoré sa po vytvorení príspevku ešte spracúvali, dosleduje polling len v stave karty), takže sa `ImageLightbox` '
              'hneď po otvorení zavrel a ťuk na hotovú fotku „nič neurobil“, kým sa feed nenačítal znova. Prehliadač teraz dostane príspevok '
              's živými fotkami karty (`feed/useViewerPost.ts`); polling sa nereštartuje a objekt sa mení len pri zmene príspevku alebo fotiek. '
              'Overené Jestom (dva regresné testy zlyhajú, keď sa zapojenie vráti) a v Chromiu s rozmermi iPhonu na produkčnom builde.'),
    dict(n=200, vetva='146', pr='#204', zlucene=True,
         text='HOTOVÉ (overené používateľom na iPhone 28. 10.): podpora HEIC (`pillow-heif`) sa registruje pri štarte aplikácie '
              '(`swaply/heif_support.py`, volané z `AccountsConfig.ready()`), takže HEIC z iPhonu prejde validáciou `ImageField` v DRF už od prvej '
              'požiadavky v každom procese; predtým len v procese, ktorý už predtým spracoval iný obrázok. Chýbajúca knižnica štart nezhodí, zapíše '
              'varovanie. Overené: test v čerstvom procese (pred opravou zlyhal s „Uploadujte prosím obrázok…“, po oprave prejde) a odoslanie HEIC '
              'správy cez HTTP v čerstvom procese (pred opravou 400 „Neplatné údaje“, po oprave 201 aj s miniatúrou). Päť lenivých registrácií v '
              'moduloch spracovania obrázkov sa nemenilo (nález 205).'),
    dict(n=201, vetva='147', pr='#204', zlucene=True,
         text='HOTOVÉ (overené používateľom na iPhone 28. 10.): výber fotky avatara cez „Zmeniť fotku“ (profil aj mobilná úprava profilu) a v '
              'desktopovom formulári úpravy profilu používal `document.createElement(\'input\')`, ktorý sa nikdy nepripojil do DOM; WebKit na iOS '
              'takýto element po zatvorení modalu môže odpratať a `change` sa nespustí, takže sa po výbere fotky nestalo nič (ani chyba). '
              'Nový pomocník `lib/pickImageFile.ts` drží skrytý vstup v `document.body` až do výberu alebo zrušenia a používa ho modal aj '
              'formulár. Overené Jestom (tri mutácie testy zabijú: odpojený vstup v modale aj vo formulári a pomocník bez pripojenia do DOM). '
              'Príčinu na iPhone som pri oprave nemohol reprodukovať (chýba WebKit); manuálny test používateľa na iPhone po nasadení prešiel.'),
    dict(n=203, vetva='148', pr='#205', zlucene=True,
         text='HOTOVÉ: v `messages/{cs,de,hu,pl}.json` mali texty o fotkách v časti Správy namiesto písmen s diakritikou znak `?` (23 hodnôt: cs 6, '
              'de 4, hu 7, pl 6; pôvodný zápis uvádzal 20, lebo dvojité `??` v „p??lohu“, „Do??cz“ a „za??cznik“ vzor písmeno–`?`–písmeno nezachytil). '
              'Zistené pri manuálnom teste na iPhone s českým rozhraním: pri fotke nad 5 MB sa ukázalo „Obr?zek je p??li? velk?“. Poškodenie je '
              'v súboroch od prvého importu repozitára, nie je to nová regresia a mimo týchto štyroch súborov sa v repozitári nenašlo. Texty sú '
              'doplnené a test `translationsDiacritics.test.ts` zakazuje `?` v slove, posledné písmeno slova nahradené `?` pred bodkou alebo čiarkou '
              '(doplnené po kontrole CodeRabbit na PR #205) a náhradný znak U+FFFD vo všetkých šiestich jazykoch. Pred opravou zlyhal na týchto 23 '
              'hodnotách, skúšobné poškodenia zabije a bežné otázky (aj „zmazať?...“) nepovažuje za chybu. Overené aj v Chromiu na produkčnom '
              'builde: toast pri fotke nad 5 MB aj pri zlom type súboru je vo všetkých šiestich jazykoch správny.'),
    dict(n=202, vetva='149', pr='#206', zlucene=True,
         text='HOTOVÉ: E2E testy po približne 15 minútach strácali prihlásenie. `global-setup.ts` sa prihlási raz, prihlásenie platí 15 minút a jeho '
              'obnova je jednorazová (rotácia refresh tokenu), takže ju spravil len prvý test a ostatné ostali so zablokovaným tokenom. Backend '
              'navyše dovolí len 10 obnovení za minútu z jednej adresy, čo pád po vypršaní ešte zhoršilo. Nový strážca prihlásenia '
              '(`e2e/support/sessionKeeper.ts`, obnova v `e2e/support/refreshStorageState.ts`, zapojenie v `global-setup.ts`) počas behu každých '
              '5 minút (voliteľne `E2E_SESSION_KEEPER_SECONDS`) obnoví prihlásenie rovnako ako appka (`POST /api/token/refresh/` s CSRF hlavičkou '
              'a pôvodom požiadavky) a atomicky prepíše súbor s prihlásením, takže každý nový test štartuje s čerstvým; ak zápis po úspešnej obnove zlyhá, nový stav '
              'ostane v pamäti a zapíše sa pri ďalšom pokuse (obnova je jednorazová, zo zastaraného súboru by už neprešla); na konci behu počká '
              'na rozbehnutú obnovu. Zmena sa týka len testov. Overené Jestom (19 testov, 14 skúšobných poškodení zabitých, testy strážcu '
              'nespoliehajú na presné načasovanie a 12 behov pri plne vyťaženom procesore prešlo; tri testy proti zástupnému '
              'serveru, ktorý kontroluje CSRF a pôvod, bežia len na Node 20 a novšom; v CI sa na Node 18 preskakovali, od vetvy 150 (nález 208) '
              'beží CI na Node 22 a bežia aj tam) a v Chromiu proti '
              'lokálnej kópii s prihlásením platným 90 s: bez strážcu padol test hneď po vypršaní '
              '(test 7 po 113 s), so strážcom prešlo všetkých 10 testov za 3 minúty (súbor s prihlásením mal pri štarte testov najviac 27 s). '
              'Celý beh na Railway a vo WebKite sa tu overiť nedal; zvyšných približne 21 pádov z iných príčin (napr. 189, 190) táto oprava '
              'nerieši.'),
    dict(n=208, vetva='150', pr='#207', zlucene=True,
         text='HOTOVÉ (overené používateľom na Railway 28. 10.): CI (`.github/workflows/deploy.yml`) beží na Node 22 LTS namiesto Node 18, ktorý skončil podporu v apríli 2025 (Node 20 ju '
              'skončil 30. 4. 2026, Node 22 ju má do 30. 4. 2027). `frontend/package.json` má `engines.node` `22.x` (zapísané aj v '
              '`package-lock.json`), takže je verzia Node zafixovaná na jednom mieste (predtým nikde). Railway ju pri builde prečíta: Nixpacks '
              'aj Railpack čítajú `engines.node`; bez nej má Nixpacks predvolene Node 18 a Railpack najnovší LTS, premenná `NIXPACKS_NODE_VERSION` '
              'alebo `RAILPACK_NODE_VERSION` v nastaveniach služby by `engines` prebila. Playwright 1.63 vyžaduje Node 20 alebo novší a `next` 16 '
              '(nález 184) Node 20.9 alebo novší. Tri testy strážcu prihlásenia proti zástupnému serveru v `E2eSessionKeeper.test.ts`, ktoré sa na Node 18 '
              'preskakovali, bežia teraz aj v CI. Overené na Node 22 podľa krokov workflow: čistá inštalácia (`npm ci`) bez varovaní o '
              'nepodporovanej verzii, celý Jest (513 sád, 7 901 testov, žiadny preskočený) a `npm run build` (prešiel aj s kontrolou typov). Po zlúčení (PR #207) používateľ overil, že Railway beží na Node 22. Akú verziu '
              'Node Railway používalo predtým, sa nedalo zistiť (v repozitári nebolo nič zafixované). Úprava workflow pre nálezy 194 a 196 sa '
              'nerobila.'),
    dict(n=190, vetva='151', pr='#208', zlucene=True,
         text='HOTOVÉ: scenár „review: a restored profile-return snapshot follows user scrolling…“ v `search-country-scroll.spec.ts` sa v mobilnom '
              'WebKite preskočí (`test.skip(isMobile, …)` s vysvetlením), lebo Playwright v ňom koliesko myši nepozná („Mouse wheel is not '
              'supported in mobile WebKit“). Skutočný ťah prstom sa v Playwrighte nedá nahradiť rovnako verne a priamy zápis `scrollTop` by '
              'scenár o skutočnom vstupe zmenil na iný. Rovnaký scenár beží ďalej v desktopových projektoch (webkit-desktop, chromium-desktop); '
              'mobilná vetva odchodu cez tlačidlo Späť, ktorá je po preskočení nedosiahnuteľná, sa odstránila. Overené v Chromiu proti lokálnej '
              'kópii: v rozmeroch iPhonu sa test preskočí, v desktope prechádza. Súčasť opravy 210.'),
    dict(n=210, vetva='151', pr='#208', zlucene=True,
         text='HOTOVÉ: oprava 27 zastaraných alebo chybných E2E testov z druhého celého behu na Railway 28. 10. (395 prešlo, 35 padlo, 302 '
              'preskočených; Docker, 2 workery, 29,4 min). Príčiny a opravy: (1) `search-diagnostics.spec.ts` (9 pádov) a '
              '`search-cache-revalidation.spec.ts` (2) čakali správanie spred OW-20 (opakované hľadanie bez HTTP, diagnostika po '
              'znovuotvorení panela), čo je register TEST-17; testy teraz zachytia skutočnú odpoveď na opakovanie a diagnostiku po '
              'znovuotvorení panela nečakajú; (2) `notifications-infinite-scroll.spec.ts` (2) hľadal tlačidlo „Zobraziť ďalšie“ v celej '
              'stránke, no na desktope ho má aj Nástenka pod panelom upozornení, lokátor sa zúžil na zoznam upozornení; (3) '
              '`google-login-completion.spec.ts` (10, len WebKit) podvrhuje odpoveď `/me` cez `context.route`, ktorý podľa Playwrightu '
              'nezaručuje zachytenie požiadaviek vybavených service workerom: spec blokuje worker a Jest poistka '
              '`E2eServiceWorker.guard.test.ts` to vyžaduje aj pri `context.route`; (4) `search-panel-return.spec.ts` (1): rozpočet obnovy '
              'pozície 1,5 s bol tesný (namerané 1 508 a 1 662 ms vo WebKite na desktope), je 3 s a stále je kratší než šesťsekundový časovač '
              'obnovy; (5) `search-country-scroll.spec.ts` (1, nález 190): scenár s kolieskom myši sa v mobilnom WebKite preskočí; (6) '
              '`search-mobile-cards.spec.ts` (2, webkit-mobile): test hľadal náhradný text „Otváracie hodiny“, no v slovenčine sa zobrazí '
              '„Otváracia doba“ (nález 211). Overené v Chromiu (rozmery počítača aj iPhonu) proti lokálnej kópii na '
              'produkčnom builde: zlyhanie sa podarilo reprodukovať pri (1), (2) a (6) a po úprave tieto testy prechádzajú; (3), (4) a (5) '
              'sa v Chromiu reprodukovať nedali (správanie WebKitu a časovanie Railway), preto je tam overené len to, že upravené testy '
              'prechádzajú alebo sa preskočia. Spolu 146 testov dotknutých špecov: 90 prešlo, 56 sa preskočilo (testy pre iný typ '
              'obrazovky, chýbajúce ponuky „Hľadám“ v lokálnej kópii, scenár z nálezu 190), žiadny nepadol; Jest poistka 21/21 a mutačná '
              'kontrola (bez bloku v `google-login-completion.spec.ts` poistka zlyhá). Účinok opráv (3) a (4) vo WebKite potvrdí až ďalší '
              'celý beh na Railway. Neopravené: sedem testov čaká na testovacie údaje na Railway (nález 209) a jeden jednorazový pád '
              '(`search-country-scroll.spec.ts:74`, tmavý variant, ponuky, webkit-mobile: odpoveď hľadania neprišla do 15 s) sa nedal '
              'vysvetliť ani reprodukovať, preto sa neopravuje; ak sa zopakuje, treba ho vyšetriť.'),
    dict(n=217, vetva='153', pr='#210', zlucene=True,
         text='HOTOVÉ (účinok vo WebKite potvrdí až ďalší celý beh na Railway): štyri jednorazové pády záverečných behov E2E 29. 10. 2026 '
              '(tri samostatné behy aj spoločný beh dali 427 prešlo, 2 padli, 303 preskočených; každý pád prešiel pri samostatnom opakovaní): '
              '(1) `search-panel-return.spec.ts:111`, ponuky, webkit-mobile: po ťuknutí na autora ostala adresa `/search` (`toHaveURL` 10 s, '
              '`support/search-panel-return.ts:103`); (2) ten istý špec, ľudia, webkit-desktop: `page.waitForResponse` na '
              '`/api/auth/search/global/` nedostal odpoveď do 15 s (`:71`); (3) `search-to-offer-watches.spec.ts:88`, tmavý variant, '
              'webkit-desktop: po kliknutí na Vyhľadávanie sa nezobrazilo vyhľadávacie pole (`:97`); (4) `search-country-scroll.spec.ts:74`, '
              'tmavý variant, všetko, Chromium: obnovená pozícia sa líšila o 14 px oproti toleranci 2 px (`support/search-country-scroll.ts:106`). '
              'Príčina (4) je nájdená a reprodukovaná: stránka `/search` posiela hľadanie pri prvom načítaní dvakrát, pred a po `/api/auth/me/` '
              '(nález 216), a druhé hľadanie na chvíľu nahradí sekciu „Ľudia“ kostrou vyššou o 14 px. Test zmeral `scrollTop` v tomto medzistave '
              'a Chromium ho po skončení načítania posunul o 14 px späť (scroll anchoring), takže uložená pozícia už nezodpovedala meraniu; '
              'aplikácia obnovuje správne. S pôvodnými pomocníkmi z `origin/main` a oneskorením `/me` a druhého hľadania zlyhalo 9 z 10 kombinácií '
              'rovnakou hláškou (rozmery počítača aj iPhonu), s novými 0 z 10. '
              'Príčina (3): panel s vyhľadávacím poľom sa pripojí až po odpovedi `/api/auth/me/`, no test klikol hneď po zobrazení nadpisu '
              '(`toHaveCount(0)` prešlo len preto, že panel ešte neexistoval). Pri `/me` do 6 s sa panel po skorom kliknutí otvoril, rovnaké '
              'zlyhanie vznikne až pri `/me` pomalšom než 10 s, takže na Railway išlo o pomalý alebo neúspešný `/me`. '
              'Príčiny (1) a (2) sa lokálne reprodukovať nedali (WebKit, Railway). '
              'Oprava (len testy, aplikácia sa nemenila): `e2e/support/search-settled.ts` (`waitForSearchSettled`: čaká na pripojený panel, koniec '
              'oboch hľadaní a nemennú výšku výsledkov) sa volá v `openScrollableResults`, `openReturnFixture` a v teste panela; '
              '`openDeepResultAuthor` navyše overí, že pozícia uložená pri odchode zodpovedá zmeranej (poistka, ktorú mal už `openLastAuthor`). '
              'Asercie a tolerancie sú nezmenené. Pozorovateľ požiadaviek `e2e/support/page-activity.ts` (a čisté pomôcky '
              '`page-activity-format.ts`) pri páde špecov `search-country-scroll`, `search-panel-return` a `search-to-offer-watches` vypíše a '
              'pripojí blok dôkazov bez osobných údajov: požiadavky s časmi a stavmi, čas načítania dokumentu, stav panela, aktívny prvok, počty '
              'chýb; cesty bez slugov, parametre bez hodnôt, žiadne telá odpovedí, texty z konzoly ani texty chýb stránky (z chyby sa vypíše len druh, napr. `TypeError`; zlyhanie siete len ako druh a aktívny prvok len z pevných zoznamov). Pád (1) alebo (2) sa tak pri ďalšom výskyte '
              'vysvetlí sám (uvidí sa, či po ťuknutí vznikla požiadavka na profil a ako dlho trvala, a ako dlho trvalo načítanie stránky). '
              'Overené: celý Jest (514 sád, 7 932 testov, z toho nový `E2ePageActivity.test.ts` s 31 testami), `tsc` a `eslint` čisté; v Chromiu proti lokálnej kópii '
              '(rozmery počítača aj iPhonu) prešlo všetkých 39 testov troch špecov (13 sa preskočilo podľa návrhu); tie isté špecy šesťkrát za sebou pri 4-násobne spomalenom procesore prehliadača: 234 prešlo, 0 padlo, 78 preskočených (20 min). '
              'Poistka súkromia: desať zámerne vnesených chýb v pomôckach (napr. výpis surového textu zlyhania alebo surovej hodnoty atribútu) testy odhalili všetkých desať; '
              'blok dôkazov sa skúšal aj v skutočnom Chromiu na stránke so slugom a e-mailom v adrese a atribútoch, tokenom v ceste a zlyhaniami siete a nič z toho sa nevypísalo. '
              'WebKit a Railway sa tu overiť nedali; to ukáže ďalší celý beh.'),
    dict(n=218, vetva='155', pr='#211', zlucene=True,
         text='HOTOVÉ (účinok na iPhone a na Railway potvrdí manuálny test): po odoslaní fotky v správach ostalo okno na mieste a fotka bola '
              'schovaná pod ním a bolo ju treba nájsť ďalším posúvaním (PC aj mobil; našiel to používateľ manuálnym testom po nasadení vetvy 152, '
              '29. 10. 2026). Príčina: po odoslaní `refresh({ scrollBehavior: \'force_latest\' })` posunie okno na spodok jedenkrát, hneď po '
              'zobrazení nového riadku (`useConversationThreadController.ts`). `<img>` v riadku (`ConversationMessageRow.tsx`) má '
              '`loading="lazy"` a nemá rozmery, takže nemá výšku, kým sa nenačíta; po načítaní obsah vyrastie o jej výšku (najviac 352 px, '
              '`max-h-[22rem]`) pod okno a nič ho už neposunie. Pri otvorení konverzácie to rieši `useInitialBottomPin` (sleduje zmenu výšky '
              'a načítanie obrázkov až 8 s), po odoslaní nič. '
              'Zreprodukované v Chromiu proti lokálnej kópii (produkčný build, odoslanie fotky 1 200 × 1 500 px s oneskorením obrázka 0, 600 '
              'a 1 500 ms, rozmery počítača aj iPhonu): bez opravy 6 z 6 pádov, okno 316 px nad spodkom a z 352 px vysokej fotky schovaných '
              '291 px (PC) a 299 px (iPhone). '
              'Oprava: nový hook `useStickToBottomOnGrowth.ts` sleduje obsah okna správ a ak bolo okno pred zväčšením na spodku (najviac 80 px '
              'nad ním), po zväčšení ho posunie znova na spodok; ak používateľ odišiel vyššie, nehýbe sa. Posúva len pri raste výšky obsahu, nie pri zmenšení '
              'ani pri zmene šírky bez zmeny výšky. Poloha sa zisťuje pri každom posune (aj programovom), nie porovnaním s výškou spred zmeny: '
              'kontrola Codexu (PR #211) upozornila, že pri načítaní starších správ aplikácia vráti čitateľa na jeho miesto a pôvodné porovnanie '
              'by ho mohlo hodiť na spodok. V Jeste sa to s pôvodnou logikou zreprodukovalo (poradie „vrátenie polohy, potom oznam o zmene '
              'rozloženia“), v Chromiu nie (8 pokusov na počítači aj na mobile; poradie závisí od časovania prehliadača), preto je oprava '
              'obranná a pokrytá testom. Zapojený je jedným volaním v '
              '`ConversationMessagesPane.tsx`; `useConversationThreadController.ts` (505 riadkov) a `ConversationDetail.tsx` (556) sa nemenia, '
              'lebo sú nad limitom 500 riadkov (TECH-01…11). Hook nerozlišuje odoslanú a prijatú fotku: platí pre každé zväčšenie obsahu, keď '
              'je okno pri spodku (napr. aj fotka od druhého používateľa alebo štítok „Videné“); to sa v prehliadači neskúšalo. '
              'Overené: 18 nových testov Jest (15 testov hooku a 3 integračné cez `ConversationDetail`: odoslanie fotky, odscrollovanie pred '
              'načítaním fotky a načítanie starších správ), šestnásť zámerne vnesených chýb v hooku a zapojení testy odhalili všetkých šestnásť '
              '(aj návrat k pôvodnej logike a posúvanie pri zmenšení obsahu); celý Jest 516 sád a 7 950 testov, `tsc` a `eslint` čisté. V Chromiu s opravou prešlo 6 z 6 '
              'pri odoslaní fotky (okno na spodku, fotka celá) a 8 z 8 pokusov pri načítaní starších správ, na počítači aj na mobile. '
              'WebKit (iPhone) a Railway sa tu overiť nedali. Playwright test '
              'sa nepridal: odoslanie fotky vytvára správu a súbor na Railway aj S3, čo je presne ten druh testu, ktorý má obsah po sebe '
              'upratať (rozhodnutie majiteľa).'),
    dict(n=220, vetva='154', pr='#214', zlucene=True,
         text='HOTOVÉ (v CI potvrdené po zlúčení PR #214): po povýšení na Django 5.2 by sa backendové testy predĺžili, lebo Django 5.2 '
              'hashuje heslá algoritmom PBKDF2 s 1 000 000 iteráciami (Django 4.2: 600 000) a sada hashuje pri každom vytvorení používateľa. '
              'Zmerané na SQLite: Django 4.2.30 13 min (29. 10.), Django 5.2.18 19 min (29. 10.), Django 5.2.18 s rýchlym hasherom 2 min 7 s '
              '(30. 10.) pri rovnakom výsledku (1 983 prešlo, 10 preskočených). `pytest.ini` používa `swaply.settings`, takže rýchly hasher MD5 '
              'zo súboru `swaply/test_settings.py` nikdy nepomáhal (súbor sa nikde nepoužíva, pozri nález 221). Oprava: nový `backend/conftest.py` '
              'nastaví na celú reláciu testov MD5 pre nové heslá a PBKDF2 nechá na overenie hashov pripravených vopred; produkčné nastavenia sa '
              'nemenia. Fixture je na úrovni relácie, aby pokryla aj používateľov vytváraných v `setUpTestData` (oproti fixture na úrovni testu '
              'je rozdiel v rámci chyby merania: 2 min 7 s a 2 min 11 s). Poistka: `tests/test_password_hasher_in_tests.py` (nové heslo je md5, '
              'PBKDF2 hash sa stále overí); tri zámerné chyby (odstránený `conftest.py`, zoznam bez PBKDF2, PBKDF2 na prvom mieste) ju vždy '
              'zhodili. Konečný strom vetvy: SQLite 1 987 prešlo a 10 preskočených za 2 min 8 s, PostgreSQL 16 '
              '1 995 prešlo a 2 preskočené za 3 min 9 s. Skutočný čas v CI (GitHub, krok „Run backend tests“ na SQLite): 11 min 30 s na '
              'Djangu 4.2.30 (beh po zlúčení PR #213, `main` `9bf1142d`) a 1 min 40 s na Djangu 5.2.18 s rýchlym hasherom (beh po zlúčení '
              'PR #214, `main` `e3ed0f42`); celý job `checks` 15 min 52 s → 5 min 19 s.'),
    dict(n=212, vetva='157', pr='#216', zlucene=True,
         text='HOTOVÉ (zlúčené v PR #216; PostgreSQL 17 v CI potvrdené): CI testovalo backend len na SQLite, no produkcia beží na PostgreSQL 17 '
              '(Railway). Osem testov so zámkami riadkov (`select_for_update`: limit ponúk 1, značky príspevkov 2, blokovanie žiadostí 1, blokovanie '
              'v správach 4) sa na SQLite preskakuje, takže v CI nebežali nikdy. Oprava: do `.github/workflows/deploy.yml` pribudol druhý job '
              '`backend-postgres` so službou `postgres:17` (celá sada `pytest --no-cov` s `DATABASE_URL`, limit 30 min); beží súbežne s jobom '
              '`checks` (ten trvá po zrýchlení 5 min 19 s), takže by sa čas CI nemal predĺžiť. SQLite beh ostáva (pokrýva záložnú cestu bez `DATABASE_URL`). Po zrýchlení testov z nálezu 220 '
              'trvá sada na PostgreSQL lokálne 3 až 4 minúty (3 min 9 s pri vetve 154, 4 min 19 s pri vetve 157, kde súbežne bežal aj celý '
              'Jest). Overené: YAML sa načíta a obsahuje oba joby; presný strom vetvy 157 prešiel lokálne na PostgreSQL 16 '
              '(CI používa 17): 1 995 prešlo a 2 preskočené za 4 min 19 s. GitHub runner a PostgreSQL 17 sa lokálne '
              'overiť nedali; overenie priniesol prvý beh na GitHube: job `backend-postgres` prešiel v PR (2 min 46 s, z toho testy 2 min 9 s) '
              'aj na `main` po zlúčení (3 min 24 s), súbežne s jobom `checks` (v PR 6 min 13 s).'),
    dict(n=222, vetva='e2e/profilove-adresy', pr='#215', zlucene=True,
         text='HOTOVÉ (zlúčené v PR #215; overené Codexom na Railway): číselná adresa vlastného profilu `/dashboard/users/<id>/language` stratila '
              'jazykovú podstránku a skončila na základnom profile bez jazykovej hlavičky (hlásenie Codexa z 30. 10. 2026, `main` `e3ed0f42`, '
              'webkit-mobile, svetlý aj tmavý režim, 6 z 6 pokusov, špec `profile-numeric-language.spec.ts`). Príčina v '
              '`useDashboardUserProfile.tsx`: (1) počiatočná pravá položka (jazyk, účet, súkromie, úprava) sa otvárala len pri zhode slugu v adrese, '
              'takže pri číselnom ID sa nikdy neotvorila; (2) kanonizácia ID → slug prepísala adresu na holý profil a podstránku zahodila (rovnako '
              '`/account`, `/privacy` a `/edit`). Oprava: nový súbor `ownProfileAddress.ts` (`isOwnProfileIdentifier` pozná vlastný profil podľa slugu '
              'aj číselného ID, `canonicalOwnProfilePath` ponechá podstránku pri výmene ID za slug, ale len pri identifikátore, ktorý patrí tomuto '
              'používateľovi); v hooku sa menia štyri miesta (súbor má 491 riadkov, pod limitom 500). Kód je na Codexovej vetve '
              '`e2e/profilove-adresy` na pokyn majiteľa (AGENTS.md inak zakazuje zápis do vetvy druhého agenta). Overené: 23 nových testov Jest '
              '(8 cez hook, 15 na pomocníka; na pôvodnom hooku z `main` 5 z 8 testov hooku padá), deväť zámerne vnesených chýb všetky zachytené, '
              f'`tsc` a `eslint` čisté, celý Jest na čistej kópii vetvy 518 sád a 7 973 testov prešlo; '
              f'v Chromiu s rozmermi iPhonu proti lokálnej kópii špec Codexa pred opravou zlyhal v oboch režimoch (rovnaký obraz ako v hlásení: '
              f'adresa na základnom profile, bez jazykovej hlavičky), po oprave prešli oba testy (2 z 2, vrátane F5). '
              'Do tej istej vetvy pribudol pred zlúčením ešte commit `de91273f`: pomocník porovnáva číselné ID ako číslo, takže prejde aj adresa '
              's úvodnými nulami (`/dashboard/users/007/language`), a testy pribudli pre vlastné ID `007` a `0007` a cudzie `099` a `00099`. '
              'Testy hooku a pomocníka (4 súbory, 65 testov) prechádzajú aj na stave `main` `bd9131e6`. '
              'Moje lokálne overenie nemalo WebKit ani Railway; Codex ich doplnil v celom behu 30. 10. na reálnom WebKite proti Railway '
              '(`main` `e2612438`): oba mobilné varianty `profile-numeric-language.spec.ts` (svetlý aj tmavý) vrátane F5 a oba varianty '
              'profilového návratu (app Back aj browser Back) prešli; varianty s úvodnými nulami, s query a fragmentom ani voliteľné '
              '`/account`, `/privacy` a `/edit` s číselným ID sa v reálnom prehliadači osobitne neskúšali. Súvisiace, nehlásené a preto nezmenené: pri starom slugu v adrese '
              '(`/dashboard/users/<starý-slug>/language`) kanonizácia podstránku stále zahodí.'),
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
            'Django 4.2.30, odstránenie allauth) je hotový a zlúčený (vetva 143, PR #203), frontend (`npm audit fix`, odstránený `next-intl`) je '
            'zlúčený (vetva 142). Zvyšok 184 (`next` 14 → 16) je vo vlne 1; Django 5.2 je zlúčený (vetva 154, PR #214), protobuf opravený '
            '(vetva 158) a zo 183 ostáva len vývojový `pytest` (skupina po nasadení)',
         preco='Malé a bezpečné. Zraniteľné verzie zmiznú skôr, než pribudne ďalší kód.',
         polozky=['183', '184']),
    dict(vlna='1 – základ, kým sa aplikácia dokončuje',
         co='Veľký skok verzií z 184 (Next 16 s Reactom 19; Django 5.2 LTS s DRF 3.18.3 je hotový vo vetve 154 a `google-cloud-vision` '
            's protobuf vo vetve 158), 179 (2FA), 9, 33, 52, 185, 214, OW-07 a balík „Spoľahlivosť CI a testov“ (31, TEST-…, 189, 209, 223, 225; '
            '212 je hotová vo vetve 157)',
         preco='Veľké skoky verzií sú najlacnejšie teraz, kým je kódu najmenej, a hneď po nich treba spustiť celé testy.',
         polozky=['184', '179', '9', '33', '52', '185', '214', 'OW-07', '31', '189', '209', '223', '225']),
    dict(vlna='2 – viditeľné chyby a overenia (iPhone a mobil)',
         co='Navigácia a Späť (13, 14, 174), Profil a identita (81, 119), Zdieľanie (91, 92, 207), Upozornenia na zmazaný obsah (74), Žiadosti (17), '
            'Vyhľadávanie a Sledovania (OW-11, OW-14, OW-17, OW-05), živé overenie N16 a RET-01..03',
         preco='To uvidí každý nový používateľ hneď prvý deň. Overenia (N16, RET-01..03) sa dajú robiť už teraz na Railway a na iPhone.',
         polozky=['13', '14', '174', '81', '119', '91', '92', '207', '74', '17', 'OW-11', 'OW-14', 'OW-17', 'OW-05', 'N16', 'RET-01', 'RET-02', 'RET-03']),
    dict(vlna='3 – texty a súkromie',
         co='120, 175, 176, 177, 204, APP-03, 186 (a podľa R2 poradie jazykov)',
         preco='Závisí od toho, ktoré jazyky budú pri štarte (R2).',
         polozky=['120', '175', '176', '177', '204', 'APP-03', '186']),
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
