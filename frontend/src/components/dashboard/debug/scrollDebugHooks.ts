'use client';

/**
 * [DEBUG ?debugscroll=1 – DOČASNÉ, ODSTRÁNIŤ]
 *
 * Hooky scroll API a history pre ladiaci pásik. Úplne priehľadné: pôvodná
 * funkcia sa volá s tým istým `this` a argumentmi, jej výsledok sa vráti
 * a výnimka z nej prejde ďalej. Chyba v zázname sa pohltí.
 *
 * Zaznamenáva sa len scroller `<main data-dashboard-main>` a dokument
 * (window / document.scrollingElement); scrollIntoView aj pre prvok vnútri
 * `<main>`. Iné prvky idú rovno do pôvodnej funkcie, bez jediného čítania.
 *
 * Bez príznaku sa `installScrollHooks` nevolá – prototypy ostanú nedotknuté.
 * `scrollDebugTag` / `scrollDebugFreshEntry` volá appka; bez príznaku nič nerobia.
 */

import { estimateIntoViewTarget } from './scrollDebugCause';
import { describeTarget, findDashboardMain, formatDomMarkers, summarizeUrl } from './scrollDebugDom';
import { debugNow, logDebugLine } from './scrollDebugLog';
import { rememberWrite, scrollDebugState } from './scrollDebugState';

type AnyFunction = (this: unknown, ...args: unknown[]) => unknown;
type ScrollerKind = 'main' | 'window';
type ScrollerMetrics = { st: number; sh: number; ch: number };
type EntryTarget = { id?: number | null; slug?: string | null };

const HOOKED = Symbol.for('svaply.debugscroll.hooked');
/** Značka patrí zápisu v tom istom synchrónnom bloku. */
const TAG_MAX_AGE_MS = 50;

const restorers: Array<() => void> = [];
/** Wrappery staršej inštalácie (ak ich niekto obalil a nedali sa vrátiť) už nič nezapisujú. */
let token = { live: false };
let pendingTag: { label: string; t: number } | null = null;

function markHooked<T extends object>(fn: T): T {
  Object.defineProperty(fn, HOOKED, { value: true });
  return fn;
}

function isHooked(fn: unknown): boolean {
  return typeof fn === 'function' && Boolean((fn as unknown as Record<symbol, unknown>)[HOOKED]);
}

function safely<T>(read: () => T): T | null {
  try {
    return read();
  } catch {
    return null;
  }
}

const round = (value: number) => Math.round(value);

/**
 * Krátke miesto volania: súbor (chunk bez hashu) a riadok:stĺpec rámca
 * `skip` – rámec 0 je samotný wrapper, v ktorom vznikol Error.
 */
export function parseCallSite(stack: string | undefined, skip: number): string {
  if (!stack) return '?';
  const frames = stack
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /:\d+:\d+\)?$/.test(line));
  const match = frames[skip]?.match(/([^/\\\s(@]+):(\d+):(\d+)\)?$/);
  if (!match) return '?';
  const file = match[1]
    .replace(/\?.*$/, '')
    .replace(/\.js$/, '')
    .replace(/-[0-9a-f]{8,}$/i, '');
  return `${file}:${match[2]}:${match[3]}`;
}

/** Appka: ďalší sledovaný zápis dostane túto značku (napr. "fresh-entry reset"). */
export function scrollDebugTag(label: string): void {
  if (!scrollDebugState.active) return;
  pendingTag = { label, t: debugNow() };
}

function takeTag(): string {
  const tag = pendingTag;
  pendingTag = null;
  return tag && debugNow() - tag.t <= TAG_MAX_AGE_MS ? ` [${tag.label}]` : '';
}

function formatEntry(target: EntryTarget | null): string {
  return target ? `${target.id ?? '-'}/${target.slug ?? '-'}` : 'žiadny';
}

/**
 * Appka: výsledok `takeProfileFreshEntry`. `isSame` je jej vlastné porovnanie
 * (čisté čítanie cache) – bez príznaku sa nezavolá.
 */
export function scrollDebugFreshEntry(
  target: EntryTarget | null,
  profile: EntryTarget,
  isSame: (a: EntryTarget, b: EntryTarget) => boolean,
): void {
  if (!scrollDebugState.active) return;
  safely(() => {
    const result = target !== null && isSame(target, profile);
    logDebugLine(
      `FRESH ${result} cieľ=${formatEntry(target)} profil=${formatEntry(profile)} ` +
        `dom:${formatDomMarkers()} url=${summarizeUrl(window.location.href)}`,
    );
  });
}

function scrollerKind(element: unknown): ScrollerKind | null {
  if (!(element instanceof Element)) return null;
  if (element.hasAttribute('data-dashboard-main')) return 'main';
  if (element === document.scrollingElement) return 'window';
  return null;
}

function readElement(element: Element): ScrollerMetrics {
  return { st: element.scrollTop, sh: element.scrollHeight, ch: element.clientHeight };
}

