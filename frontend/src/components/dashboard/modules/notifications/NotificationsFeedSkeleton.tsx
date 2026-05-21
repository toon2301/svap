'use client';

import React from 'react';

const DEFAULT_ROWS = 6;

function NotificationSkeletonRow() {
  return (
    <div
      data-testid="notification-skeleton-row"
      className="flex items-start gap-1.5 rounded-2xl px-2 py-1.5 lg:gap-2.5 lg:px-3 lg:py-2.5"
    >
      <div
        className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700/70"
        aria-hidden
      />
      <div className="min-w-0 flex-1 space-y-2">
        <div
          className="h-3.5 w-[85%] max-w-md animate-pulse rounded bg-gray-200 dark:bg-gray-700/70"
          aria-hidden
        />
        <div
          className="h-3 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700/70 lg:mt-0.5"
          aria-hidden
        />
      </div>
    </div>
  );
}

export function NotificationsFeedSkeleton({
  rows = DEFAULT_ROWS,
  className = 'space-y-0',
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div
      className={className}
      data-testid="notifications-feed-skeleton"
      aria-hidden="true"
    >
      {Array.from({ length: rows }).map((_, index) => (
        <NotificationSkeletonRow key={index} />
      ))}
    </div>
  );
}
