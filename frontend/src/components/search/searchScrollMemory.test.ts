import { setCurrentAccountId } from '@/lib/currentAccount';
import {
  forgetSearchScroll, readSearchScroll, rememberSearchScroll,
  SEARCH_SCROLL_HISTORY_KEY, SEARCH_SCROLL_STORAGE_KEY, SEARCH_SCROLL_TTL_MS,
} from './searchScrollMemory';

let main: HTMLElement;

beforeEach(() => {
  sessionStorage.clear();
  setCurrentAccountId(105);
  window.history.replaceState({ __NA: true, tree: ['keep'] }, '', '/search?q=ma&tab=offers&page=2');
  main = document.createElement('main');
  main.setAttribute('data-search-scroll-root', '');
  main.scrollTop = 1278.4;
  document.body.append(main);
});

afterEach(() => {
  main.remove();
  setCurrentAccountId(null);
  jest.restoreAllMocks();
});

it('captures only bounded navigation metadata before leaving and preserves foreign history state', () => {
  rememberSearchScroll();
  expect(window.history.state).toMatchObject({ __NA: true, tree: ['keep'] });
  expect(window.history.state[SEARCH_SCROLL_HISTORY_KEY]).toMatchObject({ version: 1 });
  const saved = readSearchScroll(105)!;
  expect(saved).toMatchObject({ viewerId: 105, url: '/search?q=ma&tab=offers&page=2', top: 1278 });
  expect(Object.keys(saved).sort()).toEqual(['id', 'savedAt', 'top', 'url', 'viewerId']);
  expect(readSearchScroll(null)).toBeNull();
  expect(readSearchScroll(undefined)).toBeNull();
  expect(readSearchScroll(106)).toBeNull();
  expect(readSearchScroll(105)).toEqual(saved);
});

it.each([
  '/search?q=other&tab=offers&page=2', '/search?q=ma&tab=users&page=2',
  '/search?q=ma&tab=offers&page=3', '/search?q=ma&tab=offers&page=2&sort=price_asc',
  '/search?q=ma&tab=offers&page=2&type=offer', '/search?q=ma&tab=offers&page=2&price_min=3',
  '/search?q=ma&tab=offers&page=2#other', '/dashboard',
])('does not restore a different full URL: %s', (url) => {
  rememberSearchScroll();
  window.history.replaceState(window.history.state, '', url);
  expect(readSearchScroll(105)).toBeNull();
});

it('separates independently pushed entries even when both have the same URL', () => {
  rememberSearchScroll();
  const first = window.history.state;
  window.history.pushState(null, '', window.location.href);
  expect(readSearchScroll(105)).toBeNull();
  main.scrollTop = 222;
  rememberSearchScroll();
  expect(readSearchScroll(105)?.top).toBe(222);
  window.history.replaceState(first, '', window.location.href);
  expect(readSearchScroll(105)?.top).toBe(1278);
});

it('survives module reload using sessionStorage, not results or module-only snapshots', () => {
  rememberSearchScroll();
  let reloadRead: typeof readSearchScroll;
  jest.isolateModules(() => {
    reloadRead = require('./searchScrollMemory').readSearchScroll;
  });
  expect(reloadRead!(105)?.top).toBe(1278);
});

it('uses the carried popstate entry if the router overwrites history state', () => {
  rememberSearchScroll();
  const state = window.history.state;
  window.dispatchEvent(new PopStateEvent('popstate', { state }));
  window.history.replaceState({ __NA: true }, '', window.location.href);
  expect(readSearchScroll(105)?.top).toBe(1278);
  window.history.replaceState(null, '', '/dashboard');
  window.dispatchEvent(new PopStateEvent('popstate', { state }));
  expect(readSearchScroll(105)).toBeNull();
});

it('does not revive carried metadata after a subsequent history event without a marker', () => {
  rememberSearchScroll();
  window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
  window.history.replaceState(null, '', window.location.href);
  window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
  expect(readSearchScroll(105)).toBeNull();
});

it('adopts a carried marker once and never borrows it for a fresh entry with the same URL', () => {
  rememberSearchScroll();
  const state = window.history.state;
  window.dispatchEvent(new PopStateEvent('popstate', { state }));
  window.history.replaceState({ __NA: true, tree: ['retained'] }, '', window.location.href);
  expect(readSearchScroll(105)?.top).toBe(1278);
  expect(window.history.state).toMatchObject({ __NA: true, tree: ['retained'], [SEARCH_SCROLL_HISTORY_KEY]: state[SEARCH_SCROLL_HISTORY_KEY] });
  window.history.pushState({ __NA: true }, '', '/dashboard');
  window.history.pushState({ __NA: true }, '', '/search?q=ma&tab=offers&page=2');
  expect(readSearchScroll(105)).toBeNull();
});

it('forgets carried fallback after one read even if the browser refuses adoption', () => {
  rememberSearchScroll();
  window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
  window.history.replaceState({ __NA: true }, '', window.location.href);
  jest.spyOn(window.history, 'replaceState').mockImplementation(() => { throw new Error('blocked'); });
  expect(readSearchScroll(105)?.top).toBe(1278);
  expect(readSearchScroll(105)).toBeNull();
});

it('also clears carried metadata when Next preserves the original marker', () => {
  rememberSearchScroll();
  window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
  expect(readSearchScroll(105)?.top).toBe(1278);
  window.history.pushState({ __NA: true }, '', '/dashboard');
  window.history.pushState({ __NA: true }, '', '/search?q=ma&tab=offers&page=2');
  expect(readSearchScroll(105)).toBeNull();
});

