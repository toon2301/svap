# Podklady K57: prototyp okna detailu na počítači (344), overené testy, merania a zásahy

Pripravil agent 23. 11. 2026 ako podklad ku karte `karty/K57.md`. Prototyp je v kópii `frontend` z `main` `a9e70eef` mimo repozitára; agent ho kolegovi neodovzdáva ako hotový kód, len ako dôkaz, že postup ide, a ako východisko pre testy: kolega ich skontroluje, uprav a odôvodní každú zmenu v texte commitu. Čísla riadkov platia pre `main` `a9e70eef`. Testy majú popisy po slovensky (R62), existujúce testy sa menia len v časti 3 (R27).

## 1. Zmena kódu v prototype po krokoch

Štyri kódové kroky sa dajú aplikovať jeden po druhom (každý je samostatný commit a po každom prechádzajú súvisiace testy). Diffy nižšie vznikli presne v tomto poradí z `main` `a9e70eef`.

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

### Krok 4: komentáre v jednostĺpcovom okne (nález 363, R69 (1a))

Mení sa len jednostĺpcová vetva okna (`FeedPostDetailOverlay.tsx`) a komponent `FeedPostComments` (nová vlastnosť `flexFill`, predvolene vypnutá). Diff vznikol zo stavu po kroku 3.

