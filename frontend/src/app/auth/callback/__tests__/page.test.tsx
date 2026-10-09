import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import OAuthCallback from '../page';

let mockSearchParams: URLSearchParams;
let mockTheme = 'light';
const mockTranslate = (key: string) => key;
jest.mock('next/navigation', () => ({ useSearchParams: () => mockSearchParams }));
jest.mock('@/contexts/ThemeContext', () => ({ useTheme: () => ({ theme: mockTheme }) }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: mockTranslate }) }));
jest.mock('@/utils/clientLogging', () => ({ logClientDebug: jest.fn(), logClientError: jest.fn() }));

const NONCE = 'callback-attempt-nonce';
const originalOpener = Object.getOwnPropertyDescriptor(window, 'opener');
let postMessage: jest.Mock;
let closePopup: jest.SpyInstance;

/** Mount the actual callback page with only its router query and opener controlled. */
function mountCallback(query: string) {
  mockSearchParams = new URLSearchParams(query);
  return render(<OAuthCallback />);
}

/** Advance the callback's normal close delay without wall-clock waiting. */
async function advance(ms: number) {
  await act(async () => { await jest.advanceTimersByTimeAsync(ms); });
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  sessionStorage.clear();
  sessionStorage.setItem('oauth_nonce', NONCE);
  mockTheme = 'light';
  postMessage = jest.fn();
  Object.defineProperty(window, 'opener', { configurable: true, value: { postMessage } });
  closePopup = jest.spyOn(window, 'close').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
  document.documentElement.classList.remove('dark');
  if (originalOpener) Object.defineProperty(window, 'opener', originalOpener);
  else delete (window as unknown as Record<string, unknown>).opener;
});

it.each([
  ['error=access_denied', 'auth.oauthLoginFailed: access_denied'],
  ['oauth=success&error=access_denied', 'auth.oauthLoginFailed: access_denied'],
  ['', 'auth.oauthLoginFailed'],
  ['oauth=unexpected', 'auth.oauthLoginFailed'],
])('includes the originating popup nonce in error callback %s', async (query, error) => {
  mountCallback(query);
  expect(postMessage).toHaveBeenCalledTimes(1);
  expect(postMessage).toHaveBeenCalledWith({ type: 'OAUTH_ERROR', nonce: NONCE, error }, window.location.origin);
  expect(screen.getByRole('heading', { name: 'auth.loginError' })).toBeVisible();
  expect(sessionStorage.getItem('oauth_nonce')).toBe(NONCE);
  expect(closePopup).not.toHaveBeenCalled();
  await advance(3000);
  expect(closePopup).toHaveBeenCalledTimes(1);
});

it.each(['error=access_denied', ''])('uses a null nonce for %s when the popup has no attempt storage', async query => {
  sessionStorage.removeItem('oauth_nonce');
  mountCallback(query);
  expect(postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'OAUTH_ERROR', nonce: null }), window.location.origin);
  await advance(3000);
  expect(closePopup).toHaveBeenCalledTimes(1);
});

it.each(['error=access_denied', ''])('does not break error display or closure for %s if nonce storage is unavailable', async query => {
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Storage unavailable'); });
  mountCallback(query);
  expect(screen.getByRole('heading', { name: 'auth.loginError' })).toBeVisible();
  expect(postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'OAUTH_ERROR', nonce: null }), window.location.origin);
  await advance(3000);
  expect(closePopup).toHaveBeenCalledTimes(1);
});

it('preserves success delivery, its nonce cleanup and the existing one-second closure', async () => {
  mountCallback('oauth=success');
  expect(postMessage).toHaveBeenCalledTimes(1);
  expect(postMessage).toHaveBeenCalledWith({ type: 'OAUTH_SUCCESS', nonce: NONCE }, window.location.origin);
  expect(sessionStorage.getItem('oauth_nonce')).toBeNull();
  expect(screen.getByRole('heading', { name: 'auth.successfullyLoggedIn' })).toBeVisible();
  await advance(999);
  expect(closePopup).not.toHaveBeenCalled();
  await advance(1);
  expect(closePopup).toHaveBeenCalledTimes(1);
});

it.each(['error=access_denied', ''])('sends the %s error only once across theme and query rerenders', async query => {
  const view = mountCallback(query);
  mockTheme = 'dark';
  mockSearchParams = new URLSearchParams('error=late_error');
  view.rerender(<OAuthCallback />);
  expect(document.documentElement).toHaveClass('dark');
  expect(postMessage).toHaveBeenCalledTimes(1);
  expect(postMessage).toHaveBeenCalledWith(expect.objectContaining({ nonce: NONCE }), window.location.origin);
  await advance(3000);
  expect(closePopup).toHaveBeenCalledTimes(1);
});

it.each(['error=access_denied', ''])('keeps a standalone %s error usable without an opener', async query => {
  Object.defineProperty(window, 'opener', { configurable: true, value: null });
  mountCallback(query);
  expect(postMessage).not.toHaveBeenCalled();
  expect(screen.getByRole('heading', { name: 'auth.loginError' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'common.close' }));
  expect(closePopup).toHaveBeenCalledTimes(1);
  await advance(3000);
  expect(closePopup).toHaveBeenCalledTimes(2);
});
