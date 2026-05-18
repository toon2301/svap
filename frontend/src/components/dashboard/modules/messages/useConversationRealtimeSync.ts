'use client';

import type React from 'react';
import { useCallback, useEffect, useRef } from 'react';
import {
  MESSAGING_OPEN_CONVERSATION_ACTIONS_EVENT,
  MESSAGING_REALTIME_DELETED_EVENT,
  MESSAGING_REALTIME_GROUP_EVENT,
  MESSAGING_REALTIME_MESSAGE_EVENT,
  MESSAGING_REALTIME_PINNED_MESSAGE_EVENT,
  MESSAGING_REALTIME_READ_EVENT,
  isPassiveMessagingRefreshSuppressed,
  type MessagingRealtimeDeletedPayload,
  type MessagingRealtimeGroupPayload,
  type MessagingRealtimeMessagePayload,
  type MessagingRealtimePinnedMessagePayload,
  type MessagingRealtimeReadPayload,
} from './messagesEvents';
import { MESSAGE_POLL_INTERVAL_MS } from './conversationDetailConstants';
import { pickLatestTimestamp } from './conversationDetailUtils';
import type { MessageItem } from './types';
import type { ConversationRefreshOptions } from './useConversationThreadController';

const REALTIME_MESSAGE_REFRESH_DEBOUNCE_MS = 350;

type MessageActionsTarget = {
  messageId: number;
  anchorRect: DOMRect | null;
} | null;

type UseConversationRealtimeSyncArgs = {
  conversationId: number;
  refresh: (options?: ConversationRefreshOptions) => Promise<unknown>;
  isRealtimeConnected: boolean;
  isMobile: boolean;
  openConversationActions: (anchorRect: DOMRect | null) => void;
  hasLoadedMessage: (messageId: number) => boolean;
  markMessageDeletedLocally: (messageId: number) => void;
  setPeerLastReadAt: React.Dispatch<React.SetStateAction<string | null>>;
  setMessageActionsTarget: React.Dispatch<React.SetStateAction<MessageActionsTarget>>;
  setMessagePendingDeleteId: React.Dispatch<React.SetStateAction<number | null>>;
  setPinnedMessage: React.Dispatch<React.SetStateAction<MessageItem | null>>;
};

function mergeRefreshOptions(
  current: ConversationRefreshOptions | null,
  next: ConversationRefreshOptions,
): ConversationRefreshOptions {
  const currentScrollBehavior = current?.scrollBehavior ?? 'none';
  const nextScrollBehavior = next.scrollBehavior ?? 'none';
  const scrollBehavior =
    currentScrollBehavior === 'force_latest' || nextScrollBehavior === 'force_latest'
      ? 'force_latest'
      : currentScrollBehavior === 'if_near_bottom' || nextScrollBehavior === 'if_near_bottom'
        ? 'if_near_bottom'
        : 'none';

  return {
    showError: Boolean(current?.showError || next.showError),
    markAsRead: Boolean(current?.markAsRead || next.markAsRead),
    syncConversations: Boolean(current?.syncConversations || next.syncConversations),
    scrollBehavior,
  };
}

