/* eslint-disable @next/next/no-img-element */
'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { ConversationsList } from './messages/ConversationsList';
import { ConversationDetail } from './messages/ConversationDetail';
import { DraftConversationDetail } from './messages/DraftConversationDetail';

export default function MessagesModule({
  conversationId,
  targetUserId,
  currentUserId,
}: {
  conversationId?: number | null;
  targetUserId?: number | null;
  currentUserId: number;
}) {
  const { t } = useLanguage();
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="w-full">
        <div className="max-w-4xl mx-auto mb-4">
          <div className="bg-white dark:bg-black rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-5">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {t('messages.title', 'Messages')}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('messages.subtitle', 'Your conversations')}
            </p>
          </div>
        </div>

        {conversationId ? (
          <ConversationDetail conversationId={conversationId} currentUserId={currentUserId} />
        ) : targetUserId ? (
          <DraftConversationDetail targetUserId={targetUserId} />
        ) : (
          <ConversationsList currentUserId={currentUserId} />
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col pt-0 pb-0 pl-0 text-[var(--foreground)]">
      {conversationId ? (
        <ConversationDetail
          conversationId={conversationId}
          currentUserId={currentUserId}
          className="max-w-none mx-0"
        />
      ) : targetUserId ? (
        <DraftConversationDetail targetUserId={targetUserId} className="max-w-none mx-0" />
      ) : (
        <div className="flex h-full min-h-0 items-center justify-center">
          <div className="flex flex-col items-center text-center">
            <ChatBubbleLeftRightIcon className="w-28 h-28 text-black dark:text-white mb-4" />
            <h2 className="text-4xl font-semibold text-gray-900 dark:text-white">
              Vaše správy
            </h2>
          </div>
        </div>
      )}
    </div>
  );
}
