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

// Export funkcie pre invalidáciu search cache pre konkrétneho používateľa
export { invalidateSearchCacheForUser } from './search/hooks/useSearchApi';

export default function SearchModule({ user, onUserClick, onSkillClick, isOverlay = false }: SearchModuleProps) {
  const { t } = useLanguage();
  
  // Hooky pre state management
  const searchState = useSearchState();
  const searchApi = useSearchApi({ searchState, user });
  const recentSearches = useRecentSearches({ user, searchState });
  const suggestions = useSuggestions({ user, searchState, onSkillClick });

  // Skryť FlipButton ikony v kartách keď je filter modal otvorený
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    if (searchState.isFilterOpen) {
      // Pridaj class na body aby sme mohli skryť FlipButton cez CSS
      document.body.classList.add('filter-modal-open');
    } else {
      document.body.classList.remove('filter-modal-open');
    }

    return () => {
      document.body.classList.remove('filter-modal-open');
    };
  }, [searchState.isFilterOpen]);

  // Klávesové skratky v SearchModule
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignoruj, ak používateľ píše do inputu, textarey alebo je v modale
      const target = event.target as HTMLElement;
      const isInputActive = 
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable ||
        target.closest('[role="dialog"]') !== null ||
        target.closest('[role="textbox"]') !== null;

      // Esc - zatvor filter modal ak je otvorený
      if (event.key === 'Escape' && searchState.isFilterOpen) {
        event.preventDefault();
        searchState.setIsFilterOpen(false);
        return;
      }

      // "/" - focus do search inputu (len ak nie je aktívny žiadny input a nie je filter modal)
      if (event.key === '/' && !isInputActive && !searchState.isFilterOpen) {
        // Skontroluj, či sme na desktop verzii (lg a vyššie)
        if (window.innerWidth >= 1024) {
          event.preventDefault();
          // Malé oneskorenie, aby sa zabezpečilo, že search panel je už otvorený
          setTimeout(() => {
            searchState.searchInputRef.current?.focus();
          }, 100);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [searchState.isFilterOpen, searchState.setIsFilterOpen, searchState.searchInputRef]);

  // Dynamické vyhľadávanie – rýchle návrhy počas písania
  useEffect(() => {
    const q = searchState.searchQuery.trim();

    if (!q || q.length < 2) {
      return;
    }

    if (searchState.searchDebounceRef.current) {
      clearTimeout(searchState.searchDebounceRef.current);
    }

    searchState.searchDebounceRef.current = setTimeout(() => {
      void searchApi.handleSearch();
    }, 400);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchState.searchQuery, searchApi.handleSearch]);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      void searchApi.handleSearch();
    }
  };

  // Layout classes pre responsive dizajn
  const rootClassName = isOverlay ? 'w-full h-full' : 'max-w-6xl mx-auto';
  const layoutClassName = isOverlay ? 'h-full flex flex-col' : 'flex flex-col lg:flex-row gap-6';
  const asideClassName = isOverlay ? 'w-full h-full' : 'w-full lg:w-96 flex-shrink-0';

  return (
    <div className={rootClassName}>
      <div className={layoutClassName}>
        {/* Sekundárny panel vedľa ľavej navigácie */}
        <aside className={asideClassName}>
          {/* Search input komponenta */}
          <SearchInput
            searchState={searchState}
            onSearch={searchApi.handleSearch}
            onKeyDown={handleKeyDown}
            t={t}
          />
          
          {/* Search results komponenta */}
          <div className="px-4 sm:px-5">
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

        {/* Hlavná časť – zatiaľ bez výsledkov, všetko je v search paneli */}
        {!isOverlay && <main className="flex-1" />}
      </div>

      {/* Filter modal – nad obsahom, bez straty stavu */}
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
          searchState.setIsFilterOpen(false);
          void searchApi.handleSearch();
        }}
        t={t}
      />
    </div>
  );
}

