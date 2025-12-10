'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import OfferImageCarousel from '../shared/OfferImageCarousel';

function slugifyLabel(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

interface SkillItem {
  id?: number;
  category: string;
  subcategory: string;
  description?: string;
  experience?: { value: number; unit: 'years' | 'months' };
  tags?: string[];
  images?: Array<{ id: number; image_url?: string | null; image?: string | null; order?: number }>;
  price_from?: number | null;
  price_currency?: string;
  district?: string;
  location?: string;
}

interface SkillsScreenProps {
  title: string;
  firstOptionText?: string;
  firstOptionHint?: string;
  onFirstOptionClick?: () => void;
  secondOptionText?: string;
  secondOptionHint?: string;
  onSecondOptionClick?: () => void;
  standardCategories?: SkillItem[];
  onRemoveStandardCategory?: (index: number) => void;
  onEditStandardCategoryDescription?: (index: number) => void;
  onAddCategory?: () => void;
  customCategories?: SkillItem[];
  onRemoveCustomCategory?: (index: number) => void;
  onEditCustomCategoryDescription?: (index: number) => void;
}

export default function SkillsScreen({
  title,
  firstOptionText,
  firstOptionHint,
  onFirstOptionClick,
  secondOptionText,
  secondOptionHint,
  onSecondOptionClick,
  standardCategories = [],
  onRemoveStandardCategory,
  onEditStandardCategoryDescription,
  onAddCategory,
  customCategories = [],
  onRemoveCustomCategory,
  onEditCustomCategoryDescription,
}: SkillsScreenProps) {
  const { t } = useLanguage();

  const renderOfferCard = (item: SkillItem, opts: { onEdit?: () => void; onRemove?: () => void }) => {
    const headline = (item.description && item.description.trim()) || item.subcategory || t('skills.noDescription', 'Bez popisu');
    const label = item.subcategory || item.category || '';
    const catSlug = item.category ? slugifyLabel(item.category) : '';
    const subSlug = item.subcategory ? slugifyLabel(item.subcategory) : '';
    const locationText = item.location && item.location.trim();
    const districtText = item.district && item.district.trim();
    const displayLocationText = locationText || districtText || null;
    const tagsMarginTop = item.experience || displayLocationText ? 'mt-1.5' : 'mt-2';
    const imageAlt = headline || t('skills.offer', 'Ponúkam');
    const priceLabel =
      item.price_from !== null && item.price_from !== undefined
        ? `${Number(item.price_from).toLocaleString('sk-SK', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${item.price_currency || '€'}`
        : null;
    const imageCount = item.images?.filter(img => img?.image_url || img?.image).length || 0;
    const hasMultipleImages = imageCount > 1;

    return (
      <div className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-[#0f0f10] shadow-sm hover:shadow-md hover:border-purple-200 dark:hover:border-purple-800/50 transition-all duration-300">
        <div className="relative aspect-[4/3] bg-gray-100 dark:bg-[#111112] overflow-hidden group">
          <OfferImageCarousel images={item.images} alt={imageAlt} />
          {hasMultipleImages && (
            <div className="absolute bottom-2 right-2 px-2 py-1 rounded-full bg-black/30 dark:bg-black/40 backdrop-blur-sm text-white/90 dark:text-white/80 text-[10px] font-medium flex items-center gap-1">
              <svg className="w-3 h-3 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span>{imageCount}</span>
            </div>
          )}
          {opts.onRemove && (
            <button
              aria-label={t('common.delete', 'Odstrániť')}
              onClick={opts.onRemove}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 dark:bg-black/70 text-gray-600 dark:text-gray-200 hover:bg-white dark:hover:bg-black transition-all duration-200 opacity-0 group-hover:opacity-100"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <div className="flex flex-col h-64 border-t border-gray-200 dark:border-gray-700/50">
          {/* Scrollovateľná stredná časť: od názvu po cenu */}
          <div 
            className="flex-1 overflow-y-auto px-4 pt-2 subtle-scrollbar" 
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(156, 163, 175, 0.2) transparent',
            }}
          >
            {label ? (
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 break-words">
                  {item.subcategory
                    ? t(`skillsCatalog.subcategories.${catSlug}.${subSlug}`, item.subcategory)
                    : t(`skillsCatalog.categories.${catSlug}`, item.category)}
                </p>
                <div className="mt-1 h-0.5 bg-purple-200 dark:bg-purple-900/40" />
              </div>
            ) : null}
            <div className="mt-1 text-xs font-semibold text-gray-900 dark:text-white whitespace-pre-wrap break-words">
              {headline}
            </div>
            {displayLocationText && (
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1.5">
                <span className="font-medium text-gray-700 dark:text-gray-300">{t('skills.locationLabel', 'Miesto:')} </span>
                {displayLocationText}
              </div>
            )}
            {item.experience && (
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1.5">
                <span className="font-medium text-gray-700 dark:text-gray-300">{t('skills.experienceLength', 'Dĺžka praxe: ')}</span>
                {item.experience.value} {item.experience.unit === 'years' ? t('skills.years', 'rokov') : t('skills.months', 'mesiacov')}
              </div>
            )}
            {item.tags && item.tags.length > 0 && (
              <div className={`flex flex-wrap gap-x-2 gap-y-px ${tagsMarginTop} leading-[12px]`}>
                {item.tags.map((tag, idx) => (
                  <span key={`${tag}-${idx}`} className="text-[11px] text-purple-700 dark:text-purple-300 leading-[12px]">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
            {priceLabel && (
              <div className="mt-2 mb-2 px-2 py-1 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/30">
                <div className="text-[10px] text-purple-600 dark:text-purple-400 font-medium mb-0.5">
                  {t('skills.priceFrom', 'Cena od:')}
                </div>
                <div className="text-sm font-bold text-purple-700 dark:text-purple-300">
                  {priceLabel}
                </div>
              </div>
            )}
          </div>
          {/* Fixný button dole */}
          {opts.onEdit && (
            <div className="px-4 pb-4 pt-2 flex-shrink-0 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={opts.onEdit}
                className="w-full py-2.5 text-xs font-semibold text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-400/60 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-300 dark:hover:border-purple-400/80 active:scale-[0.98] transition-all duration-200"
              >
                {t('skills.editOffer', 'Upraviť ponuku')}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="text-[var(--foreground)]">
      <div className="hidden lg:block w-full">
        <div className="flex flex-col items-stretch w-full">
          <div className="w-full">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">
              {title}
            </h2>
          </div>

          <div className="mt-6 w-full">
            <div className="border-t border-gray-200 dark:border-gray-700" />
          </div>

          <div className="w-full py-10 text-gray-500 dark:text-gray-400">
            {firstOptionText && (
              <>
                <div className="w-full flex items-center justify-between -mt-6 flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={onFirstOptionClick}
                    className="flex flex-col flex-1 min-w-[260px] text-left cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <span className="text-lg font-medium text-gray-900 dark:text-white">
                      {firstOptionText}
                    </span>
                    <span className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {firstOptionHint || t(
                        'skills.selectCategoryHint',
                        'Vyber kategóriu, ktorá sa k tebe hodí. Nenašiel si nič? Pridaj vlastnú.',
                      )}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={onFirstOptionClick}
                    className="flex-shrink-0 p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors focus:outline-none"
                  >
                    {(standardCategories && standardCategories.length > 0) ||
                    (customCategories && customCategories.length > 0) ? (
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    )}
                  </button>
                </div>

                {secondOptionText && onSecondOptionClick && (
                  <div className="w-full flex items-center justify-between mt-4 flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={onSecondOptionClick}
                      className="flex flex-col flex-1 min-w-[260px] text-left cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <span className="text-lg font-medium text-gray-900 dark:text-white">
                        {secondOptionText}
                      </span>
                      <span className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {secondOptionHint}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={onSecondOptionClick}
                      className="flex-shrink-0 p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors focus:outline-none"
                    >
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  </div>
                )}

                {onAddCategory && (
                  <div className="w-full flex items-center justify-between mt-4 flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={onAddCategory}
                      className="flex flex-col flex-1 min-w-[260px] text-left cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <span className="text-lg font-medium text-gray-900 dark:text-white">
                        {t('skills.addCategory', 'Pridať kategóriu')}
                      </span>
                      <span className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {t('skills.addCategoryHint', 'Pridaj si kategóriu, ktorá ťa vystihuje.')}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={onAddCategory}
                      className="flex-shrink-0 p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors focus:outline-none"
                    >
                      {customCategories && customCategories.length > 0 ? (
                        <svg
                          className="w-6 h-6"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-6 h-6"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                )}

                {(standardCategories && standardCategories.length > 0) || (customCategories && customCategories.length > 0) ? (
                  <div className="mt-6 w-full">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-[clamp(1rem,2vw,1.5rem)]">
                      {standardCategories.map((item, index) => (
                        <div
                          key={item.id ?? `standard-${item.category}-${item.subcategory}-${index}`}
                          className="w-full min-w-[260px]"
                        >
                          {renderOfferCard(item, {
                            onEdit: onEditStandardCategoryDescription
                              ? () => onEditStandardCategoryDescription(index)
                              : undefined,
                            onRemove: onRemoveStandardCategory
                              ? () => onRemoveStandardCategory(index)
                              : undefined,
                          })}
                        </div>
                      ))}
                      {customCategories.map((customCategory, index) => (
                        <div key={`custom-${index}`} className="w-full min-w-[260px]">
                          {renderOfferCard(customCategory, {
                            onEdit: onEditCustomCategoryDescription
                              ? () => onEditCustomCategoryDescription(index)
                              : undefined,
                            onRemove: onRemoveCustomCategory
                              ? () => onRemoveCustomCategory(index)
                              : undefined,
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile layout */}
      <div className="block lg:hidden w-full px-4">
        <div className="flex flex-col items-stretch w-full">
          {firstOptionText && (
            <>
              <div className="w-full pt-0 pb-6">
                <div className="flex flex-col gap-0 w-full">
                  {/* Vyber kategóriu */}
                  <button
                    type="button"
                    onClick={onFirstOptionClick}
                    className="w-full h-20 flex items-center justify-between px-2 rounded-t-2xl rounded-b-none bg-[var(--background)] active:bg-gray-50 dark:active:bg-gray-900 transition-colors gap-4 relative z-10 -mb-6"
                  >
                    <div className="flex flex-col text-left">
                      <span className="text-base font-semibold text-gray-900 dark:text-white">
                        {firstOptionText}
                      </span>
                    </div>
                    {(standardCategories && standardCategories.length > 0) ||
                    (customCategories && customCategories.length > 0) ? (
                      <svg
                        className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    )}
                  </button>

                  {/* Pridaj čo hľadáš */}
                  {secondOptionText && onSecondOptionClick && (
                    <button
                      type="button"
                      onClick={onSecondOptionClick}
                      className={`w-full h-20 flex items-center justify-between px-2 ${onAddCategory ? 'rounded-none' : 'rounded-b-2xl'} bg-[var(--background)] active:bg-gray-50 dark:active:bg-gray-900 transition-colors gap-4 relative z-0`}
                    >
                      <div className="flex flex-col text-left">
                        <span className="text-base font-semibold text-gray-900 dark:text-white">
                          {secondOptionText}
                        </span>
                      </div>
                      <svg
                        className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  )}

                  {/* Pridať kategóriu */}
                  {onAddCategory && (
                    <button
                      type="button"
                      onClick={onAddCategory}
                      className="w-full h-20 flex items-center justify-between px-2 rounded-b-2xl rounded-t-none bg-[var(--background)] active:bg-gray-50 dark:active:bg-gray-900 transition-colors gap-4 relative z-0"
                    >
                      <div className="flex flex-col text-left">
                        <span className="text-base font-semibold text-gray-900 dark:text-white">
                          {t('skills.addCategory', 'Pridať kategóriu')}
                        </span>
                      </div>
                      {customCategories && customCategories.length > 0 ? (
                        <svg
                          className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Mobile cards */}
          {(standardCategories.length > 0 || customCategories.length > 0) && (
            <div className="mt-4 space-y-3">
              {standardCategories.map((item, index) => {
                const headline = (item.description && item.description.trim()) || item.subcategory || t('skills.noDescription', 'Bez popisu');
                const label = item.subcategory || item.category || '';
                const catSlug = item.category ? slugifyLabel(item.category) : '';
                const subSlug = item.subcategory ? slugifyLabel(item.subcategory) : '';
                const locationText = item.location && item.location.trim();
                const districtText = item.district && item.district.trim();
                const displayLocationText = locationText || districtText || null;
                const priceLabel =
                  item.price_from !== null && item.price_from !== undefined
                    ? `${Number(item.price_from).toLocaleString('sk-SK', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${item.price_currency || '€'}`
                    : null;
                const imageAlt = headline || t('skills.offer', 'Ponúkam');
                const imageCount = item.images?.filter(img => img?.image_url || img?.image).length || 0;
                const hasMultipleImages = imageCount > 1;

                return (
                  <div
                    key={item.id ?? `standard-${item.category}-${item.subcategory}-${index}`}
                    className="w-full rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-[#0f0f10] shadow-sm"
                  >
                    <div className="relative aspect-[4/3] bg-gray-100 dark:bg-[#0e0e0f] overflow-hidden">
                      <OfferImageCarousel images={item.images} alt={imageAlt} />
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
                      {onRemoveStandardCategory && (
                        <button
                          aria-label={t('common.delete', 'Odstrániť')}
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveStandardCategory(index);
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
                            {item.experience.unit === 'years' ? t('skills.years', 'rokov') : t('skills.months', 'mesiacov')}
                          </span>
                        </div>
                      )}
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-x-2 gap-y-px leading-[12px] mt-1">
                          {item.tags.map((tag, idx) => (
                            <span key={`${tag}-${idx}`} className="text-[11px] text-purple-700 dark:text-purple-300 leading-[12px]">
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
                                {t('skills.priceFrom', 'Cena od:')}
                              </span>
                              <span className="text-base font-bold text-purple-700 dark:text-purple-300">
                                {priceLabel}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                      {onEditStandardCategoryDescription && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditStandardCategoryDescription(index);
                          }}
                          className="w-full mt-2 py-2.5 text-xs font-semibold text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-400/60 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-300 dark:hover:border-purple-400/80 active:scale-[0.98] transition-all duration-200"
                        >
                          {t('skills.editOffer', 'Upraviť ponuku')}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {customCategories.map((customCategory, index) => {
                const headline = (customCategory.description && customCategory.description.trim()) || customCategory.subcategory || t('skills.noDescription', 'Bez popisu');
                const label = customCategory.subcategory || customCategory.category || '';
                const catSlug = customCategory.category ? slugifyLabel(customCategory.category) : '';
                const subSlug = customCategory.subcategory ? slugifyLabel(customCategory.subcategory) : '';
                const locationText = customCategory.location && customCategory.location.trim();
                const districtText = customCategory.district && customCategory.district.trim();
                const displayLocationText = locationText || districtText || null;
                const priceLabel =
                  customCategory.price_from !== null && customCategory.price_from !== undefined
                    ? `${Number(customCategory.price_from).toLocaleString('sk-SK', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${customCategory.price_currency || '€'}`
                    : null;
                const imageAlt = headline || t('skills.offer', 'Ponúkam');
                const imageCount = customCategory.images?.filter(img => img?.image_url || img?.image).length || 0;
                const hasMultipleImages = imageCount > 1;

                return (
                  <div
                    key={`custom-${index}`}
                    className="w-full rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-[#0f0f10] shadow-sm"
                  >
                    <div className="relative aspect-[4/3] bg-gray-100 dark:bg-[#0e0e0f] overflow-hidden">
                      <OfferImageCarousel images={customCategory.images} alt={imageAlt} />
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
                      {onRemoveCustomCategory && (
                        <button
                          aria-label={t('common.delete', 'Odstrániť')}
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveCustomCategory(index);
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
                          {customCategory.subcategory
                            ? t(`skillsCatalog.subcategories.${catSlug}.${subSlug}`, customCategory.subcategory)
                            : t(`skillsCatalog.categories.${catSlug}`, customCategory.category)}
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
                      {customCategory.experience && (
                        <div className="text-[11px] text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                          <span className="font-medium text-gray-800 dark:text-gray-200">
                            {t('skills.experience', 'Prax:')}
                          </span>
                          <span>
                            {customCategory.experience.value}{' '}
                            {customCategory.experience.unit === 'years' ? t('skills.years', 'rokov') : t('skills.months', 'mesiacov')}
                          </span>
                        </div>
                      )}
                      {customCategory.tags && customCategory.tags.length > 0 && (
                        <div className="flex flex-wrap gap-x-2 gap-y-px leading-[12px] mt-1">
                          {customCategory.tags.map((tag, idx) => (
                            <span key={`${tag}-${idx}`} className="text-[11px] text-purple-700 dark:text-purple-300 leading-[12px]">
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
                                {t('skills.priceFrom', 'Cena od:')}
                              </span>
                              <span className="text-base font-bold text-purple-700 dark:text-purple-300">
                                {priceLabel}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                      {onEditCustomCategoryDescription && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditCustomCategoryDescription(index);
                          }}
                          className="w-full mt-2 py-2.5 text-xs font-semibold text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-400/60 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-300 dark:hover:border-purple-400/80 active:scale-[0.98] transition-all duration-200"
                        >
                          {t('skills.editOffer', 'Upraviť ponuku')}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


