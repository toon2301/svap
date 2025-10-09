'use client';

import React from 'react';
import { User } from '../../../../types';
import UserAvatar from './UserAvatar';
import UserLocation from './UserLocation';

interface ProfileHeaderProps {
  user: User;
}

export default function ProfileHeader({ user }: ProfileHeaderProps) {
  return (
    <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <UserAvatar user={user} size="large" />
        </div>
        
        {/* User Info */}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            {user.first_name} {user.last_name}
          </h1>
          
          {user.email && (
            <p className="text-purple-100 text-sm sm:text-base mb-2">
              {user.email}
            </p>
          )}
          
          <UserLocation user={user} />
        </div>
      </div>
    </div>
  );
}
