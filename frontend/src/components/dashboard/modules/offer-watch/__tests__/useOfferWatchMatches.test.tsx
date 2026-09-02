import { act, renderHook, waitFor } from '@testing-library/react';
import {
  listOfferWatchMatches,
  OfferWatchApiError,
} from '../offerWatchApi';
import { useOfferWatchMatches } from '../useOfferWatchMatches';
import type { OfferWatchMatch, OfferWatchMatchesPage } from '../types';

jest.mock('../offerWatchApi', () => ({
  ...jest.requireActual('../offerWatchApi'),
  listOfferWatchMatches: jest.fn(),
}));

const mockedListMatches = listOfferWatchMatches as jest.MockedFunction<
  typeof listOfferWatchMatches
>;

function match(id: number): OfferWatchMatch {
  return {
    offer: {
      id,
      category: 'Domácnosť a služby',
      subcategory: 'Maliarske práce',
      description: '',
    },
    createdAt: `2026-09-0${id}T08:00:00Z`,
  };
}

function page(
  results: OfferWatchMatch[],
  nextCursor: string | null,
): OfferWatchMatchesPage {
  return { results, nextCursor, previousCursor: null };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe('useOfferWatchMatches', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedListMatches.mockResolvedValue(page([], null));
  });

  it('loads the first fixed page for the selected watch', async () => {
    mockedListMatches.mockResolvedValueOnce(page([match(2), match(1)], 'next'));
    const { result } = renderHook(() => useOfferWatchMatches(7));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.matches.map((item) => item.offer.id)).toEqual([2, 1]);
    expect(result.current.nextCursor).toBe('next');
    expect(mockedListMatches).toHaveBeenCalledWith(7, {
      signal: expect.any(AbortSignal),
    });
  });

  it('loads more with the server cursor and removes overlapping ids', async () => {
    mockedListMatches
      .mockResolvedValueOnce(page([match(3), match(2)], 'second'))
      .mockResolvedValueOnce(page([match(2), match(1)], null));
    const { result } = renderHook(() => useOfferWatchMatches(7));
    await waitFor(() => expect(result.current.nextCursor).toBe('second'));

    await act(async () => {
      await result.current.loadMore();
    });

    expect(mockedListMatches).toHaveBeenLastCalledWith(7, {
      cursor: 'second',
      signal: expect.any(AbortSignal),
    });
    expect(result.current.matches.map((item) => item.offer.id)).toEqual([3, 2, 1]);
    expect(result.current.nextCursor).toBeNull();

    await act(async () => {
      await result.current.loadMore();
    });
    expect(mockedListMatches).toHaveBeenCalledTimes(2);
  });

  it('does not request data without a selected watch', async () => {
    const { result } = renderHook(() => useOfferWatchMatches(null));

    expect(result.current.isLoading).toBe(false);
    expect(mockedListMatches).not.toHaveBeenCalled();
    await expect(result.current.refresh()).resolves.toMatchObject({
      ok: false,
      error: { kind: 'not_found' },
    });
  });

  it('clears old results and reloads when the watch changes', async () => {
    mockedListMatches
      .mockResolvedValueOnce(page([match(1)], null))
      .mockResolvedValueOnce(page([match(2)], null));
    const { result, rerender } = renderHook(
      ({ watchId }) => useOfferWatchMatches(watchId),
      { initialProps: { watchId: 1 as number | null } },
    );
    await waitFor(() => expect(result.current.matches).toEqual([match(1)]));

    rerender({ watchId: 2 });
    expect(result.current.matches).toEqual([]);
    await waitFor(() => expect(result.current.matches).toEqual([match(2)]));
    expect(mockedListMatches).toHaveBeenLastCalledWith(2, {
      signal: expect.any(AbortSignal),
    });
  });

  it('ignores a stale response after switching watches', async () => {
    const first = deferred<OfferWatchMatchesPage>();
    mockedListMatches
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce(page([match(2)], null));
    const { result, rerender } = renderHook(
      ({ watchId }) => useOfferWatchMatches(watchId),
      { initialProps: { watchId: 1 as number | null } },
    );

    rerender({ watchId: 2 });
    await waitFor(() => expect(result.current.matches).toEqual([match(2)]));
    first.resolve(page([match(1)], null));
    await act(async () => { await first.promise; });

    expect(result.current.matches).toEqual([match(2)]);
    expect(mockedListMatches.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  });

  it('preserves current cards on refresh failure and exposes a semantic error', async () => {
    mockedListMatches
      .mockResolvedValueOnce(page([match(1)], null))
      .mockRejectedValueOnce(new OfferWatchApiError('network'));
    const { result } = renderHook(() => useOfferWatchMatches(1));
    await waitFor(() => expect(result.current.matches).toEqual([match(1)]));

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.matches).toEqual([match(1)]);
    expect(result.current.error).toMatchObject({ kind: 'network' });
    act(() => result.current.clearError());
    expect(result.current.error).toBeNull();
  });
});

