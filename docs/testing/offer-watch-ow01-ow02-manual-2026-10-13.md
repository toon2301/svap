# Sledovanie – spoločné manuálne testy OW-01 a OW-02

Dátum: 13. 10. 2026. Rozsah: nulové cenové hranice a umiestnenie chyby
ďalšej stránky pod už načítanými výsledkami. Avatar do testovania nepatrí.

Tento checklist nie je výsledok testovania. Spúšťať ho až po čistej Rabbit
kontrole a nasadení tejto vetvy vrátane backendovej migrácie 0123.
Zber Playwright testov ani lokálna coverage nenahrádzajú tento živý retest.

## Príprava a ochrana dát

1. Over, že beží opravený frontend AJ backend. Na zamýšľanom nasadení musí byť
   aplikovaná `accounts.0123_normalize_offer_watch_zero_prices`.
   Pri kontrole zo správneho backendového prostredia stačí čítací príkaz
   `python manage.py showmigrations accounts`; pri 0123 má byť `[X]`.
2. Ak migrácia ohlási normalizované duplicity, STOP. Nezlučovať ani nemažať ich
   automaticky. Najprv poslať presnú chybu a rozhodnúť o konkrétnych položkách.
   Produkčné duplicity úmyselne nevytvárať iba kvôli testu migrácie.
3. Použi vyhradený testovací účet. Pred úpravou si zapíš jeho aktuálne sledovania.
   Na vytváranie potrebuješ voľný slot; pri 5/5 nemaž cudzie alebo potrebné sledovanie.
4. Nové sledovanie pre OW-01 označ v svojich poznámkach jeho ID/podkategóriou.
   Edituj a uprac iba túto vlastnú testovaciu položku, nie všetky podobné názvy.
5. Pre OW-02 použi existujúce vlastné sledovanie s aspoň 11 viditeľnými zhodami,
   ideálne viac než 20. Poznač si prvých 10 kariet a prípadne ich ID v Network.
   Bez takých dát je test stránkovania SKIP, nie PASS. Nevyrábaj hromadne nové účty.
6. Na iPhone po nasadení úplne zavri a znova otvor PWA. Safari aj PWA musia mať
   aktuálnu verziu; starý otvorený formulár nepovažuj za retest nasadenej opravy.
7. Pri každom teste zapisuj zariadenie, prehliadač, režim, jazyk a výsledok.
   PASS = celé očakávanie overené; FAIL = reprodukovaná odchýlka;
   SKIP = chýbajú dáta/prostredie; N/A = tok na danom zariadení neexistuje.

## Kde čo testovať

| Časť | Desktop | iPhone Safari | Nainštalovaná iOS PWA |
| --- | --- | --- | --- |
| OW-01: vytvorenie a úprava cien | Áno | Áno | Áno |
| OW-02: výsledky a stránkovanie | Áno | N/A: mobilné výsledky ešte nie sú implementované | N/A: rovnaký mobilný stav |
| Mobilné oznámenie a vstup do správy | N/A | Áno | Áno, priamou adresou ak chýba navigačný vstup |
| M13, M14, M33: systémová lišta klávesnice | N/A | Povinne | Povinne |
| Regresia šírky, výberov a návratov formulára | Primerane desktopu | Áno | Áno |

Jadro Z01–Z10 vykonaj pre **Vytvoriť aj Upraviť** na desktope, Safari a PWA,
v svetlom aj tmavom režime. Ostatné cenové/regresné scenáre aspoň raz v každom
reálnom rozložení; pri rozdiele medzi Safari/PWA zopakovať v oboch.
P01–P14 sú desktopové; chybu P02/P03 a refresh P06 prever aj v tmavom režime.

## OW-01 – cenové hranice (desktop AJ mobil)

Spoločný postup: Nastavenia → Sledovanie. Vyber platnú podkategóriu, typ karty,
krajinu a prípadne okres. Na mobile najprv Vytvoriť sledovanie; pri úprave použi
ikonu ceruzky vlastnej testovacej položky. Po uložení ju znovu otvor.

### Z01 – obe hranice nula

