<!-- Mapovanie agenta k nálezu 333 (K46), 21. 11. 2026, `main` `8c49c5b7`. Dvojité mapovanie (rozhodnutie majiteľa 21. 11. 2026, R65): robené nezávisle od kolegu; jeho výsledok (`K46_vysledok.md`) agent pri písaní nemal a do repozitára sa dostáva až po jeho dokončení; porovnanie a dohodnutý postup sú v `K46_porovnanie.md`, podklady (sonda, mutácie, ukážky testov) v `K46_podklady.md`. Kód v repozitári sa nemenil; všetky skúšky bežali v kópii `frontend` mimo repozitára. -->

# Mapovanie K46 (agent): delenie `FeedPostCard.tsx` a `FeedPostMobileDetail.tsx`

**PR a commity:** žiadne (len mapovanie; kód v repozitári sa nemení). Podklady (skripty, sonda, výsledky mutácií) sú po porovnaní s kolegom odovzdané v `K46_podklady.md`.
**Overenie:** kópia `frontend` z `main` `8c49c5b7` mimo repozitára (`npm ci`, 885 balíkov), repozitár sa nemenil. (1) Základ: 22 testových súborov, ktoré kartu menujú: 22 sád a 264 testov prešlo za 9 s; pokrytie `FeedPostCard.tsx`: výrazy 96,07 % (196 z 204), vetvy 93,19 % (137 zo 147), funkcie 92,45 % (49 z 53), riadky 97,92 % (189 z 193). (2) 166 ručne zvolených mutácií karty proti týmto sádam: 82 zachytených, 84 prežilo; prežívajúce znova proti 80 súborom (celý adresár `feed/__tests__`, `ProfileFeedSection`, `DashboardContent.feedOverlay` a `DashboardContentView`): vzorka 16 prežívajúcich zásahov (A1, A6, H1, H4, F6, K1, L9, L17, D1, D8, E1a, E2, E3, E7d, R1, R4): 2 ich zachytili ďalšie testy (A1: `FeedPostDetailModule`, L9: `FeedPostDetailOverlay`), 14 prežilo. (3) Sonda (odtlačok HTML a poradie registrácie efektov) má 37 stavov a dva behy dali rovnaký výstup. (4) Prototyp celého delenia (10 krokov karty a 2 kroky mobilného detailu): po každom kroku `tsc` čistý, ESLint bez chýb (jedno varovanie: nepoužitý import `toast` v karte), 22 sád a 264 testov prešlo, odtlačok HTML 37 z 37 bez zmeny a poradie efektov bez zmeny (jediný rozdiel v texte efektu je `post.id` → `postId`); 952 z 988 neprázdnych riadkov pôvodnej karty je v nových súboroch doslova (36 zvyšných: importy, signatúry, tri premenovania `ActionButton`, osem `post.id` → `postId`, päť riadkov JSX komentára a obaly podmienok). (5) Mutácie na prototype: všetkých 82 mutácií, ktoré 22 sád zachytilo na pôvodnej karte, sa zachytilo aj po delení v nových súboroch (rovnaké zásahy, text sa hľadal bez ohľadu na odsadenie a na premenovanie `post.id` → `postId`). (6) Celý Jest na prototype: 620 sád a 9 386 testov prešlo (rovnaké čísla ako na `main` po K45); do kópie som doplnil `e2e` a `backend/accounts/data`, lebo štyri sady (`E2eSessionKeeper`, `E2ePageActivity`, `E2eServiceWorker.guard` a `countryRegistry`) čítajú tieto súbory; `npm run build`: prešiel (Next.js 16.4.5, webpack, kompilácia 48 s, TypeScript 14 s, kód 0, bez výpisu `SecurityFatalError`); `check:missing-translations` a `check:used-translation-keys` čisté (0 chýbajúcich kľúčov).

## Zhrnutie

