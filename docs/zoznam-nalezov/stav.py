# -*- coding: utf-8 -*-
"""Stav zoznamu: dátum, položky opravené po prvom vydaní, tabuľka PR, rozhodnutia a denník zmien.

Tento súbor sa upravuje pri každej zmene stavu (nový nález, oprava, odpoveď na rozhodnutie); postup je v `README.md`.
"""

# Hlavička dokumentu: kedy sa naposledy menil a z akého stavu `main` sa vychádzalo.
STAV = dict(
    datum='1. 11. 2026',
    kod='`main` `583b94c0` (po PR #220)',
    register='21. 10. 2026 + PR #193',
)

# Denník zmien dokumentu, najnovšie hore: (dátum, čo sa zmenilo).
ZMENY = [
    ('1. 11. 2026',
     'Vetva 161 (čaká na zlúčenie): balík „Produkčná odolnosť aplikácie“ – nálezy 179, 234, 33, 9 a 52 sú hotové. (1) 179 a 234: 2FA pri '
     'prihlásení prijíma kód z predošlého a nasledujúceho okna (`TOTP_VALID_WINDOW = 1`, ±30 s) a zlý kód dostane hlášku „Neplatný 2FA kód.“ '
     'namiesto všeobecnej chyby (nový súbor `test_login_2fa.py`, 16 testov). (2) 33: `global-error.tsx` hlási chybu koreňového layoutu do '
     'Sentry a ukáže jednoduchú stránku vo všetkých šiestich jazykoch; samostatný commit dá `ErrorBoundary` hlásiť chyby vykresľovania do '
     'Sentry. (3) 9: nepotvrdil sa, neprihlásený WebSocket sa odmietne za milisekundy; kód sa nemenil, pribudli tri strážne testy. '
     '(4) 52: service worker hľadá novú verziu hneď po registrácii a text v konzole už nehovorí, že čaká na obnovenie (`sw.js` sa '
     'nemenil; prínos je hlavne na iPhone a lokálne sa tam neskúšal). Nové nálezy: 235 (2FA je nedokončená funkcia; rozhodnutie R12) a '
     '236 (neznáma cesta pod `/ws/` skončí chybou 500 a výpisom v logu). Overené: celá backendová sada na SQLite 2 012 prešlo a 10 preskočených; celý '
     'Jest na React 19 522 sád a 8 097 testov prešlo. Nález 231 je zlúčený (PR #220) a nasadený na produkciu. Overenie vetvy 160 po nasadení (Codex, `main` `583b94c0`): oprava nálezu 231 '
     'prešla (rovnaký nezmenený test 6 z 6 vo všetkých troch projektoch, celý špec recenzií 19 prešlo, 0 zlyhalo, 8 preskočených), vetva 160 je '
     'uzavretá. Nový celý beh dal 418 prešlo, 13 zlyhalo, 307 preskočených (prijatý stav 427, 2, 303 sa nemení; prvý pokus zasiahol vyčerpaný '
     'limit Railway a nezapočítava sa); zlyhania sú vzor príprava/sieť a 37 z 39 diagnostických vykonaní prešlo, preto 223 ostáva otvorený. Nález '
     '232 má príčinu potvrdenú logom Railway (súbeh vytvorenia zdieľania a zmazania jeho zdroja, porušenie cudzieho kľúča), presunul sa do '
     'balíka Produkčná odolnosť aplikácie a oprava pôjde ako samostatná vetva po 161. PR #221: CodeRabbit označil dva nálezy; zlyhanie Sentry '
     'v `global-error` je opravené v tejto vetve, opakované použitie TOTP kódu je zapísané v nálezu 235 a čaká na rozhodnutie majiteľa (R12). '
     'Zlúčené: vetva 160 (PR #220), `main` `583b94c0`.'),
    ('1. 11. 2026',
     'Vetva 160 (čaká na zlúčenie): nález 231 – regresia po povýšení na Next 16 a React 19, ktorú zachytil Codex v celom behu Playwrightu '
     'po nasadení (`main` `9e311839`): po F5 na recenziách šípka vrátila profil od vrchu namiesto pôvodného miesta (8 z 8 pokusov na '
     'desktope). Príčina a oprava sú pri nálezu 231 (obnova pozície po zápise nekončí, ale ju stráži do vypršania času alebo do vstupu '
     'používateľa; zmena je len v `profileScrollMemory.ts` a jeho testoch). Nové nálezy: 232 (HTTP 500 pri upratovaní zdieľania z '
     'Nástenky, príčina nepreukázaná, čaká na záznam z Railway) a 233 (E2E nemá scenár pre fotku v správach, emoji, reset hesla a '
     'verejné stránky). Doplnené nálezy 223 (celý beh po nasadení: 17 z 21 pádov prešlo pri opakovaní), 224 (majiteľ: platí len na '
     'mobile, na desktope nie) a 225 (oba jazykové scenáre v celom behu prešli). Nález 184 je zlúčený (PR #218) a nasadený na '
     'produkciu; majiteľ po nasadení otestoval manuálne kroky 1 až 6 bez nového nálezu. Zlúčené: vetva 159 (PR #218) a E2E vetva '
     '`e2e/izolovane-sondy` (PR #219), `main` `9e311839`.'),
    ('31. 10. 2026',
     'Vetva 159 (PR #218, čaká na zlúčenie): nález 184b – frontend sa povyšuje z Next 14.2.35 a Reactu 18.3.1 na Next 16.4.3 a '
     'React 19.3.1 (rozhodnutie R9, odpoveď majiteľa 31. 10. 2026). Commity: (1) deväť testov upravených tak, aby fungovali na '
     'starej aj novej verzii, (2) závislosti a konfigurácia (`package.json` a lockfile, skripty `build` a `dev` s `--webpack`, '
     '`lint` ako `eslint .`, `eslint.config.mjs`, `tsconfig.json`, `images.qualities`), (3) `await params` v 12 stránkach, typové '
     'opravy v 13 súboroch a dva testy stránok, (4) dokumentácia, (5) po nálezoch Codexa a CodeRabbitu na PR #218 sa päť testov (z '
     'toho dva nad 500 riadkov, ktoré sa podľa AGENTS.md nemenia) vrátilo na verziu z `main` a ich úpravy prešli do '
     '`jest.config.js` (`fakeTimers.doNotFake` a mapovanie `react-dom/server` na Node build), (6) dokumentácia: rozsah auditu v 194 '
     '(CodeRabbit), doplnky 223 a 225 podľa izolovaných pokusov Codexa a rozdelenie `stav.py` (538 riadkov) na `stav.py` a '
     '`hotove.py`. `npm audit --omit=dev` 7 → 5 (zmizla kritická zraniteľnosť `next` aj vysoká `postcss`). Nová minimálna podpora '
     'prehliadačov: Safari 16.4 (Next 14 mal Safari 12). Nález 184 je hotový (čaká na zlúčenie). Nové nálezy: 226 (mŕtvy '
     '`frontend/middleware.ts`), 227 (lint: vypnuté nové pravidlá, ESLint 9), 228 (testy `useGoogleLogin` nezachytia vynechané '
     '`clearTimeout(delayTimer)`), 229 (5 stredných zraniteľností v build nástroji Sentry), 230 (prechod na Turbopack). Doplnené: '
     '183 (test majiteľa po nasadení vetvy 158 prešiel: obyčajná fotka prešla, nevhodná sa nepridala, obe so správnym hlásením) a '
     '194 (zostávajúce výnimky a rozsah auditu: `pytest` je len v `requirements-test.txt`), 223 (sonda Codexa na 10 minút: 122 z '
     '122 odpovedí HTTP 200, nález ostáva otvorený) a 225 (v izolovanom pokuse spôsobuje chýbajúci click `preventDefault()` na '
     '`pointerdown`, nie `tabindex`; Codex zmenil jeden krok špecu na `click()`). Zlúčené: vetva 158 (PR #217), `main` `0905aedd`.'),
    ('31. 10. 2026',
     'Vetva 158 (zlúčená v PR #217): časť 183c nálezu 183 – `google-cloud-vision` 3.4.5 → 3.16.0 (vyžaduje protobuf od 6.33.5, dnes 7.36.2), čím '
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
            'Next 16 s Reactom 19 vo vetve 159) a balík „Produkčná odolnosť aplikácie“ (179, 234, 33, 9, 52 vo vetve 161); ďalej 185, 214, '
            '232, 236, OW-07 a balík „Spoľahlivosť CI a testov“ (31, TEST-…, 189, 209, 223, 225, 228; 212 je hotová vo vetve 157)',
         preco='Veľké skoky verzií sú najlacnejšie teraz, kým je kódu najmenej, a hneď po nich treba spustiť celé testy.',
         polozky=['185', '214', '232', '236', 'OW-07', '31', '189', '209', '223', '225', '228']),
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