it.each([true, false])('a different viewer consumes the handoff with the original marker preserved=%s', (preserved) => {
  rememberSearchScroll();
  const state = window.history.state;
  window.dispatchEvent(new PopStateEvent('popstate', { state }));
  if (!preserved) window.history.replaceState({ __NA: true }, '', window.location.href);
  expect(readSearchScroll(106)).toBeNull();
  window.history.pushState({ __NA: true }, '', '/dashboard');
  window.history.pushState({ __NA: true }, '', '/search?q=ma&tab=offers&page=2');
  expect(readSearchScroll(105)).toBeNull();
  window.history.replaceState(state, '', window.location.href);
  expect(readSearchScroll(105)?.top).toBe(1278);
});

it('keeps repeated captures distinct and bounds storage to ten entries', () => {
  for (let i = 0; i < 14; i += 1) { main.scrollTop = i; rememberSearchScroll(); }
  expect(JSON.parse(sessionStorage.getItem(SEARCH_SCROLL_STORAGE_KEY)!)).toHaveLength(10);
  expect(readSearchScroll(105)?.top).toBe(13);
});

it('preserves a newer capture when abandoning an older one', () => {
  rememberSearchScroll();
  const first = readSearchScroll(105)!;
  main.scrollTop = 300;
  rememberSearchScroll();
  forgetSearchScroll(first.id);
  expect(readSearchScroll(105)?.top).toBe(300);
  forgetSearchScroll(readSearchScroll(105)!.id);
  expect(readSearchScroll(105)).toBeNull();
});

it('rejects expired records and future timestamps', () => {
  const now = Date.now();
  rememberSearchScroll();
  jest.spyOn(Date, 'now').mockReturnValue(now + SEARCH_SCROLL_TTL_MS + 1);
  expect(readSearchScroll(105)).toBeNull();
  jest.mocked(Date.now).mockReturnValue(now - 1000);
  expect(readSearchScroll(105)).toBeNull();
});

it.each([null, [], 'broken', { version: 2, id: 'id' }, { version: 1, id: 13 }])('ignores malformed history markers: %p', (marker) => {
  window.history.replaceState({ [SEARCH_SCROLL_HISTORY_KEY]: marker }, '', window.location.href);
  window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
  expect(readSearchScroll(105)).toBeNull();
});

it.each(['{broken', '{}', '[null,2,"bad",{}]'])('ignores malformed storage: %s', (raw) => {
  sessionStorage.setItem(SEARCH_SCROLL_STORAGE_KEY, raw);
  window.history.replaceState({ [SEARCH_SCROLL_HISTORY_KEY]: { version: 1, id: 'not-saved' } }, '', window.location.href);
  expect(readSearchScroll(105)).toBeNull();
});

it.each([NaN, Infinity])('ignores invalid scroll offsets: %s', (top) => {
  main.scrollTop = top;
  rememberSearchScroll();
  window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
  expect(readSearchScroll(105)).toBeNull();
});

it('is passive without a current viewer or main, outside search, and for oversized URLs', () => {
  const replace = jest.spyOn(window.history, 'replaceState');
  setCurrentAccountId(null);
  rememberSearchScroll();
  setCurrentAccountId(105);
  main.removeAttribute('data-search-scroll-root');
  rememberSearchScroll();
  main.setAttribute('data-search-scroll-root', '');
  window.history.replaceState(null, '', '/dashboard');
  replace.mockClear();
  rememberSearchScroll();
  expect(replace).not.toHaveBeenCalled();
  window.history.replaceState(null, '', `/search?q=${'x'.repeat(4096)}`);
  replace.mockClear();
  rememberSearchScroll();
  expect(replace).not.toHaveBeenCalled();
});

it('does not break profile navigation if browser history rejects a marker', () => {
  jest.spyOn(window.history, 'replaceState').mockImplementation(() => { throw new Error('blocked'); });
  expect(rememberSearchScroll).not.toThrow();
});

it('keeps a same-document fallback if both storage reads and writes are blocked', () => {
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
  rememberSearchScroll();
  expect(readSearchScroll(105)?.top).toBe(1278);
  forgetSearchScroll(readSearchScroll(105)!.id);
  expect(readSearchScroll(105)).toBeNull();
});

it('abandonment remains effective if a later storage write is rejected', () => {
  rememberSearchScroll();
  const id = readSearchScroll(105)!.id;
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
  forgetSearchScroll(id);
  expect(readSearchScroll(105)).toBeNull();
});

it('does not revive older abandoned entries after repeated captures during a quota failure', () => {
  const states: unknown[] = [];
  for (let i = 0; i < 10; i += 1) {
    main.scrollTop = 400 + i;
    rememberSearchScroll();
    states.push(window.history.state);
  }
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
  for (const state of states) {
    window.history.replaceState(state, '', window.location.href);
    forgetSearchScroll(window.history.state[SEARCH_SCROLL_HISTORY_KEY].id);
  }
  for (let i = 0; i < 12; i += 1) {
    rememberSearchScroll();
    forgetSearchScroll(window.history.state[SEARCH_SCROLL_HISTORY_KEY].id);
  }
  for (const state of states) {
    window.history.replaceState(state, '', window.location.href);
    expect(readSearchScroll(105)).toBeNull();
  }
  jest.restoreAllMocks();
  main.scrollTop = 999;
  rememberSearchScroll();
  expect(readSearchScroll(105)?.top).toBe(999);
  expect(JSON.parse(sessionStorage.getItem(SEARCH_SCROLL_STORAGE_KEY)!)[0].top).toBe(999);
});
