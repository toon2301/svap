import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import Dashboard from '../Dashboard';
import { User } from '../../../types';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock auth utils
jest.mock('../../../utils/auth', () => ({
  isAuthenticated: jest.fn(() => true),
  clearAuthTokens: jest.fn(),
}));

// Mock API
jest.mock('../../../lib/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
  endpoints: {
    auth: {
      me: '/api/auth/me',
      logout: '/api/auth/logout',
    },
  },
}));

const mockUser: User = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  first_name: 'John',
  last_name: 'Doe',
  is_verified: true,
  date_joined: '2023-01-01T00:00:00Z',
  profile_picture: null,
  bio: null,
  location: null
};

const mockPush = jest.fn();

describe('Dashboard', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    render(<Dashboard />);
    expect(screen.getByText('Načítavam dashboard...')).toBeInTheDocument();
  });

  it('renders with initial user', () => {
    render(<Dashboard initialUser={mockUser} />);
    expect(screen.getByText('Vitaj, John!')).toBeInTheDocument();
  });

  it('renders navigation items', () => {
    render(<Dashboard initialUser={mockUser} />);
    
    expect(screen.getByText('Nástenka')).toBeInTheDocument();
    expect(screen.getByText('Vyhľadávanie')).toBeInTheDocument();
    expect(screen.getByText('Oblúbené')).toBeInTheDocument();
    expect(screen.getByText('Profil')).toBeInTheDocument();
    expect(screen.getByText('Nastavenia')).toBeInTheDocument();
    expect(screen.getByText('Odhlásiť sa')).toBeInTheDocument();
  });

  it('switches to profile module when profile is clicked', async () => {
    render(<Dashboard initialUser={mockUser} />);
    
    const profileButton = screen.getByText('Profil');
    fireEvent.click(profileButton);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  it('shows default content when home is clicked', async () => {
    render(<Dashboard initialUser={mockUser} />);
    
    // First click profile to change state
    const profileButton = screen.getByText('Profil');
    fireEvent.click(profileButton);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
    
    // Then click home
    const homeButton = screen.getByText('Nástenka');
    fireEvent.click(homeButton);
    
    await waitFor(() => {
      expect(screen.getByText('Vitaj v Swaply!')).toBeInTheDocument();
    });
  });

  it('handles logout', async () => {
    const { api } = require('../../../lib/api');
    api.post.mockResolvedValue({});
    
    render(<Dashboard initialUser={mockUser} />);
    
    const logoutButton = screen.getByText('Odhlásiť sa');
    fireEvent.click(logoutButton);
    
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/auth/logout', {
        refresh: null,
      });
    });
  });

  it('toggles mobile menu', () => {
    render(<Dashboard initialUser={mockUser} />);
    
    const menuButton = screen.getByRole('button', { name: /menu/i });
    fireEvent.click(menuButton);
    
    // Mobile sidebar should be open
    expect(screen.getByText('Nástenka')).toBeInTheDocument();
  });

  it('renders user avatar in profile', async () => {
    render(<Dashboard initialUser={mockUser} />);
    
    const profileButton = screen.getByText('Profil');
    fireEvent.click(profileButton);
    
    await waitFor(() => {
      expect(screen.getByText('JD')).toBeInTheDocument(); // UserAvatar initials
    });
  });

  it('has correct responsive classes', () => {
    const { container } = render(<Dashboard initialUser={mockUser} />);
    
    // Desktop sidebar should be hidden on mobile
    const desktopSidebar = container.querySelector('.hidden.lg\\:block');
    expect(desktopSidebar).toBeInTheDocument();
    
    // Mobile header should be hidden on desktop
    const mobileHeader = container.querySelector('.lg\\:hidden');
    expect(mobileHeader).toBeInTheDocument();
  });
});