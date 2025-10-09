'use client';

import React from 'react';
import { User } from '../../../../types';

interface UserInfoProps {
  user: User;
}

export default function UserInfo({ user }: UserInfoProps) {
  return (
    <div className="text-center">
      {/* Lokácia */}
      {user.location && user.location.trim() !== '' && (
        <p className="text-gray-500">
          📍 {user.location}
        </p>
      )}
    </div>
  );
}
