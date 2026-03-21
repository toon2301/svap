'use client';

import React from 'react';
import { BanknotesIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline';

import ProfileOfferCard from '@/components/dashboard/modules/profile/ProfileOfferCard';
import { FilterChips } from '@/components/search/FilterChips';
import { SearchResultSkeleton } from '@/components/search/SearchResultSkeleton';
import SearchFilterSelect from '@/components/search/SearchFilterSelect';
import type { Offer } from '@/components/dashboard/modules/profile/profileOffersTypes';

export function SearchOffersTab({
  t,
  trimmedQ,
  loading,
  results,
  flippedCards,
  onToggleFlip,
  minRating,
  onMinRatingChange,
  priceMin,
  onPriceMinChange,
  priceMax,
  onPriceMaxChange,
  offerType,
  onOfferTypeChange,
  hasActiveFilters,
  onClearAllFilters,
  page,
  totalPages,
  onPageChange,
}: {
  t: (key: string, defaultValue?: string) => string;
  trimmedQ: string;
  loading: boolean;
  results: Offer[];
  flippedCards: Set<string>;
  onToggleFlip: (cardId: string) => void;
  minRating: number | null;
  onMinRatingChange: (next: number | null) => void;
  priceMin: string;
  onPriceMinChange: (next: string) => void;
  priceMax: string;
  onPriceMaxChange: (next: string) => void;
  offerType: 'all' | 'offer' | 'seeking';
  onOfferTypeChange: (next: 'all' | 'offer' | 'seeking') => void;
  hasActiveFilters: boolean;
  onClearAllFilters: () => void;
  page: number;
  totalPages: number;
  onPageChange: (next: number) => void;
}) {
  return (
    <>
      <FilterChips />

      {/* Desktop: filtre vedľa seba v jednom riadku */}
      <div className="hidden lg:flex flex-wrap items-end gap-4 mb-6">
        <div className="min-w-[140px]">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            {t('search.ratingLabel', 'Hodnotenie')}
          </label>
          <SearchFilterSelect
            value={minRating != null ? String(minRating) : ''}
            options={[
              { value: '', label: t('search.offerTypeAll', 'Všetko') },
              { value: '4', label: '4+' },
              { value: '3', label: '3+' },
              { value: '2', label: '2+' },
            ]}
            onChange={(v) => onMinRatingChange(v ? Number(v) : null)}
          />
        </div>

        <div className="min-w-[180px]">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
            <BanknotesIcon className="w-3.5 h-3.5" />
            {t('search.priceTitle', 'Cena')}
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder={t('search.priceMin', 'Od')}
              value={priceMin}
              onChange={(e) => onPriceMinChange(e.target.value)}
              className="w-full px-2 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
            />
            <input
              type="number"
              placeholder={t('search.priceMax', 'Do')}
              value={priceMax}
              onChange={(e) => onPriceMaxChange(e.target.value)}
              className="w-full px-2 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>

        <div className="min-w-[140px]">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
            <ArrowsRightLeftIcon className="w-3.5 h-3.5" />
            {t('search.offerTypeTitle', 'Typ ponuky')}
          </label>
          <SearchFilterSelect
            value={offerType}
            options={[
              { value: 'all', label: t('search.offerTypeAll', 'Všetko') },
              { value: 'offer', label: t('search.offerTypeOffer', 'Ponúkam') },
              { value: 'seeking', label: t('search.offerTypeSeeking', 'Hľadám') },
            ]}
            onChange={(v) => onOfferTypeChange(v as 'all' | 'offer' | 'seeking')}
          />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        <main className="flex-1 min-w-0">
          {loading && results.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-[clamp(1rem,2vw,1.5rem)]">
              {Array.from({ length: 8 }, (_, i) => (
                <SearchResultSkeleton key={i} />
              ))}
            </div>
          ) : results.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <p className="text-base font-medium text-gray-900 dark:text-white mb-2">
                {trimmedQ
                  ? t('search.emptyNoResults', 'Žiadne výsledky pre „{{q}}"').replace('{{q}}', trimmedQ)
                  : t('search.emptyEnterQuery', 'Zadajte výraz do vyhľadávacieho poľa.')}
              </p>
              {trimmedQ && (
                <>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    {t('search.emptyTry', 'Skús:')}
                  </p>
                  <ul className="text-sm text-gray-600 dark:text-gray-300 text-left list-disc list-inside space-y-1 mb-6">
                    <li>{t('search.emptyTryRemoveFilters', 'odstrániť filtre')}</li>
                    <li>{t('search.emptyTryShorterQuery', 'použiť kratší výraz')}</li>
                    <li>{t('search.emptyTryChangePrice', 'zmeniť cenu')}</li>
                  </ul>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={onClearAllFilters}
                      className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      {t('search.clearFilters', 'Vymazať filtre')}
                    </button>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-[clamp(1rem,2vw,1.5rem)]">
              {results.map((offer) => {
                const cardId =
                  offer.id != null
                    ? String(offer.id)
                    : `${offer.category || 'cat'}-${offer.subcategory || 'sub'}-${offer.description || 'desc'}`;
                const isFlipped = flippedCards.has(cardId);
                const ext = offer as Offer & { user_display_name?: string; owner_user_type?: string };
                const ownerDisplayName = typeof ext.user_display_name === 'string' ? ext.user_display_name : '';

                return (
                  <div key={offer.id} className="relative group">
                    <ProfileOfferCard
                      offer={offer}
                      accountType={ext.owner_user_type === 'company' ? 'business' : 'personal'}
                      t={t}
                      isFlipped={isFlipped}
                      onToggleFlip={() => onToggleFlip(cardId)}
                      isOtherUserProfile={true}
                      ownerDisplayName={ownerDisplayName || undefined}
                      onRequestClick={undefined}
                      onMessageClick={undefined}
                      requestLabel={undefined}
                      isRequestDisabled={false}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => onPageChange(Math.max(1, page - 1))}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('search.paginationPrevious', 'Predošlá')}
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                <button
                  key={number}
                  type="button"
                  onClick={() => onPageChange(number)}
                  className={`px-3 py-1.5 text-sm rounded-lg border ${
                    page === number
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900'
                  }`}
                >
                  {number}
                </button>
              ))}
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('search.paginationNext', 'Ďalšia')}
              </button>
            </div>
          )}
        </main>
      </div>
    </>
  );
}

