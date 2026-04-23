'use client';

import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import type { MessageItem } from './types';
import { MessagePinIcon } from './MessagePinIcon';

type PinnedMessageBannerProps = {
  message: MessageItem;
  isMobile: boolean;
  label: string;
  imageFallbackLabel: string;
  jumpLabel: string;
  unpinLabel: string;
  onClick: () => void;
  onUnpin: () => void;
  isBusy?: boolean;
};

function getPinnedMessagePreview(message: MessageItem, imageFallbackLabel: string): string {
  const text = (message.text || '').trim();
  if (text) {
    return text;
  }
  if (message.has_image || message.image_url) {
    return imageFallbackLabel;
  }
  return '';
}

export function PinnedMessageBanner({
  message,
  isMobile,
  label,
  imageFallbackLabel,
  jumpLabel,
  unpinLabel,
  onClick,
  onUnpin,
  isBusy = false,
}: PinnedMessageBannerProps) {
  const preview = getPinnedMessagePreview(message, imageFallbackLabel);

  return (
    <div
      className={`${isMobile ? 'px-0 pb-2' : 'px-4 pb-2 sm:px-5 lg:px-6'}`}
      data-testid="pinned-message-banner-shell"
    >
      <div
        className={`flex items-center gap-2 bg-white/95 px-3 shadow-sm dark:bg-[#0f0f10]/95 ${
          isMobile
            ? 'rounded-none border-y border-gray-200 py-1.5 dark:border-gray-800'
            : 'rounded-2xl border border-gray-200 py-2 dark:border-gray-800'
        }`}
        data-testid="pinned-message-banner"
      >
        <button
          type="button"
          onClick={onClick}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          aria-label={jumpLabel}
          data-testid="pinned-message-banner-trigger"
        >
          <div className={`flex shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand dark:bg-brand/15 ${
            isMobile ? 'h-8 w-8' : 'h-9 w-9'
          }`}>
            <MessagePinIcon className={isMobile ? 'h-4 w-4' : 'h-5 w-5'} />
          </div>
          <div className="min-w-0 flex-1">
            {!isMobile ? (
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-brand">
                {label}
              </div>
            ) : null}
            <div className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
              {preview || imageFallbackLabel}
            </div>
          </div>
        </button>

        {!isMobile ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onUnpin();
            }}
            disabled={isBusy}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:cursor-wait disabled:opacity-60 dark:text-gray-400 dark:hover:bg-[#161618] dark:hover:text-gray-200"
            aria-label={unpinLabel}
            data-testid="pinned-message-unpin-button"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
