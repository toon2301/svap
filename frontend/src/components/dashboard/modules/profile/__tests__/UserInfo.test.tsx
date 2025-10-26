import React from 'react';
import { render, screen } from '@testing-library/react';
import UserInfo from '../UserInfo';
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

describe('UserInfo', () => {
  it('does not render user name', () => {
    render(<UserInfo user={mockUser} />);
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
  });

  it('does not render email', () => {
    render(<UserInfo user={mockUser} />);
    expect(screen.queryByText('test@example.com')).not.toBeInTheDocument();
  });

  // Location is no longer rendered by UserInfo; it has moved next to avatar
  it('does not render location even when available (handled elsewhere)', () => {
    const userWithLocation = { ...mockUser, location: 'Bratislava' };
    render(<UserInfo user={userWithLocation} />);
    expect(screen.queryByText(/Bratislava/)).not.toBeInTheDocument();
  });

  it('does not render location when not available', () => {
    render(<UserInfo user={mockUser} />);
    expect(screen.queryByText(/📍/)).not.toBeInTheDocument();
  });

  it('does not render location when empty', () => {
    const userWithEmptyLocation = { ...mockUser, location: '' };
    render(<UserInfo user={userWithEmptyLocation} />);
    expect(screen.queryByText(/📍/)).not.toBeInTheDocument();
  });

  it('does not render location when only whitespace', () => {
    const userWithWhitespaceLocation = { ...mockUser, location: '   ' };
    render(<UserInfo user={userWithWhitespaceLocation} />);
    expect(screen.queryByText(/📍/)).not.toBeInTheDocument();
  });

  it('has correct styling classes', () => {
    const { container } = render(<UserInfo user={mockUser} />);
    const infoContainer = container.querySelector('.text-center');
    expect(infoContainer).toBeInTheDocument();
  });
});
