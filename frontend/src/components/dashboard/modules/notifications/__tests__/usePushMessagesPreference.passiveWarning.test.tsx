import { act, renderHook } from '@testing-library/react';

import { api } from '@/lib/api';

import { getPassiveBrowserWarning, usePushMessagesPreference } from '../usePushMessagesPreference';

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
 * Pasívne varovanie pod voľbou Správy (nález 308): odvodzuje sa počas vykresľovania, takže je už v tom istom vykreslení
 * ako riadky voľby. Pred opravou ho nastavoval až efekt, a tak prišlo o snímok neskôr než voľba a posunulo obsah pod ním.
 * Texty varovaní sa nemenia (to je nález 319), preto sa tu porovnávajú tak, ako sú v kóde.
 */
const BLOCKED = 'Push notifikacie su v tomto prehliadaci zablokovane. Povol ich v nastaveniach prehliadaca.';
const UNSUPPORTED = 'Tento prehliadac nepodporuje push notifikacie.';
const NOT_REGISTERED = 'Push notifikacie su zapnute, ale tento prehliadac este nie je zaregistrovany.';
const REGISTRATION_FAILED = 'Nepodarilo sa dokoncit registraciu push notifikacii v tomto prehliadaci.';
const SAVE_FAILED = 'Nepodarilo sa ulozit nastavenia upozorneni.';
const UNREGISTER_FAILED = 'Push upozornenia boli vypnute, ale odhlasenie tohto prehliadaca sa nepodarilo dokoncit.';

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void };

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

type Subscription = { endpoint: string; unsubscribe: jest.Mock; toJSON: () => unknown } | null;

/** Nastaví prehliadač: povolenie, podporu push (`PushManager`) a existujúci odber tohto prehliadača. */
function setupBrowser(
  permission: NotificationPermission,
  { supported = true, subscription = null }: { supported?: boolean; subscription?: Subscription } = {},
) {
  const notification = { permission, requestPermission: jest.fn().mockResolvedValue(permission) };
  const registration = {
    pushManager: {
      getSubscription: jest.fn().mockResolvedValue(subscription),
      subscribe: jest.fn(),
    },
  };
  const pushManager = supported ? function PushManager() {} : undefined;
  Object.defineProperty(window, 'Notification', { configurable: true, writable: true, value: notification });
  Object.defineProperty(globalThis, 'Notification', { configurable: true, writable: true, value: notification });
  Object.defineProperty(window, 'PushManager', { configurable: true, writable: true, value: pushManager });
  Object.defineProperty(globalThis, 'PushManager', { configurable: true, writable: true, value: pushManager });
  Object.defineProperty(window, 'isSecureContext', { configurable: true, writable: true, value: true });
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    writable: true,
    value: { register: jest.fn().mockResolvedValue(registration) },
  });
  return { registration };
}

function makeSubscription(): NonNullable<Subscription> {
  return {
    endpoint: 'https://push.example.test/sub/1',
    unsubscribe: jest.fn().mockResolvedValue(true),
    toJSON: () => ({ endpoint: 'https://push.example.test/sub/1', keys: { p256dh: 'p', auth: 'a' } }),
  };
}

/** Odpoveď API s uloženou voľbou Správ sa dá vyvolať ručne, takže sa dá sledovať vykreslenie tesne pred ňou aj po nej. */
function deferPreferences() {
  const pending = deferred<{ data: { in_app_notifications: boolean; push_notifications: boolean } }>();
  jest.mocked(api.get).mockImplementation(async (url: string) => {
    if (url === '/auth/push/preferences/') return pending.promise;
    return { data: { public_key: '' } };
  });
  return {
    respond: (push: boolean) =>
      act(async () => {
        pending.resolve({ data: { in_app_notifications: true, push_notifications: push } });
      }),
  };
}

type Seen = { initialLoading: boolean; loading: boolean; error: string | null; permission: string };

/** Vykreslí hook a zaznamená návratové hodnoty z každého vykreslenia, nielen výsledné. */
function renderPushHook() {
  const seen: Seen[] = [];
  const view = renderHook(() => {
    const value = usePushMessagesPreference();
    seen.push({
      initialLoading: value.initialLoading,
      loading: value.loading,
      error: value.error,
      permission: value.permission,
    });
    return value;
  });
  return { ...view, seen };
}

