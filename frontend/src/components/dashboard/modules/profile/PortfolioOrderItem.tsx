'use client';

/* eslint-disable @next/next/no-img-element */

import { ArrowDownIcon, ArrowUpIcon, StarIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import type { PortfolioItem } from './portfolioTypes';

type PortfolioOrderItemProps = {
  item: PortfolioItem;
  categoryLabel: string;
  isFeatured: boolean;
  isFirst: boolean;
  isLast: boolean;
  disabled?: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
};

function itemImageSrc(item: PortfolioItem): string {
  return (
    String(item.cover_image?.thumbnail_url || '').trim() ||
    String(item.cover_image?.medium_url || '').trim() ||
    String(item.cover_image?.image_url || '').trim()
  );
}

export function PortfolioOrderItem({
  item,
  categoryLabel,
  isFeatured,
  isFirst,
  isLast,
  disabled = false,
  onMoveUp,
  onMoveDown,
}: PortfolioOrderItemProps) {
  const { t } = useLanguage();
  const src = itemImageSrc(item);

  return (
    <div
      data-testid="portfolio-order-item"
      className="rounded-2xl border border-gray-200 bg-gray-50/80 p-3 dark:border-gray-800 dark:bg-[#0e0e0f]"
    >
      <div className="flex gap-3">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-[#151517]">
          {src ? (
            <img
              src={src}
              alt={item.title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center px-2 text-center text-xs text-gray-400">
              {t('portfolio.noCoverImage')}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              {isFeatured && (
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 dark:bg-purple-950/30 dark:text-purple-200">
                  <StarIcon className="h-3.5 w-3.5" />
                  {t('portfolio.featuredPortfolio')}
                </span>
              )}
            </div>
            <h3 className="mt-1 truncate text-sm font-semibold text-gray-950 dark:text-white">
              {item.title}
            </h3>
            <p className="mt-0.5 truncate text-xs font-medium text-gray-500 dark:text-gray-400">
              {categoryLabel}
            </p>
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
          </div>
        </div>
      </div>
    </div>
  );
}
