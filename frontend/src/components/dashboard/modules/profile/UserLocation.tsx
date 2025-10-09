'use client';

import React from 'react';
import { User } from '../../../../types';
import { MapPinIcon } from '@heroicons/react/24/outline';

interface UserLocationProps {
  user: User;
}

export default function UserLocation({ user }: UserLocationProps) {
  // Only show location if it's set and not empty
  if (!user.location || user.location.trim() === '') {
    return null;
  }

  return (
    <div className="flex items-center text-purple-100">
      <MapPinIcon className="w-4 h-4 mr-1 flex-shrink-0" />
      <span className="text-sm truncate">
        {user.location}
      </span>
    </div>
  );
}
