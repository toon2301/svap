import { act } from 'react';
import { render, screen, waitFor } from '@testing-library/react';

import {
  listNotificationsPage,
  type NotificationsPage,
} from '@/components/dashboard/modules/notifications/notificationsApi';
import {
  notification,
  range,
  serverPage,
} from '@/components/dashboard/modules/notifications/notificationsFeedTestUtils';
import { useNotificationsFeed } from '@/components/dashboard/modules/notifications/useNotificationsFeed';
import { NOTIFICATIONS_RESYNC_DEBOUNCE_MS } from '@/components/dashboard/modules/notifications/useNotificationsResync';

import {
  RequestsNotificationsProvider,
  useNotificationsUnread,
} from '../RequestsNotificationsContext';

/**
 * Provider + otvorený zoznam upozornení spolu (bez mockov zvončeka): overuje celý reťazec
 * WS -> `notifications:changed` / reconnect -> obnova zoznamu a že počítadlo zvončeka ostáva
 * na pôvodnej logike.
 */

const mockApiGet = jest.fn();
const mockEnsureFreshSessionForBackgroundWork = jest.fn();
const mockEnsureSessionRefreshed = jest.fn();
let mockAuthState = { isLoading: false, user: { id: 1 } };

jest.mock('@/lib/api', () => ({
  __esModule: true,
  api: { get: (...args: unknown[]) => mockApiGet(...args), post: jest.fn() },
  endpoints: {
    notifications: {
      unreadCount: '/auth/notifications/unread-count/',
      markAllRead: '/auth/notifications/mark-all-read/',
    },
  },
  ensureFreshSessionForBackgroundWork: (...args: unknown[]) =>
    mockEnsureFreshSessionForBackgroundWork(...args),
  ensureSessionRefreshed: (...args: unknown[]) => mockEnsureSessionRefreshed(...args),
}));

jest.mock('@/contexts/AuthContext', () => ({
  __esModule: true,
  useAuth: () => mockAuthState,
}));

jest.mock('@/components/dashboard/modules/notifications/notificationsApi', () => ({
  __esModule: true,
  listNotificationsPage: jest.fn(),
  markAllNotificationsRead: jest.fn(),
  markNotificationRead: jest.fn(),
}));

const listMock = listNotificationsPage as jest.Mock;

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 3;
  static instances: MockWebSocket[] = [];

  readonly url: string;
  readyState = MockWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: ((event: { code?: number }) => void | Promise<void>) | null = null;
  onerror: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  emitOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }

  emitMessage(payload: unknown) {
    this.onmessage?.({ data: JSON.stringify(payload) });
  }

  emitClose(code = 1006) {
    this.readyState = MockWebSocket.CLOSED;
    void this.onclose?.({ code });
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
  }
}

function Probe() {
  const { items, loading } = useNotificationsFeed();
  const { unreadCount } = useNotificationsUnread();
  return (
    <>
      <div data-testid="feed">
        {loading
          ? 'loading'
          : items
              .slice(0, 3)
              .map((item) => item.id)
              .join(',')}
      </div>
      <div data-testid="bell">{String(unreadCount)}</div>
    </>
  );
}

const feedText = () => screen.getByTestId('feed').textContent;

/** Server s `total` upozorneniami; po `addTop()` je navrchu nové upozornenie 500. */
function serverWithAddTop(total: number) {
  let withNew = false;
  listMock.mockImplementation(
    async (page: number, pageSize: number): Promise<NotificationsPage> => {
      const base = serverPage(total + (withNew ? 1 : 0), page, pageSize);
      if (!withNew || page !== 1) return base;
      return { ...base, results: [notification(500), ...range(1, pageSize - 1)] };
    },
  );
  return {
    addTop: () => {
      withNew = true;
    },
  };
}

async function flush() {
  await act(async () => {
    jest.advanceTimersByTime(0);
    await Promise.resolve();
  });
}

async function renderOpenFeed() {
  const server = serverWithAddTop(40);
  render(
    <RequestsNotificationsProvider>
      <Probe />
    </RequestsNotificationsProvider>,
  );
  await flush();
  await waitFor(() => expect(feedText()).toBe('1,2,3'));
  expect(MockWebSocket.instances).toHaveLength(1);
  act(() => MockWebSocket.instances[0].emitOpen());
  await flush();
  return server;
}

describe('open notifications list with the realtime provider', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_API_URL = '/api';
    process.env.NEXT_PUBLIC_BACKEND_WS_ORIGIN = '';
    mockAuthState = { isLoading: false, user: { id: 1 } };
    MockWebSocket.instances = [];
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });
    Object.defineProperty(window, 'WebSocket', {
      configurable: true,
      writable: true,
      value: MockWebSocket,
    });
    for (const key of [
      '__SWAPLY_REQ_WS_STORE__',
      '__SWAPLY_REQ_UNREAD_STORE__',
      '__SWAPLY_MSG_UNREAD_STORE__',
      '__SWAPLY_NOTIF_UNREAD_STORE__',
    ]) {
      delete (globalThis as Record<string, unknown>)[key];
    }
    try {
      window.localStorage.clear();
    } catch {
      // ignore
    }
    mockApiGet.mockImplementation((url: string) =>
      Promise.resolve({ data: { count: String(url).includes('/unread-count/') ? 5 : 0 } }),
    );
    mockEnsureFreshSessionForBackgroundWork.mockResolvedValue('ready');
    mockEnsureSessionRefreshed.mockResolvedValue('refreshed');
    listMock.mockReset();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('adds the notification from a live websocket payload and moves the bell as before', async () => {
    const server = await renderOpenFeed();
    server.addTop();

    act(() => {
      MockWebSocket.instances[0].emitMessage({ type: 'notification_created', unread_count: 7 });
    });
    await waitFor(() => expect(feedText()).toBe('500,1,2'));

    expect(screen.getByTestId('bell').textContent).toBe('7');
  });

  it('does not refetch the list on the very first connection', async () => {
    await renderOpenFeed();
    const callsAfterOpen = listMock.mock.calls.length;

    await act(async () => {
      jest.advanceTimersByTime(NOTIFICATIONS_RESYNC_DEBOUNCE_MS * 3);
    });

    expect(listMock).toHaveBeenCalledTimes(callsAfterOpen);
  });

  it('picks up a notification that was missed while the socket was down, after the reconnect', async () => {
    const server = await renderOpenFeed();
    const bellBefore = screen.getByTestId('bell').textContent;

    act(() => MockWebSocket.instances[0].emitClose(1006));
    server.addTop(); // udalosť sa počas výpadku stratila: do klienta nikdy nedorazí
    await act(async () => {
      jest.advanceTimersByTime(2000);
      await Promise.resolve();
    });
    expect(MockWebSocket.instances).toHaveLength(2);
    expect(feedText()).toBe('1,2,3');

    act(() => MockWebSocket.instances[1].emitOpen());
    await act(async () => {
      jest.advanceTimersByTime(NOTIFICATIONS_RESYNC_DEBOUNCE_MS);
      await Promise.resolve();
    });
    await waitFor(() => expect(feedText()).toBe('500,1,2'));

    expect(screen.getByTestId('bell').textContent).toBe(bellBefore);
  });
});
