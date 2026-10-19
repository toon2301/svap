import { act, renderHook } from '@testing-library/react';
import { api } from '@/lib/api';
import type { SearchResults } from '../types';
import { useSearchApi } from './useSearchApi';
import { useSearchState } from './useSearchState';
import {
  buildSearchCacheKey, clearSearchResultsCache, getCachedSearchResults,
  SEARCH_RESULTS_CACHE_TTL_MS,
} from './searchResultsCache';

/** Keep message assertions independent from locale dictionaries without replacing any search logic. */
const mockTranslate = (key: string) => `translated:${key}`;
let mockCountry: string | null = 'SK';
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: mockTranslate, searchCountry: mockCountry }),
}));
jest.mock('@/lib/api', () => ({
  api: { get: jest.fn() },
  endpoints: { dashboard: { search: '/synthetic-search/' } },
}));

const mockGet = api.get as jest.Mock;
const oldResults: SearchResults = {
  skills: [{ id: 701, user_id: 301, category: 'Synthetic', subcategory: 'Monitoring', description: '' }],
  users: [{ id: 302, display_name: 'Synthetic user', is_verified: false }],
};
const freshResults: SearchResults = {
  skills: [{ ...oldResults.skills[0], id: 702, description: 'Updated synthetic content' }], users: [],
};
const empty: SearchResults = { skills: [], users: [] };
const viewer = { id: 101, location: 'Bratislava', district: 'Bratislava I' };
type Viewer = typeof viewer;
type Props = { user?: Viewer | null; active: boolean };

/** Exercise real state, request guards, cache and diagnostics with only the transport/context replaced. */
function harness(user: Viewer | null | undefined = viewer) {
  return renderHook(({ user, active }: Props) => {
    const state = useSearchState();
    const search = useSearchApi({ searchState: state, user, isActive: active });
    return { state, search };
  }, { initialProps: { user, active: true } });
}

type Harness = ReturnType<typeof harness>;

