import { cleanupDevelopmentServiceWorkers } from '../ServiceWorker';

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
