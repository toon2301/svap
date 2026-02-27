'use client';

import { useEffect } from 'react';

export default function ServiceWorker() {
  useEffect(() => {
    // In development, optionally disable Service Worker to avoid cache issues
    // Uncomment the line below if you want to disable SW in development
    // if (process.env.NODE_ENV === 'development') return;
    
    if ('serviceWorker' in navigator) {
      const UPDATE_PENDING_KEY = 'sw:update:pending';
      const UPDATE_RELOADED_KEY = 'sw:update:reloaded';

      const markUpdatePending = () => {
        try {
          sessionStorage.setItem(UPDATE_PENDING_KEY, '1');
        } catch {
          // ignore
        }
      };

      const shouldReloadForUpdate = (): boolean => {
        try {
          const pending = sessionStorage.getItem(UPDATE_PENDING_KEY) === '1';
          const alreadyReloaded = sessionStorage.getItem(UPDATE_RELOADED_KEY) === '1';
          return pending && !alreadyReloaded;
        } catch {
          // If storage is blocked, fail safe: don't auto-reload on controllerchange.
          return false;
        }
      };

      const markReloaded = () => {
        try {
          sessionStorage.setItem(UPDATE_RELOADED_KEY, '1');
          sessionStorage.removeItem(UPDATE_PENDING_KEY);
        } catch {
          // ignore
        }
      };

      navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
        .then((registration) => {
          console.log('Service Worker registered:', registration);
          
          // Check for updates periodically (every 60 seconds)
          setInterval(() => {
            registration.update();
          }, 60000);
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New version available - auto-update in development, ask in production
                  if (process.env.NODE_ENV === 'development') {
                    console.log('New Service Worker version available - auto-updating');
                    markUpdatePending();
                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                  } else {
                    console.log('New Service Worker version available');
                    if (confirm('Nová verzia aplikácie je dostupná. Chceš ju načítať?')) {
                      markUpdatePending();
                      newWorker.postMessage({ type: 'SKIP_WAITING' });
                    }
                  }
                }
              });
            }
          });

          // Handle controller change
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            // Prevent infinite reload loops:
            // Only reload if we explicitly initiated an update (pending flag), and only once per session.
            if (!shouldReloadForUpdate()) return;
            markReloaded();
            window.location.reload();
          });
        })
        .catch(error => {
          console.log('Service Worker registration failed:', error);
        });
    }
  }, []);

  return null;
}
