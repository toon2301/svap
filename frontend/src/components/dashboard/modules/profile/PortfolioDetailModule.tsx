'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import { getPortfolioItem } from './portfolioApi';
import type { PortfolioItem } from './portfolioTypes';
import {
  getPortfolioCategoryLabel,
  preparePortfolioDisplayImages,
} from './portfolioDisplay';
import { buildPortfolioListPath } from './portfolioRouting';
import { PortfolioDetailErrorState } from './PortfolioDetailErrorState';
import { PortfolioDetailHero } from './PortfolioDetailHero';
import { PortfolioDetailSkeleton } from './PortfolioDetailSkeleton';
import { PortfolioImageGallery } from './PortfolioImageGallery';
import { PortfolioLightbox } from './PortfolioLightbox';
import { PortfolioRelatedOfferCard } from './PortfolioRelatedOfferCard';

type PortfolioDetailModuleProps = {
  itemId: number | null;
  ownerIdentifier?: string | null;
};

export default function PortfolioDetailModule({
  itemId,
  ownerIdentifier,
}: PortfolioDetailModuleProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [item, setItem] = useState<PortfolioItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const backPath = useMemo(() => {
    const identifier = String(ownerIdentifier || '').trim();
    return identifier ? buildPortfolioListPath(identifier) : '/dashboard/profile';
  }, [ownerIdentifier]);

  const loadItem = useCallback(async () => {
    if (!itemId || !Number.isFinite(itemId)) {
      setItem(null);
      setLoadError(true);
      return;
    }

    setIsLoading(true);
    setLoadError(false);
    try {
      const data = await getPortfolioItem(itemId);
      setItem(data);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Portfolio detail load failed.', error);
      }
      setItem(null);
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    setItem(null);
    setLightboxIndex(null);
    void loadItem();
  }, [loadItem]);

  const images = useMemo(
    () => (item ? preparePortfolioDisplayImages(item) : []),
    [item],
  );

  const categoryLabel = useMemo(
    () => (item ? getPortfolioCategoryLabel(t, item.category) : ''),
    [item, t],
  );

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  const handleBack = useCallback(() => {
    router.push(backPath);
  }, [backPath, router]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6 lg:px-0">
      <button
        type="button"
        onClick={handleBack}
        className="mb-5 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/80 px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-400/60 dark:border-gray-800 dark:bg-[#101011] dark:text-gray-100 dark:hover:bg-[#171719]"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        {t('portfolio.back')}
      </button>

      {isLoading && !item ? (
        <PortfolioDetailSkeleton />
      ) : loadError && !item ? (
        <PortfolioDetailErrorState onRetry={() => void loadItem()} />
      ) : item ? (
        <div className="space-y-7">
          <PortfolioDetailHero
            item={item}
            categoryLabel={categoryLabel}
            heroImage={images[0]}
            onOpenImage={() => openLightbox(0)}
          />
          <PortfolioImageGallery
            images={images}
            itemTitle={item.title}
            onOpenImage={openLightbox}
          />
          <PortfolioRelatedOfferCard offer={item.related_offer} />
        </div>
      ) : null}

      {item && (
        <PortfolioLightbox
          open={lightboxIndex != null}
          images={images}
          initialIndex={lightboxIndex ?? 0}
          alt={item.title}
          onClose={closeLightbox}
        />
      )}
    </div>
  );
}