1. **Delenie sa dá urobiť čistým presunom.** Prototyp celého delenia v kópii mimo repozitára: `FeedPostCard.tsx` 1 033 → 481 riadkov (12 nových súborov, 10 krokov), `FeedPostMobileDetail.tsx` 594 → 368 (2 nové súbory, 2 kroky). Po každom kroku prešli `tsc`, ESLint, 22 sád (264 testov), odtlačok HTML 37 stavov bol bez zmeny a poradie efektov rovnaké.
2. **Slabé miesto sú testy, nie presun.** Z 166 skúšobných pokazení karty ich 22 sád zachytilo 82 a 84 prežilo (51 %); podľa častí: hlavička a menu 10 z 23, hlavička zdieľania 5 z 6, text príspevku 5 z 11, fotky 8 z 15, zdieľaný blok a označenia 8 z 9, riadok akcií 8 z 10, `ActionButton` 3 z 5, vložené komentáre 1 z 5, vrstvy a dialógy 11 z 28, zmazanie a odstránenie označenia 8 z 14, efekty a synchronizácia stavu 8 z 22, počty a polling 4 z 10, obal a režimy 3 z 8. Najslabšie sú vrstvy a dialógy, efekty a synchronizácia stavu, vložené komentáre a preklik na profil z hlavičky. Preto je dávka A (ochrana) povinná a má ísť samostatne pred presunmi.
3. **Odtlačok HTML a sonda efektov zachytia to, čo testy nie.** Z 11 skúšaných pokazení tried pružného stĺpca okna a obalu karty testy zachytili 1, odtlačok HTML 11; zásahy do textu efektov zachytí sonda efektov vo všetkých stavoch (vyskúšané na zásahoch E4, E5 a E6a). Správanie handlerov a fokus odtlačok nevidí: to musia držať nové testy.
4. **Samotné JSX nestačí.** Po presune všetkého JSX (kroky 1 až 6) má karta ešte 585 riadkov; pod 500 sa dostane až so štyrmi hookmi (zmazanie, označenia, vrstvy, počty). Hooky sa dajú presunúť bez zmeny poradia efektov, ak sa volajú na mieste pôvodného efektu.
5. **Kandidát na chybu (nález po porovnaní):** po úprave vlastného príspevku ukáže dialóg „Zdieľať ďalej“ v náhľade starý text, hoci karta už ukazuje nový (karta podáva dialógu `post`, nie `currentPost`); reprodukované v kópii, žiadny test to nestráži.
6. **Odhad:** päť dávok (A až E), spolu 4 až 5 dní; prvá je ochrana bez zmeny produkčného kódu.

## 1. Mapa hraníc `FeedPostCard.tsx` (1 033 riadkov, `main` `8c49c5b7`)

Čísla riadkov sú z `main` `8c49c5b7` (kód karty sa po K31 nezmenil). Veľkosti nových súborov sú z prototypu v kópii mimo repozitára (časť 2).

| # | Blok (riadky) | Od čoho závisí / čo mení | Cieľ po delení | Riziko |
| --- | --- | --- | --- | --- |
| 1 | Importy a hlavička súboru (1–72) | – | rozdelia sa podľa blokov | – |
| 2 | `ActionButton` (74–158) | len vlastnosti, bez hookov | `FeedPostActionButton.tsx` (89) | nulové |
| 3 | Typ vlastností karty (172–219) | `FeedPost`, `FeedPostImage` | `FeedPostCard.types.ts` (51) | nulové |
| 4 | Odstránenie vlastného označenia: obsluha (225–246), stavy `taggedUsers`, `tagRemoveOpen`, `removingTag` (368–379), efekt E3 (402–404) | `removeOwnFeedPostTag`, `onSelfTagRemoved`, `t`, `post.tagged_users` | `useFeedPostTags.ts` (54) | stredné: stav používa JSX aj dialóg; efekt E3 sa musí volať na mieste pôvodného efektu |
| 5 | Zmazanie príspevku: obsluha (255–276), stavy `deleteOpen`, `deleting` | `deleteFeedPost`, `onDeleted`, `emitFeedPostDeleted`, `t` | `useFeedPostDelete.ts` (45) | nízke (bez efektov) |
| 6 | Lokálna kópia príspevku a odvodené hodnoty: `currentPost`, `usePendingFeedImages`, `useViewerPost`, počet komentárov, lajk (285–329) | `useFeedPostCommentsCount`, `useFeedPostLike` | ostáva v karte (jadro) | – |
| 7 | Kontext okna a režimy: `postOverlay`, `opensOverlay`, `opensPhotoViewer`, `opensMobileDetail`, `closeOverlayOnLeave` (332–366) | `useFeedPostOverlay`, `isMobile`, `variant` | ostáva v karte, do komponentov ide ako vlastnosti | – |
| 8 | Stavy menu, nahlásenia, zdieľania, úpravy, lajkujúcich a komentárov (368–386) | – | ostáva v karte | nízke |
| 9 | Efekty E1 až E5 (392–426): prop-sync lajku, počtu komentárov, označení a príspevku a premietnutie lajku do `currentPost` | `likePendingRef`, `post`, `isLiked`, `likesCount` | ostáva v karte (E3 ide do hooku označení) | stredné: E4 musí bežať pred E5 |
| 10 | Stavy vrstiev (343–356) a efekty E6 a E7 (431–453): zavretie vrstiev po zdieľaní a po zmazaní príspevku iným | `onFeedShareLanding`, `onFeedPostDeleted`, `post.id` | `useFeedPostMobileLayers.ts` (52) | stredné: odber udalostí a poradie voči E1 až E5 |
| 11 | `refreshCounts` a polling počtov (455–495) | `likePendingRef`, `likeSeqRef`, `setLikesCount`, `setIsLiked`, `publishCommentsCount`, `inViewport`, `getFeedPost`, `emitFeedPostCounts` | `useFeedPostCountsPolling.ts` (71) | stredné až vysoké: dve brzdy proti prebliknutiu lajku, poradie a identita `refreshCounts` |
| 12 | Odvodené hodnoty a obsluhy náhľadu: `isSelfShare`, `isOwnReshare`, `handleOpenSharedSource`, `handleOpenSharedPostPreview`, `sharedCaptionNode`, `sharedHeadline` (497–553) | `post`, `currentPost`, `router` | ostáva v karte | – |
| 13 | Obal `<motion.article>` (556–579, 1031) | `viewportRef`, `isDetail`, `fillHeight` | ostáva v karte | kritické pre pružný stĺpec |
| 14 | Riadok „zdieľa ďalej“ (580–593) | `isShared`, `isOwnReshare`, `sharedHeadline` | ostáva v karte | – |
| 15 | Hlavička a menu „...“ (595–721, 127 riadkov) | 19 vlastností, `menuTriggerRef` | `FeedPostHeader.tsx` (191) | nízke (JSX); fokus nestráži odtlačok HTML |
| 16 | Text voľného príspevku (723–739) | `caption`, `isDetail`, `fillHeight` | ostáva v karte | – |
| 17 | Fotky (741–779) | 8 vlastností | `FeedPostMedia.tsx` (69) | stredné: pružná plocha v okne |
| 18 | Zdieľaný blok a označenia (781–860) | 13 vlastností | `FeedPostSharedBlock.tsx` (122) | stredné: pružná časť v okne |
| 19 | Riadok akcií (862–925) | 15 vlastností | `FeedPostActionsRow.tsx` (111) | nízke |
| 20 | Vložené komentáre (927–938) | `commentsOpen`, `isDetail` | ostáva v karte | – |
| 21 | Mobilné vrstvy: fotoprehliadač repostu, mobilný detail, prehliadač fotky (940–970) | 12 vlastností | `FeedPostMobileLayers.tsx` (75) | nízke |
| 22 | Dialógy: lajkujúci, dve potvrdenia, úprava, nahlásenie, zdieľanie (972–1030) | 23 vlastností | `FeedPostDialogs.tsx` (127) | nízke |

