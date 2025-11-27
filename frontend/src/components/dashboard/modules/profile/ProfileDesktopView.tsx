'use client';

import React from 'react';
import { User } from '../../../../types';
import { useLanguage } from '@/contexts/LanguageContext';
import UserAvatar from './UserAvatar';
import UserInfo from './UserInfo';
import WebsitesRow from './view/WebsitesRow';
import ProfileEditFormDesktop from '../ProfileEditFormDesktop';
import ProfileOffersSection from './ProfileOffersSection';
import type { ProfileTab } from './profileTypes';

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
}: ProfileDesktopViewProps) {
  const { t } = useLanguage();

  return (
    <div className="hidden lg:block w-full">
      <div className="flex flex-col items-stretch w-full gap-6">
        {/* Pôvodný desktop obsah */}
        <div className="w-full">
          {isEditMode ? (
            // Edit mode - show ProfileEditFormDesktop
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
            // Normal profile view
            <>
              <div className="flex flex-col gap-6 mb-6">
                <div className="flex flex-col items-start w-full">
                  <div className="flex gap-4 items-center">
                    <UserAvatar
                      user={displayUser}
                      size="large"
                      onPhotoUpload={onPhotoUpload}
                      isUploading={isUploading}
                      onAvatarClick={onAvatarClick}
                    />
                    <div className="flex flex-col">
                      {/* Meno používateľa */}
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                        {`${(displayUser.first_name || '').trim()} ${(displayUser.last_name || '').trim()}`.trim() ||
                          displayUser.username}
                      </h2>
                      {/* Email intentionally not shown here (kept in edit views) */}
                      {/* Lokalita */}
                      {displayUser.location && (
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
                              d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
                            />
                          </svg>
                          {displayUser.location}
                        </p>
                      )}
                      {/* IČO - iba pre firemné účty */}
                      {accountType === 'business' && displayUser.ico && (
                        <p className="text-gray-600 dark:text-gray-300 text-sm">IČO: {displayUser.ico}</p>
                      )}
                      {/* Telefónne číslo */}
                      {displayUser.phone && (
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

                      {/* Profesia - len pre osobný účet */}
                      {accountType === 'personal' && displayUser.job_title && (
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
                  {/* Tlačidlá pod fotkou */}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => {
                        if (onEditProfileClick) {
                          onEditProfileClick();
                        } else {
                          // eslint-disable-next-line no-console
                          console.log('Upraviť profil');
                        }
                      }}
                      className="flex-1 px-4 lg:px-8 xl:px-16 2xl:px-32 py-2 text-sm bg-purple-100 text-purple-800 border border-purple-200 rounded-2xl transition-colors hover:bg-purple-200 whitespace-nowrap"
                    >
                      {t('profile.editProfile')}
                    </button>
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
                      className="flex-1 px-4 lg:px-8 xl:px-16 2xl:px-32 py-2 text-sm bg-purple-100 text-purple-800 border border-purple-200 rounded-2xl transition-colors hover:bg-purple-200 whitespace-nowrap"
                    >
                      {t('profile.skills', 'Služby a ponuky')}
                    </button>
                  </div>
                </div>
                {/* Ikonová navigácia sekcií profilu */}
                <div className="mt-3 w-full lg:mt-6 lg:pb-4">
                  <div
                    role="tablist"
                    aria-label="Sekcie profilu"
                    className="w-full"
                    tabIndex={0}
                    onKeyDown={onTabsKeyDown}
                  >
                    <div className="flex w-full items-stretch rounded-3xl border-b border-gray-200 bg-white/60 dark:bg-[#0f0f10] dark:border-gray-800 shadow-sm overflow-hidden">
                      {/* Tab: Ponúkam/Hľadám */}
                      <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 'offers'}
                        onClick={() => onChangeTab('offers')}
                        aria-label="Ponúkam / Hľadám"
                        title="Ponúkam / Hľadám"
                        className={[
                          'relative group flex-1 py-3 transition-all flex items-center justify-center min-w-[72px]',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60',
                          activeTab === 'offers'
                            ? 'bg-gradient-to-t from-purple-100 to-transparent text-purple-700 dark:from-purple-100 dark:to-purple-100/40 dark:text-purple-800'
                            : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#111214]',
                        ].join(' ')}
                      >
                        {/* Icon: handshake */}
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
                        {/* Tooltip */}
                        <div className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                          Ponúkam / Hľadám
                        </div>
                      </button>

                      {/* Tab: Portfólio */}
                      <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 'portfolio'}
                        onClick={() => onChangeTab('portfolio')}
                        aria-label="Portfólio"
                        title="Portfólio"
                        className={[
                          'relative group flex-1 py-3 transition-all flex items-center justify-center min-w-[72px]',
                          'border-l border-gray-200 dark:border-gray-800',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60',
                          activeTab === 'portfolio'
                            ? 'bg-gradient-to-t from-purple-100 to-transparent text-purple-700 dark:from-purple-100 dark:to-purple-100/40 dark:text-purple-800'
                            : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#111214]',
                        ].join(' ')}
                      >
                        {/* Icon: briefcase */}
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          className="w-6 h-6"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M21 13.5V9.75A2.25 2.25 0 0018.75 7.5H5.25A2.25 2.25 0 003 9.75V13.5m18 0v4.5A2.25 2.25 0 0118.75 20.25H5.25A2.25 2.25 0 013 18v-4.5m18 0H3m12-6V4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 00-.75.75V7.5m6 0H9"
                          />
                        </svg>
                        <div className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                          Portfólio
                        </div>
                      </button>

                      {/* Tab: Príspevky */}
                      <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 'posts'}
                        onClick={() => onChangeTab('posts')}
                        aria-label="Príspevky"
                        title="Príspevky"
                        className={[
                          'relative group flex-1 py-3 transition-all flex items-center justify-center min-w-[72px]',
                          'border-l border-gray-200 dark:border-gray-800',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60',
                          activeTab === 'posts'
                            ? 'bg-gradient-to-t from-purple-100 to-transparent text-purple-700 dark:from-purple-100 dark:to-purple-100/40 dark:text-purple-800'
                            : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#111214]',
                        ].join(' ')}
                      >
                        {/* Icon: squares-2x2 */}
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          className="w-6 h-6"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3.75 3.75h7.5v7.5h-7.5zM12.75 3.75h7.5v7.5h-7.5zM3.75 12.75h7.5v7.5h-7.5zM12.75 12.75h7.5v7.5h-7.5z"
                          />
                        </svg>
                        <div className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                          Príspevky
                        </div>
                      </button>

                      {/* Tab: Označený */}
                      <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 'tagged'}
                        onClick={() => onChangeTab('tagged')}
                        aria-label="Označený"
                        title="Označený"
                        className={[
                          'relative group flex-1 py-3 transition-all flex items-center justify-center min-w-[72px]',
                          'border-l border-gray-200 dark:border-gray-800',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60',
                          activeTab === 'tagged'
                            ? 'bg-gradient-to-t from-purple-100 to-transparent text-purple-700 dark:from-purple-100 dark:to-purple-100/40 dark:text-purple-800'
                            : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#111214]',
                        ].join(' ')}
                      >
                        {/* Icon: at-symbol */}
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          className="w-6 h-6"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16.5 12a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0v1.5a2.25 2.25 0 0 0 4.5 0V12a9 9 0 1 0-3.515 7.082"
                          />
                        </svg>
                        <div className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                          Označený
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              {/* Obsah sekcií */}
              <ProfileOffersSection activeTab={activeTab} accountType={accountType} />
              <div className="w-full">
                <UserInfo user={displayUser} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


