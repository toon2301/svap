'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, endpoints, ensureSessionRefreshed } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { getUnreadMessagesSummary } from '@/components/dashboard/modules/messages/messagingApi';
import {
  dispatchMessagingRealtimeMessage,
  requestConversationsRefresh,
} from '@/components/dashboard/modules/messages/messagesEvents';
import {
  applyIncomingMessageUnreadEvent,
  bindMessageUnreadCountStoreToUser,
  getMessageUnreadCountStore,
  isMessageUnreadCountFresh,
  publishMessageUnreadCount,
  subscribeToMessageUnreadCount,
} from './messageUnreadStore';

type DashboardNotificationsContextValue = {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  markAllRead: () => Promise<void>;
  messageUnreadCount: number;
  refreshMessageUnreadCount: () => Promise<void>;
  setActiveConversationId: (conversationId: number | null) => void;
  syncConversationReadState: (options: {
    conversationId: number;
    totalUnreadCount?: number | null;
  }) => void;
};

const RequestsNotificationsContext = createContext<DashboardNotificationsContextValue | null>(null);

const POLL_INTERVAL_MS = 10000;
const UNREAD_COUNT_FRESH_MS = 15000;
const WS_CLOSE_GRACE_MS = 750;
const WS_REAUTH_RECONNECT_DELAY_MS = 250;
const MESSAGE_SOUND_COOLDOWN_MS = 750;
const MESSAGE_NOTIFICATION_SOUND_SRC = '/sounds/universfield-new-notification-040-493469.mp3';

