import type { SearchResults } from '../types';
import {
  buildSearchCacheKey,
  clearSearchResultsCache,
  getCachedSearchResults,
  getSearchCacheRevision,
  invalidateSearchResultsForUser,
  SEARCH_RESULTS_CACHE_MAX_ENTRIES,
  SEARCH_RESULTS_CACHE_TTL_MS,
  setCachedSearchResults,
  type SearchCacheKeyInput,
} from './searchResultsCache';

const START = 1_700_000_000_000;
const input: SearchCacheKeyInput = {
  viewerId: 101, query: 'Monitorovanie', offerType: 'all', onlyMyLocation: false,
  priceMin: '', priceMax: '', country: 'SK',
};
const empty: SearchResults = { skills: [], users: [] };
const result: SearchResults = {
  skills: [{ id: 701, user_id: 301, category: 'Synthetic', subcategory: 'Monitoring', description: '' }],
  users: [{ id: 302, display_name: 'Synthetic result', is_verified: false }],
};

/** Build a request key without changing the common fixture's account or filter values. */
function key(changes: Partial<SearchCacheKeyInput> = {}) {
  return buildSearchCacheKey({ ...input, ...changes });
}

/** Store fixtures through the public generation-aware API, never through hidden module state. */
function save(cacheKey: string | null, value = result) {
  return setCachedSearchResults(cacheKey, value, getSearchCacheRevision());
}

beforeEach(() => {
  jest.spyOn(Date, 'now').mockReturnValue(START);
  clearSearchResultsCache();
});

afterEach(() => jest.restoreAllMocks());

describe('request identities', () => {
  it('trims query and prices but preserves the country and profile location exactly', () => {
    expect(JSON.parse(key({ query: '  Monitorovanie  ', priceMin: ' 5 ', priceMax: ' 25 ',
      country: 'CZ', viewerLocation: 'Praha', viewerDistrict: 'Praha 1' })!)).toEqual({
      viewerId: 101, query: 'Monitorovanie', offerType: 'all', onlyMyLocation: false,
      priceMin: '5', priceMax: '25', country: 'CZ', viewerLocation: 'Praha', viewerDistrict: 'Praha 1',
    });
    expect(key()).toBe(key({ viewerLocation: '', viewerDistrict: '' }));
    expect(key({ country: 'sk' })).not.toBe(key({ country: 'SK' }));
  });

  it.each<Partial<SearchCacheKeyInput>>([
    { viewerId: 102 }, { query: 'Another query' }, { query: 'MONITOROVANIE' },
    { offerType: 'offer' }, { offerType: 'seeking' }, { onlyMyLocation: true },
    { priceMin: '1' }, { priceMax: '50' }, { country: 'CZ' },
    { viewerLocation: 'Bratislava' }, { viewerDistrict: 'Bratislava I' },
  ])('separates every request-affecting variation %j', (changes) => {
    save(key());
    expect(key(changes)).not.toBe(key());
    expect(getCachedSearchResults(key(changes))).toBeNull();
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])('rejects unconfirmed or invalid viewer ID %p', (viewerId) => {
    expect(key({ viewerId })).toBeNull();
  });

  it('keeps delimiter-like query text and different field boundaries collision-free', () => {
    expect(key({ query: 'a|b', priceMin: 'c' })).not.toBe(key({ query: 'a', priceMin: 'b|c' }));
  });
});

