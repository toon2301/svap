# B11 – implementácia a overenie Google login recovery

Dátum: 9. 10. 2026.
Stav: **oprava implementovaná, automaticky overená a pripravená na Git review;
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
Formulár sa zmenšil z 534 na 391 riadkov; nový hook má 272 riadkov.
Nejde o refaktor zvyšku formulára.

Bez zmien backendu, migrácií, `AuthContext.tsx`, `api.ts`, `currentAccount.ts`,
callback stránky, registrácie, mazania účtu, avatarov alebo dashboardu.
Žiadne nové používateľské texty; používajú sa existujúce preklady vo všetkých
šiestich jazykoch.

Kontrola hashov pred/po práci potvrdila nezmenenosť deviatich chránených súborov
v hlavnom checkoute, vrátane `DashboardContent.tsx`, `useDashboardState.ts`,
`LoginForm.tsx`, `AuthContext.tsx`, roadmapu a rozpracovaných zmien mazania účtu.

## Čo sa zmenilo v správaní

- Popup sa otvára synchronizovane z kliknutia, pred sieťovým `await`.
- Normálne potvrdenie stále vyžaduje správny origin a nonce aktuálneho pokusu.
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
- Technická chyba, timeout alebo 429 zastaví obnovu a zobrazí existujúcu hlášku.
- Platné potvrdenie a recovery zdieľajú jedno dokončenie: strict overenie, CSRF
  priming, reset preferovaného modulu. Súbežné udalosti nevytvárajú druhé dokončenie.
- Heslový login je počas rozpracovaného Google toku blokovaný aj cez Enter/submit.
  Po anonymnom odblokovaní začatie heslového loginu zruší starý Google pokus.
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
- `frontend/src/components/__tests__/LoginForm.test.tsx` – mock úspešného strict
  overenia teraz synchronizuje ID rovnako ako reálny provider; reset izolácie testov.

Nové, prípadne rozšírené diagnostické súbory z predchádzajúceho auditu:

- `frontend/src/components/login/useGoogleLogin.ts`
- `frontend/src/components/login/__tests__/useGoogleLogin.test.tsx`
- `frontend/src/components/__tests__/GoogleLoginCompletion.test.tsx`
- `frontend/e2e/helpers/googleLoginAudit.ts`
- `frontend/e2e/google-login-completion.spec.ts`
- `frontend/playwright.google-login-audit.config.ts`

Dokumentácia v hlavnom checkoute:

- tento nový záznam,
- doplnený historický audit,
- aktualizovaný stav pôvodného plánu.

Migrácie: **žiadne**. Všetky dotknuté TS/TSX súbory sú pod 500 riadkami.
Pri čítaní bol opäť zistený `api.ts` s 907 riadkami; iba nahlásený, bez úprav.

## Vykonané lokálne kontroly

Príkazy z `C:\Projects\svap-google-login-audit\frontend`:

```powershell
npx jest src/components/login/__tests__/useGoogleLogin.test.tsx src/components/__tests__/GoogleLoginCompletion.test.tsx src/components/__tests__/LoginForm.test.tsx src/contexts/__tests__/AuthContext.session.test.tsx src/contexts/__tests__/AuthContext.test.tsx src/lib/__tests__/api.test.ts --runInBand --silent --detectOpenHandles --coverage --collectCoverageFrom=src/components/login/useGoogleLogin.ts --coverageReporters=text --coverageReporters=json-summary
npx jest --runInBand --silent
npx tsc --noEmit --pretty false
npm run check:missing-translations
npm run check:used-translation-keys
npm run build
npx playwright test --config=playwright.google-login-audit.config.ts --list
```

| Kontrola | Výsledok |
| --- | --- |
| Cielená auth regresia + detekcia otvorených operácií | 6 suites / 118 PASS, exit 0, bez open-handle upozornenia |
| Kompletný frontend Jest nad aktuálnym main | 378 suites / 4 929 PASS, exit 0 |
| TypeScript po posledných zmenách | PASS, exit 0 |
| Zhoda prekladových katalógov | 0 missing / 0 extra |
| Použité prekladové kľúče | FAIL, tri existujúce feed kľúče – podrobnosti nižšie |
| Produkčný build | PASS, exit 0, po povolení siete pre Google Fonts |
| Playwright discovery | 21 testov: 7 scenárov × 3 projekty; **nie vykonaný E2E beh opravy** |
| `git diff --check` | PASS |
| Registre krajín/okresov po prebuild synchronizácii | Bez zdrojových zmien |

Pokrytie **iba nového `useGoogleLogin.ts`**, nie celej aplikácie:

| Metrika | Pokrytie |
| --- | --- |
| Riadky | 100 % (165/165) |
| Funkcie | 100 % (22/22) |
| Vetvy | 97,80 % (89/91) |
| Statements | 98,96 % (191/193) |

Pôvodné tri zlyhávajúce integračné scenáre teraz prechádzajú bez skip alebo
expected-failure a bez oslabenia požiadavky automatického zotavenia pred reloadom.
Testy zahŕňajú chýbajúce/neskoré potvrdenie, neprístupný popup, oneskorené cookie,
trvalú 401, 500, timeout, sieť, 429, chybný payload/origin/nonce, súbeh udalostí,
nový pokus, heslový login, logout, odmontovanie a čistenie zdrojov.

## Upozornenia, ktoré neboli potichu opravované

1. Kontrola použitých prekladov hlási `feed.captionPlaceholder`,
   `feed.commentsClose`, `feed.openProfile`. Ich neprítomnosť bola potvrdená aj
   v `messages/sk.json` na základnom HEAD; feed ani preklady nie sú v diff-e.
   Existujúce tri auth texty používané opravou sú vo všetkých šiestich jazykoch.
2. Pôvodný kompletný Jest nad revíziou `8d67f7b6` mal 370 suites / 4 400 PASS
   a po úspechu vypísal upozornenie na neukončenú operáciu. Po aktualizácii základu
   na `cb1fd7e1` bol celý beh zopakovaný: 378 suites / 4 929 PASS, exit 0,
   bez tohto upozornenia. Cielených šesť auth suites s `--detectOpenHandles`
   tiež prešlo bez upozornenia; pôvodný zdroj upozornenia nebol priradený konkrétnemu súboru.
3. Build vypísal existujúce odporúčanie Sentry na globálny error handler.
   Prvý pokus o build zlyhal iba na blokovanom prístupe k Google Fonts; po povolení
   sieťového prístupu prešiel bez zmeny kódu fontov či build konfigurácie.

## Čo ešte treba na uzatvorenie B11

1. Dokončiť Rabbit/CI review vetvy `google-login-recovery`, následne schválenú
   integráciu a nasadenie. Push vetvy sám osebe nie je merge ani deploy.
2. Po nasadení zopakovať celú Google Playwright sadu proti odsúhlasenému Railway:
   WebKit desktop, WebKit iPhone 15 emulácia a Chromium desktop. Pripravené scenáre:
   bežné potvrdenie, skutočné zrušenie, 401 → 401 → 200, 500, 429, chýbajúce a
   neskoré potvrdenie. Windows WebKit je v tomto prostredí blokovaný systémovou
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
