import React from 'react';
import { act } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import {
  RequestsNotificationsProvider,
  useMessagesNotifications,
  useRequestsNotifications,
} from '../RequestsNotificationsContext';
import {
  MESSAGING_CONVERSATIONS_REFRESH_EVENT,
  MESSAGING_REALTIME_MESSAGE_EVENT,
  MESSAGING_REALTIME_READ_EVENT,
} from '@/components/dashboard/modules/messages/messagesEvents';

const mockApiGet = jest.fn();
const mockApiPost = jest.fn();
const mockEnsureFreshSessionForBackgroundWork = jest.fn();
const mockEnsureSessionRefreshed = jest.fn();
let mockAuthState: { isLoading: boolean; user: { id: number; unread_skill_request_count?: number } | null } = {
  isLoading: false,
  user: { id: 1 },
};
const mockAudioPlay = jest.fn();
const mockAudioPause = jest.fn();
const mockAudioLoad = jest.fn();

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
  ensureFreshSessionForBackgroundWork: (...args: unknown[]) =>
    mockEnsureFreshSessionForBackgroundWork(...args),
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

function MessageConsumer() {
  const { unreadCount } = useMessagesNotifications();
  return <div data-testid="message-count">{String(unreadCount)}</div>;
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

class MockAudio {
  static instances: MockAudio[] = [];

  readonly src: string;
  preload = '';
  volume = 1;
  currentTime = 0;

  constructor(src: string) {
    this.src = src;
    MockAudio.instances.push(this);
  }

  play() {
    mockAudioPlay(this.src);
    return Promise.resolve();
  }

  load() {
    mockAudioLoad(this.src);
  }

  pause() {
    mockAudioPause();
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
    mockAuthState = { isLoading: false, user: { id: 1 } };
    MockWebSocket.instances = [];
    MockAudio.instances = [];
    setVisibilityState('visible');
    Object.defineProperty(window, 'WebSocket', {
      configurable: true,
      writable: true,
      value: MockWebSocket,
    });
    Object.defineProperty(window, 'Audio', {
      configurable: true,
      writable: true,
      value: MockAudio,
    });
    delete (globalThis as typeof globalThis & { __SWAPLY_REQ_WS_STORE__?: unknown }).__SWAPLY_REQ_WS_STORE__;
    delete (globalThis as typeof globalThis & { __SWAPLY_REQ_UNREAD_STORE__?: unknown }).__SWAPLY_REQ_UNREAD_STORE__;
    delete (globalThis as typeof globalThis & { __SWAPLY_MSG_UNREAD_STORE__?: unknown }).__SWAPLY_MSG_UNREAD_STORE__;
    delete (globalThis as typeof globalThis & { __SWAPLY_MSG_AUDIO__?: unknown }).__SWAPLY_MSG_AUDIO__;
    delete (globalThis as typeof globalThis & { __SWAPLY_MSG_AUDIO_CTX__?: unknown }).__SWAPLY_MSG_AUDIO_CTX__;
    delete (globalThis as typeof globalThis & { __SWAPLY_MSG_AUDIO_BUFFER__?: unknown }).__SWAPLY_MSG_AUDIO_BUFFER__;
    delete (globalThis as typeof globalThis & { __SWAPLY_MSG_AUDIO_BUFFER_PROMISE__?: unknown }).__SWAPLY_MSG_AUDIO_BUFFER_PROMISE__;
    delete (globalThis as typeof globalThis & { __SWAPLY_MSG_AUDIO_PRIMER_INSTALLED__?: unknown }).__SWAPLY_MSG_AUDIO_PRIMER_INSTALLED__;
    mockApiGet.mockImplementation((url: string) => {
      if (String(url).includes('/auth/notifications/unread-count/')) {
        return Promise.resolve({ data: { count: 4 } });
      }
      if (String(url).includes('/auth/messaging/conversations/unread-summary/')) {
        return Promise.resolve({ data: { count: 3 } });
      }
      return Promise.resolve({ data: { count: 0 } });
    });
    mockApiPost.mockResolvedValue({ data: { ok: true } });
    mockEnsureFreshSessionForBackgroundWork.mockResolvedValue('ready');
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
        <MessageConsumer />
      </RequestsNotificationsProvider>,
    );
    await flushAsyncEffects();

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledTimes(2);
      expect(screen.getByTestId('count')).toHaveTextContent('4');
      expect(screen.getByTestId('message-count')).toHaveTextContent('3');
    });

    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(mockApiGet).toHaveBeenCalledTimes(2);

    act(() => {
      jest.advanceTimersByTime(10000);
    });

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledTimes(4);
    });
    expect(screen.getByTestId('count')).toHaveTextContent('4');
    expect(screen.getByTestId('message-count')).toHaveTextContent('3');
  });

  it('skips polling requests while background auth refresh is transiently unavailable', async () => {
    mockEnsureFreshSessionForBackgroundWork.mockResolvedValue('transient_failure');

    render(
      <RequestsNotificationsProvider>
        <Consumer />
        <MessageConsumer />
      </RequestsNotificationsProvider>,
    );
    await flushAsyncEffects();

    expect(mockApiGet).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(30_000);
      window.dispatchEvent(new Event('focus'));
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(mockApiGet).not.toHaveBeenCalled();
  });

  it('uses unread count from auth bootstrap without firing an immediate unread-count request', async () => {
    mockAuthState = {
      isLoading: false,
      user: { id: 1, unread_skill_request_count: 7 },
    };

    render(
      <RequestsNotificationsProvider>
        <Consumer />
        <MessageConsumer />
      </RequestsNotificationsProvider>,
    );
    await flushAsyncEffects();

    expect(mockApiGet).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('count')).toHaveTextContent('7');
    expect(screen.getByTestId('message-count')).toHaveTextContent('3');
  });

  it('stops polling after websocket opens without duplicating a fresh initial unread request', async () => {
    render(
      <RequestsNotificationsProvider>
        <Consumer />
      </RequestsNotificationsProvider>,
    );
    await flushAsyncEffects();

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledTimes(2);
    });

    expect(MockWebSocket.instances).toHaveLength(1);

    act(() => {
      MockWebSocket.instances[0].emitOpen();
    });

    expect(mockApiGet).toHaveBeenCalledTimes(2);

    act(() => {
      jest.advanceTimersByTime(30000);
    });

    expect(mockApiGet).toHaveBeenCalledTimes(2);
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
    mockApiGet.mockImplementation((url: string) => {
      if (String(url).includes('/auth/notifications/unread-count/')) {
        return pending.promise;
      }
      if (String(url).includes('/auth/messaging/conversations/unread-summary/')) {
        return Promise.resolve({ data: { count: 3 } });
      }
      return Promise.resolve({ data: { count: 0 } });
    });

    render(
      <RequestsNotificationsProvider>
        <Consumer />
        <MessageConsumer />
      </RequestsNotificationsProvider>,
    );
    await flushAsyncEffects();

    expect(mockApiGet).toHaveBeenCalledTimes(2);

    act(() => {
      window.dispatchEvent(new Event('focus'));
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(mockApiGet).toHaveBeenCalledTimes(2);

    await act(async () => {
      pending.resolve({ data: { count: 9 } });
      await pending.promise;
    });

    await waitFor(() => {
      expect(screen.getByTestId('count')).toHaveTextContent('9');
      expect(screen.getByTestId('message-count')).toHaveTextContent('3');
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
      expect(mockApiGet).toHaveBeenCalledTimes(2);
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
      expect(mockApiGet).toHaveBeenCalledTimes(2);
    });

    act(() => {
      window.dispatchEvent(new Event('focus'));
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(mockApiGet).toHaveBeenCalledTimes(2);
  });

  it('does not refetch unread count after a fast provider remount', async () => {
    const firstRender = render(
      <RequestsNotificationsProvider>
        <Consumer />
      </RequestsNotificationsProvider>,
    );
    await flushAsyncEffects();

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledTimes(2);
      expect(screen.getByTestId('count')).toHaveTextContent('4');
    });

    firstRender.unmount();

    render(
      <RequestsNotificationsProvider>
        <Consumer />
      </RequestsNotificationsProvider>,
    );
    await flushAsyncEffects();

    expect(mockApiGet).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('count')).toHaveTextContent('4');
  });

  it('bridges messaging websocket payloads into browser events for message modules', async () => {
    const conversationsRefreshSpy = jest.fn();
    const realtimeSpy = jest.fn();
    window.addEventListener(MESSAGING_CONVERSATIONS_REFRESH_EVENT, conversationsRefreshSpy);
    window.addEventListener(MESSAGING_REALTIME_MESSAGE_EVENT, realtimeSpy);

    render(
      <RequestsNotificationsProvider>
        <Consumer />
        <MessageConsumer />
      </RequestsNotificationsProvider>,
    );
    await flushAsyncEffects();

    expect(MockWebSocket.instances).toHaveLength(1);

    act(() => {
      MockWebSocket.instances[0].emitMessage({
        type: 'messaging_message',
        conversation_id: 9,
        message_id: 12,
        sender_id: 77,
        created_at: '2026-03-29T10:00:00Z',
        total_unread_count: 6,
      });
    });

    expect(conversationsRefreshSpy).toHaveBeenCalledTimes(1);
    expect(realtimeSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('message-count')).toHaveTextContent('6');

    window.removeEventListener(MESSAGING_CONVERSATIONS_REFRESH_EVENT, conversationsRefreshSpy);
    window.removeEventListener(MESSAGING_REALTIME_MESSAGE_EVENT, realtimeSpy);
  });

  it('bridges peer read websocket payloads into browser events for message modules', async () => {
    const realtimeReadSpy = jest.fn();
    window.addEventListener(MESSAGING_REALTIME_READ_EVENT, realtimeReadSpy);

    render(
      <RequestsNotificationsProvider>
        <Consumer />
        <MessageConsumer />
      </RequestsNotificationsProvider>,
    );
    await flushAsyncEffects();

    expect(MockWebSocket.instances).toHaveLength(1);

    act(() => {
      MockWebSocket.instances[0].emitMessage({
        type: 'messaging_peer_read',
        conversation_id: 9,
        reader_id: 77,
        peer_last_read_at: '2026-03-29T10:00:00Z',
      });
    });

    expect(realtimeReadSpy).toHaveBeenCalledTimes(1);
    const [event] = realtimeReadSpy.mock.calls[0] as [CustomEvent];
    expect(event.detail).toMatchObject({
      conversationId: 9,
      readerId: 77,
      peerLastReadAt: '2026-03-29T10:00:00Z',
    });

    window.removeEventListener(MESSAGING_REALTIME_READ_EVENT, realtimeReadSpy);
  });

  it('keeps message unread state reactive in React strict mode after websocket updates', async () => {
    render(
      <React.StrictMode>
        <RequestsNotificationsProvider>
          <Consumer />
          <MessageConsumer />
        </RequestsNotificationsProvider>
      </React.StrictMode>,
    );
    await flushAsyncEffects();

    expect(MockWebSocket.instances).toHaveLength(1);

    act(() => {
      MockWebSocket.instances[0].emitMessage({
        type: 'messaging_message',
        conversation_id: 5,
        message_id: 99,
        sender_id: 77,
        created_at: '2026-03-31T10:00:00Z',
        total_unread_count: 8,
      });
    });

    expect(screen.getByTestId('message-count')).toHaveTextContent('8');
  });

  it('plays the configured mp3 notification sound for incoming messages outside the active conversation', async () => {
    mockAuthState = {
      isLoading: false,
      user: { id: 1 },
    };

    render(
      <RequestsNotificationsProvider>
        <MessageConsumer />
      </RequestsNotificationsProvider>,
    );
    await flushAsyncEffects();

    expect(MockWebSocket.instances).toHaveLength(1);

    act(() => {
      MockWebSocket.instances[0].emitMessage({
        type: 'messaging_message',
        conversation_id: 9,
        message_id: 12,
        sender_id: 77,
        created_at: '2026-03-31T12:00:00Z',
        total_unread_count: 4,
      });
    });

    await waitFor(() => {
      expect(mockAudioPlay).toHaveBeenCalledWith(
        '/sounds/universfield-new-notification-040-493469.mp3',
      );
    });
    expect(MockAudio.instances[0]?.volume).toBeCloseTo(0.45);
  });

  it('primes the configured mp3 notification sound after the first user interaction', async () => {
    render(
      <RequestsNotificationsProvider>
        <MessageConsumer />
      </RequestsNotificationsProvider>,
    );
    await flushAsyncEffects();

    act(() => {
      document.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    });

    expect(mockAudioLoad).toHaveBeenCalledWith(
      '/sounds/universfield-new-notification-040-493469.mp3',
    );
  });

  it('updates message unread count from the unread summary endpoint', async () => {
    render(
      <RequestsNotificationsProvider>
        <MessageConsumer />
      </RequestsNotificationsProvider>,
    );
    await flushAsyncEffects();

    await waitFor(() => {
      expect(screen.getByTestId('message-count')).toHaveTextContent('3');
    });
  });

  it('falls back to incrementing message unread count when websocket payload lacks total_unread_count', async () => {
    mockAuthState = {
      isLoading: false,
      user: { id: 1 },
    };

    render(
      <RequestsNotificationsProvider>
        <MessageConsumer />
      </RequestsNotificationsProvider>,
    );
    await flushAsyncEffects();

    expect(MockWebSocket.instances).toHaveLength(1);

    act(() => {
      MockWebSocket.instances[0].emitMessage({
        type: 'messaging_message',
        conversation_id: 9,
        message_id: 12,
        sender_id: 77,
        created_at: '2026-03-29T10:00:00Z',
      });
    });

    expect(screen.getByTestId('message-count')).toHaveTextContent('4');
  });
});
