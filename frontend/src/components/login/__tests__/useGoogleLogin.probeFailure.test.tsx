import { act, cleanup, renderHook } from '@testing-library/react';
import { useGoogleLogin } from '../useGoogleLogin';
import { api } from '@/lib/api';
import { getCurrentAccountId, setCurrentAccountId } from '@/lib/currentAccount';
import { fetchCsrfToken } from '@/utils/csrf';
import { SessionVerificationError } from '@/lib/authSessionVerification';

const mockRefreshUser = jest.fn();
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ refreshUser: mockRefreshUser }) }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (key: string) => key }) }));
jest.mock('@/utils/csrf', () => ({ fetchCsrfToken: jest.fn() }));
jest.mock('@/lib/api', () => ({
  api: { get: jest.fn(), defaults: { baseURL: 'https://backend.example.test/api' } },
  endpoints: { auth: { me: '/auth/me/' } },
}));

const mockGet = api.get as jest.Mock;
const mockCsrf = fetchCsrfToken as jest.Mock;
const originalCrypto = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
const originalVisibility = Object.getOwnPropertyDescriptor(document, 'visibilityState');
let nonceSequence = 0;
let onError: jest.Mock;
let closePopup: jest.Mock;
let addWindowListener: jest.SpyInstance;
let removeWindowListener: jest.SpyInstance;
let removeDocumentListener: jest.SpyInstance;

/** Flush timer-driven recovery and its React updates without real network or clock delays. */
async function advance(ms: number) {
  await act(async () => { await jest.advanceTimersByTimeAsync(ms); });
}

/** Deliver a success with explicit origin and nonce so negative cases cannot reuse current storage. */
async function confirm(nonce: string | null, origin = window.location.origin) {
  await act(async () => {
    window.dispatchEvent(new MessageEvent('message', { origin, data: { type: 'OAUTH_SUCCESS', nonce } }));
  });
}

/** Reach a failed recovery probe and retain the original attempt and its message handler for assertions. */
async function failedAttempt() {
  const view = renderHook(() => useGoogleLogin({ onStart: jest.fn(), onError }));
  act(() => view.result.current.handleGoogleLogin());
  const nonce = sessionStorage.getItem('oauth_nonce');
  const messageHandler = addWindowListener.mock.calls.find(([event]) => event === 'message')?.[1];
  expect(nonce).not.toBeNull();
  expect(messageHandler).toEqual(expect.any(Function));
  await advance(1000);
  return { view, nonce, messageHandler };
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  sessionStorage.clear();
  localStorage.clear();
  setCurrentAccountId(null);
  nonceSequence = 0;
  onError = jest.fn();
  closePopup = jest.fn();
  mockGet.mockReset().mockRejectedValue({ response: { status: 500 } });
  mockCsrf.mockReset().mockResolvedValue(undefined);
  mockRefreshUser.mockReset().mockImplementation(async () => { setCurrentAccountId(71); });
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value: { randomUUID: () => `failure-nonce-${++nonceSequence}` } });
  jest.spyOn(window, 'open').mockReturnValue({ closed: true, close: closePopup } as unknown as Window);
  addWindowListener = jest.spyOn(window, 'addEventListener');
  removeWindowListener = jest.spyOn(window, 'removeEventListener');
  removeDocumentListener = jest.spyOn(document, 'removeEventListener');
});

afterEach(() => {
  cleanup();
  expect(jest.getTimerCount()).toBe(0);
  jest.useRealTimers();
  jest.restoreAllMocks();
  setCurrentAccountId(null);
  if (originalCrypto) Object.defineProperty(globalThis, 'crypto', originalCrypto);
  if (originalVisibility) Object.defineProperty(document, 'visibilityState', originalVisibility);
  else delete (document as unknown as Record<string, unknown>).visibilityState;
});

