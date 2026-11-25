'use client';

/**
 * Jedno pole dole na mobile, ktoré slúži na nový komentár aj na odpoveď (R75, kolo 3b redizajnu komentárov).
 *
 * Používa ho mobilný detail príspevku a panel komentárov nad fotkou (`mobileReplyField` vo `FeedPostComments`); na
 * počítači ostáva pole na odpoveď pod komentárom (`FeedCommentReplyComposer`).
 *
 * V režime komentára vyzerá a správa sa presne ako kompaktné pole z `FeedCommentComposer` (jeden riadok, ikona odoslania
 * v poli). Po ťuknutí na „Odpovedať“ sa to isté pole prepne na odpoveď: text „Napíš odpoveď...“, nad poľom riadok
 * „Odpovedáš: Meno“ a vpravo vedľa poľa krížik, ktorý odpovedanie ukončí.
 *
 * `textarea` sa pri prepnutí režimu NESMIE vymeniť: nový prvok by stratil fokus a na iPhone by sa zavrela klávesnica. Preto
 * je strom pri oboch režimoch rovnaký a riadok s menom aj krížik sú len voliteľní súrodenci okolo neho.
 */

import type { RefObject } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { FEED_COMMENT_MAX_LENGTH } from '@/lib/feedApi';

export type FeedCommentMobileComposerProps = {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  /** Pole patrí odpovedi na komentár (inak pridáva nový komentár). */
  replying: boolean;
  /** Meno autora komentára, na ktorý sa odpovedá; bez neho sa ukáže len „Odpovedáš:“. */
  replyTargetName?: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  /** Krížik: ukončí odpovedanie a vráti pole na komentár. */
  onCancelReply: () => void;
  canSubmit: boolean;
  tooLong: boolean;
  /** Počas odosielania odpovede sa text nedá meniť, no pole ostáva zaostrené (klávesnica sa nezatvára). */
  readOnly: boolean;
  /** Pole získalo alebo stratilo fokus; obrazovka podľa toho prispôsobuje výšku klávesnici. */
  onFocusChange?: (focused: boolean) => void;
  t: (key: string, fallback?: string) => string;
};

/** Ťuk na krížik nesmie zobrať fokus z poľa, inak by sa zavrela klávesnica (rovnako ako pri odoslaní v chate). */
function keepFieldFocus(event: { preventDefault: () => void }) {
  event.preventDefault();
}

export default function FeedCommentMobileComposer({
  textareaRef,
  replying,
  replyTargetName,
  value,
  onChange,
  onSubmit,
  onCancelReply,
  canSubmit,
  tooLong,
  readOnly,
  onFocusChange,
  t,
}: FeedCommentMobileComposerProps) {
  const placeholder = replying
    ? t('feed.replyPlaceholder', 'Napíš odpoveď...')
    : t('feed.commentPlaceholder', 'Napíš komentár...');
  const submitLabel = replying
    ? t('feed.replySubmit', 'Odpovedať')
    : t('feed.commentSubmit', 'Pridať');
  const cancelLabel = t('feed.replyCancel', 'Zrušiť odpoveď');

  return (
    <div className="mt-3" data-testid="feed-comment-mobile-composer">
      {replying ? (
        <p
          data-testid="feed-reply-target"
          className="mb-1.5 truncate text-xs text-gray-500 dark:text-gray-400"
        >
          {t('feed.replyingTo', 'Odpovedáš:')}
          {replyTargetName ? (
            <>
              {' '}
              <span className="font-semibold text-gray-900 dark:text-white">
                {replyTargetName}
              </span>
            </>
          ) : null}
        </p>
      ) : null}
      {/* `items-start` a `-mt-px` na krížiku: obal poľa je o pár px vyšší než samotná `textarea` (medzera pod riadkom textu),
          takže vystredenie na obal by krížik posunulo pod stred poľa. Krížik (40 px) stojí na strede poľa (38 px). */}
      <div className="flex items-start gap-2">
        <div className="relative min-w-0 flex-1">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onFocus={() => onFocusChange?.(true)}
            onBlur={() => onFocusChange?.(false)}
            readOnly={readOnly}
            rows={1}
            placeholder={placeholder}
            aria-label={placeholder}
            className="w-full subtle-scrollbar rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400/60 dark:border-gray-600 dark:bg-gray-900/50 dark:text-white dark:placeholder-gray-500 resize-none pr-12"
          />
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            data-testid="feed-comment-send"
            aria-label={submitLabel}
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
        </div>
        {replying ? (
          <button
            type="button"
            onPointerDown={keepFieldFocus}
            onMouseDown={keepFieldFocus}
            onClick={onCancelReply}
            data-testid="feed-reply-cancel"
            aria-label={cancelLabel}
            title={cancelLabel}
            className="-mt-px inline-flex h-10 min-h-0 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/15 dark:hover:text-white"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      {tooLong ? (
        <p
          data-testid="feed-comment-counter"
          className="mt-1 text-xs font-semibold tabular-nums text-red-500 dark:text-red-400"
        >
          {value.length}/{FEED_COMMENT_MAX_LENGTH}
        </p>
      ) : null}
    </div>
  );
}
