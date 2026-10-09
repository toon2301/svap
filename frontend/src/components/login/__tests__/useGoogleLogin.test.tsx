import { act, renderHook } from '@testing-library/react';
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
const originalTrace = Object.getOwnPropertyDescriptor(window, '__OAUTH_TRACE__');
const originalBackendOrigin = process.env.NEXT_PUBLIC_BACKEND_ORIGIN;
const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;
let closed = false;
let disconnected = false;
let hidden = false;
let nonceSequence = 0;
let closePopup: jest.Mock;
let openPopup: jest.SpyInstance;
let onError: jest.Mock;
let onStart: jest.Mock;

/** A controllable network operation for races, independent of real time. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

/** Advance only the controller's clock while flushing React and async continuations. */
async function advance(ms: number) {
  await act(async () => { await jest.advanceTimersByTimeAsync(ms); });
}

/** Open a new attempt using the actual hook, including the synchronous popup gesture. */
function begin() {
  const view = renderHook(() => useGoogleLogin({ onStart, onError }));
  act(() => view.result.current.handleGoogleLogin());
  return view;
}

/** Deliver a callback without assuming it is trustworthy. */
async function message(data: unknown = { type: 'OAUTH_SUCCESS', nonce: sessionStorage.getItem('oauth_nonce') }, origin = window.location.origin) {
  await act(async () => { window.dispatchEvent(new MessageEvent('message', { data, origin })); });
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  closed = false;
  disconnected = false;
  hidden = false;
  nonceSequence = 0;
  sessionStorage.clear();
  localStorage.clear();
  setCurrentAccountId(null);
  onStart = jest.fn();
  onError = jest.fn();
  mockGet.mockReset().mockResolvedValue({ status: 401, data: {} });
  mockCsrf.mockReset().mockResolvedValue(undefined);
  mockRefreshUser.mockReset().mockImplementation(async () => { setCurrentAccountId(71); });
  api.defaults.baseURL = 'https://backend.example.test/api';
  delete process.env.NEXT_PUBLIC_BACKEND_ORIGIN;
  delete process.env.NEXT_PUBLIC_API_URL;
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => hidden ? 'hidden' : 'visible' });
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value: { randomUUID: () => `nonce-${++nonceSequence}` } });
  closePopup = jest.fn(() => { closed = true; });
  openPopup = jest.spyOn(window, 'open').mockReturnValue({
    get closed() {
      if (disconnected) throw new Error('Connection unavailable');
      return closed;
    },
    close: closePopup,
  } as unknown as Window);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  setCurrentAccountId(null);
  if (originalCrypto) Object.defineProperty(globalThis, 'crypto', originalCrypto);
  if (originalVisibility) Object.defineProperty(document, 'visibilityState', originalVisibility);
  else delete (document as unknown as Record<string, unknown>).visibilityState;
  if (originalTrace) Object.defineProperty(window, '__OAUTH_TRACE__', originalTrace);
  else delete (window as unknown as Record<string, unknown>).__OAUTH_TRACE__;
  if (originalBackendOrigin === undefined) delete process.env.NEXT_PUBLIC_BACKEND_ORIGIN;
  else process.env.NEXT_PUBLIC_BACKEND_ORIGIN = originalBackendOrigin;
  if (originalApiUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL;
  else process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
});

it('opens synchronously with the configured API and completes once without a recovery probe', async () => {
  const view = begin();
  expect(openPopup).toHaveBeenCalledWith(expect.stringContaining('https://backend.example.test/api/oauth/google/login/'), 'google-login', expect.any(String));
  expect(onStart).toHaveBeenCalledTimes(1);
  expect(view.result.current.isGoogleLoading).toBe(true);
  await message();
  await message();
  await advance(5000);

  expect(mockGet).not.toHaveBeenCalled();
  expect(mockRefreshUser).toHaveBeenCalledTimes(1);
  expect(mockRefreshUser).toHaveBeenCalledWith({ force: true, verifyLogin: true });
  expect(mockCsrf).toHaveBeenCalledTimes(1);
  expect(mockPush).toHaveBeenCalledTimes(1);
  expect(sessionStorage.getItem('oauth_nonce')).toBeNull();
  expect(sessionStorage.getItem('forceHome')).toBe('1');
  expect(localStorage.getItem('activeModule')).toBe('home');
  expect(view.result.current.isGoogleLoading).toBe(false);
  expect(jest.getTimerCount()).toBe(0);
});

