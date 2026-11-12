import { act, renderHook, waitFor } from '@testing-library/react';

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
 * Voľba Správy pri vypnutom internete (nález 319): zapnutie ani vypnutie nič neodošle a hodnotu nezmení, chyba je
 * preložená a ukáže sa hneď. Zapnutie navyše nevyžiada povolenie prehliadača ani nezaregistruje odber, lebo by sa voľba
 * aj tak nedala uložiť (používateľ by dostal výzvu na povolenie zbytočne).
 */
const OFFLINE_TEXT = 'Bez pripojenia na internet sa nastavenie nedá zmeniť.';

/** Nastaví prehliadač s podporou push, daným povolením a voliteľným existujúcim odberom tohto prehliadača. */
function setupBrowser(permission: NotificationPermission, subscription: unknown = null) {
  const requestPermission = jest.fn().mockResolvedValue('granted');
  const notification = { permission, requestPermission };
  const registration = {
    pushManager: {
      getSubscription: jest.fn().mockResolvedValue(subscription),
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
  return { requestPermission, registration };
}

/** Odber tohto prehliadača s úplnými údajmi, aké čaká registrácia na serveri. */
function makeSubscription() {
  return {
    endpoint: 'https://push.example.test/sub/1',
    unsubscribe: jest.fn().mockResolvedValue(true),
    toJSON: () => ({ endpoint: 'https://push.example.test/sub/1', keys: { p256dh: 'p', auth: 'a' } }),
  };
}

/** Odpoveď servera so zadanou uloženou voľbou Správ. */
function loadPreferences(push: boolean) {
  jest.mocked(api.get).mockResolvedValue({ data: { in_app_notifications: true, push_notifications: push } });
}

async function renderLoaded() {
  const view = renderHook(() => usePushMessagesPreference());
  await waitFor(() => expect(view.result.current.initialLoading).toBe(false));
  return view;
}

describe('usePushMessagesPreference pri vypnutom internete (nález 319)', () => {
  let onLine: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    onLine = jest.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('zapnutie: nevyžiada povolenie, nič neodošle, hodnota ostane „Vypnuté“ a chyba je preložená', async () => {
    const { requestPermission } = setupBrowser('default');
    loadPreferences(false);
    const { result } = await renderLoaded();
    onLine.mockReturnValue(false);

    await act(async () => {
      result.current.onChange(true);
    });

    expect(requestPermission).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(result.current.value).toBe(false);
    expect(result.current.error).toBe(OFFLINE_TEXT);
    // Voľba sa nezasekne: po chybe sa dá hneď skúsiť znova.
    expect(result.current.disabled).toBe(false);
  });

  it('vypnutie: nič neodošle ani neodhlási odber, hodnota ostane „Zapnuté“ a chyba je preložená', async () => {
    const subscription = makeSubscription();
    setupBrowser('granted', subscription);
    loadPreferences(true);
    const { result } = await renderLoaded();
    onLine.mockReturnValue(false);

    await act(async () => {
      result.current.onChange(false);
    });

    expect(api.patch).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
    expect(subscription.unsubscribe).not.toHaveBeenCalled();
    expect(result.current.value).toBe(true);
    expect(result.current.error).toBe(OFFLINE_TEXT);
    expect(result.current.disabled).toBe(false);
  });

  it('po obnovení pripojenia sa zapnutie vykoná normálne a chyba zmizne', async () => {
    const { requestPermission } = setupBrowser('default', makeSubscription());
    loadPreferences(false);
    jest.mocked(api.post).mockResolvedValue({ data: {} });
    jest.mocked(api.patch).mockResolvedValue({ data: { in_app_notifications: true, push_notifications: true } });
    const { result } = await renderLoaded();
    onLine.mockReturnValue(false);
    await act(async () => {
      result.current.onChange(true);
    });
    expect(result.current.error).toBe(OFFLINE_TEXT);

    onLine.mockReturnValue(true);
    await act(async () => {
      result.current.onChange(true);
    });

    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(api.patch).toHaveBeenCalledTimes(1);
    expect(result.current.value).toBe(true);
    expect(result.current.error).toBeNull();
  });
});
