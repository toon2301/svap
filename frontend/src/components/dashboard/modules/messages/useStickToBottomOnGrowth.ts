'use client';

import { RefObject, useEffect } from 'react';
import { MOBILE_LATEST_SCROLL_THRESHOLD_PX } from './conversationDetailConstants';

type UseStickToBottomOnGrowthOptions = {
  enabled: boolean;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  contentRef: RefObject<HTMLDivElement | null>;
};

/** Či je okno najviac `MOBILE_LATEST_SCROLL_THRESHOLD_PX` nad spodkom (alebo na ňom). */
function isNearBottom(scrollContainer: HTMLDivElement): boolean {
  return (
    scrollContainer.scrollHeight - scrollContainer.clientHeight - scrollContainer.scrollTop <=
    MOBILE_LATEST_SCROLL_THRESHOLD_PX
  );
}

/**
 * Drží okno správ na spodku, kým obsah rastie. Po odoslaní sa okno posunie na spodok hneď, no fotka dostane výšku až po
 * načítaní a bez tohto by ostala schovaná pod oknom. Ak bolo okno pred zväčšením na spodku (najviac
 * `MOBILE_LATEST_SCROLL_THRESHOLD_PX` nad ním), po zväčšení sa posunie znova na spodok; ak používateľ odišiel vyššie, nehýbe sa.
 * Poloha sa zisťuje pri každom posune (aj programovom), nie z výšky obsahu: keď sa dosadia staršie správy, aplikácia vráti
 * čitateľa na jeho miesto a výška a poloha by sa pri porovnaní nezhodli.
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

    let wasAtBottom = isNearBottom(scrollContainer);
    const handleScroll = () => {
      wasAtBottom = isNearBottom(scrollContainer);
    };
    const resizeObserver = new ResizeObserver(() => {
      if (wasAtBottom) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    });
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    resizeObserver.observe(content);

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
    };
  }, [enabled, scrollContainerRef, contentRef]);
}
