'use client';

import React from 'react';

export function RequestsSkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[clamp(1rem,2vw,1.5rem)]">
      {Array.from({ length: rows }).map((_, idx) => (
        <div
          key={idx}
          className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-[#0f0f10] shadow-sm p-4"
        >
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
            <div className="min-w-0 flex-1">
              <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
              <div className="mt-2 h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
              <div className="mt-3 h-3 w-5/6 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
              <div className="mt-3 flex gap-2">
                <div className="h-6 w-20 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse" />
                <div className="h-6 w-24 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse" />
              </div>
            </div>
            <div className="h-8 w-24 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}


