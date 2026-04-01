"use client";

import { useEffect, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useLanguage } from '@/contexts/LanguageContext';
import { type SearchModuleProps } from './search/types';
import { FilterModal } from './search/FilterModal';
import { SearchInput } from './search/components/SearchInput';
import { SearchResults } from './search/components/SearchResults';
import { useSearchState } from './search/hooks/useSearchState';
import { useSearchApi } from './search/hooks/useSearchApi';
import { useRecentSearches } from './search/hooks/useRecentSearches';
import { useSuggestions } from './search/hooks/useSuggestions';

export { invalidateSearchCacheForUser } from './search/hooks/useSearchApi';

export default function SearchModule({
  user,
  onUserClick,
  onSkillClick,
  isOverlay = false,
  isActive = true,
  onClose,
}: SearchModuleProps) {
  const { t } = useLanguage();

  const searchState = useSearchState();
  const searchApi = useSearchApi({ searchState, user });
  const recentSearches = useRecentSearches({ user, searchState });
  const suggestions = useSuggestions({ user, searchState, onSkillClick, enabled: isActive });
  const { handleSearch } = searchApi;
  const {
    hasSearched,
    isFilterOpen,
    isFromRecentSearch,
    searchDebounceRef,
    searchInputRef,
    searchQuery,
    setError,
    setHasSearched,
    setIsFilterOpen,
    setResults,
  } = searchState;

  useEffect(() => {
    if (!isActive || typeof document === 'undefined') return;

    if (isFilterOpen) {
      document.body.classList.add('filter-modal-open');
    } else {
      document.body.classList.remove('filter-modal-open');
    }

    return () => {
      document.body.classList.remove('filter-modal-open');
    };
  }, [isActive, isFilterOpen]);

  useEffect(() => {
    if (!isActive || typeof document === 'undefined') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isInputActive =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('[role="dialog"]') !== null ||
        target.closest('[role="textbox"]') !== null;

      if (event.key === 'Escape' && isFilterOpen) {
        event.preventDefault();
        setIsFilterOpen(false);
        return;
      }

      if (event.key === '/' && !isInputActive && !isFilterOpen) {
        if (window.innerWidth >= 1024) {
          event.preventDefault();
          window.setTimeout(() => {
            searchInputRef.current?.focus();
          }, 100);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive, isFilterOpen, setIsFilterOpen, searchInputRef]);

  useEffect(() => {
    if (!isActive) return;
    const q = searchQuery.trim();

    if (!q && hasSearched && !isFromRecentSearch) {
      setHasSearched(false);
      setResults(null);
      setError(null);
    }
  }, [
    isActive,
    searchQuery,
    hasSearched,
    isFromRecentSearch,
    setHasSearched,
    setResults,
    setError,
  ]);

  useEffect(() => {
    if (!isActive) return;

    const q = searchQuery.trim();
    if (!q || q.length < 2) {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = null;
      }
      return;
    }

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(() => {
      void handleSearch();
    }, 400);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = null;
      }
    };
  }, [isActive, searchQuery, searchDebounceRef, handleSearch]);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;

    event.preventDefault();
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }
    void handleSearch();
  };

  const rootClassName = isOverlay ? 'w-full h-full' : 'max-w-6xl mx-auto';
  const layoutClassName = isOverlay ? 'h-full flex flex-col' : 'flex flex-col lg:flex-row gap-6';
  const asideClassName = isOverlay ? 'w-full flex flex-col h-full' : 'w-full lg:w-96 flex-shrink-0';

  return (
    <div className={rootClassName}>
      <div className={layoutClassName}>
        <aside className={asideClassName}>
          <SearchInput
            searchState={searchState}
            onSearch={handleSearch}
            onKeyDown={handleKeyDown}
            onClose={onClose}
            t={t}
          />

          <div className={isOverlay ? 'flex-1 overflow-y-auto min-h-0 px-4 sm:px-5' : 'px-4 sm:px-5'}>
            <SearchResults
              user={user}
              searchState={searchState}
              searchApi={searchApi}
              recentSearches={recentSearches}
              suggestions={suggestions}
              onUserClick={onUserClick}
              onSkillClick={onSkillClick}
              t={t}
            />
          </div>
        </aside>

        {!isOverlay && <main className="flex-1" />}
      </div>

      <FilterModal
        isOpen={searchState.isFilterOpen}
        onClose={() => searchState.setIsFilterOpen(false)}
        showSkills={searchState.showSkills}
        setShowSkills={searchState.setShowSkills}
        showUsers={searchState.showUsers}
        setShowUsers={searchState.setShowUsers}
        offerType={searchState.offerType}
        setOfferType={searchState.setOfferType}
        onlyMyLocation={searchState.onlyMyLocation}
        setOnlyMyLocation={searchState.setOnlyMyLocation}
        priceMin={searchState.priceMin}
        setPriceMin={searchState.setPriceMin}
        priceMax={searchState.priceMax}
        setPriceMax={searchState.setPriceMax}
        onReset={searchState.resetFilters}
        onApply={() => {
          setIsFilterOpen(false);
          void handleSearch();
        }}
        t={t}
      />
    </div>
  );
}
