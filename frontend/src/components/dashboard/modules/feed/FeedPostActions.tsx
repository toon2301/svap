'use client';

/**
 * Riadok akcií pod príspevkom: lajk s počtom, komentáre a zdieľanie.
 *
 * Presunuté z `FeedPostCard.tsx` bez zmeny (krok b delenia karty, nález 333, R23): JSX aj obsluhy sú rovnaké ako
 * predtým, mení sa len odsadenie a meno `post.id` → `postId`. Komponent nemá vlastný stav ani hooky; všetko, čo riadok
 * číta alebo volá, dostáva od karty ako vlastnosti.
 *
 * PRUŽNÝ STĹPEC OKNA (`fillHeight`): koreňom je `<footer>` a ostáva PRIAMYM potomkom koreňa karty, nič sa neobaľuje.
 * Trieda `fixedBlock` (`shrink-0` pri `fillHeight`, inak prázdna) ide ako vlastnosť do toho istého `className`.
 */

import type { Dispatch, SetStateAction } from 'react';
import type { useFeedPostOverlay } from '../../contexts/FeedPostOverlayContext';
import ActionButton from './FeedPostActionButton';
import ShareIcon from './ShareIcon';

type FeedPostActionsProps = {
  /** Trieda pevného bloku pružného stĺpca okna: `shrink-0` pri `fillHeight`, inak prázdny reťazec. */
  fixedBlock: string;
  t: (key: string, fallback?: string) => string;
  postId: number;
  likesCount: number;
  isLiked: boolean;
  toggleLike: () => Promise<void>;
  setLikersOpen: (open: boolean) => void;
  shownCommentsCount: number;
  commentsOpen: boolean;
  setCommentsOpen: Dispatch<SetStateAction<boolean>>;
  opensOverlay: boolean;
  postOverlay: ReturnType<typeof useFeedPostOverlay>;
  opensMobileDetail: boolean;
  setMobileDetailOpen: (open: boolean) => void;
  setShareOpen: (open: boolean) => void;
};

export default function FeedPostActions({
  fixedBlock,
  t,
  postId,
  likesCount,
  isLiked,
  toggleLike,
  setLikersOpen,
  shownCommentsCount,
  commentsOpen,
  setCommentsOpen,
  opensOverlay,
  postOverlay,
  opensMobileDetail,
  setMobileDetailOpen,
  setShareOpen,
}: FeedPostActionsProps) {
  return (
    <footer
      className={`flex items-center gap-4 border-t border-gray-200/70 px-4 py-2.5 dark:border-gray-700/60 ${fixedBlock}`}
    >
      <ActionButton
        label={t('feed.likes', 'Páči sa mi')}
        count={likesCount}
        active={isLiked}
        onClick={() => void toggleLike()}
        onCountClick={() => setLikersOpen(true)}
        countLabel={t('feed.likersTitle', 'Páči sa im to')}
        countTestId="feed-like-count"
        testId="feed-like-button"
      >
        <svg
          viewBox="0 0 24 24"
          fill={isLiked ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="2"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </ActionButton>

      <ActionButton
        label={t('feed.comments', 'Komentáre')}
        count={shownCommentsCount}
        active={commentsOpen}
        onClick={() => {
          if (opensOverlay) {
            postOverlay?.open({ postId });
            return;
          }
          // Mobil dostáva vlastnú obrazovku detailu namiesto rozbaľovania
          // komentárov priamo v karte.
          if (opensMobileDetail) {
            setMobileDetailOpen(true);
            return;
          }
          setCommentsOpen((open) => !open);
        }}
        testId="feed-comments-button"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </ActionButton>

      <ActionButton
        label={t('feed.sharePost', 'Zdieľať ďalej')}
        onClick={() => setShareOpen(true)}
        testId="feed-share-button"
      >
        <ShareIcon />
      </ActionButton>
    </footer>
  );
}
