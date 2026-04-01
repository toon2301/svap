const CACHE_VERSION = 'v7';
const CACHE_NAME = `svaply-cache-${CACHE_VERSION}`;
const STATIC_CACHE = `svaply-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `svaply-dynamic-${CACHE_VERSION}`;

const DEFAULT_NOTIFICATION_ICON = '/favicon.png';
const DEFAULT_MESSAGES_URL = '/dashboard/messages';
const DEFAULT_NOTIFICATION_TITLE = 'Spravy';
const DEFAULT_NOTIFICATION_BODY = 'Mas novu spravu.';
const MAX_TITLE_LENGTH = 120;
const MAX_BODY_LENGTH = 240;
const MAX_TAG_LENGTH = 120;

const urlsToCache = ['/', '/manifest.json', '/favicon.png', '/icon.svg'];

function normalizeText(value, fallback, maxLength) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }

  return trimmed.slice(0, maxLength);
}

function normalizePositiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function buildMessagesUrl(conversationId) {
  return conversationId
    ? `${DEFAULT_MESSAGES_URL}?conversationId=${conversationId}`
    : DEFAULT_MESSAGES_URL;
}

function sanitizeInternalUrl(rawUrl, conversationId) {
  const fallbackUrl = buildMessagesUrl(conversationId);
  if (typeof rawUrl !== 'string') {
    return fallbackUrl;
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return fallbackUrl;
  }

  try {
    const parsed = new URL(trimmed, self.location.origin);
    if (parsed.origin !== self.location.origin) {
      return fallbackUrl;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallbackUrl;
  }
}

function extractPushPayloadSource(rawPayload) {
  if (!rawPayload || typeof rawPayload !== 'object') {
    return {};
  }

  if (rawPayload.data && typeof rawPayload.data === 'object') {
    return {
      ...rawPayload.data,
      type: rawPayload.type ?? rawPayload.data.type,
      conversationId:
        rawPayload.conversationId ??
        rawPayload.conversation_id ??
        rawPayload.data.conversationId ??
        rawPayload.data.conversation_id,
      url: rawPayload.url ?? rawPayload.data.url,
      title: rawPayload.title ?? rawPayload.data.title,
      body: rawPayload.body ?? rawPayload.data.body,
      tag: rawPayload.tag ?? rawPayload.data.tag,
    };
  }

  return rawPayload;
}

function buildNotificationTag(rawTag, conversationId) {
  if (typeof rawTag === 'string' && rawTag.trim()) {
    return rawTag.trim().slice(0, MAX_TAG_LENGTH);
  }

  return conversationId ? `messages-conversation-${conversationId}` : 'messages';
}

function normalizePushPayload(rawPayload) {
  const payload = extractPushPayloadSource(rawPayload);
  const conversationId = normalizePositiveInteger(payload.conversationId);
  const url = sanitizeInternalUrl(payload.url, conversationId);

  return {
    type:
      typeof payload.type === 'string' && payload.type.trim()
        ? payload.type.trim().slice(0, 48)
        : 'message_push',
    conversationId,
    url,
    title: normalizeText(
      payload.title,
      DEFAULT_NOTIFICATION_TITLE,
      MAX_TITLE_LENGTH,
    ),
    body: normalizeText(payload.body, DEFAULT_NOTIFICATION_BODY, MAX_BODY_LENGTH),
    tag: buildNotificationTag(payload.tag, conversationId),
  };
}

function parsePushEventPayload(event) {
  if (!event.data) {
    return normalizePushPayload(null);
  }

  try {
    return normalizePushPayload(event.data.json());
  } catch {
    return normalizePushPayload(null);
  }
}

function buildNotificationOptions(payload) {
  return {
    body: payload.body,
    icon: DEFAULT_NOTIFICATION_ICON,
    badge: DEFAULT_NOTIFICATION_ICON,
    tag: payload.tag,
    renotify: true,
    vibrate: [200, 100, 200],
    data: {
      type: payload.type,
      conversationId: payload.conversationId,
      url: payload.url,
      tag: payload.tag,
    },
    actions: [
      {
        action: 'open',
        title: 'Otvorit',
        icon: DEFAULT_NOTIFICATION_ICON,
      },
      {
        action: 'close',
        title: 'Zavriet',
        icon: DEFAULT_NOTIFICATION_ICON,
      },
    ],
  };
}

async function focusOrOpenClient(targetUrl) {
  const absoluteUrl = new URL(targetUrl, self.location.origin).href;
  const windowClients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });

  const sameOriginClients = windowClients.filter((client) => {
    try {
      return new URL(client.url).origin === self.location.origin;
    } catch {
      return false;
    }
  });

  const exactClient = sameOriginClients.find((client) => {
    try {
      return new URL(client.url).href === absoluteUrl;
    } catch {
      return false;
    }
  });

  if (exactClient && typeof exactClient.focus === 'function') {
    return exactClient.focus();
  }

  const navigableClient = sameOriginClients.find(
    (client) => typeof client.navigate === 'function',
  );

  if (navigableClient) {
    const navigatedClient = await navigableClient.navigate(absoluteUrl);
    if (navigatedClient && typeof navigatedClient.focus === 'function') {
      return navigatedClient.focus();
    }
    if (typeof navigableClient.focus === 'function') {
      return navigableClient.focus();
    }
    return navigatedClient;
  }

  return self.clients.openWindow(absoluteUrl);
}

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      Promise.allSettled(
        urlsToCache.map((url) =>
          cache.add(url).catch((error) => {
            console.warn('Service Worker: Failed to cache', url, error);
            return null;
          }),
        ),
      ),
    ),
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((cacheName) => {
            if (
              !cacheName.startsWith('svaply-') ||
              (cacheName !== STATIC_CACHE &&
                cacheName !== DYNAMIC_CACHE &&
                cacheName !== CACHE_NAME)
            ) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
            return null;
          }),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/oauth/')) {
    event.respondWith(fetch(request));
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  const isHTML =
    request.destination === 'document' ||
    request.headers.get('accept')?.includes('text/html');
  const isNextJS =
    url.origin === location.origin && url.pathname.startsWith('/_next/');
  if (isHTML || isNextJS) {
    event.respondWith(fetch(request));
    return;
  }

  if (
    url.origin.includes('google.com') ||
    url.origin.includes('gstatic.com') ||
    url.origin.includes('recaptcha.net') ||
    url.origin.includes('ipapi.co')
  ) {
    event.respondWith(fetch(request));
    return;
  }

  if (url.origin.includes('s3.') && url.origin.includes('amazonaws.com')) {
    return;
  }

  if (request.method !== 'GET') {
    return;
  }

  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(request).then((response) => {
        if (response) {
          return response;
        }

        return fetch(request)
          .then((fetchResponse) => {
            if (
              !fetchResponse ||
              fetchResponse.status !== 200 ||
              fetchResponse.type !== 'basic'
            ) {
              return fetchResponse;
            }

            const responseToCache = fetchResponse.clone();

            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });

            return fetchResponse;
          })
          .catch(() =>
            caches
              .match(request)
              .then(
                (cachedResponse) =>
                  cachedResponse || new Response('Offline', { status: 503 }),
              ),
          );
      }),
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (
          response.status >= 200 &&
          response.status < 300 &&
          response.status !== 401 &&
          response.status !== 403
        ) {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseClone).catch((error) => {
              console.warn('Service Worker: Failed to cache response', error);
            });
          });
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return new Response('Offline', { status: 503 });
        }),
      ),
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Service Worker: Background sync');
    event.waitUntil(Promise.resolve());
  }
});

self.addEventListener('push', (event) => {
  const payload = parsePushEventPayload(event);
  const options = buildNotificationOptions(payload);

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const payload = normalizePushPayload(event.notification.data || null);
  event.waitUntil(focusOrOpenClient(payload.url));
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('Service Worker: Loaded successfully');
