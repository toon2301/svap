"use client";

import React from 'react';
import { type User } from '@/types';
import { type SearchResults, type SearchSkill, type SearchUserResult } from '../types';
import { getUserInitials } from '../utils';
import { ScrollableText } from '../ScrollableText';
import { type SearchStateProps } from '../hooks/useSearchState';
import { type SearchApiProps } from '../hooks/useSearchApi';
import { type RecentSearchesProps } from '../hooks/useRecentSearches';
import { type SuggestionsProps } from '../hooks/useSuggestions';

interface SearchResultsProps {
  user: User;
  searchState: SearchStateProps;
  searchApi: SearchApiProps;
  recentSearches: RecentSearchesProps;
  suggestions: SuggestionsProps;
  onUserClick?: (userId: number, slug?: string | null, summary?: SearchUserResult) => void;
  onSkillClick?: (userId: number, skillId: number, slug?: string | null) => void;
  t: (key: string, fallback: string) => string;
}

/**
 * Komponent pre zobrazenie search výsledkov, recent searches a suggestions
 */
export function SearchResults({
  user,
  searchState,
  searchApi,
  recentSearches,
  suggestions,
  onUserClick,
  onSkillClick,
  t,
}: SearchResultsProps) {
  const {
    searchQuery,
    results,
    error,
    hasSearched,
    isFromRecentSearch,
    showSkills,
    showUsers,
    searchInputRef,
    clearSearch,
  } = searchState;

  const { filteredSkills, hasPanelResults } = searchApi;
  const { recentSearches: recentResults, handleRecentResultClick } = recentSearches;
  const { suggestedSkills, handleSuggestionClick } = suggestions;

  // Render skill card
  const renderSkillCard = (skill: SearchSkill, keyPrefix: string) => {
    const isSeeking = skill.is_seeking === true;
    const locationLabel = skill.location || skill.district || t('search.noLocation', 'Bez lokality');
    const ownerName = skill.user_id === user.id 
      ? t('search.you', 'Vy')
      : (skill as any).user_display_name || '';
    const skillTitle = skill.subcategory || skill.category;

    // Formátovanie ceny podľa typu ponuky
    const hasPrice = skill.price_from !== null && skill.price_from !== undefined;
    const priceValue = hasPrice ? Number(skill.price_from) : null;
    const priceCurrency = skill.price_currency || '€';
    const priceLabel = hasPrice 
      ? isSeeking
        ? `${t('search.priceToShort', 'do')} ${priceValue!.toLocaleString('sk-SK')}${priceCurrency}`
        : `${t('search.priceFromShort', 'od')} ${priceValue!.toLocaleString('sk-SK')}${priceCurrency}`
      : null;

    const handleSkillCardClick = () => {
      if (typeof onSkillClick === 'function') {
        const ownerId = skill.user_id ?? null;
        if (ownerId) {
          // Skús nájsť slug používateľa z results.users podľa ID (len ak máme results)
          const owner = results?.users.find((u) => u.id === ownerId) ?? null;
          const ownerSlug = owner?.slug ?? null;
          onSkillClick(ownerId, skill.id as number, ownerSlug);
        }
      }
    };

    return (
      <button
        key={`${keyPrefix}-${skill.id}`}
        type="button"
        onClick={handleSkillCardClick}
        className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors flex items-start gap-3"
      >
        <div
          className={`px-2 py-1 rounded-full flex flex-col items-center justify-center flex-shrink-0 gap-0.5 ${
            isSeeking
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              : 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
          }`}
        >
          <span className="text-[10px] font-semibold whitespace-nowrap leading-tight">
            {isSeeking
              ? t('search.labelSeeking', 'HĽADÁM')
              : t('search.labelOffer', 'PONÚKAM')}
          </span>
          {priceLabel && (
            <span className="text-[9px] font-semibold whitespace-nowrap leading-tight">
              {priceLabel}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 text-sm text-gray-900 dark:text-white">
            <ScrollableText text={skillTitle} />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {ownerName && <span>{ownerName}</span>}
            {ownerName && locationLabel && <span>{' • '}</span>}
            {locationLabel && <span>{locationLabel}</span>}
          </p>
        </div>
      </button>
    );
  };

  // Render user card
  const renderUserCard = (u: SearchUserResult) => {
    // Zobraz "Vy" ak je to vlastný profil
    const displayName = u.id === user.id ? t('search.you', 'Vy') : u.display_name;
    const initials = getUserInitials(u.display_name);

    const handleUserCardClick = () => {
      // Klik na vlastný profil – použi existujúcu navigáciu dashboardu
      if (u.id === user.id) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('goToProfile'));
        }
        return;
      }

      if (!onUserClick) return;
      
      console.log('[SEARCH-DEBUG] Klik na používateľa vo výsledkoch', {
        userId: u.id,
        userSlug: u.slug,
        displayName: u.display_name,
        hasSlug: !!u.slug,
        fullUserObject: u,
      });
      
      onUserClick(u.id, u.slug ?? null, u);
    };

    return (
      <button
        key={`user-${u.id}`}
        type="button"
        onClick={handleUserCardClick}
        className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 flex items-center gap-3"
      >
        {u.avatar_url ? (
          <img
            src={u.avatar_url}
            alt={displayName}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <div className="h-8 w-8 flex items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-white text-xs font-semibold">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {displayName}
          </p>
          {/* Lokalitu pri používateľoch zatiaľ nezobrazujeme podľa zadania */}
        </div>
        {u.is_verified && (
          <span className="px-2 py-0.5 text-[10px] rounded-full bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-semibold">
            {t('search.verified', 'Overený')}
          </span>
        )}
      </button>
    );
  };

  // Render back button
  const renderBackButton = () => (
    <>
      {/* Desktop verzia - s šípkou */}
      <button
        type="button"
        onClick={() => {
          clearSearch();
        }}
        className="hidden lg:flex w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors items-center gap-2 mb-2"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-4 h-4"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
          />
        </svg>
        <span>{t('search.back', 'Späť')}</span>
      </button>
      {/* Mobilná verzia - len text, bez šípky */}
      <button
        type="button"
        onClick={() => {
          clearSearch();
        }}
        className="lg:hidden w-full text-center px-3 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 active:bg-gray-300 dark:active:bg-gray-600 transition-colors mb-3"
      >
        {t('search.back', 'Späť')}
      </button>
    </>
  );

  return (
    <div className="space-y-4">
      {/* Error message */}
      {error && (
        <div className="mt-4 bg-red-50 border border-red-100 text-red-700 text-xs rounded-xl px-3 py-2">
          {error}
        </div>
      )}

      {/* Posledné vyhľadávania - zobraziť len ak ešte nebolo vyhľadané alebo je searchQuery prázdny */}
      {!hasSearched && !error && !searchQuery.trim() && recentResults.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 px-1">
            {t('search.recentSearches', 'Posledné vyhľadávania')}
          </h4>
          <div className="space-y-1">
            {recentResults.slice(0, 5).map((result, index) => {
              // Zobraziť prvých pár výsledkov z každej histórie
              const totalItems = (result.skills?.length || 0) + (result.users?.length || 0);
              if (totalItems === 0) return null;

              // Zobraziť prvý skill alebo user z výsledkov
              const firstSkill = result.skills?.[0];
              const firstUser = result.users?.[0];

              return (
                <button
                  key={`recent-${index}`}
                  type="button"
                  onClick={() => handleRecentResultClick(result)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-4 h-4 text-gray-400 flex-shrink-0"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                    />
                  </svg>
                  <span className="truncate flex-1 text-gray-900 dark:text-white">
                    {firstSkill ? (
                      <>
                        <span className={firstSkill.is_seeking ? 'text-blue-600 dark:text-blue-400' : 'text-purple-600 dark:text-purple-400'}>
                          {firstSkill.is_seeking ? 'HĽADÁM' : 'PONÚKAM'}
                        </span>{' '}
                        {firstSkill.subcategory || firstSkill.category}
                      </>
                    ) : firstUser ? (
                      firstUser.display_name
                    ) : (
                      t('search.recentResult', 'Výsledok')
                    )}
                  </span>
                  {totalItems > 1 && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      +{totalItems - 1}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Návrhy pre používateľa – zobrazia sa len keď nie je zadaný text a ešte neprebehlo vyhľadávanie */}
      {!error && !hasSearched && !searchQuery.trim() && suggestedSkills.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 px-1">
            {t('search.suggestionsForYou', 'Návrhy pre vás')}
          </h4>
          <div className="space-y-1">
            {suggestedSkills.map((skill) => renderSkillCard(skill, 'suggest'))}
          </div>
        </div>
      )}

      {/* Search results */}
      {hasSearched && !error && results && (
        <div className="mt-4 space-y-1">
          {/* Tlačidlo "Späť" na vrátenie sa k návrhom - len pri kliknutí na posledné vyhľadávanie */}
          {isFromRecentSearch && renderBackButton()}
          
          {hasPanelResults ? (
            <>
              {/* Skills results */}
              {showSkills && filteredSkills.map((skill) => renderSkillCard(skill, 'skill'))}

              {/* Users results */}
              {showUsers && results.users.map(renderUserCard)}
            </>
          ) : (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {t('search.noResults', 'Pre zadané vyhľadávanie sa nenašli žiadne výsledky.')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
