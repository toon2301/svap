/**
 * [DEBUG ?debugscroll=1 – DOČASNÉ, ODSTRÁNIŤ]
 * Okno 4 s po kliku: snímky F1–F3, segmenty s príčinou, vzorky, súhrn,
 * ignorovanie klikov v paneli a zadržanie výstupu počas okna.
 *
 * „Pohyb mimo JavaScriptu" (napr. iOS vráti starú pozíciu) sa simuluje
 * pôvodným setterom scrollTop uloženým PRED inštaláciou hookov – hook ho
 * nevidí, rovnako ako nevidí posun z UI procesu.
 */

import { installScrollDebug, uninstallScrollDebug } from '../scrollDebugInstall';
import { scrollDebugTag } from '../scrollDebugHooks';
import {
  SCROLL_DEBUG_LOG_KEY,
  getScrollDebugLines,
  resetScrollDebugLogForTests,
  subscribeScrollDebugLog,
} from '../scrollDebugLog';
import { resetScrollDebugStateForTests } from '../scrollDebugState';

const nativeSetScrollTop = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTop')!.set!;
const realIntoView = Element.prototype.scrollIntoView;

let main: HTMLElement;
let card: HTMLElement;
let scrollHeight = 0;

/** Posun, o ktorom JavaScript nevie. */
const moveWithoutJs = (value: number) => nativeSetScrollTop.call(main, value);
const click = (element: Element) => element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
const frames = (count: number) => jest.advanceTimersByTime(16 * count);
const linesAfter = (marker: string) => {
  const lines = getScrollDebugLines();
  return lines.slice(lines.findIndex((line) => line.includes(marker)));
};

beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ['queueMicrotask', 'nextTick'] });
  sessionStorage.clear();
  resetScrollDebugLogForTests();
  resetScrollDebugStateForTests();
  Element.prototype.scrollIntoView = jest.fn() as unknown as typeof Element.prototype.scrollIntoView;
  document.body.innerHTML = `
    <main data-dashboard-main><div data-testid="feed-post-card"><span class="font-bold text-sm">x</span></div></main>
    <div data-scroll-debug-panel><button type="button">OK</button></div>`;
  main = document.querySelector('main')!;
  card = main.querySelector('[data-testid="feed-post-card"]')!;
  scrollHeight = 11245;
  Object.defineProperty(main, 'scrollHeight', { configurable: true, get: () => scrollHeight });
  Object.defineProperty(main, 'clientHeight', { configurable: true, get: () => 659 });
  moveWithoutJs(7023);
  installScrollDebug();
});

afterEach(() => {
  uninstallScrollDebug();
  Element.prototype.scrollIntoView = realIntoView;
  jest.useRealTimers();
});

it('reset 0→0 a potom skok bez zápisu z JS: F1–F3, !!! NONE, vzorky a súhrn', () => {
  click(card.querySelector('span')!);

  // Appka v tom istom tasku: obsah sa vymení (prehliadač oreže na 0), reset zapíše 0.
  scrollHeight = 659;
  moveWithoutJs(0);
  scrollDebugTag('fresh-entry reset');
  main.scrollTop = 0;
  scrollHeight = 791;

  frames(3);
  jest.advanceTimersByTime(200);
  // Obsah narástol a scroll sa „vrátil" bez akéhokoľvek zápisu.
  scrollHeight = 2426;
  moveWithoutJs(1767);
  jest.advanceTimersByTime(4000);

  const lines = linesAfter('CLICK');
  expect(lines[0]).toMatch(
    /^C1 \+0 CLICK span\.font-bold\.text-sm ⊂ div\[testid=feed-post-card\] st=7023 sh=11245 ch=659 wy=0 vv=\?$/,
  );
  expect(lines[1]).toMatch(/SET main\.scrollTop=0 pred=0 po=0 sh=659 @.* \[fresh-entry reset\]$/);
  expect(lines[2]).toMatch(/^C1 \+\d+ F1 st=0 sh=791 Δ7023→0 js-write$/);
  expect(lines[3]).toMatch(/^C1 \+\d+ F2 st=0 sh=791$/);
  expect(lines[4]).toMatch(/^C1 \+\d+ F3 st=0 sh=791$/);
  expect(lines).toContainEqual(expect.stringMatching(/SCROLL 0→1767 0ms\/1f sh=2426 !!! NONE \(bez touchmove\)$/));
  const samples = lines.filter((line) => / S[0-9.]+ /.test(line));
  expect(samples.map((line) => line.split(' ')[2])).toEqual(['S0.5', 'S1', 'S2', 'S3']);
  expect(samples[0]).toMatch(/S0\.5 st=1767 sh=2426 wy=0 vv=\? zvýr=0$/);
  expect(lines[lines.length - 1]).toMatch(/^C1 \+\d+ END C1 scroll\(main\)×0 .* touchmove×0 replace=×0 net-opak×0 net-iné×0$/);
});

