'use client';

import { useEffect, useLayoutEffect } from 'react';

// V prehliadači pred vykreslením, nech nová obrazovka neblikne odscrollovaná.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/** Dashboard scrolluje len v `<main>`; posun okna (iOS lišty) sa pri novej obrazovke vráti na 0. */
export function useDashboardWindowScrollReset(mainKey: string): void {
  useIsomorphicLayoutEffect(() => {
    if (window.scrollY !== 0) window.scrollTo(0, 0);
  }, [mainKey]);
}
