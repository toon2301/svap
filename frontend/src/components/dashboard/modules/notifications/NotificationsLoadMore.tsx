'use client';

import React, { useEffect, useLayoutEffect, useRef } from 'react';

import { useLanguage } from '@/contexts/LanguageContext';

import { useInfiniteScrollSentinel } from '../feed/useFeedInfiniteScroll';
import { NotificationsFeedSkeleton } from './NotificationsFeedSkeleton';

/** Na serveri `useLayoutEffect` nebeží (a hlási varovanie). */
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const SKELETON_ROWS = 2;

/** Najbližší predok, ktorý sa sám scrolluje (`overflow-y: auto|scroll|overlay`); inak `null` = viewport. */
function findScrollParent(node: Element | null): Element | null {
  for (let parent = node?.parentElement ?? null; parent; parent = parent.parentElement) {
    const overflowY = window.getComputedStyle(parent).overflowY;
    if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') return parent;
  }
  return null;
}

/**
 * Koniec zoznamu upozornení: sentinel, ktorý pri priblížení dotiahne ďalšiu dávku, a počas
 * načítavania dva riadky skeletonu. Root pozorovateľa je skutočný scrollovateľný predok
 * (panel `<section>` na PC, `<main data-dashboard-main>` na stránke). Vzor: ConversationsListLoadMore.
 */
export function NotificationsLoadMore({
  enabled,
  loading,
  onLoadMore,
}: {
  enabled: boolean;
  loading: boolean;
  onLoadMore: () => void;
}) {
  const { t } = useLanguage();
  const rootRef = useRef<Element | null>(null);
  const sentinelRef = useInfiniteScrollSentinel({
    onIntersect: onLoadMore,
    enabled,
    root: rootRef,
  });

  useIsomorphicLayoutEffect(() => {
    rootRef.current = findScrollParent(sentinelRef.current);
  }, [sentinelRef]);

  return (
    <>
      <div
        ref={sentinelRef}
        data-testid="notifications-load-more-sentinel"
        aria-hidden="true"
        className="h-px"
      />
      {loading ? (
        <div data-testid="notifications-load-more-skeleton">
          <NotificationsFeedSkeleton rows={SKELETON_ROWS} />
        </div>
      ) : null}
      <div role="status" className="sr-only">
        {loading ? t('notifications.loadingMore', 'Načítavam…') : ''}
      </div>
    </>
  );
}