- Do Cena od napíš `0`, do Cena do `0`, opusti pole.
- Obe polia sa vyprázdnia. Mena je prázdna a neaktívna.
- Uložiť funguje; položka má Bez cenového obmedzenia, nie rozsah 0–0.
- Po reloade a opätovnej editácii zostanú obe polia prázdne.
- Voliteľne v Network over odpoveď: `price_min: null`, `price_max: null`,
  `price_currency: ""`. Nezverejňuj celú odpoveď s používateľskými údajmi.

### Z02 – nula / kladná horná hranica

- Nastav `0` / `100` a opusti polia.
- Cena od je prázdna, Cena do ostane 100, mena je aktívna a správna.
- Uloží sa len horný limit 100. Po reloade nevznikne dolná hranica 0.

### Z03 – kladná dolná hranica / nula

- Nastav `100` / `0` a opusti polia.
- Cena do je prázdna, Cena od ostane 100. Žiadna chyba opačného poradia.
- Uloží sa len dolný limit 100, mena zostáva vyplnená.

### Z04 – jednostranná nula bez druhej hranice

- Samostatne over prázdne/`0`, `0`/prázdne aj prázdne/prázdne.
- Všetky tri kombinácie znamenajú Bez cenového obmedzenia; mena nie je povinná.

### Z05 – alternatívny zápis nuly

- Postupne otestuj `00`, `0.0`, `0.00`, `0,00` na oboch hraniciach.
- Po opustení príslušného poľa alebo uložení majú rovnaký význam ako `0`.
- Nie je vytvorená odlišná položka len kvôli formátu zápisu.

### Z06 – desatinné ceny sa NESMÚ vymazať

- Píš pomaly znak po znaku `0,50`, potom `0.50`, potom `0,01`/`0.01`.
- Prvá rozpracovaná nula počas písania nezmizne. Výsledná kladná suma ostane.
- Po opustení a uložení ostane 0,50 alebo 0,01 a aktívna mena.
- Zopakuj aj v Cena do. Nezamieňaj 0,01 s nulovým filtrom.

### Z07 – ručne zvolená mena pri prepisovaní ceny

- Nastav kladnú cenu, ručne zvoľ inú menu než predvolenú (napr. Kč pri SK).
- Označ celú kladnú cenu a postupne ju prepíš na `0,50`, bez kliknutia mimo poľa.
- Mena sa počas prechodného znaku `0` neprepíše ani nevymaže.
- Po uložení ostane suma 0,50 aj ručne zvolená mena.

### Z08 – vyčistenie poslednej skutočnej hranice

- Nastav jediný kladný limit, potom ho zmeň na `0` a opusti pole.
- Mena sa vymaže a deaktivuje. Uložené sledovanie je bez ceny.
- Zopakuj s druhým kladným limitom: po vynulovaní iba jednej strany sa mena
  NESMIE vyčistiť, pretože druhá strana zostáva aktívna.

### Z09 – uloženie bez predchádzajúceho blur

- Na desktope zadaj nulové hodnoty a odošli formulár Enterom, ak ho dané pole umožní.
- Na mobile použi priamo Uložiť, aj keď bol naposledy aktívny cenový input.
- Výsledok je normalizovaný rovnako; nevznikne doslovný limit 0 ani chybná mena.

### Z10 – úspešný save a opätovné otvorenie

- Po platnom vytvorení aj úprave je iba jeden úspešný toast.
- Tlačidlo nezostane v loadingu; uložená položka sa zobrazí so správnymi hranicami.
- Reload zachová údaje. Po uložení nevzniknú dva rovnaké záznamy.

### Z11 – validačné chyby sa neskrývajú normalizáciou

- Skús `-1`, `abc`, `1.234`, `1,234` a sumu s viac než 8 číslicami pred oddeľovačom.
- Ak input odmietne znak už pri písaní, over, že ho nevie uložiť ani vložením textu.
- Inak po Uložiť dostaneš zrozumiteľnú chybu. Formulár zostáva použiteľný.
- Neplatný text sa NESMIE potichu premeniť na prázdny cenový filter.
- Oprav cenu na platnú a ulož bez reloadu aplikácie.

