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
    expect(screen.getByText('JD')).toBeInTheDocument(); // UserAvatar initials
  });

  it('renders ProfileCard component', () => {
    render(<ProfileModule user={mockUser} />);
    expect(screen.getByText('JD')).toBeInTheDocument(); // UserAvatar initials
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
    const img = screen.getByAltText('John Doe');
    expect(img).toBeInTheDocument();
  });

  it('handles user with location', () => {
    const userWithLocation = { ...mockUser, location: 'Bratislava' };
    render(<ProfileModule user={userWithLocation} />);
    expect(screen.getByText('📍 Bratislava')).toBeInTheDocument();
  });
});
