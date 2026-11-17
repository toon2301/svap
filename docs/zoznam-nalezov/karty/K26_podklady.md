<!-- Podklady k výsledku K26 od kolegu, prevzaté 16. 11. 2026 bez zmeny obsahu. Prílohy `nepokryte_celym_jestom.txt` a `testid-files.txt`, na ktoré text odkazuje, nie sú v repozitári. -->

# Podklady k výsledku K26 (nie sú súčasťou strany)

Všetko vzniklo čítaním `origin/main` `910700ea` alebo behom v izolovanej kópii mimo repozitára (`git archive`, `node_modules` odkazom). Do repozitára sa nič nezapísalo.

## 1. Mutácie (39; zachytených 13, prežilo 26)

Zásah = zmena jedného miesta v kópii `FeedPostComments.tsx`; beh proti 163 sadám (`feed`, `dashboard/__tests__`, `contexts`, `hooks`; 3 541 testov). Z 603 sád 440 ostatných komponent nevykoná (24 ho len načíta, 416 neimportuje).

| ID | Zásah | Výsledok | Padlo (sady) | Poznámka |
| --- | --- | --- | --- | --- |
| A1 | pridanie: chýba loadSeqRef += 1 | zachytená (2 failed) | FeedPostComments.scoped | stráži `scoped` (pridanie vs. donačítanie) |
| A2 | úprava: chýba loadSeqRef += 1 | prežila (3541 passed) | – | ani jeden test (zámer je opísaný v komentári pri `loadSeqRef`) |
| A3 | odpoveď: chýba loadSeqRef += 1 | prežila (3541 passed) | – | ani jeden test |
| A4 | zmazanie: chýba loadSeqRef += 1 | prežila (3541 passed) | – | ani jeden test |
| A5 | load: chýba stráženie zastaranej odpovede (úspech) | prežila (3541 passed) | – | riadok 456 nikdy nebeží; súvisí s kandidátom na nález |
| A6 | load: chýba stráženie zastaranej odpovede (chyba) | prežila (3541 passed) | – | riadok 470 nikdy nebeží; súvisí s kandidátom na nález |
| A7 | load: finally vždy zhasne načítavanie | prežila (3541 passed) | – | súvisí s kandidátom na nález (`finally` zhasne načítavanie len pri zhode poradia) |
| A8 | refresh: chýba stráženie zastaranej odpovede | prežila (3541 passed) | – | riadok 598 nikdy nebeží |
| A9 | loadMore: chýba stráženie (kontrola) | zachytená (1 failed) | FeedPostComments.scoped | kontrola: stráži `scoped` |
| B1 | pridanie: chýba toast pri chybe | prežila (3541 passed) | – | riadok 965 nikdy nebeží |
| B2 | pridanie: vetva zmiznutého príspevku vždy zapnutá | prežila (3541 passed) | – | riadok 961 nikdy nebeží (vetva zmiznutého príspevku pri pridaní) |
| B3 | odpoveď: chýba toast pri chybe | prežila (3541 passed) | – | riadok 1045 nikdy nebeží |
| B4 | zmazanie: chýba toast pri chybe | prežila (3541 passed) | – | riadok 1082 nikdy nebeží |
| B5 | zmazanie: zrušenie potvrdenia nič nerobí | prežila (3541 passed) | – | riadok 1482 nikdy nebeží (zrušenie potvrdenia mazania) |
| C1 | poradie: reset hľadania až ZA efektom hľadania | zachytená (1 failed) | FeedPostDetailModule | stráži 1 test vo `FeedPostDetailModule.test.tsx` |
| C2 | chýba efekt: reset signálu onCommentsReady pri zmene postId | prežila (3541 passed) | – | obranný efekt, žiadny importér nemení `postId` na namountovanej inštancii |
| C3 | chýba efekt: setGone(false) pri zmene postId | prežila (3541 passed) | – | obranný efekt, ako C2 |
| C4 | chýba zrušenie časovača zvýraznenia | prežila (3541 passed) | – | žiadny test nehľadá oneskorené zhasnutie cudzieho cieľa |
| C5 | reset: highlightRefreshedRef | prežila (3541 passed) | – | chýba test cieľ A → žiadny → A znovu |
| C6 | reset: highlightHandledRef | prežila (3541 passed) | – | chýba test cieľ A → žiadny → A znovu |
| C7 | reset: highlightPagesRef | prežila (3541 passed) | – | chýba test rozpočtu stránok na každý cieľ |
| C8 | reset: highlightReplyPagesRef | prežila (3541 passed) | – | chýba test rozpočtu odpovedí na každý cieľ |
| C9 | reset: highlightSeekingRef | prežila (3541 passed) | – | len zdržanie (`finishSeek` ho vyrovná), test sa neoplatí |
| C10 | reset: setHighlighted(null) | zachytená (1 failed) | FeedPostDetailModule | stráži 1 test vo `FeedPostDetailModule.test.tsx` |
| C11 | load závisí od t (nestabilná identita) | zachytená (105 failed) | FeedMobileOpenState, FeedOverlayShareHistory, FeedPostCard.interactions, Feed… | silná poistka: 105 testov v mnohých sadách |
| C12 | chýba zrkadlo commentsRef pri rendri | zachytená (10 failed) | FeedPostComments.polling, FeedPostComments.repliesPaging, FeedPostComments.re… | stráži polling, repliesPaging a replyOrder |
| D1 | signál onCommentsReady sa nevolá | zachytená (15 failed) | FeedMobileOpenState, FeedMobileSharedContent, FeedPostMobileDetail | nepriamo 15 testov v 3 sadách mobilného detailu, priamy test chýba |
| D2 | signál onCommentsReady aj pri zlyhaní načítania | prežila (3541 passed) | – | signál aj pri zlyhaní načítania prejde |
| D3 | polling beží aj pre zmiznutý príspevok | zachytená (1 failed) | FeedPostGone | stráži `FeedPostGone` |
| D4 | mergeComments: prázdna odpoveď vždy ponechá zoznam | prežila (3541 passed) | – | vetva `return` nikdy nebeží |
| D5 | loadMore: nezapisuje markSeen | prežila (3541 passed) | – | bez súbehu nedosiahnuteľné (`refresh` si hranicu prepočíta sám) |
| D6 | load: nenuluje highestSeenIdRef | prežila (3541 passed) | – | nulovanie hranice pri načítaní; bez zmeny príspevku bez účinku |
| D7 | pridanie: chýba markSeen vlastného komentára | prežila (3541 passed) | – | chýba test: vlastný komentár sa pollingom nehlási ako nový |
| D8 | odpoveď: chýba markSeen vlastnej odpovede | prežila (3541 passed) | – | chýba test: vlastná odpoveď sa pollingom nehlási ako nová |
| D9 | pridanie: chýba doscrollovanie navrch | zachytená (1 failed) | FeedPostComments.scroll | stráži `scroll` |
| D10 | zmazanie: počet klesne len o 1 | zachytená (1 failed) | FeedPostComments.replies | stráži `replies` |
| D11 | odpoveď: vlákno sa po odpovedi nerozbalí | zachytená (1 failed) | FeedPostComments.replies | stráži `replies` |
| K1 | kontrola: strop 20 stránok sa zmení na 40 | zachytená (1 failed) | FeedPostDetailModule | kontrola: stráži `FeedPostDetailModule` (strop 20 stránok) |
| K2 | kontrola: zvýraznenie 3 s sa zmení na 30 s | zachytená (2 failed) | FeedPostDetailModule | kontrola: stráži `FeedPostDetailModule` (zvýraznenie 3 s) |

