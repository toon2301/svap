'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, endpoints } from '@/lib/api';

type RequestsNotificationsContextValue = {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  markAllRead: () => Promise<void>;
};

const RequestsNotificationsContext = createContext<RequestsNotificationsContextValue | null>(null);

type WsListener = (payload: any) => void;
type WsStore = {
  ws: WebSocket | null;
  closeTimer: number | null;
  refCount: number;
  listeners: Set<WsListener>;
  openListeners: Set<() => void>;
};

function getWsStore(): WsStore {
  const g = globalThis as any;
  if (!g.__SWAPLY_REQ_WS_STORE__) {
    g.__SWAPLY_REQ_WS_STORE__ = {
      ws: null,
      closeTimer: null,
      refCount: 0,
      listeners: new Set(),
      openListeners: new Set(),
    } satisfies WsStore;
  }
  return g.__SWAPLY_REQ_WS_STORE__ as WsStore;
}

function getBackendOrigin(): string {
  const explicitOrigin = process.env.NEXT_PUBLIC_BACKEND_ORIGIN;
  if (explicitOrigin) return explicitOrigin.replace(/\/+$/, '');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl) {
    const cleaned = apiUrl.replace(/\/+$/, '');
    // ak je to ".../api", orež na origin
    return cleaned.endsWith('/api') ? cleaned.slice(0, -4) : cleaned;
  }

  return 'http://localhost:8000';
}

function toWebSocketUrl(origin: string): string {
  const wsOrigin = origin.startsWith('https://')
    ? origin.replace(/^https:\/\//, 'wss://')
    : origin.replace(/^http:\/\//, 'ws://');
  const baseUrl = `${wsOrigin}/ws/notifications/`;
  return baseUrl;
}

export function RequestsNotificationsProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const retryRef = useRef(0);
  const closedByUsRef = useRef(false);
  const authRefreshInFlightRef = useRef(false);
  const connectTimerRef = useRef<number | null>(null);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const res = await api.get(endpoints.notifications.unreadCount, {
        params: { type: 'skill_request' },
      });
      const count = typeof res?.data?.count === 'number' ? res.data.count : 0;
      setUnreadCount(count);
    } catch {
      // fail-open
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await api.post(endpoints.notifications.markAllRead, { type: 'skill_request' });
      setUnreadCount(0);
    } catch {
      // fail-open
    }
  }, []);

  useEffect(() => {
    void refreshUnreadCount();
  }, [refreshUnreadCount]);

  useEffect(() => {
    const origin = getBackendOrigin();
    let disposed = false;
    const store = getWsStore();

    // register listeners for this Provider instance
    const onPayload: WsListener = (payload) => {
      if (payload?.type === 'skill_request' && typeof payload.unread_count === 'number') {
        setUnreadCount(payload.unread_count);
      }
    };
    const onOpen = () => {
      retryRef.current = 0;
      void refreshUnreadCount();
    };

    store.listeners.add(onPayload);
    store.openListeners.add(onOpen);
    store.refCount += 1;
    if (store.closeTimer) {
      window.clearTimeout(store.closeTimer);
      store.closeTimer = null;
    }

    const refreshAccessToken = async (): Promise<string | null> => {
      authRefreshInFlightRef.current = true;
      try {
        // HttpOnly cookies: refresh token nie je dostupný v JS, backend ho zoberie z cookies.
        await api.post(endpoints.auth.refresh, {});
        return 'ok';
      } catch {
        return null;
      } finally {
        authRefreshInFlightRef.current = false;
      }
    };

    const connect = async () => {
      try {
        if (disposed) return;

        // Už máme aktívny alebo pripájajúci sa WS -> nespúšťaj ďalší
        if (store.ws && (store.ws.readyState === WebSocket.OPEN || store.ws.readyState === WebSocket.CONNECTING)) {
          return;
        }

        closedByUsRef.current = false;

        if (disposed) return;

        // Cookie-based auth: WS handshake pošle cookies automaticky pre backend doménu
        const wsUrl = toWebSocketUrl(origin);
        const ws = new WebSocket(wsUrl);
        store.ws = ws;

        ws.onopen = () => {
          store.openListeners.forEach((fn) => {
            try {
              fn();
            } catch {
              // ignore
            }
          });
        };

        ws.onmessage = (evt) => {
          try {
            const payload = JSON.parse(String(evt.data || '{}'));
            store.listeners.forEach((fn) => {
              try {
                fn(payload);
              } catch {
                // ignore
              }
            });
          } catch {
            // ignore
          }
        };

        ws.onclose = async (evt) => {
          store.ws = null;
          if (closedByUsRef.current) return;
          if (disposed) return;

          // Neautorizované: skús refresh a ak uspeje, reconnect bez ďalšieho “spamovania” chýb
          if (evt?.code === 4401 || evt?.code === 4403) {
            const refreshed = await refreshAccessToken();
            if (!refreshed) return;
            window.setTimeout(() => void connect(), 250);
            return;
          }

          // jednoduchý reconnect (max ~30s)
          const attempt = retryRef.current + 1;
          retryRef.current = attempt;
          const delay = Math.min(30000, 1000 * Math.pow(2, Math.min(5, attempt)));
          window.setTimeout(() => void connect(), delay);
        };

        ws.onerror = () => {
          // Nezatváraj ručne; prehliadač aj tak vyvolá onclose a my riešime reconnect tam.
          // (Manuálne ws.close() v DEV často spôsobí "closed before established" hlášky.)
        };
      } catch {
        // ignore
      }
    };

    // V React StrictMode (DEV) sa effect mount/unmountuje 2x. Odložením connectu zabránime
    // vytvoreniu WS v "prvom" mount-e, ktorý sa hneď uprace, a tým znížime spam v konzole.
    if (typeof window !== 'undefined') {
      connectTimerRef.current = window.setTimeout(() => void connect(), 0);
    } else {
      void connect();
    }

    return () => {
      disposed = true;
      closedByUsRef.current = true;
      if (connectTimerRef.current) {
        window.clearTimeout(connectTimerRef.current);
        connectTimerRef.current = null;
      }

      store.listeners.delete(onPayload);
      store.openListeners.delete(onOpen);

      store.refCount = Math.max(0, store.refCount - 1);
      if (store.refCount === 0) {
        // Delay close: v Next dev StrictMode sa mount/unmount deje rýchlo za sebou.
        // Odložením close zabránime "closed before established" spam-u v konzole.
        store.closeTimer = window.setTimeout(() => {
          if (store.refCount !== 0) return;
          try {
            store.ws?.close();
          } catch {
            // ignore
          }
          store.ws = null;
          store.closeTimer = null;
        }, 750);
      }
    };
  }, [refreshUnreadCount]);

  const value = useMemo<RequestsNotificationsContextValue>(
    () => ({ unreadCount, refreshUnreadCount, markAllRead }),
    [unreadCount, refreshUnreadCount, markAllRead],
  );

  return <RequestsNotificationsContext.Provider value={value}>{children}</RequestsNotificationsContext.Provider>;
}

export function useRequestsNotifications() {
  const ctx = useContext(RequestsNotificationsContext);
  if (!ctx) throw new Error('useRequestsNotifications must be used within RequestsNotificationsProvider');
  return ctx;
}


