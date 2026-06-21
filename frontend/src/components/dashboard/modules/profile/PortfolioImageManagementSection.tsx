'use client';

import { useCallback, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  deletePortfolioImage,
  reorderPortfolioImages,
  setPortfolioCoverImage,
} from './portfolioApi';
import { PortfolioImageDeleteConfirmDialog } from './PortfolioImageDeleteConfirmDialog';
import { PortfolioImageManagementItem } from './PortfolioImageManagementItem';
import type { PortfolioImage, PortfolioItem } from './portfolioTypes';

type PortfolioImageManagementSectionProps = {
  item: PortfolioItem;
  onRefresh: () => Promise<void> | void;
};

function imageKey(image: PortfolioImage, index: number): string {
  if (typeof image.id === 'number') return `id:${image.id}`;
  return `index:${index}`;
}

function imagePreviewSrc(image: PortfolioImage): string {
  return (
    String(image.thumbnail_url || '').trim() ||
    String(image.medium_url || '').trim() ||
    String(image.image_url || '').trim() ||
    String(image.large_url || '').trim()
  );
}

function sortedUniqueImages(item: PortfolioItem): PortfolioImage[] {
  const images = [item.cover_image ?? null, ...(item.images || [])];
  const seen = new Set<string>();
  const unique: PortfolioImage[] = [];

  images.forEach((image, index) => {
    if (!image) return;
    const key = imageKey(image, index);
    if (seen.has(key)) return;
    seen.add(key);
    unique.push(image);
  });

  return unique.sort((left, right) => {
    const leftOrder = typeof left.order === 'number' ? left.order : Number.MAX_SAFE_INTEGER;
    const rightOrder = typeof right.order === 'number' ? right.order : Number.MAX_SAFE_INTEGER;
    return leftOrder - rightOrder;
  });
}

export function PortfolioImageManagementSection({
  item,
  onRefresh,
}: PortfolioImageManagementSectionProps) {
  const { t } = useLanguage();
  const images = useMemo(() => sortedUniqueImages(item), [item]);
  const [deleteTarget, setDeleteTarget] = useState<PortfolioImage | null>(null);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const runRefresh = useCallback(async () => {
    await Promise.resolve(onRefresh());
  }, [onRefresh]);

  const handleSetCover = useCallback(
    async (image: PortfolioImage) => {
      setActionKey(`cover:${image.id}`);
      setActionError(null);
      try {
        await setPortfolioCoverImage(item.id, image.id);
        await runRefresh();
      } catch {
        setActionError(t('portfolio.coverSetFailed'));
      } finally {
        setActionKey(null);
      }
    },
    [item.id, runRefresh, t],
  );

  const handleMove = useCallback(
    async (image: PortfolioImage, direction: -1 | 1) => {
      const currentIndex = images.findIndex((candidate) => candidate.id === image.id);
      const nextIndex = currentIndex + direction;
      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= images.length) return;

      const nextImages = [...images];
      [nextImages[currentIndex], nextImages[nextIndex]] = [
        nextImages[nextIndex],
        nextImages[currentIndex],
      ];

      setActionKey(`reorder:${image.id}`);
      setActionError(null);
      try {
        await reorderPortfolioImages(item.id, nextImages.map((nextImage) => nextImage.id));
        await runRefresh();
      } catch {
        setActionError(t('portfolio.orderSaveFailed'));
      } finally {
        setActionKey(null);
      }
    },
    [images, item.id, runRefresh, t],
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setActionKey(`delete:${deleteTarget.id}`);
    setActionError(null);
    try {
      await deletePortfolioImage(item.id, deleteTarget.id);
      setDeleteTarget(null);
      await runRefresh();
    } catch {
      setActionError(t('portfolio.photoDeleteFailed'));
    } finally {
      setActionKey(null);
    }
  }, [deleteTarget, item.id, runRefresh, t]);

  if (images.length === 0) return null;

  const coverImageId = item.cover_image?.id ?? null;
  const isBusy = actionKey != null;

  return (
    <section
      data-testid="portfolio-image-management-section"
      className="space-y-4 rounded-3xl border border-gray-200 bg-white/80 p-4 shadow-sm dark:border-gray-800 dark:bg-[#101011]"
      aria-label={t('portfolio.photosLabel')}
    >
      <div>
        <h2 className="text-sm font-semibold text-gray-950 dark:text-white">
          {t('portfolio.photosLabel')}
        </h2>
      </div>

      {actionError && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
          {actionError}
        </p>
      )}

      <div className="grid gap-3">
        {images.map((image, index) => (
          <PortfolioImageManagementItem
            key={imageKey(image, index)}
            image={image}
            previewSrc={imagePreviewSrc(image)}
            isCover={image.id === coverImageId}
            isFirst={index === 0}
            isLast={index === images.length - 1}
            disabled={isBusy}
            onSetCover={() => void handleSetCover(image)}
            onDelete={() => {
              setDeleteTarget(image);
              setActionError(null);
            }}
            onMoveUp={() => void handleMove(image, -1)}
            onMoveDown={() => void handleMove(image, 1)}
          />
        ))}
      </div>

      <PortfolioImageDeleteConfirmDialog
        open={deleteTarget != null}
        isDeleting={actionKey === `delete:${deleteTarget?.id}`}
        onClose={() => {
          if (!isBusy) setDeleteTarget(null);
        }}
        onConfirm={handleDelete}
      />
    </section>
  );
}
