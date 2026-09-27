'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

type ViewedUserProfileGateProps = {
  /** Slug je známy a ID sa ešte prekladá. */
  isResolving: boolean;
  /** Preklad zlyhal inak než 404 (sieť, 5xx, 429, timeout). */
  loadError: boolean;
  onRetry?: () => void;
};

/**
 * Profil (`user-profile`), kým ešte nie je známe jeho ID: načítavanie,
 * neexistujúci profil (404), alebo chyba s novým pokusom.
 *
 * Chyba má vlastný stav – kedysi každá chyba okrem 404 nechala
 * „Načítavam profil..." bežať navždy.
 */
export default function ViewedUserProfileGate({
  isResolving,
  loadError,
  onRetry,
}: ViewedUserProfileGateProps) {
  const { t } = useLanguage();

  if (loadError) {
    return (
      <div className="text-center py-20 text-gray-500 dark:text-gray-400" role="alert">
        <p>{t('search.userProfileLoadError', 'Nepodarilo sa načítať profil používateľa.')}</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            data-testid="viewed-user-retry"
            className="mt-4 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
          >
            {t('search.retry', 'Skúsiť znova')}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="text-center py-20 text-gray-500 dark:text-gray-400">
      {isResolving
        ? t('search.loadingUserProfile', 'Načítavam profil...')
        : t('search.userProfileNotFound', 'Profil používateľa sa nepodarilo načítať.')}
    </div>
  );
}
