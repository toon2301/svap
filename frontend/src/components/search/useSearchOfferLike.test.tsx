import React from 'react';
import { act, renderHook } from '@testing-library/react';
import toast from 'react-hot-toast';
import { setOfferLikeState, type OfferLikeResponse } from '@/components/dashboard/modules/profile/offerLikesApi';
import type { Offer } from '@/components/dashboard/modules/profile/profileOffersTypes';
import { useSearchOfferLike } from './useSearchOfferLike';

jest.mock('@/components/dashboard/modules/profile/offerLikesApi', () => ({ setOfferLikeState: jest.fn() }));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { error: jest.fn() } }));

const setLike = jest.mocked(setOfferLikeState);
const translate = (_key: string, fallback: string) => `translated:${fallback}`;
const offer: Offer = {
  id: 17, category: 'Design', subcategory: 'Logo', description: 'Search result',
  is_liked_by_me: false, likes_count: 4,
};
const response = (fields: Partial<OfferLikeResponse> = {}): OfferLikeResponse => ({
  offer_id: 17, is_liked_by_me: true, likes_count: 5, ...fields,
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

function renderLike(initialOffer = offer) {
  return renderHook(({ cardOffer }) => useSearchOfferLike(cardOffer, translate), {
    initialProps: { cardOffer: initialOffer },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  setLike.mockResolvedValue(response());
});

describe('search result Like state', () => {
  it.each([
    { is_liked_by_me: false, likes_count: 4, expectedLiked: false, expectedCount: 4 },
    { is_liked_by_me: true, likes_count: 0, expectedLiked: true, expectedCount: 0 },
    { likes_count: -8, expectedLiked: false, expectedCount: 0 },
    { expectedLiked: false, expectedCount: 0 },
  ])('normalizes initial server state without mutating the offer: %j', ({ expectedLiked, expectedCount, ...fields }) => {
    const source: Offer = { ...offer, likes_count: undefined, is_liked_by_me: undefined, ...fields };
    const snapshot = { ...source };
    const { result } = renderLike(source);
    expect(result.current.offer).toEqual({ ...source, is_liked_by_me: expectedLiked, likes_count: expectedCount });
    expect(result.current.offer).not.toBe(source);
    expect(source).toEqual(snapshot);
    expect(result.current.isPending).toBe(false);
    expect(setLike).not.toHaveBeenCalled();
  });

  it('likes optimistically, locks repeated calls immediately and accepts the authoritative response', async () => {
    const request = deferred<OfferLikeResponse>();
    setLike.mockReturnValue(request.promise);
    const { result } = renderLike();
    let task!: Promise<void>;
    act(() => {
      task = result.current.toggleLike();
      void result.current.toggleLike();
      void result.current.toggleLike();
    });
    expect(setLike).toHaveBeenCalledTimes(1);
    expect(setLike).toHaveBeenCalledWith(17, true);
    expect(result.current.isPending).toBe(true);
    expect(result.current.offer).toMatchObject({ is_liked_by_me: true, likes_count: 5 });
    await act(async () => { request.resolve(response({ likes_count: 37 })); await task; });
    expect(result.current.isPending).toBe(false);
    expect(result.current.offer).toMatchObject({ is_liked_by_me: true, likes_count: 37 });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it.each([0, 4])('supports unlike and never makes the optimistic count negative: %s', async (count) => {
    const request = deferred<OfferLikeResponse>();
    setLike.mockReturnValue(request.promise);
    const { result } = renderLike({ ...offer, is_liked_by_me: true, likes_count: count });
    let task!: Promise<void>;
    act(() => { task = result.current.toggleLike(); });
    expect(setLike).toHaveBeenCalledWith(17, false);
    expect(result.current.offer).toMatchObject({ is_liked_by_me: false, likes_count: Math.max(0, count - 1) });
    await act(async () => { request.resolve(response({ is_liked_by_me: false, likes_count: -1 })); await task; });
    expect(result.current.offer.likes_count).toBe(0);
    expect(result.current.isPending).toBe(false);
  });

  it('keeps the optimistic count when a legacy response omits its count', async () => {
    setLike.mockResolvedValue({ offer_id: 17, is_liked_by_me: true } as OfferLikeResponse);
    const { result } = renderLike();
    await act(async () => { await result.current.toggleLike(); });
    expect(result.current.offer.likes_count).toBe(5);
    expect(result.current.isPending).toBe(false);
  });

  it.each([false, true])('rolls back a failed request for initially liked=%s and allows retry', async (liked) => {
    setLike.mockRejectedValueOnce(new Error('Transport failure'));
    const { result } = renderLike({ ...offer, is_liked_by_me: liked });
    await act(async () => { await result.current.toggleLike(); });
    expect(result.current.offer).toMatchObject({ is_liked_by_me: liked, likes_count: 4 });
    expect(result.current.isPending).toBe(false);
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith('translated:Nepodarilo sa aktualizovať páči sa mi.');
    await act(async () => { await result.current.toggleLike(); });
    expect(setLike).toHaveBeenCalledTimes(2);
    expect(result.current.offer).toMatchObject({ is_liked_by_me: true, likes_count: 5 });
  });

  it('rejects a response for another offer and preserves the original result', async () => {
    setLike.mockResolvedValue(response({ offer_id: 99, likes_count: 100 }));
    const { result } = renderLike();
    await act(async () => { await result.current.toggleLike(); });
    expect(result.current.offer).toMatchObject({ id: 17, is_liked_by_me: false, likes_count: 4 });
    expect(result.current.isPending).toBe(false);
    expect(toast.error).toHaveBeenCalledTimes(1);
  });

  it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '17', null, undefined])(
    'ignores invalid id %s without requests or state changes', async (id) => {
      const source = { ...offer, id: id as number };
      const { result } = renderLike(source);
      await act(async () => { await result.current.toggleLike(); });
      expect(setLike).not.toHaveBeenCalled();
      expect(result.current.isPending).toBe(false);
      expect(result.current.offer).toMatchObject({ is_liked_by_me: false, likes_count: 4 });
      expect(toast.error).not.toHaveBeenCalled();
    },
  );

  it.each(['resolve', 'reject'] as const)('ignores stale %s after an offer id changes', async (outcome) => {
    const old = deferred<OfferLikeResponse>();
    setLike.mockReturnValueOnce(old.promise).mockResolvedValueOnce(response({ offer_id: 18, likes_count: 9 }));
    const { result, rerender } = renderLike();
    let oldTask!: Promise<void>;
    act(() => { oldTask = result.current.toggleLike(); });
    rerender({ cardOffer: { ...offer, id: 18, likes_count: 8 } });
    expect(result.current.isPending).toBe(false);
    expect(result.current.offer).toMatchObject({ id: 18, is_liked_by_me: false, likes_count: 8 });
    await act(async () => { await result.current.toggleLike(); });
    await act(async () => {
      if (outcome === 'resolve') old.resolve(response({ likes_count: 333 }));
      else old.reject(new Error('Stale failure'));
      await oldTask;
    });
    expect(result.current.offer).toMatchObject({ id: 18, is_liked_by_me: true, likes_count: 9 });
    expect(result.current.isPending).toBe(false);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it.each(['resolve', 'reject'] as const)('ignores stale %s when server refresh replaces same-id Like data', async (outcome) => {
    const old = deferred<OfferLikeResponse>();
    setLike.mockReturnValue(old.promise);
    const { result, rerender } = renderLike();
    let task!: Promise<void>;
    act(() => { task = result.current.toggleLike(); });
    rerender({ cardOffer: { ...offer, is_liked_by_me: true, likes_count: 52 } });
    await act(async () => {
      if (outcome === 'resolve') old.resolve(response({ likes_count: 333 }));
      else old.reject(new Error('Stale failure'));
      await task;
    });
    expect(result.current.offer).toMatchObject({ is_liked_by_me: true, likes_count: 52 });
    expect(result.current.isPending).toBe(false);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('does not reset a pending Like on an unrelated description refresh', async () => {
    const request = deferred<OfferLikeResponse>();
    setLike.mockReturnValue(request.promise);
    const { result, rerender } = renderLike();
    let task!: Promise<void>;
    act(() => { task = result.current.toggleLike(); });
    rerender({ cardOffer: { ...offer, description: 'Updated content' } });
    expect(result.current.isPending).toBe(true);
    expect(result.current.offer).toMatchObject({ description: 'Updated content', is_liked_by_me: true, likes_count: 5 });
    await act(async () => { request.resolve(response()); await task; });
    expect(result.current.offer.description).toBe('Updated content');
    expect(result.current.isPending).toBe(false);
  });

  it.each(['resolve', 'reject'] as const)('ignores a late %s after the search card unmounts', async (outcome) => {
    const request = deferred<OfferLikeResponse>();
    setLike.mockReturnValue(request.promise);
    const { result, unmount } = renderLike();
    let task!: Promise<void>;
    act(() => { task = result.current.toggleLike(); });
    unmount();
    await act(async () => {
      if (outcome === 'resolve') request.resolve(response());
      else request.reject(new Error('Late failure'));
      await task;
    });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('supports sequential Like and Unlike without freezing the pending lock', async () => {
    setLike.mockResolvedValueOnce(response()).mockResolvedValueOnce(response({ is_liked_by_me: false, likes_count: 4 }));
    const { result } = renderLike();
    await act(async () => { await result.current.toggleLike(); });
    await act(async () => { await result.current.toggleLike(); });
    expect(setLike.mock.calls).toEqual([[17, true], [17, false]]);
    expect(result.current.offer).toMatchObject({ is_liked_by_me: false, likes_count: 4 });
    expect(result.current.isPending).toBe(false);
  });

  it('survives React strict effect re-mounting without losing the current response', async () => {
    const { result } = renderHook(() => useSearchOfferLike(offer, translate), {
      wrapper: ({ children }) => <React.StrictMode>{children}</React.StrictMode>,
    });
    await act(async () => { await result.current.toggleLike(); });
    expect(result.current.offer).toMatchObject({ is_liked_by_me: true, likes_count: 5 });
    expect(result.current.isPending).toBe(false);
  });
});
