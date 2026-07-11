'use client';

import { ArrowLeftIcon } from '@heroicons/react/24/outline';

type SettingsDetailHeaderProps = {
  title: string;
  backLabel: string;
  onBack?: () => void;
  className?: string;
};

export default function SettingsDetailHeader({
  title,
  backLabel,
  onBack,
  className = 'mb-6',
}: SettingsDetailHeaderProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label={backLabel}
          title={backLabel}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:-translate-y-0.5 hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400/50 dark:border-gray-800 dark:bg-[#101011] dark:text-gray-200 dark:hover:border-purple-900/60 dark:hover:bg-purple-950/20 dark:hover:text-purple-200"
        >
          <ArrowLeftIcon className="h-5 w-5" aria-hidden="true" />
        </button>
      ) : null}
      <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">
        {title}
      </h2>
    </div>
  );
}
