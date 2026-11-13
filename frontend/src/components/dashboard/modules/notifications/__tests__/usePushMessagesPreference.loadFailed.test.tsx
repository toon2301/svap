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
 * Voľba Správy po zlyhaní načítania uložených volieb (PR 258, CodeRabbit): hodnota je neznáma (`null`), nie predvolené
 * „Vypnuté“, a voľba je zakázaná. Pri úspešnom načítaní je hodnota pravdivostná a voľba sa dá meniť.
 */
function setupBrowser() {
  const notification = { permission: 'default', requestPermission: jest.fn() };
  Object.defineProperty(window, 'Notification', { configurable: true, writable: true, value: notification });
  Object.defineProperty(globalThis, 'Notification', { configurable: true, writable: true, value: notification });
  Object.defineProperty(window, 'PushManager', { configurable: true, writable: true, value: function PushManager() {} });
  Object.defineProperty(globalThis, 'PushManager', { configurable: true, writable: true, value: function PushManager() {} });
  Object.defineProperty(window, 'isSecureContext', { configurable: true, writable: true, value: true });
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    writable: true,
    value: { register: jest.fn().mockResolvedValue({ pushManager: { getSubscription: jest.fn(), subscribe: jest.fn() } }) },
  });
}

/** Počká na dokončenie úvodného načítania (úspešného alebo zlyhaného). */
async function renderLoaded() {
  const view = renderHook(() => usePushMessagesPreference());
  await act(async () => undefined);
  return view;
}

describe('usePushMessagesPreference: hodnota po zlyhaní načítania', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    setupBrowser();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('po zlyhaní načítania je hodnota neznáma (null), voľba je zakázaná a ukáže sa preložená chyba', async () => {
    jest.mocked(api.get).mockRejectedValue({ isAxiosError: true, message: 'Network Error' });

    const { result } = await renderLoaded();

    expect(result.current.initialLoading).toBe(false);
    expect(result.current.value).toBeNull();
    expect(result.current.disabled).toBe(true);
    expect(result.current.error).toBe('Nastavenia upozornení sa nepodarilo načítať.');
  });

  it.each([true, false])('po úspešnom načítaní s uloženou hodnotou %s je hodnota pravdivostná a voľba aktívna', async (push) => {
    jest.mocked(api.get).mockResolvedValue({ data: { in_app_notifications: true, push_notifications: push } });

    const { result } = await renderLoaded();

    expect(result.current.value).toBe(push);
    expect(result.current.disabled).toBe(false);
  });
});
