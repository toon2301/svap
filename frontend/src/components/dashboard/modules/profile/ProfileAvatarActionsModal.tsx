'use client';

import React, { useState, useEffect } from 'react';
import { User } from '../../../../types';
import { useLanguage } from '@/contexts/LanguageContext';
import UserAvatar from './UserAvatar';

interface ProfileAvatarActionsModalProps {
  open: boolean;
  user: User;
  isUploading: boolean;
  onClose: () => void;
  onPhotoUpload: (file: File) => void;
  onRemoveAvatar: () => void;
}

export default function ProfileAvatarActionsModal({
  open,
  user,
  isUploading,
  onClose,
  onPhotoUpload,
  onRemoveAvatar,
}: ProfileAvatarActionsModalProps) {
  const { t } = useLanguage();
  const [isSmallDesktop, setIsSmallDesktop] = useState(false);

  useEffect(() => {
    const checkSmallDesktop = () => {
      const width = window.innerWidth;
      // Malé desktopy: 1024px < width <= 1440px (napr. 1280×720, 1366×768)
      setIsSmallDesktop(width > 1024 && width <= 1440);
    };
    
    checkSmallDesktop();
    window.addEventListener('resize', checkSmallDesktop);
    return () => window.removeEventListener('resize', checkSmallDesktop);
  }, []);

  if (!open) {
    return null;
  }

  const handleOverlayClick = () => {
    onClose();
  };

  const handleContentClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  const handleChangePhotoClick = () => {
    onClose();
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        onPhotoUpload(file);
      }
    };
    input.click();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 lg:bg-transparent"
      onClick={handleOverlayClick}
    >
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 max-w-[90vw] lg:ml-0 xl:ml-[-6rem] 2xl:ml-[-12rem]"
        onClick={handleContentClick}
        style={{
          width: isSmallDesktop ? '24rem' : '32rem'
        }}
      >
        <div className="rounded-2xl bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] shadow-xl overflow-hidden">
          {/* Avatar v modale */}
          <div className="flex justify-center py-6">
            <UserAvatar user={user} size="large" onPhotoUpload={onPhotoUpload} isUploading={isUploading} />
          </div>
          <div className="px-2 space-y-3 pb-6">
            <button
              onClick={handleChangePhotoClick}
              className="w-full py-4 text-lg rounded-lg bg-[var(--muted)] text-[var(--foreground)] hover:bg-gray-200 dark:hover:bg-[#141414]"
            >
              {t('profile.changePhoto')}
            </button>
            <button
              onClick={onRemoveAvatar}
              className="w-full py-4 text-lg rounded-lg bg-[var(--muted)] text-[var(--foreground)] hover:bg-gray-200 dark:hover:bg-[#141414]"
              disabled={isUploading}
            >
              {t('profile.removePhoto')}
            </button>
            <button
              onClick={onClose}
              className="w-full py-4 text-lg rounded-lg bg-[var(--muted)] text-[var(--foreground)] hover:bg-gray-200 dark:hover:bg-[#141414]"
            >
              {t('profile.cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


