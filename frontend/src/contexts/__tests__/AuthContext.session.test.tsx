import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';

import { AuthProvider, __resetAuthBootstrapSnapshotForTests, useAuth } from '../AuthContext';
import { api, invalidateSession, isTransientAuthFailureError } from '@/lib/api';
import { fetchCsrfToken, hasCsrfToken } from '@/utils/csrf';
import { getCurrentAccountId } from '@/lib/currentAccount';
import { SessionVerificationError } from '@/lib/authSessionVerification';

const push = jest.fn();
const replace = jest.fn();
const loginFailures = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
}));

jest.mock('@/lib/api', () => ({
  api: { get: jest.fn(), post: jest.fn() },
  endpoints: { auth: { me: '/auth/me/', login: '/auth/login/', logout: '/auth/logout/' } },
  invalidateSession: jest.fn(),
  isTransientAuthFailureError: jest.fn(() => false),
  setMayHaveRefreshCookie: jest.fn(),
}));

jest.mock('@/utils/csrf', () => ({
  fetchCsrfToken: jest.fn(),
  hasCsrfToken: jest.fn(),
}));

jest.mock('@/utils/auth', () => ({ clearAuthState: jest.fn() }));

const get = api.get as jest.Mock;
const post = api.post as jest.Mock;
const csrf = fetchCsrfToken as jest.Mock;
const hasCsrf = hasCsrfToken as jest.Mock;
const isTransient = isTransientAuthFailureError as jest.Mock;

const user = { id: 71, email: 'session@example.com', is_verified: true };

/** Control when a mocked /me request settles so race assertions are deterministic. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((finish, fail) => {
    resolve = finish;
    reject = fail;
  });
  return { promise, resolve, reject };
}

/** Expose auth actions and resolved identity to the session lifecycle tests. */
function SessionControls() {
  const { user: currentUser, isLoading, login, logout, refreshUser } = useAuth();
  const [loginError, setLoginError] = useState(false);

  return (
    <>
      <span data-testid="identity">{isLoading ? 'loading' : currentUser?.email ?? 'anonymous'}</span>
      <span data-testid="login-error">{loginError ? 'failed' : 'none'}</span>
      <button onClick={() => void login(user.email, 'test-password').catch((error) => {
        loginFailures(error);
        setLoginError(true);
      })}>
        Login
      </button>
      <button onClick={logout}>Logout</button>
      <button onClick={() => void refreshUser({ force: true })}>Refresh</button>
    </>
  );
}

/** Mount a fresh auth provider with the test controls. */
function mount() {
  return render(<AuthProvider><SessionControls /></AuthProvider>);
}

