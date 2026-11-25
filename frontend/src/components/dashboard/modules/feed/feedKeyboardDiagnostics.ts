'use client';

/**
 * Skrytá diagnostika viditeľnej plochy pri klávesnici (nálezy 375 až 377, kolo 3c).
 *
 * Správanie iPhonu s klávesnicou sa v prostredí agenta (Chromium) overiť nedá, a preto má mobilný detail aj prehliadač fotky
 * na požiadanie malý prekryv so skutočnými číslami: `visualViewport`, poloha vrstvy, panela a poľa a počet udalostí. Majiteľ
 * pošle snímku obrazovky z detailu aj z panela nad fotkou a rozdiel medzi nimi sa dá odmerať namiesto hádania.
 *
 * Zapína sa dlhým podržaním nadpisu „Komentáre“ v paneli nad fotkou (rovnako sa vypína); príznak sa pamätá v `localStorage`
 * tohto zariadenia (a v pamäti, keď je úložisko zablokované). Pre ostatných používateľov je prekryv neviditeľný a obsahuje len
 * čísla rozloženia, nijaké osobné údaje. Po overení opravy sa diagnostika odstráni.
 */

import { useSyncExternalStore } from 'react';

export const KEYBOARD_DIAGNOSTICS_STORAGE_KEY = 'svaply-kbd-diagnostics';
export const KEYBOARD_DIAGNOSTICS_EVENT = 'svaply-kbd-diagnostics-change';

/** Príznak v pamäti: poistka pre prípad, že `localStorage` nejde použiť (súkromné okno, zablokované údaje). */
let memoryFlag = false;

function readStored(): boolean | null {
  try {
    return window.localStorage.getItem(KEYBOARD_DIAGNOSTICS_STORAGE_KEY) === '1';
  } catch {
    return null;
  }
}

/** Je diagnostika zapnutá? */
export function readKeyboardDiagnosticsFlag(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = readStored();
  return stored === null ? memoryFlag : stored;
}

/** Prepne diagnostiku, dá o tom vedieť otvoreným prekryvom a vráti novú hodnotu. */
export function toggleKeyboardDiagnostics(): boolean {
  const next = !readKeyboardDiagnosticsFlag();
  memoryFlag = next;
  try {
    if (next) window.localStorage.setItem(KEYBOARD_DIAGNOSTICS_STORAGE_KEY, '1');
    else window.localStorage.removeItem(KEYBOARD_DIAGNOSTICS_STORAGE_KEY);
  } catch {
    // Úložisko je zablokované: príznak ostane len v pamäti.
  }
  window.dispatchEvent(new Event(KEYBOARD_DIAGNOSTICS_EVENT));
  return next;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(KEYBOARD_DIAGNOSTICS_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(KEYBOARD_DIAGNOSTICS_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

/** Príznak diagnostiky ako stav komponentu (na serveri vždy `false`). */
export function useKeyboardDiagnosticsFlag(): boolean {
  return useSyncExternalStore(subscribe, readKeyboardDiagnosticsFlag, () => false);
}

/** Horný a dolný okraj prvku (px rozloženia, na iPhone body). */
export type DiagnosticsRect = { top: number; bottom: number };

export type KeyboardDiagnosticsSample = {
  innerWidth: number;
  innerHeight: number;
  scrollY: number;
  vvHeight: number | null;
  vvOffsetTop: number | null;
  vvPageTop: number | null;
  vvScale: number | null;
  layer: DiagnosticsRect | null;
  panel: DiagnosticsRect | null;
  field: DiagnosticsRect | null;
  resizeEvents: number;
  scrollEvents: number;
  /** Ako dávno prišla posledná udalosť `visualViewport` (ms), `null` keď ešte žiadna. */
  sinceLastEventMs: number | null;
};

export type DiagnosticsCounters = {
  resize: number;
  scroll: number;
  lastEventAt: number | null;
};

function rectOf(element: Element | null): DiagnosticsRect | null {
  if (!element) return null;
  const { top, bottom } = element.getBoundingClientRect();
  return { top, bottom };
}

/**
 * Odmeria aktuálny stav. `layerTestId` je vrstva (prehliadač fotky alebo mobilný detail), `panelTestId` panel komentárov
 * (len pri prehliadači fotky); pole je prvé `textarea` vo vrstve.
 */
export function collectKeyboardDiagnostics(
  layerTestId: string,
  panelTestId: string | null,
  counters: DiagnosticsCounters,
  now: number,
): KeyboardDiagnosticsSample {
  const viewport = window.visualViewport;
  const layer = document.querySelector(`[data-testid="${layerTestId}"]`);
  const panel = panelTestId ? document.querySelector(`[data-testid="${panelTestId}"]`) : null;
  return {
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    scrollY: window.scrollY,
    vvHeight: viewport ? viewport.height : null,
    vvOffsetTop: viewport ? viewport.offsetTop : null,
    vvPageTop: viewport ? viewport.pageTop : null,
    vvScale: viewport ? viewport.scale : null,
    layer: rectOf(layer),
    panel: rectOf(panel),
    field: rectOf(layer ? layer.querySelector('textarea') : null),
    resizeEvents: counters.resize,
    scrollEvents: counters.scroll,
    sinceLastEventMs: counters.lastEventAt === null ? null : now - counters.lastEventAt,
  };
}

const num = (value: number | null) => (value === null || !Number.isFinite(value) ? '–' : String(Math.round(value)));
const range = (rect: DiagnosticsRect | null) => (rect ? `${num(rect.top)} až ${num(rect.bottom)}` : '–');

/** Text prekryvu: jeden riadok na údaj, hodnoty zaokrúhlené na celé body. */
export function formatKeyboardDiagnostics(
  label: string,
  sample: KeyboardDiagnosticsSample,
  time: string,
): string {
  const scale = sample.vvScale === null ? '–' : sample.vvScale.toFixed(2);
  return [
    `KBD ${label} ${time}`,
    `okno ${num(sample.innerWidth)}×${num(sample.innerHeight)} scrollY ${num(sample.scrollY)}`,
    `vv výška ${num(sample.vvHeight)} posun ${num(sample.vvOffsetTop)} strana ${num(sample.vvPageTop)} mierka ${scale}`,
    `vrstva ${range(sample.layer)}`,
    `panel ${range(sample.panel)}`,
    `pole ${range(sample.field)}`,
    `udalosti resize ${sample.resizeEvents} scroll ${sample.scrollEvents} pred ${
      sample.sinceLastEventMs === null ? '–' : `${num(sample.sinceLastEventMs)} ms`
    }`,
  ].join('\n');
}
