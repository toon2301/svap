import React from 'react';
import { render, screen } from '@testing-library/react';
import ProfileCard from '../ProfileCard';
import { User } from '../../../../../types';

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

describe('ProfileCard', () => {
  it('renders without crashing', () => {
    render(<ProfileCard user={mockUser} />);
    expect(screen.getByText('JD')).toBeInTheDocument(); // Initials
  });

  it('renders UserAvatar component', () => {
    render(<ProfileCard user={mockUser} />);
    expect(screen.getByText('JD')).toBeInTheDocument(); // UserAvatar initials
  });

  it('renders UserInfo component', () => {
    render(<ProfileCard user={mockUser} />);
    // UserInfo now only shows location if available
    expect(screen.queryByText('test@example.com')).not.toBeInTheDocument();
  });

  it('has correct container styling', () => {
    const { container } = render(<ProfileCard user={mockUser} />);
    const cardContainer = container.querySelector('.bg-white');
    expect(cardContainer).toHaveClass('rounded-lg', 'shadow-sm', 'border', 'border-gray-200', 'p-8');
  });

  it('handles user with avatar', () => {
    const userWithAvatar = {
      ...mockUser,
      avatar_url: 'https://example.com/avatar.jpg'
    };
    
    render(<ProfileCard user={userWithAvatar} />);
    const img = screen.getByAltText('John Doe');
    expect(img).toBeInTheDocument();
  });

  it('does not render location in info section (handled near avatar)', () => {
    const userWithLocation = { ...mockUser, location: 'Bratislava' };
    render(<ProfileCard user={userWithLocation} />);
    expect(screen.queryByText(/Bratislava/)).not.toBeInTheDocument();
  });
});
