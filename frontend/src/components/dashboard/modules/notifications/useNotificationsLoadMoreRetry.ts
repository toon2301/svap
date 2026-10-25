'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** Po chybe donačítania sa ďalší pokus odloží: 5 s, 10 s, 20 s, 40 s, potom každú minútu. */
export const LOAD_MORE_RETRY_BASE_MS = 5_000;
export const LOAD_MORE_RETRY_MAX_MS = 60_000;

/**
 * Tichá pauza po neúspešnom donačítaní ďalšej dávky upozornení (bez textu, bez tlačidla).
 *
 *  - `fail()`    dávka zlyhala: pauza sa predĺži (5 s -> 60 s) a po jej uplynutí sa `paused` sám zhasne,
 *  - `release()` pauza sa zruší hneď, počítadlo zlyhaní ostáva (server odpovedal, skúsime znova, ale pri
 *                ďalšom zlyhaní nezačíname od 5 s),
 *  - `reset()`   dávka prišla: pauza aj počítadlo od nuly.
 * Časovač sa čistí pri odmontovaní.
 */
export function useNotificationsLoadMoreRetry() {
  const [paused, setPaused] = useState(false);
  const failuresRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const fail = useCallback(() => {
    clearTimer();
    failuresRef.current += 1;
    const delay = Math.min(
      LOAD_MORE_RETRY_BASE_MS * 2 ** (failuresRef.current - 1),
      LOAD_MORE_RETRY_MAX_MS,
    );
    setPaused(true);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setPaused(false);
    }, delay);
  }, [clearTimer]);

  const release = useCallback(() => {
    clearTimer();
    setPaused(false);
  }, [clearTimer]);

  const reset = useCallback(() => {
    failuresRef.current = 0;
    release();
  }, [release]);

  return { paused, fail, release, reset };
}
