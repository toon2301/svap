# B11 – mapovanie minimálnej opravy

Stav: pôvodný plán bol odsúhlasený a lokálna oprava bola implementovaná
v oddelenom checkoute. Nasadenie a overenie na fyzickom iPhone zostávajú otvorené.
Dátum: 9. 10. 2026.
Výsledok implementácie: [B11 – implementácia a overenie](google-login-recovery-implementation-2026-10-09.md).
Nasledujúce mapovanie a baseline výsledky opisujú stav pred touto opravou.
Podklad: audit na revízii `8d67f7b61290c88767c8647928bddfc6f2b20c9b`
a vykonané riadené Playwright testy proti Railway.

## Čo je potvrdené

- `LoginForm.tsx:243–259`: zistenie zatvoreného alebo neprístupného popupu odstráni
  listener aj nonce, odblokuje tlačidlo a neoverí existenciu novej relácie.
- `LoginForm.tsx:184–201`: až platné `OAUTH_SUCCESS` so správnym originom a nonce
  spustí autoritatívne `refreshUser({ force: true, verifyLogin: true })`.
- `AuthContext.tsx:86–199`: overenie chráni pred starou identitou, novšími requestmi
  a súbežným logoutom. Jeho návratový typ je `Promise<void>`; strict zlyhania sú
  normalizované na `SessionVerificationError` bez rozlíšenia HTTP 401 a 500.
- `app/page.tsx:20–24`: hlavná stránka presmeruje až pri vyriešenom auth stave s userom.
  Preto reload pomôže: spustí nový auth bootstrap.
- `google_oauth_simple.py:390–427`: backend vytvorí redirect na frontend callback
  a nastaví HttpOnly auth cookies na odpovedi. FE nesmie vyrábať tieto cookies ani
  považovať callback query, localStorage alebo nonce za dôkaz identity.
- `LoginForm` sa v produkčnom kóde používa iba na hlavnej stránke. `/login` iba
  presmeruje na `/`. Oprava nemusí zasahovať do dashboardu alebo jeho routingu.

Regresná chyba bola pri chýbajúcom aj neskorom potvrdení reprodukovaná v nasadenej
appke vo všetkých troch projektoch: WebKit desktop, WebKit mobile a Chromium.
Skutočný proces Google a pôvodný incident na fyzickom iPhone tým nie sú zaznamenané.

## Minimálny navrhnutý rozsah

1. Nový hook `frontend/src/components/login/useGoogleLogin.ts` pre existujúci Google
   popup tok a jeho obnovu. Presunúť iba Google handler, nie celý prihlasovací formulár.
2. V `LoginForm.tsx` nahradiť vyňatý handler krátkym prepojením hooku s existujúcim
   loading stavom a chybovou hláškou. Zachovať tlačidlo, štýl, preklady a ostatné formuláre.
3. Doplniť samostatné testy hooku a existujúcu integračnú sadu
   `GoogleLoginCompletion.test.tsx`.
4. Rozšíriť a zopakovať existujúcu Playwright sadu v izolovanom testovacom checkoute.

Bez zmien backendu, migrácií, `AuthContext.tsx`, `api.ts`, callback stránky,
dashboardu, registračného flow a mazania účtu.

## Ako má oprava fungovať

- Popup naďalej otvoriť priamo v reakcii na kliknutie, pred prvým `await`.
  Nespraviť z neho okno otvorené až po sieťovom requeste – Safari ho môže zablokovať.
- Platné existujúce potvrdenie ďalej používa kontrolu originu a nonce.
- Zatvorenie/strata spojenia s popupom spustí zotavenie, nie slepý redirect ani
  okamžité vymazanie informácií potrebných pre oneskorený callback.
- Návrat do pôvodného okna (`focus`, viditeľné `visibilitychange`) je ďalší spúšťač
  obnovy, ale iba počas daného Google pokusu. Žiadne globálne auth pollovanie.
- Čítanie `popup.closed` môže zlyhať alebo byť nespoľahlivé. Nepovažovať to za
  dôkaz, že používateľ už dokončil alebo zrušil prihlasovanie. Pri skrytej stránke
  počkať na jej návrat; nepotvrdiť predčasné zrušenie, kým je človek ešte v Google.
- Pre fallback najprv bezpečne zistiť stav cookie relácie na existujúcom `/auth/me/`.
  Sonda nesmie nastavovať klientsku identitu. Rozlíši 200, 401 a technické zlyhanie.
  Zachovať rovnaký API baseURL a posielanie cookies. Pre sondu prijať HTTP 401 ako
  meraný výsledok, nie ako pokyn na automatické obnovovanie starej refresh relácie.
- Pri 200 použiť existujúce strict `refreshUser` na skutočné nastavenie identity.
  To znamená dodatočnú sondu len vo fallback vetve, nie druhú sondu pri bežnom potvrdení.
  Nikdy nenastavovať usera priamo z výsledku pomocnej sondy.
- Pre krátke oneskorenie cookie navrhujem najviac tri sekvenčné sondy, s odstupmi
  500 ms a 1 500 ms po predchádzajúcom anonymnom výsledku. Každá sonda má vlastný
  timeout a AbortController. Žiadne prekryté intervalové requesty.
- Technická chyba alebo 429 nie je zrušenie: zastaviť automatické pokusy a zobraziť
  zrozumiteľnú existujúcu hlášku. O samotnej 401 rozhodovať v kontexte návratu a
  platného oneskoreného potvrdenia, nie odstránením všetkých listenerov pri prvom výsledku.
