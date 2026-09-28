'use client';

/**
 * [DEBUG ?debugscroll=1 – DOČASNÉ, ODSTRÁNIŤ]
 *
 * Okno 4 s po každom kliku: snímky scrollu `<main>` (rAF), vzorky pri
 * 0,5/1/2/3 s, príčina každej zmeny, počty dotykov a scroll udalostí, NET,
 * značky DOM a udalosti stránky (visualViewport, viditeľnosť, bfcache).
 *
 * Všetky listenery sú passive a nič nerušia. Ladiaci kód nevolá scroll API,
 * nemení DOM appky a jediný časovač je rAF slučka počas okna (číta, nepíše).
 */

import {
  classifyScrollChange,
  formatCause,
  formatSegment,
  isSegmentStale,
  mergeScrollChange,
  type ScrollSegment,
} from './scrollDebugCause';
import {
  DOM_MARKERS,
  describeTarget,
  domMarkerPresence,
  environmentLine,
  findDashboardMain,
  isInDebugPanel,
  summarizeUrl,
} from './scrollDebugDom';
import {
  currentDebugClick,
  debugNow,
  flushScrollDebugLog,
  holdScrollDebugOutput,
  logDebugLine,
  logDebugRaw,
  startDebugClick,
} from './scrollDebugLog';
import { scrollDebugState } from './scrollDebugState';

export const CLICK_WINDOW_MS = 4000;
const SAMPLE_AT_MS = [500, 1000, 2000, 3000];
const FIRST_FRAMES = 3;
/** touchmove starší než toto sa pri NONE neuvádza. */
const TOUCH_RELEVANCE_MS = 3000;
const MAX_MARKER_LINES_PER_CLICK = 6;
const MAX_OTHER_SCROLLERS_LOGGED = 5;
const MAX_WINDOW_LINES_PER_CLICK = 10;

type EventCount = { n: number; first: number | null; last: number | null };
type CountKey = 'scrollMain' | 'scrollDoc' | 'scrollOther' | 'touchstart' | 'touchmove';
type MainMetrics = { st: number; sh: number; ch: number };
type DocMetrics = { wy: number; docSt: number; wsh: number };

type ClickWindow = {
  n: number;
  at: number;
  frame: number;
  /** Čas predošlej snímky – pri prvej čas kliku. */
  prevT: number;
  prev: MainMetrics & DocMetrics;
  samples: number;
  segment: ScrollSegment | null;
  counts: Record<CountKey, EventCount>;
  otherScrollers: Set<EventTarget>;
  windowLines: number;
  netOther: number;
  netRepeats: number;
};

let installed = false;
let clickWindow: ClickWindow | null = null;
let frameId = 0;
const cleanups: Array<() => void> = [];
let markerState: Record<string, boolean> = {};
const markerLines = new Map<string, number>();
/** Podoba API cesty (čísla → #) → prvá zapísaná cesta v okne posledného kliku. */
const netSeen = new Map<string, string>();
let viewportKey = '';

const r = (value: number) => Math.round(value);

function readMain(): MainMetrics {
  const main = findDashboardMain();
  return main ? { st: main.scrollTop, sh: main.scrollHeight, ch: main.clientHeight } : { st: 0, sh: 0, ch: 0 };
}

function readDocument(): DocMetrics {
  const root = document.scrollingElement;
  return { wy: window.scrollY, docSt: root ? root.scrollTop : 0, wsh: root ? root.scrollHeight : 0 };
}

function viewportText(): string {
  const viewport = window.visualViewport;
  return viewport ? `${r(viewport.height)}/${r(viewport.offsetTop)}` : '?';
}

function sinceTouchMove(t: number): number | null {
  const last = scrollDebugState.lastTouchMoveAt;
  return last !== null && t >= last && t - last <= TOUCH_RELEVANCE_MS ? t - last : null;
}

function freshCounts(): Record<CountKey, EventCount> {
  const empty = () => ({ n: 0, first: null, last: null });
  return { scrollMain: empty(), scrollDoc: empty(), scrollOther: empty(), touchstart: empty(), touchmove: empty() };
}