## 2. Nepokryté riadky celým Jestom (603 sád)

Riadky bez jediného vykonania: 849, 961–965, 1043–1045, 1082, 1482. Výroky v ochranných vetvách bez vykonania: 123, 155 (čisté funkcie), 456, 470, 504, 548, 598, 819, 849, 915, 943, 961–965, 982, 1015, 1043–1045, 1053, 1082, 1482. Vetvy: 32 z 224 nepokrytých (zoznam je v `nepokryte_celym_jestom.txt`).

S ôsmimi sadami komentárov a dvoma susednými (95 testov) je pokrytie nižšie (95,8 % riadkov, 74,6 % vetiev): navyše chýba vykonanie riadkov 470–477 (zlyhanie prvého načítania), 798 (zhasnutie zvýraznenia po 3 s), 876 a 894 (vzdanie hľadania) a celé varianty `compactComposer`, `showTimestamp`, `fillHeight`; tie pokrývajú až ďalšie sady, ktoré komponent vykresľujú (okno, mobilný detail, prehliadač fotky, `FeedPostGone`).

## 3. Importéri a vlastnosti

| Importér (riadok) | Dáva | Poznámka |
| --- | --- | --- |
| `FeedPostCard.tsx:928` | `postId`, `highlightCommentId`, `onCountChange`, `onTotalChange` | len pri `commentsOpen && !isDetail` (stránka príspevku, karta bez kontextu okna) |
| `FeedPostDetailOverlay.tsx:368` | + `fillHeight`, `highlightCommentId` | okno, jednostĺpcové |
| `FeedPostDetailSplitLayout.tsx:133` | + `fillHeight`, `highlightCommentId` | okno, dvojstĺpcové (príspevok s fotkou) |
| `FeedPhotoCommentsSheet.tsx:115` | `fillHeight`, `showTimestamp`, `compactComposer`, počty | panel nad fotkou (mobil) |
| `FeedPostMobileDetail.tsx:533` | `fillHeight`, `showTimestamp`, `compactComposer`, `listHeader`, `onCommentsReady`, počty | mobilný detail; `highlightCommentId` nepredáva |