/** Hold a real request boundary so provisional cache state can be asserted before server verification. */
function deferred() {
  let resolve!: (response: { data: SearchResults; status: number }) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<{ data: SearchResults; status: number }>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

/** Change the real input state and let layout effects invalidate any older request context. */
function setQuery(hook: Harness, query = 'synthetic-monitoring') {
  act(() => hook.result.current.state.setSearchQuery(query));
}

/** Start without awaiting, exposing the pending render rather than immediately resolving a mocked response. */
function start(hook: Harness): Promise<void> {
  let work!: Promise<void>;
  act(() => { work = hook.result.current.search.handleSearch(); });
  return work;
}

/** Resolve successful transport work and all consequent React updates together. */
async function finish(pending: ReturnType<typeof deferred>, work: Promise<void>, data = freshResults) {
  await act(async () => { pending.resolve({ data, status: 200 }); await work; });
}

/** Perform the initial verified search used to populate the actual shared cache. */
async function verified(hook: Harness, data = oldResults) {
  mockGet.mockResolvedValueOnce({ data, status: 200 });
  setQuery(hook);
  await act(async () => { await hook.result.current.search.handleSearch(); });
}

/** Read the actual cache entry for the fixture's viewer and current local filter state. */
function cacheKey(hook: Harness, user = viewer) {
  const state = hook.result.current.state;
  return buildSearchCacheKey({
    viewerId: user.id, query: state.searchQuery, offerType: state.offerType,
    onlyMyLocation: state.onlyMyLocation, priceMin: state.priceMin, priceMax: state.priceMax,
    country: mockCountry || '', viewerLocation: state.onlyMyLocation ? user.location : '',
    viewerDistrict: state.onlyMyLocation ? user.district : '',
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockReset();
  localStorage.clear();
  clearSearchResultsCache();
  mockCountry = 'SK';
});

afterEach(() => jest.restoreAllMocks());

describe('cached search snapshots are provisional until the server verifies them', () => {
  it.each([
    { name: 'updated cards', response: freshResults },
    { name: 'empty current results', response: empty },
  ])('revalidates a preview and replaces it with $name without premature history writes', async ({ response }) => {
    const hook = harness();
    await verified(hook);
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(hook.result.current.state.results).toEqual(oldResults);
    const historyBefore = localStorage.getItem('searchRecentResults_101');
    const writes = jest.spyOn(Storage.prototype, 'setItem');
    writes.mockClear();
    const pending = deferred();
    mockGet.mockReturnValueOnce(pending.promise);
    const work = start(hook);

    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(hook.result.current.state.results).toEqual(oldResults);
    expect(hook.result.current.state.isSearching).toBe(true);
    expect(hook.result.current.search.isRevalidating).toBe(true);
    expect(writes).not.toHaveBeenCalled();
    expect(localStorage.getItem('searchRecentResults_101')).toBe(historyBefore);
    await finish(pending, work, response);

    expect(hook.result.current.state.results).toEqual(response);
    expect(hook.result.current.state.isSearching).toBe(false);
    expect(hook.result.current.state.hasSearched).toBe(true);
    expect(hook.result.current.search.isRevalidating).toBe(false);
    expect(getCachedSearchResults(cacheKey(hook))).toEqual(response);
    if (response.skills.length === 0) {
      expect(writes).not.toHaveBeenCalled();
      expect(localStorage.getItem('searchRecentResults_101')).toBe(historyBefore);
    } else {
      expect(writes).toHaveBeenCalledTimes(1);
      expect(JSON.parse(localStorage.getItem('searchRecentResults_101')!)[0]).toEqual(response);
    }
  });

  it('revalidates even a cached empty result and does not label it as a populated preview', async () => {
    const hook = harness();
    await verified(hook, empty);
    const pending = deferred();
    mockGet.mockReturnValueOnce(pending.promise);
    const work = start(hook);
    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(hook.result.current.state.results).toEqual(empty);
    expect(hook.result.current.state.isSearching).toBe(true);
    expect(hook.result.current.search.isRevalidating).toBe(false);
    expect(hook.result.current.search.hasPanelResults).toBe(false);
    expect(localStorage.getItem('searchRecentResults_101')).toBeNull();
    await finish(pending, work);
    expect(hook.result.current.state.results).toEqual(freshResults);
  });

  it('can immediately preview user-only results while verifying their current server state', async () => {
    const hook = harness();
    await verified(hook, { skills: [], users: oldResults.users });
    const pending = deferred();
    mockGet.mockReturnValueOnce(pending.promise);
    const work = start(hook);
    expect(hook.result.current.search.isRevalidating).toBe(true);
    expect(hook.result.current.search.hasPanelResults).toBe(true);
    await finish(pending, work, empty);
    expect(hook.result.current.search.hasResults).toBe(false);
  });

  it('survives remount for the same viewer but still makes a second verification request', async () => {
    const original = harness();
    await verified(original);
    original.unmount();
    const returned = harness();
    setQuery(returned);
    const pending = deferred();
    mockGet.mockReturnValueOnce(pending.promise);
    const work = start(returned);
    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(returned.result.current.state.results).toEqual(oldResults);
    expect(returned.result.current.search.isRevalidating).toBe(true);
    await finish(pending, work);
    expect(returned.result.current.state.results).toEqual(freshResults);
  });

  it('does not preview another viewer\'s cache for an identical query and filters', async () => {
    const original = harness();
    await verified(original);
    original.unmount();
    const nextViewer = { ...viewer, id: 102 };
    const next = harness(nextViewer);
    setQuery(next);
    const pending = deferred();
    mockGet.mockReturnValueOnce(pending.promise);
    const work = start(next);
    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(next.result.current.state.results).toBeNull();
    expect(next.result.current.search.isRevalidating).toBe(false);
    expect(localStorage.getItem('searchRecentResults_102')).toBeNull();
    await finish(pending, work);
    expect(next.result.current.state.results).toEqual(freshResults);
    expect(JSON.parse(localStorage.getItem('searchRecentResults_102')!)[0]).toEqual(freshResults);
  });

  it('clears the previous account before paint when the same mounted search changes viewer', async () => {
    const hook = harness();
    await verified(hook);
    const previousKey = cacheKey(hook);
    hook.rerender({ user: { ...viewer, id: 102 }, active: true });
    expect(hook.result.current.state.results).toBeNull();
    expect(hook.result.current.state.hasSearched).toBe(false);
    expect(getCachedSearchResults(previousKey)).toBeNull();
    const pending = deferred();
    mockGet.mockReturnValueOnce(pending.promise);
    const work = start(hook);
    expect(hook.result.current.state.results).toBeNull();
    expect(mockGet).toHaveBeenCalledTimes(2);
    await finish(pending, work);
    expect(hook.result.current.state.results).toEqual(freshResults);
    expect(JSON.parse(localStorage.getItem('searchRecentResults_102')!)[0]).toEqual(freshResults);
  });

  it('does not preview an expired snapshot at the exact five-minute TTL boundary', async () => {
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now);
    const hook = harness();
    await verified(hook);
    jest.spyOn(Date, 'now').mockReturnValue(now + SEARCH_RESULTS_CACHE_TTL_MS);
    const pending = deferred();
    mockGet.mockReturnValueOnce(pending.promise);
    const work = start(hook);
    expect(hook.result.current.state.results).toBeNull();
    expect(hook.result.current.search.isRevalidating).toBe(false);
    expect(mockGet).toHaveBeenCalledTimes(2);
    await finish(pending, work);
  });
});

describe('failed verification never presents an old snapshot as current', () => {
  it.each([
    { name: 'network', error: new Error('Synthetic network error'), evicted: false, message: 'translated:search.error' },
    { name: 'unauthorized', error: { response: { status: 401 } }, evicted: true, message: 'translated:search.error' },
    { name: 'forbidden', error: { response: { status: 403 } }, evicted: true, message: 'translated:search.error' },
    { name: 'rate-limited', error: { response: { status: 429 } }, evicted: false, message: 'translated:search.tooManyRequests' },
  ])('clears the $name preview and evicts only authorization failures', async ({ error, evicted, message }) => {
    const hook = harness();
    await verified(hook);
    const storedKey = cacheKey(hook);
    const historyBefore = localStorage.getItem('searchRecentResults_101');
    const pending = deferred();
    mockGet.mockReturnValueOnce(pending.promise);
    const work = start(hook);
    expect(hook.result.current.state.results).toEqual(oldResults);
    await act(async () => { pending.reject(error); await work; });
    expect(hook.result.current.state.results).toBeNull();
    expect(hook.result.current.state.isSearching).toBe(false);
    expect(hook.result.current.search.isRevalidating).toBe(false);
    expect(hook.result.current.search.hasResults).toBe(false);
    expect(hook.result.current.state.error).toBe(message);
    expect(localStorage.getItem('searchRecentResults_101')).toBe(historyBefore);
    expect(getCachedSearchResults(storedKey)).toEqual(evicted ? null : oldResults);
  });
});

describe('viewer locality and account eligibility remain part of the real request context', () => {
  it.each([
    { field: 'location' as const, onlyMyLocation: true },
    { field: 'district' as const, onlyMyLocation: true },
    { field: 'location' as const, onlyMyLocation: false },
    { field: 'district' as const, onlyMyLocation: false },
  ])('isolates $field changes only when local matching is enabled ($onlyMyLocation)', async ({ field, onlyMyLocation }) => {
    const hook = harness();
    act(() => hook.result.current.state.setOnlyMyLocation(onlyMyLocation));
    await verified(hook);
    const changed = { ...viewer, [field]: 'Changed synthetic locality' };
    hook.rerender({ user: changed, active: true });
    const pending = deferred();
    mockGet.mockReturnValueOnce(pending.promise);
    const work = start(hook);
    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(hook.result.current.state.results).toEqual(onlyMyLocation ? null : oldResults);
    expect(hook.result.current.search.isRevalidating).toBe(!onlyMyLocation);
    expect(mockGet.mock.calls[1][1].params.only_my_location).toBe(onlyMyLocation ? '1' : '');
    await finish(pending, work);
  });

  it.each([null, undefined, 0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'does not request or write history for unconfirmed/invalid viewer %p', async (id) => {
      const user = typeof id === 'number' ? { ...viewer, id } : id;
      // Explicit initial props preserve undefined instead of the harness helper's default account.
      const hook = harness();
      hook.rerender({ user, active: true });
      setQuery(hook);
      const writes = jest.spyOn(Storage.prototype, 'setItem');
      await act(async () => { await hook.result.current.search.handleSearch(); });
      expect(mockGet).not.toHaveBeenCalled();
      expect(writes).not.toHaveBeenCalled();
      expect(hook.result.current.state.results).toBeNull();
      expect(hook.result.current.state.hasSearched).toBe(false);
      expect(hook.result.current.state.isSearching).toBe(false);
    },
  );
});
