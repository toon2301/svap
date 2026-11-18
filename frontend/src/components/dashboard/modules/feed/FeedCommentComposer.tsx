'use client';

/**
 * Pole na nový komentár pod zoznamom: textarea, odoslanie, počítadlo znakov a
 * (mimo mobilu) výber emoji.
 *
 * Má dva tvary: bežný (spodný riadok s emoji, počítadlom a tlačidlom „Pridať")
 * a kompaktný (`compactComposer`: jeden riadok a ikona odoslania priamo v poli,
 * pre vysunutý panel nad fotkou).
 *
 * Vytiahnuté z `FeedPostComments.tsx` ako čistý presun (nález 333, delenie
 * súboru). Text poľa, `textareaRef` a `insertEmoji` ostávajú v rodičovi a
 * prichádzajú cez vlastnosti, ktoré nesú pôvodné názvy, takže sa presunutý text
 * nemenil.
 */

import type { RefObject } from 'react';
import { DesktopEmojiPickerButton } from '../messages/DesktopEmojiPickerButton';
import { FEED_COMMENT_MAX_LENGTH } from '@/lib/feedApi';

type FeedCommentComposerProps = {
  compactComposer: boolean;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  text: string;
  setText: (value: string) => void;
  t: (key: string, fallback?: string) => string;
  handleSubmit: () => Promise<void>;
  canSubmit: boolean;
  tooLong: boolean;
  isMobile: boolean;
  submitting: boolean;
  insertEmoji: (emoji: string) => void;
};

export default function FeedCommentComposer({
  compactComposer,
  textareaRef,
  text,
  setText,
  t,
  handleSubmit,
  canSubmit,
  tooLong,
  isMobile,
  submitting,
  insertEmoji,
}: FeedCommentComposerProps) {
  return (
    <div className="mt-3">
      {/* Kompaktný variant: jeden riadok a ikona odoslania priamo v poli.
          Vysunutý panel nad fotkou má na composer len úzky pruh. */}
      <div className={compactComposer ? 'relative' : ''}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={compactComposer ? 1 : 2}
          placeholder={t('feed.commentPlaceholder', 'Napíš komentár...')}
          aria-label={t('feed.commentPlaceholder', 'Napíš komentár...')}
          className={`w-full subtle-scrollbar rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400/60 dark:border-gray-600 dark:bg-gray-900/50 dark:text-white dark:placeholder-gray-500 ${
            compactComposer ? 'resize-none pr-12' : 'resize-y'
          }`}
        />
        {compactComposer ? (
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            data-testid="feed-comment-send"
            aria-label={t('feed.commentSubmit', 'Pridať')}
            className="absolute right-1.5 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-purple-600 transition-colors hover:bg-purple-500/15 disabled:cursor-not-allowed disabled:opacity-40 dark:text-purple-300"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <line x1="10" y1="14" x2="21" y2="3" />
              <path d="M21 3 14.5 21a.55.55 0 0 1-1 0L10 14 3 10.5a.55.55 0 0 1 0-1z" />
            </svg>
          </button>
        ) : null}
      </div>
      {/* Kompaktný variant odosiela ikonou v poli, takže spodný riadok
          (emoji, počítadlo, „Pridať") by bol druhá cesta k tej istej akcii.
          Zostáva z neho len upozornenie na prekročenú dĺžku. */}
      {compactComposer ? (
        tooLong ? (
          <p
            data-testid="feed-comment-counter"
            className="mt-1 text-xs font-semibold tabular-nums text-red-500 dark:text-red-400"
          >
            {text.length}/{FEED_COMMENT_MAX_LENGTH}
          </p>
        ) : null
      ) : (
      <div className="mt-2 flex items-center justify-between gap-3">
        {isMobile ? null : (
          <DesktopEmojiPickerButton
            ariaLabel={t('feed.emojiPicker', 'Pridať emoji')}
            disabled={submitting}
            onSelect={insertEmoji}
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-purple-600 dark:hover:bg-gray-800 dark:hover:text-purple-300"
          />
        )}
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
      )}
    </div>
  );
}
