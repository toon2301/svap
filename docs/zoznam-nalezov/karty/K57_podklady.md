# Podklady K57: prototyp okna detailu na počítači (344), overené testy, merania a zásahy

Pripravil agent 23. 11. 2026 ako podklad ku karte `karty/K57.md`. Prototyp je v kópii `frontend` z `main` `a9e70eef` mimo repozitára; agent ho kolegovi neodovzdáva ako hotový kód, len ako dôkaz, že postup ide, a ako východisko pre testy: kolega ich skontroluje, uprav a odôvodní každú zmenu v texte commitu. Čísla riadkov platia pre `main` `a9e70eef`. Testy majú popisy po slovensky (R62), existujúce testy sa menia len v časti 3 (R27).

## 1. Zmena kódu v prototype po krokoch

Tri kódové kroky sa dajú aplikovať jeden po druhom (každý je samostatný commit a po každom prechádzajú súvisiace testy). Diffy nižšie vznikli presne v tomto poradí z `main` `a9e70eef`.

### Krok 1: ponuka a portfólio v dvoch stĺpcoch

```diff
diff --git a/frontend/src/components/dashboard/modules/feed/FeedPostDetailOverlay.tsx b/frontend/src/components/dashboard/modules/feed/FeedPostDetailOverlay.tsx
--- a/frontend/src/components/dashboard/modules/feed/FeedPostDetailOverlay.tsx
+++ b/frontend/src/components/dashboard/modules/feed/FeedPostDetailOverlay.tsx
@@ -7,12 +7,14 @@
  * neodmountuje: appka sa nenaviguje, len sa navrch vykreslí portál. Po zavretí
  * je teda používateľ presne tam, kde bol, vrátane pozície scrollu.
  *
- * Rozloženie má dva tvary podľa toho, či príspevok má fotku:
+ * Rozloženie má dva tvary podľa toho, čo je v príspevku hlavný obsah:
  *
- *  - S FOTKOU: dva stĺpce vedľa seba (`FeedPostDetailSplitLayout`) – vľavo
- *    hlavička, text, fotka a akcie, vpravo výhradne komentáre.
- *  - BEZ FOTKY: pôvodné jednostĺpcové rozloženie – pevný blok (hlavička, text,
- *    akcie) sa nikdy nescrolluje a komentáre dostanú všetok zvyšný priestor.
+ *  - S FOTKOU, PONUKOU ALEBO PORTFÓLIOM: dva stĺpce vedľa seba
+ *    (`FeedPostDetailSplitLayout`) – vľavo hlavička, text, fotka alebo karta
+ *    a akcie, vpravo výhradne komentáre.
+ *  - BEZ NICH (text, repost textového príspevku): pôvodné jednostĺpcové
+ *    rozloženie – pevný blok (hlavička, text, akcie) sa nikdy nescrolluje
+ *    a komentáre dostanú všetok zvyšný priestor.
  *    Robí to `flex` stĺpec s `min-h-0` na komentárovej časti – bez toho by ju
  *    obsah roztiahol a okno by prerástlo obrazovku (flex položka má
  *    predvolene `min-height: auto`).
@@ -34,6 +36,7 @@ import FeedPostCard from './FeedPostCard';
 import FeedPostComments from './FeedPostComments';
 import FeedPostDetailSplitLayout, {
   hasVisibleFeedPhoto,
+  sharesOfferOrPortfolio,
 } from './FeedPostDetailSplitLayout';
 import { sharedFeedPostPhoto } from './feedImageSources';
 import { useFeedDialog } from './useFeedDialog';
@@ -195,7 +198,7 @@ export default function FeedPostDetailOverlay({
   /**
    * Dvojstĺpcové rozloženie potrebuje DVE veci naraz:
    *
-   *  - fotku (jediná časť, ktorá vie pohltiť zvyšok výšky ľavého stĺpca),
+   *  - fotku alebo kartu ponuky či portfólia (jediná časť, ktorá vie pohltiť zvyšok výšky ľavého stĺpca),
    *  - a dosť širokú obrazovku, inak by z dvoch stĺpcov ostali dva nepoužiteľne
    *    úzke pruhy.
    *
@@ -205,8 +208,7 @@ export default function FeedPostDetailOverlay({
    * nová konštanta. Otvorené okno sa pri zúžení prehliadača nezatvára, takže
    * bez tejto podmienky by sa dva stĺpce udržali aj hlboko pod ňou.
    *
-   * Pod hranicou platí presne to, čo dnes platí pre text-only príspevky:
-   * pôvodné jednostĺpcové rozloženie.
+   * Pod hranicou platí pôvodné jednostĺpcové rozloženie.
    */
   const isMobile = useIsMobile();
   /**
@@ -219,7 +221,9 @@ export default function FeedPostDetailOverlay({
    */
   const hasPhoto =
     hasVisibleFeedPhoto(liveImages) || sharedFeedPostPhoto(post) !== null;
-  const splitLayout = hasPhoto && !isMobile;
+  /** Zdieľaná ponuka alebo portfólio: karta je hlavný obsah okna ako fotka (R53). */
+  const sharesCard = sharesOfferOrPortfolio(post);
+  const splitLayout = (hasPhoto || sharesCard) && !isMobile;
   /**
    * Vypĺňa zdieľaný náhľad zvyšok jednostĺpcového bloku?
    *
diff --git a/frontend/src/components/dashboard/modules/feed/FeedPostDetailSplitLayout.tsx b/frontend/src/components/dashboard/modules/feed/FeedPostDetailSplitLayout.tsx
--- a/frontend/src/components/dashboard/modules/feed/FeedPostDetailSplitLayout.tsx
+++ b/frontend/src/components/dashboard/modules/feed/FeedPostDetailSplitLayout.tsx
@@ -1,11 +1,11 @@
 'use client';
 
 /**
- * Dvojstĺpcové rozloženie okna detailu – VÝHRADNE pre príspevok s fotkou.
+ * Dvojstĺpcové rozloženie okna detailu – pre príspevok s fotkou a pre zdieľanú ponuku alebo portfólio (R53).
  *
- * Text-only príspevok ostáva na pôvodnom jednostĺpcovom rozložení priamo vo
- * `FeedPostDetailOverlay`: bez fotky by pravý stĺpec nemal čo vyvážiť a
- * v ľavom by nebolo nič pružné, čo by pohltilo zvyšok výšky.
+ * Text-only príspevok (aj repost textového príspevku) ostáva na pôvodnom jednostĺpcovom rozložení priamo vo
+ * `FeedPostDetailOverlay`: bez fotky ani karty by pravý stĺpec nemal čo vyvážiť a v ľavom by nebolo nič
+ * pružné, čo by pohltilo zvyšok výšky. Pri ponuke a portfóliu je pružný zdieľaný blok s kartou.
  *
  *   ĽAVÝ (56 %)                      PRAVÝ (44 %)
  *   ─────────────────────────        ─────────────────────
@@ -60,14 +60,26 @@ import FeedPostComments from './FeedPostComments';
  * zamietnuť aj počas otvoreného okna a rozloženie sa vtedy musí prepnúť samo.
  * Zoznam preto vedie `usePendingFeedImages` v okne, nie snímka z načítania.
  *
- * Backend posiela `images` len pri `free_post` – zdieľané príspevky sem teda
- * nikdy nespadnú a ich poradie „text nad náhľadom" ostáva na jednostĺpcovom
- * rozložení nezmenené.
+ * Backend posiela `images` len pri `free_post`, takže zdieľané príspevky tu nikdy nepatria: ich rozloženie
+ * určuje `sharesOfferOrPortfolio` (ponuka, portfólio) a fotka repostovaného príspevku (`sharedFeedPostPhoto`).
  */
 export function hasVisibleFeedPhoto(images: FeedPostImage[] | undefined): boolean {
   return (images ?? []).some((image) => image.status !== 'rejected');
 }
 
+/**
+ * Zdieľa príspevok ponuku alebo portfólio?
+ *
+ * Takýto príspevok nemá vlastné `images`, no karta ponuky alebo portfólia je plnohodnotný obsah okna, takže
+ * patrí do dvojstĺpcového rozloženia rovnako ako fotka (R53). Rozhoduje typ v snapshote, nie živý zdroj:
+ * ponuka alebo portfólio, ktoré medzitým zmizli, majú snapshot s typom a ostávajú v tom istom rozložení
+ * (karta je len stlmená). Zdieľaný príspevok a voľný príspevok bez fotky sem nepatria.
+ */
+export function sharesOfferOrPortfolio(post: FeedPost | null | undefined): boolean {
+  const type = post?.shared_content?.type;
+  return type === 'offer' || type === 'portfolio_item';
+}
+
 type FeedPostDetailSplitLayoutProps = {
   post: FeedPost;
   /** Živý stav fotiek – sleduje ho okno, karta ho dostáva hotový. */
```

### Krok 2: pružná plocha fotky v karte ponuky a portfólia

Nový súbor `FeedDetailSplitContext.tsx` (22 riadkov): údaj, že blok stojí v ľavom stĺpci dvojstĺpcového okna; nesie ho kontext, lebo `FeedPostCard.tsx` má 498 riadkov a nesmie rásť nad 500 (vlastnosť by si vyžiadala aspoň dva riadky tam).

```tsx
'use client';

/**
 * Údaj pre karty v ĽAVOM stĺpci dvojstĺpcového okna detailu (R53, R68).
 *
 * Ľavý stĺpec má tam PEVNÚ výšku (`h-[95vh]` okna), takže pružná plocha v karte (fotka ponuky alebo portfólia)
 * môže vyplniť jeho zvyšok. V jednostĺpcovom okne je výška len strop (`max-h-[95vh]`), pružná plocha by tam
 * nemala z čoho rátať a zmenšila by sa pod dnešných 256 px, preto tam údaj nie je (predvolená hodnota `false`).
 * Údaj nesie kontext, nie vlastnosť karty: `FeedPostCard.tsx` má 498 riadkov a pravidlo 500 riadkov mu
 * nedovolí rásť.
 */

import { createContext, useContext } from 'react';

const FeedDetailSplitContext = createContext(false);

export const FeedDetailSplitProvider = FeedDetailSplitContext.Provider;

/** `true` len vnútri ľavého stĺpca dvojstĺpcového okna detailu. */
export function useFeedDetailSplit(): boolean {
  return useContext(FeedDetailSplitContext);
}
```

A zmeny v existujúcich súboroch:

