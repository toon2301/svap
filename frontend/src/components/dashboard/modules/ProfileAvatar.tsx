'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { User } from '../../../types';
import { useTheme } from '../../../contexts/ThemeContext';

interface ProfileAvatarProps {
  user: User;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  onPhotoUpload?: (file: File) => void;
  isUploading?: boolean;
  onAvatarClick?: () => void;
  showUploadIcon?: boolean;
}

export default function ProfileAvatar({ 
  user, 
  size = 'large', 
  onPhotoUpload, 
  isUploading = false,
  onAvatarClick,
  showUploadIcon = true
}: ProfileAvatarProps) {
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme } = useTheme();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const sizeClass = {
    small: 'w-8 h-8 text-sm',
    medium: 'w-24 h-24 text-2xl',
    large: 'w-32 h-32 text-4xl',
    xlarge: 'w-48 h-48 text-6xl'
  }[size];

  const hasAvatar = !!(user.avatar || user.avatar_url);
  const avatarUrl = user.avatar_url || (user.avatar ? `/media/${user.avatar}` : null);
  
  // Generate initials
  const initials = user.first_name && user.last_name 
    ? `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase()
    : user.email?.charAt(0).toUpperCase() || 'U';

  const handleImageError = () => {
    // If image fails to load, it will fall back to initials
  };

  const handleAvatarClick = () => {
    if (onAvatarClick) {
      onAvatarClick();
    } else if (hasAvatar) {
      setIsActionsOpen(true);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      // This would need to be implemented with API call
      setIsActionsOpen(false);
    } catch (e: any) {
      console.error('Error removing avatar:', e);
    }
  };

  return (
    <>
      <div className="relative inline-block">
        {hasAvatar ? (
          <img
            src={avatarUrl!}
            alt={`${user.first_name} ${user.last_name}`}
            className={`${sizeClass} rounded-full mx-auto object-cover border-4 border-purple-100`}
            onError={handleImageError}
            key={avatarUrl}
            onClick={handleAvatarClick}
            style={{ cursor: onAvatarClick ? 'pointer' : 'default' }}
          />
        ) : (
          <div 
            className={`${sizeClass} rounded-full mx-auto bg-purple-100 flex items-center justify-center border-4 border-purple-200`}
            onClick={handleAvatarClick}
            style={{ cursor: onAvatarClick ? 'pointer' : 'default' }}
          >
            <span className="font-bold text-purple-600">
              {initials}
            </span>
          </div>
        )}
        
        {/* Show upload icon only when user has no avatar and showUploadIcon is true */}
        {!hasAvatar && showUploadIcon && onPhotoUpload && (
          <div className="absolute bottom-0 right-0 z-10">
            <PhotoUpload onPhotoSelect={onPhotoUpload} isUploading={isUploading} />
          </div>
        )}
      </div>
      
      {/* Avatar Actions Modal */}
      {mounted && isActionsOpen && createPortal(
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 lg:bg-transparent flex items-center justify-center" onClick={() => setIsActionsOpen(false)}>
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] max-w-[90vw] lg:ml-[-12rem]" onClick={(e) => e.stopPropagation()}>
            <div className={`rounded-2xl border shadow-xl overflow-hidden bg-[var(--background)] text-[var(--foreground)] border-[var(--border)]`}>
              <div className="py-6 px-2 space-y-3">
                <button
                  onClick={() => {
                    setIsActionsOpen(false);
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e: any) => {
                      const file = e.target.files?.[0];
                      if (file && onPhotoUpload) onPhotoUpload(file);
                    };
                    input.click();
                  }}
                  className={`w-full py-4 text-lg rounded-lg transition-colors bg-[var(--muted)] text-[var(--foreground)] hover:bg-gray-200 dark:hover:bg-[#141414]`}
                >
                  Zmeniť fotku
                </button>
                <button
                  onClick={handleRemoveAvatar}
                  className={`w-full py-4 text-lg rounded-lg transition-colors bg-[var(--muted)] text-[var(--foreground)] hover:bg-gray-200 dark:hover:bg-[#141414]`}
                  disabled={isUploading}
                >
                  Odstrániť fotku
                </button>
                <button
                  onClick={() => setIsActionsOpen(false)}
                  className={`w-full py-4 text-lg rounded-lg transition-colors bg-[var(--muted)] text-[var(--foreground)] hover:bg-gray-200 dark:hover:bg-[#141414]`}
                >
                  Zrušiť
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// PhotoUpload component
interface PhotoUploadProps {
  onPhotoSelect: (file: File) => void;
  isUploading?: boolean;
}

function PhotoUpload({ onPhotoSelect, isUploading = false }: PhotoUploadProps) {
  const handleClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) onPhotoSelect(file);
    };
    input.click();
  };

  return (
    <button
      onClick={handleClick}
      disabled={isUploading}
      className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center hover:bg-purple-700 transition-colors disabled:opacity-50"
      aria-label="Nahrať fotku"
    >
      {isUploading ? (
        <svg className="w-4 h-4 text-white animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      )}
    </button>
  );
}
