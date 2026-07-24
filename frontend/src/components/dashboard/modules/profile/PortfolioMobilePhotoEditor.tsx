'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { CloudArrowUpIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import { deletePortfolioImage, setPortfolioCoverImage } from './portfolioApi';
import { preparePortfolioDisplayImages, type PortfolioDisplayImage } from './portfolioDisplay';
import {
  PORTFOLIO_IMAGE_ACCEPT,
  portfolioPhotosRemainingText,
} from './portfolioFormUtils';
import { isActivePortfolioImage, uniquePortfolioImages } from './portfolioImageUtils';
import { PortfolioGalleryImageTile } from './PortfolioGalleryImageTile';
import { PortfolioImageUploadQueue } from './PortfolioImageUploadQueue';
import type { PortfolioItem } from './portfolioTypes';
import { usePortfolioImageUploadQueue } from './usePortfolioImageUploadQueue';

type PortfolioMobilePhotoEditorProps = {
  item: PortfolioItem;
  onRefresh: () => Promise<void> | void;
  // Volané keď server signalizuje, že CELÁ položka už neexistuje (zmazaná v inom
  // tabe) – nadradený modul zobrazí „položka neexistuje" a vráti na zoznam.
  onItemGone?: () => void;
};

export function PortfolioMobilePhotoEditor({
  item,
  onRefresh,
  onItemGone,
}: PortfolioMobilePhotoEditorProps) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const serverImages = useMemo(() => uniquePortfolioImages(item), [item]);
  const activeImageCount = useMemo(
    () => serverImages.filter(isActivePortfolioImage).length,
    [serverImages],
  );
  const galleryImages = useMemo(
    () => preparePortfolioDisplayImages(item, { preferCoverFirst: false }),
    [item],
  );
  const refresh = useCallback(async () => {
    await Promise.resolve(onRefresh());
  }, [onRefresh]);
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
    onRefresh: refresh,
  });

  const coverImageId = item.cover_image?.id ?? null;
  const isActionBusy = actionKey != null;
  const limitReached = remainingSlots <= 0;

  const handleSetCover = useCallback(
    async (image: PortfolioDisplayImage) => {
      if (typeof image.id !== 'number' || image.id < 1 || image.id === coverImageId) return;

      setActionKey(`cover:${image.id}`);
      setActionError(null);
      try {
        await setPortfolioCoverImage(item.id, image.id);
        await refresh();
      } catch {
        setActionError(t('portfolio.coverSetFailed'));
      } finally {
        setActionKey(null);
      }
    },
    [coverImageId, item.id, refresh, t],
  );

  const handleDelete = useCallback(
    async (image: PortfolioDisplayImage) => {
      if (typeof image.id !== 'number' || image.id < 1) return;

      setActionKey(`delete:${image.id}`);
      setActionError(null);
      try {
        await deletePortfolioImage(item.id, image.id);
        await refresh();
      } catch (error) {
        const code = (
          error as { response?: { data?: { code?: string } } }
        )?.response?.data?.code;
        if (code === 'portfolio_item_not_found') {
          // CELÁ položka bola medzitým zmazaná (iný tab) – rovnaké správanie ako
          // desktop: jasný stav + návrat na zoznam, nie chybový toast bez
          // presmerovania. Zmazanie samotnej fotky (photo-gone) ostáva nezmenené.
          onItemGone?.();
          return;
        }
        setActionError(t('portfolio.photoDeleteFailed'));
      } finally {
        setActionKey(null);
      }
    },
    [item.id, refresh, t, onItemGone],
  );

  return (
    <div data-testid="portfolio-mobile-photo-editor" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {portfolioPhotosRemainingText(t, remainingSlots)}
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={PORTFOLIO_IMAGE_ACCEPT}
          className="hidden"
          data-testid="portfolio-mobile-edit-photo-input"
          onChange={(event) => {
            if (event.target.files) uploadFiles(event.target.files);
            event.currentTarget.value = '';
          }}
        />
        <button
          type="button"
          data-testid="portfolio-mobile-edit-photo-upload"
          disabled={limitReached}
          onClick={() => inputRef.current?.click()}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-4 text-sm font-semibold text-purple-700 shadow-sm transition hover:-translate-y-0.5 hover:border-purple-300 hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-400/60 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-500 disabled:shadow-none dark:border-purple-900/60 dark:bg-purple-950/20 dark:text-purple-200 dark:hover:bg-purple-950/40 dark:disabled:border-gray-800 dark:disabled:bg-gray-900 dark:disabled:text-gray-500"
        >
          <CloudArrowUpIcon className="h-4 w-4" aria-hidden="true" />
          {t('portfolio.selectPhotos')}
        </button>
      </div>

      {selectionError && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
          {selectionError}
        </p>
      )}
      {actionError && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
          {actionError}
        </p>
      )}

      <PortfolioImageUploadQueue items={items} onRetry={retryUpload} />

      {galleryImages.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {galleryImages.map((image, index) => (
            <PortfolioGalleryImageTile
              key={image.key}
              image={image}
              itemTitle={item.title}
              index={index}
              total={galleryImages.length}
              isManaging
              isCover={typeof image.id === 'number' && image.id === coverImageId}
              isBusy={isActionBusy}
              onOpen={() => undefined}
              onSetCover={() => void handleSetCover(image)}
              onDelete={() => void handleDelete(image)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
