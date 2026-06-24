'use client';

import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';

type PortfolioCreateDiscardConfirmProps = {
  onKeepEditing: () => void;
  onDiscard: () => void;
};

export function PortfolioCreateDiscardConfirm({
  onKeepEditing,
  onDiscard,
}: PortfolioCreateDiscardConfirmProps) {
  const { t } = useLanguage();

  return (
    <div className="p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
          <ExclamationTriangleIcon className="h-7 w-7 text-amber-700 dark:text-amber-300" />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <h2 id="portfolio-create-discard-title" className="text-lg font-semibold text-gray-950 dark:text-white">
            {t('portfolio.discardCreateTitle')}
          </h2>
          <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">
            {t('portfolio.discardCreateBody')}
          </p>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onKeepEditing}
          className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-400/40 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800/60"
        >
          {t('portfolio.keepEditing')}
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400/50"
        >
          {t('portfolio.discardCreate')}
        </button>
      </div>
    </div>
  );
}