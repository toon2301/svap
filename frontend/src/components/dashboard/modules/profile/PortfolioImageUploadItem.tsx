'use client';

/* eslint-disable @next/next/no-img-element */

import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import type { PortfolioUploadQueueItem } from './usePortfolioImageUploadQueue';

type PortfolioImageUploadItemProps = {
  item: PortfolioUploadQueueItem;
  onRetry: (id: string) => void;
};

function statusLabel(
  status: PortfolioUploadQueueItem['status'],
  t: (key: string, fallback?: string) => string,
): string {
  if (status === 'pending') return t('portfolio.photoPendingReview');
  if (status === 'failed') return t('portfolio.photoUploadFailed');
  return t('portfolio.uploadingPhoto');
}

export function PortfolioImageUploadItem({ item, onRetry }: PortfolioImageUploadItemProps) {
  const { t } = useLanguage();
  const isFailed = item.status === 'failed';
  const isPending = item.status === 'pending';
  const progressLabel = `${item.progress}%`;

  return (
    <div
      data-testid="portfolio-upload-item"
      className="rounded-2xl border border-gray-200 bg-white/80 p-3 shadow-sm dark:border-gray-800 dark:bg-[#101011]"
    >
      <div className="flex gap-3">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-[#0e0e0f]">
          {item.previewUrl ? (
            <img
              src={item.previewUrl}
              alt={item.file.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
              {t('portfolio.selectPhotos')}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                {item.file.name}
              </p>
              <p
                className={
                  isFailed
                    ? 'text-xs font-medium text-red-600 dark:text-red-300'
                    : isPending
                      ? 'text-xs font-medium text-amber-700 dark:text-amber-300'
                      : 'text-xs font-medium text-gray-600 dark:text-gray-300'
                }
              >
                {item.error || statusLabel(item.status, t)}
              </p>
            </div>
            {isFailed && (
              <button
                type="button"
                onClick={() => onRetry(item.id)}
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400/50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/30"
              >
                <ArrowPathIcon className="h-3.5 w-3.5" />
                {t('portfolio.retryUpload')}
              </button>
            )}
          </div>

          {!isFailed && !isPending && (
            <div className="space-y-1">
              <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                <div
                  className="h-full rounded-full bg-purple-600 transition-all"
                  style={{ width: progressLabel }}
                />
              </div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {progressLabel}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
