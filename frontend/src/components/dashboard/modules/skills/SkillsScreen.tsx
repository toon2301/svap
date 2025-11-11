'use client';

import React from 'react';
import OfferImageCarousel from '../shared/OfferImageCarousel';

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
}

interface SkillsScreenProps {
  title: string;
  firstOptionText?: string;
  onFirstOptionClick?: () => void;
  standardCategories?: SkillItem[];
  onRemoveStandardCategory?: (index: number) => void;
  onEditStandardCategoryDescription?: (index: number) => void;
  onAddCategory?: () => void;
  customCategories?: SkillItem[];
  onRemoveCustomCategory?: (index: number) => void;
  onEditCustomCategoryDescription?: (index: number) => void;
}

export default function SkillsScreen({ title, firstOptionText, onFirstOptionClick, standardCategories = [], onRemoveStandardCategory, onEditStandardCategoryDescription, onAddCategory, customCategories = [], onRemoveCustomCategory, onEditCustomCategoryDescription }: SkillsScreenProps) {
  const renderOfferCard = (
    item: SkillItem,
    opts: { onEdit?: () => void; onRemove?: () => void }
  ) => {
    const headline = (item.description && item.description.trim()) || item.subcategory || 'Bez popisu';
    const label = item.subcategory || item.category || '';
    const tagsMarginTop = item.experience ? 'mt-1' : 'mt-2';
    const imageAlt = headline || 'Ponuka';
    const priceLabel =
      item.price_from !== null && item.price_from !== undefined
        ? `${Number(item.price_from).toLocaleString('sk-SK', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${item.price_currency || '€'}`
        : null;

    return (
      <div className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-[#0f0f10] shadow-sm hover:shadow transition-shadow">
        <div className="relative aspect-[4/3] bg-gray-100 dark:bg-[#111112] overflow-hidden">
          <OfferImageCarousel images={item.images} alt={imageAlt} />
          {opts.onRemove && (
            <button
              aria-label="Odstrániť"
              onClick={opts.onRemove}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 dark:bg-black/70 text-gray-600 dark:text-gray-200 hover:bg-white dark:hover:bg-black transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <div className="px-4 pt-2 pb-4 flex flex-col h-64">
          {label ? (
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 break-words">
                {label}
              </p>
              <div className="mt-1 h-0.5 bg-purple-200 dark:bg-purple-900/40" />
            </div>
          ) : null}
          <div className="flex-1 flex flex-col">
            <div className="mt-1 text-xs font-semibold text-gray-900 dark:text-white whitespace-pre-wrap break-words">
              {headline}
            </div>
            {item.experience && (
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1.5">
                <span className="font-medium text-gray-700 dark:text-gray-300">Dĺžka praxe: </span>
                {item.experience.value} {item.experience.unit === 'years' ? 'rokov' : 'mesiacov'}
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
            <div className="flex-1" />
          </div>
          {priceLabel && (
            <div className="text-sm text-gray-700 dark:text-gray-300 mb-0">
              <span className="font-medium text-gray-900 dark:text-white">Cena od:&nbsp;</span>
              {priceLabel}
            </div>
          )}
          {opts.onEdit && (
            <div className="pt-0">
              <button
                onClick={opts.onEdit}
                className="w-full py-2 text-xs font-semibold text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-400/60 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
              >
                Upraviť ponuku
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };
  return (
    <div className="text-[var(--foreground)]">
      <div className="hidden lg:flex items-start justify-center">
        <div className="flex flex-col items-start w-full max-w-3xl mx-auto">
          <div className="w-full ml-8 lg:ml-12">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">{title}</h2>
          </div>
          <div className="mt-6 w-full"><div className="border-t border-gray-200 dark:border-gray-700" /></div>
          <div className="w-full ml-8 lg:ml-12 py-10 text-gray-500 dark:text-gray-400">
            {firstOptionText && (
              <>
                <div className="w-full max-w-2xl -mt-6">
                  <button type="button" onClick={onFirstOptionClick} className="w-full py-3 px-3 flex items-center justify-between text-left text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg transition-colors">
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-lg font-medium">{firstOptionText}</span>
                      <span className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap overflow-hidden text-ellipsis">
                        Vyber kategóriu, ktorá sa k tebe hodí. Nenašiel si nič? Pridaj vlastnú nižšie.
                      </span>
                    </div>
                    {(standardCategories && standardCategories.length > 0) || (customCategories && customCategories.length > 0) ? (
                      <svg className="w-6 h-6 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </button>
                </div>
                {standardCategories && standardCategories.length > 0 && (
                  <div className="mt-6 w-full">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {standardCategories.map((item, index) => (
                        <div key={item.id ?? `${item.category}-${item.subcategory}-${index}`} className="w-full">
                          {renderOfferCard(item, {
                            onEdit: onEditStandardCategoryDescription ? () => onEditStandardCategoryDescription(index) : undefined,
                            onRemove: onRemoveStandardCategory ? () => onRemoveStandardCategory(index) : undefined,
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {onAddCategory && (
                  <div className="w-full max-w-2xl mt-4">
                    <button 
                      type="button" 
                      onClick={onAddCategory} 
                      className="w-full py-3 px-3 flex items-center justify-between text-left text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg transition-colors"
                    >
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-lg font-medium">Pridať kategóriu</span>
                        <span className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap overflow-hidden text-ellipsis">
                          Pridaj si kategóriu, ktorá ťa vystihuje.
                        </span>
                      </div>
                      {customCategories && customCategories.length > 0 ? (
                        <svg className="w-6 h-6 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </button>
                  </div>
                )}
                {customCategories && customCategories.length > 0 && (
                  <div className="mt-6 w-full">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {customCategories.map((customCategory, index) => (
                        <div key={index} className="w-full">
                          {renderOfferCard(customCategory, {
                            onEdit: onEditCustomCategoryDescription ? () => onEditCustomCategoryDescription(index) : undefined,
                            onRemove: onRemoveCustomCategory ? () => onRemoveCustomCategory(index) : undefined,
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


