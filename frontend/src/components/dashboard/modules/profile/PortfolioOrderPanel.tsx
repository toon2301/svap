'use client';

import { useCallback, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { reorderPortfolioItems } from './portfolioApi';
import { PortfolioOrderItem } from './PortfolioOrderItem';
import type { PortfolioItem } from './portfolioTypes';

type PortfolioOrderPanelProps = {
  items: PortfolioItem[];
  getCategoryLabel: (category: string) => string;
  onReordered: (items: PortfolioItem[]) => void;
};

export function PortfolioOrderPanel({
  items,
  getCategoryLabel,
  onReordered,
}: PortfolioOrderPanelProps) {
  const { t } = useLanguage();
  const [busyItemId, setBusyItemId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleMove = useCallback(
    async (item: PortfolioItem, direction: -1 | 1) => {
      const currentIndex = items.findIndex((candidate) => candidate.id === item.id);
      const nextIndex = currentIndex + direction;
      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= items.length) return;

      const nextItems = [...items];
      [nextItems[currentIndex], nextItems[nextIndex]] = [
        nextItems[nextIndex],
        nextItems[currentIndex],
      ];

      setBusyItemId(item.id);
      setActionError(null);
      try {
        const orderedItems = await reorderPortfolioItems(nextItems.map((nextItem) => nextItem.id));
        onReordered(orderedItems.length > 0 ? orderedItems : nextItems);
      } catch {
        setActionError(t('portfolio.orderSaveFailed'));
      } finally {
        setBusyItemId(null);
      }
    },
    [items, onReordered, t],
  );

  if (items.length === 0) return null;

  const isBusy = busyItemId != null;

  return (
    <section
      data-testid="portfolio-order-panel"
      className="space-y-4 rounded-3xl border border-gray-200 bg-white/80 p-4 shadow-sm dark:border-gray-800 dark:bg-[#101011]"
      aria-label={t('portfolio.portfolioOrder')}
    >
      <div>
        <h2 className="text-sm font-semibold text-gray-950 dark:text-white">
          {t('portfolio.portfolioOrder')}
        </h2>
      </div>

      {actionError && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
          {actionError}
        </p>
      )}

      <div className="grid gap-3">
        {items.map((item, index) => (
          <PortfolioOrderItem
            key={item.id}
            item={item}
            categoryLabel={getCategoryLabel(item.category)}
            isFeatured={index === 0}
            isFirst={index === 0}
            isLast={index === items.length - 1}
            disabled={isBusy}
            onMoveUp={() => void handleMove(item, -1)}
            onMoveDown={() => void handleMove(item, 1)}
          />
        ))}
      </div>
    </section>
  );
}
