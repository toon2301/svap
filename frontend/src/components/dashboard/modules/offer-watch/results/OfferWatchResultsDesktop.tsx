'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowPathIcon, Cog6ToothIcon, EyeIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import type { OfferWatch } from '../types';
import { useOfferWatches } from '../useOfferWatches';
import OfferWatchResultsMatchesPanel from './OfferWatchResultsMatchesPanel';
import OfferWatchResultsSkeleton from './OfferWatchResultsSkeleton';
import OfferWatchResultsWatchPicker from './OfferWatchResultsWatchPicker';

const WATCH_QUERY_KEY = 'watch';

function watchIdFromUrl(): number | null {
  if (typeof window === 'undefined') return null;
  const raw = new URLSearchParams(window.location.search).get(WATCH_QUERY_KEY);
  if (!raw || !/^\d+$/.test(raw)) return null;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function replaceWatchQuery(watchId: number | null): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (watchId == null) url.searchParams.delete(WATCH_QUERY_KEY);
  else url.searchParams.set(WATCH_QUERY_KEY, String(watchId));
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
}

function newestFirst(watches: OfferWatch[]): OfferWatch[] {
  return [...watches].sort((left, right) => {
    const leftTime = Date.parse(left.createdAt);
    const rightTime = Date.parse(right.createdAt);
    const safeLeft = Number.isFinite(leftTime) ? leftTime : 0;
    const safeRight = Number.isFinite(rightTime) ? rightTime : 0;
    return safeRight - safeLeft || right.id - left.id;
  });
}

/** Desktopová obrazovka živých výsledkov uložených sledovaní. */
type OfferWatchResultsDesktopProps = {
  onManage: () => void;
};

export default function OfferWatchResultsDesktop({
  onManage,
}: OfferWatchResultsDesktopProps) {
  const { t } = useLanguage();
  const { watches, isLoading, error, reload } = useOfferWatches();
  const orderedWatches = useMemo(() => newestFirst(watches), [watches]);
  const [selectedWatchId, setSelectedWatchId] = useState<number | null>(() => watchIdFromUrl());
  const selectedWatch = orderedWatches.find((watch) => watch.id === selectedWatchId) ?? null;
  const isInitialLoading = isLoading && orderedWatches.length === 0;
  const hasBlockingListError = Boolean(error && orderedWatches.length === 0 && !isLoading);

  const recoverMissingWatch = useCallback(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (isLoading || hasBlockingListError) return;
    if (orderedWatches.length === 0) {
      setSelectedWatchId(null);
      return;
    }
    if (orderedWatches.some((watch) => watch.id === selectedWatchId)) return;
    setSelectedWatchId(orderedWatches[0].id);
  }, [hasBlockingListError, isLoading, orderedWatches, selectedWatchId]);

  useEffect(() => {
    if (isLoading || hasBlockingListError) return;
    replaceWatchQuery(selectedWatchId);
  }, [hasBlockingListError, isLoading, selectedWatchId]);

  return (
    <div className='hidden w-full lg:block'>
      <div className='mb-7 flex flex-wrap items-start justify-between gap-4'>
        <div>
          <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>
            {t('offerWatchResults.title', 'Sledovania')}
          </h1>
          <p className='mt-2 max-w-2xl text-sm leading-relaxed text-gray-600 dark:text-gray-400'>
            {t('offerWatchResults.description', 'Tu nájdeš ponuky a dopyty, ktoré zodpovedajú tvojim uloženým sledovaniam.')}
          </p>
        </div>
        <button
          type='button'
          onClick={onManage}
          className='inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500/35 dark:border-gray-700 dark:bg-[#101011] dark:text-gray-200 dark:hover:bg-gray-900'
        >
          <Cog6ToothIcon className='h-5 w-5' aria-hidden='true' />
          {t('offerWatchResults.manage', 'Spravovať sledovania')}
        </button>
      </div>

      {isInitialLoading ? (
        <OfferWatchResultsSkeleton
          label={t('offerWatchResults.loading', 'Načítavam výsledky...')}
        />
      ) : hasBlockingListError ? (
        <div className='rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center dark:border-red-900/60 dark:bg-red-950/20' role='alert'>
          <p className='text-sm font-medium text-red-800 dark:text-red-200'>
            {t('offerWatch.loadFailed', 'Sledovania sa nepodarilo načítať.')}
          </p>
          <button
            type='button'
            onClick={() => void reload()}
            className='mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-400/30 dark:border-red-800 dark:bg-[#101011] dark:text-red-200 dark:hover:bg-red-950/40'
          >
            <ArrowPathIcon className='h-4 w-4' aria-hidden='true' />
            {t('offerWatch.retry', 'Skúsiť znova')}
          </button>
        </div>
      ) : orderedWatches.length === 0 ? (
        <div className='rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center dark:border-gray-700 dark:bg-[#0d0d0e]'>
          <span className='mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'>
            <EyeIcon className='h-6 w-6' aria-hidden='true' />
          </span>
          <h2 className='mt-4 text-lg font-semibold text-gray-900 dark:text-white'>
            {t('offerWatchResults.noWatchesTitle', 'Zatiaľ nemáš žiadne sledovanie')}
          </h2>
          <p className='mx-auto mt-1 max-w-lg text-sm text-gray-500 dark:text-gray-400'>
            {t('offerWatchResults.noWatchesDescription', 'Najprv si nastav, aké ponuky alebo dopyty chceš sledovať.')}
          </p>
          <button
            type='button'
            onClick={onManage}
            className='mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:ring-offset-2 dark:focus:ring-offset-black'
          >
            {t('offerWatchResults.manage', 'Spravovať sledovania')}
          </button>
        </div>
      ) : selectedWatch ? (
        <>
          {error && (
            <div role='alert' className='mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200'>
              <span>{t('offerWatch.loadFailed', 'Sledovania sa nepodarilo načítať.')}</span>
              <button type='button' onClick={() => void reload()} className='font-semibold underline underline-offset-2'>
                {t('offerWatch.retry', 'Skúsiť znova')}
              </button>
            </div>
          )}
          <OfferWatchResultsWatchPicker
            watches={orderedWatches}
            selectedWatchId={selectedWatch.id}
            onSelect={setSelectedWatchId}
          />
          <OfferWatchResultsMatchesPanel
            key={selectedWatch.id}
            watch={selectedWatch}
            onWatchUnavailable={recoverMissingWatch}
          />
        </>
      ) : null}
    </div>
  );
}
