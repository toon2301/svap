'use client';

import type { ReactNode, RefObject } from 'react';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';

export const OFFER_WATCH_MOBILE_TITLE_ID = 'offer-watch-mobile-title';

type OfferWatchMobileShellProps = {
  title: string;
  onBack: () => void;
  backDisabled?: boolean;
  initialFocusRef?: RefObject<HTMLButtonElement>;
  contentRef?: RefObject<HTMLDivElement>;
  contentScrollable?: boolean;
  children: ReactNode;
};

export default function OfferWatchMobileShell({
  title,
  onBack,
  backDisabled = false,
  initialFocusRef,
  contentRef,
  contentScrollable = true,
  children,
}: OfferWatchMobileShellProps) {
  const { t } = useLanguage();

  return (
    <div className='flex h-full min-h-0 flex-col bg-white text-gray-900 dark:bg-black dark:text-white'>
      <header className='grid h-12 shrink-0 grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center border-b border-gray-200 px-2 dark:border-gray-800'>
        <button
          ref={initialFocusRef}
          type='button'
          onClick={onBack}
          disabled={backDisabled}
          aria-label={t('common.back', 'Späť')}
          className='inline-flex h-11 w-11 items-center justify-center rounded-xl text-gray-700 transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-400/40 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-200 dark:hover:bg-gray-900'
        >
          <ChevronLeftIcon className='h-6 w-6' aria-hidden='true' />
        </button>
        <h1
          id={OFFER_WATCH_MOBILE_TITLE_ID}
          className='min-w-0 truncate px-2 text-center text-lg font-semibold'
        >
          {title}
        </h1>
        <span aria-hidden='true' />
      </header>
      <div ref={contentRef} className={`min-h-0 flex-1 ${
        contentScrollable
          ? 'overflow-y-auto overscroll-contain elegant-scrollbar'
          : 'overflow-hidden'
      }`}>
        {children}
      </div>
    </div>
  );
}