it.each(['missing', 'disconnected'])('recovers a %s callback through backend truth', async scenario => {
  mockGet.mockResolvedValue({ status: 200, data: { id: 71 } });
  const view = begin();
  closed = true;
  disconnected = scenario === 'disconnected';
  await advance(1000);
  expect(mockRefreshUser).toHaveBeenCalledTimes(1);
  expect(mockPush).toHaveBeenCalledWith('/dashboard');
  expect(view.result.current.isGoogleLoading).toBe(false);
  const config = mockGet.mock.calls[0][1];
  expect(config.timeout).toBe(5000);
  expect(config.validateStatus(200)).toBe(true);
  expect(config.validateStatus(401)).toBe(true);
  expect(config.validateStatus(500)).toBe(false);
});

it('recovers delayed cookies through bounded 401 → 200 probes', async () => {
  mockGet.mockResolvedValueOnce({ status: 401, data: {} }).mockResolvedValueOnce({ status: 200, data: { id: 71 } });
  begin(); closed = true;
  await advance(1500);
  expect(mockGet).toHaveBeenCalledTimes(2);
  expect(mockRefreshUser).toHaveBeenCalledTimes(1);
  expect(onError).not.toHaveBeenCalled();
});

it('unlocks a genuine cancellation without errors or ongoing timed API polling', async () => {
  const view = begin(); closed = true;
  await advance(4000);
  expect(mockGet).toHaveBeenCalledTimes(3);
  expect(mockRefreshUser).not.toHaveBeenCalled();
  expect(mockPush).not.toHaveBeenCalled();
  expect(view.result.current.isGoogleLoading).toBe(false);
  expect(onError).not.toHaveBeenCalled();
  expect(jest.getTimerCount()).toBe(0);
  await advance(60_000);
  expect(mockGet).toHaveBeenCalledTimes(3);
});

it('still accepts matching completion after anonymous recovery has become idle', async () => {
  begin(); disconnected = true;
  await advance(4000);
  await message();
  expect(mockRefreshUser).toHaveBeenCalledTimes(1);
  expect(mockPush).toHaveBeenCalledTimes(1);
});

it.each(['focus', 'visibilitychange'])('waits for return via %s if connection is lost while Google is hidden', async event => {
  begin(); disconnected = true; hidden = true;
  await advance(5000);
  expect(mockGet).not.toHaveBeenCalled();
  hidden = false;
  mockGet.mockResolvedValue({ status: 200, data: { id: 71 } });
  await act(async () => {
    (event === 'focus' ? window : document).dispatchEvent(new Event(event));
  });
  expect(mockRefreshUser).toHaveBeenCalledTimes(1);
  expect(mockPush).toHaveBeenCalledWith('/dashboard');
});

