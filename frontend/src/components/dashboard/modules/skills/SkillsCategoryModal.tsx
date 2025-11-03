'use client';

import React, { useState, useEffect } from 'react';
import styles from './SkillsCategoryModal.module.css';

interface SkillsCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Record<string, string[]>;
  selected?: string | null;
  onSelect: (value: string) => void;
}

export default function SkillsCategoryModal({ isOpen, onClose, categories, selected, onSelect }: SkillsCategoryModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Reset selectedCategory when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedCategory(null);
    }
  }, [isOpen]);

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
      onSelect(categoryName);
      onClose();
    }
  };

  const handleSubcategoryClick = (subcategoryName: string) => {
    onSelect(subcategoryName);
    onClose();
  };

  const handleBack = () => {
    setSelectedCategory(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={onClose}>
      <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="rounded-2xl bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 pt-6 pb-3">
            <div className="flex items-center gap-3">
              {selectedCategory && (
                <button
                  onClick={handleBack}
                  className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  aria-label="Späť"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <h2 className="text-xl font-semibold">
                {selectedCategory ? selectedCategory : 'Kategória'}
              </h2>
            </div>
            <button aria-label="Close" onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className={`px-2 pb-4 ${styles.scrollArea}`}>
            {currentSubcategories ? (
              // Zobraz podkategórie
              currentSubcategories.map((subcategory) => (
                <button
                  key={subcategory}
                  type="button"
                  onClick={() => handleSubcategoryClick(subcategory)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-[#111] text-left"
                >
                  <span className="text-sm">{subcategory}</span>
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
                    <span className="text-sm">{categoryName}</span>
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