Po všetkých krokoch má karta 481 riadkov: ostáva v nej jadro (stav príspevku a lajku, efekty E1, E2, E4 a E5, režimy okna, text voľného príspevku, riadok „zdieľa ďalej“, vložené komentáre a obal) a volania hookov a komponentov.

## 2. Poradie krokov a dávok

Každý krok je čistý presun kódu: JSX a obsluhy sa prenášajú doslova, mení sa len odsadenie a mená (pri hookoch `post.id` → `postId`, `ActionButton` → `FeedPostActionButton`). Veľkosti sú namerané na prototype; riadok „karta“ je veľkosť `FeedPostCard.tsx` po kroku.

| Dávka | Krok | Čo | Karta | Nové súbory (riadky) | Riziko | Čo ho stráži |
| --- | --- | --- | --- | --- | --- | --- |
| A | 0 | ochrana: charakterizačné testy pre medzery (časť 6), dočasný odtlačok HTML 37 stavov a sonda poradia efektov; produkčný kód sa nemení | 1 033 | len testy | žiadne | – |
| B | 1 | `ActionButton` a typ vlastností | 900 | `FeedPostActionButton.tsx` (89), `FeedPostCard.types.ts` (51) | nulové | `tsc`, odtlačok |
| B | 2 | riadok akcií (15 vlastností) | 852 | `FeedPostActionsRow.tsx` (111) | nízke | odtlačok, testy akcií |
| B | 3 | mobilné vrstvy (12) a dialógy (23) | 795 | `FeedPostMobileLayers.tsx` (75), `FeedPostDialogs.tsx` (127) | nízke | odtlačok stavov s otvorenými vrstvami, testy |
| C | 4 | hlavička a menu (19) | 680 | `FeedPostHeader.tsx` (191) | nízke | testy fokusu a menu z kroku 0 (odtlačok fokus nevidí) |
| C | 5 | zdieľaný blok a označenia (13) | 614 | `FeedPostSharedBlock.tsx` (122) | stredné | odtlačok okien `detail-*-fill` |
| C | 6 | fotky (8) | 585 | `FeedPostMedia.tsx` (69) | stredné | odtlačok `detail-photo-fill` |
| D | 7 | hook zmazania | 562 | `useFeedPostDelete.ts` (45) | nízke | testy zmazania |
| D | 8 | hook označení (vrátane E3 na pôvodnom mieste) | 537 | `useFeedPostTags.ts` (54) | stredné | sonda efektov, testy označení |
| D | 9 | hook vrstiev (3 stavy, E6 a E7) | 515 | `useFeedPostMobileLayers.ts` (52) | stredné | sonda efektov, testy zdieľania a zmazania iným |
| D | 10 | hook počtov a pollingu | 481 | `useFeedPostCountsPolling.ts` (71) | stredné až vysoké | sonda efektov, testy `likePolling` a `CountsSync`, mutácie R1 až R9 |
| E | 11 | mobilný detail: obsah nad komentármi (18) | detail 464 | `FeedPostMobileDetailContent.tsx` (206) | nízke | odtlačok (tri stavy detailu) |
| E | 12 | mobilný detail: hlavička (13) | detail 368 | `FeedPostMobileDetailHeader.tsx` (155) | nízke | odtlačok |
| E | 13 | zmazanie dočasného odtlačku HTML (ako pri K42) | – | – | – | – |

