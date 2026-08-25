'use client';

/**
 * Srdiečko pri komentári – zmenšená obdoba lajku na príspevku.
 *
 * Optimistické správanie je presne vzor `FeedPostCard.handleToggleLike`:
 * okamžitá zmena, dorovnanie podľa odpovede servera (iný divák mohol medzitým
 * lajknúť tiež), revert + toast pri zlyhaní a ref guard proti dvojkliku.
 * Stav si drží komponent sám, takže preklikanie jedného komentára
 * neprerenderuje celý zoznam.
 */

import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import FeedLikersDialog from './FeedLikersDialog';
import { translateFeedActionError } from './feedActionErrors';
import {
  likeFeedPostComment,
  unlikeFeedPostComment,
  type FeedPostComment,
} from '@/lib/feedApi';

type FeedCommentLikeButtonProps = {
  postId: number;
  comment: FeedPostComment;
};

export default function FeedCommentLikeButton({
  postId,
  comment,
}: FeedCommentLikeButtonProps) {
  const { t } = useLanguage();
  const [isLiked, setIsLiked] = useState(Boolean(comment.is_liked_by_me));
  const [likesCount, setLikesCount] = useState(comment.likes_count ?? 0);
  const [likersOpen, setLikersOpen] = useState(false);
  const pendingRef = useRef(false);

  // Zoznam môže komentár nahradiť čerstvejšou verziou (obnovenie feedu) –
  // pri rovnakom id ostane inštancia komponentu tá istá, takže bez tejto
  // synchronizácie by karta ďalej ukazovala staré čísla. Počas prebiehajúcej
  // požiadavky sa nepreberá, nech optimistická zmena neprebliká späť.
  useEffect(() => {
    if (pendingRef.current) return;
    setIsLiked(Boolean(comment.is_liked_by_me));
    setLikesCount(comment.likes_count ?? 0);
  }, [comment.is_liked_by_me, comment.likes_count]);

  const handleToggle = async () => {
    if (pendingRef.current) return;
    pendingRef.current = true;

    const previousLiked = isLiked;
    const previousCount = likesCount;
    const nextLiked = !previousLiked;
    setIsLiked(nextLiked);
    setLikesCount((count) => Math.max(0, count + (nextLiked ? 1 : -1)));

    try {
      const payload = nextLiked
        ? await likeFeedPostComment(postId, comment.id)
        : await unlikeFeedPostComment(postId, comment.id);
      setIsLiked(payload.is_liked_by_me);
      setLikesCount(payload.likes_count);
    } catch (err) {
      setIsLiked(previousLiked);
      setLikesCount(previousCount);
      toast.error(translateFeedActionError(t, err));
    } finally {
      pendingRef.current = false;
    }
  };

  const label = t('feed.commentLike', 'Páči sa mi komentár');

  const toggle = (
    // Menšie než lajk príspevku (h-3.5 vs h-4); dotykový cieľ drží p-1.5 na
    // tlačidle a záporný margin na obale, ktorý prepínač aj počet spája.
    <button
      type="button"
      onClick={() => void handleToggle()}
      data-testid={`feed-comment-like-${comment.id}`}
      aria-label={`${label}: ${likesCount}`}
      aria-pressed={isLiked}
      title={label}
      className={`inline-flex shrink-0 items-center rounded-full p-1.5 text-xs transition-colors hover:bg-black/5 dark:hover:bg-white/10 ${
        isLiked
          ? 'text-purple-600 dark:text-purple-300'
          : 'text-gray-400 dark:text-gray-500'
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        fill={isLiked ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        className="h-3.5 w-3.5"
        aria-hidden="true"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );

  // Počet je SAMOSTATNÉ tlačidlo (otvára zoznam) – vnorené tlačidlo v tlačidle
  // by bolo neplatné HTML. Pri nule ostáva úplne skrytý, takže nie je čo
  // otvárať a prázdny dialóg nevznikne.
  return (
    // gap-0.5 (menšie než pri príspevku, lebo aj celý prvok je menší) drží
    // srdiečko a číslo opticky oddelené ako dva samostatné ciele kliku.
    <span className="-m-1 inline-flex items-center gap-0.5">
      {toggle}
      {likesCount > 0 ? (
        <button
          type="button"
          onClick={() => setLikersOpen(true)}
          data-testid={`feed-comment-like-count-${comment.id}`}
          aria-label={`${t('feed.likersTitle', 'Páči sa im to')}: ${likesCount}`}
          title={t('feed.likersTitle', 'Páči sa im to')}
          // Rovnaký princíp ako pri lajku príspevku: farba nesleduje stav
          // lajku, takže sfialovené srdiečko a neutrálne číslo sú viditeľne
          // dve veci. Hover pridá podčiarknutie a fialovú.
          className="rounded-full px-1 py-1.5 text-xs tabular-nums text-gray-400 underline-offset-2 transition-colors hover:bg-black/5 hover:text-purple-700 hover:underline dark:text-gray-500 dark:hover:bg-white/10 dark:hover:text-purple-300"
        >
          {likesCount}
        </button>
      ) : null}

      <FeedLikersDialog
        open={likersOpen}
        onClose={() => setLikersOpen(false)}
        postId={postId}
        commentId={comment.id}
      />
    </span>
  );
}
