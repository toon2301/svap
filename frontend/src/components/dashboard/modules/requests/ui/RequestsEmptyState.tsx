'use client';

import React from 'react';
import { InboxIcon } from '@heroicons/react/24/outline';

type Props = {
  title: string;
  subtitle: string;
  onRefresh?: () => void;
  refreshLabel?: string;
};

export function RequestsEmptyState({ title, subtitle, onRefresh, refreshLabel = 'Obnoviť' }: Props) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-[#0f0f10] shadow-sm p-8">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-4 grid place-items-center size-12 rounded-2xl bg-purple-50 text-purple-700 border border-purple-100 dark:bg-purple-900/20 dark:text-purple-200 dark:border-purple-800/40">
          <InboxIcon className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>

        {onRefresh && (
          <div className="mt-5">
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black px-4 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60"
            >
              {refreshLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


