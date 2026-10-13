# Sledovanie: oprava nulových cenových hraníc

Dátum: 13. 10. 2026. Základ: main `25ed763045c9c0daecf6d7ec5a5e9d5d4fa79014`.
Oprava je na lokálnej vetve `offer-watch-zero-prices` v `C:\Projects\svap-google-login-audit`.
Pri pôvodnom dokončení OW-01 nebol urobený commit, push ani nasadenie. Používateľ
13. 10. neskôr autorizoval spoločný commit/push OW-01 a OW-02; nasadenie zostáva
samostatným krokom. Deväť rozpracovaných súborov v `C:\Projects\svap` ostalo
obsahovo nezmenených; overené porovnaním SHA-256.

## Výsledné správanie

Platí výhradne pre filtre sledovania, nie pre ceny ponúk/dopytov.

| Cena od | Cena do | Uložený význam |
| --- | --- | --- |
| 0 | 0 | Bez cenového obmedzenia; obe hranice null, mena prázdna |
| 0 | 100 | Len maximálna cena 100; mena zostáva povinná |
| 100 | 0 | Len minimálna cena 100; bez chyby poradia |
| prázdne | 0 | Bez cenového obmedzenia |
| 0,01 alebo 0.01 | prázdne | Skutočný kladný limit 0,01 sa zachová |

- Nula sa normalizuje pri opustení cenového poľa a pri uložení, nie pri každom znaku.
- Používateľ preto môže normálne napísať `0,50` alebo `0.50`.
- Rozpracovaná nula neprepíše ručne vybranú menu počas písania zlomku.
- Po vyčistení oboch hraníc sa mena vymaže a vypne.
- Neplatný text sa nevymaže namiesto zobrazenia validačnej chyby.
- Načítanie starého nulového filtra nemení uložený objekt; Zrušiť neodosiela zmeny.
- Backend normalizuje pred kontrolou poradia, meny a duplicity, aj pri čiastočnom PATCH.
- Sémanticky nezmenený PATCH zachová `updated_at`, teda aj aktivačný čas sledovania.
- Ponuka s reálnou cenou 0 zostáva zdarma. Neurčená cena a cena dohodou sa nemenia.

## Migrácia 0123

`backend/accounts/migrations/0123_normalize_offer_watch_zero_prices.py` používa historický
model cez `apps.get_model` a správny databázový alias.

Pred akýmkoľvek prepisom overí normalizované duplicity. Pri konflikte sa zastaví
s diagnostikou ID konfliktných skupín. Žiadne sledovanie sa automaticky nezlučuje
ani nemaže; vyriešenie prípadného reálneho konfliktu potrebuje samostatné rozhodnutie.

Následne jedným prepisom normalizuje hranice aj menu a pridá kontroly
„kladná cena alebo null“. Obídenie modelovej validácie nemôže do databázy uložiť
doslovnú nulu ako hranicu sledovania. ID, sloty, dátumy, deduplikačné záznamy
a outboxy zostávajú zachované; migrácia neposiela upozornenia.

Migrácia bola aplikovaná iba v izolovaných testovacích databázach. Produkčná migrácia
nebola spustená. Návrat schémy nezrekonštruuje bývalé nuly: normalizované null hodnoty
zostanú null, pretože ich pôvod nemožno bezpečne odvodiť.

## Výsledky kontrol

| Kontrola | Výsledok |
| --- | --- |
| Celý frontend Jest, posledný beh | 396 sád / 5 427 testov PASS |
| Celá sekcia Offer Watch Jest | 32 sád / 244 testov PASS |
| Pokrytie štyroch upravených/nových FE produkčných súborov | Riadky 100 %, funkcie 100 %, vetvy 99,41 %, statements 99,37 % |
| Cielená backendová regresia vrátane migrácie | 185 testov PASS |
| Pokrytie modelového súboru a novej migrácie | Riadky aj vetvy 100 %; prah 95 % splnený |
| Celý backend, štandardné CI nastavenia | 1 810 PASS, 10 SKIP, 2 FAIL uvedené nižšie |
| TypeScript | PASS |
| Cielený ESLint cez existujúcu Next konfiguráciu, 11 súborov | 0 chýb / 0 upozornení |
| Produkčný build | PASS; prvý sieťovo obmedzený pokus nevedel stiahnuť Inter, povolený opakovaný beh prešiel |
| Django check | PASS |
| `makemigrations --check --dry-run` | Žiadne ďalšie zmeny migrácií |
| Kontrola kľúčov medzi šiestimi jazykmi | 0 missing / 0 extra |
| Kontrola použitých prekladových kľúčov | 3 existujúce chýbajúce kľúče v Nástenke, mimo tejto opravy |
| Python docstringy, AST kontrola vrátane vnorených tried | Model 83,33 % (predtým 33,33 %), všetky upravené/nové testy a migrácia 100 % |
| `git diff --check` | PASS |
| Playwright zber scenárov | 3 projekty: WebKit desktop, WebKit mobil, Chromium desktop |
| Skutočný Playwright beh novej opravy | ČAKÁ na nasadenie; zber testov nie je E2E PASS |

