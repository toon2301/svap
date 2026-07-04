'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckIcon, CloudArrowUpIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import { preparePortfolioDisplayImages, type PortfolioDisplayImage } from './portfolioDisplay';
import { deletePortfolioImage, setPortfolioCoverImage } from './portfolioApi';
import { PortfolioGalleryImageTile } from './PortfolioGalleryImageTile';
import { PortfolioImageUploadQueue } from './PortfolioImageUploadQueue';
import {
  PORTFOLIO_IMAGE_ACCEPT,
  portfolioPhotosRemainingText,
} from './portfolioFormUtils';
import {
  isActivePortfolioImage,
  uniquePortfolioImages,
} from './portfolioImageUtils';
import type { PortfolioItem } from './portfolioTypes';
import { usePortfolioImageUploadQueue } from './usePortfolioImageUploadQueue';

type PortfolioImageGalleryProps = {
  images: PortfolioDisplayImage[];
  item: PortfolioItem;
  canUpload?: boolean;
  onOpenImage: (index: number) => void;
  onUploadRefresh?: () => Promise<void> | void;
};

export function PortfolioImageGallery({
  images,
  item,
  canUpload = false,
  onOpenImage,
  onUploadRefresh,
}: PortfolioImageGalleryProps) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isManaging, setIsManaging] = useState(false);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [galleryActionError, setGalleryActionError] = useState<string | null>(null);
  const serverImages = useMemo(() => uniquePortfolioImages(item), [item]);
  const activeImageCount = useMemo(
    () => serverImages.filter(isActivePortfolioImage).length,
    [serverImages],
  );
  const galleryImages = useMemo(() => {
    const orderedImages = preparePortfolioDisplayImages(item, { preferCoverFirst: false });
    return orderedImages.length > 0 ? orderedImages : images;
  }, [images, item]);
  const refreshUploads = useCallback(async () => {
    await Promise.resolve(onUploadRefresh?.());
  }, [onUploadRefresh]);
  const {
    items,
    remainingSlots,
    selectionError,
    uploadFiles,
    retryUpload,
  } = usePortfolioImageUploadQueue({
    itemId: item.id,
    activeImageCount,
    serverImages,
    onRefresh: refreshUploads,
  });
  const limitReached = remainingSlots <= 0;
  const canManageGallery = canUpload && galleryImages.length > 0;
  const isActionBusy = actionKey != null;
  const coverImageId = item.cover_image?.id ?? null;

  useEffect(() => {
    if (!canManageGallery) {
      setIsManaging(false);
      setGalleryActionError(null);
    }
  }, [canManageGallery]);

  const handleToggleManage = useCallback(() => {
    setIsManaging((current) => !current);
    setGalleryActionError(null);
  }, []);

  const handleSetCover = useCallback(
    async (image: PortfolioDisplayImage) => {
      if (typeof image.id !== 'number' || image.id < 1 || image.id === coverImageId) return;

      setActionKey(`cover:${image.id}`);
      setGalleryActionError(null);
      try {
        await setPortfolioCoverImage(item.id, image.id);
        await refreshUploads();
      } catch {
        setGalleryActionError(t('portfolio.coverSetFailed'));
      } finally {
        setActionKey(null);
      }
    },
    [coverImageId, item.id, refreshUploads, t],
  );

  const handleDelete = useCallback(
    async (image: PortfolioDisplayImage) => {
      if (typeof image.id !== 'number' || image.id < 1) return;

      setActionKey(`delete:${image.id}`);
      setGalleryActionError(null);
      try {
        await deletePortfolioImage(item.id, image.id);
        await refreshUploads();
      } catch {
        setGalleryActionError(t('portfolio.photoDeleteFailed'));
      } finally {
        setActionKey(null);
      }
    },
    [item.id, refreshUploads, t],
  );

  const handleOpenGalleryImage = useCallback(
    (image: PortfolioDisplayImage, fallbackIndex: number) => {
      const lightboxIndex = images.findIndex((candidate) => candidate.key === image.key);
      onOpenImage(lightboxIndex >= 0 ? lightboxIndex : fallbackIndex);
    },
    [images, onOpenImage],
  );

  if (galleryImages.length === 0 && !canUpload) return null;

  return (
    <section className="space-y-3" aria-label={t('portfolio.gallery')}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            {t('portfolio.gallery')}
          </h2>
          {canUpload && (
            <p className="mt-1 text-xs font-medium text-gray-500 dark:text-gray-400">
              {portfolioPhotosRemainingText(t, remainingSlots)}
            </p>
          )}
        </div>

        {canUpload && (
          <div data-testid="portfolio-gallery-upload-controls" className="flex items-center gap-3">
            {canManageGallery && (
              <button
                type="button"
                data-testid="portfolio-gallery-edit-button"
                aria-pressed={isManaging}
                onClick={handleToggleManage}
                className={[
                  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-4 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-purple-400/60',
                  isManaging
                    ? 'border-purple-300 bg-purple-600 text-white hover:bg-purple-700 dark:border-purple-600 dark:bg-purple-500 dark:hover:bg-purple-600'
                    : 'border-gray-200 bg-white/90 text-gray-700 hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700 dark:border-gray-800 dark:bg-[#101011] dark:text-gray-100 dark:hover:border-purple-800/70 dark:hover:bg-purple-950/30 dark:hover:text-purple-200',
                ].join(' ')}
              >
                {isManaging ? (
                  <CheckIcon className="h-4 w-4" />
                ) : (
                  <PencilSquareIcon className="h-4 w-4" />
                )}
                {isManaging ? t('portfolio.done') : t('portfolio.editAction')}
              </button>
            )}
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
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-4 text-sm font-semibold text-purple-700 shadow-sm transition hover:-translate-y-0.5 hover:border-purple-300 hover:bg-purple-100 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-purple-400/60 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-500 disabled:shadow-none dark:border-purple-900/60 dark:bg-purple-950/20 dark:text-purple-200 dark:hover:bg-purple-950/40 dark:disabled:border-gray-800 dark:disabled:bg-gray-900 dark:disabled:text-gray-500"
            >
              <CloudArrowUpIcon className="h-4 w-4" />
              {t('portfolio.selectPhotos')}
            </button>
          </div>
        )}
      </div>

      {canUpload && selectionError && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
          {selectionError}
        </p>
      )}
      {canUpload && galleryActionError && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
          {galleryActionError}
        </p>
      )}
      {canUpload && <PortfolioImageUploadQueue items={items} onRetry={retryUpload} />}

      {galleryImages.length > 0 && (
        <div
          data-testid="portfolio-detail-gallery"
          className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4"
        >
          {galleryImages.map((image, index) => (
            <PortfolioGalleryImageTile
              key={image.key}
              image={image}
              itemTitle={item.title}
              index={index}
              total={galleryImages.length}
              isManaging={isManaging}
              isCover={typeof image.id === 'number' && image.id === coverImageId}
              isBusy={isActionBusy}
              onOpen={() => handleOpenGalleryImage(image, index)}
              onSetCover={() => void handleSetCover(image)}
              onDelete={() => void handleDelete(image)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
