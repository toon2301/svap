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
  is_verified: true,
  date_joined: '2023-01-01T00:00:00Z',
  profile_picture: null,
  bio: null,
  location: null
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

  it('renders location when available', () => {
    const userWithLocation = { ...mockUser, location: 'Bratislava' };
    render(<UserInfo user={userWithLocation} />);
    expect(screen.getByText('📍 Bratislava')).toBeInTheDocument();
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
