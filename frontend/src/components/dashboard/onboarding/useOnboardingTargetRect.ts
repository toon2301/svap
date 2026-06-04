'use client';

import { useLayoutEffect, useState } from 'react';

export type TargetRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const RETRY_DELAYS_MS = [50, 100, 200] as const;

function readElementRect(el: Element): TargetRect | null {
  const box = el.getBoundingClientRect();
  if (box.width <= 0 || box.height <= 0) return null;

  return {
    top: box.top,
    left: box.left,
    width: box.width,
    height: box.height,
  };
}

function queryVisibleOnboardingElements(selector: string): Element[] {
  if (typeof document === 'undefined') return [];

  return Array.from(document.querySelectorAll(selector)).filter(
    (el) => readElementRect(el) != null,
  );
}

function pickBestVisibleElement(elements: Element[]): Element | null {
  let best: Element | null = null;
  let bestArea = 0;

  for (const el of elements) {
    const rect = readElementRect(el);
    if (!rect) continue;

    const area = rect.width * rect.height;
    if (area > bestArea) {
      bestArea = area;
      best = el;
    }
  }

  return best;
}

export function readTargetRect(selector: string): TargetRect | null {
  const el = pickBestVisibleElement(queryVisibleOnboardingElements(selector));
  if (!el) return null;

  return readElementRect(el);
}

export function readCombinedTargetRect(selectors: string[]): TargetRect | null {
  if (typeof document === 'undefined') return null;

  const boxes: TargetRect[] = [];
  for (const selector of selectors) {
    const el = pickBestVisibleElement(queryVisibleOnboardingElements(selector));
    if (!el) continue;
    const rect = readElementRect(el);
    if (rect) boxes.push(rect);
  }

  if (!boxes.length) return null;

  const top = Math.min(...boxes.map((box) => box.top));
  const left = Math.min(...boxes.map((box) => box.left));
  const right = Math.max(...boxes.map((box) => box.left + box.width));
  const bottom = Math.max(...boxes.map((box) => box.top + box.height));

  return {
    top,
    left,
    width: right - left,
    height: bottom - top,
  };
}

export function useOnboardingTargetRect(
  selector: string | null,
  enabled: boolean,
  refreshKey?: string | number,
) {
  const [rect, setRect] = useState<TargetRect | null>(null);

  useLayoutEffect(() => {
    if (!enabled || !selector) {
      setRect(null);
      return;
    }

    let cancelled = false;
    const timeoutIds: number[] = [];
    let resizeObserver: ResizeObserver | null = null;
    let observedEl: Element | null = null;

    const disconnectObservedElement = () => {
      resizeObserver?.disconnect();
      resizeObserver = null;
      observedEl = null;
    };

    const measure = (): boolean => {
      if (cancelled) return false;

      const next = readTargetRect(selector);
      if (!next) {
        setRect(null);
        disconnectObservedElement();
        return false;
      }

      setRect((prev) => {
        if (
          prev &&
          Math.abs(prev.top - next.top) < 0.5 &&
          Math.abs(prev.left - next.left) < 0.5 &&
          Math.abs(prev.width - next.width) < 0.5 &&
          Math.abs(prev.height - next.height) < 0.5
        ) {
          return prev;
        }
        return next;
      });

      const visibleElements = queryVisibleOnboardingElements(selector);
      const el = pickBestVisibleElement(visibleElements);
      if (el && el !== observedEl) {
        resizeObserver?.disconnect();
        observedEl = el;
        if (typeof ResizeObserver !== 'undefined') {
          resizeObserver = new ResizeObserver(() => {
            measure();
          });
          resizeObserver.observe(el);
        }
      }

      return true;
    };

    const scheduleMeasure = () => {
      measure();

      requestAnimationFrame(() => {
        if (cancelled) return;
        if (!measure()) {
          requestAnimationFrame(() => {
            measure();
          });
        }
      });

      RETRY_DELAYS_MS.forEach((delay) => {
        timeoutIds.push(
          window.setTimeout(() => {
            measure();
          }, delay),
        );
      });
    };

    scheduleMeasure();

    const onChange = () => {
      measure();
    };

    window.addEventListener('resize', onChange);
    window.addEventListener('scroll', onChange, true);
    const main = document.querySelector('[data-dashboard-main]');
    main?.addEventListener('scroll', onChange);

    return () => {
      cancelled = true;
      timeoutIds.forEach((id) => window.clearTimeout(id));
      window.removeEventListener('resize', onChange);
      window.removeEventListener('scroll', onChange, true);
      main?.removeEventListener('scroll', onChange);
      disconnectObservedElement();
    };
  }, [enabled, refreshKey, selector]);

  return rect;
}

export function useOnboardingCombinedTargetRect(
  selectors: string[] | null,
  enabled: boolean,
  refreshKey?: string | number,
) {
  const [rect, setRect] = useState<TargetRect | null>(null);
  const selectorKey = selectors?.join('|') ?? '';

  useLayoutEffect(() => {
    if (!enabled || !selectors?.length) {
      setRect(null);
      return;
    }

    let cancelled = false;
    const timeoutIds: number[] = [];
    let resizeObserver: ResizeObserver | null = null;
    const observedEls = new Set<Element>();

    const disconnectObservedElements = () => {
      resizeObserver?.disconnect();
      resizeObserver = null;
      observedEls.clear();
    };

    const measure = (): boolean => {
      if (cancelled) return false;

      const next = readCombinedTargetRect(selectors);
      if (!next) {
        setRect(null);
        disconnectObservedElements();
        return false;
      }

      setRect((prev) => {
        if (
          prev &&
          Math.abs(prev.top - next.top) < 0.5 &&
          Math.abs(prev.left - next.left) < 0.5 &&
          Math.abs(prev.width - next.width) < 0.5 &&
          Math.abs(prev.height - next.height) < 0.5
        ) {
          return prev;
        }
        return next;
      });

      for (const selector of selectors) {
        const el = pickBestVisibleElement(queryVisibleOnboardingElements(selector));
        if (!el || observedEls.has(el)) continue;
        observedEls.add(el);
        if (typeof ResizeObserver !== 'undefined') {
          if (!resizeObserver) {
            resizeObserver = new ResizeObserver(() => {
              measure();
            });
          }
          resizeObserver.observe(el);
        }
      }

      return true;
    };

    const scheduleMeasure = () => {
      measure();

      requestAnimationFrame(() => {
        if (cancelled) return;
        if (!measure()) {
          requestAnimationFrame(() => {
            measure();
          });
        }
      });

      RETRY_DELAYS_MS.forEach((delay) => {
        timeoutIds.push(
          window.setTimeout(() => {
            measure();
          }, delay),
        );
      });
    };

    scheduleMeasure();

    const onChange = () => {
      measure();
    };

    window.addEventListener('resize', onChange);
    window.addEventListener('scroll', onChange, true);
    const main = document.querySelector('[data-dashboard-main]');
    main?.addEventListener('scroll', onChange);

    return () => {
      cancelled = true;
      timeoutIds.forEach((id) => window.clearTimeout(id));
      window.removeEventListener('resize', onChange);
      window.removeEventListener('scroll', onChange, true);
      main?.removeEventListener('scroll', onChange);
      disconnectObservedElements();
    };
  }, [enabled, refreshKey, selectorKey, selectors]);

  return rect;
}
