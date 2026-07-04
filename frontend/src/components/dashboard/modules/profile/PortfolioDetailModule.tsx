'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, EllipsisHorizontalIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks';
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
}: PortfolioDetailModuleProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const [item, setItem] = useState<PortfolioItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const pendingPollStartedAtRef = useRef<number | null>(null);
  const actionsMenuRef = useRef<HTMLDivElement | null>(null);
  const requestSeqRef = useRef(0);

  const backPath = useMemo(() => {
    const identifier = String(ownerIdentifier || '').trim();
    return identifier ? buildPortfolioListPath(identifier) : '/dashboard/profile';
  }, [ownerIdentifier]);

  const loadItem = useCallback(async (options?: { preserveCurrent?: boolean }) => {
    const preserveCurrent = options?.preserveCurrent === true;
    const requestSeq = requestSeqRef.current + 1;
    requestSeqRef.current = requestSeq;
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
      if (requestSeqRef.current !== requestSeq) return;
      setItem(data);
      setLoadError(false);
    } catch (error) {
      if (requestSeqRef.current !== requestSeq) return;
      if (process.env.NODE_ENV === 'development') {
        console.error('Portfolio detail load failed.', error);
      }
      if (!preserveCurrent) {
        setItem(null);
        setLoadError(true);
      }
    } finally {
      if (requestSeqRef.current === requestSeq && !preserveCurrent) {
        setIsLoading(false);
      }
    }
  }, [itemId]);

  useEffect(() => {
    setItem(null);
    setLightboxIndex(null);
    setIsEditing(false);
    setIsDeleteOpen(false);
    setIsActionsOpen(false);
    setActionError(null);
    void loadItem();
  }, [loadItem]);

  useEffect(() => {
    if (!isActionsOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (target instanceof Node && actionsMenuRef.current?.contains(target)) return;
      setIsActionsOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsActionsOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActionsOpen]);

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
  const canManage = item?.can_manage === true;

  useEffect(() => {
    if (!canManage || !item || !hasPendingImages) {
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
  }, [canManage, hasPendingImages, item, loadItem]);

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  const handleBack = useCallback(() => {
    router.push(backPath);
  }, [backPath, router]);

  const handleEditClick = useCallback(() => {
    setIsEditing(true);
    setActionError(null);
    setIsActionsOpen(false);
  }, []);

  const handleRequestDelete = useCallback(() => {
    setIsDeleteOpen(true);
    setActionError(null);
    setIsActionsOpen(false);
  }, []);

  const handleSaved = useCallback((savedItem: PortfolioItem) => {
    requestSeqRef.current += 1;
    setItem(savedItem);
    setIsEditing(false);
    setActionError(null);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!item) return;
    setIsDeleting(true);
    setActionError(null);
    setIsActionsOpen(false);
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
      <div className="mb-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleBack}
          className={
            isMobile
              ? 'inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/80 px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-400/60 dark:border-gray-800 dark:bg-[#101011] dark:text-gray-100 dark:hover:bg-[#171719]'
              : 'group inline-flex items-center gap-3 rounded-full py-1.5 pr-3 text-sm font-semibold text-gray-700 transition hover:text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400/60 dark:text-gray-200 dark:hover:text-purple-300'
          }
        >
          <span
            className={
              isMobile
                ? ''
                : 'inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white/85 shadow-sm transition group-hover:border-purple-200 group-hover:bg-purple-50 dark:border-gray-800 dark:bg-[#101011] dark:group-hover:border-purple-800/70 dark:group-hover:bg-purple-950/30'
            }
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </span>
          {t('portfolio.back')}
        </button>

        {!isMobile && item && canManage && (
          <div ref={actionsMenuRef} className="relative flex items-center gap-2">
            <button
              type="button"
              onClick={handleEditClick}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/90 px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm transition hover:-translate-y-0.5 hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400/60 dark:border-gray-800 dark:bg-[#101011] dark:text-gray-100 dark:hover:border-purple-800/70 dark:hover:bg-purple-950/30 dark:hover:text-purple-200"
            >
              <PencilSquareIcon className="h-4 w-4" />
              {t('portfolio.editAction')}
            </button>
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={isActionsOpen}
              aria-label={t('profile.moreActions', 'Viac možností')}
              title={t('profile.moreActions', 'Viac možností')}
              onClick={() => setIsActionsOpen((current) => !current)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white/90 text-gray-700 shadow-sm transition hover:-translate-y-0.5 hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400/60 dark:border-gray-800 dark:bg-[#101011] dark:text-gray-200 dark:hover:border-purple-800/70 dark:hover:bg-purple-950/30 dark:hover:text-purple-200"
            >
              <EllipsisHorizontalIcon className="h-5 w-5" />
            </button>
            {isActionsOpen && (
              <div
                role="menu"
                className="absolute right-0 top-12 z-30 w-56 overflow-hidden rounded-2xl border border-gray-200 bg-white/95 p-1.5 shadow-xl ring-1 ring-black/5 backdrop-blur dark:border-gray-800 dark:bg-[#101011]/95 dark:ring-white/10"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleRequestDelete}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300/70 dark:text-red-300 dark:hover:bg-red-950/30"
                >
                  <TrashIcon className="h-4 w-4" />
                  {t('portfolio.deleteAction')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {isLoading && !item ? (
        <PortfolioDetailSkeleton />
      ) : loadError && !item ? (
        <PortfolioDetailErrorState onRetry={() => void loadItem()} />
      ) : item ? (
        <div className="space-y-7">
          {canManage && isMobile && (
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={handleEditClick}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/80 px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-400/60 dark:border-gray-800 dark:bg-[#101011] dark:text-gray-100 dark:hover:bg-[#171719]"
              >
                <PencilSquareIcon className="h-4 w-4" />
                {t('portfolio.editAction')}
              </button>
              <button
                type="button"
                onClick={handleRequestDelete}
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
          {canManage && isMobile && (
            <PortfolioImageUploadSection
              item={item}
              onRefresh={() => loadItem({ preserveCurrent: true })}
            />
          )}
          <PortfolioImageGallery
            images={images}
            item={item}
            canUpload={canManage && !isMobile}
            onOpenImage={openLightbox}
            onUploadRefresh={() => loadItem({ preserveCurrent: true })}
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
