import { act, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { api } from '@/lib/api';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import { useSearchState } from './useSearchState';
import { useSearchApi } from './useSearchApi';
import type { SearchResults } from '../types';

jest.unmock('@/contexts/LanguageContext');
jest.mock('@/lib/api', () => ({
  api: { get: jest.fn() },
  endpoints: { dashboard: { search: '/dashboard/search/' } },
}));

const mockGet = api.get as jest.Mock;
const results: SearchResults = {
  skills: [{ id: 19, user_id: 32, category: 'Category', subcategory: 'Private offer', description: 'Never copy' }],
  users: [{ id: 32, display_name: 'Private owner', is_verified: false }],
};
const wrapper = ({ children }: PropsWithChildren) => <LanguageProvider>{children}</LanguageProvider>;

function harness(userId = 12, active = true) {
  const hook = renderHook(({ userId, active }) => {
    const state = useSearchState();
    const search = useSearchApi({ searchState: state, user: { id: userId }, isActive: active });
    return { state, search, language: useLanguage() };
  }, { wrapper, initialProps: { userId, active } });
  hook.result.current.search.invalidateCache();
  return hook;
}

type Harness = ReturnType<typeof harness>;

async function search(hook: Harness, query = 'Private query') {
  act(() => hook.result.current.state.setSearchQuery(query));
  await act(async () => hook.result.current.search.handleSearch());
}

function pending() {
  let resolve!: (value: { data: unknown; status?: number }) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<{ data: unknown; status?: number }>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

describe('useSearchApi opt-in diagnostics with the real language/country context', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    localStorage.clear();
    localStorage.setItem('appLocale', 'sk');
    localStorage.setItem('appLastManualOfferCountryV1', 'CZ');
    localStorage.setItem('appGeoDetectionCacheV2', JSON.stringify({ country: 'SK', detectedAt: Date.now(), status: 'ok' }));
    mockGet.mockResolvedValue({ data: results, status: 200 });
  });

  afterEach(() => jest.restoreAllMocks());

  it('records nothing before opt-in and does not fetch when toggling', async () => {
    const hook = harness();
    await search(hook);
    expect(hook.result.current.search.diagnostics).toMatchObject({ enabled: false, snapshot: null });
    const requestHandler = hook.result.current.search.handleSearch;
    act(() => hook.result.current.search.diagnostics.setEnabled(true));
    expect(hook.result.current.search.handleSearch).toBe(requestHandler);
    expect(hook.result.current.search.diagnostics.snapshot).toBeNull();
    act(() => hook.result.current.search.diagnostics.setEnabled(false));
    expect(hook.result.current.search.handleSearch).toBe(requestHandler);
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('records actual country, response status and counts without user data or query text', async () => {
    const hook = harness();
    act(() => {
      hook.result.current.search.diagnostics.setEnabled(true);
      hook.result.current.state.setOfferType('offer');
      hook.result.current.state.setOnlyMyLocation(true);
      hook.result.current.state.setPriceMin('Private 10');
      hook.result.current.state.setPriceMax('Private 20');
    });
    await search(hook, '  Private query  ');
    expect(hook.result.current.search.diagnostics.snapshot).toEqual({
      country: 'SK', queryLength: 13, offerType: 'offer', onlyMyLocation: true,
      priceMinSet: true, priceMaxSet: true, source: 'network', state: 'complete',
      httpStatus: 200, offersCount: 1, usersCount: 1, validCollections: true,
      manualCountrySnapshot: 'CZ', ipCountrySnapshot: 'SK', ipCacheFresh: true,
    });
    const evidence = JSON.stringify(hook.result.current.search.diagnostics.snapshot);
    for (const forbidden of ['Private', 'description', 'display_name', 'user_id', '19', '32']) {
      expect(evidence).not.toContain(forbidden);
    }
    expect(evidence).not.toContain('Private query');
    expect(evidence).not.toContain('Private 10');
  });

  it('shows pending evidence and never fabricates a status before the real response', async () => {
    const hook = harness();
    const request = pending();
    mockGet.mockReturnValueOnce(request.promise);
    act(() => {
      hook.result.current.search.diagnostics.setEnabled(true);
      hook.result.current.state.setSearchQuery('New query');
    });
    let work!: Promise<void>;
    act(() => { work = hook.result.current.search.handleSearch(); });
    expect(hook.result.current.search.diagnostics.snapshot).toMatchObject({
      source: 'network', state: 'pending', httpStatus: null, offersCount: null, usersCount: null,
    });
    await act(async () => { request.resolve({ data: results, status: 201 }); await work; });
    expect(hook.result.current.search.diagnostics.snapshot?.httpStatus).toBe(201);
  });

  it('revalidates an empty cache result without inventing HTTP evidence before the response', async () => {
    const hook = harness();
    mockGet.mockResolvedValueOnce({ data: { skills: [], users: [] }, status: 200 });
    await search(hook);
    act(() => hook.result.current.search.diagnostics.setEnabled(true));
    const refresh = pending();
    mockGet.mockReturnValueOnce(refresh.promise);
    let work!: Promise<void>;
    act(() => { work = hook.result.current.search.handleSearch(); });
    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(hook.result.current.search.diagnostics.snapshot).toMatchObject({
      source: 'network', state: 'pending', offersCount: null, usersCount: null, httpStatus: null, validCollections: null,
    });
    await act(async () => { refresh.resolve({ data: { skills: [], users: [] }, status: 200 }); await work; });
    expect(hook.result.current.search.diagnostics.snapshot).toMatchObject({
      source: 'network', state: 'complete', offersCount: 0, usersCount: 0, httpStatus: 200, validCollections: true,
    });
  });

  it('records an empty attempt without fetching or claiming an HTTP response', async () => {
    localStorage.setItem('appGeoDetectionCacheV2', JSON.stringify({ country: null, detectedAt: Date.now(), status: 'failed' }));
    const hook = harness();
    act(() => {
      hook.result.current.search.diagnostics.setEnabled(true);
    });
    await search(hook, '   ');
    expect(mockGet).not.toHaveBeenCalled();
    expect(hook.result.current.search.diagnostics.snapshot).toMatchObject({
      country: null, source: 'none', state: 'empty', queryLength: 0, httpStatus: null,
    });
  });

  it.each([
    [{ response: { status: 401, data: { error: 'Private internal message' } } }, 401],
    [{ response: { status: 404 } }, 404],
    [{ response: { status: 429 } }, 429],
    [{ response: { status: 503 } }, 503],
    [{ message: 'Offline private URL' }, null],
    [{ response: { status: '401' } }, null],
  ])('keeps HTTP evidence separate from network failures: %p', async (error, httpStatus) => {
    const hook = harness();
    act(() => hook.result.current.search.diagnostics.setEnabled(true));
    mockGet.mockRejectedValueOnce(error);
    await search(hook);
    expect(hook.result.current.search.diagnostics.snapshot).toMatchObject({
      source: 'network', state: 'error', httpStatus, offersCount: null, usersCount: null,
    });
    expect(JSON.stringify(hook.result.current.search.diagnostics.snapshot)).not.toMatch(/Private internal|Offline private/);
  });

  it.each([null, {}, { skills: [], users: {} }, { skills: {}, users: [] }])('flags malformed collections for %p', async (data) => {
    const hook = harness();
    act(() => hook.result.current.search.diagnostics.setEnabled(true));
    mockGet.mockResolvedValueOnce({ data, status: 200 });
    await search(hook);
    expect(hook.result.current.search.diagnostics.snapshot).toMatchObject({
      source: 'network', state: 'complete', httpStatus: 200, offersCount: 0, usersCount: 0, validCollections: false,
    });
  });

  it.each([{ name: 'CanceledError' }, { code: 'ERR_CANCELED' }])('records a real cancellation %p', async (error) => {
    const hook = harness();
    act(() => hook.result.current.search.diagnostics.setEnabled(true));
    mockGet.mockRejectedValueOnce(error);
    await search(hook);
    expect(hook.result.current.search.diagnostics.snapshot).toMatchObject({ source: 'network', state: 'cancelled', httpStatus: null });
  });

  it('does not let a stale success or cancellation overwrite the latest request evidence', async () => {
    const hook = harness();
    act(() => hook.result.current.search.diagnostics.setEnabled(true));
    const old = pending();
    mockGet.mockReturnValueOnce(old.promise);
    act(() => hook.result.current.state.setSearchQuery('Old'));
    let work!: Promise<void>;
    act(() => { work = hook.result.current.search.handleSearch(); });
    await search(hook, 'Latest');
    const snapshot = hook.result.current.search.diagnostics.snapshot;
    await act(async () => { old.reject({ code: 'ERR_CANCELED' }); await work; });
    expect(hook.result.current.search.diagnostics.snapshot).toBe(snapshot);
  });

  it.each(['disable', 'account', 'inactive', 'unmount'])('discards pending evidence after %s', async (action) => {
    const hook = harness();
    const request = pending();
    mockGet.mockReturnValueOnce(request.promise);
    act(() => {
      hook.result.current.search.diagnostics.setEnabled(true);
      hook.result.current.state.setSearchQuery('Pending');
    });
    let work!: Promise<void>;
    act(() => { work = hook.result.current.search.handleSearch(); });
    act(() => {
      if (action === 'disable') hook.result.current.search.diagnostics.setEnabled(false);
      if (action === 'account') hook.rerender({ userId: 99, active: true });
      if (action === 'inactive') hook.rerender({ userId: 12, active: false });
      if (action === 'unmount') hook.unmount();
    });
    await act(async () => { request.resolve({ data: results, status: 200 }); await work; });
    if (action !== 'unmount') expect(hook.result.current.search.diagnostics).toMatchObject({ enabled: false, snapshot: null });
  });

  it('does not restore previously captured evidence after disabling and enabling again', async () => {
    const hook = harness();
    act(() => hook.result.current.search.diagnostics.setEnabled(true));
    await search(hook);
    act(() => {
      hook.result.current.search.diagnostics.setEnabled(false);
      hook.result.current.search.diagnostics.setEnabled(true);
    });
    expect(hook.result.current.search.diagnostics.snapshot).toBeNull();
    expect(mockGet).toHaveBeenCalledTimes(1);
  });
});
