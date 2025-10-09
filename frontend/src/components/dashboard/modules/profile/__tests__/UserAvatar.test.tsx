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
    expect(screen.getByText('JD').parentElement).toHaveClass('w-8', 'h-8', 'text-sm');

    rerender(<UserAvatar user={mockUser} size="medium" />);
    expect(screen.getByText('JD').parentElement).toHaveClass('w-12', 'h-12', 'text-base');

    rerender(<UserAvatar user={mockUser} size="large" />);
    expect(screen.getByText('JD').parentElement).toHaveClass('w-20', 'h-20', 'text-2xl');
  });

  it('shows border by default', () => {
    render(<UserAvatar user={mockUser} />);
    expect(screen.getByText('JD').parentElement).toHaveClass('ring-2', 'ring-white');
  });

  it('hides border when showBorder is false', () => {
    render(<UserAvatar user={mockUser} showBorder={false} />);
    expect(screen.getByText('JD').parentElement).not.toHaveClass('ring-2', 'ring-white');
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
});