**Poradie a prečo:** najprv bezstavové JSX (B), potom JSX, ktoré drží pružný stĺpec okna (C), nakoniec hooky (D), lebo tam sa prenášajú efekty. Samotné JSX bez hookov nestačí: po krokoch 1 až 6 má karta ešte 585 riadkov, pod 500 sa dostane až s hookmi.

**Poradie efektov:** hook sa volá na mieste pôvodného efektu (nie na mieste stavov), takže registrácia efektov ostáva v rovnakom poradí (E1, E2, E3, E4, E5, E6, E7, polling). Sonda to potvrdila v 37 stavoch; jediný rozdiel v texte efektu je premenovanie `post.id` → `postId`. Poradie E4 pred E5 je podstatné: E4 nastaví `currentPost` na prop a E5 do neho premietne lajk; v opačnom poradí by E4 premietnutie prepísal.

**Alternatíva bez presunu efektov:** ak by kolega nechcel presúvať E3, E6 a E7, karta by mala okolo 520 riadkov; po vyčlenení riadku „zdieľa ďalej“ a textu voľného príspevku (spolu asi 30 riadkov) by bola tesne pod 500. Takýto variant som neskúšal; jeho rezerva je malá.

## 3. Pružný stĺpec okna (`fillHeight`)

Dnešná štruktúra (overená z odtlačku HTML, stav `detail-*-fill`): `<article>` má triedy `flex min-h-0 flex-1 flex-col overflow-hidden` a jeho priami potomkovia sú

- pri príspevku s fotkou: hlavička `shrink-0`, text `shrink-0`, **pružná plocha** `flex min-h-[8rem] flex-1 flex-col` (`data-testid="feed-post-media-fill"`), riadok akcií `shrink-0`;
- pri zdieľanej ponuke, portfóliu a reposte: riadok „zdieľa ďalej“ `shrink-0`, hlavička `shrink-0`, **pružný zdieľaný blok** `subtle-scrollbar min-h-0 flex-1 overflow-y-auto`, riadok akcií `shrink-0`;
- pri texte bez fotky: všetko `shrink-0`, nič pružné.

**Ako sa to po každom kroku zaručí:** (1) každý vyčlenený komponent vracia presne ten istý koreňový prvok ako predtým (hlavička `<header>`, akcie `<footer>`, zdieľaný blok svoj `<div>` alebo `null`, fotky obal alebo karusel, vrstvy a dialógy fragment) a nepridáva obal; (2) trieda `fixedBlock` sa podáva ako vlastnosť, nie je skopírovaná; (3) odtlačok HTML 37 stavov je po každom kroku bajt po bajte rovnaký (v štyroch stavoch okna s `fillHeight` a vo všetkých ostatných); (4) odtlačok je citlivý: z 11 skúšaných pokazení tried pružného stĺpca a obalu ich odtlačok zachytil 11, testy ich zachytili 1. Čo sa v jsdom nedá overiť, je skutočná výška, posun a `95vh` okna: to ostáva na ručnom teste na počítači a na kontrole rozloženia od Codexu.

**Čo sa neskôr mení v tom istom mieste:** natiahnutie fotky karty ponuky a portfólia (nález 344, R63 bod 3) je potom zmena koreňa v `FeedPostSharedBlock.tsx` (flex stĺpec) a nová vlastnosť v `SharedContentPreviewCard.tsx` (355 riadkov), teda dva malé súbory, nie 1 033-riadkový.

## 4. `FeedPostMobileDetail.tsx` (594 riadkov)

`FeedPostMobileDetail.tsx` (594 riadkov) je samostatný komponent: nepoužíva `ActionButton` z karty, má vlastnú hlavičku, menu, riadok akcií a dialógy. S kartou zdieľa len hooky a malé komponenty (`useFeedPostLike`, `useFeedPostCommentsCount`, `usePendingFeedImages`, `FeedPostCaption`, `FeedPostImageCarousel`, `SharedContentPreviewCard`, `FeedPostShareModal` a ďalšie dialógy). Delí sa **nezávisle od karty** (nič z neho nepotrebuje delenie karty).

