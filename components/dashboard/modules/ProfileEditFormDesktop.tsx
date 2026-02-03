'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { User } from '../../../types';
import { useProfileEditFormDesktopLegacy } from './useProfileEditFormDesktopLegacy';
import { ProfileEditFormDesktopLayout } from './ProfileEditFormDesktopLayout';

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
  const form = useProfileEditFormDesktopLegacy({ user, onUserUpdate });

  return (
    <ProfileEditFormDesktopLayout
      user={user}
      t={t}
      accountType={accountType}
      onUserUpdate={onUserUpdate}
      onEditProfileClick={onEditProfileClick}
      form={form}
    />
  );
}