it('plynulý scrollIntoView zospodu je js-smooth, skok mimo jeho dráhy je NONE', () => {
  click(card);
  frames(4);
  // Odhad cieľa: karta 1000 px pod vrchom main, block center → ≈ 7023 + 1000 − 229,5.
  card.getBoundingClientRect = () => ({ top: 1000, height: 200 }) as DOMRect;
  card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  moveWithoutJs(7500);
  frames(1);
  moveWithoutJs(7794);
  frames(5);
  moveWithoutJs(200);
  frames(5);
  jest.advanceTimersByTime(4000);

  const lines = linesAfter('CLICK');
  expect(lines).toContainEqual(expect.stringMatching(/INTOVIEW .* smooth pred=7023 sh=11245 cieľ≈7794 @/));
  expect(lines).toContainEqual(expect.stringMatching(/SCROLL 7023→7794 16ms\/2f sh=11245 js-smooth$/));
  expect(lines).toContainEqual(expect.stringMatching(/SCROLL 7794→200 0ms\/1f sh=11245 !!! NONE/));
});

it('ťah prstom pred skokom sa pri NONE uvedie a započíta', () => {
  click(card);
  frames(4);
  jest.advanceTimersByTime(100);
  main.dispatchEvent(new Event('touchstart', { bubbles: true }));
  main.dispatchEvent(new Event('touchmove', { bubbles: true }));
  jest.advanceTimersByTime(50);
  moveWithoutJs(6000);
  jest.advanceTimersByTime(4000);

  const lines = linesAfter('CLICK');
  expect(lines).toContainEqual(expect.stringMatching(/SCROLL 7023→6000 .* !!! NONE \(touchmove −\d+ms\)$/));
  expect(lines[lines.length - 1]).toMatch(/touchstart×1\(\+\d+\.\.\+\d+\) touchmove×1\(\+\d+\.\.\+\d+\)/);
});

it('klik v paneli nezačne okno a nemení číslo kliku', () => {
  const before = getScrollDebugLines().length;
  click(document.querySelector('[data-scroll-debug-panel] button')!);
  frames(3);
  expect(getScrollDebugLines().slice(before)).toEqual([]);
  click(card);
  expect(getScrollDebugLines()[getScrollDebugLines().length - 1]).toMatch(/^C1 \+0 CLICK /);
});

it('nový klik uzavrie predošlé okno súhrnom', () => {
  click(card);
  frames(5);
  click(card);
  const lines = linesAfter('CLICK');
  expect(lines.map((line) => line.split(' ').slice(0, 3).join(' '))).toEqual(
    expect.arrayContaining(['C1 +0 CLICK']),
  );
  const endIndex = lines.findIndex((line) => line.includes('END C1'));
  const secondClick = lines.findIndex((line) => line.startsWith('C2 +0 CLICK'));
  expect(endIndex).toBeGreaterThan(0);
  expect(secondClick).toBe(endIndex + 1);
});

