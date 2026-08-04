'use client';

/**
 * Cursor-based donačítavanie feedu.
 *
 * Vychádza z useNotificationsFeed (dedup podľa id, loadingMoreRef guard proti
 * dvojitému volaniu), ale stránkovanie je cursor-based: namiesto pageRef/
 * totalPages si držíme `next` URL z odpovede. Príznak "je ďalšia stránka" je
 * teda samotná existencia `next`, nie porovnanie čísel strán.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { listFeedPosts, type FeedPost, type ListFeedPostsParams } from '@/lib/feedApi';

export type FeedLoader = (params: ListFeedPostsParams) => Promise<{
  results: FeedPost[];
  next: string | null;
}>;

type UseFeedInfiniteScrollOptions = {
  pageSize?: number;
  /** Vlastný zdroj dát (profilové zoznamy vo Fáze 4.5); default = hlavný feed. */
  loader?: FeedLoader;
};

export function useFeedInfiniteScroll(options: UseFeedInfiniteScrollOptions = {}) {
  const { pageSize, loader } = options;
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const nextUrlRef = useRef<string | null>(null);
  const loadingMoreRef = useRef(false);
  // Loader drží ref, aby sa efekt prvého načítania nereštartoval pri každom
  // rendri rodiča (inline funkcia by inak menila identitu).
  const loaderRef = useRef<FeedLoader | undefined>(loader);
  loaderRef.current = loader;

  const fetchPage = useCallback(
    (params: ListFeedPostsParams) => {
      const activeLoader = loaderRef.current;
      return activeLoader ? activeLoader(params) : listFeedPosts(params);
    },
    [],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await fetchPage({ pageSize });
      setPosts(page.results);
      nextUrlRef.current = page.next;
      setHasMore(Boolean(page.next));
    } catch {
      setError('feed.loadError');
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [fetchPage, pageSize]);

  const loadMore = useCallback(async () => {
    // Guard: IntersectionObserver vie vystreliť viackrát za jeden scroll.
    if (loadingMoreRef.current || !nextUrlRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setError(null);

    try {
      const page = await fetchPage({ cursorUrl: nextUrlRef.current });
      setPosts((current) => {
        // Dedup podľa id – kurzor je stabilný, ale nový príspevok medzi
        // requestmi môže hranicu stránky posunúť.
        const seen = new Set(current.map((post) => post.id));
        return [...current, ...page.results.filter((post) => !seen.has(post.id))];
      });
      nextUrlRef.current = page.next;
      setHasMore(Boolean(page.next));
    } catch {
      setError('feed.loadMoreError');
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [fetchPage]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    posts,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    reload: load,
    isEmpty: !loading && !error && posts.length === 0,
  };
}

type UseInfiniteScrollSentinelOptions = {
  onIntersect: () => void;
  enabled: boolean;
  /** Načítaj ešte pred koncom zoznamu, nech scroll nezasekne. */
  rootMargin?: string;
};

/**
 * Sentinel observer – vráti ref, ktorý sa pripne na prázdny <div> na konci
 * zoznamu. Keď sa priblíži do viewportu (rootMargin), zavolá onIntersect.
 *
 * IntersectionObserver appka inde nepoužíva; v prostrediach bez neho (staršie
 * prehliadače, jsdom bez mocku) sa observer nenaviaže a zoznam ostane
 * použiteľný – donačítanie vtedy spustí manuálne tlačidlo vo FeedList.
 */
export function useInfiniteScrollSentinel({
  onIntersect,
  enabled,
  rootMargin = '400px',
}: UseInfiniteScrollSentinelOptions) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const onIntersectRef = useRef(onIntersect);
  onIntersectRef.current = onIntersect;

  useEffect(() => {
    if (!enabled) return;
    const node = sentinelRef.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onIntersectRef.current();
        }
      },
      { rootMargin },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, rootMargin]);

  return sentinelRef;
}
