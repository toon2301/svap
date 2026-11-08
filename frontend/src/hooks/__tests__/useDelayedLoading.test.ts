import { act, renderHook } from '@testing-library/react';

import { DEFAULT_LOADING_DELAY_MS, useDelayedLoading } from '../useDelayedLoading';

/**
 * Oneskorený príznak načítavania (nález 286): kostra sa smie ukázať až vtedy, keď načítavanie trvá dlhšie než
 * oneskorenie. Rýchla odpoveď ju nesmie ukázať vôbec, inak vznikne preblesk kostry pred výsledkom.
 */
describe('useDelayedLoading', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /** Posunie hodiny o `ms` v `act`, aby sa spracovali aktualizácie stavu. */
  const advance = (ms: number) => {
    act(() => {
      jest.advanceTimersByTime(ms);
    });
  };

  it('predvolené oneskorenie je 200 ms', () => {
    expect(DEFAULT_LOADING_DELAY_MS).toBe(200);
  });

  it('je false hneď po začiatku načítavania a true až po uplynutí oneskorenia', () => {
    const { result } = renderHook(() => useDelayedLoading(true));

    expect(result.current).toBe(false);
    advance(DEFAULT_LOADING_DELAY_MS - 1);
    expect(result.current).toBe(false);
    advance(1);
    expect(result.current).toBe(true);
  });

  it('nikdy nie je true, keď načítavanie skončí pred oneskorením (rýchla odpoveď)', () => {
    const { result, rerender } = renderHook(({ loading }) => useDelayedLoading(loading), {
      initialProps: { loading: true },
    });

    advance(150);
    rerender({ loading: false });
    advance(1000);

    expect(result.current).toBe(false);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('po skončení dlhého načítavania je hneď false', () => {
    const { result, rerender } = renderHook(({ loading }) => useDelayedLoading(loading), {
      initialProps: { loading: true },
    });
    advance(500);
    expect(result.current).toBe(true);

    rerender({ loading: false });

    expect(result.current).toBe(false);
  });

  it('v tom istom vykreslení, v ktorom načítavanie skončí, už nevráti true (bez preblesku kostry)', () => {
    const seen: boolean[] = [];
    const { rerender } = renderHook(
      ({ loading }) => {
        const value = useDelayedLoading(loading);
        seen.push(value);
        return value;
      },
      { initialProps: { loading: true } },
    );
    advance(500);
    seen.length = 0;

    rerender({ loading: false });

    // Zaznamenaná je každá hodnota z každého vykreslenia, nielen výsledná po dobehnutí efektov.
    expect(seen.length).toBeGreaterThan(0);
    expect(seen).not.toContain(true);
  });

  it('pri ďalšom načítavaní sa oneskorenie počíta odznova', () => {
    const { result, rerender } = renderHook(({ loading }) => useDelayedLoading(loading), {
      initialProps: { loading: true },
    });
    advance(500);
    rerender({ loading: false });

    rerender({ loading: true });
    expect(result.current).toBe(false);
    advance(199);
    expect(result.current).toBe(false);
    advance(1);
    expect(result.current).toBe(true);
  });

  it('bez načítavania je stále false a nezakladá časovač', () => {
    const { result } = renderHook(() => useDelayedLoading(false));

    advance(1000);

    expect(result.current).toBe(false);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('berie vlastné oneskorenie', () => {
    const { result } = renderHook(() => useDelayedLoading(true, 50));

    advance(49);
    expect(result.current).toBe(false);
    advance(1);
    expect(result.current).toBe(true);
  });

  it('po odpojení zruší časovač', () => {
    const { unmount } = renderHook(() => useDelayedLoading(true));
    expect(jest.getTimerCount()).toBe(1);

    unmount();

    expect(jest.getTimerCount()).toBe(0);
  });
});
