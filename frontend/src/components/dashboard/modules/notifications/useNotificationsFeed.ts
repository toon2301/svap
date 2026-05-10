'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { publishNotificationUnreadCount } from '@/components/dashboard/contexts/notificationUnreadStore';

import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from './notificationsApi';
import type { DashboardNotification } from './types';

const NOTIFICATION_CHANGED_EVENT = 'notifications:changed';

export function dispatchNotificationsChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(NOTIFICATION_CHANGED_EVENT));
}

export function useNotificationsFeed() {
  const [items, setItems] = useState<DashboardNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingRead, setMarkingRead] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const markingReadIdsRef = useRef<Set<number>>(new Set());

  const load = useCallback(async (showInitialLoader = false) => {
    if (showInitialLoader) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);

    try {
      const nextItems = await listNotifications();
      setItems(nextItems);
    } catch {
      setError('notifications.loadFeedError');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(true);
  }, [load]);

  useEffect(() => {
    const handleChanged = () => {
      void load(false);
    };

    window.addEventListener(NOTIFICATION_CHANGED_EVENT, handleChanged);
    return () => {
      window.removeEventListener(NOTIFICATION_CHANGED_EVENT, handleChanged);
    };
  }, [load]);

  const markAllRead = useCallback(async () => {
    setMarkingRead(true);
    setError(null);
    try {
      await markAllNotificationsRead();
      publishNotificationUnreadCount(0, { source: 'mutation' });
      setItems((current) =>
        current.map((item) => ({
          ...item,
          is_read: true,
          read_at: item.read_at || new Date().toISOString(),
        })),
      );
    } catch {
      setError('notifications.markAllReadError');
    } finally {
      setMarkingRead(false);
    }
  }, []);

  const markItemRead = useCallback(async (notification: DashboardNotification) => {
    if (notification.is_read || markingReadIdsRef.current.has(notification.id)) return;

    markingReadIdsRef.current.add(notification.id);
    try {
      const result = await markNotificationRead(notification.id);
      const readAt = result.read_at || new Date().toISOString();

      if (notification.type !== 'skill_request' && typeof result.unread_count === 'number') {
        publishNotificationUnreadCount(result.unread_count, { source: 'mutation' });
      }

      setItems((current) =>
        current.map((item) =>
          item.id === notification.id
            ? {
                ...item,
                is_read: true,
                read_at: item.read_at || readAt,
              }
            : item,
        ),
      );
    } catch {
      // The click navigation should not be blocked by a best-effort read update.
    } finally {
      markingReadIdsRef.current.delete(notification.id);
    }
  }, []);

  return {
    items,
    loading,
    refreshing,
    markingRead,
    error,
    refresh: () => load(false),
    markAllRead,
    markItemRead,
  };
}
