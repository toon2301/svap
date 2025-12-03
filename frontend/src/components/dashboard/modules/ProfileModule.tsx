'use client';

import React, { useState, useEffect } from 'react';
import { User } from '../../../types';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '../../../lib/api';
import ProfileMobileView from './profile/ProfileMobileView';
import ProfileDesktopView from './profile/ProfileDesktopView';
import ProfileAvatarActionsModal from './profile/ProfileAvatarActionsModal';
import ProfileWebsitesModal from './profile/ProfileWebsitesModal';
import type { ProfileTab } from './profile/profileTypes';

interface ProfileModuleProps {
  user: User;
  onUserUpdate?: (updatedUser: User) => void;
  onEditProfileClick?: () => void;
  onSkillsClick?: () => void;
  isEditMode?: boolean;
  accountType?: 'personal' | 'business';
}

export default function ProfileModule({
  user,
  onUserUpdate,
  onEditProfileClick,
  onSkillsClick,
  isEditMode = false,
  accountType = 'personal',
}: ProfileModuleProps) {
  const { t } = useLanguage();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>('');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isAllWebsitesModalOpen, setIsAllWebsitesModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>('offers');
  // Snapshot user objektu na začiatku edit módu - používa sa v normálnom zobrazení, kým sa edit mode neukončí
  const [snapshotUser, setSnapshotUser] = useState<User | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Vytvorenie snapshotu user objektu na začiatku edit módu
  useEffect(() => {
    if (isEditMode && !snapshotUser) {
      // Vytvoríme hlbokú kópiu user objektu
      setSnapshotUser({ ...user });
    } else if (!isEditMode && snapshotUser) {
      // Keď sa edit mode vypne, vymazeme snapshot a použijeme aktuálny user
      setSnapshotUser(null);
    }
  }, [isEditMode, user, snapshotUser]);

  // Aktualizácia snapshotu, keď sa user zmení a nie sme v edit móde
  useEffect(() => {
    if (!isEditMode) {
      setSnapshotUser(null);
    }
  }, [user, isEditMode]);

  // User objekt pre normálne zobrazenie - používa snapshotUser, ak existuje (keď sme v edit móde), inak aktuálny user
  const displayUser = snapshotUser || user;

  const handleTabsKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const order: ProfileTab[] = ['offers', 'portfolio', 'posts', 'tagged'];
    const currentIndex = order.indexOf(activeTab);
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      const next = (currentIndex + 1) % order.length;
      setActiveTab(order[next]);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      const prev = (currentIndex - 1 + order.length) % order.length;
      setActiveTab(order[prev]);
    }
  };

  const handlePhotoUpload = async (file: File) => {
    setIsUploading(true);
    setUploadError('');
    setUploadSuccess(false);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await api.patch('/auth/profile/', formData);

      // eslint-disable-next-line no-console
      console.log('Upload response:', response.data);
      if (onUserUpdate && response.data.user) {
        // eslint-disable-next-line no-console
        console.log('Updated user:', response.data.user);
        onUserUpdate(response.data.user);
      }

      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Photo upload error:', error);
      // Pokús sa vytiahnuť konkrétnu validačnú správu z backendu
      const details = error?.response?.data?.details || error?.response?.data?.validation_errors;
      const avatarErrors: string[] | undefined = details?.avatar;
      const message =
        avatarErrors?.[0] ||
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Nepodarilo sa nahrať fotku. Skús to znova.';
      setUploadError(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAvatarClick = () => {
    // Open actions only if avatar exists
    if (user.avatar || user.avatar_url) {
      setIsActionsOpen(true);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      setIsUploading(true);
      setUploadError('');
      // Clear avatar by sending JSON null
      const response = await api.patch('/auth/profile/', { avatar: null });
      if (onUserUpdate && response.data.user) {
        onUserUpdate(response.data.user);
      }
      setIsActionsOpen(false);
    } catch (e: any) {
      const details = e?.response?.data?.details || e?.response?.data?.validation_errors;
      const avatarErrors: string[] | undefined = details?.avatar;
      const message =
        avatarErrors?.[0] ||
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        'Nepodarilo sa odstrániť fotku. Skúste znova.';
      setUploadError(message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <div className="max-w-2xl lg:max-w-full mx-auto lg:mx-0 text-[var(--foreground)] w-full">
        <ProfileMobileView
          user={user}
          displayUser={displayUser}
          isEditMode={isEditMode}
          accountType={accountType}
          isUploading={isUploading}
          onUserUpdate={onUserUpdate}
          onEditProfileClick={onEditProfileClick}
          onPhotoUpload={handlePhotoUpload}
          onAvatarClick={handleAvatarClick}
          onSkillsClick={onSkillsClick}
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          onTabsKeyDown={handleTabsKeyDown}
          onOpenAllWebsitesModal={() => setIsAllWebsitesModalOpen(true)}
        />

        <ProfileDesktopView
          user={user}
          displayUser={displayUser}
          isEditMode={isEditMode}
          accountType={accountType}
          isUploading={isUploading}
          onUserUpdate={onUserUpdate}
          onEditProfileClick={onEditProfileClick}
          onPhotoUpload={handlePhotoUpload}
          onAvatarClick={handleAvatarClick}
          onSkillsClick={onSkillsClick}
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          onTabsKeyDown={handleTabsKeyDown}
          onOpenAllWebsitesModal={() => setIsAllWebsitesModalOpen(true)}
        />

        {/* Success message */}
        {uploadSuccess && (
          <div className="mt-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            ✓ {t('profile.photoUploaded', 'Fotka bola úspešne nahraná!')}
          </div>
        )}

        {/* Error message */}
        {uploadError && (
          <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {uploadError}
          </div>
        )}
      </div>

      <ProfileAvatarActionsModal
        open={mounted && isActionsOpen}
        user={user}
        isUploading={isUploading}
        onClose={() => setIsActionsOpen(false)}
        onPhotoUpload={handlePhotoUpload}
        onRemoveAvatar={handleRemoveAvatar}
      />

      <ProfileWebsitesModal
        open={mounted && isAllWebsitesModalOpen}
        user={user}
        onClose={() => setIsAllWebsitesModalOpen(false)}
      />
    </>
  );
}


