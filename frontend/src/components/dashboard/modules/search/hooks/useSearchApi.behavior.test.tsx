import { act, renderHook } from '@testing-library/react';
import type { FormEvent, PropsWithChildren } from 'react';
import { api } from '@/lib/api';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import type { SearchSkill, SearchUserResult } from '../types';
import { invalidateSearchCacheForUser, useSearchApi } from './useSearchApi';
import { useSearchState } from './useSearchState';

jest.unmock('@/contexts/LanguageContext');
jest.mock('@/lib/api', () => ({
  api: { get: jest.fn() },
  endpoints: { dashboard: { search: '/dashboard/search/' } },
}));

const mockGet = api.get as jest.Mock;
const skill: SearchSkill = {
  id: 17, user_id: 33, category: 'Events', subcategory: 'Monitoring', description: '',
};
const person: SearchUserResult = { id: 33, display_name: 'Test', is_verified: false };
const empty = { skills: [], users: [] };
const wrapper = ({ children }: PropsWithChildren) => <LanguageProvider>{children}</LanguageProvider>;

function harness(user: { id: number } | null = { id: 12 }, clear = true) {
  const hook = renderHook(() => {
    const state = useSearchState();
    const search = useSearchApi({ searchState: state, user });
    return { state, search, language: useLanguage() };
  }, { wrapper });
  if (clear) hook.result.current.search.invalidateCache();
  return hook;
}

type Harness = ReturnType<typeof harness>;

async function search(hook: Harness, query = 'Monitoring') {
  act(() => hook.result.current.state.setSearchQuery(query));
  await act(async () => hook.result.current.search.handleSearch());
}

