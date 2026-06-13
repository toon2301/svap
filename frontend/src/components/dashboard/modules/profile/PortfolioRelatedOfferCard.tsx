'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import type { PortfolioRelatedOffer } from './portfolioTypes';
import { getPortfolioCategoryLabel } from './portfolioDisplay';

type PortfolioRelatedOfferCardProps = {
  offer?: PortfolioRelatedOffer | null;
};

export function PortfolioRelatedOfferCard({ offer }: PortfolioRelatedOfferCardProps) {
  const { t } = useLanguage();

  if (!offer) return null;

  const category = String(offer.subcategory || offer.category || '').trim();
  if (!category) return null;

  const label = getPortfolioCategoryLabel(t, category);

  return (
    <section className="space-y-3" aria-label={t('portfolio.relatedOffer')}>
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
        {t('portfolio.relatedOffer')}
      </h2>
      <div className="rounded-2xl border border-gray-200 bg-white/75 p-4 shadow-sm dark:border-gray-800 dark:bg-[#0f0f10]">
        <p className="text-sm font-semibold text-gray-950 dark:text-white">
          {label}
        </p>
      </div>
    </section>
  );
}
