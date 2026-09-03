import { act, renderHook, waitFor } from '@testing-library/react';
import {
  createOfferWatch,
  deleteOfferWatch,
  listOfferWatches,
  OfferWatchApiError,
  updateOfferWatch,
} from '../offerWatchApi';
import { useOfferWatches } from '../useOfferWatches';
import type { OfferWatch, OfferWatchInput } from '../types';

jest.mock('../offerWatchApi', () => ({
  ...jest.requireActual('../offerWatchApi'),
  createOfferWatch: jest.fn(),
  deleteOfferWatch: jest.fn(),
  listOfferWatches: jest.fn(),
  updateOfferWatch: jest.fn(),
}));

const mockedCreate = createOfferWatch as jest.MockedFunction<typeof createOfferWatch>;
const mockedDelete = deleteOfferWatch as jest.MockedFunction<typeof deleteOfferWatch>;
const mockedList = listOfferWatches as jest.MockedFunction<typeof listOfferWatches>;
const mockedUpdate = updateOfferWatch as jest.MockedFunction<typeof updateOfferWatch>;

const input: OfferWatchInput = {
  category: 'Domácnosť a služby',
  subcategory: 'Maliarske práce',
  isSeeking: false,
  countryCode: 'SK',
  districtCode: '',
  priceMin: null,
  priceMax: null,
  priceCurrency: '',
};

function watch(id: number, subcategory = input.subcategory): OfferWatch {
  return {
    id,
    category: input.category,
    subcategory,
    isSeeking: false,
    countryCode: 'SK',
    districtCode: '',
    districtLabel: '',
    priceMin: null,
    priceMax: null,
    priceCurrency: '',
    createdAt: `2026-09-0${id}T08:00:00Z`,
    updatedAt: `2026-09-0${id}T08:00:00Z`,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe('useOfferWatches', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedList.mockResolvedValue([]);
  });

  it('loads the authenticated user watches on mount', async () => {
    mockedList.mockResolvedValueOnce([watch(1)]);
    const { result } = renderHook(() => useOfferWatches());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.watches).toEqual([watch(1)]);
    expect(result.current.error).toBeNull();
    expect(mockedList.mock.calls[0]?.[0]).toBeInstanceOf(AbortSignal);
  });

  it('adds a created watch only after the server confirms it', async () => {
    const pending = deferred<OfferWatch>();
    mockedCreate.mockReturnValueOnce(pending.promise);
    const { result } = renderHook(() => useOfferWatches());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let action!: ReturnType<typeof result.current.createWatch>;
    act(() => {
      action = result.current.createWatch(input);
    });

    expect(result.current.watches).toEqual([]);
    expect(result.current.mutation).toEqual({ kind: 'create' });

    pending.resolve(watch(2));
    await act(async () => expect(action).resolves.toMatchObject({ ok: true }));
    expect(result.current.watches).toEqual([watch(2)]);
    expect(result.current.mutation).toBeNull();
  });

  it('prevents a second overlapping mutation', async () => {
    const pending = deferred<OfferWatch>();
    mockedCreate.mockReturnValueOnce(pending.promise);
    const { result } = renderHook(() => useOfferWatches());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let first!: ReturnType<typeof result.current.createWatch>;
    let second!: Awaited<ReturnType<typeof result.current.createWatch>>;
    act(() => {
      first = result.current.createWatch(input);
    });
    await act(async () => {
      second = await result.current.createWatch(input);
    });

    expect(second).toMatchObject({ ok: false, error: { kind: 'busy' } });
    expect(mockedCreate).toHaveBeenCalledTimes(1);

    pending.resolve(watch(1));
    await act(async () => { await first; });
  });

  it('keeps the server list intact and exposes a semantic mutation error', async () => {
    mockedList.mockResolvedValueOnce([watch(1)]);
    mockedCreate.mockRejectedValueOnce(new OfferWatchApiError('duplicate', {
      status: 400,
    }));
    const { result } = renderHook(() => useOfferWatches());
    await waitFor(() => expect(result.current.watches).toHaveLength(1));

    await act(async () => {
      await result.current.createWatch(input);
    });

    expect(result.current.watches).toEqual([watch(1)]);
    expect(result.current.error).toMatchObject({ kind: 'duplicate', status: 400 });
    act(() => result.current.clearError());
    expect(result.current.error).toBeNull();
  });

  it('replaces an updated item in place and removes only a confirmed delete', async () => {
    mockedList.mockResolvedValueOnce([watch(2), watch(1)]);
    mockedUpdate.mockResolvedValueOnce(watch(1, 'Upratovanie'));
    mockedDelete.mockResolvedValueOnce();
    const { result } = renderHook(() => useOfferWatches());
    await waitFor(() => expect(result.current.watches).toHaveLength(2));

    await act(async () => {
      await result.current.updateWatch(1, input);
    });
    expect(result.current.watches.map((item) => item.subcategory)).toEqual([
      input.subcategory,
      'Upratovanie',
    ]);

    await act(async () => {
      await result.current.deleteWatch(2);
    });
    expect(result.current.watches).toEqual([watch(1, 'Upratovanie')]);
  });

  it('aborts in-flight work when the owner unmounts', async () => {
    const pending = deferred<OfferWatch[]>();
    mockedList.mockReturnValueOnce(pending.promise);
    const { unmount } = renderHook(() => useOfferWatches());
    const signal = mockedList.mock.calls[0]?.[0];

    unmount();

    expect(signal?.aborted).toBe(true);
    pending.reject({ code: 'ERR_CANCELED' });
    await expect(pending.promise).rejects.toEqual({ code: 'ERR_CANCELED' });
  });
});

