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

  it('lifts instagram and facebook changes up on Enter/blur', async () => {
    const onEditableUserUpdate = jest.fn();

    render(<SocialMediaInputs editableUser={user} onEditableUserUpdate={onEditableUserUpdate} />);

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
      expect(onEditableUserUpdate).toHaveBeenCalledWith({ instagram: 'https://ig/me' });
      expect(onEditableUserUpdate).toHaveBeenCalledWith({ facebook: 'https://fb/me' });
    });
  });

  it('does not lift update when unchanged and lifts exactly once on change', async () => {
    const onEditableUserUpdate = jest.fn();

    const withIg: User = { ...user, instagram: 'https://ig/old' } as any;
    render(<SocialMediaInputs editableUser={withIg} onEditableUserUpdate={onEditableUserUpdate} />);

    fireEvent.click(screen.getAllByRole('button')[0]);
    const ig = screen.getByPlaceholderText('https://instagram.com/username') as HTMLInputElement;

    // unchanged -> no call
    fireEvent.change(ig, { target: { value: 'https://ig/old' } });
    fireEvent.keyDown(ig, { key: 'Enter' });

    // input is hidden after first save; reopen and change -> single update lifted up
    fireEvent.click(screen.getAllByRole('button')[0]);
    const ig2 = screen.getByPlaceholderText('https://instagram.com/username') as HTMLInputElement;
    fireEvent.change(ig2, { target: { value: 'https://ig/new' } });
    fireEvent.keyDown(ig2, { key: 'Enter' });

    await waitFor(() => {
      expect(onEditableUserUpdate).toHaveBeenCalledTimes(1);
    });
    expect(onEditableUserUpdate).toHaveBeenCalledWith({ instagram: 'https://ig/new' });
  });
});

