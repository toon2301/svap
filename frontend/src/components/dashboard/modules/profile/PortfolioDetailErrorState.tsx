'use client';

import { useLanguage } from '@/contexts/LanguageContext';

type PortfolioDetailErrorStateProps = {
  onRetry: () => void;
};

export function PortfolioDetailErrorState({ onRetry }: PortfolioDetailErrorStateProps) {
  const { t } = useLanguage();

  return (
    <div className="mx-auto mt-8 max-w-lg rounded-2xl border border-red-200 bg-red-50/70 px-5 py-8 text-center dark:border-red-900/60 dark:bg-red-950/20">
      <h2 className="text-base font-semibold text-red-700 dark:text-red-300">
        {t('portfolio.detailLoadErrorTitle')}
      </h2>
      <p className="mt-2 text-sm text-red-700/80 dark:text-red-300/80">
        {t('portfolio.loadErrorBody')}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-400/60 dark:border-red-800 dark:text-red-200 dark:hover:bg-red-950"
      >
        {t('portfolio.retry')}
      </button>
    </div>
  );
}
