'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  listOfferWatchMatches,
  normalizeOfferWatchApiError,
  OfferWatchApiError,
} from './offerWatchApi';
import type {
  OfferWatchActionResult,
  OfferWatchMatch,
  OfferWatchMatchesPage,
} from './types';

export type UseOfferWatchMatchesResult = {
  matches: OfferWatchMatch[];
  nextCursor: string | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: OfferWatchApiError | null;
  refresh: () => Promise<OfferWatchActionResult<OfferWatchMatchesPage>>;
  loadMore: () => Promise<OfferWatchActionResult<OfferWatchMatchesPage | null>>;
  clearError: () => void;
};

function appendUniqueMatches(
  current: OfferWatchMatch[],
  incoming: OfferWatchMatch[],
): OfferWatchMatch[] {
  const knownIds = new Set(current.map((match) => match.offer.id));
  return [
    ...current,
    ...incoming.filter((match) => !knownIds.has(match.offer.id)),
  ];
}

export function useOfferWatchMatches(
  watchId: number | null,
): UseOfferWatchMatchesResult {
  const [matches, setMatches] = useState<OfferWatchMatch[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(watchId));
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<OfferWatchApiError | null>(null);
  const mountedRef = useRef(false);
  const requestSequenceRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const loadingMoreRef = useRef(false);
  const nextCursorRef = useRef<string | null>(null);

  const refresh = useCallback(async (): Promise<
    OfferWatchActionResult<OfferWatchMatchesPage>
  > => {
    if (!watchId) {
      const invalid = new OfferWatchApiError('not_found');
      return { ok: false, error: invalid };
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    const sequence = ++requestSequenceRef.current;
    abortRef.current = controller;
    loadingMoreRef.current = false;
    nextCursorRef.current = null;
    if (mountedRef.current) {
      setIsLoading(true);
      setIsLoadingMore(false);
      setNextCursor(null);
      setError(null);
    }

    try {
      const page = await listOfferWatchMatches(watchId, {
        signal: controller.signal,
      });
      if (mountedRef.current && sequence === requestSequenceRef.current) {
        nextCursorRef.current = page.nextCursor;
        setMatches(page.results);
        setNextCursor(page.nextCursor);
        setIsLoading(false);
      }
      return { ok: true, value: page };
    } catch (caught) {
      const normalized = normalizeOfferWatchApiError(caught);
      if (
        mountedRef.current
        && sequence === requestSequenceRef.current
        && normalized.kind !== 'cancelled'
      ) {
        setError(normalized);
        setIsLoading(false);
      }
      return { ok: false, error: normalized };
    }
  }, [watchId]);

  useEffect(() => {
    mountedRef.current = true;
    setMatches([]);
    setNextCursor(null);
    nextCursorRef.current = null;
    if (watchId) {
      void refresh();
    } else {
      setIsLoading(false);
      setError(null);
    }
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
      requestSequenceRef.current += 1;
      loadingMoreRef.current = false;
    };
  }, [refresh, watchId]);

  const loadMore = useCallback(async (): Promise<
    OfferWatchActionResult<OfferWatchMatchesPage | null>
  > => {
    const cursor = nextCursorRef.current;
    if (!watchId || !cursor || loadingMoreRef.current) {
      return { ok: true, value: null };
    }
    loadingMoreRef.current = true;
    const controller = new AbortController();
    abortRef.current = controller;
    const sequence = ++requestSequenceRef.current;
    if (mountedRef.current) {
      setIsLoadingMore(true);
      setError(null);
    }

    try {
      const page = await listOfferWatchMatches(watchId, {
        cursor,
        signal: controller.signal,
      });
      if (mountedRef.current && sequence === requestSequenceRef.current) {
        nextCursorRef.current = page.nextCursor;
        setMatches((current) => appendUniqueMatches(current, page.results));
        setNextCursor(page.nextCursor);
      }
      return { ok: true, value: page };
    } catch (caught) {
      const normalized = normalizeOfferWatchApiError(caught);
      if (
        mountedRef.current
        && sequence === requestSequenceRef.current
        && normalized.kind !== 'cancelled'
      ) {
        setError(normalized);
      }
      return { ok: false, error: normalized };
    } finally {
      loadingMoreRef.current = false;
      if (mountedRef.current && sequence === requestSequenceRef.current) {
        setIsLoadingMore(false);
      }
    }
  }, [watchId]);

  const clearError = useCallback(() => setError(null), []);

  return {
    matches,
    nextCursor,
    isLoading,
    isLoadingMore,
    error,
    refresh,
    loadMore,
    clearError,
  };
}
