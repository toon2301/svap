'use client';

import { ProfileOfferCardSkeleton } from '../../profile/ProfileOfferCardSkeleton';

/** Počiatočný skeleton výsledkovej obrazovky bez falošných interaktívnych prvkov. */
export default function OfferWatchResultsSkeleton({
  label,
}: {
  label: string;
}) {
  return (
    <div
      role='status'
      aria-busy='true'
      data-testid='offer-watch-results-skeleton'
      className='space-y-8'
    >
      <span className='sr-only'>{label}</span>
      <div className='grid grid-cols-1 gap-3 xl:grid-cols-2' aria-hidden='true'>
        {[0, 1].map((index) => (
          <div
            key={index}
            className='animate-pulse rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-[#101011]'
          >
            <div className='h-5 w-48 rounded bg-gray-200 dark:bg-gray-800' />
            <div className='mt-2 h-3 w-28 rounded bg-gray-100 dark:bg-gray-900' />
            <div className='mt-4 h-7 w-52 rounded-full bg-gray-100 dark:bg-gray-900' />
          </div>
        ))}
      </div>
      <div className='grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3' aria-hidden='true'>
        {[0, 1, 2].map((index) => (
          <div key={index} className='space-y-0'>
            <div className='h-14 animate-pulse rounded-t-2xl border border-b-0 border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-900' />
            <ProfileOfferCardSkeleton />
          </div>
        ))}
      </div>
    </div>
  );
}
