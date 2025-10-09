'use client';

import React from 'react';
import { User } from '../../../../types';

interface UserAvatarProps {
  user: User;
  size?: 'small' | 'medium' | 'large';
  showBorder?: boolean;
}

const sizeClasses = {
  small: 'w-8 h-8 text-sm',
  medium: 'w-12 h-12 text-base',
  large: 'w-20 h-20 text-2xl'
};

export default function UserAvatar({ 
  user, 
  size = 'medium', 
  showBorder = true 
}: UserAvatarProps) {
  const getInitials = (firstName: string, lastName: string): string => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const initials = getInitials(user.first_name, user.last_name);
  const sizeClass = sizeClasses[size];
  const borderClass = showBorder ? 'ring-2 ring-white' : '';

  return (
    <div className={`${sizeClass} ${borderClass} rounded-full bg-white flex items-center justify-center font-semibold text-purple-600 shadow-lg`}>
      {user.profile_picture ? (
        <img
          src={user.profile_picture}
          alt={`${user.first_name} ${user.last_name}`}
          className="w-full h-full rounded-full object-cover"
          onError={(e) => {
            // Fallback to initials if image fails to load
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent) {
              parent.innerHTML = `<span class="text-purple-600 font-semibold">${initials}</span>`;
            }
          }}
        />
      ) : (
        <span className="text-purple-600 font-semibold">
          {initials}
        </span>
      )}
    </div>
  );
}
