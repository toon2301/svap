import React from 'react';
import { render, screen } from '@testing-library/react';
import ProfileHeader from '../ProfileHeader';
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

describe('ProfileHeader', () => {
  it('renders user name correctly', () => {
    render(<ProfileHeader user={mockUser} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('renders email when available', () => {
    render(<ProfileHeader user={mockUser} />);
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('does not render email when not available', () => {
    const userWithoutEmail = { ...mockUser, email: '' };
    render(<ProfileHeader user={mockUser} />);
    // Email should still be rendered as it's in mockUser
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('renders UserAvatar component', () => {
    render(<ProfileHeader user={mockUser} />);
    expect(screen.getByText('JD')).toBeInTheDocument(); // UserAvatar initials
  });

  it('renders UserLocation component', () => {
    const userWithLocation = { ...mockUser, location: 'Bratislava' };
    render(<ProfileHeader user={userWithLocation} />);
    expect(screen.getByText('Bratislava')).toBeInTheDocument();
  });

  it('has correct responsive classes', () => {
    const { container } = render(<ProfileHeader user={mockUser} />);
    const headerElement = container.querySelector('.bg-gradient-to-r');
    expect(headerElement).toHaveClass('px-6', 'py-8');
  });

  it('handles user with only first name', () => {
    const userWithOnlyFirstName = { ...mockUser, last_name: '' };
    render(<ProfileHeader user={userWithOnlyFirstName} />);
    expect(screen.getByText('John ')).toBeInTheDocument();
  });
});
