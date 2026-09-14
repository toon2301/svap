'use client';

import {
  useCallback,
  useEffect,
  useRef,
  type FocusEventHandler,
  type RefObject,
} from 'react';
import type { VisualViewportBounds } from '../../../hooks/useVisualViewportBounds';

export const OFFER_WATCH_PRICE_FIELD_SELECTOR = '[data-offer-watch-price-field]';

type UseOfferWatchPriceFieldVisibilityOptions = {
  scrollContainerRef: RefObject<HTMLElement>;
  viewportBounds: VisualViewportBounds | null;
  padding?: number;
};

type OfferWatchPriceFieldVisibilityHandlers = {
  onFocusCapture: FocusEventHandler<HTMLElement>;
  onBlurCapture: FocusEventHandler<HTMLElement>;
};

const DEFAULT_VISIBILITY_PADDING = 16;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function moveFieldIntoVisibleArea(
  scrollContainer: HTMLElement,
  field: HTMLElement,
  viewportBounds: VisualViewportBounds | null,
  padding: number,
): void {
  const containerRect = scrollContainer.getBoundingClientRect();
  const fieldRect = field.getBoundingClientRect();
  const visibleTop = Math.max(containerRect.top, viewportBounds?.top ?? containerRect.top) + padding;
  const visibleBottom = Math.min(
    containerRect.bottom,
    viewportBounds?.bottom ?? containerRect.bottom,
  ) - padding;

  if (
    !Number.isFinite(visibleTop)
    || !Number.isFinite(visibleBottom)
    || visibleBottom <= visibleTop
  ) {
    return;
  }

  let scrollDelta = 0;
  if (fieldRect.bottom > visibleBottom) {
    scrollDelta = fieldRect.bottom - visibleBottom;
  } else if (fieldRect.top < visibleTop) {
    scrollDelta = fieldRect.top - visibleTop;
  }

  if (scrollDelta === 0) return;

  const maximumScrollTop = Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight);
  const nextScrollTop = clamp(scrollContainer.scrollTop + scrollDelta, 0, maximumScrollTop);
  if (nextScrollTop !== scrollContainer.scrollTop) {
    scrollContainer.scrollTop = nextScrollTop;
  }
}

/** Keeps the focused Offer Watch price field visible inside the mobile form scroller. */
export function useOfferWatchPriceFieldVisibility({
  scrollContainerRef,
  viewportBounds,
  padding = DEFAULT_VISIBILITY_PADDING,
}: UseOfferWatchPriceFieldVisibilityOptions): OfferWatchPriceFieldVisibilityHandlers {
  const activeFieldRef = useRef<HTMLElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const viewportBoundsRef = useRef(viewportBounds);
  viewportBoundsRef.current = viewportBounds;

  const cancelScheduledAdjustment = useCallback(() => {
    if (animationFrameRef.current === null || typeof window === 'undefined') return;
    window.cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = null;
  }, []);

  const scheduleAdjustment = useCallback(() => {
    if (!activeFieldRef.current || !scrollContainerRef.current || typeof window === 'undefined') {
      return;
    }

    cancelScheduledAdjustment();
    animationFrameRef.current = window.requestAnimationFrame(() => {
      animationFrameRef.current = null;
      const activeField = activeFieldRef.current;
      const scrollContainer = scrollContainerRef.current;
      if (!activeField || !scrollContainer || !activeField.isConnected) return;
      moveFieldIntoVisibleArea(
        scrollContainer,
        activeField,
        viewportBoundsRef.current,
        padding,
      );
    });
  }, [cancelScheduledAdjustment, padding, scrollContainerRef]);

  const onFocusCapture = useCallback<FocusEventHandler<HTMLElement>>((event) => {
    const target = event.target;
    const nextField = target instanceof Element
      ? target.closest<HTMLElement>(OFFER_WATCH_PRICE_FIELD_SELECTOR)
      : null;
    activeFieldRef.current = nextField;
    if (nextField) {
      scheduleAdjustment();
    } else {
      cancelScheduledAdjustment();
    }
  }, [cancelScheduledAdjustment, scheduleAdjustment]);

  const onBlurCapture = useCallback<FocusEventHandler<HTMLElement>>((event) => {
    const activeField = activeFieldRef.current;
    const nextTarget = event.relatedTarget;
    if (activeField && nextTarget instanceof Node && activeField.contains(nextTarget)) return;
    activeFieldRef.current = null;
    cancelScheduledAdjustment();
  }, [cancelScheduledAdjustment]);

  useEffect(() => {
    scheduleAdjustment();
    return cancelScheduledAdjustment;
  }, [
    cancelScheduledAdjustment,
    scheduleAdjustment,
    viewportBounds?.bottom,
    viewportBounds?.height,
    viewportBounds?.left,
    viewportBounds?.right,
    viewportBounds?.top,
    viewportBounds?.width,
  ]);

  return { onFocusCapture, onBlurCapture };
}