```diff
diff --git a/frontend/src/components/dashboard/modules/feed/FeedPostDetailOverlay.tsx b/frontend/src/components/dashboard/modules/feed/FeedPostDetailOverlay.tsx
--- a/frontend/src/components/dashboard/modules/feed/FeedPostDetailOverlay.tsx
+++ b/frontend/src/components/dashboard/modules/feed/FeedPostDetailOverlay.tsx
@@ -329,9 +329,19 @@ export default function FeedPostDetailOverlay({
             />
           ) : (
           <>
-            {/* PEVNÝ blok – hlavička, text, fotky, akcie. Za bežných
-                okolností sa nescrolluje: komentáre pod ním majú `flex-1` so
-                základom 0, takže si berú až to, čo zvýši.
+            {/* PEVNÝ blok – hlavička, text, fotky, akcie. Nezmenšuje sa
+                (`shrink-0`): čo sa do okna nezmestí, odoberá komentárom,
+                nie jemu. Okno má v tomto rozložení len strop `max-h`, nie
+                pevnú výšku, takže základ `0%` pri `flex-1` sa vyhodnotí ako
+                obsah a zmrštenie by sa rozdelilo medzi blok a komentáre
+                podľa ich veľkosti: pri štyroch a viac komentároch by sa
+                blok zmáčkol a pole na komentár vypadlo pod okno (nález 363).
+
+                Strop `calc(95vh-11rem)` je POISTKA: nechá komentárom 11 rem
+                (pole na komentár s odsadením zaberá okolo 9 rem, k tomu
+                riadok zoznamu aj pri prázdnom zozname), takže pri veľmi
+                nízkom okne sa v bloku doscrolluje a pole na komentár
+                ostane celé vidno.
 
                 DVA režimy podľa toho, čo je vnútri pružné:
 
@@ -344,11 +354,11 @@ export default function FeedPostDetailOverlay({
 
                 - Voľný príspevok: nemá čo pružné pohltiť zvyšok, takže ostáva
                   pôvodná POISTKA `overflow-y-auto` pre krajný prípad (nízke
-                  okno, dlhý rozbalený text): až keď by sa blok sám nezmestil,
-                  zmrští sa a doscrolluje sa v ňom, takže nič neostane
+                  okno, dlhý rozbalený text): až keď by sa blok nezmestil pod
+                  strop, doscrolluje sa v ňom, takže nič neostane
                   nedosiahnuteľné za orezanou hranou okna. */}
             <div
-              className={`subtle-scrollbar min-h-0 ${
+              className={`subtle-scrollbar min-h-0 shrink-0 max-h-[calc(95vh-11rem)] ${
                 sharedFillsColumn
                   ? 'flex flex-col overflow-hidden'
                   : 'overflow-y-auto'
@@ -370,15 +380,18 @@ export default function FeedPostDetailOverlay({
                 plní dve úlohy naraz: ruší automatické minimum flex položky
                 (inak by ju obsah roztiahol a okno by prerástlo `max-h-[90vh]`)
                 a zároveň drží komentárom podlahu, aby ich pevný blok nad nimi
-                nikdy nestlačil na nulu. */}
+                nikdy nestlačil na nulu. `flex-col` a `flexFill` odovzdávajú
+                výšku zoznamu komentárov flexom, lebo percentuálna výška
+                (`h-full`) sa v okne bez pevnej výšky nevyhodnotí. */}
             <div
-              className="min-h-[7rem] flex-1 overflow-hidden"
+              className="flex min-h-[7rem] flex-1 flex-col overflow-hidden"
               data-testid="feed-post-overlay-comments"
             >
               <FeedPostComments
                 postId={post.id}
                 highlightCommentId={highlightCommentId}
                 fillHeight
+                flexFill
                 onCountChange={(delta) =>
                   changeCommentsCount(delta)
                 }
diff --git a/frontend/src/components/dashboard/modules/feed/FeedPostComments.tsx b/frontend/src/components/dashboard/modules/feed/FeedPostComments.tsx
--- a/frontend/src/components/dashboard/modules/feed/FeedPostComments.tsx
+++ b/frontend/src/components/dashboard/modules/feed/FeedPostComments.tsx
@@ -33,9 +33,29 @@ import {
 } from '@/lib/feedApi';
 import type { FeedPostCommentsProps } from './FeedPostComments.types';
 
+/**
+ * Triedy komentárov pri `fillHeight`: koreň, obal zoznamu a posuvný rámik.
+ *
+ * `FILL_CLASSES` vypĺňajú výšku rodiča, ktorá je pevná (percentuálna výška, `h-full`). `FLEX_FILL_CLASSES` ju namiesto
+ * toho odovzdávajú flexom celým reťazcom (`flex-1` + `min-h-0`), lebo rodič s nedefinitnou výškou (okno so stropom
+ * `max-h`) percentuálnu výšku nevyhodnotí; viď `flexFill` vo `FeedPostComments.types.ts`. Píšu sa DOSLOVA, lebo
+ * Tailwind hľadá v zdroji celé názvy tried.
+ */
+const FILL_CLASSES = {
+  root: 'flex h-full min-h-0 flex-col',
+  listWrap: 'min-h-0 flex-1',
+  scroll: 'h-full',
+} as const;
+const FLEX_FILL_CLASSES = {
+  root: 'flex min-h-0 flex-1 flex-col',
+  listWrap: 'flex min-h-0 flex-1 flex-col',
+  scroll: 'min-h-0 flex-1',
+} as const;
+
 export default function FeedPostComments({
   postId,
   fillHeight = false,
+  flexFill = false,
   showTimestamp = false,
   compactComposer = false,
   listHeader,
@@ -257,11 +277,13 @@ export default function FeedPostComments({
     />
   );
 
+  const fill = flexFill ? FLEX_FILL_CLASSES : FILL_CLASSES;
+
   return (
     <div
       data-testid="feed-post-comments"
       className={`border-t border-gray-200/70 px-4 py-3 dark:border-gray-700/60 ${
-        fillHeight ? 'flex h-full min-h-0 flex-col' : ''
+        fillHeight ? fill.root : ''
       }`}
     >
       {/* Ohraničený box s vlastným scrollom: stovky komentárov nenaťahujú
@@ -270,7 +292,7 @@ export default function FeedPostComments({
           tabIndex robí oblasť dostupnou aj z klávesnice (WCAG 2.1.1). */}
       {/* `relative` kvôli indikátoru nových komentárov, ktorý pláva nad
           spodným okrajom zoznamu. */}
-      <div className={`relative ${fillHeight ? 'min-h-0 flex-1' : ''}`}>
+      <div className={`relative ${fillHeight ? fill.listWrap : ''}`}>
         <div
           ref={scrollRef}
           onScroll={handleListScroll}
@@ -284,7 +306,7 @@ export default function FeedPostComments({
           // detailu je toto JEDINÉ scrollovateľné miesto, takže by tu
           // predvolený systémový scrollbar bil do očí najviac.
           className={`subtle-scrollbar overflow-y-auto overscroll-contain pr-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60 ${
-            fillHeight ? 'h-full' : 'max-h-[min(26rem,60dvh)]'
+            fillHeight ? fill.scroll : 'max-h-[min(26rem,60dvh)]'
           }`}
         >
           {listHeader}
diff --git a/frontend/src/components/dashboard/modules/feed/FeedPostComments.types.ts b/frontend/src/components/dashboard/modules/feed/FeedPostComments.types.ts
--- a/frontend/src/components/dashboard/modules/feed/FeedPostComments.types.ts
+++ b/frontend/src/components/dashboard/modules/feed/FeedPostComments.types.ts
@@ -18,6 +18,14 @@ export type FeedPostCommentsProps = {
    * prázdne miesto alebo by okno prerástol.
    */
   fillHeight?: boolean;
+  /**
+   * Výška ide cez flex celým reťazcom namiesto percentuálnej (`h-full`). Má zmysel len spolu s `fillHeight`.
+   *
+   * Rodič, ktorý má len strop `max-h` (jednostĺpcové okno detailu), má NEDEFINITNÚ výšku: `h-full` sa tam nevyhodnotí,
+   * zoznam ostane vysoký ako všetky komentáre, neposúva sa a pole na komentár vypadne pod okraj okna (nález 363).
+   * Ostatné miesta (dvojstĺpcové okno, mobilný detail, panel nad fotkou) majú výšku pevnú a ostávajú pri `h-full`.
+   */
+  flexFill?: boolean;
   /**
    * Ukázať čas pri komentári.
    *
```

## 2. Nové testy (7 súborov, 83 testov)
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

### `__tests__/FeedPostComments.flexFill.test.tsx` (164 riadkov, patrí ku kroku 4)

```tsx
/**
 * Výška komentárov: `fillHeight` a `flexFill` (nález 363, K57 krok 4).
 *
 * Jednostĺpcové okno detailu má len strop výšky (`max-h`), takže sa v ňom percentuálna výška (`h-full`) nevyhodnotí:
 * zoznam komentárov by ostal vysoký ako všetky komentáre, neposúval by sa a pole na komentár by vypadlo pod okraj okna.
 * Komponent preto dostal vlastnosť `flexFill`, ktorá odovzdáva výšku flexom celým reťazcom (koreň, obal zoznamu,
 * posuvný rámik). Ostatné miesta (dvojstĺpcové okno, mobilný detail, panel nad fotkou) ostávajú pri `fillHeight`
 * s `h-full`.
 *
 * jsdom nelayoutuje, takže sa kontrolujú triedy koreňa, obalu zoznamu a posuvného rámika.
 */

import type { ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import FeedPostComments from '../FeedPostComments';
import {
  listFeedPostComments,
  type FeedCommentPage,
  type FeedPostComment,
} from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  FEED_COMMENT_MAX_LENGTH: 500,
  listFeedPostComments: jest.fn(),
  listFeedCommentReplies: jest.fn(),
  updateFeedPostComment: jest.fn(),
  createFeedPostComment: jest.fn(),
  deleteFeedPostComment: jest.fn(),
  likeFeedPostComment: jest.fn(),
  unlikeFeedPostComment: jest.fn(),
  listFeedCommentLikers: jest.fn(),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_k: string, fallback: string) => fallback }),
}));

jest.mock('../../messages/DesktopEmojiPickerButton', () => ({
  DesktopEmojiPickerButton: ({ ariaLabel }: { ariaLabel: string }) => (
    <button type="button" aria-label={ariaLabel}>
      emoji
    </button>
  ),
}));

const mockedList = listFeedPostComments as jest.MockedFunction<
  typeof listFeedPostComments
>;

const autor = {
  id: 1,
  display_name: 'Jana',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};

const KOMENTAR = {
  id: 1,
  text: 'Ahoj',
  author: autor,
  can_delete: false,
  likes_count: 0,
  is_liked_by_me: false,
  parent_comment_id: null,
  replies: [],
  replies_count: 0,
  created_at: '2026-01-01',
} as FeedPostComment;

beforeEach(() => {
  mockedList.mockReset();
  mockedList.mockResolvedValue({
    results: [KOMENTAR],
    next: null,
    previous: null,
    count: 1,
  } as FeedCommentPage);
});

/** Vykreslí komentáre, počká na naplnenie zoznamu a vráti koreň, obal zoznamu a posuvný rámik. */
async function vykresli(vlastnosti: Partial<ComponentProps<typeof FeedPostComments>> = {}) {
  render(<FeedPostComments postId={7} {...vlastnosti} />);
  await screen.findByText('Ahoj');
  const zoznam = screen.getByTestId('feed-comments-scroll');
  return {
    koren: screen.getByTestId('feed-post-comments'),
    obal: zoznam.parentElement as HTMLElement,
    zoznam,
  };
}

describe('výška zoznamu komentárov', () => {
  it('bez fillHeight má zoznam strop výšky a flexFill sa neuplatní', async () => {
    const { koren, obal, zoznam } = await vykresli({ flexFill: true });

    expect(zoznam).toHaveClass('max-h-[min(26rem,60dvh)]');
    expect(zoznam).not.toHaveClass('h-full');
    expect(zoznam).not.toHaveClass('flex-1');
    expect(obal).not.toHaveClass('flex-1');
    expect(koren).not.toHaveClass('flex');
    expect(koren).not.toHaveClass('flex-1');
  });

  it.each([
    ['len fillHeight', { fillHeight: true }],
    [
      'fillHeight s vlastnosťami mobilného detailu a panela nad fotkou',
      { fillHeight: true, showTimestamp: true, compactComposer: true },
    ],
  ])('%s: percentuálna výška ako doteraz', async (_nazov, vlastnosti) => {
    const { koren, obal, zoznam } = await vykresli(vlastnosti);

    expect(koren).toHaveClass('flex', 'h-full', 'min-h-0', 'flex-col');
    expect(koren).not.toHaveClass('flex-1');
    expect(obal).toHaveClass('relative', 'min-h-0', 'flex-1');
    expect(obal).not.toHaveClass('flex');
    expect(obal).not.toHaveClass('flex-col');
    expect(zoznam).toHaveClass('h-full');
    expect(zoznam).not.toHaveClass('flex-1');
    expect(zoznam).not.toHaveClass('min-h-0');
    expect(zoznam).not.toHaveClass('max-h-[min(26rem,60dvh)]');
  });

  it('fillHeight s flexFill odovzdáva výšku flexom celým reťazcom', async () => {
    const { koren, obal, zoznam } = await vykresli({
      fillHeight: true,
      flexFill: true,
    });

    expect(koren).toHaveClass('flex', 'min-h-0', 'flex-1', 'flex-col');
    expect(koren).not.toHaveClass('h-full');
    expect(obal).toHaveClass('relative', 'flex', 'min-h-0', 'flex-1', 'flex-col');
    expect(zoznam).toHaveClass('min-h-0', 'flex-1');
    expect(zoznam).not.toHaveClass('h-full');
    expect(zoznam).not.toHaveClass('max-h-[min(26rem,60dvh)]');
  });

  it('s flexFill sa zoznam stále posúva, má vlastný scrollbar a dá sa dostať Tabom', async () => {
    const { zoznam } = await vykresli({ fillHeight: true, flexFill: true });

    expect(zoznam).toHaveClass(
      'overflow-y-auto',
      'subtle-scrollbar',
      'overscroll-contain',
    );
    expect(zoznam).toHaveAttribute('tabindex', '0');
    expect(zoznam).toHaveAttribute('role', 'region');
  });

  it('pole na komentár ostáva v koreni mimo posuvného zoznamu aj s flexFill', async () => {
    const { koren, zoznam } = await vykresli({ fillHeight: true, flexFill: true });

    const pole = screen.getByLabelText('Napíš komentár...');
    expect(koren).toContainElement(pole);
    expect(zoznam).not.toContainElement(pole);
  });
});
```

### `__tests__/FeedPostDetailOverlay.commentsColumn.test.tsx` (312 riadkov, patrí ku kroku 4)

```tsx
/**
 * Jednostĺpcové okno detailu: pevný blok sa nezmenšuje a komentáre sa posúvajú (nález 363, K57 krok 4).
 *
 * Okno má v jednostĺpcovom rozložení len strop výšky (`max-h-[95vh]`), nie pevnú výšku. Percentuálny základ pri `flex-1`
 * sa preto vyhodnotí ako obsah a zmrštenie by sa rozdelilo medzi pevný blok (hlavička, text, akcie) a komentáre podľa
 * ich veľkosti: pri štyroch a viac komentároch by sa blok zmáčkol a pole na komentár vypadlo pod okno. Pevný blok sa
 * preto nezmenšuje (`shrink-0`), má strop poistky `calc(95vh-11rem)` a komentáre odovzdávajú výšku flexom (`flexFill`).
 * Dvojstĺpcové okno (ponuka, portfólio a príspevok s fotkou na počítači) sa nemení.
 *
 * jsdom nelayoutuje, takže sa kontrolujú triedy, ktoré o rozmeroch rozhodujú.
 */

import { render, screen, within } from '@testing-library/react';
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

/** Zdieľaná ponuka alebo portfólio bez fotky. */
function zdielanaKarta(typ: 'offer' | 'portfolio_item'): FeedPost {
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
      id: 42,
      owner: povodnyAutor,
      owner_display_name: 'Peter',
      thumbnail_url: null,
      is_seeking: jePonuka ? false : null,
      price_negotiable: jePonuka ? false : null,
      price_from: jePonuka ? '25' : null,
      price_currency: '€',
    },
  } as unknown as FeedPost;
}

/** Zdieľaný voľný príspevok (repost) bez fotky. */
function repostTextu(): FeedPost {
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
      thumbnail_url: null,
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

const STROP_POISTKY = 'max-h-[calc(95vh-11rem)]';

describe('jednostĺpcové okno: pevný blok sa nezmenšuje', () => {
  it('príspevok len s textom: pevný blok má poistku s posúvaním a strop', async () => {
    const okno = await otvorOkno(volnyPrispevok(false));

    const pevny = within(okno).getByTestId('feed-post-overlay-fixed');
    expect(pevny).toHaveClass('shrink-0', 'overflow-y-auto', STROP_POISTKY);
    expect(pevny).not.toHaveClass('overflow-hidden');
  });

  it('príspevok s fotkou pod 1 024 px: tá istá ochrana pevného bloku', async () => {
    mockIsMobile = true;
    const okno = await otvorOkno(volnyPrispevok(true));

    const pevny = within(okno).getByTestId('feed-post-overlay-fixed');
    expect(pevny).toHaveClass('shrink-0', 'overflow-y-auto', STROP_POISTKY);
  });

  it.each([
    ['repost textového príspevku', false, () => repostTextu()],
    ['ponuka pod 1 024 px', true, () => zdielanaKarta('offer')],
    ['portfólio pod 1 024 px', true, () => zdielanaKarta('portfolio_item')],
  ])(
    '%s: pevný blok je flex stĺpec, nezmenšuje sa a má strop',
    async (_nazov, podHranicou, vytvor) => {
      mockIsMobile = podHranicou;
      const okno = await otvorOkno(vytvor());

      const pevny = within(okno).getByTestId('feed-post-overlay-fixed');
      expect(pevny).toHaveClass(
        'flex',
        'flex-col',
        'overflow-hidden',
        'shrink-0',
        STROP_POISTKY,
      );
      expect(pevny).not.toHaveClass('overflow-y-auto');
    },
  );
});

describe('jednostĺpcové okno: komentáre odovzdávajú výšku flexom', () => {
  it('sekcia komentárov je flex stĺpec a zoznam v nej sa zmenšuje cez flex', async () => {
    const okno = await otvorOkno(volnyPrispevok(false));

    const sekcia = within(okno).getByTestId('feed-post-overlay-comments');
    expect(sekcia).toHaveClass(
      'flex',
      'flex-col',
      'flex-1',
      'min-h-[7rem]',
      'overflow-hidden',
    );
    const koren = within(sekcia).getByTestId('feed-post-comments');
    expect(koren).toHaveClass('flex', 'min-h-0', 'flex-1', 'flex-col');
    expect(koren).not.toHaveClass('h-full');
    const zoznam = within(sekcia).getByTestId('feed-comments-scroll');
    expect(zoznam).toHaveClass('min-h-0', 'flex-1', 'overflow-y-auto');
    expect(zoznam).not.toHaveClass('h-full');
  });

  it('pole na komentár je v sekcii komentárov mimo posuvného zoznamu', async () => {
    const okno = await otvorOkno(volnyPrispevok(false));

    const sekcia = within(okno).getByTestId('feed-post-overlay-comments');
    const pole = within(sekcia).getByLabelText('Napíš komentár...');
    expect(within(sekcia).getByTestId('feed-comments-scroll')).not.toContainElement(
      pole,
    );
  });
});

describe('dvojstĺpcové okno sa nemení', () => {
  it.each([
    ['príspevok s fotkou', () => volnyPrispevok(true)],
    ['ponuka', () => zdielanaKarta('offer')],
  ])(
    '%s: komentáre držia percentuálnu výšku a pevný blok so stropom tam nie je',
    async (_nazov, vytvor) => {
      const okno = await otvorOkno(vytvor());

      expect(within(okno).queryByTestId('feed-post-overlay-fixed')).toBeNull();
      const zoznam = within(okno).getByTestId('feed-comments-scroll');
      expect(zoznam).toHaveClass('h-full');
      expect(zoznam).not.toHaveClass('flex-1');
      const koren = within(okno).getByTestId('feed-post-comments');
      expect(koren).toHaveClass('h-full');
      expect(koren).not.toHaveClass('flex-1');
    },
  );
});
```

### `__tests__/FeedPostComments.otherSurfaces.test.tsx` (178 riadkov, patrí ku kroku 4)

```tsx
/**
 * Komentáre na mobile ostávajú pri percentuálnej výške (nález 363, K57 krok 4).
 *
 * Krok 4 zaviedol vlastnosť `flexFill` pre jednostĺpcové okno detailu na počítači. Mobilný detail a panel komentárov
 * nad fotkou majú pevnú výšku, preto `flexFill` nedostávajú a ostávajú pri `fillHeight` s `h-full`. Testy stoja na
 * tom, čo obrazovky vykreslia (triedy zoznamu komentárov), a zachytia, ak by sa `flexFill` pridal aj tam.
 *
 * jsdom nelayoutuje, takže sa kontrolujú triedy koreňa komentárov a posuvného rámika.
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import FeedPhotoCommentsSheet from '../FeedPhotoCommentsSheet';
import FeedPostMobileDetail from '../FeedPostMobileDetail';
import { resetOverlayLayers } from '../../shared/overlayLayers';
import { listFeedPostComments, type FeedPost } from '@/lib/feedApi';

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

jest.mock('@/hooks', () => ({
  useIsMobile: () => true,
  useIsMobileState: () => ({ isMobile: true, isResolved: true }),
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

const mockedList = listFeedPostComments as jest.MockedFunction<
  typeof listFeedPostComments
>;

const autor = {
  id: 10,
  display_name: 'Jana Nováková',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};

function prispevok(): FeedPost {
  return {
    id: 7,
    post_type: 'free_post',
    caption: 'Text príspevku',
    author: autor,
    images: [],
    shared_content: null,
    shared_content_unavailable: false,
    tagged_users: [],
    likes_count: 2,
    comments_count: 2,
    is_liked_by_me: false,
    can_manage: false,
    created_at: '2026-01-01T10:00:00Z',
  } as unknown as FeedPost;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedList.mockReset();
  resetOverlayLayers();
  document.body.innerHTML = '';
  mockedList.mockResolvedValue({
    results: [
      {
        id: 100,
        text: 'Komentár 1',
        author: autor,
        can_delete: false,
        can_edit: false,
        likes_count: 0,
        is_liked_by_me: false,
        replies: [],
        replies_count: 0,
        created_at: '2026-01-01T11:00:00Z',
      },
    ],
    next: null,
    previous: null,
    count: 1,
  } as never);
});

function jePercentualna() {
  const zoznam = screen.getByTestId('feed-comments-scroll');
  const koren = screen.getByTestId('feed-post-comments');
  expect(zoznam).toHaveClass('h-full');
  expect(zoznam).not.toHaveClass('flex-1');
  expect(koren).toHaveClass('h-full');
  expect(koren).not.toHaveClass('flex-1');
}

describe('komentáre mimo okna na počítači', () => {
  it('panel komentárov nad fotkou drží percentuálnu výšku', async () => {
    render(
      <FeedPhotoCommentsSheet
        postId={7}
        open
        onClose={jest.fn()}
        onCountChange={jest.fn()}
        onTotalChange={jest.fn()}
      />,
    );
    await screen.findByText('Komentár 1');

    jePercentualna();
  });

  it('mobilný detail príspevku drží percentuálnu výšku komentárov', async () => {
    render(<FeedPostMobileDetail post={prispevok()} onClose={jest.fn()} />);
    await screen.findByText('Komentár 1');

    jePercentualna();
  });
});
```

## 3. Úprava existujúcich testov (R27, `FeedPostDetailOverlay.test.tsx` 797 riadkov)

Padajú presne štyri existujúce testy, všetky v tomto súbore (celý Jest pri samotnej zmene kódu, ešte bez nových testov: 637 sád a 9 497 testov, z toho 4 zlyhania; piate zlyhanie v prvom behu prototypu, `countryRegistry.test.ts`, bolo len v kópii bez priečinka `backend`). Štyri úpravy ku kroku 1 (mock, `afterEach` a dva testy: ponuka v jednostĺpcovom okne je od neho len pod 1 024 px) a dve ku kroku 3 (dva testy o šírke podľa obsahu). Súbor má po úprave 803 riadkov (+17, −11).

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

**Krok 4 existujúce testy nemení.** Po jeho pridaní prešli bez úpravy všetky existujúce testy dotknutých súborov (Jest nad `FeedPostDetailOverlay*`, `FeedPostComments*`, `FeedPostDetailSplitLayout*`, `FeedPostMobileDetail*` a `FeedPostOverlayFlow*`: 34 sád, 410 testov, 0 zlyhaní, ešte pred pridaním nových testov kroku 4). Existujúci test „keeps the window inside the screen and scrolls only the comments“ (`FeedPostDetailOverlay.test.tsx`) kontroluje `flex-1`, `min-h-[7rem]`, `overflow-y-auto` a `subtle-scrollbar`; všetky ostávajú.

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

### 4.4 Krok 4: komentáre v jednostĺpcovom okne (`main` proti kroku 4)

Rovnaký postup ako vyššie (skutočné okno cez Jest do HTML, štýly z `globals.css`, Chromium). Príspevok len s textom, krátky text a N komentárov (jeden komentár má odpovede), výška obrazovky 800 px:

| Komentárov | `main`: pevný blok zmáčknutý o | `main`: pole „Napíš komentár“ celé v okne | Krok 4: pevný blok zmáčknutý o | Krok 4: zoznam komentárov | Krok 4: pole v okne |
|---|---|---|---|---|---|
| 3 | 0 px | áno | 0 px | 360 px | áno |
| 4 | 12 px | nie | 0 px | 444 px | áno |
| 5 | 33 px | nie | 0 px | 444 px | áno |
| 6 | 49 px | nie | 0 px | 444 px | áno |
| 14 | 107 px | nie | 0 px | 444 px | áno |
| 6 a rozbalené odpovede | 78 px | nie | 0 px | 444 px | áno |

„Zmáčknutý o“ je rozdiel medzi obsahom pevného bloku (hlavička, text, riadok akcií) a jeho výškou v okne: na `main` sa blok zmrští a v okne sa v ňom dá posúvať, pritom zoznam komentárov sa neposúva (výška 1 764 px pri 14 komentároch pri okne 760 px). Pri troch komentároch je okno nižšie (676 px) a nič sa nemení.

Text s 15 riadkami (470 znakov, limit je 500) a 14 komentárov, zbalený a rozbalený („Viac“), podľa výšky obrazovky (krok 4):

| Výška obrazovky (okno) | Text vidno z 15 riadkov (zbalený / rozbalený) | Zoznam komentárov (zbalený / rozbalený) | Pevný blok sa posúva o | Pole v okne |
|---|---|---|---|---|
| 560 px (532) | 10 / 7 | 29 px / 58 px | 31 px / 0 px | áno / áno |
| 650 px (618) | 10 / 8 | 84 px / 121 px | 0 px / 0 px | áno / áno |
| 720 px (684) | 10 / 9 | 150 px / 170 px | 0 px / 0 px | áno / áno |
| 760 px (722) | 10 / 10 | 188 px / 198 px | 0 px / 0 px | áno / áno |
| 800 px (760) | 10 / 10 | 226 px / 226 px | 0 px / 0 px | áno / áno |
| 950 px (903) | 10 / 12 | 369 px / 331 px | 0 px / 0 px | áno / áno |
| 1 000 px (950) | 10 / 13 | 416 px / 366 px | 0 px / 0 px | áno / áno |

Pole „Napíš komentár“ je celé v okne vo všetkých výškach. Pri 560 px sa zapne poistka (strop pevného bloku `95vh − 11 rem`) a pevný blok sa posúva vnútri; pri 650 px a viac nie. Rozbalený text (strop `max-h-[25vh]`) je pod 800 px nižší než zbalený (650 px: 8 riadkov namiesto 10, 720 px: 9): je to existujúce správanie, nález 364, krok 4 ho nemení.

### 4.5 Čo sa nesmie zmeniť v kroku 4

- **Rovnaké HTML pred krokom 4 aj po ňom:** dvojstĺpcové okno na počítači (príspevok s fotkou, repost s fotkou, ponuka, portfólio, ponuka so zmiznutým zdrojom), kostra a chybové okno: 14 scén z 25 má po kroku 4 rovnaké HTML ako po kroku 3; líšia sa len scény s jednostĺpcovým oknom (text a repost textu).
- **Rovnaký obrázok pixel po pixeli:** jednostĺpcové okno pod 1 024 px (šírka 900 px, výška 1 000 px) pri scénach s nanajvýš tromi komentármi (text, repost, príspevok s fotkou, ponuka, portfólio aj ponuka so zmiznutým zdrojom, kostra, chyba); líšia sa zámerne len scény s piatimi a viac komentármi (a scéna s dlhým rozbaleným textom ponuky: pole na komentár je teraz celé v okne).
- **Okno 900 × 700 px (nízke úzke okno) a zdieľaná ponuka bez komentárov:** pevný blok má 489 px (strop poistky `95vh − 11 rem`; predtým 492 px po pomernom zmrštení s komentármi), zoznam komentárov 29 px (text „Zatiaľ žiadne komentáre“ je celý) a pole na komentár je celé v okne s odsadením pod ním (predtým sa toto odsadenie orezalo o asi 10 px). Rezerva poistky `11rem` je zvolená tak, aby sa tento text neorezal (pri `10rem` ostalo zoznamu 13 px a text bol orezaný na pásik).
- **Mobilný detail a panel komentárov nad fotkou** ostávajú pri `h-full` (vlastnosť `flexFill` nedostávajú; strážia to dva testy v `FeedPostComments.otherSurfaces.test.tsx`).

## 5. Zásahy (pokazenia prototypu) proti novým testom

51 zásahov, každý sa vložil do kópie, spustili sa nové súbory testov a zásah sa vrátil: Z1 až Z31 (kroky 1 až 3) proti štyrom súborom (66 testov), Z32 až Z51 (krok 4) proti trom novým súborom kroku 4 (17 testov). **Zachytených 51 z 51, neprežil žiadny.** Zopakuj ich v kópii `frontend` mimo repozitára (jedna zmena naraz, po každej sa súbor vráti) a napíš do commitu, ktoré boli zachytené a ktoré prežili.

| Zásah | Čo sa pokazí | Padlo testov | Prvý padajúci test |
|---|---|---|---|
| Z1 | ponuka a portfólio nejdú do dvoch stĺpcov | 18 | okno detailu: zdieľaná ponuka a portfólio v dvoch stĺpcoch ponuka s fotkou: na počítači ide do dvoch stĺpcov, so širokým oknom a pevnou výškou |
| Z2 | dva stĺpce, ale okno ostane úzke | 18 | okno detailu: zdieľaná ponuka a portfólio v dvoch stĺpcoch ponuka s fotkou: na počítači ide do dvoch stĺpcov, so širokým oknom a pevnou výškou |
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
| Z14 | blok vždy berie, že je v ľavom stĺpci | 2 | okno detailu: zdieľaná ponuka a portfólio v dvoch stĺpcoch pod 1 024 px ostáva plocha fotky karty 256 px |
| Z15 | plocha je pružná aj bez fillHeight (karta vo feede v kontexte) | 1 | zdieľaný blok a ľavý stĺpec dvojstĺpcového okna karta vo feede (bez fillHeight) sa kontextom nemení |
| Z16 | plocha je pružná aj v jednostĺpcovom okne | 2 | zdieľaný blok a ľavý stĺpec dvojstĺpcového okna v jednostĺpcovom okne (bez ľavého stĺpca) ostáva blok ako predtým a plocha 256 px |
| Z17 | blok v ľavom stĺpci nie je flex stĺpec | 1 | zdieľaný blok a ľavý stĺpec dvojstĺpcového okna v ľavom stĺpci je blok flex stĺpec a plocha karty je pružná |
| Z18 | pružná plocha aj pri zdieľanom príspevku | 2 | okno detailu: zdieľaná ponuka a portfólio v dvoch stĺpcoch zdieľaný príspevok s fotkou má plochu fotky 256 px |
| Z19 | minimum plochy 256 px namiesto 128 px | 8 | okno detailu: zdieľaná ponuka a portfólio v dvoch stĺpcoch plocha fotky karty je v dvojstĺpcovom okne pružná |
| Z20 | plocha bez minima | 8 | okno detailu: zdieľaná ponuka a portfólio v dvoch stĺpcoch plocha fotky karty je v dvojstĺpcovom okne pružná |
| Z21 | plocha bez rastu | 8 | okno detailu: zdieľaná ponuka a portfólio v dvoch stĺpcoch plocha fotky karty je v dvojstĺpcovom okne pružná |
| Z22 | obsah plochy bez absolútneho obalu | 6 | pružná plocha náhľadu ponuky a portfólia (fillHeight) ponuka s fotkou: obsah plochy vypĺňa rám absolútne |
| Z23 | telo karty sa smie zmenšiť | 5 | pružná plocha náhľadu ponuky a portfólia (fillHeight) ponuka s fotkou: karta aj rám sú flex stĺpec a telo karty sa nezmenšuje |
| Z24 | rám nedostupnej karty nie je flex stĺpec | 1 | pružná plocha náhľadu ponuky a portfólia (fillHeight) ponuka, ktorej zdroj zmizol: karta aj rám sú flex stĺpec a telo karty sa nezmenšuje |
| Z25 | rám živej karty nie je flex stĺpec | 4 | pružná plocha náhľadu ponuky a portfólia (fillHeight) ponuka s fotkou: karta aj rám sú flex stĺpec a telo karty sa nezmenšuje |
| Z26 | koreň karty nie je flex stĺpec | 5 | pružná plocha náhľadu ponuky a portfólia (fillHeight) ponuka s fotkou: karta aj rám sú flex stĺpec a telo karty sa nezmenšuje |
| Z27 | plocha je pružná vždy (aj vo feede) | 10 | pružná plocha náhľadu ponuky a portfólia (fillHeight) ponuka s fotkou: bez fillHeight ostáva plocha 256 px a karta bez flex tried |
| Z28 | fotka ostane 256 px | 2 | pružná plocha náhľadu ponuky a portfólia (fillHeight) ponuka s fotkou: plocha vyplní zvyšok stĺpca a nezmenší sa pod 128 px |
| Z29 | náhrada za fotku ostane 256 px | 5 | pružná plocha náhľadu ponuky a portfólia (fillHeight) ponuka bez fotky: plocha vyplní zvyšok stĺpca a nezmenší sa pod 128 px |
| Z30 | ikona nedostupného zdroja ostane 256 px | 1 | pružná plocha náhľadu ponuky a portfólia (fillHeight) ikona nedostupného zdroja so zlyhanou fotkou je tiež pružná |
| Z31 | predvolená hodnota kontextu je true | 3 | okno detailu: zdieľaná ponuka a portfólio v dvoch stĺpcoch pod 1 024 px ostáva plocha fotky karty 256 px |
| Z32 | okno nedá komentárom flexFill | 1 | jednostĺpcové okno: komentáre odovzdávajú výšku flexom sekcia komentárov je flex stĺpec a zoznam v nej sa zmenšuje cez flex |
| Z33 | pevný blok sa smie zmenšovať | 5 | jednostĺpcové okno: pevný blok sa nezmenšuje príspevok len s textom: pevný blok má poistku s posúvaním a strop |
| Z34 | strop poistky s inou rezervou | 5 | jednostĺpcové okno: pevný blok sa nezmenšuje príspevok len s textom: pevný blok má poistku s posúvaním a strop |
| Z35 | pevný blok bez stropu poistky | 5 | jednostĺpcové okno: pevný blok sa nezmenšuje príspevok len s textom: pevný blok má poistku s posúvaním a strop |
| Z36 | sekcia komentárov nie je flex stĺpec | 1 | jednostĺpcové okno: komentáre odovzdávajú výšku flexom sekcia komentárov je flex stĺpec a zoznam v nej sa zmenšuje cez flex |
| Z37 | sekcia komentárov nie je flex | 1 | jednostĺpcové okno: komentáre odovzdávajú výšku flexom sekcia komentárov je flex stĺpec a zoznam v nej sa zmenšuje cez flex |
| Z38 | sekcia komentárov nerastie | 1 | jednostĺpcové okno: komentáre odovzdávajú výšku flexom sekcia komentárov je flex stĺpec a zoznam v nej sa zmenšuje cez flex |
| Z39 | posuvný rámik ignoruje flexFill | 2 | jednostĺpcové okno: komentáre odovzdávajú výšku flexom sekcia komentárov je flex stĺpec a zoznam v nej sa zmenšuje cez flex |
| Z40 | koreň komentárov ignoruje flexFill | 2 | jednostĺpcové okno: komentáre odovzdávajú výšku flexom sekcia komentárov je flex stĺpec a zoznam v nej sa zmenšuje cez flex |
| Z41 | obal zoznamu ignoruje flexFill | 1 | výška zoznamu komentárov fillHeight s flexFill odovzdáva výšku flexom celým reťazcom |
| Z42 | flexFill zapne výšku aj bez fillHeight | 1 | výška zoznamu komentárov bez fillHeight má zoznam strop výšky a flexFill sa neuplatní |
| Z43 | flexový rámik bez min-h-0 | 2 | výška zoznamu komentárov fillHeight s flexFill odovzdáva výšku flexom celým reťazcom |
| Z44 | flexový rámik drží aj h-full | 2 | výška zoznamu komentárov fillHeight s flexFill odovzdáva výšku flexom celým reťazcom |
| Z45 | flexový koreň drží aj h-full | 2 | výška zoznamu komentárov fillHeight s flexFill odovzdáva výšku flexom celým reťazcom |
| Z46 | flexový obal zoznamu nie je flex stĺpec | 1 | výška zoznamu komentárov fillHeight s flexFill odovzdáva výšku flexom celým reťazcom |
| Z47 | percentuálny rámik sa zmení pre všetky miesta | 6 | výška zoznamu komentárov len fillHeight: percentuálna výška ako doteraz |
| Z48 | flexFill je predvolene zapnuté | 6 | výška zoznamu komentárov len fillHeight: percentuálna výška ako doteraz |
| Z49 | dvojstĺpcové okno dostane flexFill | 2 | dvojstĺpcové okno sa nemení príspevok s fotkou: komentáre držia percentuálnu výšku a pevný blok so stropom tam nie je |
| Z50 | mobilný detail dostane flexFill | 1 | komentáre mimo okna na počítači mobilný detail príspevku drží percentuálnu výšku komentárov |
| Z51 | panel nad fotkou dostane flexFill | 1 | komentáre mimo okna na počítači panel komentárov nad fotkou drží percentuálnu výšku |

## 6. Overenie prototypu

Všetko v kópii `frontend` z `main` `a9e70eef` mimo repozitára (prototyp agenta), jeden beh na koniec po poslednej úprave kódu aj testov (po kroku 4).

- **Celý Jest:** 644 sád a 9 580 testov, všetky prešli, 0 snapshotov (na `main` 637 sád, 9 497 testov a 0 snapshotov: pribudlo 7 sád a 83 testov; krok 4 pridal 3 sady a 17 testov). Prvý beh samotnej zmeny kódu bez nových testov (kroky 1 až 3) mal 4 zlyhania v `FeedPostDetailOverlay.test.tsx` (dva testy o ponuke v jednostĺpcovom okne a dva o šírke textového okna) a jedno v `countryRegistry.test.ts`, ktoré vzniklo len preto, že kópia nemala priečinok `backend`; krok 4 nespôsobil žiadne zlyhanie existujúceho testu.
- **Každý commit osobitne** (celý priečinok `modules/feed`, stav kópie po jednotlivých krokoch s úpravami existujúcich testov z toho istého kroku a len s novými testami, ktoré k nemu patria; v krokoch 1 až 3 sa `FeedPostComments.tsx` a `FeedPostComments.types.ts` vracajú na verziu z `main`): po kroku 1 96 sád, 1 152 testov, 0 zlyhaní; po kroku 2 98 sád, 1 182 testov, 0 zlyhaní; po kroku 3 99 sád, 1 195 testov, 0 zlyhaní; po kroku 4 102 sád, 1 212 testov, 0 zlyhaní. Tri testy, ktoré používajú `data-testid="feed-shared-card-media"`, patria až ku kroku 2 (prvý beh po kroku 1 ich ešte obsahoval a dva z nich padli).
- **Nové testy kroku 4 pred zmenou:** pri stave po kroku 3 (kód kroku 4 vrátený) padá 7 zo 17 nových testov; ostatných 10 stráži, že sa panel nad fotkou, mobilný detail a dvojstĺpcové okno nemenia, a prechádza pred zmenou aj po nej.
- **`tsc --noEmit`:** čisté. **ESLint** s `--max-warnings=0` nad všetkými dotknutými a novými súbormi (šesť produkčných súborov, `FeedDetailSplitContext.tsx`, sedem nových súborov testov a `FeedPostDetailOverlay.test.tsx`): čisté.
- **Počty riadkov:** `FeedPostDetailOverlay.tsx` 385 → 408, `FeedPostDetailSplitLayout.tsx` 144 → 160, `FeedPostSharedBlock.tsx` 163 → 170, `SharedContentPreviewCard.tsx` 355 → 393, `FeedPostComments.tsx` 401 → 423, `FeedPostComments.types.ts` 68 → 76, nový `FeedDetailSplitContext.tsx` 22, `FeedPostCard.tsx` 498 bez zmeny; nové testy 343 + 121 + 138 + 321 + 164 + 312 + 178 riadkov, `FeedPostDetailOverlay.test.tsx` 797 → 803. Spolu +174 a −60 riadkov v šiestich produkčných súboroch (z pridaných je 80 komentárov).
- **Zásahy:** 51 z 51 zachytených (časť 5). Kópia sa po všetkých zásahoch vrátila presne do pôvodného stavu (porovnaný diff).
- **Prehliadač:** Chromium (Playwright), skutočné okno vykreslené cez Jest do HTML so štýlmi z `globals.css`; scény v časti 4; pixelové porovnanie scén, ktoré sa nemajú zmeniť; krok 4 je v Chromiu pixel po pixeli rovnaký ako prototyp, ktorý majiteľ videl na obrázkoch (výšky 650, 800 a 950 px).
- **Neoverené:** Safari a WebKit (rozhoduje ručný test majiteľa a kontrola Codexu), tmavý režim, mobilná obrazovka detailu (K57 sa jej nedotýka; krok 4 jej `FeedPostComments` nezmení, strážia to testy), skutočné posuvníky na Windowse, `npm run build` a `npm run check:missing-translations` (nové texty nie sú; spustí ich kolega pred odoslaním). Okno z upozornenia a z adresy sa v prototype neskúšalo (otvára sa tým istým komponentom, ktorý beží s `postId`, takže kostra aj načítanie sú rovnaké).
