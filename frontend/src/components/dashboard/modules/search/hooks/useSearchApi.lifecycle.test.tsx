import { act, renderHook } from '@testing-library/react';
import { api } from '@/lib/api';
import type { SearchResults } from '../types';
import { invalidateSearchCacheForUser, useSearchApi } from './useSearchApi';
import { useSearchState } from './useSearchState';
import { buildSearchCacheKey, clearSearchResultsCache, getCachedSearchResults } from './searchResultsCache';

let mockCountry = 'SK';
/** Keep lifecycle assertions independent of translation files while retaining real fallback messages. */
const mockTranslate = (_key: string, fallback?: string) => fallback ?? _key;
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ searchCountry: mockCountry, t: mockTranslate }),
}));
jest.mock('@/lib/api', () => ({
  api: { get: jest.fn() }, endpoints: { dashboard: { search: '/dashboard/search/' } },
}));

const mockGet = api.get as jest.Mock;
const oldData: SearchResults = {
  skills: [{ id: 71, user_id: 33, category: 'Events', subcategory: 'Monitoring', description: 'Old' }],
  users: [{ id: 33, display_name: 'Owner', is_verified: false }],
};
const freshData: SearchResults = {
  skills: [{ id: 72, user_id: 34, category: 'Events', subcategory: 'Monitoring', description: 'Fresh' }],
  users: [],
};
type Props = { userId: number; active: boolean; location: string; district: string };
const defaultProps: Props = { userId: 12, active: true, location: 'City A', district: 'District A' };

/** Run real state, cache, ownership and diagnostics hooks; mock only transport and language input. */
function harness(props = defaultProps) {
  return renderHook((current: Props) => {
    const state = useSearchState();
    const search = useSearchApi({ searchState: state,
      user: { id: current.userId, location: current.location, district: current.district },
      isActive: current.active });
    return { state, search };
  }, { initialProps: props });
}
type Harness = ReturnType<typeof harness>;

/** Inspect exactly the cache key authorized by the current real request context. */
function keyFor(hook: Harness, props = defaultProps) {
  const state = hook.result.current.state;
  return buildSearchCacheKey({ viewerId: props.userId, query: state.searchQuery,
    offerType: state.offerType, onlyMyLocation: state.onlyMyLocation,
    priceMin: state.priceMin, priceMax: state.priceMax, country: mockCountry,
    viewerLocation: state.onlyMyLocation ? props.location : '',
    viewerDistrict: state.onlyMyLocation ? props.district : '' });
}

