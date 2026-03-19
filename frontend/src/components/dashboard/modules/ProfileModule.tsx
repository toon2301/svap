'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User } from '../../../types';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks';
import { api } from '../../../lib/api';
import ProfileMobileView from './profile/ProfileMobileView';
import ProfileDesktopView from './profile/ProfileDesktopView';
import ProfileAvatarActionsModal from './profile/ProfileAvatarActionsModal';
import ProfileWebsitesModal from './profile/ProfileWebsitesModal';
import type { ProfileTab } from './profile/profileTypes';

/** Hlboká kópia user objektu (1 level, arrays cez spread). */
function deepCloneUser(u: User): User {
  return {
    ...u,
    additional_websites: u.additional_websites ? [...u.additional_websites] : undefined,
  };
}

/** Writable polia pre PATCH (bez read-only). */
function buildPatchPayload(editable: User): Record<string, unknown> {
  const exclude = new Set([
    'id', 'email', 'is_verified', 'created_at', 'updated_at',
    'profile_completeness', 'slug', 'name_modified_by_user', 'completed_cooperations_count', 'avatar_url',
  ]);
  const payload: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(editable)) {
    if (!exclude.has(k) && v !== undefined) payload[k] = v;
  }
  return payload;
}

interface ProfileModuleProps {
  user: User;
  onUserUpdate?: (updatedUser: User) => void;
  onEditProfileClick?: () => void;
  onEditCancel?: () => void;
  onSkillsClick?: () => void;
  isEditMode?: boolean;
  accountType?: 'personal' | 'business';
}

