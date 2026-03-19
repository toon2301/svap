'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { User } from '../../../types';
import { useProfileEditFormDesktop } from './profile/useProfileEditFormDesktop';
import { ProfileEditFormDesktopLayout } from './profile-edit/desktop/ProfileEditFormDesktopLayout';

interface ProfileEditFormDesktopProps {
  user: User;
  editableUser: User;
  onEditableUserUpdate: (partial: Partial<User>) => void;
  onEditProfileClick?: () => void;
  onEditCancel?: () => void;
  onEditSave?: (mergedUser?: User) => Promise<void>;
  onPhotoUpload?: (file: File) => void;
  onRemoveAvatar?: () => Promise<void>;
  isUploadingFromParent?: boolean;
  onAvatarClick?: () => void;
  accountType?: 'personal' | 'business';
}

export default function ProfileEditFormDesktop({
  user,
  editableUser,
  onEditableUserUpdate,
  onEditProfileClick,
  onEditCancel,
  onEditSave,
  onPhotoUpload,
  onRemoveAvatar,
  isUploadingFromParent,
  onAvatarClick,
  accountType = 'personal',
}: ProfileEditFormDesktopProps) {
  const { t } = useLanguage();
  const form = useProfileEditFormDesktop({
    user,
    editableUser,
    onEditableUserUpdate,
    onEditSave,
    onEditCancel,
    onPhotoUpload,
    onRemoveAvatar,
  });

  return (
    <ProfileEditFormDesktopLayout
      user={user}
      editableUser={editableUser}
      accountType={accountType}
      t={t}
      onEditableUserUpdate={onEditableUserUpdate}
      form={form}
    />
  );
}
