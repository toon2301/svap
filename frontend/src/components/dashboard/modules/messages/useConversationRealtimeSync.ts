'use client';

import type React from 'react';
import { useEffect, useRef } from 'react';
import {
  MESSAGING_OPEN_CONVERSATION_ACTIONS_EVENT,
  MESSAGING_REALTIME_DELETED_EVENT,
  MESSAGING_REALTIME_MESSAGE_EVENT,
  MESSAGING_REALTIME_PINNED_MESSAGE_EVENT,
  MESSAGING_REALTIME_READ_EVENT,
  type MessagingRealtimeDeletedPayload,
  type MessagingRealtimeMessagePayload,
  type MessagingRealtimePinnedMessagePayload,
  type MessagingRealtimeReadPayload,
} from './messagesEvents';
import { MESSAGE_POLL_INTERVAL_MS } from './conversationDetailConstants';
import { pickLatestTimestamp } from './conversationDetailUtils';
import type { MessageItem } from './types';

type MessageActionsTarget = {
  messageId: number;
  anchorRect: DOMRect | null;
} | null;

type UseConversationRealtimeSyncArgs = {
  conversationId: number;
  refresh: (options?: {
    showError?: boolean;
    markAsRead?: boolean;
    syncConversations?: boolean;
    scrollBehavior?: 'none' | 'force_latest' | 'if_near_bottom';
  }) => Promise<unknown>;
  isMobile: boolean;
  openConversationActions: (anchorRect: DOMRect | null) => void;
  markMessageDeletedLocally: (messageId: number) => void;
  setPeerLastReadAt: React.Dispatch<React.SetStateAction<string | null>>;
  setMessageActionsTarget: React.Dispatch<React.SetStateAction<MessageActionsTarget>>;
  setMessagePendingDeleteId: React.Dispatch<React.SetStateAction<number | null>>;
  setPinnedMessage: React.Dispatch<React.SetStateAction<MessageItem | null>>;
};

export function useConversationRealtimeSync({
  conversationId,
  refresh,
  isMobile,
  openConversationActions,
  markMessageDeletedLocally,
  setPeerLastReadAt,
  setMessageActionsTarget,
  setMessagePendingDeleteId,
  setPinnedMessage,
}: UseConversationRealtimeSyncArgs) {
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const stopPolling = () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };

    const refreshIfVisible = () => {
      if (document.visibilityState !== 'visible') return;
      void refresh({
        showError: false,
        markAsRead: true,
        syncConversations: true,
        scrollBehavior: 'if_near_bottom',
      });
    };

    pollIntervalRef.current = setInterval(() => {
      refreshIfVisible();
    }, MESSAGE_POLL_INTERVAL_MS);

    window.addEventListener('focus', refreshIfVisible);
    document.addEventListener('visibilitychange', refreshIfVisible);

    return () => {
      stopPolling();
      window.removeEventListener('focus', refreshIfVisible);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, [refresh]);

  useEffect(() => {
    const handleRealtimeMessage = (event: Event) => {
      const detail = (event as CustomEvent<MessagingRealtimeMessagePayload>).detail;
      if (!detail || detail.conversationId !== conversationId) return;

      void refresh({
        showError: false,
        markAsRead: true,
        syncConversations: true,
        scrollBehavior: 'if_near_bottom',
      });
    };

    window.addEventListener(MESSAGING_REALTIME_MESSAGE_EVENT, handleRealtimeMessage);

    return () => {
      window.removeEventListener(MESSAGING_REALTIME_MESSAGE_EVENT, handleRealtimeMessage);
    };
  }, [conversationId, refresh]);

  useEffect(() => {
    const handleRealtimeRead = (event: Event) => {
      const detail = (event as CustomEvent<MessagingRealtimeReadPayload>).detail;
      if (!detail || detail.conversationId !== conversationId) return;

      setPeerLastReadAt((current) => pickLatestTimestamp(current, detail.peerLastReadAt || null));
    };

    window.addEventListener(MESSAGING_REALTIME_READ_EVENT, handleRealtimeRead);

    return () => {
      window.removeEventListener(MESSAGING_REALTIME_READ_EVENT, handleRealtimeRead);
    };
  }, [conversationId, setPeerLastReadAt]);

  useEffect(() => {
    const handleRealtimeDeleted = (event: Event) => {
      const detail = (event as CustomEvent<MessagingRealtimeDeletedPayload>).detail;
      if (!detail || detail.conversationId !== conversationId) return;

      markMessageDeletedLocally(detail.messageId);
      setMessageActionsTarget((current) =>
        current?.messageId === detail.messageId ? null : current,
      );
      setMessagePendingDeleteId((current) => (current === detail.messageId ? null : current));
      setPinnedMessage((current) => (current?.id === detail.messageId ? null : current));
    };

    window.addEventListener(MESSAGING_REALTIME_DELETED_EVENT, handleRealtimeDeleted);

    return () => {
      window.removeEventListener(MESSAGING_REALTIME_DELETED_EVENT, handleRealtimeDeleted);
    };
  }, [
    conversationId,
    markMessageDeletedLocally,
    setMessageActionsTarget,
    setMessagePendingDeleteId,
    setPinnedMessage,
  ]);

  useEffect(() => {
    const handleRealtimePinnedMessage = (event: Event) => {
      const detail = (event as CustomEvent<MessagingRealtimePinnedMessagePayload>).detail;
      if (!detail || detail.conversationId !== conversationId) return;

      setPinnedMessage(detail.pinnedMessage);
    };

    window.addEventListener(
      MESSAGING_REALTIME_PINNED_MESSAGE_EVENT,
      handleRealtimePinnedMessage,
    );

    return () => {
      window.removeEventListener(
        MESSAGING_REALTIME_PINNED_MESSAGE_EVENT,
        handleRealtimePinnedMessage,
      );
    };
  }, [conversationId, setPinnedMessage]);

  useEffect(() => {
    const handleOpenConversationActionsEvent = () => {
      if (!isMobile) return;
      openConversationActions(null);
    };

    window.addEventListener(
      MESSAGING_OPEN_CONVERSATION_ACTIONS_EVENT,
      handleOpenConversationActionsEvent,
    );

    return () => {
      window.removeEventListener(
        MESSAGING_OPEN_CONVERSATION_ACTIONS_EVENT,
        handleOpenConversationActionsEvent,
      );
    };
  }, [isMobile, openConversationActions]);
}