/** Let a raced network operation settle even after cancellation, without assuming Axios rejects on abort. */
function pendingResponse() {
  let resolve!: (value: { data: SearchResults; status: number }) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<{ data: SearchResults; status: number }>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

/** Start after a committed query update without waiting for its controlled network response. */
function start(hook: Harness, query = 'Monitoring') {
  act(() => hook.result.current.state.setSearchQuery(query));
  let work!: Promise<void>;
  act(() => { work = hook.result.current.search.handleSearch(); });
  return work;
}

/** Flush the query render before awaiting a completed request, avoiding nested act batching. */
async function complete(hook: Harness, query = 'Monitoring') {
  const work = start(hook, query);
  await act(async () => { await work; });
}

/** Observe the pending attempt's actual AbortSignal, not an imitation of the ownership guard. */
function signalFor(call = 0): AbortSignal {
  return mockGet.mock.calls[call][1].signal as AbortSignal;
}

/** Read only this synthetic account's existing local history. */
function history(userId = 12) {
  return localStorage.getItem(`searchRecentResults_${userId}`);
}

beforeEach(() => {
  jest.clearAllMocks();
  clearSearchResultsCache();
  localStorage.clear();
  mockCountry = 'SK';
  mockGet.mockReset().mockResolvedValue({ data: freshData, status: 200 });
});

afterEach(() => jest.restoreAllMocks());

describe('real search lifecycle rejects obsolete operations', () => {
  it.each(['success', 'error'])('clearSearch aborts an in-flight %s without UI/cache/history resurrection', async (outcome) => {
    const hook = harness();
    const pending = pendingResponse();
    mockGet.mockReturnValueOnce(pending.promise);
    const work = start(hook);
    const oldKey = keyFor(hook);
    expect(hook.result.current.state.isSearching).toBe(true);
    act(() => hook.result.current.state.clearSearch());
    expect(signalFor().aborted).toBe(true);
    await act(async () => {
      if (outcome === 'success') pending.resolve({ data: oldData, status: 200 });
      else pending.reject(new Error('Old failure'));
      await work;
    });
    expect(hook.result.current.state).toMatchObject({ searchQuery: '', results: null,
      error: null, hasSearched: false, isSearching: false });
    expect(getCachedSearchResults(oldKey)).toBeNull();
    expect(history()).toBeNull();
  });

  it.each(['query', 'type', 'locality', 'price-min', 'price-max', 'country', 'account', 'profile-location', 'profile-district'])(
    '%s invalidates success and error before another debounced request starts', async (change) => {
      for (const outcome of ['success', 'error']) {
        const hook = harness();
        const pending = pendingResponse();
        if (change.startsWith('profile-')) act(() => hook.result.current.state.setOnlyMyLocation(true));
        mockGet.mockReturnValueOnce(pending.promise);
        const call = mockGet.mock.calls.length;
        const work = start(hook);
        const oldKey = keyFor(hook);
        act(() => {
          if (change === 'query') hook.result.current.state.setSearchQuery('Changed query');
          if (change === 'type') hook.result.current.state.setOfferType('seeking');
          if (change === 'locality') hook.result.current.state.setOnlyMyLocation(true);
          if (change === 'price-min') hook.result.current.state.setPriceMin('10');
          if (change === 'price-max') hook.result.current.state.setPriceMax('100');
          if (change === 'country') mockCountry = 'CZ';
        });
        hook.rerender({ ...defaultProps,
          userId: change === 'account' ? 13 : 12,
          location: change === 'profile-location' ? 'City B' : defaultProps.location,
          district: change === 'profile-district' ? 'District B' : defaultProps.district });
        expect(signalFor(call).aborted).toBe(true);
        expect(mockGet).toHaveBeenCalledTimes(call + 1);
        await act(async () => {
          if (outcome === 'success') pending.resolve({ data: oldData, status: 200 });
          else pending.reject({ response: { status: 500, data: { error: 'Stale error' } } });
          await work;
        });
        expect(hook.result.current.state).toMatchObject({ results: null, error: null,
          hasSearched: false, isSearching: false });
        expect(getCachedSearchResults(oldKey)).toBeNull();
        expect(history()).toBeNull();
        expect(history(13)).toBeNull();
        hook.unmount();
        clearSearchResultsCache();
        mockCountry = 'SK';
      }
    },
  );

  it('unmount aborts and prevents an ignored-abort response from caching or saving history', async () => {
    const hook = harness();
    const pending = pendingResponse();
    mockGet.mockReturnValueOnce(pending.promise);
    const work = start(hook);
    const oldKey = keyFor(hook);
    hook.unmount();
    expect(signalFor().aborted).toBe(true);
    await act(async () => { pending.resolve({ data: oldData, status: 200 }); await work; });
    expect(getCachedSearchResults(oldKey)).toBeNull();
    expect(history()).toBeNull();
  });

  it('inactive cancels pending work and reactivation makes a new server request', async () => {
    const hook = harness();
    const pending = pendingResponse();
    mockGet.mockReturnValueOnce(pending.promise);
    const work = start(hook);
    hook.rerender({ ...defaultProps, active: false });
    expect(signalFor().aborted).toBe(true);
    await act(async () => hook.result.current.search.handleSearch());
    expect(mockGet).toHaveBeenCalledTimes(1);
    await act(async () => { pending.resolve({ data: oldData, status: 200 }); await work; });
    expect(history()).toBeNull();
    expect(hook.result.current.state.isSearching).toBe(false);
    hook.rerender(defaultProps);
    await act(async () => hook.result.current.search.handleSearch());
    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(hook.result.current.state.results).toEqual(freshData);
  });

  it('a retained old handler cannot clear newer visible data or trigger another request', async () => {
    const hook = harness();
    mockGet.mockResolvedValueOnce({ data: oldData, status: 200 });
    await complete(hook, 'First');
    const oldHandle = hook.result.current.search.handleSearch;
    await complete(hook, 'Second');
    const before = history();
    await act(async () => oldHandle());
    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(hook.result.current.state.results).toEqual(freshData);
    expect(hook.result.current.state.isSearching).toBe(false);
    expect(history()).toBe(before);
  });
});

describe('provisional cache work remains server-authoritative', () => {
  it.each(['all', 'owner', 'viewer'])('an immediate retry after %s invalidation replaces doomed pending work', async (kind) => {
    const hook = harness();
    const old = pendingResponse();
    mockGet.mockReturnValueOnce(old.promise);
    const oldWork = start(hook);
    act(() => {
      if (kind === 'all') hook.result.current.search.invalidateCache();
      else invalidateSearchCacheForUser(kind === 'owner' ? 33 : 12);
    });
    const latest = pendingResponse();
    mockGet.mockReturnValueOnce(latest.promise);
    const latestWork = start(hook);
    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(signalFor(0).aborted).toBe(true);
    expect(signalFor(1).aborted).toBe(false);
    await act(async () => { latest.resolve({ data: freshData, status: 200 }); await latestWork; });
    expect(hook.result.current.state.results).toEqual(freshData);
    const verifiedHistory = history();
    await act(async () => { old.resolve({ data: oldData, status: 200 }); await oldWork; });
    expect(hook.result.current.state.results).toEqual(freshData);
    expect(getCachedSearchResults(keyFor(hook))).toEqual(freshData);
    expect(history()).toBe(verifiedHistory);
    expect(hook.result.current.state.isSearching).toBe(false);
    expect(hook.result.current.state.searchAbortControllerRef.current).toBeNull();
  });

  it('deduplicates simultaneous same-key work and replaces provisional data with the latest server response', async () => {
    const hook = harness();
    mockGet.mockResolvedValueOnce({ data: oldData, status: 200 });
    await complete(hook);
    const pending = pendingResponse();
    mockGet.mockReturnValueOnce(pending.promise);
    let first!: Promise<void>;
    let duplicate!: Promise<void>;
    act(() => {
      first = hook.result.current.search.handleSearch();
      duplicate = hook.result.current.search.handleSearch();
    });
    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(hook.result.current.state.results).toEqual(oldData);
    expect(hook.result.current.search.isRevalidating).toBe(true);
    expect(signalFor(1).aborted).toBe(false);
    await act(async () => { pending.resolve({ data: freshData, status: 200 }); await Promise.all([first, duplicate]); });
    expect(hook.result.current.state.results).toEqual(freshData);
    expect(getCachedSearchResults(keyFor(hook))).toEqual(freshData);
    expect(hook.result.current.state.isSearching).toBe(false);
    expect(hook.result.current.search.isRevalidating).toBe(false);
  });

  it.each([500, 401, 403])('a failed cached refresh (%s) cannot leave the old result displayed as current', async (status) => {
    const hook = harness();
    mockGet.mockResolvedValueOnce({ data: oldData, status: 200 });
    await complete(hook);
    const before = history();
    mockGet.mockRejectedValueOnce({ response: { status, data: { error: 'Request failed' } } });
    await act(async () => hook.result.current.search.handleSearch());
    expect(hook.result.current.state.results).toBeNull();
    expect(hook.result.current.state.error).toBe('Request failed');
    expect(hook.result.current.state.isSearching).toBe(false);
    expect(hook.result.current.search.isRevalidating).toBe(false);
    expect(history()).toBe(before);
    if (status !== 500) expect(getCachedSearchResults(keyFor(hook))).toBeNull();
    await act(async () => hook.result.current.search.handleSearch());
    expect(mockGet).toHaveBeenCalledTimes(3);
    expect(hook.result.current.state.results).toEqual(freshData);
    expect(hook.result.current.state.error).toBeNull();
  });

  it.each(['all', 'owner', 'viewer'])('%s invalidation prevents pending cache/history reinsertion and settles loading', async (kind) => {
    const hook = harness();
    act(() => hook.result.current.search.diagnostics.setEnabled(true));
    const pending = pendingResponse();
    mockGet.mockReturnValueOnce(pending.promise);
    const work = start(hook);
    const key = keyFor(hook);
    act(() => {
      if (kind === 'all') hook.result.current.search.invalidateCache();
      else invalidateSearchCacheForUser(kind === 'owner' ? 33 : 12);
    });
    await act(async () => { pending.resolve({ data: oldData, status: 200 }); await work; });
    expect(hook.result.current.state).toMatchObject({ results: null, hasSearched: false,
      isSearching: false, error: null });
    expect(hook.result.current.search.isRevalidating).toBe(false);
    expect(hook.result.current.search.diagnostics.snapshot).toMatchObject({ source: 'network', state: 'cancelled', httpStatus: null });
    expect(hook.result.current.state.searchAbortControllerRef.current).toBeNull();
    expect(getCachedSearchResults(key)).toBeNull();
    expect(history()).toBeNull();
    await act(async () => hook.result.current.search.handleSearch());
    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(hook.result.current.state.results).toEqual(freshData);
  });
});
