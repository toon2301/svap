'use client';

/**
 * Zámok ťahu prstom vo fullscreen vrstve (nález 376, kolo 3c).
 *
 * Pri otvorenej klávesnici je rozloženie stránky vyššie než viditeľná plocha, a preto iPhone dovolí ťahom posúvať viditeľnú
 * plochu, aj keď sa stránka sama posúvať nedá. Pripnutá vrstva (`useFeedKeyboardViewport`) sa k posunu dorovnáva až po
 * udalosti, takže sa s fotkou, panelom aj poľom pred očami kýve. Majiteľ chce, aby sa pri krátkych komentároch nehýbalo nič a pri
 * dlhých len zoznam komentárov, nie fotka na pozadí.
 *
 * Hook preto v koreni vrstvy zruší predvolenú akciu ťahu (`touchmove`) všade, kde sa nič posunúť nemá: mimo posuvných prvkov a na
 * hraniciach posuvného prvku (zoznam na začiatku pri ťahu nadol a na konci pri ťahu nahor), takže sa ťah nereťazí na stránku
 * ani na viditeľnú plochu. Posuvný zoznam sa v svojom rozsahu posúva ďalej. Viacprstové gesto (priblíženie) sa necháva na
 * prehliadači. Poslucháč `touchmove` musí byť nepasívny, inak by `preventDefault` nič nespravil.
 */

import { useEffect, type RefObject } from 'react';

/** Hodnoty `overflow-y`, pri ktorých je prvok posuvný. */
const SCROLLABLE_OVERFLOW = new Set(['auto', 'scroll', 'overlay']);

/** Zaokrúhlenie a zlomky pixelov pri `scrollTop` na iPhone: v tejto vzdialenosti od okraja sa už prvok považuje za krajný. */
const EDGE_TOLERANCE_PX = 1;

/**
 * Vie niektorý predok `target` (po `root` vrátane) posunúť obsah v smere ťahu?
 *
 * `deltaY` > 0 je prst idúci nadol (obsah sa vracia na začiatok), `deltaY` < 0 prst idúci nahor (obsah ide ku koncu).
 */
export function canScrollInDirection(
  target: EventTarget | null,
  root: HTMLElement,
  deltaY: number,
): boolean {
  let element: Element | null = target instanceof Element ? target : null;
  while (element) {
    // Prvok, ktorý sa celý zmestí, nemá kam sa posunúť (`scrollTop` 0 a `scrollHeight` = `clientHeight`), takže ho nič nezachráni.
    const { overflowY } = window.getComputedStyle(element);
    if (SCROLLABLE_OVERFLOW.has(overflowY)) {
      const canGoBack = element.scrollTop > EDGE_TOLERANCE_PX;
      const canGoForward =
        element.scrollTop + element.clientHeight < element.scrollHeight - EDGE_TOLERANCE_PX;
      if ((deltaY > 0 && canGoBack) || (deltaY < 0 && canGoForward)) return true;
    }
    if (element === root) break;
    element = element.parentElement;
  }
  return false;
}

/**
 * Kým je `active`, ťah prstom v `rootRef` sa posúva len vo vnútri posuvných prvkov (pozri hlavičku súboru).
 *
 * `active` má byť `true` až keď koreň existuje v DOM (hook sa viaže na jeho prvú dostupnosť).
 */
export function useLightboxTouchPanLock(
  rootRef: RefObject<HTMLElement | null>,
  active: boolean,
): void {
  useEffect(() => {
    const root = rootRef.current;
    if (!active || !root) return;

    let lastY = 0;
    const handleStart = (event: TouchEvent) => {
      lastY = event.touches[0]?.clientY ?? 0;
    };
    const handleMove = (event: TouchEvent) => {
      // Viacprstové gesto necháme prehliadaču; nezrušiteľnú udalosť zrušiť nejde (prehliadač by len písal varovanie).
      if (event.touches.length !== 1 || !event.cancelable) return;
      const y = event.touches[0].clientY;
      const deltaY = y - lastY;
      lastY = y;
      if (canScrollInDirection(event.target, root, deltaY)) return;
      event.preventDefault();
    };

    root.addEventListener('touchstart', handleStart, { passive: true });
    root.addEventListener('touchmove', handleMove, { passive: false });
    return () => {
      root.removeEventListener('touchstart', handleStart);
      root.removeEventListener('touchmove', handleMove);
    };
  }, [rootRef, active]);
}
