# B11 – implementácia a overenie Google login recovery

Dátum: 9. 10. 2026.
Stav: **oprava aj oba následné Rabbit nálezy implementované, automaticky overené;
nie nasadená**.
Pôvodný incident na fyzickom iPhone zatiaľ nie je uzatvorený.

## Kde je oprava

Zdrojové zmeny a testy sú v `C:\Projects\svap-google-login-audit`, na samostatnej
vetve `google-login-recovery`. Pri príprave commitu bol základ aktualizovaný na
`cb1fd7e1ce3ceccde1b3dec04b3ff80d01ee67c6` (`origin/main`, po merge PR #156).
Pred aktualizáciou bola overená neprítomnosť zmien v dotknutých login/auth súboroch
oproti pôvodnej overovanej revízii `8d67f7b61290c88767c8647928bddfc6f2b20c9b`.
Nevykonalo sa zlúčenie do `main` ani nasadenie. Publikovanie tejto vetvy slúži
na review pred schválenou integráciou a manuálnym retestom.

Hlavný checkout `C:\Projects\svap` zostal na vetve `108`, revízii `cd142d02`.
Jeho staršia implementácia loginu ani používateľove rozpracované zmeny sa neprepísali.
Používateľ odsúhlasil commit a push samostatnej opravy. Tá sa nekopírovala
na starší auth základ v hlavnom pracovnom priečinku.

## Rozsah podľa svaply.mdc

Google handler bol vyňatý do samostatného hooku. Odsúhlasené prepojenie vo formulári
zahŕňa iba import, použitie hooku a ochranu proti súbežnému heslovému loginu.
Formulár sa zmenšil z 534 na 392 riadkov; nový hook má 285 riadkov.
Nejde o refaktor zvyšku formulára.

Bez zmien backendu, migrácií, `AuthContext.tsx`, `api.ts`, `currentAccount.ts`,
registrácie, mazania účtu, avatarov alebo dashboardu. Callback stránka má malú
naväzujúcu opravu: nonce pôvodného pokusu sa posiela aj v chybových správach.
Žiadne nové používateľské texty; používajú sa existujúce preklady vo všetkých
šiestich jazykoch.

Kontrola hashov pred/po práci potvrdila nezmenenosť deviatich chránených súborov
v hlavnom checkoute, vrátane `DashboardContent.tsx`, `useDashboardState.ts`,
`LoginForm.tsx`, `AuthContext.tsx`, roadmapu a rozpracovaných zmien mazania účtu.

## Čo sa zmenilo v správaní

- Popup sa otvára synchronizovane z kliknutia, pred sieťovým `await`.
- Úspešná aj chybová správa vyžaduje správny origin, nonce aktuálneho pokusu
  v správe aj zhodný nonce v storage openera. Stará alebo neoveriteľná chyba
  nezruší novší pokus. Platná chyba aktuálneho pokusu zachová pôvodné ukončenie.
- Zatvorenie/neprístupnosť popupu alebo návrat cez focus/visibility spustí pomocnú
  cookie sondu `/auth/me/`. Skrytá stránka čaká na návrat do popredia.
- Sonda sama nenastavuje identitu a nepresmeruje. Pri platnom 200 nasleduje pôvodné
  autoritatívne `refreshUser({ force: true, verifyLogin: true })`.
- Pri 401 sa skúša najviac trojica sekvenčných sond, s odstupmi 500 a 1 500 ms;
  každá má nastavený 5-sekundový timeout a abort signál. 401 sa prijíma ako meraný
  anonymný výsledok, aby interceptor nespustil obnovovanie starej relácie.
- Tri anonymné výsledky odblokujú formulár bez falošného úspechu a bez hlášky chyby.
  V rámci jedného pokusu zostanú pasívne message/focus/visibility listenery a nonce,
  pretože zdanlivé zatvorenie cez COOP nemusí znamenať koniec Google prihlasovania.
  Po odpojení popupu nebeží ďalšie časované API pollovanie; neskorý platný callback
  alebo nový návrat do stránky môže obnovu znovu aktivovať.
  Ak popup naozaj zostáva otvorený, pokračuje pôvodná kontrola jeho zatvorenia.
- Technická chyba, timeout alebo 429 zastaví automatickú obnovu a zobrazí existujúcu
  hlášku. Odstránia sa timery, pomocná sonda a focus/visibility listenery, ale nonce
  a message listener zostanú pre platné neskoré potvrdenie aktuálneho pokusu.
  Takéto potvrdenie stále musí prejsť kontrolou originu/nonce aj strict overením
  backendu. Technická chyba sama nespúšťa ďalšie automatické API pokusy.
- Platné potvrdenie a recovery zdieľajú jedno dokončenie: strict overenie, CSRF
  priming, reset preferovaného modulu. Súbežné udalosti nevytvárajú druhé dokončenie.
- Heslový login je počas rozpracovaného Google toku blokovaný aj cez Enter/submit.
  Po anonymnom výsledku aj technickej chybe začatie heslového loginu zruší starý pokus.
- Nový pokus a odchod z formulára čistia timery, listenery, vlastný nonce a pomocnú
  sondu. Pri prirodzenom odmontovaní po backendovom overení sa zachová dokončenie
  resetu preferencií, bez navigácie už odmontovaného formulára.
- Logout/zmena účtu počas dokončovania nesmie obnoviť preferencie alebo spustiť
  oneskorenú navigáciu. Kontrola ID tu slúži iba na životný cyklus po strict overení,
  nikdy ako náhrada backendového overenia identity.

Retries sú ohraničené pre každé spustenie obnovy; nie je to celkový časový limit
Google loginu. Strict overenie a CSRF utility si zachovávajú existujúce správanie.

## Súbory oproti základnej revízii

Zmenené:

- `frontend/src/components/LoginForm.tsx` – vyňatie Google handlera a ochrana súbehu.
- `frontend/src/app/auth/callback/page.tsx` – nonce aj v oboch chybových vetvách,
  bez logovania nonce a bez zmeny existujúcich textov či časov zatvorenia popupu.
- `frontend/src/components/__tests__/LoginForm.test.tsx` – mock úspešného strict
  overenia teraz synchronizuje ID rovnako ako reálny provider; reset izolácie testov.

Nové, prípadne rozšírené diagnostické súbory z predchádzajúceho auditu:

- `frontend/src/components/login/useGoogleLogin.ts`
- `frontend/src/components/login/__tests__/useGoogleLogin.test.tsx`
- `frontend/src/components/login/__tests__/useGoogleLogin.probeFailure.test.tsx`
- `frontend/src/components/login/__tests__/useGoogleLogin.errorNonce.test.tsx`
- `frontend/src/app/auth/callback/__tests__/page.test.tsx`
- `frontend/src/components/__tests__/GoogleLoginCompletion.test.tsx`
- `frontend/e2e/helpers/googleLoginAudit.ts`
- `frontend/e2e/google-login-completion.spec.ts`
- `frontend/playwright.google-login-audit.config.ts`

Dokumentácia pribalená k PR:

- tento nový záznam,
- doplnený historický audit,
- aktualizovaný stav pôvodného plánu.

Migrácie: **žiadne**. Všetky dotknuté TS/TSX súbory sú pod 500 riadkami.
Pri čítaní bol opäť zistený `api.ts` s 907 riadkami; iba nahlásený, bez úprav.

## Vykonané lokálne kontroly

Príkazy z `C:\Projects\svap-google-login-audit\frontend`:

```powershell
npx jest src/components/login/__tests__/useGoogleLogin.test.tsx src/components/login/__tests__/useGoogleLogin.probeFailure.test.tsx src/components/login/__tests__/useGoogleLogin.errorNonce.test.tsx src/app/auth/callback/__tests__/page.test.tsx src/components/__tests__/GoogleLoginCompletion.test.tsx src/components/__tests__/LoginForm.test.tsx src/contexts/__tests__/AuthContext.session.test.tsx src/contexts/__tests__/AuthContext.test.tsx src/lib/__tests__/api.test.ts --runInBand --silent --detectOpenHandles --coverage --collectCoverageFrom=src/components/login/useGoogleLogin.ts --collectCoverageFrom=src/app/auth/callback/page.tsx --coverageReporters=text --coverageReporters=json-summary --coverageReporters=json
npx jest --runInBand --silent
npx tsc --noEmit --pretty false
npm run check:missing-translations
npm run check:used-translation-keys
npm run build
npx playwright test --config=playwright.google-login-audit.config.ts --list
```

| Kontrola | Výsledok |
| --- | --- |
| Cielená auth regresia + detekcia otvorených operácií | 9 suites / 171 PASS, exit 0, bez open-handle upozornenia |
| Kompletný frontend Jest po druhom review náleze | 381 suites / 4 982 PASS, exit 0, bez open-handle upozornenia |
| TypeScript po posledných zmenách | PASS, exit 0 |
| Zhoda prekladových katalógov | 0 missing / 0 extra |
| Použité prekladové kľúče | FAIL, tri existujúce feed kľúče – podrobnosti nižšie |
| Produkčný build po druhom review náleze | PASS, exit 0, po povolení siete pre Google Fonts |
| Playwright discovery | 30 testov: 10 scenárov × 3 projekty; **nie vykonaný E2E beh opravy** |
| Dokumentácia pomenovaných funkcií (lokálna TypeScript AST kontrola) | 32/32, 100 %; po prvom review 25/25, pred doplnením 13/22, 59,09 % |
| `git diff --check` | PASS |
| Registre krajín/okresov po prebuild synchronizácii | Bez zdrojových zmien |

Pokrytie **iba `useGoogleLogin.ts` a callback stránky**, nie celej aplikácie:

| Metrika | Hook | Callback |
| --- | --- | --- |
| Riadky | 100 % (166/166) | 100 % (63/63) |
| Funkcie | 100 % (22/22) | 100 % (10/10) |
| Vetvy | 97,95 % (96/98) | 100 % (18/18) |
| Statements | 98,98 % (195/197) | 98,50 % (66/67) |

Pôvodné tri zlyhávajúce integračné scenáre teraz prechádzajú bez skip alebo
expected-failure a bez oslabenia požiadavky automatického zotavenia pred reloadom.
Testy zahŕňajú chýbajúce/neskoré potvrdenie, neprístupný popup, oneskorené cookie,
trvalú 401, 500, timeout, sieť, 429, chybný payload/origin/nonce, súbeh udalostí,
nový pokus, heslový login, logout, odmontovanie a čistenie zdrojov.

## Doplnenie po Rabbit review PR #157

Review na commite `78b1a2d3` obsahovalo jeden platný funkčný nález: technická chyba
sondy volala úplné zrušenie pokusu a odstraňovala aj platné neskoré potvrdenie.
Riadené overenie pôvodného hooku potvrdilo problém pre sieť, timeout, 500 a 429.
Nových sedem cielených regresných prípadov najprv zlyhalo na pôvodnom kóde;
po oprave prechádzajú, bez skip/expected-failure alebo náhradnej klientskej identity.

Produkčná oprava rozlišuje vyčistenie automatickej obnovy od úplného zrušenia
Google pokusu. Úplné zrušenie pri novom Google/heslovom logine, odchode z formulára,
definitívnej OAuth chybe alebo chybe strict overenia/CSRF zostáva zachované.

Pridaných bolo 19 Jest prípadov: 15 samostatných testov chyby sondy a štyri
integračné prípady s reálnym `AuthProvider`, formulárom a Home. Overujú sa aj
nesprávny origin/nonce, zmenený/chýbajúci nonce v storage, duplicitná správa počas
overovania, odstránenie listenerov a neprítomnosť ďalšieho automatického sondovania.
Playwright pribudli scenáre platného potvrdenia po 500/429 vo všetkých troch
projektoch; zatiaľ bol vykonaný iba discovery, nie beh voči nenasadenému patchu.

Pre dokumentačné upozornenie pribudli vysvetľujúce JSDoc komentáre v hooku a jeden
komentár komponentu `LoginForm`; správanie formulára sa kvôli dokumentácii nemenilo.
Lokálna AST kontrola pomenovaných function declarations reprodukovala pôvodných
59,09 % a po doplnení ukázala 100 %. Toto nie je vyhlásenie výsledku nového Rabbit
review, ktoré sa musí vykonať po aktualizácii PR.

Oprava necháva zámernú hranicu obnovy: ak po technickej chybe nepríde žiadne platné
potvrdenie, automatické sondovanie už nepokračuje a používateľ môže začať nový pokus.
Nie je to neobmedzené pollovanie ani záruka dokončenia na ľubovoľne pomalej sieti.

## Druhý Rabbit nález: oneskorená OAuth chyba zo starého pokusu

Review revízie `b0161cae` obsahovalo jeden nový platný funkčný nález mimo diffu:
`OAUTH_ERROR` nekontroloval nonce a callback ho v chybových vetvách neposielal.
Oneskorená chyba zo starého popupu preto mohla zrušiť nový pokus o prihlásenie.

Pred produkčnou úpravou pribudlo 32 testov hooku a skutočnej callback stránky.
Na pôvodnom kóde 20 zlyhalo a 12 prešlo; failures zachytili práve chýbajúci nonce
aj zrušenie novšieho pokusu. Po oprave všetkých 32 prechádza. Ďalšie dva integračné
scenáre s reálnym `AuthProvider`, Home a formulárom overujú, že po ignorovaní starej
chyby nový pokus stále dokáže skončiť úspechom alebo správne spracovať vlastnú chybu.

Obe chybové vetvy callbacku posielajú nonce z vlastného popup `sessionStorage`,
nie z openera ani query parametrov. Ak čítanie storage zlyhá, hodnota je null;
hláška a zatvorenie popupu zostanú funkčné, ale opener takúto správu neprijme.
Hook kontroluje úspešné aj chybové správy rovnakým origin/nonce guardom.
Definitívna chyba správneho pokusu stále ukončí loading, odstráni listenery,
timery aj vlastný nonce a nemôže sa spracovať druhýkrát.

Regresia zahŕňa starú chybu po anonymnej aj chybovej sonde, chýbajúci/null/prázdny
nonce, chybný origin, zmenený/chýbajúci/neprístupný storage, chybu počas čakajúcej
sondy, oneskorené výsledky po zrušení a callback one-shot pri zmenách témy/query.
Neoslabuje strict backendové overenie ani nenastavuje identitu zo správy.

Playwright pribudol scenár dvoch pokusov: stará queued chyba sa ignoruje,
platná chyba nového popupu sa spracuje a backend zostáva anonymný. Je pripravený
pre WebKit desktop, WebKit mobil a Chromium; teraz sa vykonal iba discovery.
Používateľ odsúhlasil samostatný commit a push tohto patchu do existujúceho PR #157
na ďalšie Rabbit review. Zlúčenie ani nasadenie nie sú súčasťou tohto kroku.
Lokálne testy nie sú vyhlásením nového Rabbit review ani fyzického iPhone retestu.

Súbory upravené iba v tomto poslednom kole oproti `b0161cae`:

- produkčné: `frontend/src/components/login/useGoogleLogin.ts`,
  `frontend/src/app/auth/callback/page.tsx`;
- existujúce Jest testy: `frontend/src/components/login/__tests__/useGoogleLogin.test.tsx`,
  `frontend/src/components/__tests__/GoogleLoginCompletion.test.tsx`;
- nové Jest testy: `frontend/src/components/login/__tests__/useGoogleLogin.errorNonce.test.tsx`,
  `frontend/src/app/auth/callback/__tests__/page.test.tsx`;
- Playwright: `frontend/e2e/helpers/googleLoginAudit.ts`,
  `frontend/e2e/google-login-completion.spec.ts`;
- dokumentácia: tento záznam.

Všetkých osem dotknutých TS/TSX súborov má menej než 500 riadkov; najdlhší má
423. Po celom Jest behu a produkčnom builde bol znovu overený stav hlavného checkoutu
aj nezmenenosť deviatich chránených súborov. Prebuild nevytvoril zmeny registrov.

## Upozornenia, ktoré neboli potichu opravované

1. Kontrola použitých prekladov hlási `feed.captionPlaceholder`,
   `feed.commentsClose`, `feed.openProfile`. Ich neprítomnosť bola potvrdená aj
   v `messages/sk.json` na základnom HEAD; feed ani preklady nie sú v diff-e.
   Existujúce tri auth texty používané opravou sú vo všetkých šiestich jazykoch.
2. Pôvodný kompletný Jest nad revíziou `8d67f7b6` mal 370 suites / 4 400 PASS
   a po úspechu vypísal upozornenie na neukončenú operáciu. Po aktualizácii základu
   na `cb1fd7e1` bol celý beh zopakovaný: 378 suites / 4 929 PASS, exit 0,
   bez tohto upozornenia. Po review oprave prešlo 379 suites / 4 948 testov aj
   cielených sedem auth suites s `--detectOpenHandles`, bez upozornenia; pôvodný
   zdroj upozornenia nebol priradený konkrétnemu súboru.
3. Build vypísal existujúce odporúčanie Sentry na globálny error handler.
   Prvý pokus o build zlyhal iba na blokovanom prístupe k Google Fonts; po povolení
   sieťového prístupu prešiel bez zmeny kódu fontov či build konfigurácie.

## Čo ešte treba na uzatvorenie B11

1. Dokončiť Rabbit/CI review vetvy `google-login-recovery`, následne schválenú
   integráciu a nasadenie. Push vetvy sám osebe nie je merge ani deploy.
2. Po nasadení zopakovať celú Google Playwright sadu proti odsúhlasenému Railway:
   WebKit desktop, WebKit iPhone 15 emulácia a Chromium desktop. Pripravené scenáre:
   bežné potvrdenie, skutočné zrušenie, 401 → 401 → 200, 500, 429, platné potvrdenie
   po 500/429, chýbajúce a neskoré potvrdenie a stará chyba počas nového pokusu.
   Windows WebKit je blokovaný systémovou
   politikou; použiť už overený oficiálny Linux Playwright kontajner.
3. Fyzický iPhone Safari a nainštalovaná PWA: skutočné Google prihlásenie bez reloadu,
   zrušenie, návrat medzi kartami/apkami, opakované odhlásenie/prihlásenie a pomalšia
   sieť. Overiť dashboard, správny účet a viditeľnú chybu pri zlyhaní.

Predopravový riadený Railway beh skončil 6 PASS / 6 FAIL a je zachovaný v audite.
Nie je vydávaný za výsledok novej opravy. Riadené Playwright scenáre používajú
reálnu backendovú cookie reláciu určeného testovacieho účtu, ale simulujú transport
Google potvrdenia; ani úspešný nový beh nenahradí skutočný Google proces na iPhone.

**Lokálne je potvrdená oprava reprodukovaného mechanizmu. Nie je potvrdené, že
pôvodný fyzický iPhone incident už bol v nasadenej aplikácii odstránený.**
