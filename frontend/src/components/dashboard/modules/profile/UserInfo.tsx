'use client';

import React from 'react';
import { User } from '../../../../types';

interface UserInfoProps {
  user: User;
}

export default function UserInfo({ user }: UserInfoProps) {
  return (
    <div className="text-center">
      {user.location && user.location.trim() && (
        <p className="text-gray-600 dark:text-gray-300 text-sm flex items-center gap-1 justify-center">
          {/* Location pin icon replaced by emoji for simpler test matching */}
          {`📍 ${user.location}`}
        </p>
      )}
    </div>
  );
}
