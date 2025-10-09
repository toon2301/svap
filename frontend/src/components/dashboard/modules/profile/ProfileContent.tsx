'use client';

import React from 'react';
import { User } from '../../../../types';
import ProfileBio from './ProfileBio';
import ProfileSkills from './ProfileSkills';
import ProfileActivity from './ProfileActivity';

interface ProfileContentProps {
  user: User;
}

export default function ProfileContent({ user }: ProfileContentProps) {
  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          <ProfileBio user={user} />
          <ProfileSkills user={user} />
        </div>
        
        {/* Right Column */}
        <div className="space-y-6">
          <ProfileActivity user={user} />
        </div>
      </div>
    </div>
  );
}
