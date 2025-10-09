'use client';

import React from 'react';
import { User } from '../../../../types';
import { UserIcon } from '@heroicons/react/24/outline';

interface ProfileBioProps {
  user: User;
}

export default function ProfileBio({ user }: ProfileBioProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center mb-4">
        <UserIcon className="w-5 h-5 text-gray-600 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900">O mne</h3>
      </div>
      
      <div className="text-gray-700">
        {user.bio && user.bio.trim() !== '' ? (
          <p className="whitespace-pre-wrap">{user.bio}</p>
        ) : (
          <p className="text-gray-500 italic">
            {user.first_name} zatiaľ nepridal žiadny popis.
          </p>
        )}
      </div>
    </div>
  );
}
