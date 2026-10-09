import { act, cleanup, renderHook } from '@testing-library/react';
import { useGoogleLogin } from '../useGoogleLogin';
import { api } from '@/lib/api';
import { setCurrentAccountId } from '@/lib/currentAccount';
import { fetchCsrfToken } from '@/utils/csrf';

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
let sequence = 0;
let closed = false;
let onError: jest.Mock;
let removeListener: jest.SpyInstance;

/** Start a real hook attempt and capture its nonce before a message can clear it. */
function begin() {
  const view = renderHook(() => useGoogleLogin({ onStart: jest.fn(), onError }));
  act(() => view.result.current.handleGoogleLogin());
  const nonce = sessionStorage.getItem('oauth_nonce');
  expect(nonce).not.toBeNull();
  return { view, nonce };
}

/** Deliver success or error messages with independently controllable origin and payload. */
async function message(data: unknown, origin = window.location.origin) {
  await act(async () => {
    window.dispatchEvent(new MessageEvent('message', { data, origin }));
  });
}

/** Flush the bounded recovery clock without real network delays. */
async function advance(ms: number) {
  await act(async () => { await jest.advanceTimersByTimeAsync(ms); });
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  sessionStorage.clear();
  localStorage.clear();
  setCurrentAccountId(null);
  sequence = 0;
  closed = false;
  onError = jest.fn();
  mockGet.mockReset().mockResolvedValue({ status: 401, data: {} });
  mockCsrf.mockReset().mockResolvedValue(undefined);
  mockRefreshUser.mockReset().mockImplementation(async () => { setCurrentAccountId(71); });
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value: { randomUUID: () => `error-nonce-${++sequence}` } });
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  jest.spyOn(window, 'open').mockImplementation(() => ({
    get closed() { return closed; },
    close: jest.fn(),
  } as unknown as Window));
  removeListener = jest.spyOn(window, 'removeEventListener');
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

it.each(['anonymous recovery', 'failed probe'])('a delayed error from %s cannot cancel a newer login', async scenario => {
  const { view, nonce: oldNonce } = begin();
  closed = true;
  if (scenario === 'failed probe') mockGet.mockRejectedValueOnce({ response: { status: 500 } });
  await advance(4000);
  expect(view.result.current.isGoogleLoading).toBe(false);
  onError.mockClear();

  closed = false;
  act(() => view.result.current.handleGoogleLogin());
  const newNonce = sessionStorage.getItem('oauth_nonce');
  expect(newNonce).not.toBe(oldNonce);
  await message({ type: 'OAUTH_ERROR', nonce: oldNonce, error: 'Old popup rejected' });
  expect(view.result.current.isGoogleLoading).toBe(true);
  expect(sessionStorage.getItem('oauth_nonce')).toBe(newNonce);
  expect(onError).not.toHaveBeenCalled();

  await message({ type: 'OAUTH_SUCCESS', nonce: newNonce });
  expect(mockRefreshUser).toHaveBeenCalledTimes(1);
  expect(mockRefreshUser).toHaveBeenCalledWith({ force: true, verifyLogin: true });
  expect(mockCsrf).toHaveBeenCalledTimes(1);
  expect(mockPush).toHaveBeenCalledWith('/dashboard');
  expect(view.result.current.isGoogleLoading).toBe(false);
});