Percentá pokrytia patria uvedeným súborom, nie celej aplikácii. Nie sú zárukou
bezchybnosti všetkých možných scenárov.

### Overené prekážky mimo rozsahu

1. `test_racy_only_allows_when_policy_false` a `test_get_client_strict_mode_raises`
   z `swaply/test/test_image_moderation_extra.py` zlyhávajú aj na čistom main bez opravy.
   Čerstvý proces potvrdil, že Windows Application Control blokuje natívnu knižnicu
   `grpc._cython.cygrpc`; následný import Google Vision potom ostáva čiastočne
   inicializovaný. Ochrany Windows ani kód kontroly obrázkov neboli zmenené.
   Dočasný čistý porovnávací checkout bol po overení odstránený; bol obnoviteľnou
   kópiou main a neobsahoval používateľské zmeny.
2. Už na main chýbajú kľúče `feed.captionPlaceholder`, `feed.commentsClose`,
   `feed.openProfile`. Príslušné textové súbory a používatelia kľúčov neboli upravené.
3. `DashboardContent.tsx` má 695 riadkov a `src/lib/api.ts` 907 riadkov.
   Podľa svaply.mdc zostali nedotknuté.
4. Repo nemá konfiguráciu, s ktorou by `next lint` prebehol neinteraktívne.
   Konfigurácia sa nepridávala; cielený lint bol overený cez už nainštalované
   ESLint API s `next/core-web-vitals`.

## Súbory v tomto kole

Upravené:

- `backend/accounts/models/offer_watches.py`
- `backend/accounts/test/test_offer_watches_models.py` (kladná minimálna hranica 0,01; doplnené docstringy)
- `frontend/src/components/dashboard/modules/offer-watch/offerWatchDraft.ts`
- `frontend/src/components/dashboard/modules/offer-watch/offerWatchCurrency.ts`
- `frontend/src/components/dashboard/modules/offer-watch/settings/OfferWatchForm.tsx`

Nové:

- `backend/accounts/migrations/0123_normalize_offer_watch_zero_prices.py`
- `backend/.coveragerc.watch-zero`
- `backend/accounts/test/test_offer_watch_zero_prices.py`
- `backend/accounts/test/test_offer_watch_zero_price_migration.py`
- `backend/accounts/test/test_offer_watch_zero_price_matching.py`
- `backend/accounts/test/test_offer_watch_zero_model_contract.py`
- `frontend/src/components/dashboard/modules/offer-watch/offerWatchPrice.ts`
- `frontend/src/components/dashboard/modules/offer-watch/__tests__/offerWatchPrice.test.ts`
- `frontend/src/components/dashboard/modules/offer-watch/__tests__/offerWatchZeroPrices.test.ts`
- `frontend/src/components/dashboard/modules/offer-watch/__tests__/offerWatchZeroSaveFlows.test.tsx`
- `frontend/src/components/dashboard/modules/offer-watch/settings/OfferWatchForm.zeroPrices.test.tsx`
- `frontend/src/components/dashboard/modules/offer-watch/settings/OfferWatchForm.validation.test.tsx`
- `frontend/e2e/offer-watch-zero-prices.spec.ts`
- `frontend/e2e/support/offer-watch.ts`
- tento súhrn

## Playwright po nasadení

Spúšťať proti Railway, až keď je nasadený frontend aj backend a úspešne aplikovaná 0123.
Použiť vyhradený testovací účet z `.env.e2e`, ktorý má voľný slot sledovania.
Test sa odmietne spustiť s viacerými workermi a bez výslovného prepínača na zápisy.
Nikdy neupravuje ani nemaže existujúce sledovania. Vytvorí vlastné sledovanie
s nepoužitou kanonickou dvojicou kategórie a podkategórie a zachytené vytvorené ID
po sebe uprace v `finally`. Neukladá trace, screenshoty ani video.

V ignorovanom súbore `frontend/.env.e2e` k údajom vyhradeného testovacieho účtu
výslovne pridať nasledujúci riadok. Docker pomocník neprenáša ľubovoľné hostiteľské
premenné; tento súbor však existujúca Playwright konfigurácia načíta aj v kontajneri:

```dotenv
E2E_OFFER_WATCH_WRITES=1
```

