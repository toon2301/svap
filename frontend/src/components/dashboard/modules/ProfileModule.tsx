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
    'avatar', 'birth_date', 'gender', 'username',
  ]);
  const payload: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(editable)) {
    if (!exclude.has(k) && v !== undefined && v !== null && v !== '') payload[k] = v;
  }
  return payload;
}

type UserUpdateArg = User | ((prev: User | null) => User | null);

interface ProfileModuleProps {
  user: User;
  onUserUpdate?: (updatedUserOrUpdater: UserUpdateArg) => void;
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

  // Keep latest user snapshot for deterministic rollback and to avoid stale closures.
  const latestUserRef = useRef<User>(user);
  useEffect(() => {
    latestUserRef.current = user;
  }, [user]);

  // Async action isolation (out-of-order protection) + simple lock to avoid conflicting parallel actions.
  const actionSeqRef = useRef(0);
  const activeActionIdRef = useRef<number | null>(null);
  const busyRef = useRef(false);

  const beginAction = useCallback((): number | null => {
    if (busyRef.current) return null;
    const id = ++actionSeqRef.current;
    busyRef.current = true;
    activeActionIdRef.current = id;
    setIsUploading(true);
    setUploadError('');
    return id;
  }, []);

  const endAction = useCallback((actionId: number) => {
    if (activeActionIdRef.current !== actionId) return;
    activeActionIdRef.current = null;
    busyRef.current = false;
    setIsUploading(false);
  }, []);

