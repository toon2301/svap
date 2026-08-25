'use client';

/**
 * Malé pole na odpoveď, ktoré sa otvorí PRIAMO pod komentárom.
 *
 * Zámerne nie dialóg: odpoveď je krátka reakcia v kontexte, a modal by
 * kontext prekryl. Emoji rieši `useEmojiInsertion`, ten istý hook ako
 * composer príspevku aj hlavné pole komentárov.
 */

import { useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DesktopEmojiPickerButton } from '../messages/DesktopEmojiPickerButton';
import { useEmojiInsertion } from './useEmojiInsertion';
import { FEED_COMMENT_MAX_LENGTH } from '@/lib/feedApi';

type FeedCommentReplyComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitting?: boolean;
};

export default function FeedCommentReplyComposer({
  value,
  onChange,
  onSubmit,
  onCancel,
  submitting = false,
}: FeedCommentReplyComposerProps) {
  const { t } = useLanguage();
  const { textareaRef, insertEmoji } = useEmojiInsertion(value, onChange);

  // Pole sa otvára na vyžiadanie, takže patrí doň aj fokus – inak by
  // používateľ musel po kliknutí na „Odpovedať" ešte klikať do textu.
  useEffect(() => {
    textareaRef.current?.focus();
  }, [textareaRef]);

  const trimmed = value.trim();
  const tooLong = value.length > FEED_COMMENT_MAX_LENGTH;
  const canSubmit = Boolean(trimmed) && !tooLong && !submitting;

  return (
    <div className="mt-2" data-testid="feed-reply-composer">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={2}
        disabled={submitting}
        placeholder={t('feed.replyPlaceholder', 'Napíš odpoveď...')}
        aria-label={t('feed.replyPlaceholder', 'Napíš odpoveď...')}
        className="w-full resize-y subtle-scrollbar rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400/60 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900/50 dark:text-white dark:placeholder-gray-500"
      />
      <div className="mt-1.5 flex items-center gap-2">
        <DesktopEmojiPickerButton
          ariaLabel={t('feed.emojiPicker', 'Pridať emoji')}
          disabled={submitting}
          onSelect={insertEmoji}
          className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-purple-600 dark:hover:bg-gray-800 dark:hover:text-purple-300"
        />
        <span
          className={`ml-auto text-xs tabular-nums ${
            tooLong
              ? 'font-semibold text-red-600 dark:text-red-400'
              : 'text-gray-400 dark:text-gray-500'
          }`}
        >
          {value.length}/{FEED_COMMENT_MAX_LENGTH}
        </span>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          {t('common.cancel', 'Zrušiť')}
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          data-testid="feed-reply-submit"
          className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting
            ? t('common.sending', 'Odosielam...')
            : t('feed.replySubmit', 'Odpovedať')}
        </button>
      </div>
    </div>
  );
}
