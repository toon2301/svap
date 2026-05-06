'use client';

export type NotificationUnreadCountListener = (count: number) => void;

type NotificationUnreadCountStore = {
  unreadCount: number;
  lastSuccessfulRefreshAt: number;
  refreshPromise: Promise<void> | null;
  listeners: Set<NotificationUnreadCountListener>;
  userId: number | null;
};

type GlobalScopeWithNotificationStore = typeof globalThis & {
  __SWAPLY_NOTIF_UNREAD_STORE__?: NotificationUnreadCountStore;
};

function createNotificationUnreadCountStore(): NotificationUnreadCountStore {
  return {
    unreadCount: 0,
    lastSuccessfulRefreshAt: 0,
    refreshPromise: null,
    listeners: new Set(),
    userId: null,
  };
}

export function getNotificationUnreadCountStore(): NotificationUnreadCountStore {
  const globalScope = globalThis as GlobalScopeWithNotificationStore;

  if (!globalScope.__SWAPLY_NOTIF_UNREAD_STORE__) {
    globalScope.__SWAPLY_NOTIF_UNREAD_STORE__ = createNotificationUnreadCountStore();
  }

  return globalScope.__SWAPLY_NOTIF_UNREAD_STORE__;
}

export function publishNotificationUnreadCount(
  count: number,
  options?: { markFresh?: boolean },
): void {
  const store = getNotificationUnreadCountStore();
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

export function bindNotificationUnreadCountStoreToUser(userId: number | null): boolean {
  const store = getNotificationUnreadCountStore();
  if (store.userId === userId) {
    return false;
  }

  store.userId = userId;
  store.lastSuccessfulRefreshAt = 0;
  publishNotificationUnreadCount(0, { markFresh: false });
  return true;
}

export function subscribeToNotificationUnreadCount(
  listener: NotificationUnreadCountListener,
): () => void {
  const store = getNotificationUnreadCountStore();
  store.listeners.add(listener);
  return () => {
    store.listeners.delete(listener);
  };
}

export function isNotificationUnreadCountFresh(maxAgeMs: number): boolean {
  return Date.now() - getNotificationUnreadCountStore().lastSuccessfulRefreshAt < maxAgeMs;
}
