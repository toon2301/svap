'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import OfferImageCarousel from '../shared/OfferImageCarousel';
import type { Offer } from './profileOffersTypes';
import { slugifyLabel } from './profileOffersTypes';

interface ProfileOfferCardMobileProps {
  offer: Offer;
  accountType: 'personal' | 'business';
  isTapped: boolean;
  onCardClick: () => void;
  isHighlighted?: boolean;
  isOtherUserProfile?: boolean;
  onRequestClick?: (offerId: number) => void;
  onMessageClick?: (offerId: number) => void;
  /** Rovnako ako desktop: Ponúknuť (is_seeking) / Požiadať, alebo stav: Požiadané, Prijaté, atď. */
  requestLabel?: string;
  isRequestDisabled?: boolean;
}

export function ProfileOfferCardMobile({
  offer,
  accountType,
  isTapped,
  onCardClick,
  isHighlighted = false,
  isOtherUserProfile = false,
  onRequestClick,
  onMessageClick,
  requestLabel: requestLabelProp,
  isRequestDisabled = false,
}: ProfileOfferCardMobileProps) {
  const { t } = useLanguage();
  const defaultRequestLabel = offer.is_seeking ? t('requests.offer', 'Ponúknuť') : t('requests.request', 'Požiadať');
  const requestLabel = requestLabelProp ?? defaultRequestLabel;

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
  const isHidden = offer.is_hidden === true && !isOtherUserProfile;

  return (
    <div
      key={offer.id}
      role="button"
      tabIndex={0}
      className={`relative w-full text-left rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-[#0f0f10] shadow-sm active:scale-[0.99] transition-transform ${
        isHighlighted ? 'highlight-offer-card' : ''
      } ${isHidden ? 'opacity-60' : ''}`}
      onClick={onCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onCardClick();
        }
      }}
    >
      {/* Veľký text "Ponúkam" alebo "Hľadám" cez celú kartu – mobilná verzia, skryje sa pri prvom kliknutí */}
      {!isTapped && (
        <div className="absolute left-0 right-0 top-[52.5%] -translate-y-1/2 z-30 pointer-events-none transition-all duration-300">
          <div className="w-full py-1 border border-transparent rounded-none bg-white/80 dark:bg-[#0f0f10]/80 backdrop-blur-sm shadow-lg">
            <p className="text-xl font-black text-gray-900 dark:text-gray-50 uppercase tracking-[0.2em] leading-tight text-center">
              {offer.is_seeking ? t('skills.search', 'Hľadám') : t('skills.offering', 'Ponúkam')}
            </p>
          </div>
        </div>
      )}
      {/* Označenie skrytej karty - len vo vlastnom profile */}
      {isHidden && (
        <div className="absolute top-2 left-2 z-50 px-2 py-1 rounded-md bg-gray-800/90 dark:bg-gray-700/90 text-white text-[10px] font-semibold flex items-center gap-1 backdrop-blur-sm">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-3 h-3"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.774 3.162 10.066 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
            />
          </svg>
          {t('skills.hiddenCard', 'Skrytá')}
        </div>
      )}
      <div className="relative aspect-[4/3] bg-gray-100 dark:bg-[#0e0e0f] overflow-hidden">
        <OfferImageCarousel images={offer.images} alt={imageAlt} />
        {accountType === 'business' && (
          <span className="absolute top-2 left-2 px-1.5 py-0.5 text-[10px] font-semibold bg-black/80 text-white rounded">
            PRO
          </span>
        )}
        <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
          <button
            aria-label="Páči sa mi to"
            title="Páči sa mi to"
            className="p-1.5 rounded-full inline-flex items-center justify-center leading-none bg-purple-50 dark:bg-purple-900/80 dark:backdrop-blur-sm border border-purple-200 dark:border-purple-800/60 text-purple-700 dark:text-white hover:bg-purple-100 dark:hover:bg-purple-900/90 transition-colors active:scale-95"
            onClick={(e) => {
              e.stopPropagation();
              // TODO: Implementovať páči sa mi to
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
          <button
            aria-label="Zdieľať"
            title="Zdieľať"
            className="p-1.5 rounded-full inline-flex items-center justify-center leading-none bg-purple-50 dark:bg-purple-900/80 dark:backdrop-blur-sm border border-purple-200 dark:border-purple-800/60 text-purple-700 dark:text-white hover:bg-purple-100 dark:hover:bg-purple-900/90 transition-colors active:scale-95"
            onClick={(e) => {
              e.stopPropagation();
              // TODO: Implementovať zdieľanie
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
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
            className="p-1.5 rounded-full inline-flex items-center justify-center leading-none bg-purple-50 dark:bg-purple-900/80 dark:backdrop-blur-sm border border-purple-200 dark:border-purple-800/60 text-purple-700 dark:text-white hover:bg-purple-100 dark:hover:bg-purple-900/90 transition-colors active:scale-95"
            onClick={(e) => {
              e.stopPropagation();
              // TODO: Implementovať komentovanie
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="2"
              stroke="currentColor"
              className="w-4 h-4"
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
              className="p-1.5 rounded-full inline-flex items-center justify-center leading-none bg-purple-50 dark:bg-purple-900/80 dark:backdrop-blur-sm border border-purple-200 dark:border-purple-800/60 text-purple-700 dark:text-white hover:bg-purple-100 dark:hover:bg-purple-900/90 transition-colors active:scale-95"
              onClick={(e) => {
                e.stopPropagation();
                // TODO: Implementovať pridať recenziu
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </button>
          )}
        </div>
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
      </div>

      <div className="p-3 space-y-2">
        {translatedLabel && (
          <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 break-words">
            {translatedLabel}
          </p>
        )}
        <p className="text-xs font-semibold text-gray-900 dark:text-white whitespace-pre-wrap break-words">
          {headline}
        </p>
        {displayLocationText && (
          <div className="text-[11px] text-gray-600 dark:text-gray-400 flex items-start gap-1.5">
            <span className="font-medium text-gray-800 dark:text-gray-200">
              {t('skills.locationLabel', 'Miesto:')}
            </span>
            <span className="break-words flex-1">{displayLocationText}</span>
          </div>
        )}
        {offer.experience && (
          <div className="text-[11px] text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
            <span className="font-medium text-gray-800 dark:text-gray-200">
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
        {priceLabel && (
          <div className="mt-2 w-full px-3 py-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/40">
            <div className="flex items-center justify-center gap-2">
              <span className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                {offer.is_seeking ? t('skills.priceTo', 'Cena do:') : t('skills.priceFrom', 'Cena od:')}
              </span>
              <span className="text-base font-bold text-purple-700 dark:text-purple-300">
                {priceLabel}
              </span>
            </div>
          </div>
        )}
        {/* Tlačidlá Požiadať/Ponúknuť a Správa - len na cudzom profile (rovnako ako desktop) */}
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
                isRequestDisabled
                  ? 'opacity-70 cursor-not-allowed'
                  : 'hover:bg-purple-200 dark:hover:bg-purple-900/60'
              }`}
            >
              {requestLabel}
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
              Správa
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


