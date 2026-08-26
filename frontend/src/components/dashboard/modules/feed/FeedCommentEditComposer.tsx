'use client';

/**
 * Inline úprava komentára alebo odpovede – pole nahradí text NA MIESTE.
 *
 * Zámerne nie dialóg: komentár je krátky text v kontexte vlákna a modal by ten
 * kontext prekryl. Je to ten istý vzor ako `FeedCommentReplyComposer`, len
 * namiesto písania novej odpovede prepisuje existujúci text.
 *
 * Text si drží sám: komponent sa mountuje až pri začatí úpravy (a odmountuje
 * po jej skončení), takže počiatočná hodnota z komentára je vždy čerstvá a
 * rodič nemusí držať ďalší kus stavu.
 */

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks';
import { DesktopEmojiPickerButton } from '../messages/DesktopEmojiPickerButton';
import { useEmojiInsertion } from './useEmojiInsertion';
import { FEED_COMMENT_MAX_LENGTH } from '@/lib/feedApi';

type FeedCommentEditComposerProps = {
  initialText: string;
  onSubmit: (text: string) => void;
  onCancel: () => void;
  submitting?: boolean;
  testId?: string;
};

export default function FeedCommentEditComposer({
  initialText,
  onSubmit,
  onCancel,
  submitting = false,
  testId = 'feed-comment-edit-composer',
}: FeedCommentEditComposerProps) {
  const { t } = useLanguage();
  // Mobil má emoji priamo na systémovej klávesnici – appkové
  // tlačidlo je tam duplicitné, tak ho tam nekreslíme.
  const isMobile = useIsMobile();
  const [value, setValue] = useState(initialText);
  const { textareaRef, insertEmoji } = useEmojiInsertion(value, setValue);

  // Kurzor patrí na KONIEC textu, nie na začiatok – používateľ chce zvyčajne
  // dopísať, nie prepisovať od prvého znaku.
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.focus();
    const end = textarea.value.length;
    textarea.setSelectionRange(end, end);
  }, [textareaRef]);

  const trimmed = value.trim();
  const tooLong = value.length > FEED_COMMENT_MAX_LENGTH;
  const canSubmit = Boolean(trimmed) && !tooLong && !submitting;

  return (
    <div className="mt-1" data-testid={testId}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        rows={2}
        disabled={submitting}
        aria-label={t('feed.commentEdit', 'Upraviť')}
        className="w-full resize-y subtle-scrollbar rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400/60 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900/50 dark:text-white dark:placeholder-gray-500"
      />
      <div className="mt-1.5 flex items-center gap-2">
        {isMobile ? null : (
          <DesktopEmojiPickerButton
            ariaLabel={t('feed.emojiPicker', 'Pridať emoji')}
            disabled={submitting}
            onSelect={insertEmoji}
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-purple-600 dark:hover:bg-gray-800 dark:hover:text-purple-300"
          />
        )}
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
          onClick={() => onSubmit(trimmed)}
          disabled={!canSubmit}
          data-testid="feed-comment-edit-submit"
          className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting
            ? t('common.saving', 'Ukladám...')
            : t('common.save', 'Uložiť')}
        </button>
      </div>
    </div>
  );
}
