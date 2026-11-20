<!-- Výsledok dávky K42 od kolegu, prevzatý 19. 11. 2026 bez zmeny obsahu (len táto poznámka). Agent overil 19. 11. 2026 z GitHubu a z `main` `bc4391dc`: PR #297 je zlúčené (merge `33d2b8cc`), mení 5 súborov (+328 a −4 046 riadkov: `FeedPostComments.tsx` 573 → 396, nový `useFeedCommentMutations.ts` 226 a `FeedPostComments.types.ts` 68 riadkov a zmazaný dočasný odtlačok HTML), CI (`checks`, `backend-postgres`) je zelené, CodeRabbit bez nálezov, vlákna nie sú, odtlačok HTML sa zmazal až posledným commitom a existujúce testy sa nemenili, prvé riadky commitov majú 71, 68 a 54 znakov; počty riadkov na `main` sedia (po K43 má `FeedPostComments.tsx` 401 a `useFeedCommentMutations.ts` 239 riadkov). Zhrnutie je v nálezoch 333 a 341 v `ZOZNAM.md`. -->

# Výsledok dávky K42 (nález 333, dávka 5 z 5)

**PR a commity:** `#297` zlúčené (19:19 UTC, zlúčenie `33d2b8cc`; +328 a −4 046 riadkov v 5 súboroch); nález 333, tri commity v poradí z karty: `ad599700` „Delenie FeedPostComments.tsx, krok 7: mutácie komentárov do hooku (333)“, `3fd8fc0c` „Delenie FeedPostComments.tsx, krok 8: typ vlastností do súboru (333)“ a `e6527f31` „Zmazanie dočasného odtlačku HTML komentárov (R45, 333)“.
**Overenie:** Jest po krokoch 7 a 8 612 sád a 9 289 testov prešlo (bez zmeny oproti `main` pred dávkou), po zmazaní odtlačku 611 sád a 9 279 testov (−1 sada a −10 testov odtlačku, `Snapshots: 0 total`); odtlačok HTML 10 z 10 bez zmeny po oboch krokoch (súbor ani `.snap` sa neupravovali, žiadne `-u`); `tsc`, ESLint dotknutých súborov a `check:missing-translations` (0 a 0) čisté; build po každom kroku: prvý beh po úspešnej kompilácii `SecurityFatalError` (verzia Next.js, nález 341), druhý s kódom 0; backend sa nemenil; CI (`checks`, `backend-postgres`) zelené; CodeRabbit: bez nálezov (Merge Risk: Minimal; kontrola názvu PR „K42“ je „neurčitý“); Codex: bez nálezov na `e6527f31`.

## Po nálezoch

