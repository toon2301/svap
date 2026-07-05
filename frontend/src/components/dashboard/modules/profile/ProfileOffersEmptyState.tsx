'use client';

import { useLanguage } from '@/contexts/LanguageContext';

type ProfileOffersEmptyStateProps = {
  isOwner: boolean;
  onCreate?: () => void;
  className?: string;
};

export function ProfileOffersEmptyState({
  isOwner,
  onCreate,
  className = 'mt-4',
}: ProfileOffersEmptyStateProps) {
  const { t } = useLanguage();
  const rootClassName = [
    className,
    'rounded-2xl border border-dashed border-gray-300 bg-white/60 px-5 py-8 text-center shadow-sm dark:border-gray-800 dark:bg-[#0f0f10]',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClassName}>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
        {isOwner
          ? t('profile.offersEmptyOwnerTitle')
          : t('profile.offersEmptyVisitorTitle')}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-600 dark:text-gray-400">
        {isOwner
          ? t('profile.offersEmptyOwnerBody')
          : t('profile.offersEmptyVisitorBody')}
      </p>
      {isOwner && onCreate && (
        <button
          type="button"
          onClick={onCreate}
          className="mt-5 rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
        >
          {t('profile.skills')}
        </button>
      )}
    </div>
  );
}