Prototyp v dvoch krokoch (čisté presuny JSX, bez zmeny hookov): (1) obsah nad komentármi (`listHeader`, riadky 293–407) s ikonami `HeartIcon`, `CommentIcon` a konštantami → `FeedPostMobileDetailContent.tsx` (206 riadkov, 18 vlastností): 594 → 464; (2) fixná hlavička s menu (419–528) → `FeedPostMobileDetailHeader.tsx` (155, 13 vlastností): 464 → 368. Oba kroky prešli `tsc`, ESLintom, 22 sádami (264 testov) a odtlačkom HTML (tri stavy mobilného detailu: ponuka so srdiečkom, menu vlastníka s dvoma fotkami, repost s fotkou a zoznamom lajkujúcich), poradie efektov sa nemení (efekty ostávajú v komponente). Stačí jeden krok (obsah), ak sa 464 riadkov uzná; druhý krok je rezerva a oddelí hlavičku, ktorej sa dotknú mobilné doladenia (skupina 6 nálezu 261).

Súvislosti: komentáre sú v mobilnom detaile `listHeader` posúvateľného boxu `FeedPostComments`; `FeedPostMobileDetailContent` je presne ten `listHeader`. Odporúčam ho deliť **po karte** (dávka E), lebo je to mobilná plocha: jeden ručný test na iPhone.

## 5. Verejné rozhranie

- `FeedPostCard` je `export default` a jediný export; importujú ho 5 súborov (`FeedList.tsx`, `ProfileFeedSection.tsx`, `FeedPostDetailOverlay.tsx`, `FeedPostDetailModule.tsx`, `FeedPostDetailSplitLayout.tsx`), všetky len ako default import. Žiadny test nemockuje `../FeedPostCard`. Po delení sa nemení nič: nový je len exportovaný typ `FeedPostCardProps` v `FeedPostCard.types.ts`.
- Testy, ktoré čítajú zdrojové súbory (`FeedReturnState.test.tsx` riadok 565, `openUserProfileFromSearch.entryPoints.test.tsx` riadok 43, `CardsOutsideFeed.regression.test.tsx` riadok 141): prehľadávajú zdroje všeobecne, nie `FeedPostCard.tsx` po názve; nové súbory teda prehľadajú tiež. Celý Jest na prototype: 620 sád a 9 386 testov prešlo (rovnaké čísla ako na `main` po K45); do kópie som doplnil `e2e` a `backend/accounts/data`, lebo štyri sady (`E2eSessionKeeper`, `E2ePageActivity`, `E2eServiceWorker.guard` a `countryRegistry`) čítajú tieto súbory.
- E2E: `data-testid` a `data-post-type` sa nemenia (odtlačok), takže špecy sa nemenia.

## 6. Stráženie testami

Kartu vykresľuje 22 súborov testov (najväčšie `FeedPostCard.interactions.test.tsx` 668 riadkov, `FeedPostMobileDetail.test.tsx` 695 a `FeedPostGone.test.tsx` 415; testy nad 500 riadkov sa podľa R27 menia len málo, nové testy idú do nových súborov). Pokrytie týmito testami je vysoké (výrazy 96,07 %, vetvy 93,19 %), no pokrytie neznamená kontrolu: zo 166 skúšobných pokazení kódu karty (jedna zmena v `FeedPostCard.tsx`: vypnutý handler, zmenená podmienka alebo trieda) testy zachytili 82 a 84 prežilo. Podľa častí: hlavička a menu 10 z 23, hlavička zdieľania 5 z 6, text príspevku 5 z 11, fotky 8 z 15, zdieľaný blok a označenia 8 z 9, riadok akcií 8 z 10, `ActionButton` 3 z 5, vložené komentáre 1 z 5, vrstvy a dialógy 11 z 28, zmazanie a odstránenie označenia 8 z 14, efekty a synchronizácia stavu 8 z 22, počty a polling 4 z 10, obal a režimy 3 z 8.

**Čo z toho plynie pre delenie:** prežívajúce zásahy v presúvaných častiach (zmazanie, označenia, synchronizácia stavu, vrstvy, polling) znamenajú, že by chybu pri presune tieto testy nezachytili; preto dávka A pridá charakterizačné testy ešte pred presunmi a po nej sa mutácie zopakujú (rovnako ako pri K28 a K45). Časť prežívajúcich zásahov je ekvivalentná alebo bez dôsledku v jsdom (napr. prázdne závislosti efektu, ktorý beží aj tak, alebo `aria-*`); neposudzoval som ich po jednom.

