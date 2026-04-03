'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Offer } from '../profile/profileOffersTypes';
import { slugifyLabel } from '../profile/profileOffersTypes';
import OfferImageCarousel from '../shared/OfferImageCarousel';

export function ChatOfferPreviewCard({
  offer,
  accountType,
  selected = false,
  onSelect,
}: {
  offer: Offer;
  accountType: 'personal' | 'business';
  selected?: boolean;
  onSelect: (offerId: number) => void;
}) {
  const { t } = useLanguage();

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
    t('skills.offer', 'Ponukam');

  const headline =
    (offer.description && offer.description.trim()) ||
    translatedLabel ||
    t('skills.noDescription', 'Bez popisu');

  const priceLabel =
    offer.price_from !== null && offer.price_from !== undefined
      ? `${Number(offer.price_from).toLocaleString('sk-SK', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        })} ${offer.price_currency || 'EUR'}`
      : null;

  const locationText = offer.location && offer.location.trim();
  const districtText = offer.district && offer.district.trim();
  const displayLocationText = locationText || districtText || null;

  const imageCount = offer.images?.filter((img) => img?.image_url || img?.image).length || 0;
  const hasMultipleImages = imageCount > 1;

  return (
    <button
      type="button"
      data-testid={`chat-offer-preview-card-${offer.id}`}
      onClick={() => onSelect(offer.id)}
      className={`group relative w-full overflow-visible rounded-xl border bg-white/80 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:bg-[#0f0f10] ${
        selected
          ? 'border-purple-400 ring-2 ring-purple-400/70 dark:border-purple-500'
          : 'border-gray-200 dark:border-gray-800'
      }`}
    >
      <div className="absolute left-0 right-0 top-[51%] z-30 -translate-y-1/2 pointer-events-none">
        <div className="w-full border border-transparent bg-white/85 py-0.5 shadow-md backdrop-blur-sm dark:bg-[#0f0f10]/85">
          <p className="text-center text-sm font-black uppercase leading-tight tracking-[0.14em] text-gray-800 dark:text-gray-100">
            {offer.is_seeking ? t('skills.search', 'Hladam') : t('skills.offering', 'Ponukam')}
          </p>
        </div>
      </div>

      <div className="relative aspect-[4/3] overflow-hidden rounded-t-xl bg-gray-100 dark:bg-[#0e0e0f]">
        <OfferImageCarousel images={offer.images} alt={imageAlt} />
        {accountType === 'business' ? (
          <span className="absolute left-1.5 top-1.5 rounded bg-black/80 px-1 py-0.5 text-[9px] font-semibold text-white">
            PRO
          </span>
        ) : null}
        {hasMultipleImages ? (
          <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 rounded-full bg-black/40 px-1.5 py-0.5 text-[9px] font-medium text-white/90 backdrop-blur-sm">
            <svg className="h-2.5 w-2.5 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span>{imageCount}</span>
          </div>
        ) : null}
      </div>

      <div className="relative flex h-40 flex-col border-t border-gray-200 p-2 dark:border-gray-700/50">
        <div
          className="flex-1 overflow-y-auto pr-0.5 subtle-scrollbar"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(156, 163, 175, 0.2) transparent' }}
        >
          {translatedLabel ? (
            <div className="mb-0.5 text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {translatedLabel}
            </div>
          ) : null}
          <div className="whitespace-pre-wrap break-words text-[11px] font-semibold leading-snug text-gray-900 dark:text-white">
            {headline}
          </div>
        </div>

        <div className="flex-shrink-0">
          <div className="mb-0.5 mt-1.5 flex flex-wrap items-start justify-between gap-x-2 gap-y-1.5">
            <div className="min-w-0 flex-1 flex flex-col gap-0.5">
              {displayLocationText ? (
                <div className="flex items-start gap-1 text-[11px] text-gray-600 dark:text-gray-400">
                  <span className="flex-shrink-0 font-medium text-gray-900 dark:text-white">
                    {t('skills.locationLabel', 'Miesto:')}
                  </span>
                  <span className="break-words">{displayLocationText}</span>
                </div>
              ) : null}
              {offer.experience ? (
                <div className="flex items-center gap-1 text-[11px] text-gray-600 dark:text-gray-400">
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
              ) : null}
            </div>
            {priceLabel ? (
              <div className="ml-auto flex-shrink-0 rounded-md border border-purple-100 bg-purple-50 px-1.5 py-0.5 text-right dark:border-purple-800/30 dark:bg-purple-900/20">
                <div className="mb-px text-[9px] font-medium leading-tight text-purple-600 dark:text-purple-400">
                  {offer.is_seeking
                    ? t('skills.priceTo', 'Cena do:')
                    : t('skills.priceFrom', 'Cena od:')}
                </div>
                <div className="break-words text-xs font-bold tabular-nums leading-tight text-purple-700 dark:text-purple-300">
                  {priceLabel}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </button>
  );
}