it.each([
  ['network', new Error('Offline'), 'auth.sessionVerificationFailed'],
  ['timeout', { code: 'ECONNABORTED' }, 'auth.sessionVerificationFailed'],
  ['server', { response: { status: 500 } }, 'auth.sessionVerificationFailed'],
  ['limit', { response: { status: 429 } }, 'auth.tooManyRequests'],
  ['missing error detail', null, 'auth.sessionVerificationFailed'],
])('stops recovery after %s but completes exactly once on a later valid confirmation', async (_name, error, key) => {
  mockGet.mockRejectedValue(error);
  const { view, nonce, messageHandler } = await failedAttempt();
  expect(onError).toHaveBeenCalledTimes(1);
  expect(onError).toHaveBeenCalledWith(key);
  expect(view.result.current.isGoogleLoading).toBe(false);
  expect(sessionStorage.getItem('oauth_nonce')).toBe(nonce);
  expect(getCurrentAccountId()).toBeNull();
  expect(removeWindowListener).not.toHaveBeenCalledWith('message', messageHandler);
  expect(removeWindowListener).toHaveBeenCalledWith('focus', expect.any(Function));
  expect(removeDocumentListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
  expect(mockGet.mock.calls[0][1].signal.aborted).toBe(true);
  expect(jest.getTimerCount()).toBe(0);

  await act(async () => {
    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await advance(60_000);
  expect(mockGet).toHaveBeenCalledTimes(1);
  expect(mockRefreshUser).not.toHaveBeenCalled();
  expect(mockPush).not.toHaveBeenCalled();

  await confirm(nonce);
  await confirm(nonce);
  expect(mockGet).toHaveBeenCalledTimes(1);
  expect(mockRefreshUser).toHaveBeenCalledTimes(1);
  expect(mockRefreshUser).toHaveBeenCalledWith({ force: true, verifyLogin: true });
  expect(mockCsrf).toHaveBeenCalledTimes(1);
  expect(mockPush).toHaveBeenCalledTimes(1);
  expect(mockPush).toHaveBeenCalledWith('/dashboard');
  expect(sessionStorage.getItem('oauth_nonce')).toBeNull();
  expect(removeWindowListener).toHaveBeenCalledWith('message', messageHandler);
  expect(onError).toHaveBeenCalledTimes(1);
  expect(view.result.current.isGoogleLoading).toBe(false);
});

it.each(['wrong origin', 'wrong message nonce', 'changed storage nonce', 'missing storage nonce'])('rejects %s even after a probe failure', async scenario => {
  const { nonce } = await failedAttempt();
  if (scenario === 'changed storage nonce') sessionStorage.setItem('oauth_nonce', 'other-attempt');
  if (scenario === 'missing storage nonce') sessionStorage.removeItem('oauth_nonce');
  await confirm(
    scenario === 'wrong message nonce' ? 'wrong' : nonce,
    scenario === 'wrong origin' ? 'https://untrusted.example.test' : window.location.origin,
  );
  expect(mockRefreshUser).not.toHaveBeenCalled();
  expect(mockCsrf).not.toHaveBeenCalled();
  expect(mockPush).not.toHaveBeenCalled();
  expect(getCurrentAccountId()).toBeNull();
  expect(onError).toHaveBeenCalledTimes(1);
});

it.each(['explicit cancellation', 'unmount'])('%s removes the preserved listener and makes the late confirmation inert', async action => {
  const { view, nonce, messageHandler } = await failedAttempt();
  if (action === 'unmount') view.unmount();
  else act(() => view.result.current.cancelGoogleLogin());
  expect(sessionStorage.getItem('oauth_nonce')).toBeNull();
  expect(removeWindowListener).toHaveBeenCalledWith('message', messageHandler);
  expect(closePopup).toHaveBeenCalledTimes(1);
  await confirm(nonce);
  await advance(10_000);
  expect(mockGet).toHaveBeenCalledTimes(1);
  expect(mockRefreshUser).not.toHaveBeenCalled();
  expect(mockPush).not.toHaveBeenCalled();
  expect(onError).toHaveBeenCalledTimes(1);
});

it('a new Google attempt removes the old listener and only accepts its own nonce', async () => {
  const { view, nonce, messageHandler } = await failedAttempt();
  act(() => view.result.current.handleGoogleLogin());
  const newNonce = sessionStorage.getItem('oauth_nonce');
  expect(newNonce).not.toBe(nonce);
  expect(removeWindowListener).toHaveBeenCalledWith('message', messageHandler);
  expect(closePopup).toHaveBeenCalledTimes(1);
  await confirm(nonce);
  expect(mockRefreshUser).not.toHaveBeenCalled();
  await confirm(newNonce);
  expect(mockRefreshUser).toHaveBeenCalledTimes(1);
  expect(mockPush).toHaveBeenCalledTimes(1);
});

it.each(['strict verification', 'CSRF'])('a later %s failure still fully cancels completion', async failure => {
  const { view, nonce, messageHandler } = await failedAttempt();
  if (failure === 'strict verification') mockRefreshUser.mockRejectedValueOnce(new SessionVerificationError());
  else mockCsrf.mockRejectedValueOnce(new Error('CSRF unavailable'));
  await confirm(nonce);
  await confirm(nonce);
  expect(mockRefreshUser).toHaveBeenCalledTimes(1);
  expect(mockCsrf).toHaveBeenCalledTimes(failure === 'CSRF' ? 1 : 0);
  expect(onError).toHaveBeenCalledTimes(2);
  expect(mockPush).not.toHaveBeenCalled();
  expect(sessionStorage.getItem('oauth_nonce')).toBeNull();
  expect(removeWindowListener).toHaveBeenCalledWith('message', messageHandler);
  expect(view.result.current.isGoogleLoading).toBe(false);
});

it('coalesces duplicated late messages while strict verification is pending', async () => {
  const { view, nonce } = await failedAttempt();
  let resolveVerification!: () => void;
  mockRefreshUser.mockImplementationOnce(() => new Promise<void>(resolve => { resolveVerification = resolve; }));
  await confirm(nonce);
  await confirm(nonce);
  await act(async () => {
    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(mockRefreshUser).toHaveBeenCalledTimes(1);
  expect(mockGet).toHaveBeenCalledTimes(1);
  expect(mockPush).not.toHaveBeenCalled();
  expect(view.result.current.isGoogleLoading).toBe(true);
  await act(async () => { setCurrentAccountId(71); resolveVerification(); });
  expect(mockCsrf).toHaveBeenCalledTimes(1);
  expect(mockPush).toHaveBeenCalledTimes(1);
  expect(view.result.current.isGoogleLoading).toBe(false);
});
