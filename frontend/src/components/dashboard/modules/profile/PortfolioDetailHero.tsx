'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import BlurredContainImage from '../shared/BlurredContainImage';
import type { PortfolioItem } from './portfolioTypes';
import type { PortfolioDisplayImage } from './portfolioDisplay';

type PortfolioDetailHeroProps = {
  item: PortfolioItem;
  categoryLabel: string;
  heroImage?: PortfolioDisplayImage;
  onOpenImage: () => void;
};

export function PortfolioDetailHero({
  item,
  categoryLabel,
  heroImage,
  onOpenImage,
}: PortfolioDetailHeroProps) {
  const { t } = useLanguage();
  const description = String(item.description || '').trim();

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)] lg:items-start">
      {heroImage ? (
        <button
          type="button"
          onClick={onOpenImage}
          className="group aspect-[16/9] overflow-hidden rounded-3xl border border-gray-200 bg-gray-100 text-left shadow-sm transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-purple-400/60 dark:border-gray-800 dark:bg-[#0e0e0f]"
        >
          <BlurredContainImage
            src={heroImage.mediumSrc}
            alt={item.title}
            loading="eager"
            className="rounded-3xl"
          />
        </button>
      ) : (
        <div className="flex aspect-[16/9] items-center justify-center rounded-3xl border border-gray-200 bg-gray-100 text-sm text-gray-500 dark:border-gray-800 dark:bg-[#0e0e0f] dark:text-gray-400">
          {t('portfolio.noCoverImage')}
        </div>
      )}

      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-purple-700 dark:text-purple-300">
          {categoryLabel}
        </p>
        <h1 className="text-2xl font-semibold leading-tight text-gray-950 dark:text-white sm:text-3xl">
          {item.title}
        </h1>
        {description && (
          <p className="whitespace-pre-line text-sm leading-6 text-gray-700 dark:text-gray-300">
            {description}
          </p>
        )}
      </div>
    </section>
  );
}
