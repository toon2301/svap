'use client';

import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { useInfiniteScrollSentinel } from '../feed/useFeedInfiniteScroll';

/** Na serveri `useLayoutEffect` nebeží (a hlási varovanie) – rovnaký vzor ako inde v appke. */
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const SKELETON_ROWS = 2;

/** Najbližší predok, ktorý sa sám scrolluje (`overflow-y: auto|scroll`); inak `null` = viewport. */
function findScrollParent(node: Element | null): Element | null {
  for (let parent = node?.parentElement ?? null; parent; parent = parent.parentElement) {
    const overflowY = window.getComputedStyle(parent).overflowY;
    if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') return parent;
  }
  return null;
}

/**
 * Koniec zoznamu konverzácií: sentinel, ktorý pri priblížení dotiahne ďalšiu dávku, a počas
 * načítavania dva riadky skeletonu.
 *
 * Root pozorovateľa je skutočný scrollovateľný kontajner zoznamu (na mobile `<main>` dashboardu,
 * na desktope panel zoznamu) – bez neho by sa `rootMargin` počítal voči obrazovke a nie voči
 * miestu, kde sa v zozname používateľ nachádza. Pozorovateľ sa pri každom zapnutí vytvorí
 * nanovo, takže ak je koniec zoznamu po dotiahnutí stále na dohľad, spustí sa hneď znova.
 */
export function ConversationsListLoadMore({
  enabled,
  loading,
  isCompact,
  onLoadMore,
}: {
  enabled: boolean;
  loading: boolean;
  isCompact: boolean;
  onLoadMore: () => void;
}) {
  const rootRef = useRef<Element | null>(null);
  const sentinelRef = useInfiniteScrollSentinel({ onIntersect: onLoadMore, enabled, root: rootRef });

  // Layout efekt beží pred pasívnym efektom pozorovateľa, takže root je nastavený včas.
  useIsomorphicLayoutEffect(() => {
    rootRef.current = findScrollParent(sentinelRef.current);
  }, [sentinelRef]);

  return (
    <>
      <div
        ref={sentinelRef}
        data-testid="conversations-load-more-sentinel"
        aria-hidden="true"
        className="h-px"
      />
      {loading
        ? Array.from({ length: SKELETON_ROWS }).map((_, index) => (
            <div
              key={index}
              data-testid="conversations-load-more-row"
              aria-hidden="true"
              className={`flex items-center gap-3 ${isCompact ? 'px-3 py-2.5' : 'px-4 py-3.5'}`}
            >
              <div
                className={`animate-pulse rounded-full bg-gray-200 dark:bg-gray-700/70 ${
                  isCompact ? 'h-9 w-9' : 'h-11 w-11'
                }`}
              />
              <div className="min-w-0 flex-1">
                <div className="h-4 w-36 animate-pulse rounded bg-gray-200 dark:bg-gray-700/70" />
                <div className="mt-2 h-3.5 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700/70" />
              </div>
            </div>
          ))
        : null}
    </>
  );
}
