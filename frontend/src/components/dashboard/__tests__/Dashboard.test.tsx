import type { ReactElement } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Dashboard from '../Dashboard';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider, __resetAuthBootstrapSnapshotForTests } from '@/contexts/AuthContext';
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
const replaceMock = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
  usePathname: () => '/dashboard',
}));

// Mock auth utils
jest.mock('@/utils/auth', () => ({
  isAuthenticated: jest.fn(() => true),
  clearAuthState: jest.fn(),
}));

// Mock API – vrátane pomocníkov, ktoré používa reálny AuthProvider.
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

// CSRF helpers používané pri logout flow v AuthProvideri.
jest.mock('@/utils/csrf', () => ({
  fetchCsrfToken: jest.fn(),
  hasCsrfToken: jest.fn(() => true),
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

// Reálny AuthProvider – testy spoliehajú na jeho bootstrap (/me), redirect aj
// logout logiku. Snapshot resetujeme medzi testami, aby každý začal z čistého
// auth stavu (inak by sa /me bootstrap preskočil z predošlého testu).
const renderDashboard = (ui: ReactElement) => render(<AuthProvider>{ui}</AuthProvider>);

describe('Dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetAuthBootstrapSnapshotForTests();
  });

  it('renders loading state initially', () => {
    const { isAuthenticated } = require('@/utils/auth');
    isAuthenticated.mockReturnValue(true);
    
    renderDashboard(<ThemeProvider><Dashboard /></ThemeProvider>);
    
    expect(screen.getByText('Načítavam dashboard...')).toBeInTheDocument();
  });

  it('renders dashboard with user data', async () => {
    const { isAuthenticated } = require('@/utils/auth');
    const { api } = require('@/lib/api');
    
    isAuthenticated.mockReturnValue(true);
    // /auth/me/ reálne vracia status 200 – AuthProvider ho vyžaduje na nastavenie usera.
    api.get.mockResolvedValue({ status: 200, data: mockUser });

    renderDashboard(<ThemeProvider><Dashboard /></ThemeProvider>);

    await waitFor(() => {
      expect(screen.getByText('Vitaj v Swaply!')).toBeInTheDocument();
    });
  });

  it('renders with initial user data', async () => {
    // Mock API call (aj keď sa nemal volať)
    const api = require('@/lib/api').api;
    jest.spyOn(api, 'get').mockResolvedValue({ data: mockUser });
    
    renderDashboard(<ThemeProvider><Dashboard initialUser={mockUser} /></ThemeProvider>);
    
    // Počkaj na dokončenie useEffect a renderovanie obsahu
    await waitFor(() => {
      expect(screen.getByText('Vitaj v Swaply!')).toBeInTheDocument();
    });
  });

  it('redirects to home when not authenticated', async () => {
    const { isAuthenticated } = require('@/utils/auth');
    isAuthenticated.mockReturnValue(false);
    renderDashboard(<ThemeProvider><Dashboard /></ThemeProvider>);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/');
    });
  });

  it('renders sidebar with navigation items', () => {
    const { isAuthenticated } = require('@/utils/auth');
    isAuthenticated.mockReturnValue(true);
    
    renderDashboard(<ThemeProvider><Dashboard initialUser={mockUser} /></ThemeProvider>);

    // Položky sa môžu vyskytovať aj v obsahu home modulu, preto getAllByText
    // (rovnaký vzor ako test prepínania modulov nižšie).
    expect(screen.getAllByText('Nástenka').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Vyhľadávanie').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Obľúbené').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Profil').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Nastavenia').length).toBeGreaterThan(0);
  });

  it('switches to Favorites/Profile/Settings modules', async () => {
    const { isAuthenticated } = require('@/utils/auth');
    isAuthenticated.mockReturnValue(true);

    renderDashboard(<ThemeProvider><Dashboard initialUser={mockUser} /></ThemeProvider>);

    fireEvent.click(screen.getByText('Obľúbené'));
    await waitFor(() => {
      expect(screen.getAllByText('Obľúbené').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByText('Profil'));
    await waitFor(() => {
      // Profile module renders avatar initials TU for Test User
      expect(screen.getAllByText('TU').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByText('Nastavenia'));
    // obsah nastaví nadpis Nastavenia, nemusíme čakať na animáciu
    expect(screen.getAllByText('Nastavenia').length).toBeGreaterThan(0);
  });

  it('clears tokens and redirects on API error', async () => {
    const { isAuthenticated, clearAuthState } = require('@/utils/auth');
    const { api } = require('@/lib/api');
    isAuthenticated.mockReturnValue(true);
    api.get.mockRejectedValue(new Error('network'));
    renderDashboard(<Dashboard />);

    // AuthProvider pri sieťovej chybe /me skúša bootstrap viackrát (retry s
    // backoffom), takže redirect prichádza neskôr – necháme dlhší timeout.
    await waitFor(() => {
      expect(clearAuthState).toHaveBeenCalled();
      expect(pushMock).toHaveBeenCalledWith('/');
    }, { timeout: 3000 });
  });

  it('shows home module by default', () => {
    const { isAuthenticated } = require('@/utils/auth');
    isAuthenticated.mockReturnValue(true);
    
    renderDashboard(<ThemeProvider><Dashboard initialUser={mockUser} /></ThemeProvider>);
    // Home module welcome exists (fallback v t() zaručí text)
    expect(screen.getByText('Vyber si sekciu z navigácie pre pokračovanie.')).toBeInTheDocument();
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
    
    renderDashboard(<ThemeProvider><Dashboard initialUser={mockUser} /></ThemeProvider>);
    
    // Check for mobile menu button (hamburger icon)
    const mobileMenuButton = document.querySelector('button svg');
    expect(mobileMenuButton).toBeInTheDocument();
  });

  it('opens mobile menu when hamburger is clicked', () => {
    const { isAuthenticated } = require('@/utils/auth');
    isAuthenticated.mockReturnValue(true);
    
    renderDashboard(<ThemeProvider><Dashboard initialUser={mockUser} /></ThemeProvider>);
    
    const mobileMenuButton = document.querySelector('button svg');
    fireEvent.click(mobileMenuButton!.closest('button')!);
    
    // Mobile sidebar should be visible
    const mobileSidebar = document.querySelector('.fixed.left-0');
    expect(mobileSidebar).toBeInTheDocument();
  });

  it('renders logout button', () => {
    const { isAuthenticated } = require('@/utils/auth');
    isAuthenticated.mockReturnValue(true);
    
    renderDashboard(<ThemeProvider><Dashboard initialUser={mockUser} /></ThemeProvider>);
    
    expect(screen.getByText('Odhlásiť sa')).toBeInTheDocument();
  });

  it('calls logout when logout button is clicked', async () => {
    const { isAuthenticated } = require('@/utils/auth');
    const { api } = require('@/lib/api');
    const { clearAuthState } = require('@/utils/auth');
    
    isAuthenticated.mockReturnValue(true);
    api.post.mockResolvedValue({});
    
    renderDashboard(<ThemeProvider><Dashboard initialUser={mockUser} /></ThemeProvider>);
    
    const logoutButton = screen.getByText('Odhlásiť sa');
    fireEvent.click(logoutButton);
    
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/logout/', {});
      expect(clearAuthState).toHaveBeenCalled();
    });
  });

  it('shows welcome message in home module', () => {
    const { isAuthenticated } = require('@/utils/auth');
    isAuthenticated.mockReturnValue(true);
    
    renderDashboard(<ThemeProvider><Dashboard initialUser={mockUser} /></ThemeProvider>);
    
    expect(screen.getAllByText('Vitaj v Swaply!').length).toBeGreaterThan(0);
  });
});
