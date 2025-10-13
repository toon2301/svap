import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProfileEditForm from '../ProfileEditForm';
import { User } from '@/types';

jest.mock('@/lib/api', () => ({
  api: {
    patch: jest.fn(),
  },
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

describe('ProfileEditForm coverage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('opens avatar modal and triggers upload click', () => {
    render(<ProfileEditForm user={user} />);
    const changeButtons = screen.getAllByText('Zmeniť fotku');
    fireEvent.click(changeButtons[0]);
    // Modal actions exist (the modal contains another "Zmeniť fotku")
    expect(screen.getAllByText('Zmeniť fotku').length).toBeGreaterThan(1);
    expect(screen.getByText('Odstrániť fotku')).toBeInTheDocument();
  });

  it('closes modal on Zrušiť and allows open again', () => {
    render(<ProfileEditForm user={user} />);
    fireEvent.click(screen.getAllByText('Zmeniť fotku')[0]);
    fireEvent.click(screen.getByText('Zrušiť'));
    // Open again
    fireEvent.click(screen.getAllByText('Zmeniť fotku')[0]);
    expect(screen.getByText('Odstrániť fotku')).toBeInTheDocument();
  });

  it('invokes onEditProfileClick by clicking Uložiť', () => {
    const onEditProfileClick = jest.fn();
    render(<ProfileEditForm user={user} onEditProfileClick={onEditProfileClick} />);
    fireEvent.click(screen.getByText('Uložiť'));
    expect(onEditProfileClick).toHaveBeenCalled();
  });

  it('saves first name on Enter and blur', async () => {
    const { api } = require('@/lib/api');
    api.patch.mockResolvedValue({ data: { user: { ...user, first_name: 'Nové' } } });
    const onUserUpdate = jest.fn();
    render(<ProfileEditForm user={user} onUserUpdate={onUserUpdate} />);
    const input = screen.getByLabelText('Meno') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Nové' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/auth/profile/', { first_name: 'Nové' }));
    fireEvent.blur(input);
  });
});