function deferred() {
  let resolve!: (value: { data: unknown; status?: number }) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<{ data: unknown; status?: number }>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

describe('useSearchApi existing request and result contracts', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    localStorage.clear();
    localStorage.setItem('appLocale', 'sk');
    localStorage.setItem('appLastManualOfferCountryV1', 'CZ');
    mockGet.mockResolvedValue({ data: empty, status: 200 });
  });

  afterEach(() => jest.restoreAllMocks());

  it('keeps the actual country and filter parameters unchanged', async () => {
    const hook = harness();
    act(() => {
      hook.result.current.state.setOfferType('seeking');
      hook.result.current.state.setOnlyMyLocation(true);
      hook.result.current.state.setPriceMin('10,50');
      hook.result.current.state.setPriceMax('25');
    });
    await search(hook, '  Monitoring  ');
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith('/dashboard/search/', {
      params: {
        q: 'Monitoring', location: '', offer_type: 'seeking', only_my_location: '1',
        price_min: '10,50', price_max: '25', country: 'CZ',
      },
      signal: expect.any(AbortSignal),
    });
    expect(hook.result.current.state.hasSearched).toBe(true);
    expect(hook.result.current.state.isSearching).toBe(false);
    expect(hook.result.current.state.searchAbortControllerRef.current).toBeNull();
  });

  it('omits the country parameter when the context has no country', async () => {
    const hook = harness();
    act(() => hook.result.current.language.setCountry(null));
    await search(hook);
    expect(mockGet.mock.calls[0][1].params).not.toHaveProperty('country');
  });

  it('prevents form submission and clears a blank query without a request', async () => {
    const hook = harness();
    const controller = new AbortController();
    const preventDefault = jest.fn();
    act(() => {
      hook.result.current.state.setSearchQuery('   ');
      hook.result.current.state.setResults({ skills: [skill], users: [person] });
      hook.result.current.state.setHasSearched(true);
      hook.result.current.state.setIsFromRecentSearch(true);
      hook.result.current.state.setIsSearching(true);
      hook.result.current.state.setError('old');
      hook.result.current.state.searchAbortControllerRef.current = controller;
    });
    await act(async () => hook.result.current.search.handleSearch({ preventDefault } as unknown as FormEvent));
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(controller.signal.aborted).toBe(true);
    expect(mockGet).not.toHaveBeenCalled();
    expect(hook.result.current.state).toMatchObject({
      results: empty, hasSearched: false, isFromRecentSearch: false, isSearching: false, error: null,
    });
  });

  it.each([null, {}, { skills: {}, users: 'bad' }])('normalizes malformed successful response %p', async (data) => {
    const hook = harness();
    mockGet.mockResolvedValueOnce({ data, status: 200 });
    await search(hook);
    expect(hook.result.current.state.results).toEqual(empty);
    expect(hook.result.current.search.hasResults).toBe(false);
    expect(hook.result.current.search.hasPanelResults).toBe(false);
  });

  it('computes visible groups independently from the returned result arrays', async () => {
    const hook = harness();
    expect(hook.result.current.search.filteredSkills).toEqual([]);
    expect(hook.result.current.search.hasResults).toBe(false);
    mockGet.mockResolvedValueOnce({ data: { skills: [skill], users: [person] } });
    await search(hook);
    expect(hook.result.current.search.filteredSkills).toEqual([skill]);
    expect(hook.result.current.search.hasResults).toBe(true);
    expect(hook.result.current.search.hasPanelResults).toBe(true);
    act(() => {
      hook.result.current.state.setShowSkills(false);
      hook.result.current.state.setShowUsers(false);
    });
    expect(hook.result.current.search.hasResults).toBe(true);
    expect(hook.result.current.search.hasPanelResults).toBe(false);
    act(() => hook.result.current.state.setShowUsers(true));
    expect(hook.result.current.search.hasPanelResults).toBe(true);
    act(() => hook.result.current.state.setResults({ skills: [skill], users: [] }));
    expect(hook.result.current.search.hasPanelResults).toBe(false);
    act(() => hook.result.current.state.setShowSkills(true));
    expect(hook.result.current.search.hasPanelResults).toBe(true);
  });

  it('continues to cache even empty results until explicit invalidation', async () => {
    const hook = harness();
    await search(hook);
    await search(hook);
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(hook.result.current.state.results).toEqual(empty);
    act(() => hook.result.current.search.invalidateCache());
    await search(hook);
    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  it('separates country, type, location and price variations in the existing cache', async () => {
    const hook = harness();
    await search(hook);
    act(() => hook.result.current.language.setCountry('SK'));
    await search(hook);
    act(() => hook.result.current.state.setOfferType('offer'));
    await search(hook);
    act(() => hook.result.current.state.setOnlyMyLocation(true));
    await search(hook);
    act(() => hook.result.current.state.setPriceMin('1'));
    await search(hook);
    act(() => hook.result.current.state.setPriceMax('100'));
    await search(hook);
    await search(hook, 'MONITORING');
    expect(mockGet).toHaveBeenCalledTimes(7);
  });

  it('shares the current cache across unmount and remount', async () => {
    const first = harness();
    mockGet.mockResolvedValueOnce({ data: { skills: [skill], users: [person] } });
    await search(first);
    first.unmount();
    const second = harness({ id: 12 }, false);
    await search(second);
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(second.result.current.state.results).toEqual({ skills: [skill], users: [person] });
  });

  it('preserves latest results when an aborted older response finishes later', async () => {
    const hook = harness();
    const old = deferred();
    mockGet.mockReturnValueOnce(old.promise);
    act(() => hook.result.current.state.setSearchQuery('Old'));
    let oldSearch!: Promise<void>;
    act(() => { oldSearch = hook.result.current.search.handleSearch(); });
    const oldSignal = mockGet.mock.calls[0][1].signal as AbortSignal;
    mockGet.mockResolvedValueOnce({ data: { skills: [skill], users: [] } });
    await search(hook, 'New');
    expect(oldSignal.aborted).toBe(true);
    await act(async () => { old.resolve({ data: empty }); await oldSearch; });
    expect(hook.result.current.state.results?.skills).toEqual([skill]);
    expect(hook.result.current.state.isSearching).toBe(false);
  });

  it('does not overwrite a new request when an older request rejects', async () => {
    const hook = harness();
    const old = deferred();
    mockGet.mockReturnValueOnce(old.promise);
    act(() => hook.result.current.state.setSearchQuery('Old'));
    let oldSearch!: Promise<void>;
    act(() => { oldSearch = hook.result.current.search.handleSearch(); });
    await search(hook, 'New');
    await act(async () => { old.reject({ response: { status: 500 } }); await oldSearch; });
    expect(hook.result.current.state.error).toBeNull();
    expect(hook.result.current.state.hasSearched).toBe(true);
  });

  it.each([{ name: 'CanceledError' }, { code: 'ERR_CANCELED' }])('retains cancellation behavior for %p', async (error) => {
    const hook = harness();
    mockGet.mockRejectedValueOnce(error);
    await search(hook);
    expect(hook.result.current.state.error).toBeNull();
    expect(hook.result.current.state.hasSearched).toBe(false);
    expect(hook.result.current.state.isSearching).toBe(false);
  });

  it.each([
    [{ response: { status: 429, data: { error: 'Do not use' } } }, 'Príliš veľa požiadaviek, skúste o chvíľu.'],
    [{ response: { status: 401, data: { error: 'Existing server message' } } }, 'Existing server message'],
    [{ response: { status: 404, data: { error: 17 } } }, 'Chyba pri vyhľadávaní. Skúste to znova.'],
    [new Error('Network'), 'Chyba pri vyhľadávaní. Skúste to znova.'],
  ])('preserves the existing search error %p', async (error, message) => {
    const hook = harness();
    mockGet.mockRejectedValueOnce(error);
    await search(hook);
    expect(hook.result.current.state.error).toBe(message);
    expect(hook.result.current.state.hasSearched).toBe(true);
    expect(hook.result.current.state.isSearching).toBe(false);
  });

  it('does not clear an externally replaced controller in finally', async () => {
    const hook = harness();
    const request = deferred();
    mockGet.mockReturnValueOnce(request.promise);
    act(() => hook.result.current.state.setSearchQuery('Monitoring'));
    let work!: Promise<void>;
    act(() => { work = hook.result.current.search.handleSearch(); });
    const replacement = new AbortController();
    hook.result.current.state.searchAbortControllerRef.current = replacement;
    await act(async () => { request.resolve({ data: empty }); await work; });
    expect(hook.result.current.state.searchAbortControllerRef.current).toBe(replacement);
  });

  it('removes blocked users and owned skills from every existing cache entry only', async () => {
    const hook = harness();
    mockGet.mockResolvedValue({ data: {
      skills: [skill, { ...skill, id: 18, user_id: 44 }],
      users: [person, { ...person, id: 44 }],
    } });
    await search(hook, 'First');
    await search(hook, 'Second');
    for (const invalid of [0, -1, 1.5, Number.NaN]) invalidateSearchCacheForUser(invalid);
    await search(hook, 'First');
    expect(hook.result.current.state.results?.skills).toHaveLength(2);
    invalidateSearchCacheForUser(33);
    await search(hook, 'Second');
    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(hook.result.current.state.results).toEqual({
      skills: [{ ...skill, id: 18, user_id: 44 }], users: [{ ...person, id: 44 }],
    });
  });

  it('deduplicates recent results by sorted card and user IDs', async () => {
    const secondSkill = { ...skill, id: 18 };
    const secondUser = { ...person, id: 34 };
    localStorage.setItem('searchRecentResults_12', JSON.stringify([
      { skills: [secondSkill, skill], users: [secondUser, person] },
      { skills: [], users: [person] },
    ]));
    const hook = harness();
    mockGet.mockResolvedValueOnce({ data: { skills: [skill, secondSkill], users: [person, secondUser] } });
    await search(hook);
    const saved = JSON.parse(localStorage.getItem('searchRecentResults_12')!);
    expect(saved).toHaveLength(2);
    expect(saved[0]).toEqual({ skills: [skill, secondSkill], users: [person, secondUser] });
    expect(saved[1]).toEqual({ skills: [], users: [person] });
  });

  it('keeps only the twenty newest recent result groups', async () => {
    localStorage.setItem('searchRecentResults_12', JSON.stringify(
      Array.from({ length: 25 }, (_, index) => ({ skills: [{ ...skill, id: index + 100 }], users: [] })),
    ));
    const hook = harness();
    mockGet.mockResolvedValueOnce({ data: { skills: [skill], users: [] } });
    await search(hook);
    const saved = JSON.parse(localStorage.getItem('searchRecentResults_12')!);
    expect(saved).toHaveLength(20);
    expect(saved[0].skills[0].id).toBe(skill.id);
    expect(saved[19].skills[0].id).toBe(118);
  });

  it.each([null, { id: 0 }])('does not persist search history without a signed-in ID: %p', async (user) => {
    const hook = harness(user);
    mockGet.mockResolvedValueOnce({ data: { skills: [skill], users: [person] } });
    const write = jest.spyOn(Storage.prototype, 'setItem');
    await search(hook);
    expect(write).not.toHaveBeenCalled();
    expect(hook.result.current.state.results?.skills).toEqual([skill]);
  });

  it.each(['invalid JSON', 'null', '{}'])('does not break a successful search on malformed history %s', async (stored) => {
    localStorage.setItem('searchRecentResults_12', stored);
    const hook = harness();
    mockGet.mockResolvedValueOnce({ data: { skills: [skill], users: [person] } });
    await search(hook);
    expect(hook.result.current.state.error).toBeNull();
    expect(hook.result.current.state.results?.skills).toEqual([skill]);
  });

  it('still returns results when writing recent history is denied', async () => {
    const hook = harness();
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Denied'); });
    mockGet.mockResolvedValueOnce({ data: { skills: [skill], users: [] } });
    await search(hook);
    expect(hook.result.current.state.results?.skills).toEqual([skill]);
    expect(hook.result.current.state.error).toBeNull();
  });
});
