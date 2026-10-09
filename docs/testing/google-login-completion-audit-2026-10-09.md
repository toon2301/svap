# B11 – audit dokončenia Google prihlásenia

Tento dokument zachováva výsledky diagnostiky **pred opravou**.
Následná odsúhlasená implementácia a jej lokálne výsledky sú v
[samostatnom zázname](google-login-recovery-implementation-2026-10-09.md).
Nasledujúce pôvodné FAIL výsledky nepredstavujú opakovaný beh novej opravy.

## Rozsah a revízia

Audit zo dňa 9. 10. 2026 je diagnostika a doplnenie testov, nie oprava aplikácie.
Overovaná revízia: `8d67f7b61290c88767c8647928bddfc6f2b20c9b` (`origin/108` pri začatí auditu).
To samo osebe nepotvrdzuje revíziu aktuálne nasadenú na Railway.

Hlavný checkout `C:\Projects\svap` bol na staršej revízii `cd142d02` a obsahoval
rozpracované zmeny. Bez prepnutia vetvy alebo zásahu do týchto zmien vznikol
oddelený checkout `C:\Projects\svap-google-login-audit` na overovanej revízii.
Nové testy zostali tam, aby sa nezmiešali so staršou implementáciou v hlavnom checkoute.

Produkčný kód, existujúce testy a používateľove rozpracované zmeny neboli upravované.
Nevznikla migrácia, commit, push ani nasadenie.

## Potvrdený mechanizmus

`LoginForm.handleGoogleLogin` pri zistení zatvoreného popupu:

- odstráni listener pre `message`,
- odstráni uložený OAuth nonce,
- odblokuje tlačidlo Google,
- neoverí novú reláciu cez `/me` a nepresmeruje na dashboard.

Výnimku pri čítaní `popup.closed` vyhodnotí rovnako ako zatvorenie.
Platné potvrdenie prichádzajúce až po tomto kroku sa už nespracuje.

Nový test používa reálny formulár, AuthProvider a hlavnú stránku. Simulovaný backend
najprv vráti anonymnú reláciu, potom novú platnú reláciu. Pri chýbajúcom potvrdení,
neskorom potvrdení alebo výnimke z `popup.closed` zostane stránka anonymná,
tlačidlo odblokované a počet chybových hlášok nulový. Nový bootstrap pri simulovanom
reloade rozpozná rovnakú platnú reláciu a presmeruje na dashboard.

Toto je deterministický dôkaz chyby pri riadenom poradí udalostí. Nie je to dôkaz,
že pôvodný incident na fyzickom iPhone vznikol presne tým istým transportným problémom.
Pôvodné udalosti z toho iPhonu nemáme zaznamenané. Čítanie `popup.closed` hádzajúce
výnimku je simulovaný okrajový prípad, nie potvrdená udalosť na iPhone.

## Nové súbory v oddelenom checkoute

- `frontend/src/components/__tests__/GoogleLoginCompletion.test.tsx`
- `frontend/e2e/helpers/googleLoginAudit.ts`
- `frontend/e2e/google-login-completion.spec.ts`
- `frontend/playwright.google-login-audit.config.ts`

Samostatná Playwright konfigurácia vypína zdieľaný prihlásený globalSetup,
persistovanie cookie snapshotu, trace, screenshoty a video. Zachováva produkčnú
adresu a projekty WebKit desktop, WebKit mobile a Chromium desktop.

## Vykonané kontroly

Príkazy boli spustené z `C:\Projects\svap-google-login-audit\frontend`.

```powershell
npx jest src/components/__tests__/GoogleLoginCompletion.test.tsx --runInBand --silent
```

Výsledok opakovaných behov: **7 PASS, 3 FAIL**, exit code 1.
Tri neúspešné testy overujú požadované automatické zotavenie, ktoré aplikácia zatiaľ
nemá. Nie sú preskočené ani označené ako očakávané zlyhanie. Ostatné testy overujú
úspešné potvrdenie, skutočné zrušenie bez relácie, odmietnutie neplatného originu/nonce,
duplicitné potvrdenie a viditeľnú chybu pri `/me` 401/500.

```powershell
npx jest src/components/__tests__/LoginForm.test.tsx src/contexts/__tests__/AuthContext.session.test.tsx src/contexts/__tests__/AuthContext.test.tsx src/lib/__tests__/api.test.ts --runInBand --silent
npx tsc --noEmit --pretty false
npx playwright test --config=playwright.google-login-audit.config.ts --list
```

- Existujúce cielené testy: **4 suites, 60 PASS**.
- TypeScript: **PASS**, exit code 0.
- Playwright discovery: **12 testov** – 4 scenáre pre každý z troch projektov.
  Discovery nie je vykonaný prehliadačový test.
