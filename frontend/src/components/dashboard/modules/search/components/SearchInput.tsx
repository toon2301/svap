"use client";

import React from 'react';
import { type SearchStateProps } from '../hooks/useSearchState';

interface SearchInputProps {
  searchState: SearchStateProps;
  onSearch: (event?: React.FormEvent) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  t: (key: string, fallback: string) => string;
}

/**
 * Search input komponent s filter buttonom
 */
export function SearchInput({ searchState, onSearch, onKeyDown, t }: SearchInputProps) {
  const {
    searchQuery,
    setSearchQuery,
    isSearching,
    setIsFilterOpen,
    searchInputRef,
    clearSearch,
  } = searchState;

  return (
    <form onSubmit={onSearch} className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0 sm:pt-10 lg:pt-8">
      <div className="space-y-4">
        {/* Vyhľadávacie pole + Filter */}
        <div className="space-y-2">
          <h3 className="hidden lg:block text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            Hľadať
          </h3>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Vyhľadávanie"
                className="block w-full px-3 py-2.5 pr-9 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent text-sm"
              />
              
              {/* Ikona na vyčistenie vyhľadávacieho poľa */}
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                  aria-label={t('search.clearSearch', 'Vyčistiť vyhľadávanie')}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
              
              {/* Progress indikátor pri načítaní */}
              {isSearching && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700 rounded-b-xl overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-500 via-purple-400 to-purple-500 animate-progress-bar" />
                </div>
              )}
            </div>
            
            {/* Filter button - integrovaný vedľa poľa */}
            <button
              type="button"
              onClick={() => setIsFilterOpen(true)}
              className="flex-shrink-0 h-[42px] w-[42px] flex items-center justify-center rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
              aria-label={t('search.filter', 'Filter')}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
