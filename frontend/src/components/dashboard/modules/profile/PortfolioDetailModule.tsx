'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, EllipsisHorizontalIcon, HeartIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks';
import { deletePortfolioItem, getPortfolioItem } from './portfolioApi';
import { usePortfolioLikeToggle } from './usePortfolioLikeToggle';
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
import { PortfolioInlineEditPanel } from './PortfolioInlineEditPanel';
import { PortfolioLightbox } from './PortfolioLightbox';
import { PortfolioMobileEditFlow } from './PortfolioMobileEditFlow';
import { PortfolioRelatedOfferCard } from './PortfolioRelatedOfferCard';
import {
  PROFILE_PORTFOLIO_LIKED_EVENT,
  dispatchProfilePortfolioRefresh,
  readProfilePortfolioLikedEvent,
} from './portfolioEvents';

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
  const { locale, t } = useLanguage();
  const isMobile = useIsMobile();
  const [item, setItem] = useState<PortfolioItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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
      // Reset vždy pri zhode sekvencie (aj pre preserveCurrent): keď preserve
      // load (seq=2) predbehne non-preserve load (seq=1), guard seq=1 zlyhá a
      // isLoading by inak ostalo visieť na true.
      if (requestSeqRef.current === requestSeq) {
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
  const likeCount = Math.max(0, Number(item?.likes_count ?? 0));
  const formattedLikeCount = new Intl.NumberFormat(locale || 'sk-SK').format(likeCount);
  const showHeroLikeButton = !isMobile || !canManage;

  useEffect(() => {
    const handlePortfolioLiked = (event: Event) => {
      const payload = readProfilePortfolioLikedEvent(event);
      if (!payload || payload.portfolioItemId !== item?.id) return;
      void loadItem({ preserveCurrent: true });
    };

    window.addEventListener(PROFILE_PORTFOLIO_LIKED_EVENT, handlePortfolioLiked);
    return () => window.removeEventListener(PROFILE_PORTFOLIO_LIKED_EVENT, handlePortfolioLiked);
  }, [item?.id, loadItem]);

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

  const updatePortfolioLike = useCallback(
    (itemId: number, isLiked: boolean, likesCount: number) => {
      const safeLikesCount = Math.max(0, Number.isFinite(likesCount) ? Math.trunc(likesCount) : 0);
      setItem((current) =>
        current && current.id === itemId
          ? { ...current, is_liked_by_me: isLiked, likes_count: safeLikesCount }
          : current,
      );
    },
    [],
  );

  const { toggleLike, pendingLikeIds } = usePortfolioLikeToggle({
    applyLike: updatePortfolioLike,
  });
  const isLikePending = item ? pendingLikeIds.has(item.id) : false;

  const handleToggleLike = useCallback(() => {
    if (!item) return;
    void toggleLike(item);
  }, [item, toggleLike]);

  const handleBack = useCallback(() => {
    router.push(backPath);
  }, [backPath, router]);

  const handleEditClick = useCallback(() => {
    setIsEditing(true);
    setIsActionsOpen(false);
  }, []);

  const handleRequestDelete = useCallback(() => {
    setIsDeleteOpen(true);
    setIsActionsOpen(false);
  }, []);

  const handleSaved = useCallback((savedItem: PortfolioItem) => {
    requestSeqRef.current += 1;
    setItem(savedItem);
    setIsEditing(false);
  }, []);

  const handleMobileEditSaved = useCallback((savedItem: PortfolioItem) => {
    requestSeqRef.current += 1;
    setItem(savedItem);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!item) return;
    setIsDeleting(true);
    setIsActionsOpen(false);
    try {
      await deletePortfolioItem(item.id);
      dispatchProfilePortfolioRefresh();
      setIsDeleteOpen(false);
      toast.success(t('portfolio.deleteSuccess'));
      router.push(backPath);
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        // Položka už neexistuje (zmazaná v inom tabe/relácii) → cieľ je splnený,
        // správaj sa ako pri úspešnom zmazaní (vrátane success toastu).
        dispatchProfilePortfolioRefresh();
        setIsDeleteOpen(false);
        toast.success(t('portfolio.deleteSuccess'));
        router.push(backPath);
        return;
      }
      setIsDeleteOpen(false);
      toast.error(t('portfolio.deleteFailed'));
    } finally {
      setIsDeleting(false);
    }
  }, [backPath, item, router, t]);

  if (item && canManage && isMobile && isEditing) {
    return (
      <PortfolioMobileEditFlow
        item={item}
        onClose={() => {
          setIsEditing(false);
        }}
        onSaved={handleMobileEditSaved}
        onRefresh={() => loadItem({ preserveCurrent: true })}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6 lg:px-0">
      {!isMobile && (
        <div className="mb-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="group inline-flex items-center gap-3 rounded-full py-1.5 pr-3 text-sm font-semibold text-gray-700 transition hover:text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400/60 dark:text-gray-200 dark:hover:text-purple-300"
          >
            <span
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white/85 shadow-sm transition group-hover:border-purple-200 group-hover:bg-purple-50 dark:border-gray-800 dark:bg-[#101011] dark:group-hover:border-purple-800/70 dark:group-hover:bg-purple-950/30"
            >
              <ArrowLeftIcon className="h-4 w-4" />
            </span>
            {t('portfolio.back')}
          </button>

          {item && canManage && (
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
      )}

      {isLoading && !item ? (
        <PortfolioDetailSkeleton />
      ) : loadError && !item ? (
        <PortfolioDetailErrorState onRetry={() => void loadItem()} />
      ) : item ? (
        <div className="space-y-7">
          {canManage && isMobile && (
            <div className="flex">
              <div className="grid w-full grid-cols-[1fr_auto_1fr_auto_1fr] items-center rounded-full border border-gray-200 bg-white/85 px-1 py-0.5 shadow-sm ring-1 ring-black/5 backdrop-blur dark:border-gray-800 dark:bg-[#101011]/85 dark:ring-white/10">
                <button
                  type="button"
                  aria-label={t('portfolio.editAction')}
                  title={t('portfolio.editAction')}
                  onClick={handleEditClick}
                  className="flex h-8 w-full items-center justify-center rounded-full text-gray-700 transition hover:bg-purple-50 hover:text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400/60 dark:text-gray-200 dark:hover:bg-purple-950/30 dark:hover:text-purple-200"
                >
                  <PencilSquareIcon className="h-4 w-4" />
                </button>
                <span className="h-4 w-px bg-gray-200 dark:bg-gray-800" aria-hidden="true" />
                <div
                  data-testid="portfolio-mobile-like-count"
                  aria-label={`${t('portfolio.likeAction')}: ${formattedLikeCount}`}
                  className="pointer-events-none flex h-8 w-full cursor-default select-none items-center justify-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400"
                >
                  <HeartIcon className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" aria-hidden="true" />
                  <span className="tabular-nums">{formattedLikeCount}</span>
                </div>
                <span className="h-4 w-px bg-gray-200 dark:bg-gray-800" aria-hidden="true" />
                <button
                  type="button"
                  aria-label={t('portfolio.deleteAction')}
                  title={t('portfolio.deleteAction')}
                  onClick={handleRequestDelete}
                  className="flex h-8 w-full items-center justify-center rounded-full text-red-600 transition hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-400/60 dark:text-red-300 dark:hover:bg-red-950/30"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
          {isEditing ? (
            <PortfolioInlineEditPanel
              item={item}
              onCancel={() => {
                setIsEditing(false);
              }}
              onSaved={handleSaved}
            />
          ) : (
            <PortfolioDetailHero
              item={item}
              categoryLabel={categoryLabel}
              heroImage={images[0]}
              onOpenImage={() => openLightbox(0)}
              onToggleLike={showHeroLikeButton ? handleToggleLike : undefined}
              isLikePending={isLikePending}
            />
          )}
          <PortfolioImageGallery
            images={images}
            item={item}
            canUpload={canManage}
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
