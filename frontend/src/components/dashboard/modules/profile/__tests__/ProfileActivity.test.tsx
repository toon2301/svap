import React from 'react';
import { render, screen } from '@testing-library/react';
import ProfileActivity from '../ProfileActivity';
import { User } from '../../../../../types';

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

describe('ProfileActivity', () => {
  it('renders all activity items', () => {
    render(<ProfileActivity user={mockUser} />);
    
    expect(screen.getByText('Dokončená výmena')).toBeInTheDocument();
    expect(screen.getByText('Nová ponuka')).toBeInTheDocument();
    expect(screen.getByText('Čakajúca odpoveď')).toBeInTheDocument();
  });

  it('renders activity descriptions', () => {
    render(<ProfileActivity user={mockUser} />);
    
    expect(screen.getByText('Vymenené React kurzy za Python základy')).toBeInTheDocument();
    expect(screen.getByText('Ponúkol JavaScript mentoring')).toBeInTheDocument();
    expect(screen.getByText('Odpoveď na ponuku Design review')).toBeInTheDocument();
  });

  it('renders activity timestamps', () => {
    render(<ProfileActivity user={mockUser} />);
    
    expect(screen.getByText('Pred 2 hodinami')).toBeInTheDocument();
    expect(screen.getByText('Pred 1 dňom')).toBeInTheDocument();
    expect(screen.getByText('Pred 3 dňami')).toBeInTheDocument();
  });

  it('renders correct icons for different activity types', () => {
    render(<ProfileActivity user={mockUser} />);
    
    // Should have 3 activity icons plus 1 section icon
    const icons = document.querySelectorAll('[class*="w-5 h-5"]');
    expect(icons).toHaveLength(4);
  });

  it('applies correct color classes for activity types', () => {
    render(<ProfileActivity user={mockUser} />);
    
    // Success (green)
    const successIcon = screen.getByText('Dokončená výmena').closest('div')?.querySelector('svg');
    expect(successIcon).toHaveClass('text-green-600');
    
    // Info (blue)
    const infoIcon = screen.getByText('Nová ponuka').closest('div')?.querySelector('svg');
    expect(infoIcon).toHaveClass('text-blue-600');
    
    // Warning (yellow)
    const warningIcon = screen.getByText('Čakajúca odpoveď').closest('div')?.querySelector('svg');
    expect(warningIcon).toHaveClass('text-yellow-600');
  });

  it('renders section title', () => {
    render(<ProfileActivity user={mockUser} />);
    expect(screen.getByText('Posledná aktivita')).toBeInTheDocument();
  });

  it('renders view all activity link', () => {
    render(<ProfileActivity user={mockUser} />);
    expect(screen.getByText('Zobraziť všetku aktivitu')).toBeInTheDocument();
  });

  it('has hover effects on activity items', () => {
    render(<ProfileActivity user={mockUser} />);
    
    const activityItems = screen.getAllByText(/Dokončená výmena|Nová ponuka|Čakajúca odpoveď/);
    activityItems.forEach(item => {
      const container = item.closest('.flex');
      expect(container).toHaveClass('hover:bg-gray-50');
    });
  });
});
