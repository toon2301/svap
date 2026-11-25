'use client';

/**
 * Výška obrazovky podľa viditeľnej plochy nad klávesnicou (R75 bod 5, nález 370).
 *
 * Mobilný detail príspevku a prehliadač fotky sú vrstvy `fixed inset-0`, teda zviazané s rozložením stránky, ktoré sa pri
 * otvorení klávesnice na iPhone NEZMENŠÍ (zmenší sa len viditeľná plocha, `visualViewport`). Pole na komentár pri spodku
 * vrstvy tak ostane pod klávesnicou a prehliadač si ho odkryje posunom viditeľnej plochy: hlavička vrstvy ujde nahor a vrstva
 * sa pred očami „hýbe“. Kým má pole fokus, vrstva sa preto pripne presne na viditeľnú plochu (`top` = jej posun, `height` = jej
 * výška): pole stojí tesne nad klávesnicou, hlavička hore a nedá sa odscrollovať. Rovnako ako v chate, ktorý výšku podľa
 * `visualViewport` nastavuje tiež (`useMobileViewportHeight`); tu sa navyše sleduje posun, lebo vrstva nezačína v rohu stránky.
 *
 * - Pripína sa len kým je pole aktívne (`active`); mimo toho vrstva ostáva `inset-0`.
 * - Po strate fokusu ostane pripnutá ešte `KEYBOARD_RELEASE_DELAY_MS`: klávesnica sa zasúva asi štvrť sekundy a skoré uvoľnenie
 *   by vrstvu na chvíľu natiahlo pod ňu; krátke zavlnenie fokusu (ťuk na krížik, prepnutie cieľa) ju tiež nechá na mieste.
 * - Pri priblížení prstami (`scale` > 1) sa nepripína: viditeľná plocha je vtedy len výrez, nie plocha nad klávesnicou.
 * - Bez `window.visualViewport` (staré prehliadače, jsdom) sa nič nepripína a vrstva ostáva `inset-0`.
 */

import { useEffect, useState, type CSSProperties } from 'react';

export type FeedKeyboardBox = {
  /** Posun viditeľnej plochy od vrchu rozloženia (px); rovnaký, o aký iPhone posunul stránku, aby odkryl pole. */
  top: number;
  /** Výška viditeľnej plochy (px), teda plocha nad klávesnicou. */
  height: number;
};

/** Ako dlho po strate fokusu poľa ostane vrstva pripnutá (ms). */
export const KEYBOARD_RELEASE_DELAY_MS = 300;

/** Pri väčšom priblížení sa vrstva nepripína. */
const MAX_PINNED_SCALE = 1.01;

function measure(viewport: VisualViewport): FeedKeyboardBox | null {
  if (viewport.scale > MAX_PINNED_SCALE) return null;
  const height = Math.round(viewport.height);
  if (!Number.isFinite(height) || height <= 0) return null;
  const top = Math.round(viewport.offsetTop);
  return { top: Number.isFinite(top) ? Math.max(0, top) : 0, height };
}

function sameBox(a: FeedKeyboardBox | null, b: FeedKeyboardBox | null): boolean {
  return a === b || (a !== null && b !== null && a.top === b.top && a.height === b.height);
}

/** Štýl pripnutej vrstvy: `top` a `height` z viditeľnej plochy, `bottom` sa ruší (vrstva je `fixed inset-0`). */
export function feedKeyboardBoxStyle(
  box: FeedKeyboardBox | null,
): CSSProperties | undefined {
  return box ? { top: box.top, height: box.height, bottom: 'auto' } : undefined;
}

/** `true`, kým je `active`, a ešte `delayMs` po jeho strate. */
function useHeld(active: boolean, delayMs: number): boolean {
  const [held, setHeld] = useState(active);
  useEffect(() => {
    if (active) {
      setHeld(true);
      return;
    }
    const timer = window.setTimeout(() => setHeld(false), delayMs);
    return () => window.clearTimeout(timer);
  }, [active, delayMs]);
  return active || held;
}

/**
 * Viditeľná plocha (nad klávesnicou), kým je `active`, inak `null`.
 *
 * Hodnota sa aktualizuje pri každej zmene veľkosti aj posunu viditeľnej plochy; nezmenená hodnota prekreslenie nespúšťa.
 */
export function useFeedKeyboardViewport(active: boolean): FeedKeyboardBox | null {
  const held = useHeld(active, KEYBOARD_RELEASE_DELAY_MS);
  const [box, setBox] = useState<FeedKeyboardBox | null>(null);

  useEffect(() => {
    const viewport = typeof window === 'undefined' ? null : window.visualViewport;
    if (!held || !viewport) {
      setBox(null);
      return;
    }
    const update = () =>
      setBox((current) => {
        const next = measure(viewport);
        return sameBox(current, next) ? current : next;
      });
    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
    };
  }, [held]);

  return box;
}
