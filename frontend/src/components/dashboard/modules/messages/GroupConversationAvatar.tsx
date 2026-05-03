'use client';

/* eslint-disable @next/next/no-img-element */

import React from 'react';
import { UserGroupIcon } from '@heroicons/react/24/outline';
import type { MessagingUserBrief } from './types';

type GroupConversationAvatarProps = {
  name: string;
  members?: MessagingUserBrief[];
  size?: 'sm' | 'md' | 'lg';
};

const sizeClasses = {
  sm: 'h-9 w-9',
  md: 'h-10 w-10',
  lg: 'h-11 w-11',
};

function initials(value: string): string {
  return (value || 'G').slice(0, 1).toUpperCase();
}

export function GroupConversationAvatar({
  name,
  members = [],
  size = 'md',
}: GroupConversationAvatarProps) {
  const visibleMembers = members.slice(0, 3);

  if (visibleMembers.length === 0) {
    return (
      <div className={`flex items-center justify-center rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 ${sizeClasses[size]}`}>
        <UserGroupIcon className={size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} />
      </div>
    );
  }

  return (
    <div className={`relative ${sizeClasses[size]}`} aria-label={name}>
      {visibleMembers.map((member, index) => {
        const positions =
          visibleMembers.length === 1
            ? ['inset-0']
            : visibleMembers.length === 2
              ? ['left-0 top-0', 'right-0 bottom-0']
              : ['left-0 top-0', 'right-0 top-0', 'left-1/2 bottom-0 -translate-x-1/2'];
        const itemSize = visibleMembers.length === 1 ? 'h-full w-full' : 'h-[62%] w-[62%]';
        return (
          <div
            key={member.id}
            className={`absolute ${positions[index]} ${itemSize} overflow-hidden rounded-full border-2 border-white bg-purple-100 dark:border-black dark:bg-purple-900/40`}
          >
            {member.avatar_url ? (
              <img src={member.avatar_url} alt={member.display_name} className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-[10px] font-bold text-purple-700 dark:text-purple-300">
                {initials(member.display_name)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
