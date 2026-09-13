import fs from 'fs';
import path from 'path';

type RegisteredHandlers = Record<string, (event: unknown) => void>;

function createWaitUntilEvent(overrides: Record<string, unknown> = {}) {
  const pending: Promise<unknown>[] = [];

  return {
    ...overrides,
    pending,
    waitUntil: jest.fn((promise: Promise<unknown>) => {
      pending.push(Promise.resolve(promise));
    }),
  };
}

function loadServiceWorker() {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'public', 'sw.js'),
    'utf8',
  );
  const handlers: RegisteredHandlers = {};
  const showNotification = jest.fn().mockResolvedValue(undefined);
  const matchAll = jest.fn().mockResolvedValue([]);
  const openWindow = jest.fn().mockResolvedValue(undefined);
  const fetchMock = jest.fn().mockResolvedValue({
    status: 200,
    type: 'basic',
    clone: jest.fn(),
  });

  const selfScope = {
    skipWaiting: jest.fn(),
    addEventListener: jest.fn(
      (type: string, handler: (event: unknown) => void) => {
        handlers[type] = handler;
      },
    ),
    registration: {
      showNotification,
    },
    clients: {
      claim: jest.fn().mockResolvedValue(undefined),
      matchAll,
      openWindow,
    },
    location: {
      origin: 'https://svaply.com',
    },
  };

  const cacheStorage = {
    open: jest.fn().mockResolvedValue({
      put: jest.fn().mockResolvedValue(undefined),
    }),
    keys: jest.fn(),
    delete: jest.fn(),
    match: jest.fn().mockResolvedValue(undefined),
  };
  const logger = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
  const ResponseCtor =
    typeof Response === 'function'
      ? Response
      : function ResponseFallback(body?: unknown, init?: { status?: number }) {
          return {
            body,
            status: init?.status ?? 200,
          };
        };

  const evaluator = new Function(
    'self',
    'caches',
    'clients',
    'location',
    'console',
    'Response',
    'URL',
    'Promise',
    'fetch',
    source,
  );

  evaluator(
    selfScope,
    cacheStorage,
    selfScope.clients,
    selfScope.location,
    logger,
    ResponseCtor,
    URL,
    Promise,
    fetchMock,
  );

  return {
    handlers,
    showNotification,
    matchAll,
    openWindow,
    fetchMock,
    cacheStorage,
  };
}

describe('service worker media flow', () => {
  it('loads same-origin avatars from the network without reading or writing a cache', async () => {
    const { handlers, fetchMock, cacheStorage } = loadServiceWorker();
    const request = {
      url: 'https://svaply.com/media/avatars/immutable-id.webp',
      method: 'GET',
      destination: 'image',
      headers: { get: jest.fn().mockReturnValue('image/webp') },
    };
    const responsePromises: Promise<unknown>[] = [];
    const fetchEvent = {
      request,
      respondWith: jest.fn((response: Promise<unknown>) => {
        responsePromises.push(Promise.resolve(response));
      }),
    };

    handlers.fetch(fetchEvent);
    await Promise.all(responsePromises);

    expect(fetchMock).toHaveBeenCalledWith(request);
    expect(cacheStorage.match).not.toHaveBeenCalled();
    expect(cacheStorage.open).not.toHaveBeenCalled();
  });

  it('keeps the existing cache flow for non-avatar media', async () => {
    const { handlers, cacheStorage } = loadServiceWorker();
    const request = {
      url: 'https://svaply.com/media/offers/photo.webp',
      method: 'GET',
      destination: 'image',
      headers: { get: jest.fn().mockReturnValue('image/webp') },
    };
    const responsePromises: Promise<unknown>[] = [];
    const fetchEvent = {
      request,
      respondWith: jest.fn((response: Promise<unknown>) => {
        responsePromises.push(Promise.resolve(response));
      }),
    };

    handlers.fetch(fetchEvent);
    await Promise.all(responsePromises);

    expect(cacheStorage.match).toHaveBeenCalledWith(request);
  });
});

describe('service worker message push flow', () => {
  it('shows a grouped message notification and sanitizes external URLs', async () => {
    const { handlers, showNotification } = loadServiceWorker();
    const pushEvent = createWaitUntilEvent({
      data: {
        json: () => ({
          type: 'message_push',
          conversationId: 42,
          url: 'https://evil.example.com/steal',
          title: 'Nova sprava',
          body: 'Mas novu spravu od pouzivatela.',
          tag: 'messages-conversation-42',
        }),
      },
    });

    handlers.push(pushEvent);
    await Promise.all(pushEvent.pending);

    expect(showNotification).toHaveBeenCalledWith(
      'Nova sprava',
      expect.objectContaining({
        body: 'Mas novu spravu od pouzivatela.',
        tag: 'messages-conversation-42',
        data: {
          type: 'message_push',
          conversationId: 42,
          url: '/dashboard/messages?conversationId=42',
          tag: 'messages-conversation-42',
        },
      }),
    );
  });

  it('focuses an existing app window and navigates it to the target conversation', async () => {
    const { handlers, matchAll, openWindow } = loadServiceWorker();
    const focusedClient = {
      focus: jest.fn().mockResolvedValue(undefined),
    };
    const existingClient = {
      url: 'https://svaply.com/dashboard/profile',
      navigate: jest.fn().mockResolvedValue(focusedClient),
      focus: jest.fn().mockResolvedValue(undefined),
    };

    matchAll.mockResolvedValue([existingClient]);

    const clickEvent = createWaitUntilEvent({
      action: '',
      notification: {
        close: jest.fn(),
        data: {
          type: 'message_push',
          conversationId: 17,
          url: '/dashboard/messages?conversationId=17',
          tag: 'messages-conversation-17',
        },
      },
    });

    handlers.notificationclick(clickEvent);
    await Promise.all(clickEvent.pending);

    expect(existingClient.navigate).toHaveBeenCalledWith(
      'https://svaply.com/dashboard/messages?conversationId=17',
    );
    expect(focusedClient.focus).toHaveBeenCalledTimes(1);
    expect(openWindow).not.toHaveBeenCalled();
  });

  it('opens a new window when there is no existing client to focus', async () => {
    const { handlers, matchAll, openWindow } = loadServiceWorker();
    matchAll.mockResolvedValue([]);

    const clickEvent = createWaitUntilEvent({
      action: 'open',
      notification: {
        close: jest.fn(),
        data: {
          type: 'message_push',
          conversationId: 9,
          url: '/dashboard/messages?conversationId=9',
          tag: 'messages-conversation-9',
        },
      },
    });

    handlers.notificationclick(clickEvent);
    await Promise.all(clickEvent.pending);

    expect(openWindow).toHaveBeenCalledWith(
      'https://svaply.com/dashboard/messages?conversationId=9',
    );
  });
});
