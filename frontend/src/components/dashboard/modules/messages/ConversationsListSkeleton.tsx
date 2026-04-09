'use client';

import React from 'react';

type ConversationsListVariant = 'default' | 'sidebar' | 'rail';

const DEFAULT_ROWS = 6;

export function ConversationsListSkeleton({
  variant = 'default',
  rows = DEFAULT_ROWS,
  className = '',
}: {
  variant?: ConversationsListVariant;
  rows?: number;
  className?: string;
}) {
  const isSidebar = variant === 'sidebar';
  const isRail = variant === 'rail';
  const isCompact = isSidebar || isRail;
  const containerClassName =
    className || (isCompact ? 'space-y-2' : 'max-w-4xl mx-auto space-y-2');

  return (
    <div
      className={containerClassName}
      data-testid="conversations-list-skeleton"
      aria-hidden="true"
    >
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          data-testid="conversation-skeleton-row"
          className={`relative flex items-center gap-3 overflow-hidden ${
            isRail
              ? 'rounded-2xl px-3 py-2.5'
              : `${isCompact ? 'px-3 py-2.5' : 'px-4 py-3.5'}`
          }`}
        >
          <div
            className={`animate-pulse rounded-full bg-gray-200 dark:bg-gray-700/70 ${
              isCompact ? 'h-9 w-9' : 'h-11 w-11'
            }`}
          />

          <div className={`min-w-0 flex-1 ${isRail ? 'pr-7' : ''}`}>
            <div className="flex items-center gap-2">
              <div
                className={`animate-pulse rounded bg-gray-200 dark:bg-gray-700/70 ${
                  isCompact ? 'h-3 w-28' : 'h-4 w-36'
                }`}
              />
              <div
                className={`animate-pulse rounded-full bg-gray-200 dark:bg-gray-700/70 ${
                  isCompact ? 'h-4 w-10' : 'h-5 w-12'
                }`}
              />
            </div>
            <div
              className={`mt-2 animate-pulse rounded bg-gray-200 dark:bg-gray-700/70 ${
                isCompact ? 'h-3 w-4/5' : 'h-3.5 w-3/4'
              }`}
            />
          </div>

          {isRail ? (
            <div className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 rounded-sm bg-gray-200 dark:bg-gray-700/70 animate-pulse" />
          ) : null}
        </div>
      ))}
    </div>
  );
}
