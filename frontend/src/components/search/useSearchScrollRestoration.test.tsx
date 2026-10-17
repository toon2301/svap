import { act, fireEvent, render } from '@testing-library/react';
import { useRef } from 'react';
import { setCurrentAccountId } from '@/lib/currentAccount';
import { readSearchScroll, rememberSearchScroll } from './searchScrollMemory';
import { SEARCH_SCROLL_RESTORE_TIMEOUT_MS, useSearchScrollRestoration } from './useSearchScrollRestoration';
import { SearchResultSkeleton } from './SearchResultSkeleton';

function Harness({ viewer = 105, loading = false, usersLoading = false }: { viewer?: number | null; loading?: boolean; usersLoading?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  useSearchScrollRestoration(ref, viewer);
  return <main ref={ref} data-search-scroll-root>
    {loading ? <SearchResultSkeleton /> : <section data-search-loading={usersLoading || undefined}>Real results</section>}
  </main>;
}

function prepare(top = 1200) {
  const outgoing = document.createElement('main');
  outgoing.setAttribute('data-search-scroll-root', '');
  outgoing.scrollTop = top;
  document.body.append(outgoing);
  rememberSearchScroll();
  outgoing.remove();
}

function dimensions(main: HTMLElement, height = 3000) {
  Object.defineProperty(main, 'clientHeight', { configurable: true, value: 600 });
  Object.defineProperty(main, 'scrollHeight', { configurable: true, value: height });
}

const frames = (ms = 80) => act(() => { jest.advanceTimersByTime(ms); });

beforeEach(() => {
  jest.useFakeTimers();
  sessionStorage.clear();
  setCurrentAccountId(105);
  window.history.replaceState(null, '', '/search?q=mo&tab=offers');
  window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
});

afterEach(() => { setCurrentAccountId(null); jest.useRealTimers(); jest.restoreAllMocks(); });

it('restores the nested main only, leaving window scroll and foreign history state untouched', () => {
  prepare();
  const state = window.history.state;
  const windowScroll = jest.spyOn(window, 'scrollTo');
  const view = render(<Harness />);
  const main = view.container.querySelector('main')!;
  dimensions(main);
  frames();
  expect(main.scrollTop).toBe(1200);
  expect(windowScroll).not.toHaveBeenCalled();
  expect(window.history.state).toEqual(state);
  expect(jest.getTimerCount()).toBe(0);
});

it('does not consume a tall skeleton; restores after delayed real results arrive', async () => {
  prepare();
  const view = render(<Harness loading />);
  const main = view.container.querySelector('main')!;
  dimensions(main, 7000);
  frames(900);
  expect(main.scrollTop).toBe(0);
  expect(readSearchScroll(105)?.top).toBe(1200);
  view.rerender(<Harness />);
  dimensions(main, 4000);
  await act(async () => {});
  frames();
  expect(main.scrollTop).toBe(1200);
});

it('waits for the users loading marker even with a tall surrounding offers list', async () => {
  prepare();
  const view = render(<Harness usersLoading />);
  const main = view.container.querySelector('main')!;
  dimensions(main, 7000);
  frames();
  expect(main.scrollTop).toBe(0);
  view.rerender(<Harness />);
  await act(async () => {});
  frames();
  expect(main.scrollTop).toBe(1200);
});

it('waits for late content/image layout growth instead of prematurely clamping', () => {
  prepare();
  const view = render(<Harness />);
  const main = view.container.querySelector('main')!;
  dimensions(main, 800);
  frames(500);
  expect(main.scrollTop).toBe(0);
  dimensions(main, 3000);
  fireEvent.load(main);
  frames();
  expect(main.scrollTop).toBe(1200);
});

it.each([600, 850])('clamps once when the settled list shrank or failed (height=%s)', (height) => {
  prepare();
  const view = render(<Harness />);
  const main = view.container.querySelector('main')!;
  dimensions(main, height);
  frames(SEARCH_SCROLL_RESTORE_TIMEOUT_MS + 80);
  expect(main.scrollTop).toBe(height - 600);
  expect(jest.getTimerCount()).toBe(0);
});

it('waits without polling past the deadline when an actual request is slow', async () => {
  prepare();
  const view = render(<Harness loading />);
  const main = view.container.querySelector('main')!;
  dimensions(main);
  frames(SEARCH_SCROLL_RESTORE_TIMEOUT_MS);
  expect(main.scrollTop).toBe(0);
  expect(readSearchScroll(105)?.top).toBe(1200);
  frames(16000);
  expect(jest.getTimerCount()).toBe(0);
  view.rerender(<Harness />);
  await act(async () => {});
  frames();
  expect(main.scrollTop).toBe(1200);
});

it.each(['touchstart', 'wheel', 'keydown', 'mousedown'])('respects user %s while results are pending', (event) => {
  prepare();
  const view = render(<Harness loading />);
  const main = view.container.querySelector('main')!;
  dimensions(main);
  fireEvent(main, new Event(event, { bubbles: true }));
  expect(readSearchScroll(105)).toBeNull();
  view.rerender(<Harness />);
  frames();
  expect(main.scrollTop).toBe(0);
  expect(jest.getTimerCount()).toBe(0);
});

it('does not cancel because an unrelated search-panel input was used', () => {
  prepare();
  const view = render(<Harness loading />);
  const input = document.createElement('input');
  document.body.append(input);
  fireEvent.keyDown(input, { key: 'Shift' });
  const main = view.container.querySelector('main')!;
  dimensions(main);
  view.rerender(<Harness />);
  frames();
  expect(main.scrollTop).toBe(1200);
  input.remove();
});

it('waits for authentication without destroying the pending owner snapshot', () => {
  prepare();
  const view = render(<Harness viewer={null} />);
  const main = view.container.querySelector('main')!;
  dimensions(main);
  frames();
  expect(main.scrollTop).toBe(0);
  view.rerender(<Harness viewer={105} />);
  frames();
  expect(main.scrollTop).toBe(1200);
});

it('does not move results for a different account and cleans up a pending old account', () => {
  prepare();
  const view = render(<Harness loading />);
  const main = view.container.querySelector('main')!;
  dimensions(main);
  view.rerender(<Harness viewer={106} />);
  frames(SEARCH_SCROLL_RESTORE_TIMEOUT_MS);
  expect(main.scrollTop).toBe(0);
  expect(jest.getTimerCount()).toBe(0);
});

it('preserves a pending attempt across unmount and allows repeated history returns', () => {
  prepare();
  const first = render(<Harness loading />);
  first.unmount();
  expect(jest.getTimerCount()).toBe(0);
  const second = render(<Harness />);
  const main = second.container.querySelector('main')!;
  dimensions(main);
  frames();
  expect(main.scrollTop).toBe(1200);
  second.unmount();
  const third = render(<Harness />);
  const next = third.container.querySelector('main')!;
  dimensions(next);
  frames();
  expect(next.scrollTop).toBe(1200);
});

it('stops on a subsequent popstate and never moves the destination page', () => {
  prepare();
  const view = render(<Harness loading />);
  const main = view.container.querySelector('main')!;
  dimensions(main);
  window.history.replaceState(null, '', '/search?q=other');
  window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
  view.rerender(<Harness />);
  frames();
  expect(main.scrollTop).toBe(0);
  expect(jest.getTimerCount()).toBe(0);
});

it('stops if a router replacement changes full URL without popstate', () => {
  prepare();
  const view = render(<Harness loading />);
  const main = view.container.querySelector('main')!;
  dimensions(main);
  window.history.replaceState(window.history.state, '', '/search?q=other');
  frames();
  expect(jest.getTimerCount()).toBe(0);
});

it('is passive without a saved search entry', () => {
  const view = render(<Harness />);
  const main = view.container.querySelector('main')!;
  dimensions(main);
  frames();
  expect(main.scrollTop).toBe(0);
  expect(jest.getTimerCount()).toBe(0);
});
