import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProfileEditForm from '../ProfileEditForm';
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
  location: '',
  phone: '',
  phone_visible: false,
  job_title: '',
  job_title_visible: false,
  gender: '',
};

describe('ProfileEditForm extra coverage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('saves location and phone on Enter/blur and toggles phone visibility', async () => {
    const { api } = require('@/lib/api');
    (api.patch as jest.Mock).mockResolvedValue({ data: { user: baseUser } });
    const onUserUpdate = jest.fn();

    render(<ProfileEditForm user={baseUser} onUserUpdate={onUserUpdate} />);

    const locationInput = screen.getByPlaceholderText('Zadajte svoje mesto alebo obec') as HTMLInputElement;
    fireEvent.change(locationInput, { target: { value: 'Bratislava' } });
    fireEvent.keyDown(locationInput, { key: 'Enter' });

    const phone = screen.getByText('Kontakt').closest('div') as HTMLElement;
    const phoneInput = screen.getByPlaceholderText('Tel. číslo') as HTMLInputElement;
    fireEvent.change(phoneInput, { target: { value: '+421900000000' } });
    fireEvent.blur(phoneInput);

    // toggle button is the first relative inline-flex inside Contact section
    const contactToggle = screen.getByText('Zobraziť kontakt verejne').previousElementSibling as HTMLButtonElement;
    fireEvent.click(contactToggle);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/auth/profile/', { location: 'Bratislava' });
      expect(api.patch).toHaveBeenCalledWith('/auth/profile/', { phone: '+421900000000' });
      expect(api.patch).toHaveBeenCalledWith('/auth/profile/', { phone_visible: true });
      expect(onUserUpdate).toHaveBeenCalled();
    });
  });

  it('saves profession and toggles profession visibility and saves website', async () => {
    const { api } = require('@/lib/api');
    (api.patch as jest.Mock).mockResolvedValue({ data: { user: baseUser } });
    const onUserUpdate = jest.fn();

    render(<ProfileEditForm user={baseUser} onUserUpdate={onUserUpdate} />);

    const professionInput = screen.getByPlaceholderText('Zadajte svoju profesiu') as HTMLInputElement;
    fireEvent.change(professionInput, { target: { value: 'Developer' } });
    fireEvent.keyDown(professionInput, { key: 'Enter' });

    // toggle profession visibility
    const professionToggle = screen.getByText('Zobraziť profesiu verejne').previousElementSibling as HTMLButtonElement;
    fireEvent.click(professionToggle);

    const websiteInput = screen.getByPlaceholderText('https://example.com') as HTMLInputElement;
    fireEvent.change(websiteInput, { target: { value: 'https://a.example' } });
    fireEvent.keyDown(websiteInput, { key: 'Enter' });

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/auth/profile/', { job_title: 'Developer' });
      // visibility toggle may also be called later in sequence; assert it was called at least once with true
      expect((api.patch as jest.Mock).mock.calls.some((c: any[]) => c[0] === '/auth/profile/' && c[1] && c[1].job_title_visible === true)).toBe(true);
      expect(api.patch).toHaveBeenCalledWith('/auth/profile/', { website: 'https://a.example' });
      expect(onUserUpdate).toHaveBeenCalled();
    });
  });
});

