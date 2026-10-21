import { act, renderHook, waitFor } from '@testing-library/react';

import { publishNotificationUnreadCount } from '@/components/dashboard/contexts/notificationUnreadStore';
import { MESSAGING_REALTIME_RECONNECTED_EVENT } from '@/components/dashboard/modules/messages/messagesEvents';

import { listNotificationsPage, type NotificationsPage } from '../notificationsApi';
import {
  deferred,
  fakeServer,
  notification,
  range,
  serverPage,
} from '../notificationsFeedTestUtils';
import { useNotificationsFeed } from '../useNotificationsFeed';
import {
  NOTIFICATIONS_RESYNC_DEBOUNCE_MS,
  NOTIFICATIONS_RESYNC_POLL_MAX_ITEMS,
  NOTIFICATIONS_RESYNC_POLL_MS,
} from '../useNotificationsResync';

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
const ids = (items: Array<{ id: number }>) => items.map((item) => item.id);

/** Server po tom, čo pribudlo upozornenie 500: je navrchu, zvyšok sa posunul o jedno. */
function serverWithNewTopItem(total: number) {
  listMock.mockImplementation(async (page: number, pageSize: number) => {
    const base = serverPage(total + 1, page, pageSize);
    if (page !== 1) return base;
    return { ...base, results: [notification(500), ...range(1, pageSize - 1)] };
  });
}

async function mountWithThreeBatches() {
  fakeServer(listMock, 100);
  const view = renderHook(() => useNotificationsFeed());
  await waitFor(() => expect(view.result.current.loading).toBe(false));
  for (let index = 1; index < 3; index += 1) {
    await act(async () => {
      await view.result.current.loadMore();
    });
  }
  expect(view.result.current.items).toHaveLength(45);
  return view;
}

async function mountWithBatches(batches: number) {
  fakeServer(listMock, 200);
  const view = renderHook(() => useNotificationsFeed());
  await waitFor(() => expect(view.result.current.loading).toBe(false));
  for (let index = 1; index < batches; index += 1) {
    await act(async () => {
      await view.result.current.loadMore();
    });
  }
  expect(view.result.current.items).toHaveLength(batches * 15);
  return view;
}

async function waitForPoll() {
  await act(async () => {
    jest.advanceTimersByTime(NOTIFICATIONS_RESYNC_POLL_MS + NOTIFICATIONS_RESYNC_DEBOUNCE_MS);
  });
}

async function returnToForeground() {
  await act(async () => {
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));
    jest.advanceTimersByTime(NOTIFICATIONS_RESYNC_DEBOUNCE_MS);
  });
}

describe('useNotificationsFeed resync after a gap in realtime', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    listMock.mockReset();
    (publishNotificationUnreadCount as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('puts the missed notification on top and keeps the 45 loaded ones when the app returns', async () => {
    const { result } = await mountWithThreeBatches();
    const before = ids(result.current.items);
    listMock.mockClear();
    serverWithNewTopItem(100);

    await returnToForeground();
    await waitFor(() => expect(result.current.items[0].id).toBe(500));

    // focus + visibilitychange = jedna požiadavka na celé okno 45, nie dve.
    expect(listMock).toHaveBeenCalledTimes(1);
    expect(listMock).toHaveBeenCalledWith(1, 45);
    expect(ids(result.current.items)).toEqual([500, ...before.slice(0, 44)]);
    expect(result.current.hasMore).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('picks up the missed notification after the realtime socket reconnects', async () => {
    const { result } = await mountWithThreeBatches();
    serverWithNewTopItem(100);

    await act(async () => {
      window.dispatchEvent(new Event(MESSAGING_REALTIME_RECONNECTED_EVENT));
      jest.advanceTimersByTime(NOTIFICATIONS_RESYNC_DEBOUNCE_MS);
    });
    await waitFor(() => expect(result.current.items[0].id).toBe(500));
    expect(result.current.items).toHaveLength(45);
  });

  it('still catches up when another signal arrives while a refresh is already running', async () => {
    const { result } = await mountWithThreeBatches();
    listMock.mockClear();
    const slow = deferred<NotificationsPage>();
    listMock.mockImplementationOnce(() => slow.promise);
    serverWithNewTopItem(100);

    await returnToForeground();
    await waitFor(() => expect(listMock).toHaveBeenCalledTimes(1));
    await act(async () => {
      window.dispatchEvent(new Event(MESSAGING_REALTIME_RECONNECTED_EVENT));
      jest.advanceTimersByTime(NOTIFICATIONS_RESYNC_DEBOUNCE_MS);
    });
    // Druhý signál sa k bežiacej obnove pripojí, nespúšťa súbežnú požiadavku.
    expect(listMock).toHaveBeenCalledTimes(1);
    // Kým obnova letí, zoznam ostáva na obrazovke (žiadny skeleton, nič sa neskráti).
    expect(result.current.loading).toBe(false);
    expect(result.current.items).toHaveLength(45);

    // Odpoveď bežiacej obnovy je ešte spred nového upozornenia; dobehnúť musí jedna ďalšia.
    await act(async () => {
      slow.resolve(serverPage(100, 1, 45));
    });
    await waitFor(() => expect(result.current.items[0].id).toBe(500));
    expect(listMock).toHaveBeenCalledTimes(2);
  });

  it('never touches the bell count', async () => {
    const { result } = await mountWithThreeBatches();
    serverWithNewTopItem(100);

    await returnToForeground();
    await waitFor(() => expect(result.current.items[0].id).toBe(500));

    expect(publishNotificationUnreadCount).not.toHaveBeenCalled();
  });

  it('stays silent when the background resync fails and keeps the list', async () => {
    const { result } = await mountWithThreeBatches();
    const before = ids(result.current.items);
    listMock.mockReset();
    listMock.mockRejectedValue(new Error('offline'));

    await returnToForeground();
    await waitFor(() => expect(listMock).toHaveBeenCalled());
    await waitFor(() => expect(result.current.refreshing).toBe(false));

    expect(result.current.error).toBeNull();
    expect(ids(result.current.items)).toEqual(before);
  });

  describe('the 30 s safety-net poll on a long list', () => {
    const limitBatches = NOTIFICATIONS_RESYNC_POLL_MAX_ITEMS / 15;

    it('allows the poll up to 90 loaded notifications (6 batches)', () => {
      expect(NOTIFICATIONS_RESYNC_POLL_MAX_ITEMS).toBe(90);
    });

    it('still polls at the limit of loaded notifications', async () => {
      await mountWithBatches(limitBatches);
      listMock.mockClear();

      await waitForPoll();

      expect(listMock).toHaveBeenCalled();
    });

    it('skips the poll above the limit, but a return to the foreground still resyncs', async () => {
      const { result } = await mountWithBatches(limitBatches + 1);
      listMock.mockClear();
      serverWithNewTopItem(200);

      await waitForPoll();
      await waitForPoll();
      expect(listMock).not.toHaveBeenCalled();

      await returnToForeground();
      await waitFor(() => expect(result.current.items[0].id).toBe(500));
      expect(listMock).toHaveBeenCalled();
    });
  });
});
