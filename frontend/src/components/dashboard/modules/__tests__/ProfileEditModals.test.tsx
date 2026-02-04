import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProfileEditModals from '../ProfileEditModals';
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

function renderModals(partial: Partial<React.ComponentProps<typeof ProfileEditModals>>) {
  const defaults = {
    user,
    onUserUpdate: jest.fn(),
    isNameModalOpen: false,
    isBioModalOpen: false,
    isLocationModalOpen: false,
    isContactModalOpen: false,
    isProfessionModalOpen: false,
    isWebsiteModalOpen: false,
    isInstagramModalOpen: false,
    isFacebookModalOpen: false,
    isLinkedinModalOpen: false,
    isGenderModalOpen: false,
    firstName: '',
    lastName: '',
    bio: '',
    location: '',
    district: '',
    phone: '',
    phoneVisible: false,
    profession: '',
    professionVisible: false,
    website: '',
    instagram: '',
    facebook: '',
    linkedin: '',
    gender: '',
    originalFirstName: '',
    originalLastName: '',
    originalBio: '',
    originalLocation: '',
    originalDistrict: '',
    originalPhone: '',
    originalPhoneVisible: false,
    originalProfession: '',
    originalProfessionVisible: false,
    originalWebsite: '',
    originalInstagram: '',
    originalFacebook: '',
    originalLinkedin: '',
    originalGender: '',
    setFirstName: jest.fn(),
    setLastName: jest.fn(),
    setBio: jest.fn(),
    setLocation: jest.fn(),
    setDistrict: jest.fn(),
    setPhone: jest.fn(),
    setPhoneVisible: jest.fn(),
    setProfession: jest.fn(),
    setProfessionVisible: jest.fn(),
    setWebsite: jest.fn(),
    setInstagram: jest.fn(),
    setFacebook: jest.fn(),
    setLinkedin: jest.fn(),
    setGender: jest.fn(),
    setOriginalFirstName: jest.fn(),
    setOriginalLastName: jest.fn(),
    setOriginalBio: jest.fn(),
    setOriginalLocation: jest.fn(),
    setOriginalDistrict: jest.fn(),
    setOriginalPhone: jest.fn(),
    setOriginalPhoneVisible: jest.fn(),
    setOriginalProfession: jest.fn(),
    setOriginalProfessionVisible: jest.fn(),
    setOriginalWebsite: jest.fn(),
    setOriginalInstagram: jest.fn(),
    setOriginalFacebook: jest.fn(),
    setOriginalLinkedin: jest.fn(),
    setOriginalGender: jest.fn(),
    setIsNameModalOpen: jest.fn(),
    setIsBioModalOpen: jest.fn(),
    setIsLocationModalOpen: jest.fn(),
    setIsContactModalOpen: jest.fn(),
    setIsProfessionModalOpen: jest.fn(),
    setIsWebsiteModalOpen: jest.fn(),
    setIsInstagramModalOpen: jest.fn(),
    setIsFacebookModalOpen: jest.fn(),
    setIsLinkedinModalOpen: jest.fn(),
    setIsGenderModalOpen: jest.fn(),
  } as any;
  return render(<ProfileEditModals {...defaults} {...partial} />);
}

describe('ProfileEditModals', () => {
  beforeEach(() => jest.clearAllMocks());

  it('saves name via name modal', async () => {
    const { api } = require('@/lib/api');
    (api.patch as jest.Mock).mockResolvedValue({ data: { user } });
    const setIsNameModalOpen = jest.fn();
    const setOriginalFirstName = jest.fn();
    const setOriginalLastName = jest.fn();

    renderModals({
      isNameModalOpen: true,
      firstName: 'A',
      lastName: 'B',
      setIsNameModalOpen,
      setOriginalFirstName,
      setOriginalLastName,
    });

    // save button (check icon) - choose by role button count last
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[buttons.length - 1]);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/auth/profile/', { first_name: 'A', last_name: 'B' });
      expect(setOriginalFirstName).toHaveBeenCalledWith('A');
      expect(setOriginalLastName).toHaveBeenCalledWith('B');
      expect(setIsNameModalOpen).toHaveBeenCalledWith(false);
    });
  });

  it('cancels location modal', () => {
    const setIsLocationModalOpen = jest.fn();
    const setLocation = jest.fn();
    const setDistrict = jest.fn();

    renderModals({
      isLocationModalOpen: true,
      originalLocation: 'X',
      originalDistrict: 'D',
      setIsLocationModalOpen,
      setLocation,
      setDistrict,
    });

    // back arrow button
    const backBtn = screen.getAllByRole('button')[0];
    fireEvent.click(backBtn);

    expect(setLocation).toHaveBeenCalledWith('X');
    expect(setDistrict).toHaveBeenCalledWith('D');
    expect(setIsLocationModalOpen).toHaveBeenCalledWith(false);
  });
});