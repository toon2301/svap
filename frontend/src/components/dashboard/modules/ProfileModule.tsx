'use client';

import React, { useState, useEffect } from 'react';
import { User } from '../../../types';
import UserAvatar from './profile/UserAvatar';
import UserInfo from './profile/UserInfo';
import ProfileEditFormDesktop from './ProfileEditFormDesktop';
import ProfileEditFormMobile from './ProfileEditFormMobile';
import { api } from '../../../lib/api';

interface ProfileModuleProps {
  user: User;
  onUserUpdate?: (updatedUser: User) => void;
  onEditProfileClick?: () => void;
  isEditMode?: boolean;
}

export default function ProfileModule({ user, onUserUpdate, onEditProfileClick, isEditMode = false }: ProfileModuleProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>('');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

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
                      {user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.username}
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
                    {/* Telefónne číslo */}
                    {user.phone && (
                      <p className="text-gray-600 dark:text-gray-300 text-sm flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                        </svg>
                        {user.phone}
                      </p>
                    )}
                    {/* Profesia */}
                    {user.job_title && (
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
                {user.website && (
                  <div className="mt-3">
                    <p className="text-gray-600 dark:text-gray-300 text-sm flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                      </svg>
                      <a 
                        href={user.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-400 transition-colors"
                      >
                        {user.website}
                      </a>
                    </p>
                  </div>
                )}
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
                    Upraviť profil
                  </button>
                  <button
                    onClick={() => {
                      console.log('Zručnosti');
                    }}
                    className="flex-1 px-3 py-1.5 text-xs bg-purple-100 text-purple-800 border border-purple-200 rounded-lg transition-colors hover:bg-purple-200"
                  >
                    Zručnosti
                  </button>
                </div>
              </div>
              <UserInfo user={user} />
            </>
          )}
        </div>

        {/* Desktop layout */}
        <div className="hidden lg:block">
          {isEditMode ? (
            // Edit mode - show ProfileEditFormDesktop
            <ProfileEditFormDesktop 
              user={user}
              onUserUpdate={onUserUpdate}
              onEditProfileClick={onEditProfileClick}
              onPhotoUpload={handlePhotoUpload}
              isUploadingFromParent={isUploading}
              onAvatarClick={handleAvatarClick}
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
                          {user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.username}
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
                        {/* Telefónne číslo */}
                        {user.phone && (
                          <p className="text-gray-600 dark:text-gray-300 text-sm flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4 text-gray-500 dark:text-gray-400">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                            </svg>
                            {user.phone}
                          </p>
                        )}
                        {/* Profesia */}
                        {user.job_title && (
                          <p className="text-gray-600 dark:text-gray-300 text-sm flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4 text-gray-500 dark:text-gray-400">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0M12 12.75h.008v.008H12v-.008Z" />
                            </svg>
                            {user.job_title}
                          </p>
                        )}
                        {/* Webová stránka */}
                        {user.website && (
                          <p className="text-gray-600 dark:text-gray-300 text-sm flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4 text-gray-500 dark:text-gray-400">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                            </svg>
                            <a 
                              href={user.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 transition-colors dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              {user.website}
                            </a>
                          </p>
                        )}
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
                        Upraviť profil
                      </button>
                      <button
                        onClick={() => {
                          console.log('Zručnosti');
                        }}
                        className="flex-1 px-32 py-2 text-sm bg-purple-100 text-purple-800 border border-purple-200 rounded-lg transition-colors hover:bg-purple-200 whitespace-nowrap"
                      >
                        Zručnosti
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
        
        {/* Success message */}
        {uploadSuccess && (
          <div className="mt-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            ✓ Fotka bola úspešne nahraná!
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
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="relative z-10 w-[32rem] max-w-[90vw] mx-4">
            <div className="rounded-2xl bg-white shadow-xl overflow-hidden">
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
                  className="w-full py-4 text-lg rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  Zmeniť fotku
                </button>
                <button
                  onClick={handleRemoveAvatar}
                  className="w-full py-4 text-lg rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                  disabled={isUploading}
                >
                  Odstrániť fotku
                </button>
                <button
                  onClick={() => setIsActionsOpen(false)}
                  className="w-full py-4 text-lg rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  Zrušiť
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}