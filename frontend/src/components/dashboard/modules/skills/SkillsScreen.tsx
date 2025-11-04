'use client';

import React from 'react';

interface SkillsScreenProps {
  title: string;
  firstOptionText?: string;
  onFirstOptionClick?: () => void;
  selectedCategory?: { category: string; subcategory: string; description?: string; experience?: { value: number; unit: 'years' | 'months' } } | null;
  onRemoveCategory?: () => void;
  onEditDescription?: () => void;
  onAddCategory?: () => void;
  customCategories?: { category: string; subcategory: string; description?: string; experience?: { value: number; unit: 'years' | 'months' } }[];
  onRemoveCustomCategory?: (index: number) => void;
  onEditCustomCategoryDescription?: (index: number) => void;
}

export default function SkillsScreen({ title, firstOptionText, onFirstOptionClick, selectedCategory, onRemoveCategory, onEditDescription, onAddCategory, customCategories = [], onRemoveCustomCategory, onEditCustomCategoryDescription }: SkillsScreenProps) {
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
                    {selectedCategory ? (
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
                {selectedCategory && (
                  <div className="w-full max-w-2xl mt-4 py-3 px-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50 relative">
                    <div className="flex items-center mb-2">
                      <span className="text-base text-gray-800 dark:text-gray-200 pr-8 flex-1">{selectedCategory.category} → {selectedCategory.subcategory}</span>
                      {onRemoveCategory && (
                        <button
                          onClick={onRemoveCategory}
                          className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          aria-label="Odstrániť kategóriu"
                        >
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                    {(selectedCategory.description && selectedCategory.description.trim()) || selectedCategory.experience ? (
                      <div className="mt-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-black/30">
                        {selectedCategory.description && selectedCategory.description.trim() && (
                          <button
                            type="button"
                            onClick={onEditDescription}
                            className="w-full py-2 px-3 flex items-center justify-between text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                          >
                            <span className="text-base text-gray-800 dark:text-gray-200 flex-1">{selectedCategory.description}</span>
                            <svg 
                              className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 ml-2 flex-shrink-0" 
                              viewBox="0 0 24 24" 
                              fill="none" 
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}
                        {selectedCategory.experience && (
                          <>
                            {selectedCategory.description && selectedCategory.description.trim() && (
                              <div className="mx-3 border-t border-gray-200 dark:border-gray-700" />
                            )}
                            <div className="py-2 px-3">
                              <span className="text-sm text-gray-600 dark:text-gray-400">Dĺžka praxe: </span>
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {selectedCategory.experience.value} {selectedCategory.experience.unit === 'years' ? 'rokov' : 'mesiacov'}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    ) : null}
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
                {customCategories && customCategories.length > 0 && customCategories.map((customCategory, index) => (
                  <div key={index} className="w-full max-w-2xl mt-4 py-3 px-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50 relative">
                    <div className="flex items-center mb-2">
                      <span className="text-base text-gray-800 dark:text-gray-200 pr-8 flex-1">{customCategory.category}</span>
                      {onRemoveCustomCategory && (
                        <button
                          onClick={() => onRemoveCustomCategory(index)}
                          className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          aria-label="Odstrániť kategóriu"
                        >
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                    {(customCategory.description && customCategory.description.trim()) || customCategory.experience ? (
                      <div className="mt-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-black/30">
                        {customCategory.description && customCategory.description.trim() && (
                          <button
                            type="button"
                            onClick={() => onEditCustomCategoryDescription && onEditCustomCategoryDescription(index)}
                            className="w-full py-2 px-3 flex items-center justify-between text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                          >
                            <span className="text-base text-gray-800 dark:text-gray-200 flex-1">{customCategory.description}</span>
                            <svg 
                              className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 ml-2 flex-shrink-0" 
                              viewBox="0 0 24 24" 
                              fill="none" 
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}
                        {customCategory.experience && (
                          <>
                            {customCategory.description && customCategory.description.trim() && (
                              <div className="mx-3 border-t border-gray-200 dark:border-gray-700" />
                            )}
                            <div className="py-2 px-3">
                              <span className="text-sm text-gray-600 dark:text-gray-400">Dĺžka praxe: </span>
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {customCategory.experience.value} {customCategory.experience.unit === 'years' ? 'rokov' : 'mesiacov'}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    ) : null}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


