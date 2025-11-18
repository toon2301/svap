'use client';

import React, { useState, useEffect, useMemo } from 'react';
import styles from './SkillsCategoryModal.module.css';
import { useLanguage } from '@/contexts/LanguageContext';

function slugifyLabel(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

interface SkillsCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Record<string, string[]>;
  selected?: string | null;
  onSelect: (category: string, subcategory: string) => void;
}

export default function SkillsCategoryModal({ isOpen, onClose, categories, selected, onSelect }: SkillsCategoryModalProps) {
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Reset selectedCategory and searchQuery when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedCategory(null);
      setSearchQuery('');
    }
  }, [isOpen]);

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

  if (!isOpen) return null;

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
      onClose();
    }
  };

  const handleSubcategoryClick = (subcategoryName: string) => {
    const categoryName = selectedCategory || '';
    onSelect(categoryName, subcategoryName);
    onClose();
  };

  const handleBack = () => {
    setSelectedCategory(null);
    setSearchQuery('');
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    // Reset selected category when searching
    if (e.target.value.trim()) {
      setSelectedCategory(null);
    }
  };

  const handleSearchResultClick = (item: { name: string; category: string }) => {
    onSelect(item.category, item.name);
    onClose();
  };

  const isSearchActive = searchQuery.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={onClose}>
      <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="rounded-2xl bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 pt-6 pb-3">
            <div className="flex items-center gap-3">
              {selectedCategory && !isSearchActive && (
                <button
                  onClick={handleBack}
                  className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  aria-label={t('common.back', 'Späť')}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <h2 className="text-xl font-semibold">
                {isSearchActive
                  ? t('skills.searchSubcategoryTitle', 'Vyhľadať podkategóriu')
                  : selectedCategory
                    ? t(`skillsCatalog.categories.${slugifyLabel(selectedCategory)}`, selectedCategory)
                    : t('skills.selectCategoryTitle', 'Vyber kategóriu')}
              </h2>
            </div>
            <button aria-label={t('common.close', 'Zavrieť')} onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          
          {/* Search input */}
          <div className="px-6 pb-3">
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
                className="w-full px-4 py-2.5 pl-10 pr-10 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500"
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

          <div className={`px-2 pb-4 ${styles.scrollArea}`}>
            {isSearchActive ? (
              // Zobraz výsledky vyhľadávania
              filteredSubcategories.length > 0 ? (
                filteredSubcategories.map((item) => (
                  <button
                    key={`${item.category}-${item.name}`}
                    type="button"
                    onClick={() => handleSearchResultClick(item)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-[#111] text-left"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm">
                        {t(`skillsCatalog.subcategories.${slugifyLabel(item.category)}.${slugifyLabel(item.name)}`, item.name)}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {t(`skillsCatalog.categories.${slugifyLabel(item.category)}`, item.category)}
                      </span>
                    </div>
                    {selected === item.name && (
                      <svg className="w-4 h-4 text-gray-800 dark:text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                    )}
                  </button>
                ))
              ) : (
                <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  <p>{t('common.noResults', 'Žiadne výsledky nenájdené')}</p>
                </div>
              )
            ) : currentSubcategories ? (
              // Zobraz podkategórie
              currentSubcategories.map((subcategory) => (
                <button
                  key={subcategory}
                  type="button"
                  onClick={() => handleSubcategoryClick(subcategory)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-[#111] text-left"
                >
                  <span className="text-sm">
                    {t(`skillsCatalog.subcategories.${slugifyLabel(selectedCategory || '')}.${slugifyLabel(subcategory)}`, subcategory)}
                  </span>
                  {selected === subcategory && (
                    <svg className="w-4 h-4 text-gray-800 dark:text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                  )}
                </button>
              ))
            ) : (
              // Zobraz hlavné kategórie
              categoryNames.map((categoryName) => {
                const hasSubcategories = categories[categoryName] && categories[categoryName].length > 0;
                return (
                  <button
                    key={categoryName}
                    type="button"
                    onClick={() => handleCategoryClick(categoryName)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-[#111] text-left"
                  >
                    <span className="text-sm">
                      {t(`skillsCatalog.categories.${slugifyLabel(categoryName)}`, categoryName)}
                    </span>
                    {hasSubcategories ? (
                      <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    ) : selected === categoryName && (
                      <svg className="w-4 h-4 text-gray-800 dark:text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


