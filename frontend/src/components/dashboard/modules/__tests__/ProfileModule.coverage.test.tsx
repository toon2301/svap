import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProfileModule from '../ProfileModule';
import { User } from '@/types';

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1 }, isAuthenticated: true }),
}));

jest.mock('@/lib/api', () => ({
  api: {
    patch: jest.fn(),
  },
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    success: jest.fn(),
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

describe('ProfileModule coverage', () => {
  // jsdom neimplementuje URL.createObjectURL (optimistický avatar preview ho používa).
  beforeAll(() => {
    global.URL.createObjectURL = jest.fn(() => 'blob:mock');
    global.URL.revokeObjectURL = jest.fn();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles successful photo upload via PhotoUpload (no avatar)', async () => {
    const { api } = require('@/lib/api');
    api.patch.mockResolvedValue({ data: { user: { ...baseUser, avatar_url: 'http://img' } } });

    const onUserUpdate = jest.fn();
    render(<ProfileModule user={baseUser} onUserUpdate={onUserUpdate} />);

    // PhotoUpload button visible (mobile section renders in tests)
    const addBtns = screen.getAllByTitle('Pridať fotku');
    fireEvent.click(addBtns[0]);

    // Hidden file input is rendered by PhotoUpload
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => expect(api.patch).toHaveBeenCalled());
    expect(onUserUpdate).toHaveBeenCalled();

    // Success je oznámené cez globálny toast (rovnako ako ostatné notifikácie v appke)
    const toast = require('react-hot-toast').default;
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Fotka bola úspešne nahraná!');
    });
  });

  it('shows upload error from backend on failure', async () => {
    const { api } = require('@/lib/api');
    api.patch.mockRejectedValue({ response: { data: { error: 'Chyba uploadu' } } });

    render(<ProfileModule user={baseUser} onUserUpdate={jest.fn()} />);
    const addBtns = screen.getAllByTitle('Pridať fotku');
    fireEvent.click(addBtns[0]);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    const toast = require('react-hot-toast').default;
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Chyba uploadu');
    });
  });

  it('opens actions modal when avatar exists and removes avatar', async () => {
    const userWithAvatar: User = { ...baseUser, avatar_url: 'http://img' };
    const { api } = require('@/lib/api');
    api.patch.mockResolvedValue({ data: { user: { ...userWithAvatar, avatar_url: null } } });

    render(<ProfileModule user={userWithAvatar} onUserUpdate={jest.fn()} />);

    // Click avatar image (desktop section hidden by lg, but mobile image exists)
    const imgs = screen.getAllByAltText('Test User');
    fireEvent.click(imgs[0]);

    // Modal visible
    expect(screen.getByText('Odstrániť fotku')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Odstrániť fotku'));
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/auth/profile/', { avatar: null }));
  });
});



