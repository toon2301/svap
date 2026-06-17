'use client';

import { useLanguage } from '@/contexts/LanguageContext';

type PortfolioEmptyStateProps = {
  isOwner: boolean;
  onCreate?: () => void;
};

export function PortfolioEmptyState({ isOwner, onCreate }: PortfolioEmptyStateProps) {
  const { t } = useLanguage();

  return (
    <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-white/60 px-5 py-8 text-center shadow-sm dark:border-gray-800 dark:bg-[#0f0f10]">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
        {isOwner ? t('portfolio.emptyOwnerTitle') : t('portfolio.emptyVisitorTitle')}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-600 dark:text-gray-400">
        {isOwner ? t('portfolio.emptyOwnerBody') : t('portfolio.emptyVisitorBody')}
      </p>
      {isOwner && onCreate && (
        <button
          type="button"
          onClick={onCreate}
          className="mt-5 rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
        >
          {t('portfolio.createAction')}
        </button>
      )}
    </div>
  );
}
