import React from 'react';
import { render, screen } from '@testing-library/react';
import ProfileBio from '../ProfileBio';
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

describe('ProfileBio', () => {
  it('renders placeholder text when no bio', () => {
    render(<ProfileBio user={mockUser} />);
    expect(screen.getByText('John zatiaľ nepridal žiadny popis.')).toBeInTheDocument();
  });

  it('renders bio when available', () => {
    const userWithBio = { ...mockUser, bio: 'This is my bio text' };
    render(<ProfileBio user={userWithBio} />);
    expect(screen.getByText('This is my bio text')).toBeInTheDocument();
  });

  it('renders empty bio as placeholder', () => {
    const userWithEmptyBio = { ...mockUser, bio: '' };
    render(<ProfileBio user={userWithEmptyBio} />);
    expect(screen.getByText('John zatiaľ nepridal žiadny popis.')).toBeInTheDocument();
  });

  it('renders whitespace-only bio as placeholder', () => {
    const userWithWhitespaceBio = { ...mockUser, bio: '   ' };
    render(<ProfileBio user={userWithWhitespaceBio} />);
    expect(screen.getByText('John zatiaľ nepridal žiadny popis.')).toBeInTheDocument();
  });

  it('preserves line breaks in bio', () => {
    const userWithMultilineBio = { ...mockUser, bio: 'Line 1\nLine 2\nLine 3' };
    render(<ProfileBio user={userWithMultilineBio} />);
    const bioElement = screen.getByText('Line 1\nLine 2\nLine 3');
    expect(bioElement).toHaveClass('whitespace-pre-wrap');
  });

  it('renders section title', () => {
    render(<ProfileBio user={mockUser} />);
    expect(screen.getByText('O mne')).toBeInTheDocument();
  });

  it('renders user icon', () => {
    render(<ProfileBio user={mockUser} />);
    const icon = screen.getByRole('img', { hidden: true });
    expect(icon).toBeInTheDocument();
  });
});
