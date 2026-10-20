import { StrictMode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';

import {
  listNotificationsPage,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationsPage,
} from '../notificationsApi';
import {
  deferred,
  fakeServer,
  notification,
  range,
  serverPage,
} from '../notificationsFeedTestUtils';
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
const ids = (items: Array<{ id: number }>) => items.map((item) => item.id);

type Hook = ReturnType<typeof useNotificationsFeed>;
type Deferred<T> = ReturnType<typeof deferred<T>>;

async function mount(options: { strict?: boolean } = {}) {
  const view = renderHook(() => useNotificationsFeed(), {
    wrapper: options.strict ? StrictMode : undefined,
  });
  await waitFor(() => expect(view.result.current.loading).toBe(false));
  return view;
}

async function loadBatches(result: { current: Hook }, count: number) {
  for (let index = 1; index < count; index += 1) {
    await act(async () => {
      await result.current.loadMore();
    });
  }
}

type WindowRequest = { pageSize: number; answer: Deferred<NotificationsPage> };

/** Zadrží požiadavky na okno (stránka 1) zoznamu s `total` položkami; ďalšie dávky idú hneď. */
function holdWindowRequests(total: number): WindowRequest[] {
  const requests: WindowRequest[] = [];
  listMock.mockImplementation((page: number, pageSize: number) => {
    if (page !== 1) return Promise.resolve(serverPage(total, page, pageSize));
    const answer = deferred<NotificationsPage>();
    requests.push({ pageSize, answer });
    return answer.promise;
  });
  return requests;
}

/**
 * Počas obnovy okna donačíta trikrát po sebe ďalšiu dávku (rýchly scroll), takže sa okno trikrát
 * zahodí. Zapíše dĺžku zoznamu pred a po každej odpovedi na okno.
 */
async function outpaceWindowRefresh(
  result: { current: Hook },
  requests: WindowRequest[],
  total: number,
  lengths: number[] = [],
) {
  await waitFor(() => expect(requests).toHaveLength(1));
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await act(async () => {
      await result.current.loadMore();
    });
    lengths.push(result.current.items.length);
    const request = requests[attempt];
    await act(async () => {
      request.answer.resolve(serverPage(total, 1, request.pageSize));
    });
    lengths.push(result.current.items.length);
    await waitFor(() => expect(requests).toHaveLength(attempt + 2));
  }
  return lengths;
}

/** Spustí obnovu udalosťou zo servera a počká, kým zoznam dobehne do pokoja. */
async function refreshFromEvent(result: { current: Hook }) {
  act(() => {
    dispatchNotificationsChanged();
  });
  await waitFor(() => expect(result.current.refreshing).toBe(false));
}

