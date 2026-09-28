/**
 * [DEBUG ?debugscroll=1 – DOČASNÉ, ODSTRÁNIŤ]
 *
 * Čisté funkcie ladiaceho pásika: komu pripísať zmenu scrollTop a ako
 * zlúčiť súvislé zmeny do jedného segmentu. Bez DOM – testuje sa priamo.
 *
 * Rozhodujúca otázka pásika: skočí `<main>` na inú hodnotu BEZ zápisu
 * z JavaScriptu? Preto sa zápis počíta za príčinu len vtedy, keď sedí aj
 * hodnota – zápis 0 a o 50 ms skok na 7000 NIE JE js-write, ale NONE.
 */

export type ScrollCause = 'js-write' | 'js-smooth' | 'layout-clamp' | 'NONE';

/** Okamžitý zápis (scrollTop, scrollTo/scroll/scrollBy, scrollIntoView bez smooth). */
export const JS_WRITE_WINDOW_MS = 100;
/** Plynulý scroll (behavior 'smooth') beží najviac takto dlho. */
export const JS_SMOOTH_WINDOW_MS = 1500;
/** Zaokrúhlenie – WebKit vracia scrollTop aj v zlomkoch pixela. */
export const WRITE_VALUE_TOLERANCE_PX = 2;
/** Cieľ plynulého scrollu je odhad; obsah môže počas animácie narásť. */
export const SMOOTH_TARGET_TOLERANCE_PX = 40;
/** Súvislé zmeny s medzerou do tohto času patria do jedného segmentu. */
export const SEGMENT_GAP_MS = 60;

/** Jeden zápis do sledovaného scrollera, ako ho videl hook. */
export type ScrollWriteRecord = {
  t: number;
  smooth: boolean;
  /** scrollTop v momente volania. */
  before: number;
  /** Hodnota hneď po okamžitom zápise; pri plynulom `null`. */
  after: number | null;
  /** Kam plynulý scroll mieri (pri scrollIntoView odhad); `null` = neznáme. */
  target: number | null;
};

/** Zmena medzi dvoma snímkami. */
export type ScrollChange = {
  t: number;
  /** Čas predošlej snímky (pri prvej snímke čas kliku). */
  previousT: number;
  from: number;
  to: number;
  heightBefore: number;
  heightAfter: number;
  clientHeight: number;
};

/**
 * Príčina zmeny scrollTop.
 *
 * - js-write: POSLEDNÝ okamžitý zápis je najviac 100 ms pred zmenou, alebo
 *   od predošlej snímky (zablokované vlákno pošle ďalšiu snímku aj o 500 ms
 *   neskôr), a nová hodnota je tá, ktorú zápis nechal.
 * - js-smooth: plynulý scroll spustený najviac 1500 ms pred zmenou a nová
 *   hodnota leží medzi štartom a cieľom (ak je cieľ známy).
 * - layout-clamp: obsah sa zmenšil a hodnota klesla, no neprekročí nové
 *   maximum. Rovnosť s maximom sa nevyžaduje: orezanie mohlo nastať pri
 *   medzivýške, ktorú snímka nevidela (obsah ďalší profil → brána → profil).
 * - NONE: nič z toho.
 *
 * Bol od predošlej snímky okamžitý zápis, zmena sa počíta od hodnoty, ktorú
 * zápis nechal: reset 7023→0 a potom 0→1767 je stúpnutie (NONE), nie
 * orezanie 7023→1767, ako by to vyzeralo len zo snímok.
 */
export function classifyScrollChange(change: ScrollChange, writes: readonly ScrollWriteRecord[]): ScrollCause {
  const ageOf = (write: ScrollWriteRecord) => change.t - write.t;

  const lastInstant = [...writes].reverse().find((write) => !write.smooth && ageOf(write) >= 0);
  const instantSinceFrame = lastInstant !== undefined && lastInstant.t >= change.previousT;
  if (lastInstant && (ageOf(lastInstant) <= JS_WRITE_WINDOW_MS || instantSinceFrame)) {
    if (lastInstant.after === null || Math.abs(change.to - lastInstant.after) <= WRITE_VALUE_TOLERANCE_PX) {
      return 'js-write';
    }
  }
  const from = instantSinceFrame && lastInstant.after !== null ? lastInstant.after : change.from;

  const smoothMatch = writes.some((write) => {
    const age = ageOf(write);
    if (!write.smooth || age < 0 || age > JS_SMOOTH_WINDOW_MS) return false;
    // Volanie od predošlej snímky, no so štartom inde, než snímka videla:
    // hodnota sa pohla ešte PRED volaním (napr. INTOVIEW pred=1440 po snímke
    // 0) – to plynulý scroll nevysvetlí.
    if (write.t >= change.previousT && Math.abs(write.before - from) > WRITE_VALUE_TOLERANCE_PX) return false;
    if (write.target === null) return true;
    const low = Math.min(write.before, write.target) - SMOOTH_TARGET_TOLERANCE_PX;
    const high = Math.max(write.before, write.target) + SMOOTH_TARGET_TOLERANCE_PX;
    return change.to >= low && change.to <= high;
  });
  if (smoothMatch) return 'js-smooth';

  const maxScroll = Math.max(0, change.heightAfter - change.clientHeight);
  if (change.heightAfter < change.heightBefore && change.to < from && change.to <= maxScroll + 1) {
    return 'layout-clamp';
  }
  return 'NONE';
}