- **333 (JASNÉ, posledná dávka delenia `FeedPostComments.tsx`):**
  - **Zmena:** krok 7: nový `useFeedCommentMutations.ts` (226 riadkov) s obsluhami pridania, úpravy, odpovede a zmazania s potvrdením a so siedmimi stavmi, ktoré používajú len tie obsluhy; `FeedPostComments.tsx` 573 → 454 riadkov. Krok 8: typ `FeedPostCommentsProps` do nového `FeedPostComments.types.ts` (68 riadkov); `FeedPostComments.tsx` 454 → 396. Posledný commit zmazal dočasný odtlačok HTML z K28 (336 riadkov testu a 3 499 riadkov `.snap`); v repozitári už nie je žiadny súbor `.snap`, výnimka z pravidla zanikla. Spolu je `FeedPostComments.tsx` po piatich dávkach (K28, K29, K37, K38, K42) na 396 riadkoch z pôvodných 1 487; `FeedPostCard.tsx` (1 033) a `FeedPostMobileDetail.tsx` (594) ostávajú podľa R23.
  - **Dôkaz čistého presunu:** krok 7: skript mimo repozitára poskladal z nového komponentu a hooku späť pôvodný `FeedPostComments.tsx` bajt po bajte (573 riadkov) a štyri presunuté bloky sú v hooku doslova rovnaké; sonda registrácií `useEffect` a `useLayoutEffect` (325 záznamov v scenári) dala pred krokom aj po ňom rovnaký zoznam a kontrolný súčet, takže sa poradie efektov nezmenilo; zápisy `loadSeqRef`, `markSeen` a `scrollToTopRef`, na ktorých stojí oprava 338 z K41, ostali na tých istých miestach. Krok 8: skladanie späť bajt po bajte (454 riadkov) a rovnaký JavaScript po preklade TypeScriptom (12 172 znakov).
  - **Testy a mutácie:** testy sa nepridávali ani nemenili (čistý presun). Krok 7: 70 mutácií (v kópii mimo repozitára, proti 84 sadám a 1 374 testom), 40 zachytených a 30 prežilo. Prežívajúce sú existujúce medzery v testoch, nie dôsledok presunu: tie isté zásahy prežili aj v pôvodnom komponente pred presunom (27 z 27 porovnateľných; ďalšie tri sa týkajú len napojenia hooku). Krok 8 bez mutácií správania (výstup prekladu je rovnaký); typ stráži `tsc`, čo sa overilo dočasným zásahom. Riziko nízke.
  - **Odchýlky od karty a plánu K26:** (1) `submitting`, `trimmed` a `canSubmit` ostali v komponente (`canSubmit` závisí od `submitting` a od poľa `text`, ktoré používa aj composer), hook preto dostáva `setSubmitting`, `trimmed`, `canSubmit` a `setText`; (2) hook vlastní aj sedem stavov, ktoré používajú len obsluhy (`pendingDelete`, `replyingTo`, `replyText`, `replySubmitting`, `editingComment`, `editSubmitting`, `deleting`); (3) `toggleReplies` ostal v komponente (nevolá server a mení `expandedReplies`, ktorý používa aj hľadanie cieľa); (4) premenovanie tienenia `text` netreba, hook `text` nedostáva; (5) do `FeedPostComments.types.ts` ide jediný import (`type ReactNode`); (6) hlavný súbor je pod 500 riadkov už po kroku 7, nie až po kroku 8.
  - Nález 342 (obsluhy úpravy, odpovede a zmazania nevolajú `handleFeedPostErrorIfGone`) sa v K42 zámerne neopravoval; opravený je v K43.

## Čo overiť ručne (najviac 5 bodov)

Úplný zoznam (126 scenárov) som odovzdal osobitne; toto je najkratší výber.

1. Počítač, okno príspevku s komentármi: pridať komentár (zoznam sa posunie navrch, počet pri ikone stúpne o 1), odpovedať (vlákno sa rozbalí a odpoveď je navrchu), upraviť (nový text a označenie „upravené“), zmazať s potvrdením vrátane komentára s odpoveďami (počet klesne o celý podstrom).
2. iPhone, mobilný detail príspevku: to isté; po pridaní komentára je nový komentár celý viditeľný (oprava 346 z K40).
3. Otvorenie komentára z upozornenia: komentár aj odpoveď (aj v zbalenom vlákne) sa nájdu a zvýraznia.
4. Zlyhanie siete pri pridaní, odpovedi, úprave a zmazaní: rovnaké hlášky ako predtým.
5. Vzhľad okna príspevku, panelu nad fotkou a stránky príspevku: bez zmeny.

## Dopad na E2E

Žiadny: DOM, `data-testid` ani správanie sa nemenia. Komentárov sa dotýkajú `feed-post-detail.spec.ts`, `notification-click.spec.ts` a scenár `feed-comments.ui.ts`, ktoré Codex po nasadení spúšťa ako cielený beh; stránkovanie, polling a iPhone E2E nepokryje.

## Kandidáti na nové nálezy

Žiadni.

## Poznámky

- Prežívajúce mutácie (30) ukazujú medzery v existujúcich testoch: poradie zápisu `loadSeqRef += 1` voči `await` pri pridaní, úprave, odpovedi a zmazaní (A1o až A4o; na tom stojí oprava 338 z K41 a dnes to stráži len doslovný presun), ochrany proti dvojitému odoslaniu (I1 až I4), stavy „odosiela sa“ (X1 až X4), správa servera pri zlyhanej úprave (E2), toast po zmazaní (B7) a ďalšie; navrhujem jednu malú dávku samých testov, nie nález s číslom.
- CodeRabbit označuje názov PR „K42“ za neurčitý (Title check); názov v tvare „K42: …“ by kontrolu splnil.

## Neoverené a obmedzenia

Presuny sú overené skriptami, Jestom a mutáciami, nie v prehliadači ani na zariadení. Ručný test po nasadení (iPhone, počítač, upozornenia, výpadok siete) robí majiteľ a jeho výsledok nie je súčasťou tejto strany.
