import React from 'react';
import { render, screen } from '@testing-library/react';
import ProfileStats from '../ProfileStats';
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

describe('ProfileStats', () => {
  it('renders all stat items', () => {
    render(<ProfileStats user={mockUser} />);
    
    expect(screen.getByText('Člen od')).toBeInTheDocument();
    expect(screen.getByText('Výmeny')).toBeInTheDocument();
    expect(screen.getByText('Hodnotenie')).toBeInTheDocument();
    expect(screen.getByText('Odozva')).toBeInTheDocument();
  });

  it('renders correct stat values', () => {
    render(<ProfileStats user={mockUser} />);
    
    expect(screen.getByText('2023')).toBeInTheDocument(); // memberSince
    expect(screen.getByText('12')).toBeInTheDocument(); // completedSwaps
    expect(screen.getByText('4.8')).toBeInTheDocument(); // rating
    expect(screen.getByText('< 2h')).toBeInTheDocument(); // responseTime
  });

  it('renders with correct grid layout', () => {
    const { container } = render(<ProfileStats user={mockUser} />);
    const gridElement = container.querySelector('.grid');
    expect(gridElement).toHaveClass('grid-cols-2', 'sm:grid-cols-4');
  });

  it('handles user without date_joined', () => {
    const userWithoutDate = { ...mockUser, date_joined: null };
    render(<ProfileStats user={userWithoutDate} />);
    
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  it('renders all icons', () => {
    render(<ProfileStats user={mockUser} />);
    
    // Check that all 4 icons are rendered (they have specific classes)
    const icons = document.querySelectorAll('[class*="w-6 h-6"]');
    expect(icons).toHaveLength(4);
  });

  it('has correct color classes for different stats', () => {
    render(<ProfileStats user={mockUser} />);
    
    // Check that different stats have different colors
    expect(screen.getByText('2023').closest('div')).toHaveClass('text-blue-600');
    expect(screen.getByText('12').closest('div')).toHaveClass('text-green-600');
    expect(screen.getByText('4.8').closest('div')).toHaveClass('text-yellow-600');
    expect(screen.getByText('< 2h').closest('div')).toHaveClass('text-purple-600');
  });
});
