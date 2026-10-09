/** Controlled OAuth event ordering with the real login form, auth provider and home page. */
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import Home from '@/app/page';
import {
  AuthProvider,
  __resetAuthBootstrapSnapshotForTests,
  useAuth,
} from '@/contexts/AuthContext';
import { api, endpoints } from '@/lib/api';
import { getCurrentAccountId } from '@/lib/currentAccount';
import { fetchCsrfToken, hasCsrfToken } from '@/utils/csrf';
import type { User } from '@/types';

jest.mock('next/navigation', () => ({ useRouter: jest.fn() }));
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
jest.mock('@/components/ParticlesBackground', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/utils/csrf', () => ({
  fetchCsrfToken: jest.fn(),
  hasCsrfToken: jest.fn(),
}));
jest.mock('@/utils/clientLogging', () => ({
  logClientError: jest.fn(),
  logClientDebug: jest.fn(),
}));
jest.mock('@/lib/api', () => ({
  api: { get: jest.fn(), post: jest.fn(), defaults: { baseURL: 'https://backend.example.test/api' } },
  endpoints: { auth: { me: '/auth/me/', login: '/auth/login/', logout: '/auth/logout/' } },
  invalidateSession: jest.fn(),
  isTransientAuthFailureError: jest.fn(() => false),
  setMayHaveRefreshCookie: jest.fn(),
}));

const TEST_NONCE = '00000000-0000-4000-8000-000000000071';
const VERIFIED_USER = {
  id: 71,
  username: 'oauth-order-test',
  email: 'oauth-order-test@example.com',
  first_name: 'OAuth',
  last_name: 'Test',
  user_type: 'individual',
  is_verified: true,
  is_public: true,
} as User;

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockGet = api.get as jest.Mock;
const mockPost = api.post as jest.Mock;
const mockFetchCsrf = fetchCsrfToken as jest.Mock;
const mockHasCsrf = hasCsrfToken as jest.Mock;
const originalCryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
let serverSignedIn = false;
let serverFailureStatus: number | null = null;
let popupClosed = false;
let popupReadThrows = false;

/** Observe identity without replacing any production authentication logic. */
function IdentityProbe() {
  const { user } = useAuth();
  return <output data-testid="oauth-identity">{user ? String(user.id) : 'anonymous'}</output>;
}

/** Render the actual public page, including its normal authenticated-user redirect. */
function mountHome() {
  return render(<AuthProvider><Home /><IdentityProbe /></AuthProvider>);
}

/** Flush React effects and promise continuations without advancing the popup clock. */
async function flush() {
  await act(async () => {});
}

/** Advance the real form's popup polling deterministically, not using wall-clock sleeps. */
async function advancePopupClock(ms: number) {
  await act(async () => { await jest.advanceTimersByTimeAsync(ms); });
}

/** Deliver the same message shape as the app's callback with controllable origin and nonce. */
async function confirmGoogle(nonce = TEST_NONCE, origin = window.location.origin) {
  await act(async () => {
    window.dispatchEvent(new MessageEvent('message', {
      origin,
      data: { type: 'OAUTH_SUCCESS', nonce },
    }));
  });
}

/** Start from a verified anonymous bootstrap rather than a remembered user snapshot. */
async function startGoogle() {
  const view = mountHome();
  await flush();
  expect(mockGet).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId('oauth-identity')).toHaveTextContent('anonymous');
  expect(getCurrentAccountId()).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /Google/i }));
  expect(screen.getByRole('button', { name: /Google/i })).toBeDisabled();
  return view;
}

