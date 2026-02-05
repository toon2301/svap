'use client';

import React from 'react';
import Link from 'next/link';
import type { Offer } from '../profileOffersTypes';
import { FlipButton } from './FlipButton';

export type OfferCardBackProps = {
  offer: Offer;
  accountType: 'personal' | 'business';
  t: (key: string, defaultValue: string) => string;
  onToggleFlip: () => void;
  onOpenHoursClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  isFlipped: boolean;
};

export function OfferCardBack({ offer, accountType, t, onToggleFlip, onOpenHoursClick, isFlipped }: OfferCardBackProps) {
  return (
    <div className={isFlipped ? 'block' : 'hidden'} style={{ minHeight: '100%' }}>
      <div className="relative aspect-[3/2] rounded-t-2xl border-b border-gray-200/70 dark:border-gray-700/50 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-[#101012] dark:to-[#151518]">
        <div
          className="absolute inset-0 p-4 overflow-y-auto subtle-scrollbar"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(156, 163, 175, 0.2) transparent' }}
        >
          {offer.detailed_description && offer.detailed_description.trim() ? (
            <>
              <div className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide mb-1 text-center">
                {t('skills.description', 'Popis')}
              </div>
              <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words leading-relaxed">
                {offer.detailed_description}
              </p>
            </>
          ) : (
            <div className="h-full flex items-center justify-center">
              <span className="text-[11px] uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
                {t('skills.noDescription', 'Bez popisu')}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="relative">
        <div className="p-3 flex flex-col h-52 border-t border-gray-200 dark:border-gray-700/50 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0f0f10] dark:to-[#151518] overflow-hidden rounded-b-2xl">
          {!offer.is_seeking && (
            <div className="flex-1 flex flex-col justify-start pt-0 xl:pt-0.5">
              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-0 xl:mb-0">
                {t('skills.ratings', 'Hodnotenia')}
              </div>
              <div className="flex items-center gap-3 mb-0 xl:-mb-0.5">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3].map((i) => (
                    <svg key={i} className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                  <div className="relative w-5 h-5">
                    <svg className="w-5 h-5 text-gray-300 dark:text-gray-600 fill-current absolute" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <svg
                      className="w-5 h-5 text-yellow-400 fill-current absolute overflow-hidden"
                      style={{ clipPath: 'inset(0 50% 0 0)' }}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </div>
                  <svg className="w-5 h-5 text-gray-300 dark:text-gray-600 fill-current" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
                <span className="text-base font-bold text-gray-800 dark:text-gray-200">12 645</span>
              </div>

              {accountType === 'business' && (
                <button
                  type="button"
                  onClick={onOpenHoursClick}
                  className="mt-1 lg:mt-0 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-300 focus:outline-none"
                >
                  <span>{t('skills.openingHours.title', 'Otváracie hodiny')}</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                    className="w-4 h-4 text-gray-600 dark:text-gray-400"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              )}

              {typeof offer.id === 'number' && (
                <Link
                  href={`/dashboard/offers/${offer.id}/reviews`}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-0 xl:mt-0.5 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors cursor-pointer"
                >
                  <span>{t('skills.allReviews', 'Všetky recenzie')}</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                    className="w-5 h-5 text-gray-600 dark:text-gray-400"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-9.47 5.227 7.917-3.286-.672ZM12 2.25V4.5m5.834.166-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243-1.59-1.59"
                    />
                  </svg>
                </Link>
              )}
            </div>
          )}

          {offer.is_seeking && (
            <>
              {offer.urgency && offer.urgency.trim() !== '' && (
                <div className="mt-1.5 xl:mt-2 flex itemscenter gap-2">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    {t('skills.urgency', 'Urgentnosť')}:
                  </span>
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
              )}
              {offer.duration_type && offer.duration_type.trim() !== '' && (
                <div className="mt-1.5 xl:mt-2 flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    {t('skills.duration', 'Trvanie')}:
                  </span>
                  <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                    {offer.duration_type === 'one_time'
                      ? t('skills.durationOneTime', 'Jednorazovo')
                      : offer.duration_type === 'long_term'
                        ? t('skills.durationLongTerm', 'Dlhodobo')
                        : t('skills.durationProject', 'Zákazka')}
                  </span>
                </div>
              )}
            </>
          )}

          <div className={`flex items-center gap-1.5 ${offer.is_seeking ? 'mt-8 xl:mt-10' : 'mt-1 xl:mt-1'}`}>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('skills.likes', 'Páči sa mi to')}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4 text-gray-600 dark:text-gray-400"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">3 564</span>
          </div>

          {offer.tags && offer.tags.length > 0 && (
            <div className={`flex flex-wrap gap-1 ${offer.is_seeking ? 'mt-3 xl:mt-4' : 'mt-1 xl:mt-1.5'}`}>
              {offer.tags.map((tag, index) => (
                <span key={index} className="text-xs font-medium text-purple-700 dark:text-purple-300 whitespace-nowrap">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <FlipButton onToggle={onToggleFlip} extraClasses="z-30" />
      </div>
    </div>
  );
}