function readWindow(): ScrollerMetrics {
  const root = document.scrollingElement ?? document.documentElement;
  return { st: window.scrollY, sh: root.scrollHeight, ch: window.innerHeight };
}

/** 'auto' / bez behavior sa riadi CSS scroll-behavior scrollera. */
function isSmooth(behavior: unknown, styleSource: Element): boolean {
  if (behavior === 'smooth') return true;
  if (behavior !== undefined && behavior !== 'auto') return false;
  return window.getComputedStyle(styleSource).scrollBehavior === 'smooth';
}

function clampToScroller(value: number, metrics: ScrollerMetrics): number {
  return Math.min(Math.max(round(value), 0), Math.max(0, metrics.sh - metrics.ch));
}

function parseScrollArgs(args: unknown[]): { top: number | null; behavior: unknown } {
  const [first, second] = args;
  if (first !== null && typeof first === 'object') {
    const options = first as ScrollToOptions;
    return { top: typeof options.top === 'number' ? options.top : null, behavior: options.behavior };
  }
  return { top: typeof second === 'number' ? second : null, behavior: undefined };
}

function parseIntoViewArg(arg: unknown): { block: string; behavior: unknown } {
  if (arg === false) return { block: 'end', behavior: undefined };
  if (arg !== null && typeof arg === 'object') {
    const options = arg as ScrollIntoViewOptions;
    return { block: options.block ?? 'start', behavior: options.behavior };
  }
  return { block: 'start', behavior: undefined };
}

function recordWrite(
  kind: ScrollerKind,
  label: string,
  t: number,
  pre: ScrollerMetrics,
  write: { smooth: boolean; after: number | null; target: number | null; scroller: object | null },
  stack: string | undefined,
): void {
  rememberWrite(kind === 'main' ? scrollDebugState.mainWrites : scrollDebugState.windowWrites, {
    t,
    smooth: write.smooth,
    before: pre.st,
    after: write.after,
    target: write.target,
    scroller: write.scroller,
  });
  logDebugLine(
    `${label}${write.smooth ? ' smooth' : ''} pred=${round(pre.st)}` +
      `${write.after === null ? '' : ` po=${round(write.after)}`} sh=${round(pre.sh)}` +
      `${write.target === null ? '' : ` cieľ≈${write.target}`} @${parseCallSite(stack, 1)}${takeTag()}`,
    t,
  );
}

function hookScrollTopSetter(live: { live: boolean }): void {
  const proto = Element.prototype;
  const original = Object.getOwnPropertyDescriptor(proto, 'scrollTop');
  const originalSet = original?.set;
  if (!original || !originalSet || isHooked(originalSet)) return;

  const set = markHooked(function (this: Element, value: number) {
    const kind = live.live && scrollDebugState.active ? scrollerKind(this) : null;
    if (!kind) {
      originalSet.call(this, value);
      return;
    }
    const stack = new Error().stack;
    const t = debugNow();
    const pre = safely(() => readElement(this));
    originalSet.call(this, value);
    safely(() => {
      if (!pre) return;
      const smooth = isSmooth(undefined, this);
      recordWrite(
        kind,
        `SET ${kind}.scrollTop=${round(Number(value))}`,
        t,
        pre,
        {
          smooth,
          after: smooth ? null : this.scrollTop,
          target: smooth ? clampToScroller(Number(value), pre) : null,
          scroller: this,
        },
        stack,
      );
    });
  });

  Object.defineProperty(proto, 'scrollTop', { ...original, set });
  restorers.push(() => {
    if (Object.getOwnPropertyDescriptor(proto, 'scrollTop')?.set === set) {
      Object.defineProperty(proto, 'scrollTop', original);
    }
  });
}

function hookMethod(owner: object, name: string, makeWrapper: (original: AnyFunction) => AnyFunction): void {
  const record = owner as Record<string, unknown>;
  const original = record[name];
  if (typeof original !== 'function' || isHooked(original)) return;
  const wrapper = markHooked(makeWrapper(original as AnyFunction));
  record[name] = wrapper;
  restorers.push(() => {
    if (record[name] === wrapper) record[name] = original;
  });
}

function elementScrollWrapper(original: AnyFunction, name: string, live: { live: boolean }): AnyFunction {
  return function (this: unknown, ...args: unknown[]) {
    const kind = live.live && scrollDebugState.active ? scrollerKind(this) : null;
    if (!kind) return original.apply(this, args);
    const element = this as Element;
    const stack = new Error().stack;
    const t = debugNow();
    const pre = safely(() => readElement(element));
    const result = original.apply(this, args);
    safely(() => {
      if (!pre) return;
      const { top, behavior } = parseScrollArgs(args);
      const smooth = isSmooth(behavior, element);
      const wanted = top === null ? null : clampToScroller(name === 'scrollBy' ? pre.st + top : top, pre);
      recordWrite(
        kind,
        `${kind}.${name}(top=${top === null ? '?' : round(top)})`,
        t,
        pre,
        { smooth, after: smooth ? null : element.scrollTop, target: smooth ? wanted : null, scroller: element },
        stack,
      );
    });
    return result;
  };
}

