'use client';

import React from 'react';
import type { Offer } from './profileOffersTypes';
import { slugifyLabel } from './profileOffersTypes';
import { OfferCardBack } from './offerCard/OfferCardBack';
import { OfferCardFront } from './offerCard/OfferCardFront';

interface ProfileOfferCardProps {
  offer: Offer;
  accountType: 'personal' | 'business';
  t: (key: string, defaultValue: string) => string;
  isFlipped: boolean;
  onToggleFlip: () => void;
  onOpenHoursClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  isHighlighted?: boolean;
  isOtherUserProfile?: boolean;
  onRequestClick?: (offerId: number) => void;
  onMessageClick?: (offerId: number) => void;
  requestLabel?: string;
  isRequestDisabled?: boolean;
}

export default function ProfileOfferCard({
  offer,
  accountType,
  t,
  isFlipped,
  onToggleFlip,
  onOpenHoursClick,
  isHighlighted = false,
  isOtherUserProfile = false,
  onRequestClick,
  onMessageClick,
  requestLabel,
  isRequestDisabled = false,
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

  const isHidden = offer.is_hidden === true && !isOtherUserProfile;

  return (
    <div
      className={`rounded-2xl overflow-visible border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-[#0f0f10] shadow-sm hover:shadow transition-shadow relative ${
        isHighlighted ? 'highlight-offer-card' : ''
      } ${isHidden ? 'opacity-60' : ''}`}
    >
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
      <OfferCardFront
        offer={offer}
        accountType={accountType}
        t={t}
        onToggleFlip={onToggleFlip}
        isFlipped={isFlipped}
        isHidden={isHidden}
        isHighlighted={isHighlighted}
        imageAlt={imageAlt}
        label={label}
        headline={headline}
        priceLabel={priceLabel}
        displayLocationText={displayLocationText}
        hasMultipleImages={hasMultipleImages}
        imageCount={imageCount}
        isOtherUserProfile={isOtherUserProfile}
        onRequestClick={onRequestClick}
        onMessageClick={onMessageClick}
        requestLabel={requestLabel}
        isRequestDisabled={isRequestDisabled}
      />

      <OfferCardBack
        offer={offer}
        accountType={accountType}
        t={t}
        onToggleFlip={onToggleFlip}
        onOpenHoursClick={onOpenHoursClick}
        isFlipped={isFlipped}
      />
    </div>
  );
}


