'use client';

import { useLayoutEffect, useState } from 'react';

export type TargetRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const RETRY_DELAYS_MS = [50, 100, 200] as const;

function readTargetRect(selector: string): TargetRect | null {
  if (typeof document === 'undefined') return null;

  const el = document.querySelector(selector);
  if (!el) return null;

  const box = el.getBoundingClientRect();
  if (box.width <= 0 || box.height <= 0) return null;

  return {
    top: box.top,
    left: box.left,
    width: box.width,
    height: box.height,
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

      const el = document.querySelector(selector);
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
