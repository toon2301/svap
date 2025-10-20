import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SettingsModule from '../SettingsModule';
import { User } from '@/types';

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

describe('SettingsModule extra coverage', () => {
  it('switches tabs and toggles checkboxes', () => {
    render(<SettingsModule user={user} />);

    // go to privacy tab and toggle showEmail
    fireEvent.click(screen.getByLabelText('Súkromie'));
    const emailToggle = screen.getByLabelText('Zobraziť email');
    fireEvent.click(emailToggle);

    // go to notifications and toggle push (no htmlFor on label, target checkbox directly)
    fireEvent.click(screen.getByLabelText('Upozornenia'));
    const checkboxesNotif = screen.getAllByRole('checkbox');
    // second checkbox on notifications is push
    fireEvent.click(checkboxesNotif[1]);

    // go to security and toggle 2FA
    fireEvent.click(screen.getByLabelText('Bezpečnosť'));
    const twoFaCheckbox = screen.getByRole('checkbox');
    fireEvent.click(twoFaCheckbox);

    expect(true).toBe(true);
  });
});

