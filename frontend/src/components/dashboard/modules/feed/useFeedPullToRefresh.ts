'use client';

/**
 * Potiahnutie prstom nadol = obnovenie feedu (mobil).
 *
 * Vlastné touch handlery, žiadna nová závislosť: celá logika je ~60 riadkov
 * a knižnica by si priniesla vlastný scroll model, ktorý by sa s dashboardovým
 * layoutom (scrolluje `<main>`, nie body) musel aj tak zosúlaďovať.
 *
 * KONFLIKT S NATÍVNYM PULL-TO-REFRESH (Chrome/Android):
 * touchmove sa registruje s `{ passive: false }` a počas aktívneho ťahania
 * volá `preventDefault()`. Tým sa natívne gesto zruší a nespustia sa dve veci
 * naraz (reload stránky + naše načítanie). `overscroll-behavior` sama o sebe
 * nestačí – uplatní sa len na scrollovacom kontajneri, kdežto tu ťaháme za
 * obal feedu vnútri cudzieho scrollera. preventDefault funguje v oboch
 * prípadoch. Listener je zámerne na kontajneri feedu (nie na window/document),
 * kde `passive` NEmá vynútený default true.
 *
 * Aktivuje sa LEN pri scrollTop === 0 najbližšieho scrollovacieho rodiča –
 * inak by gesto kradlo bežné scrollovanie obsahu.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/** Prah v px (po odpore), za ktorým uvoľnenie spustí načítanie. */
export const PULL_TO_REFRESH_THRESHOLD = 70;
/** Ťah nad tento limit sa už vizuálne neprejaví (guma, nie nekonečný pás). */
const MAX_PULL_DISTANCE = 110;
/** Odpor – prst prejde 2× dlhšiu dráhu než indikátor. */
const PULL_RESISTANCE = 0.5;

function getScrollParent(node: HTMLElement | null): HTMLElement | null {
  let current = node?.parentElement ?? null;
  while (current) {
    const overflowY = window.getComputedStyle(current).overflowY;
    if (/(auto|scroll|overlay)/.test(overflowY)) return current;
    current = current.parentElement;
  }
  return null;
}

type UseFeedPullToRefreshOptions = {
  onRefresh: () => Promise<void> | void;
  /** Vypnuté počas prvého načítania alebo v chybovom stave. */
  enabled?: boolean;
};

export function useFeedPullToRefresh({
  onRefresh,
  enabled = true,
}: UseFeedPullToRefreshOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const startYRef = useRef<number | null>(null);
  const distanceRef = useRef(0);
  const refreshingRef = useRef(false);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const reset = useCallback(() => {
    startYRef.current = null;
    distanceRef.current = 0;
    setPullDistance(0);
  }, []);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const isAtTop = () => {
      const scroller = getScrollParent(node);
      return (scroller ? scroller.scrollTop : window.scrollY) <= 0;
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (!enabledRef.current || refreshingRef.current) return;
      if (event.touches.length !== 1) return;
      // Gesto sa smie začať len úplne hore – inak ide o bežné scrollovanie.
      if (!isAtTop()) return;
      startYRef.current = event.touches[0].clientY;
    };

    const handleTouchMove = (event: TouchEvent) => {
      const startY = startYRef.current;
      if (startY === null || refreshingRef.current) return;

      const delta = event.touches[0].clientY - startY;
      // Pohyb nahor (alebo medzitým odscrollované) → gesto zrušíme a
      // necháme prehliadaču normálne scrollovanie.
      if (delta <= 0 || !isAtTop()) {
        if (distanceRef.current !== 0) reset();
        startYRef.current = null;
        return;
      }

      // Až TU rušíme natívne gesto – nie skôr, aby bežný scroll ostal plynulý.
      if (event.cancelable) event.preventDefault();
      const next = Math.min(delta * PULL_RESISTANCE, MAX_PULL_DISTANCE);
      distanceRef.current = next;
      setPullDistance(next);
    };

    const handleTouchEnd = () => {
      const reached = distanceRef.current >= PULL_TO_REFRESH_THRESHOLD;
      startYRef.current = null;
      distanceRef.current = 0;

      if (!reached || refreshingRef.current) {
        setPullDistance(0);
        return;
      }

      refreshingRef.current = true;
      setRefreshing(true);
      // Indikátor drží prah, kým beží načítanie – nech gesto nepôsobí,
      // že sa „odtrhlo" bez efektu.
      setPullDistance(PULL_TO_REFRESH_THRESHOLD);

      void Promise.resolve(onRefreshRef.current()).finally(() => {
        refreshingRef.current = false;
        setRefreshing(false);
        setPullDistance(0);
      });
    };

    node.addEventListener('touchstart', handleTouchStart, { passive: true });
    // passive:false je nutné, inak by preventDefault() nemal účinok.
    node.addEventListener('touchmove', handleTouchMove, { passive: false });
    node.addEventListener('touchend', handleTouchEnd);
    node.addEventListener('touchcancel', handleTouchEnd);
    return () => {
      node.removeEventListener('touchstart', handleTouchStart);
      node.removeEventListener('touchmove', handleTouchMove);
      node.removeEventListener('touchend', handleTouchEnd);
      node.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [reset]);

  return {
    containerRef,
    pullDistance,
    refreshing,
    /** Prekročený prah – FE podľa toho mení text/rotáciu indikátora. */
    readyToRefresh: pullDistance >= PULL_TO_REFRESH_THRESHOLD,
  };
}
