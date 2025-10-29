'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { User } from '../../../types';
import UserAvatar from './profile/UserAvatar';
import { useLanguage } from '@/contexts/LanguageContext';
import UserInfo from './profile/UserInfo';
import ProfileEditFormDesktop from './ProfileEditFormDesktop';
import ProfileEditFormMobile from './ProfileEditFormMobile';
import { api } from '../../../lib/api';

interface ProfileModuleProps {
  user: User;
  onUserUpdate?: (updatedUser: User) => void;
  onEditProfileClick?: () => void;
  isEditMode?: boolean;
  accountType?: 'personal' | 'business';
}

export default function ProfileModule({ user, onUserUpdate, onEditProfileClick, isEditMode = false, accountType = 'personal' }: ProfileModuleProps) {
  const { t } = useLanguage();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>('');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isAllWebsitesModalOpen, setIsAllWebsitesModalOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePhotoUpload = async (file: File) => {
    setIsUploading(true);
    setUploadError('');
    setUploadSuccess(false);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await api.patch('/auth/profile/', formData);

      console.log('Upload response:', response.data);
      if (onUserUpdate && response.data.user) {
        console.log('Updated user:', response.data.user);
        onUserUpdate(response.data.user);
      }

      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (error: any) {
      console.error('Photo upload error:', error);
      // Pokús sa vytiahnuť konkrétnu validačnú správu z backendu
      const details = error?.response?.data?.details || error?.response?.data?.validation_errors;
      const avatarErrors: string[] | undefined = details?.avatar;
      const message = (
        avatarErrors?.[0] ||
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Nepodarilo sa nahrať fotku. Skús to znova.'
      );
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
    try {
      setIsUploading(true);
      setUploadError('');
      // Clear avatar by sending JSON null
      const response = await api.patch('/auth/profile/', { avatar: null });
      if (onUserUpdate && response.data.user) {
        onUserUpdate(response.data.user);
      }
      setIsActionsOpen(false);
    } catch (e: any) {
      const details = e?.response?.data?.details || e?.response?.data?.validation_errors;
      const avatarErrors: string[] | undefined = details?.avatar;
      const message = (
        avatarErrors?.[0] ||
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        'Nepodarilo sa odstrániť fotku. Skúste znova.'
      );
      setUploadError(message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <div className="max-w-2xl mx-auto text-[var(--foreground)]">
        {/* Mobile layout */}
        <div className="lg:hidden">
          {isEditMode ? (
            // Edit mode - show ProfileEditFormMobile
            <ProfileEditFormMobile 
              user={user}
              onUserUpdate={onUserUpdate}
              onEditProfileClick={onEditProfileClick}
              onPhotoUpload={handlePhotoUpload}
              isUploading={isUploading}
              onAvatarClick={handleAvatarClick}
              accountType={accountType}
            />
          ) : (
            // Normal profile view
            <>
              <div className="mb-4">
                <div className="flex gap-3 items-start">
                  <UserAvatar 
                    user={user} 
                    size="medium" 
                    onPhotoUpload={handlePhotoUpload}
                    isUploading={isUploading}
                    onAvatarClick={handleAvatarClick}
                  />
                  <div className="flex flex-col justify-center">
                    {/* Meno používateľa */}
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                      {`${(user.first_name || '').trim()} ${(user.last_name || '').trim()}`.trim() || user.username}
                    </h2>
                    {/* Email intentionally not shown here (kept in edit views) */}
                    {/* Lokalita */}
                    {user.location && (
                      <p className="text-gray-600 dark:text-gray-300 text-sm flex items-center gap-1 mt-1">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                        </svg>
                        {user.location}
                      </p>
                    )}
                    {/* IČO - iba pre firemné účty */}
                    {accountType === 'business' && user.ico && (
                      <p className="text-gray-600 dark:text-gray-300 text-sm">
                        {user.ico}
                      </p>
                    )}
                    {/* Telefónne číslo */}
                    {user.phone && (
                      <p className="text-gray-600 dark:text-gray-300 text-sm flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                        </svg>
                        {user.phone}
                      </p>
                    )}
                    {/* Kontaktný Email - len pre firemný účet */}
                    {accountType === 'business' && user.contact_email && (
                      <p className="text-gray-600 dark:text-gray-300 text-sm flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                        </svg>
                        {user.contact_email}
                      </p>
                    )}
                    {/* Kategória - len pre firemný účet (za emailom) */}
                    {accountType === 'business' && (user.category_sub || user.category) && (
                      <p className="text-gray-600 dark:text-gray-300 text-sm">
                        {user.category_sub || user.category}
                      </p>
                    )}
                        {/* Profesia - len pre osobný účet */}
                        {accountType === 'personal' && user.job_title && (
                          <p className="text-gray-600 dark:text-gray-300 text-sm flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-3">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0M12 12.75h.008v.008H12v-.008Z" />
                            </svg>
                            {user.job_title}
                          </p>
                        )}
                  </div>
                </div>
                {/* Webová stránka úplne z ľavej strany NAD buttony */}
                {(() => {
                  const totalWebsites = (user.website ? 1 : 0) + (user.additional_websites ? user.additional_websites.length : 0);
                  const additionalCount = totalWebsites - 1;
                  
                  if (totalWebsites === 0) return null;
                  
                  // Zobraz prvý dostupný web
                  const firstWebsite = user.website || (user.additional_websites && user.additional_websites[0]);
                  
                  return (
                    <div className="mt-3">
                      <p className="text-gray-600 dark:text-gray-300 text-sm flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-3 flex-shrink-0">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                        </svg>
                        {additionalCount > 0 ? (
                          // Viac webov - celý text je klikateľný na modal
                          <span 
                            className="flex items-center flex-wrap cursor-pointer"
                            onClick={() => setIsAllWebsitesModalOpen(true)}
                          >
                            <span className="text-blue-600 hover:text-blue-400 transition-colors truncate max-w-[200px]">
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
                            className="text-blue-600 hover:text-blue-400 transition-colors truncate max-w-[200px]"
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
                        console.log('Upraviť profil');
                      }
                    }}
                    className="flex-1 px-3 py-1.5 text-xs bg-purple-100 text-purple-800 border border-purple-200 rounded-lg transition-colors hover:bg-purple-200"
                  >
                    {t('profile.editProfile', 'Upraviť profil')}
                  </button>
                  <button
                    onClick={() => {
                      console.log('Zručnosti');
                    }}
                    className="flex-1 px-3 py-1.5 text-xs bg-purple-100 text-purple-800 border border-purple-200 rounded-lg transition-colors hover:bg-purple-200"
                  >
                    {t('profile.skills', 'Zručnosti')}
                  </button>
                </div>
              </div>
              <UserInfo user={user} />
            </>
          )}
        </div>

        {/* Desktop layout */}
        <div className="hidden lg:flex items-start justify-center">
          <div className="flex flex-col items-start w-full max-w-3xl mx-auto">
            {/* Pôvodný desktop obsah */}
            <div className="w-full">
          {isEditMode ? (
            // Edit mode - show ProfileEditFormDesktop
            <ProfileEditFormDesktop 
              user={user}
              onUserUpdate={onUserUpdate}
              onEditProfileClick={onEditProfileClick}
              onPhotoUpload={handlePhotoUpload}
              isUploadingFromParent={isUploading}
              onAvatarClick={handleAvatarClick}
              accountType={accountType}
            />
          ) : (
            // Normal profile view
            <>
              <div className="flex gap-6 mb-6">
                <div className="flex gap-4">
                  <div className="flex flex-col items-start">
                    <div className="flex gap-4 items-center">
                      <UserAvatar 
                        user={user} 
                        size="large" 
                        onPhotoUpload={handlePhotoUpload}
                        isUploading={isUploading}
                        onAvatarClick={handleAvatarClick}
                      />
                      <div className="flex flex-col">
                        {/* Meno používateľa */}
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                          {`${(user.first_name || '').trim()} ${(user.last_name || '').trim()}`.trim() || user.username}
                        </h2>
                        {/* Email intentionally not shown here (kept in edit views) */}
                        {/* Lokalita */}
                        {user.location && (
                          <p className="text-gray-600 dark:text-gray-300 text-sm flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4 text-gray-500 dark:text-gray-400">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                            </svg>
                            {user.location}
                          </p>
                        )}
                        {/* IČO - iba pre firemné účty */}
                        {accountType === 'business' && user.ico && (
                          <p className="text-gray-600 dark:text-gray-300 text-sm">
                            IČO: {user.ico}
                          </p>
                        )}
                        {/* Telefónne číslo */}
                        {user.phone && (
                          <p className="text-gray-600 dark:text-gray-300 text-sm flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4 text-gray-500 dark:text-gray-400">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                            </svg>
                            {user.phone}
                          </p>
                        )}
                        {/* Kontaktný Email - len pre firemný účet */}
                        {accountType === 'business' && user.contact_email && (
                          <p className="text-gray-600 dark:text-gray-300 text-sm flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4 text-gray-500 dark:text-gray-400">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                            </svg>
                            {user.contact_email}
                          </p>
                        )}
                        {/* Kategória - len pre firemný účet (za emailom) */}
                        {accountType === 'business' && (user.category_sub || user.category) && (
                          <p className="text-gray-600 dark:text-gray-300 text-sm">
                            {user.category_sub || user.category}
                          </p>
                        )}
                        {/* Profesia - len pre osobný účet */}
                        {accountType === 'personal' && user.job_title && (
                          <p className="text-gray-600 dark:text-gray-300 text-sm flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4 text-gray-500 dark:text-gray-400">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0M12 12.75h.008v.008H12v-.008Z" />
                            </svg>
                            {user.job_title}
                          </p>
                        )}
                        {/* Webová stránka + "a ďalší" (desktop) */}
                        {(() => {
                          const totalWebsites = (user.website ? 1 : 0) + (user.additional_websites ? user.additional_websites.length : 0);
                          const additionalCount = totalWebsites - 1;
                          if (totalWebsites === 0) return null;
                          const firstWebsite = user.website || (user.additional_websites && user.additional_websites[0]);
                          return (
                            <p className="text-gray-600 dark:text-gray-300 text-sm flex items-center gap-1">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4 text-gray-500 dark:text-gray-400 flex-shrink-0">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                              </svg>
                              {additionalCount > 0 ? (
                                // Viac webov - celý text je klikateľný na modal
                                <span 
                                  className="flex items-center flex-wrap cursor-pointer"
                                  onClick={() => setIsAllWebsitesModalOpen(true)}
                                >
                                  <span className="text-blue-600 hover:text-blue-800 transition-colors dark:text-blue-400 dark:hover:text-blue-300 truncate max-w-[300px]">
                                    {firstWebsite}
                                  </span>
                                  <span className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 ml-1 whitespace-nowrap">
                                    a ďalší ({additionalCount})
                                  </span>
                                </span>
                              ) : (
                                // Jeden web - klikateľný odkaz
                                <a 
                                  href={firstWebsite as string} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 transition-colors dark:text-blue-400 dark:hover:text-blue-300 truncate max-w-[300px]"
                                >
                                  {firstWebsite}
                                </a>
                              )}
                            </p>
                          );
                        })()}
                      </div>
                    </div>
                    {/* Tlačidlá pod fotkou */}
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => {
                          if (onEditProfileClick) {
                            onEditProfileClick();
                          } else {
                            console.log('Upraviť profil');
                          }
                        }}
                        className="flex-1 px-32 py-2 text-sm bg-purple-100 text-purple-800 border border-purple-200 rounded-lg transition-colors hover:bg-purple-200 whitespace-nowrap"
                      >
                        {t('profile.editProfile')}
                      </button>
                      <button
                        onClick={() => {
                          console.log('Zručnosti');
                        }}
                        className="flex-1 px-32 py-2 text-sm bg-purple-100 text-purple-800 border border-purple-200 rounded-lg transition-colors hover:bg-purple-200 whitespace-nowrap"
                      >
                        {t('profile.skills')}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex-1">
                  <UserInfo user={user} />
                </div>
              </div>
            </>
          )}
            </div>
          </div>
        </div>
        
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
      
      {/* Avatar Actions Modal */}
      {mounted && isActionsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 lg:bg-transparent" onClick={() => setIsActionsOpen(false)}>
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-[32rem] max-w-[90vw] lg:ml-[-12rem]" onClick={(e) => e.stopPropagation()}>
            <div className="rounded-2xl bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] shadow-xl overflow-hidden">
              {/* Avatar v modale */}
              <div className="flex justify-center py-6">
                <UserAvatar 
                  user={user} 
                  size="large" 
                  onPhotoUpload={handlePhotoUpload}
                  isUploading={isUploading}
                  onAvatarClick={handleAvatarClick}
                />
              </div>
              <div className="px-2 space-y-3 pb-6">
                <button
                  onClick={() => {
                    setIsActionsOpen(false);
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e: any) => {
                      const file = e.target.files?.[0];
                      if (file) handlePhotoUpload(file);
                    };
                    input.click();
                  }}
                  className="w-full py-4 text-lg rounded-lg bg-[var(--muted)] text-[var(--foreground)] hover:bg-gray-200 dark:hover:bg-[#141414]"
                >
                  {t('profile.changePhoto')}
                </button>
                <button
                  onClick={handleRemoveAvatar}
                  className="w-full py-4 text-lg rounded-lg bg-[var(--muted)] text-[var(--foreground)] hover:bg-gray-200 dark:hover:bg-[#141414]"
                  disabled={isUploading}
                >
                  {t('profile.removePhoto')}
                </button>
                <button
                  onClick={() => setIsActionsOpen(false)}
                  className="w-full py-4 text-lg rounded-lg bg-[var(--muted)] text-[var(--foreground)] hover:bg-gray-200 dark:hover:bg-[#141414]"
                >
                  {t('profile.cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal pre všetky weby */}
      {isAllWebsitesModalOpen && mounted && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setIsAllWebsitesModalOpen(false)}>
          <div className="bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] rounded-2xl shadow-xl max-w-lg w-full p-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-[var(--foreground)]">
                Odkazy
              </h2>
              <button
                onClick={() => setIsAllWebsitesModalOpen(false)}
                className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Content */}
            <div className="p-2">
              {/* Hlavný web */}
              {user.website && (
                <a 
                  href={user.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors group"
                >
                  <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-purple-600 dark:text-purple-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[var(--foreground)] font-medium text-sm truncate">{user.website}</div>
                  </div>
                </a>
              )}
              
              {/* Dodatočné weby */}
              {user.additional_websites && user.additional_websites.map((website, index) => (
                <a 
                  key={index}
                  href={website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors group"
                >
                  <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-purple-600 dark:text-purple-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[var(--foreground)] font-medium text-sm truncate">{website}</div>
                  </div>
                </a>
              ))}
            </div>
            
          </div>
        </div>,
        document.body
      )}
    </>
  );
}