/**
 * Testy pre LoginForm komponent
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import LoginForm from '../LoginForm';
import { api } from '@/lib/api';
import { fetchCsrfToken, hasCsrfToken } from '@/utils/csrf';
import { useAuth } from '@/contexts/AuthContext';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/utils/csrf', () => ({
  fetchCsrfToken: jest.fn(),
  hasCsrfToken: jest.fn(),
}));

// Mock API
jest.mock('@/lib/api', () => ({
  api: {
    post: jest.fn(),
    defaults: {
      baseURL: '',
    },
  },
  endpoints: {
    auth: {
      login: '/auth/login/',
    },
  },
}));

const mockPush = jest.fn();
const mockApiPost = api.post as jest.MockedFunction<typeof api.post>;
const mockFetchCsrfToken = fetchCsrfToken as jest.MockedFunction<typeof fetchCsrfToken>;
const mockHasCsrfToken = hasCsrfToken as jest.MockedFunction<typeof hasCsrfToken>;
const mockRefreshUser = jest.fn();

describe('LoginForm', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    (useAuth as jest.Mock).mockReturnValue({
      refreshUser: mockRefreshUser,
    });
    mockApiPost.mockClear();
    mockFetchCsrfToken.mockClear();
    mockHasCsrfToken.mockReset();
    mockHasCsrfToken.mockReturnValue(true);
    mockRefreshUser.mockReset();
    mockRefreshUser.mockResolvedValue(undefined);
    mockPush.mockClear();
  });

  it('renders login form correctly', () => {
    render(<LoginForm />);
    
    expect(screen.getByRole('heading', { name: 'Prihlásiť sa' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Heslo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Prihlásiť sa' })).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(<LoginForm />);
    
    const submitButton = screen.getByRole('button', { name: 'Prihlásiť sa' });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Email je povinný')).toBeInTheDocument();
      expect(screen.getByText('Heslo je povinné')).toBeInTheDocument();
    });
  });

  it('validates email format', async () => {
    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Heslo');
    const submitButton = screen.getByRole('button', { name: 'Prihlásiť sa' });
    
    // Vyplň email s neplatným formátom
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    // Vyplň heslo
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    // Klikni submit
    fireEvent.click(submitButton);
    
    // Skontroluj, či sa form neodoslal (API sa nevolá)
    expect(mockApiPost).not.toHaveBeenCalled();
  });

  it('handles successful login', async () => {
    const mockResponse = {
      data: {
        tokens: {
          access: 'access_token',
          refresh: 'refresh_token',
        },
      },
    };
    
    mockApiPost.mockResolvedValueOnce(mockResponse);
    
    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Heslo');
    const submitButton = screen.getByRole('button', { name: 'Prihlásiť sa' });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith('/auth/login/', {
        email: 'test@example.com',
        password: 'password123',
      });
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('handles login error', async () => {
    const mockError = {
      response: {
        data: {
          details: {
            email: 'Neplatný email',
          },
        },
      },
    };
    
    mockApiPost.mockRejectedValueOnce(mockError);
    
    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Heslo');
    const submitButton = screen.getByRole('button', { name: 'Prihlásiť sa' });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      // Komponent zobrazuje konzistentnú general chybu pri neplatných prihlasovacích údajoch
      expect(screen.getByText('Neplatné prihlasovacie údaje.')).toBeInTheDocument();
    });
  });

  it('toggles password visibility', () => {
    render(<LoginForm />);
    const passwordInput = screen.getByLabelText('Heslo') as HTMLInputElement;
    const toggleButton = screen.getByRole('button', { name: 'Zobraziť heslo' });
    expect(passwordInput.type).toBe('password');
    fireEvent.click(toggleButton);
    expect(passwordInput.type).toBe('text');
    const hideButton = screen.getByRole('button', { name: 'Skryť heslo' });
    fireEvent.click(hideButton);
    expect(passwordInput.type).toBe('password');
  });

  it('shows loading state during login', async () => {
    // Mock slow API response
    mockApiPost.mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve({ data: {} }), 100))
    );
    
    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Heslo');
    const submitButton = screen.getByRole('button', { name: 'Prihlásiť sa' });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);
    
    expect(screen.getByText('Prihlasujem sa...')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  it('primes CSRF after successful Google login before redirecting to dashboard', async () => {
    const popup = { closed: false } as Window;
    const openSpy = jest.spyOn(window, 'open').mockReturnValue(popup);
    const originalCrypto = global.crypto;
    Object.defineProperty(global, 'crypto', {
      value: {
        ...(originalCrypto || {}),
        randomUUID: () => 'oauth-nonce',
      },
      configurable: true,
    });
    mockHasCsrfToken.mockReturnValue(false);

    render(<LoginForm />);

    fireEvent.click(screen.getByRole('button', { name: /Google/i }));

    window.dispatchEvent(
      new MessageEvent('message', {
        origin: window.location.origin,
        data: {
          type: 'OAUTH_SUCCESS',
          nonce: 'oauth-nonce',
        },
      }),
    );

    await waitFor(() => {
      expect(mockRefreshUser).toHaveBeenCalledWith({ force: true });
      expect(mockFetchCsrfToken).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });

    openSpy.mockRestore();
    Object.defineProperty(global, 'crypto', {
      value: originalCrypto,
      configurable: true,
    });
  });
});