- Anonymné otvorenie Railway cez Chromium: `/api/auth/me/` vrátil **401**.

## Prihlásené Playwright overenie po povolení

Prvý pokus o spustenie blokovala bezpečnostná kontrola. Po výslovnom povolení
používateľom bol uložený testovací účet použitý iba na odsúhlasenej adrese
`https://stunning-inspiration-svap.up.railway.app/api/auth/login/`.

Vykonané E2E testy používajú reálnu nasadenú appku a cookie reláciu testovacieho
účtu; priebeh OAuth potvrdenia je riadený. Nenavštevujú Google a neoverujú jeho
skutočný prihlasovací proces. Nevytvárajú ani nemažú obsah. Vlastnú testovaciu reláciu
po každom prihlásenom scenári odhlásili; všetky cleanup POST-y skončili 200.
Helper povoľuje iba presný vyššie uvedený
origin, nie ľubovoľný Railway server. Diagnostický výstup obsahuje len cestu,
HTTP status, stav tlačidla a počet hlášok, nie identitu, nonce, heslo alebo cookies.

Prvý vykonaný beh skončil **3 PASS / 9 FAIL**. Tri zlyhania pri skutočnom zrušení
boli nepresnosť nového testu: celostránkové počítanie `role=alert` zahŕňalo aj
prázdny navigačný alert Next.js. Anonymné preverenie DOM potvrdilo `DIV` v shadow
roote `NEXT-ROUTE-ANNOUNCER`, s dĺžkou textu 0. Meranie v testovacom helperi bolo
zúžené na chyby v karte prihlasovacieho formulára, bez zásahu do appky.

Celá sada bola potom spustená znovu, bez retry: **6 PASS / 6 FAIL**, exit code 1,
približne 1,5 minúty. TypeScript po úprave helpera opäť prešiel.

| Projekt | Potvrdenie pred zavretím | Zrušenie bez relácie | Chýbajúce potvrdenie | Neskoré potvrdenie |
| --- | --- | --- | --- | --- |
| WebKit desktop | PASS | PASS | FAIL | FAIL |
| WebKit mobile – emulácia iPhone 15 | PASS | PASS | FAIL | FAIL |
| Chromium desktop | PASS | PASS | FAIL | FAIL |

Šesť neúspešných regresných testov predstavuje tie isté dva problémové scenáre
v troch projektoch, nie šesť nezávislých chýb. V každom z nich bolo overené:

1. Pred prihlásením bol backend anonymný (`/me` 401).
2. Po vytvorení novej relácie backend vrátil `/me` 200 ešte pred reloadom.
3. Appka napriek tomu zostala na `/`, Google tlačidlo bolo aktívne a počet
   chybových hlášok prihlasovania bol 0.
4. Reload rozpoznal tú istú reláciu, otvoril `/dashboard` a dashboard bol viditeľný.
5. Test zlyhal až na požiadavke, aby appka tento stav zvládla automaticky bez reloadu.

Tým je potvrdené, že chyba zotavenia existuje aj v nasadenej aplikácii a nie je
obmedzená iba na mobilný Safari. Stále nejde o dôkaz, ktorá udalosť sa stratila
pri pôvodnom reálnom Google prihlásení na používateľovom iPhone.

Použitý príkaz v oficiálnom Playwright Linux kontajneri
(Windows WebKit v tomto prostredí blokuje systémová bezpečnostná politika):

```powershell
docker run --rm --ipc=host --mount "type=bind,source=C:\Projects\svap-google-login-audit\frontend,target=/work" --mount "type=bind,source=C:\Projects\svap\frontend\node_modules,target=/work/node_modules,readonly" --mount "type=bind,source=C:\Projects\svap\frontend\.env.e2e,target=/work/.env.e2e,readonly" --workdir /work mcr.microsoft.com/playwright:v1.63.0-noble node node_modules/@playwright/test/cli.js test --config=playwright.google-login-audit.config.ts --output=test-results/google-login-audit-confirmed
```

## Čo ešte nie je overené

Ani WebKit emulácia nenahrádza skutočný iPhone. Na definitívne priradenie pôvodnej
chyby treba pri jej opakovaní zachytiť bezpečné časovanie popup/callback udalostí,
stav `/me` pred reloadom a navigáciu priamo na zariadení. Nezbierať obsah tokenov,
cookies, heslá ani OAuth query parametre.

## Guardrails

`LoginForm.tsx` v overovanej revízii má 534 riadkov. Podľa `svaply.mdc` sa tento
nález iba hlási; súbor zostal nezmenený. Refaktor dashboardu a zmeny mazania účtu
sú mimo rozsahu auditu a zostali zachované.
