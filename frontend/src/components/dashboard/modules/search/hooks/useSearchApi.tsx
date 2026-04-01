"use client";

import { useRef, useCallback, type FormEvent } from 'react';
import type { AxiosError } from 'axios';
import { useLanguage } from '@/contexts/LanguageContext';
import { api, endpoints } from '@/lib/api';
import { type SearchResults, type SearchSkill, type SearchUserResult } from '../types';
import { type SearchStateProps } from './useSearchState';

// Globalna cache vysledkov vyhladavania v pamati - prezije unmount/mount SearchModule.
const globalSearchResultsCache = new Map<string, SearchResults>();

export interface SearchApiProps {
  handleSearch: (event?: FormEvent) => Promise<void>;
  filteredSkills: SearchSkill[];
  hasResults: boolean;
  hasPanelResults: boolean;
  invalidateCache: () => void;
}

interface UseSearchApiParams {
  searchState: SearchStateProps;
  user?: { id: number } | null;
}

interface SearchApiErrorPayload {
  error?: string;
}

/**
 * Custom hook pre API volania a cache management.
 * V production verzii nepise citlive hladane vyrazy ani plne response do logov.
 */
export function useSearchApi({ searchState, user }: UseSearchApiParams): SearchApiProps {
  const { t, country } = useLanguage();
  const searchCacheRef = useRef<Map<string, SearchResults>>(globalSearchResultsCache);
  const latestRequestIdRef = useRef(0);

  const {
    searchQuery,
    results,
    setResults,
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

  const filteredSkills = results?.skills || [];
  const hasResults = !!results && (filteredSkills.length > 0 || results.users.length > 0);
  const hasPanelResults =
    !!results &&
    ((showSkills && filteredSkills.length > 0) || (showUsers && results.users.length > 0));

  const invalidateCache = useCallback(() => {
    searchCacheRef.current.clear();
  }, []);

  const saveResultsToHistory = useCallback(
    (skills: SearchSkill[], users: SearchUserResult[]) => {
      if (
        typeof window === 'undefined' ||
        (skills.length === 0 && users.length === 0) ||
        !user?.id
      ) {
        return;
      }

      try {
        const storageKey = `searchRecentResults_${user.id}`;
        const stored = localStorage.getItem(storageKey);
        let searches: SearchResults[] = stored ? JSON.parse(stored) : [];

        const newResult: SearchResults = { skills, users };
        const seen = new Set<string>();
        searches = [newResult, ...searches].filter((result) => {
          const skillIds = result.skills.map((skill) => skill.id).sort().join(',');
          const userIds = result.users.map((resultUser) => resultUser.id).sort().join(',');
          const key = `${skillIds}|${userIds}`;
          if (seen.has(key)) {
            return false;
          }
          seen.add(key);
          return true;
        });

        localStorage.setItem(storageKey, JSON.stringify(searches.slice(0, 20)));
      } catch {
        // Best effort only - search musi fungovat aj bez localStorage.
      }
    },
    [user?.id],
  );

  const handleSearch = useCallback(
    async (event?: FormEvent) => {
      if (event) {
        event.preventDefault();
      }

      const q = searchQuery.trim();

      if (searchAbortControllerRef.current) {
        searchAbortControllerRef.current.abort();
        searchAbortControllerRef.current = null;
      }

      const requestId = latestRequestIdRef.current + 1;
      latestRequestIdRef.current = requestId;

      if (!q) {
        setResults({ skills: [], users: [] });
        setError(null);
        setHasSearched(false);
        setIsFromRecentSearch(false);
        setIsSearching(false);
        return;
      }

      const cacheKey = JSON.stringify({
        q,
        offerType,
        onlyMyLocation,
        priceMin: priceMin || '',
        priceMax: priceMax || '',
        country: country || '',
      });

      const cached = searchCacheRef.current.get(cacheKey);
      if (cached) {
        setResults(cached);
        setIsSearching(false);
        setError(null);
        setHasSearched(true);
        setIsFromRecentSearch(false);
        return;
      }

      const controller = new AbortController();
      searchAbortControllerRef.current = controller;
      let didComplete = false;

      setIsSearching(true);
      setError(null);
      setIsFromRecentSearch(false);

      try {
        const params: Record<string, string> = {
          q,
          location: '',
          offer_type: offerType === 'all' ? '' : offerType,
          only_my_location: onlyMyLocation ? '1' : '',
          price_min: priceMin || '',
          price_max: priceMax || '',
        };

        if (country && country.trim() !== '') {
          params.country = country;
        }

        const response = await api.get(endpoints.dashboard.search, {
          params,
          signal: controller.signal,
        });

        if (requestId !== latestRequestIdRef.current) {
          return;
        }

        const data = response.data || {};
        const skills = Array.isArray(data.skills) ? (data.skills as SearchSkill[]) : [];
        const users = Array.isArray(data.users) ? (data.users as SearchUserResult[]) : [];
        const newResults: SearchResults = { skills, users };

        setResults(newResults);
        searchCacheRef.current.set(cacheKey, newResults);
        saveResultsToHistory(skills, users);
        didComplete = true;
      } catch (error: unknown) {
        const apiError = error as AxiosError<SearchApiErrorPayload> & {
          code?: string;
          name?: string;
        };

        if (apiError.name === 'CanceledError' || apiError.code === 'ERR_CANCELED') {
          return;
        }

        if (requestId !== latestRequestIdRef.current) {
          return;
        }

        const responseError =
          typeof apiError.response?.data?.error === 'string'
            ? apiError.response.data.error
            : null;

        if (apiError.response?.status === 429) {
          setError(
            t('search.tooManyRequests', 'Prilis vela poziadaviek, skuste o chvilu.'),
          );
        } else {
          setError(
            responseError || t('search.error', 'Chyba pri vyhladavani. Skuste to znova.'),
          );
        }
        didComplete = true;
      } finally {
        if (requestId !== latestRequestIdRef.current) {
          return;
        }
        setIsSearching(false);
        if (didComplete) {
          setHasSearched(true);
        }
        if (searchAbortControllerRef.current === controller) {
          searchAbortControllerRef.current = null;
        }
      }
    },
    [
      searchQuery,
      offerType,
      onlyMyLocation,
      priceMin,
      priceMax,
      country,
      setResults,
      setError,
      setHasSearched,
      setIsFromRecentSearch,
      setIsSearching,
      searchAbortControllerRef,
      t,
      saveResultsToHistory,
    ],
  );

  return {
    handleSearch,
    filteredSkills,
    hasResults,
    hasPanelResults,
    invalidateCache,
  };
}

export const invalidateSearchCacheForUser = (_userId: number): void => {
  void _userId;
  globalSearchResultsCache.clear();
};
