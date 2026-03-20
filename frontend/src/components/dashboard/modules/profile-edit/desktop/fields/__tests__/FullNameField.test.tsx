import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import FullNameField from '../FullNameField';
import type { User } from '@/types';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (_key: string, fallback?: string) => fallback ?? '',
    locale: 'sk',
    setLocale: jest.fn(),
    country: null,
    setCountry: jest.fn(),
  }),
}));

const baseUser: User = {
  id: 1,
  username: 'anton-user',
  email: 'anton@example.com',
  first_name: 'Anton',
  last_name: 'Chudjačik',
  user_type: 'individual',
  is_verified: true,
  is_public: true,
  created_at: '2023-01-01',
  updated_at: '2023-01-01',
  profile_completeness: 60,
};

describe('FullNameField', () => {
  it('initializes business input from company_name instead of first_name', () => {
    render(
      <FullNameField
        editableUser={{
          ...baseUser,
          user_type: 'company',
          first_name: 'Anton',
          last_name: '',
          company_name: 'Studio Anton',
        }}
        accountType="business"
        firstName=""
        lastName=""
        setFirstName={jest.fn()}
        setLastName={jest.fn()}
        onEditableUserUpdate={jest.fn()}
      />,
    );

    expect(screen.getByRole('textbox')).toHaveValue('Studio Anton');
  });

  it('clears company_name for personal edits on blur when the personal name changes', () => {
    const setFirstName = jest.fn();
    const setLastName = jest.fn();
    const onEditableUserUpdate = jest.fn();

    render(
      <FullNameField
        editableUser={{
          ...baseUser,
          company_name: 'Anton Chudjačik Chudjak',
        }}
        accountType="personal"
        firstName="Anton"
        lastName="Novák"
        setFirstName={setFirstName}
        setLastName={setLastName}
        onEditableUserUpdate={onEditableUserUpdate}
      />,
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Anton Novák' } });
    fireEvent.blur(input);

    expect(onEditableUserUpdate).toHaveBeenCalledWith({
      first_name: 'Anton',
      last_name: 'Novák',
      company_name: '',
    });
  });
});
