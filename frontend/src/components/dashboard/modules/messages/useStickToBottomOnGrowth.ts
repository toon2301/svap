'use client';

import { RefObject, useEffect } from 'react';
import { MOBILE_LATEST_SCROLL_THRESHOLD_PX } from './conversationDetailConstants';

type UseStickToBottomOnGrowthOptions = {
  enabled: boolean;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  contentRef: RefObject<HTMLDivElement | null>;
};

/**
 * Drží okno správ na spodku, kým obsah rastie. Po odoslaní sa okno posunie na spodok hneď, no fotka dostane výšku až po
 * načítaní a bez tohto by ostala schovaná pod oknom. Ak bolo okno pred zväčšením na spodku (najviac
 * `MOBILE_LATEST_SCROLL_THRESHOLD_PX` nad ním), po zväčšení sa posunie znova na spodok; ak používateľ odišiel vyššie, nehýbe sa.
 */
export function useStickToBottomOnGrowth({
  enabled,
  scrollContainerRef,
  contentRef,
}: UseStickToBottomOnGrowthOptions): void {
  useEffect(() => {
    if (!enabled || typeof ResizeObserver === 'undefined') return;

    const scrollContainer = scrollContainerRef.current;
    const content = contentRef.current;
    if (!scrollContainer || !content) return;

    let previousScrollHeight = scrollContainer.scrollHeight;
    const resizeObserver = new ResizeObserver(() => {
      const { scrollHeight, clientHeight, scrollTop } = scrollContainer;
      const wasAtBottom =
        previousScrollHeight - clientHeight - scrollTop <= MOBILE_LATEST_SCROLL_THRESHOLD_PX;
      previousScrollHeight = scrollHeight;
      if (wasAtBottom) {
        scrollContainer.scrollTop = scrollHeight;
      }
    });
    resizeObserver.observe(content);

    return () => resizeObserver.disconnect();
  }, [enabled, scrollContainerRef, contentRef]);
}
