'use client';

import React from 'react';

/** Mobilná karta – zodpovedá RequestMobileCard (avatar, meno, intent, subcategory) */
function RequestSkeletonRowMobile() {
  return (
    <div className="relative w-full bg-gray-100 dark:bg-gray-800/50">
      <div className="px-6 py-3 sm:px-8">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 shrink-0 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-1.5">
                <div className="h-3.5 w-28 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                <div className="h-3 w-40 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
              </div>
            </div>
            <div className="mt-2">
              <div className="h-3.5 w-3/4 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Desktop riadok – zodpovedá RequestSummaryCard */
function RequestSkeletonRowDesktop() {
  return (
    <div className="group relative overflow-hidden pt-4 pb-4 min-h-[11rem]">
      <div
        className="absolute inset-y-0 right-6 sm:right-8 flex flex-col items-stretch justify-start px-2 sm:px-3 pt-3 sm:pt-4 gap-3 sm:gap-4 w-56 sm:w-64 md:w-72"
        aria-hidden
      >
        <div className="shrink-0 h-4 w-16 ml-auto rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
        <div className="flex flex-row items-stretch justify-center gap-1 sm:gap-2 shrink-0">
          <div className="flex-1 h-8 rounded-md bg-gray-200 dark:bg-gray-800 animate-pulse" />
          <div className="flex-1 h-8 rounded-md bg-gray-200 dark:bg-gray-800 animate-pulse" />
          <div className="flex-[1.6] h-8 rounded-md bg-gray-200 dark:bg-gray-800 animate-pulse" />
        </div>
        <div className="shrink-0 pt-2 pb-2 flex flex-row items-center justify-end gap-3">
          <div className="h-6 w-14 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse" />
          <div className="h-6 w-12 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse" />
        </div>
      </div>
      <div className="flex flex-col pr-[15.5rem] sm:pr-72 md:pr-80 min-w-0">
        <div className="px-3 pt-0 pb-2 flex items-center gap-2">
          <div className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse" />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="h-3.5 w-32 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
            <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
          </div>
        </div>
        <div className="mt-2 flex-1 px-3 space-y-2">
          <div className="h-3.5 w-3/4 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
          <div className="h-3 w-full rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

type Props = { rows?: number; variant?: 'mobile' | 'desktop' };

export function RequestsSkeletonList({ rows = 4, variant = 'desktop' }: Props) {
  const isMobile = variant === 'mobile';
  const wrapperClassName = isMobile
    ? 'flex flex-col -mx-2 w-[calc(100%+1rem)] sm:-mx-4 sm:w-[calc(100%+2rem)]'
    : 'flex flex-col gap-6 px-4';
  const Row = isMobile ? RequestSkeletonRowMobile : RequestSkeletonRowDesktop;

  return (
    <div className={wrapperClassName}>
      {Array.from({ length: rows }).map((_, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 && (
            <div
              className="shrink-0 border-t border-gray-200 dark:border-gray-800"
              aria-hidden
            />
          )}
          <Row />
        </React.Fragment>
      ))}
    </div>
  );
}
