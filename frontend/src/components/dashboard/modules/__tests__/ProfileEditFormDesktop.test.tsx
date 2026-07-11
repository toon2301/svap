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
  location: '',
  district: '',
};

describe('ProfileEditFormDesktop', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders heading and saves full name on Enter', async () => {
    const onEditableUserUpdate = jest.fn();

    render(
      <ProfileEditFormDesktop
        user={baseUser}
        editableUser={baseUser}
        onEditableUserUpdate={onEditableUserUpdate}
      />,
    );

    expect(screen.getByText('Upraviť profil')).toBeInTheDocument();

    const fullName = screen.getByPlaceholderText('Zadajte svoje meno') as HTMLInputElement;
    fireEvent.change(fullName, { target: { value: 'Nové Meno' } });
    fireEvent.keyDown(fullName, { key: 'Enter' });

    await waitFor(() => {
      expect(onEditableUserUpdate).toHaveBeenCalledWith({
        first_name: 'Nové',
        last_name: 'Meno',
        company_name: '',
      });
    });
  });

  it('returns from desktop edit mode from the heading back button', () => {
    const onEditCancel = jest.fn();

    render(
      <ProfileEditFormDesktop
        user={baseUser}
        editableUser={baseUser}
        onEditableUserUpdate={jest.fn()}
        onEditCancel={onEditCancel}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Sp/ }));

    expect(onEditCancel).toHaveBeenCalledTimes(1);
  });

  it('saves bio on blur', async () => {
    const onEditableUserUpdate = jest.fn();

    render(
      <ProfileEditFormDesktop
        user={baseUser}
        editableUser={baseUser}
        onEditableUserUpdate={onEditableUserUpdate}
      />,
    );

    const bio = screen.getByPlaceholderText('Napíšte niečo o sebe...') as HTMLTextAreaElement;
    fireEvent.change(bio, { target: { value: 'Ahoj' } });
    fireEvent.blur(bio);

    await waitFor(() => {
      expect(onEditableUserUpdate).toHaveBeenCalledWith({ bio: 'Ahoj' });
    });
  });

  it('opens and closes avatar actions modal', () => {
    render(
      <ProfileEditFormDesktop
        user={baseUser}
        editableUser={baseUser}
        onEditableUserUpdate={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByText('Zmeniť fotku'));
    expect(screen.getAllByText('Zmeniť fotku').length).toBeGreaterThan(1);
    expect(screen.getByText('Odstrániť fotku')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Zrušiť'));
    expect(screen.getAllByText('Zmeniť fotku').length).toBeGreaterThan(0);
  });
});
