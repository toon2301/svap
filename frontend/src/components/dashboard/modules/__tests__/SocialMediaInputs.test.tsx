import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SocialMediaInputs from '../SocialMediaInputs';
import { User } from '@/types';

// Mock API
jest.mock('@/lib/api', () => ({
  api: {
    patch: jest.fn(),
  },
}));

describe('SocialMediaInputs', () => {
  const baseUser: User = {
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('toggles Instagram input and saves on blur', async () => {
    const onUserUpdate = jest.fn();
    const { api } = require('@/lib/api');
    api.patch.mockResolvedValue({ data: { user: { ...baseUser, instagram: 'https://instagram.com/test' } } });

    render(<SocialMediaInputs user={{ ...baseUser, instagram: '' }} onUserUpdate={onUserUpdate} />);

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]); // Instagram icon button

    const input = await screen.findByPlaceholderText('https://instagram.com/username');
    fireEvent.change(input, { target: { value: 'https://instagram.com/test' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/auth/profile/', { instagram: 'https://instagram.com/test' });
      expect(onUserUpdate).toHaveBeenCalled();
    });
  });

  it('toggles LinkedIn input and saves on Enter', async () => {
    const onUserUpdate = jest.fn();
    const { api } = require('@/lib/api');
    api.patch.mockResolvedValue({ data: { user: { ...baseUser, linkedin: 'https://linkedin.com/in/test' } } });

    render(<SocialMediaInputs user={{ ...baseUser, linkedin: '' }} onUserUpdate={onUserUpdate} />);

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[2]); // LinkedIn icon button (third)

    const input = await screen.findByPlaceholderText('https://linkedin.com/in/username');
    fireEvent.change(input, { target: { value: 'https://linkedin.com/in/test' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/auth/profile/', { linkedin: 'https://linkedin.com/in/test' });
      expect(onUserUpdate).toHaveBeenCalled();
    });
  });

  it('toggles Facebook input and hides on blur without change (no request)', async () => {
    const { api } = require('@/lib/api');
    api.patch.mockResolvedValue({ data: { user: baseUser } });

    render(<SocialMediaInputs user={{ ...baseUser, facebook: '' }} />);

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]); // Facebook icon button (second)

    const input = await screen.findByPlaceholderText('https://facebook.com/username');
    fireEvent.blur(input);

    // Give time for any async handlers
    await new Promise((r) => setTimeout(r, 10));
    expect(api.patch).not.toHaveBeenCalled();
  });
});