  const mergeUserIfChanged = useCallback(
    (partial: Partial<User>) => {
      if (!onUserUpdate) return;
      onUserUpdate((prev) => {
        if (!prev) return prev;
        let changed = false;
        const next: User = { ...prev };
        for (const [k, v] of Object.entries(partial)) {
          const key = k as keyof User;
          if (next[key] !== v) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (next as any)[key] = v;
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    },
    [onUserUpdate]
  );

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
      setUploadError('');
    } else {
      setEditableUser(null);
      setUploadError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- editableUser sa vytvára len pri vstupe
  }, [isEditMode]);

  const handleEditableUserUpdate = useCallback((partial: Partial<User>) => {
    setEditableUser((prev) => (prev ? { ...prev, ...partial } : null));
  }, []);

  const handleSave = useCallback(async (mergedUser?: User) => {
    const toSave = mergedUser ?? editableUser;
    if (!toSave || !onUserUpdate || !onEditCancel) return;
    const actionId = beginAction();
    if (actionId == null) return;

    // Deterministic rollback snapshot (full user object).
    const previousUser = deepCloneUser(latestUserRef.current);
    try {
      const payload = buildPatchPayload(toSave);
      // Optimistic update: apply only fields we actually PATCH.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const optimisticPartial = payload as any as Partial<User>;
      mergeUserIfChanged(optimisticPartial);

      const response = await api.patch('/auth/profile/', payload);
      if (activeActionIdRef.current !== actionId) return;
      if (response.data?.user) {
        setUploadError('');
        const touchedKeys = Object.keys(payload);
        const derivedKeys: (keyof User)[] = ['slug', 'profile_completeness', 'updated_at'];
        const nextPartial: Partial<User> = {};
        for (const k of touchedKeys) {
          if (k in response.data.user) {
            const key = k as keyof User;
            nextPartial[key] = response.data.user[key];
          }
        }
        for (const key of derivedKeys) {
          if (key in response.data.user) nextPartial[key] = response.data.user[key];
        }
        try {
          const scrollEl = document.querySelector('[data-dashboard-main]') as HTMLElement | null;
          const scrollTop = scrollEl?.scrollTop ?? 0;
          mergeUserIfChanged(nextPartial);
          setEditableUser(null);
          onEditCancel();
          // Zachovať scroll – po save sa obsah prepne a prehliadač resetuje scroll; obnoviť po re-renderi
          const restoreScroll = () => {
            const el = document.querySelector('[data-dashboard-main]') as HTMLElement | null;
            if (el && scrollTop > 0) {
              el.scrollTop = scrollTop;
            }
          };
          requestAnimationFrame(() => {
            requestAnimationFrame(restoreScroll);
          });
          setTimeout(restoreScroll, 50);
          setTimeout(restoreScroll, 150);
        } catch (postSuccessError) {
          console.error('Error after successful save:', postSuccessError);
          setEditableUser(null);
          onEditCancel();
        }
      }
    } catch (e: unknown) {
      if (activeActionIdRef.current !== actionId) return;
      // Deterministic rollback: restore exact snapshot from before the action.
      onUserUpdate(() => previousUser);
      const err = e as { response?: { data?: { details?: Record<string, string[]> } } };
      const details = err?.response?.data?.details;
      const firstMsg = details && Object.values(details).flat().find((m): m is string => typeof m === 'string');
      setUploadError(firstMsg || 'Nepodarilo sa uložiť.');
    } finally {
      endAction(actionId);
    }
  }, [editableUser, onUserUpdate, onEditCancel, beginAction, endAction, mergeUserIfChanged]);

  const handleCancel = useCallback(() => {
    setEditableUser(null);
    setUploadError('');
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
    const actionId = beginAction();
    if (actionId == null) return;

    // Optimistic local preview (instant UI)
    const previousUser = deepCloneUser(latestUserRef.current);
    if (avatarPreviewUrlRef.current) {
      URL.revokeObjectURL(avatarPreviewUrlRef.current);
      avatarPreviewUrlRef.current = null;
    }
    const previewUrl = URL.createObjectURL(file);
    const previewUrlForThisAction = previewUrl;
    avatarPreviewUrlRef.current = previewUrl;
    mergeUserIfChanged({ avatar_url: previewUrl });
    if (isEditMode && editableUser) {
      handleEditableUserUpdate({ avatar_url: previewUrl } as Partial<User>);
    }

    setUploadSuccess(false);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await api.patch<{ user: User }>('/auth/profile/', formData);
      if (activeActionIdRef.current !== actionId) return;
      if (response.data?.user) {
        mergeUserIfChanged({
          avatar_url: response.data.user.avatar_url,
          avatar: response.data.user.avatar,
        });
        if (isEditMode && editableUser) {
          handleEditableUserUpdate({
            avatar_url: response.data.user.avatar_url,
            avatar: response.data.user.avatar,
          });
        }
      }
      // Revoke preview only if it's still the current optimistic URL.
      if (avatarPreviewUrlRef.current === previewUrlForThisAction) {
        URL.revokeObjectURL(previewUrlForThisAction);
        avatarPreviewUrlRef.current = null;
      }
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (error: any) {
      if (activeActionIdRef.current !== actionId) return;
      // Deterministic rollback: restore exact snapshot from before the action.
      onUserUpdate(() => previousUser);
      if (avatarPreviewUrlRef.current === previewUrlForThisAction) {
        URL.revokeObjectURL(previewUrlForThisAction);
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
      endAction(actionId);
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
    const actionId = beginAction();
    if (actionId == null) return;

    // Optimistic remove + rollback (functional form avoids race conditions)
    const previousUser = deepCloneUser(latestUserRef.current);
    mergeUserIfChanged({ avatar: undefined, avatar_url: undefined });
    if (isEditMode && editableUser) {
      handleEditableUserUpdate({ avatar: undefined, avatar_url: undefined } as Partial<User>);
    }
    if (avatarPreviewUrlRef.current) {
      URL.revokeObjectURL(avatarPreviewUrlRef.current);
      avatarPreviewUrlRef.current = null;
    }

    try {
      const response = await api.patch<{ user: User }>('/auth/profile/', { avatar: null });
      if (activeActionIdRef.current !== actionId) return;
      if (response.data?.user) {
        mergeUserIfChanged({
          avatar: response.data.user.avatar,
          avatar_url: response.data.user.avatar_url,
        });
        if (isEditMode && editableUser) {
          handleEditableUserUpdate({
            avatar: response.data.user.avatar,
            avatar_url: response.data.user.avatar_url,
          });
        }
      }
      setIsActionsOpen(false);
    } catch (e: any) {
      if (activeActionIdRef.current !== actionId) return;
      // Deterministic rollback: restore exact snapshot from before the action.
      onUserUpdate(() => previousUser);
      const details = e?.response?.data?.details || e?.response?.data?.validation_errors;
      const avatarErrors: string[] | undefined = details?.avatar;
      const message =
        avatarErrors?.[0] ||
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        'Nepodarilo sa odstrániť fotku. Skúste znova.';
      setUploadError(message);
    } finally {
      endAction(actionId);
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
          <div className="mt-4 success-alert-modern">
            ✓ {t('profile.photoUploaded', 'Fotka bola úspešne nahraná!')}
          </div>
        )}

        {/* Error message */}
        {uploadError && (
          <div className="mt-4 error-alert-modern">
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


