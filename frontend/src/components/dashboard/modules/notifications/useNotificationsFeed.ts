'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { publishNotificationUnreadCount } from '@/components/dashboard/contexts/notificationUnreadStore';

import {
  listNotificationsPage,
  markAllNotificationsRead,
  markNotificationRead,
} from './notificationsApi';
import type { DashboardNotification } from './types';

const NOTIFICATION_CHANGED_EVENT = 'notifications:changed';
const NOTIFICATION_FEED_PAGE_SIZE = 15;

export function dispatchNotificationsChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(NOTIFICATION_CHANGED_EVENT));
}

export function useNotificationsFeed() {
  const [items, setItems] = useState<DashboardNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingRead, setMarkingRead] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const markingReadIdsRef = useRef<Set<number>>(new Set());
  const pageRef = useRef(1);
  const loadingMoreRef = useRef(false);

  const load = useCallback(async (showInitialLoader = false) => {
    if (showInitialLoader) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);

    try {
      // Refresh vždy resetuje na prvú stranu (najnovšie hore).
      const page = await listNotificationsPage(1, NOTIFICATION_FEED_PAGE_SIZE);
      pageRef.current = page.page;
      setItems(page.results);
      setHasMore(page.page < page.totalPages);
    } catch {
      setError('notifications.loadFeedError');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setError(null);

    try {
      const nextPage = pageRef.current + 1;
      const page = await listNotificationsPage(nextPage, NOTIFICATION_FEED_PAGE_SIZE);
      pageRef.current = page.page;
      setItems((current) => {
        // Dedup podľa id (realtime medzičasom mohol vložiť nový riadok).
        const seen = new Set(current.map((item) => item.id));
        const appended = page.results.filter((item) => !seen.has(item.id));
        return [...current, ...appended];
      });
      setHasMore(page.page < page.totalPages);
    } catch {
      setError('notifications.loadFeedError');
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [hasMore]);

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
    loadingMore,
    hasMore,
    error,
    refresh: () => load(false),
    loadMore,
    markAllRead,
    markItemRead,
  };
}
