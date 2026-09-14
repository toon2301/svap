'use client';

import { useEffect, useState } from 'react';

export type VisualViewportBounds = {
  top: number;
  left: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
};

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

/** Returns the browser area that is currently visible, excluding an open keyboard. */
export function readVisualViewportBounds(): VisualViewportBounds | null {
  if (typeof window === 'undefined') return null;

  const viewport = window.visualViewport;
  if (
    viewport
    && isPositiveFinite(viewport.width)
    && isPositiveFinite(viewport.height)
  ) {
    const top = Number.isFinite(viewport.offsetTop)
      ? Math.max(0, viewport.offsetTop)
      : 0;
    const left = Number.isFinite(viewport.offsetLeft)
      ? Math.max(0, viewport.offsetLeft)
      : 0;
    return {
      top,
      left,
      width: viewport.width,
      height: viewport.height,
      right: left + viewport.width,
      bottom: top + viewport.height,
    };
  }

  if (!isPositiveFinite(window.innerWidth) || !isPositiveFinite(window.innerHeight)) {
    return null;
  }

  return {
    top: 0,
    left: 0,
    width: window.innerWidth,
    height: window.innerHeight,
    right: window.innerWidth,
    bottom: window.innerHeight,
  };
}

/** Tracks visual viewport bounds while mobile browser chrome or a keyboard moves them. */
export function useVisualViewportBounds(enabled: boolean): VisualViewportBounds | null {
  const [bounds, setBounds] = useState<VisualViewportBounds | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      setBounds(null);
      return;
    }

    const update = () => setBounds(readVisualViewportBounds());
    const viewport = window.visualViewport;

    update();
    window.addEventListener('resize', update);
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);

    return () => {
      window.removeEventListener('resize', update);
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
    };
  }, [enabled]);

  return bounds;
}
