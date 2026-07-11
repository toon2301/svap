'use client';

import type { ConversationListItem } from '@/components/dashboard/modules/messages/types';

import { loadSeenBaseline, saveSeenBaseline } from './seenBadgePersistence';

const SEEN_SCOPE = 'messages';

export type MessageUnreadCountListener = (count: number) => void;

type MessageUnreadCountSource = 'refresh' | 'realtime' | 'mutation';

type MessageUnreadCountStore = {
  // unreadCount = „viditeľné" pre badge = max(0, rawUnreadCount - acknowledgedUnreadBaseline)
  unreadCount: number;
  // rawUnreadCount = skutočný total neprečítaných zo servera (zdroj pravdy)
  rawUnreadCount: number;
  // acknowledgedUnreadBaseline = koľko z nich už používateľ „videl" (vstup do Správ)
  acknowledgedUnreadBaseline: number;
  acknowledgeNextRefresh: boolean;
  rawUnreadCountKnown: boolean;
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

function ensureStoreShape(store: MessageUnreadCountStore): MessageUnreadCountStore {
  if (typeof store.rawUnreadCount !== 'number') {
    store.rawUnreadCount = Math.max(0, store.unreadCount || 0);
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

export function getMessageUnreadCountStore(): MessageUnreadCountStore {
  const globalScope = globalThis as GlobalScopeWithMessageStore;

  if (!globalScope.__SWAPLY_MSG_UNREAD_STORE__) {
    globalScope.__SWAPLY_MSG_UNREAD_STORE__ = createMessageUnreadCountStore();
  }

  return ensureStoreShape(globalScope.__SWAPLY_MSG_UNREAD_STORE__);
}

function toSafeCount(count: number): number {
  return Math.max(0, Number.isFinite(count) ? count : 0);
}

function getVisibleUnreadCount(store: MessageUnreadCountStore): number {
  return Math.max(0, store.rawUnreadCount - store.acknowledgedUnreadBaseline);
}

function notifyListeners(store: MessageUnreadCountStore, count: number): void {
  store.unreadCount = toSafeCount(count);
  store.listeners.forEach((listener) => {
    try {
      listener(store.unreadCount);
    } catch {
      // ignore listener failures
    }
  });
}

export function publishMessageUnreadCount(
  count: number,
  options?: { markFresh?: boolean; source?: MessageUnreadCountSource },
): void {
  const store = getMessageUnreadCountStore();
  const safeCount = toSafeCount(count);
  const hadKnownRawCount = store.rawUnreadCountKnown;
  const source = options?.source ?? 'refresh';

  if (options?.markFresh !== false) {
    store.lastSuccessfulRefreshAt = Date.now();
  }

  if (store.acknowledgeNextRefresh && source === 'refresh') {
    // Prvý server refresh po acknowledge zosúladí baseline s reálnym počtom
    // (aby badge ostal skrytý). Ak medzitým počet narástol (nové) → baseline
    // sa NEposunie hore, takže rozdiel (nové) sa zobrazí.
    if (!hadKnownRawCount || safeCount <= store.acknowledgedUnreadBaseline) {
      store.acknowledgedUnreadBaseline = safeCount;
    }
    store.acknowledgeNextRefresh = false;
  } else if (source === 'realtime' && safeCount > store.acknowledgedUnreadBaseline) {
    // Nová správa cez WS → badge sa musí vrátiť, nech ju acknowledge nezožerie.
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
  notifyListeners(store, getVisibleUnreadCount(store));
}

export function acknowledgeMessageUnreadCount(): void {
  // Volá sa pri vstupe do sekcie Správy: „videl som, koľko je neprečítaných".
  // Badge zhasne (visible 0) a — vďaka persistovanému baseline — sa nevráti pri
  // navigácii ani po tvrdom refreshi. NEmení server read-stav ani per-konverzácia
  // badge v pravom zozname (tie klesnú až otvorením konkrétnej konverzácie).
  const store = getMessageUnreadCountStore();
  store.acknowledgedUnreadBaseline = store.rawUnreadCountKnown ? store.rawUnreadCount : 0;
  store.acknowledgeNextRefresh = true;
  saveSeenBaseline(SEEN_SCOPE, store.userId, store.acknowledgedUnreadBaseline);
  notifyListeners(store, 0);
}

export function bindMessageUnreadCountStoreToUser(userId: number | null): boolean {
  const store = getMessageUnreadCountStore();
  if (store.userId === userId) {
    return false;
  }

  store.userId = userId;
  store.lastSuccessfulRefreshAt = 0;
  store.rawUnreadCount = 0;
  store.acknowledgedUnreadBaseline = loadSeenBaseline(SEEN_SCOPE, userId) ?? 0;
  store.acknowledgeNextRefresh = false;
  store.rawUnreadCountKnown = false;
  notifyListeners(store, getVisibleUnreadCount(store));
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

export function syncMessageUnreadCountFromConversations(
  items: ConversationListItem[],
  options?: { snapshotAt?: number },
): void {
  // Stale-response guard: hodnota odvodená zo zoznamu, ktorého fetch začal PRED
  // novším autoritatívnym updatom (mark-read response, WS messaging_read), nesmie
  // tento update prepísať späť. Inak sa badge po prečítaní správ „vráti" so
  // starým číslom — refresh po prečítaní sa totiž deduplikuje do už bežiaceho
  // requestu so starším serverovým snapshotom.
  if (
    typeof options?.snapshotAt === 'number' &&
    getMessageUnreadCountStore().lastSuccessfulRefreshAt > options.snapshotAt
  ) {
    return;
  }

  const totalUnreadCount = (Array.isArray(items) ? items : []).reduce((sum, item) => {
    const unreadCount =
      typeof item?.unread_count === 'number'
        ? item.unread_count
        : item?.has_unread
          ? 1
          : 0;
    return sum + Math.max(0, unreadCount);
  }, 0);

  publishMessageUnreadCount(totalUnreadCount, { source: 'refresh' });
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
    publishMessageUnreadCount(totalUnreadCount, { source: 'realtime' });
    return;
  }

  if (currentUserId == null || senderId === currentUserId || activeConversationId === conversationId) {
    return;
  }

  const store = getMessageUnreadCountStore();
  publishMessageUnreadCount(store.rawUnreadCount + 1, { source: 'realtime' });
}
