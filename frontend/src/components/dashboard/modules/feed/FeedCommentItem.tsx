'use client';

/**
 * Jeden komentár v zozname: avatar, meno, text (alebo inline pole úpravy), čas,
 * lajk, „Upraviť", „Odpovedať", počet odpovedí a kôš.
 *
 * Tá istá komponenta kreslí vrcholový komentár aj odpoveď – líšia sa len
 * veľkosťou a tým, že odpoveď NEMÁ tlačidlo „Odpovedať" (vnorenie je
 * jednoúrovňové, na odpoveď sa už odpovedať nedá).
 *
 * Vytiahnuté z `FeedPostComments.tsx` ako čistý presun (nález 333, delenie
 * súboru): stav ostáva v rodičovi a prichádza cez vlastnosti, ktoré nesú
 * pôvodné názvy, takže sa vykreslený text nemenil. Bez `memo` a bez iných
 * optimalizácií: prerenderuje sa spolu s rodičom ako doteraz.
 */

import type { Dispatch, SetStateAction } from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';
import InitialsAvatar from '@/components/shared/InitialsAvatar';
import FeedCommentLikeButton from './FeedCommentLikeButton';
import FeedCommentEditComposer from './FeedCommentEditComposer';
import { canOpenUserProfile } from './feedProfileNavigation';
import { formatRelativeTime } from './feedRelativeTime';
import { repliesTotal } from './feedCommentsLogic';
import type { FeedPostComment } from '@/lib/feedApi';

type FeedCommentItemProps = {
  comment: FeedPostComment;
  /** Odpoveď: menšie písmo a bez tlačidla „Odpovedať". */
  isReply?: boolean;
  postId: number;
  /** Id komentára, ktorý je práve zvýraznený (z notifikácie). */
  highlighted: number | null;
  /** Id komentára, ktorý sa práve upravuje. */
  editingComment: number | null;
  editSubmitting: boolean;
  /** Komentáre, ktorým sú odpovede rozbalené. */
  expandedReplies: Set<number>;
  showTimestamp: boolean;
  t: (key: string, fallback?: string) => string;
  locale: string;
  openCommentAuthorProfile: (author: FeedPostComment['author']) => void;
  setEditingComment: (id: number | null) => void;
  handleSubmitEdit: (comment: FeedPostComment, text: string) => Promise<void>;
  setReplyingTo: Dispatch<SetStateAction<number | null>>;
  setReplyText: (value: string) => void;
  toggleReplies: (commentId: number) => void;
  setPendingDelete: (comment: FeedPostComment | null) => void;
};

