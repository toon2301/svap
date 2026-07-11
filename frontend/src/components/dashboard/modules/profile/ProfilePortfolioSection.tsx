'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowsUpDownIcon, CheckIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks';
import type { ProfileTab } from './profileTypes';
import { listProfilePortfolio } from './portfolioApi';
import { setPortfolioLikeState, type PortfolioLikeResponse } from './portfolioLikesApi';
import type { PortfolioItem } from './portfolioTypes';
import { getPortfolioCategoryLabel } from './portfolioDisplay';
import {
  PROFILE_PORTFOLIO_LIKED_EVENT,
  PROFILE_PORTFOLIO_REFRESH_EVENT,
  readProfilePortfolioLikedEvent,
} from './portfolioEvents';
import { PortfolioCreateDesktopModal } from './PortfolioCreateDesktopModal';
import { PortfolioCreateForm } from './PortfolioCreateForm';
import { PortfolioEmptyState } from './PortfolioEmptyState';
import { MobilePortfolioOrderView } from './MobilePortfolioOrderView';
import { PortfolioReorderableLayout } from './PortfolioReorderableLayout';
import { PortfolioSectionSkeleton } from './PortfolioSectionSkeleton';
import { buildPortfolioDetailPath, getPortfolioOwnerIdentifier } from './portfolioRouting';

type ProfilePortfolioSectionProps = {
  activeTab: ProfileTab;
  ownerUserId?: number;
  ownerSlug?: string | null;
  isOtherUserProfile?: boolean;
  onCreatePortfolio?: () => void;
};

function targetKey(isOwner: boolean, ownerUserId?: number, ownerSlug?: string | null): string {
  if (isOwner) return 'owner';
  const slug = String(ownerSlug || '').trim();
  if (slug) return `slug:${slug}`;
  return `user:${ownerUserId ?? 'unknown'}`;
}

