import React from 'react';
import { render, screen } from '@testing-library/react';
import ProfileModule from '../ProfileModule';
import { User } from '../../../../types';

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

describe('ProfileModule', () => {
  it('renders without crashing', () => {
    render(<ProfileModule user={mockUser} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('renders all main sections', () => {
    render(<ProfileModule user={mockUser} />);
    
    // Profile header
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    
    // Profile stats
    expect(screen.getByText('Člen od')).toBeInTheDocument();
    expect(screen.getByText('Výmeny')).toBeInTheDocument();
    expect(screen.getByText('Hodnotenie')).toBeInTheDocument();
    expect(screen.getByText('Odozva')).toBeInTheDocument();
    
    // Profile content sections
    expect(screen.getByText('O mne')).toBeInTheDocument();
    expect(screen.getByText('Zručnosti')).toBeInTheDocument();
    expect(screen.getByText('Posledná aktivita')).toBeInTheDocument();
  });

  it('has correct container styling', () => {
    const { container } = render(<ProfileModule user={mockUser} />);
    const mainContainer = container.querySelector('.max-w-4xl');
    expect(mainContainer).toHaveClass('mx-auto');
    
    const cardContainer = container.querySelector('.bg-white');
    expect(cardContainer).toHaveClass('rounded-lg', 'shadow-sm', 'border', 'border-gray-200', 'overflow-hidden');
  });

  it('renders user avatar', () => {
    render(<ProfileModule user={mockUser} />);
    expect(screen.getByText('JD')).toBeInTheDocument(); // UserAvatar initials
  });

  it('handles user with location', () => {
    const userWithLocation = { ...mockUser, location: 'Bratislava' };
    render(<ProfileModule user={userWithLocation} />);
    expect(screen.getByText('Bratislava')).toBeInTheDocument();
  });

  it('handles user with bio', () => {
    const userWithBio = { ...mockUser, bio: 'This is my bio' };
    render(<ProfileModule user={userWithBio} />);
    expect(screen.getByText('This is my bio')).toBeInTheDocument();
  });

  it('renders responsive grid layout', () => {
    const { container } = render(<ProfileModule user={mockUser} />);
    const gridElement = container.querySelector('.grid');
    expect(gridElement).toHaveClass('grid-cols-1', 'lg:grid-cols-3');
  });
});
