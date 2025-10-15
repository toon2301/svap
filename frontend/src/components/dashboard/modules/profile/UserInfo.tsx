'use client';

import React from 'react';
import { User } from '../../../../types';

interface UserInfoProps {
  user: User;
}

export default function UserInfo({ user }: UserInfoProps) {
  return (
    <div className="text-center">
      {/* UserInfo je teraz prázdny, všetky informácie sú vedľa fotky */}
    </div>
  );
}
