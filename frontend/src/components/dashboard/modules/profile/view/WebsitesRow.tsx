'use client';

import React from 'react';
import { User } from '@/types';

interface WebsitesRowProps {
  user: User;
  onOpenAll: () => void;
}

export default function WebsitesRow({ user, onOpenAll }: WebsitesRowProps) {
  const totalWebsites = (user.website ? 1 : 0) + (user.additional_websites ? user.additional_websites.length : 0);
  const additionalCount = totalWebsites - 1;
  if (totalWebsites === 0) return null;
  const firstWebsite = user.website || (user.additional_websites && user.additional_websites[0]);
  return (
    <p className="text-gray-600 dark:text-gray-300 text-sm flex items-center gap-1">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4 text-gray-500 dark:text-gray-400 flex-shrink-0">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
      </svg>
      {additionalCount > 0 ? (
        <span className="flex items-center flex-wrap cursor-pointer" onClick={onOpenAll}>
          <span className="text-blue-600 hover:text-blue-800 transition-colors dark:text-blue-400 dark:hover:text-blue-300 truncate max-w-[300px]">{firstWebsite as string}</span>
          <span className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 ml-1 whitespace-nowrap">a ďalší ({additionalCount})</span>
        </span>
      ) : (
        <a href={firstWebsite as string} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 transition-colors dark:text-blue-400 dark:hover:text-blue-300 truncate max-w-[300px]">
          {firstWebsite}
        </a>
      )}
    </p>
  );
}