### Z12 – poradie kladných hraníc

- `100` / `10` je chyba poradia; `10` / `100` a `10` / `10` sú platné.
- Oprava chyby nezmaže podkategóriu, krajinu, okres ani inú správnu hodnotu.
- `100` / `0` naopak zostáva platné podľa Z03.

### Z13 – duplicita sa nulou neobíde

- Maj vlastnú testovaciu položku bez cenového limitu.
- Pokús sa vytvoriť druhú s rovnakou podkategóriou, typom, krajinou a okresom,
  ale s `0` / `0`. Aplikácia ju odmietne ako duplicitu, prvá zostane zachovaná.
- Rovnaký princíp over pre prázdne/100 proti 0/100, ak máš voľný testovací slot.
- Dostaneš zrozumiteľnú hlášku; formulár sa nezasekne a nevznikne druhý záznam.

### Z14 – zrušenie alebo návrat nič nezapíše

- Otvor testovaciu položku s kladnou cenou, prepíš ju na nulu, daj Zrušiť.
- Znovu otvor: pôvodná cena aj mena zostali. Zopakuj mobilnou šípkou Späť.
- Ak sa zobrazí potvrdenie opustenia, potvrď zrušenie zmien; žiadny PATCH ani
  úspešný toast uloženia nemá vzniknúť iba zrušením editácie.

### Z15 – nulový sémantický no-op

- Otvor vlastné sledovanie, ktoré už je bez ceny; zapíš nuly a ulož.
- Ostáva ten istý záznam, nie nový. Ak vieš pozrieť Network/API,
  porovnaj `updated_at` pred/po: pri inak nezmenenom filtri ostane rovnaký.
- Nesmú vzniknúť spätné upozornenia len z normalizácie už prázdnej ceny.

### Z16 – samotné ceny kariet sa nemenia

- Na existujúcej viditeľnej karte zdarma ostáva cena 0/zdarma.
- Karta bez ceny ostáva bez ceny; Dohodou ostáva Dohodou.
- Toto sú tri odlišné stavy kariet. OW-01 normalizuje iba filtre sledovania.

### Z17 – význam pri párovaní (výsledky sleduj na desktope)

- Na opakovane použiteľných testovacích kartách rovnakej podkategórie/lokality
  porovnaj sledovanie bez ceny a sledovanie s kladnou hranicou.
- Bez ceny zahŕňa dostupné karty zdarma, bez ceny, dohodou aj s kladnou cenou.
- Pri kladnom filtri sa uplatní mena a hranica; neznáma cena a Dohodou sa nezaradia.
- Horný limit 100 zahŕňa cenu 0 iba pri rovnakej mene a splnených ostatných podmienkach.
- Skryté, vlastné a medzi používateľmi blokované karty sa nezačnú zobrazovať.
- Nevytváraj pre tento krok hromadne nové karty; bez vhodnej fixture zapíš SKIP.

### Z18 – mena, krajina a limit sledovaní

- Bez kladnej ceny je Mena neaktívna; s kladnou cenou ide otvoriť.
- Existujúce možnosti sú €, Kč, $, zł, Ft; mobilný picker sa vysunie hore.
- Over predvolené meny SK/CZ/PL/HU a zachovanie ručnej meny pri editácii.
- Zmena krajiny naďalej vyčistí neplatný pôvodný okres, nie jazyk aplikácie.
- Pri 5/5 sa nedá uložiť šiesta položka; nuly tento limit neobídu.

## OW-02 – chyba stránkovania (IBA desktop)

### Bezpečná simulácia siete v Chrome/Edge

1. Otvor výsledky Sledovaní a vyber pripravené sledovanie. Otvor F12 → Network.
2. V menu DevTools → More tools → Network request blocking zapni blokovanie.
3. Pre **ďalšiu stránku** pridaj iba vzor:
   `*/api/auth/offer-watches/ID/matches/?cursor=*` (ID nahraď vlastným sledovaním).
