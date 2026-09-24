'use client';

import { Cog6ToothIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';

type OfferWatchResultsMobileUnavailableProps = {
  onManage: () => void;
};

/** Mobilné vysvetlenie a cesta do správy sledovaní, kým nemajú vlastné výsledky. */
export default function OfferWatchResultsMobileUnavailable({
  onManage,
}: OfferWatchResultsMobileUnavailableProps) {
  const { t } = useLanguage();

  return (
    <section
      aria-labelledby='offer-watch-mobile-unavailable-title'
      className='w-full px-4 py-10'
      data-testid='offer-watch-results-mobile-unavailable'
    >
      <div className='mx-auto max-w-md rounded-2xl border border-gray-200 bg-white px-6 py-10 text-center shadow-sm dark:border-gray-800 dark:bg-[#101011]'>
        <span className='mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'>
          <ComputerDesktopIcon className='h-6 w-6' aria-hidden='true' />
        </span>
        <h1
          id='offer-watch-mobile-unavailable-title'
          className='mt-4 text-xl font-semibold text-gray-900 dark:text-white'
        >
          {t('offerWatchResults.mobileUnavailableTitle', 'Výsledky na mobile pripravujeme')}
        </h1>
        <p className='mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400'>
          {t(
            'offerWatchResults.mobileUnavailableDescription',
            'Výsledky sledovaní sú zatiaľ dostupné vo verzii pre počítač. Svoje sledovania môžeš na mobile naďalej spravovať.',
          )}
        </p>
        <button
          type='button'
          onClick={onManage}
          className='mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:ring-offset-2 dark:focus:ring-offset-[#101011]'
        >
          <Cog6ToothIcon className='h-5 w-5' aria-hidden='true' />
          {t('offerWatchResults.manage', 'Spravovať sledovania')}
        </button>
      </div>
    </section>
  );
}
