'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { User } from '../../../../types';
import { useLanguage } from '@/contexts/LanguageContext';
import UserAvatar from './UserAvatar';
import UserInfo from './UserInfo';
import ProfileEditFormMobile from '../ProfileEditFormMobile';
import ProfileOffersMobileSection from './ProfileOffersMobileSection';
import type { ProfileTab } from './profileTypes';

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
  const [mounted, setMounted] = useState(false);

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
              <UserAvatar
                user={displayUser}
                size="medium"
                onPhotoUpload={onPhotoUpload}
                isUploading={isUploading}
                onAvatarClick={onAvatarClick}
              />
              <div className="flex flex-col justify-center">
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
                {/* IČO - iba pre firemné účty */}
                {accountType === 'business' && displayUser.ico && (!isOtherUserProfile || !displayUser.ico_visible) && (
                  <p className="text-gray-600 dark:text-gray-300 text-sm">{displayUser.ico}</p>
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
                      className="size-3"
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
                      className="size-3"
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
            {(() => {
              const hasSocialMedia = displayUser.instagram || displayUser.facebook || displayUser.linkedin || displayUser.youtube;
              if (!hasSocialMedia) return null;

              return (
                <div className="mt-3 flex items-center gap-3">
                  {displayUser.instagram && (
                    <a
                      href={displayUser.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      aria-label="Instagram"
                    >
                      <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                    </a>
                  )}
                  {displayUser.facebook && (
                    <a
                      href={displayUser.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      aria-label="Facebook"
                    >
                      <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    </a>
                  )}
                  {displayUser.linkedin && (
                    <a
                      href={displayUser.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      aria-label="LinkedIn"
                    >
                      <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                    </a>
                  )}
                  {displayUser.youtube && (
                    <a
                      href={displayUser.youtube}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      aria-label="YouTube"
                    >
                      <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                    </a>
                  )}
                </div>
              );
            })()}
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
              highlightedSkillId={highlightedSkillId ?? null}
              isOtherUserProfile={isOtherUserProfile}
            />
          )}

          {/* Základné info o používateľovi */}
          <UserInfo user={displayUser} />
        </>
      )}

      {/* Hamburger Menu Modal - len na cudzom profile */}
      {isOtherUserProfile && mounted && isHamburgerModalOpen && typeof document !== 'undefined' && createPortal(
        <>
          {/* Overlay s animáciou */}
          <div
            className="fixed inset-0 z-[70] bg-black/45 animate-fade-in"
            onClick={() => setIsHamburgerModalOpen(false)}
          />
          {/* Modal s animáciou */}
          <div
            className="fixed inset-0 z-[71] flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
            onClick={() => setIsHamburgerModalOpen(false)}
          >
            <div
              className="w-full max-w-sm rounded-2xl bg-white dark:bg-black border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden animate-slide-up sm:animate-scale-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 space-y-2">
                <button
                  onClick={() => {
                    // Zablokovať - TODO: implementovať funkcionalitu
                  }}
                  className="w-full text-center px-4 py-3 text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  {t('profile.block', 'Zablokovať')}
                </button>
                <button
                  onClick={() => {
                    // Nahlásiť - TODO: implementovať funkcionalitu
                  }}
                  className="w-full text-center px-4 py-3 text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  {t('profile.report', 'Nahlásiť')}
                </button>
                <button
                  onClick={() => {
                    // Zdieľať - TODO: implementovať funkcionalitu
                  }}
                  className="w-full text-center px-4 py-3 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  {t('profile.share', 'Zdieľať')}
                </button>
                <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
                <button
                  onClick={() => setIsHamburgerModalOpen(false)}
                  className="w-full text-center px-4 py-3 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  {t('common.cancel', 'Zrušiť')}
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}