describe('useNotificationsFeed refresh', () => {
  beforeEach(() => {
    listMock.mockReset();
    markAllMock.mockReset();
    markOneMock.mockReset();
  });

  describe('keeps what is already loaded', () => {
    it('reloads the whole window instead of cutting the list back to the first batch', async () => {
      fakeServer(listMock, 100);
      const { result } = await mount();
      await loadBatches(result, 3);
      expect(result.current.items).toHaveLength(45);
      listMock.mockClear();

      await refreshFromEvent(result);

      expect(listMock).toHaveBeenCalledTimes(1);
      expect(listMock).toHaveBeenCalledWith(1, 45);
      expect(ids(result.current.items)).toEqual(ids(range(1, 45)));
      expect(result.current.hasMore).toBe(true);
    });

    it('rebuilds a window above the server limit from pages of 45', async () => {
      fakeServer(listMock, 300);
      const { result } = await mount();
      await loadBatches(result, 4);
      expect(result.current.items).toHaveLength(60);
      listMock.mockClear();

      await refreshFromEvent(result);

      expect(listMock).toHaveBeenCalledTimes(2);
      expect(listMock).toHaveBeenNthCalledWith(1, 1, 45);
      expect(listMock).toHaveBeenNthCalledWith(2, 2, 45);
      expect(result.current.items).toHaveLength(60);
    });

    it('shows a new notification on top and pushes the last one out of the window', async () => {
      fakeServer(listMock, 100);
      const { result } = await mount();
      await loadBatches(result, 2);
      listMock.mockResolvedValueOnce({
        ...serverPage(101, 1, 30),
        results: [notification(500), ...range(1, 29)],
        total: 101,
      });

      await refreshFromEvent(result);

      expect(result.current.items[0].id).toBe(500);
      expect(result.current.items).toHaveLength(30);
      expect(result.current.items.some((item) => item.id === 30)).toBe(false);
    });

    it('continues with the batch that follows the loaded ones after a refresh', async () => {
      fakeServer(listMock, 100);
      const { result } = await mount();
      await loadBatches(result, 2);
      await refreshFromEvent(result);
      listMock.mockClear();

      await act(async () => {
        await result.current.loadMore();
      });

      expect(listMock).toHaveBeenCalledWith(3, 15);
      expect(ids(result.current.items)).toEqual(ids(range(1, 45)));
    });

    it('does not repeat a notification that moved across a batch boundary', async () => {
      fakeServer(listMock, 100);
      const { result } = await mount();
      listMock.mockResolvedValueOnce({
        ...serverPage(100, 2, 15),
        results: [notification(15), ...range(16, 29)],
      });

      await act(async () => {
        await result.current.loadMore();
      });

      expect(new Set(ids(result.current.items)).size).toBe(result.current.items.length);
    });

    it('settles on the right window when a batch is loaded while the refresh is in flight', async () => {
      fakeServer(listMock, 100);
      const { result } = await mount();
      const slow = deferred<NotificationsPage>();
      listMock.mockImplementationOnce(() => slow.promise);

      act(() => {
        dispatchNotificationsChanged();
      });
      await waitFor(() => expect(result.current.refreshing).toBe(true));
      await act(async () => {
        await result.current.loadMore();
      });
      await act(async () => {
        slow.resolve(serverPage(100, 1, 15));
      });
      await waitFor(() => expect(result.current.refreshing).toBe(false));

      expect(ids(result.current.items)).toEqual(ids(range(1, 30)));
      expect(result.current.hasMore).toBe(true);
    });
  });

  describe('runs one refresh at a time and the newest data wins', () => {
    it('joins events that arrive during a refresh into one follow-up refresh', async () => {
      fakeServer(listMock, 40);
      const { result } = await mount();
      listMock.mockClear();
      const slow = deferred<NotificationsPage>();
      listMock.mockImplementationOnce(() => slow.promise);

      act(() => {
        dispatchNotificationsChanged();
      });
      await waitFor(() => expect(listMock).toHaveBeenCalledTimes(1));
      act(() => {
        dispatchNotificationsChanged();
        dispatchNotificationsChanged();
        dispatchNotificationsChanged();
      });
      expect(listMock).toHaveBeenCalledTimes(1);

      await act(async () => {
        slow.resolve(serverPage(40, 1, 15));
      });
      await waitFor(() => expect(listMock).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(result.current.refreshing).toBe(false));
      expect(listMock).toHaveBeenCalledTimes(2);
    });

    it('ends on the answer of the last request and never sends two at once', async () => {
      fakeServer(listMock, 40);
      const { result } = await mount();
      listMock.mockClear();
      const first = deferred<NotificationsPage>();
      const second = deferred<NotificationsPage>();
      listMock
        .mockImplementationOnce(() => first.promise)
        .mockImplementationOnce(() => second.promise);

      act(() => {
        dispatchNotificationsChanged();
      });
      await waitFor(() => expect(listMock).toHaveBeenCalledTimes(1));
      act(() => {
        dispatchNotificationsChanged();
      });
      // Druhá udalosť nerozbehne súbežnú požiadavku: počká, kým skončí prvá.
      expect(listMock).toHaveBeenCalledTimes(1);

      await act(async () => {
        first.resolve({
          ...serverPage(40, 1, 15),
          results: [notification(900), ...range(1, 14)],
        });
      });
      await waitFor(() => expect(listMock).toHaveBeenCalledTimes(2));
      await act(async () => {
        second.resolve({
          ...serverPage(40, 1, 15),
          results: [notification(901), notification(900), ...range(1, 13)],
        });
      });
      await waitFor(() => expect(result.current.refreshing).toBe(false));

      expect(result.current.items[0].id).toBe(901);
    });

    it('does not start a second first load when the effect runs twice (strict mode)', async () => {
      fakeServer(listMock, 40);

      const { result } = await mount({ strict: true });

      expect(listMock).toHaveBeenCalledTimes(1);
      expect(result.current.items).toHaveLength(15);
    });

    it('does not start the queued follow-up refresh after unmount', async () => {
      fakeServer(listMock, 40);
      const { unmount } = await mount();
      listMock.mockClear();
      const slow = deferred<NotificationsPage>();
      listMock.mockImplementationOnce(() => slow.promise);
      act(() => {
        dispatchNotificationsChanged();
      });
      await waitFor(() => expect(listMock).toHaveBeenCalledTimes(1));
      act(() => {
        dispatchNotificationsChanged();
      });

      unmount();
      await act(async () => {
        slow.resolve(serverPage(40, 1, 15));
      });

      expect(listMock).toHaveBeenCalledTimes(1);
    });

    it('does not shrink the list when batches keep loading while the refresh fetches the window', async () => {
      fakeServer(listMock, 1000);
      const { result } = await mount();
      const windowRequests = holdWindowRequests(1000);

      act(() => {
        dispatchNotificationsChanged();
      });
      const lengths = await outpaceWindowRefresh(result, windowRequests, 1000);

      // Okná 15 → 30 → 45 sa zahodili; obnova sa zopakovala s oknom 60 (stránky 1 a 2 po 45).
      expect(windowRequests.map((request) => request.pageSize)).toEqual([15, 30, 45, 45]);
      await act(async () => {
        windowRequests[3].answer.resolve(serverPage(1000, 1, 45));
      });
      await waitFor(() => expect(result.current.refreshing).toBe(false));
      lengths.push(result.current.items.length);

      // Zastaraný výsledok sa nezapísal: zoznam ostal taký dlhý, aký bol na obrazovke.
      expect(lengths).toEqual([30, 30, 45, 45, 60, 60, 60]);
      expect(ids(result.current.items)).toEqual(ids(range(1, 60)));
      expect(result.current.hasMore).toBe(true);
    });

    it('still reports a failed retry after the window had to be fetched again', async () => {
      fakeServer(listMock, 1000);
      const { result } = await mount();
      const windowRequests = holdWindowRequests(1000);

      act(() => {
        void result.current.refresh();
      });
      await outpaceWindowRefresh(result, windowRequests, 1000);
      await act(async () => {
        windowRequests[3].answer.reject(new Error('network'));
      });
      await waitFor(() => expect(result.current.refreshing).toBe(false));

      expect(result.current.error).toBe('notifications.loadFeedError');
      expect(result.current.items).toHaveLength(60);
    });
  });

  describe('errors', () => {
    it('keeps the list and shows no error when a refresh in the background fails', async () => {
      fakeServer(listMock, 40);
      const { result } = await mount();
      const before = result.current.items;
      listMock.mockRejectedValueOnce(new Error('network'));

      await refreshFromEvent(result);

      expect(result.current.error).toBeNull();
      expect(result.current.items).toBe(before);
      expect(result.current.refreshing).toBe(false);
    });

    it('shows the load error when the user retries and it fails', async () => {
      fakeServer(listMock, 40);
      const { result } = await mount();
      listMock.mockRejectedValueOnce(new Error('network'));

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.error).toBe('notifications.loadFeedError');
      expect(result.current.items).toHaveLength(15);
    });

    it('clears the load error when a later refresh succeeds', async () => {
      fakeServer(listMock, 40);
      listMock.mockRejectedValueOnce(new Error('network'));
      const { result } = await mount();
      expect(result.current.error).toBe('notifications.loadFeedError');

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.items).toHaveLength(15);
    });

    it('clears the load error of the first load when a refresh in the background succeeds', async () => {
      fakeServer(listMock, 40);
      listMock.mockRejectedValueOnce(new Error('network'));
      const { result } = await mount();
      expect(result.current.error).toBe('notifications.loadFeedError');

      await refreshFromEvent(result);

      expect(result.current.error).toBeNull();
      expect(result.current.items).toHaveLength(15);
    });

    it('reports a failed retry even when a refresh in the background was queued after it', async () => {
      fakeServer(listMock, 40);
      const { result } = await mount();
      const running = deferred<NotificationsPage>();
      listMock.mockImplementationOnce(() => running.promise);

      act(() => {
        dispatchNotificationsChanged();
      });
      await waitFor(() => expect(result.current.refreshing).toBe(true));
      // Ručné „Skúsiť znova“ počas bežiacej obnovy a po ňom ešte udalosť zo servera: chyba sa má ukázať.
      let retry!: Promise<void>;
      act(() => {
        retry = result.current.refresh();
      });
      act(() => {
        dispatchNotificationsChanged();
      });
      listMock.mockRejectedValueOnce(new Error('network'));
      await act(async () => {
        running.resolve(serverPage(40, 1, 15));
        await retry;
      });

      expect(result.current.error).toBe('notifications.loadFeedError');
    });

    it('stays silent when the queued follow-up refresh fails in the background', async () => {
      fakeServer(listMock, 40);
      const { result } = await mount();
      listMock.mockClear();
      const slow = deferred<NotificationsPage>();
      listMock.mockImplementationOnce(() => slow.promise);
      act(() => {
        dispatchNotificationsChanged();
      });
      await waitFor(() => expect(listMock).toHaveBeenCalledTimes(1));
      act(() => {
        dispatchNotificationsChanged();
      });
      listMock.mockRejectedValueOnce(new Error('network'));

      await act(async () => {
        slow.resolve({
          ...serverPage(40, 1, 15),
          results: [notification(900), ...range(1, 14)],
        });
      });
      await waitFor(() => expect(listMock).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(result.current.refreshing).toBe(false));

      expect(result.current.error).toBeNull();
      expect(result.current.items[0].id).toBe(900);
    });

    it('does not hide the mark-all error when the list refreshes in the background', async () => {
      fakeServer(listMock, 40);
      markAllMock.mockRejectedValue(new Error('network'));
      const { result } = await mount();
      await act(async () => {
        await result.current.markAllRead();
      });
      expect(result.current.error).toBe('notifications.markAllReadError');

      await refreshFromEvent(result);

      expect(result.current.error).toBe('notifications.markAllReadError');
    });

    it('clears the mark-all error when the user retries and the list loads again', async () => {
      fakeServer(listMock, 40);
      markAllMock.mockRejectedValue(new Error('network'));
      const { result } = await mount();
      await act(async () => {
        await result.current.markAllRead();
      });
      expect(result.current.error).toBe('notifications.markAllReadError');

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.error).toBeNull();
    });

    it('replaces the mark-all error by the load error when the retry fails', async () => {
      fakeServer(listMock, 40);
      markAllMock.mockRejectedValue(new Error('network'));
      const { result } = await mount();
      await act(async () => {
        await result.current.markAllRead();
      });
      listMock.mockRejectedValueOnce(new Error('network'));

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.error).toBe('notifications.loadFeedError');
    });

    it('keeps the mark-all error when the next batch loads', async () => {
      fakeServer(listMock, 100);
      markAllMock.mockRejectedValue(new Error('network'));
      const { result } = await mount();
      await act(async () => {
        await result.current.markAllRead();
      });

      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.items).toHaveLength(30);
      expect(result.current.error).toBe('notifications.markAllReadError');
    });

    it('keeps an error when there is no batch left to load', async () => {
      fakeServer(listMock, 10);
      const { result } = await mount();
      listMock.mockRejectedValueOnce(new Error('network'));
      await act(async () => {
        await result.current.refresh();
      });
      expect(result.current.error).toBe('notifications.loadFeedError');
      expect(result.current.hasMore).toBe(false);

      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.error).toBe('notifications.loadFeedError');
    });

    it('clears the load error of a failed refresh after the next batch loads', async () => {
      fakeServer(listMock, 100);
      const { result } = await mount();
      listMock.mockRejectedValueOnce(new Error('network'));
      await act(async () => {
        await result.current.refresh();
      });
      expect(result.current.error).toBe('notifications.loadFeedError');

      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.items).toHaveLength(30);
    });
  });

  describe('a failed next batch', () => {
    it('is reported apart from the load error and keeps other errors', async () => {
      fakeServer(listMock, 100);
      markAllMock.mockRejectedValue(new Error('network'));
      const { result } = await mount();
      await act(async () => {
        await result.current.markAllRead();
      });
      listMock.mockRejectedValueOnce(new Error('network'));

      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.loadMoreFailed).toBe(true);
      expect(result.current.error).toBe('notifications.markAllReadError');
    });

    it('is cleared as soon as the user tries again', async () => {
      fakeServer(listMock, 100);
      const { result } = await mount();
      listMock.mockRejectedValueOnce(new Error('network'));
      await act(async () => {
        await result.current.loadMore();
      });
      expect(result.current.loadMoreFailed).toBe(true);
      const slow = deferred<NotificationsPage>();
      listMock.mockImplementationOnce(() => slow.promise);

      let retry!: Promise<void>;
      act(() => {
        retry = result.current.loadMore();
      });
      expect(result.current.loadMoreFailed).toBe(false);
      expect(result.current.loadingMore).toBe(true);
      await act(async () => {
        slow.resolve(serverPage(100, 2, 15));
        await retry;
      });

      expect(result.current.loadMoreFailed).toBe(false);
      expect(result.current.items).toHaveLength(30);
    });

    it('is reported again when the retry fails too', async () => {
      fakeServer(listMock, 100);
      const { result } = await mount();
      listMock.mockRejectedValue(new Error('network'));
      await act(async () => {
        await result.current.loadMore();
      });

      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.loadMoreFailed).toBe(true);
      expect(result.current.items).toHaveLength(15);
    });

    it('is cleared when the list refreshes successfully', async () => {
      fakeServer(listMock, 100);
      const { result } = await mount();
      listMock.mockRejectedValueOnce(new Error('network'));
      await act(async () => {
        await result.current.loadMore();
      });
      expect(result.current.loadMoreFailed).toBe(true);

      await refreshFromEvent(result);

      expect(result.current.loadMoreFailed).toBe(false);
    });

    it('stays reported when a refresh in the background fails', async () => {
      fakeServer(listMock, 100);
      const { result } = await mount();
      listMock.mockRejectedValueOnce(new Error('network'));
      await act(async () => {
        await result.current.loadMore();
      });
      listMock.mockRejectedValueOnce(new Error('network'));

      await refreshFromEvent(result);

      expect(result.current.loadMoreFailed).toBe(true);
    });

    it('does not appear when nothing was left to load', async () => {
      fakeServer(listMock, 10);
      const { result } = await mount();

      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.loadMoreFailed).toBe(false);
    });
  });

  describe('read notifications stay read', () => {
    it('does not turn a notification back to unread when an older answer lands after it was read', async () => {
      fakeServer(listMock, 40);
      markOneMock.mockResolvedValue({
        id: 3,
        is_read: true,
        read_at: '2026-05-01T13:00:00Z',
        unread_count: 7,
      });
      const { result } = await mount();
      const slow = deferred<NotificationsPage>();
      listMock.mockImplementationOnce(() => slow.promise);
      act(() => {
        dispatchNotificationsChanged();
      });
      await waitFor(() => expect(result.current.refreshing).toBe(true));

      await act(async () => {
        await result.current.markItemRead(result.current.items[2]);
      });
      expect(result.current.items[2].is_read).toBe(true);
      // Odpoveď odišla pred prečítaním, takže ho ešte vidí ako neprečítané.
      await act(async () => {
        slow.resolve(serverPage(40, 1, 15));
      });
      await waitFor(() => expect(result.current.refreshing).toBe(false));

      expect(result.current.items[2].id).toBe(3);
      expect(result.current.items[2].is_read).toBe(true);
      expect(result.current.items[3].is_read).toBe(false);
    });

    it('keeps every loaded notification read after mark-all even if an older answer lands later', async () => {
      fakeServer(listMock, 40);
      markAllMock.mockResolvedValue({});
      const { result } = await mount();
      const slow = deferred<NotificationsPage>();
      listMock.mockImplementationOnce(() => slow.promise);
      act(() => {
        dispatchNotificationsChanged();
      });
      await waitFor(() => expect(result.current.refreshing).toBe(true));

      await act(async () => {
        await result.current.markAllRead();
      });
      await act(async () => {
        slow.resolve(serverPage(40, 1, 15));
      });
      await waitFor(() => expect(result.current.refreshing).toBe(false));

      expect(result.current.items).toHaveLength(15);
      expect(result.current.items.every((item) => item.is_read)).toBe(true);
    });

    it('leaves notifications that arrived after mark-all unread', async () => {
      fakeServer(listMock, 40);
      markAllMock.mockResolvedValue({});
      const { result } = await mount();
      await act(async () => {
        await result.current.markAllRead();
      });
      listMock.mockResolvedValueOnce({
        ...serverPage(41, 1, 15),
        results: [notification(900), ...range(1, 14).map((item) => ({ ...item, is_read: true }))],
      });

      await refreshFromEvent(result);

      expect(result.current.items[0].id).toBe(900);
      expect(result.current.items[0].is_read).toBe(false);
      expect(result.current.items[1].is_read).toBe(true);
    });

    it('keeps a read notification read when a later batch brings it in as unread', async () => {
      fakeServer(listMock, 100);
      markOneMock.mockResolvedValue({
        id: 20,
        is_read: true,
        read_at: '2026-05-01T13:00:00Z',
        unread_count: 7,
      });
      const { result } = await mount();
      // Upozornenie 20 sa prečíta (napr. v inom okne) a stránka 2 ho ešte prináša ako neprečítané.
      await act(async () => {
        await result.current.markItemRead(notification(20));
      });

      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.items.find((item) => item.id === 20)?.is_read).toBe(true);
      expect(result.current.items.find((item) => item.id === 21)?.is_read).toBe(false);
    });
  });
});
