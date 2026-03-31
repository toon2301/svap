'use client';

import type { ConversationListItem } from '@/components/dashboard/modules/messages/types';

export type MessageUnreadCountListener = (count: number) => void;

type MessageUnreadCountStore = {
  unreadCount: number;
  lastSuccessfulRefreshAt: number;
  refreshPromise: Promise<void> | null;
  listeners: Set<MessageUnreadCountListener>;
  userId: number | null;
};

type GlobalScopeWithMessageStore = typeof globalThis & {
  __SWAPLY_MSG_UNREAD_STORE__?: MessageUnreadCountStore;
};

function createMessageUnreadCountStore(): MessageUnreadCountStore {
  return {
    unreadCount: 0,
    lastSuccessfulRefreshAt: 0,
    refreshPromise: null,
    listeners: new Set(),
    userId: null,
  };
}

export function getMessageUnreadCountStore(): MessageUnreadCountStore {
  const globalScope = globalThis as GlobalScopeWithMessageStore;

  if (!globalScope.__SWAPLY_MSG_UNREAD_STORE__) {
    globalScope.__SWAPLY_MSG_UNREAD_STORE__ = createMessageUnreadCountStore();
  }

  return globalScope.__SWAPLY_MSG_UNREAD_STORE__;
}

export function publishMessageUnreadCount(count: number, options?: { markFresh?: boolean }): void {
  const store = getMessageUnreadCountStore();
  const safeCount = Math.max(0, Number.isFinite(count) ? count : 0);
  if (options?.markFresh !== false) {
    store.lastSuccessfulRefreshAt = Date.now();
  }
  store.unreadCount = safeCount;
  store.listeners.forEach((listener) => {
    try {
      listener(safeCount);
    } catch {
      // ignore listener failures
    }
  });
}

export function bindMessageUnreadCountStoreToUser(userId: number | null): boolean {
  const store = getMessageUnreadCountStore();
  if (store.userId === userId) {
    return false;
  }

  store.userId = userId;
  store.lastSuccessfulRefreshAt = 0;
  publishMessageUnreadCount(0, { markFresh: false });
  return true;
}

export function subscribeToMessageUnreadCount(listener: MessageUnreadCountListener): () => void {
  const store = getMessageUnreadCountStore();
  store.listeners.add(listener);
  return () => {
    store.listeners.delete(listener);
  };
}

export function isMessageUnreadCountFresh(maxAgeMs: number): boolean {
  return Date.now() - getMessageUnreadCountStore().lastSuccessfulRefreshAt < maxAgeMs;
}

export function syncMessageUnreadCountFromConversations(items: ConversationListItem[]): void {
  const totalUnreadCount = (Array.isArray(items) ? items : []).reduce((sum, item) => {
    const unreadCount =
      typeof item?.unread_count === 'number'
        ? item.unread_count
        : item?.has_unread
          ? 1
          : 0;
    return sum + Math.max(0, unreadCount);
  }, 0);

  publishMessageUnreadCount(totalUnreadCount);
}

export function applyIncomingMessageUnreadEvent(options: {
  totalUnreadCount?: number;
  conversationId: number;
  activeConversationId: number | null;
  senderId: number;
  currentUserId: number | null | undefined;
}): void {
  const { totalUnreadCount, conversationId, activeConversationId, senderId, currentUserId } = options;

  if (typeof totalUnreadCount === 'number') {
    publishMessageUnreadCount(totalUnreadCount);
    return;
  }

  if (currentUserId == null || senderId === currentUserId || activeConversationId === conversationId) {
    return;
  }

  const store = getMessageUnreadCountStore();
  publishMessageUnreadCount(store.unreadCount + 1);
}
