'use client';

import { useEffect } from 'react';

export default function ServiceWorker() {
  useEffect(() => {
    // In development, optionally disable Service Worker to avoid cache issues
    // Uncomment the line below if you want to disable SW in development
    // if (process.env.NODE_ENV === 'development') return;
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
        .then(registration => {
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
                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                    // Auto-reload after a short delay
                    setTimeout(() => {
                      window.location.reload();
                    }, 100);
                  } else {
                    console.log('New Service Worker version available');
                    if (confirm('Nová verzia aplikácie je dostupná. Chceš ju načítať?')) {
                      newWorker.postMessage({ type: 'SKIP_WAITING' });
                      window.location.reload();
                    }
                  }
                }
              });
            }
          });

          // Handle controller change
          navigator.serviceWorker.addEventListener('controllerchange', () => {
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
