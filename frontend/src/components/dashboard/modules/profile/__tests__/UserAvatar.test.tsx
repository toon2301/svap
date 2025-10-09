import React from 'react';
import { render, screen } from '@testing-library/react';
import UserAvatar from '../UserAvatar';
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

describe('UserAvatar', () => {
  it('renders initials when no profile picture', () => {
    render(<UserAvatar user={mockUser} />);
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('renders profile picture when available', () => {
    const userWithPicture = {
      ...mockUser,
      profile_picture: 'https://example.com/avatar.jpg'
    };
    
    render(<UserAvatar user={userWithPicture} />);
    const img = screen.getByAltText('John Doe');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });

  it('renders correct size classes', () => {
    const { rerender } = render(<UserAvatar user={mockUser} size="small" />);
    expect(screen.getByText('JD').parentElement).toHaveClass('w-16', 'h-16', 'text-lg');

    rerender(<UserAvatar user={mockUser} size="medium" />);
    expect(screen.getByText('JD').parentElement).toHaveClass('w-24', 'h-24', 'text-2xl');

    rerender(<UserAvatar user={mockUser} size="large" />);
    expect(screen.getByText('JD').parentElement).toHaveClass('w-32', 'h-32', 'text-4xl');
  });

  it('handles image load error by showing initials', () => {
    const userWithPicture = {
      ...mockUser,
      profile_picture: 'https://example.com/invalid.jpg'
    };
    
    render(<UserAvatar user={userWithPicture} />);
    const img = screen.getByAltText('John Doe');
    
    // Simulate image load error
    img.dispatchEvent(new Event('error'));
    
    // Should fallback to initials
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('has correct styling classes', () => {
    render(<UserAvatar user={mockUser} />);
    const avatarContainer = screen.getByText('JD').parentElement;
    expect(avatarContainer).toHaveClass('rounded-full', 'mx-auto', 'bg-purple-100', 'flex', 'items-center', 'justify-center', 'border-4', 'border-purple-200');
  });
});
