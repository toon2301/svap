import {
  NEW_VERSION_LOG_TEXT,
  SERVICE_WORKER_UPDATE_INTERVAL_MS,
  cleanupDevelopmentServiceWorkers,
  registerServiceWorker,
} from '../ServiceWorker';

describe('cleanupDevelopmentServiceWorkers', () => {
  it('unregisters old workers, clears swaply caches and reloads once', async () => {
    const unregister = jest.fn().mockResolvedValue(true);
    const getRegistrations = jest.fn().mockResolvedValue([{ unregister }]);
    const deleteCache = jest.fn().mockResolvedValue(true);
    const cacheKeys = jest
      .fn()
      .mockResolvedValue(['svaply-static-v5', 'svaply-dynamic-v5', 'other-cache']);
    const sessionStorage = {
      getItem: jest.fn().mockReturnValue(null),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    };
    const reload = jest.fn();

    await cleanupDevelopmentServiceWorkers({
      serviceWorker: {
        getRegistrations,
        controller: {} as ServiceWorker,
      },
      cacheStorage: {
        keys: cacheKeys,
        delete: deleteCache,
      },
      sessionStorage,
      reload,
      logger: jest.fn(),
    });

    expect(getRegistrations).toHaveBeenCalledTimes(1);
    expect(unregister).toHaveBeenCalledTimes(1);
    expect(deleteCache).toHaveBeenCalledTimes(2);
    expect(deleteCache).toHaveBeenCalledWith('svaply-static-v5');
    expect(deleteCache).toHaveBeenCalledWith('svaply-dynamic-v5');
    expect(sessionStorage.setItem).toHaveBeenCalledWith('svaply-dev-sw-reset', '1');
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('clears the one-shot flag once there is nothing left to clean up', async () => {
    const sessionStorage = {
      getItem: jest.fn().mockReturnValue('1'),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    };

    await cleanupDevelopmentServiceWorkers({
      serviceWorker: {
        getRegistrations: jest.fn().mockResolvedValue([]),
        controller: null,
      },
      cacheStorage: {
        keys: jest.fn().mockResolvedValue([]),
        delete: jest.fn(),
      },
      sessionStorage,
      reload: jest.fn(),
      logger: jest.fn(),
    });

    expect(sessionStorage.removeItem).toHaveBeenCalledWith('svaply-dev-sw-reset');
    expect(sessionStorage.setItem).not.toHaveBeenCalled();
  });
});

/** Zaregistrovaný worker, ktorému test riadi `update()` a udalosti `updatefound` / `statechange`. */
function fakeRegistration(update: jest.Mock = jest.fn().mockResolvedValue(undefined)) {
  const listeners: Record<string, () => void> = {};
  const registration = {
    update,
    installing: null as null | { state: string; addEventListener: jest.Mock },
    addEventListener: jest.fn((name: string, listener: () => void) => {
      listeners[name] = listener;
    }),
  };
  return { registration, listeners };
}

/** Kontajner service workerov s riadeným `register` (a prípadným `controller` = návštevník už worker má). */
function fakeContainer(registration: unknown, { controlled = true } = {}) {
  return {
    register: jest.fn().mockResolvedValue(registration),
    controller: controlled ? ({} as ServiceWorker) : null,
  };
}

/** Počká na dokončenie `register(...).then(...)`. */
const flush = () => Promise.resolve().then(() => Promise.resolve());

describe('registerServiceWorker', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('registers /sw.js without the HTTP cache so a new version is not hidden by it', async () => {
    const { registration } = fakeRegistration();
    const container = fakeContainer(registration);

    registerServiceWorker({ serviceWorker: container, logger: jest.fn() });
    await flush();

    expect(container.register).toHaveBeenCalledWith('/sw.js', { updateViaCache: 'none' });
  });

  it('looks for a new version right after registering when the visitor already has a worker', async () => {
    const { registration } = fakeRegistration();

    registerServiceWorker({ serviceWorker: fakeContainer(registration), logger: jest.fn() });
    await flush();

    // Nie až po prvom intervale: po nasadení by zariadenie bežalo so starým workerom ďalších 10 minút.
    expect(registration.update).toHaveBeenCalledTimes(1);
  });

  it('does not look for an update on the very first visit (nothing to update yet)', async () => {
    const { registration } = fakeRegistration();

    registerServiceWorker({
      serviceWorker: fakeContainer(registration, { controlled: false }),
      logger: jest.fn(),
    });
    await flush();

    expect(registration.update).not.toHaveBeenCalled();
  });

  it('keeps looking for a new version every 10 minutes', async () => {
    expect(SERVICE_WORKER_UPDATE_INTERVAL_MS).toBe(10 * 60 * 1000);
    const { registration } = fakeRegistration();
    registerServiceWorker({ serviceWorker: fakeContainer(registration), logger: jest.fn() });
    await flush();

    jest.advanceTimersByTime(SERVICE_WORKER_UPDATE_INTERVAL_MS - 1);
    expect(registration.update).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(1);
    expect(registration.update).toHaveBeenCalledTimes(2);
    jest.advanceTimersByTime(SERVICE_WORKER_UPDATE_INTERVAL_MS);
    expect(registration.update).toHaveBeenCalledTimes(3);
  });

  it('the first visit is also checked from the first interval on', async () => {
    const { registration } = fakeRegistration();
    registerServiceWorker({
      serviceWorker: fakeContainer(registration, { controlled: false }),
      logger: jest.fn(),
    });
    await flush();

    jest.advanceTimersByTime(SERVICE_WORKER_UPDATE_INTERVAL_MS);

    expect(registration.update).toHaveBeenCalledTimes(1);
  });

  it('a failing update check is handled (not left as an unhandled rejection) and the later ones still run', async () => {
    const failing = Promise.reject(new Error('Failed to update a ServiceWorker'));
    const handled = jest.spyOn(failing, 'catch');
    const update = jest.fn().mockReturnValueOnce(failing).mockResolvedValue(undefined);
    const { registration } = fakeRegistration(update);

    registerServiceWorker({ serviceWorker: fakeContainer(registration), logger: jest.fn() });
    await flush();
    expect(handled).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(SERVICE_WORKER_UPDATE_INTERVAL_MS);
    expect(update).toHaveBeenCalledTimes(2);
  });

  it('stops checking after cleanup', async () => {
    const { registration } = fakeRegistration();
    const cleanup = registerServiceWorker({
      serviceWorker: fakeContainer(registration),
      logger: jest.fn(),
    });
    await flush();

    cleanup();
    jest.advanceTimersByTime(SERVICE_WORKER_UPDATE_INTERVAL_MS * 3);

    expect(registration.update).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('leaves no timer behind when the cleanup runs before the registration finishes', async () => {
    const { registration } = fakeRegistration();
    const cleanup = registerServiceWorker({
      serviceWorker: fakeContainer(registration),
      logger: jest.fn(),
    });

    cleanup();
    await flush();
    jest.advanceTimersByTime(SERVICE_WORKER_UPDATE_INTERVAL_MS * 3);

    expect(registration.update).not.toHaveBeenCalled();
    expect(registration.addEventListener).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('says the new version is active, not that it waits for a reload', async () => {
    const logger = jest.fn();
    const { registration, listeners } = fakeRegistration();
    registerServiceWorker({ serviceWorker: fakeContainer(registration), logger });
    await flush();

    const stateChange: { current: () => void } = { current: () => undefined };
    const worker = {
      state: 'installing',
      addEventListener: jest.fn((_name: string, listener: () => void) => {
        stateChange.current = listener;
      }),
    };
    registration.installing = worker;
    listeners.updatefound();
    worker.state = 'installed';
    stateChange.current();

    expect(logger).toHaveBeenCalledWith(NEW_VERSION_LOG_TEXT);
    expect(NEW_VERSION_LOG_TEXT).not.toMatch(/next reload|will activate/i);
    expect(NEW_VERSION_LOG_TEXT).toMatch(/active/);
  });

  it('does not announce a new version for the very first install', async () => {
    const logger = jest.fn();
    const { registration, listeners } = fakeRegistration();
    registerServiceWorker({
      serviceWorker: fakeContainer(registration, { controlled: false }),
      logger,
    });
    await flush();

    const stateChange: { current: () => void } = { current: () => undefined };
    const worker = {
      state: 'installed',
      addEventListener: jest.fn((_name: string, listener: () => void) => {
        stateChange.current = listener;
      }),
    };
    registration.installing = worker;
    listeners.updatefound();
    stateChange.current();

    expect(logger).not.toHaveBeenCalledWith(NEW_VERSION_LOG_TEXT);
  });

  it('ignores updatefound when there is no installing worker', async () => {
    const { registration, listeners } = fakeRegistration();
    registerServiceWorker({ serviceWorker: fakeContainer(registration), logger: jest.fn() });
    await flush();

    expect(() => listeners.updatefound()).not.toThrow();
  });

  it('logs a failed registration and does not set up checks', async () => {
    const logger = jest.fn();
    const failure = new Error('SecurityError');
    const container = { register: jest.fn().mockRejectedValue(failure), controller: null };

    registerServiceWorker({ serviceWorker: container, logger });
    await flush();

    expect(logger).toHaveBeenCalledWith('Service Worker registration failed:', failure);
    expect(jest.getTimerCount()).toBe(0);
  });
});