4. Pre **prvú stránku/Obnoviť** blokuj presnú adresu bez kurzora:
   `*/api/auth/offer-watches/ID/matches/` bez hviezdičky za posledným `/`.
   Ak DevTools podporuje len širší vzor, blokuj túto jednu matches cestu počas
   refresh testu a kontroluj v Network, že požiadavka nemá cursor.
5. Nikdy neblokuj `/api/*`, login, refresh token, `/me` ani celý zoznam sledovaní.
   To by testovalo iný tok, nie OW-02. Over `blocked:devtools` na správnej požiadavke.
6. Po každom scenári vzor vypni; na konci vypni celé request blocking.
   Alternatíva pre ďalšiu stránku: po načítaní kariet krátko odpoj sieť, pred retry
   ju obnov. Pri odhlásení kvôli inej chybe siete test označ za neplatnú simuláciu.

### P01 – bežné prvé načítanie

- Prvých najviac 10 kariet, najnovšie prvé. Bez error bloku.
- Ak existuje ďalšia stránka, Zobraziť ďalšie je pod gridom.
- Poznač si poradie a počet; žiadne dve rovnaké ID.

### P02 – ďalšia stránka zlyhá

- Zapni blokovanie IBA kurzorovej matches požiadavky; klikni Zobraziť ďalšie.
- Všetky už načítané karty zostanú, v rovnakom poradí.
- Chyba a jedno Skúsiť znova sú POD POSLEDNÝM riadkom kariet, nie nad gridom.
- Obyčajné Zobraziť ďalšie sa pri chybe nezobrazuje druhýkrát.
- Žiadny reset na prázdny zoznam ani preskočenie na prvú stránku.

### P03 – opakované zlyhanie

- Nechaj rovnaké blokovanie zapnuté, klikni Skúsiť znova ešte dvakrát.
- Po každom zlyhaní je iba jedna chyba a jedno retry pod kartami.
- Karty sa nemenia, tlačidlo po chybe znovu funguje; netreba reload.
- V Network sa opakuje rovnaký parameter `cursor`, nie požiadavka bez kurzora.

### P04 – úspešný retry

- Vypni blokovanie; klikni Skúsiť znova (raz aj klávesnicou Tab → Enter).
- Chyba zmizne a pribudnú ďalšie výsledky ZA zachované karty, bez duplicít.
- Ak server má ďalší kurzor, vráti sa Zobraziť ďalšie; inak tlačidlo zmizne.
- Neobnovuje sa celý výsledkový zoznam namiesto opravy danej stránky.

### P05 – chyba tretej stránky alebo neskoršej dávky

- Úspešne načítaj aspoň 20 kariet, potom blokuj nasledujúci kurzor.
- Upozornenie musí byť za všetkými 20 kartami, nie medzi prvou a druhou dávkou.
- Retry zachová obe už načítané dávky. Bez dát pre tretiu stránku zapíš SKIP.

### P06 – zlyhá Obnoviť s už načítanými kartami

- Maj načítané karty, blokuj matches požiadavku BEZ kurzora, klikni Obnoviť.
- Staré karty zostanú. Táto chyba zámerne zostáva NAD kartami.
- Skúsiť znova opakuje prvú stránku BEZ cursor. Nie zlyhanú ďalšiu stránku.
- Po odblokovaní sa karty nahradia aktuálnou prvou stránkou a chyba zmizne.

### P07 – zlyhá úplne prvá stránka

- Priprav blokovanie bez kurzora a znovu otvor výsledky konkrétneho sledovania.
- Pod hlavičkou je červená chyba s retry, bez kariet a bez Zatiaľ žiadne zhody.
- Po odblokovaní a retry sa prvá stránka načíta; chyba zmizne.
- Nezamieňaj tento blok s chybou načítania ZOZNAMU uložených sledovaní.

### P08 – pomalá sieť a viac klikov

- Použi Network → Slow 3G iba na tento test, nie Offline.
- Pri načítaní ďalšej stránky je Načítavam ďalšie… neaktívne; Obnoviť tiež.
- Dvojklik ani opakované Enter nevytvoria paralelné rovnaké kurzorové GET.
- Po úspechu alebo chybe sa ovládanie znovu sprístupní. Potom vráť No throttling.

