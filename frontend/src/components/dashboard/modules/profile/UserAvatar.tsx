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
  large: 'w-28 h-28 lg:w-32 lg:h-32 xl:w-36 xl:h-36 text-3xl xl:text-5xl'
};

function withStableAvatarVersion(url: string, version?: string | null): string {
  const v = String(version || '').trim();
  if (!v) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}v=${encodeURIComponent(v)}`;
}

export default function UserAvatar({ user, size = 'large', onPhotoUpload, isUploading = false, onAvatarClick }: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const getInitials = (firstName: string, lastName: string): string => {
    const f = (firstName || '').trim();
    const l = (lastName || '').trim();
    if (f && l) return `${f.charAt(0)}${l.charAt(0)}`.toUpperCase();
    if (f) {
      const parts = f.split(/\s+/).filter(Boolean);
      const base = parts[0] || f;
      return base.slice(0, 2).toUpperCase();
    }
    if (l) return l.charAt(0).toUpperCase();
    return (user.email?.charAt(0).toUpperCase() || 'U');
  };

  const initials = getInitials(user.first_name, user.last_name);
  const sizeClass = sizeClasses[size];
  
  // Preferuj plnú URL z backendu; fallback na relative path
  const rawUrl: string | undefined = (user.avatar_url as string | undefined) || (user.avatar as string | undefined);
  // Stabilný cache-busting: mení sa iba keď sa zmení user.updated_at (t.j. po update profilu/avatara)
  const avatarUrl: string | undefined = rawUrl ? withStableAvatarVersion(rawUrl, user.updated_at) : undefined;

  const handleImageError = () => {
    setImageError(true);
  };

  useEffect(() => {
    // Reset error flag when avatar URL changes (e.g., after successful upload)
    setImageError(false);
  }, [avatarUrl]);

  const hasAvatar = Boolean(avatarUrl && !imageError);

  return (
    <div className="relative inline-block">
      {hasAvatar ? (
        <img
          src={avatarUrl!}
          alt={`${user.first_name} ${user.last_name}`}
          className={`${sizeClass} rounded-full mx-auto object-cover border-4 border-purple-100 ${onAvatarClick ? 'cursor-pointer' : 'cursor-default'}`}
          onError={handleImageError}
          onClick={onAvatarClick}
        />
      ) : (
        <div 
          className={`${sizeClass} rounded-full mx-auto bg-purple-100 flex items-center justify-center border-4 border-purple-200 ${onAvatarClick ? 'cursor-pointer' : 'cursor-default'}`}
          onClick={onAvatarClick}
        >
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
