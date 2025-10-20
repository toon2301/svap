import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProfileEditFormDesktop from '../ProfileEditFormDesktop';
import { User } from '@/types';

jest.mock('@/lib/api', () => ({
  api: {
    patch: jest.fn(),
  },
}));

const baseUser: User = {
  id: 1,
  username: 'test',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  user_type: 'individual',
  is_verified: true,
  is_public: true,
  created_at: '2023-01-01',
  updated_at: '2023-01-01',
  profile_completeness: 50,
};

describe('ProfileEditFormDesktop', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders heading and saves full name on Enter', async () => {
    const { api } = require('@/lib/api');
    const onUserUpdate = jest.fn();
    (api.patch as jest.Mock).mockResolvedValue({ data: { user: { ...baseUser, first_name: 'Nové', last_name: 'Meno' } } });

    render(<ProfileEditFormDesktop user={baseUser} onUserUpdate={onUserUpdate} />);

    expect(screen.getByText('Upraviť profil')).toBeInTheDocument();

    const fullName = screen.getByPlaceholderText('Zadajte svoje meno a priezvisko') as HTMLInputElement;
    fireEvent.change(fullName, { target: { value: 'Nové Meno' } });
    fireEvent.keyDown(fullName, { key: 'Enter' });

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/auth/profile/', { first_name: 'Nové', last_name: 'Meno' });
      expect(onUserUpdate).toHaveBeenCalled();
    });
  });

  it('saves bio on blur and gender on change', async () => {
    const { api } = require('@/lib/api');
    const onUserUpdate = jest.fn();
    (api.patch as jest.Mock).mockResolvedValue({ data: { user: { ...baseUser, bio: 'Ahoj', gender: 'male' } } });

    render(<ProfileEditFormDesktop user={baseUser} onUserUpdate={onUserUpdate} />);

    const bio = screen.getByPlaceholderText('Napíšte niečo o sebe...') as HTMLTextAreaElement;
    fireEvent.change(bio, { target: { value: 'Ahoj' } });
    fireEvent.blur(bio);

    const gender = screen.getByDisplayValue('Vyberte pohlavie') as HTMLSelectElement;
    fireEvent.change(gender, { target: { value: 'male' } });

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/auth/profile/', { bio: 'Ahoj' });
      expect(api.patch).toHaveBeenCalledWith('/auth/profile/', { gender: 'male' });
    });
  });

  it('opens and closes avatar actions modal', () => {
    render(<ProfileEditFormDesktop user={baseUser} />);

    fireEvent.click(screen.getByText('Zmeniť fotku'));
    expect(screen.getAllByText('Zmeniť fotku').length).toBeGreaterThan(1);
    expect(screen.getByText('Odstrániť fotku')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Zrušiť'));
    expect(screen.getAllByText('Zmeniť fotku').length).toBeGreaterThan(0);
  });
});