### P09 – prepnutie sledovania počas načítania

- Na pomalej sieti spusti ďalšiu stránku A a zvoľ sledovanie B.
- Dobiehajúci úspech/chyba A nepridá karty ani error do B.
- URL aj aktívny výber patria B, výsledky nie sú pomiešané. Vráť normálnu sieť.

### P10 – posledná stránka

- Bez blokovania prechádzaj vlastnou fixture po dávkach až na koniec.
- Po poslednej odpovedi bez ďalšieho kurzora už Zobraziť ďalšie nie je viditeľné.
- Posledná dávka môže mať menej ako 10 kariet; nevzniknú duplicitné ID.

### P11 – žiadne zhody a žiadne sledovania

- Platné sledovanie bez zhôd má existujúci empty-state, nie error/retry.
- Účet bez sledovaní má ponuku Spravovať sledovania, nie prázdny nefunkčný panel.
- Použi len existujúci vhodný testovací účet/položku; nemaž všetky sledovania na skúšku.

### P12 – odchod a návrat

- Vyvolaj chybu stránky, odíď do inej sekcie a vráť sa.
- Obsah, zvolené sledovanie a adresa si zodpovedajú; dobehnutá stará požiadavka
  nezobrazí chybu v nesúvisiacej sekcii.

### P13 – svetlý/tmavý režim, šírka a fokus

- Zopakuj P02, P04 a P06 v oboch režimoch.
- Error pod gridom má čitateľné písmo, správne okraje a odstup, neprekrýva poslednú kartu.
- Tab dosiahne Retry; vidno fialový fokus. Enter vykoná rovnakú akciu ako klik.
- Na desktope pri rôznych počtoch stĺpcov nie je alert vedľa alebo uprostred kariet.

### P14 – preklady

- V SK, CS, EN, DE, PL, HU over aspoň chybu výsledkov, Retry, Obnoviť a loading.
- Bez surových translation keys, zmiešaného jazyka a rozbitého tlačidla pri dlhšom texte.
- Starý nález poľského Like je OW-04; týmto krokom ešte nebol opravený.

## Mobilná regresia a POVINNÉ staré odložené testy

### M01 – mobilná výsledková adresa

- V Safari a PWA otvor `/dashboard/watches`.
- Má byť viditeľné oznámenie, že mobilné výsledky sa pripravujú, a funkčné
  Spravovať sledovania. Nie prázdna desktopová plocha.
- Tlačidlo vedie do mobilnej správy sledovaní. Návrat over po jednom kroku.
- Nevyžaduj tu desktopové stránkovanie; mobilné výsledky/vstup zostávajú ďalšou fázou.

### M02 – výbery a rozpracované údaje

- Pri vytváraní aj editácii nastav ceny a otvor Podkategóriu, Krajinu a Okres.
- Každý výber má vlastnú obrazovku. Späť bez výberu hodnotu nemení, výber automaticky
  vráti do formulára. Ceny a mena sa samovoľne nestratia.

### M03 – klávesnica a dostupnosť polí

- Pri Cena od aj Cena do je vhodná numerická klávesnica.
- Aktívne pole je viditeľné; formulár sa dá vertikálne posúvať a tlačidlá sú dostupné.
- Pri mene sa klávesnica neotvára; picker aj jeho šípka smerujú hore.

### M04 – úzky displej / stará M32 (neskôr R05)

- Over vytvorenie aj editáciu, light/dark, vrátane šírky približne 320 px v emulácii.
- Obsah ani Uložiť nepretečú doprava. Celý formulár sa nedá horizontálne odsunúť.
- Reálny iPhone over zvlášť; úspešná emulácia nenahrádza fyzickú PWA.
- Toto je povinná regresia už opravenej chyby, nie opätovne potvrdený nový nález.

### M05 – pôvodná M13: neželaný text pri Cena od

- Na fyzickom iPhone otvor editáciu, klikni Cena od, nič nepíš a potom napíš cenu.
- Kontroluj pás NAD systémovou lištou so šípkami hore/dole a fajkou.
- Nesmie tam byť zapamätaný obsah iného poľa, napr. „Sociálne siete…“.
- Systémové šípky/fajku iOS samy o sebe neoznačuj za chybu aplikácie.

