'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { PortfolioCard } from './PortfolioCard';
import type { PortfolioItem } from './portfolioTypes';

type PortfolioFeaturedCardProps = {
  item: PortfolioItem;
  categoryLabel: string;
  onOpenItem?: (item: PortfolioItem) => void;
};

export function PortfolioFeaturedCard({ item, categoryLabel, onOpenItem }: PortfolioFeaturedCardProps) {
  const { t } = useLanguage();

  return (
    <section aria-label={t('portfolio.featured')} className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          {t('portfolio.featured')}
        </h3>
      </div>
      <PortfolioCard
        item={item}
        categoryLabel={categoryLabel}
        featured
        loading="eager"
        onClick={onOpenItem ? () => onOpenItem(item) : undefined}
      />
    </section>
  );
}
