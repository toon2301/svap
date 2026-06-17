'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import { deletePortfolioItem, getPortfolioItem } from './portfolioApi';
import type { PortfolioItem } from './portfolioTypes';
import {
  getPortfolioCategoryLabel,
  preparePortfolioDisplayImages,
} from './portfolioDisplay';
import { buildPortfolioListPath } from './portfolioRouting';
import { PortfolioDetailErrorState } from './PortfolioDetailErrorState';
import { PortfolioDetailHero } from './PortfolioDetailHero';
import { PortfolioDetailSkeleton } from './PortfolioDetailSkeleton';
import { PortfolioDeleteConfirmDialog } from './PortfolioDeleteConfirmDialog';
import { PortfolioImageGallery } from './PortfolioImageGallery';
import { PortfolioImageUploadSection } from './PortfolioImageUploadSection';
import { PortfolioInlineEditPanel } from './PortfolioInlineEditPanel';
import { PortfolioLightbox } from './PortfolioLightbox';
import { PortfolioRelatedOfferCard } from './PortfolioRelatedOfferCard';
import { dispatchProfilePortfolioRefresh } from './portfolioEvents';

type PortfolioDetailModuleProps = {
  itemId: number | null;
  ownerIdentifier?: string | null;
  isOwner?: boolean;
};

const PENDING_IMAGE_POLL_INTERVAL_MS = 2500;
const PENDING_IMAGE_POLL_TIMEOUT_MS = 45000;

function hasPendingPortfolioImages(item: PortfolioItem): boolean {
  const images = [item.cover_image ?? null, ...(item.images || [])];
  return images.some((image) => image?.status === 'pending');
}

export default function PortfolioDetailModule({
  itemId,
  ownerIdentifier,
  isOwner = false,
}: PortfolioDetailModuleProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [item, setItem] = useState<PortfolioItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const pendingPollStartedAtRef = useRef<number | null>(null);

  const backPath = useMemo(() => {
    const identifier = String(ownerIdentifier || '').trim();
    return identifier ? buildPortfolioListPath(identifier) : '/dashboard/profile';
  }, [ownerIdentifier]);

  const loadItem = useCallback(async (options?: { preserveCurrent?: boolean }) => {
    const preserveCurrent = options?.preserveCurrent === true;
    if (!itemId || !Number.isFinite(itemId)) {
      setItem(null);
      setLoadError(true);
      return;
    }

    if (!preserveCurrent) {
      setIsLoading(true);
      setLoadError(false);
    }
    try {
      const data = await getPortfolioItem(itemId);
      setItem(data);
      setLoadError(false);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Portfolio detail load failed.', error);
      }
      if (!preserveCurrent) {
        setItem(null);
        setLoadError(true);
      }
    } finally {
      if (!preserveCurrent) {
        setIsLoading(false);
      }
    }
  }, [itemId]);

  useEffect(() => {
    setItem(null);
    setLightboxIndex(null);
    setIsEditing(false);
    setIsDeleteOpen(false);
    setActionError(null);
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

  const hasPendingImages = useMemo(
    () => (item ? hasPendingPortfolioImages(item) : false),
    [item],
  );

  useEffect(() => {
    if (!isOwner || !item || !hasPendingImages) {
      pendingPollStartedAtRef.current = null;
      return;
    }

    if (pendingPollStartedAtRef.current == null) {
      pendingPollStartedAtRef.current = Date.now();
    }

    const intervalId = window.setInterval(() => {
      const startedAt = pendingPollStartedAtRef.current;
      if (startedAt == null || Date.now() - startedAt >= PENDING_IMAGE_POLL_TIMEOUT_MS) {
        pendingPollStartedAtRef.current = null;
        window.clearInterval(intervalId);
        return;
      }
      void loadItem({ preserveCurrent: true });
    }, PENDING_IMAGE_POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [hasPendingImages, isOwner, item, loadItem]);

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  const handleBack = useCallback(() => {
    router.push(backPath);
  }, [backPath, router]);

  const handleSaved = useCallback((savedItem: PortfolioItem) => {
    setItem(savedItem);
    setIsEditing(false);
    setActionError(null);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!item) return;
    setIsDeleting(true);
    setActionError(null);
    try {
      await deletePortfolioItem(item.id);
      dispatchProfilePortfolioRefresh();
      setIsDeleteOpen(false);
      router.push(backPath);
    } catch {
      setIsDeleteOpen(false);
      setActionError(t('portfolio.deleteFailed'));
    } finally {
      setIsDeleting(false);
    }
  }, [backPath, item, router, t]);

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
          {isOwner && (
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(true);
                  setActionError(null);
                }}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/80 px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-400/60 dark:border-gray-800 dark:bg-[#101011] dark:text-gray-100 dark:hover:bg-[#171719]"
              >
                <PencilSquareIcon className="h-4 w-4" />
                {t('portfolio.editAction')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsDeleteOpen(true);
                  setActionError(null);
                }}
                className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-400/60 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300 dark:hover:bg-red-950/40"
              >
                <TrashIcon className="h-4 w-4" />
                {t('portfolio.deleteAction')}
              </button>
            </div>
          )}
          {actionError && (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300">
              {actionError}
            </p>
          )}
          {isEditing ? (
            <PortfolioInlineEditPanel
              item={item}
              onCancel={() => {
                setIsEditing(false);
                setActionError(null);
              }}
              onSaved={handleSaved}
            />
          ) : (
            <PortfolioDetailHero
              item={item}
              categoryLabel={categoryLabel}
              heroImage={images[0]}
              onOpenImage={() => openLightbox(0)}
            />
          )}
          {isOwner && (
            <PortfolioImageUploadSection
              item={item}
              onRefresh={() => loadItem({ preserveCurrent: true })}
            />
          )}
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
      <PortfolioDeleteConfirmDialog
        open={isDeleteOpen}
        isDeleting={isDeleting}
        onClose={() => {
          if (!isDeleting) setIsDeleteOpen(false);
        }}
        onConfirm={handleDelete}
      />
    </div>
  );
}
