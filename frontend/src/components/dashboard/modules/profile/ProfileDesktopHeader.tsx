'use client';

import React from 'react';
import type { User } from '../../../../types';
import { useLanguage } from '@/contexts/LanguageContext';
import UserAvatar from './UserAvatar';
import WebsitesRow from './view/WebsitesRow';
import { ProfileDesktopSocialLinks } from './ProfileDesktopSocialLinks';

type Props = {
  displayUser: User;
  accountType: 'personal' | 'business';
  isOtherUserProfile: boolean;
  isUploading: boolean;
  onPhotoUpload: (file: File) => void;
  onAvatarClick: () => void;
  onOpenAllWebsitesModal: () => void;
  onEditProfileClick?: () => void;
  onSendMessage?: () => void;
  onAddToFavorites?: () => void;
  onSkillsClick?: () => void;
  onHamburgerOpen: () => void;
};

export function ProfileDesktopHeader({
  displayUser,
  accountType,
  isOtherUserProfile,
  isUploading,
  onPhotoUpload,
  onAvatarClick,
  onOpenAllWebsitesModal,
  onEditProfileClick,
  onSendMessage,
  onAddToFavorites,
  onSkillsClick,
  onHamburgerOpen,
}: Props) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col items-start w-full">
      <div className="flex gap-[clamp(1rem,2vw,2rem)] items-start lg:items-center w-full">
        <div className="flex-shrink-0">
          <UserAvatar
            user={displayUser}
            size="large"
            onPhotoUpload={onPhotoUpload}
            isUploading={isUploading}
            onAvatarClick={onAvatarClick}
          />
        </div>

        <div className="flex flex-col flex-grow min-w-0">
          {/* Meno používateľa a sociálne siete v jednom riadku */}
          <div className="flex items-center gap-20 mb-2">
            <h2 className="text-[clamp(1.25rem,2vw,1.75rem)] font-semibold text-gray-900 dark:text-white">
              {accountType === 'business'
                ? (displayUser.company_name || displayUser.username)
                : ([displayUser.first_name, displayUser.last_name].filter(Boolean).join(' ').trim() || displayUser.username)}
            </h2>
            <ProfileDesktopSocialLinks user={displayUser} />
          </div>

          {/* Email intentionally not shown here (kept in edit views) */}
          {/* Lokalita - zobrazí mesto/dedinu ak je, inak okres ak je */}
          {(displayUser.location || displayUser.district) && (
            <p className="text-gray-600 dark:text-gray-300 text-sm flex items-center gap-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-4 text-gray-500 dark:text-gray-400"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
                />
              </svg>
              {displayUser.location || displayUser.district}
            </p>
          )}

          {/* Telefónne číslo */}
          {displayUser.phone && (!isOtherUserProfile || !displayUser.phone_visible) && (
            <p className="text-gray-600 dark:text-gray-300 text-sm flex items-center gap-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-4 text-gray-500 dark:text-gray-400"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
                />
              </svg>
              {displayUser.phone}
            </p>
          )}

          {/* Kontaktný Email - len pre firemný účet */}
          {accountType === 'business' && displayUser.contact_email && (
            <p className="text-gray-600 dark:text-gray-300 text-sm flex items-center gap-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-4 text-gray-500 dark:text-gray-400"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                />
              </svg>
              {displayUser.contact_email}
            </p>
          )}

          {/* IČO - iba pre firemné účty */}
          {accountType === 'business' && displayUser.ico && (!isOtherUserProfile || !displayUser.ico_visible) && (
            <p className="text-gray-600 dark:text-gray-300 text-sm">IČO: {displayUser.ico}</p>
          )}

          {/* Profesia - len pre osobný účet */}
          {accountType === 'personal' && displayUser.job_title && (!isOtherUserProfile || !displayUser.job_title_visible) && (
            <p className="text-gray-600 dark:text-gray-300 text-sm flex items-center gap-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-4 text-gray-500 dark:text-gray-400"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0M12 12.75h.008v.008H12v-.008Z"
                />
              </svg>
              {displayUser.job_title}
            </p>
          )}

          {/* Webová stránka + "a ďalší" (desktop) */}
          <WebsitesRow user={displayUser} onOpenAll={onOpenAllWebsitesModal} />
        </div>
      </div>

      {/* BIO - pod sociálnymi sieťami, nad tlačidlami */}
      {displayUser.bio && displayUser.bio.trim() && (
        <div className="mt-4">
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">{displayUser.bio}</p>
        </div>
      )}

      {/* Tlačidlá pod fotkou */}
      <div className="flex gap-[clamp(0.5rem,1vw,0.5rem)] mt-[clamp(0.75rem,1.5vw,0.75rem)]">
        <button
          onClick={() => {
            if (isOtherUserProfile && onSendMessage) {
              onSendMessage();
            } else if (onEditProfileClick) {
              onEditProfileClick();
            } else {
              // eslint-disable-next-line no-console
              console.log(isOtherUserProfile ? 'Poslať správu' : 'Upraviť profil');
            }
          }}
          className="flex-1 px-[clamp(4rem,8vw,8rem)] xl:px-16 2xl:px-32 py-2 text-sm bg-purple-100 text-purple-800 border border-purple-200 rounded-2xl transition-colors hover:bg-purple-200 whitespace-nowrap min-w-[200px]"
        >
          {isOtherUserProfile ? t('profile.sendMessage', 'Poslať správu') : t('profile.editProfile')}
        </button>

        {isOtherUserProfile ? (
          <>
            <button
              onClick={() => {
                if (onAddToFavorites) {
                  onAddToFavorites();
                }
              }}
              className="flex-1 px-[clamp(4rem,8vw,8rem)] xl:px-16 2xl:px-32 py-2 text-sm bg-purple-100 text-purple-800 border border-purple-200 rounded-2xl transition-colors hover:bg-purple-200 whitespace-nowrap min-w-[200px]"
            >
              {t('profile.addToFavorites', '+ Pridať k obľúbeným')}
            </button>
            <button
              onClick={onHamburgerOpen}
              className="px-3 py-2 bg-purple-100 text-purple-800 border border-purple-200 rounded-2xl transition-colors hover:bg-purple-200 flex items-center justify-center"
              aria-label="Menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </>
        ) : (
          <button
            onClick={() => {
              // Desktop: prepnúť na prázdny screen Zručnosti
              if (typeof onSkillsClick === 'function') {
                onSkillsClick();
              } else {
                // eslint-disable-next-line no-console
                console.log('Zručnosti');
              }
            }}
            className="flex-1 px-[clamp(4rem,8vw,8rem)] xl:px-16 2xl:px-32 py-2 text-sm bg-purple-100 text-purple-800 border border-purple-200 rounded-2xl transition-colors hover:bg-purple-200 whitespace-nowrap min-w-[200px]"
          >
            {t('profile.skills', 'Ponúkam/Hľadám')}
          </button>
        )}
      </div>
    </div>
  );
}

