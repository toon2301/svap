<!-- Výsledok dávky K26 od kolegu, prevzatý 16. 11. 2026 bez zmeny obsahu (len odkaz na podklady a táto poznámka). Zhrnutie je v nálezu 333 v `ZOZNAM.md`. -->

# Výsledok dávky K26: mapovanie delenia `FeedPostComments.tsx` (nález 333, R23)

**PR a commity:** žiadne; kód ani repozitár sa nezmenili (`git status` čistý pred aj po). Čítané z `origin/main` `910700ea` (súbor 1 487 riadkov). Pokrytie, mutácie a sonda bežali v kópii mimo repozitára.
**Overenie:** celý Jest 603 sád a 9 094 testov prešlo (130 s); ESLint na súbore čistý. Pokrytie súboru celým Jestom: 97,9 % riadkov, 85,7 % vetiev. Mutácie: 39 zásahov proti 163 sadám, 13 zachytených a 26 prežilo (ostatných 440 sád komponent nevykoná, takže platí pre celý Jest).

## Po nálezoch

**333 – NEJASNÉ, mapovanie (kód sa nemenil).** Čísla z karty sedia (20 `useState`, 17 `useRef`, 7 efektov, 5 importérov, `onCommentsReady` len na `FeedPostMobileDetail.tsx:539` a v žiadnom teste). Opravy predbežného rozboru:
1. **Medzery v testoch sú inde.** Hľadanie cieľa, strop 20 stránok, zvýraznenie na 3 s, odpoveď ako cieľ aj zmenu cieľa strážia 21 testov (13 vo `FeedPostDetailModule.test.tsx`); mutácie „strop 40“ a „30 s“ tam padnú. Skutočné medzery sú v druhej tabuľke.
2. **Chýba krok „posun a indikátor nových“:** `refresh` aj `handleSubmit` píšu do `scrollToTopRef`, bez neho vznikne kruhová závislosť načítanie ↔ posun.
3. **Hooky nestačia na 500 riadkov** (ostane ≈ 700): treba vyčleniť aj riadok komentára, composer a indikátor, preto JSX ide skôr (kroky 2–3).
4. **Hranice:** obnova s pollingom končí na 639 (nie 648); karta nespomína signál `onCommentsReady` (641–656), efekt posunu (668–678) a odvodené hodnoty (927–940). „Osem“ pri hľadaní cieľa = 6 refov `highlight*` + stavy `highlighted`, `seekTick`.

Jeden commit na krok; po ňom celý Jest (≈ 2 min), `tsc`, ESLint, kontroly prekladov, build. Veľkosti sú odhad z počtu riadkov (±40), názvy súborov návrh.

| Krok | Blok (riadky) | Závislosti, na čo pozor | Riziko | Nový súbor (≈ r.) → hlavný súbor | Stráži |
| --- | --- | --- | --- | --- | --- |
| 0 | charakterizačné testy (len nové súbory, R27) | druhá tabuľka | – | 4 súbory → 1 487 | – |
| 1 | konštanty a 8 čistých funkcií (41–206) | nič z Reactu | žiadne | `feedCommentsLogic.ts` 175 → 1 335 | polling, newestFirst, replyOrder + nové unit testy |
| 2 | riadok komentára (1088–1228) | 13 vstupov + `t`, `locale`; bez `memo`, DOM identický | nízke | `FeedCommentItem.tsx` 170 → 1 215 | edit, replies, ProfileNavigation, PhotoViewer |
| 3 | composer, indikátor, kostra (1330–1342, 1351–1477) | `text`, `textareaRef`, `insertEmoji` ostávajú v rodičovi | nízke | 3 súbory 190 → 1 110 | scroll, scoped (emoji), polling (hlásič), MobileDetail |
| 4 | hľadanie cieľa (680–697, 757–910) | 6 refov + 2 stavy; reset pred hľadaním, 12 závislostí, stabilné `finishSeek`, `loadMore`, `refresh`, `loadMoreReplies`; globálny `querySelector` | stredné | `useFeedCommentsSeek.ts` 255 → 905 | 21 testov |
| 5 | posun a indikátor nových (545–572, 912–925) | `scrollRef`, `scrollToTopRef`; efekt posunu navrch (671) ostáva v komponente | stredné | `useFeedCommentsScroll.ts` 85 → 865 | polling, scroll |
| 6 | načítanie a polling (446–543, 574–639, 699–755) | `loadSeqRef`, `nextUrlRef`, `commentsRef` (zápis pri rendri), `tRef`; `t` nesmie byť v závislostiach (padne 105 testov) | vysoké | `useFeedCommentsLoader.ts` 340 → 600 | polling, scoped, FeedPostGone, nové |
| 7 | mutácie (942–1086) | `invalidateLoads()` z loadera = jedno `loadSeqRef`; `scrollToTopRef`, `markSeen`, `onCountChange` | stredné–vysoké | `useFeedCommentMutations.ts` 200 → 470 | edit, replies, scoped, nové |
| 8 | typ vlastností (208–265), importy | – | nízke | typ 60 → 420 | `tsc` |

