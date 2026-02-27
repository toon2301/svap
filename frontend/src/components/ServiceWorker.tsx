'use client';

import { useEffect } from 'react';

export default function ServiceWorker() {
  useEffect(() => {
    // In development, optionally disable Service Worker to avoid cache issues
    // Uncomment the line below if you want to disable SW in development
    // if (process.env.NODE_ENV === 'development') return;
    
    if (!('serviceWorker' in navigator)) return;

    let intervalId: number | null = null;
    const onUpdateFound = (registration: ServiceWorkerRegistration) => () => {
      const newWorker = registration.installing;
      if (!newWorker) return;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New version is available. Do NOT auto-swap controller or reload the page.
          // This prevents infinite reload loops and stale Next.js asset mismatches.
          console.log(
            'New Service Worker version available (will activate on next reload).'
          );
        }
      });
    };

    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((registration) => {
        console.log('Service Worker registered:', registration);

        // Check for updates periodically without forcing reloads (prevents auth/navigation loops).
        intervalId = window.setInterval(() => {
          void registration.update();
        }, 10 * 60 * 1000); // every 10 minutes

        registration.addEventListener('updatefound', onUpdateFound(registration));
      })
      .catch((error) => {
        console.log('Service Worker registration failed:', error);
      });

    return () => {
      try {
        if (intervalId != null) window.clearInterval(intervalId);
      } catch {
        // ignore
      }
    };
  }, []);

  return null;
}
