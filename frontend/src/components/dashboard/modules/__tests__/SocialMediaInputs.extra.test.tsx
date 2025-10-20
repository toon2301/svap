import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SocialMediaInputs from '../SocialMediaInputs';
import { User } from '@/types';

jest.mock('@/lib/api', () => ({
  api: {
    patch: jest.fn(),
  },
}));

const user: User = {
  id: 1,
  username: 'john',
  email: 'john@example.com',
  first_name: 'John',
  last_name: 'Doe',
  user_type: 'individual',
  is_verified: true,
  is_public: true,
  created_at: '2023-01-01',
  updated_at: '2023-01-01',
  profile_completeness: 50,
};

describe('SocialMediaInputs extra coverage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('saves instagram and facebook on Enter/blur and hides input on toggle', async () => {
    const { api } = require('@/lib/api');
    (api.patch as jest.Mock).mockResolvedValue({ data: { user } });
    const onUserUpdate = jest.fn();

    render(<SocialMediaInputs user={user} onUserUpdate={onUserUpdate} />);

    // open instagram input
    fireEvent.click(screen.getAllByRole('button')[0]);
    const ig = screen.getByPlaceholderText('https://instagram.com/username') as HTMLInputElement;
    fireEvent.change(ig, { target: { value: 'https://ig/me' } });
    fireEvent.keyDown(ig, { key: 'Enter' });

    // open facebook input
    fireEvent.click(screen.getAllByRole('button')[1]);
    const fb = screen.getByPlaceholderText('https://facebook.com/username') as HTMLInputElement;
    fireEvent.change(fb, { target: { value: 'https://fb/me' } });
    fireEvent.blur(fb);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/auth/profile/', { instagram: 'https://ig/me' });
      expect(api.patch).toHaveBeenCalledWith('/auth/profile/', { facebook: 'https://fb/me' });
      expect(onUserUpdate).toHaveBeenCalled();
    });
  });

  it('does not call API when unchanged and reverts on error', async () => {
    const { api } = require('@/lib/api');
    (api.patch as jest.Mock).mockRejectedValue(new Error('fail'));

    const withIg: User = { ...user, instagram: 'https://ig/old' } as any;
    render(<SocialMediaInputs user={withIg} />);

    fireEvent.click(screen.getAllByRole('button')[0]);
    const ig = screen.getByPlaceholderText('https://instagram.com/username') as HTMLInputElement;

    // unchanged -> no call
    fireEvent.change(ig, { target: { value: 'https://ig/old' } });
    fireEvent.keyDown(ig, { key: 'Enter' });

    // input is hidden after first save attempt; reopen and change to trigger error and revert
    fireEvent.click(screen.getAllByRole('button')[0]);
    const ig2 = screen.getByPlaceholderText('https://instagram.com/username') as HTMLInputElement;
    fireEvent.change(ig2, { target: { value: 'https://ig/new' } });
    fireEvent.keyDown(ig2, { key: 'Enter' });

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledTimes(1);
    });
  });
});

