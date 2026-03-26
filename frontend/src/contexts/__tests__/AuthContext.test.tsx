import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import { AuthProvider, useAuth } from '../AuthContext';
import { api, endpoints, invalidateSession } from '@/lib/api';
import { clearAuthState } from '@/utils/auth';
import { fetchCsrfToken, hasCsrfToken } from '@/utils/csrf';

const replaceMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: replaceMock,
  }),
}));

jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
  endpoints: {
    auth: {
      me: '/auth/me/',
      logout: '/auth/logout/',
      login: '/auth/login/',
      register: '/auth/register/',
    },
  },
  invalidateSession: jest.fn(),
  isTransientAuthFailureError: jest.fn(() => false),
  setMayHaveRefreshCookie: jest.fn(),
}));

jest.mock('@/utils/auth', () => ({
  clearAuthState: jest.fn(),
}));

jest.mock('@/utils/csrf', () => ({
  fetchCsrfToken: jest.fn(),
  hasCsrfToken: jest.fn(),
}));

const mockApiGet = api.get as jest.MockedFunction<typeof api.get>;
const mockApiPost = api.post as jest.MockedFunction<typeof api.post>;
const mockInvalidateSession = invalidateSession as jest.MockedFunction<typeof invalidateSession>;
const mockClearAuthState = clearAuthState as jest.MockedFunction<typeof clearAuthState>;
const mockFetchCsrfToken = fetchCsrfToken as jest.MockedFunction<typeof fetchCsrfToken>;
const mockHasCsrfToken = hasCsrfToken as jest.MockedFunction<typeof hasCsrfToken>;

function TestConsumer() {
  const { isLoading, isAuthenticated, logout } = useAuth();

  return (
    <div>
      <div>Loading: {isLoading ? 'yes' : 'no'}</div>
      <div>Authenticated: {isAuthenticated ? 'yes' : 'no'}</div>
      <button type="button" onClick={logout}>
        Logout
      </button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    mockApiGet.mockRejectedValue({ response: { status: 401 } });
    mockApiPost.mockResolvedValue({ status: 200, data: {} } as any);
    mockFetchCsrfToken.mockResolvedValue(undefined);
    mockHasCsrfToken.mockReturnValue(true);
  });

  it('provides initial bootstrap state and resolves anonymous session', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    expect(screen.getByText(/Loading:/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Loading: no')).toBeInTheDocument();
      expect(screen.getByText('Authenticated: no')).toBeInTheDocument();
    });
  });

  it('logout fetches CSRF token before server logout when token is missing', async () => {
    mockHasCsrfToken.mockReturnValue(false);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Loading: no')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));

    await waitFor(() => {
      expect(mockInvalidateSession).toHaveBeenCalledTimes(1);
      expect(mockFetchCsrfToken).toHaveBeenCalledTimes(1);
      expect(mockApiPost).toHaveBeenCalledWith(endpoints.auth.logout, {});
      expect(mockClearAuthState).toHaveBeenCalledTimes(1);
      expect(replaceMock).toHaveBeenCalledWith('/');
    });
  });

  it('logout retries once after refreshing CSRF when first server logout fails', async () => {
    mockHasCsrfToken.mockReturnValue(false);
    mockApiPost
      .mockRejectedValueOnce({ response: { status: 403 } })
      .mockResolvedValueOnce({ status: 200, data: {} } as any);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Loading: no')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));

    await waitFor(() => {
      expect(mockFetchCsrfToken).toHaveBeenCalledTimes(2);
      expect(mockApiPost).toHaveBeenCalledTimes(2);
      expect(mockApiPost).toHaveBeenNthCalledWith(1, endpoints.auth.logout, {});
      expect(mockApiPost).toHaveBeenNthCalledWith(2, endpoints.auth.logout, {});
      expect(mockClearAuthState).toHaveBeenCalledTimes(1);
      expect(replaceMock).toHaveBeenCalledWith('/');
    });
  });

  it('throws error when useAuth is used outside provider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestConsumer />);
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleError.mockRestore();
  });
});