export default function ProfilePortfolioSection({
  activeTab,
  ownerUserId,
  ownerSlug,
  isOtherUserProfile = false,
  onCreatePortfolio,
}: ProfilePortfolioSectionProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const isOwner = !isOtherUserProfile;
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isOrderOpen, setIsOrderOpen] = useState(false);
  const [pendingPortfolioLikeIds, setPendingPortfolioLikeIds] = useState<Set<number>>(() => new Set());
  const loadedKeyRef = useRef<string | null>(null);
  const requestSeqRef = useRef(0);
  const currentTargetKey = useMemo(
    () => targetKey(isOwner, ownerUserId, ownerSlug),
    [isOwner, ownerSlug, ownerUserId],
  );

  const getCategoryLabel = useCallback(
    (category: string) => getPortfolioCategoryLabel(t, category),
    [t],
  );

  const ownerIdentifier = useMemo(
    () => getPortfolioOwnerIdentifier(ownerUserId, ownerSlug),
    [ownerSlug, ownerUserId],
  );

  const handleOpenItem = useCallback(
    (item: PortfolioItem) => {
      if (!ownerIdentifier) return;
      router.push(buildPortfolioDetailPath(ownerIdentifier, item.id));
    },
    [ownerIdentifier, router],
  );

  const handleCreated = useCallback(
    (createdItem: PortfolioItem) => {
      setItems((current) => {
        const withoutCreated = current.filter((item) => item.id !== createdItem.id);
        return [...withoutCreated, createdItem].sort((left, right) => {
          const leftOrder = typeof left.sort_order === 'number' ? left.sort_order : Number.MAX_SAFE_INTEGER;
          const rightOrder = typeof right.sort_order === 'number' ? right.sort_order : Number.MAX_SAFE_INTEGER;
          return leftOrder - rightOrder;
        });
      });
      setIsCreateOpen(false);
      setIsOrderOpen(false);
      if (ownerIdentifier) {
        router.push(buildPortfolioDetailPath(ownerIdentifier, createdItem.id));
      }
    },
    [ownerIdentifier, router],
  );

  const updatePortfolioLikeInState = useCallback(
    (itemId: number, isLiked: boolean, likesCount: number) => {
      const safeLikesCount = Math.max(0, Number.isFinite(likesCount) ? Math.trunc(likesCount) : 0);
      setItems((current) =>
        current.map((item) =>
          item.id === itemId
            ? { ...item, is_liked_by_me: isLiked, likes_count: safeLikesCount }
            : item,
        ),
      );
    },
    [],
  );

  const handleTogglePortfolioLike = useCallback(
    async (item: PortfolioItem) => {
      if (pendingPortfolioLikeIds.has(item.id)) return;

      const previousLiked = item.is_liked_by_me === true;
      const previousLikesCount = Math.max(0, Number(item.likes_count ?? 0));
      const nextLiked = !previousLiked;
      const optimisticLikesCount = Math.max(0, previousLikesCount + (nextLiked ? 1 : -1));

      setPendingPortfolioLikeIds((current) => {
        const next = new Set(current);
        next.add(item.id);
        return next;
      });
      updatePortfolioLikeInState(item.id, nextLiked, optimisticLikesCount);

      try {
        const data: PortfolioLikeResponse = await setPortfolioLikeState(item.id, nextLiked);
        updatePortfolioLikeInState(
          data.portfolio_item_id,
          data.is_liked_by_me === true,
          Number(data.likes_count ?? optimisticLikesCount),
        );
      } catch {
        updatePortfolioLikeInState(item.id, previousLiked, previousLikesCount);
        toast.error(t('portfolio.likeUpdateFailed'));
      } finally {
        setPendingPortfolioLikeIds((current) => {
          const next = new Set(current);
          next.delete(item.id);
          return next;
        });
      }
    },
    [pendingPortfolioLikeIds, t, updatePortfolioLikeInState],
  );

  const loadPortfolio = useCallback(async () => {
    const seq = requestSeqRef.current + 1;
    requestSeqRef.current = seq;
    setIsLoading(true);
    setLoadError(false);

    try {
      const data = await listProfilePortfolio({
        isOwner,
        ownerUserId,
        ownerSlug,
      });
      if (requestSeqRef.current !== seq) return;
      setItems(data);
      loadedKeyRef.current = currentTargetKey;
    } catch {
      if (requestSeqRef.current !== seq) return;
      setLoadError(true);
    } finally {
      if (requestSeqRef.current === seq) {
        setIsLoading(false);
      }
    }
  }, [currentTargetKey, isOwner, ownerSlug, ownerUserId]);

  useEffect(() => {
    setItems([]);
    setLoadError(false);
    setIsLoading(false);
    setIsCreateOpen(false);
    setIsOrderOpen(false);
    loadedKeyRef.current = null;
  }, [currentTargetKey]);

  useEffect(() => {
    const handlePortfolioLiked = (event: Event) => {
      const payload = readProfilePortfolioLikedEvent(event);
      if (!payload) return;
      if (!items.some((item) => item.id === payload.portfolioItemId)) return;
      void loadPortfolio();
    };

    window.addEventListener(PROFILE_PORTFOLIO_LIKED_EVENT, handlePortfolioLiked);
    return () => window.removeEventListener(PROFILE_PORTFOLIO_LIKED_EVENT, handlePortfolioLiked);
  }, [items, loadPortfolio]);

  useEffect(() => {
    const handleRefresh = () => {
      loadedKeyRef.current = null;
      if (activeTab === 'portfolio' && (isOwner || ownerUserId != null || ownerSlug)) {
        void loadPortfolio();
      }
    };

    window.addEventListener(PROFILE_PORTFOLIO_REFRESH_EVENT, handleRefresh);
    return () => window.removeEventListener(PROFILE_PORTFOLIO_REFRESH_EVENT, handleRefresh);
  }, [activeTab, isOwner, loadPortfolio, ownerSlug, ownerUserId]);

  useEffect(() => {
    if (activeTab !== 'portfolio') return;
    if (!isOwner && ownerUserId == null && !ownerSlug) return;
    if (loadedKeyRef.current === currentTargetKey) return;
    void loadPortfolio();
  }, [activeTab, currentTargetKey, isOwner, loadPortfolio, ownerSlug, ownerUserId]);

  if (activeTab !== 'portfolio') return null;

  if (isLoading && items.length === 0) {
    return <PortfolioSectionSkeleton />;
  }

  if (loadError && items.length === 0) {
    return (
      <div className="mt-4 rounded-2xl border border-red-200 bg-red-50/70 px-5 py-6 text-center dark:border-red-900/60 dark:bg-red-950/20">
        <h3 className="text-sm font-semibold text-red-700 dark:text-red-300">
          {t('portfolio.loadErrorTitle')}
        </h3>
        <p className="mt-2 text-sm text-red-700/80 dark:text-red-300/80">
          {t('portfolio.loadErrorBody')}
        </p>
        <button
          type="button"
          onClick={() => void loadPortfolio()}
          className="mt-4 rounded-full border border-red-300 px-4 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-400/60 dark:border-red-800 dark:text-red-200 dark:hover:bg-red-950"
        >
          {t('portfolio.retry')}
        </button>
      </div>
    );
  }

  const handleCreateClick = () => {
    setIsOrderOpen(false);
    if (onCreatePortfolio) {
      onCreatePortfolio();
    } else {
      setIsCreateOpen((current) => !current);
    }
  };

  const handleReordered = (orderedItems: PortfolioItem[]) => {
    setItems(orderedItems);
    loadedKeyRef.current = currentTargetKey;
  };

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <PortfolioEmptyState
          isOwner={isOwner}
          onCreate={isOwner ? handleCreateClick : undefined}
        />
        {isOwner && isCreateOpen && !onCreatePortfolio && (
          isMobile ? (
            <PortfolioCreateForm
              onCancel={() => setIsCreateOpen(false)}
              onCreated={handleCreated}
            />
          ) : (
            <PortfolioCreateDesktopModal
              onCancel={() => setIsCreateOpen(false)}
              onCreated={handleCreated}
            />
          )
        )}
      </div>
    );
  }

  const useInlineReorder = isOwner && isOrderOpen && !isMobile;

  return (
    <div className="mt-4 space-y-5">
      {isOwner && isMobile && (
        <div className="flex w-full items-center gap-3 px-1">
          <button
            type="button"
            aria-label={t('portfolio.portfolioOrder')}
            title={t('portfolio.portfolioOrder')}
            onClick={() => {
              setIsCreateOpen(false);
              setIsOrderOpen(true);
            }}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-purple-100 bg-white/90 text-purple-600 shadow-sm transition hover:-translate-y-0.5 hover:border-purple-200 hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-400/50 dark:border-purple-900/50 dark:bg-[#101011] dark:text-purple-200 dark:hover:bg-purple-950/20"
          >
            <ArrowsUpDownIcon className="h-5 w-5" aria-hidden="true" />
          </button>
          <div
            aria-hidden="true"
            className="h-px flex-1 bg-gradient-to-r from-transparent via-purple-200/80 to-transparent dark:via-purple-900/70"
          />
          <button
            type="button"
            aria-label={t('portfolio.createAction')}
            title={t('portfolio.createAction')}
            onClick={handleCreateClick}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-purple-100 bg-white/90 text-purple-600 shadow-sm transition hover:-translate-y-0.5 hover:border-purple-200 hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-400/50 dark:border-purple-900/50 dark:bg-[#101011] dark:text-purple-200 dark:hover:bg-purple-950/20"
          >
            <PlusIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      )}
      {isOwner && isCreateOpen && !onCreatePortfolio && (
        isMobile ? (
          <PortfolioCreateForm
            onCancel={() => setIsCreateOpen(false)}
            onCreated={handleCreated}
          />
        ) : (
          <PortfolioCreateDesktopModal
            onCancel={() => setIsCreateOpen(false)}
            onCreated={handleCreated}
          />
        )
      )}
      {isOwner && isOrderOpen && isMobile && (
        <MobilePortfolioOrderView
          items={items}
          onSaved={(orderedItems) => {
            handleReordered(orderedItems);
            setIsOrderOpen(false);
          }}
        />
      )}
      <PortfolioReorderableLayout
        items={items}
        isReorderMode={useInlineReorder}
        getCategoryLabel={getCategoryLabel}
        onOpenItem={handleOpenItem}
        onPreviewOrder={setItems}
        onReordered={handleReordered}
        onToggleLike={handleTogglePortfolioLike}
        pendingLikeIds={pendingPortfolioLikeIds}
        headerActions={
          isOwner && !isMobile ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={useInlineReorder ? t('portfolio.done') : t('portfolio.reorderAction')}
                title={useInlineReorder ? t('portfolio.done') : t('portfolio.reorderAction')}
                onClick={() => {
                  setIsCreateOpen(false);
                  setIsOrderOpen((current) => !current);
                }}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border transition focus:outline-none focus:ring-2 focus:ring-purple-400/50 ${
                  useInlineReorder
                    ? 'border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 dark:border-purple-700 dark:bg-purple-950/40 dark:text-purple-200'
                    : 'border-transparent bg-transparent text-gray-500 hover:border-gray-200 hover:bg-white hover:text-gray-900 dark:text-gray-400 dark:hover:border-gray-800 dark:hover:bg-[#101011] dark:hover:text-white'
                }`}
              >
                {useInlineReorder ? (
                  <CheckIcon className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <ArrowsUpDownIcon className="h-5 w-5" aria-hidden="true" />
                )}
              </button>
              <button
                type="button"
                aria-label={t('portfolio.createAction')}
                title={t('portfolio.createAction')}
                onClick={handleCreateClick}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-purple-200 bg-purple-100 text-purple-600 transition hover:-translate-y-0.5 hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400/50 dark:border-purple-900/50 dark:bg-[#101011] dark:text-purple-200 dark:hover:border-purple-800/70 dark:hover:bg-purple-950/20"
              >
                <PlusIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          ) : undefined
        }
      />
    </div>
  );
}
