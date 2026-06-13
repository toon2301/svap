'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import BlurredContainImage from '../shared/BlurredContainImage';
import type { PortfolioDisplayImage } from './portfolioDisplay';
import { formatPortfolioPhotoCounter } from './portfolioDisplay';

type PortfolioImageGalleryProps = {
  images: PortfolioDisplayImage[];
  itemTitle: string;
  onOpenImage: (index: number) => void;
};

export function PortfolioImageGallery({
  images,
  itemTitle,
  onOpenImage,
}: PortfolioImageGalleryProps) {
  const { t } = useLanguage();

  if (images.length === 0) return null;

  return (
    <section className="space-y-3" aria-label={t('portfolio.gallery')}>
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
        {t('portfolio.gallery')}
      </h2>
      <div
        data-testid="portfolio-detail-gallery"
        className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4"
      >
        {images.map((image, index) => (
          <button
            key={image.key}
            type="button"
            onClick={() => onOpenImage(index)}
            aria-label={`${itemTitle} ${formatPortfolioPhotoCounter(
              t('portfolio.photoCounter'),
              index + 1,
              images.length,
            )}`}
            className="aspect-[4/3] overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-purple-400/60 dark:border-gray-800 dark:bg-[#0e0e0f]"
          >
            <BlurredContainImage
              src={image.mediumSrc}
              alt={`${itemTitle} ${index + 1}`}
              loading={index < 2 ? 'eager' : 'lazy'}
              className="rounded-2xl"
            />
          </button>
        ))}
      </div>
    </section>
  );
}