export function useConversationRealtimeSync({
  conversationId,
  refresh,
  isRealtimeConnected,
  isMobile,
  openConversationActions,
  hasLoadedMessage,
  markMessageDeletedLocally,
  setPeerLastReadAt,
  setMessageActionsTarget,
  setMessagePendingDeleteId,
  setPinnedMessage,
}: UseConversationRealtimeSyncArgs) {
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshInFlightRef = useRef<Promise<unknown> | null>(null);
  const pendingRefreshOptionsRef = useRef<ConversationRefreshOptions | null>(null);
  const lastRefreshStartedAtRef = useRef(0);

  const runPendingRefresh = useCallback(() => {
    if (refreshDebounceTimerRef.current) {
      clearTimeout(refreshDebounceTimerRef.current);
      refreshDebounceTimerRef.current = null;
    }
    if (refreshInFlightRef.current) return;

    const options = pendingRefreshOptionsRef.current;
    pendingRefreshOptionsRef.current = null;
    if (!options) return;

    lastRefreshStartedAtRef.current = Date.now();
    const request = refresh(options)
      .catch(() => undefined)
      .finally(() => {
        if (refreshInFlightRef.current === request) {
          refreshInFlightRef.current = null;
        }
        if (pendingRefreshOptionsRef.current && !refreshDebounceTimerRef.current) {
          refreshDebounceTimerRef.current = setTimeout(
            runPendingRefresh,
            REALTIME_MESSAGE_REFRESH_DEBOUNCE_MS,
          );
        }
      });
    refreshInFlightRef.current = request;
  }, [refresh]);

  const requestCoalescedRefresh = useCallback(
    (options: ConversationRefreshOptions) => {
      if (refreshInFlightRef.current) return;

      pendingRefreshOptionsRef.current = mergeRefreshOptions(
        pendingRefreshOptionsRef.current,
        options,
      );

      const elapsedSinceLastStart = Date.now() - lastRefreshStartedAtRef.current;
      const debounceDelay = Math.max(
        0,
        REALTIME_MESSAGE_REFRESH_DEBOUNCE_MS - elapsedSinceLastStart,
      );

      if (refreshDebounceTimerRef.current) {
        clearTimeout(refreshDebounceTimerRef.current);
        refreshDebounceTimerRef.current = null;
      }

      if (debounceDelay === 0) {
        runPendingRefresh();
        return;
      }

      refreshDebounceTimerRef.current = setTimeout(
        runPendingRefresh,
        debounceDelay,
      );
    },
    [runPendingRefresh],
  );

  useEffect(() => {
    return () => {
      if (refreshDebounceTimerRef.current) {
        clearTimeout(refreshDebounceTimerRef.current);
        refreshDebounceTimerRef.current = null;
      }
      pendingRefreshOptionsRef.current = null;
      refreshInFlightRef.current = null;
      lastRefreshStartedAtRef.current = 0;
    };
  }, [conversationId, refresh]);

  useEffect(() => {
    const stopPolling = () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };

    const refreshIfVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (isPassiveMessagingRefreshSuppressed()) return;
      requestCoalescedRefresh({
        showError: false,
        markAsRead: true,
        syncConversations: true,
        scrollBehavior: 'if_near_bottom',
      });
    };

    if (!isRealtimeConnected) {
      pollIntervalRef.current = setInterval(() => {
        refreshIfVisible();
      }, MESSAGE_POLL_INTERVAL_MS);
    }

    window.addEventListener('focus', refreshIfVisible);
    document.addEventListener('visibilitychange', refreshIfVisible);

    return () => {
      stopPolling();
      window.removeEventListener('focus', refreshIfVisible);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, [isRealtimeConnected, requestCoalescedRefresh]);

  useEffect(() => {
    const handleRealtimeMessage = (event: Event) => {
      const detail = (event as CustomEvent<MessagingRealtimeMessagePayload>).detail;
      if (!detail || detail.conversationId !== conversationId) return;
      if (hasLoadedMessage(detail.messageId)) return;

      requestCoalescedRefresh({
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
  }, [conversationId, hasLoadedMessage, requestCoalescedRefresh]);

  useEffect(() => {
    const handleRealtimeGroup = (event: Event) => {
      const detail = (event as CustomEvent<MessagingRealtimeGroupPayload>).detail;
      if (!detail || detail.conversationId !== conversationId) return;

      requestCoalescedRefresh({
        showError: false,
        markAsRead: true,
        syncConversations: true,
        scrollBehavior: 'if_near_bottom',
      });
    };

    window.addEventListener(MESSAGING_REALTIME_GROUP_EVENT, handleRealtimeGroup);

    return () => {
      window.removeEventListener(MESSAGING_REALTIME_GROUP_EVENT, handleRealtimeGroup);
    };
  }, [conversationId, requestCoalescedRefresh]);

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
