'use client';

import { useEffect, useState } from 'react';

/** Ako dlho (ms) sa pri načítavaní čaká, kým sa ukáže kostra; kratšie načítanie kostru vôbec neukáže (nález 286). */
export const DEFAULT_LOADING_DELAY_MS = 200;

/**
 * Vráti `true`, až keď načítavanie (`isLoading`) trvá aspoň `delayMs`. Rýchla odpoveď tak kostru vôbec neukáže a pred
 * výsledkom nevznikne preblesk kostry. Po skončení načítavania je hodnota hneď `false` a pri ďalšom načítavaní
 * (napr. po „Skúsiť znova“) sa oneskorenie počíta od začiatku.
 */
export function useDelayedLoading(
  isLoading: boolean,
  delayMs: number = DEFAULT_LOADING_DELAY_MS,
): boolean {
  const [delayElapsed, setDelayElapsed] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setDelayElapsed(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setDelayElapsed(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [isLoading, delayMs]);

  return isLoading && delayElapsed;
}
