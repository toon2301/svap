import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProfileEditFields from '../ProfileEditFields';
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
  phone_visible: false,
  job_title_visible: false,
};

describe('ProfileEditFields', () => {
  it('renders and triggers modal open callbacks', () => {
    const setters = {
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

    render(
      <ProfileEditFields
        user={user}
        {...setters}
      />
    );

    fireEvent.click(screen.getByText('Meno'));
    expect(setters.setIsNameModalOpen).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getAllByText('Bio')[0]);
    expect(setters.setIsBioModalOpen).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByText('Lokalita'));
    expect(setters.setIsLocationModalOpen).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByText('Kontakt'));
    expect(setters.setIsContactModalOpen).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByText('Profesia'));
    expect(setters.setIsProfessionModalOpen).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getAllByText('Web')[0]);
    expect(setters.setIsWebsiteModalOpen).toHaveBeenCalledWith(true);

    const socialsContainer = screen.getByText('Sociálne siete').closest('div') as HTMLElement;
    const socialsButtons = socialsContainer.querySelectorAll('button');
    fireEvent.click(socialsButtons[0]);
    expect(setters.setIsInstagramModalOpen).toHaveBeenCalledWith(true);
  });

  it('toggles visibility switches without errors', () => {
    const { api } = require('@/lib/api');
    (api.patch as jest.Mock).mockResolvedValue({ data: { user: { ...user, phone_visible: true, job_title_visible: true } } });
    const onUserUpdate = jest.fn();

    const setters = {
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

    render(
      <ProfileEditFields
        user={user}
        onUserUpdate={onUserUpdate}
        {...setters}
      />
    );

    const toggleButtons = document.querySelectorAll('button.relative.inline-flex');
    expect(toggleButtons.length).toBeGreaterThan(0);
    fireEvent.click(toggleButtons[0]);
  });
});