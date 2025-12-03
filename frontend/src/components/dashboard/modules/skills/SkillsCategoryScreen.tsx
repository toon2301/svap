'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

function slugifyLabel(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

interface SkillsCategoryScreenProps {
  categories: Record<string, string[]>;
  selected?: string | null;
  onSelect: (category: string, subcategory: string) => void;
  onBack: () => void;
  onSubcategoryStateChange?: (isInSubcategories: boolean) => void;
  onBackHandlerSet?: (handler: () => void) => void;
}

export default function SkillsCategoryScreen({ categories, selected, onSelect, onBack, onSubcategoryStateChange, onBackHandlerSet }: SkillsCategoryScreenProps) {
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Notify parent when subcategory state changes
  useEffect(() => {
    if (onSubcategoryStateChange) {
      onSubcategoryStateChange(selectedCategory !== null);
    }
  }, [selectedCategory, onSubcategoryStateChange]);

  // Get all subcategories from all categories
  const allSubcategories = useMemo(() => {
    const subcats: Array<{ name: string; category: string }> = [];
    Object.entries(categories).forEach(([categoryName, subcategories]) => {
      subcategories.forEach(subcategory => {
        subcats.push({ name: subcategory, category: categoryName });
      });
    });
    return subcats;
  }, [categories]);

  // Filter subcategories based on search query
  const filteredSubcategories = useMemo(() => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) {
      return [];
    }
    const query = trimmedQuery.toLowerCase();
    return allSubcategories.filter(item => 
      item.name.toLowerCase().includes(query)
    );
  }, [searchQuery, allSubcategories]);

  const categoryNames = Object.keys(categories);
  const currentSubcategories = selectedCategory ? categories[selectedCategory] : null;

  const handleCategoryClick = (categoryName: string) => {
    const subcategories = categories[categoryName];
    if (subcategories && subcategories.length > 0) {
      // Kategória má podkategórie - zobraz ich
      setSelectedCategory(categoryName);
    } else {
      // Kategória nemá podkategórie - vyber ju priamo
      onSelect(categoryName, categoryName);
    }
  };

  const handleSubcategoryClick = (subcategoryName: string) => {
    const categoryName = selectedCategory || '';
    onSelect(categoryName, subcategoryName);
  };

  const handleBack = () => {
    if (selectedCategory) {
      // Ak sme v podkategóriách, vráť sa na kategórie
      setSelectedCategory(null);
      setSearchQuery('');
      return; // Nepokračuj ďalej, nevolaj onBack()
    } else {
      // Ak sme v kategóriách, vráť sa na predchádzajúci screen
      onBack();
    }
  };

  // Expose handleBack to parent component
  useEffect(() => {
    if (onBackHandlerSet) {
      onBackHandlerSet(handleBack);
    }
  }, [onBackHandlerSet, selectedCategory, onBack]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    // Reset selected category when searching
    if (e.target.value.trim()) {
      setSelectedCategory(null);
    }
  };

  const handleSearchResultClick = (item: { name: string; category: string }) => {
    onSelect(item.category, item.name);
  };

  const isSearchActive = searchQuery.trim().length > 0;

  return (
    <div className="text-[var(--foreground)]">
      {/* Mobile layout */}
      <div className="block lg:hidden w-full px-4">
        <div className="flex flex-col w-full">
          {/* Search input */}
          <div className="mb-4 pt-2">
            <div className="relative">
              <div className="absolute left-3 top-0 bottom-0 flex items-center pointer-events-none z-10">
                <svg 
                  className="w-5 h-5 text-gray-400" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder={t('skills.searchSubcategoryPlaceholder', 'Hľadať podkategóriu...')}
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full px-4 py-2.5 pl-10 pr-10 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {searchQuery && (
                <div className="absolute right-3 top-0 bottom-0 flex items-center z-10">
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    aria-label={t('common.clear', 'Vymazať')}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Categories list */}
          <div className="flex-1 overflow-y-auto pb-4">
            {isSearchActive ? (
              // Zobraz výsledky vyhľadávania
              filteredSubcategories.length > 0 ? (
                <div className="space-y-0">
                  {filteredSubcategories.map((item) => (
                    <button
                      key={`${item.category}-${item.name}`}
                      type="button"
                      onClick={() => handleSearchResultClick(item)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-[var(--background)] hover:bg-gray-50 dark:hover:bg-gray-900 text-left border border-transparent hover:border-gray-200 dark:hover:border-gray-700 -mt-6 first:mt-0"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {t(`skillsCatalog.subcategories.${slugifyLabel(item.category)}.${slugifyLabel(item.name)}`, item.name)}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {t(`skillsCatalog.categories.${slugifyLabel(item.category)}`, item.category)}
                        </span>
                      </div>
                      {selected === item.name && (
                        <svg className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  <p>{t('common.noResults', 'Žiadne výsledky nenájdené')}</p>
                </div>
              )
            ) : currentSubcategories ? (
              // Zobraz podkategórie
              <div className="space-y-0">
                {currentSubcategories.map((subcategory) => (
                  <button
                    key={subcategory}
                    type="button"
                    onClick={() => handleSubcategoryClick(subcategory)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-[var(--background)] hover:bg-gray-50 dark:hover:bg-gray-900 text-left border border-transparent hover:border-gray-200 dark:hover:border-gray-700 -mt-0.5 first:mt-0"
                  >
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {t(`skillsCatalog.subcategories.${slugifyLabel(selectedCategory || '')}.${slugifyLabel(subcategory)}`, subcategory)}
                    </span>
                    {selected === subcategory && (
                      <svg className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              // Zobraz hlavné kategórie
              <div className="space-y-0">
                {categoryNames.map((categoryName) => {
                  const hasSubcategories = categories[categoryName] && categories[categoryName].length > 0;
                  return (
                    <button
                      key={categoryName}
                      type="button"
                      onClick={() => handleCategoryClick(categoryName)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-[var(--background)] hover:bg-gray-50 dark:hover:bg-gray-900 text-left border border-transparent hover:border-gray-200 dark:hover:border-gray-700 -mt-6 first:mt-0"
                    >
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {t(`skillsCatalog.categories.${slugifyLabel(categoryName)}`, categoryName)}
                      </span>
                      {hasSubcategories ? (
                        <svg className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      ) : selected === categoryName && (
                        <svg className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop layout - hidden, lebo desktop používa modal */}
      <div className="hidden lg:block"></div>
    </div>
  );
}

