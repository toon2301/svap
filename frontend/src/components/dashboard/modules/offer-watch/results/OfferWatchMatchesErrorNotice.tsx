'use client';

import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';

type OfferWatchMatchesErrorNoticeProps = {
  hasMatches: boolean;
  disabled: boolean;
  onRetry: () => void;
  className: string;
};

/** Jednotné upozornenie pre chybu prvej stránky, obnovenia aj stránkovania. */
export default function OfferWatchMatchesErrorNotice({
  hasMatches,
  disabled,
  onRetry,
  className,
}: OfferWatchMatchesErrorNoticeProps) {
  const { t } = useLanguage();

  return (
    <div
      role='alert'
      className={`${className} rounded-2xl border px-5 py-4 ${
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
        onClick={onRetry}
        disabled={disabled}
        className='mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-current px-4 py-2 text-sm font-semibold transition hover:bg-white/60 focus:outline-none focus:ring-2 focus:ring-purple-500/35 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-black/20'
      >
        <ArrowPathIcon className='h-4 w-4' aria-hidden='true' />
        {t('offerWatch.retry', 'Skúsiť znova')}
      </button>
    </div>
  );
}
