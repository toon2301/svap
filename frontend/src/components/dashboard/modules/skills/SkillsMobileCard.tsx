'use client';

import React from 'react';
import OfferImageCarousel from '../shared/OfferImageCarousel';
import { SkillItem, slugifyLabel } from './SkillsScreen.types';

interface SkillsMobileCardProps {
  item: SkillItem;
  t: (key: string, defaultValue: string) => string;
  isSeeking: boolean;
  onRemove?: () => void;
  onEdit?: () => void;
}

export default function SkillsMobileCard({
  item,
  t,
  isSeeking,
  onRemove,
  onEdit,
}: SkillsMobileCardProps) {
  const headline =
    (item.description && item.description.trim()) ||
    item.subcategory ||
    t('skills.noDescription', 'Bez popisu');
  const label = item.subcategory || item.category || '';
  const catSlug = item.category ? slugifyLabel(item.category) : '';
  const subSlug = item.subcategory ? slugifyLabel(item.subcategory) : '';
  const locationText = item.location && item.location.trim();
  const districtText = item.district && item.district.trim();
  const displayLocationText = locationText || districtText || null;
  const priceLabel =
    item.price_from !== null && item.price_from !== undefined
      ? `${Number(item.price_from).toLocaleString('sk-SK', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        })} ${item.price_currency || '€'}`
      : null;
  const imageAlt = headline || t('skills.offer', 'Ponúkam');
  const imageCount = item.images?.filter((img) => img?.image_url || img?.image).length || 0;
  const hasMultipleImages = imageCount > 1;

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-[#0f0f10] shadow-sm">
      <div className="relative aspect-[4/3] bg-gray-100 dark:bg-[#0e0e0f] overflow-hidden">
        <OfferImageCarousel images={item.images} alt={imageAlt} />
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
        {onRemove && (
          <button
            aria-label={t('common.delete', 'Odstrániť')}
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 dark:bg-black/70 text-gray-600 dark:text-gray-200 hover:bg-white dark:hover:bg-black transition-all duration-200"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      <div className="p-3 space-y-2">
        {label && (
          <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 break-words">
            {item.subcategory
              ? t(`skillsCatalog.subcategories.${catSlug}.${subSlug}`, item.subcategory)
              : t(`skillsCatalog.categories.${catSlug}`, item.category)}
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
        {item.experience && (
          <div className="text-[11px] text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
            <span className="font-medium text-gray-800 dark:text-gray-200">
              {t('skills.experience', 'Prax:')}
            </span>
            <span>
              {item.experience.value}{' '}
              {item.experience.unit === 'years'
                ? t('skills.years', 'rokov')
                : t('skills.months', 'mesiacov')}
            </span>
          </div>
        )}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-x-2 gap-y-px leading-[12px] mt-1">
            {item.tags.map((tag, idx) => (
              <span
                key={`${tag}-${idx}`}
                className="text-[11px] text-purple-700 dark:text-purple-300 leading-[12px]"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
        {priceLabel && (
          <div className="pt-2">
            <div className="w-full px-3 py-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/30 text-center">
              <div className="flex items-center justify-center gap-1.5">
                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                  {isSeeking ? t('skills.priceTo', 'Cena do:') : t('skills.priceFrom', 'Cena od:')}
                </span>
                <span className="text-base font-bold text-purple-700 dark:text-purple-300">
                  {priceLabel}
                </span>
              </div>
            </div>
          </div>
        )}
        {onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="w-full mt-2 py-2.5 text-xs font-semibold text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-400/60 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-300 dark:hover:border-purple-400/80 active:scale-[0.98] transition-all duration-200"
          >
            {t('skills.editOffer', 'Upraviť ponuku')}
          </button>
        )}
      </div>
    </div>
  );
}


