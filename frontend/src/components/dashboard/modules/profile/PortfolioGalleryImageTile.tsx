'use client';

import { TrashIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import BlurredContainImage from '../shared/BlurredContainImage';
import type { PortfolioDisplayImage } from './portfolioDisplay';
import { formatPortfolioPhotoCounter } from './portfolioDisplay';

type PortfolioGalleryImageTileProps = {
  image: PortfolioDisplayImage;
  itemTitle: string;
  index: number;
  total: number;
  isManaging: boolean;
  isCover: boolean;
  isBusy: boolean;
  onOpen: () => void;
  onSetCover: () => void;
  onDelete: () => void;
};

function PushPinIcon({ filled, className }: { filled?: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m14.25 3.75 6 6-2.4 2.4-1.65-.72-4.77 4.77.72 3.15-1.5 1.5-3.9-3.9-4.5 4.5 4.5-4.5-3.9-3.9 1.5-1.5 3.15.72 4.77-4.77-.72-1.65 2.7-2.1Z" />
    </svg>
  );
}

export function PortfolioGalleryImageTile({
  image,
  itemTitle,
  index,
  total,
  isManaging,
  isCover,
  isBusy,
  onOpen,
  onSetCover,
  onDelete,
}: PortfolioGalleryImageTileProps) {
  const { t } = useLanguage();
  const hasImageId = typeof image.id === 'number' && image.id > 0;
  const counterText = formatPortfolioPhotoCounter(
    t('portfolio.photoCounter'),
    index + 1,
    total,
  );
  const label = `${itemTitle} ${counterText}`;
  const pinLabel = isCover ? t('portfolio.coverPhoto') : t('portfolio.setAsCoverPhoto');

  return (
    <div
      data-testid={`portfolio-gallery-image-${image.id ?? index}`}
      className="group relative aspect-[4/3]"
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={label}
        className={[
          'h-full w-full overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 transition duration-200 focus:outline-none focus:ring-2 focus:ring-purple-400/60 dark:border-gray-800 dark:bg-[#0e0e0f]',
          isManaging
            ? '-translate-y-1 shadow-lg ring-2 ring-purple-200/80 ring-offset-2 ring-offset-white dark:ring-purple-900/60 dark:ring-offset-black'
            : 'hover:-translate-y-0.5 hover:shadow-md',
        ].join(' ')}
      >
        <BlurredContainImage
          src={image.mediumSrc}
          alt={`${itemTitle} ${index + 1}`}
          loading={index < 2 ? 'eager' : 'lazy'}
          className="rounded-2xl"
        />
      </button>

      {isManaging && hasImageId && (
        <>
          <button
            type="button"
            data-testid={`portfolio-gallery-cover-button-${image.id}`}
            aria-label={pinLabel}
            title={pinLabel}
            disabled={isBusy || isCover}
            onClick={onSetCover}
            className={[
              'absolute left-2 top-2 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border shadow-lg backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-purple-400/70 disabled:cursor-not-allowed',
              isCover
                ? 'border-purple-300 bg-purple-600 text-white dark:border-purple-500 dark:bg-purple-500'
                : 'border-white/70 bg-white/90 text-gray-700 hover:-translate-y-0.5 hover:bg-purple-50 hover:text-purple-700 disabled:opacity-60 dark:border-gray-800/90 dark:bg-black/70 dark:text-gray-100 dark:hover:bg-purple-950/50 dark:hover:text-purple-200',
            ].join(' ')}
          >
            <PushPinIcon filled={isCover} className="h-4 w-4" />
          </button>
          <button
            type="button"
            data-testid={`portfolio-gallery-delete-button-${image.id}`}
            aria-label={t('portfolio.deletePhoto')}
            title={t('portfolio.deletePhoto')}
            disabled={isBusy}
            onClick={onDelete}
            className="absolute right-2 top-2 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-black/65 text-white shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-300/80 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-800/90"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
}
