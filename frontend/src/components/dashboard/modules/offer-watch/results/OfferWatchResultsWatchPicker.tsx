'use client';

import { MapPinIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import type { OfferWatch } from '../types';
import {
  offerWatchCategoryLabel,
  offerWatchCountryLabel,
  offerWatchPriceLabel,
  offerWatchSubcategoryLabel,
} from '../settings/offerWatchUi';

type OfferWatchResultsWatchPickerProps = {
  watches: OfferWatch[];
  selectedWatchId: number;
  onSelect: (watchId: number) => void;
};

/** Zobrazuje malý, explicitný výber jedného z uložených sledovaní. */
export default function OfferWatchResultsWatchPicker({
  watches,
  selectedWatchId,
  onSelect,
}: OfferWatchResultsWatchPickerProps) {
  const { locale, t } = useLanguage();

  return (
    <section aria-labelledby='offer-watch-results-selector-title'>
      <h2
        id='offer-watch-results-selector-title'
        className='mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300'
      >
        {t('offerWatchResults.selectLabel', 'Vyber sledovanie')}
      </h2>
      <div className='grid grid-cols-1 gap-3 xl:grid-cols-2'>
        {watches.map((watch) => {
          const selected = watch.id === selectedWatchId;
          const country = offerWatchCountryLabel(locale, watch.countryCode);
          const location = watch.districtLabel
            ? `${watch.districtLabel}, ${country}`
            : country;
          const subcategory = offerWatchSubcategoryLabel(
            t,
            watch.category,
            watch.subcategory,
          );

          return (
            <button
              key={watch.id}
              type='button'
              aria-pressed={selected}
              onClick={() => onSelect(watch.id)}
              className={`min-w-0 rounded-2xl border p-4 text-left shadow-sm transition focus:outline-none focus:ring-2 focus:ring-purple-500/40 ${
                selected
                  ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-500/20 dark:border-purple-500 dark:bg-purple-950/25'
                  : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/40 dark:border-gray-800 dark:bg-[#101011] dark:hover:border-purple-800 dark:hover:bg-purple-950/10'
              }`}
            >
              <span className='block truncate text-base font-semibold text-gray-900 dark:text-white'>
                {subcategory}
              </span>
              <span className='mt-0.5 block truncate text-sm text-gray-500 dark:text-gray-400'>
                {offerWatchCategoryLabel(t, watch.category)}
              </span>
              <span className='mt-3 flex flex-wrap items-center gap-2 text-xs font-medium'>
                <span className='rounded-full bg-purple-100 px-2.5 py-1 text-purple-800 dark:bg-purple-950/50 dark:text-purple-200'>
                  {watch.isSeeking
                    ? t('offerWatch.requests', 'Dopyty')
                    : t('offerWatch.offers', 'Ponuky')}
                </span>
                <span className='inline-flex min-w-0 items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-gray-700 dark:bg-gray-900 dark:text-gray-300'>
                  <MapPinIcon className='h-3.5 w-3.5 shrink-0' aria-hidden='true' />
                  <span className='truncate'>{location}</span>
                </span>
                <span className='rounded-full bg-gray-100 px-2.5 py-1 text-gray-700 dark:bg-gray-900 dark:text-gray-300'>
                  {offerWatchPriceLabel(watch, locale, t)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
