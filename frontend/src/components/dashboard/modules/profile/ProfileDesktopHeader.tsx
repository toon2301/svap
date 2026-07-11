'use client';

import React, { useSyncExternalStore } from 'react';
import type { User } from '../../../../types';
import { useLanguage } from '@/contexts/LanguageContext';
import { getProfileDisplayName } from '@/lib/profileDisplayName';
import UserAvatar from './UserAvatar';
import WebsitesRow from './view/WebsitesRow';
import { ProfileDesktopSocialLinks } from './ProfileDesktopSocialLinks';
import { ProfileLikeButton } from './ProfileLikeButton';

function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === 'undefined') return () => {};
      const mql = window.matchMedia(query);
      const handler = () => onStoreChange();
      mql.addEventListener('change', handler);
      return () => mql.removeEventListener('change', handler);
    },
    () => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false),
    () => false,
  );
}

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
  isOpeningConversation?: boolean;
  onToggleFavorite?: () => void;
  isFavorited?: boolean;
  isFavoritePending?: boolean;
  onToggleProfileLike?: () => void;
  isProfileLikePending?: boolean;
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
  isOpeningConversation = false,
  onToggleFavorite,
  isFavorited = false,
  isFavoritePending = false,
  onToggleProfileLike,
  isProfileLikePending = false,
  onSkillsClick,
  onHamburgerOpen,
}: Props) {
  const { t } = useLanguage();
  const is1024to1190 = useMediaQuery('(min-width: 1024px) and (max-width: 1190px)');
  const primaryActionLabel = isOtherUserProfile
    ? isOpeningConversation
      ? t('messages.opening', 'Otváram…')
      : t('profile.sendMessage', 'Poslať správu')
    : t('profile.editProfile');
  const favoriteActionLabel = isFavorited
    ? t('profile.removeFromFavorites', 'Odobrať z obľúbených')
    : t('profile.addToFavorites', '+ Pridať k obľúbeným');

  const profileLikesCount = Math.max(0, Number(displayUser.profile_likes_count ?? 0));
  const isProfileLiked = displayUser.is_profile_liked_by_me === true;

  const actionButtonClass =
    'flex min-w-0 items-center justify-center overflow-hidden whitespace-nowrap rounded-2xl border border-purple-200 bg-purple-100 px-4 py-2 text-center text-sm text-purple-800 transition-colors hover:bg-purple-200 disabled:cursor-not-allowed disabled:opacity-60';
  const menuButtonClass =
    'flex h-10 w-11 shrink-0 items-center justify-center rounded-2xl border border-purple-200 bg-purple-100 text-purple-800 transition-colors hover:bg-purple-200';

  return (
    <div className="flex flex-col items-start w-full lg:items-stretch xl:items-start">
      <div className="flex gap-[clamp(1rem,2vw,2rem)] items-start lg:items-center w-full">
        <div className="flex-shrink-0">
          <UserAvatar
            user={displayUser}
            size="large"
            onPhotoUpload={isOtherUserProfile ? undefined : onPhotoUpload}
            isUploading={isUploading}
            onAvatarClick={onAvatarClick}
          />
        </div>

        <div className="flex flex-col flex-grow min-w-0">
          {/* Meno používateľa a sociálne siete v jednom riadku */}
          <div className="mb-1 flex min-w-0 items-center justify-between gap-5">
            <div className="flex min-w-0 items-center gap-3">
              <h2 className="min-w-0 truncate text-[clamp(1.25rem,2vw,1.75rem)] font-semibold text-gray-900 dark:text-white">
                {getProfileDisplayName(displayUser, accountType)}
              </h2>
            </div>
            {!is1024to1190 && <ProfileDesktopSocialLinks user={displayUser} />}
          </div>

          {(Number(displayUser.completed_cooperations_count) || 0) > 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-0">
              Dokončené spolupráce: {displayUser.completed_cooperations_count}
            </p>
          )}

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
          {displayUser.phone && (!isOtherUserProfile || displayUser.phone_visible) && (
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
            <p className="text-gray-600 dark:text-gray-300 text-sm flex items-center gap-1 no-underline">
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
              <span className="no-underline">{displayUser.contact_email}</span>
            </p>
          )}

          {/* IČO - iba pre firemné účty */}
          {accountType === 'business' && displayUser.ico && (!isOtherUserProfile || displayUser.ico_visible) && (
            <p className="text-gray-600 dark:text-gray-300 text-sm">IČO: {displayUser.ico}</p>
          )}

          {/* Profesia - len pre osobný účet */}
          {accountType === 'personal' && displayUser.job_title && (!isOtherUserProfile || displayUser.job_title_visible) && (
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

      {is1024to1190 && (
        <div className="mt-3 w-full flex justify-start">
          <ProfileDesktopSocialLinks user={displayUser} />
        </div>
      )}

      {/* Tlačidlá pod fotkou – 1024–1190px: celá šírka, rovnako veľké, vycentrované */}
      {!isOtherUserProfile && (
        <div className="mt-[clamp(0.75rem,1.5vw,0.75rem)] flex w-full max-w-[660px] items-center gap-3 lg:self-stretch xl:self-auto">
          <span
            className="h-[1.5px] min-w-0 flex-1 rounded-full bg-gradient-to-r from-transparent via-gray-300 to-purple-300/80 dark:via-gray-700 dark:to-purple-800/70"
            aria-hidden="true"
          />
          <ProfileLikeButton
            showText
            unstyled
            icon="thumb"
            tone="purple"
            isLiked={profileLikesCount > 0}
            likesCount={profileLikesCount}
            label={t('profile.thumbsUp', 'Palec hore')}
            staticLabel={t('profile.thumbsUp', 'Palec hore')}
            className="h-auto gap-2 px-2 py-1 text-sm"
          />
          <span
            className="h-[1.5px] min-w-0 flex-1 rounded-full bg-gradient-to-l from-transparent via-gray-300 to-purple-300/80 dark:via-gray-700 dark:to-purple-800/70"
            aria-hidden="true"
          />
        </div>
      )}

      <div
        className={[
          'mt-[clamp(0.75rem,1.5vw,0.75rem)] grid w-full max-w-[660px] gap-2 lg:self-stretch xl:self-auto',
          isOtherUserProfile
            ? 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_2.75rem]'
            : 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.75rem]',
        ].join(' ')}
      >
        <button
          data-onboarding={!isOtherUserProfile ? 'profile-edit-button' : undefined}
          type="button"
          onClick={() => {
            if (isOtherUserProfile && isOpeningConversation) return;
            if (isOtherUserProfile && onSendMessage) {
              onSendMessage();
            } else if (onEditProfileClick) {
              onEditProfileClick();
            }
          }}
          disabled={isOtherUserProfile && isOpeningConversation}
          className={actionButtonClass}
        >
          {primaryActionLabel}
        </button>

        {isOtherUserProfile ? (
          <>
            <button
              type="button"
              onClick={() => {
                if (onToggleFavorite) {
                  onToggleFavorite();
                }
              }}
              aria-pressed={isFavorited}
              aria-busy={isFavoritePending}
              disabled={isFavoritePending}
              className={actionButtonClass}
            >
              {favoriteActionLabel}
            </button>
            <ProfileLikeButton
              showText
              icon="thumb"
              tone="purple"
              isLiked={isProfileLiked}
              likesCount={profileLikesCount}
              label={t('profile.thumbsUp', 'Palec hore')}
              staticLabel={t('profile.thumbsUp', 'Palec hore')}
              onToggle={onToggleProfileLike}
              isPending={isProfileLikePending}
              className={[
                '!h-10 !w-full !min-w-0 !rounded-2xl !border !px-4 !py-2 !text-sm !shadow-none',
                isProfileLiked
                  ? '!border-purple-300 !bg-purple-600 !text-white hover:!bg-purple-700 dark:!border-purple-200 dark:!bg-purple-100 dark:!text-purple-800 dark:hover:!bg-purple-200'
                  : '!border-purple-200 !bg-purple-100 !text-purple-800 hover:!bg-purple-200 dark:!border-purple-200 dark:!bg-purple-100 dark:!text-purple-800 dark:hover:!bg-purple-200',
              ].join(' ')}
            />
            <button
              type="button"
              onClick={onHamburgerOpen}
              className={menuButtonClass}
              aria-label="Menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </>
        ) : (
          <>
            <button
              data-onboarding="profile-skills-button"
              type="button"
              onClick={() => {
                // Desktop: prepnúť na prázdny screen Zručnosti
                if (typeof onSkillsClick === 'function') {
                  onSkillsClick();
                }
              }}
              className={actionButtonClass}
            >
              {t('profile.skills', 'Ponúkam/Hľadám')}
            </button>
            <button
              type="button"
              onClick={onHamburgerOpen}
              className={menuButtonClass}
              aria-label={t('profile.moreActions', 'Viac možností')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
