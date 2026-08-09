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

import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import FeedPostCard from './FeedPostCard';
import FeedPostComposerModal from './FeedPostComposerModal';
import { useFeedPullToRefresh } from './useFeedPullToRefresh';
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

function FeedEmptyState({ onCreate }: { onCreate: () => void }) {
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
      <button
        type="button"
        onClick={onCreate}
        data-testid="feed-empty-cta"
        className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple-700"
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

/** Indikátor ťahania – rotuje podľa prejdenej vzdialenosti, fialový ako zvyšok appky. */
function PullIndicator({
  distance,
  refreshing,
  ready,
}: {
  distance: number;
  refreshing: boolean;
  ready: boolean;
}) {
  const { t } = useLanguage();
  if (distance <= 0 && !refreshing) return null;

  const label = refreshing
    ? t('feed.refreshing', 'Obnovujem...')
    : ready
      ? t('feed.releaseToRefresh', 'Pusti pre obnovenie')
      : t('feed.pullToRefresh', 'Potiahni pre obnovenie');

  return (
    <div
      data-testid="feed-pull-indicator"
      className="flex flex-col items-center justify-end overflow-hidden text-purple-600 dark:text-purple-300"
      style={{ height: distance }}
      aria-live="polite"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`}
        style={refreshing ? undefined : { transform: `rotate(${distance * 3}deg)` }}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 4v6h6M20 20v-6h-6M20 9A8 8 0 0 0 5.6 6.6M4 15a8 8 0 0 0 14.4 2.4"
        />
      </svg>
      <span className="mt-1 text-xs font-medium">{label}</span>
    </div>
  );
}

export default function FeedList() {
  const { t } = useLanguage();
  const {
    posts,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    prependPosts,
    refreshLatest,
    reload,
    isEmpty,
  } = useFeedInfiniteScroll();
  const [composerOpen, setComposerOpen] = useState(false);
  const [checking, setChecking] = useState(false);

  const sentinelRef = useInfiniteScrollSentinel({
    onIntersect: loadMore,
    // Po zlyhaní donačítania observer vypneme – sentinel ostáva vo viewporte,
    // takže by sa inak pokúšal o request v slučke. Manuálne tlačidlo nižšie
    // ostáva dostupné, takže sa používateľ vie pohnúť ďalej.
    enabled: hasMore && !loading && !loadingMore && !error,
  });

  /** Jediná cesta k obnove – volá ju gesto na mobile aj tlačidlo na desktope. */
  const runRefresh = useCallback(async () => {
    try {
      const added = await refreshLatest();
      if (added === 0) {
        toast.success(t('feed.noNewPosts', 'Žiadne nové príspevky.'));
      }
    } catch {
      toast.error(t('feed.refreshError', 'Obnovenie sa nepodarilo.'));
    }
  }, [refreshLatest, t]);

  const { containerRef, pullDistance, refreshing, readyToRefresh } =
    useFeedPullToRefresh({ onRefresh: runRefresh, enabled: !loading });

  const handleCheckNew = async () => {
    if (checking) return;
    setChecking(true);
    try {
      await runRefresh();
    } finally {
      setChecking(false);
    }
  };

  const renderBody = () => {
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
      return <FeedEmptyState onCreate={() => setComposerOpen(true)} />;
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
          // Animácia beží pri MOUNTE karty – existujúce karty si React podľa
          // key zachová, takže „priplávajú" len tie čerstvo vložené na vrch.
          <motion.div
            key={post.id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
          >
            <FeedPostCard post={post} />
          </motion.div>
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
  };

  return (
    // overscroll-contain je druhá poistka k preventDefault() v hooku – uplatní
    // sa, keby sa tento obal niekedy stal vlastným scrollerom.
    <div
      ref={containerRef}
      data-testid="feed-pull-container"
      className="overscroll-y-contain"
    >
      <PullIndicator
        distance={pullDistance}
        refreshing={refreshing}
        ready={readyToRefresh}
      />

      {/* Spúšťač composera – vyzerá ako pole, je to tlačidlo (otvára dialóg). */}
      <button
        type="button"
        onClick={() => setComposerOpen(true)}
        data-testid="feed-composer-trigger"
        className="mb-4 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left text-sm text-gray-500 transition-colors hover:border-purple-300 hover:text-purple-700 dark:border-gray-700 dark:bg-[#202223] dark:text-gray-400 dark:hover:border-purple-700 dark:hover:text-purple-300"
      >
        {t('feed.composerPlaceholder', 'Napíš niečo...')}
      </button>

      {/* Desktop: klik-spúšťaná kontrola. Na mobile to isté rieši gesto, preto
          je tlačidlo skryté (sm:) – zámerne bez pollingu na pozadí. */}
      <div className="mb-4 hidden sm:flex sm:justify-end">
        <button
          type="button"
          onClick={() => void handleCheckNew()}
          disabled={checking || loading}
          data-testid="feed-check-new"
          className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-100 hover:text-purple-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900 dark:hover:text-purple-300"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`h-3.5 w-3.5 ${checking ? 'animate-spin' : ''}`}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v6h6M20 20v-6h-6M20 9A8 8 0 0 0 5.6 6.6M4 15a8 8 0 0 0 14.4 2.4"
            />
          </svg>
          {checking
            ? t('feed.checkingNew', 'Kontrolujem...')
            : t('feed.checkNew', 'Skontrolovať nové príspevky')}
        </button>
      </div>

      {renderBody()}

      <FeedPostComposerModal
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        onCreated={(created) => prependPosts([created])}
      />
    </div>
  );
}