describe('bounded preliminary snapshots', () => {
  it('returns null for missing keys and caches even a legitimate empty response', () => {
    expect(getCachedSearchResults(null)).toBeNull();
    expect(getCachedSearchResults(key())).toBeNull();
    expect(save(key(), empty)).toBe(true);
    expect(getCachedSearchResults(key())).toBe(empty);
  });

  it('preserves independent snapshots for different accounts', () => {
    save(key(), result);
    save(key({ viewerId: 102 }), empty);
    expect(getCachedSearchResults(key())).toBe(result);
    expect(getCachedSearchResults(key({ viewerId: 102 }))).toBe(empty);
  });

  it('expires at the exact TTL boundary even when a recent read touched the LRU order', () => {
    save(key());
    jest.spyOn(Date, 'now').mockReturnValue(START + SEARCH_RESULTS_CACHE_TTL_MS - 1);
    expect(getCachedSearchResults(key())).toBe(result);
    jest.spyOn(Date, 'now').mockReturnValue(START + SEARCH_RESULTS_CACHE_TTL_MS);
    expect(getCachedSearchResults(key())).toBeNull();
    expect(getCachedSearchResults(key())).toBeNull();
  });

  it('does not revive a snapshot after the clock moves behind its saved timestamp', () => {
    save(key());
    jest.spyOn(Date, 'now').mockReturnValue(START - 1);
    expect(getCachedSearchResults(key())).toBeNull();
    jest.spyOn(Date, 'now').mockReturnValue(START);
    expect(getCachedSearchResults(key())).toBeNull();
  });

  it('a new server response replaces both data and freshness for the same key', () => {
    save(key());
    jest.spyOn(Date, 'now').mockReturnValue(START + SEARCH_RESULTS_CACHE_TTL_MS - 1);
    expect(save(key(), empty)).toBe(true);
    jest.spyOn(Date, 'now').mockReturnValue(START + SEARCH_RESULTS_CACHE_TTL_MS);
    expect(getCachedSearchResults(key())).toBe(empty);
  });

  it('evicts the least recently read entry when the fixed capacity is exceeded', () => {
    for (let index = 0; index < SEARCH_RESULTS_CACHE_MAX_ENTRIES; index += 1) save(key({ query: `Query ${index}` }));
    expect(getCachedSearchResults(key({ query: 'Query 0' }))).toBe(result);
    save(key({ query: 'Newest query' }));
    expect(getCachedSearchResults(key({ query: 'Query 1' }))).toBeNull();
    expect(getCachedSearchResults(key({ query: 'Query 0' }))).toBe(result);
    expect(getCachedSearchResults(key({ query: 'Newest query' }))).toBe(result);
  });

  it('updating an existing entry does not grow the cache or evict unrelated entries', () => {
    for (let index = 0; index < SEARCH_RESULTS_CACHE_MAX_ENTRIES; index += 1) save(key({ query: `Query ${index}` }));
    save(key({ query: 'Query 0' }), empty);
    expect(getCachedSearchResults(key({ query: 'Query 1' }))).toBe(result);
    save(key({ query: 'Newest query' }));
    // The preceding verification touched Query 1, so Query 2 is now the least recently used.
    expect(getCachedSearchResults(key({ query: 'Query 2' }))).toBeNull();
    expect(getCachedSearchResults(key({ query: 'Query 1' }))).toBe(result);
    expect(getCachedSearchResults(key({ query: 'Query 0' }))).toBe(empty);
  });
});

describe('invalidation revisions and whole-response eviction', () => {
  it('clears all accounts and refuses any response captured before the clear', () => {
    const captured = getSearchCacheRevision();
    save(key());
    save(key({ viewerId: 102 }));
    clearSearchResultsCache();
    expect(getSearchCacheRevision()).toBe(captured + 1);
    expect(getCachedSearchResults(key())).toBeNull();
    expect(getCachedSearchResults(key({ viewerId: 102 }))).toBeNull();
    expect(setCachedSearchResults(key(), result, captured)).toBe(false);
    expect(save(key())).toBe(true);
  });

  it.each([null, '', 'invalid json', 'null', '[]', '42', '{"viewerId":0}', '{"viewerId":1.5}'])(
    'does not store an unusable or anonymous key %p', (cacheKey) => {
      expect(save(cacheKey)).toBe(false);
      expect(getCachedSearchResults(cacheKey)).toBeNull();
    },
  );

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])('invalid owner invalidation %p is a no-op', (userId) => {
    save(key());
    const before = getSearchCacheRevision();
    invalidateSearchResultsForUser(userId);
    expect(getSearchCacheRevision()).toBe(before);
    expect(getCachedSearchResults(key())).toBe(result);
  });

  it.each([101, 301, 302])('evicts the complete response when %s is its viewer, card owner or listed user', (userId) => {
    save(key());
    save(key({ viewerId: 102 }), empty);
    const before = getSearchCacheRevision();
    invalidateSearchResultsForUser(userId);
    expect(getSearchCacheRevision()).toBe(before + 1);
    expect(getCachedSearchResults(key())).toBeNull();
    expect(getCachedSearchResults(key({ viewerId: 102 }))).toBe(empty);
    // A late response must not reintroduce the invalidated user or its formerly cached cards.
    expect(setCachedSearchResults(key(), result, before)).toBe(false);
  });

  it('invalidates pending responses even when the target was not in any completed entry', () => {
    save(key(), empty);
    const captured = getSearchCacheRevision();
    invalidateSearchResultsForUser(999);
    expect(getSearchCacheRevision()).toBe(captured + 1);
    expect(getCachedSearchResults(key())).toBe(empty);
    expect(setCachedSearchResults(key(), result, captured)).toBe(false);
  });

  it('allows a fresh response after owner invalidation and keeps fresh empty snapshots distinct', () => {
    save(key());
    invalidateSearchResultsForUser(301);
    expect(save(key(), empty)).toBe(true);
    expect(getCachedSearchResults(key())).toBe(empty);
  });
});
