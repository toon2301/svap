'use client';

import { useCallback, useMemo, useState } from 'react';
import type { User } from '../../types';
import { api, endpoints } from '@/lib/api';

interface BackendSkill {
  id: number;
  category: string;
  subcategory: string;
  description?: string;
  detailed_description?: string;
  experience?: {
    value: number;
    unit: 'years' | 'months';
  } | null;
  tags?: string[];
  price_from?: number | string | null;
  price_currency?: string;
  district?: string;
  location?: string;
  opening_hours?: unknown;
  is_seeking?: boolean;
  urgency?: string | null;
  duration_type?: string | null;
}

interface BackendUserSummary {
  id: number;
  display_name: string;
  district?: string;
  location?: string;
  is_verified: boolean;
  avatar_url?: string | null;
}

interface SearchResults {
  skills: BackendSkill[];
  users: BackendUserSummary[];
  // Pagination môžeš v UI využiť neskôr; teraz stačí mať ho pripravené
  pagination?: {
    page: number;
    per_page: number;
    total_skills: number;
    total_users: number;
    total_pages_skills: number;
    total_pages_users: number;
  };
}

interface UseDashboardSearchOptions {
  user?: User;
}

export function useDashboardSearch({ user }: UseDashboardSearchOptions) {
  const [query, setQuery] = useState('');
  // Predvolená lokalita podľa profilu – okres alebo mesto, ak existujú
  const [location, setLocation] = useState<string>(
    (user?.district || user?.location || '').trim(),
  );
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const runSearch = useCallback(async () => {
    const trimmedQuery = query.trim();
    const trimmedLocation = location.trim();

    setIsLoading(true);
    setError(null);

    try {
      const { data } = await api.get<SearchResults>(endpoints.dashboard.search, {
        params: {
          q: trimmedQuery || undefined,
          location: trimmedLocation || undefined,
        },
      });

      setResults({
        skills: Array.isArray((data as any)?.skills) ? (data as any).skills : [],
        users: Array.isArray((data as any)?.users) ? (data as any).users : [],
        pagination: (data as any)?.pagination,
      });
      setHasSearched(true);
    } catch (err: any) {
      console.error('Search error', err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        err?.message ||
        'Vyhľadávanie zlyhalo. Skúste to znova.';
      setError(msg);
      setHasSearched(true);
    } finally {
      setIsLoading(false);
    }
  }, [query, location]);

  const somethingFound = useMemo(
    () =>
      !!results &&
      ((results.skills && results.skills.length > 0) ||
        (results.users && results.users.length > 0)),
    [results],
  );

  return {
    query,
    setQuery,
    location,
    setLocation,
    results,
    isLoading,
    error,
    hasSearched,
    somethingFound,
    runSearch,
  };
}