| Oblasť | Prežili (22 sád) | Navrhnutý charakterizačný test (nový súbor; popisy po slovensky) |
| --- | --- | --- |
| Hlavička: preklik na profil autora | H13, H14, H15, H16, H17, H17b | hlavička: avatar a meno otvoria profil autora (bez autora sú vypnuté); v okne detailu sa pred odchodom zavrie okno bez zápisu do histórie (`keepHistory`) |
| Menu „...“ | H1, H4, H5, H6, H8, H22 | menu: druhý klik na spúšťač ho zavrie; po zatvorení z klávesnice sa fokus vráti na spúšťač; voľba nahlásenia a zmazania menu zavrie; po nahlásení je položka vypnutá; `aria-expanded` sleduje stav |
| Riadok akcií a `ActionButton` | A1, A6, F6, F10 | akcie: počet 0 nie je klikateľný; aktívny lajk a otvorené komentáre majú aktívnu farbu; ikona komentárov na počítači bez okna rozbaľuje a zbaľuje komentáre |
| Vložené komentáre | K1, K2, K3, K4 | komentáre: v okne detailu sa nekreslia; zmena počtu a celkový počet z komentárov sa premietne k ikone; zvýraznenie komentára z upozornenia sa podá |
| Text príspevku (vlastnosti `FeedPostCaption`) | C2, C2b, C3, C3b, C4, C4b | text: v okne má ohraničené rozbalenie, počet riadkov podľa okna a hranicu podľa `fillHeight` (cez atrapu `FeedPostCaption` s kontrolou vlastností) |
| Hlavička zdieľania | S4 | hlavička zdieľania: pri portfóliu hovorí o portfóliu a pri ponuke o výmene |
| Fotky a pružná plocha okna | M1, M2, M3, M4, M5, M7, M11 | fotky: v okne je pružná plocha s podlahou (štruktúra cez triedy); na mobile ťuk na druhú fotku otvorí prehliadač na jej indexe; v okne sa mobilný detail neotvára |
| Zdieľaný blok v okne a hlavička v okne | B2, H20 | okno: zdieľaný blok je pružný a hlavička má odsadenie pre „X“ (štruktúra cez triedy) |
| Zmazanie príspevku (krok 7) | D1, D3, D7, L10, L12, L23, L24 | zmazanie: počas mazania je potvrdenie vypnuté (dvojitý klik nespustí dva dopyty); po úspechu sa potvrdenie zavrie a zoznam dostane `onDeleted`; po zlyhaní sa tlačidlo vráti do pôvodného stavu |
| Odstránenie vlastného označenia (krok 8) | D8, D11, D14, L14, L15, E3, E3b | označenia: dvojitý klik nespustí dva dopyty; po úspechu sa potvrdenie zavrie; po zlyhaní sa vráti do pôvodného stavu; zmena `post.tagged_users` z feedu sa premietne do označení |
| Synchronizácia stavu z feedu (jadro karty) | E1a, E1b, E1c, E1d, E2, E2b, E5b, E5d | prop-sync: nový počet lajkov, stav lajku a počet komentárov z feedu sa premietnu do karty (okrem prebiehajúceho lajku); lajk sa premietne do prehliadača fotky a detailu cez `currentPost` |
| Vrstvy po zdieľaní a po zmazaní iným (krok 9) | E6c, E7c, E7d, E7e, L1, L8, L25, L25b | vrstvy: zmazanie iného príspevku vrstvy nezavrie, zmazanie toho istého áno (aj fotoprehliadač repostu); zdieľanie zavrie aj fotoprehliadač repostu; prehliadač fotky sa otvorí na ťuknutej fotke |
| Polling počtov (krok 10) | R1, R3b, R4, R5, R6, R7 | polling: počet lajkov a stav sa zapíšu, počet komentárov sa zverejní a rozošle sa udalosť druhej karte; obe brzdy proti prebliknutiu lajku (časť zásahov môže byť ekvivalentná, lebo stav prichádza aj cez udalosť) |
| Dialógy: zatváranie a odovzdanie výsledku | L9, L17, L18, L19, L22, L21 | dialógy: zoznam lajkujúcich, nahlásenie a zdieľanie sa zatvoria; po nahlásení sa menu ukáže „Už nahlásené“; po úprave sa volá `onPostUpdated`; zdieľanie odovzdá `onShared` |
| Chyba pri zdieľaní po úprave (kandidát) | L20 | náhľad zdieľania po úprave ukáže nový text (test zlyhá na dnešnom kóde; platí až po oprave) |
| Obal a vstupy | W1, W2, W3, W4, W10 | obal: `data-post-type`, flex stĺpec a `shrink-0` v okne (štruktúra cez triedy; zachytí ich aj odtlačok HTML); zdroj zdieľania z lokálnej verzie po úprave |

Overil som dva z návrhov na kópii: test fokusu (po zatvorení menu z klávesnice sa fokus vráti na spúšťač) zachytí zásah H1 a test prepínania menu zachytí H4 a H22; oba prechádzajú na pôvodnej karte aj na prototype delenia. Test zdieľania po úprave (kandidát na chybu) na dnešnom kóde zlyhá.

