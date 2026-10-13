import { act, renderHook, waitFor } from '@testing-library/react';
import { listOfferWatchMatches, OfferWatchApiError } from '../offerWatchApi';
import { useOfferWatchMatches } from '../useOfferWatchMatches';
import type { OfferWatchMatchesPage } from '../types';

jest.mock('../offerWatchApi', () => ({
  ...jest.requireActual('../offerWatchApi'),
  listOfferWatchMatches: jest.fn(),
}));

const listMatches = jest.mocked(listOfferWatchMatches);

/** Build a deterministic matches page with the exact cursor used by retry assertions. */
function page(ids: number[], nextCursor: string | null = null): OfferWatchMatchesPage {
  return {
    results: ids.map((id) => ({
      offer: { id, category: 'Domácnosť a služby', subcategory: 'Maliarske práce', description: '' },
      createdAt: '2026-09-01T08:00:00Z',
    })),
    nextCursor,
    previousCursor: null,
  };
}

/** Control late resolution/rejection to exercise pending, superseded, and unmounted requests. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

/** Mount the real hook with a completed first page and a reusable next-page cursor. */
async function loadedHook() {
  listMatches.mockResolvedValueOnce(page([3, 2], 'second-page'));
  const hook = renderHook(({ id }) => useOfferWatchMatches(id), { initialProps: { id: 7 as number | null } });
  await waitFor(() => expect(hook.result.current.nextCursor).toBe('second-page'));
  return hook;
}

