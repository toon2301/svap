'use client';

/**
 * Obsah mobilnej obrazovky detailu príspevku nad komentármi: text príspevku, fotka alebo zdieľaný náhľad, riadok
 * akcií (lajk, počet lajkov, počet komentárov, zdieľanie) a nadpis „Komentáre" s kotvou.
 *
 * Presunuté z `FeedPostMobileDetail.tsx` bez zmeny (posledná dávka delenia, presun 1, nález 333, R23): JSX, komentáre
 * aj odsadenie sú rovnaké ako predtým, rovnako konštanty a ikony, ktoré používa len tento obsah
 * (`MOBILE_DETAIL_CAPTION_LINES`, `ACTION_BUTTON`, `HeartIcon`, `CommentIcon`). Komponent nemá stav ani hooky, všetko
 * dostáva od obrazovky ako vlastnosti a vracia priamo koreň s `data-testid="feed-mobile-detail-header-content"` bez
 * obalu. Obrazovka ho podáva do `FeedPostComments` ako `listHeader` (premenná ostala v obrazovke), takže ide DOVNÚTRA
 * scrollovateľného boxu komentárov: text, fotka aj akcie scrollujú spolu so zoznamom.
 *
 * KOTVA KOMENTÁROV: `commentsAnchorRef` je ref objekt vytvorený v obrazovke (`handleCommentsReady` z neho číta kotvu)
 * a `autoScrollDecision` je stav obrazovky (zapisuje ho `handleCommentsReady`). Sem idú ako vlastnosti pod rovnakými
 * menami a ostávajú priradené prvku s `data-testid="feed-mobile-detail-comments-anchor"` (`ref` a
 * `data-auto-scrolled`).
 */

import type { RefObject } from 'react';
import type { FeedPost, FeedPostImage } from '@/lib/feedApi';
import FeedPostCaption from './FeedPostCaption';
import FeedPostImageCarousel from './FeedPostImageCarousel';
import SharedContentPreviewCard from './SharedContentPreviewCard';
import { sharedContentCardFromPost } from './sharedContentCard';
import ShareIcon from './ShareIcon';

/** Text príspevku sa tu zbalí na desať riadkov (rovnako ako v okne detailu na počítači) – obrazovka má miesta viac než karta. */
const MOBILE_DETAIL_CAPTION_LINES = 10;

/** Spoločný vzhľad troch akcií – dotykový cieľ nad 44 px. */
const ACTION_BUTTON =
  'inline-flex h-11 items-center gap-1.5 rounded-full px-2 text-sm text-gray-600 transition-colors hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60 dark:text-gray-300 dark:hover:bg-white/10';

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

type FeedPostMobileDetailContentProps = {
  /** Text príspevku (prázdny = text sa nekreslí). */
  caption: string;
  hasPhoto: boolean;
  /** Fotky príspevku vrátane rozpracovaných (ich dosleduje obrazovka). */
  images: FeedPostImage[];
  t: (key: string, fallback?: string) => string;
  /** Zdieľaný obsah zaberá miesto, kde má voľný príspevok fotku. */
  hasSharedPreview: boolean;
  currentPost: FeedPost;
  /** Zdieľajúci JE pôvodný autor – meno sa v náhľade nezopakuje. */
  isSelfShare: boolean;
  /** Preklik na zdroj zdieľaného obsahu (`undefined` = otvárať sa nedá); pred ním sa obrazovka zavrie. */
  openSharedSource: (() => void) | undefined;
  /** Id pôvodného príspevku, ktorého fotku ukazuje repost (`null` = fotka nie je). */
  sharedPhotoPostId: number | null;
  setSharedPhotoOpen: (open: boolean) => void;
  toggleLike: () => Promise<void>;
  isLiked: boolean;
  likesCount: number;
  setLikersOpen: (open: boolean) => void;
  commentsCount: number;
  setShareOpen: (open: boolean) => void;
  /** Kotva „Komentáre": ref objekt vytvára obrazovka, `handleCommentsReady` z neho číta kotvu. */
  commentsAnchorRef: RefObject<HTMLDivElement | null>;
  /** Čo obrazovka rozhodla o štartovacej pozícii (`null` = ešte nie); ide do `data-auto-scrolled`. */
  autoScrollDecision: boolean | null;
};

