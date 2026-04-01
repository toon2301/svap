'use client';

import { useEffect, useState } from 'react';

/**
 * Calculates dynamic bottom spacing for message lists so the last message
 * stays above the fixed mobile composer regardless of composer height.
 */
export function useComposerReservedSpace(
  composerElement: HTMLDivElement | null,
  enabled: boolean,
  extraGapPx = 8,
  additionalInsetPx = 0,
): number {
  const [reservedPx, setReservedPx] = useState(0);

  useEffect(() => {
    if (!enabled || !composerElement) {
      setReservedPx(0);
      return;
    }

    const update = () => {
      const next = Math.max(0, Math.ceil(composerElement.offsetHeight) + extraGapPx + additionalInsetPx);
      setReservedPx(next);
    };

    update();

    const observer = new ResizeObserver(() => update());
    observer.observe(composerElement);
    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
    };
  }, [additionalInsetPx, composerElement, enabled, extraGapPx]);

  return reservedPx;
}

