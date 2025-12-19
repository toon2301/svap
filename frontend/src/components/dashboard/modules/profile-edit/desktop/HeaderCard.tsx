'use client';

import React from 'react';
import { User } from '@/types';
import UserAvatar from '../../profile/UserAvatar';
import { useLanguage } from '@/contexts/LanguageContext';

interface HeaderCardProps {
  user: User;
  firstName: string;
  lastName: string;
  isUploading: boolean;
  onPhotoUploadClick: () => void;
  onAvatarClick: () => void;
  accountType: 'personal' | 'business';
}

export default function HeaderCard({ user, firstName, lastName, isUploading, onPhotoUploadClick, onAvatarClick, accountType }: HeaderCardProps) {
  const { t } = useLanguage();
  return (
    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-6 py-1 mb-6 shadow-sm">
      <div className="flex items-center gap-6">
        <UserAvatar user={user} size="medium" onPhotoUpload={onPhotoUploadClick} isUploading={isUploading} onAvatarClick={onAvatarClick} />
        <div className="text-base text-gray-800 dark:text-gray-200 flex-1">
          <div className="font-bold text-gray-800 dark:text-white">{`${(firstName || user.first_name || '').trim()} ${(lastName || user.last_name || '').trim()}`.trim() || user.username}</div>
          <div className="text-gray-600 dark:text-gray-300">{user.email}</div>
          {/* Lokalita - zobrazí mesto/dedinu ak je, inak okres ak je */}
          {(user.location || user.district) && (
            <div className="text-gray-600 dark:text-gray-300 text-sm flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
              </svg>
              {user.location || user.district}
            </div>
          )}
          {accountType === 'business' && user.ico && <div className="text-gray-600 dark:text-gray-300 text-sm">IČO: {user.ico}</div>}
          {user.phone && (
            <div className="text-gray-600 dark:text-gray-300 text-sm flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
              </svg>
              {user.phone}
            </div>
          )}
          {accountType === 'personal' && user.job_title && (
            <div className="text-gray-600 dark:text-gray-300 text-sm flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0M12 12.75h.008v.008H12v-.008Z" />
              </svg>
              {user.job_title}
            </div>
          )}
        </div>
        <button onClick={() => onAvatarClick()} className="px-3 py-1 bg-purple-100 text-purple-800 border border-purple-200 rounded-lg hover:bg-purple-200 transition-colors text-sm">
          {t('profile.changePhoto', 'Zmeniť fotku')}
        </button>
      </div>
    </div>
  );
}


