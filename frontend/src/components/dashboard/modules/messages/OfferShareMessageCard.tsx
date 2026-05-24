'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { OfferShareBrief } from './types';

export function OfferShareMessageCard({
  offer,
  outgoing,
}: {
  offer: OfferShareBrief | null;
  outgoing: boolean;
}) {
  const { t } = useLanguage();

  if (!offer) {
    return (
      <div className="min-w-56 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 dark:border-gray-800 dark:bg-black dark:text-gray-300">
        {t('messages.offerShareUnavailable', 'Offer is no longer available.')}
      </div>
    );
  }

  const title = offer.title || t('messages.offerShareCardTitle', 'Shared offer');
  const ownerIdentifier = (offer.owner?.slug || '').trim() || String(offer.owner?.id || '');

  const openOffer = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (typeof window === 'undefined' || !ownerIdentifier) return;
    window.dispatchEvent(
      new CustomEvent('goToUserProfile', {
        detail: { identifier: ownerIdentifier, offerId: offer.id },
      }),
    );
  };

  return (
    <button
      type="button"
      onClick={openOffer}
      className={[
        'flex w-full min-w-56 max-w-80 items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors focus:outline-none focus:ring-2',
        outgoing
          ? 'border-purple-200 bg-white text-gray-900 hover:bg-purple-50 focus:ring-purple-300 dark:border-purple-800/50 dark:bg-[#141416] dark:text-white dark:hover:bg-[#1a1a1d]'
          : 'border-gray-200 bg-white text-gray-900 hover:bg-gray-50 focus:ring-purple-300 dark:border-gray-800 dark:bg-black dark:text-white dark:hover:bg-gray-950',
      ].join(' ')}
      aria-label={t('messages.offerShareOpenOffer', 'Open offer')}
    >
      <span className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gray-100 text-gray-500 dark:bg-gray-900 dark:text-gray-400">
        {offer.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={offer.image_url} alt={title} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-[10px] font-bold uppercase">
            {t('messages.offerShareImageFallback', 'Offer')}
          </span>
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{title}</span>
        {offer.location ? (
          <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
            {offer.location}
          </span>
        ) : null}
        <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
          {t('messages.offerShareCardTitle', 'Shared offer')}
        </span>
      </span>
    </button>
  );
}
