'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import OfferImageCarousel from '../../shared/OfferImageCarousel';
import type { Offer } from '../profileOffersTypes';
import { FlipButton } from './FlipButton';

export type OfferCardFrontProps = {
  offer: Offer;
  accountType: 'personal' | 'business';
  t: (key: string, defaultValue: string) => string;
  onToggleFlip: () => void;
  isFlipped: boolean;
  isHidden: boolean;
  isHighlighted: boolean;

  imageAlt: string;
  label: string;
  headline: string;
  priceLabel: string | null;
  displayLocationText: string | null;
  hasMultipleImages: boolean;
  imageCount: number;

  isOtherUserProfile?: boolean;
  /** Meno/názov majiteľa profilu (kvôli recenziám v URL). */
  ownerDisplayName?: string;
  onRequestClick?: (offerId: number) => void;
  onMessageClick?: (offerId: number) => void;
  requestLabel?: string;
  isRequestDisabled?: boolean;
};

export function OfferCardFront({
  offer,
  accountType,
  t,
  onToggleFlip,
  isFlipped,
  isHidden,
  isHighlighted,
  imageAlt,
  label,
  headline,
  priceLabel,
  displayLocationText,
  hasMultipleImages,
  imageCount,
  isOtherUserProfile = false,
  ownerDisplayName,
  onRequestClick,
  onMessageClick,
  requestLabel,
  isRequestDisabled = false,
}: OfferCardFrontProps) {
  const showFront = !isFlipped;
  const router = useRouter();

  return (
    <div className={showFront ? 'block' : 'hidden'} style={{ minHeight: '100%' }}>
      <div className="relative aspect-[3/2] bg-gray-100 dark:bg-[#0e0e0f] overflow-hidden rounded-t-2xl">
        <OfferImageCarousel images={offer.images} alt={imageAlt} />
        {accountType === 'business' && (
          <span className="absolute top-2 left-2 px-1.5 py-0.5 text-[10px] font-semibold bg-black/80 text-white rounded">
            PRO
          </span>
        )}
        {hasMultipleImages && (
          <div className="absolute bottom-2 right-2 px-2 py-1 rounded-full bg-black/40 backdrop-blur-sm text-white/90 text-[10px] font-medium flex items-center gap-1">
            <svg className="w-3 h-3 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
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
            className="p-1 rounded-full inline-flex items-center justify-center leading-none bg-purple-50 dark:bg-purple-900/80 dark:backdrop-blur-sm border border-purple-200 dark:border-purple-800/60 text-purple-700 dark:text-white hover:bg-purple-100 dark:hover:bg-purple-900/90 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
          <button
            aria-label="Zdieľať"
            title="Zdieľať"
            className="p-1 rounded-full inline-flex items-center justify-center leading-none bg-purple-50 dark:bg-purple-900/80 dark:backdrop-blur-sm border border-purple-200 dark:border-purple-800/60 text-purple-700 dark:text-white hover:bg-purple-100 dark:hover:bg-purple-900/90 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
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
            className="p-1 rounded-full inline-flex items-center justify-center leading-none bg-purple-50 dark:bg-purple-900/80 dark:backdrop-blur-sm border border-purple-200 dark:border-purple-800/60 text-purple-700 dark:text-white hover:bg-purple-100 dark:hover:bg-purple-900/90 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
              <path d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
            </svg>
          </button>
          {!offer.is_seeking && typeof offer.id === 'number' && (
            <button
              type="button"
              aria-label="Pridať recenziu"
              title="Pridať recenziu"
              onClick={(e) => {
                e.stopPropagation();
                const base = `/dashboard/offers/${offer.id}/reviews`;
                const name = (ownerDisplayName || '').trim();
                router.push(name ? `${base}?ownerName=${encodeURIComponent(name)}` : base);
              }}
              className="p-1 rounded-full inline-flex items-center justify-center leading-none bg-purple-50 dark:bg-purple-900/80 dark:backdrop-blur-sm border border-purple-200 dark:border-purple-800/60 text-purple-700 dark:text-white hover:bg-purple-100 dark:hover:bg-purple-900/90 transition-colors"
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
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(156, 163, 175, 0.2) transparent' }}
        >
          {label ? (
            <div className="text-[11px] text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">{label}</div>
          ) : null}
          <div className="text-xs font-semibold text-gray-900 dark:text-white whitespace-pre-wrap break-words">{headline}</div>
        </div>

        {/* Fixná časť: miesto, prax, cena, "Ponúkam" */}
        <div className="flex-shrink-0">
          <div className="mt-2 mb-1.5 flex items-start justify-end gap-3">
            <div className="flex-1 min-w-0 mr-auto flex flex-col gap-0.5">
              {displayLocationText && (
                <div className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-1">
                  <span className="font-medium text-gray-900 dark:text-white flex-shrink-0">{t('skills.locationLabel', 'Miesto:')}</span>
                  <span className="break-words">{displayLocationText}</span>
                </div>
              )}
              {offer.experience && (
                <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  <span className="font-medium text-gray-900 dark:text-white">{t('skills.experience', 'Prax:')}</span>
                  <span>
                    {offer.experience.value}{' '}
                    {offer.experience.unit === 'years' ? t('skills.years', 'rokov') : t('skills.months', 'mesiacov')}
                  </span>
                </div>
              )}
            </div>
            {priceLabel && (
              <div className="px-2 py-1 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/30 flex-shrink-0">
                <div className="text-[10px] text-purple-600 dark:text-purple-400 font-medium mb-0.5">
                  {offer.is_seeking ? t('skills.priceTo', 'Cena do:') : t('skills.priceFrom', 'Cena od:')}
                </div>
                <div className="text-sm font-bold text-purple-700 dark:text-purple-300">{priceLabel}</div>
              </div>
            )}
          </div>

          <p className="-mb-2 pt-0 pb-0 text-center text-xs font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wide opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {offer.is_seeking ? t('skills.search', 'Hľadám') : t('skills.offering', 'Ponúkam')}
          </p>

          {/* Tlačidlá Požiadať/Ponúknuť a Správa - len na cudzom profile */}
          {isOtherUserProfile && (
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isRequestDisabled) return;
                  if (typeof offer.id === 'number' && onRequestClick) {
                    onRequestClick(offer.id);
                  }
                }}
                disabled={isRequestDisabled}
                className={`flex-1 px-3 py-1.5 text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200 rounded-lg transition-colors dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800/60 ${
                  isRequestDisabled ? 'opacity-70 cursor-not-allowed' : 'hover:bg-purple-200 dark:hover:bg-purple-900/60'
                }`}
              >
                {requestLabel ?? (offer.is_seeking ? t('requests.offer', 'Ponúknuť') : t('requests.request', 'Požiadať'))}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (typeof offer.id === 'number' && onMessageClick) {
                    onMessageClick(offer.id);
                  }
                }}
                className="flex-1 px-3 py-1.5 text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200 rounded-lg transition-colors hover:bg-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800/60 dark:hover:bg-purple-900/60"
              >
                {t('skills.message', 'Správa')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