export default function FeedCommentItem({
  comment,
  isReply = false,
  postId,
  highlighted,
  editingComment,
  editSubmitting,
  expandedReplies,
  showTimestamp,
  t,
  locale,
  openCommentAuthorProfile,
  setEditingComment,
  handleSubmitEdit,
  setReplyingTo,
  setReplyText,
  toggleReplies,
  setPendingDelete,
}: FeedCommentItemProps) {
  return (
    <div
      data-comment-id={comment.id}
      className={`flex items-start gap-2.5 rounded-xl transition-colors duration-700 ${
        highlighted === comment.id ? 'bg-purple-100/80 dark:bg-purple-900/30' : ''
      }`}
    >
      {/* Avatar aj meno vedú na profil autora komentára – rovnaké pravidlo
          ako v hlavičke príspevku, aby sa preklik správal všade rovnako. */}
      <button
        type="button"
        onClick={() => openCommentAuthorProfile(comment.author)}
        disabled={!canOpenUserProfile(comment.author)}
        data-testid={`feed-comment-avatar-${comment.id}`}
        aria-label={t('feed.openProfile', 'Otvoriť profil')}
        className="shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60 disabled:cursor-default"
      >
        <InitialsAvatar
          name={comment.author?.display_name}
          avatarUrl={comment.author?.avatar_url}
          size="xs"
        />
      </button>
      <div
        className={`min-w-0 flex-1 rounded-2xl bg-gray-100 px-3 py-2 dark:bg-gray-800/60 ${
          isReply ? 'text-[13px]' : ''
        }`}
      >
        {/* Meno je na VLASTNOM riadku nad textom – text komentára ide pod
            neho, nie vedľa. */}
        <button
          type="button"
          onClick={() => openCommentAuthorProfile(comment.author)}
          disabled={!canOpenUserProfile(comment.author)}
          data-testid={`feed-comment-author-${comment.id}`}
          className="block max-w-full truncate text-left text-xs font-semibold text-gray-900 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60 disabled:cursor-default disabled:no-underline dark:text-white"
        >
          {comment.author?.display_name}
        </button>
        {editingComment === comment.id ? (
          <FeedCommentEditComposer
            initialText={comment.text}
            submitting={editSubmitting}
            onCancel={() => setEditingComment(null)}
            onSubmit={(next) => void handleSubmitEdit(comment, next)}
            testId={`feed-comment-edit-composer-${comment.id}`}
          />
        ) : (
          <p className="whitespace-pre-wrap break-words text-sm text-gray-800 dark:text-gray-100">
            {comment.text}
            {/* „Upravené" vidí LEN autor komentára – backend pole nikomu inému
                neposiela, takže tu netreba porovnávať identity. */}
            {comment.is_edited ? (
              <span
                data-testid={`feed-comment-edited-${comment.id}`}
                className="ml-1 align-baseline text-xs text-gray-400 dark:text-gray-500"
              >
                {t('feed.editedMark', '(upravené)')}
              </span>
            ) : null}
          </p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {showTimestamp ? (
            <time
              dateTime={comment.created_at}
              data-testid={`feed-comment-time-${comment.id}`}
              className="text-xs text-gray-500 dark:text-gray-400"
            >
              {formatRelativeTime(comment.created_at, t, locale)}
            </time>
          ) : null}
          <FeedCommentLikeButton postId={postId} comment={comment} />
          {/* „Upraviť" patrí do TOHTO riadku, nie ku košu vpravo: kôš je
              deštruktívna ikona a navyše ho vidí aj autor príspevku pri cudzom
              komentári. Upravovať smie len autor komentára (`can_edit` z BE) a
              týka sa to aj odpovedí, ktoré vlastné „Odpovedať" nemajú. */}
          {comment.can_edit && editingComment !== comment.id ? (
            <button
              type="button"
              onClick={() => setEditingComment(comment.id)}
              data-testid={`feed-comment-edit-${comment.id}`}
              className="rounded-full px-1.5 py-1 text-xs font-medium text-gray-500 underline-offset-2 transition-colors hover:bg-black/5 hover:text-purple-700 hover:underline dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-purple-300"
            >
              {t('feed.commentEdit', 'Upraviť')}
            </button>
          ) : null}
          {isReply ? null : (
            <button
              type="button"
              onClick={() => {
                setReplyingTo((current) =>
                  current === comment.id ? null : comment.id,
                );
                setReplyText('');
              }}
              data-testid={`feed-comment-reply-${comment.id}`}
              className="rounded-full px-1.5 py-1 text-xs font-medium text-gray-500 underline-offset-2 transition-colors hover:bg-black/5 hover:text-purple-700 hover:underline dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-purple-300"
            >
              {t('feed.reply', 'Odpovedať')}
            </button>
          )}
          {/* Počet berieme z `replies_count` (celkový, nie len načítaný), takže
              polling ho aktualizuje aj v ZBALENOM stave – sekcia sa pritom
              sama neotvorí. */}
          {!isReply && repliesTotal(comment) > 0 ? (
            <button
              type="button"
              onClick={() => toggleReplies(comment.id)}
              data-testid={`feed-comment-toggle-replies-${comment.id}`}
              aria-expanded={expandedReplies.has(comment.id)}
              className="rounded-full px-1.5 py-1 text-xs font-medium text-gray-500 underline-offset-2 transition-colors hover:bg-black/5 hover:text-purple-700 hover:underline dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-purple-300"
            >
              {expandedReplies.has(comment.id)
                ? t('feed.repliesHide', 'Skryť odpovede')
                : t('feed.repliesShow', 'Zobraziť odpovede ({n})').replace(
                    '{n}',
                    String(repliesTotal(comment)),
                  )}
            </button>
          ) : null}
        </div>
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
    </div>
  );
}
