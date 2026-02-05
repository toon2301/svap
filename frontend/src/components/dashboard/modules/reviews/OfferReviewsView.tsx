'use client';

import React from 'react';

export type OfferReviewsViewProps = {
  /** ID karty (ponuky) z URL. null = neplatné/nezistené ID (fallback). */
  offerId: number | null;
};

export default function OfferReviewsView({ offerId: _offerId }: OfferReviewsViewProps) {
  return (
    <div className="w-full h-full p-6">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Recenzie</h1>
    </div>
  );
}

