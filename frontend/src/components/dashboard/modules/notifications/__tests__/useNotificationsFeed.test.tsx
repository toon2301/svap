import { act, renderHook, waitFor } from '@testing-library/react';

import { publishNotificationUnreadCount } from '@/components/dashboard/contexts/notificationUnreadStore';

import {
  listNotificationsPage,
  markAllNotificationsRead,
  markNotificationRead,
} from '../notificationsApi';
import { deferred, fakeServer as serveNotifications, notification, range } from '../notificationsFeedTestUtils';
import { dispatchNotificationsChanged, useNotificationsFeed } from '../useNotificationsFeed';

jest.mock('../notificationsApi', () => ({
  __esModule: true,
  listNotificationsPage: jest.fn(),
  markAllNotificationsRead: jest.fn(),
  markNotificationRead: jest.fn(),
}));

jest.mock('@/components/dashboard/contexts/notificationUnreadStore', () => ({
  __esModule: true,
  publishNotificationUnreadCount: jest.fn(),
}));

const listMock = listNotificationsPage as jest.Mock;
const markAllMock = markAllNotificationsRead as jest.Mock;
const markOneMock = markNotificationRead as jest.Mock;

async function mount() {
  const view = renderHook(() => useNotificationsFeed());
  await waitFor(() => expect(view.result.current.loading).toBe(false));
  return view;
}

