import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ProfileEditForm from '../ProfileEditForm';
import { User } from '@/types';

jest.mock('@/lib/api', () => ({
  api: {
    patch: jest.fn(),
  },
}));

const mockUser: User = {
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

describe('ProfileEditForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title and basic fields', () => {
    render(<ProfileEditForm user={mockUser} />);
    expect(screen.getByText('Upraviť profil')).toBeInTheDocument();
    expect(screen.getByLabelText('Meno')).toBeInTheDocument();
    expect(screen.getByLabelText('Bio')).toBeInTheDocument();
    expect(screen.getByLabelText('Web')).toBeInTheDocument();
    expect(screen.getByText('Pohlavie')).toBeInTheDocument();
  });

  it('auto-saves first name on blur', async () => {
    const { api } = require('@/lib/api');
    api.patch.mockResolvedValue({ data: { user: { ...mockUser, first_name: 'Nové' } } });
    const onUserUpdate = jest.fn();

    render(<ProfileEditForm user={mockUser} onUserUpdate={onUserUpdate} />);
    const input = screen.getByLabelText('Meno') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Nové' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/auth/profile/', { first_name: 'Nové' });
      expect(onUserUpdate).toHaveBeenCalled();
    });
  });

  it('auto-saves gender on change', async () => {
    const { api } = require('@/lib/api');
    api.patch.mockResolvedValue({ data: { user: { ...mockUser, gender: 'male' } } });
    const onUserUpdate = jest.fn();

    render(<ProfileEditForm user={mockUser} onUserUpdate={onUserUpdate} />);
    const select = screen.getByDisplayValue('Vyberte pohlavie');
    fireEvent.change(select, { target: { value: 'male' } });

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/auth/profile/', { gender: 'male' });
      expect(onUserUpdate).toHaveBeenCalled();
    });
  });

  it('auto-saves bio on blur and on Ctrl+Enter', async () => {
    const { api } = require('@/lib/api');
    api.patch.mockResolvedValue({ data: { user: { ...mockUser, bio: 'Ahoj' } } });
    const onUserUpdate = jest.fn();

    render(<ProfileEditForm user={mockUser} onUserUpdate={onUserUpdate} />);
    const bio = screen.getByLabelText('Bio') as HTMLTextAreaElement;
    // blur save
    await userEvent.clear(bio);
    await userEvent.type(bio, 'Ahoj');
    bio.blur();

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/auth/profile/', { bio: 'Ahoj' });
      expect(onUserUpdate).toHaveBeenCalled();
    });

    // ctrl+enter save
    api.patch.mockResolvedValueOnce({ data: { user: { ...mockUser, bio: 'Ahoj2' } } });
    await userEvent.keyboard('{Control>}{Enter}{/Control}');
    await waitFor(() => {
      expect(api.patch).toHaveBeenCalled();
    });
  });

  it('auto-saves website on Enter', async () => {
    const { api } = require('@/lib/api');
    api.patch.mockResolvedValue({ data: { user: { ...mockUser, website: 'https://a.b' } } });
    const onUserUpdate = jest.fn();

    render(<ProfileEditForm user={mockUser} onUserUpdate={onUserUpdate} />);
    const web = screen.getByLabelText('Web') as HTMLInputElement;
    fireEvent.change(web, { target: { value: 'https://a.b' } });
    fireEvent.keyDown(web, { key: 'Enter' });
    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/auth/profile/', { website: 'https://a.b' });
      expect(onUserUpdate).toHaveBeenCalled();
    });
  });

  it('reverts gender on API error', async () => {
    const { api } = require('@/lib/api');
    api.patch.mockRejectedValueOnce(new Error('net'));
    render(<ProfileEditForm user={mockUser} />);
    const select = screen.getByDisplayValue('Vyberte pohlavie');
    fireEvent.change(select, { target: { value: 'female' } });
    await waitFor(() => {
      // Should revert back to '' value
      expect((select as HTMLSelectElement).value).toBe('');
    });
  });

  it('does not call API when first name unchanged', async () => {
    const { api } = require('@/lib/api');
    render(<ProfileEditForm user={mockUser} />);
    const input = screen.getByLabelText('Meno') as HTMLInputElement;
    fireEvent.blur(input);
    await new Promise((r) => setTimeout(r, 10));
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('does not call API when website unchanged', async () => {
    const { api } = require('@/lib/api');
    render(<ProfileEditForm user={{ ...mockUser, website: '' }} />);
    const web = screen.getByLabelText('Web') as HTMLInputElement;
    fireEvent.keyDown(web, { key: 'Enter' });
    await new Promise((r) => setTimeout(r, 10));
    expect(api.patch).not.toHaveBeenCalled();
  });

});


