'use client';

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

type PreviewTarget = 'users' | 'offers';
type SearchUpdates = Record<string, string | null | undefined>;
type PendingNavigation = {
  source: string;
  target: string;
  superseded: Set<string>;
};

/** Reset only an explicitly requested preview destination, never an ordinary history or tab return. */
export function useSearchPreviewTabNavigation(
  currentQuery: string,
  replaceSearchParams: (updates: SearchUpdates) => void,
): (target: PreviewTarget) => void {
  const pendingRef = useRef<PendingNavigation | null>(null);

  useLayoutEffect(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    if (currentQuery === pending.target) {
      pendingRef.current = null;
      const main = document.querySelector<HTMLElement>('[data-search-scroll-root]');
      if (main) main.scrollTop = 0;
    } else if (currentQuery !== pending.source && !pending.superseded.has(currentQuery)) {
      pendingRef.current = null;
    }
  }, [currentQuery]);

  useEffect(() => {
    /** A history traversal or unmount must not carry a click intent into a different navigation. */
    const discardIntent = () => { pendingRef.current = null; };
    window.addEventListener('popstate', discardIntent);
    return () => {
      discardIntent();
      window.removeEventListener('popstate', discardIntent);
    };
  }, []);

  /** Preserve the existing URL payload and reset once, after this exact destination commits. */
  return useCallback((target: PreviewTarget) => {
    const updates: SearchUpdates = target === 'users'
      ? { tab: 'users', users_page: null }
      : { tab: 'offers', page: '1' };
    const params = new URLSearchParams(currentQuery);
    for (const [key, value] of Object.entries(updates)) {
      if (value == null) params.delete(key);
      else params.set(key, value);
    }
    const expectedQuery = params.toString();
    if (expectedQuery === currentQuery) return;
    const previous = pendingRef.current;
    // The two preview actions may race; an older known destination must not cancel the latest one.
    const superseded = previous?.source === currentQuery
      ? new Set([...previous.superseded, previous.target]) : new Set<string>();
    const pending = { source: currentQuery, target: expectedQuery, superseded };
    pendingRef.current = pending;
    try {
      replaceSearchParams(updates);
    } catch (error) {
      if (pendingRef.current === pending) pendingRef.current = null;
      throw error;
    }
  }, [currentQuery, replaceSearchParams]);
}
