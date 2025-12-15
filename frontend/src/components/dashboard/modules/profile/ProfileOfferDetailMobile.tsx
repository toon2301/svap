'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Offer } from './profileOffersTypes';
import { HOURS_DAYS, slugifyLabel } from './profileOffersTypes';
import type { OpeningHours } from '../skills/skillDescriptionModal/types';

interface ProfileOfferDetailMobileProps {
  offer: Offer | null;
  accountType: 'personal' | 'business';
  onClose: () => void;
  onShowHours: (hours: OpeningHours) => void;
}

export function ProfileOfferDetailMobile({
  offer,
  accountType,
  onClose,
  onShowHours,
}: ProfileOfferDetailMobileProps) {
  const { t } = useLanguage();

  if (!offer || typeof document === 'undefined') {
    return null;
  }

  const catSlug = offer.category ? slugifyLabel(offer.category) : '';
  const subSlug = offer.subcategory ? slugifyLabel(offer.subcategory) : '';
  const translatedLabel =
    offer.subcategory && catSlug && subSlug
      ? t(`skillsCatalog.subcategories.${catSlug}.${subSlug}`, offer.subcategory)
      : offer.category && catSlug
        ? t(`skillsCatalog.categories.${catSlug}`, offer.category)
        : offer.subcategory || offer.category || '';

  const headline =
    (offer.description && offer.description.trim()) ||
    translatedLabel ||
    t('skills.noDescription', 'Bez popisu');

  const priceLabel =
    offer.price_from !== null && offer.price_from !== undefined
      ? `${Number(offer.price_from).toLocaleString('sk-SK', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        })} ${offer.price_currency || '€'}`
      : null;

  const locationText = offer.location && offer.location.trim();
  const districtText = offer.district && offer.district.trim();
  const displayLocationText = locationText || districtText || null;

  const hasAnyOpeningHours =
    offer.opening_hours &&
    HOURS_DAYS.some((d) => {
      const data = offer.opening_hours?.[d.key];
      return data && (data as any).enabled;
    });

  const body = (
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/40"
        onClick={onClose}
      />
      <div
        className="fixed inset-x-0 bottom-0 top-10 z-[61] rounded-t-3xl bg-[var(--background)] text-[var(--foreground)] shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-3 pb-2 border-b border-gray-200 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.back', 'Späť')}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5 8.25 12l7.5-7.5"
              />
            </svg>
          </button>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide">
              {t('skills.description', 'Popis')}
            </div>
          </div>
          {accountType === 'business' && (
            <span className="ml-1 px-2 py-0.5 text-[10px] font-semibold bg-purple-100 text-purple-700 rounded-full">
              PRO
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto subtle-scrollbar">
          <div className="px-4 pt-3 pb-5 space-y-4">
            {/* Detailed description */}
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

            {/* Opening hours */}
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

            {/* Tags */}
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

            {/* Urgency and Duration for "Hľadám" cards */}
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

            {/* Social / ratings (statické placeholdery ako na desktope) */}
            <div className="space-y-1 pt-1 border-t border-dashed border-gray-200 dark:border-gray-700/60">
              {/* Hodnotenia len pre Ponúkam */}
              {!offer.is_seeking && (
                <>
                  <div className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide">
                    {t('skills.ratings', 'Hodnotenia')}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3].map((i) => (
                        <svg
                          key={i}
                          className="w-4 h-4 text-yellow-400 fill-current"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                      <div className="relative w-4 h-4">
                        <svg
                          className="w-4 h-4 text-gray-300 dark:text-gray-600 fill-current absolute"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <svg
                          className="w-4 h-4 text-yellow-400 fill-current absolute overflow-hidden"
                          style={{ clipPath: 'inset(0 50% 0 0)' }}
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </div>
                      <svg
                        className="w-4 h-4 text-gray-300 dark:text-gray-600 fill-current"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </div>
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                      12 645
                    </span>
                  </div>
                </>
              )}

              {/* Páči sa mi to – vždy, aj pre Hľadám */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {t('skills.likes', 'Páči sa mi to')}
                </span>
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
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  3 564
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(body, document.getElementById('app-root') ?? document.body);
}


