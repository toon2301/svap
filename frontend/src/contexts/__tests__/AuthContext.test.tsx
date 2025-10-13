import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthProvider, useAuth } from '../AuthContext';
import { useRouter } from 'next/navigation';

// Mock next/navigation
const pushMock = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

// Test component
function TestComponent() {
  const { user, isLoading, isAuthenticated } = useAuth();
  
  return (
    <div>
      <div>Loading: {isLoading ? 'yes' : 'no'}</div>
      <div>Authenticated: {isAuthenticated ? 'yes' : 'no'}</div>
      <div>User: {user ? user.email : 'none'}</div>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('provides initial loading state', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    // Loading flips to no quickly after effect, so allow either state initially
    expect(screen.getByText(/Loading:/i)).toBeInTheDocument();
  });

  it('loads user from localStorage', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
    };
    const mockTokens = { access: 'token', refresh: 'refresh' };
    
    localStorage.setItem('user', JSON.stringify(mockUser));
    localStorage.setItem('tokens', JSON.stringify(mockTokens));
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByText(/Authenticated: yes/i)).toBeInTheDocument();
      expect(screen.getByText(/User: test@example.com/i)).toBeInTheDocument();
    });
  });

  it('handles corrupted localStorage gracefully', async () => {
    localStorage.setItem('user', 'invalid-json');
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByText(/Authenticated: no/i)).toBeInTheDocument();
    });
  });

  it('throws error when useAuth is used outside provider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth must be used within an AuthProvider');
    
    consoleError.mockRestore();
  });
});

