import { act, fireEvent, render } from '@testing-library/react';
import { useRef } from 'react';
import { setCurrentAccountId } from '@/lib/currentAccount';
import {
  readSearchScroll, rememberSearchScroll, SEARCH_SCROLL_HISTORY_KEY, SEARCH_SCROLL_STORAGE_KEY,
} from './searchScrollMemory';
import { useSearchScrollRestoration } from './useSearchScrollRestoration';

function Harness({ viewer = 105, loading = false }: { viewer?: number; loading?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  useSearchScrollRestoration(ref, viewer);
  return <main ref={ref} data-search-scroll-root>
    <section data-search-loading={loading || undefined}>Results</section>
  </main>;
}

let nextFrameId: number;
let pendingFrames: Map<number, FrameRequestCallback>;
let allFrames: Map<number, FrameRequestCallback>;
let getItem: jest.SpyInstance;
let setItem: jest.SpyInstance;
let nativeGetItem: typeof Storage.prototype.getItem;

function runFrame() {
  act(() => {
    const callbacks = Array.from(pendingFrames.values());
    pendingFrames.clear();
    callbacks.forEach((callback) => callback(16));
  });
}

function storedTop(id: string): number | undefined {
  const raw = nativeGetItem.call(sessionStorage, SEARCH_SCROLL_STORAGE_KEY);
  const entries = JSON.parse(raw || '[]') as { id: string; top: number }[];
  return entries.find((entry) => entry.id === id)?.top;
}

function remember(top = 1200) {
  const outgoing = document.createElement('main');
  outgoing.setAttribute('data-search-scroll-root', '');
  outgoing.scrollTop = top;
  document.body.append(outgoing);
  rememberSearchScroll();
  outgoing.remove();
}

function mountRestored() {
  remember();
  const state = window.history.state;
  const url = window.location.href;
  const id = state[SEARCH_SCROLL_HISTORY_KEY].id as string;
  const view = render(<Harness />);
  const main = view.container.querySelector('main')!;
  Object.defineProperties(main, {
    clientHeight: { configurable: true, value: 600 },
    scrollHeight: { configurable: true, value: 4000 },
  });
  runFrame(); runFrame(); runFrame();
  expect(main.scrollTop).toBe(1200);
  getItem.mockClear();
  setItem.mockClear();
  return { ...view, main, state, url, id };
}

function scroll(main: HTMLElement, top: number) {
  main.scrollTop = top;
  fireEvent.scroll(main);
}

beforeEach(() => {
  jest.useFakeTimers();
  sessionStorage.clear();
  setCurrentAccountId(105);
  window.history.replaceState({ __NA: true }, '', '/search?q=frames&tab=offers');
  window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
  nextFrameId = 1;
  pendingFrames = new Map();
  allFrames = new Map();
  jest.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    const id = nextFrameId++;
    pendingFrames.set(id, callback);
    allFrames.set(id, callback);
    return id;
  });
  jest.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => { pendingFrames.delete(id); });
  nativeGetItem = Storage.prototype.getItem;
  getItem = jest.spyOn(Storage.prototype, 'getItem');
  setItem = jest.spyOn(Storage.prototype, 'setItem');
});

afterEach(() => {
  setCurrentAccountId(null);
  jest.restoreAllMocks();
  jest.useRealTimers();
});

it('coalesces a synchronous scroll burst into one storage read/write with the latest offset per frame', () => {
  const { main, id } = mountRestored();
  scroll(main, 320); scroll(main, 410); scroll(main, 510);
  expect(getItem).not.toHaveBeenCalled();
  expect(setItem).not.toHaveBeenCalled();
  expect(pendingFrames.size).toBe(1);
  runFrame();
  expect(getItem).toHaveBeenCalledTimes(1);
  expect(setItem).toHaveBeenCalledTimes(1);
  expect(storedTop(id)).toBe(510);
  getItem.mockClear(); setItem.mockClear();
  scroll(main, 650); scroll(main, 720);
  expect(setItem).not.toHaveBeenCalled();
  runFrame();
  expect(getItem).toHaveBeenCalledTimes(1);
  expect(setItem).toHaveBeenCalledTimes(1);
  expect(storedTop(id)).toBe(720);
});