function countEvent(key: CountKey, t: number): void {
  const count = clickWindow?.counts[key];
  if (!count) return;
  count.n += 1;
  count.first ??= t;
  count.last = t;
}

function emitSegment(segment: ScrollSegment): void {
  logDebugLine(formatSegment(segment, sinceTouchMove(segment.start)), segment.start);
}

function trackMain(win: ClickWindow, t: number, main: MainMetrics): void {
  const changed = Math.abs(main.st - win.prev.st) >= 1;
  const cause = changed
    ? classifyScrollChange(
        {
          t,
          previousT: win.prevT,
          from: win.prev.st,
          to: main.st,
          heightBefore: win.prev.sh,
          heightAfter: main.sh,
          clientHeight: main.ch,
        },
        scrollDebugState.mainWrites,
      )
    : null;
  if (win.frame <= FIRST_FRAMES) {
    const delta = cause ? ` Δ${r(win.prev.st)}→${r(main.st)} ${formatCause(cause, sinceTouchMove(t))}` : '';
    logDebugLine(`F${win.frame} st=${r(main.st)} sh=${r(main.sh)}${delta}`, t);
    return;
  }
  if (cause) {
    const merged = mergeScrollChange(win.segment, { t, from: win.prev.st, to: main.st, cause, height: main.sh });
    if (merged.closed) emitSegment(merged.closed);
    win.segment = merged.open;
  } else if (win.segment && isSegmentStale(win.segment, t)) {
    emitSegment(win.segment);
    win.segment = null;
  }
}

/** Dokument sa v dashboarde scrollovať nemá – každá zmena je nález. */
function trackDocument(win: ClickWindow, t: number, doc: DocMetrics): void {
  const lines: string[] = [];
  if (Math.abs(doc.wy - win.prev.wy) >= 1) {
    const cause = classifyScrollChange(
      {
        t,
        previousT: win.prevT,
        from: win.prev.wy,
        to: doc.wy,
        heightBefore: win.prev.wsh,
        heightAfter: doc.wsh,
        clientHeight: window.innerHeight,
      },
      scrollDebugState.windowWrites,
    );
    lines.push(`WIN scrollY ${r(win.prev.wy)}→${r(doc.wy)} ${formatCause(cause, sinceTouchMove(t))}`);
  }
  if (Math.abs(doc.docSt - win.prev.docSt) >= 1 && Math.abs(doc.docSt - doc.wy) >= 1) {
    lines.push(`DOC scrollingElement.scrollTop ${r(win.prev.docSt)}→${r(doc.docSt)}`);
  }
  for (const line of lines) {
    win.windowLines += 1;
    if (win.windowLines <= MAX_WINDOW_LINES_PER_CLICK) logDebugLine(line, t);
  }
}

function logSample(win: ClickWindow, t: number, main: MainMetrics, doc: DocMetrics): void {
  const card = document.querySelector('.highlight-offer-card');
  const cardText = card ? `1@${r(card.getBoundingClientRect().top)}` : '0';
  logDebugLine(
    `S${SAMPLE_AT_MS[win.samples] / 1000} st=${r(main.st)} sh=${r(main.sh)} wy=${r(doc.wy)} ` +
      `vv=${viewportText()} zvýr=${cardText}`,
    t,
  );
}

function formatCount(label: string, count: EventCount, at: number): string {
  if (!count.n || count.first === null || count.last === null) return `${label}×0`;
  return `${label}×${count.n}(+${r(count.first - at)}..+${r(count.last - at)})`;
}

function finishWindow(t: number): void {
  const win = clickWindow;
  if (!win) return;
  clickWindow = null;
  if (frameId) cancelAnimationFrame(frameId);
  frameId = 0;
  if (win.segment) emitSegment(win.segment);
  const { counts } = win;
  const extraWindowLines = win.windowLines - MAX_WINDOW_LINES_PER_CLICK;
  logDebugLine(
    [
      `END C${win.n}`,
      formatCount('scroll(main)', counts.scrollMain, win.at),
      formatCount('scroll(doc)', counts.scrollDoc, win.at),
      formatCount('scroll(iné)', counts.scrollOther, win.at),
      formatCount('touchstart', counts.touchstart, win.at),
      formatCount('touchmove', counts.touchmove, win.at),
      `replace=×${scrollDebugState.sameUrlReplaces}`,
      `net-opak×${win.netRepeats}`,
      `net-iné×${win.netOther}`,
      extraWindowLines > 0 ? `WIN/DOC +${extraWindowLines} ďalších` : '',
    ]
      .filter(Boolean)
      .join(' '),
    t,
  );
  holdScrollDebugOutput(false);
}

