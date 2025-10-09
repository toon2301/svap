'use client';

import React from 'react';
import { User } from '../../../types';
import ProfileHeader from './profile/ProfileHeader';
import ProfileContent from './profile/ProfileContent';
import ProfileStats from './profile/ProfileStats';

interface ProfileModuleProps {
  user: User;
}

export default function ProfileModule({ user }: ProfileModuleProps) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Profile Header */}
        <ProfileHeader user={user} />
        
        {/* Profile Stats */}
        <ProfileStats user={user} />
        
        {/* Profile Content */}
        <ProfileContent user={user} />
      </div>
    </div>
  );
}