**Odtlačok HTML a sonda efektov** (dočasné, ako pri K28; zmažú sa v poslednej dávke): 37 stavov karty (feed: text, jedna a tri fotky, ponuka, portfólio, repost s fotkou a bez, vlastný repost, vlastná ponuka, nedostupný zdroj, označenia, vlastný príspevok s „upravené“, zamietnutá fotka, okno s fotkou, komentáre rozbalené; okno `detail` s fotkou, ponukou, repostom s označením a textom, s `fillHeight` aj bez; mobil: karta s fotkou a s textom; otvorené: menu vlastníka a cudzie, zoznam lajkujúcich, potvrdenie zmazania, potvrdenie odstránenia označenia, nahlásenie, zdieľanie, úprava, mobilný detail (fotka, ponuka, menu vlastníka, repost so zoznamom lajkujúcich), prehliadač fotky, fotka repostu, komentáre v okne). Sonda zapisuje vykreslené HTML (identifikátory `useId` sa normalizujú) a poradie volaní `useEffect` a `useLayoutEffect` (text callbacku a počet závislostí); porovnáva sa pred a po každom kroku. Nezahŕňa `liveImages`, `commentsCount` (override), `highlightCommentId` a skutočné pending fotky s pollingom: pri implementácii doplniť.

## 7. Súvislosti s ďalšou prácou

- **261 skupina 8 (značky pri príspevkoch)** → `FeedPostSharedBlock.tsx` (zoznam označených); **261 skupina 6 (mobilné doladenia)** → `FeedPostMobileDetailContent.tsx` a `FeedPostMobileDetailHeader.tsx`; **redizajn komentárov (K44)** nepotrebuje súbory karty, no pole na text pri odpovedi a bublinka s lajkom sú vo `FeedPostComments`.
- **262 etapa B (zoznam lajkujúcich pri príspevku a v detaile)** → `FeedPostActionsRow.tsx` a `FeedPostMobileDetailContent.tsx` (obe majú počet pri srdiečku) a `FeedPostDialogs.tsx` (dialóg).
- **344 (okno na počítači)** → dva stĺpce a úzke okno sú v `FeedPostDetailOverlay.tsx` a `FeedPostDetailSplitLayout.tsx` (nezávislé od delenia); natiahnutie fotky karty ponuky a portfólia → `FeedPostSharedBlock.tsx` a `SharedContentPreviewCard.tsx`.
- **288 (vlastná vstupná animácia)** je v obale `<motion.article>`, ktorý ostáva v karte; delenie ho nemení.
- **256 (zoznam lajkujúcich a profil)** → `FeedPostDialogs.tsx` a `FeedLikersDialog.tsx`; delenie ich nemení.

## 8. Čo overiť ručne a dopad na E2E

Po každej dávke (B až E) a po nasadení tieto scenáre (návrh, najviac 5 bodov):

1. **Počítač, feed:** karty s textom, s jednou a viacerými fotkami, zdieľaná ponuka a portfólio, repost s fotkou aj bez, vlastný repost a príspevok s označeným používateľom: vzhľad ako pred zmenou. Menu „...“: otvoriť a zatvoriť (Esc aj druhý klik, fokus sa vráti na „...“), nahlásiť (potom „Už nahlásené“), upraviť, zmazať s potvrdením; vlastný aj cudzí príspevok.
2. **Počítač, akcie:** lajk, klik na počet (zoznam lajkujúcich), počet po obnovení, lajk z druhého účtu (do 8 s); odstránenie vlastného označenia; zdieľanie ďalej (dialóg, odoslanie, pristátie na Nástenke so zatvorenými vrstvami).
3. **Počítač, okno príspevku:** príspevok s fotkou (fotka vyplní ľavý stĺpec, hlavička a riadok akcií stoja aj po rozbalení dlhého textu), zdieľaná ponuka alebo portfólio (náhľad sa posúva vnútri, riadok akcií stojí), príspevok len s textom; „X“ a menu sa neprekrývajú; komentáre v pravom stĺpci.
4. **iPhone:** ťuk na fotku (prehliadač fotky), ťuk na text a na ikonu komentárov (mobilný detail: lajk, počet lajkov, komentáre, menu, zdieľať, zavrieť), zdieľanie z detailu zatvorí vrstvy; zmazanie príspevku z druhého zariadenia zavrie vrstvy.
5. **Profil:** karty v záložke príspevkov sa vykresľujú a správajú rovnako.

**Dopad na E2E:** žiadny na špecy (DOM, `data-testid` a `data-post-type` sa nemenia). Kartu používajú `feed-post-detail.spec.ts`, `sharing-from-feed.spec.ts`, `sharing-from-profile.spec.ts` a `profile-entry-scroll.spec.ts` (a pomocníci `support/feed.ts`, `feed-comments-ui.ts`, `feed-comment-source.ts`); poznámka v karte K46, že kartu kryje len dym a `feed-post-detail.spec.ts`, je neúplná. Návrh pre Codexa: po dávkach B, C a D dym `@smoke` a cielený beh týchto štyroch špecov; po dávke C kontrola rozloženia okna na čítanie (príspevok s fotkou, ponuka, portfólio a text: `feed-post-overlay-split` je alebo nie je, šírka okolo 864 resp. 576 px, výška 95 % pri dvoch stĺpcoch, riadok akcií a pole „Napíš komentár...“ celé v okne).

## 9. Odhad

