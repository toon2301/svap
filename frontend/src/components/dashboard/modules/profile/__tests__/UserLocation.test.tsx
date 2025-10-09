import React from 'react';
import { render, screen } from '@testing-library/react';
import UserLocation from '../UserLocation';
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

describe('UserLocation', () => {
  it('renders nothing when location is not set', () => {
    const { container } = render(<UserLocation user={mockUser} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when location is empty string', () => {
    const userWithEmptyLocation = { ...mockUser, location: '' };
    const { container } = render(<UserLocation user={userWithEmptyLocation} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when location is only whitespace', () => {
    const userWithWhitespaceLocation = { ...mockUser, location: '   ' };
    const { container } = render(<UserLocation user={userWithWhitespaceLocation} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders location when set', () => {
    const userWithLocation = { ...mockUser, location: 'Bratislava, Slovakia' };
    render(<UserLocation user={userWithLocation} />);
    
    expect(screen.getByText('Bratislava, Slovakia')).toBeInTheDocument();
    expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument(); // MapPinIcon
  });

  it('truncates long location text', () => {
    const longLocation = 'Very long location name that should be truncated because it exceeds normal length limits';
    const userWithLongLocation = { ...mockUser, location: longLocation };
    
    render(<UserLocation user={userWithLongLocation} />);
    
    const locationElement = screen.getByText(longLocation);
    expect(locationElement).toHaveClass('truncate');
  });
});
