'use client';

import { useEffect, useRef } from 'react';
import { ArrowPathIcon, EyeIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import type { OfferWatch } from '../types';
import { useOfferWatchMatches } from '../useOfferWatchMatches';
import { offerWatchSubcategoryLabel } from '../settings/offerWatchUi';
import OfferWatchMatchGrid from './OfferWatchMatchGrid';

type OfferWatchResultsMatchesPanelProps = {
  watch: OfferWatch;
  onWatchUnavailable: () => void;
};

/** Riadi načítanie prvej aj ďalších kurzorových strán jednej zvolenej podmienky. */
export default function OfferWatchResultsMatchesPanel({
  watch,
  onWatchUnavailable,
}: OfferWatchResultsMatchesPanelProps) {
  const { t } = useLanguage();
  const {
    matches,
    nextCursor,
    isLoading,
    isLoadingMore,
    error,
    refresh,
    loadMore,
  } = useOfferWatchMatches(watch.id);
  const title = offerWatchSubcategoryLabel(t, watch.category, watch.subcategory);
  const hasMatches = matches.length > 0;
  const missingWatchRecoveryStartedRef = useRef(false);

  useEffect(() => {
    if (error?.kind !== 'not_found' || missingWatchRecoveryStartedRef.current) return;
    missingWatchRecoveryStartedRef.current = true;
    onWatchUnavailable();
  }, [error, onWatchUnavailable]);

  const retry = () => {
    if (nextCursor && hasMatches) void loadMore();
    else void refresh();
  };

  return (
    <section className='mt-8' aria-labelledby='offer-watch-results-matches-title'>
      <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
        <div className='min-w-0'>
          <p className='text-xs font-semibold uppercase tracking-wide text-purple-600 dark:text-purple-300'>
            {t('offerWatchResults.resultsFor', 'Výsledky pre')}
          </p>
          <h2
            id='offer-watch-results-matches-title'
            className='truncate text-xl font-semibold text-gray-900 dark:text-white'
          >
            {title}
          </h2>
        </div>
        <button
          type='button'
          onClick={() => void refresh()}
          disabled={isLoading || isLoadingMore}
          className='inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500/35 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-[#101011] dark:text-gray-200 dark:hover:bg-gray-900'
        >
          <ArrowPathIcon
            className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
            aria-hidden='true'
          />
          {isLoading && hasMatches
            ? t('offerWatchResults.refreshing', 'Obnovujem...')
            : t('offerWatchResults.refresh', 'Obnoviť')}
        </button>
      </div>

      {error && (
        <div
          role='alert'
          className={`mb-5 rounded-2xl border px-5 py-4 ${
            hasMatches
              ? 'border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/20'
              : 'border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/20'
          }`}
        >
          <p className={`text-sm font-medium ${
            hasMatches
              ? 'text-amber-900 dark:text-amber-200'
              : 'text-red-800 dark:text-red-200'
          }`}>
            {t('offerWatchResults.matchesLoadFailed', 'Výsledky sa nepodarilo načítať.')}
          </p>
          <button
            type='button'
            onClick={retry}
            disabled={isLoading || isLoadingMore}
            className='mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-current px-4 py-2 text-sm font-semibold transition hover:bg-white/60 focus:outline-none focus:ring-2 focus:ring-purple-500/35 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-black/20'
          >
            <ArrowPathIcon className='h-4 w-4' aria-hidden='true' />
            {t('offerWatch.retry', 'Skúsiť znova')}
          </button>
        </div>
      )}

      {isLoading && !hasMatches ? (
        <div role='status' aria-busy='true' className='py-14 text-center'>
          <span className='inline-block h-7 w-7 animate-spin rounded-full border-2 border-purple-500 border-t-transparent' aria-hidden='true' />
          <span className='sr-only'>
            {t('offerWatchResults.loadingMatches', 'Načítavam výsledky...')}
          </span>
        </div>
      ) : !hasMatches && !error ? (
        <div className='rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center dark:border-gray-700 dark:bg-[#0d0d0e]'>
          <span className='mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'>
            <EyeIcon className='h-6 w-6' aria-hidden='true' />
          </span>
          <h3 className='mt-4 text-base font-semibold text-gray-900 dark:text-white'>
            {t('offerWatchResults.noMatchesTitle', 'Zatiaľ žiadne zhody')}
          </h3>
          <p className='mx-auto mt-1 max-w-lg text-sm text-gray-500 dark:text-gray-400'>
            {t('offerWatchResults.noMatchesDescription', 'Keď pribudne zodpovedajúca ponuka alebo dopyt, zobrazí sa tu.')}
          </p>
        </div>
      ) : hasMatches ? (
        <>
          <OfferWatchMatchGrid
            matches={matches}
            watchUpdatedAt={watch.updatedAt}
          />
          {nextCursor && !error && (
            <div className='mt-8 flex justify-center'>
              <button
                type='button'
                onClick={() => void loadMore()}
                disabled={isLoading || isLoadingMore}
                className='inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-purple-300 bg-white px-5 py-2.5 text-sm font-semibold text-purple-700 transition hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-500/35 disabled:cursor-not-allowed disabled:opacity-60 dark:border-purple-800 dark:bg-[#101011] dark:text-purple-300 dark:hover:bg-purple-950/30'
              >
                {isLoadingMore && (
                  <span className='h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' aria-hidden='true' />
                )}
                {isLoadingMore
                  ? t('offerWatchResults.loadingMore', 'Načítavam ďalšie...')
                  : t('offerWatchResults.loadMore', 'Zobraziť ďalšie')}
              </button>
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}