describe('useNotificationsFeed (existing behaviour)', () => {
  beforeEach(() => {
    listMock.mockReset();
    markAllMock.mockReset();
    markOneMock.mockReset();
    (publishNotificationUnreadCount as jest.Mock).mockClear();
  });

  describe('first load', () => {
    it('starts loading and then shows the first batch of 15', async () => {
      serveNotifications(listMock, 40);
      const { result } = renderHook(() => useNotificationsFeed());

      expect(result.current.loading).toBe(true);
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(listMock).toHaveBeenCalledWith(1, 15);
      expect(result.current.items.map((item) => item.id)).toEqual(range(1, 15).map((item) => item.id));
      expect(result.current.hasMore).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('reports no more when everything fits the first batch', async () => {
      serveNotifications(listMock, 7);
      const { result } = await mount();

      expect(result.current.items).toHaveLength(7);
      expect(result.current.hasMore).toBe(false);
    });

    it('shows an empty list for an account without notifications', async () => {
      serveNotifications(listMock, 0);
      const { result } = await mount();

      expect(result.current.items).toEqual([]);
      expect(result.current.hasMore).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('reports a load error and keeps the list empty when the first load fails', async () => {
      listMock.mockRejectedValue(new Error('network'));
      const { result } = await mount();

      expect(result.current.error).toBe('notifications.loadFeedError');
      expect(result.current.items).toEqual([]);
    });
  });

  describe('loadMore', () => {
    it('appends the next batch of 15 and keeps the order', async () => {
      serveNotifications(listMock, 40);
      const { result } = await mount();

      await act(async () => {
        await result.current.loadMore();
      });

      expect(listMock).toHaveBeenLastCalledWith(2, 15);
      expect(result.current.items.map((item) => item.id)).toEqual(range(1, 30).map((item) => item.id));
      expect(result.current.hasMore).toBe(true);
    });

    it('stops offering more after the last batch', async () => {
      serveNotifications(listMock, 20);
      const { result } = await mount();

      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.items).toHaveLength(20);
      expect(result.current.hasMore).toBe(false);
    });

    it('drops a notification that was already in the list (realtime inserted it meanwhile)', async () => {
      serveNotifications(listMock, 40);
      const { result } = await mount();
      listMock.mockResolvedValueOnce({
        results: [notification(15), ...range(16, 29)],
        total: 40,
        page: 2,
        pageSize: 15,
        totalPages: 3,
      });

      await act(async () => {
        await result.current.loadMore();
      });

      const ids = result.current.items.map((item) => item.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids).toHaveLength(29);
    });

    it('does nothing when there is nothing more to load', async () => {
      serveNotifications(listMock, 5);
      const { result } = await mount();
      listMock.mockClear();

      await act(async () => {
        await result.current.loadMore();
      });

      expect(listMock).not.toHaveBeenCalled();
    });

    it('ignores a second call while a batch is loading', async () => {
      serveNotifications(listMock, 60);
      const { result } = await mount();
      listMock.mockClear();
      const slow = deferred<unknown>();
      listMock.mockImplementationOnce(() => slow.promise);

      let first!: Promise<void>;
      act(() => {
        first = result.current.loadMore();
      });
      expect(result.current.loadingMore).toBe(true);
      await act(async () => {
        await result.current.loadMore();
      });
      expect(listMock).toHaveBeenCalledTimes(1);

      await act(async () => {
        slow.resolve({ results: range(16, 30), total: 60, page: 2, pageSize: 15, totalPages: 4 });
        await first;
      });
      expect(result.current.loadingMore).toBe(false);
      expect(result.current.items).toHaveLength(30);
    });

    it('reports a load error and keeps the loaded items when the next batch fails', async () => {
      serveNotifications(listMock, 40);
      const { result } = await mount();
      listMock.mockRejectedValueOnce(new Error('network'));

      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.error).toBe('notifications.loadFeedError');
      expect(result.current.items).toHaveLength(15);
      expect(result.current.loadingMore).toBe(false);
      expect(result.current.hasMore).toBe(true);
    });
  });

  describe('refresh on the notifications:changed event', () => {
    it('reloads the first batch and shows what changed on the server', async () => {
      serveNotifications(listMock, 40);
      const { result } = await mount();
      listMock.mockClear();
      listMock.mockResolvedValueOnce({
        results: [notification(100), ...range(1, 14)],
        total: 41,
        page: 1,
        pageSize: 15,
        totalPages: 3,
      });

      act(() => {
        dispatchNotificationsChanged();
      });

      await waitFor(() => expect(result.current.items[0].id).toBe(100));
      expect(listMock).toHaveBeenCalledWith(1, 15);
      expect(result.current.loading).toBe(false);
    });

    it('keeps the list visible (no loading state) while it refreshes', async () => {
      serveNotifications(listMock, 40);
      const { result } = await mount();
      const slow = deferred<unknown>();
      listMock.mockImplementationOnce(() => slow.promise);

      act(() => {
        dispatchNotificationsChanged();
      });

      await waitFor(() => expect(result.current.refreshing).toBe(true));
      expect(result.current.loading).toBe(false);
      expect(result.current.items).toHaveLength(15);

      await act(async () => {
        slow.resolve({ results: range(1, 15), total: 40, page: 1, pageSize: 15, totalPages: 3 });
      });
      await waitFor(() => expect(result.current.refreshing).toBe(false));
    });

    it('stops listening after unmount', async () => {
      serveNotifications(listMock, 40);
      const { unmount } = await mount();
      unmount();
      listMock.mockClear();

      act(() => {
        dispatchNotificationsChanged();
      });

      expect(listMock).not.toHaveBeenCalled();
    });
  });

  describe('marking as read', () => {
    it('marks everything as read, publishes zero unread and flags every loaded item', async () => {
      serveNotifications(listMock, 20);
      markAllMock.mockResolvedValue(undefined);
      const { result } = await mount();

      await act(async () => {
        await result.current.markAllRead();
      });

      expect(markAllMock).toHaveBeenCalledTimes(1);
      expect(publishNotificationUnreadCount).toHaveBeenCalledWith(0, { source: 'mutation' });
      expect(result.current.items.every((item) => item.is_read)).toBe(true);
      expect(result.current.markingRead).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('reports an error and leaves the items untouched when mark-all fails', async () => {
      serveNotifications(listMock, 20);
      markAllMock.mockRejectedValue(new Error('network'));
      const { result } = await mount();

      await act(async () => {
        await result.current.markAllRead();
      });

      expect(result.current.error).toBe('notifications.markAllReadError');
      expect(result.current.items.some((item) => item.is_read)).toBe(false);
      expect(result.current.markingRead).toBe(false);
    });

    it('marks one item as read and publishes the unread count from the server', async () => {
      serveNotifications(listMock, 20);
      markOneMock.mockResolvedValue({ id: 3, is_read: true, read_at: '2026-05-01T13:00:00Z', unread_count: 7 });
      const { result } = await mount();

      await act(async () => {
        await result.current.markItemRead(result.current.items[2]);
      });

      expect(markOneMock).toHaveBeenCalledWith(3);
      expect(publishNotificationUnreadCount).toHaveBeenCalledWith(7, { source: 'mutation' });
      const marked = result.current.items.find((item) => item.id === 3);
      expect(marked?.is_read).toBe(true);
      expect(marked?.read_at).toBe('2026-05-01T13:00:00Z');
      expect(result.current.items.filter((item) => item.is_read)).toHaveLength(1);
    });

    it('does not publish the unread count for a skill request notification', async () => {
      listMock.mockResolvedValue({
        results: [notification(1, { type: 'skill_request' })],
        total: 1,
        page: 1,
        pageSize: 15,
        totalPages: 1,
      });
      markOneMock.mockResolvedValue({ id: 1, is_read: true, read_at: null, unread_count: 4 });
      const { result } = await mount();

      await act(async () => {
        await result.current.markItemRead(result.current.items[0]);
      });

      expect(publishNotificationUnreadCount).not.toHaveBeenCalled();
      expect(result.current.items[0].is_read).toBe(true);
    });

    it('skips an item that is already read', async () => {
      listMock.mockResolvedValue({
        results: [notification(1, { is_read: true })],
        total: 1,
        page: 1,
        pageSize: 15,
        totalPages: 1,
      });
      const { result } = await mount();

      await act(async () => {
        await result.current.markItemRead(result.current.items[0]);
      });

      expect(markOneMock).not.toHaveBeenCalled();
    });

    it('does not send the same item twice while the first request is in flight', async () => {
      serveNotifications(listMock, 5);
      const slow = deferred<unknown>();
      markOneMock.mockImplementation(() => slow.promise);
      const { result } = await mount();

      let first!: Promise<void>;
      act(() => {
        first = result.current.markItemRead(result.current.items[0]);
      });
      await act(async () => {
        await result.current.markItemRead(result.current.items[0]);
      });
      expect(markOneMock).toHaveBeenCalledTimes(1);

      await act(async () => {
        slow.resolve({ id: 1, is_read: true, read_at: null });
        await first;
      });
    });

    it('swallows a failed mark-read so the click navigation is not blocked', async () => {
      serveNotifications(listMock, 5);
      markOneMock.mockRejectedValue(new Error('network'));
      const { result } = await mount();

      await act(async () => {
        await result.current.markItemRead(result.current.items[0]);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.items[0].is_read).toBe(false);
    });
  });

  describe('dispatchNotificationsChanged', () => {
    it('dispatches the notifications:changed window event', () => {
      const listener = jest.fn();
      window.addEventListener('notifications:changed', listener);

      dispatchNotificationsChanged();

      expect(listener).toHaveBeenCalledTimes(1);
      window.removeEventListener('notifications:changed', listener);
    });
  });
});
