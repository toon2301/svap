'use client';

import React, { useEffect, useState } from 'react';
import { User } from '../../../../types';
import PhotoUpload from './PhotoUpload';

interface UserAvatarProps {
  user: User;
  size?: 'small' | 'medium' | 'large';
  onPhotoUpload?: (file: File) => void;
  isUploading?: boolean;
  onAvatarClick?: () => void; // open actions modal when avatar exists
}

const sizeClasses = {
  small: 'w-16 h-16 text-lg',
  medium: 'w-24 h-24 text-2xl',
  large: 'w-48 h-48 text-6xl'
};

export default function UserAvatar({ user, size = 'large', onPhotoUpload, isUploading = false, onAvatarClick }: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const getInitials = (firstName: string, lastName: string): string => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const initials = getInitials(user.first_name, user.last_name);
  const sizeClass = sizeClasses[size];
  
  // Preferuj plnú URL z backendu; fallback na relative path
  const rawUrl: string | undefined = (user.avatar_url as string | undefined) || (user.avatar as string | undefined);
  // Pridaj timestamp pre cache-busting
  const avatarUrl: string | undefined = rawUrl ? `${rawUrl}?t=${new Date().getTime()}` : undefined;

  const handleImageError = () => {
    setImageError(true);
  };

  useEffect(() => {
    // Reset error flag when avatar URL changes (e.g., after successful upload)
    setImageError(false);
  }, [rawUrl]);

  const hasAvatar = Boolean(avatarUrl && !imageError);

  return (
    <div className="relative inline-block">
      {hasAvatar ? (
        <img
          src={avatarUrl!}
          alt={`${user.first_name} ${user.last_name}`}
          className={`${sizeClass} rounded-full mx-auto object-cover border-4 border-purple-100`}
          onError={handleImageError}
          key={avatarUrl}
          onClick={onAvatarClick}
          style={{ cursor: onAvatarClick ? 'pointer' : 'default' }}
        />
      ) : (
        <div className={`${sizeClass} rounded-full mx-auto bg-purple-100 flex items-center justify-center border-4 border-purple-200`}>
          <span className="font-bold text-purple-600">
            {initials}
          </span>
        </div>
      )}
      
      {/* Show upload icon only when user has no avatar */}
      {!hasAvatar && onPhotoUpload && (
        <div className="absolute bottom-0 right-0 z-10">
          <PhotoUpload onPhotoSelect={onPhotoUpload} isUploading={isUploading} />
        </div>
      )}
    </div>
  );
}