/**
 * Kam doscrolluje `scrollIntoView` v scrolleri `box`. Len block start/center/end;
 * 'nearest' závisí od polohy prvku a pásik ho neodhaduje (`null`).
 */
export function estimateIntoViewTarget(input: {
  scrollTop: number;
  maxScroll: number;
  boxTop: number;
  boxHeight: number;
  elTop: number;
  elHeight: number;
  block: string;
}): number | null {
  const offset = input.elTop - input.boxTop;
  let delta: number;
  if (input.block === 'start') delta = offset;
  else if (input.block === 'center') delta = offset - (input.boxHeight - input.elHeight) / 2;
  else if (input.block === 'end') delta = offset - (input.boxHeight - input.elHeight);
  else return null;
  return Math.min(Math.max(Math.round(input.scrollTop + delta), 0), Math.max(0, input.maxScroll));
}

/** Súvislé zmeny s rovnakou príčinou – jeden riadok SCROLL. */
export type ScrollSegment = {
  start: number;
  end: number;
  from: number;
  to: number;
  frames: number;
  cause: ScrollCause;
  heightEnd: number;
};

/**
 * Pridá zmenu k otvorenému segmentu, alebo ho uzavrie a otvorí nový.
 * Spája sa len rovnaká príčina, nadväzujúca hodnota a medzera ≤ 60 ms.
 */
export function mergeScrollChange(
  open: ScrollSegment | null,
  change: { t: number; from: number; to: number; cause: ScrollCause; height: number },
): { open: ScrollSegment; closed: ScrollSegment | null } {
  if (
    open &&
    open.cause === change.cause &&
    change.t - open.end <= SEGMENT_GAP_MS &&
    Math.abs(change.from - open.to) <= 1
  ) {
    return {
      open: { ...open, end: change.t, to: change.to, frames: open.frames + 1, heightEnd: change.height },
      closed: null,
    };
  }
  return {
    open: {
      start: change.t,
      end: change.t,
      from: change.from,
      to: change.to,
      frames: 1,
      cause: change.cause,
      heightEnd: change.height,
    },
    closed: open,
  };
}

/** Segment, ktorý už dlhšie nepokračuje (snímka bez zmeny), sa má uzavrieť. */
export function isSegmentStale(open: ScrollSegment | null, t: number): boolean {
  return open !== null && t - open.end > SEGMENT_GAP_MS;
}

/**
 * Ťah prstom pri zmene: ms od posledného touchmove pred začiatkom,
 * `'during'` = touchmove počas segmentu, `null` = žiadny v posledných 3 s.
 */
export type TouchContext = number | 'during' | null;

/** Kde bol posledný touchmove (nie neskorší než koniec) voči úseku [start, end]. */
export function touchContext(lastTouchMove: number | null, start: number, end: number, relevanceMs: number): TouchContext {
  if (lastTouchMove === null || lastTouchMove > end) return null;
  if (lastTouchMove >= start) return 'during';
  return start - lastTouchMove <= relevanceMs ? start - lastTouchMove : null;
}

/** Popis príčiny; NONE je zreteľné, s informáciou o ťahu prstom. */
export function formatCause(cause: ScrollCause, touch: TouchContext): string {
  if (cause !== 'NONE') return cause;
  if (touch === null) return '!!! NONE (bez touchmove)';
  if (touch === 'during') return '!!! NONE (touchmove počas)';
  return `!!! NONE (touchmove −${Math.round(touch)}ms)`;
}

export function formatSegment(segment: ScrollSegment, touch: TouchContext): string {
  const duration = Math.round(segment.end - segment.start);
  return (
    `SCROLL ${Math.round(segment.from)}→${Math.round(segment.to)} ${duration}ms/${segment.frames}f ` +
    `sh=${Math.round(segment.heightEnd)} ${formatCause(segment.cause, touch)}`
  );
}
