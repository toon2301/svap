import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';

import { AuthProvider, __resetAuthBootstrapSnapshotForTests, useAuth } from '../AuthContext';
import { api, invalidateSession, isTransientAuthFailureError } from '@/lib/api';
import { fetchCsrfToken, hasCsrfToken } from '@/utils/csrf';

const push = jest.fn();
const replace = jest.fn();

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

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((finish) => { resolve = finish; });
  return { promise, resolve };
}

function SessionControls() {
  const { user: currentUser, isLoading, login, logout, refreshUser } = useAuth();
  const [loginError, setLoginError] = useState(false);

  return (
    <>
      <span data-testid="identity">{isLoading ? 'loading' : currentUser?.email ?? 'anonymous'}</span>
      <span data-testid="login-error">{loginError ? 'failed' : 'none'}</span>
      <button onClick={() => void login(user.email, 'test-password').catch(() => setLoginError(true))}>
        Login
      </button>
      <button onClick={logout}>Logout</button>
      <button onClick={() => void refreshUser({ force: true })}>Refresh</button>
    </>
  );
}

function mount() {
  render(<AuthProvider><SessionControls /></AuthProvider>);
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
    get.mockRejectedValueOnce(new Error('temporary network failure'));

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
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

  it('does not navigate after login when its /me check is superseded', async () => {
    mount();
    await screen.findByText('anonymous');
    const loginCheck = deferred<unknown>();
    get.mockImplementationOnce(() => loginCheck.promise);
    get.mockResolvedValueOnce({ status: 200, data: user });

    fireEvent.click(screen.getByRole('button', { name: 'Login' }));
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await screen.findByText(user.email);

    await act(async () => {
      loginCheck.resolve({ status: 200, data: user });
      await loginCheck.promise;
    });
    await screen.findByText('failed');
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

  it('cancels an in-flight /me request during logout', async () => {
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

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));

    expect(abortObserved).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('identity')).toHaveTextContent('anonymous');
  });
});
