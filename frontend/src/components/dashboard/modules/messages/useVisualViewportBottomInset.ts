'use client';

import { useEffect, useState } from 'react';

const MIN_KEYBOARD_INSET_PX = 120;

/**
 * Vzdialenosť medzi spodkom layout viewportu a spodkom vizuálneho viewportu
 * pri otvorenej klávesnici na mobile. Keď composer nie je aktívny, vracia 0,
 * aby sa fixed input neposúval pri obyčajnom scrollovaní alebo pri zmene browser chrome.
 */
export function useVisualViewportBottomInset(enabled: boolean, active: boolean): number {
  const [bottomPx, setBottomPx] = useState(0);

  useEffect(() => {
    if (!enabled || !active || typeof window === 'undefined') {
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
      const normalizedInset = Number.isFinite(hiddenBelow) ? Math.max(0, hiddenBelow) : 0;
      setBottomPx(normalizedInset >= MIN_KEYBOARD_INSET_PX ? normalizedInset : 0);
    };

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);

    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, [active, enabled]);

  return bottomPx;
}
