'use client';

import type React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import BlurredContainImage from '../shared/BlurredContainImage';
import type { PortfolioItem } from './portfolioTypes';

type PortfolioCardProps = {
  item: PortfolioItem;
  categoryLabel: string;
  featured?: boolean;
  loading?: React.ImgHTMLAttributes<HTMLImageElement>['loading'];
};

function PortfolioImageSlot({
  item,
  featured = false,
  loading = 'lazy',
}: Pick<PortfolioCardProps, 'item' | 'featured' | 'loading'>) {
  const { t } = useLanguage();
  const thumbnailUrl = item.cover_image?.thumbnail_url?.trim() || '';
  const aspectClass = featured ? 'aspect-[16/9]' : 'aspect-[4/3]';

  if (!thumbnailUrl) {
    return (
      <div className={`${aspectClass} flex items-center justify-center bg-gray-100 text-xs text-gray-500 dark:bg-[#0e0e0f] dark:text-gray-400`}>
        <span>{t('portfolio.noCoverImage')}</span>
      </div>
    );
  }

  return (
    <div className={aspectClass}>
      <BlurredContainImage
        src={thumbnailUrl}
        alt={item.title}
        loading={loading}
        className="rounded-t-2xl"
      />
    </div>
  );
}

export function PortfolioCard({
  item,
  categoryLabel,
  featured = false,
  loading = 'lazy',
}: PortfolioCardProps) {
  return (
    <article
      data-testid={featured ? 'portfolio-featured-card' : 'portfolio-grid-card'}
      className="group overflow-hidden rounded-2xl border border-gray-200 bg-white/75 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800 dark:bg-[#0f0f10]"
    >
      <PortfolioImageSlot item={item} featured={featured} loading={loading} />
      <div className={featured ? 'p-5' : 'p-4'}>
        <p className="text-xs font-medium uppercase tracking-wide text-purple-700 dark:text-purple-300">
          {categoryLabel}
        </p>
        <h3 className={`${featured ? 'mt-2 text-lg' : 'mt-1 text-base'} font-semibold leading-snug text-gray-950 dark:text-white`}>
          {item.title}
        </h3>
      </div>
    </article>
  );
}