Päť dávok (A až E), každá jeden PR s ručným testom majiteľa; spolu **4 až 5 dní** (A pol až jeden deň, B pol dňa, C jeden deň, D jeden deň, E pol dňa; presunov samotných je málo, čas berie ochrana a ručné testy). Prototyp ukázal, že technické riziko presunu je nízke (všetkých 12 krokov prešlo kontrolami hneď); najväčšie riziko je neúplná ochrana správania (časť 6), preto je dávka A povinná a nemá sa spájať s presunmi. Najcitlivejšie sú kroky 5, 6 (pružný stĺpec okna) a 8 až 10 (efekty): pri nich sa po každom kroku zopakuje sonda a mutácie.

## Kandidáti na nové nálezy

1. **Náhľad v dialógu „Zdieľať ďalej“ ukáže po úprave starý text.** Kde: `FeedPostCard.tsx:1028` podáva `FeedPostShareModal` prop `post` (verzia z feedu), kým kartu po úprave drží `currentPost` (`:285`, `:1013`); mobilný detail podáva `currentPost` (`FeedPostMobileDetail.tsx:562`). Dôkaz (kópia mimo repozitára, test odvodený z `FeedPostEdit.test.tsx`): autor zmení text „Povodny text“ na „Novy text“, karta ukáže nový, no po ťuknutí na „Zdieľať ďalej“ dialóg v náhľade ukazuje „Povodny text“; mutácia `post={currentPost}` (L20) prežila všetky testy. Dopad: nízky, náhľad klame, no zdieľa sa aktuálny obsah (backend si ho berie sám); pri úprave fotiek sa v náhľade môže ukázať stará prvá fotka (nepreskúšané). Oprava: jedno slovo a test; patrí do samostatnej malej dávky po delení (mení správanie, preto nie do presunov).

## Poznámky (bez čísla)

- Pri krokoch 7 a 8 treba z karty odstrániť nepoužitý import `toast` (ESLint ho hlási ako varovanie).
- `FeedPostMobileDetail.handleDelete` duplikuje `FeedPostCard.handleDeletePost` (rozdiel len záverečné `onClose()`); po delení sa dá zjednotiť do `useFeedPostDelete`, nie pred ním.
- `HeartIcon` a `CommentIcon` v mobilnom detaile duplikujú SVG z karty (iná veľkosť); pri delení sa nemenia.
- Sonda (`zzProbe.test.tsx`) a test fokusu sú po porovnaní s mapovaním kolegu odovzdané v `K46_podklady.md` (časti 1 a 2.1) ako východisko dávky K48.

## Odchýlky od predbežného rozboru v karte K46

- Počet volaní `useState` v karte je **17** (15 bez typu a 2 s typom: `photoViewerIndex` a `menuAnchor`), nie 15; opravené v karte a v zozname (vetva 192).
- `ActionButton` je na riadkoch 74–158 a importy sú 1–72 (v karte bolo 62–158 a 1–60); opravené v rovnakej vetve.
- Poznámka v karte, že E2E kartu kryje len dym a `feed-post-detail.spec.ts`, je neúplná (časť 8).
- Predbežný rozbor v karte predpokladal stav prepletený cez `currentPost`, lajk a otvorené vrstvy: JSX sa dá deliť bez zmeny vlastníctva stavu (stav ostáva v karte, komponenty ho dostávajú ako vlastnosti); vlastníctvo sa presúva len pri troch hookoch (označenia, vrstvy, zmazanie) a polling počtov nemá vlastný stav.

## Neoverené a obmedzenia

- **Prehliadač a zariadenie:** nič z toho som neskúšal v prehliadači ani na iPhone. Odtlačok HTML je vykreslené HTML z jsdom, nie skutočné rozloženie: výška, posun, `95vh` okna, fokus a dotyk ostávajú na ručnom teste a na kontrole od Codexu.
- **E2E:** Playwright som nespúšťal.
- **Mutácie:** 166 zásahov je ručný výber, nie vyčerpávajúci; ekvivalentné zásahy som neposudzoval po jednom; proti 80 súborom som zopakoval len vzorku 16 prežívajúcich zásahov (14 prežilo aj tam), takže skutočný počet medzier je o niečo nižší než 84.
- **Sonda:** nepokrýva `liveImages`, `commentsCount` (override), `highlightCommentId`, skutočné pending fotky s pollingom ani odovzdanie `onShared`; pri implementácii doplniť.
- **Prototyp nie je revidovaný kód:** názvy súborov a vlastností, zoskupenie vlastností (napríklad 23 vlastností dialógov) a komentáre sú návrh; presun stavu menu do hlavičky (menej vlastností) som neskúšal.
- **Odhad času** (4 až 5 dní) je odvodený z delenia komentárov (K26 až K42: mapovanie 16. 11. a päť dávok od 17. do 19. 11. 2026), nie z merania.
- **Nezávislosť:** mapovanie som robil bez výsledku kolegu (v čase písania nebol k dispozícii), no kolega dostal kartu K46 s mojím predbežným rozborom, takže nie je od neho úplne nezávislý.
