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

/** Ako často sa počas otvorenej stránky kontroluje nová verzia service workera. */
export const SERVICE_WORKER_UPDATE_INTERVAL_MS = 10 * 60 * 1000;

/**
 * Text do konzoly, keď sa nainštaluje nová verzia. `public/sw.js` volá `skipWaiting()` už pri inštalácii,
 * takže sa nová verzia aktivuje hneď a nečaká na obnovenie stránky; obnovenie potrebuje len kód stránky.
 */
export const NEW_VERSION_LOG_TEXT =
  'New Service Worker version installed and active (the open page keeps running its current code until it is reloaded).';

type RegisterDeps = {
  serviceWorker: Pick<ServiceWorkerContainer, 'register' | 'controller'>;
  logger?: (...args: unknown[]) => void;
};

/**
 * Zaregistruje service worker a stará sa o zisťovanie jeho novej verzie; vráti funkciu na upratanie.
 *
 * Nová verzia sa hľadá hneď po registrácii (po nasadení tak zariadenie nebeží so starým workerom až do prvej
 * periodickej kontroly) a potom každých `SERVICE_WORKER_UPDATE_INTERVAL_MS`. Pri prvej návšteve (bez
 * `controller`) nie je čo aktualizovať. Stránka sa pri aktualizácii nikdy sama neobnovuje (cyklické obnovenia,
 * rozdiely medzi súbormi Next.js).
 */
export function registerServiceWorker({
  serviceWorker,
  logger = console.log,
}: RegisterDeps): () => void {
  let intervalId: number | null = null;
  let stopped = false;

  // `update()` môže zlyhať (sieť, worker sa práve inštaluje); neošetrené zamietnutie by skončilo v Sentry
  // ako chyba stránky, a ďalšia kontrola príde tak či tak.
  const checkForUpdate = (registration: ServiceWorkerRegistration) => {
    void Promise.resolve(registration.update()).catch(() => undefined);
  };

  const onUpdateFound = (registration: ServiceWorkerRegistration) => () => {
    const newWorker = registration.installing;
    if (!newWorker) return;
    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && serviceWorker.controller) {
        logger(NEW_VERSION_LOG_TEXT);
      }
    });
  };

  serviceWorker
    .register('/sw.js', { updateViaCache: 'none' })
    .then((registration) => {
      // Stránka medzitým zanikla: nový časovač by už nikto nezastavil.
      if (stopped) return;
      logger('Service Worker registered:', registration);

      if (serviceWorker.controller) checkForUpdate(registration);
      intervalId = window.setInterval(
        () => checkForUpdate(registration),
        SERVICE_WORKER_UPDATE_INTERVAL_MS,
      );

      registration.addEventListener('updatefound', onUpdateFound(registration));
    })
    .catch((error) => {
      logger('Service Worker registration failed:', error);
    });

  return () => {
    stopped = true;
    try {
      if (intervalId != null) window.clearInterval(intervalId);
    } catch {
      // ignore
    }
  };
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

    return registerServiceWorker({ serviceWorker: navigator.serviceWorker });
  }, []);

  return null;
}
