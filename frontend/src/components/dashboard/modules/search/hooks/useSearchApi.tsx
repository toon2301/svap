"use client";

import { useRef, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { api, endpoints } from '@/lib/api';
import { type SearchResults, type SearchSkill, type SearchUserResult } from '../types';
import { type SearchStateProps } from './useSearchState';

// Globálna cache výsledkov vyhľadávania v pamäti – prežije unmount/mount SearchModule
const globalSearchResultsCache = new Map<string, SearchResults>();

export interface SearchApiProps {
  handleSearch: (event?: React.FormEvent) => Promise<void>;
  filteredSkills: SearchSkill[];
  hasResults: boolean;
  hasPanelResults: boolean;
  invalidateCache: () => void;
}

interface UseSearchApiParams {
  searchState: SearchStateProps;
}

/**
 * Custom hook pre API volania a cache management
 */
export function useSearchApi({ searchState }: UseSearchApiParams): SearchApiProps {
  const { t, country } = useLanguage();
  
  // Cache pre výsledky vyhľadávania v pamäti – zdieľaná medzi inštanciami SearchModule
  const searchCacheRef = useRef<Map<string, SearchResults>>(globalSearchResultsCache);

  const {
    searchQuery,
    results,
    setResults,
    isSearching,
    setIsSearching,
    setError,
    setHasSearched,
    setIsFromRecentSearch,
    offerType,
    onlyMyLocation,
    priceMin,
    priceMax,
    showSkills,
    showUsers,
    searchAbortControllerRef,
  } = searchState;

  // Filtrované výsledky ponúk
  const filteredSkills = results?.skills || [];

  const hasResults = !!results && (filteredSkills.length > 0 || results.users.length > 0);

  const hasPanelResults = !!results && 
    ((showSkills && filteredSkills.length > 0) || 
     (showUsers && results.users.length > 0));

  const invalidateCache = useCallback(() => {
    searchCacheRef.current.clear();
  }, []);

  // Uložiť výsledky do localStorage histórie
  const saveResultsToHistory = useCallback((skills: SearchSkill[], users: SearchUserResult[]) => {
    if (typeof window === 'undefined' || (skills.length === 0 && users.length === 0)) {
      return;
    }

    try {
      const stored = localStorage.getItem('searchRecentResults');
      let searches: SearchResults[] = stored ? JSON.parse(stored) : [];
      
      // Vytvoriť nový výsledok
      const newResult: SearchResults = { skills, users };
      
      // Odstrániť duplikáty - porovnať podľa ID výsledkov
      const removeDuplicates = (results: SearchResults[]): SearchResults[] => {
        const seen = new Set<string>();
        return results.filter((result) => {
          // Vytvoriť unikátny kľúč z ID skills a users
          const skillIds = result.skills.map(s => s.id).sort().join(',');
          const userIds = result.users.map(u => u.id).sort().join(',');
          const key = `${skillIds}|${userIds}`;
          
          if (seen.has(key)) {
            return false;
          }
          seen.add(key);
          return true;
        });
      };
      
      // Pridať nový výsledok na začiatok
      searches = removeDuplicates([newResult, ...searches]);
      
      // Obmedziť na 20 posledných
      searches = searches.slice(0, 20);
      
      // Uložiť späť
      localStorage.setItem('searchRecentResults', JSON.stringify(searches));
    } catch (error) {
      // Ignorovať chyby pri ukladaní
    }
  }, []);

  const handleSearch = useCallback(async (event?: React.FormEvent) => {
    if (event) {
      event.preventDefault();
    }

    const q = searchQuery.trim();

    if (!q) {
      setResults({ skills: [], users: [] });
      setError(null);
      setHasSearched(true);
      setIsFromRecentSearch(false);
      return;
    }

    // Kľúč pre cache – závisí od textu, filtrov aj krajiny
    const cacheKey = JSON.stringify({
      q,
      offerType,
      onlyMyLocation,
      priceMin: priceMin || '',
      priceMax: priceMax || '',
      country: country || '',
    });

    // Ak máme výsledok v cache, použi ho a nevolaj API znova
    const cached = searchCacheRef.current.get(cacheKey);
    if (cached) {
      setResults(cached);
      setIsSearching(false);
      setError(null);
      setHasSearched(true);
      setIsFromRecentSearch(false);
      return;
    }

    // Zruš predchádzajúci request, ak ešte beží
    if (searchAbortControllerRef.current) {
      searchAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    searchAbortControllerRef.current = controller;

    setIsSearching(true);
    setError(null);
    setIsFromRecentSearch(false);

    try {
      const response = await api.get(endpoints.dashboard.search, {
        params: {
          q,
          location: '',
          offer_type: offerType === 'all' ? '' : offerType,
          only_my_location: onlyMyLocation ? '1' : '',
          price_min: priceMin || '',
          price_max: priceMax || '',
          country: country || '', // Filter podľa krajiny
        },
        signal: controller.signal,
      });

      const data = response.data || {};
      const skills = Array.isArray(data.skills) ? (data.skills as SearchSkill[]) : [];
      const users = Array.isArray(data.users)
        ? (data.users as SearchUserResult[])
        : [];

      const newResults: SearchResults = { skills, users };
      setResults(newResults);

      // Ulož do pamäťovej cache pre rovnaké vyhľadávanie v rámci session
      searchCacheRef.current.set(cacheKey, newResults);

      // Uložiť výsledky do histórie localStorage
      saveResultsToHistory(skills, users);

    } catch (e: any) {
      // Ignoruj zrušené požiadavky (nové vyhľadávanie prebehlo skôr)
      if (e?.name === 'CanceledError' || e?.code === 'ERR_CANCELED') {
        return;
      }
      console.error('Chyba pri vyhľadávaní:', e);

      // Graceful handling 429 – nechaj posledné výsledky, zobraz len jemnú hlášku
      if (e?.response?.status === 429) {
        const message =
          t('search.tooManyRequests', 'Príliš veľa požiadaviek, skúste o chvíľu.');
        setError(message);
      } else {
        const message =
          e?.response?.data?.error ||
          t('search.error', 'Chyba pri vyhľadávaní. Skúste to znova.');
        setError(message);
      }
    } finally {
      setIsSearching(false);
      setHasSearched(true);
      searchAbortControllerRef.current = null;
    }
  }, [
    searchQuery, 
    offerType, 
    onlyMyLocation, 
    priceMin, 
    priceMax,
    country, // Pridané pre filtrovanie podľa krajiny
    setResults,
    setError,
    setHasSearched,
    setIsFromRecentSearch,
    setIsSearching,
    searchAbortControllerRef,
    t,
    saveResultsToHistory
  ]);

  return {
    handleSearch,
    filteredSkills,
    hasResults,
    hasPanelResults,
    invalidateCache,
  };
}

// Export funkcie pre invalidáciu search cache pre konkrétneho používateľa
export const invalidateSearchCacheForUser = (userId: number): void => {
  // Prejdi všetky cache entries a odstráň tie, ktoré obsahujú tohto používateľa so starým slugom
  // Alebo jednoducho invaliduj celú cache (jednoduchšie riešenie)
  // Pre teraz invalidujeme celú cache, keď sa zmení slug používateľa
  globalSearchResultsCache.clear();
};
