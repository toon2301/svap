'use client';

import { useEffect } from 'react';

const DEV_SW_RESET_KEY = 'svaply-dev-sw-reset';
const SWAPLY_CACHE_PREFIXES = ['svaply-'];

type CleanupDeps = {
  serviceWorker: Pick<ServiceWorkerContainer, 'getRegistrations' | 'controller'>;
  cacheStorage?: Pick<CacheStorage, 'keys' | 'delete'>;
  sessionStorage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
  reload: () => void;
  logger?: (...args: unknown[]) => void;
};

export async function cleanupDevelopmentServiceWorkers({
  serviceWorker,
  cacheStorage,
  sessionStorage,
  reload,
  logger = console.warn,
}: CleanupDeps): Promise<void> {
  try {
    const registrations = await serviceWorker.getRegistrations();
    const hadRegistrations = registrations.length > 0;

    const unregisterResults = await Promise.all(
      registrations.map((registration) =>
        registration.unregister().catch(() => false),
      ),
    );
    const hadUnregisterWork = unregisterResults.some(Boolean);

    let hadCacheCleanup = false;
    if (cacheStorage) {
      const cacheNames = await cacheStorage.keys();
      const swaplyCacheNames = cacheNames.filter((cacheName) =>
        SWAPLY_CACHE_PREFIXES.some((prefix) => cacheName.startsWith(prefix)),
      );

      if (swaplyCacheNames.length > 0) {
        const deleteResults = await Promise.all(
          swaplyCacheNames.map((cacheName) =>
            cacheStorage.delete(cacheName).catch(() => false),
          ),
        );
        hadCacheCleanup = deleteResults.some(Boolean);
      }
    }

    const needsReload =
      Boolean(serviceWorker.controller) || hadRegistrations || hadUnregisterWork || hadCacheCleanup;
    const alreadyReloaded = sessionStorage.getItem(DEV_SW_RESET_KEY) === '1';

    if (needsReload && !alreadyReloaded) {
      sessionStorage.setItem(DEV_SW_RESET_KEY, '1');
      reload();
      return;
    }

    sessionStorage.removeItem(DEV_SW_RESET_KEY);
  } catch (error) {
    logger('Development Service Worker cleanup failed:', error);
    sessionStorage.removeItem(DEV_SW_RESET_KEY);
  }
}

export default function ServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // In development, aggressively unregister any previously installed worker.
    // A stale worker can keep serving old chunk references and break Next dev HMR.
    if (process.env.NODE_ENV === 'development') {
      void cleanupDevelopmentServiceWorkers({
        serviceWorker: navigator.serviceWorker,
        cacheStorage: typeof window !== 'undefined' && 'caches' in window ? window.caches : undefined,
        sessionStorage: window.sessionStorage,
        reload: () => window.location.reload(),
      });
      return;
    }

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