Na DOM (`data-testid`, `data-comment-id`, `role="region"`) sa opiera 20 testových súborov (zoznam v `testid-files.txt`), E2E žiadny. Desktop: tlačidlo Komentáre otvára okno (`opensOverlay`), mobil: mobilný detail alebo prehliadač fotky; inline komentáre ostávajú len bez kontextu okna.

## 4. Poradie efektov v komponente (nesmie sa zmeniť)

A `setGone(false)` pri `postId` (484) → B `load()` (488) → polling (636) → C reset signálu pri `postId` (648) → D signál `onCommentsReady` (652) → sentinel (661) → E posun navrch (671) → F reset hľadania (682) → G hľadanie (771). Zachytené mutáciou: F pred G (C1). Nezachytené: A, C (C2, C3 – obranné).

## 5. Sonda zaseknutého „Načítavam…“ (kandidát na nález)

Súbor len v izolovanej kópii (`__tests__/probe.stuckLoading.test.tsx`), výstup len pravdivostné hodnoty:

- kontrola bez pridania: `loadingParagraph false`, `listRendered true`;
- A (pridanie počas prvého načítania, načítanie potom úspešné): `loadingParagraph true`, `listRendered false`, `listCalls 1`;
- B (rovnako, načítanie potom zlyhá): `loadingParagraph true`, `listRendered false`, bez chybovej hlášky, `listCalls 1`.

Príčina: `load()` zahodí zastaranú odpoveď cez `return` v `try`/`catch` a `finally` zhasne `loading` len pri `seq === loadSeqRef.current` (riadky 456, 470, 479); `handleSubmit` zvýši `loadSeqRef` (riadok 949) bez ďalšieho `load()`.

## 6. Testy, ktoré strážia hľadanie cieľa (21)

`FeedPostDetailModule.test.tsx` (13): zvýraznenie a posun (234), strop stránok (270, 717), stránkovanie k čerstvému komentáru (311), koniec vlákna (360), bez opakovaného posunu pri pollingu (403), ticho pri zlyhaní (436), zhasnutie zvýraznenia (474), druhá notifikácia (537, 568, 587, 613), okno nad pollovacím stropom (673). Sady komentárov (8): `replies` 211, `repliesPaging` 464, 488, 522, 544, `replyOrder` 339, 385, `newestFirst` 190.

## 7. Návrh špecov pre Codexa (nezapisuje sa do `frontend/e2e/**`)

1. pridať a zmazať vlastný komentár v okne detailu (desktop WebKit) a v mobilnom detaile (mobil WebKit), upratať po sebe;
2. odpoveď a úprava vlastného komentára; zmazanie rodiča zmaže aj odpovede (počet pri ikone);
3. po kliku na upozornenie o komentári overiť, že cieľový `[data-comment-id]` je v zornom poli (trieda zvýraznenia je len 3 s, preto nie ona);
4. mimo E2E: stránkovanie (treba príspevok s viac než 10 komentármi), polling (druhý účet), `onCommentsReady` na iPhone.

## 8. Ďalšie overené fakty

- Tailwind skenuje `./src/components/**/*.{js,ts,jsx,tsx,mdx}`, nové súbory vo `feed/` triedy neukrojí.
- CI spúšťa `npm test -- --ci` bez pokrytia; prah 95 % v `jest.config.js` platí len pri `npm run test:coverage`.
- Testy mockujú len externé moduly (`@/lib/feedApi`, `react-hot-toast`, `@/contexts/LanguageContext`, `@/hooks`, `../../messages/DesktopEmojiPickerButton`); žiadny nemockuje interné súbory komentárov, takže presun kódu nevyžaduje úpravu testov.
- Mock `useLanguage` vracia pri každom volaní novú funkciu `t`, preto hooky nesmú mať `t` v závislostiach (mutácia C11).
- `FeedCommentEditComposer` a `FeedCommentReplyComposer` majú efekty len na `textareaRef`, takže nová identita obsluh ich nespúšťa.
