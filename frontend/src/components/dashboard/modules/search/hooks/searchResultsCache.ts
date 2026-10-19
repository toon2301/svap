import type { SearchResults } from '../types';

export const SEARCH_RESULTS_CACHE_TTL_MS = 5 * 60_000;
export const SEARCH_RESULTS_CACHE_MAX_ENTRIES = 50;

export interface SearchCacheKeyInput {
  viewerId: number;
  query: string;
  offerType: 'all' | 'offer' | 'seeking';
  onlyMyLocation: boolean;
  priceMin: string;
  priceMax: string;
  country: string;
  viewerLocation?: string;
  viewerDistrict?: string;
}

type CacheEntry = { viewerId: number; results: SearchResults; savedAt: number };

const entries = new Map<string, CacheEntry>();
let revision = 0;

/** Never create a shared or anonymous cache identity from an unconfirmed account. */
function isViewerId(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

/** Keep account, geography and all request-affecting filters separate without changing request semantics. */
export function buildSearchCacheKey(input: SearchCacheKeyInput): string | null {
  if (!isViewerId(input.viewerId)) return null;
  return JSON.stringify({
    viewerId: input.viewerId,
    query: input.query.trim(),
    offerType: input.offerType,
    onlyMyLocation: input.onlyMyLocation,
    priceMin: input.priceMin.trim(),
    priceMax: input.priceMax.trim(),
    country: input.country,
    viewerLocation: input.viewerLocation ?? '',
    viewerDistrict: input.viewerDistrict ?? '',
  });
}

/** Read only the account identity needed to invalidate entries without retaining duplicate key metadata. */
function viewerIdFromKey(key: string): number | null {
  try {
    const parsed: unknown = JSON.parse(key);
    const id = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>).viewerId : null;
    return isViewerId(id) ? id : null;
  } catch {
    return null;
  }
}

/** Return a bounded-lifetime preliminary snapshot and touch its LRU position, not its freshness. */
export function getCachedSearchResults(key: string | null): SearchResults | null {
  if (!key) return null;
  const entry = entries.get(key);
  if (!entry) return null;
  const age = Date.now() - entry.savedAt;
  if (age < 0 || age >= SEARCH_RESULTS_CACHE_TTL_MS) {
    entries.delete(key);
    return null;
  }
  entries.delete(key);
  entries.set(key, entry);
  return entry.results;
}

/** Cache a successful response only while its original invalidation generation is still current. */
export function setCachedSearchResults(
  key: string | null,
  results: SearchResults,
  expectedRevision: number,
): boolean {
  if (expectedRevision !== revision || !key) return false;
  const viewerId = viewerIdFromKey(key);
  if (viewerId === null) return false;
  entries.delete(key);
  entries.set(key, { viewerId, results, savedAt: Date.now() });
  while (entries.size > SEARCH_RESULTS_CACHE_MAX_ENTRIES) {
    // A positive size guarantees the first entry exists.
    entries.delete(entries.keys().next().value as string);
  }
  return true;
}

/** Capture the generation before requesting data so late responses cannot undo an invalidation. */
export function getSearchCacheRevision(): number {
  return revision;
}

/** End the current cache generation, including pending writes, before removing every snapshot. */
export function clearSearchResultsCache(): void {
  revision += 1;
  entries.clear();
}

/** Evict whole affected responses rather than presenting locally filtered snapshots as server truth. */
export function invalidateSearchResultsForUser(userId: number): void {
  if (!isViewerId(userId)) return;
  revision += 1;
  entries.forEach((entry, key) => {
    if (entry.viewerId === userId
      || entry.results.users.some((user) => user.id === userId)
      || entry.results.skills.some((skill) => skill.user_id === userId)) {
      entries.delete(key);
    }
  });
}
