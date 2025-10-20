import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Dashboard from '../Dashboard';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { User } from '@/types';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('../../../utils/auth', () => ({
  isAuthenticated: () => true,
  clearAuthTokens: jest.fn(),
}));

const user: User = {
  id: 1,
  username: 'user',
  email: 'user@example.com',
  first_name: 'User',
  last_name: 'Test',
  user_type: 'individual',
  is_verified: true,
  is_public: true,
  created_at: '2023-01-01',
  updated_at: '2023-01-01',
  profile_completeness: 50,
};

describe('Dashboard profile integration', () => {
  it('opens right sidebar via Edit Profile and renders edit heading', () => {
    render(<ThemeProvider><Dashboard initialUser={user} /></ThemeProvider>);
    // go to profile
    const sidebarProfile = screen.getByText('Profil');
    fireEvent.click(sidebarProfile);
    // click edit profile button in profile module
    const editButtons = screen.getAllByText('Upraviť profil');
    fireEvent.click(editButtons[0]);
    // heading in edit form appears
    const headings = screen.getAllByRole('heading', { name: 'Upraviť profil' });
    expect(headings.length).toBeGreaterThan(0);
  });
});


