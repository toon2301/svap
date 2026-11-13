import { act, renderHook } from '@testing-library/react';

import { api } from '@/lib/api';

import { usePushMessagesPreference } from '../usePushMessagesPreference';

jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
  endpoints: {
    push: {
      vapidPublicKey: '/auth/push/vapid-public-key/',
      subscriptions: '/auth/push/subscriptions/',
      subscriptionCurrent: '/auth/push/subscriptions/current/',
      preferences: '/auth/push/preferences/',
    },
  },
}));

/**
 * Príznak úvodného načítania uloženej voľby Správ (nález 286): `initialLoading` je `true` už v prvom vykreslení
 * (inak by sa na chvíľu ukázali riadky s nepravdivým „Vypnuté“), skončí s odpoveďou API a nezávisí od kontroly
 * prehliadača, ktorá ho nesmie držať.
 */
type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void; reject: (reason: unknown) => void };

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function setupBrowser(permission: NotificationPermission, subscription?: Deferred<unknown>) {
  const notification = { permission, requestPermission: jest.fn() };
  const registration = {
    pushManager: {
      getSubscription: jest.fn(() => (subscription ? subscription.promise : Promise.resolve(null))),
      subscribe: jest.fn(),
    },
  };
  Object.defineProperty(window, 'Notification', { configurable: true, writable: true, value: notification });
  Object.defineProperty(globalThis, 'Notification', { configurable: true, writable: true, value: notification });
  Object.defineProperty(window, 'PushManager', { configurable: true, writable: true, value: function PushManager() {} });
  Object.defineProperty(globalThis, 'PushManager', { configurable: true, writable: true, value: function PushManager() {} });
  Object.defineProperty(window, 'isSecureContext', { configurable: true, writable: true, value: true });
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    writable: true,
    value: { register: jest.fn().mockResolvedValue(registration) },
  });
}

function deferPreferences() {
  const pending = deferred<{ data: { in_app_notifications: boolean; push_notifications: boolean } }>();
  jest.mocked(api.get).mockImplementation(async () => pending.promise);
  return {
    respond: (push: boolean) =>
      act(async () => {
        pending.resolve({ data: { in_app_notifications: true, push_notifications: push } });
      }),
    fail: () =>
      act(async () => {
        pending.reject(new Error('network'));
      }),
  };
}

/** Vykreslí hook a zaznamená `initialLoading` a `loading` z každého vykreslenia, nielen výsledné. */
function renderPushHook() {
  const seen: Array<{ initialLoading: boolean; loading: boolean }> = [];
  const view = renderHook(() => {
    const value = usePushMessagesPreference();
    seen.push({ initialLoading: value.initialLoading, loading: value.loading });
    return value;
  });
  return { ...view, seen };
}

describe('usePushMessagesPreference: initialLoading', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('je true už v prvom vykreslení, nie až po spustení efektov', () => {
    setupBrowser('default');
    deferPreferences();

    const { seen } = renderPushHook();

    expect(seen[0].initialLoading).toBe(true);
    expect(seen.every((entry) => entry.initialLoading)).toBe(true);
  });

  it('po odpovedi API je false a už sa nevráti na true', async () => {
    setupBrowser('default');
    const preferences = deferPreferences();
    const { result, seen } = renderPushHook();

    await preferences.respond(true);

    expect(result.current.initialLoading).toBe(false);
    expect(result.current.value).toBe(true);
    const firstLoaded = seen.findIndex((entry) => !entry.initialLoading);
    expect(firstLoaded).toBeGreaterThan(0);
    expect(seen.slice(firstLoaded).every((entry) => !entry.initialLoading)).toBe(true);
  });

  it('kontrola prehliadača ho nedrží: loading ostáva true, initialLoading je po odpovedi API false', async () => {
    setupBrowser('granted', deferred<unknown>());
    const preferences = deferPreferences();
    const { result } = renderPushHook();

    await preferences.respond(false);

    expect(result.current.loading).toBe(true);
    expect(result.current.initialLoading).toBe(false);
  });

  it('pri zlyhaní načítania je initialLoading false a hook hlási chybu', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    setupBrowser('default');
    const preferences = deferPreferences();
    const { result } = renderPushHook();

    await preferences.fail();

    expect(result.current.initialLoading).toBe(false);
    expect(result.current.error).toBe('Nastavenia upozornení sa nepodarilo načítať.');
    consoleError.mockRestore();
  });

  it('loading zostáva true, kým beží úvodné načítanie (nezmenené správanie)', () => {
    setupBrowser('default');
    deferPreferences();

    const { result } = renderPushHook();

    expect(result.current.loading).toBe(true);
    expect(result.current.disabled).toBe(true);
  });
});
