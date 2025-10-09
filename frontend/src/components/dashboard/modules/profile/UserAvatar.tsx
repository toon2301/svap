'use client';

import React from 'react';
import { User } from '../../../../types';

interface UserAvatarProps {
  user: User;
  size?: 'small' | 'medium' | 'large';
}

const sizeClasses = {
  small: 'w-16 h-16 text-lg',
  medium: 'w-24 h-24 text-2xl',
  large: 'w-48 h-48 text-6xl'
};

export default function UserAvatar({ user, size = 'large' }: UserAvatarProps) {
  const getInitials = (firstName: string, lastName: string): string => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const initials = getInitials(user.first_name, user.last_name);
  const sizeClass = sizeClasses[size];

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    target.style.display = 'none';
    const parent = target.parentElement;
    if (parent) {
      parent.innerHTML = `
        <div class="${sizeClass} rounded-full mx-auto bg-purple-100 flex items-center justify-center border-4 border-purple-200">
          <span class="font-bold text-purple-600">${initials}</span>
        </div>
      `;
    }
  };

  return (
    <div className="mb-6">
      {user.profile_picture ? (
        <img
          src={user.profile_picture}
          alt={`${user.first_name} ${user.last_name}`}
          className={`${sizeClass} rounded-full mx-auto object-cover border-4 border-purple-100`}
          onError={handleImageError}
        />
      ) : (
        <div className={`${sizeClass} rounded-full mx-auto bg-purple-100 flex items-center justify-center border-4 border-purple-200`}>
          <span className="font-bold text-purple-600">
            {initials}
          </span>
        </div>
      )}
    </div>
  );
}