it('počas okna sa do sessionStorage nezapisuje, hoci CLICK nabil časovač pred oknom', () => {
  jest.advanceTimersByTime(600);
  const stored = () => JSON.parse(sessionStorage.getItem(SCROLL_DEBUG_LOG_KEY) ?? '[]') as string[];
  const beforeClick = stored();
  expect(beforeClick.length).toBeGreaterThan(0);

  click(card);
  jest.advanceTimersByTime(3900);
  expect(stored()).toEqual(beforeClick);

  jest.advanceTimersByTime(200 + 500);
  expect(stored()).toContainEqual(expect.stringMatching(/^C1 \+0 CLICK /));
  expect(stored()[stored().length - 1]).toMatch(/END C1/);
});

it('panel sa počas okna neprekresľuje, dobehne na jeho konci', async () => {
  const listener = jest.fn();
  subscribeScrollDebugLog(listener);
  await Promise.resolve();
  listener.mockClear();

  click(card);
  frames(10);
  await Promise.resolve();
  expect(listener).not.toHaveBeenCalled();

  jest.advanceTimersByTime(4000);
  await Promise.resolve();
  expect(listener).toHaveBeenCalledTimes(1);
});

it('NET: API volania s časom konca, ďalšie ID tej istej podoby a ne-API zdroje len počtom', () => {
  uninstallScrollDebug();
  let deliver: (entries: Array<{ name: string; startTime: number; duration: number }>) => void = () => {};
  const globalWithObserver = globalThis as unknown as { PerformanceObserver?: unknown };
  const realObserver = globalWithObserver.PerformanceObserver;
  globalWithObserver.PerformanceObserver = class {
    constructor(callback: (list: { getEntries: () => unknown[] }) => void) {
      deliver = (entries) => callback({ getEntries: () => entries });
    }
    observe() {}
    disconnect() {}
  };
  try {
    installScrollDebug();
    click(card);
    const at = performance.now();
    const api = 'https://svaply.test/api/auth';
    deliver([
      { name: api + '/feed/posts/?page=2', startTime: at + 10, duration: 100 },
      { name: api + '/feed/posts/209/shared-thumbnail/', startTime: at + 20, duration: 300 },
      { name: api + '/feed/posts/203/shared-thumbnail/', startTime: at + 21, duration: 300 },
      { name: api + '/feed/posts/202/shared-thumbnail/', startTime: at + 22, duration: 300 },
      { name: api + '/dashboard/users/12/profile/', startTime: at + 30, duration: 80 },
      { name: api + '/dashboard/users/12/profile/', startTime: at + 40, duration: 80 },
      { name: 'https://svaply.test/_next/static/chunks/6036-abc.js', startTime: at + 5, duration: 50 },
      { name: api + '/dashboard/users/12/skills/', startTime: at - 1, duration: 80 },
    ]);
    jest.advanceTimersByTime(4100);

    const lines = linesAfter('CLICK');
    const net = lines.filter((line) => line.includes(' NET '));
    expect(net).toEqual([
      expect.stringMatching(/^C1 \+10 NET \/api\/auth\/feed\/posts\/ 100ms → \+110$/),
      expect.stringMatching(/^C1 \+20 NET \/api\/auth\/feed\/posts\/209\/shared-thumbnail\/ 300ms → \+320$/),
      expect.stringMatching(/^C1 \+30 NET \/api\/auth\/dashboard\/users\/12\/profile\/ 80ms → \+110$/),
      expect.stringMatching(/^C1 \+40 NET \/api\/auth\/dashboard\/users\/12\/profile\/ 80ms → \+120$/),
    ]);
    expect(lines.join('\n')).not.toContain('page=2');
    expect(lines[lines.length - 1]).toMatch(/net-opak×2 net-iné×1$/);
  } finally {
    globalWithObserver.PerformanceObserver = realObserver;
  }
});