### M06 – pôvodné M14 + M33: Cena do a Safari vs PWA

- Zopakuj M05 pre Cena do.
- Pre obe cenové polia porovnaj Safari a nainštalovanú PWA, light/dark a Create/Edit.
- Výsledok zapisuj osobitne: M13, M14, M33. Minule boli odložené, NIE PASS.
- Ak sa jav objaví, zachyť fotku s poľom, režimom, verziou iOS a informáciou
  Safari/PWA. Neposielaj citlivé ceny/texty iných účtov.

## Playwright proti nasadenej Railway aplikácii

Použi existujúci Docker pomocník; WebKit na Windows môže blokovať ochrana systému.
Ochranu nevypínaj. V ignorovanom `frontend/.env.e2e` sú údaje vyhradeného účtu.
Voliteľné `E2E_OFFER_WATCH_RESULTS_ID` musí patriť tomuto účtu a mať aspoň 11 zhôd.
Bez ID test skúsi jeho existujúce uložené sledovania; nič nevytvára.

Z priečinka frontend, po nasadení:

```powershell
npm run test:e2e:docker -- e2e/offer-watch-pagination-errors.spec.ts --project=webkit-desktop --project=webkit-mobile --project=chromium-desktop --workers=1 --retries=0
```

Pre OW-01 je nutný voľný slot a výslovný zápisový opt-in v `.env.e2e`:

```dotenv
E2E_OFFER_WATCH_WRITES=1
```

```powershell
npm run test:e2e:docker -- e2e/offer-watch-zero-prices.spec.ts --project=webkit-desktop --project=webkit-mobile --project=chromium-desktop --workers=1 --retries=0
```

Po behu odstráň prepínač zápisov alebo nastav `0`. Docker neprenáša ľubovoľné
hostiteľské premenné automaticky; konfigurácia načíta `.env.e2e` v pripojenom priečinku.
Test nulových cien vytvorí iba vlastný nový záznam, jeho ID zachytí po HTTP 201
a uprace v `finally`; needituje existujúce sledovania. Pri chybe cleanupu treba
opatrne dočistiť konkrétne vytvorené ID, nie hromadne podobné názvy.

OW-02 používa reálnu aplikáciu a reálny backend; podvrhne iba výpadok jednej
konkrétnej GET matches požiadavky. Overí aj DOM poradie a fyzickú geometriu alertu.
Mobilný projekt overuje oznámenie a správu, nie neexistujúce mobilné výsledky.
Nehodnoť očakávaný project-SKIP ako chýbajúci PASS ani zber 27 scenárov ako živý beh.
Trace, screenshoty a video sú v týchto dvoch súboroch vypnuté kvôli osobným údajom.

## Súhrn, ktorý poslať po testoch

```text
Nasadený commit:
Migrácia 0123: [X] / neaplikovaná / konflikt
Desktop: prehliadač, light/dark
iPhone: verzia iOS, Safari + PWA
OW-01 Z01–Z18: PASS/FAIL/SKIP podľa variantu
OW-02 P01–P14: PASS/FAIL/SKIP
Mobil M01–M04: PASS/FAIL/SKIP
M13: PASS/FAIL/SKIP
M14: PASS/FAIL/SKIP
M33: PASS/FAIL/SKIP
Playwright: projekty, PASS/FAIL/SKIP a chýbajúce fixtures
Upratané iba vlastné nové testovacie sledovania: áno/nie
Nové nálezy: ID, presné kroky, očakávanie, skutočný výsledok
```

OW-03 (Like vo výsledkoch), OW-04 (poľština), mobilné výsledky a zvyšné otvorené
overenia nie sú týmto kolom dokončené. Stav je v `findings-register.md`.
Ďalej: používateľova Rabbit kontrola → nasadenie a tento retest → pri úspechu
mapovanie OW-03. Pri novom vážnom náleze sa najprv rozhodne o jeho oprave.
