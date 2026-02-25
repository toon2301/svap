'use client';

import React, { useState, useEffect } from 'react';
import { User } from '../../../../types';
import { useLanguage } from '@/contexts/LanguageContext';
import UserAvatar from './UserAvatar';
import UserInfo from './UserInfo';
import ProfileEditFormMobile from '../ProfileEditFormMobile';
import ProfileOffersMobileSection from './ProfileOffersMobileSection';
import type { ProfileTab } from './profileTypes';
import ProfileMobileSocialLinks from './ProfileMobileSocialLinks';
import ProfileMobileHamburgerModal from './ProfileMobileHamburgerModal';
import { InformationCircleIcon, ClipboardIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { createPortal } from 'react-dom';

interface ProfileMobileViewProps {
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
  onHamburgerMenuClick?: () => void;
   highlightedSkillId?: number | null;
}

export default function ProfileMobileView({
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
  onHamburgerMenuClick,
  highlightedSkillId,
}: ProfileMobileViewProps) {
  const { t } = useLanguage();
  const [isHamburgerModalOpen, setIsHamburgerModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Skrátiť email ak je príliš dlhý (viac ako 20 znakov)
  const MAX_EMAIL_DISPLAY_LENGTH = 20;
  const contactEmail = displayUser.contact_email || '';
  const shouldTruncateEmail = contactEmail.length > MAX_EMAIL_DISPLAY_LENGTH;
  const truncatedEmail = shouldTruncateEmail
    ? `${contactEmail.slice(0, MAX_EMAIL_DISPLAY_LENGTH)}...`
    : contactEmail;

  // Kopírovať email do clipboardu
  const handleCopyEmail = async () => {
    if (!displayUser.contact_email) return;
    try {
      await navigator.clipboard.writeText(displayUser.contact_email);
      toast.success(t('profile.emailCopied', 'Email skopírovaný'));
    } catch (error) {
      console.error('Failed to copy email:', error);
      toast.error(t('profile.emailCopyFailed', 'Nepodarilo sa skopírovať email'));
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Exponovať funkciu na otvorenie modalu cez window event
  useEffect(() => {
    if (isOtherUserProfile) {
      // Uložiť referenciu na otvorenie modalu
      (window as any).__openUserProfileModal = () => setIsHamburgerModalOpen(true);
    }
    return () => {
      if ((window as any).__openUserProfileModal) {
        delete (window as any).__openUserProfileModal;
      }
    };
  }, [isOtherUserProfile]);

  return (
    <div className="lg:hidden">
      {isEditMode ? (
        // Edit mode - show ProfileEditFormMobile
        <ProfileEditFormMobile
          user={user}
          onUserUpdate={onUserUpdate}
          onEditProfileClick={onEditProfileClick}
          onPhotoUpload={onPhotoUpload}
          isUploading={isUploading}
          onAvatarClick={onAvatarClick}
          accountType={accountType}
        />
      ) : (
        // Normal profile view
        <>
          <div className="mb-4">
            <div className="flex gap-3 items-start">
              <div className="flex-shrink-0">
                <UserAvatar
                  user={displayUser}
                  size="medium"
                  onPhotoUpload={isOtherUserProfile ? undefined : onPhotoUpload}
                  isUploading={isUploading}
                  onAvatarClick={onAvatarClick}
                />
              </div>
              <div className="flex flex-col justify-center min-w-0 flex-1 overflow-hidden">
                {/* Meno používateľa */}
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  {accountType === 'business' 
                    ? (displayUser.company_name || displayUser.username)
                    : ([displayUser.first_name, displayUser.last_name].filter(Boolean).join(' ').trim() || displayUser.username)
                  }
                </h2>
                {/* Email intentionally not shown here (kept in edit views) */}
                {/* Lokalita - zobrazí mesto/dedinu ak je, inak okres ak je */}
                {(displayUser.location || displayUser.district) && (() => {
                  const locationText = displayUser.location || displayUser.district || '';
                  const isLong = locationText.length > 15;
                  return (
                    <p className={`text-gray-600 dark:text-gray-300 ${isLong ? 'text-xs' : 'text-sm'} flex items-center gap-1 mt-1`}>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className={`${isLong ? 'size-2.5' : 'size-3'}`}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
                        />
                      </svg>
                      <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                        {locationText}
                      </span>
                    </p>
                  );
                })()}
                {/* Telefónne číslo */}
                {displayUser.phone && (!isOtherUserProfile || !displayUser.phone_visible) && (
                  <p className="text-gray-600 dark:text-gray-300 text-sm flex items-center gap-1 min-w-0">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="size-3"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
                      />
                    </svg>
                    <span className="truncate min-w-0">{displayUser.phone}</span>
                  </p>
                )}
                {/* Kontaktný Email - len pre firemný účet */}
                {accountType === 'business' && displayUser.contact_email && (
                  <div 
                    className="text-gray-600 dark:text-gray-300 text-sm flex items-center gap-1 no-underline cursor-pointer min-w-0"
                    onClick={() => shouldTruncateEmail && setIsEmailModalOpen(true)}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="size-3 flex-shrink-0"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                      />
                    </svg>
                    <span className="no-underline flex-1 min-w-0 whitespace-nowrap overflow-hidden text-ellipsis">
                      {truncatedEmail}
                    </span>
                    {shouldTruncateEmail && (
                      <InformationCircleIcon className="w-4 h-4 flex-shrink-0 text-gray-400 dark:text-gray-500" />
                    )}
                  </div>
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
                      className="size-3"
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
              </div>
            </div>
            {/* Webová stránka úplne z ľavej strany NAD buttony */}
            {(() => {
              const totalWebsites =
                (displayUser.website ? 1 : 0) +
                (displayUser.additional_websites ? displayUser.additional_websites.length : 0);
              const additionalCount = totalWebsites - 1;

              if (totalWebsites === 0) return null;

              // Zobraz prvý dostupný web
              const firstWebsite =
                displayUser.website ||
                (displayUser.additional_websites && displayUser.additional_websites[0]);

              return (
                <div className="mt-3">
                  <p className="text-gray-600 dark:text-gray-300 text-sm flex items-center gap-1 min-w-0">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="size-3 flex-shrink-0"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"
                      />
                    </svg>
                    {additionalCount > 0 ? (
                      // Viac webov - celý text je klikateľný na modal
                      <span
                        className="flex items-center flex-wrap cursor-pointer min-w-0"
                        onClick={onOpenAllWebsitesModal}
                      >
                        <span className="text-blue-600 hover:text-blue-400 dark:text-blue-400 dark:hover:text-blue-300 transition-colors truncate max-w-[200px]">
                          {firstWebsite}
                        </span>
                        <span className="text-blue-600 dark:text-blue-400 hover:text-blue-400 dark:hover:text-blue-300 ml-1 whitespace-nowrap">
                          a ďalší ({additionalCount})
                        </span>
                      </span>
                    ) : (
                      // Jeden web - klikateľný odkaz
                      <a
                        href={firstWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-400 dark:text-blue-400 dark:hover:text-blue-300 transition-colors truncate min-w-0 flex-1"
                      >
                        {firstWebsite}
                      </a>
                    )}
                  </p>
                </div>
              );
            })()}
            {/* BIO - pod linkom, alebo na tom istom mieste ak link nie je */}
            {displayUser.bio && displayUser.bio.trim() && (
              <div className="mt-3">
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                  {displayUser.bio}
                </p>
              </div>
            )}
            {/* Sociálne siete - pod linky alebo na spodku ak nie sú linky */}
            <ProfileMobileSocialLinks user={displayUser} />
            {/* Tlačidlá POD webovou stránkou */}
            <div className="flex gap-2 mt-2">
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
                className="flex-1 px-3 py-1.5 text-xs bg-purple-100 text-purple-800 border border-purple-200 rounded-2xl transition-colors hover:bg-purple-200 whitespace-nowrap min-w-0"
              >
                {isOtherUserProfile
                  ? t('profile.sendMessage', 'Poslať správu')
                  : t('profile.editProfile', 'Upraviť profil')}
              </button>
              {isOtherUserProfile ? (
                <button
                  onClick={() => {
                    if (onAddToFavorites) {
                      onAddToFavorites();
                    }
                  }}
                  className="flex-1 px-3 py-1.5 text-xs bg-purple-100 text-purple-800 border border-purple-200 rounded-2xl transition-colors hover:bg-purple-200 whitespace-nowrap min-w-0"
                >
                  {t('profile.addToFavorites', '+ Pridať k obľúbeným')}
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (typeof onSkillsClick === 'function') {
                      onSkillsClick();
                    }
                  }}
                  className="flex-1 px-3 py-1.5 text-xs bg-purple-100 text-purple-800 border border-purple-200 rounded-2xl transition-colors hover:bg-purple-200 whitespace-nowrap min-w-0"
                >
                  {t('profile.skills', 'Ponúkam/Hľadám')}
                </button>
              )}
            </div>
            {/* Ikonová navigácia sekcií profilu (mobile) */}
            <div className="mt-3 w-full">
              <div
                role="tablist"
                aria-label="Sekcie profilu"
                className="w-full"
                tabIndex={0}
                onKeyDown={onTabsKeyDown}
              >
                <div className="flex w-full items-stretch rounded-2xl border-b border-gray-200 bg-white/60 dark:bg-[#0f0f10] dark:border-gray-800 shadow-sm overflow-hidden">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'offers'}
                    onClick={() => onChangeTab('offers')}
                    aria-label="Ponúkam / Hľadám"
                    title="Ponúkam / Hľadám"
                    className={[
                      'relative group flex-1 py-1 transition-all flex items-center justify-center min-w-[56px]',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60',
                      activeTab === 'offers'
                        ? 'bg-gradient-to-t from-purple-100 to-transparent text-purple-700 dark:from-purple-100 dark:to-purple-100/40 dark:text-purple-800'
                        : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#111214]',
                    ].join(' ')}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m7.875 14.25 1.214 1.942a2.25 2.25 0 0 0 1.908 1.058h2.006c.776 0 1.497-.4 1.908-1.058l1.214-1.942M2.41 9h4.636a2.25 2.25 0 0 1 1.872 1.002l.164.246a2.25 2.25 0 0 0 1.872 1.002h2.092a2.25 2.25 0 0 0 1.872-1.002l.164-.246A2.25 2.25 0 0 1 16.954 9h4.636M2.41 9a2.25 2.25 0 0 0-.16.832V12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 12V9.832c0-.287-.055-.57-.16-.832M2.41 9a2.25 2.25 0 0 1 .382-.632l3.285-3.832a2.25 2.25 0 0 1 1.708-.786h8.43c.657 0 1.281.287 1.709.786l3.284 3.832c.163.19.291.404.382.632M4.5 20.25h15A2.25 2.25 0 0 0 21.75 18v-2.625c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125V18a2.25 2.25 0 0 0 2.25 2.25Z"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'portfolio'}
                    onClick={() => onChangeTab('portfolio')}
                    aria-label="Portfólio"
                    title="Portfólio"
                    className={[
                      'relative group flex-1 py-1 transition-all flex items-center justify-center min-w-[56px]',
                      'border-l border-gray-200 dark:border-gray-800',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60',
                      activeTab === 'portfolio'
                        ? 'bg-gradient-to-t from-purple-100 to-transparent text-purple-700 dark:from-purple-100 dark:to-purple-100/40 dark:text-purple-800'
                        : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#111214]',
                    ].join(' ')}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 13.5V9.75A2.25 2.25 0 0018.75 7.5H5.25A2.25 2.25 0 003 9.75V13.5m18 0v4.5A2.25 2.25 0 0118.75 20.25H5.25A2.25 2.25 0 013 18v-4.5m18 0H3m12-6V4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 00-.75.75V7.5m6 0H9"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'posts'}
                    onClick={() => onChangeTab('posts')}
                    aria-label="Príspevky"
                    title="Príspevky"
                    className={[
                      'relative group flex-1 py-1 transition-all flex items-center justify-center min-w-[56px]',
                      'border-l border-gray-200 dark:border-gray-800',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60',
                      activeTab === 'posts'
                        ? 'bg-gradient-to-t from-purple-100 to-transparent text-purple-700 dark:from-purple-100 dark:to-purple-100/40 dark:text-purple-800'
                        : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#111214]',
                    ].join(' ')}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.75 3.75h7.5v7.5h-7.5zM12.75 3.75h7.5v7.5h-7.5zM3.75 12.75h7.5v7.5h-7.5zM12.75 12.75h7.5v7.5h-7.5z"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'tagged'}
                    onClick={() => onChangeTab('tagged')}
                    aria-label="Označený"
                    title="Označený"
                    className={[
                      'relative group flex-1 py-1 transition-all flex items-center justify-center min-w-[56px]',
                      'border-l border-gray-200 dark:border-gray-800',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60',
                      activeTab === 'tagged'
                        ? 'bg-gradient-to-t from-purple-100 to-transparent text-purple-700 dark:from-purple-100 dark:to-purple-100/40 dark:text-purple-800'
                        : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#111214]',
                    ].join(' ')}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.5 12a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0v1.5a2.25 2.25 0 0 0 4.5 0V12a9 9 0 1 0-3.515 7.082"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
          {/* Karty ponúk (len v tabu Ponúkam/Hľadám) */}
          {activeTab === 'offers' && (
            <ProfileOffersMobileSection
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
          )}

          {/* Základné info o používateľovi */}
          <UserInfo user={displayUser} />
        </>
      )}

      {/* Hamburger Menu Modal - len na cudzom profile */}
      {isOtherUserProfile && (
        <ProfileMobileHamburgerModal
          isOpen={isHamburgerModalOpen}
          mounted={mounted}
          onClose={() => setIsHamburgerModalOpen(false)}
        />
      )}

      {/* Email Modal - zobrazenie celého emailu */}
      {mounted && isEmailModalOpen && displayUser.contact_email && createPortal(
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setIsEmailModalOpen(false)}
        >
          <div 
            className="bg-white dark:bg-black rounded-lg shadow-xl max-w-sm w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('profile.contactEmail', 'Kontaktný email')}
            </h3>
            <div className="mb-6">
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-2 break-all">
                {displayUser.contact_email}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setIsEmailModalOpen(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                {t('common.close', 'Zavrieť')}
              </button>
              <button
                onClick={handleCopyEmail}
                className="flex-1 px-4 py-2 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
              >
                <ClipboardIcon className="w-4 h-4" />
                {t('profile.copyEmail', 'Kopírovať')}
              </button>
            </div>
          </div>
        </div>,
        document.getElementById('app-root') ?? document.body
      )}
    </div>
  );
}


