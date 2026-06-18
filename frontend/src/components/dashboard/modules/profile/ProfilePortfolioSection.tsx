'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ProfileTab } from './profileTypes';
import { listProfilePortfolio } from './portfolioApi';
import type { PortfolioItem } from './portfolioTypes';
import { getPortfolioCategoryLabel } from './portfolioDisplay';
import { PROFILE_PORTFOLIO_REFRESH_EVENT } from './portfolioEvents';
import { PortfolioCreateForm } from './PortfolioCreateForm';
import { PortfolioEmptyState } from './PortfolioEmptyState';
import { PortfolioFeaturedCard } from './PortfolioFeaturedCard';
import { PortfolioGrid } from './PortfolioGrid';
import { PortfolioSectionSkeleton } from './PortfolioSectionSkeleton';
import { buildPortfolioDetailPath, getPortfolioOwnerIdentifier } from './portfolioRouting';

type ProfilePortfolioSectionProps = {
  activeTab: ProfileTab;
  ownerUserId?: number;
  ownerSlug?: string | null;
  isOtherUserProfile?: boolean;
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
}: ProfilePortfolioSectionProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const isOwner = !isOtherUserProfile;
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
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
      if (ownerIdentifier) {
        router.push(buildPortfolioDetailPath(ownerIdentifier, createdItem.id));
      }
    },
    [ownerIdentifier, router],
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
    loadedKeyRef.current = null;
  }, [currentTargetKey]);

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

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <PortfolioEmptyState
          isOwner={isOwner}
          onCreate={isOwner ? () => setIsCreateOpen(true) : undefined}
        />
        {isOwner && isCreateOpen && (
          <PortfolioCreateForm
            onCancel={() => setIsCreateOpen(false)}
            onCreated={handleCreated}
          />
        )}
      </div>
    );
  }

  const [featured, ...rest] = items;

  return (
    <div className="mt-4 space-y-5">
      {isOwner && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setIsCreateOpen((current) => !current)}
            className="rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
          >
            {t('portfolio.createAction')}
          </button>
        </div>
      )}
      {isOwner && isCreateOpen && (
        <PortfolioCreateForm
          onCancel={() => setIsCreateOpen(false)}
          onCreated={handleCreated}
        />
      )}
      <PortfolioFeaturedCard
        item={featured}
        categoryLabel={getCategoryLabel(featured.category)}
        onOpenItem={handleOpenItem}
      />
      <PortfolioGrid
        items={rest}
        getCategoryLabel={getCategoryLabel}
        onOpenItem={handleOpenItem}
      />
    </div>
  );
}
