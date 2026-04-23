'use client';

import { useCallback, useRef } from 'react';
import { markConversationRead } from './messagingApi';
import type { MessageItem } from './types';

type UseConversationReadStateArgs = {
  conversationId: number;
  currentUserId: number;
  syncConversationReadState: (options: {
    conversationId: number;
    totalUnreadCount?: number | null;
  }) => void;
};

export function useConversationReadState({
  conversationId,
  currentUserId,
  syncConversationReadState,
}: UseConversationReadStateArgs) {
  const lastMarkedIncomingMessageIdRef = useRef<number | null>(null);
  const pendingMarkReadIncomingMessageIdRef = useRef<number | null>(null);
  const markReadInFlightRef = useRef<Promise<void> | null>(null);
  const markReadSessionRef = useRef(0);

  const resetReadStateSession = useCallback(() => {
    markReadSessionRef.current += 1;
    markReadInFlightRef.current = null;
    lastMarkedIncomingMessageIdRef.current = null;
    pendingMarkReadIncomingMessageIdRef.current = null;
  }, []);

  const queueMarkConversationRead = useCallback(
    (list: MessageItem[]) => {
      const newestMessage =
        list.find((item) => item.sender?.id !== currentUserId && !item.is_deleted) ?? null;
      if (!newestMessage) return false;
      if (lastMarkedIncomingMessageIdRef.current === newestMessage.id) return false;

      const pendingMessageId = pendingMarkReadIncomingMessageIdRef.current;
      if (pendingMessageId === null || newestMessage.id > pendingMessageId) {
        pendingMarkReadIncomingMessageIdRef.current = newestMessage.id;
      }

      return true;
    },
    [currentUserId],
  );

  const flushPendingMarkConversationRead = useCallback(
    async (session: number) => {
      while (markReadSessionRef.current === session) {
        const messageId = pendingMarkReadIncomingMessageIdRef.current;
        if (messageId === null) return;

        pendingMarkReadIncomingMessageIdRef.current = null;
        if (lastMarkedIncomingMessageIdRef.current === messageId) {
          continue;
        }

        try {
          const result = await markConversationRead(conversationId);
          if (markReadSessionRef.current !== session) return;

          lastMarkedIncomingMessageIdRef.current = messageId;
          syncConversationReadState({
            conversationId,
            totalUnreadCount: result?.total_unread_count,
          });
        } catch {
          if (
            markReadSessionRef.current === session &&
            lastMarkedIncomingMessageIdRef.current !== messageId &&
            pendingMarkReadIncomingMessageIdRef.current === null
          ) {
            pendingMarkReadIncomingMessageIdRef.current = messageId;
          }
          return;
        }
      }
    },
    [conversationId, syncConversationReadState],
  );

  const maybeMarkConversationRead = useCallback(
    async (list: MessageItem[]) => {
      if (!queueMarkConversationRead(list)) return;

      if (!markReadInFlightRef.current) {
        const session = markReadSessionRef.current;
        let request: Promise<void> | null = null;
        request = (async () => {
          try {
            await flushPendingMarkConversationRead(session);
          } finally {
            if (markReadInFlightRef.current === request) {
              markReadInFlightRef.current = null;
            }
          }
        })();
        markReadInFlightRef.current = request;
      }

      const inFlightRequest = markReadInFlightRef.current;
      if (inFlightRequest) {
        await inFlightRequest;
      }
    },
    [flushPendingMarkConversationRead, queueMarkConversationRead],
  );

  return {
    maybeMarkConversationRead,
    resetReadStateSession,
  };
}