- Sonda nevyrába reláciu, neopakuje Google login a nepoužíva tokeny v URL/JS storage.
- Platné potvrdenie a fallback musia zdieľať jediné dokončenie aktuálneho pokusu:
  strict overenie, CSRF priming, existujúci reset preferovaného modulu a navigácia.
  Nevyvolať dve súbežné strict overenia pri súbehu focus + message + popup polling.
- Nový pokus zruší zdroje starého. Spustenie heslového loginu musí takisto ukončiť
  starú Google obnovu, aby stará asynchrónna obsluha nesmerovala nový login.
- Po opustení formulára odstrániť listenery a timery a abortovať pomocnú sondu.
  Rozlíšiť prirodzené odmontovanie formulára pri overení usera od odchodu používateľa
  na inú stránku: cleanup nesmie pokaziť práve dokončené úspešné prihlásenie.

Presné retry/cleanup prechody sa pri implementácii overia riadenými testmi;
navrhnutý časový odstup nie je záruka správania ľubovoľne pomalej siete alebo iOS.
Timeout pomocnej sondy tiež nie je celkový časový limit loginu: existujúce strict
overenie a CSRF priming majú vlastné správanie, ktoré tento patch nemení.

## Používateľské výsledky

| Situácia | Očakávaný výsledok |
| --- | --- |
| Platné potvrdenie, `/me` 200 | Dashboard ako dnes |
| Potvrdenie chýba, nová platná relácia existuje | Dashboard bez reloadu |
| Platné potvrdenie príde počas obnovy | Dokončenie raz, bez pretekov |
| Používateľ zavrie okno bez prihlásenia, backend zostane 401 | Zostane formulár, tlačidlo sa odblokuje, bez falošného úspechu |
| Spojenie s popupom zanikne ešte pred dokončením Google | Nepovažovať to samo osebe za zrušenie; zohľadniť návrat do stránky |
| Sieť/500/timeout | Žiadny neoverený redirect, hláška a možnosť opakovať |
| 429 | Existujúca informácia o limite, bez automatického opakovania |
| Chybný origin alebo nonce | Potvrdenie ignorovať, žiadne udelenie identity |
| Nový pokus, heslový login alebo odchod z formulára | Stará obsluha nesmie presmerovať či meniť stav nového pokusu |

Existujúce texty `auth.sessionVerificationFailed`, `auth.googleLoginFailed` a
`auth.tooManyRequests` sú overené vo všetkých šiestich jazykoch: SK, CS, EN, PL, DE, HU.
Pri tomto rozsahu nie je potrebné pridávať nový text do aplikácie.

## Overenie pred dokončením opravy

- Existujúce tri červené integračné scenáre musia prejsť, bez skip/expected-failure.
- Doplniť: oneskorené cookies 401 → 200, trvalú 401, 500, sieťový timeout, 429,
  neprístupné okno pred backend loginom a návrat zo skrytého Google okna.
- Doplniť: súbeh focus/visibility/message, duplicitné potvrdenie, starý nonce,
  nový pokus počas rozpracovanej sondy, heslový login, logout a odmontovanie formulára.
- Overiť, že po dokončení nezostávajú timery/listenery a abort nie je zobrazený ako chyba.
- Pre nový hook cieľ minimálne 95 % testového pokrytia; reportovať skutočne namerané
  riadky, vetvy, funkcie a statements, nie sľubovať pokrytie celej aplikácie.
- Zopakovať jest baseline: LoginForm, AuthContext, session tests, API tests.
- TypeScript, kontrola prekladov, produkčný build; nevydávať build za E2E dôkaz.
- Po nasadení opravy na odsúhlasený Railway zopakovať plné WebKit desktop + mobile
  a Chromium testy. Test existujúcej nezmenenej produkcie nemôže potvrdiť nový patch.
- Nakoniec fyzický iPhone Safari/PWA: skutočné Google prihlásenie, zrušenie,
  návrat do pôvodnej karty, spomalená sieť, opakovanie; žiadny nutný reload.

Pri mapovaní opäť vykonaná lokálna sada: **67 PASS / 3 FAIL**, 70 testov v 5 suites.
Tri zlyhania sú stále tie isté potvrdené chýbajúce recovery scenáre. Neboli opravované.

## Guardrails pri pôvodnom mapovaní

- `LoginForm.tsx` má **534 riadkov**. `svaply.mdc` zakazuje jeho úpravu bez výnimky.
  Pred implementáciou treba výslovnú výnimku len na vyňatie Google handlera a krátke
  prepojenie nového hooku. Nie výnimku na ďalší refaktor celého formulára.
- Pri čítaní súvisiacich súborov bol zistený aj `api.ts` s **907 riadkami**.
  Iba sa hlási; zostáva mimo diffu.
- Hlavný checkout je stále na staršom `cd142d02` a má používateľove rozpracované zmeny.
  Nekopírovať nový hook na túto staršiu auth implementáciu a neaktualizovať vetvu
  automaticky. Patch pripraviť nad overovanou revíziou v oddelenom checkoute.
  Jeho prenos/zlúčenie do pracovnej vetvy riešiť výslovne, bez prepísania cudzích zmien.
- Toto mapovanie nevykonáva opravu ani deploy. Produkčný kód zostal nezmenený.