it('flushes the last scroll during unmount without waiting for another animation frame', () => {
  const view = mountRestored();
  scroll(view.main, 310);
  expect(setItem).not.toHaveBeenCalled();
  view.unmount();
  expect(setItem).toHaveBeenCalledTimes(1);
  expect(storedTop(view.id)).toBe(310);
  expect(pendingFrames.size).toBe(0);
});

it('flushes an already authorized source scroll after navigation changes URL, without adding frames before push', () => {
  const view = mountRestored();
  scroll(view.main, 310);
  expect(setItem).not.toHaveBeenCalled();
  // This order is deliberate: Next changes location before the old layout's cleanup.
  window.history.pushState({ __NA: true }, '', '/dashboard/favorites');
  view.main.scrollTop = 0;
  view.unmount();
  expect(setItem).toHaveBeenCalledTimes(1);
  expect(storedTop(view.id)).toBe(310);
  expect(window.location.pathname).toBe('/dashboard/favorites');
  expect(window.history.state).toEqual({ __NA: true });

  window.history.replaceState(view.state, '', view.url);
  window.dispatchEvent(new PopStateEvent('popstate', { state: view.state }));
  const returned = render(<Harness />);
  const main = returned.container.querySelector('main')!;
  Object.defineProperties(main, { clientHeight: { value: 600 }, scrollHeight: { value: 4000 } });
  runFrame(); runFrame(); runFrame();
  expect(main.scrollTop).toBe(310);
});

it('a canceled frame callback cannot write again after cleanup flushed the source position', () => {
  const view = mountRestored();
  scroll(view.main, 310);
  const callback = Array.from(allFrames.values()).at(-1)!;
  view.unmount();
  expect(setItem).toHaveBeenCalledTimes(1);
  getItem.mockClear(); setItem.mockClear();
  act(() => { callback(32); });
  expect(getItem).not.toHaveBeenCalled();
  expect(setItem).not.toHaveBeenCalled();
  expect(storedTop(view.id)).toBe(310);
});

it('flushes the verified source position when URL changes before RAF without any popstate', () => {
  const view = mountRestored();
  scroll(view.main, 310);
  expect(getItem).not.toHaveBeenCalled();
  expect(setItem).not.toHaveBeenCalled();
  window.history.pushState({ __NA: true }, '', '/dashboard/favorites');
  view.main.scrollTop = 0;
  runFrame();
  expect(getItem).toHaveBeenCalledTimes(1);
  expect(setItem).toHaveBeenCalledTimes(1);
  expect(storedTop(view.id)).toBe(310);
  expect(window.history.state).toEqual({ __NA: true });
  expect(pendingFrames.size).toBe(0);
  view.unmount();
  expect(setItem).toHaveBeenCalledTimes(1);
});

it('a captured scroll-listener callback cannot queue or write anything after cleanup', () => {
  const add = jest.spyOn(HTMLElement.prototype, 'addEventListener');
  const view = mountRestored();
  const index = add.mock.calls.findIndex((call, i) => call[0] === 'scroll' && add.mock.contexts[i] === view.main);
  expect(index).toBeGreaterThanOrEqual(0);
  const listener = add.mock.calls[index][1] as EventListener;
  scroll(view.main, 310);
  view.unmount();
  expect(setItem).toHaveBeenCalledTimes(1);
  getItem.mockClear(); setItem.mockClear();
  view.main.scrollTop = 0;
  act(() => { listener.call(view.main, new Event('scroll')); });
  expect(getItem).not.toHaveBeenCalled();
  expect(setItem).not.toHaveBeenCalled();
  expect(pendingFrames.size).toBe(0);
  expect(storedTop(view.id)).toBe(310);
});

it('flushes the prepared source position on popstate, not the destination main offset', () => {
  const view = mountRestored();
  scroll(view.main, 310);
  expect(setItem).not.toHaveBeenCalled();
  window.history.pushState({ __NA: true }, '', '/dashboard/favorites');
  view.main.scrollTop = 0;
  window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
  expect(setItem).toHaveBeenCalledTimes(1);
  expect(storedTop(view.id)).toBe(310);
  expect(pendingFrames.size).toBe(0);
});

