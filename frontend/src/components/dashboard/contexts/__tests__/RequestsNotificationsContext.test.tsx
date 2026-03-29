import React from 'react';
import { act } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { RequestsNotificationsProvider, useRequestsNotifications } from '../RequestsNotificationsContext';

const mockApiGet = jest.fn();
const mockApiPost = jest.fn();
const mockEnsureSessionRefreshed = jest.fn();
let mockAuthState: { isLoading: boolean; user: { id: number; unread_skill_request_count?: number } | null } = {
  isLoading: false,
  user: null,
};

jest.mock('@/lib/api', () => ({
  __esModule: true,
  api: {
    get: (...args: unknown[]) => mockApiGet(...args),
    post: (...args: unknown[]) => mockApiPost(...args),
  },
  endpoints: {
    notifications: {
      unreadCount: '/auth/notifications/unread-count/',
      markAllRead: '/auth/notifications/mark-all-read/',
    },
  },
  ensureSessionRefreshed: (...args: unknown[]) => mockEnsureSessionRefreshed(...args),
}));

jest.mock('@/contexts/AuthContext', () => ({
  __esModule: true,
  useAuth: () => mockAuthState,
}));

function Consumer() {
  const { unreadCount } = useRequestsNotifications();
  return <div data-testid="count">{String(unreadCount)}</div>;
}

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

function setVisibilityState(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

async function flushAsyncEffects() {
  await act(async () => {
    jest.advanceTimersByTime(0);
    await Promise.resolve();
  });
}

describe('RequestsNotificationsProvider', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_API_URL = '/api';
    process.env.NEXT_PUBLIC_BACKEND_WS_ORIGIN = '';
    mockAuthState = { isLoading: false, user: null };
    MockWebSocket.instances = [];
    setVisibilityState('visible');
    Object.defineProperty(window, 'WebSocket', {
      configurable: true,
      writable: true,
      value: MockWebSocket,
    });
    delete (globalThis as typeof globalThis & { __SWAPLY_REQ_WS_STORE__?: unknown }).__SWAPLY_REQ_WS_STORE__;
    delete (globalThis as typeof globalThis & { __SWAPLY_REQ_UNREAD_STORE__?: unknown }).__SWAPLY_REQ_UNREAD_STORE__;
    mockApiGet.mockResolvedValue({ data: { count: 4 } });
    mockApiPost.mockResolvedValue({ data: { ok: true } });
    mockEnsureSessionRefreshed.mockResolvedValue('refreshed');
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    process.env.NEXT_PUBLIC_API_URL = '/api';
    process.env.NEXT_PUBLIC_BACKEND_WS_ORIGIN = '';
  });

  it('polls unread count only after the fresh bootstrap window expires', async () => {
    render(
      <RequestsNotificationsProvider>
        <Consumer />
      </RequestsNotificationsProvider>,
    );
    await flushAsyncEffects();

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('count')).toHaveTextContent('4');
    });

    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(mockApiGet).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(10000);
    });

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledTimes(2);
    });
    expect(screen.getByTestId('count')).toHaveTextContent('4');
  });

  it('uses unread count from auth bootstrap without firing an immediate unread-count request', async () => {
    mockAuthState = {
      isLoading: false,
      user: { id: 1, unread_skill_request_count: 7 },
    };

    render(
      <RequestsNotificationsProvider>
        <Consumer />
      </RequestsNotificationsProvider>,
    );
    await flushAsyncEffects();

    expect(mockApiGet).not.toHaveBeenCalled();
    expect(screen.getByTestId('count')).toHaveTextContent('7');
  });

  it('stops polling after websocket opens without duplicating a fresh initial unread request', async () => {
    render(
      <RequestsNotificationsProvider>
        <Consumer />
      </RequestsNotificationsProvider>,
    );
    await flushAsyncEffects();

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledTimes(1);
    });

    expect(MockWebSocket.instances).toHaveLength(1);

    act(() => {
      MockWebSocket.instances[0].emitOpen();
    });

    expect(mockApiGet).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(30000);
    });

    expect(mockApiGet).toHaveBeenCalledTimes(1);
  });

  it('keeps websocket same-origin when api uses relative proxy paths', async () => {
    process.env.NEXT_PUBLIC_BACKEND_WS_ORIGIN = 'https://ws.example.com';

    render(
      <RequestsNotificationsProvider>
        <Consumer />
      </RequestsNotificationsProvider>,
    );
    await flushAsyncEffects();

    expect(MockWebSocket.instances).toHaveLength(1);
    expect(MockWebSocket.instances[0].url).toBe('ws://localhost/ws/notifications/');
  });

  it('uses explicit websocket origin only when api origin is absolute', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://backend.example/api';
    process.env.NEXT_PUBLIC_BACKEND_WS_ORIGIN = 'https://ws.example.com';

    render(
      <RequestsNotificationsProvider>
        <Consumer />
      </RequestsNotificationsProvider>,
    );
    await flushAsyncEffects();

    expect(MockWebSocket.instances).toHaveLength(1);
    expect(MockWebSocket.instances[0].url).toBe('wss://ws.example.com/ws/notifications/');
  });

  it('deduplicates unread refresh while a request is already in flight', async () => {
    const pending = deferred<{ data: { count: number } }>();
    mockApiGet.mockImplementation(() => pending.promise);

    render(
      <RequestsNotificationsProvider>
        <Consumer />
      </RequestsNotificationsProvider>,
    );
    await flushAsyncEffects();

    expect(mockApiGet).toHaveBeenCalledTimes(1);

    act(() => {
      window.dispatchEvent(new Event('focus'));
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(mockApiGet).toHaveBeenCalledTimes(1);

    await act(async () => {
      pending.resolve({ data: { count: 9 } });
      await pending.promise;
    });

    await waitFor(() => {
      expect(screen.getByTestId('count')).toHaveTextContent('9');
    });
  });

  it('does not poll while the tab is hidden and refreshes when it becomes visible', async () => {
    setVisibilityState('hidden');

    render(
      <RequestsNotificationsProvider>
        <Consumer />
      </RequestsNotificationsProvider>,
    );
    await flushAsyncEffects();

    expect(mockApiGet).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(30000);
    });

    expect(mockApiGet).not.toHaveBeenCalled();

    act(() => {
      setVisibilityState('visible');
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledTimes(1);
    });
  });

  it('skips immediate focus refresh when unread count was fetched just moments ago', async () => {
    render(
      <RequestsNotificationsProvider>
        <Consumer />
      </RequestsNotificationsProvider>,
    );
    await flushAsyncEffects();

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledTimes(1);
    });

    act(() => {
      window.dispatchEvent(new Event('focus'));
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(mockApiGet).toHaveBeenCalledTimes(1);
  });

  it('does not refetch unread count after a fast provider remount', async () => {
    const firstRender = render(
      <RequestsNotificationsProvider>
        <Consumer />
      </RequestsNotificationsProvider>,
    );
    await flushAsyncEffects();

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('count')).toHaveTextContent('4');
    });

    firstRender.unmount();

    render(
      <RequestsNotificationsProvider>
        <Consumer />
      </RequestsNotificationsProvider>,
    );
    await flushAsyncEffects();

    expect(mockApiGet).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('count')).toHaveTextContent('4');
  });
});
