'use client';

import React from 'react';
import { User } from '../../../../types';
import { useLanguage } from '@/contexts/LanguageContext';
import UserAvatar from './UserAvatar';
import UserInfo from './UserInfo';
import ProfileEditFormMobile from '../ProfileEditFormMobile';
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
  activeTab: ProfileTab;
  onChangeTab: (tab: ProfileTab) => void;
  onTabsKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  onOpenAllWebsitesModal: () => void;
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
  activeTab,
  onChangeTab,
  onTabsKeyDown,
  onOpenAllWebsitesModal,
}: ProfileMobileViewProps) {
  const { t } = useLanguage();

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
                  {`${(displayUser.first_name || '').trim()} ${(displayUser.last_name || '').trim()}`.trim() ||
                    displayUser.username}
                </h2>
                {/* Email intentionally not shown here (kept in edit views) */}
                {/* Lokalita */}
                {displayUser.location && (
                  <p className="text-gray-600 dark:text-gray-300 text-sm flex items-center gap-1 mt-1">
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
                  <p className="text-gray-600 dark:text-gray-300 text-sm">{displayUser.ico}</p>
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
                {accountType === 'personal' && displayUser.job_title && (
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
                  <p className="text-gray-600 dark:text-gray-300 text-sm flex items-center gap-1">
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
                        className="flex items-center flex-wrap cursor-pointer"
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
                        className="text-blue-600 hover:text-blue-400 dark:text-blue-400 dark:hover:text-blue-300 transition-colors truncate max-w-[200px]"
                      >
                        {firstWebsite}
                      </a>
                    )}
                  </p>
                </div>
              );
            })()}
            {/* Tlačidlá POD webovou stránkou */}
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => {
                  if (onEditProfileClick) {
                    onEditProfileClick();
                  } else {
                    // eslint-disable-next-line no-console
                    console.log('Upraviť profil');
                  }
                }}
                className="flex-1 px-3 py-1.5 text-xs bg-purple-100 text-purple-800 border border-purple-200 rounded-2xl transition-colors hover:bg-purple-200"
              >
                {t('profile.editProfile', 'Upraviť profil')}
              </button>
              <button
                onClick={() => {
                  // eslint-disable-next-line no-console
                  console.log('Zručnosti');
                }}
                className="flex-1 px-3 py-1.5 text-xs bg-purple-100 text-purple-800 border border-purple-200 rounded-2xl transition-colors hover:bg-purple-200"
              >
                {t('profile.skills', 'Služby a ponuky')}
              </button>
            </div>
            {/* Ikonová navigácia sekcií profilu (mobile) */}
            <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700 w-full">
              <div
                role="tablist"
                aria-label="Sekcie profilu"
                className="w-full"
                tabIndex={0}
                onKeyDown={onTabsKeyDown}
              >
                <div className="flex w-full items-stretch rounded-2xl border border-gray-200 bg-white/60 dark:bg-[#0f0f10] dark:border-gray-800 shadow-sm overflow-hidden">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'offers'}
                    onClick={() => onChangeTab('offers')}
                    aria-label="Ponúkam / Hľadám"
                    title="Ponúkam / Hľadám"
                    className={[
                      'relative group flex-1 py-2.5 transition-all flex items-center justify-center min-w-[56px]',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60',
                      activeTab === 'offers'
                        ? 'bg-purple-100 text-purple-700 border border-purple-200 shadow-sm dark:bg-purple-100 dark:text-purple-800 dark:border-purple-200'
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
                      'relative group flex-1 py-2.5 transition-all flex items-center justify-center min-w-[56px]',
                      'border-l border-gray-200 dark:border-gray-800',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60',
                      activeTab === 'portfolio'
                        ? 'bg-purple-100 text-purple-700 border border-purple-200 shadow-sm dark:bg-purple-100 dark:text-purple-800 dark:border-purple-200'
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
                      'relative group flex-1 py-2.5 transition-all flex items-center justify-center min-w-[56px]',
                      'border-l border-gray-200 dark:border-gray-800',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60',
                      activeTab === 'posts'
                        ? 'bg-purple-100 text-purple-700 border border-purple-200 shadow-sm dark:bg-purple-100 dark:text-purple-800 dark:border-purple-200'
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
                      'relative group flex-1 py-2.5 transition-all flex items-center justify-center min-w-[56px]',
                      'border-l border-gray-200 dark:border-gray-800',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60',
                      activeTab === 'tagged'
                        ? 'bg-purple-100 text-purple-700 border border-purple-200 shadow-sm dark:bg-purple-100 dark:text-purple-800 dark:border-purple-200'
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
          <UserInfo user={displayUser} />
        </>
      )}
    </div>
  );
}