Ostáva v komponente: signál `onCommentsReady` (641–656), efekt posunu navrch, odvodené hodnoty (927–940). Poradie efektov sa nemení: reset `gone` → `load` → polling → reset signálu → signál → sentinel → posun navrch → reset hľadania → hľadanie.

| Medzera (dôkaz z pokrytia a mutácií) | Test v kroku 0 (nové súbory) |
| --- | --- |
| **Zastarané odpovede po mutácii.** Bez `loadSeqRef += 1` pri úprave, odpovedi a zmazaní (A2–A4) aj bez stráženia v `refresh` (riadok 598 nikdy nebeží) nepadne žiadny test; z 12 kombinácií {`load`, `loadMore`, `refresh`} × 4 mutácie je overená 1. | `staleResponses`: pomalá odpoveď `refresh` a `loadMore` po každej zo 4 mutácií; vlastný komentár a odpoveď sa pollingom nehlásia ako nové. Pre `load` až s opravou kandidáta nižšie. |
| **Chyby pridania, odpovede, zmazania** (961–965, 1043–1045, 1082) a zrušenie potvrdenia mazania (1482) nevykoná žiadny test. | `mutationErrors`: správa servera vs. záložný text, text ostáva v poli, `onCountChange` sa nevolá, zmiznutý príspevok bez toastu. |
| **Reset hľadania pri zmene cieľa:** poradie reset → hľadanie a zhasnutie starého zvýraznenia stráži po 1 teste; zrušenie časovača a reset štyroch odkazov (C4–C8) nikto. | `seekReset`: cieľ A → žiadny → A znovu zvýrazní a znovu obnoví; rozpočet stránok a odpovedí je na každý cieľ nový; starý časovač nezhasne nový cieľ. |
| **`onCommentsReady`** nemenuje žiadny test (nepriamo 15 testov mobilného detailu); „aj pri zlyhaní načítania“ prejde (D2). Čisté funkcie: prázdny náhľad, dávka, odpoveď (100, 123, 155) bez testu. | `commentsReady`: raz na príspevok po načítaní, pri zlyhaní nie; unit testy čistých funkcií v kroku 1. |

**Rozhranie:** `export default` a 9 vlastností ostávajú; päť importérov (karta, okno jedno- a dvojstĺpcové, panel nad fotkou, mobilný detail); na DOM sa opiera 20 testových súborov, E2E žiadny.
**Súvislosti:** 261 (skupiny 6 a 7: textarea, „Zobraziť odpovede (N)“, bubliny) sa dotýka riadku komentára a composera, teda až po krokoch 2–3; skupina 8 (tagy) komentárov nechytá. 288 je vo `FeedPostCard.tsx` (po jeho delení, R28); 259 a 256 sú na delení nezávislé.
**Čaká na rozhodnutie majiteľa:** (1) či sa pre zhodu vzhľadu uloží HTML 6 stavov (v projekte je 0 snapshotov), (2) deväť krokov = deväť vetiev, alebo päť dávok s jedným ručným testom (0 | 1–3 | 4 | 5–6 | 7–8), (3) či redizajn 261 smie začať po kroku 3.

