'use client';

import { loadSeenBaseline, saveSeenBaseline } from './seenBadgePersistence';

const SEEN_SCOPE = 'notifications';

export type NotificationUnreadCountListener = (count: number) => void;

type NotificationUnreadCountSource = 'refresh' | 'realtime' | 'mutation';

type NotificationUnreadCountStore = {
  unreadCount: number;
  rawUnreadCount: number;
  acknowledgedUnreadBaseline: number;
  acknowledgeNextRefresh: boolean;
  rawUnreadCountKnown: boolean;
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
    rawUnreadCount: 0,
    acknowledgedUnreadBaseline: 0,
    acknowledgeNextRefresh: false,
    rawUnreadCountKnown: false,
    lastSuccessfulRefreshAt: 0,
    refreshPromise: null,
    listeners: new Set(),
    userId: null,
  };
}

function toSafeCount(count: number): number {
  return Math.max(0, Number.isFinite(count) ? count : 0);
}

function getVisibleUnreadCount(store: NotificationUnreadCountStore): number {
  return Math.max(0, store.rawUnreadCount - store.acknowledgedUnreadBaseline);
}

function notifyNotificationUnreadCountListeners(
  store: NotificationUnreadCountStore,
  count: number,
): void {
  store.unreadCount = toSafeCount(count);
  store.listeners.forEach((listener) => {
    try {
      listener(store.unreadCount);
    } catch {
      // ignore listener failures
    }
  });
}

function ensureNotificationUnreadCountStoreShape(
  store: NotificationUnreadCountStore,
): NotificationUnreadCountStore {
  if (typeof store.rawUnreadCount !== 'number') {
    store.rawUnreadCount = toSafeCount(store.unreadCount);
  }
  if (typeof store.acknowledgedUnreadBaseline !== 'number') {
    store.acknowledgedUnreadBaseline = 0;
  }
  if (typeof store.acknowledgeNextRefresh !== 'boolean') {
    store.acknowledgeNextRefresh = false;
  }
  if (typeof store.rawUnreadCountKnown !== 'boolean') {
    store.rawUnreadCountKnown = true;
  }
  return store;
}

export function getNotificationUnreadCountStore(): NotificationUnreadCountStore {
  const globalScope = globalThis as GlobalScopeWithNotificationStore;

  if (!globalScope.__SWAPLY_NOTIF_UNREAD_STORE__) {
    globalScope.__SWAPLY_NOTIF_UNREAD_STORE__ = createNotificationUnreadCountStore();
  }

  return ensureNotificationUnreadCountStoreShape(globalScope.__SWAPLY_NOTIF_UNREAD_STORE__);
}

export function publishNotificationUnreadCount(
  count: number,
  options?: { markFresh?: boolean; source?: NotificationUnreadCountSource },
): void {
  const store = getNotificationUnreadCountStore();
  const safeCount = toSafeCount(count);
  const hadKnownRawCount = store.rawUnreadCountKnown;
  if (options?.markFresh !== false) {
    store.lastSuccessfulRefreshAt = Date.now();
  }

  if (store.acknowledgeNextRefresh && options?.source === 'refresh') {
    if (!hadKnownRawCount || safeCount <= store.acknowledgedUnreadBaseline) {
      store.acknowledgedUnreadBaseline = safeCount;
    }
    store.acknowledgeNextRefresh = false;
  } else if (options?.source === 'realtime' && safeCount > store.acknowledgedUnreadBaseline) {
    store.acknowledgeNextRefresh = false;
  }

  store.rawUnreadCount = safeCount;
  store.rawUnreadCountKnown = true;

  if (store.acknowledgedUnreadBaseline > safeCount) {
    store.acknowledgedUnreadBaseline = safeCount;
  }
  if (safeCount === 0) {
    store.acknowledgeNextRefresh = false;
  }

  saveSeenBaseline(SEEN_SCOPE, store.userId, store.acknowledgedUnreadBaseline);
  notifyNotificationUnreadCountListeners(store, getVisibleUnreadCount(store));
}

export function acknowledgeNotificationUnreadCount(): void {
  const store = getNotificationUnreadCountStore();
  store.acknowledgedUnreadBaseline = store.rawUnreadCountKnown ? store.rawUnreadCount : 0;
  store.acknowledgeNextRefresh = true;
  saveSeenBaseline(SEEN_SCOPE, store.userId, store.acknowledgedUnreadBaseline);
  notifyNotificationUnreadCountListeners(store, 0);
}

export function bindNotificationUnreadCountStoreToUser(userId: number | null): boolean {
  const store = getNotificationUnreadCountStore();
  if (store.userId === userId) {
    return false;
  }

  store.userId = userId;
  store.lastSuccessfulRefreshAt = 0;
  store.rawUnreadCount = 0;
  // Obnov „videný" baseline z localStorage (per-zariadenie), aby badge neožil po
  // tvrdom refreshi. raw ostáva neznáme (0) – prvý server refresh ho zosúladí:
  // ak vráti rovnaký/menší počet → visible 0; ak väčší (nové) → ukáže rozdiel.
  store.acknowledgedUnreadBaseline = loadSeenBaseline(SEEN_SCOPE, userId) ?? 0;
  store.acknowledgeNextRefresh = false;
  store.rawUnreadCountKnown = false;
  notifyNotificationUnreadCountListeners(store, getVisibleUnreadCount(store));
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
