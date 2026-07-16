'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from 'react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { reorderPortfolioItems } from './portfolioApi';
import { PortfolioCard } from './PortfolioCard';
import type { PortfolioItem } from './portfolioTypes';

type PortfolioReorderableLayoutProps = {
  items: PortfolioItem[];
  isReorderMode: boolean;
  getCategoryLabel: (category: string) => string;
  onOpenItem?: (item: PortfolioItem) => void;
  onPreviewOrder: (items: PortfolioItem[]) => void;
  onReordered: (items: PortfolioItem[]) => void;
  onToggleLike?: (item: PortfolioItem) => void;
  pendingLikeIds?: Set<number>;
  headerActions?: ReactNode;
};

function moveItem(items: PortfolioItem[], fromIndex: number, toIndex: number): PortfolioItem[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return items;
  if (fromIndex >= items.length || toIndex >= items.length) return items;

  const nextItems = [...items];
  const [movedItem] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, movedItem);
  return nextItems;
}

function haveSameOrder(left: PortfolioItem[], right: PortfolioItem[]): boolean {
  return left.length === right.length && left.every((item, index) => item.id === right[index]?.id);
}

export function PortfolioReorderableLayout({
  items,
  isReorderMode,
  getCategoryLabel,
  onOpenItem,
  onPreviewOrder,
  onReordered,
  onToggleLike,
  pendingLikeIds,
  headerActions,
}: PortfolioReorderableLayoutProps) {
  const { t } = useLanguage();
  const [draggedItemId, setDraggedItemId] = useState<number | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const itemsRef = useRef(items);
  const originalItemsRef = useRef<PortfolioItem[] | null>(null);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    if (!isReorderMode) {
      setDraggedItemId(null);
      originalItemsRef.current = null;
    }
  }, [isReorderMode]);

  const saveCurrentOrder = useCallback(async () => {
    const originalItems = originalItemsRef.current;
    const currentItems = itemsRef.current;
    originalItemsRef.current = null;

    if (!originalItems || haveSameOrder(originalItems, currentItems)) return;

    setIsSavingOrder(true);
    try {
      const orderedItems = await reorderPortfolioItems(currentItems.map((item) => item.id));
      toast.success(t('portfolio.orderSaveSuccess'));
      onReordered(orderedItems.length > 0 ? orderedItems : currentItems);
    } catch {
      onPreviewOrder(originalItems);
      toast.error(t('portfolio.orderSaveFailed'));
    } finally {
      setIsSavingOrder(false);
    }
  }, [onPreviewOrder, onReordered, t]);

  const handleDragStart = useCallback(
    (event: DragEvent<HTMLDivElement>, item: PortfolioItem) => {
      if (!isReorderMode || isSavingOrder) {
        event.preventDefault();
        return;
      }

      originalItemsRef.current = itemsRef.current;
      setDraggedItemId(item.id);
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(item.id));
    },
    [isReorderMode, isSavingOrder],
  );

  const handleDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>, targetItem: PortfolioItem) => {
      if (!isReorderMode || isSavingOrder || draggedItemId === null) return;

      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';

      const currentItems = itemsRef.current;
      const fromIndex = currentItems.findIndex((item) => item.id === draggedItemId);
      const toIndex = currentItems.findIndex((item) => item.id === targetItem.id);
      const nextItems = moveItem(currentItems, fromIndex, toIndex);

      if (!haveSameOrder(currentItems, nextItems)) {
        onPreviewOrder(nextItems);
      }
    },
    [draggedItemId, isReorderMode, isSavingOrder, onPreviewOrder],
  );

  const handleDragEnd = useCallback(() => {
    if (draggedItemId === null) return;
    setDraggedItemId(null);
    void saveCurrentOrder();
  }, [draggedItemId, saveCurrentOrder]);

  const renderCard = (item: PortfolioItem, featured = false) => {
    const card = (
      <PortfolioCard
        item={item}
        categoryLabel={getCategoryLabel(item.category)}
        featured={featured}
        loading={featured ? 'eager' : 'lazy'}
        onClick={!isReorderMode && onOpenItem ? () => onOpenItem(item) : undefined}
        onToggleLike={!isReorderMode ? onToggleLike : undefined}
        isLikePending={pendingLikeIds?.has(item.id) === true}
      />
    );

    if (!isReorderMode) return card;

    return (
      <div
        key={item.id}
        data-testid={`portfolio-reorder-card-${item.id}`}
        draggable={!isSavingOrder}
        onDragStart={(event) => handleDragStart(event, item)}
        onDragOver={(event) => handleDragOver(event, item)}
        onDragEnd={handleDragEnd}
        className={[
          'portfolio-reorder-card rounded-2xl ring-2 ring-purple-400/60 ring-offset-2 ring-offset-white dark:ring-purple-500/70 dark:ring-offset-black',
          isSavingOrder ? 'cursor-wait opacity-70' : 'cursor-grab active:cursor-grabbing',
        ].join(' ')}
      >
        {card}
      </div>
    );
  };

  const [featured, ...rest] = items;
  const highlightedSideItems = rest.slice(0, 2);
  const remainingItems = rest.slice(2);

  return (
    <section
      aria-label={t('portfolio.featured')}
      className={isReorderMode ? 'portfolio-reorder-mode space-y-2' : 'space-y-2'}
    >
      {headerActions ? (
        <div className="flex min-w-0 items-center gap-4 py-1">
          <div className="flex shrink-0 items-baseline gap-2">
            <h3 className="text-xs font-bold uppercase text-gray-900 dark:text-white">
              {t('portfolio.featured')}
            </h3>
            <span className="text-xs font-medium tabular-nums text-gray-400 dark:text-gray-500">
              {String(items.length).padStart(2, '0')}
            </span>
          </div>
          <div
            aria-hidden="true"
            className="h-px min-w-6 flex-1 bg-gradient-to-r from-gray-300 via-gray-200 to-transparent dark:from-gray-700 dark:via-gray-800"
          />
          {headerActions}
        </div>
      ) : (
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          {t('portfolio.featured')}
        </h3>
      )}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {featured ? renderCard(featured, true) : null}
        {highlightedSideItems.length > 0 && (
          <div
            data-testid="portfolio-highlight-side-grid"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2"
          >
            {highlightedSideItems.map((item) => (
              <div key={item.id}>{renderCard(item)}</div>
            ))}
          </div>
        )}
      </div>
      {remainingItems.length > 0 && (
        <div className="space-y-3 pt-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {t('portfolio.morePortfolios')}
          </h3>
          <div
            data-testid="portfolio-grid"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
          >
            {remainingItems.map((item) => (
              <div key={item.id}>{renderCard(item)}</div>
            ))}
          </div>
        </div>
      )}
      <style jsx global>{`
        @media (prefers-reduced-motion: no-preference) {
          .portfolio-reorder-mode .portfolio-reorder-card {
            animation: portfolioReorderWiggle 0.48s ease-in-out infinite;
            transform-origin: 50% 50%;
          }

          .portfolio-reorder-mode .portfolio-reorder-card:nth-of-type(2n) {
            animation-delay: -0.22s;
          }
        }

        @keyframes portfolioReorderWiggle {
          0%,
          100% {
            transform: rotate(-0.28deg) translate3d(-0.2px, 0, 0);
          }
          25% {
            transform: rotate(0.2deg) translate3d(0.2px, -0.35px, 0);
          }
          50% {
            transform: rotate(0.28deg) translate3d(0.2px, 0, 0);
          }
          75% {
            transform: rotate(-0.2deg) translate3d(-0.2px, 0.35px, 0);
          }
        }
      `}</style>
    </section>
  );
}
