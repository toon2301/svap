import { act, renderHook } from '@testing-library/react';

import {
  LOAD_MORE_RETRY_BASE_MS,
  LOAD_MORE_RETRY_MAX_MS,
  useNotificationsLoadMoreRetry,
} from '../useNotificationsLoadMoreRetry';

describe('useNotificationsLoadMoreRetry', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  async function failAndWait(result: {
    current: ReturnType<typeof useNotificationsLoadMoreRetry>;
  }) {
    act(() => result.current.fail());
    expect(result.current.paused).toBe(true);
  }

  it('pauses 5, 10, 20, 40, 60, 60 s', () => {
    const { result } = renderHook(() => useNotificationsLoadMoreRetry());
    for (const delay of [5_000, 10_000, 20_000, 40_000, 60_000, 60_000]) {
      act(() => result.current.fail());
      expect(result.current.paused).toBe(true);
      act(() => {
        jest.advanceTimersByTime(delay - 1);
      });
      expect(result.current.paused).toBe(true);
      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(result.current.paused).toBe(false);
    }
    expect([LOAD_MORE_RETRY_BASE_MS, LOAD_MORE_RETRY_MAX_MS]).toEqual([5_000, 60_000]);
  });

  it('reset starts again from 5 s, release keeps the escalation', async () => {
    const { result } = renderHook(() => useNotificationsLoadMoreRetry());
    await failAndWait(result);
    act(() => {
      jest.advanceTimersByTime(5_000);
    });
    await failAndWait(result); // 10 s
    act(() => result.current.release());
    expect(result.current.paused).toBe(false);
    expect(jest.getTimerCount()).toBe(0);
    act(() => result.current.fail()); // 20 s (počítadlo ostalo)
    act(() => {
      jest.advanceTimersByTime(19_999);
    });
    expect(result.current.paused).toBe(true);
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current.paused).toBe(false);
    act(() => result.current.reset());
    act(() => result.current.fail()); // znova 5 s
    act(() => {
      jest.advanceTimersByTime(5_000);
    });
    expect(result.current.paused).toBe(false);
  });

  it('keeps a single timer on a repeated failure and clears it on unmount', () => {
    const { result, unmount } = renderHook(() => useNotificationsLoadMoreRetry());
    act(() => result.current.fail());
    act(() => result.current.fail());
    expect(jest.getTimerCount()).toBe(1);
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });
});
