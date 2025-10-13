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
  user_type: 'individual',
  is_verified: true,
  is_public: true,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  profile_completeness: 50,
  bio: undefined,
  location: undefined,
  avatar: undefined,
  avatar_url: undefined,
};

describe('ProfileModule', () => {
  it('renders without crashing', () => {
    render(<ProfileModule user={mockUser} />);
    // There are two avatars (mobile+desktop), so use getAllByText
    const initials = screen.getAllByText('JD');
    expect(initials.length).toBeGreaterThan(0);
  });

  it('renders profile UI without email in main view', () => {
    render(<ProfileModule user={mockUser} />);
    const initials = screen.getAllByText('JD');
    expect(initials.length).toBeGreaterThan(0);
    expect(screen.queryByText('test@example.com')).not.toBeInTheDocument();
  });

  it('has correct container styling', () => {
    const { container } = render(<ProfileModule user={mockUser} />);
    const mainContainer = container.querySelector('.max-w-2xl');
    expect(mainContainer).toHaveClass('mx-auto');
  });

  it('handles user with avatar', () => {
    const userWithAvatar = {
      ...mockUser,
      avatar_url: 'https://example.com/avatar.jpg'
    };
    
    render(<ProfileModule user={userWithAvatar} />);
    const imgs = screen.getAllByAltText('John Doe');
    expect(imgs.length).toBeGreaterThan(0);
  });

  it('handles user with location', () => {
    const userWithLocation = { ...mockUser, location: 'Bratislava' };
    render(<ProfileModule user={userWithLocation} />);
    const all = screen.getAllByText(/Bratislava/);
    expect(all.length).toBeGreaterThan(0);
  });
});
