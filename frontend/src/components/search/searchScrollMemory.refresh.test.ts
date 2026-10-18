import { setCurrentAccountId } from '@/lib/currentAccount';
import {
  forgetSearchScroll, prepareSearchScrollRefresh, readSearchScroll, refreshSearchScroll,
  rememberSearchScroll, SEARCH_SCROLL_STORAGE_KEY, SEARCH_SCROLL_TTL_MS,
} from './searchScrollMemory';

let main: HTMLElement;
let id: string;

beforeEach(() => {
  sessionStorage.clear();
  setCurrentAccountId(105);
  window.history.replaceState({ __NA: true, tree: ['source'] }, '', '/search?q=frame&tab=offers');
  main = document.createElement('main');
  main.setAttribute('data-search-scroll-root', '');
  main.scrollTop = 1200;
  document.body.append(main);
  id = rememberSearchScroll()!;
});

afterEach(() => { main.remove(); setCurrentAccountId(null); jest.restoreAllMocks(); });

it('prepares without reading or writing storage, then commits only the captured position once', () => {
  const read = jest.spyOn(Storage.prototype, 'getItem');
  const write = jest.spyOn(Storage.prototype, 'setItem');
  const commit = prepareSearchScrollRefresh(id, 310.4)!;
  expect(commit).toEqual(expect.any(Function));
  expect(read).not.toHaveBeenCalled();
  expect(write).not.toHaveBeenCalled();
  main.scrollTop = 900;
  commit();
  expect(write).toHaveBeenCalledTimes(1);
  expect(readSearchScroll(105)?.top).toBe(310);
  refreshSearchScroll(id, 780);
  commit();
  expect(readSearchScroll(105)?.top).toBe(780);
});

it('can flush the authorized source after immediate navigation without touching destination history', () => {
  const sourceState = window.history.state;
  const sourceUrl = window.location.href;
  const commit = prepareSearchScrollRefresh(id, 310)!;
  const destinationState = { __NA: true, tree: ['destination'] };
  window.history.pushState(destinationState, '', '/dashboard/favorites');
  main.scrollTop = 0;
  const replace = jest.spyOn(window.history, 'replaceState');
  commit();
  expect(window.history.state).toEqual(destinationState);
  expect(replace).not.toHaveBeenCalled();
  window.history.replaceState(sourceState, '', sourceUrl);
  expect(readSearchScroll(105)?.top).toBe(310);
});

it('never overwrites a newer capture when finishing an older prepared source update', () => {
  const commit = prepareSearchScrollRefresh(id, 310)!;
  main.scrollTop = 740;
  const newer = rememberSearchScroll();
  commit();
  expect(readSearchScroll(105)).toMatchObject({ id: newer, top: 740 });
});

it.each([null, 106])('discards a prepared update if the current viewer changes to %s', (viewer) => {
  const commit = prepareSearchScrollRefresh(id, 310)!;
  setCurrentAccountId(viewer);
  const write = jest.spyOn(Storage.prototype, 'setItem');
  commit();
  expect(write).not.toHaveBeenCalled();
  setCurrentAccountId(105);
  commit();
  expect(readSearchScroll(105)?.top).toBe(1200);
});

it('does not revive forgotten or expired records when committing an already prepared update', () => {
  const forgotten = prepareSearchScrollRefresh(id, 310)!;
  forgetSearchScroll(id);
  forgotten();
  expect(readSearchScroll(105)).toBeNull();
  id = rememberSearchScroll()!;
  const expired = prepareSearchScrollRefresh(id, 410)!;
  const now = Date.now();
  jest.spyOn(Date, 'now').mockReturnValue(now + SEARCH_SCROLL_TTL_MS + 1);
  expired();
  expect(readSearchScroll(105)).toBeNull();
});

it.each(['url', 'viewerId'])('requires the original %s to match the stored source record at commit time', (field) => {
  const commit = prepareSearchScrollRefresh(id, 310)!;
  const saved = readSearchScroll(105)!;
  sessionStorage.setItem(SEARCH_SCROLL_STORAGE_KEY, JSON.stringify([
    { ...saved, [field]: field === 'url' ? '/search?q=other' : 106 },
  ]));
  const write = jest.spyOn(Storage.prototype, 'setItem');
  commit();
  expect(write).not.toHaveBeenCalled();
});

it('keeps the same-document fallback when storage becomes unavailable after preparation', () => {
  const commit = prepareSearchScrollRefresh(id, 310)!;
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
  expect(commit).not.toThrow();
  expect(readSearchScroll(105)?.top).toBe(310);
});
