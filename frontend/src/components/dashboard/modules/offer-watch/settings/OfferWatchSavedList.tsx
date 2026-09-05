'use client';

import { EyeIcon, MapPinIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import type { OfferWatch } from '../types';
import type { UseOfferWatchesResult } from '../useOfferWatches';
import {
  offerWatchCategoryLabel,
  offerWatchCountryLabel,
  offerWatchPriceLabel,
  offerWatchSubcategoryLabel,
} from './offerWatchUi';

type OfferWatchSavedListProps = {
  watches: OfferWatch[];
  mutation: UseOfferWatchesResult['mutation'];
  onEdit: (watch: OfferWatch) => void;
  onDelete: (watch: OfferWatch) => void;
};

export function OfferWatchListSkeleton() {
  return (
    <div className='space-y-3' aria-hidden='true' data-testid='offer-watch-list-skeleton'>
      {[0, 1].map((index) => (
        <div key={index} className='animate-pulse rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-[#101011]'>
          <div className='h-4 w-44 rounded bg-gray-200 dark:bg-gray-800' />
          <div className='mt-3 h-3 w-28 rounded bg-gray-100 dark:bg-gray-900' />
          <div className='mt-4 flex gap-2'>
            <div className='h-7 w-20 rounded-full bg-gray-100 dark:bg-gray-900' />
            <div className='h-7 w-28 rounded-full bg-gray-100 dark:bg-gray-900' />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function OfferWatchSavedList({
  watches,
  mutation,
  onEdit,
  onDelete,
}: OfferWatchSavedListProps) {
  const { locale, t } = useLanguage();

  if (watches.length === 0) {
    return (
      <div className='rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center dark:border-gray-700 dark:bg-[#0d0d0e]'>
        <div className='mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'>
          <EyeIcon className='h-6 w-6' aria-hidden='true' />
        </div>
        <h3 className='mt-4 text-base font-semibold text-gray-900 dark:text-white'>
          {t('offerWatch.emptyTitle', 'Zatiaľ nemáš žiadne sledovanie')}
        </h3>
        <p className='mx-auto mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400'>
          {t('offerWatch.emptyDescription', 'Vyplň filtre vyššie a ulož si prvé sledovanie.')}
        </p>
      </div>
    );
  }

  return (
    <div className='space-y-3'>
      {watches.map((watch) => {
        const itemBusy = Boolean(
          mutation
          && mutation.kind !== 'create'
          && mutation.watchId === watch.id,
        );
        const allBusy = mutation !== null;
        const countryLabel = offerWatchCountryLabel(locale, watch.countryCode);
        const locationLabel = watch.districtLabel
          ? `${watch.districtLabel}, ${countryLabel}`
          : `${countryLabel} · ${t('offerWatch.wholeCountry', 'celá krajina')}`;

        return (
          <article
            key={watch.id}
            className='rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-purple-200 dark:border-gray-800 dark:bg-[#101011] dark:hover:border-purple-900/70 sm:p-5'
          >
            <div className='flex items-start gap-4'>
              <div className='min-w-0 flex-1'>
                <h3 className='truncate text-base font-semibold text-gray-900 dark:text-white'>
                  {offerWatchSubcategoryLabel(t, watch.category, watch.subcategory)}
                </h3>
                <p className='mt-0.5 truncate text-sm text-gray-500 dark:text-gray-400'>
                  {offerWatchCategoryLabel(t, watch.category)}
                </p>
              </div>
              <div className='flex shrink-0 items-center gap-1'>
                <button
                  type='button'
                  onClick={() => onEdit(watch)}
                  disabled={allBusy}
                  aria-label={t('offerWatch.edit', 'Upraviť sledovanie')}
                  title={t('offerWatch.edit', 'Upraviť sledovanie')}
                  className='inline-flex h-11 w-11 items-center justify-center rounded-xl text-gray-500 transition hover:bg-purple-50 hover:text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400/40 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:bg-purple-950/30 dark:hover:text-purple-300'
                >
                  <PencilSquareIcon className='h-5 w-5' aria-hidden='true' />
                </button>
                <button
                  type='button'
                  onClick={() => onDelete(watch)}
                  disabled={allBusy}
                  aria-label={t('offerWatch.delete', 'Vymazať sledovanie')}
                  title={t('offerWatch.delete', 'Vymazať sledovanie')}
                  className='inline-flex h-11 w-11 items-center justify-center rounded-xl text-gray-500 transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-400/40 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:bg-red-950/30 dark:hover:text-red-300'
                >
                  {itemBusy && mutation?.kind === 'delete' ? (
                    <span className='h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' aria-hidden='true' />
                  ) : (
                    <TrashIcon className='h-5 w-5' aria-hidden='true' />
                  )}
                </button>
              </div>
            </div>

            <div className='mt-4 flex flex-wrap items-center gap-2 text-xs font-medium'>
              <span className='rounded-full bg-purple-100 px-3 py-1.5 text-purple-800 dark:bg-purple-950/45 dark:text-purple-200'>
                {watch.isSeeking
                  ? t('offerWatch.requests', 'Dopyty')
                  : t('offerWatch.offers', 'Ponuky')}
              </span>
              <span className='inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-gray-700 dark:bg-gray-900 dark:text-gray-300'>
                <MapPinIcon className='h-4 w-4' aria-hidden='true' />
                {locationLabel}
              </span>
              <span className='rounded-full bg-gray-100 px-3 py-1.5 text-gray-700 dark:bg-gray-900 dark:text-gray-300'>
                {offerWatchPriceLabel(watch, locale, t)}
              </span>
            </div>
          </article>
        );
      })}
    </div>
  );
}