function windowScrollWrapper(original: AnyFunction, name: string, live: { live: boolean }): AnyFunction {
  return function (this: unknown, ...args: unknown[]) {
    if (!live.live || !scrollDebugState.active) return original.apply(this, args);
    const stack = new Error().stack;
    const t = debugNow();
    const pre = safely(readWindow);
    const result = original.apply(this, args);
    safely(() => {
      if (!pre) return;
      const { top, behavior } = parseScrollArgs(args);
      const smooth = isSmooth(behavior, document.documentElement);
      const wanted = top === null ? null : clampToScroller(name === 'scrollBy' ? pre.st + top : top, pre);
      recordWrite(
        'window',
        `window.${name}(top=${top === null ? '?' : round(top)})`,
        t,
        pre,
        { smooth, after: smooth ? null : window.scrollY, target: smooth ? wanted : null, scroller: null },
        stack,
      );
    });
    return result;
  };
}

/** Stav pred scrollIntoView: pozícia `<main>`, voľby a odhad cieľa. */
function readIntoView(element: Element, main: HTMLElement, arg: unknown) {
  const { block, behavior } = parseIntoViewArg(arg);
  const pre = readElement(main);
  const elementRect = element.getBoundingClientRect();
  const target = estimateIntoViewTarget({
    scrollTop: pre.st,
    maxScroll: pre.sh - pre.ch,
    boxTop: main.getBoundingClientRect().top + main.clientTop,
    boxHeight: pre.ch,
    elTop: elementRect.top,
    elHeight: elementRect.height,
    block,
  });
  return { block, behavior, pre, target, smooth: isSmooth(behavior, main), windowBefore: window.scrollY };
}

function recordIntoView(
  element: Element,
  main: HTMLElement,
  info: ReturnType<typeof readIntoView>,
  t: number,
  stack: string | undefined,
): void {
  // scrollIntoView posúva všetkých predkov – aj dokument.
  rememberWrite(scrollDebugState.windowWrites, {
    t,
    smooth: info.smooth,
    before: info.windowBefore,
    after: info.smooth ? null : window.scrollY,
    target: null,
  });
  recordWrite(
    'main',
    `INTOVIEW ${describeTarget(element)} (${String(info.behavior ?? 'auto')}/${info.block})`,
    t,
    info.pre,
    { smooth: info.smooth, after: info.smooth ? null : main.scrollTop, target: info.target, scroller: main },
    stack,
  );
}

function intoViewWrapper(original: AnyFunction, live: { live: boolean }): AnyFunction {
  return function (this: unknown, ...args: unknown[]) {
    const main = live.live && scrollDebugState.active ? findDashboardMain() : null;
    if (!main || !(this instanceof Element) || !main.contains(this)) return original.apply(this, args);
    const stack = new Error().stack;
    const t = debugNow();
    const info = safely(() => readIntoView(this as Element, main, args[0]));
    const result = original.apply(this, args);
    safely(() => info && recordIntoView(this as Element, main, info, t, stack));
    return result;
  };
}

function historyWrapper(original: AnyFunction, name: 'pushState' | 'replaceState', live: { live: boolean }): AnyFunction {
  return function (this: unknown, ...args: unknown[]) {
    if (!live.live || !scrollDebugState.active) return original.apply(this, args);
    const before = safely(() => summarizeUrl(window.location.href));
    const result = original.apply(this, args);
    safely(() => {
      const after = summarizeUrl(window.location.href);
      if (name === 'pushState') logDebugLine(`URL push ${after}`);
      else if (after !== before) logDebugLine(`URL replace ${after}`);
      else scrollDebugState.sameUrlReplaces += 1;
    });
    return result;
  };
}

/** Idempotentné: už obalená funkcia sa druhýkrát neobalí. */
export function installScrollHooks(): void {
  if (typeof window === 'undefined' || token.live) return;
  const live = { live: true };
  token = live;
  hookScrollTopSetter(live);
  for (const name of ['scrollTo', 'scroll', 'scrollBy']) {
    hookMethod(Element.prototype, name, (original) => elementScrollWrapper(original, name, live));
  }
  hookMethod(Element.prototype, 'scrollIntoView', (original) => intoViewWrapper(original, live));
  for (const name of ['scrollTo', 'scrollBy']) {
    hookMethod(window, name, (original) => windowScrollWrapper(original, name, live));
  }
  for (const name of ['pushState', 'replaceState'] as const) {
    hookMethod(window.history, name, (original) => historyWrapper(original, name, live));
  }
}

/** Vráti pôvodné funkcie všade, kde ich medzitým nikto neobalil. */
export function uninstallScrollHooks(): void {
  token.live = false;
  while (restorers.length) restorers.pop()?.();
  pendingTag = null;
}
