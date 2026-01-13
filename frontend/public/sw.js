// Pokročilý Service Worker pre Svaply
const CACHE_NAME = 'svaply-cache-v3';
const STATIC_CACHE = 'svaply-static-v3';
const DYNAMIC_CACHE = 'svaply-dynamic-v3';

const urlsToCache = [
  '/',
  '/manifest.json',
  '/icon.svg',
  '/_next/static/css/',
  '/_next/static/js/'
];

// Install event
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('Service Worker: Caching static files');
        // Use addAll with error handling - ignore failed requests
        return Promise.allSettled(
          urlsToCache.map(url => 
            cache.add(url).catch(err => {
              console.warn('Service Worker: Failed to cache', url, err);
              return null; // Ignore failed cache requests
            })
          )
        ).then(() => {
          // Force activation of new service worker
          return self.skipWaiting();
        });
      })
  );
});

// Activate event
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            // Delete all old caches (not matching current version)
            if (!cacheName.startsWith('svaply-') || 
                (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE && cacheName !== CACHE_NAME)) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Take control of all clients immediately
        return self.clients.claim();
      })
  );
});

// Fetch event with advanced caching strategies
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Handle different types of requests
  if (url.origin === location.origin) {
    // Same origin requests - Network First strategy for HTML and Next.js files
    const isHTML = request.destination === 'document' || request.headers.get('accept')?.includes('text/html');
    const isNextJS = url.pathname.startsWith('/_next/');
    
    if (isHTML || isNextJS) {
      // Network First strategy - always try network first, fallback to cache
      event.respondWith(
        fetch(request)
          .then(fetchResponse => {
            // Check if response is valid
            if (fetchResponse && fetchResponse.status === 200 && fetchResponse.type === 'basic') {
              // Clone response for caching
              const responseToCache = fetchResponse.clone();
              // Cache for offline use
              caches.open(DYNAMIC_CACHE)
                .then(cache => {
                  cache.put(request, responseToCache);
                });
            }
            return fetchResponse;
          })
          .catch(() => {
            // Network failed, try cache
            return caches.match(request)
              .then(cachedResponse => {
                if (cachedResponse) {
                  return cachedResponse;
                }
                // Offline fallback for HTML
                if (request.destination === 'document') {
                  return caches.match('/');
                }
                return new Response('Offline', { status: 503 });
              });
          })
      );
    } else {
      // Cache First strategy for static assets (images, fonts, etc.)
      event.respondWith(
        caches.match(request)
          .then(response => {
            if (response) {
              return response;
            }
            
            return fetch(request)
              .then(fetchResponse => {
                // Check if response is valid
                if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
                  return fetchResponse;
                }

                // Clone response for caching
                const responseToCache = fetchResponse.clone();

                // Cache dynamic content
                caches.open(DYNAMIC_CACHE)
                  .then(cache => {
                    cache.put(request, responseToCache);
                  });

                return fetchResponse;
              })
              .catch(() => {
                // Offline fallback
                if (request.destination === 'document') {
                  return caches.match('/');
                }
                return new Response('Offline', { status: 503 });
              });
          })
      );
    }
  } else {
    // External requests (APIs, images, etc.)
    event.respondWith(
      fetch(request)
        .then(response => {
          // Only cache successful responses (200-299) and not auth errors
          if (response.status >= 200 && response.status < 300 && response.status !== 401 && response.status !== 403) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE)
              .then(cache => {
                cache.put(request, responseClone).catch(err => {
                  console.warn('Service Worker: Failed to cache response', err);
                });
              });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request)
            .then(cachedResponse => {
              if (cachedResponse) {
                return cachedResponse;
              }
              return new Response('Offline', { status: 503 });
            });
        })
    );
  }
});

// Background sync for offline actions
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    console.log('Service Worker: Background sync');
    event.waitUntil(
      // Handle offline actions here
      Promise.resolve()
    );
  }
});

// Push notifications
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon.svg',
      badge: '/icon.svg',
      vibrate: [200, 100, 200],
      data: data.data,
      actions: [
        {
          action: 'open',
          title: 'Otvoriť',
          icon: '/icon.svg'
        },
        {
          action: 'close',
          title: 'Zavrieť',
          icon: '/icon.svg'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message handler for communication with main thread
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('Service Worker: Loaded successfully');