it.each(['wrong nonce', 'missing nonce', 'null nonce', 'empty nonce', 'wrong origin', 'changed storage', 'missing storage', 'unavailable storage'])('ignores an error with %s and still accepts the current success', async scenario => {
  const { view, nonce } = begin();
  if (scenario === 'changed storage') sessionStorage.setItem('oauth_nonce', 'other-attempt');
  if (scenario === 'missing storage') sessionStorage.removeItem('oauth_nonce');
  const getter = scenario === 'unavailable storage'
    ? jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Storage unavailable'); })
    : null;
  const data = { type: 'OAUTH_ERROR', error: 'Untrusted rejection', nonce: nonce as unknown };
  if (scenario === 'wrong nonce') data.nonce = 'old-attempt';
  if (scenario === 'missing nonce') data.nonce = undefined;
  if (scenario === 'null nonce') data.nonce = null;
  if (scenario === 'empty nonce') data.nonce = '';
  try {
    await message(data, scenario === 'wrong origin' ? 'https://untrusted.example.test' : window.location.origin);
    expect(view.result.current.isGoogleLoading).toBe(true);
    expect(onError).not.toHaveBeenCalled();
    expect(mockRefreshUser).not.toHaveBeenCalled();
    expect(mockCsrf).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  } finally {
    getter?.mockRestore();
  }
  sessionStorage.setItem('oauth_nonce', nonce!);
  await message({ type: 'OAUTH_SUCCESS', nonce });
  expect(mockRefreshUser).toHaveBeenCalledTimes(1);
  expect(mockPush).toHaveBeenCalledWith('/dashboard');
});

it.each(['Provider rejected', undefined, '', null, 0, { detail: 'not a string' }])('a valid current error %p ends only its own attempt and cannot be duplicated', async error => {
  const { view, nonce } = begin();
  await message({ type: 'OAUTH_ERROR', nonce, error });
  expect(onError).toHaveBeenCalledTimes(1);
  expect(onError).toHaveBeenCalledWith(typeof error === 'string' && error ? error : 'auth.googleLoginFailed');
  expect(view.result.current.isGoogleLoading).toBe(false);
  expect(sessionStorage.getItem('oauth_nonce')).toBeNull();
  expect(removeListener).toHaveBeenCalledWith('message', expect.any(Function));
  expect(jest.getTimerCount()).toBe(0);
  await message({ type: 'OAUTH_ERROR', nonce, error });
  await message({ type: 'OAUTH_SUCCESS', nonce });
  await act(async () => { window.dispatchEvent(new Event('focus')); });
  await advance(10_000);
  expect(onError).toHaveBeenCalledTimes(1);
  expect(mockGet).not.toHaveBeenCalled();
  expect(mockRefreshUser).not.toHaveBeenCalled();
  expect(mockCsrf).not.toHaveBeenCalled();
  expect(mockPush).not.toHaveBeenCalled();
});

it.each(['stale', 'current'])('a %s error during a pending probe cannot produce an incorrect completion', async source => {
  let resolveProbe!: (response: unknown) => void;
  mockGet.mockReturnValueOnce(new Promise(resolve => { resolveProbe = resolve; }));
  const { view, nonce } = begin();
  closed = true;
  await advance(1000);
  const signal = mockGet.mock.calls[0][1].signal as AbortSignal;
  await message({ type: 'OAUTH_ERROR', nonce: source === 'current' ? nonce : 'old-attempt', error: 'Provider rejected' });
  expect(signal.aborted).toBe(source === 'current');
  expect(view.result.current.isGoogleLoading).toBe(source === 'stale');
  await act(async () => { resolveProbe({ status: 200, data: { id: 71 } }); });
  expect(mockRefreshUser).toHaveBeenCalledTimes(source === 'stale' ? 1 : 0);
  expect(mockPush).toHaveBeenCalledTimes(source === 'stale' ? 1 : 0);
  expect(onError).toHaveBeenCalledTimes(source === 'current' ? 1 : 0);
});

it('a valid current error after a technical probe failure still definitively cancels the attempt', async () => {
  mockGet.mockRejectedValueOnce({ response: { status: 500 } });
  const { view, nonce } = begin();
  closed = true;
  await advance(1000);
  expect(sessionStorage.getItem('oauth_nonce')).toBe(nonce);
  await message({ type: 'OAUTH_ERROR', nonce, error: 'Provider rejected' });
  await message({ type: 'OAUTH_SUCCESS', nonce });
  expect(onError).toHaveBeenCalledTimes(2);
  expect(onError).toHaveBeenLastCalledWith('Provider rejected');
  expect(view.result.current.isGoogleLoading).toBe(false);
  expect(sessionStorage.getItem('oauth_nonce')).toBeNull();
  expect(mockRefreshUser).not.toHaveBeenCalled();
  expect(mockPush).not.toHaveBeenCalled();
});
