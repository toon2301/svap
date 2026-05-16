'use client';

import React from 'react';
import { CheckIcon, TrashIcon } from '@heroicons/react/24/outline';
import type { ConversationListItem } from './types';

export function MessageRequestRow({
  conversation,
  isCompact,
  isBusy,
  onOpen,
  onAccept,
  onDelete,
  t,
}: {
  conversation: ConversationListItem;
  isCompact: boolean;
  isBusy: boolean;
  onOpen: (conversationId: number) => void;
  onAccept: (conversationId: number) => void;
  onDelete: (conversationId: number) => void;
  t: (key: string, fallback: string) => string;
}) {
  const other = conversation.other_user;
  const title = other?.display_name || t('messages.unknownUser', 'Používateľ');
  const imageOnlyPreview = t('messages.imageOnlyPreview', 'Obrázok');
  const preview =
    conversation.last_message_preview ||
    (conversation.last_message_has_image ? imageOnlyPreview : null) ||
    t('messages.noPreview', 'Správa');

  return (
    <div
      className={`flex w-full items-center gap-3 rounded-2xl border border-gray-200 bg-white text-left shadow-sm dark:border-gray-800 dark:bg-black ${
        isCompact ? 'px-3 py-2.5' : 'px-4 py-3.5'
      }`}
    >
      <button
        type="button"
        onClick={() => onOpen(conversation.id)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <div
          className={`flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-purple-100 dark:bg-purple-900/40 ${
            isCompact ? 'h-9 w-9' : 'h-11 w-11'
          }`}
        >
          {other?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={other.avatar_url} alt={title} className="h-full w-full object-cover" />
          ) : (
            <span className={`${isCompact ? 'text-[11px]' : 'text-sm'} font-bold text-purple-700 dark:text-purple-300`}>
              {(title || 'U').slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className={`${isCompact ? 'text-xs' : 'text-base'} truncate font-semibold text-gray-900 dark:text-white`}>
              {title}
            </span>
            {conversation.request_unseen ? (
              <span className="h-2 w-2 flex-shrink-0 rounded-full bg-purple-600" aria-hidden="true" />
            ) : null}
          </div>
          <div className={`${isCompact ? 'text-[11px]' : 'text-sm'} truncate text-gray-600 dark:text-gray-400`}>
            {preview}
          </div>
        </div>
      </button>

      <div className="flex flex-shrink-0 items-center gap-1.5">
        <button
          type="button"
          disabled={isBusy}
          onClick={() => onAccept(conversation.id)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-60 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white"
          aria-label={t('messages.acceptMessageRequest', 'Prijať žiadosť')}
          title={t('messages.acceptMessageRequest', 'Prijať žiadosť')}
        >
          <CheckIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled={isBusy}
          onClick={() => onDelete(conversation.id)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-red-300"
          aria-label={t('messages.deleteMessageRequest', 'Odstrániť žiadosť')}
          title={t('messages.deleteMessageRequest', 'Odstrániť žiadosť')}
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
