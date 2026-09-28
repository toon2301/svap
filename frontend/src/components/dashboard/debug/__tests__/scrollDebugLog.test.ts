/**
 * [DEBUG ?debugscroll=1 – DOČASNÉ, ODSTRÁNIŤ]
 * Zapnutie, kruhový buffer, prežitie cez sessionStorage a formát Kopírovať.
 */

import {
  SCROLL_DEBUG_FLAG_KEY,
  SCROLL_DEBUG_LOG_KEY,
  SCROLL_DEBUG_MAX_LINES,
  clearScrollDebugLog,
  flushScrollDebugLog,
  forgetScrollDebug,
  formatScrollDebugCopy,
  getScrollDebugLines,
  holdScrollDebugOutput,
  logDebugLine,
  logDebugRaw,
  resetScrollDebugLogForTests,
  resolveScrollDebugFlag,
  startDebugClick,
  subscribeScrollDebugLog,
} from '../scrollDebugLog';

const storedLines = (): string[] | null => {
  const raw = sessionStorage.getItem(SCROLL_DEBUG_LOG_KEY);
  return raw ? JSON.parse(raw) : null;
};

beforeEach(() => {
  sessionStorage.clear();
  resetScrollDebugLogForTests();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('resolveScrollDebugFlag', () => {
  it('?debugscroll=1 zapne a stav prežije adresu bez parametra', () => {
    expect(resolveScrollDebugFlag('?debugscroll=1')).toBe(true);
    expect(sessionStorage.getItem(SCROLL_DEBUG_FLAG_KEY)).toBe('1');
    expect(resolveScrollDebugFlag('?tab=offers')).toBe(true);
    expect(resolveScrollDebugFlag('')).toBe(true);
  });

  it('?debugscroll=0 vypne a zmaže príznak aj uložený záznam', () => {
    resolveScrollDebugFlag('?debugscroll=1');
    sessionStorage.setItem(SCROLL_DEBUG_LOG_KEY, JSON.stringify(['CLICK /dashboard/users/anton']));
    expect(resolveScrollDebugFlag('?debugscroll=0')).toBe(false);
    expect(sessionStorage.getItem(SCROLL_DEBUG_FLAG_KEY)).toBeNull();
    expect(sessionStorage.getItem(SCROLL_DEBUG_LOG_KEY)).toBeNull();
    expect(resolveScrollDebugFlag('')).toBe(false);
  });

  it('bez parametra a bez uloženého stavu je vypnutý', () => {
    expect(resolveScrollDebugFlag('?offer=11')).toBe(false);
    expect(resolveScrollDebugFlag('?debugscroll=2')).toBe(false);
  });
});

describe('riadky', () => {
  it('predpona Cn a čas od posledného kliku', () => {
    logDebugLine('pred klikom', 42.4);
    startDebugClick(1000);
    logDebugLine('X', 1123.6);
    expect(getScrollDebugLines()).toEqual(['C0 +42 pred klikom', 'C1 +124 X']);
  });

  it(`buffer drží najviac ${SCROLL_DEBUG_MAX_LINES} riadkov – najstaršie odpadnú`, () => {
    for (let i = 1; i <= SCROLL_DEBUG_MAX_LINES + 5; i += 1) logDebugRaw(`riadok ${i}`);
    const lines = getScrollDebugLines();
    expect(lines).toHaveLength(SCROLL_DEBUG_MAX_LINES);
    expect(lines[0]).toBe('riadok 6');
    expect(lines[lines.length - 1]).toBe(`riadok ${SCROLL_DEBUG_MAX_LINES + 5}`);
  });

  it('dlhý riadok sa skráti', () => {
    logDebugRaw('x'.repeat(1000));
    expect(getScrollDebugLines()[0]).toHaveLength(240);
  });

  it('snímka pre panel sa nemení, kým nepribudne riadok', () => {
    logDebugRaw('a');
    const first = getScrollDebugLines();
    expect(getScrollDebugLines()).toBe(first);
    logDebugRaw('b');
    expect(getScrollDebugLines()).not.toBe(first);
  });
});

describe('sessionStorage', () => {
  it('ukladá s oneskorením a záznam prežije reload', () => {
    jest.useFakeTimers({ doNotFake: ['queueMicrotask', 'nextTick'] });
    logDebugRaw('— štart stránky —');
    startDebugClick(0);
    logDebugLine('CLICK div', 0);
    expect(storedLines()).toBeNull();
    jest.advanceTimersByTime(500);
    expect(storedLines()).toEqual(['— štart stránky —', 'C1 +0 CLICK div']);

    // Reload: pamäť modulu je preč, úložisko ostalo.
    resetScrollDebugLogForTests({ keepStorage: true });
    expect(getScrollDebugLines()).toEqual(['— štart stránky —', 'C1 +0 CLICK div']);
    logDebugRaw('— štart stránky —');
    expect(getScrollDebugLines()).toHaveLength(3);
  });

  it('počas okna po kliku sa neukladá ani neprekresľuje – dobehne po ňom', async () => {
    jest.useFakeTimers({ doNotFake: ['queueMicrotask', 'nextTick'] });
    const listener = jest.fn();
    subscribeScrollDebugLog(listener);

    holdScrollDebugOutput(true);
    logDebugRaw('počas okna');
    jest.advanceTimersByTime(5000);
    await Promise.resolve();
    expect(storedLines()).toBeNull();
    expect(listener).not.toHaveBeenCalled();

    holdScrollDebugOutput(false);
    await Promise.resolve();
    expect(listener).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(500);
    expect(storedLines()).toEqual(['počas okna']);
  });

  it('vstup do okna zruší už nabitý časovač ukladania – uloží sa až po okne', () => {
    jest.useFakeTimers({ doNotFake: ['queueMicrotask', 'nextTick'] });
    // Riadok CLICK nabije časovač ešte pred vstupom do okna.
    logDebugRaw('CLICK');
    holdScrollDebugOutput(true);
    logDebugRaw('F1');
    jest.advanceTimersByTime(4000);
    expect(storedLines()).toBeNull();

    holdScrollDebugOutput(false);
    jest.advanceTimersByTime(499);
    expect(storedLines()).toBeNull();
    jest.advanceTimersByTime(1);
    expect(storedLines()).toEqual(['CLICK', 'F1']);
  });

  it('forgetScrollDebug zmaže záznam aj príznak z pamäte aj z úložiska a zruší čakajúce uloženie', () => {
    jest.useFakeTimers({ doNotFake: ['queueMicrotask', 'nextTick'] });
    resolveScrollDebugFlag('?debugscroll=1');
    logDebugRaw('a');
    flushScrollDebugLog();
    logDebugRaw('b');
    forgetScrollDebug();
    jest.advanceTimersByTime(1000);
    expect(getScrollDebugLines()).toEqual([]);
    expect(sessionStorage.getItem(SCROLL_DEBUG_LOG_KEY)).toBeNull();
    expect(sessionStorage.getItem(SCROLL_DEBUG_FLAG_KEY)).toBeNull();
  });

  it('flush zapíše hneď (pagehide), aj počas okna', () => {
    holdScrollDebugOutput(true);
    logDebugRaw('pred odchodom');
    flushScrollDebugLog();
    expect(storedLines()).toEqual(['pred odchodom']);
  });

  it('poškodený záznam v úložisku sa ignoruje', () => {
    sessionStorage.setItem(SCROLL_DEBUG_LOG_KEY, '{nie json');
    expect(getScrollDebugLines()).toEqual([]);
    sessionStorage.setItem(SCROLL_DEBUG_LOG_KEY, JSON.stringify(['ok', 5, null]));
    resetScrollDebugLogForTests({ keepStorage: true });
    expect(getScrollDebugLines()).toEqual(['ok']);
  });

  it('Vymazať vyčistí pamäť aj úložisko', () => {
    logDebugRaw('a');
    flushScrollDebugLog();
    clearScrollDebugLog();
    expect(getScrollDebugLines()).toEqual([]);
    expect(storedLines()).toEqual([]);
  });
});

describe('formatScrollDebugCopy', () => {
  it('hlavička, prostredie a celý záznam v poradí', () => {
    expect(formatScrollDebugCopy('ENV iPhone OS 18.6', ['r1', 'r2'], '2026-09-28T10:00:00.000Z')).toBe(
      ['debugscroll · 2026-09-28T10:00:00.000Z · riadkov: 2', 'ENV iPhone OS 18.6', 'r1', 'r2'].join('\n'),
    );
  });

  it('predvolene berie celý aktuálny záznam, nie len viditeľné riadky', () => {
    for (let i = 0; i < 20; i += 1) logDebugRaw(`r${i}`);
    const text = formatScrollDebugCopy('ENV', undefined, 'T');
    expect(text.split('\n')).toHaveLength(22);
    expect(text).toContain('riadkov: 20');
  });
});
