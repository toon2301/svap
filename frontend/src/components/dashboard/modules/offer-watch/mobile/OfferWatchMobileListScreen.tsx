'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowPathIcon,
  EyeIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import DelayedSkeleton from '../../settings/DelayedSkeleton';
import { MAX_OFFER_WATCHES, type OfferWatch } from '../types';
import type { UseOfferWatchesResult } from '../useOfferWatches';
import OfferWatchSavedList, {
  OfferWatchListSkeleton,
} from '../settings/OfferWatchSavedList';
import OfferWatchMobileShell from './OfferWatchMobileShell';

type OfferWatchMobileListScreenProps = {
  watches: OfferWatch[];
  isLoading: boolean;
  hasLoadError: boolean;
  mutation: UseOfferWatchesResult['mutation'];
  onBack: () => void;
  onCreate: () => void;
  onEdit: (watch: OfferWatch) => void;
  onDelete: (watch: OfferWatch) => void;
  onRetry: () => void;
};

/**
 * Mobilná obrazovka zoznamu sledovaní: tlačidlo „Vytvoriť sledovanie“ (pri limite skryté), odznak s počtom a zoznam,
 * prázdny stav alebo chyba s „Skúsiť znova“. Kostra pri načítavaní sa ukáže až po 200 ms a obsah, ktorý príde po
 * načítavaní, sa vyfaduje (nález 286); návrat z formulára zoznam znova nevyfaduje.
 */
export default function OfferWatchMobileListScreen({
  watches,
  isLoading,
  hasLoadError,
  mutation,
  onBack,
  onCreate,
  onEdit,
  onDelete,
  onRetry,
}: OfferWatchMobileListScreenProps) {
  const { t } = useLanguage();
  const backButtonRef = useRef<HTMLButtonElement>(null);
  const atLimit = watches.length >= MAX_OFFER_WATCHES;
  // Krátky prechod dostane len obsah, ktorý príde po načítavaní (nález 286): príznak sa zapne, keď sa načítavanie
  // zaznamená. Návrat z formulára, keď údaje už sú, zoznam znova nevyfaduje.
  const [fadeIn, setFadeIn] = useState(false);
  const fadeClass = fadeIn ? 'animate-content-in ' : '';

  useEffect(() => {
    if (isLoading) setFadeIn(true);
  }, [isLoading]);

  useEffect(() => {
    requestAnimationFrame(() => backButtonRef.current?.focus());
  }, []);

  return (
    <OfferWatchMobileShell
      title={t('offerWatch.title', 'Sledovanie')}
      onBack={onBack}
      backDisabled={mutation !== null}
      initialFocusRef={backButtonRef}
    >
      <div className='px-4 pb-[max(7rem,calc(env(safe-area-inset-bottom,0px)+5rem))] pt-5 sm:px-6'>
        {!atLimit ? (
          <button
            type='button'
            onClick={onCreate}
            disabled={isLoading || hasLoadError || mutation !== null}
            className='inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400/50 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-purple-500 dark:hover:bg-purple-600'
          >
            <PlusIcon className='h-5 w-5' aria-hidden='true' />
            {t('offerWatch.createAction', 'Vytvoriť sledovanie')}
          </button>
        ) : null}

        {atLimit ? (
          <p className='mt-3 rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-800 dark:border-purple-900/60 dark:bg-purple-950/25 dark:text-purple-200' role='status'>
            {t('offerWatch.limitReached', 'Dosiahol si limit 5 sledovaní. Ak chceš pridať nové, jedno z existujúcich vymaž.')}
          </p>
        ) : null}

        <section className='mt-7' aria-labelledby='offer-watch-mobile-saved-title'>
          <div className='mb-4 flex items-center justify-between gap-4'>
            <h2 id='offer-watch-mobile-saved-title' className='text-lg font-semibold text-gray-900 dark:text-white'>
              {t('offerWatch.savedTitle', 'Uložené sledovania')}
            </h2>
            <span
              className='rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700 dark:bg-gray-900 dark:text-gray-300'
              aria-label={t('offerWatch.countLabel', 'Počet uložených sledovaní')}
            >
              {watches.length} / {MAX_OFFER_WATCHES}
            </span>
          </div>

          {hasLoadError ? (
            <div className={`${fadeClass}rounded-2xl border border-red-200 bg-red-50 px-5 py-7 text-center dark:border-red-900/60 dark:bg-red-950/20`} role='alert'>
              <p className='text-sm font-medium text-red-800 dark:text-red-200'>
                {t('offerWatch.loadFailed', 'Sledovania sa nepodarilo načítať.')}
              </p>
              <button
                type='button'
                onClick={onRetry}
                className='mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-400/30 dark:border-red-800 dark:bg-[#101011] dark:text-red-200 dark:hover:bg-red-950/40'
              >
                <ArrowPathIcon className='h-4 w-4' aria-hidden='true' />
                {t('offerWatch.retry', 'Skúsiť znova')}
              </button>
            </div>
          ) : isLoading ? (
            // Kostra sa ukáže až po 200 ms (rýchla odpoveď ju neukáže vôbec, nález 286). Karty kostry pulzujú samy.
            <DelayedSkeleton
              isLoading
              label={t('offerWatchResults.loading', 'Načítavam sledovania...')}
              pulse={false}
              testId='offer-watch-list-loading'
            >
              <OfferWatchListSkeleton />
            </DelayedSkeleton>
          ) : watches.length === 0 ? (
            <div className={`${fadeClass}rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center dark:border-gray-700 dark:bg-[#0d0d0e]`}>
              <div className='mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'>
                <EyeIcon className='h-6 w-6' aria-hidden='true' />
              </div>
              <h3 className='mt-4 text-base font-semibold text-gray-900 dark:text-white'>
                {t('offerWatch.emptyTitle', 'Zatiaľ nemáš žiadne sledovanie')}
              </h3>
              <p className='mx-auto mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400'>
                {t('offerWatch.emptyMobileDescription', 'Vytvor si prvé sledovanie tlačidlom vyššie.')}
              </p>
            </div>
          ) : (
            <div className={fadeIn ? 'animate-content-in' : undefined}>
              <OfferWatchSavedList
                watches={watches}
                mutation={mutation}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            </div>
          )}
        </section>
      </div>
    </OfferWatchMobileShell>
  );
}
