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

function defaults() {
  return {
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
}

describe('ProfileEditModals extra coverage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('saves bio and website via modals', async () => {
    const { api } = require('@/lib/api');
    (api.patch as jest.Mock).mockResolvedValue({ data: { user } });
    const props = defaults();
    props.isBioModalOpen = true;
    props.bio = 'About me';

    const { rerender } = render(<ProfileEditModals {...props} />);
    const saveBioBtn = screen.getByLabelText('Uložiť');
    fireEvent.click(saveBioBtn);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/auth/profile/', { bio: 'About me' });
    });

    const props2 = defaults();
    props2.isWebsiteModalOpen = true;
    props2.website = 'https://site';
    rerender(<ProfileEditModals {...props2} />);
    const saveWebBtn = screen.getByLabelText('Uložiť');
    fireEvent.click(saveWebBtn);
    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/auth/profile/', expect.objectContaining({ website: 'https://site' }));
    });
  });

  it('saves contact with phone and visibility', async () => {
    const { api } = require('@/lib/api');
    (api.patch as jest.Mock).mockResolvedValue({ data: { user } });
    const props = defaults();
    props.isContactModalOpen = true;
    props.phone = '+421900000000';
    props.phoneVisible = true;

    render(<ProfileEditModals {...props} />);

    // save button last
    const saveBtn = screen.getAllByRole('button').slice(-1)[0];
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/auth/profile/', { phone: '+421900000000', phone_visible: true });
    });
  });

  it('cancels instagram modal and restores original value', () => {
    const props = defaults();
    props.isInstagramModalOpen = true;
    props.instagram = 'https://new';
    props.originalInstagram = 'https://old';

    render(<ProfileEditModals {...props} />);

    const backBtn = screen.getAllByRole('button')[0];
    fireEvent.click(backBtn);

    expect(props.setInstagram).toHaveBeenCalledWith('https://old');
    expect(props.setIsInstagramModalOpen).toHaveBeenCalledWith(false);
  });
});

