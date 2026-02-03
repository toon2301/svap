'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { User } from '../../../types';
import { useProfileEditFormDesktop } from './profile/useProfileEditFormDesktop';
import { ProfileEditFormDesktopLayout } from './profile-edit/desktop/ProfileEditFormDesktopLayout';

interface ProfileEditFormDesktopProps {
  user: User;
  onUserUpdate?: (user: User) => void;
  onEditProfileClick?: () => void;
  onPhotoUpload?: (file: File) => void;
  isUploadingFromParent?: boolean;
  onAvatarClick?: () => void;
  accountType?: 'personal' | 'business';
}

export default function ProfileEditFormDesktop({ 
  user, 
  onUserUpdate, 
  onEditProfileClick,
  onPhotoUpload,
  isUploadingFromParent,
  onAvatarClick,
  accountType = 'personal'
}: ProfileEditFormDesktopProps) {
  const { t } = useLanguage();
  const form = useProfileEditFormDesktop({ user, onUserUpdate });

  // full name / company name logika je presunutá do FullNameField (bez zmeny správania)

  return (
    <ProfileEditFormDesktopLayout
      user={user}
      accountType={accountType}
      t={t}
      onUserUpdate={onUserUpdate}
      form={form}
    />
  );
}
