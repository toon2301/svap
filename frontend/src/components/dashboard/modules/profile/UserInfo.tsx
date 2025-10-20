'use client';

import React from 'react';
import { User } from '../../../../types';

interface UserInfoProps {
  user: User;
}

export default function UserInfo({ user }: UserInfoProps) {
  return (
    <div className="text-center">
      {/* Location is now displayed in the main profile view next to the avatar */}
    </div>
  );
}
