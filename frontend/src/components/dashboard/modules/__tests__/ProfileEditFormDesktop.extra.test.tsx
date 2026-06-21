import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProfileEditFormDesktop from '../ProfileEditFormDesktop';
import { User } from '@/types';

jest.mock('@/lib/api', () => ({
  api: {
    patch: jest.fn(),
  },
}));

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
  website: '',
  district: '',
  location: '',
  phone: '',
  phone_visible: false,
  job_title: '',
  job_title_visible: false,
};

describe('ProfileEditFormDesktop extra coverage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('saves location and phone, toggles visibility and website', async () => {
    const onEditableUserUpdate = jest.fn();

    render(
      <ProfileEditFormDesktop
        user={baseUser}
        editableUser={baseUser}
        onEditableUserUpdate={onEditableUserUpdate}
      />,
    );

    // Najprv okres
    const districtInput = screen.getByPlaceholderText('Zadaj okres') as HTMLInputElement;
    fireEvent.change(districtInput, { target: { value: 'Nitra' } });
    fireEvent.blur(districtInput);

    // Potom mesto/dedina – teraz sa zobrazí druhý input
    const locationInput = screen.getByPlaceholderText('Zadaj, kde ponúkaš svoje služby') as HTMLInputElement;
    fireEvent.change(locationInput, { target: { value: 'Bratislava' } });
    fireEvent.blur(locationInput);

    const phoneInput = screen.getByPlaceholderText(/(Tel\. číslo|Telefónne číslo)/) as HTMLInputElement;
    fireEvent.change(phoneInput, { target: { value: '+421900000000' } });
    fireEvent.blur(phoneInput);

    const contactSection = phoneInput.closest('div')!.parentElement!.parentElement as HTMLElement;
    const contactToggle = contactSection.querySelector('button.relative.inline-flex') as HTMLButtonElement;
    fireEvent.click(contactToggle);

    const websiteInput = screen.getByPlaceholderText('example.com') as HTMLInputElement;
    fireEvent.change(websiteInput, { target: { value: 'https://a.example' } });
    fireEvent.keyDown(websiteInput, { key: 'Enter' });

    await waitFor(() => {
      expect(onEditableUserUpdate).toHaveBeenCalledWith({ location: 'Bratislava', district: 'Nitra' });
      expect(onEditableUserUpdate).toHaveBeenCalledWith({ phone: '+421900000000' });
      expect(onEditableUserUpdate).toHaveBeenCalledWith({ phone_visible: true });
      expect(onEditableUserUpdate).toHaveBeenCalledWith({ website: 'https://a.example' });
    });
  });
});

