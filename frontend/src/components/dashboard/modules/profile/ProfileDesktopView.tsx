'use client';

import React, { useEffect, useState } from 'react';
import type { User } from '../../../../types';
import ProfileEditFormDesktop from '../ProfileEditFormDesktop';
import ProfileOffersSection from './ProfileOffersSection';
import type { ProfileTab } from './profileTypes';
import UserInfo from './UserInfo';
import { ProfileDesktopHeader } from './ProfileDesktopHeader';
import { ProfileDesktopTabs } from './ProfileDesktopTabs';
import { ProfileDesktopHamburgerModal } from './ProfileDesktopHamburgerModal';
import { ReportUserModal } from './ReportUserModal';

interface ProfileDesktopViewProps {
  user: User;
  /** Pre view (source of truth). Pri cudzom profile = profileUser; pri vlastnom = user. */
  displayUser?: User;
  editableUser?: User | null;
  isEditMode: boolean;
  accountType?: 'personal' | 'business';
  isUploading: boolean;
  onUserUpdate?: (updatedUser: User) => void;
  onEditableUserUpdate?: (partial: Partial<User>) => void;
  onEditProfileClick?: () => void;
  onEditCancel?: () => void;
  onEditSave?: (mergedUser?: User) => Promise<void>;
  onPhotoUpload: (file: File) => void;
  onRemoveAvatar?: () => Promise<void>;
  onAvatarClick: () => void;
  onSkillsClick?: () => void;
  activeTab: ProfileTab;
  onChangeTab: (tab: ProfileTab) => void;
  onTabsKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  onOpenAllWebsitesModal: () => void;
  offersOwnerId?: number;
  isOtherUserProfile?: boolean;
  onSendMessage?: () => void;
  onAddToFavorites?: () => void;
  highlightedSkillId?: number | null;
}

export default function ProfileDesktopView({
  user,
  displayUser: displayUserProp,
  editableUser,
  isEditMode,
  accountType = 'personal',
  isUploading,
  onUserUpdate,
  onEditableUserUpdate,
  onEditProfileClick,
  onEditCancel,
  onEditSave,
  onPhotoUpload,
  onRemoveAvatar,
  onAvatarClick,
  onSkillsClick,
  activeTab,
  onChangeTab,
  onTabsKeyDown,
  onOpenAllWebsitesModal,
  offersOwnerId,
  isOtherUserProfile = false,
  onSendMessage,
  onAddToFavorites,
  highlightedSkillId,
}: ProfileDesktopViewProps) {
  const displayUser = displayUserProp ?? user;
  const [isHamburgerModalOpen, setIsHamburgerModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportedUserIds, setReportedUserIds] = useState<Set<number>>(() => new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="hidden lg:block w-full">
      <div className="flex flex-col items-stretch w-full gap-[clamp(1rem,2vw,1.5rem)]">
        {/* Pôvodný desktop obsah */}
        <div className="w-full">
          {isEditMode && editableUser && onEditableUserUpdate ? (
            <ProfileEditFormDesktop
              user={user}
              editableUser={editableUser}
              onEditableUserUpdate={onEditableUserUpdate}
              onEditProfileClick={onEditProfileClick}
              onEditCancel={onEditCancel}
          onEditSave={onEditSave}
          onPhotoUpload={onPhotoUpload}
          onRemoveAvatar={onRemoveAvatar}
          isUploadingFromParent={isUploading}
              onAvatarClick={onAvatarClick}
              accountType={accountType}
            />
          ) : (
            <>
              <div className="flex flex-col gap-[clamp(1rem,2vw,1.5rem)] mb-[clamp(1rem,2vw,1.5rem)]">
                <ProfileDesktopHeader
                  displayUser={displayUser}
                  accountType={accountType}
                  isOtherUserProfile={isOtherUserProfile}
                  isUploading={isUploading}
                  onPhotoUpload={onPhotoUpload}
                  onAvatarClick={onAvatarClick}
                  onOpenAllWebsitesModal={onOpenAllWebsitesModal}
                  onEditProfileClick={onEditProfileClick}
                  onSendMessage={onSendMessage}
                  onAddToFavorites={onAddToFavorites}
                  onSkillsClick={onSkillsClick}
                  onHamburgerOpen={() => setIsHamburgerModalOpen(true)}
                />

                <ProfileDesktopTabs activeTab={activeTab} onChangeTab={onChangeTab} onTabsKeyDown={onTabsKeyDown} />
              </div>

              <ProfileOffersSection
                activeTab={activeTab}
                accountType={accountType}
                ownerUserId={offersOwnerId ?? displayUser.id}
                ownerDisplayName={
                  (displayUser.company_name && displayUser.company_name.trim()) ||
                  [displayUser.first_name, displayUser.last_name].filter(Boolean).join(' ').trim() ||
                  displayUser.username ||
                  ''
                }
                highlightedSkillId={highlightedSkillId ?? null}
                isOtherUserProfile={isOtherUserProfile}
              />

              <div className="w-full">
                <UserInfo user={displayUser} />
              </div>
            </>
          )}
        </div>
      </div>

      {isOtherUserProfile && mounted && (
        <>
          <ProfileDesktopHamburgerModal
            open={isHamburgerModalOpen}
            onClose={() => setIsHamburgerModalOpen(false)}
            onReportClick={() => setReportModalOpen(true)}
            isReported={reportedUserIds.has(displayUser.id)}
          />
          <ReportUserModal
            open={reportModalOpen}
            onClose={() => setReportModalOpen(false)}
            userId={displayUser.id}
            onSuccess={() => {
              setReportedUserIds((prev) => new Set(prev).add(displayUser.id));
              setReportModalOpen(false);
            }}
          />
        </>
      )}
    </div>
  );
}