/** Capture the symptom before a simulated full reload can conceal it. */
function readCompletionState() {
  const button = screen.queryByRole('button', { name: /Google/i });
  return {
    identity: screen.getByTestId('oauth-identity').textContent,
    navigatedToDashboard: mockPush.mock.calls.some(([path]) => path === '/dashboard'),
    googleButtonEnabled: button !== null && !button.hasAttribute('disabled'),
    alertCount: screen.queryAllByRole('alert').length,
  };
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  __resetAuthBootstrapSnapshotForTests();
  sessionStorage.clear();
  localStorage.clear();
  serverSignedIn = false;
  serverFailureStatus = null;
  popupClosed = false;
  popupReadThrows = false;
  (useRouter as jest.Mock).mockReturnValue({ push: mockPush, replace: mockReplace });
  mockHasCsrf.mockReturnValue(true);
  mockFetchCsrf.mockResolvedValue(undefined);
  mockPost.mockResolvedValue({ status: 200, data: {} });
  mockGet.mockImplementation(async (url: string) => {
    if (url !== endpoints.auth.me) throw new Error('Unexpected request in OAuth ordering test');
    const status = serverFailureStatus ?? (serverSignedIn ? 200 : 401);
    if (status !== 200) throw { response: { status } };
    return { status, data: VERIFIED_USER };
  });
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: { randomUUID: () => TEST_NONCE },
  });
  jest.spyOn(window, 'open').mockReturnValue({
    get closed() {
      if (popupReadThrows) throw new Error('Popup connection unavailable');
      return popupClosed;
    },
  } as Window);
});

afterEach(() => {
  cleanup();
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
  __resetAuthBootstrapSnapshotForTests();
  if (originalCryptoDescriptor) {
    Object.defineProperty(globalThis, 'crypto', originalCryptoDescriptor);
  }
});

describe('Google completion controls', () => {
  it('blocks password submission by click, Enter and submit while Google is in progress', async () => {
    await startGoogle();
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'password-test@example.com' } });
    fireEvent.change(screen.getByLabelText('Heslo'), { target: { value: 'test-password' } });
    const passwordSubmit = screen.getByRole('button', { name: 'Prihlásiť sa' });
    expect(passwordSubmit).toBeDisabled();
    fireEvent.click(passwordSubmit);
    fireEvent.keyDown(screen.getByLabelText('Heslo'), { key: 'Enter' });
    fireEvent.submit(screen.getByRole('form', { name: 'Prihlásiť sa' }));
    await flush();
    expect(mockPost).not.toHaveBeenCalled();
    expect(mockGet).toHaveBeenCalledTimes(1);

    serverSignedIn = true;
    await confirmGoogle();
    expect(getCurrentAccountId()).toBe(VERIFIED_USER.id);
    expect(mockPush).toHaveBeenCalledWith('/dashboard');
    expect(mockPost).not.toHaveBeenCalled();
  });

  it.each(['success', 'rejected'])('password login after an idle Google attempt cancels old completion: %s', async outcome => {
    await startGoogle();
    popupClosed = true;
    await advancePopupClock(4000);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'password-test@example.com' } });
    fireEvent.change(screen.getByLabelText('Heslo'), { target: { value: 'test-password' } });
    mockPost.mockImplementation(async () => {
      expect(sessionStorage.getItem('oauth_nonce')).toBeNull();
      if (outcome === 'rejected') throw { response: { status: 400 } };
      serverSignedIn = true;
      return { status: 200, data: {} };
    });
    fireEvent.click(screen.getByRole('button', { name: 'Prihlásiť sa' }));
    await flush();
    expect(mockPost).toHaveBeenCalledTimes(1);
    const requestsAfterPassword = mockGet.mock.calls.length;
    await confirmGoogle();
    await act(async () => { window.dispatchEvent(new Event('focus')); });
    await advancePopupClock(5000);
    expect(mockGet).toHaveBeenCalledTimes(requestsAfterPassword);
    expect(mockFetchCsrf).not.toHaveBeenCalled(); // A stale Google completion must not run priming.
    if (outcome === 'success') {
      expect(getCurrentAccountId()).toBe(VERIFIED_USER.id);
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    } else {
      expect(getCurrentAccountId()).toBeNull();
      expect(mockPush).not.toHaveBeenCalled();
      expect(screen.getByRole('alert')).toHaveTextContent('Neplatné prihlasovacie údaje.');
      expect(screen.getByRole('button', { name: /Google/i })).toBeEnabled();
    }
  });

  it('confirms a fresh server session when success arrives before popup closure', async () => {
    await startGoogle();
    serverSignedIn = true; // Simulated OAuth backend creates a NEW session after anonymous bootstrap.
    await confirmGoogle();
    popupClosed = true;
    await advancePopupClock(2000);

    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(mockFetchCsrf).toHaveBeenCalledTimes(1);
    expect(getCurrentAccountId()).toBe(VERIFIED_USER.id);
    expect(readCompletionState()).toEqual({
      identity: String(VERIFIED_USER.id),
      navigatedToDashboard: true,
      googleButtonEnabled: false,
      alertCount: 0,
    });
  });

  it('keeps a cancelled login anonymous and unlocks the button without an error', async () => {
    await startGoogle();
    popupClosed = true; // No OAuth backend login; this is genuine cancellation.
    await advancePopupClock(4000);

    expect(getCurrentAccountId()).toBeNull();
    expect(mockFetchCsrf).not.toHaveBeenCalled();
    expect(readCompletionState()).toEqual({
      identity: 'anonymous',
      navigatedToDashboard: false,
      googleButtonEnabled: true,
      alertCount: 0,
    });
  });

  it.each(['origin', 'nonce'])('rejects an invalid %s without accepting a forged completion', async (invalid) => {
    await startGoogle();
    serverSignedIn = true;
    await confirmGoogle(
      invalid === 'nonce' ? 'wrong-nonce' : TEST_NONCE,
      invalid === 'origin' ? 'https://untrusted.example.test' : window.location.origin,
    );

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.getByTestId('oauth-identity')).toHaveTextContent('anonymous');

    await confirmGoogle();
    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(getCurrentAccountId()).toBe(VERIFIED_USER.id);
    expect(mockPush).toHaveBeenCalledWith('/dashboard');
  });

  it('does not start a second verification for a duplicated success message', async () => {
    await startGoogle();
    serverSignedIn = true;
    await confirmGoogle();
    await confirmGoogle();

    expect(mockGet).toHaveBeenCalledTimes(2); // One bootstrap + one verification.
    expect(mockFetchCsrf).toHaveBeenCalledTimes(1);
    expect(getCurrentAccountId()).toBe(VERIFIED_USER.id);
  });

  it.each([401, 500])('shows a verification error instead of silent success when /me returns %i', async (status) => {
    await startGoogle();
    serverSignedIn = true;
    serverFailureStatus = status;
    await confirmGoogle();

    expect(mockPush).not.toHaveBeenCalled();
    expect(getCurrentAccountId()).toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Reláciu po prihlásení sa nepodarilo overiť. Skús to znova.',
    );
    expect(screen.getByRole('button', { name: /Google/i })).toBeEnabled();
  });
});

