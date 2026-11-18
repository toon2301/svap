# Playwright: odovzdanie (stav k 18. 11. 2026)

Táto strana je pre agenta, ktorý má na starosti Playwright (Codex). Pravidlá spolupráce sú v `AGENTS.md`. Po každom prijatom behu (pozri nižšie) agent aktualizuje tabuľku stavu a zoznam známych pádov. Zmeny dáva do jednej vetvy naraz, nie po každom behu zvlášť.

## Aktuálna dávka — 18. 11. 2026: tri opravy po kontrole PR #281

Vetva **`e2e/komentare-257-opravy`** vznikla z čerstvého mainu **`a9d0fc0c`**
(už aj PR #283, K29). PR #280 a #281 sú zlúčené; **340 aj 337 majiteľ prijal
ako hotové**. Komentáre 257 zostávajú pripraveným scenárom, nie živým overením.
Vlákna na GitHube uzatvára majiteľ, agent ich nemení.

Všetky tri pripomienky boli overené v aktuálnom kóde a platili:

1. `FeedList.tsx` pri prázdnej Nástenke vykreslí `feed-empty-state` namiesto
   `feed-list`. UI helper teraz štandardnou čakajúcou aserciou prijme jeden
   z týchto dvoch stavov a až potom vytvorí vlastný podklad. Nezvyšuje timeout,
   neskrýva chybu načítania a nepotrebuje starší obsah účtu. Nový lokálny režim
   `empty-feed` pred prípravou vôbec nemá zoznam; zaznamená viditeľný prázdny
   stav a 0 zoznamov, po vytvorení podkladu a F5 už musí fungovať celý scenár.
2. Opis strážcu nižšie výslovne uvádza aj výnimku pre dva rovnakopôvodové
   prihlasovacie POST. Samotný strážca a rozsah jeho povolení sa nemenia.
3. Každý z ôsmich chybových režimov overuje presný počet vytvorení a mazaní,
   CSRF volaní, zápisov aj počet skutočných vstupov a očakávané fázy pádu.
   `ui-delete-status` musí dosiahnuť **1 vytvorený komentár a 1 pokus o jeho
   DELETE**, nie iba ľubovoľný FAIL s úspešným uprataním. Skúška timeoutu navyše
   potvrdí, že telo dosiahlo úmyselné čakanie až po dokončení UI operácií.

Pred opravou dve nové regresné kontroly na pôvodnej logike **správne zlyhali
(0 PASS / 2 FAIL)**: prázdna Nástenka zastavila prípravu pred prvým POST a
predčasný pád pri chýbajúcom tlačidle Pridať pôvodná kontrola chybne prijala
ako skúšku DELETE 500. Ide o preukázané chyby E2E, nie nové chyby aplikácie.
Po oprave sa predčasný pád musí odmietnuť aj vtedy, keď sa podklad bezpečne uprace.

Žiadna aplikácia, backend, Jest, závislosti, migrácie ani zoznam nálezov sa
nemenia. Celá dávka je **lokálna bez Railway**; `.env.e2e` sa nečíta ani
nekopíruje, testovacie účty ani relácia sa nepoužívajú.

### Pôvodné lokálne kontroly pred review PR #284 — nie živý PASS aplikácie

| Kontrola | Výsledok |
| --- | --- |
| Čistá logika | **30/30**, 20 pôvodných + 10 nových kontrol; navyše 120 pozmenených neplatných dôkazov správne odmietnutých |
| Celá browser kontrolná sada | **13/13 dvakrát**, **244,867 s** a po zjednotení bezpečného výberu fáz **233,664 s**; 0 vonkajších SKIP |
| Pozitívne varianty | **6/6**: dva počiatočné DOM stavy × WebKit desktop, WebKit mobil a Chromium; mobil skutočné trusted touch |
| Vložené chyby | **24/24**: pri všetkých ôsmich režimoch overené operácie, fáza aj FAIL/timedOut a výsledok upratania |
| Regresia predčasného pádu | **3/3**: chýbajúce tlačidlo pred POST nesmie nahradiť DELETE 500, hoci sa podklad uprace; záverečná cielená kontrola tiež **1/1**, **23,640 s** |
| Poistky | opakovanie odmietnuté pred fixture; chyba upratania zastavila ďalšie dva projekty pred API |
| TypeScript aplikácie aj celého E2E, ESLint, kontrola diffu | **0 chýb / 0 upozornení** |
| Izolované listovanie | bežná sada nezmenená **780 (260 × 3)**, samostatné komentáre **3**; 0 spustených testov |

Playwright **1.63.0**, Docker `--network=none`, iba read-only zdroje a knižnice,
prázdny storageState a prekrytý `.auth`. Žiadne prihlásenie ani živá požiadavka.
Surový lokálny report ostáva v pamäti; kontrolujú sa aj textové prílohy: žiadny
DOM snapshot, screenshot, video, trace ani syntetický súkromný marker vo výpise.
Výber fázy vracia iba pevné názvy, nie pôvodné chybové správy. Dlhé čakanie
existuje iba v pôvodnom lokálnom scenári úmyselného timeoutu; timeouty, tolerancie
a retry živej skúšky zostávajú nezmenené. Dva vnútorné SKIP pri skúške maxFailures
sú očakávaným dôkazom zastavenia po chybe, nie vypnutím testov pre zelený výsledok.
Prijatý základ celého behu **427 / 2 / 303** sa tým nemení.

Zmenených je päť existujúcich súborov: `support/feed-comments-ui.ts`, lokálne
`diagnostics-tests/feed-comments-{browser.check,page,scenario}.ts` a tento dokument.
Nové sú len `diagnostics-tests/feed-comments-control.ts` a jeho
`feed-comments-control.check.ts` (oba pod 500 riadkov). Výpis kódových ciest je
relatívny k `frontend/e2e/`. Migrácie: **žiadne**. Majiteľ **18. 11. schválil
commit a push tejto vetvy**; PR otvorí a review vlákna uzavrie sám. Živý beh
týmto schválený nie je.

### Dodatok po kontrole Rabbitu v PR #284 — presný HTTP stav DELETE

Čerstvý main je naďalej **`a9d0fc0c`**, hlava PR pred opravou **`90ee57b8`**.
Jediná otvorená pripomienka Rabbitu (Minor) platila: počet pokusov a fáza pádu
nerozlišovali skutočnú odpoveď DELETE 500 od 503. Tri nové čisté regresné kontroly
na pôvodnom kóde správne zlyhali **0/3**: 503, chýbajúca odpoveď a nezaznamenaný
údaj sa prijali aj pri inak správnych počtoch, fáze a potvrdenom uprataní.

Lokálna syntetická fixture teraz z udalosti `context.on('response')` zachytí
**iba číselný stav odpovede DELETE vlastného komentára**. Nečíta telo, cookies
ani hlavičky a nezaznamenáva URL alebo ID. Stav ostáva `null`, ak odpoveď neprišla;
v bezpečných metadátach je to pevné `none`:

```text
[COMMENTS-SELFTEST] ... commentDeleteStatus=<číselný HTTP stav|none>
```

`assertCommentFault('ui-delete-status', ...)` vyžaduje **presne číslo 500**.
Neistý zápis sa naďalej nemaže naslepo; upratanie hlasno zlyhá. Samotný živý
scenár, jeho strážca, `[E2E-EVIDENCE]`, aplikácia, timeouty a retry sa nemenia.
Pozitívne lokálne scenáre navyše overujú zachytené 204, predčasný pád pred
DELETE musí mať `null`. Dve nové syntetické skúšky vracajú 503 alebo prerušia
DELETE bez odpovede; obe sa musia odmietnuť ako náhrada skúšky 500.

Po oprave čisté kontroly **33/33**. Cielená browser regresia **2/2**,
**62,110 s**, spolu **6/6 variantov** (503 aj bez odpovede × tri projekty), bez
retry a účtov. TypeScript aplikácie aj E2E a ESLint: **0 chýb / 0 upozornení**.
Celá lokálna browser sada prešla **15/15**, **270,115 s**, 0 vonkajších SKIP:
pozitívne scenáre **6/6** a všetky pôvodné aj nové riadené chyby ostali správne
odhalené. Nových šesť variantov je zahrnutých aj v tomto celom behu. Kontrola
obsahu textových príloh a súkromného markera prešla tiež. Izolované listovanie
potvrdilo nezmenených **780** bežných variantov a **3** samostatné komentárové
varianty, 0 spustených scenárov. Docker mal vždy `--network=none`, bez env a relácie.

Zmenené iba päť existujúcich E2E diagnostických súborov
`feed-comments-{control,control.check,page,scenario,browser.check}.ts` a tento
dokument. Nové súbory ani migrácie nepribudli. Majiteľ výslovne schválil commit
a push na tú istú vetvu; vlákno na GitHube neuzatvárame. Žiadny Railway beh.

### Ďalší živý krok — až po novom potvrdení majiteľa

Majiteľ určí samostatné okno a potvrdí nasadený čerstvý main aj súhlas s dočasným
vlastným textovým obsahom. Pôvodný návrh **15 minút** je pre scenár komentárov;
ak sa pridajú regresie K29, majiteľ výslovne potvrdí aj ich rozsah a trvanie.
Počas behu žiadne zlučovanie, nasadzovanie ani zmena účtov. Pred štartom znovu
overiť main a nasadenie K29. Po potvrdení overiť cielene `feed-post-detail.spec.ts`,
`notification-click.spec.ts` (nie sú v `@smoke`) a samostatný scenár komentárov.
Tento lokálny krok takéto okno neotvára. Budúce zmeny vzhľadu 262, 344 a 261 sa do týchto opráv nepridávajú;
ich konkrétny dopad na E2E sa preberie až zo schválených vetiev aplikácie.

## Historická dávka — 17. 11. 2026: živé overenie 337 a príprava komentárov 257

Čerstvý `main` **`4c342f72`** bol overený pred prácou aj po skončení živého
okna. Aplikácia, backend, závislosti, Jest ani zoznam nálezov sa nemenia.
Táto vetva **`e2e/komentare-257`** obsahuje iba E2E komentárov a tento dokument;
samostatná oprava 340 do nej nepatrí. PR otvára majiteľ.
Pred commitom boli obe pripravené vetvy bez konfliktu posunuté na najnovší
**`7134cab6`** (PR #279: iba pravidlá a zoznam nálezov, bez zmeny aplikácie,
E2E alebo závislostí). Živý výsledok 337 naďalej patrí nasadeniu `4c342f72`.

### 337 — potvrdený živý beh po príprave účtu

Prvý schválený pokus v okne 09:00–09:15 Europe/Bratislava skončil na podmienke
`in_app_notifications`: **0 PASS / 1 FAIL / 1 SKIP**, UTC
**08:00:50.679–08:01:19.095**. Prihlásenie uspelo, prebehli iba dva GET 200,
**žiadny PATCH** ani tiché zapnutie nastavení. Nejde o potvrdenú chybu aplikácie.
Ďalší projekt zastavila pôvodná poistka maxFailures=1. Majiteľ potom účet
pripravil ručne a výslovne potvrdil nové okno 09:25–09:40.

Nový pokus, bez automatického retry, **2 PASS / 0 FAIL / 0 SKIP**:

| Projekt | Výsledok | Trvanie testu |
| --- | --- | ---: |
| webkit-desktop | 1 / 0 / 0 | 4 341 ms |
| webkit-mobile | 1 / 0 / 0 | 3 441 ms |

UTC **08:25:36.882–08:26:05.793**, proces **28 911 ms**, Playwright report
**16 512,04 ms**. V každom projekte práve jeden jednokľúčový UI PATCH a jeden
samostatný obnovovací PATCH; záverečný GET potvrdil **všetkých sedem pôvodných
hodnôt**. Hodnoty účtu sa nevypisovali. Oba varianty zaznamenali:

```text
[E2E-CATEGORY] restored=verified fields=7
[E2E-CATEGORY-AUDIT] ui=1 restore=1 rejected=0 pending=0 uncertain=false restoreRejected=false
```

Okno bolo majiteľovi uvoľnené o **09:26**. Komentáre, porovnanie WSL/Docker ani
iný živý scenár sa v ňom nespustili. Tento cielený výsledok nemení prijatý základ
celého behu **427 / 2 / 303** ani posledný celý beh. Prijatie výsledku majiteľom
sa nesmie zamieňať so samotným úspešným behom.

### 340 — samostatná lokálna oprava poistky API opakovania, R50

Vetva **`e2e/api-repeat-340`** vznikla z `4c342f72`, má šesť E2E súborov.
CLI `--repeat-each=2` aj `--repeat-each 2` odmietne rodičovská konfigurácia
**pred global setupom a prihlásením**; explicitné `--repeat-each=1` ostáva platné.
Fixture navyše vyžaduje vlastnú chránenú konfiguráciu a `repeatEachIndex=0`.

Lokálne: **49/49** čistých kontrol a **5/5** vonkajších browser kontrol
(**81 651,423 ms**), TypeScript a ESLint bez chýb. Odmietnutie oboch CLI zápisov
bolo overené aj so skutočnou API konfiguráciou bez siete; `--list` pri hodnote 1
stále zbiera tri varianty a nič nespúšťa. Obídenie chráneného configu v oboch
WebKitoch zlyhalo pred prvým API volaním. Bez Railway, env a účtov.
Majiteľ **17. 11. výslovne schválil commit a push oboch pripravených vetiev**.
Pravidlo malého samostatného rozsahu R50 zostáva zachované; PR otvára majiteľ.

### 257 — iba lokálna príprava pridania a zmazania vlastného komentára

Samostatný scenár **`feed-comments.ui.ts`** používa vlastnú konfiguráciu
**`feed-comments.playwright.config.ts`**, všetky tri projekty, workers=1,
retries=0 a maxFailures=1. Do bežnej celej sady ani dymu sa automaticky nezbiera.
Nie je zatiaľ živým overením aplikácie.

Používa nový dočasný **vlastný textový príspevok** s jedinečnou značkou, bez
fotiek, označovania ďalších účtov alebo reakcií. V jeho detaile cez UI pridá
jeden vlastný komentár, overí ho cez GET, cez potvrdzovací dialóg ho zmaže a
GET overí neprítomnosť. Desktop používa click v okne detailu, mobilný WebKit
skutočný tap v mobilnom detaile. Podklad sa uprace aj pri chybe tela testu.
Podľa prečítaného backendu sa komentár tvrdo maže a vlastný komentár pod vlastným
príspevkom nevytvára upozornenie inému účtu.

Samostatná pomocná stránka v tom istom kontexte drží transport pre prípravu a
upratanie; cookies ani CSRF hodnoty neopúšťajú prehliadač. Kontextový strážca
povolí z obsahových zápisov iba jeden POST podkladu, jeden UI POST komentára,
jeden UI DELETE komentára a jeden upratovací DELETE podkladu. **Samostatne
prepúšťa aj POST na `/api/token/refresh/` a `/api/auth/token/refresh/` na tom
istom pôvode pre obnovu prihlásenia; tie sa do štyroch obsahových zápisov
nezapočítavajú ani sa v tejto dávke nemenia.** GET, HEAD a OPTIONS tiež prepúšťa;
ostatné zachytené API zápisy blokuje. Pred zmazaním sa overí vlastníctvo
aj presná jedinečná značka. Záverečný GET po DELETE sa vykoná aj pri HTTP chybe,
ale pôvodná chyba sa nesmie zamaskovať. Žiadne opakované mazanie.

Pri neukončenom alebo neisto ukončenom zápise sa rodičovský príspevok **nemaže
naslepo** (ochrana pred neskorým zápisom a súbehom zdieľania/mazania); upratanie
hlasno zlyhá a maxFailures=1 zastaví ďalší projekt. Prípadný zvyšok potom vyžaduje
samostatné bezpečné preverenie so súhlasom majiteľa, nie tvrdenie o úspešnom uprataní.

Bezpečné metadáta sú iba počty a príznaky, bez ID, textov, hodnôt cookies a tiel:

```text
[E2E-COMMENTS-CLEANUP] state=verified|failed|not-needed
[E2E-COMMENTS-AUDIT] post=<počet> comment=<počet> uiDelete=<počet> cleanupDelete=<počet> rejected=<počet> pending=<počet> uncertain=<príznak>
```

Lokálne overenie, **nie živý PASS aplikácie**:

| Kontrola | Výsledok |
| --- | --- |
| Čistá logika prípravy, vlastníctva, upratania, auditu a CLI | **20/20**, zopakované bez chyby |
| Prehliadačová kontrolná sada | **11/11**, dvakrát; **201,780 s** a po vyčistení typov **193,534 s**, 0 vonkajších SKIP |
| Úspešný vnútorný scenár | **3/3**: WebKit desktop, mobil a Chromium; mobil 4 trusted touch, desktopy 4 trusted mouse |
| Úmyselné chyby | **24/24 odhalených**: chybný POST/DELETE komentára, chýbajúci riadok, timeout tela, dve chyby zmazania podkladu, neistá sieť a neoverené vlastníctvo |
| Poistky | CLI opakovanie odmietnuté; zlyhané upratanie zastavilo ďalšie dva projekty pred API |
| Ochrana údajov | syntetický súkromný marker chýba vo výpise aj textových prílohách; žiadny DOM snapshot, screenshot, video ani trace |
| TypeScript aplikácie aj celého E2E, ESLint nových súborov | **0 chýb / 0 upozornení** |
| Izolované listovanie | bežná sada nezmenená **780 (260 × 3)**; komentáre **3**; UI 337 stále **2**; 0 spustených testov |

Všetky browser kontroly mali `--network=none`, iba read-only zdroje/knižnice,
prázdny storageState a prekrytý `.auth`; bez `.env.e2e`, prihlásenia a Railway.
Úmyselné pády sú úspešné kontroly pomocníka iba vtedy, ak vnútorný scenár
skutočne ostal FAIL/timedOut. V samostatnej skúške maxFailures=1 sú dva vnútorné
SKIP očakávaným dôkazom zastavenia, nie vypnutím scenárov kvôli zelenému behu.
Živé timeouty ani retry sa nemenili. Prvý lokálny pozitívny pokus odhalil nulovú
výšku prázdneho syntetického feedu; upravený bol iba DOM skúšobnej stránky,
nie asercia ani aplikácia.

Nových je **14 malých E2E súborov**: root spec a config `feed-comments.*`,
šesť `support/feed-comments-{options,session,test,transport,ui,writes}.ts`
a šesť lokálnych súborov `diagnostics-tests/feed-comments*`; upravený je iba
tento existujúci dokument. Všetky nové kódové súbory majú menej než 500 riadkov.
Žiadne migrácie. Commit a push majiteľ schválil 17. 11.; PR otvorí sám.

Živý beh komentárov potrebuje **nové samostatné potvrdené okno a súhlas s týmto
dočasným obsahom**, až po lokálnych kontrolách a kontrole vetvy. Návrh trvania:
**15 minút**, presný termín potvrdí majiteľ. V okne sa nič nezlučuje, nenasadzuje
ani nemenia testovacie účty. Pred štartom znova overiť čerstvý main a nasadenie.
Porovnanie WSL/Docker k 223 sa teraz nespúšťa; 330 sa nerobí (R43) a push výzva
sa nepridáva (R44(b)).

Mimo rozsahu: starší lokálny browser obal UI 337 na úplne čerstvom checkout-e
vyžaduje existujúci prázdny adresár `.auth` ako cieľ vnoreného tmpfs. Bez neho
Docker odmietne mount ešte pred testom. Ide o nízku závažnosť lokálneho E2E
pomocníka, nie aplikácie alebo živého behu 337. V tejto dávke sa starší obal
nemení; nové pomocníky kontrolovane vytvoria iba prázdny cieľ, bez čítania relácie.

## Historická dávka — 16. 11. 2026: UI kategória upozornení, R44(b), nález 337

Vetva **`e2e/ui-kategoria-337`** vznikla z čerstvého mainu **`910700ea`**.
Pred commitom bola bez konfliktu posunutá na aktuálny **`bf343f0a`** (PR #274
menil iba zoznam nálezov; aplikácia a E2E zostali totožné s overenou verziou).
Zachováva aj predchádzajúci lokálny
záznam prípravy WSL nižšie. Majiteľ rozhodol R44(b): **iba UI scenár kategórií**.
Test výzvy na push sa nepridáva a **330 sa nerobí (R43)**.

Pred implementáciou majiteľ výslovne potvrdil, že hlavný E2E účet má
`in_app_notifications` zapnuté. Je to **potvrdenie majiteľa, nie nové čítanie
Railway**. Scenár podmienku pri živom behu ešte overí cez GET: pri vypnutí
zlyhá bez UI zmeny aj bez obnovovacieho PATCH. Master sa potichu nezapína.

### Dodatok po kontrole Rabbitu v PR #276 — odpovede 3xx

Pred opravou bol skontrolovaný najnovší main **`bf754de0`**; medzitým sa
nemenili dotknuté E2E ani frontendové súbory. Oprava zostáva na tej istej vetve.
Rabbit správne upozornil, že stav 307/308 môže predchádzať presmerovanému PATCH,
ktorý route handler nevidí. Endpoint v kóde priamo nepresmerúva, no správanie
živej proxy sa v tejto dávke neoverovalo.

Zvolená úzka oprava nepovažuje presmerovaný PATCH za úspešný testový tok:
**všetky 3xx znamenajú neistotu**, aj pri platnej `X-App-Duration-Ms`.
Obnovovací PATCH a záverečný GET sa stále skúsia, ale neistota zostáva a
`restored=verified` je zakázané aj po prípadnej odpovedi nesledovaného pokračovania.
Pôvodný maxFailures=1 zastaví nasledujúci projekt, nie už dobiehajúci redirect.
Pri takomto FAIL treba účet preveriť; samotný GET nepreukazuje trvalý návrat.
Aplikácia, transport, timeouty,
retry a pravidlá ochrany údajov sa nemenia.

Tri nové čisté regresné kontroly najprv na pôvodnom kóde správne padli
(42 PASS / 3 FAIL); po oprave prešli **45/45** vrátane pôvodných 20 API kontrol.
Prehliadačové kontroly navyše synteticky vracajú prvú odpoveď 307 alebo 308
s aplikačnou hlavičkou. Zámerne netvoria živý redirect chain: overujú, že už
prijatie 3xx zabráni potvrdeniu obnovy, aj keď aktuálny záverečný GET sedí.
Po oprave celá lokálna prehliadačová kontrolná sada prešla **18/18**, čas
**262,145 s**, 0 SKIP a bez retry. Obsahuje štyri úspešné UI varianty a 28
správne odhalených úmyselných chýb; nové 307/308 sú **4/4** v oboch WebKitoch
a hlásia neoverený návrat aj pri zhodnom aktuálnom stave. Poistky spustenia a
zastavenie druhého projektu po chybe obnovy prešli tiež. TypeScript aplikácie
aj E2E a ESLint zmenených súborov: **0 chýb / 0 upozornení**. Negatívna kontrola
ochrany textových príloh: **5/5**, obsah príloh kontrolovaný aj v browser sade.
Skutočné účty ani Railway sa nepoužívajú. Skorší predbežný návrh termínu nie
je potvrdeným oknom; živý beh potrebuje nové potvrdenie majiteľa.
Novú kontrolu Rabbitom odporúčame
pred zlúčením, lebo ide o bezpečnosť upratania nastavení účtu; vlákno rieši majiteľ.

### Čo nový samostatný scenár overuje

- Pôvodných sedem booleanov drží iba v pamäti. Konkrétny viditeľný obal
  `notifications-category-likes-desktop` alebo `notifications-category-likes-mobile`
  odlíši dve rozloženia v DOM. Dočasný `appLocale=sk` patrí iba kontextu prehliadača.
- Zmení iba `notify_likes` na opačnú hodnotu: desktop skutočným `click`, mobilný
  WebKit skutočným **`tap`**, bez `force` alebo náhradného vyvolania udalosti.
  Strážca vyžaduje **jeden UI PATCH s jediným kľúčom** a HTTP 200; duplicitný,
  viackľúčový alebo iný API zápis zablokuje a skúška nesmie prejsť.
- Overí výber a cez GET všetkých sedem hodnôt. Po F5 opäť overí GET aj výber;
  ostatných šesť hodnôt musí zostať pôvodných. Žiadne nové správy, žiadosti,
  upozornenia ani súbory sa nevytvárajú.
- Vo fixture teardown, aj po chybe alebo timeoute tela, pošle **jeden samostatný
  obnovovací PATCH so všetkými siedmimi pôvodnými hodnotami** a vykoná záverečný
  GET aj pri chybe PATCH. Tento upratovací zápis nie je druhý UI PATCH.
  Nezhoda, nesprávny tvar, HTTP chyba alebo neistý zápis znamenajú hlasný FAIL.
  MaxFailures=1 zastaví ďalší projekt; žiadny automatický opakovaný zápis.
- Pri neukončenom UI requeste alebo proxy 5xx bez platnej `X-App-Duration-Ms`
  sa návrat síce skúsi, ale **nesmie sa označiť za potvrdený**, ani keby aktuálny
  GET sedel: upstream zápis sa ešte mohol dokončiť neskôr. Synchrónny zápis
  nastavení v aplikácii bol preverovaný iba čítaním kódu, bez zmeny aplikácie.

Používa existujúci bezpečný transport a spoločný pomocník obnovy. Pôvodný API
roundtrip má len vyčlenenú obnovu bez zamýšľanej zmeny správania; jeho doterajšie
jednotkové aj prehliadačové kontroly prešli.

### Pôvodné lokálne overenie pred kontrolou Rabbitu — nie výsledok živej aplikácie

Všetky prehliadačové skúšky tejto dávky mali **`--network=none`**, prázdny
storageState a lokálne odpovede. Pripojené boli iba zdroje/knižnice read-only;
`.env.e2e` sa nepripojil, `.auth` zakryl prázdny read-only tmpfs. Žiadne
prihlásenie, volanie Railway ani zmena skutočného účtu. Playwright **1.63.0**.

| Kontrola | Výsledok |
| --- | --- |
| Nová čistá logika + pôvodný API kontrakt | **42/42** (22 nových + 20 pôvodných), 0 SKIP |
| Nová prehliadačová kontrolná sada | **16/16**, 251,922 s; oba WebKity |
| Úspešné simulované UI varianty | **4/4**: oba pôvodné stavy × oba WebKity; správne trusted touch/mouse |
| Úmyselné chyby novej sady | **24/24 odhalených**: master-off, payload, duplicita, HTTP/sieť/proxy, F5, chyba/timeout tela a tri chyby obnovy |
| Negatívne poistky novej sady | odmietnuté workers/retry/repeat/max-failures; zlyhaná obnova zastavila druhý projekt pred API |
| Regresia pôvodného API prehliadačového pomocníka | **3/3** kontrol; vnútorných 3 PASS + 12 úmyselných FAIL v troch projektoch |
| Negatívna kontrola ochrany textových príloh | **5/5**; aj obsah príloh skontrolovaný vo vnútorných behoch |
| Existujúce Jest E2E ochrany | **52/52**, 2 sady, bez zmeny Jest súborov |
| TypeScript aplikácie aj celého E2E, ESLint nových súborov | **0 chýb, 0 upozornení** |

Úmyselné pády nie sú nové chyby aplikácie ani dôvod meniť tolerancie. Kontroluje
sa, že zostanú FAIL/timedOut a že upratanie buď overene prebehne, alebo zlyhá
nahlas. Dlhé čakanie existuje iba v syntetickom scenári úmyselného timeoutu.
Timeouty ani retry živej skúšky sa nezvyšovali.

Screenshot, trace a video sú vypnuté. `PLAYWRIGHT_NO_COPY_PROMPT=1` zabraňuje
automatickému čítaniu DOM do error-context. Playwright môže vytvoriť metadátový
error-context aj tak; lokálny obal preto kontroluje **obsah**, nie len názov:
žiadny page snapshot, YAML DOM ani syntetický súkromný marker v prílohách alebo
výpise. Surové lokálne reporty sú len v pamäti; prílohy v dočasnom kontajneri.

Nové bezpečné metadáta (bez hodnôt volieb, tiel, cookies alebo tokenov):

```text
[E2E-CATEGORY-RUN] workers=1 maxFailures=1 repeat=1 index=0 retries=0 retry=0
[E2E-CATEGORY] restored=verified|failed fields=7
[E2E-CATEGORY-AUDIT] ui=<počet> restore=<počet> rejected=<počet> pending=<počet> uncertain=<príznak> restoreRejected=<príznak>
```

Pri páde ostáva aj existujúci `[E2E-EVIDENCE]`. Tieto riadky nikdy nesmú
obsahovať pôvodné ani zmenené hodnoty účtu alebo telo odpovede.

Izolovaný **`--list`** bez setupu potvrdil:

- pôvodný plný výber: **780 variantov**, 260 v každom z troch projektov, bez zmeny;
- nová UI konfigurácia: **2 varianty**, WebKit desktop a mobil;
- pôvodná samostatná API konfigurácia: **3 varianty**, bez zmeny.

Nový súbor má príponu **`.ui.ts`**, preto sa nespustí v bežnom celom behu ani
v dyme. Prijatý základ 427 / 2 / 303 ani výsledok posledného celého K19 sa nemenia.

### Súbory a hranice zmeny

Nové: `frontend/e2e/notification-category.ui.ts`,
`notification-category.playwright.config.ts`; v `frontend/e2e/support/`
`notification-category-{options,roundtrip,test,ui,writes}.ts`; v
`frontend/e2e/diagnostics-tests/` `notification-category.check.ts`,
`notification-category-browser.check.ts`, `notification-category.scenario.ts`,
`notification-category.playwright.config.ts`, `notification-category-page.ts`
a `notification-category-local-runner.mjs`.
Zmenené iba existujúce `frontend/e2e/support/notification-preferences-roundtrip.ts`
a tento dokument. **Žiadna zmena aplikácie, backendu, Jest testov, závislostí,
migrácií alebo zoznamu nálezov.** Všetky nové kódové súbory sú pod 500 riadkov.
Lokálne pomocné obaly mimo Gitu majú prefix `C:/Projects/svap-e2e-ui-337-`;
neobsahujú účty a neprenášajú env ani reláciu. Majiteľ požiadal o commit a push
tejto dávky; PR otvára majiteľ. Živé overenie naďalej čaká na nové potvrdené okno.

### Mimo rozsahu — overená medzera staršej API poistky

V Playwrighte 1.63 CLI `--repeat-each=2` nie je vo workerovi viditeľné cez
`testInfo.project.repeatEach` tak, ako predpokladá starší
`notification-preferences-test.ts`. Bez siete a účtov sa pôvodný syntetický
API scenár pri tejto voľbe vykonal **2×, 4 simulované PATCH celkom**, obidva
návraty overené. Predpísaný príkaz bez opakovania tým nie je dotknutý; ide o
poistku proti nesprávnemu ručnému spusteniu, nie preukázanú chybu aplikácie.
Závažnosť: **stredné prevádzkové riziko E2E pri nesprávnom opakovanom živom
spustení**; predpísaný príkaz bez opakovania medzeru nevyvolá.
**Neopravené v tejto dávke**, odporúčaný samostatný súhlas. Nový UI scenár
odmieta opakovanie už v rodičovskej konfigurácii pred global setupom; overené
negatívnym behom. Dovtedy starší API scenár nespúšťať s `--repeat-each`.

### Ďalší krok — nové potvrdené okno len pre UI 337

Návrh majiteľovi: **16. 11. 2026 20:00–20:15 Europe/Bratislava**, rezerva
**15 minút**, alebo iný ním potvrdený termín. Toto je iba návrh, nie povolenie
ani automaticky naplánovaný beh. Pred štartom znova overiť čerstvý main a
potvrdené nasadenie; počas okna žiadne zlučovanie, nasadenie ani zmena účtu.
Spustí sa iba samostatná UI skúška v oboch WebKitoch:

```powershell
npm run test:e2e:docker -- --config=e2e/notification-category.playwright.config.ts --workers=1 --retries=0 --max-failures=1
```

Pri chybe obnovy žiadny ďalší živý test. Porovnanie WSL/Docker k 223 potrebuje
**iné, samostatne oznámené okno**; teraz sa nespúšťa. Výzva push a scenár 330
zostávajú vylúčené. Živá aplikácia týmto lokálnym overením ešte nie je potvrdená.

## Historická dávka — 16. 11. 2026: Linux Chromium a pôvodná konfigurácia cez `--list`

Vetva **`e2e/wsl-chromium-list`** vychádza z čerstvo stiahnutého main
**`910700ea`**. Pravidlá, E2E a konfigurácia sú oproti predošlému odovzdaniu
nezmenené. Majiteľ zapísal správu k PR #271 do dodatku 223 (vetva 179).
Táto dávka je **iba príprava bez Railway, prihlásenia a spustenia scenárov**.
`frontend/e2e/**`, pôvodná konfigurácia, aplikácia a závislosti repozitára sa nemenia.

**V čase tejto prípravy R44 čakalo na rozhodnutie majiteľa; rozhodnutie a aktuálny stav sú vyššie.** Žiadny nový UI scenár kategórií ani výzvy
push sa nepridáva; odporúčanie zostáva iba UI scenár kategórií. **330 sa nerobí
(R43)**, bez nových žiadostí, druhého účtu alebo upozornení.

### Izolovaný Chromium pre pôvodný `global-setup.ts`

V už schválenom Ubuntu `Svaply-E2E-Ubuntu-24.04` bol doplnený iba Linux
Chromium **headless shell 153.0.8010.12, revision 1243** a potrebné systémové
balíky. Playwright zostáva **1.63.0**, Node **24.20.0**, rovnaké verzie ako pri
príprave WebKitu. Inštalácia `--only-shell --no-remove chromium` ponechala
existujúci WebKit; jeho binárka aj binárka headless shellu boli overené pod
vlastným `PLAYWRIGHT_BROWSERS_PATH`, nie pod cache používateľa root.
Plný Chrome nie je potrebný pre dnešné headless `chromium.launch()`.

**Prázdny Chromium PASS 1/1**, pôvodné volanie `chromium.launch()` bez vlastných
launch argumentov: štart **730 ms**, otvorenie a overenie **1 016 ms**.
`about:blank`, **0 požiadaviek stránky**, bez crash a predčasného disconnect.
Neprivilegovaný Linux používateľ, vypnutá sieť, disk Windows nedostupný,
**0 E2E premenných** a žiadny env alebo prihlásený storageState.

### Pôvodná konfigurácia — iba zoznam troch špecov

Použitých bolo iba **130 sledovaných zdrojových súborov / 655 297 bajtov**
z Git mainu: E2E kód, `playwright.config.ts`, `tsconfig.json` a `package.json`.
Ignorované súbory, `.env.e2e`, `.auth` a reporty sa neexportovali. Kópia v Ubuntu
je read-only pre testovací proces; všetkých **130 SHA-256** sedelo s pôvodnými
Git blobmi pred aj po listovaní. Pôvodná konfigurácia sa neupravovala a jej
skutočný `global-setup.ts` zostal nastavený, nie nahradený prázdnym setupom.

Windows export najprv zmenil konce riadkov na CRLF. Kontrola hashov správne
odmietla kópiu ešte pred použitím. Nový export použil iba pre daný príkaz
`git -c core.autocrlf=false -c core.eol=lf archive`; nastavenie Gitu zostalo
nezmenené. Odmietnutá kópia kódu sa zachovala, nič z účtov alebo relácie sa nekopírovalo.

Listovanie prebehlo v samostatnom sieťovom a mount priestore. Disk Windows bol
prekrytý prázdnym read-only tmpfs **iba v tomto procese**; pôvodný mount zostal
po skončení dostupný. Externé sieťové rozhrania: **0**. Prostredie bolo vyčistené
(`env -i`), `.env.e2e` ani uložená relácia v kópii neexistovali. Prihlásenie sa
nevolalo; chýbajúce povinné prihlasovacie premenné by skutočný setup odmietol.

**`--list` PASS**, proces **1 631 ms**, stderr **0 bajtov**, **198 jedinečných
kľúčov**, **0 spustených testov**:

| Špec | webkit-desktop | webkit-mobile | chromium-desktop | Spolu zaradené |
| --- | ---: | ---: | ---: | ---: |
| `search-mobile-cards.spec.ts` | 40 | 40 | 40 | 120 |
| `offer-card-review-translations.spec.ts` | 24 | 24 | 24 | 72 |
| `search-panel-fixture.spec.ts` | 2 | 2 | 2 | 6 |
| Spolu | 66 | 66 | 66 | **198** |

To sú **deklarované varianty, nie PASS/SKIP výsledky scenárov**. Podmienené
preskočenia v telách testov sa nevyhodnocovali. `results` zostali prázdne,
setup sa nespustil a `.auth/user.json` nevznikol. Prijatý základ **427 / 2 / 303**
ani výsledok K19 **377 / 23 / 362** sa tým nemenia; **223 ostáva otvorený**.

Príkaz z priečinka `frontend` izolovanej kópie (pôvodný config, iba CLI výber
špecov, počtu workerov/retry a bezpečného výstupu):

```bash
node /home/svaply-e2e/runtime/node_modules/playwright/cli.js test --config=playwright.config.ts --list --workers=1 --retries=0 --reporter=json --output=/home/svaply-e2e/diagnostics/list-only-output e2e/search-mobile-cards.spec.ts e2e/offer-card-review-translations.spec.ts e2e/search-panel-fixture.spec.ts
```

Lokálny obal dovolí iba `chromium-blank` a `list`, nie živý beh. Negatívna
kontrola režimu `test` správne skončila kódom 2 ešte pred ďalšou akciou. Surový JSON
Playwrightu zostal iba v pamäti čítača; uložený bezpečný zoznam obsahuje len main, názvy špecov,
testov a projektov, bez dát účtu:
`/home/svaply-e2e/diagnostics/list-910700ea-1794846053608-safe.json`.
Kópia kódu je v
`/opt/svaply-e2e/snapshots/910700eafd579073a47cbd10d56d2c65818b985f`.
Pomocné skripty `C:/Projects/svap-e2e-wsl-*-20261116.*` zostali mimo Gitu.
Po dokončení sa zastavilo iba naše Ubuntu; Docker, predvolené WSL a ochrana
Windows sa nemenili. Kód aplikácie sa touto prípravou neoveroval a nepreukázala
sa nová chyba aplikácie.

### Ďalší krok — iba po samostatnom oznámení okna

**Návrh majiteľovi:** 16. 11. 2026 **18:30–19:30 Europe/Bratislava**,
rezerva **60 minút**, vrátane kontroly totožného mainu, nasadenia a diagnostiky.
Je to návrh, **nie potvrdený termín alebo automaticky naplánovaný beh**.
Presný výber variantov a počet pokusov treba pred oknom potvrdiť podľa
odovzdania; dnešné listovanie z neho nič nepridáva ani nevyraďuje.

Pred prvým živým použitím treba v schválenom okne bezpečne sprístupniť pôvodný
env iba read-only, pripraviť súkromné zapisovateľné výstupy pre novú reláciu
a použiť jeden štandardný prihlasovací pokus. Dnešná read-only kópia ani obal
zatiaľ nie sú overeným prihláseným runnerom: env ani relácia sa neprenášali,
žiadne prihlásenie sa neskúšalo. Uloženú reláciu ani refresh tokeny medzi prostrediami nezdieľať.
Počas budúceho porovnania sa nesmie zlučovať, nasadzovať ani meniť účty;
teraz sa **žiadne porovnanie WSL/Docker nespúšťa**.

## Historická dávka — 16. 11. 2026: overenie po K23 a oddelené Ubuntu (R40)

Vetva **`e2e/k23-overenie-a-wsl`** vychádza z čerstvo stiahnutého main
**`91f58dbe`** (obsahuje aj K24 a K25, bez zmien E2E). PR #267 je zlúčený
v `4c2936ae`; nové WebKit varianty jeho API kontraktu sú už overené aj naživo.
Majiteľ potvrdil nasadenie `91f58dbe` a okno bez zlučovania, nasadení a zmien
testovacích účtov. Po dvoch behoch nižšie bolo **okno výslovne uvoľnené**.
Nasleduje iba lokálna práca; ďalší beh proti Railway potrebuje nové potvrdenie.
Aplikácia, E2E scenáre, závislosti repozitára, timeouty, tolerancie a retry sa nemenili.

### Živé výsledky — bez nového celého behu

| Beh | webkit-desktop P/F/S | webkit-mobile P/F/S | chromium-desktop P/F/S | Celkom P/F/S | Čas procesu |
| --- | --- | --- | --- | --- | --- |
| Dym `@smoke` | 13 / 0 / 4 | 15 / 0 / 2 | 13 / 0 / 4 | **41 / 0 / 10** | 2 min 1,445 s |
| API 321, WebKit roundtrip | 1 / 0 / 0 | 1 / 0 / 0 | — | **2 / 0 / 0** | 13,265 s |

Dym: čas reportu 117,780 s; projektové úseky od prvého štartu po posledný
koniec testu 35,531 / 49,228 / 19,743 s. API: report 9,391 s; samotné varianty
1,192 / 1,198 s. Workers=1, retries=0, žiadny flaky výsledok. Obe prihlásenia
uspeli na prvý pokus. Presné porovnanie s prijatým dymom po K22:
**51 rovnakých kľúčov aj výsledkov, 0 zmien**. Mobilný scenár
`mobile-settings-navigation.spec.ts` prešiel; overuje obal nastavenia Správy,
nie samotné správanie novej výzvy K23. Upratanie zdieľania: **6/6 kontrol**,
žiadna chyba upratania. Nový pád ani blok `[E2E-EVIDENCE]` nevznikol.

Časy procesu v UTC: dym **11:01:38.826–11:03:40.271**; API
**11:05:00.673–11:05:13.938** (16. 11. 2026).

Pri oboch API variantoch záverečný GET potvrdil návrat **všetkých siedmich**
pôvodných hodnôt: dva záznamy
`[E2E-PREFERENCES] restored=verified fields=7`. Hodnoty sa nevypisujú.
Chromium roundtrip bol overený už 15. 11. na K22 (1/1); nebol súčasťou tohto
nového dvojvariantového behu. Žiadne nastavenie nezostalo zámerne zmenené.

Príkazy z `frontend`, spustené iba v potvrdenom okne:

```powershell
npm run test:e2e:docker -- --grep '@smoke' --workers=1 --retries=0
npm run test:e2e:docker -- --config=e2e/notification-preferences.playwright.config.ts --project=webkit-desktop --project=webkit-mobile --max-failures=1 --workers=1 --retries=0
```

Použitý bol štandardný Docker spúšťač a iba dočasný lokálny obal pre bezpečné
výpisy a read-only pripojenie pôvodného env a knižníc. Env sa nevypisoval ani
nekopíroval. Screenshot, trace a video boli vypnuté. Bezpečné metadáta mimo Gitu:
`C:/Projects/svap-e2e-k23-smoke-20261116-1794826898826-details.json` a
`C:/Projects/svap-e2e-k23-diagnostic-20261116-1794827100673-details.json`.

Výsledok čaká na prijatie majiteľom; **nie je novým prijatým porovnávacím
základom**. Základ zostáva **427 / 2 / 303**, posledný celý K19 **377 / 23 / 362**.
**223 ostáva otvorený**; krátky úspešný dym nepreukazuje odstránenie jeho príčiny.

### Mapovanie UI kategórií — bez implementácie a bez živého zápisu

Overený tok v `useNotificationCategories`, `OptionRow`, `ToggleCircle` a
`useNotificationPreferences` umožňuje tento malý scenár:

1. Bežný setup, `appLocale` podľa existujúcich špecov, stránka
   `/dashboard/settings/notifications`. Predpoklad: `in_app_notifications` je
   zapnuté; inak sú kategórie zakázané a zobrazujú vypnutý stav bez ohľadu na
   uloženú hodnotu. Master sa kvôli testu potichu nezapína. Potrebný vhodný stav
   účtu alebo nové rozhodnutie majiteľa, nie falošný PASS.
2. Pôvodných sedem booleanov držať iba v pamäti. Viditeľný obal
   `notifications-category-likes-desktop` alebo `notifications-category-likes-mobile`
   zúži selektory: obidve rozloženia sú v DOM. Voľby sú **tlačidlá**, nie
   checkboxy; dnes nemajú `aria-checked` ani `aria-pressed`. Označenie sa dá
   overiť prítomnosťou SVG fajky v konkrétnom tlačidle Zapnuté/Vypnuté,
   nie cez všetky SVG v sekcii alebo presný zoznam CSS tried.
3. Cez UI zmeniť iba `notify_likes`. V mobilnom WebKite použiť skutočný `tap`:
   tento `onPointerDown` volá výber aj pri `preventDefault`, nejde o rovnaký tok
   ako pri jazyku 225. `onClick` volá rovnakú hodnotu, ktorú hook deduplikuje.
   Pred akciou zachytiť presnú PATCH požiadavku; očakávať jediný zmenený kľúč,
   HTTP 200 a potvrdenie cez GET, nie len optimistické označenie.
4. F5, pôvodné čakajúce asercie a GET: zmenená je iba zvolená kategória,
   zvyšných šesť hodnôt ostáva pôvodných. Žiadne správy ani upozornenia sa nevytvárajú.
5. Obnova všetkých siedmich hodnôt vo fixture teardown a záverečný GET,
   aj po chybe tela. Chyba obnovy je hlasný FAIL a zastaví ďalšie zápisy.
   Workers=1, retries=0, maxFailures=1; WebKit desktop aj mobil zostávajú povinné.

Existujúci `withNotificationPreferenceRoundTrip` vykonáva prvý PATCH priamo,
preto by jeho nezmenené použitie **nebolo UI testom**. Budúci malý fixture musí
umožniť skutočnú UI akciu a zachovať rovnakú overenú obnovu. Nevypisovať hodnoty
účtu, len úspech/počet nezhôd. Implementáciu a nové živé okno schváli majiteľ.

### K23: výzva push — lokálne zmerané schopnosti, nie živý test výzvy

Playwright **1.63.0**, Docker `v1.63.0-noble`, Node **24.20.0**. Čerstvé kontexty
Desktop Safari / iPhone 15 / Desktop Chrome, bez env, účtu a uloženej relácie.
Sieť kontajnera `none`; jedno syntetické HTTPS HTML bolo dodané cez route,
ostatné požiadavky sa odmietli. Všetky tri kontexty boli secure, iba jedna
lokálne vybavená požiadavka na kontext, **0 neočakávaných požiadaviek**.
Natívne API ani povolenia sa nepodvrhovali a `requestPermission` sa nevolalo.

| Projekt | Notification | PushManager | serviceWorker | Povolenie | Push podpora podľa aplikácie |
| --- | --- | --- | --- | --- | --- |
| webkit-desktop | áno | áno | áno | default | áno |
| webkit-mobile | nie | nie | áno | unsupported | nie |
| chromium-desktop | áno | áno | áno | denied | áno |

Nie je teda presné predpokladať `default` vo všetkých projektoch. Pred živým
UI scenárom treba overiť schopnosti aj povolenie pre jeho konkrétny pôvod;
lokálna sonda nepreukazuje stav účtu ani zobrazenie výzvy na Railway.

`usePushPermissionPrompt` vyžaduje dokončené načítanie, zapnuté Správy a
neodmietnutú výzvu. Podporovaný push + `default` dá variant `enable`.
**Výnimka:** nepodporovaný push na Apple mobile mimo nainštalovanej aplikácie
dá variant `ios-install` (návod bez tlačidla povolenia). Mobilný WebKit sondy
spĺňal Apple mobile a nebol standalone. Podporovaný push + `denied`/`granted`
výzvu nedá; absencia v Chromiu s `denied` preto nie je sama osebe chyba.

Budúci test bez zmeny účtu: iba s už zapnutými Správami, zúžiť viditeľný
`notifications-push-prompt-desktop`/`notifications-push-prompt-mobile`, overiť
príslušný variant, kliknúť **iba „Nie teraz“**, overiť zmiznutie aj po F5.
Presne jeden lokálny kľúč `svaplyPushPromptDismissedV1` uložiť v pamäti a vrátiť
vo `finally`; žiadny dump localStorage. Zakázať neočakávaný PATCH volieb a POST
subscription. **Nekliknúť Povoliť:** registruje worker a môže vytvoriť serverový
odber. Aj existujúce `granted` môže vyvolať automatickú synchronizáciu odberu,
preto sa taký kontext na read-only pokus nepoužije. Vypnuté Správy sa kvôli
výzve nezapínajú bez dohody. Reálny push a inštalácia na iPhone ostávajú ručne.

### R40(a): oddelené Ubuntu — príprava bez Railway

Majiteľ 15. 11. schválil samostatné Ubuntu vo WSL. Pred importom: **274,55 GiB**
voľného miesta, **15,68 GiB** RAM celkom, **4,35 GiB** voľnej RAM. Pred browser
sondou bolo voľných 3,69 GiB. Nevytváralo sa ďalšie prostredie Dockeru.

- Nová distribúcia **`Svaply-E2E-Ubuntu-24.04`**, WSL 2, uloženie
  `C:/Projects/svap-e2e-wsl/ubuntu-24.04`. Oficiálny amd64 archív Ubuntu
  **24.04.5**, Node **24.20.0** (rovnaký ako v Docker image); oba overené SHA-256
  z [manifestu Ubuntu](https://releases.ubuntu.com/noble/SHA256SUMS) a
  [manifestu Node](https://nodejs.org/dist/v24.20.0/SHASUMS256.txt) pred použitím.
- Vlastné knižnice iba v novom Ubuntu: **Playwright 1.63.0**, WebKit revision
  **2359**, verzia **26.6**; neprivilegovaný Linux používateľ pre prehliadač.
  Repozitár ani jeho package/lock súbory sa nepoužili na inštaláciu a nemenili.
- **Prázdna stránka PASS 1/1**: Linux mimo Dockeru, samostatný sieťový namespace
  bez vonkajších rozhraní, navyše offline browser context a odmietnutie všetkých
  route. `about:blank`, **0 požiadaviek stránky**, **0 vonkajších rozhraní**,
  bez page crash alebo predčasného browser disconnect. Štart WebKitu **1,008 s**,
  otvorenie a overenie spolu **2,041 s** (bez času inštalácie a ukončenia).
  Žiadny env, prihlásenie, údaje účtov ani Railway; `.env.e2e` sa do Ubuntu nekopíroval.
- Po dokončení bolo **zastavené iba nové Ubuntu**, aby nezaberalo RAM.
  Predvolená distribúcia zostala `docker-desktop`; nevykonal sa `wsl --shutdown`,
  zmena `.wslconfig`, nastavenia Dockeru, ochrany Windows alebo unregister.

Postup importu je podľa [oficiálneho WSL importu](https://learn.microsoft.com/en-us/windows/wsl/use-custom-distro),
verziované prehliadače podľa [Playwright dokumentácie](https://playwright.dev/docs/browsers).
Lokálne pomocné súbory prípravy sú mimo Gitu:
`C:/Projects/svap-e2e-wsl-prepare-20261116.ps1`,
`C:/Projects/svap-e2e-wsl-runtime-20261116.sh`,
`C:/Projects/svap-e2e-wsl-blank-20261116.cjs` a
`C:/Projects/svap-e2e-push-capabilities-20261116.cjs`.
Nie sú to nové scenáre aplikácie. Nespúšťajú sa bežným E2E príkazom.

V Ubuntu je zatiaľ iba WebKit pre schválenú sondu. Štandardný `global-setup.ts`
používa Chromium na prihlásenie, takže pred reálnym porovnaním treba ešte
pripraviť jeho izolovanú Linux verziu a bezpečné spustenie pôvodnej konfigurácie;
neprenášať env ani reláciu kopírovaním. Celý prihlásený beh vo WSL sa neoveroval.

Porovnanie `search-mobile-cards`, `offer-card-review-translations` a
`search-panel-fixture` v šiestich variantoch (3× mimo Dockeru a 3× v Dockeri)
**sa teraz nespúšťa**.
Potrebuje samostatne oznámené okno majiteľa. WSL je Linux mimo Dockeru, nie
natívny Windows WebKit; ani úspešná prázdna stránka nevyrieši nález 223.

**Ďalšie kroky len po dohode:** schváliť implementáciu zmapovaného UI scenára
kategórie a prípadne odmietnutia výzvy K23; samostatne potvrdiť nasadenie a okno
pre porovnanie troch reálnych špecov vo WSL a Dockeri. Žiadny z týchto behov
nie je spustený alebo naplánovaný automaticky.

**R43 (16. 11.): scenár 330 s dvoma účtami sa nerobí.** Odstránený z aktívneho
mapovania; žiadne overovanie druhého účtu, nové žiadosti ani upozornenia.

## Historická dávka — 15. 11. 2026: stav po K22, jazyk a voľby upozornení

Nasledujúci záznam opisuje vtedajší stav. Čakanie na K23 a rozhodnutie R40
bolo nahradené aktuálnou dávkou vyššie; scenár 330 bol zrušený rozhodnutím R43.

Vetva **`e2e/lang-a-volby-k22`** vychádza z čerstvého main **`52626ab7`**
(K22; opätovne overené cez fetch). PR #261 je zlúčený (`8b951cd9`), CI a
CodeRabbit prijaté; prípadné zostávajúce review vlákno uzatvára majiteľ.
Pred opravou pripomienky PR #267 bol stiahnutý main **`07a72900`** (K23);
neprekrýva E2E súbory tejto vetvy. Jeho prítomnosť nepotvrdzuje nasadenie.
K20, K21 a K22 sú podľa majiteľa nasadené; **K23 ešte nebola oznámená ako nasadená**.
Aplikácia, závislosti, prihlasovacie údaje, timeouty, tolerancie a retry sa nemenia.
Povolená dočasná zmena jednej kategórie v API teste sa overene vrátila.

### Prijaté živé overenie po K22

Majiteľ zapísal tieto výsledky do zoznamu (vetva 177):

| Beh | webkit-desktop P/F/S | webkit-mobile P/F/S | chromium-desktop P/F/S | Celkom P/F/S | Čas procesu |
| --- | --- | --- | --- | --- | --- |
| Dym `@smoke` | 13 / 0 / 4 | 15 / 0 / 2 | 13 / 0 / 4 | **41 / 0 / 10** | 2 min 39 s |
| 328, mobil light + dark | — | 2 / 0 / 0 | — | **2 / 0 / 0** | 18 s |

Dym mal rovnakých 51 kľúčov a výsledkov ako prijatý dym po K18. Prihlásenie
(9 PASS) a HTML `no-store` (18 PASS) sú zahrnuté v 41, nepripočítavajú sa znova.
Upratanie zdieľania bolo potvrdené 6/6 kontrolami. Nevznikol nový blok pádu.
328 je prijatý pri limite 5/5; **živý stav pod limitom zostáva neoverený**.
Kvôli nemu sa žiadne sledovanie nemenilo. Nie je to nový celý beh:
prijatý základ **427 / 2 / 303** zostáva, posledný celý K19 bol **377 / 23 / 362**.

**223 zostáva otvorený.** Natívny Windows WebKit sa zastavil pred otvorením
stránky na Smart App Control (nepodpísaná DLL); nejde o dôkaz príčiny straty relácie
vo WebKite v Dockeri. Návrh Ubuntu vo WSL čaká na **R40**. Dovtedy sa kvôli nemu
nič neinštaluje, nemení ani nespúšťa; porovnanie reálnych špecov neprebehlo.

### Nové testy — 335 a API časť etapy 4 nálezu 321

- `document-language.spec.ts`: šesť `appLocale` (sk, cs, en, pl, de, hu), každý
  vo všetkých troch projektoch, teda **18 variantov** vrátane oboch WebKitov.
  Izolovaný localStorage, anonymný kontext, žiadna tvorba dát. Čakajúca asercia
  `toHaveAttribute('lang', locale)` používa pôvodný limit; okamžité čítanie by
  nesprávne vyhodnotilo počiatočné serverové `lang="sk"`. Žiadny pevný sleep.
- `notification-preferences.api.ts`: **jeden kontrakt v troch projektoch**
  (`webkit-desktop`, `webkit-mobile`, `chromium-desktop`), spúšťaný
  vlastnou `notification-preferences.playwright.config.ts`, nie bežným plným behom.
  Bežný prihlasovací setup, storageState, prehliadač aj timeouty zostávajú.
  Projekty bežia za sebou: workers=1, retries=0 a maxFailures=1. Každý variant
  dokončí návrat pôvodných volieb skôr, než začne ďalší projekt.
  Test pri vypnutom zastavení po prvom páde odmietne vykonať zápis. Jediná zmena
  kategórie `notify_likes` na opačnú hodnotu, nie postupné vypínanie všetkých volieb.
  Majiteľ ponechal rozsah na odporúčaní Codexu; zvolený je menší živý zásah.
  GET aj odpoveď PATCH sa kontrolujú vo všetkých siedmich poliach:
  `in_app_notifications`, `push_notifications`, `notify_likes`,
  `notify_comment_likes`, `notify_comments`, `notify_tags_and_shares`,
  `notify_skill_requests`.
- Fixture uloží pôvodný stav iba v pamäti. Vo `finally` obnoví všetkých sedem
  hodnôt a potom vykoná záverečný GET, aj keď obnovovací PATCH zlyhá. Chyba obnovy
  ostáva nahlas FAIL, nie SKIP alebo zelený výsledok. Teardown používa pôvodný
  samostatný rozpočet Playwrightu aj pri vyčerpaní času tela testu; timeout sa
  nepredlžuje. Zápis sa odmietne pred API pri workers != 1, retry != 0 alebo
  repeat-each != 1. Test beží sériovo a oddelene od ostatných živých špecov;
  zlyhanie obnovy tak nemôže spustiť ďalší špec s potenciálne zmenenými voľbami.
- CSRF a cookies ostávajú v prehliadači; transport vráti len HTTP stav a sedem
  booleanov, iné polia zahodí. Žiadne hodnoty volieb, cookies, tokenov ani texty
  odpovedí sa nevypisujú alebo neprikladajú. Diagnostický fixture vypína screenshot,
  trace aj video. Pevný výpis `[E2E-PREFERENCES] restored=verified|failed fields=7`
  oznamuje iba výsledok overenia obnovy, nie hodnoty.

**Živé overenie nových špecov 15. 11. prešlo v potvrdenom okne na `52626ab7`:**

Nasledujúca tabuľka opisuje pôvodný commit `e770b837`: API vtedy bežalo iba
v Chromiu. Po oprave PR #267 má API tri projekty; **nové živé varianty WebKitu
ešte neboli spustené**. Lokálny syntetický výsledok nie je ich živým overením.

| Test | webkit-desktop P/F/S | webkit-mobile P/F/S | chromium-desktop P/F/S | Celkom P/F/S | Čas procesu |
| --- | --- | --- | --- | --- | --- |
| 335, šesť jazykov | 6 / 0 / 0 | 6 / 0 / 0 | 6 / 0 / 0 | **18 / 0 / 0** | 43,503 s |
| API 321, jeden roundtrip | — | — | 1 / 0 / 0 | **1 / 0 / 0** | 9,886 s |

Jazykový beh: **18:26:39.924–18:27:23.427 UTC**, report 28,525 s;
časy projektov 8,735 / 7,206 / 3,811 s. API: **18:27:46.624–18:27:56.510 UTC**,
report 5,645 s, samotný variant 1,040 s. Obe prihlásenia uspeli na prvý pokus,
žiadny retry alebo nový pád. API vytvorilo presne jeden pevný záznam
`[E2E-PREFERENCES] restored=verified fields=7`: záverečný GET potvrdil všetkých
sedem pôvodných hodnôt. Hodnoty sa nezverejňujú. Nevznikol blok pádu
`[E2E-EVIDENCE]`. Nejde o celý beh ani o nový prijatý porovnávací základ.

Bezpečné lokálne metadáta (mimo Gitu, nie raw reporty ani prílohy):
`C:/Projects/svap-e2e-k22-nove-lang-20261115-1794767199924-details.json` a
`C:/Projects/svap-e2e-k22-nove-preferences-20261115-1794767266624-details.json`.
Beh použil štandardný Docker skript; dočasný lokálny spúšťač len zachytil a
filtroval výpisy a pripojil pôvodný env a existujúce knižnice read-only. Env
nekopíroval ani nečítal mimo bežnej konfigurácie. Testy sa počas behu nemenili.
**Po skončení bolo okno uvoľnené; ďalší beh proti Railway nie je naplánovaný.**

Pred každým ďalším spustením treba nové potvrdenie konkrétneho nasadenia a okna
bez zlučovania, nasadení, iných testov a zmien účtu. Príkazy z `frontend`
pre ďalšie dohodnuté overenie (API konfigurácia už vyberá všetky tri projekty):

```powershell
npm run test:e2e:docker -- e2e/document-language.spec.ts --workers=1 --retries=0
npm run test:e2e:docker -- --config=e2e/notification-preferences.playwright.config.ts --workers=1 --retries=0 --max-failures=1
```

Pri chybe API testu ďalší živý zápis nespúšťať bez preverenia výsledku obnovy.
Pád procesu alebo nedostupný server nemôže `finally` zaručene upratať. Ani
záverečný GET nie je záruka proti neskorému dokončeniu časovo neistej požiadavky;
pri takom zlyhaní je potrebná kontrola majiteľa, nie automatické opakovanie PATCH.
Hodnoty sa kvôli zálohe neukladajú do súboru ani do logu.

Bežná kolekcia cez `--list`: **45 špecov / 780 variantov (260 na projekt)**.
Oproti doterajším 762 pribudlo iba 18 jazykových variantov. Samostatná API
kolekcia má **1 kontrakt / 3 projektové varianty**, do plného behu ani dymu
sa nepripočítava.
Výsledky celých behov sa naďalej porovnávajú podľa kľúčov, nie len odčítaním súčtov.

### Lokálne overenie novej dávky — bez Railway

- **144/144 Node kontrol**, z toho 20 nových pre kontrakt siedmich volieb,
  neplatné odpovede, neistý PATCH, chybu tela, ignorovanú obnovu a ochranu výpisov.
- **3/3 vonkajšie browser kontroly** po oprave PR #267. Vnútorná sada zámerne
  skončila **3 PASS / 12 riadených FAIL / 0 SKIP**: každý z troch projektov overil
  päť scenárov, vrátane návratu po chybe a timeoute tela a hlasného pádu pri chybe
  obnovy. Samostatný riadený pokus s workers=2 potvrdil odmietnutie pred prvým API
  volaním. Pokus s maxFailures=1 potvrdil, že zlyhanie obnovy v prvom WebKite
  zastaví ďalšie dva projekty ešte pred prípravou API. Nie sú to pády aplikácie.
- Docker týchto kontrol má **`--network=none`**, bez global setupu, env a účtu.
  Route používa syntetický Railway origin len pre overenie guardu; všetky odpovede
  sú lokálne podvrhnuté. Kontrola výpisov zahŕňa aj syntetický CSRF marker a stderr.
- Existujúce Jest `E2ePageActivity` a `E2eServiceWorker.guard`: **52/52**, bez zmien.
- TypeScript frontendu aj explicitne celej E2E oblasti: **0 chýb**. ESLint nových
  súborov a `git diff --check`: bez chýb. `--list` potvrdil 780 bežných variantov;
  samostatná API konfigurácia po oprave vyberá 3 projekty, workers=1, retries=0
  a maxFailures=1.

**Platný nález PR #267:** zdieľaný fixture preskakoval oba WebKity a samostatná
konfigurácia ich nevyberala. Jazykový špec nepokrýval ich transport, CSRF ani návrat
volieb. Nová regresná kontrola pred opravou skutočne padla na pôvodnom výsledku
1 PASS / 4 riadené FAIL / 10 SKIP. Po odstránení projektového `skip` sa v každom
WebKite vykoná celý roundtrip; neznámy projekt sa odmietne, nie potichu preskočí.
Pôvodné asercie zmeny a obnovy, konečné timeouty, zákaz retry a sériové vykonávanie
ostávajú. Oprava sa overovala iba v Dockeri s vypnutou sieťou; nevytvorila nový
živý zápis ani beh na Railway. Nové okno pre živé WebKity musí potvrdiť majiteľ.

Lokálne zopakovanie z `frontend` (nečíta env ani nevolá Railway):

```powershell
node node_modules/tsx/dist/cli.mjs --test e2e/diagnostics-tests/notification-preferences.check.ts
node node_modules/tsx/dist/cli.mjs --test e2e/diagnostics-tests/notification-preferences-browser.check.ts
```

Súbory tejto dávky (iba oblasť Codexu; bez migrácií, bez zmeny aplikácie):

```text
frontend/e2e/document-language.spec.ts
frontend/e2e/notification-preferences.api.ts
frontend/e2e/notification-preferences.playwright.config.ts
frontend/e2e/support/notification-preferences-roundtrip.ts
frontend/e2e/support/notification-preferences-transport.ts
frontend/e2e/support/notification-preferences-test.ts
frontend/e2e/diagnostics-tests/notification-preferences.check.ts
frontend/e2e/diagnostics-tests/notification-preferences-browser.check.ts
frontend/e2e/diagnostics-tests/notification-preferences.scenario.ts
frontend/e2e/diagnostics-tests/notification-preferences.playwright.config.ts
docs/playwright-odovzdanie.md
```

### 330 — nahradené rozhodnutím R43

Pôvodný návrh dvojúčtového scenára sa nerealizoval. Majiteľ ho 16. 11. zrušil
(R43); nie je súčasťou aktívneho mapovania ani budúcich behov tejto dávky.

### Až po oznámení nasadenia K23

V novom dohodnutom okne najprv dym `@smoke`, osobitne sledovať
`mobile-settings-navigation.spec.ts` vo webkit-mobile. K23 má pridať výzvu pod
Správy; existujúci špec overuje obal `notifications-push-messages-mobile`, nie
vnútorný text výzvy. Potom dohodnúť UI scenár kategórií s návratom pôvodného
stavu. Tento UI scenár ani dym po K23 teraz nie sú vykonané alebo označené hotové.

## Historická dávka — 13. 11. 2026: dôkazy 223 a oprava testu 328

Pracovná vetva je **`e2e/223-dokazy-limit-328`**, pôvodný základ main
**`203e8d14`**; pred odoslaním je aktualizovaná na **`79f907bd`** (K21), bez
prekrytia pripravených zmien. Aplikácia, testovacie účty, tolerancie, timeouty a retry sa nemenia.
Zmeny sú len v E2E a tomto odovzdaní. Táto dávka zatiaľ nebežala proti Railway;
termín porovnania natívneho WebKitu a Dockeru treba dohodnúť s majiteľom.
Prítomnosť K20 v main nie je potvrdením jeho nasadenia ani otvorením testovacieho okna.
Test siedmich API volieb a dvojúčtové scenáre kategórií teraz nepribúdajú.

**Porovnávací stav:** prijatý základ zostáva **427 PASS / 2 FAIL / 303 SKIP**.
Celý beh po K19 na `73173920` skončil **377 / 23 / 362** (37 min 38 s),
z toho 21 nových pádov a známe pády č. 1 a 3. Cielené opakovania boli
**47 / 4 / 12** z 63 pokusov; nemenia výsledok celého behu. Report je zapísaný
majiteľom pri 223 (dodatok 12. 11.) a 328, nie je novým prijatým základom.

### Dôkazy: päť špecov a súvislosť obnovy s CSRF GET

Existujúci `support/diagnostic-test.ts` je pripojený aj do špecov
`mobile-settings-offer-watch-motion`, `offer-watch-mobile-results-return`,
`search-cache-revalidation`, `search-preview-tab-top` a `sharing-from-profile`.
V týchto piatich súboroch sa mení iba import fixture, nie scenáre ani asercie.
PASS a SKIP nevytvárajú blok pádu; ochrana súkromia zostáva rovnaká.

`[E2E-EVIDENCE]` pri obnove obsahuje navyše tieto pevne formátované metadáta:

```text
        refresh same origin: áno
        refresh preceding csrf GET: /api/auth/csrf-token/ status=200 start=5 response=9 end=11 snapshot=12 failed=nie
```

- `refresh same origin`: porovnanie protokolu, domény a portu cieľovej URL obnovy
  s URL stránky pri začiatku požiadavky (`áno / nie / nezistiteľné`). Nie je to
  čítanie ani výpis HTTP hlavičky `Origin`; samotné adresy sa nevypisujú.
- CSRF: posledný pozorovaný **GET presnej cesty** `/api/auth/csrf-token/`
  na rovnakom cieľovom pôvode ako obnova. Záznam z iného servera ani POST sa nepoužije.
  Časy sú celé ms od začiatku pozorovania: `start` začiatok GET, `response`
  prijatie stavu/hlavičiek, `end` dokončenie alebo zlyhanie, `snapshot` začiatok obnovy.
  `n/a` znamená, že daný údaj v okamihu snímky ešte nebol známy; `failed` je príznak
  zlyhania GET. Hlavičky nie sú dôkazom dokončeného tela.
- Snímka sa uzavrie pri začiatku obnovy. Neskoršia odpoveď GET ju spätne nemení.
  `nepozorované` nepreukazuje, že GET nikdy neprebehol (napríklad pred pozorovaním);
  `nezistiteľné` označuje nedostupný snímok. Ide o časovú súvislosť, nie dôkaz príčiny 403.
- Doterajšie údaje `X-App-Duration-Ms`, názvy cookies a príznak `X-CSRFToken`
  zostávajú. Nikdy sa nepridávajú hodnoty hlavičiek, cookies, tokenov ani texty odpovedí.

Pri požiadavke bez pozorovanej odpovede sa pridá napríklad:

```text
        no response: bez odpovede do konca testu (aspoň 23.456 s)
```

Je to spodná hranica pozorovaného čakania, **nie trvanie spracovania servera ani
preukázaný serverový timeout**. Starý strojovo čitateľný riadok požiadavky ostáva
zachovaný. Zrušené požiadavky ani požiadavky s prijatým HTTP stavom túto poznámku
nedostanú. Bez odpovede nie je dostupná ani hlavička s trvaním Djanga.

### 328: správny ustálený stav správy Sledovania

Mobilný scenár v `offer-watch-pagination-errors.spec.ts` zachytí pôvodný GET
aplikácie `/api/auth/offer-watches/` pri otvorení správy a overí stav 200,
platný zoznam, počet v UI a počet kariet. Pomocník neposiela dodatočné API volanie
a nezapisuje údaje účtu; zo súkromnej odpovede kontroluje iba počet.

- Menej než 5: tlačidlo vytvorenia musí byť viditeľné **aj aktívne**, bez hlášky limitu.
- Pri 5: tlačidlo nesmie byť prítomné, musí sa ukázať správna hláška limitu.
- Načítavací stav, neplatná odpoveď ani chyba sa nesmú zameniť za úspech.
- Návrat Späť do pôvodného upozornenia zostáva overovaný.

Izolované browser kontroly používajú syntetický DOM, nie produkčné účty. Overili
počty **0, 4 a 5**, nesprávne stavy aj ochranu textu odpovede v troch projektoch.
To overuje kontrakt pomocníka, **nie funkčnosť skutočnej aplikácie s účtom pod limitom**.
Taký živý stav sa overí iba ak už existuje; sledovania sa kvôli nemu nemažú ani nevytvárajú.

### Oprava po kontrole PR #261: jedna podporovaná obnova relácie

Nález je platný: pôvodné čakanie vybralo prvú 401 zo zoznamu sledovaní a test
vyžadoval 200 skôr, než interceptor aplikácie stihol obnoviť reláciu. Overené
v `frontend/src/lib/api.ts`: pôvodný GET smie po obnove zopakovať práve raz.
Aplikácia sa nemení. Izolovaný regresný pokus pred opravou potvrdil falošný pád
**9/9** (počty 0, 4, 5 v troch projektoch), vždy na zachytenej 401 namiesto 200.

`waitForWatchManagerResponse` sa zapojí pred kliknutím a preskočí iba prvú 401
presného GET na rovnakom pôvode. Výsledok jedného opakovania, vrátane ďalšej 401,
odovzdá pôvodnej tvrdej kontrole stavu 200 a načítaného UI. Ostatné HTTP chyby sa
neignorujú. Ak obnova zlyhá a ďalší GET nepríde, čakanie nemôže prejsť; pôvodný
timeout zostáva. Pomocník sám neposiela požiadavky, neobnovuje reláciu a nepridáva
retry testu. Pôvodná 401 aj obnova zostávajú dostupné v diagnostických dôkazoch.

Kontroly zahŕňajú priamu odpoveď, úspešnú obnovu pri počtoch 0, 4, 5, opakovanú
401, odmietnutú obnovu bez opakovania GET a nesúvisiace odpovede. Syntetická
stránka má explicitnú UTF-8 deklaráciu, aby kontrola slovenských názvov nezávisela
od predvoleného kódovania prehliadača. Žiadny z týchto pokusov nejde na Railway.

### Lokálne overenie a ďalšie porovnanie

Z `frontend` (žiadny z týchto príkazov sa nepripája na Railway):

```powershell
$checks = Get-ChildItem e2e/diagnostics-tests -Filter '*.check.ts' |
  Where-Object { $_.Name -notmatch 'browser|^diagnostic-fixture' } |
  ForEach-Object FullName
node node_modules/tsx/dist/cli.mjs --test @checks
node node_modules/tsx/dist/cli.mjs --test e2e/diagnostics-tests/watch-manager-ready-browser.check.ts e2e/diagnostics-tests/response-diagnostics-browser.check.ts
$env:E2E_DIAGNOSTICS_DOCKER='1'
try {
  node node_modules/tsx/dist/cli.mjs --test e2e/diagnostics-tests/diagnostic-fixture.check.ts
} finally { Remove-Item Env:E2E_DIAGNOSTICS_DOCKER }
```

Browser kontroly nepotrebujú `.env.e2e` ani prihlasovací stav. Kontrola fixture má
zámerný vnútorný výsledok 3 PASS / 3 FAIL / 3 SKIP a musí zachovať tri dôkazové bloky;
vonkajší kontrolný test musí prejsť. Nové kontroly nie sú súčasťou produkčnej kolekcie.

**Výsledok lokálneho overenia 13. 11.:** 121/121 Node kontrol, 27/27 browser
variantov pomocníka 328 a 3/3 browser variantov metadát odpovede. Vonkajšia
kontrola fixture prešla a zachovala vnútorné 3/3/3 aj tri dôkazové bloky.
Existujúce Jest kontroly `E2ePageActivity` a `E2eServiceWorker.guard`: 52/52.
TypeScript frontendu aj explicitná kontrola celej E2E oblasti s projektovými
aliasmi a Node typmi, ESLint dotknutých súborov a `git diff --check` prešli.
Kolekcia ostáva 44 špecov / 762 variantov (254 na projekt); nevznikol nový živý beh.
Pred commitom sa lokálne kontroly vrátane izolovaných browser kontrol zopakovali
aj po aktualizácii vetvy na main `79f907bd` (K21), s rovnakým úspešným výsledkom.

**Po oprave nálezu z PR #261:** 124/124 Node kontrol a 42/42 izolovaných browser
variantov správy sledovaní, bez SKIP alebo retry. Existujúce dve Jest sady: 52/52.
TypeScript frontendu aj celej E2E oblasti a lint prešli. Produkčná kolekcia zostáva
44 špecov / 762 variantov. Tieto výsledky nie sú novým behom proti Railway.

**Návrh najbližšieho dohodnutého okna:** porovnať rovnakých šesť konkrétnych kľúčov
z K19, každý 3× natívne vo Windows a 3× v Dockeri (18 + 18 pokusov):
`search-mobile-cards` — svetlý desktopový dopyt, mobilný dopyt pri 393 px a mobilná
zmena rozmerov s otvoreným detailom; `offer-card-review-translations` — mobilné
de/light a pl/dark; `search-panel-fixture` — desktopový výber používateľa z panelu.
Presné názvy/varianty sa pred behom overia cez `--list`. Rovnaký main, verzia
Playwrightu, projekty, údaje, počty pokusov, workers=1 a retries=0 v oboch spôsoboch.
Bez prepisovania testov, zmeny asercií, timeoutov alebo zámeny ťuku za klik.
SKIP sa uvádza oddelene, nie ako úspešný pokus; porovnanie neprepisuje výsledok K19.
**Termín ešte nie je dohodnutý, porovnanie sa nespustilo.**

## Historický prehľad — 9. 11. 2026

Aktuálna pracovná vetva tejto dávky je **`e2e/k15-dym-a-dokazy`**, vytvorená
na výslovný pokyn majiteľa z aktuálneho main `b3d7983a`. Skoršia diagnostika
`e2e/209-diagnostika` už bola zlúčená cez PR #249; z nej pochádza zjednotené
odovzdanie. Pôvodná `e2e/dymova-sada` a PR #248 zostávajú iba historickou
revíziou. Súvisiace ďalšie opravy tejto dávky patria do tej istej novej vetvy.

Zjednotené odovzdanie: celý beh na `5bf32b26` **383 PASS / 22 FAIL / 351 SKIP**,
tri diagnostické opakovania každého nového pádu, nové dôkazy 223, doplnenie
ku K14, návrh sedem- až osemsúborového dymu s príkazmi a podmienený test 320.
Prijatý základ ostáva **427 / 2 / 303**; nový beh nie je prijatý. Výsledky nie
sú opravou aplikácie a plánované testy nie sú označené za hotové.

**Novšia dávka na K15:** značky `@smoke`, pasívna sonda cookies/udalostí 223,
diagnostický fixture pri dvoch chýbajúcich dôkazoch a regresia farieb 320 sú
implementované lokálne. Main `b3d7983a` bol majiteľom potvrdený ako nasadený;
počas merania sa nemení aplikácia ani účty. Výsledky a presné obmedzenia sú
v závere „K15 — zavedenie dymu a cielená diagnostika“. Historické návrhy nižšie
opisujú svoj vtedajší stav, nie aktuálny stav implementácie. Plný beh sa teraz
nespúšťa; najbližší až po nasadení K16 a novom potvrdení okna bez zmien.

## Ako sa beh spúšťa

- Testy sú v `frontend/e2e/` (v tejto E2E vetve 45 špecov / 780 variantov bežnej kolekcie, samostatný API kontrakt má vlastnú konfiguráciu a 3 projektové varianty; pomocníci v `frontend/e2e/support/`). Beží ich Playwright, Jest ich nezbiera.
- Bežia proti produkčnej inštancii na Railway (`https://stunning-inspiration-svap.up.railway.app`). Lokálny server sa nespúšťa: appka sa v produkčnom režime správa inak (napr. `Cache-Control: no-store`).
- Projekty: `webkit-desktop`, `webkit-mobile` (iPhone 15) a `chromium-desktop`. WebKit je povinný.
- Na Windows sa beh púšťa v Dockeri (Smart App Control blokuje WebKit): z priečinka `frontend` `npm run test:e2e:docker -- --workers=1 --retries=0` (celý beh trvá okolo 40 minút). Jeden projekt: `... -- --project=webkit-mobile`. Skript je `frontend/scripts/e2e-docker.js`, obraz je `mcr.microsoft.com/playwright:v<verzia>-noble`.
- Prihlásenie berie `frontend/.env.e2e` (šablóna `.env.e2e.example`, súbor je v `.gitignore` a nikdy sa nedáva do chatu ani do repozitára). Voliteľné: `E2E_PEER_SLUG` (zapína `messages-peer-profile.spec.ts`), `E2E_SESSION_KEEPER_SECONDS`.
- Prihlásenie platí 15 minút. Strážca (`support/sessionKeeper.ts`) ho obnovuje každých 300 s a prepisuje `e2e/.auth/user.json`. Neúspešné prihlásenie sa neopakuje: backend po 5 neúspešných pokusoch za 15 minút účet dočasne zamkne.
- Pred behom skontroluj, že Railway dokončil nasadenie najnovšieho `main` (opýtaj sa majiteľa) a že sa počas behu nič nezlučuje.

## Posledný prijatý stav

Beh 29. 10. 2026 po zlúčení vetvy 151 (backend Django 4.2.30), `--workers=1 --retries=0`, 39 minút:

| Výsledok | Počet |
| --- | --- |
| prešlo | 427 |
| padlo | 2 |
| preskočené | 303 |

Rovnaký súčet dali tri samostatné behy: `chromium-desktop` 130 / 0 / 114, `webkit-mobile` 168 / 1 / 75, `webkit-desktop` 129 / 1 / 114 (prešlo / padlo / preskočené). Preskočené sú väčšinou testy určené pre iný typ obrazovky. Oprava poznámky po kontrole pôvodného výpisu 8. 11.: sedem scenárov 209 v tomto prijatom behu prešlo; historické chyby prípravy z 28. 10. sa s týmto výsledkom nesmú zamieňať.

Od tohto behu sa zlúčila vetva 153 (len E2E úpravy: čakanie na ustálenú stránku `/search` a dôkazy pri páde). Prvý beh po jej nasadení je nový porovnávací stav, ak nemá nové pády.

## Známe jednorazové pády

Každý z nich prešiel pri samostatnom opakovaní. Podrobnosti a príčiny sú v zozname nálezov pri nálezoch 217 a 216.

1. `search-panel-return.spec.ts`, ponuky, `webkit-mobile`: po ťuknutí na autora ostala adresa `/search`. Príčina nie je známa, čaká na dôkazy z ďalšieho pádu.
2. `search-panel-return.spec.ts`, ľudia, `webkit-desktop`: odpoveď `/api/auth/search/global/` neprišla do 15 s. Príčina nie je známa.
3. `search-to-offer-watches.spec.ts`, tmavý variant, `webkit-desktop`: po kliknutí na Vyhľadávanie sa neukázalo vyhľadávacie pole. Vysvetlené (pomalá odpoveď `/api/auth/me/` na Railway), test teraz čaká na ustálenie stránky.
4. `search-country-scroll.spec.ts`, tmavý variant, Chromium: obnovená pozícia sa líšila o 14 px. Vysvetlené a opravené (stránka `/search` posiela hľadanie pri prvom načítaní dvakrát, nález 216; aplikácia sa nemenila).

## Pravidlo porovnania behov

Platí od 29. 10. 2026 a nahrádza pôvodné „tri čisté behy po sebe“, ktoré bolo pri náhodných pádoch nesplniteľné a blokovalo všetko ostatné.

1. Po dávke zmien (zlúčené vetvy a nasadenie na Railway) sa spustí jeden celý beh.
2. Výsledok sa porovná s posledným prijatým behom podľa dvojice „špec a názov testu, projekt“.
3. Nový pád (test, ktorý naposledy prešiel alebo bol preskočený) je chyba na vyšetrenie. Pád zo zoznamu známych pádov je len poznámka a pripíše sa mu výskyt.
4. Nový pád sa samostatne zopakuje (3×, rovnaké podmienky). Ak prejde vždy, ide o ďalší jednorazový pád: zapíše sa do zoznamu s dôkazmi. Ak padá, je to chyba testu alebo aplikácie a rieši sa. Opakovanie slúži len na diagnostiku, nie na to, aby sa beh zmenil na zelený.
5. Beh bez nových pádov je prijatý a stáva sa novým porovnávacím stavom.

## Bloky dôkazov

Špecy `search-country-scroll`, `search-panel-return` a `search-to-offer-watches` majú vypnutý trace, screenshot aj video (súkromie). Pri páde preto vypíšu a pripoja ako `failure-evidence` blok `[E2E-EVIDENCE] <test> | <projekt> | <čas>`: adresa (cesta bez ID, názvy parametrov), stav stránky (načítanie, panel, posun, aktívny prvok), požiadavky s časmi a stavmi a počty chýb stránky a konzoly. Žiadne telá odpovedí ani texty stránky v ňom nie sú a nesmú byť. Kód: `frontend/e2e/support/page-activity.ts` a `page-activity-format.ts`, Jest `E2ePageActivity.test.ts`.

## Čo sa osvedčilo a na čo si dať pozor

- Špecy, ktoré používajú `page.route` alebo `context.route`, musia mať `serviceWorkers: 'block'`, inak požiadavky vybavené service workerom obídu trasu. Stráži to Jest test `E2eServiceWorker.guard.test.ts`.
- `actionTimeout` (15 s) platí aj pre `page.waitForResponse` a časovač beží od vytvorenia sľubu, teda aj pred `page.goto`.
- Stránka `/search` posiela hľadanie pri prvom načítaní dvakrát. Pred meraním pozície alebo klikaním použi `waitForSearchSettled` (`support/search-settled.ts`).
- Chromium pri zmenšení rozloženia nad čitateľom posunie `scrollTop` (scroll anchoring), WebKit nie.
- Testy na Railway nič neodosielajú ani nemažú, pokiaľ to nie je výslovne dohodnuté. Odoslanie fotky v správach sa preto neskúša na Railway, ale lokálne.
- Tolerancie a timeouty meň len s dôkazom príčiny. Čakanie na stav stránky je v poriadku, predĺženie času „pre istotu“ nie.

## Otvorené nálezy, ktoré sa týkajú testov

Podrobnosti sú v `docs/zoznam-nalezov/ZOZNAM.md`:

- 209: historické chyby prípravy siedmich scenárov; v prijatom výpise z 29. 10. všetky prešli. Po znovuvytvorení hlavného účtu sú 8. 11. testovacie dáta opäť neúplné (pozri nižšie). To neurčuje príčinu každého pôvodného pádu.
- 216: stránka `/search` posiela hľadanie dvakrát (chyba aplikácie, rieši Claude).
- 219: dôkazy pri páde bez časového limitu pre snímku stránky (`page.evaluate`) a text hlášky v `search-settled.ts`.
- Register: položky v balíku „Nástroje a testy“ (napr. TEST-06, TEST-08).

## Diagnostika prípravy a relácie (30. 10. 2026)

Táto úprava nemení posledný prijatý stav, asercie, interval obnovy, retry ani timeouty aplikácie/testov. Nie je opravou príčiny predchádzajúcich 401/403 alebo nedokončených požiadaviek.

- Štrnásť špecov z posledných pádov používa `support/diagnostic-test.ts`. Automatický fixture zapne `observePage` pred `beforeEach`, teda aj pred prípravou údajov. Pri páde vytvorí jediný `[E2E-EVIDENCE]` blok a textovú prílohu; PASS, očakávaný pád a SKIP dôkazy nevytvárajú. Pôvodné ručné evidence hooks v troch search špecoch sú nahradené fixture; guard asercie zostali.
- Zber snímky stránky aj priloženie vlastných dôkazov majú samostatný rozpočet 1000 ms. To nie je predĺženie ani skrátenie limitu pôvodnej asercie. Chyba diagnostiky sa neprepisuje do výsledku testu.
- Nové výpisy používajú iba povolené statické segmenty ciest, názvy parametrov, HTTP metódy, stavy, kategórie, počty a časy. Neznámy segment je `:other`, neznámy parameter `:param`. Hodnoty parametrov sa nevypisujú; pri `q` zostáva len dĺžka.
- `support/session-diagnostics.ts` vedľa prihlasovacieho súboru ukladá iba anonymný `session-diagnostics.json` do ignorovaného `e2e/.auth/`. Nikdy nečíta cookies ani samotný storageState. Generácia rastie po úspešnom zápise stavu, nie po samotnom refreshi. Zaznamenáva najviac 40 udalostí obnovy/zápisu s časmi a bezpečnými stavmi; chýbajúci alebo poškodený sidecar znamená `snapshot=unavailable`.
- `[E2E-CONTEXT]` označuje prvé pozorovanie **už vytvoreného** kontextu a snímku pri páde. `[E2E-SESSION] relation=temporal-only` výslovne nepreukazuje, aké cookies kontext skutočne dostal. Sidecar je asynchrónny časový snímok a môže za zápisom zaostávať. Žiadne hashe tokenov, ID účtov ani obsah relácie sa nepridávajú.
- Diagnostikované špecy majú vypnuté trace, screenshot aj video. Fixture nastavuje `PLAYWRIGHT_NO_COPY_PROMPT`, pretože Playwright 1.63 inak automaticky číta `ariaSnapshot` do `error-context.md` aj pri vypnutom trace. Toto správanie stráži izolovaný self-test. **Štandardný Playwright report môže stále obsahovať pôvodné texty chýb alebo matcher errorContext. Na zdieľanie sú určené len whitelistované vlastné bloky, nie surové reporty a prílohy.**
- Global setup pri neúspešnom prihlásení nevypisuje ani nečíta text hlášky formulára. Počet prihlasovacích pokusov a pôvodná podmienka úspechu sa nemenia.

### Lokálne kontroly diagnostiky bez aplikácie a prihlásenia

Súbory v `e2e/diagnostics-tests/` používajú prípony `.check.ts` a `.scenario.ts`, nie `.test.ts` alebo `.spec.ts`; samotná diagnostika preto nepridáva varianty do hlavného produkčného behu. Node kontroly nespúšťa Jest. Izolovaná konfigurácia nemá globalSetup, nečíta `.env.e2e`, používa prázdny inline storageState a všetky požiadavky synteticky zachytáva na rezervovanej doméne `.invalid`. Nejde o funkčné testovanie aplikácie na lokálnom serveri.

Z `frontend` na Windows s bežiacim Dockerom:

```powershell
$env:E2E_DIAGNOSTICS_DOCKER='1'
$diagnosticChecks = Get-ChildItem -LiteralPath e2e/diagnostics-tests -Filter '*.check.ts' | ForEach-Object FullName
node node_modules/tsx/dist/cli.mjs --test --test-reporter=spec @diagnosticChecks
Remove-Item Env:E2E_DIAGNOSTICS_DOCKER
```

Docker self-test pripája nainštalované knižnice iba na čítanie a spúšťa ich presnú verziu bez doinštalovania cez npx. Overuje WebKit desktop, WebKit mobil a Chromium. Jeho **vnútorný** beh má zámerne 3 PASS / 3 FAIL / 3 SKIP: každý FAIL je riadený pád `beforeEach`, ktorý musí zostať neúspešný a vytvoriť presne jeden bezpečný dôkaz. Vonkajší kontrolný test má prejsť. Toto nie je nový produkčný výsledok ani oslabenie asercie.

Ďalší celý beh proti Railway spustiť až po potvrdení aktuálneho nasadenia a zákazu zlučovania počas behu; porovnávať podľa pravidla vyššie. Register nálezov a pridelenie čísel zostávajú v správe Claude.

## Testová oprava profilových adries (30. 10. 2026)

Základ vetvy `e2e/profilove-adresy`: potvrdený a nasadený main `e3ed0f4235f630cc9686dbccef7357f9485fda9e`. Nový main obsahuje Django 5.2.18, DRF 3.18.3 a backendové testovacie zmeny, nie zmenu frontendu. Rýchly hasher je iba pre pytest; produkčné E2E prihlásenie nemení.

- Pôvodný helper v `mobile-language-header.spec.ts` odmietal bodky v slugu, hoci ich backend generuje. Neprávom tak volil numerické ID. `support/own-profile-paths.ts` teraz overí vlastnú identitu, použije platný kanonický slug a numerický fallback dovolí iba pri chýbajúcom historickom slugu. Chybný prítomný slug vyvolá bezpečnú chybu bez jeho hodnoty.
- `support/own-profile-fixture.ts` prenáša z odpovede iba stav a vlastné ID/slug, nikdy ich neloguje. Overenie návratu porovná presnú doménu a cestu, nie prefix ani inú sekciu. Query a fragment nie sú predmetom kontroly sekcie; testy filtrov sa nemenia.
- Zo štyroch rozpracovaných lokálnych úprav pôvodného špecu sa týmto rieši bodkovaný slug a kontrola profilovej cesty. Náhrada `tap` za `click` ani presun čakania na locale sa nepreberajú: samy nedokazujú opravu samostatného problému prepínania jazyka/tlačidla Späť. Pôvodná pracovná kópia a jej staged zmeny ostali nedotknuté.
- `profile-numeric-language.spec.ts` samostatne stráži numerický hlboký vstup, dva režimy a zamýšľanú kontrolu po F5. Aplikačný pád nie je označený `test.fail`, vypnutý ani maskovaný zmenou adresy; skip zostáva iba pre iný typ obrazovky. Blokujú sa zápisy API okrem obnovy relácie.
- Pribudol jeden produkčný špec: aktuálna kolekcia má **42 špecov / 738 variantov**, po 246 na projekt. Samotné diagnostické kontroly sa do nej nezbierajú. Posledný prijatý celý beh **427 / 2 / 303 sa nemení**; toto nie je nový celý ani prijatý beh.

### Overenie opravy testov

Cielený beh cez kanonický Docker skript, `--workers=1 --retries=0`, výber `profile-section|language app Back and browser Back|desktop: retains|číselná adresa`:

| Projekt | Prešlo | Padlo | Preskočené | Trvanie projektu |
| --- | ---: | ---: | ---: | --- |
| webkit-desktop | 12 | 0 | 16 | 24,6 s |
| webkit-mobile | 13 | 3 | 12 | 1 min 58,6 s |
| chromium-desktop | 12 | 0 | 16 | 12,8 s |
| **Spolu** | **37** | **3** | **44** | **2 min 52,8 s** |

Celkové trvanie procesu vrátane spustenia: 2 min 59 s. Preskočené varianty sú určené pre iné rozloženie.

Všetky tri pády sú nové kľúče oproti prijatému porovnaniu; nejde o známe pády č. 1–4. Numerické varianty sú nové pokrytie už skôr pozorovaného problému, nie dôkaz novej regresie alebo dôsledku aktualizácie Django. Cielene sa zopakovali po trikrát v projekte `webkit-mobile`, bez automatických retry. Diagnostické opakovanie trvalo 1 min 47,7 s a nemení pôvodný výsledok:

| Špec a test | Výsledok troch opakovaní | Rozlíšenie |
| --- | --- | --- |
| `mobile-language-header.spec.ts` — `Language header – pl / dark › mobile: profile-section has one centered title, no profile shortcut, and six choices` | PASS / PASS / PASS | Pôvodne zlyhal prípravný GET `/api/auth/me/`; opakovania neoprávňujú príčinu označiť za opravenú. |
| `profile-numeric-language.spec.ts` — `mobile: light číselná adresa zachová jazykovú podstránku aj po F5` | FAIL / FAIL / FAIL | Dvakrát strata jazykovej podstránky, raz zlyhanie siete už počas prípravy. |
| `profile-numeric-language.spec.ts` — `mobile: dark číselná adresa zachová jazykovú podstránku aj po F5` | FAIL / FAIL / FAIL | Trikrát strata jazykovej podstránky; v úvodnom behu zlyhala sieťová príprava. |

Lokálne kontroly: **43/43** Node kontrol vrátane izolovaného Docker self-testu diagnostiky v troch projektoch, **71/71** existujúcich Jest kontrol infraštruktúry, TypeScript aplikácie aj explicitne oboch produkčných špecov a `git diff --check` prešli. Nový čistý pomocník má pokrytie **100 % riadkov, 97,44 % vetiev, 100 % funkcií**; nie je to údaj o pokrytí celej aplikácie. Lokálne kontroly pracujúce so súbormi sa na Windows spúšťali mimo obmedzenia, ktoré blokovalo premenovanie dočasných súborov.

### Podklad chyby aplikácie pre Claude

**Názov:** Numerická adresa vlastného profilu stratí jazykovú podstránku.

**Špec/projekt:** `profile-numeric-language.spec.ts`, oba režimy, `webkit-mobile`.

**Kroky:** Prihlásený vlastník otvorí `/dashboard/users/:id/language` cez svoje číselné ID.

**Očakávané:** Jazyková podstránka ostane otvorená, prípadne sa zmení len identifikátor na kanonický slug so zachovaním `/language`.

**Skutočné:** Po úvodnej kanonizácii ostane základný profil `/dashboard/users/:id` s parametrom `tab`, jazyková hlavička chýba. Etapa F5 sa kvôli tomuto prvému pádu ešte neoverila.

**Opakovateľnosť:** **6/6 pokusov, ktoré dokončili prípravu a otvorili numerický vstup**, spojené oba režimy a oba behy. Ďalšie 2/8 numerických pokusov skončili už pri sieťovej príprave; nie sú dôkazom tohto UI problému.

**Podozrivé miesto, nie zásah Codexu:** route `frontend/src/app/dashboard/users/[userId]/language/page.tsx` podporuje ID aj slug. V `frontend/src/components/dashboard/hooks/useDashboardUserProfile.tsx:234` sa však počiatočná podsekcia aplikuje len pri zhode so slugom; vetva numerickej kanonizácie pri riadkoch 342–345 zvolí základný profil. Overí a opraví Claude na svojej vetve.

Reprezentatívny bezpečný blok z opakovania numerického vstupu:

```text
[E2E-EVIDENCE] Numerický vstup do vlastného jazyka › mobile: light číselná adresa zachová jazykovú podstránku aj po F5 | webkit-mobile | 11.3 s
url: /dashboard/users/:id [tab]
page state: readyState=complete viewerReady=true loadingMarkers=0 panelAriaHidden=n/a
document timing (ms since navigation start): domContentLoaded=225 load=288
scroll root: scrollTop=0 scrollHeight=1610 clientHeight=659
active element: [omitted]
requests (ms since test start):
17  GET  /dashboard  200  109 ms
458  GET  /api/auth/me/  200  95 ms
617  GET  /api/auth/feed/posts/  200  179 ms
619  GET  /api/auth/messaging/conversations/unread-summary/  200  141 ms
622  GET  /api/auth/notifications/unread-count/ [type]  200  130 ms
925  GET  /api/auth/me/  200  81 ms
1011  GET  /dashboard/users/:id/language  200  81 ms
1311  GET  /api/auth/me/  200  97 ms
1451  GET  /api/auth/dashboard/users/:id/skills/  200  152 ms
1454  GET  /api/auth/messaging/conversations/unread-summary/  200  139 ms
1456  GET  /api/auth/notifications/unread-count/ [type]  200  140 ms
page errors: 0 | console errors: 0
[E2E-CONTEXT] moment=first-observed at=1793367092594 relation=temporal-only
[E2E-SESSION] snapshot=available observedAt=1793367092594 runStartedAt=1793367086572 generation=1 storedAt=1793367086572 relation=temporal-only
[E2E-SESSION] kind=initial-storage at=1793367086572 attempt=0 generation=1 status=n/a errorKind=n/a
[E2E-CONTEXT] moment=failure-observed at=1793367103900 relation=temporal-only
[E2E-SESSION] snapshot=available observedAt=1793367103900 runStartedAt=1793367086572 generation=1 storedAt=1793367086572 relation=temporal-only
[E2E-SESSION] kind=initial-storage at=1793367086572 attempt=0 generation=1 status=n/a errorKind=n/a
```

Samostatne zostáva neurčená príčina občasného sieťového zlyhania už pri príprave. Z blokov je preukázaná neúspešná požiadavka, nie pôvod chyby v Railway, prehliadači alebo aplikácii. Nezvyšovali sa timeouty, nepridali sa retry ani náhradné prihlasovanie. Reprezentatívny blok:

```text
[E2E-EVIDENCE] Language header – pl / dark › mobile: profile-section has one centered title, no profile shortcut, and six choices | webkit-mobile | 23.7 s
url: /dashboard
page state: readyState=complete viewerReady=true loadingMarkers=0 panelAriaHidden=n/a
document timing (ms since navigation start): domContentLoaded=262 load=487
scroll root: scrollTop=0 scrollHeight=10515 clientHeight=640
active element: [omitted]
requests (ms since test start):
21  GET  /dashboard  200  161 ms
569  GET  /api/auth/me/  200  81 ms
710  GET  /api/auth/feed/posts/  200  119 ms
712  GET  /api/auth/messaging/conversations/unread-summary/  200  80 ms
714  GET  /api/auth/notifications/unread-count/ [type]  200  76 ms
1069  GET  /api/auth/me/  FAILED(failed)  22609 ms
9069  GET  /api/auth/feed/posts/:n/  FAILED(failed)  14621 ms
9070  GET  /api/auth/feed/posts/:n/  FAILED(failed)  14618 ms
20714  GET  /api/auth/notifications/unread-count/ [type]  FAILED(failed)  2963 ms
20716  GET  /api/auth/notifications/unread-count/ [type]  FAILED(failed)  2962 ms
20717  GET  /api/auth/messaging/conversations/unread-summary/  FAILED(failed)  2973 ms
page errors: 0 | console errors: 22
[E2E-CONTEXT] moment=first-observed at=1793366898646 relation=temporal-only
[E2E-SESSION] snapshot=available observedAt=1793366898646 runStartedAt=1793366835236 generation=1 storedAt=1793366835236 relation=temporal-only
[E2E-SESSION] kind=initial-storage at=1793366835236 attempt=0 generation=1 status=n/a errorKind=n/a
[E2E-CONTEXT] moment=failure-observed at=1793366922341 relation=temporal-only
[E2E-SESSION] snapshot=available observedAt=1793366922341 runStartedAt=1793366835236 generation=1 storedAt=1793366835236 relation=temporal-only
[E2E-SESSION] kind=initial-storage at=1793366835236 attempt=0 generation=1 status=n/a errorKind=n/a
```

**Ďalší krok:** majiteľ odovzdá aplikačný podklad Claudovi. Po jeho oprave a potvrdenom nasadení sa zopakuje číselný vstup vrátane F5 a dotknuté profilové návraty; až následný celý beh môže aktualizovať prijatý porovnávací stav. Táto dávka neopravuje predchádzajúci nález pri samotnom prepínaní jazyka/tlačidle Späť.

## Ako nahlásiť chybu aplikácie

Pozri koniec `AGENTS.md`. Krátky popis pošle majiteľovi, ten ho odovzdá Claudovi.

## Porovnanie jazykového špecu a diagnostika ťuku (31. 10. 2026)

Základ: čerstvo overený main `e261243825a4625f6bfd38079aa4ecd0d5d3c660`, majiteľom potvrdené nasadenie a zákaz zmien počas porovnania. Toto nie je nový celý ani prijatý beh; porovnávací stav **427 / 2 / 303 sa nemení**.

- V jednom fyzickom Docker kontajneri s Playwright 1.63.0 prebehli striedavo tri spustenia historického `mobile-language-header.spec.ts` z `9346520e` a tri spustenia aktuálneho špecu. Každé vybralo iba dva testy `mobile: light/dark language changes update the top title and survive reload`, projekt `webkit-mobile`, `--workers=1 --retries=0`.
- Historická kópia mala zhodný Git blob `e517a74f9c331975718b4342863cecf51d0ab323`; aktuálna pred doplnením diagnostiky `29ba48d8de013657c1f728dcac3fdde1eb688eed`. Ostatné závislosti, konfigurácia, pomocníci, preklady a nasadená aplikácia boli spoločné aktuálne. Nešlo o spustenie celej historickej aplikácie ani celého historického testového prostredia.
- Starý špec: svetlý **FAIL/FAIL/FAIL**, tmavý **FAIL/FAIL/FAIL**. Aktuálny špec: svetlý **FAIL/FAIL/FAIL**, tmavý **FAIL/FAIL/FAIL**. Všetkých 12 pokusov skončilo na rovnakej asercii pre preložené tlačidlo Späť (historicky riadok 77, aktuálne pred diagnostikou 60). Porovnanie nepotvrdilo regresiu zavedenú novším špecom; samo osebe nerozhoduje medzi pôvodnou chybou testu a aplikácie/prehliadača.
- A/B beh trval 3 min 26 s (2026-10-31 06:54:57.272–06:58:23.312 UTC). Dočasná historická kópia bola odstránená; hlavná kolekcia zostáva **42 špecov / 738 variantov**.

`support/language-tap-diagnostics.ts` teraz pasívne sleduje iba šesť mobilných jazykových volieb v uvedených dvoch testoch. Nevyvoláva ani neruší udalosti, nevolá API, nečíta cookies či texty stránky a nič neukladá do úložiska. Výstup `[E2E-TAP]` povoľuje len enumy, booleany, počty a časy (najviac 80 udalostí). Medzi pôvodným `.tap()` a aserciou nie je nové čakanie ani náhradná akcia. Snímky vznikajú až po aserciách pred F5 a vo `finally`; samostatné rozpočty diagnostiky nemenia limit asercie a jej chyba nezakryje pôvodný pád.

Následné tri diagnostické vykonania každého variantu (`--repeat-each=3 --retries=0`) dali **0 PASS / 6 FAIL / 0 SKIP**, 118 s procesu:

- V piatich pokusoch pozorovateľ zachytil dôveryhodné pointer/touch udalosti pre SK aj CZ, ale žiadny `click`. Úložisko aj označená voľba ostali SK; asercia českého tlačidla Späť preto neprešla. Prečo `click` nevznikol, ešte nie je preukázané; samotné `preventDefault` ani chybu prekladu z týchto údajov nemožno označiť za príčinu.
- Posledný tmavý variant sa odlišoval: po úvodnej voľbe SK skončilo čakanie na locale; zachytili sa sieťové chyby, následné 401 a POST `/api/token/refresh/` 403. Snímka pádu **2026-10-31 07:10:09.741 UTC**. Nezlučovať automaticky s príčinou chýbajúceho kliku; súvis s nálezom 223 má preveriť Claude.

Lokálne kontroly: 11 Node kontrol formátu/súkromia a zachovania gesta, izolovaný self-test vo WebKite desktop, WebKite mobile a Chromiu (**3/3 PASS**), explicitný TypeScript E2E súborov, TypeScript aplikácie a cielený ESLint s `next/core-web-vitals`. Izolovaný self-test nečíta `.env.e2e`, nemá prihlasovanie a všetky požiadavky vybaví na `diagnostic.invalid`.

Ďalších päť produkčných špecov sa podľa zadania nemenilo. Diagnostika je podklad, nie oprava aplikácie, dôkaz celkovej chyby aplikácie ani dôvod nahradiť `.tap()` za `.click()`. Ďalší krok: oddelene overiť, prečo tento WebKit nevytvorí `click`, bez oslabovania pôvodného scenára; autentifikačné dôkazy odovzdať majiteľovi pre Claude.

## Nálezy 225 a 223 — izolovaný pokus a sieťová sonda (31. 10. 2026)

Základ tejto pokračujúcej úlohy je nový main `0905aeddf284b41ccaf879ba079683dcf6ac3261` (PR #217), majiteľom potvrdený ako nasadený a bez zmien počas merania. Predchádzajúce poznámky vyššie sú historické výsledky pred týmto pokusom. Prijatý celý stav **427 / 2 / 303 sa nemení**.

### 225 — podmienka výnimky sa potvrdila

- `diagnostics-tests/language-properties.scenario.ts` je samostatný pokus na `diagnostic.invalid`, nie produkčný regresný špec. Porovnáva natívne DOM a React 18 tlačidlo v troch kolách: bez vlastností, iba `tabindex=-1`, iba `pointerdown.preventDefault`, obe vlastnosti. Mobilný WebKit skúša tap aj click, desktopový WebKit a Chromium click ako kontrolu. Spolu 96 pozorovaní; všetky tri projekty dokončili pokus. Pevné 500-ms okno iba meria udalosti izolovaného pokusu, nemení produkčný timeout.
- Pri mobilnom tap sa click vytvoril 3/3 bez vlastností a 3/3 s iba tabindex, ale 0/3 s preventDefault aj 0/3 s oboma vlastnosťami, zhodne pre natívne aj React tlačidlo. Handler preventDefault sa skutočne vykonal. Priamy click fungoval všade 3/3; desktopové kontroly tiež.
- Majiteľ potvrdil, že na skutočnom iPhone jazyk funguje, a výslovne povolil click iba po takomto preukázaní. Preto sa **iba krok výberu jazykovej voľby** v dvoch testoch `mobile: light/dark language changes update the top title and survive reload` mení na `.click()` s komentárom a odkazom na 225. Nie ticho, nie globálnou náhradou tap, nie zmenou aplikácie. Ostatné gestá, asercie vrátane šiestich jazykov a F5, tolerancie, timeouty a retry ostali nezmenené. Lokálny guard stráži zdôvodnenie aj pôvodné asercie.
- Cielené overenie proti potvrdenému nasadeniu: webkit-mobile, oba varianty po trikrát, workers=1, retries=0: **6 PASS / 0 FAIL / 0 SKIP**, report 42,0 s, proces približne 50 s. Toto nie je nový celý beh.

### 223 — mimo Playwrightu sa výpadok nezopakoval

- `diagnostics-tests/railway-network.probe.cjs` používa iba Node https: verejné GET `/` a `/api/`, približne každých 10 s, strieda nové a keep-alive spojenia, deadline 30 s. Bez prihlasovania, cookies, čítania .env, tiel a hlavičiek odpovedí, presmerovaní alebo automatických retry. Výstup sú len pevné kategórie, stavy a časy DNS/TCP/TLS/prvého bajtu/celku.
- Node sonda aj izolovaný browser pokus vyššie bežali v tom istom kontajneri s Playwright 1.63.0. UTC **2026-10-31 13:06:15.750–13:16:15.898**, monotónne 600 288 ms: **122/122 HTTP 200**, **0 transportných chýb**, **0 timeoutov**, **0 volaní nad 10 s**. Dve merania prekročili 2 s, maximum bolo 2 843,6 ms. Existujúce spojenie sa reálne použilo 58×. Kontajner sa po sonde odstránil.
- Mediány frontend nové/keep-alive: 239,9/104,6 ms; API nové/keep-alive: 189,6/74,7 ms. Maximum API 2 775,2 ms. Všetky stavy sa počítajú, HTTP chyba sa odlišuje od transportnej.
- Toto zužuje ďalšie preverovanie, **nepreukazuje však definitívne príčinu vo WebKite alebo relácii**. Verejné Node volanie bez autentifikácie netestuje JWT obnovu ani úplne rovnaký prehliadačový protokol a aplikačnú cestu. Nález 223 sa neuzatvára. Následné overenie dvoch produkčných jazykových testov bežalo samostatným kanonickým Docker skriptom s rovnakým obrazom, nie s prihlasovacími údajmi v sonde.

Lokálne kontroly: 5/5 Node testov sondy (aj vynútený timeout a chyby bez siete), 11/11 kontrol diagnostiky a výnimky 225, cielený aj úplný TypeScript aplikácie a cielený ESLint. Hlavná kolekcia zostáva 738 variantov v 42 špecoch; produkčné `.spec.ts` varianty nepribudli. Register nálezov vlastní Claude a v tejto dávke sa nemenil.

### 224 — vedome odložené

Nález „Zatvoriť po F5 vedie na Nástenku“ sa teraz neopravuje ani sa nepridáva produkčný test pred odloženou opravou. Pri budúcej oprave treba pripraviť samostatný E2E scenár: **vlastný profil → Menu → Jazyk → F5 → Späť → Zatvoriť → pôvodný profil**, nie Nástenka, a jeho úspech overiť po potvrdenom nasadení opravy. Ide o budúcu úlohu; neopomenúť F5 ani záverečné Zatvoriť.

Ďalší krok pre 223: porovnať verejné volania zo samotného WebKitu a z Node v rovnakom čase, prípadne následne samostatne preveriť reláciu. Ďalších päť odložených produkčných špecov zostáva nezmenených. Nič sa nezlučuje ani nenasadzuje automaticky.

## Odpovede servera a odmietnutá obnova — nález 223 (6. 11. 2026)

Základ vetvy `e2e/223-dokazy`: aktuálny main `2e84867e`. Mení sa iba diagnostika E2E, nie aplikácia, prihlásenie, asercie, retry ani časové limity testov. Táto úprava nie je opravou príčiny 223 a nemení prijatý celý porovnávací stav.

### Nové polia v bloku `[E2E-EVIDENCE]`

Pôvodný riadok požiadavky ostáva nezmenený. Pod ním sa pri **každej prijatej odpovedi obnovy** `/api/token/refresh/` (aj historický alias `/api/auth/token/refresh/`) a pri **každej pozorovanej odpovedi s trvaním striktne nad 5000 ms** doplní:

```text
        X-App-Duration-Ms: 12
```

- Číta sa len táto jedna hlavička, nie celé hlavičky či telo. Uchová sa iba nezáporné celé bezpečné číslo; hodnota `0` je platná. `chýba` znamená chýbajúcu alebo neplatnú číselnú hodnotu, `nezistiteľné` neúspešné alebo neukončené odčítanie. Surová hodnota neplatnej hlavičky sa nikdy nevypíše.
- Bežné trvanie požiadavky je meranie z prehliadača; `X-App-Duration-Ms` je odlišné meranie spracovania v Djangu. Rozdiel sám neurčuje príčinu problému.
- Hlavičky sa odčítajú pri udalosti odpovede, nie až po tele. Ak hlavičky prišli, ale telo ešte visí dlhšie než 5 s, serverové trvanie zostáva dostupné. Požiadavka bez prijatej odpovede ostáva `pending`, bez vymyslenej serverovej hodnoty.
- Zachová sa posledných 40 bežných záznamov **aj všetky staršie prijaté obnovy/pomalé odpovede**, aby podstatná odpoveď nezmizla za neskorším pollingom. Súčet `older omitted` odráža iba skutočne vynechané riadky.

Len pri odpovedi **401 alebo 403 na obnove** navyše:

```text
        refresh cookies: access_token,auth_state,csrftoken,refresh_token
        refresh X-CSRFToken: áno
```

- `refresh cookies` obsahuje jedinečné zoradené **názvy**, nikdy hodnoty, domény, cesty ani expirácie. Odčítanie kontextu sa začne súbežne s hlavičkou hneď pri pozorovaní odmietnutej odpovede. Je to asynchrónny snímok kontextu v tomto čase, nie dôkaz cookies skutočne odoslaných v hlavičke `Cookie`.
- Pevné povolené názvy: `access_token`, `refresh_token`, `auth_state`, `csrftoken`, `sessionid`, `google_oauth_state`, `google_oauth_nonce`, `csrf_token`, aj ich prefixy `__Host-` a `__Secure-`. Neznámy názov sa vypíše iba ako `other`, pretože aj názov môže niesť identifikátor. `žiadne` znamená úspešne odčítaný prázdny zoznam, `nezistiteľné` neúspešné odčítanie. Hodnota cookie sa neprečíta do vlastného diagnostického záznamu.
- `refresh X-CSRFToken` patrí k **požiadavke danej odmietnutej odpovede**: `áno` = hlavička bola prítomná (aj prázdna), `nie` = preukázateľne chýbala, `nezistiteľné` = nedala sa odčítať. Hodnota tokenu sa nikdy neuchová ani nevypíše.
- Úspešná obnova ani iná odpoveď 401/403 cookies či CSRF neodčítavajú. Nepoužíva sa `allHeaders`, telá, text odpovede ani ukladanie celého kontextu.

Odčítania majú vlastný rozpočet 1000 ms, začínajú súbežne a neblokujú sieťové požiadavky ani pôvodné asercie. Report čaká na rozpracované odčítania súbežne s už ohraničenou snímkou stránky, nie sériovo. Chyba odčítania ani zatvorený kontext neprekryjú pôvodný pád. Zdieľacie nástroje, ktoré whitelistujú riadky dôkazov, musia zachovať aj tri nové vyššie opísané riadky; nesmú kvôli tomu povoľovať surové hlavičky.

### Lokálne overenie bez Railway

Pomocníci: `support/response-diagnostics.ts` a `response-diagnostics-format.ts`. Nové kontroly sú v `diagnostics-tests/response-diagnostics.check.ts`; izolovaný browser pokus má samostatný `.scenario.ts`, konfiguráciu a `response-diagnostics-browser.check.ts`. Nepridáva produkčné varianty, nečíta `.env.e2e`, nemá global setup ani účet a všetky požiadavky synteticky zachytí na `diagnostic.invalid`.

Z `frontend`:

```powershell
node node_modules/tsx/dist/cli.mjs --test --test-reporter=spec e2e/diagnostics-tests/response-diagnostics.check.ts e2e/diagnostics-tests/page-activity.check.ts
node node_modules/tsx/dist/cli.mjs --test --test-reporter=spec e2e/diagnostics-tests/response-diagnostics-browser.check.ts
```

Kontroly zahŕňajú chýbajúcu/neplatnú hlavičku, hranicu 5000/5001 ms, pomalé nedokončené telo, všetky tri stavy CSRF, prázdne či neodčítateľné cookies, ochranu starších odpovedí aj výpis a prílohu. Cookie s getterom `value`, ktorý by test zhodil, dokazuje, že sa číta iba `name`; súkromné syntetické značky nesmú byť ani vo výpise, ani v prílohe. Browser pokus kontroluje 401, 403, úspešnú obnovu a skutočne oneskorenú syntetickú odpoveď vo WebKite desktop, WebKite mobile a Chromiu. Docker dostane knižnice iba na čítanie; surový report sa nevypisuje.

Dlhý ani prihlasovaný beh proti Railway sa v tejto úlohe nespúšťa. Pri 223 sa naďalej čaká na HTTP logy Railway.

Lokálne overenie: 42/42 Node kontrol novej diagnostiky a existujúcich page/deadline/session poistiek, 52/52 existujúcich Jest kontrol formátu a service workerov, TypeScript aplikácie aj explicitne nových E2E súborov, cielený ESLint a `git diff --check` prešli. Nové dva pomocníky majú 97,98 % riadkov / 96,39 % vetiev / 100 % funkcií; nejde o pokrytie celej aplikácie. Izolovaná browser kontrola prešla 3/3 projektov. Existujúci self-test fixture navyše zachoval svoje riadené PASS/FAIL/SKIP a po jednom bezpečnom bloku pri úmyselnom páde prípravy. Kolekcia na tomto maine má 43 špecov / 756 variantov, po 252 na projekt; táto diagnostika nepridáva produkčné testy.

## Počty prvej stránky konverzácií — 209(b), 8. 11. 2026

`messages-peer-profile.spec.ts` zachováva pôvodný výber aj tvrdé chyby prípravy.
`requirePeerConversation` nad jedinou pôvodnou odpoveďou API priloží a vypíše:

```text
[E2E-PEER] firstPage=4 slugMatches=1 deletedMatches=0 namedMatches=1 nameMatches=1
```

- `firstPage`: všetky konverzácie na prvej stránke, bez načítania ďalšej.
- `slugMatches`: priame konverzácie so zhodou nakonfigurovaného slugu.
- `deletedMatches`: koľko týchto zhôd má pravdivý príznak odstránenia.
- `namedMatches`: koľko zhôd nie je odstránených a má neprázdne meno.
- `nameMatches`: počet priamych aj skupinových riadkov s menom pôvodného prvého
  aktívneho kandidáta (bez odstránených používateľov). Bez mena je 0.

Do diagnostiky nikdy nejde ID, meno, slug, telo odpovede ani hodnoty cookies.
Chybné diagnostické hodnoty majú iba pevný výstup `counts=unavailable`; chyba
prílohy nemení pôvodný výsledok. Priloženie má samostatný rozpočet 1000 ms.
Špec používa existujúci bezpečný evidence fixture vrátane prípravy; pri páde
nevytvára screenshot, trace ani textový snímok stránky.

Počty v Správach samy nepotvrdzujú dostupnosť verejného profilu. Odpoveď
„vidí profil E2E_PEER_SLUG: áno/nie“ treba doložiť profilovým krokom alebo
samostatne dohodnutým čítaním jeho prístupnosti. Súkromie je platný stav, nie
automaticky chyba aplikácie či nestabilita prostredia; účet sa kvôli testu
automaticky neprepína na verejný.

Lokálne kontroly bez env, prihlásenia a siete Railway:

**Podmienka:** nasledujúce dva príkazy vyžadujú kód z
`e2e/209-diagnostika` (teraz spoločná vetva) alebo main až po jeho zlúčení.
V pôvodnej samostatnej `e2e/dymova-sada` na `d8e2b566` tieto súbory neboli.
Najprv treba získať správnu vetvu/revíziu a závislosti podľa zámku; až potom
spustiť príkazy z jej `frontend`. Nie sú samostatne použiteľným návodom pre
čistý checkout pôvodnej dokumentačnej vetvy.

**Docker pre druhý príkaz:** musí byť spustený Docker engine a vopred lokálne
stiahnutý image `mcr.microsoft.com/playwright:v<verzia>-noble`. `<verzia>` musí
presne zodpovedať nainštalovanému `@playwright/test` z `node_modules` (zistí sa
cez `node -p "require('@playwright/test/package.json').version"`), nie rozsahu
verzií v `package.json`. Browser kontrola používa `docker run --pull=never`;
chýbajúci image sama nestiahne. Ak chýba, treba ho pripraviť samostatne pred
kontrolou. Prvý, čisto Node príkaz Docker nepotrebuje.

```powershell
node node_modules/tsx/dist/cli.mjs --test --test-reporter=spec e2e/diagnostics-tests/peer-conversation.check.ts
node node_modules/tsx/dist/cli.mjs --test --test-reporter=spec e2e/diagnostics-tests/peer-conversation-browser.check.ts
```

Izolovaný browser pokus zachytáva všetky požiadavky na syntetickej `.invalid`
a overuje aj serializáciu helpera cez `page.evaluate` vo všetkých troch
projektoch. Nepridáva varianty do hlavného produkčného behu.

### Pokus o celý beh na main `92fb1b7d`

Majiteľ potvrdil nasadenie aj okno bez zmien. Pokus 8. 11. 2026 o
19:12:50.929 UTC cez kanonický príkaz (`workers=1`, `retries=0`) skončil
po 9 s v `global-setup.ts:44`, keď prihlasovací formulár oznámil chybu.
Nespustil sa žiadny test ani projekt; toto nie je celý ani prijatý beh,
nová chyba aplikácie alebo dôkaz nedostupnosti druhého účtu. Pôvodný
porovnávací stav ostáva nezmenený.

Bol len jeden prihlasovací pokus, bez automatického opakovania. Text
formulára ani odpoveď servera sa nečítali; `E2E-EVIDENCE` pre globálnu
prípravu nevznikol. Pred ďalším pokusom má majiteľ preveriť bežné
prihlásenie hlavného E2E účtu; ďalšie nasadenie a okno bez zmien sa
potvrdia pred pokračovaním. Dostupnosť `E2E_PEER_SLUG` zatiaľ nie je
overená, nemožno ju poctivo označiť áno ani nie.

Po výslovnej výzve majiteľa „skús teraz“ bol povolený jeden nový pokus.
Main po novom fetchi ostal `92fb1b7d`. Spustenie 8. 11. 2026 o
19:19:36.791 UTC skončilo po 6 s rovnakým výsledkom `alert` v globálnej
príprave (nie timeout), opäť 0 spustených testov. Nejde o automatický retry
predošlého behu ani nový výsledok kolekcie. Ďalšie prihlásenie sa nespúšťa,
kým sa nepreverí jeho príčina; samotný `alert` nedokazuje nesprávne heslo.

Pri nasledujúcom celom behu osobitne sledovať mobilné
`mobile-settings-navigation.spec.ts` a `mobile-settings-offer-watch-motion.spec.ts`
(zmenené Nastavenia v K9 a K14) a oba špecy zdieľania s kontrolou upratania
(K12, zámky pri súbehu, nález 246). HTTP 500 nesmie byť maskované ďalším mazaním.

Až potom samostatne dohodnúť vykonanie pokrytia 295: syntetické fotky do
príspevku, portfólia a ponuky s uprataním; skutočné BMP/TIFF vrátane prezlečenia
za `.jpg`; načítanie fotky prihláseného súkromného autora (274); viditeľná
náhrada po zlyhaní (279, K11). Správy iba medzi dvoma dohodnutými testovacími
účtami. Starý multipart endpoint ponúk (301) UI nevolá a týmto pokrytý nebude.
Nastavenia súkromia sa bez dohody nemenia; dostupná konverzácia automaticky
neznamená dostupný cudzí profil.

### Prihlásenie prešlo, beh bol na pokyn majiteľa ukončený

Tretí, znovu výslovne povolený pokus začal 8. 11. 2026 o 19:22:45.924 UTC
na nezmenenom maine `92fb1b7d`. Prihlásenie tentoraz prešlo. Až počas behu
majiteľ potvrdil, že hlavný E2E účet bol vymazaný a vytvorený znova, a rozhodol
beh ukončiť a najprv obnoviť testovacie dáta. Pôvodná identita a jej dáta
sa preto nesmú predpokladať ani pri zachovaní rovnakej prihlasovacej adresy.

Prvý SIGINT adresovaný vlastnému kontajneru sa neprejavil zastavením testov;
druhý bol poslaný priamo jedinému overenému Playwright CLI procesu v tomto
kontajneri. Ten skončil so stavom 130 a uložil report. Iné kontajnery,
aplikácia, testové podmienky ani súkromie účtov sa nemenili.

| Projekt | Prešlo | Padlo | Skutočný SKIP | Prerušené | Nespustené |
| --- | ---: | ---: | ---: | ---: | ---: |
| webkit-desktop | 88 | 14 | 150 | 0 | 0 |
| webkit-mobile | 32 | 8 | 27 | 1 | 184 |
| chromium-desktop | 0 | 0 | 0 | 0 | 252 |
| **Spolu** | **120** | **22** | **177** | **1** | **436** |

Proces trval 17 min 32 s; report 17 min 26,3 s. Desktopový WebKit 13 min
1,3 s, mobilný 4 min 12,6 s; Chromium nezačal. Štandardný HTML súčet SKIP
zahŕňa aj nevykonané a prerušené prípady; tabuľka ich odlišuje podľa
skutočných výsledkov pokusov. Toto **nie je celý ani prijatý porovnávací
beh**. Pôvodný stav 427 / 2 / 303 ostáva nezmenený. Nové pády sa na pokyn
majiteľa zatiaľ neopakovali; nie všetky sú automaticky vysvetlené dátami.

Potvrdené čiastočné výsledky:

- Hlavný účet **vidí profil E2E_PEER_SLUG: áno** — priamy scenár cudzieho
  profilu po F5 vrátane recenzií prešiel 1/1 v desktopovom WebKite. Opačný
  smer ani ostatné projekty sa tým nepotvrdzujú.
- Oba mobilné scenáre Správ skončili na príprave (2/2): zoznam konverzácií
  vrátil HTTP 200, všetkých päť počtov bolo 0. Nešlo o chybu siete, 401 ani
  403 v týchto dvoch konkrétnych pokusoch. Profilový krok sa ešte nevykonal.
- `mobile-settings-navigation.spec.ts` 1/1 a
  `mobile-settings-offer-watch-motion.spec.ts` 3/3 na mobile prešli.
- Zdieľanie z Nástenky prešlo 2/2 (WebKit desktop/mobile); všetky štyri
  známe vytvorené príspevky boli odstránené (4 kontroly HTTP 204). Zdieľanie
  z profilu zlyhalo v oboch prípadoch na riadku 78 pred otvorením dialógu a
  POST, teda nič nevytvorilo. Pri prerušení bežal nezápisový test prekladov.
  Toto samo nepotvrdzuje samostatný súbehový scenár 246.

Skutočný nový blok 209(b), zhodný v oboch pokusoch:

```text
[E2E-PEER] firstPage=0 slugMatches=0 deletedMatches=0 namedMatches=0 nameMatches=0
```

Následná inventúra o 19:43:12.339 UTC použila iba existujúcu reláciu
Playwright API klienta a GET; bez nového prihlásenia alebo čítania `.env.e2e`.
HTTP 200 potvrdil verejný hlavný účet, 0 ponúk/dopytov, 0 portfólií,
0 sledovaní, 0 konverzácií a 0 vlastných/zdieľaných príspevkov na celej
jedinej dostupnej stránke feedu. Obľúbené majú objektový formát; všeobecný
čítač zoznamov ich počet nevyhodnotil, preto sa nesmie uvádzať 0.
Neboli vytvorené nové testovacie dáta ani zmenené nastavenia.

### Obnova dát pred ďalším celým behom — najprv dohoda s majiteľom

Zo skutočných požiadaviek existujúcich špecov:

1. Hlavný účet: vlastná ponuka aj dopyt; profil musí umožniť aspoň 30 px
   posunu pre scenáre recenzií. Aspoň jedna vlastná položka portfólia.
2. Vlastná zdieľaná živá ponuka na Nástenke na prvých piatich stranách,
   ale hlbšie než 1000 px. Nesmie sa len odhadnúť jej poloha.
3. Prijatá priama konverzácia medzi novým hlavným účtom a skutočným
   druhým testovacím účtom, s aspoň jednou správou, na prvej stránke zoznamu
   a s jedinečným zobrazovaným menom. Prijatie druhou stranou dohodnúť.
4. Opakovane použiteľné sledovanie ponúk aj dopytov s živými výsledkami;
   pre otvorenie autora musí mať výsledok dostupný verejný profil.
   Ponechať voľný slot, ak majiteľ zapne voliteľné zápisové testy.
5. Obľúbený dostupný cudzí profil s jedinečným menom pre príslušné scenáre.
   Reálne vyhľadávanie musí mať dostupné karty oboch typov pre zvolené
   dotazy a krajinu (špecy majú aj predvolený dotaz `te`).

Základné dáta ešte nezaručia nulový dátový SKIP: stránkovanie Sledovaní
potrebuje aspoň 11 živých zhôd a scenáre otváracích hodín firemný profil
s hodinami. Také rozšírenie sa dohodne samostatne; nevytvárať ďalšie účty
ani rozsiahly verejný obsah len na odstránenie SKIP. Žiadna príprava nesmie
obísť autorizáciu, potichu meniť súkromie či používať účty mimo dohody.

Diagnostika 209(b) má 12/12 nových Node kontrol, 42/42 existujúcich kontrol
diagnostiky a izolované 3/3 browser projekty. TypeScript aplikácie aj
explicitných E2E súborov, cielený lint a kontrola diffu prešli. Ide len
o diagnostiku, nie opravu aplikácie alebo oslabenie testov.

## Obnovené dáta a celý beh na `5bf32b26` — 9. 11. 2026

Majiteľ potvrdil nasadenie a okno bez zlučovania, nasadení a zmien účtov.
`origin/main` bol pred behom aj po ňom `5bf32b26` (PR #246, iba dokumentácia
oproti K14 `92fb1b7d`). Vlastná vetva `e2e/209-diagnostika` ostala bez commitu
a pushu. Aplikácia, závislosti, Jest, migrácie ani register nálezov sa nemenili.

Predbežné GET overenie: verejný hlavný profil, 2 vlastné karty (ponuka/dopyt),
1 obľúbený, 2 sledovania s jednou živou zhodou každé, priama konverzácia a
dostupný profil druhého účtu (HTTP 200). Majiteľ doplnil portfólio; následný
GET potvrdil 1 položku. WebKit mobil nameral pri existujúcej živej zdieľanej
ponuke hĺbku 1428 px. Toto nepotvrdzuje všetky voliteľné dátové podmienky.

Kanonický príkaz z `frontend`, všetky tri projekty, workers=1, retries=0:

| Projekt | Prešlo | Padlo | Preskočené | Trvanie |
| --- | ---: | ---: | ---: | --- |
| webkit-desktop | 110 | 6 | 136 | 10 min 55,3 s |
| webkit-mobile | 159 | 16 | 77 | 19 min 27,6 s |
| chromium-desktop | 114 | 0 | 138 | 5 min 6,4 s |
| **Spolu** | **383** | **22** | **351** | **35 min 39,8 s** |

Proces 10:30:21–11:06:06 UTC, vrátane prípravy 35 min 45 s. Kolekcia má
756 variantov v 43 špecoch, flaky=0. Oproti prijatému stavu 427 / 2 / 303 sa
našlo všetkých pôvodných 732 variantov, žiadny nezmizol; pribudlo 24 (HTML18
a numerická adresa6). Prechody: 21 PASS→FAIL, 1 SKIP→FAIL, 55 PASS→SKIP,
10 SKIP→PASS, 2 FAIL→PASS. Oproti poslednému uloženému platnému celému behu
z 1. 11. (427 / 4 / 307, 738 variantov) pribudlo iba HTML18; všetky vtedajšie
4 pády teraz prešli. Neúplný beh z 8. 11. sa nepoužíva ako platný základ.

Všetkých 22 pádov je podľa presného kľúča špec/názov/projekt nových; žiadny
nie je známym pádom č. 1–4. Každý sa samostatne zopakoval 3× v rovnakom
Dockeri: **66 pokusov = 50 PASS / 8 FAIL / 8 SKIP**, 12 min 53 s, bez
automatického retry. Dvanásť testov malo 3× PASS; osem znovu padlo; dva
mali iba SKIP. Pôvodný výsledok 383 / 22 / 351 sa tým nemení a **beh nie je
prijatý**. Prijatý základ ostáva 427 / 2 / 303.

Opakovaný FAIL (poradie P=prešlo, F=padlo, S=preskočené):

- `search-mobile-cards`, tmavé firemné hodiny, WK mobil: S/S/F; FAIL pred
  scenárom pri GET identity. Žiadny opakovaný PASS tohto scenára.
- `offer-watch-results-handoff`, svetlý mobile→desktop app Back, WK mobil:
  P/F/P; nový FAIL pri GET sledovaní, pôvodný pri navigácii pred Back.
- `search-panel-fixture`, ponuky, WK mobil: P/F/P; po ťuku sa nepotvrdila
  profilová URL. Ľudia: P/P/F; opakovaný FAIL bol na loading markeri, teda
  v inom kroku než pôvodný. Vlastné bloky dôkazov nevznikli.
- `offer-card-review-translations`, PL/svetlý mobil: F/P/P; GET vlastných
  kariet zlyhal pred kontrolou prekladu. Vlastný blok dôkazov nevznikol.
- `offer-reviews-back`, cudzí profil po F5, WK desktop: P/P/F. Pôvodne
  neprišlo tlačidlo recenzií; pri opakovaní zlyhal vstup do recenzií pred F5
  a nasledovali 401/403. Nezamieňať s opraveným scroll scenárom 231.
- `search-country-scroll`, typing alone, WK desktop: P/F/P; zlyhanie GET
  odporúčaní a následné 401/403. Nie je preukázaná chyba krajiny.
- `search-to-offer-watches`, tmavý mobil: P/P/F; po HTML 200 sa neobjavilo
  mobilné upozornenie, viewerReady=false. Príčina inicializácie nie je dokázaná.

Iba SKIP pri opakovaní: PL/svetlý desktop `offer-card-translations` (3×
priamo potvrdený `own_card_hint_not_completed`) a tmavé prvé chybné
stránkovanie `offer-watch-pagination-errors` (3× `no_paginated_watch`,
strážca vyžaduje 11 živých zhôd). Ich pôvodné pády boli pred týmito
strážcami. SKIP nie je úspešný retest ani jednorazový pád s 3× PASS.

Z 55 nových PASS→SKIP patrí 24 desktopovým prekladom recenzií, 7 desktopovým
Like prekladom, 11 stránkovaniu, 12 upozorneniam a 1 firemným hodinám. Nie
všetky konkrétne dôvody pôvodných SKIP ostali v bezpečnom súhrne; strážca
zistený v kóde je možnosť, nie automaticky runtime dôkaz. Budúcu prípravu
dát dohodnúť aj pre návody otáčania, existujúce prečítané upozornenia a
históriu. Bez tichého dokončovania návodov či vytvárania verejného obsahu.

Potvrdené: oba konverzačné testy 209(b) PASS, hlavný účet druhý profil vidí
(áno). V oboch `[E2E-PEER] firstPage=1 slugMatches=1 deletedMatches=0
namedMatches=1 nameMatches=1`. Oba feed návraty 209(c) PASS. Mobile Settings
navigation PASS; motion Jazyk po prípravnom FAIL 3× PASS, ostatné motion2
PASS. Konkrétny scroll scenár 231 PASS vo všetkých troch projektoch. HTML
no-store 18/18 PASS, numerický vstup do Jazyk na mobile 2/2 PASS. Zdieľanie
feed/profil 6/6 PASS a všetkých 9 kontrol odstránenia známeho vytvoreného
obsahu úspešných; nejde o samostatný záťažový dôkaz súbehu 246.

### Nové dôkazy k 223, nie preukázaná príčina

WK desktop, `offer-reviews-back` opakovanie3: okno 11:15:51–11:16:17 UTC;
RSC recenzií FAILED po 14037 ms, API 401, refresh 403 približne 11:16:12.
`search-country-scroll` opakovanie2: 11:17:39–11:18:03 UTC; odporúčania FAILED
po 20105 ms, API 401, refresh 403 približne 11:18:01. Obe odmietnuté obnovy
majú `X-App-Duration-Ms: 1`, cookies kontextu `žiadne`, CSRF hlavičku `áno`.
Časy požiadaviek sú približné z klienta. Zoznam cookies pri odpovedi nie
je dôkazom ich prítomnosti v odoslanej Cookie hlavičke ani príčiny straty.
Počas pôvodného celého behu strážca úspešne obnovil reláciu 7× bez chyby.
401/403 priebeh je zachytený 1× zo 4 pokusov na každý z týchto dvoch testov,
nie pri oboch ich pádoch. Majiteľovi poslať na porovnanie HTTP logov.

Úplná lokálna bezpečná správa (presné názvy všetkých 22 nových pádov,
opakovania, šablóny pre Claude a 20 vzniknutých blokov):
`C:/Projects/svap-e2e-vysledok-20261109.md`. Podkladové bezpečné JSON súhrny
majú prefix `C:/Projects/svap-e2e-full-5bf32b26-1794220214309` a prípony
`-details.json`, `-comparison.json`, `-diagnostic.json`, `-extra-evidence.json`.
Nie sú to surové reporty ani prílohy a nepatria do commitu.

Poznámka k exportu: pôvodný bezpečný export celého behu nezachoval číselné
X-App-Duration-Ms; ich neprítomnosť nie je dôkaz chýbajúcej hlavičky servera.
Pri cielených blokoch 223 je zachované reálne číslo1 zo samostatného čítania.
Lokálne Node kontroly diagnostiky 209(b) po behu znova 12/12 PASS.

Ďalší krok: rozhodnutie majiteľa/Claude podľa dôkazov 223 a načítania
mobilnej route; samostatne dohodnúť dátové medzery a prípadné rozšírenie
anonymnej diagnostiky pádov bez bloku. Bez súhlasu sa testy nezmäkčujú ani
opravujú. Pokrytie fotiek 295 zostáva ďalšia dohodnutá úloha, tu sa nerobilo.

### Doplnok po upozornení na K14 a plán 320 — 9. 11. 2026

Z dokončeného behu na rovnakom main `5bf32b26`: `auth-session.spec.ts`
**9/9 PASS** (po tri v každom projekte). To nie je dôkaz opravy 223: dva
odmietnuté refresh priebehy sa zachytili v iných špecoch pri opakovaniach.
Pri ich ďalšom mapovaní patrí medzi miesta na preverenie aj zmenený
`frontend/src/utils/csrf.ts`, bez tvrdenia o preukázanej príčine.

`mobile-settings-navigation.spec.ts` na WK mobile PASS, motion Jazyk mal
pôvodný FAIL na Menu pri príprave a potom 3× PASS; Sledovanie a scroll lock
PASS. **Tieto špecy neotvárajú Súkromie** (navigation: Jazyk/Upozornenia;
motion: Jazyk/Sledovanie), preto sa ich výsledok nesmie vydávať za overenie
nového PrivacySettings. V hlavnej E2E kolekcii sa nenašiel priamy scenár
Privacy/Súkromie. Kód PrivacySettings naozaj drží obe rozloženia v DOM a
CSS ukazuje jedno; budúce duplicitné textové/DOM selektory treba zúžiť na
viditeľný prvok, nie zmäkčiť asercie. Kvôli úspešnému behu sa teraz nič
neprepisovalo a nemenilo sa súkromie účtov.

Po potvrdenej oprave a nasadení **320** doplniť samostatný WebKit E2E:
stránka Zmena hesla pri `colorScheme: 'dark'` má obe polia svetlé a čitateľné.
Bez odoslania formulára a bez reálnej zmeny hesla či vyžiadania e-mailu.
Oprava 320 je v tomto main stále otvorená; nový test zatiaľ nie je hotový
ani spustený. Vetva 170 nemá priamy dopad na E2E. Overenie push 318 na
reálnom iPhone, AWS prefixov 301/304, nastavení Railway 315, rozhodnutí a
ručných testov 279/293 nie je týmto behom vykonané ani uzavreté.

### Presný zoznam 22 nových pádov a tri opakovania

P = prešlo, F = padlo, S = preskočené. Všetky riadky sú **nové podľa
presného kľúča špec/názov/projekt**, nie známe pády č. 1–4. Čísla v tabuľke
sú iba poradie správy, nie čísla nálezov. Pôvodný celý beh má pri každom FAIL;
opakovania ho neprepisujú. Tri SKIP nie sú tri PASS.

| # | Špec | Presný názov testu | Projekt | Opakovania 1 / 2 / 3 |
| ---: | --- | --- | --- | --- |
| 1 | `e2e/search-mobile-cards.spec.ts` | Search mobile-card parity – light › mobile: all author returns to the exact search URL | `webkit-mobile` | P / P / P |
| 2 | `e2e/search-mobile-cards.spec.ts` | Search mobile-card parity – light › mobile: all detail closes via backdrop and downward pointer drag | `webkit-mobile` | P / P / P |
| 3 | `e2e/search-mobile-cards.spec.ts` | Search mobile-card parity – dark › mobile: all author returns to the exact search URL | `webkit-mobile` | P / P / P |
| 4 | `e2e/search-mobile-cards.spec.ts` | Search mobile-card parity – dark › mobile: an existing business offer opens hours and returns to its detail | `webkit-mobile` | S / S / F |
| 5 | `e2e/offer-watch-results-handoff.spec.ts` | Offer Watch results responsive handoff – light › mobile → desktop app Back returns directly to the exact results URL | `webkit-mobile` | P / F / P |
| 6 | `e2e/offer-watch-results-handoff.spec.ts` | Offer Watch results responsive handoff – light › edit country picker → desktop → mobile list Back leaves the nested session without saving | `webkit-mobile` | P / P / P |
| 7 | `e2e/offer-watch-results-handoff.spec.ts` | Offer Watch results responsive handoff – dark › mobile → desktop app Back returns directly to the exact results URL | `webkit-mobile` | P / P / P |
| 8 | `e2e/mobile-language-header.spec.ts` | Language header – pl / light › mobile: profile-section has one centered title, no profile shortcut, and six choices | `webkit-mobile` | P / P / P |
| 9 | `e2e/mobile-language-header.spec.ts` | Language header – pl / dark › mobile: standalone has one centered title, no profile shortcut, and six choices | `webkit-mobile` | P / P / P |
| 10 | `e2e/search-panel-fixture.spec.ts` | Search return harness fixture geometry › offers: short real geometry is rejected before navigation; normal geometry permits deep profile entry | `webkit-mobile` | P / F / P |
| 11 | `e2e/search-panel-fixture.spec.ts` | Search return harness fixture geometry › users: short real geometry is rejected before navigation; normal geometry permits deep profile entry | `webkit-mobile` | P / P / F |
| 12 | `e2e/mobile-settings-offer-watch-motion.spec.ts` | the Jazyk row slides the Settings list away to the left and brings it back from the left on Back | `webkit-mobile` | P / P / P |
| 13 | `e2e/offer-card-review-translations.spec.ts` | Offer-card review translations – pl / light › mobile: the existing offer bottom detail translates ratings without adding a review link | `webkit-mobile` | F / P / P |
| 14 | `e2e/offer-card-translations.spec.ts` | OW-04 profile Like translation – pl / light › existing profile card exposes the translated Like control; desktop back uses the same text | `webkit-desktop` | S / S / S |
| 15 | `e2e/offer-reviews-back.spec.ts` | cudzí profil po F5 › after a reload the arrow returns to the plain profile without a highlighted or flipped card | `webkit-desktop` | P / P / F |
| 16 | `e2e/offer-watch-pagination-errors.spec.ts` | Offer Watch pagination errors – dark › desktop: first-page failure retries the first page without showing a false empty state | `webkit-desktop` | S / S / S |
| 17 | `e2e/profile-block-back-home.spec.ts` | blocking from a profile opened from Favorites shows the feed, and Back or Forward right after it never show the blocked profile | `webkit-desktop` | P / P / P |
| 18 | `e2e/search-cache-revalidation.spec.ts` | OW-20 real search cache revalidation › an identical repeat sends real HTTP while retaining the existing preview and exposing revalidation | `webkit-mobile` | P / P / P |
| 19 | `e2e/search-country-scroll.spec.ts` | OW-18 independent search country and OW-19 result return position › typing alone automatically searches, without Enter, and uses the independent IP country | `webkit-desktop` | P / F / P |
| 20 | `e2e/search-panel-return.spec.ts` | Search panel visibility and prompt profile returns › all: browser Back restores deep results promptly without opening the desktop panel | `webkit-desktop` | P / P / P |
| 21 | `e2e/search-preview-tab-top.spec.ts` | Search preview Show More starts the selected tab at the top › users: Show More resets nested scroll immediately but profile Back/Forward retains deep position | `webkit-mobile` | P / P / P |
| 22 | `e2e/search-to-offer-watches.spec.ts` | Search → Offer Watch navigation – dark › mobile: hidden desktop navigation; results guidance still opens management and returns | `webkit-mobile` | P / P / F |

### Priamo priložené bezpečné dôkazy 223

Oba bloky sú z diagnostických opakovaní na WK desktop. Prvý patrí k
`offer-reviews-back` (tretie opakovanie), druhý k `search-country-scroll`
(druhé opakovanie). Neobsahujú telá odpovedí, texty používateľov ani hodnoty
cookies/tokenov. Príčina nezistenej prítomnosti cookies nie je preukázaná.

```text
[E2E-EVIDENCE] cudzí profil po F5 › after a reload the arrow returns to the plain profile without a highlighted or flipped card | webkit-desktop | 25.0 s
url: /dashboard/users/:id [tab]
page state: readyState=complete viewerReady=true loadingMarkers=0 panelAriaHidden=n/a
document timing (ms since navigation start): domContentLoaded=247 load=537
scroll root: scrollTop=0 scrollHeight=785 clientHeight=720
active element: [omitted]
requests (ms since test start):
23  GET  /dashboard/users/:id  200  130 ms
505  GET  /api/auth/me/  200  107 ms
519  GET  /api/auth/dashboard/users/:id/:id/profile/  200  114 ms
678  GET  /api/auth/dashboard/users/:id/profile/  200  93 ms
679  GET  /api/auth/dashboard/users/:id/skills/  200  87 ms
679  GET  /api/auth/messaging/conversations/unread-summary/  200  64 ms
679  GET  /api/auth/notifications/unread-count/ [type]  200  65 ms
806  GET  /api/auth/skill-requests/:other/ [:param]  200  62 ms
868  GET  /api/auth/skill-requests/:other/ [:param]  200  65 ms
1157  GET  /dashboard/offers/:n/reviews [_rsc,returnTo]  FAILED(failed)  14037 ms
20811  GET  /api/auth/skill-requests/:other/ [:param]  401  56 ms
20866  POST /api/token/refresh/  403  111 ms
X-App-Duration-Ms: 1
refresh cookies: žiadne
refresh X-CSRFToken: áno
page errors: 0 | console errors: 7
[E2E-CONTEXT] moment=first-observed at=1794222951901 relation=temporal-only
[E2E-SESSION] snapshot=available observedAt=1794222951901 runStartedAt=1794222933460 generation=1 storedAt=1794222933460 relation=temporal-only
[E2E-SESSION] kind=initial-storage at=1794222933460 attempt=0 generation=1 status=n/a errorKind=n/a
[E2E-CONTEXT] moment=failure-observed at=1794222976899 relation=temporal-only
[E2E-SESSION] snapshot=available observedAt=1794222976899 runStartedAt=1794222933460 generation=1 storedAt=1794222933460 relation=temporal-only
[E2E-SESSION] kind=initial-storage at=1794222933460 attempt=0 generation=1 status=n/a errorKind=n/a
```

```text
[E2E-EVIDENCE] OW-18 independent search country and OW-19 result return position › typing alone automatically searches, without Enter, and uses the independent IP country | webkit-desktop | 23.1 s
url: /dashboard
page state: readyState=complete viewerReady=true loadingMarkers=0 panelAriaHidden=n/a
document timing (ms since navigation start): domContentLoaded=273 load=565
scroll root: scrollTop=0 scrollHeight=10876 clientHeight=720
active element: [omitted]
requests (ms since test start):
28  GET  /dashboard  200  167 ms
570  GET  /api/auth/me/  200  122 ms
800  GET  /api/auth/feed/posts/  200  117 ms
804  GET  /api/auth/messaging/conversations/unread-summary/  200  81 ms
809  GET  /api/auth/notifications/unread-count/ [type]  200  77 ms
1576  GET  /api/auth/dashboard/search/recommendations/ [limit]  FAILED(failed)  20105 ms
21728  GET  /api/auth/feed/posts/:n/  200  238 ms
21729  GET  /api/auth/notifications/unread-count/ [type]  401  236 ms
21731  GET  /api/auth/notifications/unread-count/ [type]  401  233 ms
21733  GET  /api/auth/messaging/conversations/unread-summary/  401  231 ms
21962  POST /api/token/refresh/  403  1124 ms
X-App-Duration-Ms: 1
refresh cookies: žiadne
refresh X-CSRFToken: áno
22758  GET  /api/auth/dashboard/search/ [country,location,offer_type,only_my_location,price_max,price_min,q(2)]  401  336 ms
23093  POST /api/token/refresh/  pending  …
page errors: 0 | console errors: 12
[E2E-CONTEXT] moment=first-observed at=1794223059750 relation=temporal-only
[E2E-SESSION] snapshot=available observedAt=1794223059750 runStartedAt=1794223050411 generation=1 storedAt=1794223050411 relation=temporal-only
[E2E-SESSION] kind=initial-storage at=1794223050411 attempt=0 generation=1 status=n/a errorKind=n/a
[E2E-CONTEXT] moment=failure-observed at=1794223082838 relation=temporal-only
[E2E-SESSION] snapshot=available observedAt=1794223082838 runStartedAt=1794223050411 generation=1 storedAt=1794223050411 relation=temporal-only
[E2E-SESSION] kind=initial-storage at=1794223050411 attempt=0 generation=1 status=n/a errorKind=n/a
```

## Návrh malej dymovej sady po nasadení — od K15 (9. 11. 2026)

**Stav: návrh, nie nová implementovaná sada ani nameraný päťminútový beh.**
Podklad merania je `main 5bf32b26` a dokončený celý beh z 9. 11. Nižšie je
príkaz na výber siedmich už existujúcich špecov a cieľ následného označenia
`@smoke`. V tejto dokumentačnej úlohe sa značky, testy ani aplikácia nemenia.
Návrh pôvodne vznikol vo vetve `e2e/dymova-sada`. Po kontrole PR #248 sa
presunul ku kódu do spoločnej `e2e/209-diagnostika`; ďalej sa aktualizuje iba
v tejto jednej vetve.

### Základ: sedem existujúcich špecov

| Špec v `frontend/e2e/` | Čo skutočne overí | Zápisy a upratanie |
| --- | --- | --- |
| `smoke.spec.ts` | Verejný vstup, úspešná HTML odpoveď a titulok Svaply. | Bez prihlásenej relácie a bez vytvárania obsahu. |
| `auth-session.spec.ts` | Prihlásenie cez formulár, odhlásenie, ochrana dashboardu po Back/F5 a po vyčistení cookies. | Len relácie vyhradeného účtu, žiadna zmena hesla či nastavení. |
| `messages-peer-profile.spec.ts` | Otvorenie existujúcej konverzácie s druhým testovacím účtom, hlavička, návrat a profil. | Neodosiela správy. Otvorenie môže označiť existujúcu správu za prečítanú a zapísať návštevu profilu; preto iba dohodnuté testovacie účty. |
| `mobile-settings-navigation.spec.ts` | Mobil: Profil → Menu → Jazyk/Upozornenia → Späť → Zatvoriť → profil. | Bez prepínania a ukladania. Zatiaľ neoveruje Súkromie, Blokované ani Sledovanie. |
| `dashboard-history-navigation.spec.ts` | Mobilné/desktopové menu, správna URL a obsah pri Späť/Dopredu. | Nezapisuje obsah; zachovať zákaz opakovaného kliknutia na aktívne Žiadosti. |
| `html-cache-control.spec.ts` | Prvé otvorenie aj F5 na šiestich stránkach vracajú HTML `no-store`, vrátane dashboardu. | Len skutočné GET, nie podvrhnuté API; 18 variantov na troch projektoch. |
| `sharing-from-feed.spec.ts` | Vytvorenie dočasného zdroja, reálne zdieľanie z UI, správne pristátie na Nástenke. | Dva vlastné dočasné príspevky na projekt. Existujúci `finally` maže najprv repost, potom zdroj; kontroluje výsledky upratania. **Nie je to test nahratia fotky.**  **Obmedzenie:** ak ID nie je známe, náhradný GET v `cleanupFeedPosts` nekontroluje HTTP stav; jeho zlyhanie môže zostať bez hlásenia a príspevok bez upratania. |

Na zdokumentovanom celom behu mali tieto špecy spolu **51 variantov:
41 PASS / 0 FAIL / 10 projektových SKIP**. Súčet zaznamenaných trvaní samotných
testov bol **90 821 ms**. Nie je to trvanie samostatného dymového procesu:
treba prirátať Docker, global setup, prehliadače, kontexty a upratanie. Cieľ
**približne 3–5 minút** je zatiaľ odhad; pred zavedením ho zmerať jedným
samostatným behom. Odhad nie je záruka pri otvorenom probléme 223.

Z `frontend`, po potvrdení nasadenia a okna bez zlučovania, nasadení a zmien
testovacích účtov (bez `--project` sa použijú všetky tri projekty):

**Podmienka zápisovej časti:** kým sa samostatne neopraví a neoverí
náhradné vyhľadanie pri neznámom ID, `sharing-from-feed.spec.ts` nezaraďovať
do pravidelného automatického dymu. Nižšie je iba sedemsúborový výber návrhu,
nie bezvýhradné odporúčanie na jeho spúšťanie po každom nasadení. Historické
úspešné kontroly známych ID túto medzeru nepotvrdzujú ako vyriešenú. Helper sa
v tejto dokumentačnej oprave nemenil.

```powershell
npm run test:e2e:docker -- e2e/smoke.spec.ts e2e/auth-session.spec.ts e2e/messages-peer-profile.spec.ts e2e/mobile-settings-navigation.spec.ts e2e/dashboard-history-navigation.spec.ts e2e/html-cache-control.spec.ts e2e/sharing-from-feed.spec.ts --workers=1 --retries=0
```

Tento výber je technicky spustiteľný z existujúcich špecov. **Touto úlohou sa
proti Railway nespúšťal a nepredstavuje súhlas s ďalším zápisovým behom bez
dohodnutého okna.** Použiť pôvodnú konfiguráciu a lokálny `.env.e2e`; nikdy ho
nevypisovať ani nekopírovať do iného worktree či prílohy.

### Cieľ: najviac osem špecov so značkou `@smoke`

Po schválení návrhu označiť iba konkrétne krátke produkčné scenáre, nie celé
rozsiahle parametrizované skupiny. WebKit desktop aj mobil ostávajú povinné,
Chromium je kontrolný tretí projekt. Bez zmeny asercií, tolerancií a timeoutov,
bez automatických retry. Päťminútový cieľ sa nesmie dosiahnuť vypínaním pádov.

Základ zostane sedem špecov vyššie. **Ôsmy navrhovaný špec**
`feed-photo-smoke.spec.ts` vznikne až v dohodnutej implementácii 295: syntetická
fotka bez osobných údajov/EXIF → skutočný UI upload a publikovanie vlastného
príspevku → vykreslený obrázok má `naturalWidth > 0` → odstránenie iba vlastného
príspevku tohto behu. Overí sa aktuálna upload cesta aj spracovanie a doručenie
obrázka, nie iba HTTP 200 obrázkovej URL. Pred zaradením preveriť aj upratanie
pri nedokončenom uploade alebo neúspešnom publikovaní. Netvrdiť, že samotná
neprítomnosť príspevku dokazuje fyzické vymazanie objektu zo S3. Portfólio,
ponuky, odmietnutie BMP/TIFF a fotky v správach patria do širšej 295, nie do
päťminútového dymu.

**Medzera Správ:** otvorenie konverzácie nie je dôkaz nového odoslania ani
doručenia. `backend/messaging/services/messages.py::delete_message_for_all`
aktuálne robí soft-delete: záznam ostáva a klient ho vidí ako odstránený.
Automatické posielanie po každom nasadení by tak nechávalo históriu odstránených
správ. Zatiaľ ho nenavrhujem potichu zapnúť. Majiteľ musí buď výslovne schváliť
tieto zvyšky medzi dvoma vyhradenými účtami, alebo dohodnúť riadené prostredie
a upratanie. Potom možno doplniť/vymeniť správový scenár v jednom špecu bez
prekročenia ôsmich súborov. Test by kontroloval serverom potvrdenú správu v UI;
príjem druhým klientom vyžaduje druhú povolenú reláciu. **Odoslanie správy aj
push dovtedy ostávajú súčasťou ručného dymu.** Push na skutočnom iPhone ostáva
ručne aj po prípadnom doplnení automatického odoslania.

Pri budúcom rozšírení Nastavení do dymu otvoriť aj Súkromie, Blokované a
Sledovanie bez zmeny preferencií. `PrivacySettings` má obe rozloženia v DOM;
duplicitné DOM/textové selektory zúžiť na viditeľné prvky. Samotný dnešný
PASS navigácie nie je dôkazom pokrytia týchto troch sekcií.

Cieľový príkaz **až po implementácii a kontrole značiek**:

```powershell
npm run test:e2e:docker -- --grep '@smoke' --workers=1 --retries=0
```

Na tomto maine ešte výber `@smoke` nie je zavedený. Názov `smoke.spec.ts`
automaticky nie je značka. Pred prvým produkčným použitím cez `--list` overiť
presný neprázdny výber, projekty a počty. Nesprávny či prázdny výber nie je PASS.

### Podmienky úspechu, súkromie a upratanie

- Pred behom preveriť určené účty a existujúcu priamu konverzáciu na prvej
  strane; nemení sa súkromie ani prístupové práva. Neočakávaný dátový SKIP =
  **NEOVERENÉ**, nie zelený dym. Očakávané projektové SKIP sa uvádzajú osobitne.
- Každý nový objekt označiť jedinečnou značkou behu a ID zaradiť na upratanie
  pred aserciami. `finally` platí aj pri páde. Pri výpadku použiť iba presnú
  identifikáciu vlastného obsahu tohto behu, nikdy hromadné mazanie či obsah
  iných behov. Chyba/500 pri uprataní sa neschová opakovaným mazaním; nahlásiť
  nezaručené upratanie spolu s pôvodným pádom.
- Diagnostika len bezpečným `[E2E-EVIDENCE]`: časy, počty, anonymné cesty a
  HTTP stavy, vrátane existujúcich polí 223. Žiadne účty, text správ, telá
  odpovedí, hodnoty cookies/tokenov ani surové reporty do chatu/commitu.
- Bezpečný blok dôkazov nie je to isté ako všetky lokálne artefakty. Globálny
  `playwright.config.ts` má `screenshot: 'only-on-failure'`; nie všetky vybrané
  špecy ho prepisujú. Snímky a surové reporty môžu obsahovať obsah stránky,
  zostávajú súkromné a nepatria do chatu, commitu ani verejného CI artefaktu.
  `messages-peer-profile.spec.ts` v aktuálnej diagnostickej vetve už používa
  `diagnostic-test`, ktorý vypína screenshot, trace aj video. Tvrdenie o jeho
  nevypnutých screenshotoch platilo pre pôvodnú samostatnú dokumentačnú vetvu,
  nie pre tento aktuálny kód; netreba ho vypínať druhýkrát.
- Dym nenahrádza ručný test iPhonu/PWA ani celý regresný beh. Nový pád sa
  neposunie na PASS len opakovaním; zápisový scenár sa bez preverenia
  upratania automaticky neopakuje. Päťminútový odhad nie je nový testový limit.

### Po oprave 320: WebKit regresia farieb formulára

`320` je na `5bf32b26` stále otvorený; oba vstupy
`reset-password/[uidb64]/[token]/ResetPasswordClient.tsx` zatiaľ nemajú vlastné
pozadie. **Až po oprave aplikácie a potvrdení nasadenia** pridať samostatný
`reset-password-colors.spec.ts` (navrhovaný názov), `colorScheme: 'dark'`, vo
WebKite desktop aj mobil. Overiť obe polia, svetlé skutočné pozadie/účinnú
svetlú schému ovládacích prvkov a čitateľný text; nestačí kontrola názvu CSS
triedy. Bez vyžiadania e-mailu, skutočného reset tokenu, odoslania formulára
alebo zmeny hesla. Pred implementáciou preveriť bezpečný vstup formulára bez
platného odkazu. Je to samostatná podmienená regresia, **nie deviaty špec
pridávaný automaticky do malej sady**. V tejto úlohe nevznikol ani nebežal.

Lokálne overenie návrhu: presný sedemsúborový výber s `--list` dal
`Total: 51 tests in 7 files` (exit 0), všetkých sedem ciest existuje a
`git diff --check` prešiel. `--list` nevykonal testy ani prihlasovací setup;
proti Railway sa nič nespustilo. Zmenená je iba táto dokumentácia.

## Historický stav zmien pri prvom zjednotení reportu — 9. 11. 2026

Toto odovzdanie teraz zhromažďuje výsledok behu, všetkých 22 pádov a ich
opakovania, dôkazy 223, doplnenie K14 a návrh dymovej sady vrátane podmienky
320. Podrobný lokálny report `C:/Projects/svap-e2e-vysledok-20261109.md` má
takisto doplnené K14 aj dymový návrh a zachováva všetkých 20 vzniknutých
bezpečných blokov. Nejde o surový Playwright HTML report.

| Vlastná vetva / pracovný priečinok | Stav pred schválením commitu |
| --- | --- |
| `e2e/dymova-sada` — `C:/Projects/svap-e2e-dymova-sada` | Iba toto zjednotené `docs/playwright-odovzdanie.md`. Žiadne zmeny aplikácie ani testov. |
| `e2e/209-diagnostika` — `C:/Projects/svap-e2e-223-dokazy` | Skoršia diagnostika 209(b): upravený `messages-peer-profile.spec.ts`, nový pomocník `support/peer-conversation-diagnostics.ts` a štyri kontroly v `diagnostics-tests/` (peer-conversation.check.ts, peer-conversation-browser.check.ts, peer-conversation.playwright.config.ts, peer-conversation.scenario.ts). Spolu so staršou pracovnou verziou odovzdania je to 7 súborov. |

Kód diagnostiky 209 sa týmto zjednotením **nekopíroval do dokumentačnej vetvy**
a starší worktree ostal nedotknutý. Historické časti o 209 preto opisujú túto
samostatnú rozpracovanú vetvu, nie kód už zlúčený do main. Vtedy bola kanonická
dokumentácia v `e2e/dymova-sada`; po kontrole PR #248 je spolu s kódom v
`e2e/209-diagnostika`. Dve pôvodné verzie odovzdania sa preto nemajú zlučovať
ako dve nezávislé opravy.

Pri zjednotení mali obe vetvy lokálne necommitnuté zmeny. Nie sú v hlavnom
pracovnom priečinku `C:/Projects/svap`; doň sa nezasahovalo. Následne majiteľ
9. 11. výslovne schválil commit a push oboch vetiev. Vybrať konkrétnu vlastnú
vetvu a súbory, nebrať `git add .` v hlavnom projekte. Súbor s prihlásením,
auth stav, JSON súhrny, surové reporty, prílohy a pomocné lokálne skripty
zostávajú mimo commitu.

Návrh dymu ešte nie je implementácia značiek `@smoke`; test 320 ešte nevznikol,
lebo čaká na opravu aplikácie a potvrdenie nasadenia. Celý beh je ukončený,
proti Railway sa pri zjednocovaní nič nespúšťalo. Register nálezov, AWS,
nastavenia Railway a rozhodnutia sa nemenili.


## Predcommitové overenie — 9. 11. 2026

Majiteľ výslovne schválil commit a push oboch vlastných vetiev. Pred prípravou
bol stiahnutý aktuálny main `352fc9eb` (PR #247, vetva 171, iba register a
dokumentácia) a obe vetvy boli posunuté fast-forward z `5bf32b26` bez kolízie.
Historický produkčný beh vyššie stále patrí nasadeniu `5bf32b26`; žiadny nový
prihlasovaný beh proti Railway sa pri príprave commitov nespustil.

Kontroly diagnostiky 209 na aktualizovanom základe: **54/54 Node kontrol**
(12 nových + 42 existujúcich), **3/3 syntetických browser projektov**
(WebKit desktop/mobil, Chromium) v Dockeri bez Railway a prihlasovania,
úplný TypeScript aplikácie, samostatný striktný TypeScript šiestich dotknutých
E2E súborov a cielený ESLint prešli. Nové/upravené TS súbory majú najviac
171 riadkov. Pred zaradením súborov preveriť `git diff --check` aj presný
staged zoznam. Do commitov patria iba vlastné E2E súbory a toto odovzdanie,
nie prihlasovacie údaje, auth stav, JSON/HTML reporty alebo prílohy.

Značky `@smoke` ani regresia 320 nie sú týmto commitom implementované.
Otvorenie PR, zlúčenie do main a nasadenie zostávajú majiteľovi.

## Overenie a oprava pripomienok PR #248 — 9. 11. 2026

Najnovší overený main ostáva `352fc9eb`. Na výslovný pokyn majiteľa bol
zjednotený dokument z `d8e2b566` prenesený do `e2e/209-diagnostika` ako
samostatný commit; táto následná oprava je ďalší commit v rovnakej vetve.
Pôvodná dymová vetva ani PR #248 sa neprepisujú a PR sa automaticky nezatvára.

- **Platné v kontrolovanej revízii:** príkazy pre peer diagnostiku odkazovali
  na súbory, ktoré v samostatnej dymovej vetve chýbali (overené Git stromom:
  0 z 3 diagnostických súborov oproti 3 z 3 v cieľovej diagnostickej vetve).
  Pred príkazmi je teraz uvedená požadovaná vetva/revízia a miesto spustenia.
- **Platné:** náhradné vyhľadanie príspevkov v `cleanupFeedPosts` zahodí
  HTTP stav GET. Lokálna syntetická sonda s prázdnym zoznamom známych ID a
  odpoveďou 500 potvrdila 1 GET a 0 hlásených chýb upratania. Na Railway
  nič nevolala. Opravený je opis a podmienka zaradenia zápisového kandidáta,
  **nie samotný helper**; jeho kód a existujúce asercie ostali nedotknuté.
- **Neaktuálne pre cieľový konverzačný špec:** poznámka o screenshote sa týka
  starej dokumentačnej vetvy bez bezpečného fixture. V diagnostickej vetve
  má tento špec screenshot/trace/video vypnuté. Všeobecné riziko lokálnych
  artefaktov ostatných špecov je v pravidlách výslovne odlíšené.

Dohoda do budúcna: súvisiaca práca, jej výsledky a opravy z review ostávajú
ako viac commitov v jednej vlastnej E2E vetve; nezakladať kvôli nim ďalšiu
dokumentačnú vetvu. Pred ďalšou úlohou naďalej overiť aktuálny main.
Zoznam nálezov vlastní Claude; nemenil sa. Značky `@smoke`, test 320 ani
oprava produkčnej aplikácie sa touto dokumentačnou opravou neimplementujú.

Overenie po oprave opisu: 54/54 lokálnych Node kontrol diagnostiky a ochrany
údajov, 3/3 syntetických browser projektov v Dockeri a statická kontrola
podmienky pred príkazmi prešli. Lokálny `--list` znovu potvrdil 51 variantov
v 7 súboroch; nespustil testy, setup ani Railway. Zmenená je iba dokumentácia,
aplikácia a testová logika ostali rovnaké. `git diff --check` prešiel.

## K15 — zavedenie dymu a cielená diagnostika (9. 11. 2026)

Základ: nový fetch main `b3d7983a` (PR #250, K15), majiteľom potvrdené
nasadenie aj okno bez zlučovania, nasadení a zmien účtov. Pokračuje tá istá
vlastná vetva `e2e/209-diagnostika`, fast-forward z main. Aplikácia, závislosti,
Jest, migrácie, Railway a register nálezov sa nemenia. **Žiadny plný beh.**
Prijatý celý základ 427 / 2 / 303 ostáva nezmenený; 222 sa znovu neotvára.

### Dym: implementácia a jedno meranie

Konkrétne krátke scenáre v siedmich schválených špecoch majú `tag: '@smoke'`.
Ich asercie, tolerancie, časové limity a retry sa nemenili. Lokálny `--list`
potvrdil **51 variantov / 7 súborov**, nie prázdny výber. Neposielajú sa
správy ani fotky. Zdieľanie používa jedinečnú značku a pôvodné `finally`.
Pred zaradením bol opravený E2E helper `cleanupFeedPosts`: HTTP chyba GET
náhradného vyhľadania alebo neplatný formát je teraz hlásená chyba upratania,
nie tichý úspech. Žiadne opakované mazanie, zmena endpointu ani maskovanie 500.
Štyri izolované kontroly pokrývajú HTTP chybu, poradie známych ID, formát a
mazanie len značky konkrétneho behu. Neskoro vzniknutý neznámy repost stále
nie je možné garantovane upratať počas nedostupnosti; taký pád treba nahlásiť.

| Projekt | Prešlo | Padlo | Projektový SKIP | Rozpätie pokusov |
| --- | ---: | ---: | ---: | --- |
| webkit-desktop | 13 | 0 | 4 | 41,474 s |
| webkit-mobile | 14 | 1 | 2 | 77,021 s |
| chromium-desktop | 13 | 0 | 4 | 23,774 s |
| **Spolu** | **40** | **1** | **10** | **proces 155,595 s (2 min 36 s)** |

Rozpätie projektu je od prvého po posledný pokus, nie súčet procesov.
Všetky tri scenáre zdieľania prešli vrátane šiestich kontrol odstránenia
známych dočasných príspevkov a následného GET; to nie je dôkaz fyzického
mazania objektov S3 ani samostatného súbehového scenára 246.

Nový presný pád: `auth-session.spec.ts` — `a cleared cookie session cannot
survive a full reload`, webkit-mobile. Zlyhala akcia `page.reload()` na
riadku 64 po úmyselnom vyčistení cookies, pred následnou kontrolou verejného
prihlásenia. V pôvodnom pokuse tento špec nemal vlastný evidence fixture;
samotný riadok súhrnu exportéra **nie je blok vytvorený fixture testu**.
Do špecu bol preto dopojený existujúci diagnostický fixture bez zmeny
asercie. Tri samostatné opakovania: **3 PASS / 0 FAIL / 0 SKIP**, proces
19,892 s. Pôvodný dym ostáva neúspešný. Z týchto údajov nemožno určiť
chybu aplikácie alebo stotožniť tento pád s 223; pri tomto teste je strata
cookies zámerná. Nepridalo sa náhradné F5 ani navýšenie timeoutu.

Dva technické pokusy spúšťača sa nerátajú ako výsledok testov: prvý skončil
na odovzdaní argumentov Node pred Playwrightom, druhý mal 0 vybraných testov
kvôli koncovej kotve grep za novou značkou. Výber sa opravil a overil cez
`--list`; bezpečný session sidecar potvrdil úspešný setup druhého pokusu.
Nešlo o automatické opakovanie neúspešného prihlásenia.

Bežný príkaz z `frontend`, až po potvrdení nasadenia a okna bez zmien:

```powershell
npm run test:e2e:docker -- --grep '@smoke' --list
npm run test:e2e:docker -- --grep '@smoke' --workers=1 --retries=0
```

Samostatné meranie v tejto dávke použilo `diagnostics-tests/railway-targeted.probe.ts`
v režime `smoke`: rovnaký image, konfigurácia, host IPC, workers=1 a retries=0,
plus bezpečný JSON export a meranie času procesu. Nie je to nový test ani
nové pravidlo prijímania celého behu. Ak sa objaví dátový SKIP, dym je
neoverený; očakávaných 10 projektových SKIP sa uvádza samostatne. Ôsmy špec
s fotkou až v 295; odoslanie správy a push ostávajú ručne.

### Chýbajúce dôkazy a sonda 223

`search-panel-fixture.spec.ts` a `offer-card-review-translations.spec.ts`
importujú existujúci `diagnostic-test` namiesto základného Playwright fixture.
Ich scenáre, asercie, gestá, timeouty a dátové strážce sa nemenia. Podobnosť
ťuku bez profilovej URL so známym pádom č. 1 je hypotéza; presný nový kľúč
sa tým nepreznačuje za známy pád.

`support/cookie-timeline.ts` je výslovne zapnutý len v `offer-reviews-back`
a `search-country-scroll`. Číta názvy cookies kontextu hneď a raz za sekundu,
bez čakania pred pôvodnou akciou alebo aserciou. Hodnoty sa neprečítajú do
záznamu. Povolené názvy prejdú pôvodným allowlistom, neznáme sú `other`.
Kruhová pamäť má 120 vzoriek a 40 udalostí; prvý čas `requestfailed` sa
zachová aj pri preplnení. Zaseknuté čítania sa neprekrývajú. Odpojenie
časovača a udalostí nastane pred bežným zatváraním prehliadača.

Výstup obsahuje `[E2E-COOKIE-RING]`, `[E2E-COOKIE-SAMPLE]` (čas začatia aj
dokončenia odčítania a názvy) a `[E2E-BROWSER-EVENT]` (requestfailed s
anonymnou cestou, page-crash, browser-disconnected). Pri páde sú súčasťou
existujúceho `[E2E-EVIDENCE]`; pri PASS sa vypíše len samostatná časová sonda,
nie falošný blok pádu. `žiadne` je úspešne odčítaný prázdny zoznam,
`nezistiteľné` je chyba/zaseknutie/busy. Časy sú epoch ms, vzťah len časový:
vzorka nie je dôkazom obsahu odoslanej Cookie hlavičky ani kauzality.

Cielený spúšťač zachytáva `DEBUG=pw:browser`, nie protokol či telá. Spracuje
Docker stderr **aj stderr workerov v JSON reporte**, ktoré inak zmiznú z
vonkajšieho streamu. Von idú iba pevné kategórie procesu/príznaku, čas,
číselný exit code a povolený signál. Surové vety, PID, argumenty a cesty sa
neukladajú do bezpečného súhrnu. Bežný exit/stderr nie je automaticky crash.
Chýbajúca udalosť page/browser zároveň nevylučuje reštart sieťového procesu.

Reprodukčný cielený príkaz, iba v dohodnutom okne:

```powershell
node node_modules/tsx/dist/cli.mjs e2e/diagnostics-tests/railway-targeted.probe.ts 223-baseline
node node_modules/tsx/dist/cli.mjs e2e/diagnostics-tests/railway-targeted.probe.ts 223-expanded
```

Každý režim vyberá výhradne dva schválené testy, oba WebKity, repeat-each=10,
workers=1, retries=0 (40 variantov, vopred overené cez `--list`). Má pôvodný
global setup, bez náhradného prihlásenia po chybe. Predpokladá bežiaci Docker
a lokálny image presnej verzie nainštalovaného Playwrightu (`--pull=never`).
Normálne používa pôvodný `.env.e2e` vo `frontend`; v oddelenom worktree môže
`--env-file=<pôvodná cesta>` pripojiť tento istý súbor len na čítanie. Súbor
sa nevypisuje ani nekopíruje. Bezpečný výsledok je v ignorovanom
`test-results/safe-<režim>.json`; surové reporty sa nezdieľajú a necommitujú.

**Interpretácia pamäte:** kanonický skript už má `--ipc=host`. Zmerané
`/dev/shm` má približne 4 GB, Docker VM má 8,16 GB RAM, bez kontajnerového
hard limitu (`memory.max=max`), pred dymom vyše 7 GB voľných. Rozšírený
variant preto používa `--ipc=private --shm-size=6g`, nie neúčinné pridanie
samotného limitu k host IPC. Hostiteľ ani Docker Desktop sa neprestavujú.
Mení sa aj IPC izolácia, takže porovnanie nie je čistý dôkaz kauzálneho
účinku RAM a nepridáva fyzickú pamäť. Výsledky uvádzať ako počty z 10
pokusov, nie opravu 223 alebo záruku stability.

### Farby 320 po nasadení K15

Nový `reset-password-colors.spec.ts`: light aj dark, WebKit desktop aj mobil,
**4/4 PASS**, Chromium 2 projektové SKIP, proces **17,046 s**. Je to 6 nových
variantov hlavnej kolekcie, nie rozšírenie sedemsúborového dymu.
Kontext má prázdnu reláciu a `serviceWorkers: 'block'`; GET overenia pevného
syntetického odkazu zachytí route a vráti `{valid:true}`. Kontroluje sa, že
overenie skutočne prebehlo a oba viditeľné prázdne vstupy majú počítané biele
pozadie a tmavý text aj pri tmavej systémovej schéme. API zápisy sú blokované
a musia mať počet 0. Žiadny skutočný reset token, e-mail, vyplnenie hesla
ani odoslanie formulára. Toto **netestuje skutočnú platnosť reset odkazu**.

### Výsledok 223: 80 pokusov, väčšie shm problém neodstránilo

Rovnaké nasadenie, kód runtime/testov, image Playwright 1.63.0, workers=1,
retries=0, dva konkrétne schválené testy, 10× každý v oboch WebKitoch.
Počas porovnania sa nemenila aplikácia, účty ani asercie. Režimy bežali
postupne, nie súbežne. `search-country-scroll` je stále so zablokovaným SW,
`offer-reviews-back` má pôvodné správanie SW. Rozdiel špecov sa nemenil.

| Test | Projekt | Pôvodné host IPC: PASS / FAIL | Private shm 6 GiB: PASS / FAIL |
| --- | --- | ---: | ---: |
| `offer-reviews-back`: cudzí profil po F5, obyčajný profil bez otočenia/zvýraznenia | webkit-desktop | 10 / 0 | 9 / 1 |
| ten istý | webkit-mobile | 8 / 2 | 9 / 1 |
| `search-country-scroll`: typing alone, bez Enter | webkit-desktop | 10 / 0 | 10 / 0 |
| ten istý | webkit-mobile | 9 / 1 | 10 / 0 |
| **Spolu, bez SKIP** | | **37 / 3** | **38 / 2** |

Pôvodný proces **309 842 ms (5 min 9,842 s)**: WK desktop 20/0/0,
rozpätie 126 668 ms; WK mobile 17/3/0, 173 759 ms. Rozšírený proces
**287 482 ms (4 min 47,482 s)**: desktop 19/1/0, 139 988 ms; mobile
19/1/0, 138 665 ms. Spolu **75 PASS / 5 FAIL / 0 SKIP**, procesy 9 min
57,324 s. Toto nie je plný beh ani dôvod zmeniť prijatý základ.

Skutočne namerané shm: pôvodné 4 078 481 408 B, rozšírené 6 442 450 944 B.
Oba režimy mali VM RAM 8 156 962 816 B, memory.max=max a pri štarte približne
7,46 GB voľných. Jeden priebežný snímok pôvodného kontajnera ukázal 725,7 MiB
(9,33 % RAM); nie je to maximum. **3/40 oproti 2/40 nie je preukázané
zlepšenie**: malá vzorka, postupné behy a zároveň iná IPC izolácia. Existujúci
päťminútový session keeper sa nevypínal ani nemenil. Rozšírená konfigurácia
nemôže byť označená za opravu alebo dôkaz príčiny.

Všetky pády podľa poradia výskytu daného testu/projektu v JSON reporte:

| Režim | Špec / projekt | Pokus z 10 | Začiatok UTC | Miesto pôvodného pádu |
| --- | --- | ---: | --- | --- |
| pôvodný | `offer-reviews-back`, WK mobile | 1 | 20:10:25.485 | riadok 198, nezobrazilo sa tlačidlo recenzií |
| pôvodný | `offer-reviews-back`, WK mobile | 9 | 20:11:46.065 | riadok 204, neotvorila sa URL recenzií |
| pôvodný | `search-country-scroll`, WK mobile | 1 | 20:12:15.700 | riadok 95, inicializácia pred písaním |
| rozšírený | `offer-reviews-back`, WK desktop | 8 | 20:16:19.443 | riadok 204, URL recenzií; potom 401/403 |
| rozšírený | `offer-reviews-back`, WK mobile | 7 | 20:18:37.259 | riadok 204, URL recenzií |

Časy patria **2026-11-09**, riadky tejto pracovnej revízii. Nejde o nové
číslované nálezy. Časť „po F5“ sa pri týchto pádoch ešte nevykonala, preto
ich nemožno označiť za regresiu opravy scrollu 231 ani profilovej adresy 222.
Vyhľadávací pád nastal ešte pred písaním; nie je dôkazom nesprávnej krajiny.

**Nový priamy podklad 223:** vo všetkých piatich pádoch boli počiatočné
cookies prítomné a následné SDK odčítania sa zasekli (`nezistiteľné`). V
pôvodnom režime sa v žiadnej vzorke zo 40 pokusov nepotvrdil prázdny zoznam.
V rozšírenom režime sa v desktopovom pokuse 8 potvrdili prázdne cookies a
rovnaký vzorec zlyhaných požiadaviek → 401 → refresh 403. Ostatné pády nemajú
rovnaký potvrdený 401/403 priebeh.

Časová os desktopového pokusu 8 (UTC):

- 20:16:19.915: úspešne odčítané štyri povolené názvy cookies.
- Od 20:16:20.909 začína nečitateľné SDK odčítanie; nasleduje medzera v
  možnosti spoľahlivo zistiť stav cookies, nie preukázaný prázdny zoznam.
- 20:16:35.093: prvý `requestfailed` (RSC recenzií), takmer súčasne druhé API.
- 20:16:35.928: prvý **úspešne** odčítaný prázdny zoznam, asi 835 ms po chybe.
- Približne 20:16:40.935: prihlásené API 401; následná obnova okolo
  20:16:41.0 vráti 403, `X-App-Duration-Ms: 13`, CSRF hlavička áno.

Strata cookies je teda potvrdená **pred odmietnutou obnovou**. Nedá sa však
povedať, či nastala presne spolu s prvou sieťovou chybou, pretože predtým
odčítanie 14 s neodpovedalo. Nie je to dôkaz, akú Cookie hlavičku niesla
konkrétna požiadavka. Väčšie shm problém nevylúčilo. V žiadnom z 80 pokusov
sa nezachytila page-crash alebo browser-disconnected udalosť ani explicitný
crash/OOM/neštandardný exit signál v klasifikovaných browser logoch. To
**nevylučuje** neohlásený reštart sieťového procesu; hypotéza zostáva otvorená.
Bežné `requestfailed` pri úspešnom Späť môžu byť zrušené navigácie, nie dôkaz
výpadku. Niektoré neúspešné požiadavky dobehli až počas zberu evidence, po
ukončení kruhovej sondy; nulový počet v kruhu preto neznamená nulový počet
požiadaviek v širšom bloku.

Bezpečný **skrátený a normalizovaný výber** z desktopového pokusu 8
(hlavičku exportér prekladá na statický špec/riadok; nejde o celý surový report):

```text
[E2E-EVIDENCE] offer-reviews-back.spec.ts:188 | webkit-desktop | 25336 ms
url: /dashboard/users/:id [tab]
  1025  GET  /api/auth/skill-requests/:other/ [:param]  FAILED(failed)  14164 ms
  1512  GET  /dashboard/offers/:n/reviews [_rsc,returnTo]  FAILED(failed)  13675 ms
 21026  GET  /api/auth/skill-requests/:other/ [:param]  401  71 ms
 21097  POST /api/token/refresh/  403  131 ms
        X-App-Duration-Ms: 13
        refresh cookies: žiadne
        refresh X-CSRFToken: áno
[E2E-COOKIE-RING] originAt=1794255379909 samples=25 events=2 omittedSamples=0 omittedEvents=0 firstRequestFailedAt=1794255395093 relation=temporal-only
[E2E-COOKIE-SAMPLE] from=1794255379909 at=1794255379915 names=access_token,auth_state,csrftoken,refresh_token
[E2E-COOKIE-SAMPLE] from=1794255380909 at=1794255381910 names=nezistiteľné
[E2E-COOKIE-SAMPLE] from=1794255394925 at=1794255394925 names=nezistiteľné
[E2E-BROWSER-EVENT] at=1794255395093 kind=requestfailed path=/dashboard/offers/:n/reviews
[E2E-BROWSER-EVENT] at=1794255395094 kind=requestfailed path=/api/auth/skill-requests/:other/
[E2E-COOKIE-SAMPLE] from=1794255395925 at=1794255395928 names=žiadne
```

Podklad pre ďalšie preverenie (nie potvrdená chyba aplikácie):

- **Názov:** WebKit pri otvorení recenzií prestane odpovedať na čítanie cookies;
  neskôr sa potvrdí prázdny kontext a odmietnutá obnova.
- **Špec/test/projekt:** `offer-reviews-back.spec.ts`, `cudzí profil po F5 ›
  after a reload the arrow returns to the plain profile without a highlighted
  or flipped card`, desktopový WebKit, rozšírený režim, pokus 8/10.
- **Kroky:** existujúca relácia → verejný profil druhého testovacieho účtu →
  tlačidlo recenzií. Prípravný GET identity aj profilu majú 200.
- **Očakávané/skutočné:** otvoria sa recenzie a relácia zostane platná / URL
  sa neotvorí, dve požiadavky zlyhajú po približne 14 s, cookies sú potom
  prázdne a API/refresh vracajú 401/403. F5 sa ešte nestihlo vykonať.
- **Opakovanie:** presný 401/403 + úspešne odčítané prázdne cookies priebeh
  **1/80 celkových pokusov** tejto dávky; konkrétne 1/10 tohto testu/projektu
  v rozšírenom režime. Všetky neúspešné prejavy spolu 5/80; tieto čísla
  nesmú byť zamieňané. Historické výskyty 223 sú samostatné merania.
- **Podozrivá oblasť:** ovládacia/sieťová vrstva WebKitu v Dockeri a stav
  cookies pred obnovou. Konkrétny pád procesu ani chyba aplikácie nie sú
  preukázané. Časové okno možno porovnať s HTTP logmi Railway. Aplikáciu
  Codex nemení; pôvodné testy sa nezmäkčili.

Úplné **bezpečné** lokálne súhrny vrátane whitelistovaných riadkov zo všetkých piatich blokov
a pasívnych sond PASS sú `C:/Projects/svap-e2e-k15-223-baseline-20261109.json`
a `C:/Projects/svap-e2e-k15-223-expanded-20261109.json`. Dym, jeho tri
opakovania a farby: `svap-e2e-k15-smoke-20261109.json`,
`svap-e2e-k15-auth-repeat-20261109.json`, `svap-e2e-k15-colors-20261109.json`
v rovnakom lokálnom adresári. Nie sú to surové reporty a nepatria do commitu.

Po poslednom cielenom behu bolo majiteľovi oznámené ukončenie okna proti
Railway. Ďalšie kontroly už iba lokálne. Najbližší plný beh až po K16,
potvrdenom nasadení a novom okne bez zmien; 295 sa tu neimplementovalo.

### Záverečné lokálne kontroly a riziká

- **110/110** čistých Node kontrol vrátane cookie getterov, medzier v odčítaní,
  kruhovej pamäte, zlyhania cleanup GET a súkromia exportu/Buffer stderr.
- Izolovaný browser self-test fixture: vonkajšia kontrola PASS, úmyselných
  3 PASS / 3 FAIL / 3 SKIP zachovaných, práve tri bezpečné bloky. Samostatný
  response-diagnostics self-test **3/3 PASS**. Obe kontroly bez Railway,
  `.env.e2e`, používateľských účtov a skutočnej siete mimo `.invalid`.
- TypeScript celej aplikácie aj samostatný striktný TypeScript dotknutých
  E2E súborov, cielený ESLint a `git diff --check` prešli. Nový kontrolný
  scenár 320 pripúšťa syntetickú odpoveď iba na GET overenia, nie iné metódy.
- `--list` celkom **762 variantov / 44 špecov**, dym **51 / 7**, oba exit 0.
  Nejde o vykonaný celý beh. Dotknuté TS/TSX majú najviac 316 riadkov;
  žiadny nadlimitný TS súbor, app, backend, migrácia ani závislosť sa nemenili.
- Bezpečnostný self-audit: hodnoty cookies, tokeny, telá, osobné údaje ani
  raw browser logy do bezpečných výstupov nejdú. Test 320 neodosiela formulár,
  správy sa neposielajú a zdieľanie maže iba vlastné označené dočasné objekty.
  Auth stav, `.env.e2e`, reporty a lokálne JSON súhrny ostávajú mimo Git.
- Otvorené riziká: funkčné výpadky 223 (príčina neurčená), jednorazový nový
  F5 pád dymu (3 opakovania PASS, nie oprava), nemožnosť zaručiť upratanie
  neznámeho neskorého objektu pri výpadku. Žiadny preukázaný únik údajov;
  bez pôvodných dôkazov nemožno F5 pád klasifikovať ako chybu aplikácie.

Majiteľ následne 9. 11. výslovne schválil commit a push tejto dávky na
**novú vetvu `e2e/k15-dym-a-dokazy`**. Pred prípravou bol znovu stiahnutý
main, stále `b3d7983a`; kód testov ani aplikácie sa pri tom nemenil. Do
commitu patria iba E2E súbory a toto odovzdanie, nie lokálne reporty,
prílohy, auth stav ani `.env.e2e`. PR otvára len majiteľ; žiadne zlúčenie,
nasadenie alebo ďalší beh proti Railway sa týmto krokom nespúšťa.
