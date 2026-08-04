'use client';

/**
 * Zoznam príspevkov Nástenky: prvé načítanie, donačítavanie pri scrollovaní,
 * prázdny stav a chybový stav.
 *
 * Donačítanie spúšťa sentinel + IntersectionObserver. Tlačidlo pod ním je
 * fallback (prehliadač bez observera, alebo keď sentinel neprejde cez viewport
 * – napr. veľmi vysoké okno) a zároveň zachováva doterajší „Zobraziť ďalšie"
 * vzor appky ako dostupnú alternatívu ku scrollu.
 */

import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import FeedPostCard from './FeedPostCard';
import {
  useFeedInfiniteScroll,
  useInfiniteScrollSentinel,
} from './useFeedInfiniteScroll';

function FeedCardSkeleton() {
  return (
    <div
      data-testid="feed-skeleton"
      className="animate-pulse overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-[#202223]"
    >
      <div className="flex items-center gap-3 p-4">
        <div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-32 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-2.5 w-16 rounded bg-gray-100 dark:bg-gray-800" />
        </div>
      </div>
      <div className="h-40 w-full bg-gray-100 dark:bg-gray-800" />
      <div className="space-y-2 p-4">
        <div className="h-3 w-full rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-3 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  );
}

function FeedEmptyState() {
  const { t } = useLanguage();
  return (
    <div
      data-testid="feed-empty-state"
      className="rounded-2xl border border-dashed border-purple-200 bg-purple-50/60 px-6 py-12 text-center dark:border-purple-800/50 dark:bg-purple-900/10"
    >
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-200">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="h-7 w-7"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
          />
        </svg>
      </div>
      <h2 className="mb-1.5 text-lg font-semibold text-gray-900 dark:text-white">
        {t('feed.emptyTitle', 'Nástenka je zatiaľ tichá')}
      </h2>
      <p className="mx-auto mb-5 max-w-sm text-sm text-gray-600 dark:text-gray-300">
        {t('feed.emptySubtitle', 'Buď prvý, kto tu niečo zdieľa!')}
      </p>
      {/* Vytváranie príspevkov príde vo Fáze 4.3 – tlačidlo je zatiaľ
          disabled (nie bez onClick), aby ho klávesnica preskočila a čítačka
          ho ohlásila ako nedostupné, nie ako rozbité. */}
      <button
        type="button"
        disabled
        data-testid="feed-empty-cta"
        className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white opacity-60"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        {t('feed.emptyCta', 'Vytvoriť príspevok')}
      </button>
    </div>
  );
}

export default function FeedList() {
  const { t } = useLanguage();
  const { posts, loading, loadingMore, hasMore, error, loadMore, reload, isEmpty } =
    useFeedInfiniteScroll();

  const sentinelRef = useInfiniteScrollSentinel({
    onIntersect: loadMore,
    enabled: hasMore && !loading && !loadingMore,
  });

  if (loading) {
    return (
      <div className="space-y-4" data-testid="feed-initial-loading">
        <FeedCardSkeleton />
        <FeedCardSkeleton />
      </div>
    );
  }

  if (error && posts.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white px-6 py-10 text-center dark:border-gray-700 dark:bg-[#202223]">
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
          {t('feed.loadError', 'Nástenku sa nepodarilo načítať.')}
        </p>
        <button
          type="button"
          onClick={() => void reload()}
          className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
        >
          {t('feed.retry', 'Skúsiť znova')}
        </button>
      </div>
    );
  }

  if (isEmpty) {
    return <FeedEmptyState />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
      data-testid="feed-list"
    >
      {posts.map((post) => (
        <FeedPostCard key={post.id} post={post} />
      ))}

      {loadingMore ? <FeedCardSkeleton /> : null}

      <div ref={sentinelRef} aria-hidden="true" data-testid="feed-sentinel" />

      {hasMore && !loadingMore ? (
        <button
          type="button"
          onClick={() => void loadMore()}
          className="inline-flex w-full items-center justify-center rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100 hover:text-purple-700 dark:border-gray-700 dark:bg-black dark:text-gray-300 dark:hover:bg-gray-900"
        >
          {t('feed.loadMore', 'Zobraziť ďalšie')}
        </button>
      ) : null}

      {error && posts.length > 0 ? (
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          {t('feed.loadMoreError', 'Ďalšie príspevky sa nepodarilo načítať.')}
        </p>
      ) : null}
    </motion.div>
  );
}