```diff
diff --git a/frontend/src/components/dashboard/modules/feed/FeedPostDetailSplitLayout.tsx b/frontend/src/components/dashboard/modules/feed/FeedPostDetailSplitLayout.tsx
--- a/frontend/src/components/dashboard/modules/feed/FeedPostDetailSplitLayout.tsx
+++ b/frontend/src/components/dashboard/modules/feed/FeedPostDetailSplitLayout.tsx
@@ -46,6 +46,7 @@
 
 import { useLanguage } from '@/contexts/LanguageContext';
 import type { FeedPost, FeedPostImage } from '@/lib/feedApi';
+import { FeedDetailSplitProvider } from './FeedDetailSplitContext';
 import FeedPostCard from './FeedPostCard';
 import FeedPostComments from './FeedPostComments';
 
@@ -117,15 +118,18 @@ export default function FeedPostDetailSplitLayout({
         data-testid="feed-post-overlay-media"
         className="subtle-scrollbar flex min-h-0 w-[56%] min-w-0 flex-col overflow-y-auto"
       >
-        <FeedPostCard
-          post={post}
-          variant="detail"
-          fillHeight
-          liveImages={liveImages}
-          commentsCount={commentsCount}
-          onDeleted={onDeleted}
-          onPostUpdated={onPostUpdated}
-        />
+        {/* Pevná výška stĺpca dovoľuje pružnú plochu karty ponuky a portfólia (viď `FeedDetailSplitContext`). */}
+        <FeedDetailSplitProvider value>
+          <FeedPostCard
+            post={post}
+            variant="detail"
+            fillHeight
+            liveImages={liveImages}
+            commentsCount={commentsCount}
+            onDeleted={onDeleted}
+            onPostUpdated={onPostUpdated}
+          />
+        </FeedDetailSplitProvider>
       </div>
 
       {/* PRAVÝ STĹPEC – výhradne komentáre. */}
diff --git a/frontend/src/components/dashboard/modules/feed/FeedPostSharedBlock.tsx b/frontend/src/components/dashboard/modules/feed/FeedPostSharedBlock.tsx
--- a/frontend/src/components/dashboard/modules/feed/FeedPostSharedBlock.tsx
+++ b/frontend/src/components/dashboard/modules/feed/FeedPostSharedBlock.tsx
@@ -8,7 +8,8 @@
  * rovnaké ako predtým, mení sa len odsadenie (o štyri znaky) a podmienka `isShared || taggedUsers.length` z výrazu v
  * JSX sa stala skorým `return null`. Text zdieľajúceho (`sharedCaptionNode`) sa presunul s blokom, lebo ho používa len
  * on. Komponent nemá vlastný stav ani hooky; otvárače (preklik na zdroj, náhľad zdieľaného príspevku, fotka v reposte,
- * odstránenie označenia) dostáva od karty ako vlastnosti.
+ * odstránenie označenia) dostáva od karty ako vlastnosti. Jediný hák je údaj, či stojí v ľavom stĺpci
+ * dvojstĺpcového okna (`useFeedDetailSplit`): len tam dostane karta ponuky a portfólia pružnú plochu fotky.
  *
  * PRUŽNÝ STĹPEC OKNA (`fillHeight`): koreňový `div` ostáva PRIAMYM potomkom koreňa karty, na rovnakom mieste medzi
  * médiami a riadkom akcií, a nič sa neobaľuje; pri zdieľanom obsahu v okne je jedinou pružnou časťou stĺpca. `fillHeight`
@@ -20,6 +21,7 @@ import FeedPostCaption, {
   CARD_CAPTION_LINES,
   DETAIL_CAPTION_LINES,
 } from './FeedPostCaption';
+import { useFeedDetailSplit } from './FeedDetailSplitContext';
 import SharedContentPreviewCard from './SharedContentPreviewCard';
 import { sharedContentCardFromPost } from './sharedContentCard';
 import type { FeedPost, FeedTaggedUser } from '@/lib/feedApi';
@@ -63,6 +65,8 @@ export default function FeedPostSharedBlock({
   setTagRemoveOpen,
   t,
 }: FeedPostSharedBlockProps) {
+  // Pružná plocha fotky ide len do ľavého stĺpca dvojstĺpcového okna (pevná výška); jednostĺpcové okno ju nemá.
+  const inSplitColumn = useFeedDetailSplit();
   if (!(isShared || taggedUsers.length)) return null;
 
   // Text autora zdieľania – v okne ide nad náhľad, na karte pod neho.
@@ -92,7 +96,9 @@ export default function FeedPostSharedBlock({
         // posiela `images` len pri `free_post`), takže o `flex-1` tu nie je
         // s čím súperiť.
         fillHeight
-          ? 'subtle-scrollbar min-h-0 flex-1 overflow-y-auto'
+          ? `subtle-scrollbar min-h-0 flex-1 overflow-y-auto${
+              inSplitColumn ? ' flex flex-col' : ''
+            }`
           : fixedBlock
       }`}
     >
@@ -114,6 +120,7 @@ export default function FeedPostSharedBlock({
               ? () => setSharedPhotoOpen(true)
               : undefined
           }
+          fillHeight={fillHeight && inSplitColumn}
         />
       ) : null}
 
diff --git a/frontend/src/components/dashboard/modules/feed/SharedContentPreviewCard.tsx b/frontend/src/components/dashboard/modules/feed/SharedContentPreviewCard.tsx
--- a/frontend/src/components/dashboard/modules/feed/SharedContentPreviewCard.tsx
+++ b/frontend/src/components/dashboard/modules/feed/SharedContentPreviewCard.tsx
@@ -20,9 +20,14 @@
  * (galéria, recenzie, otváracie hodiny), ktoré snapshot vo feede nenesie.
  * Náhradu za chýbajúci obrázok si však táto karta požičiava od nich, nech
  * zdieľaná ponuka bez fotky vyzerá ako ponuka bez fotky na profile.
+ *
+ * PRUŽNÁ PLOCHA (`fillHeight`): v ľavom stĺpci dvojstĺpcového okna detailu je plocha náhľadu ponuky a portfólia
+ * (fotka, náhrada aj ikona nedostupného zdroja) pružná: vyplní zvyšok stĺpca a nezmenší sa pod 8 rem (128 px),
+ * rovnako ako médiová plocha príspevku s fotkou (R53, R68). Všade inde (feed, dialóg zdieľania, jednostĺpcové
+ * okno) ostáva výška 256 px. Zdieľaný príspevok sa nemení.
  */
 
-import { useState } from 'react';
+import { useState, type ReactNode } from 'react';
 import InitialsAvatar from '@/components/shared/InitialsAvatar';
 import { useLanguage } from '@/contexts/LanguageContext';
 import BlurredContainImage from '../shared/BlurredContainImage';
@@ -32,6 +37,9 @@ import type { SharedContentCard } from './sharedContentCard';
 /** Výška náhľadu obrázka. Jedna hodnota pre všetky typy aj všetky kontexty. */
 const PHOTO_FRAME = 'h-64';
 