it('flushes on pagehide without RAF and keeps tracking alive after a bfcache-style pageshow', () => {
  const view = mountRestored();
  scroll(view.main, 310);
  const oldCallback = Array.from(allFrames.values()).at(-1)!;
  expect(getItem).not.toHaveBeenCalled();
  expect(setItem).not.toHaveBeenCalled();
  window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
  expect(getItem).toHaveBeenCalledTimes(1);
  expect(setItem).toHaveBeenCalledTimes(1);
  expect(storedTop(view.id)).toBe(310);
  expect(pendingFrames.size).toBe(0);
  getItem.mockClear(); setItem.mockClear();
  act(() => { oldCallback(32); });
  expect(getItem).not.toHaveBeenCalled();
  expect(setItem).not.toHaveBeenCalled();

  window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
  scroll(view.main, 510);
  expect(getItem).not.toHaveBeenCalled();
  expect(setItem).not.toHaveBeenCalled();
  runFrame();
  expect(getItem).toHaveBeenCalledTimes(1);
  expect(setItem).toHaveBeenCalledTimes(1);
  expect(storedTop(view.id)).toBe(510);
});

it('an old canceled pagehide frame cannot flush or cancel a newer post-pageshow frame', () => {
  const view = mountRestored();
  scroll(view.main, 310);
  const oldCallback = Array.from(allFrames.values()).at(-1)!;
  window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
  expect(storedTop(view.id)).toBe(310);
  getItem.mockClear(); setItem.mockClear();
  window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
  scroll(view.main, 510);
  const newFrameId = Array.from(pendingFrames.keys())[0];
  expect(pendingFrames.size).toBe(1);

  act(() => { oldCallback(32); });
  expect(getItem).not.toHaveBeenCalled();
  expect(setItem).not.toHaveBeenCalled();
  expect(storedTop(view.id)).toBe(310);
  expect(pendingFrames.has(newFrameId)).toBe(true);
  runFrame();
  expect(getItem).toHaveBeenCalledTimes(1);
  expect(setItem).toHaveBeenCalledTimes(1);
  expect(storedTop(view.id)).toBe(510);
  expect(pendingFrames.size).toBe(0);
});

it('supports animation frame ID zero and still cancels/flushes it during cleanup', () => {
  const view = mountRestored();
  nextFrameId = 0;
  scroll(view.main, 310);
  expect(pendingFrames.has(0)).toBe(true);
  view.unmount();
  expect(pendingFrames.has(0)).toBe(false);
  expect(storedTop(view.id)).toBe(310);
  getItem.mockClear(); setItem.mockClear();
  act(() => { allFrames.get(0)!(32); });
  expect(getItem).not.toHaveBeenCalled();
  expect(setItem).not.toHaveBeenCalled();
});

it('does not flush a queued old-owner write after the authenticated account changes', () => {
  const view = mountRestored();
  scroll(view.main, 310);
  setCurrentAccountId(106);
  view.rerender(<Harness viewer={106} />);
  runFrame();
  expect(setItem).not.toHaveBeenCalled();
  expect(storedTop(view.id)).toBe(1200);
});

it('does not overwrite a newer capture when an old tracker still has a pending frame', () => {
  const view = mountRestored();
  scroll(view.main, 310);
  view.main.scrollTop = 740;
  rememberSearchScroll();
  const newerId = window.history.state[SEARCH_SCROLL_HISTORY_KEY].id as string;
  getItem.mockClear(); setItem.mockClear();
  view.unmount();
  expect(storedTop(newerId)).toBe(740);
  expect(window.history.state[SEARCH_SCROLL_HISTORY_KEY].id).toBe(newerId);
  // A prepared update may target only its own old entry, never the new capture.
  expect(storedTop(view.id)).toBe(310);
});

it('does not write the empty loading main on an interrupted pending restoration', () => {
  remember();
  const id = window.history.state[SEARCH_SCROLL_HISTORY_KEY].id as string;
  const view = render(<Harness loading />);
  getItem.mockClear(); setItem.mockClear();
  window.history.pushState({ __NA: true }, '', '/dashboard/favorites');
  view.unmount();
  expect(getItem).not.toHaveBeenCalled();
  expect(setItem).not.toHaveBeenCalled();
  expect(storedTop(id)).toBe(1200);
});

it('preserves the latest queued position in the existing fallback when storage writes fail', () => {
  const view = mountRestored();
  setItem.mockImplementation(() => { throw new Error('quota'); });
  scroll(view.main, 320); scroll(view.main, 510);
  expect(setItem).not.toHaveBeenCalled();
  runFrame();
  expect(setItem).toHaveBeenCalledTimes(1);
  expect(readSearchScroll(105)?.top).toBe(510);
  view.unmount();
});
