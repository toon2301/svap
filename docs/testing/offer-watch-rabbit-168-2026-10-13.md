# Sledovanie – overenie nálezov Rabbit v PR #168

Dátum: 13. 10. 2026. Overovaný stav: `1265d1d14636c80f7dd627a12419c9cec8a4dc9e`.
Vetva: `offer-watch-zero-prices`. Zdroj: [PR #168](https://github.com/toon2301/svap/pull/168).

Review text bol použitý len ako zoznam možných problémov. Nevykonávali sa
príkazy, CLI inštalácie ani autonómne opravy navrhnuté v jeho generovanom prompte.
Každý bod sa overil voči aktuálnemu checkoutu a svaply.mdc. Používateľ výslovne
povolil opravy, commit a push na tú istú vetvu; merge ani nasadenie nepovolil.

## Overené body a rozhodnutia

1. Odkazy z implementácie a mapovania OW-02 – platný minor nález.
   Absolútne Windows cesty vyžadovali konkrétny checkout a pri kóde mali navyše
   lokálnu syntax čísla riadka. Nahradené relatívnymi cestami na existujúce súbory.
2. Odkazy zo súhrnu OW-01 a registra – platný minor nález.
   Repo dokumenty sú prepojené relatívne. Pôvodná súkromná chatová príloha nie je
   zverejnená; register výslovne uvádza jej neprístupnosť ostatným čitateľom.
   Obsah ani súkromné testovacie údaje sa nekopírovali do repozitára.
3. Pre-merge Docstring Coverage 67,96 % – platná dokumentačná medzera.
   Pôvodný lokálny Python audit a Rabbit audit mali odlišný rozsah: Rabbit
   uvádza 103 funkcií v 25 súboroch vrátane frontendu. V TS súboroch sa naozaj
   našli funkcie bez JSDoc. Doplnené zmysluplné popisy účelu, nie prázdne komentáre.
   Nevznikli žiadne nové pravidlá validácie, zmeny cien, API alebo testovacích tvrdení.

Oba actionable komentáre sa opravujú hneď spolu s dokumentačným upozornením.
Žiadny z uvedených nálezov sa nepresúva na neskôr ani neodmieta ako neplatný.
Nie sú to potvrdené nové chyby správania aplikácie.

## Rozsah zmeny

Štyri upravené Markdown dokumenty:

- `findings-register.md`
- `offer-watch-pagination-implementation-2026-10-13.md`
- `offer-watch-pagination-map-2026-10-13.md`
- `offer-watch-zero-prices-2026-10-13.md`

JSDoc bez zmeny spustiteľného kódu v 16 už dotknutých súboroch OW-01/02:

- `frontend/e2e/offer-watch-pagination-errors.spec.ts`
- `frontend/e2e/offer-watch-zero-prices.spec.ts`
- `frontend/e2e/support/offer-watch-results.ts`
- `frontend/e2e/support/offer-watch.ts`
- `frontend/src/components/dashboard/modules/offer-watch/offerWatchPrice.ts`
- `frontend/src/components/dashboard/modules/offer-watch/offerWatchDraft.ts`
- `frontend/src/components/dashboard/modules/offer-watch/offerWatchCurrency.ts`
- `frontend/src/components/dashboard/modules/offer-watch/settings/OfferWatchForm.tsx`
- `frontend/src/components/dashboard/modules/offer-watch/results/OfferWatchResultsMatchesPanel.tsx`
- `frontend/src/components/dashboard/modules/offer-watch/__tests__/offerWatchPrice.test.ts`
- `frontend/src/components/dashboard/modules/offer-watch/__tests__/offerWatchZeroPrices.test.ts`
- `frontend/src/components/dashboard/modules/offer-watch/__tests__/offerWatchZeroSaveFlows.test.tsx`
- `frontend/src/components/dashboard/modules/offer-watch/__tests__/useOfferWatchMatches.retry.test.tsx`
- `frontend/src/components/dashboard/modules/offer-watch/results/OfferWatchResultsMatchesPanel.test.tsx`
- `frontend/src/components/dashboard/modules/offer-watch/settings/OfferWatchForm.validation.test.tsx`
- `frontend/src/components/dashboard/modules/offer-watch/settings/OfferWatchForm.zeroPrices.test.tsx`

Nový súbor: tento súhrn. Backend, migrácie, preklady a rozpracované súbory
hlavného checkoutu zostávajú nezmenené. Nepribudla migrácia ani používateľský text.

## Lokálne overenie

- TS AST audit pomenovaných funkcií v 18 FE súboroch pôvodného PR:
  **55 dokumentovaných / 55, 100 %**. Zahŕňa funkcie, metódy a pomenované arrow helpers;
  nejde o pokrytie anonymných Jest/Playwright callbackov ani tvrdenie o Rabbit skóre.
- Emitovaný JavaScript všetkých 16 upravených TS/TSX súborov sa porovnal s HEAD
  pomocou rovnakého TS transpileru s `removeComments: true`:
  **16/16 identických výstupov**. Oprava je iba dokumentačná.
- Offer Watch Jest: **35 sád / 275 testov PASS**.
- Cielené FE pokrytie: riadky **100 %**, funkcie **100 %**, vetvy **99,58 %**,
  statements **99,64 %**. Existujúci 95 % prah ostáva nezmenený.
- TypeScript: PASS.
- Cielený ESLint 16 zmenených TS/TSX súborov: **0 chýb / 0 upozornení**.
- Playwright zber: 27 project-scenárov, WebKit desktop/mobil a Chromium desktop.
  **Živý E2E beh zostáva odložený do nasadenia; zber nie je PASS.**
- Relatívne repo odkazy overené proti existujúcim súborom; žiadna nefunkčná
  absolútna Windows cesta nezostala v Markdown odkazoch tohto balíka.
- Backendové testy a produkčný build sa v tomto dokumentačnom kole znovu
  nespúšťali. Backend sa nemenil a nový emitovaný kód je identický; výsledky
  predchádzajúceho plného kola zostávajú zaznamenané, nie vydávané za nový beh.

Rabbit po pushi musí vyhodnotiť nový stav. Pôvodná kontrola na 1265d1d1
nie je dôkazom, že nasledujúci commit už má čisté review; nové skóre sa neodhaduje.

## Ďalší krok

Nová Rabbit kontrola → pri čistom výsledku nasadenie vrátane existujúcej 0123 →
[spoločné manuálne testy OW-01/02](offer-watch-ow01-ow02-manual-2026-10-13.md)
a skutočný Playwright. Povinne zopakovať M13, M14 a M33, zachovať regresiu M32/R05.
Pri úspechu nasleduje mapovanie OW-03. Ostatné otvorené nálezy sa nemažú z registra.