+/** Pružná plocha náhľadu v dvojstĺpcovom okne: vyplní zvyšok stĺpca, najmenej však 8 rem (128 px). */
+const PHOTO_FRAME_FILL = 'min-h-32 flex-1';
+
 function UnavailableIcon() {
   return (
     <svg
@@ -107,6 +115,7 @@ export default function SharedContentPreviewCard({
   onOpenSource,
   onOpenPostPreview,
   onOpenPostPhoto,
+  fillHeight = false,
 }: {
   data: SharedContentCard | null;
   /** Zdieľa sám seba: meno by sa zopakovalo hneď pod hlavičkou karty. */
@@ -129,6 +138,11 @@ export default function SharedContentPreviewCard({
    * `onOpenPostPreview`, nie jeden spoločný na celej karte.
    */
   onOpenPostPhoto?: () => void;
+  /**
+   * Ľavý stĺpec dvojstĺpcového okna s pevnou výškou: plocha náhľadu ponuky a portfólia vyplní zvyšok stĺpca.
+   * Pre zdieľaný príspevok sa ignoruje.
+   */
+  fillHeight?: boolean;
 }) {
   const { t, locale } = useLanguage();
   // Adresa náhľadu, ktorú sa nepodarilo načítať. Porovnáva sa s aktuálnou adresou, takže karta, ktorej sa náhľad
@@ -140,6 +154,12 @@ export default function SharedContentPreviewCard({
   const isOffer = data.type === 'offer';
   const unavailable = data.unavailable === true;
   const thumbnailFailed = Boolean(data.thumbnailUrl) && failedThumbnail === data.thumbnailUrl;
+  // Pružná plocha sa týka len ponuky a portfólia; zdieľaný príspevok ostáva bez zmeny.
+  const stretch = fillHeight && !isPost;
+  const photoFrame = stretch ? PHOTO_FRAME_FILL : PHOTO_FRAME;
+  // Pri pružnej ploche obsah vypĺňa rám absolútne, nezávisle od toho, ako prehliadač rátá percentá výšky vo flex položke.
+  const fillContent = (node: ReactNode) =>
+    stretch ? <div className="absolute inset-0">{node}</div> : node;
   /** Náhľad sa nenačítal (napr. pôvodná fotka je zmazaná): karta ukáže náhradu namiesto pokazeného obrázka. */
   const handleThumbnailError = () => setFailedThumbnail(data.thumbnailUrl ?? null);
   // Spoločný helper s dialógom zdieľania – inak by používateľ pri zdieľaní
@@ -173,8 +193,11 @@ export default function SharedContentPreviewCard({
     // s rozmazaným pozadím – ten istý `BlurredContainImage`, aký používa
     // karusel príspevku. `object-cover` by fotku orezal.
     photo = (
-      <div className={`relative w-full ${PHOTO_FRAME}`}>
-        {onOpenPostPhoto ? (
+      <div
+        data-testid="feed-shared-card-media"
+        className={`relative w-full ${photoFrame}`}
+      >
+        {fillContent(onOpenPostPhoto ? (
           <button
             type="button"
             onClick={onOpenPostPhoto}
@@ -196,7 +219,7 @@ export default function SharedContentPreviewCard({
             loading="lazy"
             onError={handleThumbnailError}
           />
-        )}
+        ))}
         {typeBadge}
       </div>
     );
@@ -209,8 +232,11 @@ export default function SharedContentPreviewCard({
     // dostanú náhradu, príspevok nič. Výnimka je nedostupný zdroj so zlyhaným
     // náhľadom: `photo` ostáva `null`, takže platí ikona nedostupného zdroja nižšie.
     photo = (
-      <div className={`relative w-full ${PHOTO_FRAME}`}>
-        <MissingImage type={data.type} />
+      <div
+        data-testid="feed-shared-card-media"
+        className={`relative w-full ${photoFrame}`}
+      >
+        {fillContent(<MissingImage type={data.type} />)}
         {typeBadge}
       </div>
     );
@@ -228,7 +254,7 @@ export default function SharedContentPreviewCard({
   const body = (
     // Zdieľaný príspevok nemá rám, takže ani vnútorné odsadenie – text má
     // začínať tam, kde text karty, nie o kúsok vpravo.
-    <div className={`space-y-1 text-left ${isPost ? '' : 'p-3'}`}>
+    <div className={`space-y-1 text-left ${isPost ? '' : 'p-3'}${stretch ? ' shrink-0' : ''}`}>
       {unavailable ? (
         <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
           {unavailableText}
@@ -300,15 +326,23 @@ export default function SharedContentPreviewCard({
     // Ponuka a portfólio sú dlaždice, takže si rám držia aj bez zdroja –
     // mení sa len stlmenie a náhrada za náhľad, ktorý sa už nedá načítať.
     frame = (
-      <div data-testid="feed-shared-unavailable" className={frameClass}>
+      <div
+        data-testid="feed-shared-unavailable"
+        className={`${frameClass}${stretch ? ' flex flex-1 flex-col' : ''}`}
+      >
         {photo ?? (
-          <div className={`relative w-full ${PHOTO_FRAME}`}>
-            <div
-              data-testid="feed-shared-unavailable-icon"
-              className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400 dark:bg-[#0e0e0f] dark:text-gray-500"
-            >
-              <UnavailableIcon />
-            </div>
+          <div
+            data-testid="feed-shared-card-media"
+            className={`relative w-full ${photoFrame}`}
+          >
+            {fillContent(
+              <div
+                data-testid="feed-shared-unavailable-icon"
+                className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400 dark:bg-[#0e0e0f] dark:text-gray-500"
+              >
+                <UnavailableIcon />
+              </div>,
+            )}
           </div>
         )}
         {body}
@@ -321,7 +355,7 @@ export default function SharedContentPreviewCard({
         onClick={onOpenSource}
         disabled={!onOpenSource}
         data-testid="feed-shared-compact-preview"
-        className={`block w-full text-left transition-colors hover:bg-white disabled:cursor-default dark:hover:bg-black/30 ${frameClass}`}
+        className={`${stretch ? 'flex flex-1 flex-col' : 'block'} w-full text-left transition-colors hover:bg-white disabled:cursor-default dark:hover:bg-black/30 ${frameClass}`}
       >
         {photo}
         {body}
@@ -330,7 +364,11 @@ export default function SharedContentPreviewCard({
   }
 
   return (
-    <div data-testid="feed-shared-card" data-shared-type={data.type}>
+    <div
+      data-testid="feed-shared-card"
+      data-shared-type={data.type}
+      className={stretch ? 'flex flex-1 flex-col' : undefined}
+    >
       {/* Pôvodný vlastník stojí NAD kartou – obsah patrí jemu, nie tomu, kto
           ho zdieľa. Pri zdieľaní seba samého sa vynecháva: meno už nesie
           hlavička karty ("Znovu zdieľané"), druhýkrát by mýlilo. */}
```

### Krok 3: užšie okno len s textom

```diff
diff --git a/frontend/src/components/dashboard/modules/feed/FeedPostDetailOverlay.tsx b/frontend/src/components/dashboard/modules/feed/FeedPostDetailOverlay.tsx
--- a/frontend/src/components/dashboard/modules/feed/FeedPostDetailOverlay.tsx
+++ b/frontend/src/components/dashboard/modules/feed/FeedPostDetailOverlay.tsx
@@ -11,10 +11,12 @@
  *
  *  - S FOTKOU, PONUKOU ALEBO PORTFÓLIOM: dva stĺpce vedľa seba
  *    (`FeedPostDetailSplitLayout`) – vľavo hlavička, text, fotka alebo karta
- *    a akcie, vpravo výhradne komentáre.
+ *    a akcie, vpravo výhradne komentáre. Okno je široké 54 rem (864 px).
  *  - BEZ NICH (text, repost textového príspevku): pôvodné jednostĺpcové
- *    rozloženie – pevný blok (hlavička, text, akcie) sa nikdy nescrolluje
- *    a komentáre dostanú všetok zvyšný priestor.
+ *    rozloženie v užšom okne (36 rem, 576 px) – pevný blok (hlavička, text,
+ *    akcie) sa nikdy nescrolluje a komentáre dostanú všetok zvyšný priestor.
+ *    Úzke je aj okno pri načítaní a pri chybe: príspevok ešte nepoznáme a
+ *    textový príspevok sa tak po načítaní nehýbe (R63).
  *    Robí to `flex` stĺpec s `min-h-0` na komentárovej časti – bez toho by ju
  *    obsah roztiahol a okno by prerástlo obrazovku (flex položka má
  *    predvolene `min-height: auto`).
@@ -223,7 +225,9 @@ export default function FeedPostDetailOverlay({
     hasVisibleFeedPhoto(liveImages) || sharedFeedPostPhoto(post) !== null;
   /** Zdieľaná ponuka alebo portfólio: karta je hlavný obsah okna ako fotka (R53). */
   const sharesCard = sharesOfferOrPortfolio(post);
-  const splitLayout = (hasPhoto || sharesCard) && !isMobile;
+  /** Široké okno (864 px) majú príspevky s fotkou, ponukou a portfóliom, všetky ostatné užšie (576 px). */
+  const wideContent = hasPhoto || sharesCard;
+  const splitLayout = wideContent && !isMobile;
   /**
    * Vypĺňa zdieľaný náhľad zvyšok jednostĺpcového bloku?
    *
@@ -251,9 +255,11 @@ export default function FeedPostDetailOverlay({
         aria-modal="true"
         aria-label={t('feed.postDetail', 'Detail príspevku')}
         data-testid="feed-post-overlay"
-        // Rozmery: `max-w-[54rem]` (864 px) je o ~29 % viac než pôvodných
-        // `max-w-2xl` (672 px) – šírka je FIXNÁ pre foto aj text-only variant,
-        // nech okno vyzerá rovnako bez ohľadu na obsah. Výška je len STROP:
+        // Rozmery: šírku určuje obsah. Široké okno (`max-w-[54rem]`, 864 px, o ~29 %
+        // viac než pôvodných `max-w-2xl`, 672 px) majú príspevky s fotkou, ponukou
+        // a portfóliom; text, repost textového príspevku, kostra a chyba pri
+        // načítaní majú užšie (`max-w-xl`, 576 px; R53 a R63). Pod hranicou lg
+        // ostáva šírka podľa obsahu, mení sa len rozloženie. Výška je len STROP:
         // krátky príspevok drží okno nízke, dlhý ho natiahne až po `95vh`.
         //
         // Prečo práve 95vh: ostávajú 2,5 % viewportu hore aj dole, takže je
@@ -268,9 +274,9 @@ export default function FeedPostDetailOverlay({
         // pružná fotka v ľavom stĺpci má `flex-1`, ktoré potrebuje definitívnu
         // výšku rodiča – zo `max-h` by vyšla nula. Text-only príspevok ostáva
         // pri strope, aby krátky príspevok držal okno nízke.
-        className={`relative flex w-full max-w-[54rem] flex-col overflow-hidden rounded-none border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-[#0f0f10] sm:rounded-2xl ${
-          splitLayout ? 'h-[95vh]' : 'max-h-[95vh]'
-        }`}
+        className={`relative flex w-full flex-col overflow-hidden rounded-none border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-[#0f0f10] sm:rounded-2xl ${
+          wideContent ? 'max-w-[54rem]' : 'max-w-xl'
+        } ${splitLayout ? 'h-[95vh]' : 'max-h-[95vh]'}`}
         onClick={(event) => event.stopPropagation()}
       >
         <button
```

## 2. Nové testy (4 súbory, 66 testov)
### `__tests__/FeedPostDetailOverlay.offerPortfolioSplit.test.tsx` (343 riadkov, patrí ku kroku 1)

Tri testy pridaj až v kroku 2, lebo používajú `data-testid="feed-shared-card-media"`, ktorý pribúda až v ňom: „plocha fotky karty je v dvojstĺpcovom okne pružná“, „pod 1 024 px ostáva plocha fotky karty 256 px“ a „zdieľaný príspevok s fotkou má plochu fotky 256 px“. Ostatné testy tohto súboru prechádzajú už po kroku 1.

```tsx
/**
 * Okno detailu na počítači: zdieľaná ponuka a portfólio v dvoch stĺpcoch (nález 344, R53).
 *
 * Ponuka a portfólio majú `images` prázdne, no karta je hlavný obsah okna ako fotka, takže idú do dvojstĺpcového
 * rozloženia: vľavo hlavička, text zdieľajúceho, karta a riadok akcií, vpravo komentáre. Pod 1 024 px ostáva
 * jednostĺpcové rozloženie, zdieľaný príspevok sa nemení.
 *
 * jsdom nelayoutuje, takže sa kontrolujú triedy a poradie uzlov, ktoré o rozložení rozhodujú.
 */

import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import FeedPostDetailOverlay from '../FeedPostDetailOverlay';
import { sharesOfferOrPortfolio } from '../FeedPostDetailSplitLayout';
import { resetOverlayLayers } from '../../shared/overlayLayers';
import { getFeedPost, type FeedPost } from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  FEED_COMMENT_MAX_LENGTH: 500,
  getFeedPost: jest.fn(),
  listFeedPostComments: jest.fn(),
  listFeedCommentReplies: jest.fn(),
  createFeedPostComment: jest.fn(),
  deleteFeedPostComment: jest.fn(),
  updateFeedPostComment: jest.fn(),
  likeFeedPostComment: jest.fn(),
  unlikeFeedPostComment: jest.fn(),
  likeFeedPost: jest.fn(),
  unlikeFeedPost: jest.fn(),
  deleteFeedPost: jest.fn(),
  deleteFeedPostImage: jest.fn(),
  updateFeedPost: jest.fn(),
  reportFeedPost: jest.fn(),
  shareFeedPost: jest.fn(),
  removeOwnFeedPostTag: jest.fn(),
  listFeedPostLikers: jest.fn(),
  listFeedCommentLikers: jest.fn(),
}));

jest.mock('@/lib/feedImageUpload', () => ({
  uploadFeedPostImages: jest.fn(),
  isAllowedFeedImageName: () => true,
  MAX_FEED_POST_IMAGES: 5,
  FEED_IMAGE_MAX_MB: 5,
  FEED_IMAGE_MAX_BYTES: 5 * 1024 * 1024,
  FEED_IMAGE_ACCEPT: '.jpg,.png',
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (_k: string, fallback: string) => fallback,
    locale: 'sk',
  }),
}));

let mockIsMobile = false;

jest.mock('@/hooks', () => ({
  useIsMobile: () => mockIsMobile,
  useIsMobileState: () => ({ isMobile: mockIsMobile, isResolved: true }),
}));

jest.mock('../../shared/useProtectedImage', () => ({
  useProtectedImage: (src: string | null) => ({
    resolvedSrc: src,
    isProtected: false,
    isLoading: false,
    isError: false,
  }),
}));

jest.mock('../../messages/DesktopEmojiPickerButton', () => ({
  DesktopEmojiPickerButton: ({ ariaLabel }: { ariaLabel: string }) => (
    <button type="button" aria-label={ariaLabel}>
      emoji
    </button>
  ),
}));

jest.mock('../../messages/GroupUserPicker', () => ({
  GroupUserPicker: () => <div />,
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('framer-motion', () => ({
  motion: {
    article: ({ children, ...props }: React.ComponentProps<'article'>) => (
      <article {...props}>{children}</article>
    ),
  },
}));

const mockedGetPost = getFeedPost as jest.MockedFunction<typeof getFeedPost>;
const mockedListComments = jest.requireMock('@/lib/feedApi')
  .listFeedPostComments as jest.Mock;

const autor = {
  id: 10,
  display_name: 'Jana',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};
const povodnyAutor = {
  id: 21,
  display_name: 'Peter',
  slug: 'peter',
  user_type: 'individual',
  avatar_url: null,
};

const ZAKLAD = {
  id: 7,
  author: autor,
  tagged_users: [],
  likes_count: 1,
  comments_count: 0,
  is_liked_by_me: false,
  can_manage: false,
  created_at: '2026-01-01T10:00:00Z',
  shared_content_unavailable: false,
};

/** Voľný príspevok, s jednou schválenou fotkou alebo bez nej. */
function volnyPrispevok(sFotkou: boolean): FeedPost {
  return {
    ...ZAKLAD,
    post_type: 'free_post',
    caption: 'Text príspevku',
    images: sFotkou
      ? [
          {
            id: 11,
            status: 'approved',
            thumbnail_url: 'http://api.test/11-t.webp',
            large_url: 'http://api.test/11-l.webp',
          },
        ]
      : [],
    shared_content: null,
  } as unknown as FeedPost;
}

/** Zdieľaná ponuka alebo portfólio; `zdrojZmizol` = zdroj medzitým zmazaný (snapshot s typom ostáva). */
function zdielanaKarta(
  typ: 'offer' | 'portfolio_item',
  moznosti: { sFotkou?: boolean; zdrojZmizol?: boolean } = {},
): FeedPost {
  const jePonuka = typ === 'offer';
  return {
    ...ZAKLAD,
    post_type: jePonuka ? 'shared_offer' : 'shared_portfolio_item',
    caption: 'Odporúčam.',
    images: [],
    shared_content: {
      type: typ,
      title: jePonuka ? 'Programovanie' : 'Weby',
      category: 'it',
      caption: '',
      id: moznosti.zdrojZmizol ? null : 42,
      owner: povodnyAutor,
      owner_display_name: 'Peter',
      thumbnail_url: moznosti.sFotkou ? 'http://api.test/offer-t.webp' : null,
      is_seeking: jePonuka ? false : null,
      price_negotiable: jePonuka ? false : null,
      price_from: jePonuka ? '25' : null,
      price_currency: '€',
    },
    shared_content_unavailable: moznosti.zdrojZmizol === true,
  } as unknown as FeedPost;
}

/** Zdieľaný voľný príspevok (repost), s fotkou pôvodného príspevku alebo bez nej. */
function repost(sFotkou: boolean): FeedPost {
  return {
    ...ZAKLAD,
    post_type: 'shared_feed_post',
    caption: 'Toto stojí za pozretie.',
    images: [],
    shared_content: {
      type: 'feed_post',
      title: '',
      category: '',
      caption: 'Pôvodný text',
      id: 9,
      owner: povodnyAutor,
      owner_display_name: 'Peter',
      thumbnail_url: sFotkou ? 'http://api.test/shared-9.webp' : null,
      is_seeking: null,
      price_negotiable: null,
      price_from: null,
      price_currency: '',
    },
  } as unknown as FeedPost;
}

beforeEach(() => {
  mockIsMobile = false;
  jest.clearAllMocks();
  resetOverlayLayers();
  mockedListComments.mockResolvedValue({
    results: [],
    next: null,
    previous: null,
    count: 0,
  });
});

async function otvorOkno(prispevok: FeedPost) {
  mockedGetPost.mockResolvedValue(prispevok);
  render(<FeedPostDetailOverlay postId={prispevok.id} onClose={jest.fn()} />);
  await screen.findByTestId('feed-post-card');
}

const KARTY: Array<[string, () => FeedPost]> = [
  ['ponuka s fotkou', () => zdielanaKarta('offer', { sFotkou: true })],
  ['ponuka bez fotky', () => zdielanaKarta('offer')],
  ['portfólio s fotkou', () => zdielanaKarta('portfolio_item', { sFotkou: true })],
  ['portfólio bez fotky', () => zdielanaKarta('portfolio_item')],
  ['ponuka, ktorej zdroj zmizol', () => zdielanaKarta('offer', { zdrojZmizol: true })],
];

describe('okno detailu: zdieľaná ponuka a portfólio v dvoch stĺpcoch', () => {
  it.each(KARTY)('%s: na počítači ide do dvoch stĺpcov, so širokým oknom a pevnou výškou', async (_nazov, vytvor) => {
    await otvorOkno(vytvor());

    const okno = screen.getByTestId('feed-post-overlay');
    expect(screen.getByTestId('feed-post-overlay-split')).toBeInTheDocument();
    expect(okno.className).toContain('max-w-[54rem]');
    expect(okno.className).toContain('h-[95vh]');
    expect(okno.className).not.toContain('max-h-[95vh]');
  });

  it.each(KARTY)('%s: karta je v ľavom stĺpci a komentáre v pravom', async (_nazov, vytvor) => {
    await otvorOkno(vytvor());

    const lavy = screen.getByTestId('feed-post-overlay-media');
    const pravy = screen.getByTestId('feed-post-overlay-comments');
    expect(within(lavy).getByTestId('feed-shared-card')).toBeInTheDocument();
    expect(within(lavy).queryByTestId('feed-post-comments')).toBeNull();
    expect(within(pravy).getByTestId('feed-post-comments')).toBeInTheDocument();
    expect(within(pravy).queryByTestId('feed-shared-card')).toBeNull();
  });

  it('v ľavom stĺpci drží poradie hlavička, text zdieľajúceho, karta a riadok akcií', async () => {
    await otvorOkno(zdielanaKarta('offer', { sFotkou: true }));

    const lavy = screen.getByTestId('feed-post-overlay-media');
    const hlavicka = lavy.querySelector('header') as HTMLElement;
    const text = within(lavy).getByTestId('feed-post-caption');
    const karta = within(lavy).getByTestId('feed-shared-card');
    const akcie = lavy.querySelector('footer') as HTMLElement;
    const nasleduje = Node.DOCUMENT_POSITION_FOLLOWING;
    expect(hlavicka.compareDocumentPosition(text)).toBe(nasleduje);
    expect(text.compareDocumentPosition(karta)).toBe(nasleduje);
    expect(karta.compareDocumentPosition(akcie)).toBe(nasleduje);
  });

  it('karta ostáva tlačidlom, ktoré vedie na zdroj', async () => {
    await otvorOkno(zdielanaKarta('offer', { sFotkou: true }));

    const karta = screen.getByTestId('feed-shared-compact-preview');
    expect(karta.tagName).toBe('BUTTON');
    expect(karta).toBeEnabled();
  });

  it('plocha fotky karty je v dvojstĺpcovom okne pružná', async () => {
    await otvorOkno(zdielanaKarta('offer'));

    const plocha = screen.getByTestId('feed-shared-card-media');
    expect(plocha.className).toContain('min-h-32');
    expect(plocha.className).toContain('flex-1');
  });

  it('pod 1 024 px ostáva jednostĺpcové rozloženie so širokým oknom', async () => {
    mockIsMobile = true;
    await otvorOkno(zdielanaKarta('offer', { sFotkou: true }));

    const okno = screen.getByTestId('feed-post-overlay');
    expect(screen.queryByTestId('feed-post-overlay-split')).toBeNull();
    expect(screen.getByTestId('feed-post-overlay-fixed')).toBeInTheDocument();
    expect(okno.className).toContain('max-w-[54rem]');
    expect(okno.className).toContain('max-h-[95vh]');
  });

  it('pod 1 024 px ostáva plocha fotky karty 256 px', async () => {
    mockIsMobile = true;
    await otvorOkno(zdielanaKarta('offer', { sFotkou: true }));

    const plocha = screen.getByTestId('feed-shared-card-media');
    expect(plocha.className).toContain('h-64');
    expect(plocha.className).not.toContain('min-h-32');
  });

  it('zdieľaný príspevok bez fotky ostáva v jednostĺpcovom rozložení', async () => {
    await otvorOkno(repost(false));

    expect(screen.queryByTestId('feed-post-overlay-split')).toBeNull();
    expect(screen.getByTestId('feed-post-overlay-fixed')).toBeInTheDocument();
  });

  it('zdieľaný príspevok s fotkou ostáva v dvojstĺpcovom rozložení', async () => {
    await otvorOkno(repost(true));

    expect(screen.getByTestId('feed-post-overlay-split')).toBeInTheDocument();
  });

  it('zdieľaný príspevok s fotkou má plochu fotky 256 px', async () => {
    await otvorOkno(repost(true));

    const plocha = screen.getByTestId('feed-shared-card-media');
    expect(plocha.className).toContain('h-64');
    expect(plocha.className).not.toContain('flex-1');
  });

  it('voľný príspevok s fotkou ostáva v dvojstĺpcovom rozložení', async () => {
    await otvorOkno(volnyPrispevok(true));

    expect(screen.getByTestId('feed-post-overlay-split')).toBeInTheDocument();
  });
});

describe('predikát sharesOfferOrPortfolio', () => {
  it.each([
    ['ponuka', zdielanaKarta('offer'), true],
    ['portfólio', zdielanaKarta('portfolio_item'), true],
    ['ponuka, ktorej zdroj zmizol', zdielanaKarta('offer', { zdrojZmizol: true }), true],
    ['zdieľaný príspevok', repost(false), false],
    ['voľný príspevok', volnyPrispevok(false), false],
    ['príspevok sa ešte nenačítal (null)', null, false],
    ['príspevok bez údaja (undefined)', undefined, false],
  ])('%s: %s', (_nazov, prispevok, ocakavane) => {
    expect(sharesOfferOrPortfolio(prispevok as FeedPost | null | undefined)).toBe(ocakavane);
  });
});
```

### `__tests__/SharedContentPreviewCard.fillHeight.test.tsx` (121 riadkov, patrí ku kroku 2)

```tsx
/**
 * Pružná plocha náhľadu ponuky a portfólia v dvojstĺpcovom okne detailu (nález 344, R53, R68).
 *
 * V ľavom stĺpci s pevnou výškou vyplní plocha náhľadu (fotka, náhrada aj ikona nedostupného zdroja) zvyšok stĺpca,
 * no nezmenší sa pod 8 rem (128 px). Všade inde ostáva výška 256 px. Zdieľaný príspevok sa nemení.
 *
 * jsdom nelayoutuje, takže sa kontrolujú triedy, ktoré o rozložení rozhodujú; výšky v pixeloch ukazuje prehliadač.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SharedContentPreviewCard from '../SharedContentPreviewCard';
import type { SharedContentCard } from '../sharedContentCard';

jest.mock('../../shared/useProtectedImage', () => ({
  useProtectedImage: (src: string | null) => ({
    resolvedSrc: src,
    isProtected: false,
    isLoading: false,
    isError: false,
  }),
}));

const THUMBNAIL = 'https://cdn.example.com/media/offers/1/x.webp';

const OFFER: SharedContentCard = {
  type: 'offer',
  title: 'Programovanie',
  thumbnailUrl: THUMBNAIL,
  isSeeking: false,
  price: { price_from: '25', price_currency: '€' },
};
const PORTFOLIO: SharedContentCard = {
  type: 'portfolio_item',
  title: 'Weby',
  thumbnailUrl: THUMBNAIL,
};

const PRIPADY: Array<[string, SharedContentCard]> = [
  ['ponuka s fotkou', OFFER],
  ['ponuka bez fotky', { ...OFFER, thumbnailUrl: null }],
  ['portfólio s fotkou', PORTFOLIO],
  ['portfólio bez fotky', { ...PORTFOLIO, thumbnailUrl: null }],
  ['ponuka, ktorej zdroj zmizol', { ...OFFER, thumbnailUrl: null, unavailable: true }],
];

/** Rám karty: tlačidlo živej karty, alebo `div` nedostupného zdroja (rodič plochy náhľadu). */
function ram(): HTMLElement {
  return screen.getByTestId('feed-shared-card-media').parentElement as HTMLElement;
}

describe('pružná plocha náhľadu ponuky a portfólia (fillHeight)', () => {
  it.each(PRIPADY)('%s: plocha vyplní zvyšok stĺpca a nezmenší sa pod 128 px', (_nazov, data) => {
    render(<SharedContentPreviewCard data={data} fillHeight />);

    const plocha = screen.getByTestId('feed-shared-card-media');
    expect(plocha.className).toContain('min-h-32');
    expect(plocha.className).toContain('flex-1');
    expect(plocha.className).not.toContain('h-64');
  });

  it.each(PRIPADY)('%s: obsah plochy vypĺňa rám absolútne', (_nazov, data) => {
    render(<SharedContentPreviewCard data={data} fillHeight />);

    const obal = screen.getByTestId('feed-shared-card-media').firstElementChild as HTMLElement;
    expect(obal.className).toContain('absolute');
    expect(obal.className).toContain('inset-0');
  });

  it.each(PRIPADY)('%s: karta aj rám sú flex stĺpec a telo karty sa nezmenšuje', (_nazov, data) => {
    render(<SharedContentPreviewCard data={data} fillHeight />);

    const koren = screen.getByTestId('feed-shared-card');
    expect(koren.className).toContain('flex-1');
    expect(koren.className).toContain('flex-col');
    const rám = ram();
    expect(rám.className).toContain('flex-1');
    expect(rám.className).toContain('flex-col');
    expect((rám.lastElementChild as HTMLElement).className).toContain('shrink-0');
  });

  it('ikona nedostupného zdroja so zlyhanou fotkou je tiež pružná', () => {
    const { container } = render(
      <SharedContentPreviewCard data={{ ...OFFER, unavailable: true }} fillHeight />,
    );
    container.querySelectorAll('img').forEach((obrazok) => fireEvent.error(obrazok));

    const plocha = screen.getByTestId('feed-shared-card-media');
    expect(screen.getByTestId('feed-shared-unavailable-icon')).toBeInTheDocument();
    expect(plocha.className).toContain('min-h-32');
    expect(plocha.className).toContain('flex-1');
    expect((plocha.firstElementChild as HTMLElement).className).toContain('inset-0');
  });

  it.each(PRIPADY)('%s: bez fillHeight ostáva plocha 256 px a karta bez flex tried', (_nazov, data) => {
    render(<SharedContentPreviewCard data={data} />);

    const plocha = screen.getByTestId('feed-shared-card-media');
    expect(plocha.className).toContain('h-64');
    expect(plocha.className).not.toContain('min-h-32');
    expect(plocha.className).not.toContain('flex-1');
    expect(screen.getByTestId('feed-shared-card').className).toBe('');
    expect(ram().className).not.toContain('flex-col');
  });

  it('zdieľaný príspevok ignoruje fillHeight: fotka ostáva 256 px a nič sa neobaľuje', () => {
    render(
      <SharedContentPreviewCard
        data={{ type: 'feed_post', title: '', caption: 'Pôvodný text', thumbnailUrl: THUMBNAIL }}
        fillHeight
      />,
    );

    const plocha = screen.getByTestId('feed-shared-card-media');
    expect(plocha.className).toContain('h-64');
    expect(plocha.className).not.toContain('flex-1');
    // Obal `absolute inset-0` pribúda len pri pružnej ploche; fotka v zdieľanom príspevku ostáva priamo v ráme.
    expect((plocha.firstElementChild as HTMLElement).className).not.toContain('absolute');
    expect(screen.getByTestId('feed-shared-card').className).toBe('');
  });
});
```

### `__tests__/FeedPostSharedBlock.splitColumn.test.tsx` (138 riadkov, patrí ku kroku 2)

```tsx
/**
 * Zdieľaný blok v okne detailu: pružná plocha karty len v ľavom stĺpci dvojstĺpcového okna (nález 344, R68).
 *
 * Ľavý stĺpec má pevnú výšku, jednostĺpcové okno len strop, a tam by pružná plocha nemala z čoho rátať. Údaj, že
 * blok stojí v ľavom stĺpci, nesie `FeedDetailSplitContext` (karta `FeedPostCard.tsx` nesmie rásť nad 500 riadkov).
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import FeedPostSharedBlock from '../FeedPostSharedBlock';
import { FeedDetailSplitProvider, useFeedDetailSplit } from '../FeedDetailSplitContext';
import type { FeedPost } from '@/lib/feedApi';

jest.mock('../../shared/useProtectedImage', () => ({
  useProtectedImage: (src: string | null) => ({
    resolvedSrc: src,
    isProtected: false,
    isLoading: false,
    isError: false,
  }),
}));

const autor = {
  id: 10,
  display_name: 'Jana',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};

const PONUKA = {
  id: 7,
  post_type: 'shared_offer',
  caption: 'Odporúčam.',
  author: autor,
  images: [],
  shared_content: {
    type: 'offer',
    title: 'Programovanie',
    category: 'it',
    caption: '',
    id: 42,
    owner: { ...autor, id: 30, display_name: 'Peter', slug: 'peter' },
    owner_display_name: 'Peter',
    thumbnail_url: null,
    is_seeking: false,
    price_negotiable: false,
    price_from: '25',
    price_currency: '€',
  },
  shared_content_unavailable: false,
  tagged_users: [],
  likes_count: 0,
  comments_count: 0,
  is_liked_by_me: false,
  can_manage: false,
  created_at: '2026-01-01T10:00:00Z',
} as unknown as FeedPost;

function blok(fillHeight: boolean, vStlpci: boolean) {
  const obsah = (
    <FeedPostSharedBlock
      fillHeight={fillHeight}
      fixedBlock={fillHeight ? 'shrink-0' : ''}
      isShared
      isDetail
      caption="Odporúčam."
      opensMobileDetail={false}
      setMobileDetailOpen={jest.fn()}
      post={PONUKA}
      isSelfShare={false}
      handleOpenSharedSource={undefined}
      handleOpenSharedPostPreview={undefined}
      sharedPhotoPostId={null}
      setSharedPhotoOpen={jest.fn()}
      taggedUsers={[]}
      setTagRemoveOpen={jest.fn()}
      t={(_kluc: string, nahradny?: string) => nahradny ?? ''}
    />
  );
  return render(vStlpci ? <FeedDetailSplitProvider value>{obsah}</FeedDetailSplitProvider> : obsah);
}

function riadok(): HTMLElement {
  return screen.getByTestId('feed-shared-card').parentElement as HTMLElement;
}

describe('zdieľaný blok a ľavý stĺpec dvojstĺpcového okna', () => {
  it('v ľavom stĺpci je blok flex stĺpec a plocha karty je pružná', () => {
    blok(true, true);

    expect(riadok().className).toContain('flex-col');
    expect(riadok().className).toContain('overflow-y-auto');
    const plocha = screen.getByTestId('feed-shared-card-media');
    expect(plocha.className).toContain('min-h-32');
    expect(plocha.className).toContain('flex-1');
  });

  it('v jednostĺpcovom okne (bez ľavého stĺpca) ostáva blok ako predtým a plocha 256 px', () => {
    blok(true, false);

    expect(riadok().className).toContain('overflow-y-auto');
    expect(riadok().className).not.toContain('flex-col');
    const plocha = screen.getByTestId('feed-shared-card-media');
    expect(plocha.className).toContain('h-64');
    expect(plocha.className).not.toContain('min-h-32');
  });

  it('karta vo feede (bez fillHeight) sa kontextom nemení', () => {
    blok(false, true);

    expect(riadok().className).not.toContain('overflow-y-auto');
    expect(riadok().className).not.toContain('flex-col');
    expect(screen.getByTestId('feed-shared-card-media').className).toContain('h-64');
  });
});

describe('údaj o ľavom stĺpci (useFeedDetailSplit)', () => {
  function Sonda() {
    return <span data-testid="sonda">{String(useFeedDetailSplit())}</span>;
  }

  it('bez poskytovateľa vráti false', () => {
    render(<Sonda />);

    expect(screen.getByTestId('sonda')).toHaveTextContent('false');
  });

  it('vnútri poskytovateľa vráti true', () => {
    render(
      <FeedDetailSplitProvider value>
        <Sonda />
      </FeedDetailSplitProvider>,
    );

    expect(screen.getByTestId('sonda')).toHaveTextContent('true');
  });
});
```

### `__tests__/FeedPostDetailOverlay.narrowWindow.test.tsx` (321 riadkov, patrí ku kroku 3)

Testy o širokom okne (ponuka, portfólio, fotka) prechádzajú už pred krokom 3; po ňom pribudne zúženie textu, kostry a chyby.

```tsx
/**
 * Okno detailu na počítači: šírku určuje obsah (nález 344, R53 a R63).
 *
 * Príspevok s fotkou, ponukou alebo portfóliom má široké okno (54 rem, 864 px). Príspevok len s textom, repost
 * textového príspevku, kostra pri načítaní a chybové okno majú užšie (36 rem, 576 px): druh príspevku sa pri
 * otvorení okna zistí až po načítaní, preto je kostra úzka a textový príspevok sa po načítaní nehýbe.
 *
 * jsdom nelayoutuje, takže sa kontrolujú triedy, ktoré o rozmeroch rozhodujú.
 */

import { act, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import FeedPostDetailOverlay from '../FeedPostDetailOverlay';
import { resetOverlayLayers } from '../../shared/overlayLayers';
import { getFeedPost, type FeedPost } from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  FEED_COMMENT_MAX_LENGTH: 500,
  getFeedPost: jest.fn(),
  listFeedPostComments: jest.fn(),
  listFeedCommentReplies: jest.fn(),
  createFeedPostComment: jest.fn(),
  deleteFeedPostComment: jest.fn(),
  updateFeedPostComment: jest.fn(),
  likeFeedPostComment: jest.fn(),
  unlikeFeedPostComment: jest.fn(),
  likeFeedPost: jest.fn(),
  unlikeFeedPost: jest.fn(),
  deleteFeedPost: jest.fn(),
  deleteFeedPostImage: jest.fn(),
  updateFeedPost: jest.fn(),
  reportFeedPost: jest.fn(),
  shareFeedPost: jest.fn(),
  removeOwnFeedPostTag: jest.fn(),
  listFeedPostLikers: jest.fn(),
  listFeedCommentLikers: jest.fn(),
}));

jest.mock('@/lib/feedImageUpload', () => ({
  uploadFeedPostImages: jest.fn(),
  isAllowedFeedImageName: () => true,
  MAX_FEED_POST_IMAGES: 5,
  FEED_IMAGE_MAX_MB: 5,
  FEED_IMAGE_MAX_BYTES: 5 * 1024 * 1024,
  FEED_IMAGE_ACCEPT: '.jpg,.png',
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (_k: string, fallback: string) => fallback,
    locale: 'sk',
  }),
}));

let mockIsMobile = false;

jest.mock('@/hooks', () => ({
  useIsMobile: () => mockIsMobile,
  useIsMobileState: () => ({ isMobile: mockIsMobile, isResolved: true }),
}));

jest.mock('../../shared/useProtectedImage', () => ({
  useProtectedImage: (src: string | null) => ({
    resolvedSrc: src,
    isProtected: false,
    isLoading: false,
    isError: false,
  }),
}));

jest.mock('../../messages/DesktopEmojiPickerButton', () => ({
  DesktopEmojiPickerButton: ({ ariaLabel }: { ariaLabel: string }) => (
    <button type="button" aria-label={ariaLabel}>
      emoji
    </button>
  ),
}));

jest.mock('../../messages/GroupUserPicker', () => ({
  GroupUserPicker: () => <div />,
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('framer-motion', () => ({
  motion: {
    article: ({ children, ...props }: React.ComponentProps<'article'>) => (
      <article {...props}>{children}</article>
    ),
  },
}));

const mockedGetPost = getFeedPost as jest.MockedFunction<typeof getFeedPost>;
const mockedListComments = jest.requireMock('@/lib/feedApi')
  .listFeedPostComments as jest.Mock;

const autor = {
  id: 10,
  display_name: 'Jana',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};
const povodnyAutor = {
  id: 21,
  display_name: 'Peter',
  slug: 'peter',
  user_type: 'individual',
  avatar_url: null,
};

const ZAKLAD = {
  id: 7,
  author: autor,
  tagged_users: [],
  likes_count: 1,
  comments_count: 0,
  is_liked_by_me: false,
  can_manage: false,
  created_at: '2026-01-01T10:00:00Z',
  shared_content_unavailable: false,
};

/** Voľný príspevok, s jednou schválenou fotkou alebo bez nej. */
function volnyPrispevok(sFotkou: boolean): FeedPost {
  return {
    ...ZAKLAD,
    post_type: 'free_post',
    caption: 'Text príspevku',
    images: sFotkou
      ? [
          {
            id: 11,
            status: 'approved',
            thumbnail_url: 'http://api.test/11-t.webp',
            large_url: 'http://api.test/11-l.webp',
          },
        ]
      : [],
    shared_content: null,
  } as unknown as FeedPost;
}

/** Zdieľaná ponuka alebo portfólio; `zdrojZmizol` = zdroj medzitým zmazaný (snapshot s typom ostáva). */
function zdielanaKarta(
  typ: 'offer' | 'portfolio_item',
  moznosti: { sFotkou?: boolean; zdrojZmizol?: boolean } = {},
): FeedPost {
  const jePonuka = typ === 'offer';
  return {
    ...ZAKLAD,
    post_type: jePonuka ? 'shared_offer' : 'shared_portfolio_item',
    caption: 'Odporúčam.',
    images: [],
    shared_content: {
      type: typ,
      title: jePonuka ? 'Programovanie' : 'Weby',
      category: 'it',
      caption: '',
      id: moznosti.zdrojZmizol ? null : 42,
      owner: povodnyAutor,
      owner_display_name: 'Peter',
      thumbnail_url: moznosti.sFotkou ? 'http://api.test/offer-t.webp' : null,
      is_seeking: jePonuka ? false : null,
      price_negotiable: jePonuka ? false : null,
      price_from: jePonuka ? '25' : null,
      price_currency: '€',
    },
    shared_content_unavailable: moznosti.zdrojZmizol === true,
  } as unknown as FeedPost;
}

/** Zdieľaný voľný príspevok (repost), s fotkou pôvodného príspevku alebo bez nej. */
function repost(sFotkou: boolean): FeedPost {
  return {
    ...ZAKLAD,
    post_type: 'shared_feed_post',
    caption: 'Toto stojí za pozretie.',
    images: [],
    shared_content: {
      type: 'feed_post',
      title: '',
      category: '',
      caption: 'Pôvodný text',
      id: 9,
      owner: povodnyAutor,
      owner_display_name: 'Peter',
      thumbnail_url: sFotkou ? 'http://api.test/shared-9.webp' : null,
      is_seeking: null,
      price_negotiable: null,
      price_from: null,
      price_currency: '',
    },
  } as unknown as FeedPost;
}

beforeEach(() => {
  mockIsMobile = false;
  jest.clearAllMocks();
  resetOverlayLayers();
  mockedListComments.mockResolvedValue({
    results: [],
    next: null,
    previous: null,
    count: 0,
  });
});

async function otvorOkno(prispevok: FeedPost) {
  mockedGetPost.mockResolvedValue(prispevok);
  render(<FeedPostDetailOverlay postId={prispevok.id} onClose={jest.fn()} />);
  await screen.findByTestId('feed-post-card');
  return screen.getByTestId('feed-post-overlay');
}

function jeUzke(okno: HTMLElement) {
  expect(okno.className).toContain('max-w-xl');
  expect(okno.className).not.toContain('max-w-[54rem]');
}

function jeSiroke(okno: HTMLElement) {
  expect(okno.className).toContain('max-w-[54rem]');
  expect(okno.className).not.toContain('max-w-xl');
}

describe('okno len s textom je užšie', () => {
  it('príspevok len s textom: úzke okno so stropom výšky', async () => {
    const okno = await otvorOkno(volnyPrispevok(false));

    jeUzke(okno);
    expect(okno.className).toContain('max-h-[95vh]');
    expect(okno.className).not.toMatch(/(^|\s)h-\[95vh\]/);
  });

  it('repost textového príspevku: úzke okno', async () => {
    jeUzke(await otvorOkno(repost(false)));
  });
});

describe('okno s fotkou, ponukou a portfóliom je široké', () => {
  it.each([
    ['príspevok s fotkou', () => volnyPrispevok(true)],
    ['repost príspevku s fotkou', () => repost(true)],
    ['ponuka', () => zdielanaKarta('offer')],
    ['portfólio', () => zdielanaKarta('portfolio_item')],
    ['ponuka, ktorej zdroj zmizol', () => zdielanaKarta('offer', { zdrojZmizol: true })],
  ])('%s: široké okno', async (_nazov, vytvor) => {
    jeSiroke(await otvorOkno(vytvor()));
  });

  it('pod 1 024 px sa šírka riadi obsahom, mení sa len rozloženie', async () => {
    mockIsMobile = true;
    jeSiroke(await otvorOkno(zdielanaKarta('offer')));
  });

  it('pod 1 024 px ostáva text v úzkom okne', async () => {
    mockIsMobile = true;
    jeUzke(await otvorOkno(volnyPrispevok(false)));
  });
});

describe('kostra a chyba pri načítaní sú v úzkom okne', () => {
  it('kostra pri načítaní je v úzkom okne', () => {
    mockedGetPost.mockReturnValue(new Promise(() => undefined));
    render(<FeedPostDetailOverlay postId={7} onClose={jest.fn()} />);

    expect(screen.getByTestId('feed-post-overlay-loading')).toBeInTheDocument();
    jeUzke(screen.getByTestId('feed-post-overlay'));
  });

  it('okno s chybou načítania je v úzkom okne', async () => {
    mockedGetPost.mockRejectedValue(new Error('chyba'));
    render(<FeedPostDetailOverlay postId={7} onClose={jest.fn()} />);

    await screen.findByTestId('feed-post-overlay-error');
    jeUzke(screen.getByTestId('feed-post-overlay'));
  });

  it('textový príspevok sa po načítaní z kostry nehýbe', async () => {
    let dokonci: (prispevok: FeedPost) => void = () => undefined;
    mockedGetPost.mockReturnValue(
      new Promise<FeedPost>((resolve) => {
        dokonci = resolve;
      }),
    );
    render(<FeedPostDetailOverlay postId={7} onClose={jest.fn()} />);
    jeUzke(screen.getByTestId('feed-post-overlay'));

    await act(async () => {
      dokonci(volnyPrispevok(false));
    });
    await screen.findByTestId('feed-post-card');

    jeUzke(screen.getByTestId('feed-post-overlay'));
  });

  it('ponuka sa po načítaní z úzkej kostry rozšíri na široké okno', async () => {
    let dokonci: (prispevok: FeedPost) => void = () => undefined;
    mockedGetPost.mockReturnValue(
      new Promise<FeedPost>((resolve) => {
        dokonci = resolve;
      }),
    );
    render(<FeedPostDetailOverlay postId={7} onClose={jest.fn()} />);
    jeUzke(screen.getByTestId('feed-post-overlay'));

    await act(async () => {
      dokonci(zdielanaKarta('offer'));
    });
    await screen.findByTestId('feed-post-card');

    jeSiroke(screen.getByTestId('feed-post-overlay'));
  });
});
```

## 3. Úprava existujúcich testov (R27, `FeedPostDetailOverlay.test.tsx` 797 riadkov)

Padajú presne štyri existujúce testy, všetky v tomto súbore (celý Jest pri samotnej zmene kódu, ešte bez nových testov: 637 sád a 9 497 testov, z toho 4 zlyhania; piate zlyhanie v prvom behu prototypu, `countryRegistry.test.ts`, bolo len v kópii bez priečinka `backend`). Tri úpravy ku kroku 1 (ponuka v jednostĺpcovom okne je od neho len pod 1 024 px) a dve ku kroku 3 (šírka podľa obsahu). Súbor má po úprave 803 riadkov (+17, −11).

```diff
diff --git a/frontend/src/components/dashboard/modules/feed/__tests__/FeedPostDetailOverlay.test.tsx b/frontend/src/components/dashboard/modules/feed/__tests__/FeedPostDetailOverlay.test.tsx
--- a/frontend/src/components/dashboard/modules/feed/__tests__/FeedPostDetailOverlay.test.tsx
+++ b/frontend/src/components/dashboard/modules/feed/__tests__/FeedPostDetailOverlay.test.tsx
@@ -64,9 +64,11 @@ jest.mock('@/contexts/LanguageContext', () => ({
   }),
 }));
 
+let mockIsMobile = false;
+
 jest.mock('@/hooks', () => ({
-  useIsMobile: () => false,
-  useIsMobileState: () => ({ isMobile: false, isResolved: true }),
+  useIsMobile: () => mockIsMobile,
+  useIsMobileState: () => ({ isMobile: mockIsMobile, isResolved: true }),
 }));
 
 jest.mock('../../shared/useProtectedImage', () => ({
@@ -206,6 +208,7 @@ function stubCaptionHeights() {
 }
 
 afterEach(() => {
+  mockIsMobile = false;
   // Výšky sú nastavené na prototype – bez upratania by pretiekli inam.
   Reflect.deleteProperty(HTMLParagraphElement.prototype, 'clientHeight');
   Reflect.deleteProperty(HTMLParagraphElement.prototype, 'scrollHeight');
@@ -271,6 +274,8 @@ describe('zdielany obsah v jednostlpcovom okne', () => {
   }
 
   it('pins the header and actions when the shared offer HAS a photo', async () => {
+    // Jednostĺpcové okno s ponukou je od nálezu 344 len pod 1 024 px (inak sú dva stĺpce).
+    mockIsMobile = true;
     await renderLoadedOverlay(sharedOfferPost());
 
     const { fixed, header, shared } = expectHeaderPinned();
@@ -281,6 +286,7 @@ describe('zdielany obsah v jednostlpcovom okne', () => {
   it('pins them the same way when the shared offer has NO photo', async () => {
     // Prave tento rozdiel bol chybou: s fotkou sa horna cast hybala, bez nej
     // stala. Rozlozenie sa o fotku nesmie opierat vobec.
+    mockIsMobile = true;
     await renderLoadedOverlay(sharedOfferPost({ thumbnail_url: null }));
 
     expectHeaderPinned();
@@ -619,23 +625,23 @@ describe('zdieľaný obsah v okne', () => {
 
 describe('rozmery okna', () => {
   it('is wider than the feed card and nearly as tall as the screen', async () => {
-    await renderLoadedOverlay(textOnlyPost());
+    // Široké okno má príspevok s fotkou (text-only má od nálezu 344 užšie okno).
+    await renderLoadedOverlay(makePost());
 
     const overlay = screen.getByTestId('feed-post-overlay');
     // 54rem = 864 px, teda o ~29 % viac než pôvodných 42rem (672 px).
     expect(overlay.className).toContain('max-w-[54rem]');
-    // Strop výšky necháva 2,5 % viewportu hore aj dole.
-    expect(overlay.className).toContain('max-h-[95vh]');
+    // Dvojstĺpcové okno má pevnú výšku 95 % viewportu (2,5 % hore aj dole).
+    expect(overlay.className).toMatch(/(^|\s)h-\[95vh\]/);
   });
 
-  it('keeps the same width for a text-only post', async () => {
-    // Šírka je fixná, nech okno vyzerá rovnako bez ohľadu na to, či príspevok
-    // má fotku – inak by sa pri prechádzaní príspevkov „mrvilo".
+  it('príspevok len s textom má užšie okno než príspevok s fotkou', async () => {
+    // Od nálezu 344 (R53 b) šírku určuje obsah: text-only 576 px, fotka 864 px.
     await renderLoadedOverlay(makePost({ images: [] }));
 
-    expect(screen.getByTestId('feed-post-overlay').className).toContain(
-      'max-w-[54rem]',
-    );
+    const overlay = screen.getByTestId('feed-post-overlay');
+    expect(overlay.className).toContain('max-w-xl');
+    expect(overlay.className).not.toContain('max-w-[54rem]');
   });
 
   it('lets the height grow with the content instead of fixing it', async () => {
```

- **Krok 1:** premenná `mockIsMobile` v mocku `@/hooks` s vrátením na `false` v existujúcom `afterEach`, a `mockIsMobile = true;` v dvoch testoch „pins the header and actions when the shared offer HAS a photo“ a „pins them the same way when the shared offer has NO photo“.
- **Krok 3:** test „is wider than the feed card and nearly as tall as the screen“ beží na príspevku s fotkou (široké okno, pevná výška `h-[95vh]`) a test „keeps the same width for a text-only post“ sa mení na „príspevok len s textom má užšie okno než príspevok s fotkou“ (`max-w-xl`), lebo pôvodné tvrdenie „šírka je fixná“ nahrádza R53 (b).

## 4. Merania v prehliadači (Chromium, prototyp proti `main`)

Skutočné okno `FeedPostDetailOverlay` s vymyslenými údajmi sa vykreslilo cez Jest (jsdom) do HTML, k nemu sa zbalili štýly aplikácie (Tailwind z `globals.css`) a v Chromiu sa zmeralo a odfotilo. Zástupné údaje, žiadne osobné údaje ani odpovede servera. Okno je `h-[95vh]`, preto sa výšky menia s obrazovkou.

### 4.1 Okno pri výške obrazovky 800 px (šírka 1 440 px): `main` → prototyp

| Scéna | `main`: okno, rozloženie | Prototyp: okno, rozloženie | Plocha fotky karty (`main` → prototyp) |
|---|---|---|---|
| príspevok len s textom | 864×352, 1 stĺpec | 576×352, 1 stĺpec | – |
| príspevok s fotkou | 864×760, 2 stĺpce | 864×760, 2 stĺpce | – |
| ponuka bez fotky | 864×705, 1 stĺpec | 864×760, 2 stĺpce | 256 → 493 px |
| ponuka s fotkou | 864×705, 1 stĺpec | 864×760, 2 stĺpce | 256 → 493 px |
| ponuka, dlhý text (487 znakov) | 864×760, 1 stĺpec | 864×760, 2 stĺpce | 256 → 353 px |
| portfólio bez fotky | 864×705, 1 stĺpec | 864×760, 2 stĺpce | 256 → 493 px |
| portfólio s fotkou | 864×705, 1 stĺpec | 864×760, 2 stĺpce | 256 → 493 px |
| ponuka, ktorej zdroj zmizol | 864×729, 1 stĺpec | 864×760, 2 stĺpce | 256 → 469 px |
| repost textového príspevku | 864×456, 1 stĺpec | 576×456, 1 stĺpec | – |
| repost príspevku s fotkou | 864×760, 2 stĺpce | 864×760, 2 stĺpce | 256 → 256 px |
| kostra pri načítaní | 864×230, 1 stĺpec | 576×230, 1 stĺpec | – |
| chybové okno | 864×156, 1 stĺpec | 576×156, 1 stĺpec | – |

Výška plochy fotky je výška rámu vrátane okraja karty (2 px); karta má pod plochou ešte riadok s názvom a cenou (asi 48 px). Pri rovnakej obrazovke sa výška okna s fotkou (760 px) nemení; textové okno a repost textu majú rovnakú výšku ako predtým, len sú užšie (864 → 576 px).

### 4.2 Plocha fotky karty podľa výšky obrazovky (prototyp, dvojstĺpcové okno)

| Výška obrazovky (okno) | ponuka s fotkou, krátky text | ponuka, dlhý text 487 znakov | zoznam 24 riadkov rozbalený |
|---|---|---|---|
| 1 000 px (950) | 683 px | 543 px | 265 px |
| 800 px (760) | 493 px | 353 px | 155 px |
| 650 px (618) | 350 px | 210 px | 128 px, ľavý stĺpec sa posúva o 56 px |
| 560 px (532) | 265 px | 128 px, ľavý stĺpec sa posúva o 4 px | 128 px, ľavý stĺpec sa posúva o 106 px |

Podlaha plochy je 128 px; až keď sa ani s ňou nič nezmestí (zoznam 24 riadkov na nízkej obrazovke), posúva sa vnútri okna len zdieľaný blok ľavého stĺpca: hlavička a riadok akcií stoja, okno sa nepretiahne. Pri obrazovke so šírkou aspoň 1 536 px nastavuje `globals.css` na `html` a `body` `transform: scale(1)`, ktoré mení kontajner pre `position: fixed`; pri vlastnej skúške v prehliadači mimo aplikácie preto nastav telu výšku `100vh`, inak sa okno nezobrazí (v aplikácii to takto nie je).

### 4.3 Čo sa nesmie zmeniť: porovnanie obrázkov pixel po pixeli (`main` a prototyp)

- **Rovnaké pixel po pixeli:** príspevok s fotkou (počítač aj úzky), repost príspevku s fotkou (počítač aj úzky) a všetky ponuky, portfóliá a ponuka so zmiznutým zdrojom v úzkom okne prehliadača (900 px, jednostĺpcové rozloženie): karta 830×305 px, plocha fotky 256 px, bez rozdielu.
- **Mení sa zámerne:** ponuka a portfólio na počítači (jednostĺpcové 864 px → dva stĺpce), text, repost textu, kostra a chyba (864 → 576 px). Pod 1 024 px sa zmenila len šírka textového okna, rozloženie nie.

## 5. Zásahy (pokazenia prototypu) proti novým testom

31 zásahov, každý sa vložil do kópie, spustili sa štyri nové súbory testov (66 testov) a zásah sa vrátil. **Zachytených 31 z 31, neprežil žiadny.** Zopakuj ich v kópii `frontend` mimo repozitára (jedna zmena naraz, po každej sa súbor vráti) a napíš do commitu, ktoré boli zachytené a ktoré prežili.

| Zásah | Čo sa pokazí | Padlo testov | Prvý padajúci test |
|---|---|---|---|
| Z1 | ponuka a portfólio nejdú do dvoch stĺpcov | 18 | okno s fotkou, ponukou a portfóliom je široké ponuka: široké okno |
| Z2 | dva stĺpce, ale okno ostane úzke | 18 | okno s fotkou, ponukou a portfóliom je široké ponuka: široké okno |
| Z3 | dva stĺpce aj pod 1 024 px | 2 | okno detailu: zdieľaná ponuka a portfólio v dvoch stĺpcoch pod 1 024 px ostáva jednostĺpcové rozloženie so širokým oknom |
| Z4 | šírka vždy 864 px (pôvodný stav) | 7 | okno len s textom je užšie príspevok len s textom: úzke okno so stropom výšky |
| Z5 | šírka vždy 576 px | 13 | okno s fotkou, ponukou a portfóliom je široké príspevok s fotkou: široké okno |
| Z6 | pod 1 024 px sa okno zúži | 2 | okno s fotkou, ponukou a portfóliom je široké pod 1 024 px sa šírka riadi obsahom, mení sa len rozloženie |
| Z7 | kostra pri načítaní je široká | 3 | kostra a chyba pri načítaní sú v úzkom okne kostra pri načítaní je v úzkom okne |
| Z8 | chybové okno je široké | 1 | kostra a chyba pri načítaní sú v úzkom okne okno s chybou načítania je v úzkom okne |
| Z9 | predikát bez portfólia | 6 | okno s fotkou, ponukou a portfóliom je široké portfólio: široké okno |
| Z10 | predikát bez ponuky | 15 | okno s fotkou, ponukou a portfóliom je široké ponuka: široké okno |
| Z11 | predikát berie aj zdieľaný príspevok | 3 | okno len s textom je užšie repost textového príspevku: úzke okno |
| Z12 | predikát vynechá ponuku so zmiznutým zdrojom | 4 | okno s fotkou, ponukou a portfóliom je široké ponuka, ktorej zdroj zmizol: široké okno |
| Z13 | ľavý stĺpec nedá kontext | 1 | okno detailu: zdieľaná ponuka a portfólio v dvoch stĺpcoch plocha fotky karty je v dvojstĺpcovom okne pružná |
| Z14 | blok vždy berie, že je v ľavom stĺpci | 2 | zdieľaný blok a ľavý stĺpec dvojstĺpcového okna v jednostĺpcovom okne (bez ľavého stĺpca) ostáva blok ako predtým a plocha 256 px |
| Z15 | plocha je pružná aj bez fillHeight (karta vo feede v kontexte) | 1 | zdieľaný blok a ľavý stĺpec dvojstĺpcového okna karta vo feede (bez fillHeight) sa kontextom nemení |
| Z16 | plocha je pružná aj v jednostĺpcovom okne | 2 | zdieľaný blok a ľavý stĺpec dvojstĺpcového okna v jednostĺpcovom okne (bez ľavého stĺpca) ostáva blok ako predtým a plocha 256 px |
| Z17 | blok v ľavom stĺpci nie je flex stĺpec | 1 | zdieľaný blok a ľavý stĺpec dvojstĺpcového okna v ľavom stĺpci je blok flex stĺpec a plocha karty je pružná |
| Z18 | pružná plocha aj pri zdieľanom príspevku | 2 | pružná plocha náhľadu ponuky a portfólia (fillHeight) zdieľaný príspevok ignoruje fillHeight: fotka ostáva 256 px a nič sa neobaľuje |
| Z19 | minimum plochy 256 px namiesto 128 px | 8 | pružná plocha náhľadu ponuky a portfólia (fillHeight) ponuka s fotkou: plocha vyplní zvyšok stĺpca a nezmenší sa pod 128 px |
| Z20 | plocha bez minima | 8 | zdieľaný blok a ľavý stĺpec dvojstĺpcového okna v ľavom stĺpci je blok flex stĺpec a plocha karty je pružná |
| Z21 | plocha bez rastu | 8 | zdieľaný blok a ľavý stĺpec dvojstĺpcového okna v ľavom stĺpci je blok flex stĺpec a plocha karty je pružná |
| Z22 | obsah plochy bez absolútneho obalu | 6 | pružná plocha náhľadu ponuky a portfólia (fillHeight) ponuka s fotkou: obsah plochy vypĺňa rám absolútne |
| Z23 | telo karty sa smie zmenšiť | 5 | pružná plocha náhľadu ponuky a portfólia (fillHeight) ponuka s fotkou: karta aj rám sú flex stĺpec a telo karty sa nezmenšuje |
| Z24 | rám nedostupnej karty nie je flex stĺpec | 1 | pružná plocha náhľadu ponuky a portfólia (fillHeight) ponuka, ktorej zdroj zmizol: karta aj rám sú flex stĺpec a telo karty sa nezmenšuje |
| Z25 | rám živej karty nie je flex stĺpec | 4 | pružná plocha náhľadu ponuky a portfólia (fillHeight) ponuka s fotkou: karta aj rám sú flex stĺpec a telo karty sa nezmenšuje |
| Z26 | koreň karty nie je flex stĺpec | 5 | pružná plocha náhľadu ponuky a portfólia (fillHeight) ponuka s fotkou: karta aj rám sú flex stĺpec a telo karty sa nezmenšuje |
| Z27 | plocha je pružná vždy (aj vo feede) | 10 | pružná plocha náhľadu ponuky a portfólia (fillHeight) ponuka s fotkou: bez fillHeight ostáva plocha 256 px a karta bez flex tried |
| Z28 | fotka ostane 256 px | 2 | pružná plocha náhľadu ponuky a portfólia (fillHeight) ponuka s fotkou: plocha vyplní zvyšok stĺpca a nezmenší sa pod 128 px |
| Z29 | náhrada za fotku ostane 256 px | 5 | pružná plocha náhľadu ponuky a portfólia (fillHeight) ponuka bez fotky: plocha vyplní zvyšok stĺpca a nezmenší sa pod 128 px |
| Z30 | ikona nedostupného zdroja ostane 256 px | 1 | pružná plocha náhľadu ponuky a portfólia (fillHeight) ikona nedostupného zdroja so zlyhanou fotkou je tiež pružná |
| Z31 | predvolená hodnota kontextu je true | 3 | zdieľaný blok a ľavý stĺpec dvojstĺpcového okna v jednostĺpcovom okne (bez ľavého stĺpca) ostáva blok ako predtým a plocha 256 px |

## 6. Overenie prototypu

Všetko v kópii `frontend` z `main` `a9e70eef` mimo repozitára (prototyp agenta), jeden beh na koniec po poslednej úprave testov.

- **Celý Jest:** 641 sád a 9 563 testov, všetky prešli, 0 snapshotov (na `main` 637 sád, 9 497 testov a 0 snapshotov: pribudli 4 sady a 66 testov). Prvý beh samotnej zmeny kódu bez nových testov mal 4 zlyhania v `FeedPostDetailOverlay.test.tsx` (dva testy o ponuke v jednostĺpcovom okne a dva o šírke textového okna) a jedno v `countryRegistry.test.ts`, ktoré vzniklo len preto, že kópia nemala priečinok `backend`.
- **Každý commit osobitne** (celý priečinok `modules/feed`, stav kópie po jednotlivých krokoch s úpravami existujúcich testov z toho istého kroku a len s novými testami, ktoré k nemu patria): po kroku 1 96 sád, 1 152 testov, 0 zlyhaní; po kroku 2 98 sád, 1 182 testov, 0 zlyhaní; po kroku 3 99 sád, 1 195 testov, 0 zlyhaní. Tri testy, ktoré používajú `data-testid="feed-shared-card-media"`, patria až ku kroku 2 (prvý beh po kroku 1 ich ešte obsahoval a dva z nich padli).
- **`tsc --noEmit`:** čisté. **ESLint** s `--max-warnings=0` nad všetkými dotknutými a novými súbormi (štyri produkčné súbory, `FeedDetailSplitContext.tsx`, päť súborov testov): čisté.
- **Počty riadkov:** `FeedPostDetailOverlay.tsx` 385 → 395, `FeedPostDetailSplitLayout.tsx` 144 → 160, `FeedPostSharedBlock.tsx` 163 → 170, `SharedContentPreviewCard.tsx` 355 → 393, nový `FeedDetailSplitContext.tsx` 22, `FeedPostCard.tsx` 498 bez zmeny; nové testy 343 + 121 + 138 + 321 riadkov, `FeedPostDetailOverlay.test.tsx` 797 → 803.
- **Zásahy:** 31 z 31 zachytených (časť 5). Kópia sa po všetkých zásahoch vrátila presne do pôvodného stavu (porovnaný diff).
- **Prehliadač:** Chromium (Playwright), skutočné okno vykreslené cez Jest do HTML so štýlmi z `globals.css`; scény v časti 4; pixelové porovnanie scén, ktoré sa nemajú zmeniť.
- **Neoverené:** Safari a WebKit (rozhoduje ručný test majiteľa a kontrola Codexu), tmavý režim, mobilná obrazovka detailu (K57 sa jej nedotýka), `npm run build` a `npm run check:missing-translations` (nové texty nie sú; spustí ich kolega pred odoslaním). Okno z upozornenia a z adresy sa v prototype neskúšalo (otvára sa tým istým komponentom, ktorý beží s `postId`, takže kostra aj načítanie sú rovnaké).
