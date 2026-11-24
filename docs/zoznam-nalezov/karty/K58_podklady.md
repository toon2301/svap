# Podklady ku karte K58 (prototyp agenta)

Pripravil agent 24. 11. 2026 ku `karty/K58.md` (druhá časť redizajnu Nástenky: text príspevku a okno detailu na počítači; R71 až R73). Je to **dôkaz, že postup ide, nie revidovaný kód**: kolega číta kartu, prototyp je len pomôcka; testy si skontroluje, upraví a odôvodní, čo mení. Čísla riadkov platia pre `main` `183e5caf` (kód je rovnaký ako po PR #323, K57).

## 1. Čo je prototyp

- **Tri kópie `frontend`** z `main` `183e5caf` mimo repozitára, po jednej na krok: po kroku 1, po kroku 2 (krok 1 a krok 2) a po kroku 3 (všetky tri). Vymyslené údaje, svetlý režim. Každý krok je v kópii zvlášť, takže sa dá skontrolovať samostatne.
- **Nie je preformátovaný**: odsadenie okolo konštanty `paragraph` vo `FeedPostCaption.tsx` a poradie importu vo `FeedPhotoViewerChrome.tsx` (import nového komponentu je nad importom Reactu) sú len výsledok skriptu. Kolega súbory napíše a naformátuje podľa okolitého kódu (Prettier sa v projekte nepoužíva, formát určuje ESLint a okolitý kód).
- **Nemá nové testy ani zásahy** (mutácie). Testy píše kolega podľa kariet a agent ich pri kontrole PR overí vlastnými zásahmi. Existujúce testy v prototype sú rovnaké ako na `main`; ktoré padajú, je v časti 4.
- **Pomocné nástroje** (mimo repozitára, kópie z `git archive`): Jest harness, ktorý vykreslí skutočné komponenty s vymyslenými údajmi do HTML; Tailwind CLI s `tailwind.config.js` a `globals.css` z kópie; Chromium (Playwright) na snímky a merania. Obrázky v `navrhy/` sú z nich.

## 2. Súbory a veľkosť po krokoch

Všetky produkčné súbory ostávajú pod 500 riadkov. **`FeedPostCard.tsx` má dnes 498 riadkov a po kroku 3 492**: text voľného príspevku sa z neho presúva do nového `FeedPostCardCaption.tsx` (priama zmena karty by ju dostala nad 500). Ostatné súbory nad 500 riadkov sú len testové.

**Krok 1** (jednotné „Viac“ a „Menej“; spolu +80 a −45):

| Súbor | Pred | Po | Zmena |
|---|---|---|---|
| `FeedPhotoViewerChrome.tsx` | 308 | 299 | +10 −19 |
| `FeedPostCaption.tsx` | 234 | 266 | +40 −8 |
| `FeedPostMobileDetailContent.tsx` | 225 | 225 | +1 −1 |
| `SharedContentPreviewCard.tsx` | 393 | 405 | +29 −17 |

**Krok 2** (ponuka, portfólio a repost s fotkou bez posúvania; spolu +38 a −11):

| Súbor | Pred | Po | Zmena |
|---|---|---|---|
| `FeedPostCaption.tsx` | 266 | 278 | +16 −4 |
| `FeedPostSharedBlock.tsx` | 170 | 180 | +12 −2 |
| `SharedContentPreviewCard.tsx` | 405 | 410 | +10 −5 |

**Krok 3** (príspevok len s textom v dvoch stĺpcoch; spolu +176 a −69):

| Súbor | Pred | Po | Zmena |
|---|---|---|---|
| `FeedDetailTextOnlyContext.tsx` (nový) | – | 20 | +20 |
| `FeedPostCardCaption.tsx` (nový) | – | 61 | +61 |
| `FeedPostCaption.tsx` | 278 | 282 | +6 −2 |
| `FeedPostCard.tsx` | 498 | 492 | +10 −16 |
| `FeedPostDetailOverlay.tsx` | 420 | 428 | +36 −28 |
| `FeedPostDetailSplitLayout.tsx` | 165 | 174 | +23 −14 |
| `FeedPostSharedBlock.tsx` | 180 | 188 | +16 −8 |
| `SharedContentPreviewCard.tsx` | 410 | 413 | +4 −1 |

Dokopy sa dotkne 8 existujúcich súborov a pribudnú 2 nové (súčet po krokoch +294 a −125 riadkov; z pridaných riadkov je veľa komentárov, projekt komentuje „prečo“). `FeedPostCaption.tsx` skončí na 282 riadkoch, `SharedContentPreviewCard.tsx` na 413, `FeedPostDetailOverlay.tsx` na 428.

## 3. Diffy po krokoch

Čísla riadkov v diffoch sú z `main` `183e5caf` (krok 2 a 3 z kópie po predchádzajúcom kroku).

### 3.1 Krok 1: jednotné „Viac“ a „Menej“ (nálezy 357, 364 a 365)

```diff
diff --git a/frontend/src/components/dashboard/modules/feed/FeedPhotoViewerChrome.tsx b/frontend/src/components/dashboard/modules/feed/FeedPhotoViewerChrome.tsx
--- a/frontend/src/components/dashboard/modules/feed/FeedPhotoViewerChrome.tsx
+++ b/frontend/src/components/dashboard/modules/feed/FeedPhotoViewerChrome.tsx
@@ -12,6 +12,7 @@
  * plocha, aby fotka pod ním ostala vidieť.
  */
 
+import FeedPostCaption, { CARD_CAPTION_LINES } from './FeedPostCaption';
 import { useState } from 'react';
 import { EllipsisHorizontalIcon } from '@heroicons/react/24/outline';
 import { XMarkIcon } from '@heroicons/react/24/outline';
@@ -96,7 +97,6 @@
 }: FeedPhotoViewerChromeProps) {
   const { t, locale } = useLanguage();
   const [menuOpen, setMenuOpen] = useState(false);
-  const [captionExpanded, setCaptionExpanded] = useState(false);
   const author = post.author;
   const authorName = author?.display_name || '';
   const caption = post.caption || '';
@@ -155,24 +155,15 @@
 
         {caption ? (
           <div className="pointer-events-auto mt-2 pr-12">
-            <p
-              data-testid="feed-photo-viewer-caption"
-              className={`whitespace-pre-wrap break-words text-sm text-white ${
-                captionExpanded ? '' : 'line-clamp-2'
-              }`}
-            >
-              {caption}
-            </p>
-            {captionExpanded ? null : (
-              <button
-                type="button"
-                onClick={() => setCaptionExpanded(true)}
-                data-testid="feed-photo-viewer-caption-more"
-                className="mt-0.5 text-sm font-medium text-white/80 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
-              >
-                {t('feed.captionMore', 'Viac')}
-              </button>
-            )}
+            <FeedPostCaption
+              text={caption}
+              testId="feed-photo-viewer-caption"
+              tone="onPhoto"
+              maxLines={CARD_CAPTION_LINES}
+              boundedExpansion
+              expansionBound="viewer"
+              collapseBlankLines
+            />
           </div>
         ) : null}
       </div>
diff --git a/frontend/src/components/dashboard/modules/feed/FeedPostCaption.tsx b/frontend/src/components/dashboard/modules/feed/FeedPostCaption.tsx
--- a/frontend/src/components/dashboard/modules/feed/FeedPostCaption.tsx
+++ b/frontend/src/components/dashboard/modules/feed/FeedPostCaption.tsx
@@ -17,7 +17,15 @@
  * Stav je lokálny pre túto inštanciu, takže karty vo feede sa neovplyvňujú.
  */
 
-import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
+import {
+  useCallback,
+  useEffect,
+  useLayoutEffect,
+  useRef,
+  useState,
+  type ReactElement,
+  type ReactNode,
+} from 'react';
 import { useLanguage } from '@/contexts/LanguageContext';
 
 /**
@@ -65,8 +73,11 @@
  *   záruku, že ľavý stĺpec nikdy nescrolluje – viď FeedPostDetailSplitLayout.
  */
 export const BOUNDED_EXPANDED_MAX_HEIGHT = {
-  compact: 'max-h-[25vh]',
+  // Strop rozbaleného textu nie je nikdy nižší než zbalený text (10 riadkov po 20 px = 12,5 rem), inak by „Viac“ ukázalo menej.
+  compact: 'max-h-[max(25vh,14rem)]',
   roomy: 'max-h-[40vh]',
+  // Fotoprehliadač: text sedí na fotke, preto ho rozbalený smie zakryť najviac štyri desatiny obrazovky.
+  viewer: 'max-h-[40vh]',
 } as const;
 
 export type CaptionExpansionBound = keyof typeof BOUNDED_EXPANDED_MAX_HEIGHT;
@@ -128,6 +139,10 @@
    * teda o nič neprídu.
    */
   onTextClick?: () => void;
+  /** Text na fotke (fotoprehliadač): biely text, po rozbalení na tmavom podklade. */
+  tone?: 'default' | 'onPhoto';
+  /** Obalí odsek (napr. tlačidlom s prekliknutím); prepínač „Viac“ ostáva mimo obalu. */
+  wrapText?: (paragraph: ReactElement) => ReactNode;
 };
 
 export default function FeedPostCaption({
@@ -138,6 +153,8 @@
   maxLines = CARD_CAPTION_LINES,
   collapseBlankLines = false,
   onTextClick,
+  tone = 'default',
+  wrapText,
 }: FeedPostCaptionProps) {
   const text = collapseBlankLines ? collapseBlankRuns(rawText) : rawText;
   const clampClass = CLAMP_CLASSES[maxLines] ?? CLAMP_CLASSES[CARD_CAPTION_LINES];
@@ -199,8 +216,8 @@
         : '')
     : clampClass;
 
-  return (
-    <div>
+  const onPhoto = tone === 'onPhoto';
+  const paragraph = (
       <p
         ref={textRef}
         data-testid={testId}
@@ -210,19 +227,34 @@
         }
         tabIndex={scrollable ? 0 : undefined}
         onClick={onTextClick}
-        className={`whitespace-pre-wrap break-words text-sm text-gray-800 dark:text-gray-100 ${sizeClass} ${
-          onTextClick ? 'cursor-pointer' : ''
-        }`}
+        className={`whitespace-pre-wrap break-words text-sm ${
+          onPhoto ? 'text-white' : 'text-gray-800 dark:text-gray-100'
+        } ${sizeClass} ${onTextClick ? 'cursor-pointer' : ''}`}
       >
         {text}
       </p>
+  );
+
+  return (
+    <div
+      className={
+        onPhoto && expanded
+          ? '-mx-2 rounded-xl bg-black/60 px-2 py-1.5 backdrop-blur-sm'
+          : undefined
+      }
+    >
+      {wrapText ? wrapText(paragraph) : paragraph}
       {overflows ? (
         <button
           type="button"
           onClick={() => setExpanded((current) => !current)}
           aria-expanded={expanded}
           data-testid={`${testId}-toggle`}
-          className="mt-0.5 text-sm font-medium text-gray-500 underline-offset-2 transition-colors hover:text-purple-700 hover:underline dark:text-gray-400 dark:hover:text-purple-300"
+          className={`mt-0.5 text-sm font-medium underline-offset-2 transition-colors hover:underline ${
+            onPhoto
+              ? 'text-white/80 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70'
+              : 'text-gray-500 hover:text-purple-700 dark:text-gray-400 dark:hover:text-purple-300'
+          }`}
         >
           {expanded
             ? t('feed.captionLess', 'Menej')
diff --git a/frontend/src/components/dashboard/modules/feed/FeedPostMobileDetailContent.tsx b/frontend/src/components/dashboard/modules/feed/FeedPostMobileDetailContent.tsx
--- a/frontend/src/components/dashboard/modules/feed/FeedPostMobileDetailContent.tsx
+++ b/frontend/src/components/dashboard/modules/feed/FeedPostMobileDetailContent.tsx
@@ -26,7 +26,7 @@
 import ShareIcon from './ShareIcon';
 
 /** Text príspevku sa tu zbalí na päť riadkov – obrazovka má miesta viac než karta. */
-const MOBILE_DETAIL_CAPTION_LINES = 5;
+const MOBILE_DETAIL_CAPTION_LINES = 10;
 
 /** Spoločný vzhľad troch akcií – dotykový cieľ nad 44 px. */
 const ACTION_BUTTON =
diff --git a/frontend/src/components/dashboard/modules/feed/SharedContentPreviewCard.tsx b/frontend/src/components/dashboard/modules/feed/SharedContentPreviewCard.tsx
--- a/frontend/src/components/dashboard/modules/feed/SharedContentPreviewCard.tsx
+++ b/frontend/src/components/dashboard/modules/feed/SharedContentPreviewCard.tsx
@@ -28,6 +28,7 @@
  */
 
 import { useState, type ReactNode } from 'react';
+import FeedPostCaption, { CARD_CAPTION_LINES } from './FeedPostCaption';
 import InitialsAvatar from '@/components/shared/InitialsAvatar';
 import { useLanguage } from '@/contexts/LanguageContext';
 import BlurredContainImage from '../shared/BlurredContainImage';
@@ -251,6 +252,31 @@
     </span>
   ) : null;
 
+  // Text pôvodného príspevku: rovnaké „Viac“/„Menej“ ako na karte. Obal s prekliknutím na pôvodný príspevok je len okolo
+  // odseku, prepínač stojí mimo neho (tlačidlo v tlačidle je neplatné HTML).
+  const captionNode = caption ? (
+    <FeedPostCaption
+      text={caption}
+      testId="feed-shared-caption"
+      maxLines={CARD_CAPTION_LINES}
+      collapseBlankLines
+      wrapText={
+        isPost && onOpenPostPreview && !unavailable
+          ? (paragraph) => (
+              <button
+                type="button"
+                onClick={onOpenPostPreview}
+                data-testid="feed-shared-post-preview-open"
+                className="block w-full rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60"
+              >
+                {paragraph}
+              </button>
+            )
+          : undefined
+      }
+    />
+  ) : null;
+
   const body = (
     // Zdieľaný príspevok nemá rám, takže ani vnútorné odsadenie – text má
     // začínať tam, kde text karty, nie o kúsok vpravo.
@@ -279,11 +305,7 @@
         <p className="truncate text-xs text-gray-500 dark:text-gray-400">{meta}</p>
       ) : null}
 
-      {caption ? (
-        <p className="line-clamp-4 whitespace-pre-wrap break-words text-sm text-gray-700 dark:text-gray-200">
-          {caption}
-        </p>
-      ) : null}
+      {!isPost ? captionNode : null}
     </div>
   );
 
@@ -307,18 +329,8 @@
         className={`space-y-2 ${mutedClass}`}
       >
         {/* Zmiznutý zdroj nie je cieľ kliku – nie je kam ísť. */}
-        {onOpenPostPreview && caption && !unavailable ? (
-          <button
-            type="button"
-            onClick={onOpenPostPreview}
-            data-testid="feed-shared-post-preview-open"
-            className="block w-full rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60"
-          >
-            {body}
-          </button>
-        ) : (
-          body
-        )}
+        {unavailable || title || meta || priceBadge ? body : null}
+        {captionNode}
         {photo}
       </div>
     );
```

### 3.2 Krok 2: ponuka, portfólio a repost s fotkou bez posúvania (nález 366)

```diff
diff --git a/frontend/src/components/dashboard/modules/feed/FeedPostCaption.tsx b/frontend/src/components/dashboard/modules/feed/FeedPostCaption.tsx
--- a/frontend/src/components/dashboard/modules/feed/FeedPostCaption.tsx
+++ b/frontend/src/components/dashboard/modules/feed/FeedPostCaption.tsx
@@ -143,6 +143,12 @@
   tone?: 'default' | 'onPhoto';
   /** Obalí odsek (napr. tlačidlom s prekliknutím); prepínač „Viac“ ostáva mimo obalu. */
   wrapText?: (paragraph: ReactElement) => ReactNode;
+  /**
+   * Rozbalený text nemá pevný strop, ale vyplní miesto, ktoré mu rodič (flex stĺpec) ponechá, a posúva sa v ňom.
+   * Dvojstĺpcové okno ho dáva textu nad kartou ponuky, portfólia alebo repostu: karta sa nikdy neposúva a text
+   * ustúpi, keď sa karta nezmestí (najmenej päť riadkov).
+   */
+  fillParent?: boolean;
 };
 
 export default function FeedPostCaption({
@@ -155,6 +161,7 @@
   onTextClick,
   tone = 'default',
   wrapText,
+  fillParent = false,
 }: FeedPostCaptionProps) {
   const text = collapseBlankLines ? collapseBlankRuns(rawText) : rawText;
   const clampClass = CLAMP_CLASSES[maxLines] ?? CLAMP_CLASSES[CARD_CAPTION_LINES];
@@ -212,7 +219,7 @@
   const scrollable = expanded && boundedExpansion;
   const sizeClass = expanded
     ? (boundedExpansion
-        ? `${BOUNDED_EXPANDED_MAX_HEIGHT[expansionBound]} ${BOUNDED_EXPANDED_CLASS}`
+        ? `${fillParent ? 'min-h-0 flex-1' : BOUNDED_EXPANDED_MAX_HEIGHT[expansionBound]} ${BOUNDED_EXPANDED_CLASS}`
         : '')
     : clampClass;
 
@@ -238,9 +245,12 @@
   return (
     <div
       className={
-        onPhoto && expanded
-          ? '-mx-2 rounded-xl bg-black/60 px-2 py-1.5 backdrop-blur-sm'
-          : undefined
+        [
+          fillParent ? `flex flex-col${expanded ? ' min-h-[8.6rem]' : ''}` : '',
+          onPhoto && expanded ? '-mx-2 rounded-xl bg-black/60 px-2 py-1.5 backdrop-blur-sm' : '',
+        ]
+          .filter(Boolean)
+          .join(' ') || undefined
       }
     >
       {wrapText ? wrapText(paragraph) : paragraph}
@@ -251,6 +261,8 @@
           aria-expanded={expanded}
           data-testid={`${testId}-toggle`}
           className={`mt-0.5 text-sm font-medium underline-offset-2 transition-colors hover:underline ${
+            fillParent ? 'shrink-0 self-start' : ''
+          } ${
             onPhoto
               ? 'text-white/80 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70'
               : 'text-gray-500 hover:text-purple-700 dark:text-gray-400 dark:hover:text-purple-300'
diff --git a/frontend/src/components/dashboard/modules/feed/FeedPostSharedBlock.tsx b/frontend/src/components/dashboard/modules/feed/FeedPostSharedBlock.tsx
--- a/frontend/src/components/dashboard/modules/feed/FeedPostSharedBlock.tsx
+++ b/frontend/src/components/dashboard/modules/feed/FeedPostSharedBlock.tsx
@@ -47,6 +47,9 @@
   t: (key: string, fallback?: string) => string;
 };
 
+/** Text zdieľajúceho nad kartou v dvojstĺpcovom okne: karta je hlavný obsah, text je jej komentár, preto kratší náhľad. */
+const SPLIT_SHARED_CAPTION_LINES = 5;
+
 export default function FeedPostSharedBlock({
   fillHeight,
   fixedBlock,
@@ -76,7 +79,14 @@
         text={caption}
         boundedExpansion={isDetail}
         expansionBound={fillHeight ? 'roomy' : 'compact'}
-        maxLines={isDetail ? DETAIL_CAPTION_LINES : CARD_CAPTION_LINES}
+        maxLines={
+          isDetail
+            ? fillHeight && inSplitColumn
+              ? SPLIT_SHARED_CAPTION_LINES
+              : DETAIL_CAPTION_LINES
+            : CARD_CAPTION_LINES
+        }
+        fillParent={fillHeight && inSplitColumn}
         collapseBlankLines
         onTextClick={
           opensMobileDetail ? () => setMobileDetailOpen(true) : undefined
@@ -86,7 +96,7 @@
 
   return (
     <div
-      className={`space-y-3 px-4 py-3 ${
+      className={`${fillHeight && inSplitColumn ? 'gap-3' : 'space-y-3'} px-4 py-3 ${
         // V okne detailu je náhľad JEDINÁ pružná časť stĺpca: keď sa
         // nezmestí, scrolluje sa on, nie karta. Bez toho by sa pri vyššom
         // náhľade (ponuka s fotkou) rozhýbala aj hlavička a riadok akcií –
diff --git a/frontend/src/components/dashboard/modules/feed/SharedContentPreviewCard.tsx b/frontend/src/components/dashboard/modules/feed/SharedContentPreviewCard.tsx
--- a/frontend/src/components/dashboard/modules/feed/SharedContentPreviewCard.tsx
+++ b/frontend/src/components/dashboard/modules/feed/SharedContentPreviewCard.tsx
@@ -155,8 +155,11 @@
   const isOffer = data.type === 'offer';
   const unavailable = data.unavailable === true;
   const thumbnailFailed = Boolean(data.thumbnailUrl) && failedThumbnail === data.thumbnailUrl;
-  // Pružná plocha sa týka len ponuky a portfólia; zdieľaný príspevok ostáva bez zmeny.
-  const stretch = fillHeight && !isPost;
+  // Pružná plocha: ponuka a portfólio vždy, zdieľaný príspevok len vtedy, keď má fotku (bez nej nie je čo naťahovať).
+  const hasPhotoPlane = Boolean(data.thumbnailUrl) && !thumbnailFailed;
+  const stretch = fillHeight && (!isPost || hasPhotoPlane);
+  // Repost s fotkou: obal aj rám sa rozpustia, aby texty a fotka zdieľali jeden flex stĺpec bloku.
+  const flatten = stretch && isPost;
   const photoFrame = stretch ? PHOTO_FRAME_FILL : PHOTO_FRAME;
   // Pri pružnej ploche obsah vypĺňa rám absolútne, nezávisle od toho, ako prehliadač rátá percentá výšky vo flex položke.
   const fillContent = (node: ReactNode) =>
@@ -259,6 +262,8 @@
       text={caption}
       testId="feed-shared-caption"
       maxLines={CARD_CAPTION_LINES}
+      boundedExpansion={flatten}
+      fillParent={flatten}
       collapseBlankLines
       wrapText={
         isPost && onOpenPostPreview && !unavailable
@@ -326,7 +331,7 @@
     frame = (
       <div
         data-testid={unavailable ? 'feed-shared-unavailable' : 'feed-shared-post-preview'}
-        className={`space-y-2 ${mutedClass}`}
+        className={flatten ? `contents ${mutedClass}` : `space-y-2 ${mutedClass}`}
       >
         {/* Zmiznutý zdroj nie je cieľ kliku – nie je kam ísť. */}
         {unavailable || title || meta || priceBadge ? body : null}
@@ -379,7 +384,7 @@
     <div
       data-testid="feed-shared-card"
       data-shared-type={data.type}
-      className={stretch ? 'flex flex-1 flex-col' : undefined}
+      className={stretch ? (flatten ? 'contents' : 'flex flex-1 flex-col') : undefined}
     >
       {/* Pôvodný vlastník stojí NAD kartou – obsah patrí jemu, nie tomu, kto
           ho zdieľa. Pri zdieľaní seba samého sa vynecháva: meno už nesie
@@ -387,7 +392,7 @@
       {data.owner && !hideOwner ? (
         <div
           data-testid="feed-shared-card-owner"
-          className="mb-2 flex items-center gap-2"
+          className={`${flatten ? '' : 'mb-2 '}flex items-center gap-2`}
         >
           <InitialsAvatar
             name={data.owner.displayName}
```

### 3.3 Krok 3: príspevok len s textom v dvoch stĺpcoch (nález 367)

```diff
diff --git a/frontend/src/components/dashboard/modules/feed/FeedDetailTextOnlyContext.tsx b/frontend/src/components/dashboard/modules/feed/FeedDetailTextOnlyContext.tsx
--- a/frontend/src/components/dashboard/modules/feed/FeedDetailTextOnlyContext.tsx
+++ b/frontend/src/components/dashboard/modules/feed/FeedDetailTextOnlyContext.tsx
@@ -0,0 +1,20 @@
+'use client';
+
+/**
+ * Údaj pre kartu v ĽAVOM stĺpci dvojstĺpcového okna, keď je príspevok len text (bez fotky, ponuky a portfólia; R73).
+ *
+ * Ľavý stĺpec tam nemá čo iné ukázať, takže text nemá súperiť o miesto a ukáže sa celý (bez „Viac“); keď je
+ * vyšší než stĺpec, posúva sa len on. Rovnako ako `FeedDetailSplitContext` ide údaj kontextom, nie vlastnosťou
+ * karty, lebo `FeedPostCard.tsx` nesmie rásť nad 500 riadkov.
+ */
+
+import { createContext, useContext } from 'react';
+
+const FeedDetailTextOnlyContext = createContext(false);
+
+export const FeedDetailTextOnlyProvider = FeedDetailTextOnlyContext.Provider;
+
+/** `true` len vnútri ľavého stĺpca dvojstĺpcového okna príspevku len s textom. */
+export function useFeedDetailTextOnly(): boolean {
+  return useContext(FeedDetailTextOnlyContext);
+}
diff --git a/frontend/src/components/dashboard/modules/feed/FeedPostCaption.tsx b/frontend/src/components/dashboard/modules/feed/FeedPostCaption.tsx
--- a/frontend/src/components/dashboard/modules/feed/FeedPostCaption.tsx
+++ b/frontend/src/components/dashboard/modules/feed/FeedPostCaption.tsx
@@ -115,7 +115,8 @@
   expansionBound?: CaptionExpansionBound;
   /**
    * Koľko riadkov je vidno pred „Viac". Karta vo feede musí ustúpiť fotke a
-   * ďalším príspevkom, okno detailu má miesta podstatne viac.
+   * ďalším príspevkom, okno detailu má miesta podstatne viac. `0` = bez
+   * orezania: text sa ukáže celý a „Viac" sa neukáže (okno len s textom, R73).
    */
   maxLines?: number;
   /**
@@ -164,7 +165,10 @@
   fillParent = false,
 }: FeedPostCaptionProps) {
   const text = collapseBlankLines ? collapseBlankRuns(rawText) : rawText;
-  const clampClass = CLAMP_CLASSES[maxLines] ?? CLAMP_CLASSES[CARD_CAPTION_LINES];
+  const clampClass =
+    maxLines === 0
+      ? ''
+      : (CLAMP_CLASSES[maxLines] ?? CLAMP_CLASSES[CARD_CAPTION_LINES]);
   const { t } = useLanguage();
   const [expanded, setExpanded] = useState(false);
   const [overflows, setOverflows] = useState(false);
diff --git a/frontend/src/components/dashboard/modules/feed/FeedPostCard.tsx b/frontend/src/components/dashboard/modules/feed/FeedPostCard.tsx
--- a/frontend/src/components/dashboard/modules/feed/FeedPostCard.tsx
+++ b/frontend/src/components/dashboard/modules/feed/FeedPostCard.tsx
@@ -21,10 +21,7 @@
 import FeedPostComments from './FeedPostComments';
 import FeedPostImageCarousel from './FeedPostImageCarousel';
 import { useFeedPostOverlay } from '../../contexts/FeedPostOverlayContext';
-import FeedPostCaption, {
-  CARD_CAPTION_LINES,
-  DETAIL_CAPTION_LINES,
-} from './FeedPostCaption';
+import FeedPostCardCaption from './FeedPostCardCaption';
 import ExchangeIcon from './FeedExchangeIcon';
 import { buildSharedSourceHandler } from './feedSharedContentNavigation';
 import { usePendingFeedImages } from './usePendingFeedImages';
@@ -355,18 +352,15 @@
           tým istým pravidlom v okne detailu (text nad náhľadom), na karte vo
           feede ostáva poradie opačné – viď blok zdieľaného obsahu nižšie. */}
       {!isShared && caption ? (
-        <div className={`px-4 py-3 ${fixedBlock}`}>
-          <FeedPostCaption
-            text={caption}
-            boundedExpansion={isDetail}
-            expansionBound={fillHeight ? 'roomy' : 'compact'}
-            maxLines={isDetail ? DETAIL_CAPTION_LINES : CARD_CAPTION_LINES}
-            collapseBlankLines
-            onTextClick={
-              opensMobileDetail ? () => setMobileDetailOpen(true) : undefined
-            }
-          />
-        </div>
+        <FeedPostCardCaption
+          caption={caption}
+          isDetail={isDetail}
+          fillHeight={fillHeight}
+          fixedBlock={fixedBlock}
+          onTextClick={
+            opensMobileDetail ? () => setMobileDetailOpen(true) : undefined
+          }
+        />
       ) : null}
 
       {images.length > 0 ? (
diff --git a/frontend/src/components/dashboard/modules/feed/FeedPostCardCaption.tsx b/frontend/src/components/dashboard/modules/feed/FeedPostCardCaption.tsx
--- a/frontend/src/components/dashboard/modules/feed/FeedPostCardCaption.tsx
+++ b/frontend/src/components/dashboard/modules/feed/FeedPostCardCaption.tsx
@@ -0,0 +1,61 @@
+'use client';
+
+/**
+ * Text voľného príspevku v karte: hlavička karty, potom TENTO text, potom fotky.
+ *
+ * Presunuté z `FeedPostCard.tsx` (ten má 498 riadkov a nesmie rásť nad 500): obal aj `FeedPostCaption` sú rovnaké ako
+ * predtým, pribudla len vetva pre okno detailu s príspevkom len s textom (`useFeedDetailTextOnly`, R73). V ľavom
+ * stĺpci takého okna nie je čo iné ukázať, takže obal je pružný (`min-h-0 flex-1`), text sa ukáže celý (bez „Viac“)
+ * a posúva sa len on, keď sa nezmestí. Všade inde ostáva obal pevný blok (`fixedBlock`) a text sa správa ako doteraz.
+ */
+
+import FeedPostCaption, {
+  CARD_CAPTION_LINES,
+  DETAIL_CAPTION_LINES,
+} from './FeedPostCaption';
+import { useFeedDetailTextOnly } from './FeedDetailTextOnlyContext';
+
+type FeedPostCardCaptionProps = {
+  caption: string;
+  isDetail: boolean;
+  fillHeight: boolean;
+  /** Trieda pevného bloku pružného stĺpca: `shrink-0` pri `fillHeight`, inak prázdny reťazec. */
+  fixedBlock: string;
+  /** Ťuk na samotný text (mobilná karta ním otvára detail). */
+  onTextClick: (() => void) | undefined;
+};
+
+export default function FeedPostCardCaption({
+  caption,
+  isDetail,
+  fillHeight,
+  fixedBlock,
+  onTextClick,
+}: FeedPostCardCaptionProps) {
+  const textOnlySplit = useFeedDetailTextOnly();
+
+  return (
+    <div
+      className={`px-4 py-3 ${
+        textOnlySplit
+          ? 'subtle-scrollbar min-h-0 flex-1 overflow-y-auto'
+          : fixedBlock
+      }`}
+    >
+      <FeedPostCaption
+        text={caption}
+        boundedExpansion={isDetail}
+        expansionBound={fillHeight ? 'roomy' : 'compact'}
+        maxLines={
+          isDetail
+            ? textOnlySplit
+              ? 0
+              : DETAIL_CAPTION_LINES
+            : CARD_CAPTION_LINES
+        }
+        collapseBlankLines
+        onTextClick={onTextClick}
+      />
+    </div>
+  );
+}
diff --git a/frontend/src/components/dashboard/modules/feed/FeedPostDetailOverlay.tsx b/frontend/src/components/dashboard/modules/feed/FeedPostDetailOverlay.tsx
--- a/frontend/src/components/dashboard/modules/feed/FeedPostDetailOverlay.tsx
+++ b/frontend/src/components/dashboard/modules/feed/FeedPostDetailOverlay.tsx
@@ -7,16 +7,17 @@
  * neodmountuje: appka sa nenaviguje, len sa navrch vykreslí portál. Po zavretí
  * je teda používateľ presne tam, kde bol, vrátane pozície scrollu.
  *
- * Rozloženie má dva tvary podľa toho, čo je v príspevku hlavný obsah:
+ * Rozloženie má dva tvary podľa šírky obrazovky:
  *
- *  - S FOTKOU, PONUKOU ALEBO PORTFÓLIOM: dva stĺpce vedľa seba
- *    (`FeedPostDetailSplitLayout`) – vľavo hlavička, text, fotka alebo karta
- *    a akcie, vpravo výhradne komentáre. Okno je široké 54 rem (864 px).
- *  - BEZ NICH (text, repost textového príspevku): pôvodné jednostĺpcové
- *    rozloženie v užšom okne (36 rem, 576 px) – pevný blok (hlavička, text,
- *    akcie) sa nikdy nescrolluje a komentáre dostanú všetok zvyšný priestor.
- *    Úzke je aj okno pri načítaní a pri chybe: príspevok ešte nepoznáme a
- *    textový príspevok sa tak po načítaní nehýbe (R63).
+ *  - NA POČÍTAČI (od 1 024 px): dva stĺpce vedľa seba (`FeedPostDetailSplitLayout`) pri KAŽDOM príspevku –
+ *    vľavo hlavička, text, fotka alebo karta a akcie, vpravo výhradne komentáre. Okno je široké 54 rem (864 px).
+ *    Pri fotke, ponuke a portfóliu má pevnú výšku 95 % obrazovky (pružná je fotka alebo karta); príspevok len
+ *    s textom (aj repost textového príspevku) nemá nič pružné, preto má výšku podľa obsahu (najmenej 20 rem,
+ *    najviac 95 % obrazovky) a text sa ukáže celý (R73).
+ *  - POD 1 024 px (zúžené okno prehliadača): pôvodné jednostĺpcové rozloženie – pevný blok (hlavička, text,
+ *    akcie) sa nikdy nescrolluje a komentáre dostanú všetok zvyšný priestor. Šírku určuje obsah: 864 px pri
+ *    fotke, ponuke a portfóliu, 576 px (36 rem) pri texte; úzke je aj okno pri načítaní a pri chybe, takže sa
+ *    textový príspevok po načítaní nehýbe (R63).
  *    Robí to `flex` stĺpec s `min-h-0` na komentárovej časti – bez toho by ju
  *    obsah roztiahol a okno by prerástlo obrazovku (flex položka má
  *    predvolene `min-height: auto`).
@@ -202,11 +203,8 @@
   const liveImages = usePendingFeedImages(post);
 
   /**
-   * Dvojstĺpcové rozloženie potrebuje DVE veci naraz:
-   *
-   *  - fotku alebo kartu ponuky či portfólia (jediná časť, ktorá vie pohltiť zvyšok výšky ľavého stĺpca),
-   *  - a dosť širokú obrazovku, inak by z dvoch stĺpcov ostali dva nepoužiteľne
-   *    úzke pruhy.
+   * Dvojstĺpcové rozloženie potrebuje dosť širokú obrazovku, inak by z dvoch stĺpcov ostali dva nepoužiteľne
+   * úzke pruhy (R73: obsah príspevku ho už nepodmieňuje).
    *
    * Hranicu určuje `useIsMobile` – tá istá, akou sa rozhoduje, či sa okno
    * vôbec otvorí namiesto celoobrazovkovej stránky (`decideFeedPostEntry`),
@@ -230,14 +228,19 @@
   /** Zdieľaná ponuka alebo portfólio: karta je hlavný obsah okna ako fotka (R53). */
   const sharesCard = sharesOfferOrPortfolio(post);
   /**
-   * Široké okno (864 px) majú príspevky s fotkou, ponukou a portfóliom, všetky ostatné užšie (576 px).
+   * Široké okno (864 px): na počítači každý príspevok, pod 1 024 px len príspevok s fotkou, ponukou a portfóliom
+   * (ostatné majú 576 px).
    *
-   * Kým sa príspevok načítava, je okno vždy úzke, aj keď `post` ešte drží PREDOŠLÝ príspevok (pri prepnutí na iný
-   * príspevok sa okno neodmountuje, viď `loadSeqRef`): kostra nesmie dediť rozmery príspevku, ktorý už nie je na
-   * obrazovke. Po načítaní sa šírka aj rozloženie určia podľa nového príspevku; pri chybe je `post` `null`.
+   * Pod 1 024 px je kým sa príspevok načítava okno vždy úzke, aj keď `post` ešte drží PREDOŠLÝ príspevok (pri
+   * prepnutí na iný príspevok sa okno neodmountuje, viď `loadSeqRef`): kostra nesmie dediť rozmery príspevku, ktorý
+   * už nie je na obrazovke. Na počítači je široké hneď, takže sa po načítaní nehýbe žiadny druh príspevku. Pri
+   * chybe je `post` `null`.
    */
-  const wideContent = !loading && (hasPhoto || sharesCard);
-  const splitLayout = wideContent && !isMobile;
+  const wideContent = !isMobile || (!loading && (hasPhoto || sharesCard));
+  /** Dva stĺpce: na počítači po načítaní každý príspevok. */
+  const splitLayout = !isMobile && !loading && post !== null;
+  /** Príspevok len s textom (aj repost textového príspevku): nič pružné, preto výška podľa obsahu a text celý. */
+  const textOnlySplit = splitLayout && !hasPhoto && !sharesCard;
   /**
    * Vypĺňa zdieľaný náhľad zvyšok jednostĺpcového bloku?
    *
@@ -266,10 +269,11 @@
         aria-label={t('feed.postDetail', 'Detail príspevku')}
         data-testid="feed-post-overlay"
         // Rozmery: šírku určuje obsah. Široké okno (`max-w-[54rem]`, 864 px, o ~29 %
-        // viac než pôvodných `max-w-2xl`, 672 px) majú príspevky s fotkou, ponukou
-        // a portfóliom; text, repost textového príspevku, kostra a chyba pri
-        // načítaní majú užšie (`max-w-xl`, 576 px; R53 a R63). Pod hranicou lg
-        // ostáva šírka podľa obsahu, mení sa len rozloženie. Výška je len STROP:
+        // viac než pôvodných `max-w-2xl`, 672 px) má na počítači každý príspevok;
+        // pod hranicou lg ju majú len príspevky s fotkou, ponukou a portfóliom,
+        // text, repost textového príspevku, kostra a chyba pri načítaní majú užšie
+        // (`max-w-xl`, 576 px; R53 a R63). Pod hranicou lg ostáva šírka podľa obsahu,
+        // mení sa len rozloženie. Výška je pri jednom stĺpci a pri texte len STROP:
         // krátky príspevok drží okno nízke, dlhý ho natiahne až po `95vh`.
         //
         // Prečo práve 95vh: ostávajú 2,5 % viewportu hore aj dole, takže je
@@ -282,11 +286,14 @@
         //
         // Pri dvojstĺpcovom rozložení je výška PEVNÁ (`h-[95vh]`, nie strop):
         // pružná fotka v ľavom stĺpci má `flex-1`, ktoré potrebuje definitívnu
-        // výšku rodiča – zo `max-h` by vyšla nula. Text-only príspevok ostáva
-        // pri strope, aby krátky príspevok držal okno nízke.
+        // výšku rodiča – zo `max-h` by vyšla nula. Príspevok len s textom nemá
+        // čo pružné, preto ostáva pri strope a drží okno nízke (najmenej 20 rem,
+        // aby ani krátky text s jedným komentárom nevyzeral stlačený; R73).
         className={`relative flex w-full flex-col overflow-hidden rounded-none border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-[#0f0f10] sm:rounded-2xl ${
           wideContent ? 'max-w-[54rem]' : 'max-w-xl'
-        } ${splitLayout ? 'h-[95vh]' : 'max-h-[95vh]'}`}
+        } ${splitLayout && !textOnlySplit ? 'h-[95vh]' : 'max-h-[95vh]'} ${
+          textOnlySplit ? 'min-h-[20rem]' : ''
+        }`}
         onClick={(event) => event.stopPropagation()}
       >
         <button
@@ -337,6 +344,7 @@
               }
               onCommentsTotalChange={publishCommentsCount}
               commentDraft={commentDraft}
+              textOnly={textOnlySplit}
             />
           ) : (
           <>
@@ -389,7 +397,7 @@
 
             {/* Jediná scrollovateľná časť za bežných okolností. `min-h`
                 plní dve úlohy naraz: ruší automatické minimum flex položky
-                (inak by ju obsah roztiahol a okno by prerástlo `max-h-[90vh]`)
+                (inak by ju obsah roztiahol a okno by prerástlo `max-h-[95vh]`)
                 a zároveň drží komentárom podlahu, aby ich pevný blok nad nimi
                 nikdy nestlačil na nulu. `flex-col` a `flexFill` odovzdávajú
                 výšku zoznamu komentárov flexom, lebo percentuálna výška
diff --git a/frontend/src/components/dashboard/modules/feed/FeedPostDetailSplitLayout.tsx b/frontend/src/components/dashboard/modules/feed/FeedPostDetailSplitLayout.tsx
--- a/frontend/src/components/dashboard/modules/feed/FeedPostDetailSplitLayout.tsx
+++ b/frontend/src/components/dashboard/modules/feed/FeedPostDetailSplitLayout.tsx
@@ -1,11 +1,13 @@
 'use client';
 
 /**
- * Dvojstĺpcové rozloženie okna detailu – pre príspevok s fotkou a pre zdieľanú ponuku alebo portfólio (R53).
+ * Dvojstĺpcové rozloženie okna detailu na počítači – pre príspevok s fotkou, pre zdieľanú ponuku alebo portfólio
+ * (R53) a od R73 aj pre príspevok len s textom (aj repost textového príspevku).
  *
- * Text-only príspevok (aj repost textového príspevku) ostáva na pôvodnom jednostĺpcovom rozložení priamo vo
- * `FeedPostDetailOverlay`: bez fotky ani karty by pravý stĺpec nemal čo vyvážiť a v ľavom by nebolo nič
- * pružné, čo by pohltilo zvyšok výšky. Pri ponuke a portfóliu je pružný zdieľaný blok s kartou.
+ * Príspevok len s textom (`textOnly`) nemá nič pružné, čo by pohltilo výšku: okno má výšku podľa obsahu (strop
+ * `95vh` a najmenej `20rem` rieši `FeedPostDetailOverlay`), text sa ukáže celý a posúva sa len on vo vlastnom
+ * rámiku, keď sa nezmestí (viď `FeedDetailTextOnlyContext`). Komentáre idú flexom (`flexFill`), lebo percentuálna
+ * výška sa v okne bez pevnej výšky nevyhodnotí (nález 363).
  *
  *   ĽAVÝ (56 %)                      PRAVÝ (44 %)
  *   ─────────────────────────        ─────────────────────
@@ -47,6 +49,7 @@
 import { useLanguage } from '@/contexts/LanguageContext';
 import type { FeedPost, FeedPostImage } from '@/lib/feedApi';
 import { FeedDetailSplitProvider } from './FeedDetailSplitContext';
+import { FeedDetailTextOnlyProvider } from './FeedDetailTextOnlyContext';
 import FeedPostCard from './FeedPostCard';
 import FeedPostComments from './FeedPostComments';
 import type { FeedCommentDraft } from './FeedPostComments.types';
@@ -97,6 +100,8 @@
   onCommentsTotalChange: (total: number) => void;
   /** Rozpracovaný komentár drží okno: pri prepnutí rozloženia sa komentáre odmountujú (viď `draft`). */
   commentDraft?: FeedCommentDraft;
+  /** Príspevok len s textom (aj repost textového príspevku): text sa ukáže celý a okno má výšku podľa obsahu. */
+  textOnly?: boolean;
 };
 
 export default function FeedPostDetailSplitLayout({
@@ -109,6 +114,7 @@
   onCommentsCountChange,
   onCommentsTotalChange,
   commentDraft,
+  textOnly = false,
 }: FeedPostDetailSplitLayoutProps) {
   const { t } = useLanguage();
 
@@ -124,15 +130,17 @@
       >
         {/* Pevná výška stĺpca dovoľuje pružnú plochu karty ponuky a portfólia (viď `FeedDetailSplitContext`). */}
         <FeedDetailSplitProvider value>
-          <FeedPostCard
-            post={post}
-            variant="detail"
-            fillHeight
-            liveImages={liveImages}
-            commentsCount={commentsCount}
-            onDeleted={onDeleted}
-            onPostUpdated={onPostUpdated}
-          />
+          <FeedDetailTextOnlyProvider value={textOnly}>
+            <FeedPostCard
+              post={post}
+              variant="detail"
+              fillHeight
+              liveImages={liveImages}
+              commentsCount={commentsCount}
+              onDeleted={onDeleted}
+              onPostUpdated={onPostUpdated}
+            />
+          </FeedDetailTextOnlyProvider>
         </FeedDetailSplitProvider>
       </div>
 
@@ -149,11 +157,12 @@
         </h2>
         {/* `min-h-0` ruší automatické minimum flex položky – bez neho by zoznam
             komentárov stĺpec roztiahol a okno by prerástlo obrazovku. */}
-        <div className="min-h-0 flex-1">
+        <div className={`min-h-0 flex-1${textOnly ? ' flex flex-col' : ''}`}>
           <FeedPostComments
             postId={post.id}
             highlightCommentId={highlightCommentId}
             fillHeight
+            flexFill={textOnly}
             draft={commentDraft}
             onCountChange={onCommentsCountChange}
             onTotalChange={onCommentsTotalChange}
diff --git a/frontend/src/components/dashboard/modules/feed/FeedPostSharedBlock.tsx b/frontend/src/components/dashboard/modules/feed/FeedPostSharedBlock.tsx
--- a/frontend/src/components/dashboard/modules/feed/FeedPostSharedBlock.tsx
+++ b/frontend/src/components/dashboard/modules/feed/FeedPostSharedBlock.tsx
@@ -22,6 +22,7 @@
   DETAIL_CAPTION_LINES,
 } from './FeedPostCaption';
 import { useFeedDetailSplit } from './FeedDetailSplitContext';
+import { useFeedDetailTextOnly } from './FeedDetailTextOnlyContext';
 import SharedContentPreviewCard from './SharedContentPreviewCard';
 import { sharedContentCardFromPost } from './sharedContentCard';
 import type { FeedPost, FeedTaggedUser } from '@/lib/feedApi';
@@ -70,6 +71,8 @@
 }: FeedPostSharedBlockProps) {
   // Pružná plocha fotky ide len do ľavého stĺpca dvojstĺpcového okna (pevná výška); jednostĺpcové okno ju nemá.
   const inSplitColumn = useFeedDetailSplit();
+  // Okno príspevku len s textom (R73): texty sa ukážu celé; blok je pružný len vtedy, keď nesie zdieľaný obsah.
+  const textOnly = useFeedDetailTextOnly();
   if (!(isShared || taggedUsers.length)) return null;
 
   // Text autora zdieľania – v okne ide nad náhľad, na karte pod neho.
@@ -80,13 +83,15 @@
         boundedExpansion={isDetail}
         expansionBound={fillHeight ? 'roomy' : 'compact'}
         maxLines={
-          isDetail
-            ? fillHeight && inSplitColumn
-              ? SPLIT_SHARED_CAPTION_LINES
-              : DETAIL_CAPTION_LINES
-            : CARD_CAPTION_LINES
+          textOnly
+            ? 0
+            : isDetail
+              ? fillHeight && inSplitColumn
+                ? SPLIT_SHARED_CAPTION_LINES
+                : DETAIL_CAPTION_LINES
+              : CARD_CAPTION_LINES
         }
-        fillParent={fillHeight && inSplitColumn}
+        fillParent={fillHeight && inSplitColumn && !textOnly}
         collapseBlankLines
         onTextClick={
           opensMobileDetail ? () => setMobileDetailOpen(true) : undefined
@@ -94,9 +99,12 @@
       />
     ) : null;
 
+  // Pružný je blok v okne so zdieľaným obsahom; samotní označení (voľný príspevok len s textom) nesúperia s textom o miesto.
+  const flexible = fillHeight && !(textOnly && !isShared);
+
   return (
     <div
-      className={`${fillHeight && inSplitColumn ? 'gap-3' : 'space-y-3'} px-4 py-3 ${
+      className={`${flexible && inSplitColumn ? 'gap-3' : 'space-y-3'} px-4 py-3 ${
         // V okne detailu je náhľad JEDINÁ pružná časť stĺpca: keď sa
         // nezmestí, scrolluje sa on, nie karta. Bez toho by sa pri vyššom
         // náhľade (ponuka s fotkou) rozhýbala aj hlavička a riadok akcií –
@@ -105,7 +113,7 @@
         // Zdieľaný príspevok a vlastné fotky sa nikdy nestretnú (backend
         // posiela `images` len pri `free_post`), takže o `flex-1` tu nie je
         // s čím súperiť.
-        fillHeight
+        flexible
           ? `subtle-scrollbar min-h-0 flex-1 overflow-y-auto${
               inSplitColumn ? ' flex flex-col' : ''
             }`
diff --git a/frontend/src/components/dashboard/modules/feed/SharedContentPreviewCard.tsx b/frontend/src/components/dashboard/modules/feed/SharedContentPreviewCard.tsx
--- a/frontend/src/components/dashboard/modules/feed/SharedContentPreviewCard.tsx
+++ b/frontend/src/components/dashboard/modules/feed/SharedContentPreviewCard.tsx
@@ -28,6 +28,7 @@
  */
 
 import { useState, type ReactNode } from 'react';
+import { useFeedDetailTextOnly } from './FeedDetailTextOnlyContext';
 import FeedPostCaption, { CARD_CAPTION_LINES } from './FeedPostCaption';
 import InitialsAvatar from '@/components/shared/InitialsAvatar';
 import { useLanguage } from '@/contexts/LanguageContext';
@@ -149,6 +150,8 @@
   // Adresa náhľadu, ktorú sa nepodarilo načítať. Porovnáva sa s aktuálnou adresou, takže karta, ktorej sa náhľad
   // zmení na inú fotku, chybu nezdedí.
   const [failedThumbnail, setFailedThumbnail] = useState<string | null>(null);
+  // Okno príspevku len s textom (R73): aj pôvodný text reposta sa ukáže celý.
+  const textOnly = useFeedDetailTextOnly();
   if (!data) return null;
 
   const isPost = data.type === 'feed_post';
@@ -261,7 +264,7 @@
     <FeedPostCaption
       text={caption}
       testId="feed-shared-caption"
-      maxLines={CARD_CAPTION_LINES}
+      maxLines={textOnly ? 0 : CARD_CAPTION_LINES}
       boundedExpansion={flatten}
       fillParent={flatten}
       collapseBlankLines
```

## 4. Existujúce testy, ktoré prototyp zhodil

Jest nad priečinkom `feed` (110 sád, 1 278 testov; `main` aj prototyp majú rovnaký počet, pribudnúť majú nové súbory kolegu). Po kroku 1 padajú 4 testy v 4 súboroch, po kroku 2 6 testov v 6 súboroch a po kroku 3 **34 testov v 12 súboroch**; `tsc` aj ESLint sú po každom kroku čisté. Všetky padajúce testy stráži staré správanie a **majú padnúť**; test, ktorý by padol mimo tohto zoznamu, je chyba kroku, nie testu (ak taký nájdeš, zastav sa a napíš to do commitu). Súbory nad 500 riadkov (`FeedPostDetailOverlay.test.tsx` 803, `FeedPhotoViewer.test.tsx` 609, `FeedPostDetailSplitLayout.test.tsx` 596, `FeedPostMobileDetail.test.tsx` 695) sa podľa R27 menia len málo (úprava očakávania alebo mocku), nové testy idú do nových súborov.

**Všeobecné pravidlo pre krok 3:** na počítači (od 1 024 px) je teraz dvojstĺpcové okno pri každom príspevku, jednostĺpcové ostáva len **pod 1 024 px** (v testoch `mockIsMobile = true`). Test, ktorý overuje jednostĺpcové okno s textovým príspevkom (576 px, pevný blok `feed-post-overlay-fixed`, „Viac“ v okne, strop `max-h-[25vh]`), preto dostane `mockIsMobile = true` (rovnako ako v K57 testy ponuky a portfólia) a jeho očakávanie ostane; test, ktorý tvrdí, že text na počítači má jednostĺpcové okno, sa prepíše na dvojstĺpcové.

| Krok | Súbor (riadkov) | Test | Prečo padá | Zmena |
|---|---|---|---|---|
| 1 | `FeedPostDetailOverlay.test.tsx` (803) | `obsah okna keeps the actions and comments reachable with a long caption expanded` | očakáva `max-h-[25vh]` (po kroku 3 navyše text na počítači nemá „Viac“) | `mockIsMobile = true` (jednostĺpcové okno, kde „Viac“ ostáva) a očakávať `max-h-[max(25vh,14rem)]` |
| 1 | `FeedPostMobileDetail.test.tsx` (695) | `text príspevku clamps to five lines and expands in the normal document flow` | detail na mobile má 10 riadkov | `line-clamp-[10]`, názov testu na „desať riadkov“ |
| 1 | `FeedPostDetailSplitLayout.test.tsx` (596) | `rozpočet výšky ľavého stĺpca gives the split layout more room for text than the single-column one` | pomocná funkcia `vhOf` číta z triedy len `NNvh`; strop `compact` je teraz `max-h-[max(25vh,14rem)]` | funkcia nech prečíta aj `max(25vh,14rem)` (porovnanie ostáva: dvojstĺpcové okno 40vh je vyššie než jednostĺpcové 25vh) |
| 1 | `FeedPhotoViewer.test.tsx` (609) | `otvorenie prehliadača clamps the caption to two lines with a Viac toggle` | prehliadač fotky používa `FeedPostCaption`: `line-clamp-3`, prepínač `feed-photo-viewer-caption-toggle` len pri presahu, „Menej“ | prepísať na 3 riadky a nový prepínač; presah simulovať výškami `scrollHeight` a `clientHeight` ako testy `FeedPostCaption.test.tsx` |
| 2 | `FeedPostDetailOverlay.offerPortfolioSplit.test.tsx` (347) | `zdieľaný príspevok s fotkou má plochu fotky 256 px` | repost s fotkou má pružnú plochu | očakávať `min-h-32 flex-1` bez `h-64` |
| 2 | `SharedContentPreviewCard.fillHeight.test.tsx` (121) | `zdieľaný príspevok ignoruje fillHeight: fotka ostáva 256 px a nič sa neobaľuje` | zdieľaný príspevok S fotkou je so `fillHeight` pružný | rozdeliť: s fotkou pružná plocha, obal karty a rám `contents`; bez fotky (alebo so zlyhaným náhľadom) `fillHeight` ignoruje a nič sa neobaľuje |
| 3 | `FeedPostDetailOverlay.test.tsx` | `zdielany obsah v jednostlpcovom okne leaves a free post on the original safety-valve behaviour` | textový príspevok na počítači nemá `feed-post-overlay-fixed` | `mockIsMobile = true` |
| 3 | `FeedPostDetailOverlay.test.tsx` | `obsah okna shows the fixed block in order and the comments below it` | to isté | `mockIsMobile = true` |
| 3 | `FeedPostDetailOverlay.test.tsx` | `obsah okna keeps both the post menu and the close button reachable` | to isté | `mockIsMobile = true` |
| 3 | `FeedPostDetailOverlay.test.tsx` | `obsah okna keeps the window inside the screen and scrolls only the comments` | očakáva jednostĺpcové okno | `mockIsMobile = true` |
| 3 | `FeedPostDetailOverlay.test.tsx` | `obsah okna lets the keyboard reach the scrollable expanded caption` | text na počítači nemá „Viac“ | `mockIsMobile = true` |
| 3 | `FeedPostDetailOverlay.test.tsx` | `rozmery okna príspevok len s textom má užšie okno než príspevok s fotkou` | na počítači je okno 864 px | prepísať: na počítači `max-w-[54rem]`, `max-h-[95vh]` a `min-h-[20rem]`, bez `h-[95vh]`; užšie okno (`max-w-xl`) platí pod 1 024 px (`mockIsMobile = true`) |
| 3 | `FeedPostDetailOverlay.test.tsx` | `rozmery okna lets the height grow with the content instead of fixing it` | text na počítači má `min-h-[20rem]` | `mockIsMobile = true` (jednostĺpcové okno ostáva bez `h-[` a `min-h-[`); výška na počítači patrí do nového súboru |
| 3 | `FeedPostDetailOverlay.test.tsx` | `text v okne detailu shows about ten lines before the toggle, not three` | text na počítači je celý, bez orezania | `mockIsMobile = true` |
| 3 | `FeedPostDetailSplitLayout.test.tsx` | `kedy sa rozloženie zapína keeps a text-only post on the untouched single-column layout` | text na počítači je dvojstĺpcový | na počítači dvojstĺpcové (`feed-post-overlay-split` je); jednostĺpcové pod 1 024 px |
| 3 | `FeedPostDetailOverlay.offerPortfolioSplit.test.tsx` | `zdieľaný príspevok bez fotky ostáva v jednostĺpcovom rozložení` | repost textu je na počítači dvojstĺpcový | dvojstĺpcový na počítači, jednostĺpcový pod 1 024 px |
| 3 | `FeedPostDetailOverlay.livePhotos.test.tsx` | `rozloženie sa prepína podľa živého stavu fotiek switches to the single-column layout when the last photo is rejected` | po zamietnutí poslednej fotky ostáva na počítači dvojstĺpcové okno (text) | očakávať, že `feed-post-overlay-split` ostane a karta prejde na text celý (`feed-post-caption` bez `line-clamp`) |
| 3 | `FeedRepostPhoto.test.tsx` | `desktopové okno detailu keeps the single column for a reposted text post` | repost textu je na počítači dvojstĺpcový | dvojstĺpcový na počítači |
| 3 | `FeedPostDetailOverlay.narrowWindow.test.tsx` (326) | šesť testov: `príspevok len s textom: úzke okno so stropom výšky`, `repost textového príspevku: úzke okno`, `kostra pri načítaní je v úzkom okne`, `okno s chybou načítania je v úzkom okne`, `textový príspevok sa po načítaní z kostry nehýbe`, `ponuka sa po načítaní z úzkej kostry rozšíri na široké okno` | na počítači je okno aj pri kostre a chybe 864 px | celý súbor beží pod 1 024 px (`mockIsMobile = true` v `beforeEach`), kde tvrdenia platia; názvy upraviť na „pod 1 024 px“ |
| 3 | `FeedPostDetailOverlay.commentsColumn.test.tsx` (312) | tri testy: `príspevok len s textom: pevný blok má poistku s posúvaním a strop`, `repost textového príspevku: pevný blok je flex stĺpec, nezmenšuje sa a má strop`, `sekcia komentárov je flex stĺpec a zoznam v nej sa zmenšuje cez flex` | text na počítači nemá pevný blok | tie isté tri testy s `mockIsMobile = true` |
| 3 | `FeedPostDetailOverlay.switchPost.test.tsx` (303) | šesť testov (`kostra pri načítaní po prepnutí z príspevku (príspevok s fotkou)`, `… (ponuka)`, `… z textového príspevku`, `po načítaní príspevok s fotkou: okno sa z úzkej kostry rozšíri na široké s pevnou výškou`, `po načítaní textový príspevok: okno ostane úzke aj po načítaní`, `po načítaní chyba pri načítaní nového príspevku: okno s chybou je úzke`) | kostra a text na počítači sú široké | beh pod 1 024 px (`mockIsMobile = true`), kde tvrdenia platia |
| 3 | `FeedPostDetailOverlay.commentDraftLive.test.tsx` (192) | `okno detailu: rozpracovaný komentár a zamietnutie fotky počas písania text ostane v poli, keď okno prejde z dvoch stĺpcov na jeden` | zamietnutie poslednej fotky na počítači rozloženie nemení | zmenu rozloženia vyvolať zúžením okna prehliadača (`mockIsMobile` z `false` na `true` a nový render), zamietnutie fotky nechať ako samostatný prípad bez zmeny rozloženia |

Súhrn: po kroku 3 padá 34 testov: 6 z krokov 1 a 2 (padajú ďalej; dva z nich, v `FeedPostDetailOverlay.test.tsx` a `FeedPostDetailSplitLayout.test.tsx`, po kroku 3 padajú aj z druhého dôvodu) a 28 nových v kroku 3 (osem v `FeedPostDetailOverlay.test.tsx`, po jednom v `FeedPostDetailSplitLayout.test.tsx`, `FeedPostDetailOverlay.offerPortfolioSplit.test.tsx`, `FeedPostDetailOverlay.livePhotos.test.tsx`, `FeedRepostPhoto.test.tsx` a `FeedPostDetailOverlay.commentDraftLive.test.tsx`, šesť v `FeedPostDetailOverlay.narrowWindow.test.tsx`, tri v `FeedPostDetailOverlay.commentsColumn.test.tsx` a šesť v `FeedPostDetailOverlay.switchPost.test.tsx`).

## 5. Namerané hodnoty v Chromiu (prototyp, dvojstĺpcové okno 864 px)

Výšky sú výšky obrazovky (okno má 95 %). „Dnes“ je `main`, „Po“ je prototyp po kroku, ktorý sa týka scény. „Preteká“ = o koľko px sa posúva blok s textom a kartou (pri `main` posuvný `overflow-y-auto`; 0 = nič sa neposúva).

**Ponuka a portfólio, text s 15 riadkami nad kartou:**

| Výška obrazovky | 600 | 650 | 720 | 800 |
|---|---|---|---|---|
| Dnes, zbalený text: plocha / preteká | 128 / 80 | 128 / 32 | – | 239 / 0 |
| Dnes, rozbalený text: plocha / preteká | 128 / 120 | 128 / 92 | – | 139 / 0 |
| Po, zbalený text (5 riadkov): plocha / preteká | 149 / 0 | 196 / 0 | 263 / 0 | 339 / 0 |
| Po, rozbalený text: plocha / vidno riadkov / preteká | 128 / 6,1 / 0 | 128 / 8,4 / 0 | 128 / 11,8 / 0 | 139 / 15 / 0 |

**Repost s fotkou** (text zdieľajúceho aj pôvodný text majú 15 riadkov, ak nie je uvedené inak):

| Výška obrazovky | 600 | 650 | 720 | 800 | 950 |
|---|---|---|---|---|---|
| Dnes, zbalené (fotka pevných 256 px): preteká | 247 | 199 | 133 | 57 | 0 |
| Dnes, rozbalený text zdieľajúceho: preteká | 287 | 259 | 221 | 157 | 14 |
| Po, zbalené: plocha / preteká | 128 / 45 | 131 / 0 | 197 / 0 | 273 / 0 | 416 / 0 |
| Po, rozbalený text zdieľajúceho: plocha / vidno riadkov / preteká | 128 / 5 / 45 | 128 / 5,2 / 0 | 128 / 8,5 / 0 | 128 / 12,3 / 0 | 216 / 15 / 0 |
| Po, rozbalený pôvodný text: plocha / vidno riadkov / preteká | 128 / 5 / 85 | 128 / 5 / 37 | 128 / 6,5 / 0 | 128 / 10,3 / 0 | 176 / 15 / 0 |
| Po, rozbalené oba texty: plocha / preteká | 128 / 84 | 128 / 36 | 128 / 0 | 128 / 0 | 128 / 0 |
| Po, bežný repost (krátky text zdieľajúceho, dlhý pôvodný), zbalený: plocha / preteká | 201 / 0 | 249 / 0 | 315 / 0 | 391 / 0 | 534 / 0 |
| Po, bežný repost, rozbalený pôvodný text: plocha / vidno riadkov / preteká | 128 / 6,7 / 0 | 128 / 9,1 / 0 | 128 / 12,4 / 0 | 151 / 15 / 0 | 294 / 15 / 0 |
| Po, krátke texty oboch: plocha | 279 | 327 | 393 | 469 | 612 |

Posúvanie bloku ostáva len ako poistka v krajných prípadoch: dva dlhé texty naraz (zbalené alebo rozbalené) pri výške obrazovky do 650 px (najviac 85 px pri 600 px); od 720 px sa pri reposte neposúva nič. Bežný repost (krátky text zdieľajúceho) sa neposúva ani pri 600 px.

**Okno len s textom (krok 3), dvojstĺpcové, výška okna podľa obsahu:** bez komentárov (text s 460 znakmi) 320 px (`min-h-[20rem]`); krátky text a 3 komentáre 547 px; repost textu a 3 komentáre 555 px; 28 riadkov textu a 3 komentáre 711 px pri výške obrazovky 800 px (text sa zmestí bez posúvania); text s 15 riadkami a 14 komentárov na obrazovke 650 px: okno 95 % výšky obrazovky (618 px), všetko sa zmestí, komentáre sa posúvajú a pole „Napíš komentár“ je v okne; najdlhší text (28 riadkov) na obrazovke 650 px: okno 95 %, text sa posúva vo vlastnej časti ľavého stĺpca (24 riadkov vidno) a hlavička s riadkom akcií stoja. Blok s označenými pri texte má prirodzenú výšku: 44 px pri troch štítkoch a 70 px pri štyroch (dva riadky).

## 6. Zhoda s doterajším vzhľadom (pixel po pixeli)

Okná, ktoré sa podľa karty **nemajú zmeniť oproti schválenému vzhľadu** (obrázky, ktoré majiteľ videl, sú z prototypu bez kroku 3 a bez zmien reposta), sa vykreslili v prototype po kroku 3 a v schválenom prototype a porovnali sa v Chromiu (výšky obrazovky 650 a 800 px, 20 snímok: príspevok s fotkou zbalený a rozbalený s textom s 15 riadkami, s krátkym textom a s troma označenými, ponuka zbalená, rozbalená, bez fotky a s krátkym textom, portfólio zbalené a rozbalené): **18 snímok je rovnakých pixel po pixeli, 2 sa líšia do 1 px** (`okno_portfolio_15_zbalene` pri 800 px o 1 px riadok mena pôvodného autora; `okno_foto_15_rozbalene` pri 800 px v oblasti ikony emoji v poli na komentár, kde sa nič nemení). Z kontroly vyplýva, že zmena `space-y-3` na `gap-3` v ľavom stĺpci a presun textu do `FeedPostCardCaption.tsx` nezmenili vzhľad.

## 7. Poznámky k návrhu

- **Prečo sa pri reposte s fotkou „rozpúšťa“ obal karty (`display: contents`).** Pružné zmenšovanie funguje len medzi priamymi súrodencami jedného flex stĺpca. Obal karty a rám príspevku sú vnorené flex kontajnery a ich automatické minimum (`min-height: auto`) je celý obsah, takže rozbalený pôvodný text v nich neustúpi a posúva sa celý blok. Prvá verzia prototypu (pružná plocha fotky a `fillParent` pri pôvodnom texte, obal a rám ostali) nestačila: rozbalený pôvodný text ostal celý (15 z 15 riadkov) a blok pretekal o 277 px pri 600 px. `min-h-0` na obale a ráme sa neskúšalo: z úvahy by obal prišiel o podlahu (plocha fotky najmenej 128 px, text najmenej päť riadkov), takže by text zdieľajúceho karte neustúpil. `display: contents` na obale a ráme (len pri reposte s fotkou, `flatten`) urobí z textu zdieľajúceho, mena pôvodného autora, pôvodného textu a plochy fotky súrodencov v bloku a medzery medzi nimi dáva `gap-3` bloku (pôvodné `space-y-3` by sa na rozpustenom obale stratilo). Karta ponuky a portfólia ostáva vnorená (jej plocha je jediný pružný prvok a text nad ňou ustupuje cez blok).
- **Prečo `FeedPostCardCaption.tsx`.** Text voľného príspevku je v `FeedPostCard.tsx` obalený blokom `px-4 py-3` s `fixedBlock`. Pre okno len s textom musí byť obal pružný (`min-h-0 flex-1 overflow-y-auto`) a text bez orezania. Priame zmeny v karte (import, hák, trieda, výraz) ju v prototype dostali na 504 riadkov; presunom bloku sa skráti na 492. Presun sa dá urobiť ako samostatný commit bez zmeny správania (karta krok 3a).
- **Prečo `flexible` v `FeedPostSharedBlock.tsx`.** Blok s označenými má pri `fillHeight` triedu `flex-1`; vedľa pružného textu (krok 3) by si bral polovicu voľného miesta. Pri príspevku len s textom a bez zdieľaného obsahu je preto blok prirodzenej výšky. **Rovnaký problém má príspevok s fotkou a označenými už na `main` (nález 368, merania v texte nálezu); K58 ho nerieši**, lebo mení vzhľad (fotka sa zväčší) a čaká na schválenie majiteľa (R49).
- **`textOnly` ide kontextom, nie vlastnosťou karty** (rovnako ako `useFeedDetailSplit` v K57): `FeedPostCard.tsx` nesmie rásť. Kontext je `true` len v ľavom stĺpci okna len s textom.
- **Kde platí pravidlo piatich riadkov:** `SPLIT_SHARED_CAPTION_LINES = 5` (krok 2) sa týka len textu zdieľajúceho v ľavom stĺpci dvojstĺpcového okna pri zdieľanom obsahu; mimo neho (feed, dialóg zdieľania, jednostĺpcové okno pod 1 024 px) ostáva 10 riadkov v detaile a 3 v náhľade. Pôvodný text reposta má všade 3 riadky.
- **Súbory mimo karty, ktoré sa nemenia:** `FeedPostActions.tsx`, `FeedPostCardHeader.tsx`, `FeedPostComments.tsx` (okrem toho, že dostane `flexFill` od `FeedPostDetailSplitLayout.tsx`, čo už od K57 vie), `FeedPostMobileDetail.tsx`, `FeedPhotoCommentsSheet.tsx`, `ImageLightbox.tsx`, `frontend/e2e/**`.