Súbor necommitovať. Z priečinka `frontend` potom spustiť:

```powershell
npm run test:e2e:docker -- e2e/offer-watch-zero-prices.spec.ts --project=webkit-desktop --project=webkit-mobile --project=chromium-desktop --workers=1 --retries=0
```

Po behu riadok `E2E_OFFER_WATCH_WRITES=1` z `.env.e2e` odstrániť alebo nastaviť na `0`.

Zber scenárov bol overený; tento živý príkaz ešte spustený nebol. Nepúšťať paralelne
s iným zápisovým testovaním na tom istom účte. Ak účet už má 5 sledovaní, test sa
preskočí bez mazania dát; SKIP nepovažovať za úspešné overenie opravy.

## Manuálne overenie po nasadení

Na vyhradenej testovacej položke overiť všetky nasledujúce kroky samostatne pre
desktop Create, desktop Edit, mobil Create a mobil Edit. Mobil preveriť v Safari
aj nainštalovanej iOS PWA, v svetlom aj tmavom režime.

1. `0` / `0`: po opustení polí sú obe prázdne, mena prázdna a neaktívna;
   uložené sledovanie má „Bez cenového obmedzenia“ aj po obnovení stránky.
2. `0` / `100`: uloží sa len horná hranica a správna mena.
3. `100` / `0`: uloží sa len dolná hranica, bez chyby poradia.
4. Prázdne / `0` a `0` / prázdne: bez cenového filtra, bez povinnej meny.
5. `00`, `0.0`, `0.00`, `0,00`: rovnaký nulový význam.
6. Postupne napísať `0,50`, potom `0.50`, potom `0,01`: žiadne vymazanie prvého
   znaku počas písania; skutočná kladná cena zostane zachovaná.
7. Najprv nastaviť kladnú cenu a ručne vybrať inú menu. Označiť celú cenu
   a postupne ju prepísať na `0,50` bez predchádzajúceho vymazania celého poľa.
   Ručne zvolená mena zostane zachovaná.
8. Zmeniť poslednú kladnú hranicu na nulu a opustiť pole: mena sa vyčistí.
   Ak opačná hranica zostáva kladná, mena sa naopak zachová.
9. Uložiť klávesom Enter bez opustenia cenového poľa: normalizácia funguje aj tu.
10. Záporná cena, tri desatinné miesta, nečíselný text, príliš veľká suma:
    zrozumiteľná chyba, formulár zostane použiteľný, neplatný text sa neskrýva.
11. Dve skutočné kladné hranice v opačnom poradí naďalej vyvolajú správnu chybu.
12. Nulou sa nedá obísť duplicita už existujúceho sledovania bez ceny
    alebo už existujúceho horného limitu. Pri odmietnutí zostane pôvodné sledovanie zachované.
13. Rozpracovať nulové ceny v editácii a dať Zrušiť alebo Späť: nič sa nezapíše.
14. Výsledky bez cenového filtra zahŕňajú dostupné karty zdarma, bez zadanej ceny
    aj dohodou. Pri kladnom filtri platí mena aj príslušná hranica.
15. Presuny do Podkategórie/Krajiny/Okresu, úzky displej a otvorená klávesnica
    nezmenia návratové správanie ani dostupnosť tlačidiel.

Stále povinne doplniť odložené scenáre predchádzajúceho kola:

- M13: neželaný zapamätaný text nad systémovou lištou pri Cena od.
- M14: rovnaká kontrola pri Cena do.
- M33: porovnanie oboch polí v Safari a nainštalovanej PWA.
- M32: regresia pevnej šírky editácie bez horizontálneho posúvania.

Avatar do tohto testovania nepatrí.

## Ďalší krok

Spoločná evidencia ďalších nálezov a neuzavretých overení je v
[registri nálezov](C:/Projects/svap-google-login-audit/docs/testing/findings-register.md).
Stavy sa aktualizujú tam; tento súhrn ostáva záznamom výsledkov konkrétnej opravy.

Následná aktualizácia 13. 10.: OW-02 je tiež implementované a lokálne overené.
Spoločné výsledky a hranice overenia sú v
[súhrne OW-02](C:/Projects/svap-google-login-audit/docs/testing/offer-watch-pagination-implementation-2026-10-13.md).
Po Rabbit kontrole a nasadení oboch opráv vrátane 0123 použiť
[spoločné manuálne testy](C:/Projects/svap-google-login-audit/docs/testing/offer-watch-ow01-ow02-manual-2026-10-13.md).
Pri úspešnom uzavretí nasleduje mapovanie OW-03, nie automatická implementácia
ďalších evidovaných nálezov.
