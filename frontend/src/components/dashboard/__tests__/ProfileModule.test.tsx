import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProfileModule from '../modules/ProfileModule';
import { User } from '@/types';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

const mockUser: User = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  user_type: 'individual',
  bio: 'Test bio',
  location: 'Bratislava',
  website: 'https://test.com',
  linkedin: 'https://linkedin.com/in/test',
  facebook: 'https://facebook.com/test',
  instagram: 'https://instagram.com/test',
  is_verified: true,
  is_public: true,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  profile_completeness: 85,
};

describe('ProfileModule', () => {
  it('renders edit buttons and location', () => {
    render(<ProfileModule user={mockUser} />);
    // There are two variants (mobile/desktop), ensure at least one button exists
    expect(screen.getAllByText('Upraviť profil').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/(Zručnosti|Služby a ponuky)/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Bratislava/).length).toBeGreaterThan(0);
  });

  it('calls onEditProfileClick when edit button is clicked', () => {
    const mockOnEditProfile = jest.fn();
    render(<ProfileModule user={mockUser} onEditProfileClick={mockOnEditProfile} />);
    const editButtons = screen.getAllByText('Upraviť profil');
    editButtons[0].click();
    expect(mockOnEditProfile).toHaveBeenCalled();
  });

  it('renders avatar initials when no avatar', () => {
    const userWithoutAvatar = { ...mockUser, avatar: undefined, avatar_url: undefined };
    render(<ProfileModule user={userWithoutAvatar} />);
    const initials = screen.getAllByText('TU');
    expect(initials.length).toBeGreaterThan(0);
  });

  it('renders actual avatar when avatar_url provided', () => {
    const userWithAvatar = { ...mockUser, avatar_url: 'https://example.com/avatar.jpg' };
    render(<ProfileModule user={userWithAvatar} />);
    const imgs = screen.getAllByAltText('Test User');
    expect(imgs.length).toBeGreaterThan(0);
  });
});