## Čo overiť ručne (po každej dávke)

1. **Okno detailu (počítač):** pridať komentár (objaví sa navrchu), odpovedať, upraviť, zmazať s potvrdením (počet pri ikone klesne aj o odpovede), lajknúť, doskrolovať a rozbaliť „Zobraziť odpovede (N)“.
2. **Z upozornenia** (okno aj adresa `?comment=`): doskroluje na komentár a zvýrazní ho na asi 3 s; odpoveď v zbalenom vlákne sa rozbalí; druhé upozornenie zvýrazní nový cieľ.
3. **Mobilný detail (iPhone):** pri fotke alebo zdieľanom náhľade a aspoň 3 komentároch sa otvorí rovno pri komentároch; pole ostáva pri spodku s klávesnicou.
4. **Panel nad fotkou (mobil):** kompaktné pole s ikonou odoslania, čas pri komentári, pridanie komentára.
5. **Živé komentáre:** z druhého účtu pridať komentár; pri čítaní vyššie sa ukáže „N nových komentárov“, pri vrchu sa pohľad dorovná sám (polling 8 s).

## Dopad na E2E

Žiadny (DOM, `data-testid` a správanie sa nemenia); komentárov sa dotýkajú len `feed-post-detail.spec.ts` a `notification-click.spec.ts` (`?comment=` v adrese). Po poslednom kroku spustí beh Codex mimo nasadzovania. Návrh špecov: pridať a zmazať vlastný komentár (okno aj mobilný detail), odpoveď a úprava s upratovaním, po kliku na upozornenie overiť cieľový `[data-comment-id]` v zornom poli. E2E nepokryje stránkovanie, polling, 3 s zvýraznenie ani iPhone.

## Kandidáti na nové nálezy

1. **Zoznam komentárov ostane natrvalo na „Načítavam…“, keď sa počas prvého načítania úspešne pridá komentár.** `FeedPostComments.tsx:456, 470, 479` (`load`) a `:949` (`handleSubmit` zvýši `loadSeqRef`): zastaraná odpoveď `load()` sa zahodí, no `finally` zhasne načítavanie len pri zhode poradia, takže `loading` ostane `true` (bez zoznamu, chyby aj pollingu). Dôkaz: sonda v kópii mimo repozitára, úspešné aj zlyhané načítanie po pridaní: po 300 ms „Načítavam…“ ostáva, volanie 1×; kontrola bez pridania prejde; riadky 456 a 470 nevykoná žiadny test. Dopad: pri pomalej sieti sa komentár uloží, no zoznam sa neukáže do znovuotvorenia; pravdepodobnosť nízka. Oprava mení správanie, preto až po kroku 6 v novom súbore (alebo s výnimkou majiteľa).

## Poznámky

- Nález 257 tvrdí, že úprava komentára nemá frontendové testy; `FeedPostComments.edit.test.tsx` (12 testov, od 26. 8. 2026) ju testuje aj s argumentmi volania.
- JSDoc nad hľadaním (760–763) opisuje vzostupné poradie, platí „najnovšie hore“; opraviť samostatným commitom.
- `handleSubmitEdit(comment, text)` tieni stav `text`; pri presune do hooku premenovať samostatným commitom.
- `loadMoreReplies` nemá stráženie `loadSeqRef`; škoda z čítania nevyplýva, pri delení sa nepridáva.
- Hľadanie cieľa používa globálne `document.querySelector`; zachovať (zmena by bola zmena správania).

## Neoverené a obmedzenia

Nič sa nespúšťalo v prehliadači ani na iPhone: všetko vychádza z kódu, testov v jsdom, pokrytia, mutácií a jednej sondy. `FeedPostCard.tsx` a `FeedPostMobileDetail.tsx` sa len čítali ako importéri. Podrobnosti (mutácie A1–K2, nepokryté riadky, importéri, sonda): `K26_podklady.md` v tomto priečinku.