type WsNotificationPayload = {
  type?: string;
  unread_count?: number;
  conversation_id?: number;
  conversation_unread_count?: number;
  total_unread_count?: number;
  message_id?: number;
  sender_id?: number;
  created_at?: string;
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

type CountStore = {
  unreadCount: number;
  lastSuccessfulRefreshAt: number;
  refreshPromise: Promise<void> | null;
  listeners: Set<UnreadCountListener>;
};

type GlobalScopeWithStores = typeof globalThis & {
  __SWAPLY_REQ_WS_STORE__?: WsStore;
  __SWAPLY_REQ_UNREAD_STORE__?: CountStore;
  __SWAPLY_MSG_AUDIO_CTX__?: AudioContext;
  __SWAPLY_MSG_AUDIO__?: HTMLAudioElement;
};

function getWsStore(): WsStore {
  const globalScope = globalThis as GlobalScopeWithStores;

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

function createCountStore(): CountStore {
  return {
    unreadCount: 0,
    lastSuccessfulRefreshAt: 0,
    refreshPromise: null,
    listeners: new Set(),
  };
}

function getRequestUnreadCountStore(): CountStore {
  const globalScope = globalThis as GlobalScopeWithStores;

  if (!globalScope.__SWAPLY_REQ_UNREAD_STORE__) {
    globalScope.__SWAPLY_REQ_UNREAD_STORE__ = createCountStore();
  }

  return globalScope.__SWAPLY_REQ_UNREAD_STORE__;
}

function publishUnreadCount(store: CountStore, count: number): void {
  const safeCount = Math.max(0, Number.isFinite(count) ? count : 0);
  store.unreadCount = safeCount;
  store.listeners.forEach((listener) => {
    try {
      listener(safeCount);
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
  if (typeof window !== 'undefined') {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl || apiUrl.startsWith('/')) {
      return window.location.origin.replace(/\/+$/, '');
    }
  }

  const explicitWsOrigin = process.env.NEXT_PUBLIC_BACKEND_WS_ORIGIN;
  if (explicitWsOrigin) return explicitWsOrigin.replace(/\/+$/, '');

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

function playFallbackMessageNotificationTone(): void {
  if (typeof window === 'undefined') return;

  try {
    const AudioCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;

    const globalScope = globalThis as GlobalScopeWithStores;
    if (!globalScope.__SWAPLY_MSG_AUDIO_CTX__) {
      globalScope.__SWAPLY_MSG_AUDIO_CTX__ = new AudioCtor();
    }

    const audioContext = globalScope.__SWAPLY_MSG_AUDIO_CTX__;
    if (!audioContext) return;

    if (audioContext.state === 'suspended') {
      void audioContext.resume().catch(() => {
        // best-effort only
      });
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const now = audioContext.currentTime;

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, now);

    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(0.03, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.15);
  } catch {
    // fail-open
  }
}

function playMessageNotificationTone(): void {
  if (typeof window === 'undefined') return;

  try {
    const globalScope = globalThis as GlobalScopeWithStores;
    if (!globalScope.__SWAPLY_MSG_AUDIO__) {
      const audio = new Audio(MESSAGE_NOTIFICATION_SOUND_SRC);
      audio.preload = 'auto';
      audio.volume = 0.45;
      globalScope.__SWAPLY_MSG_AUDIO__ = audio;
    }

    const notificationAudio = globalScope.__SWAPLY_MSG_AUDIO__;
    if (!notificationAudio) {
      playFallbackMessageNotificationTone();
      return;
    }

    notificationAudio.currentTime = 0;
    const playPromise = notificationAudio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      void playPromise.catch(() => {
        playFallbackMessageNotificationTone();
      });
    }
  } catch {
    playFallbackMessageNotificationTone();
  }
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
    const store = getRequestUnreadCountStore();
    if (typeof user?.unread_skill_request_count === 'number') {
      store.unreadCount = user.unread_skill_request_count;
      return user.unread_skill_request_count;
    }
    return store.unreadCount;
  });
  const [messageUnreadCount, setMessageUnreadCount] = useState(
    () => getMessageUnreadCountStore().unreadCount,
  );
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return getWsStore().isOpen;
  });

  const isMountedRef = useRef(true);
  const activeConversationIdRef = useRef<number | null>(null);
  const lastMessageSoundAtRef = useRef(0);

  const isUnreadCountFresh = useCallback((maxAgeMs = UNREAD_COUNT_FRESH_MS) => {
    return Date.now() - getRequestUnreadCountStore().lastSuccessfulRefreshAt < maxAgeMs;
  }, []);

  const isMessageUnreadCountFreshEnough = useCallback(
    (maxAgeMs = UNREAD_COUNT_FRESH_MS) => isMessageUnreadCountFresh(maxAgeMs),
    [],
  );

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const store = getRequestUnreadCountStore();

    if (typeof user?.unread_skill_request_count === 'number') {
      store.lastSuccessfulRefreshAt = Date.now();
      publishUnreadCount(store, user.unread_skill_request_count);
    }
  }, [user?.unread_skill_request_count]);

  useEffect(() => {
    const didRebind = bindMessageUnreadCountStoreToUser(user?.id ?? null);
    if (!didRebind) return;
    if (user?.id && !isLoading && isDocumentVisible()) {
      void refreshMessageUnreadCount();
    }
  }, [isLoading, user?.id]);

  useEffect(() => {
    const requestStore = getRequestUnreadCountStore();
    const requestListener: UnreadCountListener = (count) => {
      if (isMountedRef.current) {
        setUnreadCount(count);
      }
    };

    requestStore.listeners.add(requestListener);

    return () => {
      requestStore.listeners.delete(requestListener);
    };
  }, []);

  useEffect(() => {
    return subscribeToMessageUnreadCount((count) => {
      if (isMountedRef.current) {
        setMessageUnreadCount(count);
      }
    });
  }, []);

  const refreshUnreadCount = useCallback(async () => {
    const store = getRequestUnreadCountStore();
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

  const refreshMessageUnreadCount = useCallback(async () => {
    const store = getMessageUnreadCountStore();
    if (store.refreshPromise) {
      return store.refreshPromise;
    }

    let requestPromise: Promise<void> | null = null;
    requestPromise = (async () => {
      try {
        const summary = await getUnreadMessagesSummary();
        publishMessageUnreadCount(summary.count);
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
      const store = getRequestUnreadCountStore();
      store.lastSuccessfulRefreshAt = Date.now();
      publishUnreadCount(store, 0);
    } catch {
      // fail-open
    }
  }, []);

  const setActiveConversationId = useCallback((conversationId: number | null) => {
    activeConversationIdRef.current = conversationId;
  }, []);

  const syncConversationReadState = useCallback(
    ({
      conversationId,
      totalUnreadCount,
    }: {
      conversationId: number;
      totalUnreadCount?: number | null;
    }) => {
      if (typeof totalUnreadCount === 'number') {
        publishMessageUnreadCount(totalUnreadCount);
      }
      if (activeConversationIdRef.current === conversationId) {
        activeConversationIdRef.current = conversationId;
      }
      requestConversationsRefresh();
    },
    [],
  );

  useEffect(() => {
    if (isLoading) return;
    if (!isDocumentVisible()) return;

    if (!isUnreadCountFresh()) {
      void refreshUnreadCount();
    }
    if (!isMessageUnreadCountFreshEnough()) {
      void refreshMessageUnreadCount();
    }
  }, [
    isLoading,
    isMessageUnreadCountFreshEnough,
    isUnreadCountFresh,
    refreshMessageUnreadCount,
    refreshUnreadCount,
  ]);

  useEffect(() => {
    const refreshIfVisible = () => {
      if (isLoading) return;
      if (!isDocumentVisible()) return;
      if (!isUnreadCountFresh()) {
        void refreshUnreadCount();
      }
      if (!isMessageUnreadCountFreshEnough()) {
        void refreshMessageUnreadCount();
      }
    };

    document.addEventListener('visibilitychange', refreshIfVisible);
    window.addEventListener('focus', refreshIfVisible);

    return () => {
      document.removeEventListener('visibilitychange', refreshIfVisible);
      window.removeEventListener('focus', refreshIfVisible);
    };
  }, [
    isLoading,
    isMessageUnreadCountFreshEnough,
    isUnreadCountFresh,
    refreshMessageUnreadCount,
    refreshUnreadCount,
  ]);

  useEffect(() => {
    if (isLoading) return;
    if (isRealtimeConnected || !isDocumentVisible()) return;

    const intervalId = window.setInterval(() => {
      if (isLoading) return;
      if (!isDocumentVisible()) return;
      if (!isUnreadCountFresh()) {
        void refreshUnreadCount();
      }
      if (!isMessageUnreadCountFreshEnough()) {
        void refreshMessageUnreadCount();
      }
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    isLoading,
    isMessageUnreadCountFreshEnough,
    isRealtimeConnected,
    isUnreadCountFresh,
    refreshMessageUnreadCount,
    refreshUnreadCount,
  ]);

  useEffect(() => {
    const origin = getWebSocketOrigin();
    const store = getWsStore();

    const onPayload: WsListener = (payload) => {
      if (payload.type === 'skill_request' && typeof payload.unread_count === 'number') {
        const unreadStore = getRequestUnreadCountStore();
        unreadStore.lastSuccessfulRefreshAt = Date.now();
        publishUnreadCount(unreadStore, payload.unread_count);
        return;
      }

      if (payload.type === 'messaging_read' && typeof payload.total_unread_count === 'number') {
        publishMessageUnreadCount(payload.total_unread_count);
        requestConversationsRefresh();
        return;
      }

      if (
        payload.type === 'messaging_message' &&
        typeof payload.conversation_id === 'number' &&
        typeof payload.message_id === 'number' &&
        typeof payload.sender_id === 'number' &&
        typeof payload.created_at === 'string'
      ) {
        applyIncomingMessageUnreadEvent({
          totalUnreadCount: payload.total_unread_count,
          conversationId: payload.conversation_id,
          activeConversationId: activeConversationIdRef.current,
          senderId: payload.sender_id,
          currentUserId: user?.id,
        });

        requestConversationsRefresh();
        dispatchMessagingRealtimeMessage({
          conversationId: payload.conversation_id,
          messageId: payload.message_id,
          senderId: payload.sender_id,
          createdAt: payload.created_at,
        });

        const shouldPlayTone =
          isDocumentVisible() &&
          activeConversationIdRef.current !== payload.conversation_id &&
          payload.sender_id !== user?.id;

        if (shouldPlayTone) {
          const now = Date.now();
          if (now - lastMessageSoundAtRef.current >= MESSAGE_SOUND_COOLDOWN_MS) {
            lastMessageSoundAtRef.current = now;
            playMessageNotificationTone();
          }
        }
      }
    };

    const onOpen = () => {
      if (isLoading) return;
      if (!isUnreadCountFresh()) {
        void refreshUnreadCount();
      }
      if (!isMessageUnreadCountFreshEnough()) {
        void refreshMessageUnreadCount();
      }
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
  }, [
    isLoading,
    isMessageUnreadCountFreshEnough,
    isUnreadCountFresh,
    refreshMessageUnreadCount,
    refreshUnreadCount,
    user?.id,
  ]);

  const value = useMemo<DashboardNotificationsContextValue>(
    () => ({
      unreadCount,
      refreshUnreadCount,
      markAllRead,
      messageUnreadCount,
      refreshMessageUnreadCount,
      setActiveConversationId,
      syncConversationReadState,
    }),
    [
      markAllRead,
      messageUnreadCount,
      refreshMessageUnreadCount,
      refreshUnreadCount,
      setActiveConversationId,
      syncConversationReadState,
      unreadCount,
    ],
  );

  return <RequestsNotificationsContext.Provider value={value}>{children}</RequestsNotificationsContext.Provider>;
}

function useDashboardNotificationsContext() {
  const context = useContext(RequestsNotificationsContext);
  if (!context) {
    throw new Error('useRequestsNotifications must be used within RequestsNotificationsProvider');
  }
  return context;
}

export function useRequestsNotifications() {
  const { unreadCount, refreshUnreadCount, markAllRead } = useDashboardNotificationsContext();
  return { unreadCount, refreshUnreadCount, markAllRead };
}

export function useMessagesNotifications() {
  const {
    messageUnreadCount,
    refreshMessageUnreadCount,
    setActiveConversationId,
    syncConversationReadState,
  } = useDashboardNotificationsContext();
  return {
    unreadCount: messageUnreadCount,
    refreshUnreadCount: refreshMessageUnreadCount,
    setActiveConversationId,
    syncConversationReadState,
  };
}
