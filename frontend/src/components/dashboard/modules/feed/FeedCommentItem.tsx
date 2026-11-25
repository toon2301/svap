'use client';

/**
 * Jeden komentár v zozname: avatar, meno, text (alebo inline pole úpravy), čas,
 * lajk, „Upraviť", „Odpovedať", počet odpovedí a kôš.
 *
 * Tá istá komponenta kreslí vrcholový komentár aj odpoveď – líšia sa len
 * veľkosťou avatara a písma a tým, že odpoveď NEMÁ tlačidlo „Odpovedať"
 * (vnorenie je jednoúrovňové, na odpoveď sa už odpovedať nedá).
 *
 * Vytiahnuté z `FeedPostComments.tsx` ako čistý presun (nález 333, delenie
 * súboru): stav ostáva v rodičovi a prichádza cez vlastnosti, ktoré nesú
 * pôvodné názvy. Bez `memo` a bez iných optimalizácií: prerenderuje sa spolu
 * s rodičom ako doteraz.
 *
 * PLOCHÝ VZHĽAD (R52, nález 261): komentár nemá sivú bublinu. Vedľa avatara je stĺpec s menom, textom a pod nimi riadkom
 * akcií (čas, lajk, „Upraviť", „Odpovedať"); kôš je vpravo hore. Riadok akcií siaha pod kôš, takže bublinka s lajkom
 * (`FeedCommentLikeButton`) stojí úplne vpravo v osi s košom. „Zobraziť / Skryť odpovede" je bližšie pod riadkom akcií ako
 * jemný text s čiarkou. Avatar vrcholového komentára má 36 px, avatar odpovede 28 px. Tlačidlá majú `min-h-0`: globálne
 * `button { min-height: 36px }` by ich inak natiahlo a komentár by bol vyšší, než ukazuje schválený návrh. Vodorovné odsadenie
 * odpovedí a zvislú čiaru z avatara kreslí rodič (`FeedPostComments.tsx`).
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
  /** Odpoveď: menší avatar a písmo a bez tlačidla „Odpovedať". */
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

/** Spoločný vzhľad malých textových tlačidiel v riadku akcií („Upraviť", „Odpovedať"). */
const ROW_BUTTON =
  'min-h-0 rounded-full px-1.5 py-1 text-xs font-medium text-gray-500 underline-offset-2 transition-colors hover:bg-black/5 hover:text-purple-700 hover:underline dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-purple-300';

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
      // Zvýraznenie z notifikácie ostalo také, aké bolo (fialový podklad celého komentára): bez odsadenia, ktoré by pohlo
      // obsahom, a bez presahu za okraj posuvného boxu, kde by sa orezalo.
      className={`flex items-start gap-2 rounded-xl transition-colors duration-700 ${
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
        className="min-h-0 shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60 disabled:cursor-default"
      >
        <InitialsAvatar
          name={comment.author?.display_name}
          avatarUrl={comment.author?.avatar_url}
          size={isReply ? 'xs' : 'sm'}
        />
      </button>
      <div className="relative min-w-0 flex-1">
        {/* Meno je na VLASTNOM riadku nad textom – text komentára ide pod
            neho, nie vedľa. Kôš je vpravo hore, v osi s menom, a berie miesto len riadku s menom: text pod ním ide
            na celú šírku, preto meno pri koši končí skôr. */}
        <button
          type="button"
          onClick={() => openCommentAuthorProfile(comment.author)}
          disabled={!canOpenUserProfile(comment.author)}
          data-testid={`feed-comment-author-${comment.id}`}
          className={`block min-h-0 truncate text-left text-[13px] font-semibold text-gray-900 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60 disabled:cursor-default disabled:no-underline dark:text-white ${
            comment.can_delete ? 'max-w-[calc(100%-2.25rem)]' : 'max-w-full'
          }`}
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
          <p
            className={`whitespace-pre-wrap break-words text-gray-800 dark:text-gray-100 ${
              isReply ? 'text-[13px]' : 'text-sm'
            }`}
          >
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
        {comment.can_delete ? (
          // `-top-2` dá stred tlačidla (32 px) do osi s riadkom mena; horný okraj tlačidla zasahuje do textu len o pár px.
          <button
            type="button"
            onClick={() => setPendingDelete(comment)}
            aria-label={t('feed.commentDelete', 'Zmazať komentár')}
            title={t('feed.commentDelete', 'Zmazať komentár')}
            className="absolute -top-2 right-0 inline-flex h-8 min-h-0 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-800 dark:hover:text-red-400"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        ) : null}
        <div className="mt-0.5 flex min-h-6 flex-wrap items-center gap-2">
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
              className={ROW_BUTTON}
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
              className={ROW_BUTTON}
            >
              {t('feed.reply', 'Odpovedať')}
            </button>
          )}
        </div>
        {/* Počet berieme z `replies_count` (celkový, nie len načítaný), takže
            polling ho aktualizuje aj v ZBALENOM stave – sekcia sa pritom
            sama neotvorí. Je to samostatný riadok tesne pod riadkom akcií:
            jemný text s krátkou čiarou, bez pilulky. */}
        {!isReply && repliesTotal(comment) > 0 ? (
          <button
            type="button"
            onClick={() => toggleReplies(comment.id)}
            data-testid={`feed-comment-toggle-replies-${comment.id}`}
            aria-expanded={expandedReplies.has(comment.id)}
            className="inline-flex min-h-0 items-center gap-2 py-1 pr-1.5 text-xs font-medium text-gray-500 underline-offset-2 transition-colors hover:text-purple-700 hover:underline dark:text-gray-400 dark:hover:text-purple-300"
          >
            <span
              aria-hidden="true"
              className="h-px w-5 bg-gray-300 dark:bg-white/25"
            />
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
  );
}
