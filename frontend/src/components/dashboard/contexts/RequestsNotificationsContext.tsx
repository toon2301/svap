'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, endpoints, ensureSessionRefreshed } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type RequestsNotificationsContextValue = {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  markAllRead: () => Promise<void>;
};

const RequestsNotificationsContext = createContext<RequestsNotificationsContextValue | null>(null);

const POLL_INTERVAL_MS = 10000;
const UNREAD_COUNT_FRESH_MS = 15000;
const WS_CLOSE_GRACE_MS = 750;
const WS_REAUTH_RECONNECT_DELAY_MS = 250;

type WsNotificationPayload = {
  type?: string;
  unread_count?: number;
};

type WsListener = (payload: WsNotificationPayload) => void;
type WsStatusListener = (connected: boolean) => void;
type UnreadCountListener = (count: number) => void;

type WsStore = {
  ws: WebSocket | null;
  closeTimer: number | null;
  connectTimer: number | null;
  refCount: number;
  retryCount: number;
  refreshPromise: Promise<boolean> | null;
  listeners: Set<WsListener>;
  openListeners: Set<() => void>;
  statusListeners: Set<WsStatusListener>;
  isOpen: boolean;
  origin: string | null;
};

type UnreadCountStore = {
  unreadCount: number;
  lastSuccessfulRefreshAt: number;
  refreshPromise: Promise<void> | null;
  listeners: Set<UnreadCountListener>;
};

function getWsStore(): WsStore {
  const globalScope = globalThis as typeof globalThis & {
    __SWAPLY_REQ_WS_STORE__?: WsStore;
  };

  if (!globalScope.__SWAPLY_REQ_WS_STORE__) {
    globalScope.__SWAPLY_REQ_WS_STORE__ = {
      ws: null,
      closeTimer: null,
      connectTimer: null,
      refCount: 0,
      retryCount: 0,
      refreshPromise: null,
      listeners: new Set(),
      openListeners: new Set(),
      statusListeners: new Set(),
      isOpen: false,
      origin: null,
    };
  }

  return globalScope.__SWAPLY_REQ_WS_STORE__;
}

function getUnreadCountStore(): UnreadCountStore {
  const globalScope = globalThis as typeof globalThis & {
    __SWAPLY_REQ_UNREAD_STORE__?: UnreadCountStore;
  };

  if (!globalScope.__SWAPLY_REQ_UNREAD_STORE__) {
    globalScope.__SWAPLY_REQ_UNREAD_STORE__ = {
      unreadCount: 0,
      lastSuccessfulRefreshAt: 0,
      refreshPromise: null,
      listeners: new Set(),
    };
  }

  return globalScope.__SWAPLY_REQ_UNREAD_STORE__;
}

function publishUnreadCount(store: UnreadCountStore, count: number): void {
  store.unreadCount = count;
  store.listeners.forEach((listener) => {
    try {
      listener(count);
    } catch {
      // ignore listener failures
    }
  });
}

function notifyWsStatus(store: WsStore, connected: boolean): void {
  if (store.isOpen === connected) return;
  store.isOpen = connected;
  store.statusListeners.forEach((listener) => {
    try {
      listener(connected);
    } catch {
      // ignore listener failures
    }
  });
}

function getBackendOrigin(): string {
  const explicitOrigin = process.env.NEXT_PUBLIC_BACKEND_ORIGIN;
  if (explicitOrigin) return explicitOrigin.replace(/\/+$/, '');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl) {
    const cleaned = apiUrl.replace(/\/+$/, '');
    return cleaned.endsWith('/api') ? cleaned.slice(0, -4) : cleaned;
  }

  return 'http://localhost:8000';
}

function getWebSocketOrigin(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== 'undefined' && apiUrl && apiUrl.startsWith('/')) {
    return window.location.origin;
  }
  return getBackendOrigin();
}