describe('AuthContext session lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetAuthBootstrapSnapshotForTests();
    localStorage.clear();
    sessionStorage.clear();
    get.mockRejectedValue({ response: { status: 401 } });
    post.mockResolvedValue({ status: 200, data: {} });
    csrf.mockResolvedValue(undefined);
    hasCsrf.mockReturnValue(true);
    isTransient.mockReturnValue(false);
  });

  it('fetches CSRF, verifies /me and only then navigates after login', async () => {
    hasCsrf.mockReturnValue(false);
    get.mockRejectedValueOnce({ response: { status: 401 } });
    mount();
    await screen.findByText('anonymous');
    get.mockResolvedValueOnce({ status: 200, data: user });

    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard'));
    expect(csrf).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith('/auth/login/', {
      email: user.email,
      password: 'test-password',
    });
    expect(screen.getByTestId('identity')).toHaveTextContent(user.email);
    expect(localStorage.getItem('activeModule')).toBe('home');
    expect(sessionStorage.getItem('forceHome')).toBe('1');
  });

  it('does not navigate or authenticate when login request is rejected', async () => {
    mount();
    await screen.findByText('anonymous');
    post.mockRejectedValueOnce({ response: { status: 400 } });

    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    await screen.findByText('failed');
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByTestId('identity')).toHaveTextContent('anonymous');
  });

  it('keeps the authenticated identity after a temporary /me failure', async () => {
    get.mockResolvedValueOnce({ status: 200, data: user });
    mount();
    await screen.findByText(user.email);
    isTransient.mockReturnValue(true);
    const failure = new Error('temporary network failure');
    const request = deferred<unknown>();
    get.mockImplementationOnce(() => request.promise);

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    await act(async () => {
      request.reject(failure);
      await request.promise.catch(() => undefined);
    });
    await waitFor(() => expect(isTransient).toHaveBeenCalledWith(failure));
    expect(screen.getByTestId('identity')).toHaveTextContent(user.email);
    expect(replace).not.toHaveBeenCalled();
  });

  it('ignores an older /me response after a newer refresh completed', async () => {
    get.mockResolvedValueOnce({ status: 200, data: user });
    mount();
    await screen.findByText(user.email);
    const oldRequest = deferred<unknown>();
    const newRequest = deferred<unknown>();
    get.mockImplementationOnce(() => oldRequest.promise);
    get.mockImplementationOnce(() => newRequest.promise);

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(get).toHaveBeenCalledTimes(3));

    await act(async () => {
      newRequest.resolve({ status: 200, data: { ...user, email: 'new@example.com' } });
      await newRequest.promise;
    });
    await screen.findByText('new@example.com');
    await act(async () => {
      oldRequest.resolve({ status: 200, data: { ...user, email: 'old@example.com' } });
      await oldRequest.promise;
    });

    expect(screen.getByTestId('identity')).toHaveTextContent('new@example.com');
  });

  it('keeps local logout final even if both server logout attempts fail', async () => {
    get.mockResolvedValueOnce({ status: 200, data: user });
    mount();
    await screen.findByText(user.email);
    post.mockRejectedValue(new Error('network offline'));

    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    expect(post).toHaveBeenCalledTimes(2);
    expect(invalidateSession).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('identity')).toHaveTextContent('anonymous');
  });

  it('does not start another /me request while logout is pending', async () => {
    get.mockResolvedValueOnce({ status: 200, data: user });
    mount();
    await screen.findByText(user.email);
    const logoutRequest = deferred<unknown>();
    post.mockImplementationOnce(() => logoutRequest.promise);

    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(get).toHaveBeenCalledTimes(1);

    await act(async () => {
      logoutRequest.resolve({ status: 200, data: {} });
      await logoutRequest.promise;
    });
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
  });

  it('does not navigate after login when /me rejects the new session', async () => {
    get.mockRejectedValueOnce({ response: { status: 401 } });
    mount();
    await screen.findByText('anonymous');
    get.mockRejectedValueOnce({ response: { status: 401 } });

    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    await screen.findByText('failed');
    expect(push).not.toHaveBeenCalled();
    expect(localStorage.getItem('activeModule')).toBeNull();
    expect(sessionStorage.getItem('forceHome')).toBeNull();
  });

  it('does not navigate after login when /me returns no user', async () => {
    mount();
    await screen.findByText('anonymous');
    get.mockResolvedValueOnce({ status: 200, data: null });

    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    await screen.findByText('failed');
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByTestId('identity')).toHaveTextContent('anonymous');
  });

  it('reports a verification error when an anonymous login /me request rejects', async () => {
    mount();
    await screen.findByText('anonymous');
    get.mockRejectedValueOnce(new Error('network unavailable'));

    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    await screen.findByText('failed');
    expect(loginFailures).toHaveBeenCalledWith(expect.any(SessionVerificationError));
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByTestId('identity')).toHaveTextContent('anonymous');
    expect(getCurrentAccountId()).toBeNull();
  });

  it.each([
    ['401', { response: { status: 401 } }, false],
    ['a temporary failure', new Error('temporary network failure'), true],
    ['500', { response: { status: 500 } }, false],
    ['403', { response: { status: 403 } }, false],
    ['cancellation', { code: 'ERR_CANCELED' }, false],
  ])('clears the previous identity when the current login /me fails with %s', async (_label, failure, transient) => {
    get.mockResolvedValueOnce({ status: 200, data: user });
    mount();
    await screen.findByText(user.email);
    isTransient.mockReturnValue(transient);
    get.mockRejectedValueOnce(failure);

    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    await screen.findByText('failed');
    expect(push).not.toHaveBeenCalled();
    expect(localStorage.getItem('activeModule')).toBeNull();
    expect(screen.getByTestId('identity')).toHaveTextContent('anonymous');
    expect(getCurrentAccountId()).toBeNull();
    expect(loginFailures).toHaveBeenCalledWith(expect.any(SessionVerificationError));
  });

  it('does not reuse an existing user when login /me returns an empty response', async () => {
    get.mockResolvedValueOnce({ status: 200, data: user });
    mount();
    await screen.findByText(user.email);
    get.mockResolvedValueOnce({ status: 200, data: null });

    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    await screen.findByText('failed');
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByTestId('identity')).toHaveTextContent('anonymous');
    expect(getCurrentAccountId()).toBeNull();
  });

  it('clears the previous identity from the bootstrap snapshot after failed verification', async () => {
    get.mockResolvedValueOnce({ status: 200, data: user });
    const view = mount();
    await screen.findByText(user.email);
    expect(getCurrentAccountId()).toBe(user.id);
    get.mockRejectedValueOnce(new Error('temporary network failure'));

    fireEvent.click(screen.getByRole('button', { name: 'Login' }));
    await screen.findByText('failed');
    view.unmount();
    mount();

    expect(screen.getByTestId('identity')).toHaveTextContent('anonymous');
    expect(getCurrentAccountId()).toBeNull();
    expect(get).toHaveBeenCalledTimes(2);
  });

  it.each(['response', 'rejection'])('preserves a newer confirmed identity after a superseded login %s', async (completion) => {
    get.mockResolvedValueOnce({ status: 200, data: user });
    const view = mount();
    await screen.findByText(user.email);
    const loginCheck = deferred<unknown>();
    const nextUser = { ...user, id: 72, email: 'next@example.com' };
    get.mockImplementationOnce(() => loginCheck.promise);
    get.mockResolvedValueOnce({ status: 200, data: nextUser });

    fireEvent.click(screen.getByRole('button', { name: 'Login' }));
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await screen.findByText(nextUser.email);

    await act(async () => {
      if (completion === 'response') {
        loginCheck.resolve({ status: 200, data: user });
      } else {
        loginCheck.reject(new Error('old request failed'));
      }
      await loginCheck.promise.catch(() => undefined);
    });
    await screen.findByText('failed');
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByTestId('identity')).toHaveTextContent(nextUser.email);
    expect(getCurrentAccountId()).toBe(nextUser.id);

    view.unmount();
    mount();
    expect(screen.getByTestId('identity')).toHaveTextContent(nextUser.email);
  });

  it('clears stale identity if a newer background request also fails to verify it', async () => {
    get.mockResolvedValueOnce({ status: 200, data: user });
    mount();
    await screen.findByText(user.email);
    const loginCheck = deferred<unknown>();
    const backgroundCheck = deferred<unknown>();
    get.mockImplementationOnce(() => loginCheck.promise);
    get.mockImplementationOnce(() => backgroundCheck.promise);
    isTransient.mockReturnValue(true);

    fireEvent.click(screen.getByRole('button', { name: 'Login' }));
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(get).toHaveBeenCalledTimes(3));
    await act(async () => {
      backgroundCheck.reject(new Error('newer request failed'));
      await backgroundCheck.promise.catch(() => undefined);
    });
    await act(async () => {
      loginCheck.reject(new Error('login verification failed'));
      await loginCheck.promise.catch(() => undefined);
    });

    await screen.findByText('failed');
    expect(screen.getByTestId('identity')).toHaveTextContent('anonymous');
    expect(getCurrentAccountId()).toBeNull();
    expect(push).not.toHaveBeenCalled();
  });

  it('keeps background refresh best-effort when an existing session gets 401', async () => {
    get.mockResolvedValueOnce({ status: 200, data: user });
    mount();
    await screen.findByText(user.email);
    get.mockRejectedValueOnce({ response: { status: 401 } });

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    await screen.findByText('anonymous');
    expect(push).not.toHaveBeenCalled();
  });

  it.each(['Refresh', 'Login'])('cancels an in-flight %s /me request during logout', async (action) => {
    get.mockResolvedValueOnce({ status: 200, data: user });
    mount();
    await screen.findByText(user.email);
    const abortObserved = jest.fn();
    get.mockImplementationOnce((_url, config) => new Promise((_resolve, reject) => {
      config.signal.addEventListener('abort', () => {
        abortObserved();
        reject(Object.assign(new Error('request canceled'), { code: 'ERR_CANCELED' }));
      }, { once: true });
    }));

    fireEvent.click(screen.getByRole('button', { name: action }));
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));

    expect(abortObserved).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('identity')).toHaveTextContent('anonymous');
    expect(getCurrentAccountId()).toBeNull();
  });
});