export default function ProfileModule({
  user,
  onUserUpdate,
  onEditProfileClick,
  onEditCancel,
  onSkillsClick,
  isEditMode = false,
  accountType = 'personal',
}: ProfileModuleProps) {
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>('');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isAllWebsitesModalOpen, setIsAllWebsitesModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>('offers');

  // Avatar preview URL (optimistic). Revoke to avoid memory leaks.
  const avatarPreviewUrlRef = useRef<string | null>(null);
  useEffect(() => {
    return () => {
      if (avatarPreviewUrlRef.current) {
        URL.revokeObjectURL(avatarPreviewUrlRef.current);
        avatarPreviewUrlRef.current = null;
      }
    };
  }, []);

  /**
   * Editable working copy. Existuje LEN počas edit módu.
   * - View komponenty: vždy user (read-only)
   * - Edit komponenty: vždy editableUser
   */
  const [editableUser, setEditableUser] = useState<User | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Inicializácia editableUser pri vstupe do edit módu; reset pri výstupe
  useEffect(() => {
    if (isEditMode) {
      if (!editableUser) setEditableUser(deepCloneUser(user));
    } else {
      setEditableUser(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- editableUser sa vytvára len pri vstupe
  }, [isEditMode]);

  const handleEditableUserUpdate = useCallback((partial: Partial<User>) => {
    setEditableUser((prev) => (prev ? { ...prev, ...partial } : null));
  }, []);

  const handleSave = useCallback(async (mergedUser?: User) => {
    const toSave = mergedUser ?? editableUser;
    if (!toSave || !onUserUpdate || !onEditCancel) return;

    // Optimistic update + rollback on failure
    const previousUser = deepCloneUser(user);
    onUserUpdate(toSave);

    setIsUploading(true);
    setUploadError('');
    try {
      const payload = buildPatchPayload(toSave);
      const response = await api.patch('/auth/profile/', payload);
      if (response.data?.user) {
        // Sync with backend canonical response (e.g. normalized fields)
        onUserUpdate(response.data.user);
        setEditableUser(null);
        onEditCancel();
      }
    } catch (e: unknown) {
      onUserUpdate(previousUser);
      const err = e as { response?: { data?: { details?: Record<string, string[]> } } };
      const details = err?.response?.data?.details;
      const firstMsg = details && Object.values(details).flat().find((m): m is string => typeof m === 'string');
      setUploadError(firstMsg || 'Nepodarilo sa uložiť.');
    } finally {
      setIsUploading(false);
    }
  }, [editableUser, onUserUpdate, onEditCancel, user]);

  const handleCancel = useCallback(() => {
    setEditableUser(null);
    onEditCancel?.();
  }, [onEditCancel]);

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
    if (!onUserUpdate) return;

    // Optimistic local preview (instant UI)
    const previousUser = deepCloneUser(user);
    if (avatarPreviewUrlRef.current) {
      URL.revokeObjectURL(avatarPreviewUrlRef.current);
      avatarPreviewUrlRef.current = null;
    }
    const previewUrl = URL.createObjectURL(file);
    avatarPreviewUrlRef.current = previewUrl;
    onUserUpdate({ ...user, avatar_url: previewUrl } as User);
    if (isEditMode && editableUser) {
      handleEditableUserUpdate({ avatar_url: previewUrl } as Partial<User>);
    }

    setIsUploading(true);
    setUploadError('');
    setUploadSuccess(false);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await api.patch<{ user: User }>('/auth/profile/', formData);
      if (response.data?.user) {
        onUserUpdate(response.data.user);
        if (isEditMode && editableUser) {
          handleEditableUserUpdate(response.data.user);
        }
      }
      if (avatarPreviewUrlRef.current) {
        URL.revokeObjectURL(avatarPreviewUrlRef.current);
        avatarPreviewUrlRef.current = null;
      }
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (error: any) {
      onUserUpdate(previousUser);
      if (avatarPreviewUrlRef.current) {
        URL.revokeObjectURL(avatarPreviewUrlRef.current);
        avatarPreviewUrlRef.current = null;
      }
      // eslint-disable-next-line no-console
      console.error('Photo upload error:', error);
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
    if (!onUserUpdate) return;

    // Optimistic remove + rollback
    const previousUser = deepCloneUser(user);
    onUserUpdate({ ...user, avatar: undefined, avatar_url: undefined } as User);
    if (isEditMode && editableUser) {
      handleEditableUserUpdate({ avatar: undefined, avatar_url: undefined } as Partial<User>);
    }
    if (avatarPreviewUrlRef.current) {
      URL.revokeObjectURL(avatarPreviewUrlRef.current);
      avatarPreviewUrlRef.current = null;
    }

    try {
      setIsUploading(true);
      setUploadError('');
      const response = await api.patch<{ user: User }>('/auth/profile/', { avatar: null });
      if (response.data?.user) {
        onUserUpdate(response.data.user);
        if (isEditMode && editableUser) {
          handleEditableUserUpdate(response.data.user);
        }
      }
      setIsActionsOpen(false);
    } catch (e: any) {
      onUserUpdate(previousUser);
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
        {isMobile ? (
          <ProfileMobileView
            user={user}
            editableUser={editableUser}
            isEditMode={isEditMode}
            accountType={accountType}
            isUploading={isUploading}
            onUserUpdate={onUserUpdate}
            onEditableUserUpdate={handleEditableUserUpdate}
            onEditProfileClick={onEditProfileClick}
            onEditCancel={handleCancel}
            onEditSave={handleSave}
            onPhotoUpload={handlePhotoUpload}
            onRemoveAvatar={handleRemoveAvatar}
            onAvatarClick={handleAvatarClick}
            onSkillsClick={onSkillsClick}
            activeTab={activeTab}
            onChangeTab={setActiveTab}
            onTabsKeyDown={handleTabsKeyDown}
            onOpenAllWebsitesModal={() => setIsAllWebsitesModalOpen(true)}
            offersOwnerId={user.id}
          />
        ) : (
          <ProfileDesktopView
            user={user}
            editableUser={editableUser}
            isEditMode={isEditMode}
            accountType={accountType}
            isUploading={isUploading}
            onUserUpdate={onUserUpdate}
            onEditableUserUpdate={handleEditableUserUpdate}
            onEditProfileClick={onEditProfileClick}
            onEditCancel={handleCancel}
            onEditSave={handleSave}
            onPhotoUpload={handlePhotoUpload}
            onRemoveAvatar={handleRemoveAvatar}
            onAvatarClick={handleAvatarClick}
            onSkillsClick={onSkillsClick}
            activeTab={activeTab}
            onChangeTab={setActiveTab}
            onTabsKeyDown={handleTabsKeyDown}
            onOpenAllWebsitesModal={() => setIsAllWebsitesModalOpen(true)}
            offersOwnerId={user.id}
          />
        )}

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