describe('usePushMessagesPreference: pasívne varovanie počas vykresľovania (nález 308)', () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(api.patch).mockImplementation(async (_url: string, payload: unknown) => ({
      data: { in_app_notifications: true, push_notifications: (payload as { push_notifications: boolean }).push_notifications },
    }));
    jest.mocked(api.post).mockResolvedValue({ data: {} });
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('zablokované povolenie: varovanie je už v prvom vykreslení po načítaní voľby, nie až po efekte', async () => {
    setupBrowser('denied');
    const preferences = deferPreferences();
    const { seen } = renderPushHook();

    await preferences.respond(true);

    const firstLoaded = seen.findIndex((entry) => !entry.initialLoading);
    expect(firstLoaded).toBeGreaterThan(0);
    expect(seen[firstLoaded].error).toBe(BLOCKED);
    // Nikdy sa nevykreslí hotová voľba bez varovania, ktoré by sa o snímok neskôr pridalo a posunulo obsah.
    expect(seen.filter((entry) => !entry.initialLoading && entry.error === null)).toEqual([]);
  });

  it('nepodporovaný prehliadač (chýba PushManager): varovanie je už v prvom vykreslení po načítaní voľby', async () => {
    setupBrowser('default', { supported: false });
    const preferences = deferPreferences();
    const { seen } = renderPushHook();

    await preferences.respond(true);

    const firstLoaded = seen.findIndex((entry) => !entry.initialLoading);
    expect(seen[firstLoaded].error).toBe(UNSUPPORTED);
    expect(seen.filter((entry) => !entry.initialLoading && entry.error === null)).toEqual([]);
  });

  it('povolené, no tento prehliadač nie je zaregistrovaný: varovanie je vo vykreslení, v ktorom skončí načítavanie', async () => {
    setupBrowser('granted', { subscription: null });
    const preferences = deferPreferences();
    const { seen } = renderPushHook();

    await preferences.respond(true);

    const firstSettled = seen.findIndex((entry) => !entry.loading);
    expect(firstSettled).toBeGreaterThan(0);
    expect(seen[firstSettled].error).toBe(NOT_REGISTERED);
    expect(seen.filter((entry) => !entry.loading && entry.error === null)).toEqual([]);
  });

  it('chyba po akcii má prednosť pred pasívnym varovaním: zlyhaná automatická registrácia prekryje „nie je zaregistrovaný“', async () => {
    setupBrowser('granted', { subscription: null });
    const preferences = deferPreferences();
    const { result } = renderPushHook();

    await preferences.respond(true);

    expect(result.current.error).toBe(REGISTRATION_FAILED);
  });

  it('povolenie sa zistí hneď pri prvom vykreslení na klientovi, nie až v efekte', () => {
    setupBrowser('denied');
    deferPreferences();

    const { seen } = renderPushHook();

    expect(seen[0].permission).toBe('denied');
    expect(seen.every((entry) => entry.permission === 'denied')).toBe(true);
  });

  it('povolenie ešte nebolo vyžiadané (default) a voľba je zapnutá: žiadne varovanie v žiadnom vykreslení', async () => {
    setupBrowser('default');
    const preferences = deferPreferences();
    const { seen } = renderPushHook();

    await preferences.respond(true);

    expect(seen.every((entry) => entry.error === null)).toBe(true);
  });

  it('uložená voľba je vypnutá: žiadne varovanie ani pri zablokovanom povolení', async () => {
    setupBrowser('denied');
    const preferences = deferPreferences();
    const { seen } = renderPushHook();

    await preferences.respond(false);

    expect(seen.every((entry) => entry.error === null)).toBe(true);
  });

  it('povolené a tento prehliadač je zaregistrovaný: žiadne varovanie', async () => {
    setupBrowser('granted', { subscription: makeSubscription() });
    const preferences = deferPreferences();
    const { seen } = renderPushHook();

    await preferences.respond(true);

    expect(seen.every((entry) => entry.error === null)).toBe(true);
  });

  it('chyba uloženia voľby má prednosť pred varovaním; po úspešnom vypnutí varovanie zmizne', async () => {
    setupBrowser('denied');
    const preferences = deferPreferences();
    const { result } = renderPushHook();
    await preferences.respond(true);
    expect(result.current.error).toBe(BLOCKED);

    jest.mocked(api.patch).mockRejectedValueOnce(new Error('offline'));
    await act(async () => {
      result.current.onChange(false);
    });
    expect(result.current.error).toBe(SAVE_FAILED);

    await act(async () => {
      result.current.onChange(false);
    });
    expect(result.current.value).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('zlyhanie odhlásenia po vypnutí ostane ako chyba po akcii, aj keď pasívne varovanie už neplatí', async () => {
    setupBrowser('granted', { subscription: makeSubscription() });
    const preferences = deferPreferences();
    const { result } = renderPushHook();
    await preferences.respond(true);
    expect(result.current.error).toBeNull();

    jest.mocked(api.post).mockRejectedValue(new Error('server'));
    await act(async () => {
      result.current.onChange(false);
    });

    expect(result.current.value).toBe(false);
    expect(result.current.error).toBe(UNREGISTER_FAILED);
  });

  it('počas novej akcie sa chyba z predošlej akcie neukazuje', async () => {
    const { registration } = setupBrowser('granted', { subscription: makeSubscription() });
    const preferences = deferPreferences();
    const { result } = renderPushHook();
    await preferences.respond(true);
    jest.mocked(api.post).mockRejectedValue(new Error('server'));
    await act(async () => {
      result.current.onChange(false);
    });
    expect(result.current.error).toBe(UNREGISTER_FAILED);

    // Nové zapnutie: kontrola odberu visí, takže akcia beží; stará chyba sa počas nej nesmie ukazovať.
    const hang = deferred<Subscription>();
    registration.pushManager.getSubscription.mockReturnValue(hang.promise);
    await act(async () => {
      result.current.onChange(true);
    });
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();

    await act(async () => {
      hang.resolve(makeSubscription());
    });
  });

  it('nová akcia vymaže chybu z predošlej akcie', async () => {
    setupBrowser('denied');
    const preferences = deferPreferences();
    const { result } = renderPushHook();
    await preferences.respond(false);

    await act(async () => {
      result.current.onChange(true);
    });
    expect(result.current.error).toBe(BLOCKED);

    await act(async () => {
      result.current.onChange(false);
    });
    expect(result.current.error).toBeNull();
  });
});

describe('getPassiveBrowserWarning', () => {
  const supported = { supported: true, reason: null } as const;

  it.each([
    ['voľba vypnutá', { pushEnabled: false, supportState: supported, permission: 'denied', subscriptionStatus: 'missing' }, null],
    [
      'chýba API prehliadača',
      { pushEnabled: true, supportState: { supported: false, reason: 'missing_api' }, permission: 'unsupported', subscriptionStatus: 'missing' },
      UNSUPPORTED,
    ],
    [
      'nezabezpečený kontext',
      { pushEnabled: true, supportState: { supported: false, reason: 'insecure_context' }, permission: 'unsupported', subscriptionStatus: 'missing' },
      'Push notifikacie su dostupne iba v zabezpecenom prehliadaci.',
    ],
    ['zablokované povolenie', { pushEnabled: true, supportState: supported, permission: 'denied', subscriptionStatus: 'missing' }, BLOCKED],
    ['povolenie nevyžiadané', { pushEnabled: true, supportState: supported, permission: 'default', subscriptionStatus: 'missing' }, null],
    ['povolené, odber chýba', { pushEnabled: true, supportState: supported, permission: 'granted', subscriptionStatus: 'missing' }, NOT_REGISTERED],
    ['povolené, odber sa kontroluje', { pushEnabled: true, supportState: supported, permission: 'granted', subscriptionStatus: 'checking' }, null],
    ['povolené, odber existuje', { pushEnabled: true, supportState: supported, permission: 'granted', subscriptionStatus: 'subscribed' }, null],
  ] as const)('%s', (_name, input, expected) => {
    expect(getPassiveBrowserWarning(input as Parameters<typeof getPassiveBrowserWarning>[0])).toBe(expected);
  });
});
