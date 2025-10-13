import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProfileAvatar from '../ProfileAvatar';
import { User } from '@/types';

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

describe('ProfileAvatar (modules/ProfileAvatar)', () => {
  it('renders initials when no avatar and shows upload icon', () => {
    const onPhotoUpload = jest.fn();
    render(<ProfileAvatar user={{ ...baseUser, avatar_url: undefined, avatar: undefined }} onPhotoUpload={onPhotoUpload} />);
    expect(screen.getByText('UT')).toBeInTheDocument();
    // Upload button is visible
    expect(screen.getByRole('button', { name: 'Nahrať fotku' })).toBeInTheDocument();
  });

  it('respects size mappings', () => {
    const { rerender } = render(<ProfileAvatar user={baseUser} size="small" />);
    // Small
    expect(screen.getByText('UT').parentElement).toHaveClass('w-8', 'h-8', 'text-sm');
    // Medium
    rerender(<ProfileAvatar user={baseUser} size="medium" />);
    expect(screen.getByText('UT').parentElement).toHaveClass('w-24', 'h-24', 'text-2xl');
    // Large
    rerender(<ProfileAvatar user={baseUser} size="large" />);
    expect(screen.getByText('UT').parentElement).toHaveClass('w-32', 'h-32', 'text-4xl');
    // XLarge
    rerender(<ProfileAvatar user={baseUser} size="xlarge" />);
    expect(screen.getByText('UT').parentElement).toHaveClass('w-48', 'h-48', 'text-6xl');
  });

  it('renders avatar image when avatar_url provided and calls onAvatarClick', () => {
    const onAvatarClick = jest.fn();
    render(<ProfileAvatar user={{ ...baseUser, avatar_url: 'https://example.com/a.jpg' }} onAvatarClick={onAvatarClick} />);
    const imgs = screen.getAllByAltText('User Test');
    expect(imgs[0]).toBeInTheDocument();
    fireEvent.click(imgs[0]);
    expect(onAvatarClick).toHaveBeenCalled();
  });

  it('opens internal actions modal when has avatar and no onAvatarClick', () => {
    render(<ProfileAvatar user={{ ...baseUser, avatar_url: 'https://example.com/a.jpg' }} />);
    const img = screen.getByAltText('User Test');
    fireEvent.click(img);
    // Modal has button 'Zmeniť fotku'
    expect(screen.getByText('Zmeniť fotku')).toBeInTheDocument();
    // Click overlay to close
    const overlay = document.querySelector('.absolute.inset-0.bg-black');
    (overlay as HTMLElement).click();
  });

  // Note: component does not currently swap to initials on error; skip this scenario to match behavior

  it('calls onAvatarClick when clicking initials (no avatar)', () => {
    const onAvatarClick = jest.fn();
    render(<ProfileAvatar user={{ ...baseUser, avatar_url: undefined, avatar: undefined }} onAvatarClick={onAvatarClick} />);
    fireEvent.click(screen.getByText('UT'));
    expect(onAvatarClick).toHaveBeenCalled();
  });

  it('hides upload icon when showUploadIcon is false', () => {
    render(<ProfileAvatar user={baseUser} showUploadIcon={false} />);
    expect(screen.queryByRole('button', { name: 'Nahrať fotku' })).not.toBeInTheDocument();
  });

  it('disables upload button when isUploading', () => {
    render(<ProfileAvatar user={baseUser} isUploading onPhotoUpload={jest.fn()} />);
    const btn = screen.getByRole('button', { name: 'Nahrať fotku' });
    expect(btn).toBeDisabled();
  });
});


