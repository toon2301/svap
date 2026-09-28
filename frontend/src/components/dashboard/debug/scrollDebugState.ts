/**
 * [DEBUG ?debugscroll=1 – DOČASNÉ, ODSTRÁNIŤ]
 *
 * Spoločný stav ladiaceho pásika: či je zapnutý, posledné zápisy do
 * sledovaných scrollerov (pre priradenie príčiny) a čas posledného ťahu prstom.
 */

import type { ScrollWriteRecord } from './scrollDebugCause';

/** Starších zápisov netreba – najdlhšie okno príčiny je 1500 ms. */
const MAX_WRITES = 40;

export const scrollDebugState = {
  active: false,
  mainWrites: [] as ScrollWriteRecord[],
  windowWrites: [] as ScrollWriteRecord[],
  lastTouchMoveAt: null as number | null,
  /** replaceState bez zmeny adresy v aktuálnom okne (Next ich volá často). */
  sameUrlReplaces: 0,
};

export function rememberWrite(list: ScrollWriteRecord[], write: ScrollWriteRecord): void {
  list.push(write);
  if (list.length > MAX_WRITES) list.splice(0, list.length - MAX_WRITES);
}

export function resetScrollDebugStateForTests(): void {
  scrollDebugState.active = false;
  scrollDebugState.mainWrites = [];
  scrollDebugState.windowWrites = [];
  scrollDebugState.lastTouchMoveAt = null;
  scrollDebugState.sameUrlReplaces = 0;
}
