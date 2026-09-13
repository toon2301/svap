import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UserAvatar from '../UserAvatar';
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

describe('UserAvatar', () => {
  it('renders initials when no profile picture', () => {
    render(<UserAvatar user={mockUser} />);
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('renders avatar when available', () => {
    const userWithAvatar = {
      ...mockUser,
      avatar_url: 'https://example.com/avatar.jpg'
    };
    
    render(<UserAvatar user={userWithAvatar} />);
    const img = screen.getByAltText('John Doe');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });

  it.each([
    'blob:https://svaply.com/2e084bd7-a0e4-44aa-a6e9-075f03af6ec1',
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB',
  ])('keeps an in-memory avatar URL byte-for-byte unchanged', (avatarUrl) => {
    render(<UserAvatar user={{ ...mockUser, avatar_url: avatarUrl }} />);

    expect(screen.getByAltText('John Doe')).toHaveAttribute('src', avatarUrl);
  });

  it('does not reload an immutable avatar URL after an unrelated profile update', () => {
    const avatarUrl = 'https://cdn.example.com/avatars/immutable-id.webp';
    const { rerender } = render(
      <UserAvatar user={{ ...mockUser, avatar_url: avatarUrl }} />,
    );

    rerender(
      <UserAvatar
        user={{
          ...mockUser,
          avatar_url: avatarUrl,
          bio: 'Updated biography',
          updated_at: '2026-09-13T12:00:00Z',
        }}
      />,
    );

    expect(screen.getByAltText('John Doe')).toHaveAttribute('src', avatarUrl);
  });

  it('renders correct size classes', () => {
    const { rerender } = render(<UserAvatar user={mockUser} size="small" />);
    expect(screen.getByText('JD').parentElement).toHaveClass('w-16', 'h-16', 'text-lg');

    rerender(<UserAvatar user={mockUser} size="medium" />);
    expect(screen.getByText('JD').parentElement).toHaveClass('w-24', 'h-24', 'text-2xl');

    rerender(<UserAvatar user={mockUser} size="large" />);
    // Large size maps to responsive classes per current component implementation
    expect(screen.getByText('JD').parentElement).toHaveClass('w-28', 'h-28', 'text-3xl');
  });

  it('uses a larger verification badge on the large profile avatar', () => {
    render(<UserAvatar user={mockUser} size="large" />);

    const svg = screen.getByTestId('verified-badge').querySelector('svg');
    expect(svg).toHaveClass('h-7', 'w-7');
  });

  it('handles image load error by showing initials', async () => {
    const userWithAvatar = {
      ...mockUser,
      avatar_url: 'https://example.com/invalid.jpg'
    };
    
    render(<UserAvatar user={userWithAvatar} />);
    const img = screen.getByAltText('John Doe');
    
    // Simulate image load error
    fireEvent.error(img);
    
    // Should fallback to initials after state updates
    await waitFor(() => expect(screen.getByText('JD')).toBeInTheDocument());
  });

  it('has correct styling classes', () => {
    render(<UserAvatar user={mockUser} />);
    const avatarContainer = screen.getByText('JD').parentElement;
    expect(avatarContainer).toHaveClass('rounded-full', 'mx-auto', 'bg-purple-100', 'flex', 'items-center', 'justify-center', 'border-4', 'border-purple-200');
  });
});
