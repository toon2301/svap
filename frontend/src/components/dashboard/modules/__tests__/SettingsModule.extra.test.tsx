import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import SettingsModule from '../SettingsModule';
import { User } from '@/types';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn(),
    patch: jest.fn(),
  },
  endpoints: {
    push: {
      preferences: '/auth/push/preferences/',
    },
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

async function renderSettingsModule() {
  const { api } = require('@/lib/api');
  render(<SettingsModule user={user} />);
  await waitFor(() => {
    expect(api.get).toHaveBeenCalledWith('/auth/push/preferences/');
  });
}

describe('SettingsModule extra coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { api } = require('@/lib/api');
    api.get.mockResolvedValue({
      data: {
        email_notifications: true,
        push_notifications: false,
      },
    });
    api.patch.mockImplementation(async (_url: string, payload: any) => ({
      data: {
        email_notifications:
          typeof payload?.email_notifications === 'boolean'
            ? payload.email_notifications
            : true,
        push_notifications:
          typeof payload?.push_notifications === 'boolean'
            ? payload.push_notifications
            : false,
      },
    }));
  });

  it('switches tabs and toggles checkboxes', async () => {
    const { api } = require('@/lib/api');

    await renderSettingsModule();

    fireEvent.click(screen.getByLabelText('Súkromie'));
    const emailToggle = screen.getByLabelText('Zobraziť email');
    fireEvent.click(emailToggle);

    fireEvent.click(screen.getByLabelText('Upozornenia'));
    const checkboxesNotif = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxesNotif[1]);

    fireEvent.click(screen.getByLabelText('Bezpečnosť'));
    const twoFaCheckbox = screen.getByRole('checkbox');
    fireEvent.click(twoFaCheckbox);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/auth/push/preferences/', {
        push_notifications: true,
      });
    });
  });
});
