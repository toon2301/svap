'use client';

import { useEffect, useState } from 'react';

/**
 * Returns the currently visible mobile viewport height in pixels.
 * We prefer VisualViewport so the chat shell shrinks with the iOS keyboard.
 */
export function useMobileViewportHeight(enabled: boolean): number | null {
  const [heightPx, setHeightPx] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      setHeightPx(null);
      return;
    }

    const update = () => {
      const nextHeight =
        window.visualViewport?.height && Number.isFinite(window.visualViewport.offsetTop)
          ? Math.ceil(window.visualViewport.height + window.visualViewport.offsetTop)
          : window.innerHeight;

      setHeightPx(Number.isFinite(nextHeight) && nextHeight > 0 ? nextHeight : null);
    };

    update();

    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);

    return () => {
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
    };
  }, [enabled]);

  return heightPx;
}
