'use client';

/**
 * Komentáre pod príspevkom – inline rozbalenie, nie modal.
 *
 * Donačítavanie je plynulé (rovnako ako hlavný feed), ale observer je SCOPED
 * na túto inštanciu: `useInfiniteScrollSentinel` vracia vlastný ref, takže
 * každá rozbalená karta má vlastný sentinel aj vlastný observer a viac kariet
 * otvorených naraz sa navzájom neovplyvňuje.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { TrashIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import InitialsAvatar from '@/components/shared/InitialsAvatar';
import { DesktopEmojiPickerButton } from '../messages/DesktopEmojiPickerButton';
import FeedCommentDeleteConfirm from './FeedCommentDeleteConfirm';
import { useEmojiInsertion } from './useEmojiInsertion';
import { useInfiniteScrollSentinel } from './useFeedInfiniteScroll';
import {
  FEED_COMMENT_MAX_LENGTH,
  createFeedPostComment,
  deleteFeedPostComment,
  listFeedPostComments,
  type FeedPostComment,
} from '@/lib/feedApi';

const COMMENTS_PAGE_SIZE = 10;

type FeedPostCommentsProps = {
  postId: number;
  onCountChange?: (delta: number) => void;
};

export default function FeedPostComments({
  postId,
  onCountChange,
}: FeedPostCommentsProps) {
  const { t } = useLanguage();
  const [comments, setComments] = useState<FeedPostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [text, setText] = useState('');
  const [failed, setFailed] = useState(false);
  const nextUrlRef = useRef<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  // Guard cez REF, nie cez state: sentinel vie vystreliť dvakrát skôr, než
  // React commitne setLoadingMore(true) – obe volania by potom videli
  // loadingMore === false, vyžiadali ten istý cursor a pomalšia odpoveď by
  // prepísala nextUrlRef späť (opakované requesty / preskočená stránka).
  // Rovnaký vzor ako loadingMoreRef v useFeedInfiniteScroll.
  const loadingMoreRef = useRef(false);
  const [pendingDelete, setPendingDelete] = useState<FeedPostComment | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { textareaRef, insertEmoji } = useEmojiInsertion(text, setText);
  // `t` drží ref, aby nebolo v závislostiach callbackov: rodič sa pri zmene
  // počtu komentárov prerenderuje a keby `t` menilo identitu, `load` by sa
  // reštartoval a prepísal práve pridaný komentár späť na serverový stav.
  const tRef = useRef(t);
  tRef.current = t;

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    loadingMoreRef.current = false;
    try {
      const page = await listFeedPostComments(postId, {
        pageSize: COMMENTS_PAGE_SIZE,
      });
      setComments(page.results);
      nextUrlRef.current = page.next;
      setHasMore(Boolean(page.next));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !nextUrlRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const page = await listFeedPostComments(postId, {
        cursorUrl: nextUrlRef.current,
      });
      setComments((current) => {
        const seen = new Set(current.map((comment) => comment.id));
        return [...current, ...page.results.filter((c) => !seen.has(c.id))];
      });
      nextUrlRef.current = page.next;
      setHasMore(Boolean(page.next));
    } catch {
      toast.error(
        tRef.current('feed.commentsLoadError', 'Komentáre sa nepodarilo načítať.'),
      );
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [postId]);

  const sentinelRef = useInfiniteScrollSentinel({
    onIntersect: loadMore,
    enabled: hasMore && !loading && !loadingMore,
  });

  const trimmed = text.trim();
  const tooLong = text.length > FEED_COMMENT_MAX_LENGTH;
  const canSubmit = Boolean(trimmed) && !tooLong && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const created = await createFeedPostComment(postId, trimmed);
      // Najstarší prvý (poradie z BE) → nový ide na koniec.
      setComments((current) => [...current, created]);
      setText('');
      onCountChange?.(1);
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || t('feed.commentCreateError', 'Komentár sa nepodarilo pridať.');
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    const comment = pendingDelete;
    if (!comment) return;
    setDeleting(true);
    try {
      await deleteFeedPostComment(postId, comment.id);
      setComments((current) => current.filter((item) => item.id !== comment.id));
      onCountChange?.(-1);
      toast.success(t('feed.commentDeleted', 'Komentár bol zmazaný.'));
      setPendingDelete(null);
    } catch {
      toast.error(t('feed.commentDeleteError', 'Komentár sa nepodarilo zmazať.'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      data-testid="feed-post-comments"
      className="border-t border-gray-200/70 px-4 py-3 dark:border-gray-700/60"
    >
      {loading ? (
        <p className="py-2 text-sm text-gray-500 dark:text-gray-400">
          {t('common.loading', 'Načítavam...')}
        </p>
      ) : failed ? (
        <p className="py-2 text-sm text-gray-500 dark:text-gray-400">
          {t('feed.commentsLoadError', 'Komentáre sa nepodarilo načítať.')}
        </p>
      ) : comments.length === 0 ? (
        <p
          data-testid="feed-comments-empty"
          className="py-2 text-sm text-gray-500 dark:text-gray-400"
        >
          {t('feed.commentsEmpty', 'Zatiaľ žiadne komentáre.')}
        </p>
      ) : (
        <ul className="space-y-3">
          {comments.map((comment) => (
            <li key={comment.id} className="flex items-start gap-2.5">
              <InitialsAvatar
                name={comment.author?.display_name}
                avatarUrl={comment.author?.avatar_url}
                size="xs"
              />
              <div className="min-w-0 flex-1 rounded-2xl bg-gray-100 px-3 py-2 dark:bg-gray-800/60">
                <p className="text-xs font-semibold text-gray-900 dark:text-white">
                  {comment.author?.display_name}
                </p>
                <p className="whitespace-pre-wrap break-words text-sm text-gray-800 dark:text-gray-100">
                  {comment.text}
                </p>
              </div>
              {comment.can_delete ? (
                <button
                  type="button"
                  onClick={() => setPendingDelete(comment)}
                  aria-label={t('feed.commentDelete', 'Zmazať komentár')}
                  title={t('feed.commentDelete', 'Zmazať komentár')}
                  className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-800 dark:hover:text-red-400"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {loadingMore ? (
        <ul className="mt-3 space-y-3" data-testid="feed-comments-loading-more">
          {[0, 1].map((key) => (
            <li key={key} className="flex animate-pulse items-start gap-2.5">
              <div className="h-7 w-7 shrink-0 rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="flex-1 space-y-1.5 rounded-2xl bg-gray-100 px-3 py-2 dark:bg-gray-800/60">
                <div className="h-2.5 w-24 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-3 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {/* Sentinel patrí TEJTO karte – observer je per-inštancia, takže dve
          naraz rozbalené karty si donačítavanie navzájom nespúšťajú. */}
      <div ref={sentinelRef} aria-hidden="true" data-testid="feed-comments-sentinel" />

      <div className="mt-3">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={2}
          placeholder={t('feed.commentPlaceholder', 'Napíš komentár...')}
          aria-label={t('feed.commentPlaceholder', 'Napíš komentár...')}
          className="w-full resize-y rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400/60 dark:border-gray-600 dark:bg-gray-900/50 dark:text-white dark:placeholder-gray-500"
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <DesktopEmojiPickerButton
            ariaLabel={t('feed.emojiPicker', 'Pridať emoji')}
            disabled={submitting}
            onSelect={insertEmoji}
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-purple-600 dark:hover:bg-gray-800 dark:hover:text-purple-300"
          />
          <span
            data-testid="feed-comment-counter"
            className={`ml-auto text-xs tabular-nums ${
              tooLong
                ? 'font-semibold text-red-600 dark:text-red-400'
                : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            {text.length}/{FEED_COMMENT_MAX_LENGTH}
          </span>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? t('common.sending', 'Odosielam...')
              : t('feed.commentSubmit', 'Pridať')}
          </button>
        </div>
      </div>

      <FeedCommentDeleteConfirm
        open={pendingDelete !== null}
        isDeleting={deleting}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
