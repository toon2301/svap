'use client';

import { OfferWatchListSkeleton } from './OfferWatchSavedList';

type OfferWatchSettingsSkeletonProps = {
  loadingLabel: string;
};

export default function OfferWatchSettingsSkeleton({
  loadingLabel,
}: OfferWatchSettingsSkeletonProps) {
  return (
    <div
      role='status'
      aria-live='polite'
      aria-busy='true'
      data-testid='offer-watch-settings-skeleton'
    >
      <span className='sr-only'>{loadingLabel}</span>

      <section
        className='rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-[#101011] sm:p-6'
        aria-hidden='true'
        data-testid='offer-watch-form-skeleton'
      >
        <div className='animate-pulse space-y-5'>
          <div>
            <div className='mb-2 h-4 w-28 rounded bg-gray-200 dark:bg-gray-800' />
            <div className='h-11 w-full rounded-xl bg-gray-100 dark:bg-gray-900' />
            <div className='mt-2 h-3 w-72 max-w-full rounded bg-gray-100 dark:bg-gray-900' />
          </div>

          <div>
            <div className='mb-2 h-4 w-20 rounded bg-gray-200 dark:bg-gray-800' />
            <div className='grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1 dark:bg-gray-900'>
              <div className='h-10 rounded-lg bg-white dark:bg-[#1b1b1e]' />
              <div className='h-10 rounded-lg bg-gray-200/70 dark:bg-gray-800/70' />
            </div>
          </div>

          <div className='grid gap-4 md:grid-cols-2'>
            {[0, 1].map((index) => (
              <div key={index}>
                <div className='mb-2 h-4 w-24 rounded bg-gray-200 dark:bg-gray-800' />
                <div className='h-11 w-full rounded-xl bg-gray-100 dark:bg-gray-900' />
              </div>
            ))}
          </div>

          <div>
            <div className='mb-2 h-4 w-32 rounded bg-gray-200 dark:bg-gray-800' />
            <div className='grid gap-3 md:grid-cols-[1fr_1fr_120px]'>
              {[0, 1, 2].map((index) => (
                <div key={index} className='h-11 rounded-xl bg-gray-100 dark:bg-gray-900' />
              ))}
            </div>
          </div>

          <div className='flex justify-end pt-1'>
            <div className='h-11 w-40 rounded-xl bg-purple-200 dark:bg-purple-900/50' />
          </div>
        </div>
      </section>

      <section className='mt-8' aria-hidden='true'>
        <div className='mb-4 flex items-center justify-between gap-4'>
          <div className='h-6 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-800' />
          <div className='h-7 w-14 animate-pulse rounded-full bg-gray-100 dark:bg-gray-900' />
        </div>
        <OfferWatchListSkeleton />
      </section>
    </div>
  );
}
