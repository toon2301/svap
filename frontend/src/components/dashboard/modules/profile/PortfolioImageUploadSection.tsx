'use client';

/* eslint-disable @next/next/no-img-element */

import { useMemo, useRef } from 'react';
import { CloudArrowUpIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import type { PortfolioImage, PortfolioItem } from './portfolioTypes';
import { PortfolioImageUploadQueue } from './PortfolioImageUploadQueue';
import { PORTFOLIO_IMAGE_ACCEPT, portfolioPhotosRemainingText } from './portfolioFormUtils';
import {
  isActivePortfolioImage,
  portfolioImageKey,
  portfolioImagePreviewSrc,
  uniquePortfolioImages,
} from './portfolioImageUtils';
import { usePortfolioImageUploadQueue } from './usePortfolioImageUploadQueue';

type PortfolioImageUploadSectionProps = {
  item: PortfolioItem;
  onRefresh: () => Promise<void> | void;
};

function statusLabel(
  image: PortfolioImage,
  t: (key: string, fallback?: string) => string,
): string {
  if (image.status === 'pending') return t('portfolio.photoPendingReview');
  if (image.status === 'rejected') return t('portfolio.photoRejected');
  return t('portfolio.photoApproved');
}

export function PortfolioImageUploadSection({ item, onRefresh }: PortfolioImageUploadSectionProps) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const serverImages = useMemo(() => uniquePortfolioImages(item), [item]);
  const activeImageCount = useMemo(
    () => serverImages.filter(isActivePortfolioImage).length,
    [serverImages],
  );
  const {
    items,
    remainingSlots,
    selectionError,
    pendingImageIds,
    uploadFiles,
    retryUpload,
  } = usePortfolioImageUploadQueue({
    itemId: item.id,
    activeImageCount,
    serverImages,
    onRefresh,
  });

  const visibleServerImages = serverImages.filter(
    (image) => typeof image.id !== 'number' || !pendingImageIds.has(image.id),
  );
  const hasServerStatuses = visibleServerImages.length > 0;
  const limitReached = remainingSlots <= 0;

  return (
    <section
      data-testid="portfolio-upload-section"
      className="space-y-4 rounded-3xl border border-gray-200 bg-white/80 p-4 shadow-sm dark:border-gray-800 dark:bg-[#101011]"
      aria-label={t('portfolio.uploadPhotos')}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-950 dark:text-white">
            {t('portfolio.uploadPhotos')}
          </h2>
          <p className="mt-1 text-xs font-medium text-gray-500 dark:text-gray-400">
            {portfolioPhotosRemainingText(t, remainingSlots)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={PORTFOLIO_IMAGE_ACCEPT}
            className="hidden"
            data-testid="portfolio-upload-input"
            onChange={(event) => {
              if (event.target.files) {
                uploadFiles(event.target.files);
              }
              event.currentTarget.value = '';
            }}
          />
          <button
            type="button"
            data-testid="portfolio-upload-button"
            disabled={limitReached}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400/60 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600 dark:disabled:bg-gray-800 dark:disabled:text-gray-400"
          >
            <CloudArrowUpIcon className="h-4 w-4" />
            {t('portfolio.selectPhotos')}
          </button>
        </div>
      </div>

      {selectionError && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
          {selectionError}
        </p>
      )}
      {limitReached && (
        <p className="rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600 dark:border-gray-800 dark:bg-[#0e0e0f] dark:text-gray-300">
          {t('portfolio.maxPhotosLimit')}
        </p>
      )}

      <PortfolioImageUploadQueue items={items} onRetry={retryUpload} />

      {hasServerStatuses && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleServerImages.map((image, index) => {
            const src = portfolioImagePreviewSrc(image);
            const rejectedReason = String(image.rejected_reason || '').trim();
            return (
              <div
                key={portfolioImageKey(image, index)}
                data-testid={`portfolio-image-status-${image.status || 'approved'}`}
                className="flex gap-3 rounded-2xl border border-gray-200 bg-gray-50/80 p-3 dark:border-gray-800 dark:bg-[#0e0e0f]"
              >
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-[#151517]">
                  {src ? (
                    <img
                      src={src}
                      alt={item.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                      {t('portfolio.noCoverImage')}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={
                      image.status === 'rejected'
                        ? 'text-xs font-semibold text-red-700 dark:text-red-300'
                        : image.status === 'pending'
                          ? 'text-xs font-semibold text-amber-700 dark:text-amber-300'
                          : 'text-xs font-semibold text-emerald-700 dark:text-emerald-300'
                    }
                  >
                    {statusLabel(image, t)}
                  </p>
                  {image.status === 'rejected' && rejectedReason && (
                    <p className="mt-1 text-xs leading-5 text-gray-600 dark:text-gray-300">
                      {rejectedReason}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
