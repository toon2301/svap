'use client';

import React from 'react';
import { User } from '../../../types';
import UserAvatar from './profile/UserAvatar';
import UserInfo from './profile/UserInfo';

interface ProfileModuleProps {
  user: User;
}

export default function ProfileModule({ user }: ProfileModuleProps) {
  return (
    <div className="max-w-2xl mx-auto">
      <UserAvatar user={user} size="large" />
      <UserInfo user={user} />
    </div>
  );
}