'use client';

import React from 'react';
import { PlusIcon, ClockIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Offer } from '../profile/profileOffersTypes';
import OfferImageCarousel from '../shared/OfferImageCarousel';
import ReviewCard, { type Review } from './ReviewCard';
import ReviewSummary from './ReviewSummary';

type OfferOwnerLike = {
  id?: number;
  display_name?: string | null;
  slug?: string | null;
  company_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
};

type OfferDetailLike = Offer & {
  owner?: OfferOwnerLike | null;
  user_display_name?: string | null;
  user_id?: number | null;
  owner_user_type?: 'individual' | 'company' | null;
};

export type OfferReviewsDesktopProps = {
  offer: OfferDetailLike | null;
  loading: boolean;
  reviews: Review[];
  reviewsLoading: boolean;
  isOwnOffer: boolean;
  isBusinessOwner: boolean;
  /** false ak používateľ už pridal recenziu – tlačidlo Pridať recenziu sa nezobrazí */
  canAddReview: boolean;
  displayName: string;
  imageAlt: string;
  locationText: string | null;
  experienceText: string | null;
  priceLabel: string | null;
  headingText: string;
  todayHoursText: string | null;
  currentUserId: number | null;
  onAddReviewClick: () => void;
  onEditReview: (review: Review) => void;
  onDeleteReviewClick: (reviewId: number) => void;
  onOpenHoursClick: () => void;
};

export function OfferReviewsDesktop({
  offer,
  loading,
  reviews,
  reviewsLoading,
  isOwnOffer,
  isBusinessOwner,
  canAddReview,
  displayName,
  imageAlt,
  locationText,
  experienceText,
  priceLabel,
  headingText,
  todayHoursText,
  currentUserId,
  onAddReviewClick,
  onEditReview,
  onDeleteReviewClick,
  onOpenHoursClick,
}: OfferReviewsDesktopProps) {
  const { t } = useLanguage();

  return (
    <div className="w-full h-full pt-6 pr-6 pb-6 pl-12 sm:pl-16 lg:pl-24">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white text-left mb-8">
        {headingText}
      </h1>

      {/* Fotka, údaje a rating summary */}
      <div className="flex flex-col sm:flex-row lg:flex-row gap-4 sm:gap-6 lg:gap-8 items-start">
        {/* Fotka - zachovaná šírka */}
        <div className="w-full max-w-[400px] sm:w-[400px] shrink-0">
          <div className="relative w-full h-[440px] rounded-xl overflow-hidden bg-gray-100 dark:bg-[#141415] border border-gray-200 dark:border-gray-800">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-[#141415]">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <OfferImageCarousel images={offer?.images ?? []} alt={imageAlt} intervalMs={4000} />
            )}
          </div>
          <hr className="mt-6 mb-0 border-0 h-px bg-gradient-to-r from-transparent via-purple-300 dark:via-purple-600 to-transparent" />
          {canAddReview && (
            <button
              type="button"
              onClick={onAddReviewClick}
              className="mt-6 flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg border-2 border-dashed border-purple-400 dark:border-purple-500 bg-transparent text-purple-700 dark:text-purple-300 font-medium text-sm hover:border-purple-500 hover:bg-purple-50/80 dark:hover:bg-purple-900/20 transition-colors"
            >
              <PlusIcon className="w-5 h-5 shrink-0" aria-hidden />
              {t('reviews.addReview', 'Pridať recenziu')}
            </button>
          )}
        </div>

        {/* Údaje - rozšírený na širku */}
        <div className="min-w-0 flex-[2] sm:min-w-[400px] lg:min-w-[500px] overflow-hidden">
          <div className="pt-4 pr-5 pb-3 pl-0 space-y-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-medium uppercase tracking-wider text-purple-600 dark:text-purple-400">
                {isBusinessOwner ? t('reviews.nameOrTitle', 'Názov/Meno') : t('reviews.name', 'Meno')}
              </span>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">{displayName}</span>
            </div>
            <div className="h-px bg-gray-200 dark:bg-gray-600/80" />
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('reviews.shortDescription', 'Krátky popis')}
              </span>
              <span className="text-sm text-gray-700 dark:text-gray-300 leading-snug">
                {offer?.description?.trim() || '—'}
              </span>
            </div>
            <div className="h-px bg-gray-200 dark:bg-gray-600/80" />
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('reviews.location', 'Miesto')}
              </span>
              <span className="text-base font-semibold text-gray-900 dark:text-white">{locationText || '—'}</span>
            </div>
            <div className="h-px bg-gray-200 dark:bg-gray-600/80" />
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('reviews.experience', 'Prax')}
              </span>
              <span className="text-base font-semibold text-gray-900 dark:text-white">{experienceText || '—'}</span>
            </div>
            <div className="h-px bg-gray-200 dark:bg-gray-600/80" />
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('reviews.priceFrom', 'Cena od')}
              </span>
              <span className="text-base font-semibold text-gray-900 dark:text-white">{priceLabel || '—'}</span>
            </div>
            {isBusinessOwner && (
              <>
                <div className="h-px bg-gray-200 dark:bg-gray-600/80" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {t('reviews.openingHoursToday', 'Otváracie hodiny dnes')}
                  </span>
                  <div className="flex items-center gap-2">
                    {todayHoursText ? (
                      <span className="text-base font-semibold text-gray-900 dark:text-white tabular-nums">{todayHoursText}</span>
                    ) : (
                      <span className="text-base font-semibold text-gray-600 dark:text-gray-400">
                        {t('reviews.closedToday', 'Neaktívny / zatvorené')}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={onOpenHoursClick}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-purple-600 hover:bg-purple-50 dark:text-gray-400 dark:hover:text-purple-400 dark:hover:bg-purple-900/20 transition-colors"
                      aria-label={t('skills.openingHours.title', 'Otváracie hodiny')}
                    >
                      <ClockIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Vertikálna čiara medzi údajmi a hodnotením */}
        <div
          className="hidden sm:block w-px shrink-0 bg-gradient-to-b from-transparent via-gray-300 dark:via-gray-600 to-transparent self-stretch"
          aria-hidden
        />

        {/* Rating Summary - pridá sa do voľného priestoru napravo */}
        <div className="w-full lg:w-auto lg:min-w-[300px] lg:max-w-[350px] shrink-0">
          <ReviewSummary reviews={reviews} />
        </div>
      </div>

      {/* Zoznam recenzií */}
      <div className="mt-8 pr-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {t('reviews.reviews', 'Recenzie')} ({reviews.length})
        </h2>
        {reviewsLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {t('reviews.noReviews', 'Zatiaľ nie sú žiadne recenzie.')}
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                currentUserId={currentUserId}
                onEdit={onEditReview}
                onDeleteClick={onDeleteReviewClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
