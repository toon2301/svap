import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Dashboard from '../Dashboard';
import { User } from '@/types';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock next/navigation s zdieľaným pushMock
const pushMock = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

// Mock auth utils
jest.mock('@/utils/auth', () => ({
  isAuthenticated: jest.fn(() => true),
  clearAuthTokens: jest.fn(),
}));

// Mock API
jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
  endpoints: {
    auth: {
      me: '/auth/me/',
      logout: '/auth/logout/',
    },
  },
}));

const mockUser: User = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  user_type: 'individual',
  is_verified: true,
  is_public: true,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  profile_completeness: 75,
};

describe('Dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    const { isAuthenticated } = require('@/utils/auth');
    isAuthenticated.mockReturnValue(true);
    
    render(<Dashboard />);
    
    expect(screen.getByText('Načítavam dashboard...')).toBeInTheDocument();
  });

  it('renders dashboard with user data', async () => {
    const { isAuthenticated } = require('@/utils/auth');
    const { api } = require('@/lib/api');
    
    isAuthenticated.mockReturnValue(true);
    api.get.mockResolvedValue({ data: mockUser });
    
    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Vitaj v Swaply!')).toBeInTheDocument();
    });
  });

  it('renders with initial user data', async () => {
    // Mock API call (aj keď sa nemal volať)
    const api = require('@/lib/api').api;
    jest.spyOn(api, 'get').mockResolvedValue({ data: mockUser });
    
    render(<Dashboard initialUser={mockUser} />);
    
    // Počkaj na dokončenie useEffect a renderovanie obsahu
    await waitFor(() => {
      expect(screen.getByText('Vitaj v Swaply!')).toBeInTheDocument();
    });
  });

  it('redirects to home when not authenticated', async () => {
    const { isAuthenticated } = require('@/utils/auth');
    isAuthenticated.mockReturnValue(false);
    render(<Dashboard />);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/');
    });
  });

  it('renders sidebar with navigation items', () => {
    const { isAuthenticated } = require('@/utils/auth');
    isAuthenticated.mockReturnValue(true);
    
    render(<Dashboard initialUser={mockUser} />);
    
    expect(screen.getByText('Nástenka')).toBeInTheDocument();
    expect(screen.getByText('Vyhľadávanie')).toBeInTheDocument();
    expect(screen.getByText('Oblúbené')).toBeInTheDocument();
    expect(screen.getByText('Profil')).toBeInTheDocument();
    expect(screen.getByText('Nastavenia')).toBeInTheDocument();
  });

  it('switches modules when sidebar items are clicked', async () => {
    const { isAuthenticated } = require('@/utils/auth');
    isAuthenticated.mockReturnValue(true);
    
    render(<Dashboard initialUser={mockUser} />);
    
    const searchButtons = screen.getAllByText('Vyhľadávanie');
    fireEvent.click(searchButtons[0]);
    await waitFor(() => {
      // There will be a heading with the same text after switching
      expect(screen.getAllByText('Vyhľadávanie').length).toBeGreaterThan(1);
    });
  });

  it('switches to Favorites/Profile/Settings modules', async () => {
    const { isAuthenticated } = require('@/utils/auth');
    isAuthenticated.mockReturnValue(true);

    render(<Dashboard initialUser={mockUser} />);

    fireEvent.click(screen.getByText('Oblúbené'));
    await waitFor(() => {
      expect(screen.getAllByText('Oblúbené').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByText('Profil'));
    await waitFor(() => {
      // Profile module renders avatar initials TU for Test User
      expect(screen.getAllByText('TU').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByText('Nastavenia'));
    await waitFor(() => {
      expect(screen.getByText('Nastavenia')).toBeInTheDocument();
    });
  });

  it('clears tokens and redirects on API error', async () => {
    const { isAuthenticated, clearAuthTokens } = require('@/utils/auth');
    const { api } = require('@/lib/api');
    isAuthenticated.mockReturnValue(true);
    api.get.mockRejectedValue(new Error('network'));
    render(<Dashboard />);

    await waitFor(() => {
      expect(clearAuthTokens).toHaveBeenCalled();
      expect(pushMock).toHaveBeenCalledWith('/');
    });
  });

  it('shows home module by default', () => {
    const { isAuthenticated } = require('@/utils/auth');
    isAuthenticated.mockReturnValue(true);
    
    render(<Dashboard initialUser={mockUser} />);
    // Home module welcome exists
    expect(screen.getAllByText('Vitaj v Swaply!').length).toBeGreaterThan(0);
  });

  it('renders mobile menu button on mobile', () => {
    const { isAuthenticated } = require('@/utils/auth');
    isAuthenticated.mockReturnValue(true);
    
    // Mock window.innerWidth for mobile
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });
    
    render(<Dashboard initialUser={mockUser} />);
    
    // Check for mobile menu button (hamburger icon)
    const mobileMenuButton = document.querySelector('button svg');
    expect(mobileMenuButton).toBeInTheDocument();
  });

  it('opens mobile menu when hamburger is clicked', () => {
    const { isAuthenticated } = require('@/utils/auth');
    isAuthenticated.mockReturnValue(true);
    
    render(<Dashboard initialUser={mockUser} />);
    
    const mobileMenuButton = document.querySelector('button svg');
    fireEvent.click(mobileMenuButton!.closest('button')!);
    
    // Mobile sidebar should be visible
    const mobileSidebar = document.querySelector('.fixed.left-0');
    expect(mobileSidebar).toBeInTheDocument();
  });

  it('renders logout button', () => {
    const { isAuthenticated } = require('@/utils/auth');
    isAuthenticated.mockReturnValue(true);
    
    render(<Dashboard initialUser={mockUser} />);
    
    expect(screen.getByText('Odhlásiť sa')).toBeInTheDocument();
  });

  it('calls logout when logout button is clicked', async () => {
    const { isAuthenticated } = require('@/utils/auth');
    const { api } = require('@/lib/api');
    const { clearAuthTokens } = require('@/utils/auth');
    
    isAuthenticated.mockReturnValue(true);
    api.post.mockResolvedValue({});
    
    render(<Dashboard initialUser={mockUser} />);
    
    const logoutButton = screen.getByText('Odhlásiť sa');
    fireEvent.click(logoutButton);
    
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/logout/', {
        refresh: null,
      });
      expect(clearAuthTokens).toHaveBeenCalled();
    });
  });

  it('shows welcome message in home module', () => {
    const { isAuthenticated } = require('@/utils/auth');
    isAuthenticated.mockReturnValue(true);
    
    render(<Dashboard initialUser={mockUser} />);
    
    expect(screen.getByText('Vitaj v Swaply!')).toBeInTheDocument();
  });
});
