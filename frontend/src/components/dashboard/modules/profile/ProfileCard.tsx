'use client';

import React from 'react';
import { User } from '../../../../types';
import UserAvatar from './UserAvatar';
import UserInfo from './UserInfo';

interface ProfileCardProps {
  user: User;
}

export default function ProfileCard({ user }: ProfileCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
      <UserAvatar user={user} size="large" />
      <UserInfo user={user} />
    </div>
  );
}
