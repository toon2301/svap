"use client";

import { useCallback, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import type { AxiosError } from 'axios';
import { useLanguage } from '@/contexts/LanguageContext';
import { api, endpoints } from '@/lib/api';
import { type SearchResults, type SearchSkill, type SearchUserResult } from '../types';
import { type SearchStateProps } from './useSearchState';
import { diagnosticCountry, diagnosticHttpStatus } from '../diagnostics/searchDiagnostics';
import { useSearchDiagnostics, type SearchDiagnostics } from '../diagnostics/useSearchDiagnostics';
import {
  buildSearchCacheKey, clearSearchResultsCache, getCachedSearchResults, getSearchCacheRevision,
  invalidateSearchResultsForUser, setCachedSearchResults,
} from './searchResultsCache';
import { useSearchRequestGuard } from './useSearchRequestGuard';

export interface SearchApiProps {
  handleSearch: (event?: FormEvent) => Promise<void>;
  filteredSkills: SearchSkill[];
  hasResults: boolean;
  hasPanelResults: boolean;
  isRevalidating?: boolean;
  invalidateCache: () => void;
  diagnostics: SearchDiagnostics;
}

interface UseSearchApiParams {
  searchState: SearchStateProps;
  user?: { id: number; location?: string | null; district?: string | null } | null;
  isActive?: boolean;
}

interface SearchApiErrorPayload {
  error?: string;
}

/** Show only this viewer's provisional results, then authorize every update against the server and current context. */
export function useSearchApi({ searchState, user, isActive = true }: UseSearchApiParams): SearchApiProps {
  const { t, searchCountry: country } = useLanguage();
  const diagnostics = useSearchDiagnostics(user?.id, isActive);
  const { begin: beginDiagnostics } = diagnostics;
  const [isRevalidating, setIsRevalidating] = useState(false);
  const pendingRevision = useRef<number | null>(null);
  const {
    searchQuery, results, setResults, setIsSearching, setError, setHasSearched,
    setIsFromRecentSearch, offerType, onlyMyLocation, priceMin, priceMax,
    showSkills, showUsers, searchAbortControllerRef,
  } = searchState;
  const cacheKey = buildSearchCacheKey({
    viewerId: user?.id ?? 0, query: searchQuery, offerType, onlyMyLocation, priceMin, priceMax,
    country: country || '',
    viewerLocation: onlyMyLocation ? user?.location || '' : '',
    viewerDistrict: onlyMyLocation ? user?.district || '' : '',
  });
  const contextKey = cacheKey ?? JSON.stringify({ viewer: null, query: searchQuery });
  const requestGuard = useSearchRequestGuard({
    contextKey, isActive: isActive && cacheKey !== null, controllerRef: searchAbortControllerRef,
  });
  const previousContext = useRef(contextKey);
  const previousViewer = useRef(user?.id);
  const previousActive = useRef(isActive);

  // Clear another query/account before paint, not when the next debounced request finally starts.
  // Recent-history selection has its own flow and does not change this context key.
  useLayoutEffect(() => {
    const reopened = isActive && !previousActive.current;
    previousActive.current = isActive;
    if (previousViewer.current !== user?.id) {
      invalidateSearchResultsForUser(previousViewer.current ?? 0);
      previousViewer.current = user?.id;
    }
    if (previousContext.current !== contextKey || (reopened && searchQuery.trim())) {
      previousContext.current = contextKey;
      setResults(null);
      setError(null);
      setHasSearched(false);
      setIsFromRecentSearch(false);
      setIsSearching(false);
      setIsRevalidating(false);
    }
    if (!isActive) {
      setIsSearching(false);
      setIsRevalidating(false);
    }
  }, [contextKey, isActive, searchQuery, user?.id, setResults, setError, setHasSearched,
    setIsFromRecentSearch, setIsSearching]);

  const filteredSkills = results?.skills || [];
  const hasResults = !!results && (filteredSkills.length > 0 || results.users.length > 0);
  const hasPanelResults = !!results &&
    ((showSkills && filteredSkills.length > 0) || (showUsers && results.users.length > 0));
  const invalidateCache = useCallback(() => clearSearchResultsCache(), []);

  const saveResultsToHistory = useCallback((skills: SearchSkill[], users: SearchUserResult[]) => {
    if (typeof window === 'undefined' || (skills.length === 0 && users.length === 0) || !user?.id) return;
    try {
      const storageKey = `searchRecentResults_${user.id}`;
      const stored = localStorage.getItem(storageKey);
      const searches: SearchResults[] = stored ? JSON.parse(stored) : [];
      const seen = new Set<string>();
      const next = [{ skills, users }, ...searches].filter((result) => {
        const key = `${result.skills.map((skill) => skill.id).sort().join(',')}|${
          result.users.map((person) => person.id).sort().join(',')}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      localStorage.setItem(storageKey, JSON.stringify(next.slice(0, 20)));
    } catch {
      // History is best effort; unavailable storage cannot break a successful search.
    }
  }, [user?.id]);

  const handleSearch = useCallback(async (event?: FormEvent) => {
    event?.preventDefault();
    if (!isActive || cacheKey === null) return;
    const pending = requestGuard.getPending(contextKey);
    if (pending && pendingRevision.current === getSearchCacheRevision()) return pending;
    const previousController = searchAbortControllerRef.current;
    const request = requestGuard.begin(contextKey);
    if (!requestGuard.isCurrent(request)) return;
    previousController?.abort();

    const q = searchQuery.trim();
    const reportDiagnostics = beginDiagnostics({
      country: diagnosticCountry(country), queryLength: q.length, offerType, onlyMyLocation,
      priceMinSet: Boolean(priceMin.trim()), priceMaxSet: Boolean(priceMax.trim()),
    });
    if (!q) {
      reportDiagnostics({ source: 'none', state: 'empty' });
      setResults({ skills: [], users: [] });
      setError(null);
      setHasSearched(false);
      setIsFromRecentSearch(false);
      setIsSearching(false);
      setIsRevalidating(false);
      requestGuard.finish(request);
      return;
    }

    const revision = getSearchCacheRevision();
    pendingRevision.current = revision;
    const cached = getCachedSearchResults(cacheKey);
    setResults(cached);
    setHasSearched(true);
    setIsRevalidating(!!cached && (cached.skills.length > 0 || cached.users.length > 0));
    setIsSearching(true);
    setError(null);
    setIsFromRecentSearch(false);
    reportDiagnostics({ source: 'network', state: 'pending' });

    const work = (async () => {
      let didComplete = false;
      const mayCommit = () => requestGuard.isCurrent(request) && revision === getSearchCacheRevision();
      try {
        const params: Record<string, string> = {
          q, location: '', offer_type: offerType === 'all' ? '' : offerType,
          only_my_location: onlyMyLocation ? '1' : '',
          price_min: priceMin || '', price_max: priceMax || '',
        };
        if (country && country.trim() !== '') params.country = country;
        const response = await api.get(endpoints.dashboard.search, {
          params, signal: request.controller.signal,
        });
        if (!mayCommit()) return;
        const data = response.data || {};
        const skills = Array.isArray(data.skills) ? (data.skills as SearchSkill[]) : [];
        const users = Array.isArray(data.users) ? (data.users as SearchUserResult[]) : [];
        const next: SearchResults = { skills, users };
        if (!setCachedSearchResults(cacheKey, next, revision)) return;
        reportDiagnostics({ source: 'network', state: 'complete',
          httpStatus: diagnosticHttpStatus(response.status), offersCount: skills.length,
          usersCount: users.length, validCollections: Array.isArray(data.skills) && Array.isArray(data.users) });
        setResults(next);
        saveResultsToHistory(skills, users);
        didComplete = true;
      } catch (error: unknown) {
        if (!mayCommit()) return;
        const apiError = error as AxiosError<SearchApiErrorPayload> & { code?: string; name?: string };
        if (apiError.name === 'CanceledError' || apiError.code === 'ERR_CANCELED') {
          reportDiagnostics({ source: 'network', state: 'cancelled' });
          setResults(null);
          setHasSearched(false);
          return;
        }
        // An unsuccessful refresh must not leave an old snapshot looking verified or authorized.
        setResults(null);
        if (apiError.response?.status === 401 || apiError.response?.status === 403) {
          invalidateSearchResultsForUser(user?.id ?? 0);
        }
        reportDiagnostics({ source: 'network', state: 'error',
          httpStatus: diagnosticHttpStatus(apiError.response?.status) });
        const responseError = typeof apiError.response?.data?.error === 'string' ? apiError.response.data.error : null;
        setError(apiError.response?.status === 429
          ? t('search.tooManyRequests', 'Prilis vela poziadaviek, skuste o chvilu.')
          : responseError || t('search.error', 'Chyba pri vyhladavani. Skuste to znova.'));
        didComplete = true;
      } finally {
        if (requestGuard.isCurrent(request)) {
          if (!didComplete && revision !== getSearchCacheRevision()) {
            reportDiagnostics({ source: 'network', state: 'cancelled' });
            setResults(null);
            setHasSearched(false);
          }
          setIsSearching(false);
          setIsRevalidating(false);
          if (didComplete) setHasSearched(true);
          requestGuard.finish(request);
        }
      }
    })();
    requestGuard.attachPromise(request, work);
    return work;
  }, [isActive, cacheKey, contextKey, requestGuard, searchAbortControllerRef, searchQuery,
    beginDiagnostics, country, offerType, onlyMyLocation, priceMin, priceMax, setResults,
    setHasSearched, setIsSearching, setError, setIsFromRecentSearch, saveResultsToHistory, t, user?.id]);

  return { handleSearch, filteredSkills, hasResults, hasPanelResults,
    isRevalidating: isRevalidating && hasPanelResults, invalidateCache, diagnostics };
}

/** Preserve the public invalidation API used by profile visibility and blocking flows. */
export const invalidateSearchCacheForUser = invalidateSearchResultsForUser;
