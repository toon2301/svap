/* eslint-disable @next/next/no-img-element */
'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobileState } from '@/hooks';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { ConversationsList } from './messages/ConversationsList';
import { ConversationsListSkeleton } from './messages/ConversationsListSkeleton';
import { ConversationDetail } from './messages/ConversationDetail';
import { DraftConversationDetail } from './messages/DraftConversationDetail';

function MessagesDesktopPlaceholder({ title }: { title: string }) {
  return (
    <div className="flex h-full min-h-0 items-center justify-center">
      <div className="flex flex-col items-center text-center">
        <ChatBubbleLeftRightIcon className="mb-4 h-28 w-28 text-black dark:text-white" />
        <h2 className="text-4xl font-semibold text-gray-900 dark:text-white">{title}</h2>
      </div>
    </div>
  );
}

function MessagesViewportPendingState({ title }: { title: string }) {
  return (
    <div className="w-full text-[var(--foreground)] lg:flex lg:h-full lg:min-h-0 lg:flex-col">
      <div className="w-full lg:hidden">
        <ConversationsListSkeleton />
      </div>

      <div className="hidden h-full min-h-0 lg:flex">
        <MessagesDesktopPlaceholder title={title} />
      </div>
    </div>
  );
}

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
  const { isMobile, isResolved: isViewportResolved } = useIsMobileState();
  const hasActiveConversation = Boolean(conversationId || targetUserId);
  const shouldFillMobileHeight = hasActiveConversation;
  const messagesTitle = t('messages.title', 'Messages');

  if (!hasActiveConversation && !isViewportResolved) {
    return <MessagesViewportPendingState title={messagesTitle} />;
  }

  if (isMobile) {
    return (
      <div
        className={
          shouldFillMobileHeight
            ? 'flex h-full min-h-0 w-full flex-col'
            : 'w-full'
        }
      >
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
        <MessagesDesktopPlaceholder title={messagesTitle} />
      )}
    </div>
  );
}
