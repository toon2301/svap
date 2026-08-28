'use client';

/**
 * Automatické donačítanie starších odpovedí jedného komentára.
 *
 * Nahrádza tlačidlo „Zobraziť ďalšie odpovede": odpovede sa dopĺňajú samy, keď
 * čitateľ doscrolluje na koniec vlákna – rovnaký princíp, aký má hlavný feed
 * aj samotný zoznam komentárov.
 *
 * Sentinel je VLASTNÝ pre túto inštanciu (`useInfiniteScrollSentinel` vracia
 * nový ref), takže viac naraz rozbalených vlákien si donačítavanie navzájom
 * nespúšťa. Rootom je scrollovateľný box zoznamu, nie okno – inak by sa
 * pri scrollovaní vnútri boxu nikdy nepretlo.
 */

import { type RefObject } from 'react';
import { useInfiniteScrollSentinel } from './useFeedInfiniteScroll';

type FeedRepliesAutoLoaderProps = {
  /** False počas prebiehajúcej dávky – nech sa nespustí druhá. */
  enabled: boolean;
  loading: boolean;
  /** Scrollovateľný box zoznamu komentárov. */
  root: RefObject<HTMLElement | null>;
  onLoadMore: () => void;
  testId: string;
};

export default function FeedRepliesAutoLoader({
  enabled,
  loading,
  root,
  onLoadMore,
  testId,
}: FeedRepliesAutoLoaderProps) {
  const sentinelRef = useInfiniteScrollSentinel({
    onIntersect: onLoadMore,
    enabled,
    root,
    // Rovnaká predsávka ako pri komentároch – v nízkom boxe by 400px z hlavného
    // feedu znamenalo „vždy blízko".
    rootMargin: '80px',
  });

  return (
    <div className="ml-4 pl-3">
      {loading ? (
        <ul
          className="mt-2 space-y-2"
          data-testid={`${testId}-loading`}
          aria-hidden="true"
        >
          {[0, 1].map((key) => (
            <li key={key} className="flex animate-pulse items-start gap-2.5">
              <div className="h-6 w-6 shrink-0 rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="flex-1 space-y-1.5 rounded-2xl bg-gray-100 px-3 py-1.5 dark:bg-gray-800/60">
                <div className="h-2 w-20 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-2.5 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      <div ref={sentinelRef} aria-hidden="true" data-testid={testId} />
    </div>
  );
}
