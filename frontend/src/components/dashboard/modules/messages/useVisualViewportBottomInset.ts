'use client';

import { useEffect, useState } from 'react';

/**
 * Vzdialenosť medzi spodkom layout viewportu a spodkom vizuálneho viewportu
 * (typicky klávesnica na mobile). Použije sa na posun `position: fixed` composeru nad klávesnicu.
 */
export function useVisualViewportBottomInset(enabled: boolean): number {
  const [bottomPx, setBottomPx] = useState(0);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      setBottomPx(0);
      return;
    }

    const vv = window.visualViewport;
    if (!vv) {
      setBottomPx(0);
      return;
    }

    const update = () => {
      const hiddenBelow = window.innerHeight - vv.height - vv.offsetTop;
      setBottomPx(Number.isFinite(hiddenBelow) ? Math.max(0, hiddenBelow) : 0);
    };

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);

    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, [enabled]);

  return bottomPx;
}
