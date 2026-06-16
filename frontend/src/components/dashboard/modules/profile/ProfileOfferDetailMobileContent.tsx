'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Offer } from './profileOffersTypes';
import { HOURS_DAYS } from './profileOffersTypes';
import type { OpeningHours } from '../skills/skillDescriptionModal/types';

type ProfileOfferDetailMobileContentProps = {
  offer: Offer;
  accountType: 'personal' | 'business';
  onShowHours: (hours: OpeningHours) => void;
};

export function ProfileOfferDetailMobileContent({
  offer,
  accountType,
  onShowHours,
}: ProfileOfferDetailMobileContentProps) {
  const { locale, t } = useLanguage();

  const reviewsCount = Number(offer.reviews_count ?? 0);
  const averageRating = Number(offer.average_rating ?? 0);
  const likesCount = Math.max(0, Number(offer.likes_count ?? 0));
  const formattedLikesCount = new Intl.NumberFormat(locale).format(likesCount);
  const isLiked = offer.is_liked_by_me === true;

  const hasAnyOpeningHours =
    offer.opening_hours &&
    HOURS_DAYS.some((d) => {
      const data = offer.opening_hours?.[d.key];
      return data && (data as { enabled?: boolean }).enabled;
    });

  return (
    <div className="px-4 pb-5 pt-3 space-y-4">
      <div className="space-y-1 pb-4 border-b border-gray-200 dark:border-gray-800">
        {offer.detailed_description && offer.detailed_description.trim() ? (
          <div className="max-h-[277px] overflow-y-auto subtle-scrollbar">
            <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
              {offer.detailed_description}
            </p>
          </div>
        ) : (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t(
              'skills.detailedDescriptionEmpty',
              'Zatiaľ nemáš pridaný podrobný opis tejto služby.',
            )}
          </p>
        )}
      </div>

      {accountType === 'business' && offer.opening_hours && (
        <div className="space-y-1">
          <button
            type="button"
            disabled={!hasAnyOpeningHours}
            onClick={() => {
              if (hasAnyOpeningHours && offer.opening_hours) {
                onShowHours(offer.opening_hours);
              }
            }}
            className="flex items-center gap-2 disabled:opacity-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-4 h-4 text-gray-600 dark:text-gray-400"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide">
              {t('skills.openingHours.title', 'Otváracie hodiny')}
            </div>
          </button>
        </div>
      )}

      {offer.tags && offer.tags.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide">
            {t('skills.tags', 'Tagy')}
          </div>
          <div className="flex flex-wrap gap-1.5 -gap-y-1">
            {offer.tags.map((tag, index) => (
              <span
                key={`${tag}-${index}`}
                className="px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/20 text-[11px] font-medium text-purple-700 dark:text-purple-300"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {offer.is_seeking && (
        <>
          {offer.urgency && offer.urgency.trim() !== '' && (
            <div className="space-y-1">
              <div className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide">
                {t('skills.urgency', 'Urgentnosť')}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold ${
                    offer.urgency === 'low'
                      ? 'text-green-600 dark:text-green-400'
                      : offer.urgency === 'medium'
                        ? 'text-orange-600 dark:text-orange-400'
                        : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {offer.urgency === 'low'
                    ? t('skills.urgencyLow', 'Nízka')
                    : offer.urgency === 'medium'
                      ? t('skills.urgencyMedium', 'Stredná')
                      : t('skills.urgencyHigh', 'Vysoká')}
                </span>
              </div>
            </div>
          )}
          {offer.duration_type && offer.duration_type.trim() !== '' && (
            <div className="space-y-1">
              <div className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide">
                {t('skills.duration', 'Trvanie')}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                  {offer.duration_type === 'one_time'
                    ? t('skills.durationOneTime', 'Jednorazovo')
                    : offer.duration_type === 'long_term'
                      ? t('skills.durationLongTerm', 'Dlhodobo')
                      : t('skills.durationProject', 'Zákazka')}
                </span>
              </div>
            </div>
          )}
        </>
      )}

      <div className="space-y-1 pt-1 border-t border-dashed border-gray-200 dark:border-gray-700/60">
        {!offer.is_seeking && (
          <>
            <div className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide">
              {t('skills.ratings', 'Hodnotenia')}
            </div>
            {reviewsCount > 0 ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => {
                    const fillPct = averageRating >= i ? 100 : averageRating >= i - 0.5 ? 50 : 0;
                    return (
                      <span key={i} className="relative inline-block w-4 h-4">
                        <svg
                          className="w-4 h-4 text-gray-300 dark:text-gray-600 fill-current absolute"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <svg
                          className="w-4 h-4 text-yellow-400 fill-current absolute overflow-hidden"
                          style={{ clipPath: `inset(0 ${100 - fillPct}% 0 0)` }}
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </span>
                    );
                  })}
                </div>
                <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                  {averageRating.toFixed(1)} ({reviewsCount.toLocaleString(locale)})
                </span>
              </div>
            ) : (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {t('reviews.noReviews', 'Zatiaľ bez recenzií.')}
              </span>
            )}
          </>
        )}

        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            {t('skills.likes', 'Páči sa mi to')}
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill={isLiked ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4 text-gray-600 dark:text-gray-400"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {formattedLikesCount}
          </span>
        </div>
      </div>
    </div>
  );
}
