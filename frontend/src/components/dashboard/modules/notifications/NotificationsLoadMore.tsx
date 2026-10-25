'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { useLanguage } from '@/contexts/LanguageContext';

import { useInfiniteScrollSentinel } from '../feed/useFeedInfiniteScroll';
import { NotificationsFeedSkeleton } from './NotificationsFeedSkeleton';
import { ERROR_BOX_CLASS } from './notificationsStyles';

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
 *
 * ZÁLOHA: v prostredí bez `IntersectionObserver` (staršie vstavané webview) sa sentinel nemá ako
 * pretnúť, takže by zvyšok histórie ostal nedostupný. Len vtedy pribudne tlačidlo „Zobraziť ďalšie“
 * (a pri zlyhaní chyba s „Skúsiť znova“), rovnako ako vo FeedList a FeedRepliesAutoLoader.
 */
export function NotificationsLoadMore({
  enabled,
  loading,
  failed,
  onLoadMore,
}: {
  enabled: boolean;
  loading: boolean;
  /** Posledná dávka zlyhala (beží pauza pred ďalším pokusom). */
  failed: boolean;
  onLoadMore: () => void;
}) {
  const { t } = useLanguage();
  // Až v efekte, nie pri rendri: na serveri `IntersectionObserver` nie je nikdy, takže priama
  // kontrola by na klientovi spôsobila nesúlad hydratácie.
  const [observerMissing, setObserverMissing] = useState(false);
  useEffect(() => {
    setObserverMissing(typeof IntersectionObserver === 'undefined');
  }, []);
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
      {observerMissing && !loading ? (
        failed ? (
          <div
            role="alert"
            data-testid="notifications-load-more-fallback-error"
            className={`mt-4 ${ERROR_BOX_CLASS}`}
          >
            {t('notifications.loadFeedError', 'Upozornenia sa nepodarilo načítať.')}
            <button type="button" onClick={onLoadMore} className="ml-2 font-semibold underline">
              {t('notifications.retry', 'Skúsiť znova')}
            </button>
          </div>
        ) : (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={onLoadMore}
              disabled={!enabled}
              data-testid="notifications-load-more-fallback"
              className="inline-flex items-center justify-center rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100 hover:text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400/50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-black dark:text-gray-300 dark:hover:bg-gray-900 dark:hover:text-purple-200"
            >
              {t('notifications.loadMore', 'Zobraziť ďalšie')}
            </button>
          </div>
        )
      ) : null}
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
