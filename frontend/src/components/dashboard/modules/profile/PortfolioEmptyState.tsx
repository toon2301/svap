'use client';

import { useLanguage } from '@/contexts/LanguageContext';

type PortfolioEmptyStateProps = {
  isOwner: boolean;
};

export function PortfolioEmptyState({ isOwner }: PortfolioEmptyStateProps) {
  const { t } = useLanguage();

  return (
    <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-white/60 px-5 py-8 text-center shadow-sm dark:border-gray-800 dark:bg-[#0f0f10]">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
        {isOwner ? t('portfolio.emptyOwnerTitle') : t('portfolio.emptyVisitorTitle')}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-600 dark:text-gray-400">
        {isOwner ? t('portfolio.emptyOwnerBody') : t('portfolio.emptyVisitorBody')}
      </p>
    </div>
  );
}