export default function FeedPostMobileDetailContent({
  caption,
  hasPhoto,
  images,
  t,
  hasSharedPreview,
  currentPost,
  isSelfShare,
  openSharedSource,
  sharedPhotoPostId,
  setSharedPhotoOpen,
  toggleLike,
  isLiked,
  likesCount,
  setLikersOpen,
  commentsCount,
  setShareOpen,
  commentsAnchorRef,
  autoScrollDecision,
}: FeedPostMobileDetailContentProps) {
  return (
    <div data-testid="feed-mobile-detail-header-content" className="pb-1">
      {caption ? (
        <div className="pb-3">
          <FeedPostCaption
            text={caption}
            testId="feed-mobile-detail-caption"
            maxLines={MOBILE_DETAIL_CAPTION_LINES}
            collapseBlankLines
            // Rozbaľuje sa v BEŽNOM toku: žiadny strop ani vlastný scroll, len
            // viac textu, ktorý prirodzene posunie fotku, akcie aj komentáre
            // nižšie.
          />
        </div>
      ) : null}

      {hasPhoto ? (
        <div className="-mx-4 pb-3" data-testid="feed-mobile-detail-photo">
          {/* Bez `onPhotoClick`: ťuk otvorí pôvodný fullscreen prehliadač
              (`ImageLightbox`) priamo z karuselu – tá istá cesta, aká platí
              vnútri okna detailu na desktope. */}
          <FeedPostImageCarousel
            images={images}
            alt={t('feed.imageAlt', 'Fotka príspevku')}
          />
        </div>
      ) : null}

      {/* Zdieľaný obsah stojí presne tam, kde má voľný príspevok fotku – text
          teda ostáva NAD ním, rovnaké pravidlo ako „text nad fotkou". */}
      {hasSharedPreview ? (
        <div className="pb-3" data-testid="feed-mobile-detail-shared">
          <SharedContentPreviewCard
            data={sharedContentCardFromPost(currentPost)}
            hideOwner={isSelfShare}
            onOpenSource={openSharedSource}
            // Tu je náhľad hlavným obsahom obrazovky, takže naň vedie klik aj
            // pri zdieľanom príspevku…
            onOpenPostPreview={openSharedSource}
            // …a fotka v ňom otvára fotoprehliadač PÔVODNÉHO príspevku.
            onOpenPostPhoto={
              sharedPhotoPostId != null
                ? () => setSharedPhotoOpen(true)
                : undefined
            }
          />
        </div>
      ) : null}

      {/* Lajk, komentáre aj zdieľanie sú POKOPE – žiadne odsúvanie zdieľania
          na druhý koniec riadku. */}
      <div
        data-testid="feed-mobile-detail-actions"
        className="flex items-center gap-1 border-y border-gray-200/70 py-1 dark:border-gray-700/60"
      >
        <button
          type="button"
          onClick={() => void toggleLike()}
          data-testid="feed-mobile-detail-like"
          aria-label={t('feed.likes', 'Páči sa mi')}
          aria-pressed={isLiked}
          className={`${ACTION_BUTTON} ${
            isLiked ? 'text-purple-600 dark:text-purple-300' : ''
          }`}
        >
          <HeartIcon filled={isLiked} />
        </button>
        {/* Počet je samostatný cieľ kliku – otvára zoznam lajkujúcich. */}
        <button
          type="button"
          onClick={() => setLikersOpen(true)}
          data-testid="feed-mobile-detail-like-count"
          aria-label={`${t('feed.likersTitle', 'Páči sa im to')}: ${likesCount}`}
          className="h-11 rounded-full px-1 text-sm tabular-nums text-gray-600 underline-offset-2 transition-colors hover:bg-black/5 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60 dark:text-gray-300 dark:hover:bg-white/10"
        >
          {likesCount}
        </button>

        <span className={ACTION_BUTTON} data-testid="feed-mobile-detail-comments">
          <CommentIcon />
          <span className="tabular-nums">{commentsCount}</span>
        </span>

        <button
          type="button"
          onClick={() => setShareOpen(true)}
          data-testid="feed-mobile-detail-share"
          aria-label={t('feed.sharePost', 'Zdieľať ďalej')}
          className={ACTION_BUTTON}
        >
          <ShareIcon className="h-5 w-5" />
        </button>
      </div>

      <div
        ref={commentsAnchorRef}
        data-testid="feed-mobile-detail-comments-anchor"
        data-auto-scrolled={
          autoScrollDecision === null ? undefined : String(autoScrollDecision)
        }
        className="pt-3"
      >
        <h2
          data-testid="feed-mobile-detail-comments-title"
          className="text-sm font-semibold text-gray-900 dark:text-white"
        >
          {t('feed.comments', 'Komentáre')}
        </h2>
      </div>
    </div>
  );
}