it('coalesces simultaneous return events and accepts a message while the probe is pending', async () => {
  const pending = deferred<unknown>();
  mockGet.mockReturnValue(pending.promise);
  begin(); closed = true;
  await advance(1000);
  await act(async () => {
    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(mockGet).toHaveBeenCalledTimes(1);
  const signal = mockGet.mock.calls[0][1].signal as AbortSignal;
  await message();
  expect(signal.aborted).toBe(true);
  await act(async () => { pending.resolve({ status: 401, data: {} }); });
  expect(mockRefreshUser).toHaveBeenCalledTimes(1);
  expect(mockPush).toHaveBeenCalledTimes(1);
  expect(onError).not.toHaveBeenCalled();
});

it('a late message during the retry delay finishes once and removes every timer', async () => {
  begin(); closed = true;
  await advance(1000);
  await message();
  await advance(10_000);
  expect(mockGet).toHaveBeenCalledTimes(1);
  expect(mockRefreshUser).toHaveBeenCalledTimes(1);
  expect(jest.getTimerCount()).toBe(0);
});

it.each([
  ['server', { response: { status: 500 } }, 'auth.sessionVerificationFailed'],
  ['network', new Error('Offline'), 'auth.sessionVerificationFailed'],
  ['timeout', { code: 'ECONNABORTED' }, 'auth.sessionVerificationFailed'],
  ['limit', { response: { status: 429 } }, 'auth.tooManyRequests'],
  ['null error', null, 'auth.sessionVerificationFailed'],
])('reports %s failure instead of pretending it is cancellation', async (_name, error, key) => {
  mockGet.mockRejectedValue(error);
  const view = begin(); const nonce = sessionStorage.getItem('oauth_nonce'); closed = true;
  await advance(1000);
  expect(onError).toHaveBeenCalledWith(key);
  expect(mockGet).toHaveBeenCalledTimes(1);
  expect(mockRefreshUser).not.toHaveBeenCalled();
  expect(mockPush).not.toHaveBeenCalled();
  expect(view.result.current.isGoogleLoading).toBe(false);
  expect(sessionStorage.getItem('oauth_nonce')).toBe(nonce);
  view.unmount();
  expect(sessionStorage.getItem('oauth_nonce')).toBeNull();
});

it('also handles rejected 401 probes as anonymous, without displaying errors', async () => {
  mockGet.mockRejectedValue({ response: { status: 401 } });
  const view = begin(); closed = true;
  await advance(4000);
  expect(view.result.current.isGoogleLoading).toBe(false);
  expect(onError).not.toHaveBeenCalled();
});

it.each([{}, null, { id: '71' }, { id: 0 }])('never grants identity from an invalid 200 body %p', async data => {
  mockGet.mockResolvedValue({ status: 200, data });
  begin(); closed = true;
  await advance(1000);
  expect(mockRefreshUser).not.toHaveBeenCalled();
  expect(mockPush).not.toHaveBeenCalled();
  expect(onError).toHaveBeenCalledWith('auth.sessionVerificationFailed');
});

it.each([
  { type: 'OAUTH_SUCCESS', nonce: 'wrong' },
  { type: 'unrelated' },
  null,
  'OAUTH_SUCCESS',
])('ignores malformed or untrusted callback data %p', async data => {
  begin(); await message(data);
  expect(mockRefreshUser).not.toHaveBeenCalled();
  expect(mockPush).not.toHaveBeenCalled();
});

it('rejects a valid nonce from the wrong origin', async () => {
  begin(); await message({ type: 'OAUTH_SUCCESS', nonce: sessionStorage.getItem('oauth_nonce') }, 'https://untrusted.example.test');
  expect(mockRefreshUser).not.toHaveBeenCalled();
});

it.each(['OAuth rejected', undefined])('preserves the existing OAuth error flow: %s', async error => {
  const view = begin(); await message({ type: 'OAUTH_ERROR', nonce: sessionStorage.getItem('oauth_nonce'), error });
  expect(onError).toHaveBeenCalledWith(error ?? 'auth.googleLoginFailed');
  expect(view.result.current.isGoogleLoading).toBe(false);
  expect(jest.getTimerCount()).toBe(0);
});

it.each([new SessionVerificationError(), new Error('CSRF unavailable')])('shows the existing completion error and never redirects: %p', async error => {
  if (error instanceof SessionVerificationError) mockRefreshUser.mockRejectedValue(error);
  else mockCsrf.mockRejectedValue(error);
  const view = begin(); await message();
  expect(onError).toHaveBeenCalledWith(error instanceof SessionVerificationError ? 'auth.sessionVerificationFailed' : 'auth.googleLoginFailed');
  expect(mockPush).not.toHaveBeenCalled();
  expect(view.result.current.isGoogleLoading).toBe(false);
});

it('a new attempt aborts its predecessor and rejects both old results and old nonce', async () => {
  const pending = deferred<unknown>();
  mockGet.mockReturnValueOnce(pending.promise);
  const view = begin(); const oldNonce = sessionStorage.getItem('oauth_nonce'); closed = true;
  await advance(1000);
  const signal = mockGet.mock.calls[0][1].signal as AbortSignal;
  act(() => { closed = false; view.result.current.handleGoogleLogin(); });
  expect(signal.aborted).toBe(true);
  expect(closePopup).toHaveBeenCalledTimes(1);
  await message({ type: 'OAUTH_SUCCESS', nonce: oldNonce });
  await act(async () => { pending.resolve({ status: 200, data: { id: 71 } }); });
  expect(mockRefreshUser).not.toHaveBeenCalled();
  await message();
  expect(mockRefreshUser).toHaveBeenCalledTimes(1);
});

it('explicit cancellation and unmount both abort probes without treating abortion as an error', async () => {
  const pending = deferred<unknown>(); mockGet.mockReturnValue(pending.promise);
  const view = begin(); closed = true; await advance(1000);
  const signal = mockGet.mock.calls[0][1].signal as AbortSignal;
  act(() => view.result.current.cancelGoogleLogin()); view.unmount();
  await act(async () => { pending.reject(new Error('Aborted')); });
  expect(signal.aborted).toBe(true);
  expect(mockRefreshUser).not.toHaveBeenCalled();
  expect(onError).not.toHaveBeenCalled();
  expect(jest.getTimerCount()).toBe(0);
});

it('unmount removes active listeners and leaves no polling or retry timers', async () => {
  const view = begin(); closed = true; await advance(1000);
  view.unmount();
  await message();
  await act(async () => { window.dispatchEvent(new Event('focus')); });
  await advance(10_000);
  expect(mockGet).toHaveBeenCalledTimes(1);
  expect(mockRefreshUser).not.toHaveBeenCalled();
  expect(jest.getTimerCount()).toBe(0);
});

it('verified completion housekeeping survives natural unmount without a late form redirect', async () => {
  const pending = deferred<void>(); mockCsrf.mockReturnValue(pending.promise);
  const view = begin(); await message(); view.unmount();
  await act(async () => { pending.resolve(); });
  expect(sessionStorage.getItem('forceHome')).toBe('1');
  expect(mockPush).not.toHaveBeenCalled();
  expect(onError).not.toHaveBeenCalled();
});

it('leaving the form before strict verification finishes cancels its completion housekeeping', async () => {
  const pending = deferred<void>(); mockRefreshUser.mockReturnValue(pending.promise);
  const view = begin(); await message(); view.unmount();
  await act(async () => { setCurrentAccountId(71); pending.resolve(); });
  expect(mockCsrf).not.toHaveBeenCalled();
  expect(sessionStorage.getItem('forceHome')).toBeNull();
  expect(mockPush).not.toHaveBeenCalled();
  expect(onError).not.toHaveBeenCalled();
});

it('an intervening logout before the verification continuation cannot navigate', async () => {
  mockRefreshUser.mockImplementation(async () => { setCurrentAccountId(null); });
  begin(); await message();
  expect(mockCsrf).not.toHaveBeenCalled();
  expect(sessionStorage.getItem('forceHome')).toBeNull();
  expect(mockPush).not.toHaveBeenCalled();
});

it.each([null, 72])('logout or account %p during CSRF priming cannot revive preferences or redirect', async account => {
  const pending = deferred<void>(); mockCsrf.mockReturnValue(pending.promise);
  begin(); await message(); setCurrentAccountId(account);
  await act(async () => { pending.resolve(); });
  expect(getCurrentAccountId()).toBe(account);
  expect(sessionStorage.getItem('forceHome')).toBeNull();
  expect(mockPush).not.toHaveBeenCalled();
});

it('handles a blocked popup and clears its nonce', () => {
  openPopup.mockReturnValue(null); const view = begin();
  expect(onError).toHaveBeenCalledWith('auth.googleLoginFailed');
  expect(view.result.current.isGoogleLoading).toBe(false);
  expect(sessionStorage.getItem('oauth_nonce')).toBeNull();
  expect(jest.getTimerCount()).toBe(0);
});

it('does not leak a polling interval if a callback arrives synchronously during window.open', async () => {
  openPopup.mockImplementationOnce(() => {
    window.dispatchEvent(new MessageEvent('message', {
      origin: window.location.origin,
      data: { type: 'OAUTH_SUCCESS', nonce: sessionStorage.getItem('oauth_nonce') },
    }));
    return { closed: false, close: closePopup } as unknown as Window;
  });
  begin(); await advance(5000);
  expect(mockRefreshUser).toHaveBeenCalledTimes(1);
  expect(mockPush).toHaveBeenCalledTimes(1);
  expect(jest.getTimerCount()).toBe(0);
});

it('uses current callbacks without restarting an attempt on an unrelated form render', async () => {
  const view = begin(); const previousError = onError; onError = jest.fn();
  view.rerender();
  await message({ type: 'OAUTH_ERROR', nonce: sessionStorage.getItem('oauth_nonce'), error: 'OAuth rejected' });
  expect(onError).toHaveBeenCalledWith('OAuth rejected');
  expect(previousError).not.toHaveBeenCalled();
  expect(openPopup).toHaveBeenCalledTimes(1);
  expect(onStart).toHaveBeenCalledTimes(1);
});

it('handles window.open exceptions, storage failures and missing nonce storage without granting identity', async () => {
  openPopup.mockImplementationOnce(() => { throw new Error('Blocked'); });
  const view = begin(); expect(onError).toHaveBeenCalledWith('auth.googleLoginFailed');
  const spy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Private mode'); });
  act(() => view.result.current.handleGoogleLogin());
  expect(view.result.current.isGoogleLoading).toBe(false); spy.mockRestore();
  act(() => view.result.current.handleGoogleLogin());
  const nonce = sessionStorage.getItem('oauth_nonce');
  const getter = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Storage disappeared'); });
  await message({ type: 'OAUTH_SUCCESS', nonce });
  expect(mockRefreshUser).not.toHaveBeenCalled();
  view.unmount(); getter.mockRestore();
});

it('storage or diagnostic exceptions never undo a verified login', async () => {
  Object.defineProperty(window, '__OAUTH_TRACE__', { configurable: true, value: { log: () => { throw new Error('Debug failure'); } } });
  begin();
  const spy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage disappeared'); });
  await message();
  expect(mockPush).toHaveBeenCalledWith('/dashboard');
  spy.mockRestore();
});

it.each([
  ['https://alternate.example.test', undefined, 'https://alternate.example.test/api'],
  [undefined, 'https://api-url.example.test/api', 'https://api-url.example.test/api'],
  [undefined, undefined, '/api'],
])('preserves URL fallback configuration %p / %p', (origin, apiUrl, expectedBase) => {
  api.defaults.baseURL = '';
  if (origin) process.env.NEXT_PUBLIC_BACKEND_ORIGIN = origin;
  if (apiUrl) process.env.NEXT_PUBLIC_API_URL = apiUrl;
  begin();
  expect(openPopup).toHaveBeenCalledWith(expect.stringContaining(`${expectedBase}/oauth/google/login/`), 'google-login', expect.any(String));
});