function onFrame(): void {
  frameId = 0;
  const win = clickWindow;
  if (!win) return;
  const t = debugNow();
  const main = readMain();
  const doc = readDocument();
  win.frame += 1;
  trackMain(win, t, main);
  trackDocument(win, t, doc);
  while (win.samples < SAMPLE_AT_MS.length && t - win.at >= SAMPLE_AT_MS[win.samples]) {
    logSample(win, t, main, doc);
    win.samples += 1;
  }
  win.prev = { ...main, ...doc };
  win.prevT = t;
  if (t - win.at >= CLICK_WINDOW_MS) {
    finishWindow(t);
    return;
  }
  frameId = requestAnimationFrame(onFrame);
}

function onClick(event: Event): void {
  if (isInDebugPanel(event.target)) return;
  const t = debugNow();
  finishWindow(t);
  const n = startDebugClick(t);
  const main = readMain();
  const doc = readDocument();
  logDebugLine(
    `CLICK ${describeTarget(event.target)} st=${r(main.st)} sh=${r(main.sh)} ch=${r(main.ch)} ` +
      `wy=${r(doc.wy)} vv=${viewportText()}`,
    t,
  );
  clickWindow = {
    n,
    at: t,
    frame: 0,
    prevT: t,
    prev: { ...main, ...doc },
    samples: 0,
    segment: null,
    counts: freshCounts(),
    otherScrollers: new Set(),
    windowLines: 0,
    netOther: 0,
    netRepeats: 0,
  };
  scrollDebugState.sameUrlReplaces = 0;
  markerLines.clear();
  netSeen.clear();
  holdScrollDebugOutput(true);
  frameId = requestAnimationFrame(onFrame);
}

function onTouchStart(event: Event): void {
  if (isInDebugPanel(event.target)) return;
  countEvent('touchstart', debugNow());
}

function onTouchMove(event: Event): void {
  if (isInDebugPanel(event.target)) return;
  const t = debugNow();
  scrollDebugState.lastTouchMoveAt = t;
  countEvent('touchmove', t);
}

function onScroll(event: Event): void {
  const win = clickWindow;
  if (!win) return;
  const t = debugNow();
  const { target } = event;
  if (target instanceof Element && target.hasAttribute('data-dashboard-main')) {
    countEvent('scrollMain', t);
    return;
  }
  if (target === document || target === window) {
    countEvent('scrollDoc', t);
    return;
  }
  countEvent('scrollOther', t);
  if (!target || win.otherScrollers.has(target) || win.otherScrollers.size >= MAX_OTHER_SCROLLERS_LOGGED) return;
  win.otherScrollers.add(target);
  logDebugLine(`SCROLL-EV ${describeTarget(target)} st=${target instanceof Element ? r(target.scrollTop) : '?'}`, t);
}

function onPopState(): void {
  logDebugLine(`URL pop ${summarizeUrl(window.location.href)}`);
}

function onViewport(event: Event): void {
  const key = viewportText();
  if (key === viewportKey) return;
  viewportKey = key;
  logDebugLine(`VV ${event.type} h/top=${key}`);
}

function onVisibility(): void {
  logDebugLine(`VIS ${document.visibilityState}`);
  if (document.visibilityState === 'hidden') flushScrollDebugLog();
}

function onPageShow(event: Event): void {
  logDebugLine(`PAGESHOW persisted=${(event as PageTransitionEvent).persisted ? 1 : 0}`);
}

function onPageHide(event: Event): void {
  logDebugLine(`PAGEHIDE persisted=${(event as PageTransitionEvent).persisted ? 1 : 0}`);
  flushScrollDebugLog();
}

