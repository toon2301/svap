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

function createFetchRequest(
  url: string,
  headers: Record<string, string> = {},
  overrides: Record<string, unknown> = {},
) {
  return {
    url,
    method: 'GET',
    destination: '',
    headers: {
      get: jest.fn((name: string) => headers[name.toLowerCase()] ?? null),
    },
    ...overrides,
  };
}

async function dispatchFetch(
  handlers: RegisteredHandlers,
  request: ReturnType<typeof createFetchRequest>,
) {
  const responsePromises: Promise<unknown>[] = [];
  const fetchEvent = {
    request,
    respondWith: jest.fn((response: Promise<unknown>) => {
      responsePromises.push(Promise.resolve(response));
    }),
  };

  handlers.fetch(fetchEvent);
  const responses = await Promise.all(responsePromises);

  return { fetchEvent, responses };
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
      add: jest.fn().mockResolvedValue(undefined),
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

describe('service worker Next.js RSC flow', () => {
  // Odpoveď RSC nesie id buildu, z ktorého prišla. Cache-first ju po nasadení
  // novej verzie vracia ešte raz, Next ju kvôli inému buildu odmietne
  // a klientska navigácia sa zmení na tvrdé načítanie stránky.
  it.each([
    [
      'carries the RSC header',
      'https://svaply.com/dashboard/users/peter',
      { rsc: '1' },
    ],
    [
      'carries the _rsc query parameter',
      'https://svaply.com/dashboard/users/peter?_rsc=1abcd',
      {},
    ],
    [
      'is a router prefetch',
      'https://svaply.com/dashboard/users/peter/portfolio?tab=portfolio&_rsc=9xz',
      { rsc: '1', 'next-router-prefetch': '1' },
    ],
  ])(
    'loads a same-origin request that %s from the network without reading or writing a cache',
    async (_label, url, headers) => {
      const { handlers, fetchMock, cacheStorage } = loadServiceWorker();
      const request = createFetchRequest(url, headers);

      const { fetchEvent } = await dispatchFetch(handlers, request);

      expect(fetchEvent.respondWith).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(request);
      expect(cacheStorage.match).not.toHaveBeenCalled();
      expect(cacheStorage.open).not.toHaveBeenCalled();
    },
  );

  it('does not return a cached RSC response that an earlier build left behind', async () => {
    const { handlers, fetchMock, cacheStorage } = loadServiceWorker();
    const staleResponse = { status: 200, type: 'basic', build: 'old' };
    const freshResponse = { status: 200, type: 'basic', build: 'new' };
    cacheStorage.match.mockResolvedValue(staleResponse);
    fetchMock.mockResolvedValue(freshResponse);

    const { responses } = await dispatchFetch(
      handlers,
      createFetchRequest('https://svaply.com/dashboard/users/peter?_rsc=1abcd', {
        rsc: '1',
      }),
    );

    expect(responses).toEqual([freshResponse]);
  });

  it('does not intercept a non-GET request that carries the RSC header', async () => {
    const { handlers, fetchMock, cacheStorage } = loadServiceWorker();
    const request = createFetchRequest(
      'https://svaply.com/dashboard/users/peter',
      { rsc: '1' },
      { method: 'POST' },
    );

    const { fetchEvent } = await dispatchFetch(handlers, request);

    expect(fetchEvent.respondWith).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(cacheStorage.match).not.toHaveBeenCalled();
  });

  it('keeps the cache flow for other same-origin GET requests with a query string', async () => {
    const { handlers, cacheStorage } = loadServiceWorker();
    const request = createFetchRequest(
      'https://svaply.com/media/offers/photo.webp?v=2',
      { accept: 'image/webp' },
      { destination: 'image' },
    );

    await dispatchFetch(handlers, request);

    expect(cacheStorage.match).toHaveBeenCalledWith(request);
  });

  it('keeps the existing flow for a request to another origin that carries the RSC marker', async () => {
    const { handlers, cacheStorage } = loadServiceWorker();
    const request = createFetchRequest('https://cdn.example.com/dashboard?_rsc=1abcd', {
      rsc: '1',
    });

    await dispatchFetch(handlers, request);

    expect(cacheStorage.open).toHaveBeenCalled();
  });
});

describe('service worker cache versions', () => {
  it('purges the caches of the previous version on activate, where stale RSC responses may sit', async () => {
    const { handlers, cacheStorage } = loadServiceWorker();
    const installEvent = createWaitUntilEvent();
    handlers.install(installEvent);
    await Promise.all(installEvent.pending);
    const currentVersion = String(cacheStorage.open.mock.calls[0][0]).replace(
      'svaply-static-',
      '',
    );

    cacheStorage.keys.mockResolvedValue([
      'svaply-static-v9',
      'svaply-dynamic-v9',
      'svaply-cache-v9',
      `svaply-static-${currentVersion}`,
      `svaply-dynamic-${currentVersion}`,
    ]);
    cacheStorage.delete.mockResolvedValue(true);
    const activateEvent = createWaitUntilEvent();
    handlers.activate(activateEvent);
    await Promise.all(activateEvent.pending);

    expect(currentVersion).not.toBe('v9');
    expect(cacheStorage.delete.mock.calls.map(([name]) => name).sort()).toEqual([
      'svaply-cache-v9',
      'svaply-dynamic-v9',
      'svaply-static-v9',
    ]);
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
