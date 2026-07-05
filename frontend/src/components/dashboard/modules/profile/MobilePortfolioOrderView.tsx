'use client';

/* eslint-disable @next/next/no-img-element */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { Bars3Icon, CheckIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import { reorderPortfolioItems } from './portfolioApi';
import type { PortfolioItem } from './portfolioTypes';

type MobilePortfolioOrderViewProps = {
  items: PortfolioItem[];
  onSaved: (items: PortfolioItem[]) => void;
};

function itemImageSrc(item: PortfolioItem): string {
  return (
    String(item.cover_image?.thumbnail_url || '').trim() ||
    String(item.cover_image?.medium_url || '').trim() ||
    String(item.cover_image?.image_url || '').trim()
  );
}

function moveItem(items: PortfolioItem[], fromIndex: number, toIndex: number): PortfolioItem[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return items;
  const nextItems = [...items];
  const [movedItem] = nextItems.splice(fromIndex, 1);
  if (!movedItem) return items;
  nextItems.splice(toIndex, 0, movedItem);
  return nextItems;
}

function hasSameOrder(left: PortfolioItem[], right: PortfolioItem[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((item, index) => item.id === right[index]?.id);
}

export function MobilePortfolioOrderView({ items, onSaved }: MobilePortfolioOrderViewProps) {
  const { t } = useLanguage();
  const [draftItems, setDraftItems] = useState(items);
  const [draggedItemId, setDraggedItemId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  const draggedItemIdRef = useRef<number | null>(null);
  const rowRefs = useRef(new Map<number, HTMLDivElement>());

  useEffect(() => {
    if (draggedItemIdRef.current != null || isSaving) return;
    setDraftItems(items);
  }, [isSaving, items]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      setPortalNode(document.body);
    }
  }, []);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const setRowRef = useCallback((itemId: number, node: HTMLDivElement | null) => {
    if (node) {
      rowRefs.current.set(itemId, node);
    } else {
      rowRefs.current.delete(itemId);
    }
  }, []);

  const clearDrag = useCallback(() => {
    draggedItemIdRef.current = null;
    setDraggedItemId(null);
  }, []);

  const getTargetIndex = useCallback((currentItems: PortfolioItem[], pointerY: number) => {
    for (let index = 0; index < currentItems.length; index += 1) {
      const row = rowRefs.current.get(currentItems[index]?.id ?? -1);
      if (!row) continue;
      const rect = row.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      if (pointerY < midpoint) return index;
    }

    return currentItems.length - 1;
  }, []);

  const moveItemById = useCallback((itemId: number, direction: -1 | 1) => {
    setDraftItems((currentItems) => {
      const currentIndex = currentItems.findIndex((item) => item.id === itemId);
      if (currentIndex < 0) return currentItems;
      return moveItem(currentItems, currentIndex, currentIndex + direction);
    });
  }, []);

  const moveDraggedItem = useCallback(
    (pointerY: number) => {
      const activeItemId = draggedItemIdRef.current;
      if (activeItemId == null) return;

      setDraftItems((currentItems) => {
        const currentIndex = currentItems.findIndex((item) => item.id === activeItemId);
        const targetIndex = getTargetIndex(currentItems, pointerY);
        if (currentIndex < 0 || targetIndex < 0 || currentIndex === targetIndex) {
          return currentItems;
        }
        return moveItem(currentItems, currentIndex, targetIndex);
      });
    },
    [getTargetIndex],
  );

  useEffect(() => {
    if (draggedItemId == null) return;

    const handleWindowPointerMove = (event: PointerEvent) => {
      event.preventDefault();
      moveDraggedItem(event.clientY);
    };
    const handleWindowPointerEnd = () => {
      clearDrag();
    };

    window.addEventListener('pointermove', handleWindowPointerMove, { passive: false });
    window.addEventListener('pointerup', handleWindowPointerEnd);
    window.addEventListener('pointercancel', handleWindowPointerEnd);
    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerEnd);
      window.removeEventListener('pointercancel', handleWindowPointerEnd);
    };
  }, [clearDrag, draggedItemId, moveDraggedItem]);

  const handleKeyDown = useCallback(
    (itemId: number) => (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
      event.preventDefault();
      setActionError(null);
      moveItemById(itemId, event.key === 'ArrowUp' ? -1 : 1);
    },
    [moveItemById],
  );

  const handlePointerDown = useCallback(
    (itemId: number) => (event: ReactPointerEvent<HTMLDivElement>) => {
      setActionError(null);
      draggedItemIdRef.current = itemId;
      setDraggedItemId(itemId);
      if (typeof event.currentTarget.setPointerCapture === 'function') {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    },
    [],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (draggedItemIdRef.current == null) return;
      event.preventDefault();
      moveDraggedItem(event.clientY);
    },
    [moveDraggedItem],
  );

  const handlePointerEnd = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (typeof event.currentTarget.releasePointerCapture === 'function') {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      clearDrag();
    },
    [clearDrag],
  );

  const handleSave = useCallback(async () => {
    if (isSaving) return;
    if (hasSameOrder(items, draftItems)) {
      onSaved(draftItems);
      return;
    }

    setIsSaving(true);
    setActionError(null);
    try {
      const orderedItems = await reorderPortfolioItems(draftItems.map((item) => item.id));
      onSaved(orderedItems.length > 0 ? orderedItems : draftItems);
    } catch {
      setActionError(t('portfolio.orderSaveFailed'));
    } finally {
      setIsSaving(false);
    }
  }, [draftItems, isSaving, items, onSaved, t]);

  if (!portalNode) return null;

  return createPortal(
    <div
      data-testid="mobile-portfolio-order-view"
      className="fixed inset-0 z-[9999] flex flex-col bg-[#f7f8fb] text-gray-950 dark:bg-black dark:text-white lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label={t('portfolio.orderShort')}
    >
      <header className="grid h-14 shrink-0 grid-cols-[3rem_1fr_3rem] items-center border-b border-gray-200 bg-white/95 px-3 shadow-sm dark:border-gray-800 dark:bg-[#101011]/95">
        <button
          type="button"
          aria-label={t('portfolio.saveOrder')}
          disabled={isSaving}
          onClick={() => void handleSave()}
          className="inline-flex h-10 w-10 items-center justify-center justify-self-start rounded-full text-purple-700 transition hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-400/50 disabled:cursor-wait disabled:opacity-60 dark:text-purple-200 dark:hover:bg-purple-950/30"
        >
          <CheckIcon className="h-6 w-6" aria-hidden="true" />
        </button>
        <h1 className="truncate text-center text-base font-semibold">
          {t('portfolio.orderShort')}
        </h1>
        <div aria-hidden="true" />
      </header>

      {actionError && (
        <p className="mx-4 mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
          {actionError}
        </p>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <div className="space-y-2">
          {draftItems.map((item) => {
            const src = itemImageSrc(item);
            const isDragging = draggedItemId === item.id;
            return (
              <div
                key={item.id}
                ref={(node) => setRowRef(item.id, node)}
                data-testid={`mobile-portfolio-order-row-${item.id}`}
                onPointerDown={handlePointerDown(item.id)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerEnd}
                onPointerCancel={handlePointerEnd}
                className={`flex h-16 touch-none select-none items-center gap-3 rounded-2xl border bg-white/90 px-3 shadow-sm transition dark:bg-[#101011] ${
                  isDragging
                    ? 'border-purple-300 ring-2 ring-purple-200 dark:border-purple-700 dark:ring-purple-900/60'
                    : 'border-gray-200 dark:border-gray-800'
                }`}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100 dark:bg-[#151517]">
                  {src ? (
                    <img
                      src={src}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                      aria-hidden="true"
                    />
                  ) : (
                    <PhotoIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  )}
                </div>
                <p
                  data-testid={`mobile-portfolio-order-title-${item.id}`}
                  className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-950 dark:text-white"
                >
                  {item.title}
                </p>
                <button
                  type="button"
                  data-testid={`mobile-portfolio-order-drag-${item.id}`}
                  aria-label={t('portfolio.dragPortfolio')}
                  onKeyDown={handleKeyDown(item.id)}
                  className="inline-flex h-10 w-10 shrink-0 touch-none select-none items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-400/50 dark:text-gray-300 dark:hover:bg-gray-900"
                >
                  <Bars3Icon className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    portalNode,
  );
}