function listen(target: EventTarget | null | undefined, type: string, handler: (event: Event) => void, capture = false): void {
  if (!target) return;
  const options: AddEventListenerOptions = { passive: true, capture };
  target.addEventListener(type, handler, options);
  cleanups.push(() => target.removeEventListener(type, handler, options));
}

/**
 * NET: len záznamy, ktoré začali v okne posledného kliku. API volania
 * s časom konca; ďalšie ID tej istej podoby (napr. 13 miniatúr Nástenky)
 * a ne-API zdroje len počtom v súhrne END. To isté volanie dvakrát (dva
 * GET profile/<id>) sa zapíše dvakrát.
 */
function observeResources(): void {
  if (typeof PerformanceObserver === 'undefined') return;
  try {
    const observer = new PerformanceObserver((list) => {
      const { at } = currentDebugClick();
      if (at === null) return;
      for (const entry of list.getEntries()) {
        if (entry.startTime < at || entry.startTime > at + CLICK_WINDOW_MS) continue;
        let path = '?';
        try {
          path = new URL(entry.name).pathname;
        } catch {
          // neplatná adresa – ostane '?'
        }
        const shape = path.replace(/\/\d+(?=\/|$)/g, '/#');
        const firstOfShape = netSeen.get(shape);
        if (path.startsWith('/api/') && firstOfShape !== undefined && firstOfShape !== path) {
          if (clickWindow) clickWindow.netRepeats += 1;
        } else if (path.startsWith('/api/')) {
          netSeen.set(shape, path);
          logDebugLine(`NET ${path} ${r(entry.duration)}ms → +${r(entry.startTime + entry.duration - at)}`, entry.startTime);
        } else if (clickWindow) {
          clickWindow.netOther += 1;
        }
      }
    });
    observer.observe({ type: 'resource', buffered: false });
    cleanups.push(() => observer.disconnect());
  } catch {
    // Resource Timing nepodporovaný – NET chýba, zvyšok beží.
  }
}

/** Značky DOM: každé objavenie (+) a zmiznutie (−), najviac 6 na značku a klik. */
function observeMarkers(): void {
  if (typeof MutationObserver === 'undefined') return;
  markerState = domMarkerPresence();
  const observer = new MutationObserver(() => {
    const next = domMarkerPresence();
    for (const marker of DOM_MARKERS) {
      if (Boolean(markerState[marker.key]) === next[marker.key]) continue;
      const count = markerLines.get(marker.key) ?? 0;
      if (count >= MAX_MARKER_LINES_PER_CLICK) continue;
      markerLines.set(marker.key, count + 1);
      logDebugLine(`DOM ${next[marker.key] ? '+' : '−'}${marker.key}`);
    }
    markerState = next;
  });
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['class'],
  });
  cleanups.push(() => observer.disconnect());
}

/** Hlavička každého štartu stránky. */
export function logPageStart(): void {
  logDebugRaw(`— štart stránky — ${new Date().toISOString()} ${summarizeUrl(window.location.href)}`);
  let environment = 'ENV ?';
  try {
    environment = environmentLine();
  } catch {
    // štýly nedostupné – hlavička aspoň so štartom
  }
  logDebugRaw(environment);
}

export function installClickTracking(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  viewportKey = viewportText();
  listen(document, 'click', onClick, true);
  listen(document, 'touchstart', onTouchStart, true);
  listen(document, 'touchmove', onTouchMove, true);
  listen(document, 'scroll', onScroll, true);
  listen(window, 'popstate', onPopState);
  listen(window.visualViewport, 'resize', onViewport);
  listen(window.visualViewport, 'scroll', onViewport);
  listen(document, 'visibilitychange', onVisibility);
  listen(window, 'pageshow', onPageShow);
  listen(window, 'pagehide', onPageHide);
  observeResources();
  observeMarkers();
}

export function uninstallClickTracking(): void {
  installed = false;
  clickWindow = null;
  if (frameId) cancelAnimationFrame(frameId);
  frameId = 0;
  holdScrollDebugOutput(false);
  markerLines.clear();
  while (cleanups.length) cleanups.pop()?.();
}
