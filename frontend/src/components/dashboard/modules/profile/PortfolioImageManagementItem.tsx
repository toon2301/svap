'use client';

/* eslint-disable @next/next/no-img-element */

import {
  ArrowDownIcon,
  ArrowUpIcon,
  StarIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import type { PortfolioImage } from './portfolioTypes';

type PortfolioImageManagementItemProps = {
  image: PortfolioImage;
  previewSrc: string;
  isCover: boolean;
  isFirst: boolean;
  isLast: boolean;
  disabled?: boolean;
  onSetCover: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
};

function statusLabel(
  image: PortfolioImage,
  t: (key: string, fallback?: string) => string,
): string {
  if (image.status === 'pending') return t('portfolio.photoPendingReview');
  if (image.status === 'rejected') return t('portfolio.photoRejected');
  return t('portfolio.photoApproved');
}

function statusClassName(image: PortfolioImage): string {
  if (image.status === 'pending') {
    return 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-200';
  }
  if (image.status === 'rejected') {
    return 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-200';
  }
  return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200';
}

export function PortfolioImageManagementItem({
  image,
  previewSrc,
  isCover,
  isFirst,
  isLast,
  disabled = false,
  onSetCover,
  onDelete,
  onMoveUp,
  onMoveDown,
}: PortfolioImageManagementItemProps) {
  const { t } = useLanguage();
  const canSetCover = image.status === 'approved' && !isCover && Boolean(previewSrc);

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-3 dark:border-gray-800 dark:bg-[#0e0e0f]">
      <div className="flex gap-3">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-[#151517]">
          {previewSrc ? (
            <img
              src={previewSrc}
              alt={t('portfolio.photoPreview')}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
              {t('portfolio.noCoverImage')}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClassName(image)}`}
            >
              {statusLabel(image, t)}
            </span>
            {isCover && (
              <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 dark:bg-purple-950/30 dark:text-purple-200">
                {t('portfolio.coverPhoto')}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={disabled || isFirst}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-black dark:text-gray-200 dark:hover:bg-gray-900"
            >
              <ArrowUpIcon className="h-4 w-4" />
              {t('portfolio.moveUp')}
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={disabled || isLast}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-black dark:text-gray-200 dark:hover:bg-gray-900"
            >
              <ArrowDownIcon className="h-4 w-4" />
              {t('portfolio.moveDown')}
            </button>
            {canSetCover && (
              <button
                type="button"
                onClick={onSetCover}
                disabled={disabled}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-3 text-xs font-semibold text-purple-700 transition hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-purple-900/60 dark:bg-purple-950/20 dark:text-purple-200 dark:hover:bg-purple-950/40 sm:min-w-[11rem]"
              >
                <StarIcon className="h-4 w-4" />
                {t('portfolio.setAsCoverPhoto')}
              </button>
            )}
            <button
              type="button"
              onClick={onDelete}
              disabled={disabled}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-200 dark:hover:bg-red-950/40"
            >
              <TrashIcon className="h-4 w-4" />
              {t('portfolio.deletePhoto')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
