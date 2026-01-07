'use client';

import React from 'react';
import OfferImageCarousel from '../shared/OfferImageCarousel';
import type { Offer } from './profileOffersTypes';
import { slugifyLabel } from './profileOffersTypes';

interface ProfileOfferCardProps {
  offer: Offer;
  accountType: 'personal' | 'business';
  t: (key: string, defaultValue: string) => string;
  isFlipped: boolean;
  onToggleFlip: () => void;
  onOpenHoursClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  isHighlighted?: boolean;
}

interface FlipButtonProps {
  onToggle: () => void;
  extraClasses?: string;
}

function FlipButton({ onToggle, extraClasses = '' }: FlipButtonProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-label="Otočiť"
      title="Otočiť"
      className={`absolute -top-2.5 -right-3 -translate-y-1/2 p-1 rounded-full bg-purple-50 dark:bg-purple-900/80 dark:backdrop-blur-sm border border-purple-200 dark:border-purple-800/60 text-purple-700 dark:text-white hover:bg-purple-100 dark:hover:bg-purple-900/90 transition-colors z-40 filter-modal-flip-button ${extraClasses}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="1.5"
        stroke="currentColor"
        className="w-3 h-3"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
        />
      </svg>
    </button>
  );
}

export default function ProfileOfferCard({
  offer,
  accountType,
  t,
  isFlipped,
  onToggleFlip,
  onOpenHoursClick,
  isHighlighted = false,
}: ProfileOfferCardProps) {
  const catSlug = offer.category ? slugifyLabel(offer.category) : '';
  const subSlug = offer.subcategory ? slugifyLabel(offer.subcategory) : '';

  const translatedLabel =
    offer.subcategory && catSlug && subSlug
      ? t(`skillsCatalog.subcategories.${catSlug}.${subSlug}`, offer.subcategory)
      : offer.category && catSlug
        ? t(`skillsCatalog.categories.${catSlug}`, offer.category)
        : offer.subcategory || offer.category || '';

  const imageAlt =
    (offer.description && offer.description.trim()) ||
    translatedLabel ||
    t('skills.offer', 'Ponúkam');

  const headline =
    (offer.description && offer.description.trim()) ||
    translatedLabel ||
    t('skills.noDescription', 'Bez popisu');

  const label = translatedLabel;

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

  const imageCount = offer.images?.filter((img) => img?.image_url || img?.image).length || 0;
  const hasMultipleImages = imageCount > 1;

  return (
    <div
      className={`rounded-2xl overflow-visible border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-[#0f0f10] shadow-sm hover:shadow transition-shadow ${
        isHighlighted ? 'highlight-offer-card' : ''
      }`}
    >
      {/* Veľký text "Ponúkam" alebo "Hľadám" uprostred celej karty - cez foto aj obsah - len na prednej strane */}
      {!isFlipped && (
        <div className="absolute left-0 right-0 top-[52.5%] -translate-y-1/2 pointer-events-none z-30 group-hover:opacity-0 group-hover:scale-90 transition-all duration-300">
          <div className="w-full py-1 border border-transparent rounded-none bg-white/80 dark:bg-[#0f0f10]/80 backdrop-blur-sm shadow-lg">
            <p className="text-xl md:text-2xl font-black text-gray-800 dark:text-gray-100 uppercase tracking-[0.2em] leading-tight text-center">
              {offer.is_seeking ? t('skills.search', 'Hľadám') : t('skills.offering', 'Ponúkam')}
            </p>
          </div>
        </div>
      )}
      <div className={isFlipped ? 'hidden' : 'block'}>
        <div className="relative aspect-[3/2] bg-gray-100 dark:bg-[#0e0e0f] overflow-hidden rounded-t-2xl">
          <OfferImageCarousel images={offer.images} alt={imageAlt} />
          {accountType === 'business' && (
            <span className="absolute top-2 left-2 px-1.5 py-0.5 text-[10px] font-semibold bg-black/80 text-white rounded">
              PRO
            </span>
          )}
          {hasMultipleImages && (
            <div className="absolute bottom-2 right-2 px-2 py-1 rounded-full bg-black/40 backdrop-blur-sm text-white/90 text-[10px] font-medium flex items-center gap-1">
              <svg
                className="w-3 h-3 opacity-80"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span>{imageCount}</span>
            </div>
          )}
          <div className="absolute top-2 right-2 flex flex-col gap-0.5">
            <button
              aria-label="Páči sa mi to"
              title="Páči sa mi to"
              className="p-1 rounded-full bg-purple-50 dark:bg-purple-900/80 dark:backdrop-blur-sm border border-purple-200 dark:border-purple-800/60 text-purple-700 dark:text-white hover:bg-purple-100 dark:hover:bg-purple-900/90 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-3 h-3"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
            <button
              aria-label="Zdieľať"
              title="Zdieľať"
              className="p-1 rounded-full bg-purple-50 dark:bg-purple-900/80 dark:backdrop-blur-sm border border-purple-200 dark:border-purple-800/60 text-purple-700 dark:text-white hover:bg-purple-100 dark:hover:bg-purple-900/90 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-3 h-3"
              >
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
            </button>
            <button
              aria-label="Komentovať"
              title="Komentovať"
              className="p-1 rounded-full bg-purple-50 dark:bg-purple-900/80 dark:backdrop-blur-sm border border-purple-200 dark:border-purple-800/60 text-purple-700 dark:text-white hover:bg-purple-100 dark:hover:bg-purple-900/90 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-3 h-3"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
                />
              </svg>
            </button>
            {!offer.is_seeking && (
              <button
                aria-label="Pridať recenziu"
                title="Pridať recenziu"
                className="p-1 rounded-full bg-purple-50 dark:bg-purple-900/80 dark:backdrop-blur-sm border border-purple-200 dark:border-purple-800/60 text-purple-700 dark:text-white hover:bg-purple-100 dark:hover:bg-purple-900/90 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-3 h-3"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <div className="relative p-3 flex flex-col h-52 border-t border-gray-200 dark:border-gray-700/50">
          <FlipButton onToggle={onToggleFlip} />
          {/* Scrollovateľná časť: nadpis a opis */}
          <div
            className="flex-1 overflow-y-auto subtle-scrollbar pr-1"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(156, 163, 175, 0.2) transparent',
            }}
          >
            {label ? (
              <div className="text-[11px] text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                {label}
              </div>
            ) : null}
            <div className="text-xs font-semibold text-gray-900 dark:text-white whitespace-pre-wrap break-words">
              {headline}
            </div>
          </div>
          {/* Fixná časť: miesto, prax, cena, "Ponúkam" */}
          <div className="flex-shrink-0">
            <div className="mt-2 mb-1.5 flex items-start justify-end gap-3">
              <div className="flex-1 min-w-0 mr-auto flex flex-col gap-0.5">
                {displayLocationText && (
                  <div className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-1">
                    <span className="font-medium text-gray-900 dark:text-white flex-shrink-0">
                      {t('skills.locationLabel', 'Miesto:')}
                    </span>
                    <span className="break-words">{displayLocationText}</span>
                  </div>
                )}
                {offer.experience && (
                  <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {t('skills.experience', 'Prax:')}
                    </span>
                    <span>
                      {offer.experience.value}{' '}
                      {offer.experience.unit === 'years'
                        ? t('skills.years', 'rokov')
                        : t('skills.months', 'mesiacov')}
                    </span>
                  </div>
                )}
              </div>
              {priceLabel && (
                <div className="px-2 py-1 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/30 flex-shrink-0">
                  <div className="text-[10px] text-purple-600 dark:text-purple-400 font-medium mb-0.5">
                    {offer.is_seeking
                      ? t('skills.priceTo', 'Cena do:')
                      : t('skills.priceFrom', 'Cena od:')}
                  </div>
                  <div className="text-sm font-bold text-purple-700 dark:text-purple-300">
                    {priceLabel}
                  </div>
                </div>
              )}
            </div>
            <p className="-mb-2 pt-0 pb-0 text-center text-xs font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wide opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {offer.is_seeking ? t('skills.search', 'Hľadám') : t('skills.offering', 'Ponúkam')}
            </p>
          </div>
        </div>
      </div>

      <div className={isFlipped ? 'block' : 'hidden'} style={{ minHeight: '100%' }}>
        <div className="relative aspect-[3/2] rounded-t-2xl border-b border-gray-200/70 dark:border-gray-700/50 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-[#101012] dark:to-[#151518]">
          <div
            className="absolute inset-0 p-4 overflow-y-auto subtle-scrollbar"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(156, 163, 175, 0.2) transparent',
            }}
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
                    {/* 3 plné hviezdičky */}
                    {[1, 2, 3].map((i) => (
                      <svg
                        key={i}
                        className="w-5 h-5 text-yellow-400 fill-current"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                    {/* Polovičná hviezdička */}
                    <div className="relative w-5 h-5">
                      <svg
                        className="w-5 h-5 text-gray-300 dark:text-gray-600 fill-current absolute"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
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
                    {/* 1 prázdna hviezdička */}
                    <svg
                      className="w-5 h-5 text-gray-300 dark:text-gray-600 fill-current"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </div>
                  <span className="text-base font-bold text-gray-800 dark:text-gray-200">
                    12 645
                  </span>
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
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    // TODO: Implementovať otvorenie recenzií
                  }}
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
                </button>
              </div>
            )}
            {/* Hľadám – zobraz urgentnosť a trvanie nad lajkami, aby tagy zostali úplne dole ako pri Ponúkam */}
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

            <div
              className={`flex items-center gap-1.5 ${
                offer.is_seeking ? 'mt-8 xl:mt-10' : 'mt-1 xl:mt-1'
              }`}
            >
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
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

            {/* Tagy – vždy úplne dole, rovnako pre Ponúkam aj Hľadám */}
            {offer.tags && offer.tags.length > 0 && (
              <div
                className={`flex flex-wrap gap-1 ${
                  offer.is_seeking ? 'mt-3 xl:mt-4' : 'mt-1 xl:mt-1.5'
                }`}
              >
                {offer.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="text-xs font-medium text-purple-700 dark:text-purple-300 whitespace-nowrap"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <FlipButton onToggle={onToggleFlip} extraClasses="z-30" />
        </div>
      </div>
    </div>
  );
}


