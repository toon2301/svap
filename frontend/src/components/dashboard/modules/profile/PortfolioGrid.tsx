'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { PortfolioCard } from './PortfolioCard';
import type { PortfolioItem } from './portfolioTypes';

type PortfolioGridProps = {
  items: PortfolioItem[];
  getCategoryLabel: (category: string) => string;
};

export function PortfolioGrid({ items, getCategoryLabel }: PortfolioGridProps) {
  const { t } = useLanguage();

  if (items.length === 0) return null;

  return (
    <section aria-label={t('portfolio.moreWork')} className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
        {t('portfolio.moreWork')}
      </h3>
      <div
        data-testid="portfolio-grid"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
      >
        {items.map((item) => (
          <PortfolioCard
            key={item.id}
            item={item}
            categoryLabel={getCategoryLabel(item.category)}
          />
        ))}
      </div>
    </section>
  );
}
