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

  it('toggles Instagram input and lifts change up on blur', async () => {
    const onEditableUserUpdate = jest.fn();

    render(
      <SocialMediaInputs
        editableUser={{ ...baseUser, instagram: '' }}
        onEditableUserUpdate={onEditableUserUpdate}
      />,
    );

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]); // Instagram icon button

    const input = await screen.findByPlaceholderText('https://instagram.com/username');
    fireEvent.change(input, { target: { value: 'https://instagram.com/test' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(onEditableUserUpdate).toHaveBeenCalledWith({ instagram: 'https://instagram.com/test' });
    });
  });

  it('toggles LinkedIn input and lifts change up on Enter', async () => {
    const onEditableUserUpdate = jest.fn();

    render(
      <SocialMediaInputs
        editableUser={{ ...baseUser, linkedin: '' }}
        onEditableUserUpdate={onEditableUserUpdate}
      />,
    );

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[2]); // LinkedIn icon button (third)

    const input = await screen.findByPlaceholderText('https://linkedin.com/in/username');
    fireEvent.change(input, { target: { value: 'https://linkedin.com/in/test' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(onEditableUserUpdate).toHaveBeenCalledWith({ linkedin: 'https://linkedin.com/in/test' });
    });
  });

  it('toggles Facebook input and hides on blur without change (no update)', async () => {
    const onEditableUserUpdate = jest.fn();

    render(
      <SocialMediaInputs
        editableUser={{ ...baseUser, facebook: '' }}
        onEditableUserUpdate={onEditableUserUpdate}
      />,
    );

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]); // Facebook icon button (second)

    const input = await screen.findByPlaceholderText('https://facebook.com/username');
    fireEvent.blur(input);

    // Give time for any async handlers
    await new Promise((r) => setTimeout(r, 10));
    expect(onEditableUserUpdate).not.toHaveBeenCalled();
  });
});


