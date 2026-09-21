'use client';

/**
 * DOČASNÉ LADENIE – NA ODSTRÁNENIE.
 *
 * Zbiera udalosti okolo profilových záložiek a prepínania modulov, aby sa dali
 * prečítať priamo na telefóne (konzola tam po ruke nie je). Celé je to vypnuté,
 * kým v adrese nie je `?debugtabs=1` – bežný používateľ o tom nevie.
 *
 * Patrí k nálezu „prvý Back medzi záložkami vlastného profilu sa na mobile
 * spotrebuje bez viditeľnej zmeny". Po vyriešení zmazať celý priečinok `debug`
 * aj volania, ktoré naň odkazujú (hľadaj `DEBUG ?debugtabs=1`).
 */

const QUERY_FLAG = 'debugtabs';
const MAX_LINES = 10;

let enabled: boolean | null = null;
let lines: string[] = [];
const listeners = new Set<(lines: string[]) => void>();

/**
 * Je ladenie zapnuté?
 *
 * Zistí sa raz a drží sa po celý beh stránky: appka si adresu priebežne
 * prepisuje (`?tab=`, kanonizácia slugu) a parameter by sa cestou mohol
 * stratiť práve uprostred meraného scenára.
 */
export function isTabDebugEnabled(): boolean {
  if (enabled !== null) return enabled;
  if (typeof window === 'undefined') return false;
  enabled = new URLSearchParams(window.location.search).get(QUERY_FLAG) === '1';
  return enabled;
}

function timestamp(): string {
  const now = new Date();
  const pad = (value: number, size = 2) => String(value).padStart(size, '0');
  return `${pad(now.getMinutes())}:${pad(now.getSeconds())}.${pad(now.getMilliseconds(), 3)}`;
}

/** Pridá riadok (neprepisuje) – poradie udalostí je to, čo sa skúma. */
export function logTabDebug(message: string): void {
  if (!isTabDebugEnabled()) return;
  lines = [...lines, `${timestamp()} ${message}`].slice(-MAX_LINES);
  listeners.forEach((listener) => listener(lines));
}

export function subscribeTabDebug(listener: (lines: string[]) => void): () => void {
  listeners.add(listener);
  listener(lines);
  return () => {
    listeners.delete(listener);
  };
}
