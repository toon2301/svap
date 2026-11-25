'use client';

/**
 * Dlhé podržanie prstom (na zapnutie skrytej diagnostiky, nálezy 375 až 377, kolo 3c).
 *
 * Vráti obsluhy dotyku pre prvok: po `delayMs` bez zdvihnutia prsta a bez výraznejšieho pohybu zavolá `onLongPress`. Zdvihnutie
 * prsta, zrušenie gesta systémom alebo pohyb o viac než `MOVE_TOLERANCE_PX` podržanie zruší, takže bežné ťahanie ani ťuknutie
 * nič nespustí. Časovač zanikne aj po odmontovaní.
 */

import { useCallback, useEffect, useRef, type TouchEvent } from 'react';

/** Ako dlho treba držať prst (ms): dosť dlho, aby sa diagnostika nezapla omylom. */
export const FEED_LONG_PRESS_MS = 1500;

/** Najväčší pohyb prsta (px), pri ktorom sa podržanie ešte nezruší. */
export const MOVE_TOLERANCE_PX = 10;

export function useFeedLongPress(onLongPress: () => void, delayMs: number = FEED_LONG_PRESS_MS) {
  const timer = useRef<number | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const callback = useRef(onLongPress);
  callback.current = onLongPress;

  const cancel = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    origin.current = null;
  }, []);

  useEffect(() => cancel, [cancel]);

  const onTouchStart = useCallback(
    (event: TouchEvent) => {
      cancel();
      const touch = event.touches[0];
      if (!touch || event.touches.length !== 1) return;
      origin.current = { x: touch.clientX, y: touch.clientY };
      timer.current = window.setTimeout(() => {
        timer.current = null;
        origin.current = null;
        callback.current();
      }, delayMs);
    },
    [cancel, delayMs],
  );

  const onTouchMove = useCallback(
    (event: TouchEvent) => {
      const start = origin.current;
      const touch = event.touches[0];
      if (!start || !touch) return;
      if (Math.hypot(touch.clientX - start.x, touch.clientY - start.y) > MOVE_TOLERANCE_PX) cancel();
    },
    [cancel],
  );

  return { onTouchStart, onTouchMove, onTouchEnd: cancel, onTouchCancel: cancel };
}
