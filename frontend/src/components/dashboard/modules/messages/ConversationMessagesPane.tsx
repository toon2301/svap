'use client';

import type React from 'react';
import type { MessageItem } from './types';
import { ConversationMessagesSkeleton } from './ConversationMessagesSkeleton';
import { ConversationEmptyState } from './ConversationEmptyState';
import { ConversationMessageRow } from './ConversationMessageRow';
import { ConversationScrollToBottomButton } from './ConversationScrollToBottomButton';
import {
  DESKTOP_MESSAGE_SIDE_PADDING_CLASS,
  MOBILE_MESSAGE_SIDE_PADDING_CLASS,
} from './conversationDetailConstants';

type ConversationMessagesPaneProps = {
  loading: boolean;
  ordered: MessageItem[];
  currentUserId: number;
  isMobile: boolean;
  lastSeenMessageId: number | null;
  targetUserName: string;
  targetUserAvatarUrl: string | null;
  imagePreviewAlt: string;
  deletedMessageText: string;
  openImagePreviewLabel: string;
  openMessageActionsLabel: string;
  seenLabel: string;
  selectedMessageId: number | null;
  noMessagesYetText: string;
  showScrollToBottomButton: boolean;
  scrollToBottomLabel: string;
  messagesScrollRef: React.RefObject<HTMLDivElement | null>;
  messagesStackRef: React.RefObject<HTMLDivElement | null>;
  bottomRef: React.RefObject<HTMLDivElement | null>;
  onScroll: React.UIEventHandler<HTMLDivElement>;
  getMessageInteractionProps: (
    messageId: number,
    hasActions: boolean,
  ) => React.HTMLAttributes<HTMLDivElement>;
  suppressNativeMessageContextMenu: React.MouseEventHandler<HTMLDivElement>;
  onMessageActionTrigger: (messageId: number, element: HTMLElement | null) => void;
  onMessageImageClick: (
    event: React.MouseEvent<HTMLButtonElement>,
    messageId: number,
    imageUrl: string,
  ) => void;
  onScrollToBottomClick: () => void;
};

export function ConversationMessagesPane({
  loading,
  ordered,
  currentUserId,
  isMobile,
  lastSeenMessageId,
  targetUserName,
  targetUserAvatarUrl,
  imagePreviewAlt,
  deletedMessageText,
  openImagePreviewLabel,
  openMessageActionsLabel,
  seenLabel,
  selectedMessageId,
  noMessagesYetText,
  showScrollToBottomButton,
  scrollToBottomLabel,
  messagesScrollRef,
  messagesStackRef,
  bottomRef,
  onScroll,
  getMessageInteractionProps,
  suppressNativeMessageContextMenu,
  onMessageActionTrigger,
  onMessageImageClick,
  onScrollToBottomClick,
}: ConversationMessagesPaneProps) {
  return (
    <div className="relative flex-1 min-h-0">
      <div
        ref={messagesScrollRef}
        data-testid="conversation-messages-scroll"
        onScroll={onScroll}
        className={`h-full min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y elegant-scrollbar ${
          isMobile ? MOBILE_MESSAGE_SIDE_PADDING_CLASS : DESKTOP_MESSAGE_SIDE_PADDING_CLASS
        }`}
      >
        {loading ? (
          <ConversationMessagesSkeleton isMobile={isMobile} />
        ) : ordered.length === 0 ? (
          <ConversationEmptyState text={noMessagesYetText} />
        ) : (
          <div
            ref={messagesStackRef}
            data-testid="conversation-messages-stack"
            className="flex min-h-full flex-col justify-end"
          >
            <div className="space-y-2">
              {ordered.map((message, index) => (
                <ConversationMessageRow
                  key={message.id}
                  message={message}
                  prevMessage={index > 0 ? ordered[index - 1] : null}
                  nextMessage={index < ordered.length - 1 ? ordered[index + 1] : null}
                  currentUserId={currentUserId}
                  isMobile={isMobile}
                  lastSeenMessageId={lastSeenMessageId}
                  targetUserName={targetUserName}
                  targetUserAvatarUrl={targetUserAvatarUrl}
                  imagePreviewAlt={imagePreviewAlt}
                  deletedMessageText={deletedMessageText}
                  openImagePreviewLabel={openImagePreviewLabel}
                  openMessageActionsLabel={openMessageActionsLabel}
                  seenLabel={seenLabel}
                  isSelectedForMobileMessageActions={isMobile && selectedMessageId === message.id}
                  messageRowAttributes={{
                    'data-message-row-id': String(message.id),
                    'data-testid': `message-row-${message.id}`,
                  }}
                  messageInteractionProps={getMessageInteractionProps(message.id, !message.is_deleted)}
                  suppressNativeMessageContextMenu={suppressNativeMessageContextMenu}
                  onMessageActionTrigger={onMessageActionTrigger}
                  onMessageImageClick={onMessageImageClick}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {isMobile && showScrollToBottomButton ? (
        <ConversationScrollToBottomButton
          ariaLabel={scrollToBottomLabel}
          onClick={onScrollToBottomClick}
        />
      ) : null}
    </div>
  );
}