describe('Google completion recovery', () => {
  it.each(['missing message', 'late message', 'unreadable popup'])('%s must not leave a newly authenticated session stranded until reload', async (scenario) => {
    const view = await startGoogle();
    serverSignedIn = true;
    popupClosed = true;
    popupReadThrows = scenario === 'unreadable popup';
    await advancePopupClock(1000);
    if (scenario === 'late message') await confirmGoogle();
    await advancePopupClock(3000);

    // This probe is intentionally independent of React: the simulated server
    // confirms the NEW session, without itself updating the application's identity.
    const proof = await api.get(endpoints.auth.me);
    expect(proof.status).toBe(200);
    expect(proof.data.id).toBe(VERIFIED_USER.id);
    const beforeReload = readCompletionState();

    // Simulate the relevant reload effect: a new auth bootstrap against the
    // same server session. This reproduces the reported "reload makes it work".
    view.unmount();
    __resetAuthBootstrapSnapshotForTests();
    mockPush.mockClear();
    mountHome();
    await flush();
    expect(screen.getByTestId('oauth-identity')).toHaveTextContent(String(VERIFIED_USER.id));
    expect(getCurrentAccountId()).toBe(VERIFIED_USER.id);
    expect(mockPush).toHaveBeenCalledWith('/dashboard');

    // Assert automatic recovery before the reload probe, rather than allowing
    // a fresh bootstrap to hide a failed completion.
    expect(beforeReload).toEqual({
      identity: String(VERIFIED_USER.id),
      navigatedToDashboard: true,
      googleButtonEnabled: false,
      alertCount: 0,
    });
  });
});
