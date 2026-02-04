/**
 * Testy pre VerifyEmailPage komponent
 */
import { render, screen, waitFor } from '@testing-library/react';
import { useSearchParams } from 'next/navigation';
import VerifyEmailPage from '../../app/verify-email/page';
import { api } from '@/lib/api';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
  useRouter: () => ({ push: jest.fn() }),
}));

// Mock API
jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn(),
  },
  endpoints: {
    auth: {
      verifyEmail: '/auth/verify-email/',
    },
  },
}));

const mockUseSearchParams = useSearchParams as jest.MockedFunction<typeof useSearchParams>;
const mockApiGet = api.get as jest.MockedFunction<typeof api.get>;

describe('VerifyEmailPage', () => {
  beforeEach(() => {
    mockApiGet.mockClear();
  });

  it('renders loading state initially', () => {
    mockUseSearchParams.mockReturnValue({
      get: jest.fn().mockReturnValue('test-token'),
    } as any);

    render(<VerifyEmailPage />);
    
    expect(screen.getByText('Overujem email...')).toBeInTheDocument();
    expect(screen.getByText('Prosím počkajte, overujem váš email...')).toBeInTheDocument();
  });

  it('renders success state when verification succeeds', async () => {
    mockUseSearchParams.mockReturnValue({
      get: jest.fn().mockReturnValue('test-token'),
    } as any);

    mockApiGet.mockResolvedValueOnce({
      data: {
        verified: true,
        message: 'Email bol úspešne overený'
      }
    });

    render(<VerifyEmailPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Email bol úspešne overený!')).toBeInTheDocument();
    });

    expect(screen.getByText('Váš email bol úspešne overený. Teraz sa môžete prihlásiť do svojho účtu.')).toBeInTheDocument();
    expect(screen.getByText('Prihlásiť sa')).toBeInTheDocument();
  });

  it('renders error state when verification fails', async () => {
    mockUseSearchParams.mockReturnValue({
      get: jest.fn().mockReturnValue('test-token'),
    } as any);

    mockApiGet.mockRejectedValueOnce({
      response: {
        data: {
          error: 'Token expiroval'
        }
      }
    });

    render(<VerifyEmailPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Chyba pri overovaní')).toBeInTheDocument();
    });

    expect(screen.getByText('Token expiroval')).toBeInTheDocument();
    expect(screen.getByText('Registrovať sa znovu')).toBeInTheDocument();
    expect(screen.getByText('Späť na hlavnú stránku')).toBeInTheDocument();
  });

  it('renders error state when no token provided', async () => {
    mockUseSearchParams.mockReturnValue({
      get: jest.fn().mockReturnValue(null),
    } as any);

    render(<VerifyEmailPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Chyba')).toBeInTheDocument();
    });

    expect(screen.getByText('Chýba verifikačný token')).toBeInTheDocument();
  });

  it('handles API error with details', async () => {
    mockUseSearchParams.mockReturnValue({
      get: jest.fn().mockReturnValue('test-token'),
    } as any);

    mockApiGet.mockRejectedValueOnce({
      response: {
        data: {
          details: {
            token: ['Token už bol použitý']
          }
        }
      }
    });

    render(<VerifyEmailPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Chyba pri overovaní')).toBeInTheDocument();
    });

    expect(screen.getByText('Token už bol použitý')).toBeInTheDocument();
  });

  it('handles generic API error', async () => {
    mockUseSearchParams.mockReturnValue({
      get: jest.fn().mockReturnValue('test-token'),
    } as any);

    mockApiGet.mockRejectedValueOnce(new Error('Network error'));

    render(<VerifyEmailPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Chyba pri overovaní')).toBeInTheDocument();
    });

    expect(screen.getByText('Nepodarilo sa overiť email')).toBeInTheDocument();
  });

  it('calls API with correct token', async () => {
    const testToken = 'test-token-123';
    mockUseSearchParams.mockReturnValue({
      get: jest.fn().mockReturnValue(testToken),
    } as any);

    mockApiGet.mockResolvedValueOnce({
      data: {
        verified: true
      }
    });

    render(<VerifyEmailPage />);
    
    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith('/auth/verify-email/', {
        params: { token: testToken },
      });
    });
  });
});