describe('useOfferWatchMatches failure and retry contract', () => {
  beforeEach(() => {
    listMatches.mockReset();
    listMatches.mockResolvedValue(page([]));
  });

  it('preserves cards and the exact failed cursor, then retries without duplicates', async () => {
    const { result } = await loadedHook();
    const original = result.current.matches;
    listMatches.mockRejectedValueOnce(new OfferWatchApiError('network'));
    await act(async () => {
      expect(await result.current.loadMore()).toMatchObject({ ok: false, error: { kind: 'network' } });
    });
    expect(result.current.matches).toBe(original);
    expect(result.current.nextCursor).toBe('second-page');
    expect(result.current.error?.kind).toBe('network');
    expect(result.current.isLoadingMore).toBe(false);

    listMatches.mockResolvedValueOnce(page([2, 1, 1], 'third-page'));
    await act(async () => { await result.current.loadMore(); });
    expect(listMatches.mock.calls.slice(1).map((call) => call[1]?.cursor)).toEqual(['second-page', 'second-page']);
    expect(result.current.matches.map(({ offer }) => offer.id)).toEqual([3, 2, 1]);
    expect(result.current.error).toBeNull();
    expect(result.current.nextCursor).toBe('third-page');
    expect(result.current.isLoadingMore).toBe(false);
  });

  it('exposes repeated failures without dropping the cursor or locking future retries', async () => {
    const { result } = await loadedHook();
    listMatches.mockRejectedValue(new OfferWatchApiError('network'));
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await act(async () => { await result.current.loadMore(); });
      expect(result.current.nextCursor).toBe('second-page');
      expect(result.current.matches.map(({ offer }) => offer.id)).toEqual([3, 2]);
      expect(result.current.isLoadingMore).toBe(false);
      expect(result.current.error?.kind).toBe('network');
    }
    expect(listMatches).toHaveBeenCalledTimes(3);
  });

  it('clears a page error during retry and sends only one request on double activation', async () => {
    const { result } = await loadedHook();
    listMatches.mockRejectedValueOnce(new OfferWatchApiError('network'));
    await act(async () => { await result.current.loadMore(); });
    const pending = deferred<OfferWatchMatchesPage>();
    listMatches.mockReturnValueOnce(pending.promise);
    let retry!: ReturnType<typeof result.current.loadMore>;
    act(() => { retry = result.current.loadMore(); });
    expect(result.current.error).toBeNull();
    expect(result.current.isLoadingMore).toBe(true);
    await act(async () => { expect(await result.current.loadMore()).toEqual({ ok: true, value: null }); });
    expect(listMatches).toHaveBeenCalledTimes(3);
    await act(async () => { pending.resolve(page([1])); await retry; });
    expect(result.current.matches.map(({ offer }) => offer.id)).toEqual([3, 2, 1]);
    expect(result.current.nextCursor).toBeNull();
    expect(result.current.isLoadingMore).toBe(false);
  });

  it('retries a failed initial page via refresh and returns a successful action result', async () => {
    listMatches.mockRejectedValueOnce(new OfferWatchApiError('network'));
    const { result } = renderHook(() => useOfferWatchMatches(7));
    await waitFor(() => expect(result.current.error?.kind).toBe('network'));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.matches).toEqual([]);
    listMatches.mockResolvedValueOnce(page([5], 'next'));
    await act(async () => { expect(await result.current.refresh()).toEqual({ ok: true, value: page([5], 'next') }); });
    expect(listMatches.mock.calls.map((call) => call[1]?.cursor)).toEqual([undefined, undefined]);
    expect(result.current.matches.map(({ offer }) => offer.id)).toEqual([5]);
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('resets the pagination cursor on refresh failure and replaces cards on refresh retry', async () => {
    const { result } = await loadedHook();
    listMatches.mockRejectedValueOnce(new OfferWatchApiError('network'));
    await act(async () => { await result.current.refresh(); });
    expect(result.current.matches.map(({ offer }) => offer.id)).toEqual([3, 2]);
    expect(result.current.nextCursor).toBeNull();
    expect(result.current.error?.kind).toBe('network');
    await act(async () => { expect(await result.current.loadMore()).toEqual({ ok: true, value: null }); });
    expect(listMatches).toHaveBeenCalledTimes(2);
    listMatches.mockResolvedValueOnce(page([9]));
    await act(async () => { await result.current.refresh(); });
    expect(result.current.matches.map(({ offer }) => offer.id)).toEqual([9]);
    expect(result.current.error).toBeNull();
    expect(listMatches.mock.calls[2]?.[1]?.cursor).toBeUndefined();
  });

  it.each(['success', 'failure'] as const)('ignores a late page %s after switching watches', async (outcome) => {
    const { result, rerender } = await loadedHook();
    const pending = deferred<OfferWatchMatchesPage>();
    listMatches.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(page([8], 'new-watch-cursor'));
    let load!: ReturnType<typeof result.current.loadMore>;
    act(() => { load = result.current.loadMore(); });
    const signal = listMatches.mock.calls[1]?.[1]?.signal;
    rerender({ id: 8 });
    await waitFor(() => expect(result.current.nextCursor).toBe('new-watch-cursor'));
    await act(async () => {
      if (outcome === 'success') pending.resolve(page([1]));
      else pending.reject(new OfferWatchApiError('network'));
      await load;
    });
    expect(signal?.aborted).toBe(true);
    expect(result.current.matches.map(({ offer }) => offer.id)).toEqual([8]);
    expect(result.current.nextCursor).toBe('new-watch-cursor');
    expect(result.current.error).toBeNull();
    expect(result.current.isLoadingMore).toBe(false);
  });

  it('ignores a late initial-page error after switching watches', async () => {
    const pending = deferred<OfferWatchMatchesPage>();
    listMatches.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(page([8]));
    const { result, rerender } = renderHook(({ id }) => useOfferWatchMatches(id), { initialProps: { id: 7 } });
    rerender({ id: 8 });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => { pending.reject(new OfferWatchApiError('network')); await pending.promise.catch(() => undefined); });
    expect(result.current.matches.map(({ offer }) => offer.id)).toEqual([8]);
    expect(result.current.error).toBeNull();
  });

  it('lets refresh supersede a pending page without appending its late results', async () => {
    const { result } = await loadedHook();
    const pending = deferred<OfferWatchMatchesPage>();
    listMatches.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(page([9], 'fresh-cursor'));
    let load!: ReturnType<typeof result.current.loadMore>;
    act(() => { load = result.current.loadMore(); });
    const signal = listMatches.mock.calls[1]?.[1]?.signal;
    await act(async () => { await result.current.refresh(); });
    await act(async () => { pending.resolve(page([1])); await load; });
    expect(signal?.aborted).toBe(true);
    expect(result.current.matches.map(({ offer }) => offer.id)).toEqual([9]);
    expect(result.current.nextCursor).toBe('fresh-cursor');
    expect(result.current.error).toBeNull();
  });

  it('ignores a superseded page failure and preserves the lock of a newer page', async () => {
    const { result } = await loadedHook();
    const oldPage = deferred<OfferWatchMatchesPage>();
    const newPage = deferred<OfferWatchMatchesPage>();
    listMatches.mockReturnValueOnce(oldPage.promise).mockResolvedValueOnce(page([9], 'fresh')).mockReturnValueOnce(newPage.promise);
    let oldLoad!: ReturnType<typeof result.current.loadMore>;
    let newLoad!: ReturnType<typeof result.current.loadMore>;
    act(() => { oldLoad = result.current.loadMore(); });
    await act(async () => { await result.current.refresh(); });
    act(() => { newLoad = result.current.loadMore(); });
    await act(async () => { oldPage.reject(new OfferWatchApiError('network')); await oldLoad; });
    expect(result.current.error).toBeNull();
    expect(result.current.isLoadingMore).toBe(true);
    await act(async () => { await result.current.loadMore(); });
    expect(listMatches).toHaveBeenCalledTimes(4);
    await act(async () => { newPage.resolve(page([8])); await newLoad; });
    expect(result.current.matches.map(({ offer }) => offer.id)).toEqual([9, 8]);
    expect(result.current.isLoadingMore).toBe(false);
  });

  it('does not expose a cancelled page request as a visible error and releases its lock', async () => {
    const { result } = await loadedHook();
    listMatches.mockRejectedValueOnce(new OfferWatchApiError('cancelled'));
    await act(async () => {
      expect(await result.current.loadMore()).toMatchObject({ ok: false, error: { kind: 'cancelled' } });
    });
    expect(result.current.error).toBeNull();
    expect(result.current.nextCursor).toBe('second-page');
    expect(result.current.isLoadingMore).toBe(false);
  });

  it.each(['success', 'failure'] as const)('aborts a pending page on unmount and ignores late %s', async (outcome) => {
    const { result, unmount } = await loadedHook();
    const pending = deferred<OfferWatchMatchesPage>();
    listMatches.mockReturnValueOnce(pending.promise);
    let load!: ReturnType<typeof result.current.loadMore>;
    act(() => { load = result.current.loadMore(); });
    const previousState = result.current;
    const signal = listMatches.mock.calls[1]?.[1]?.signal;
    unmount();
    await act(async () => {
      if (outcome === 'success') pending.resolve(page([1]));
      else pending.reject(new OfferWatchApiError('network'));
      await load;
    });
    expect(signal?.aborted).toBe(true);
    expect(result.current).toBe(previousState);
  });

  it('clears cards and prevents pagination when the selected watch becomes absent', async () => {
    const { result, rerender } = await loadedHook();
    rerender({ id: null });
    expect(result.current.matches).toEqual([]);
    expect(result.current.nextCursor).toBeNull();
    expect(result.current.isLoading).toBe(false);
    await act(async () => { expect(await result.current.loadMore()).toEqual({ ok: true, value: null }); });
    expect(listMatches).toHaveBeenCalledTimes(1);
  });
});
