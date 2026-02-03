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

interface ProfileDesktopViewProps {
  user: User;
  displayUser: User;
  isEditMode: boolean;
  accountType?: 'personal' | 'business';
  isUploading: boolean;
  onUserUpdate?: (updatedUser: User) => void;
  onEditProfileClick?: () => void;
  onPhotoUpload: (file: File) => void;
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
  displayUser,
  isEditMode,
  accountType = 'personal',
  isUploading,
  onUserUpdate,
  onEditProfileClick,
  onPhotoUpload,
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
  const [isHamburgerModalOpen, setIsHamburgerModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="hidden lg:block w-full">
      <div className="flex flex-col items-stretch w-full gap-[clamp(1rem,2vw,1.5rem)]">
        {/* Pôvodný desktop obsah */}
        <div className="w-full">
          {isEditMode ? (
            <ProfileEditFormDesktop
              user={user}
              onUserUpdate={onUserUpdate}
              onEditProfileClick={onEditProfileClick}
              onPhotoUpload={onPhotoUpload}
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
        <ProfileDesktopHamburgerModal open={isHamburgerModalOpen} onClose={() => setIsHamburgerModalOpen(false)} />
      )}
    </div>
  );
}

