/**
 * [DEBUG ?debugscroll=1 – DOČASNÉ, ODSTRÁNIŤ]
 *
 * Spoločný stav ladiaceho pásika: či je zapnutý, posledné zápisy do
 * sledovaných scrollerov (pre priradenie príčiny) a časy ťahov prstom.
 */

import type { ScrollWriteRecord } from './scrollDebugCause';

/** Starších zápisov netreba – najdlhšie okno príčiny je 1500 ms. */
const MAX_WRITES = 40;
/** Ťahy prstom stačia za pár sekúnd; momentum po nich trvá najviac ~3 s. */
const MAX_TOUCH_MOVES = 200;

export const scrollDebugState = {
  active: false,
  mainWrites: [] as ScrollWriteRecord[],
  windowWrites: [] as ScrollWriteRecord[],
  /** Časy touchmove vzostupne – segment sa porovnáva s ťahmi PRED svojím koncom. */
  touchMoves: [] as number[],
  /** replaceState bez zmeny adresy v aktuálnom okne (Next ich volá často). */
  sameUrlReplaces: 0,
};

export function rememberWrite(list: ScrollWriteRecord[], write: ScrollWriteRecord): void {
  list.push(write);
  if (list.length > MAX_WRITES) list.splice(0, list.length - MAX_WRITES);
}

export function rememberTouchMove(t: number): void {
  const moves = scrollDebugState.touchMoves;
  moves.push(t);
  if (moves.length > MAX_TOUCH_MOVES) moves.splice(0, moves.length - MAX_TOUCH_MOVES);
}

/** Posledný touchmove nie neskôr než `t`, alebo `null`. */
export function lastTouchMoveUpTo(t: number): number | null {
  const moves = scrollDebugState.touchMoves;
  for (let index = moves.length - 1; index >= 0; index -= 1) {
    if (moves[index] <= t) return moves[index];
  }
  return null;
}

export function resetScrollDebugStateForTests(): void {
  scrollDebugState.active = false;
  scrollDebugState.mainWrites = [];
  scrollDebugState.windowWrites = [];
  scrollDebugState.touchMoves = [];
  scrollDebugState.sameUrlReplaces = 0;
}