function toWebSocketUrl(origin: string): string {
  const wsOrigin = origin.startsWith('https://')
    ? origin.replace(/^https:\/\//, 'wss://')
    : origin.replace(/^http:\/\//, 'ws://');

  return `${wsOrigin}/ws/notifications/`;
}

function isDocumentVisible(): boolean {
  if (typeof document === 'undefined') return true;
  return document.visibilityState !== 'hidden';
}

async function refreshAccessTokenForWs(store: WsStore): Promise<boolean> {
  if (store.refreshPromise) {
    return store.refreshPromise;
  }

  const refreshPromise = (async () => {
    try {
      const result = await ensureSessionRefreshed();
      return result === 'refreshed';
    } catch {
      return false;
    }
  })();

  store.refreshPromise = refreshPromise;

  try {
    return await refreshPromise;
  } finally {
    if (store.refreshPromise === refreshPromise) {
      store.refreshPromise = null;
    }
  }
}

function scheduleWsConnect(store: WsStore, delayMs = 0): void {
  if (typeof window === 'undefined') return;
  if (store.refCount === 0 || !store.origin) return;
  if (store.connectTimer !== null) return;

  store.connectTimer = window.setTimeout(() => {
    store.connectTimer = null;
    void connectWs(store);
  }, delayMs);
}

async function connectWs(store: WsStore): Promise<void> {
  if (typeof window === 'undefined' || typeof WebSocket === 'undefined') return;
  if (store.refCount === 0 || !store.origin) return;

  if (store.ws && (store.ws.readyState === WebSocket.OPEN || store.ws.readyState === WebSocket.CONNECTING)) {
    if (store.ws.readyState === WebSocket.OPEN) {
      notifyWsStatus(store, true);
    }
    return;
  }

  const ws = new WebSocket(toWebSocketUrl(store.origin));
  store.ws = ws;
  notifyWsStatus(store, false);

  ws.onopen = () => {
    if (store.ws !== ws) return;

    store.retryCount = 0;
    notifyWsStatus(store, true);

    store.openListeners.forEach((listener) => {
      try {
        listener();
      } catch {
        // ignore listener failures
      }
    });
  };

  ws.onmessage = (event) => {
    try {
      const payload = JSON.parse(String(event.data || '{}')) as WsNotificationPayload;
      store.listeners.forEach((listener) => {
        try {
          listener(payload);
        } catch {
          // ignore listener failures
        }
      });
    } catch {
      // ignore malformed websocket payloads
    }
  };

  ws.onclose = async (event) => {
    if (store.ws === ws) {
      store.ws = null;
    }
    notifyWsStatus(store, false);

    if (store.refCount === 0) return;

    if (event?.code === 4401 || event?.code === 4403) {
      const refreshed = await refreshAccessTokenForWs(store);
      if (!refreshed || store.refCount === 0) return;

      scheduleWsConnect(store, WS_REAUTH_RECONNECT_DELAY_MS);
      return;
    }

    const attempt = store.retryCount + 1;
    store.retryCount = attempt;
    const delay = Math.min(30000, 1000 * Math.pow(2, Math.min(5, attempt)));
    scheduleWsConnect(store, delay);
  };

  ws.onerror = () => {
    // Browser will follow with onclose; reconnect logic lives there.
  };
}

function scheduleWsRelease(store: WsStore): void {
  if (typeof window === 'undefined') return;

  if (store.closeTimer !== null) {
    window.clearTimeout(store.closeTimer);
  }

  store.closeTimer = window.setTimeout(() => {
    store.closeTimer = null;
    if (store.refCount !== 0) return;

    if (store.connectTimer !== null) {
      window.clearTimeout(store.connectTimer);
      store.connectTimer = null;
    }

    store.retryCount = 0;
    store.origin = null;

    if (store.ws) {
      const ws = store.ws;
      store.ws = null;
      notifyWsStatus(store, false);

      try {
        ws.close();
      } catch {
        // ignore close failures
      }

      return;
    }

    notifyWsStatus(store, false);
  }, WS_CLOSE_GRACE_MS);
}

export function RequestsNotificationsProvider({ children }: { children: React.ReactNode }) {
  const { isLoading, user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(() => {
    const store = getUnreadCountStore();
    if (typeof user?.unread_skill_request_count === 'number') {
      store.unreadCount = user.unread_skill_request_count;
      return user.unread_skill_request_count;
    }
    return store.unreadCount;
  });
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return getWsStore().isOpen;
  });

  const isMountedRef = useRef(true);

  const isUnreadCountFresh = useCallback((maxAgeMs = UNREAD_COUNT_FRESH_MS) => {
    return Date.now() - getUnreadCountStore().lastSuccessfulRefreshAt < maxAgeMs;
  }, []);

  useEffect(() => {
    const store = getUnreadCountStore();

    if (typeof user?.unread_skill_request_count === 'number') {
      store.lastSuccessfulRefreshAt = Date.now();
      publishUnreadCount(store, user.unread_skill_request_count);
    }
  }, [user?.unread_skill_request_count]);

  useEffect(() => {
    const store = getUnreadCountStore();
    const listener: UnreadCountListener = (count) => {
      if (isMountedRef.current) {
        setUnreadCount(count);
      }
    };

    store.listeners.add(listener);

    return () => {
      store.listeners.delete(listener);
      isMountedRef.current = false;
    };
  }, []);

  const refreshUnreadCount = useCallback(async () => {
    const store = getUnreadCountStore();
    if (store.refreshPromise) {
      return store.refreshPromise;
    }

    let requestPromise: Promise<void> | null = null;
    requestPromise = (async () => {
      try {
        const response = await api.get(endpoints.notifications.unreadCount, {
          params: { type: 'skill_request' },
        });
        const count = typeof response?.data?.count === 'number' ? response.data.count : 0;
        store.lastSuccessfulRefreshAt = Date.now();
        publishUnreadCount(store, count);
      } catch {
        // fail-open
      } finally {
        if (store.refreshPromise === requestPromise) {
          store.refreshPromise = null;
        }
      }
    })();

    store.refreshPromise = requestPromise;
    return requestPromise;
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await api.post(endpoints.notifications.markAllRead, { type: 'skill_request' });
      const store = getUnreadCountStore();
      store.lastSuccessfulRefreshAt = Date.now();
      publishUnreadCount(store, 0);
    } catch {
      // fail-open
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!isDocumentVisible()) return;
    if (isUnreadCountFresh()) return;
    void refreshUnreadCount();
  }, [isLoading, isUnreadCountFresh, refreshUnreadCount]);

  useEffect(() => {
    const refreshIfVisible = () => {
      if (isLoading) return;
      if (!isDocumentVisible()) return;
      if (isUnreadCountFresh()) return;
      void refreshUnreadCount();
    };

    document.addEventListener('visibilitychange', refreshIfVisible);
    window.addEventListener('focus', refreshIfVisible);

    return () => {
      document.removeEventListener('visibilitychange', refreshIfVisible);
      window.removeEventListener('focus', refreshIfVisible);
    };
  }, [isLoading, isUnreadCountFresh, refreshUnreadCount]);

  useEffect(() => {
    if (isLoading) return;
    if (isRealtimeConnected || !isDocumentVisible()) return;

    const intervalId = window.setInterval(() => {
      if (isLoading) return;
      if (!isDocumentVisible()) return;
      if (isUnreadCountFresh()) return;
      void refreshUnreadCount();
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isLoading, isRealtimeConnected, isUnreadCountFresh, refreshUnreadCount]);

  useEffect(() => {
    const origin = getWebSocketOrigin();
    const store = getWsStore();

    const onPayload: WsListener = (payload) => {
      if (payload.type === 'skill_request' && typeof payload.unread_count === 'number') {
        const unreadStore = getUnreadCountStore();
        unreadStore.lastSuccessfulRefreshAt = Date.now();
        publishUnreadCount(unreadStore, payload.unread_count);
      }
    };

    const onOpen = () => {
      if (isLoading) return;
      if (isUnreadCountFresh()) {
        return;
      }
      void refreshUnreadCount();
    };

    const onStatusChange: WsStatusListener = (connected) => {
      if (isMountedRef.current) {
        setIsRealtimeConnected(connected);
      }
    };

    store.listeners.add(onPayload);
    store.openListeners.add(onOpen);
    store.statusListeners.add(onStatusChange);
    store.refCount += 1;
    store.origin = origin;

    if (store.closeTimer !== null) {
      window.clearTimeout(store.closeTimer);
      store.closeTimer = null;
    }

    setIsRealtimeConnected(store.isOpen || store.ws?.readyState === WebSocket.OPEN);
    scheduleWsConnect(store, 0);

    return () => {
      store.listeners.delete(onPayload);
      store.openListeners.delete(onOpen);
      store.statusListeners.delete(onStatusChange);
      store.refCount = Math.max(0, store.refCount - 1);

      if (store.refCount === 0) {
        scheduleWsRelease(store);
      }
    };
  }, [isLoading, isUnreadCountFresh, refreshUnreadCount]);

  const value = useMemo<RequestsNotificationsContextValue>(
    () => ({ unreadCount, refreshUnreadCount, markAllRead }),
    [markAllRead, refreshUnreadCount, unreadCount],
  );

  return <RequestsNotificationsContext.Provider value={value}>{children}</RequestsNotificationsContext.Provider>;
}

export function useRequestsNotifications() {
  const context = useContext(RequestsNotificationsContext);
  if (!context) {
    throw new Error('useRequestsNotifications must be used within RequestsNotificationsProvider');
  }
  return context;
}
