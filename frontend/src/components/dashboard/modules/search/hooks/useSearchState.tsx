"use client";

import { useState, useRef } from 'react';
import { type SearchSkill, type SearchUserResult, type SearchResults } from '../types';

export interface SearchStateProps {
  // Základné state premenné
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  results: SearchResults | null;
  setResults: (results: SearchResults | null) => void;
  isSearching: boolean;
  setIsSearching: (searching: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  hasSearched: boolean;
  setHasSearched: (searched: boolean) => void;
  isFromRecentSearch: boolean;
  setIsFromRecentSearch: (fromRecent: boolean) => void;

  // Filter state
  isFilterOpen: boolean;
  setIsFilterOpen: (open: boolean) => void;
  showSkills: boolean;
  setShowSkills: (show: boolean) => void;
  showUsers: boolean;
  setShowUsers: (show: boolean) => void;
  offerType: 'all' | 'offer' | 'seeking';
  setOfferType: (type: 'all' | 'offer' | 'seeking') => void;
  onlyMyLocation: boolean;
  setOnlyMyLocation: (only: boolean) => void;
  priceMin: string;
  setPriceMin: (price: string) => void;
  priceMax: string;
  setPriceMax: (price: string) => void;

  // Refs
  searchInputRef: React.RefObject<HTMLInputElement>;
  searchDebounceRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  searchAbortControllerRef: React.MutableRefObject<AbortController | null>;

  // Helper functions
  resetFilters: () => void;
  clearSearch: () => void;
}

/**
 * Custom hook pre spravovanie search state
 */
export function useSearchState(): SearchStateProps {
  // Základné state premenné
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isFromRecentSearch, setIsFromRecentSearch] = useState(false);

  // Filter state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [showSkills, setShowSkills] = useState(true);
  const [showUsers, setShowUsers] = useState(true);
  const [offerType, setOfferType] = useState<'all' | 'offer' | 'seeking'>('all');
  const [onlyMyLocation, setOnlyMyLocation] = useState(false);
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');

  // Refs
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchAbortControllerRef = useRef<AbortController | null>(null);

  // Helper functions
  const resetFilters = () => {
    setShowSkills(true);
    setShowUsers(true);
    setOfferType('all');
    setOnlyMyLocation(false);
    setPriceMin('');
    setPriceMax('');
  };

  const clearSearch = () => {
    setSearchQuery('');
    setResults(null);
    setError(null);
    setHasSearched(false);
    setIsFromRecentSearch(false);
    searchInputRef.current?.focus();
  };

  return {
    // Základné state premenné
    searchQuery,
    setSearchQuery,
    results,
    setResults,
    isSearching,
    setIsSearching,
    error,
    setError,
    hasSearched,
    setHasSearched,
    isFromRecentSearch,
    setIsFromRecentSearch,

    // Filter state
    isFilterOpen,
    setIsFilterOpen,
    showSkills,
    setShowSkills,
    showUsers,
    setShowUsers,
    offerType,
    setOfferType,
    onlyMyLocation,
    setOnlyMyLocation,
    priceMin,
    setPriceMin,
    priceMax,
    setPriceMax,

    // Refs
    searchInputRef,
    searchDebounceRef,
    searchAbortControllerRef,

    // Helper functions
    resetFilters,
    clearSearch,
  };
}
