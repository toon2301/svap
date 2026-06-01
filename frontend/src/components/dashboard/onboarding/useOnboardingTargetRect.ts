'use client';

import { useCallback, useLayoutEffect, useState } from 'react';

export type TargetRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export function useOnboardingTargetRect(selector: string | null, enabled: boolean) {
  const [rect, setRect] = useState<TargetRect | null>(null);

  const measure = useCallback(() => {
    if (!enabled || !selector || typeof document === 'undefined') {
      setRect(null);
      return;
    }
    const el = document.querySelector(selector);
    if (!el) {
      setRect(null);
      return;
    }
    const box = el.getBoundingClientRect();
    setRect({
      top: box.top,
      left: box.left,
      width: box.width,
      height: box.height,
    });
  }, [enabled, selector]);

  useLayoutEffect(() => {
    measure();
    if (!enabled) return;

    const onChange = () => measure();
    window.addEventListener('resize', onChange);
    window.addEventListener('scroll', onChange, true);
    const main = document.querySelector('[data-dashboard-main]');
    main?.addEventListener('scroll', onChange);

    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onChange) : null;
    const el = selector ? document.querySelector(selector) : null;
    if (el && observer) observer.observe(el);

    return () => {
      window.removeEventListener('resize', onChange);
      window.removeEventListener('scroll', onChange, true);
      main?.removeEventListener('scroll', onChange);
      observer?.disconnect();
    };
  }, [enabled, measure, selector]);

  return rect;
}
