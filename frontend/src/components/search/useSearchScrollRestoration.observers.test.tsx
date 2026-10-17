import { act, fireEvent, render } from '@testing-library/react';
import { useRef } from 'react';
import { setCurrentAccountId } from '@/lib/currentAccount';
import { rememberSearchScroll } from './searchScrollMemory';
import { useSearchScrollRestoration } from './useSearchScrollRestoration';

let observed: Element[];
let resized: () => void;
let disconnected: jest.Mock;
const originalResizeObserver = globalThis.ResizeObserver;

function Harness({ noMain = false, empty = false }: { noMain?: boolean; empty?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  useSearchScrollRestoration(ref, 105);
  return noMain ? null : <main ref={ref}>{empty ? null : <section>Results</section>}</main>;
}

beforeEach(() => {
  jest.useFakeTimers();
  observed = [];
  disconnected = jest.fn();
  globalThis.ResizeObserver = class {
    constructor(callback: ResizeObserverCallback) { resized = () => callback([], this); }
    observe(element: Element) { observed.push(element); }
    unobserve() {}
    disconnect() { disconnected(); }
  };
  setCurrentAccountId(105);
  sessionStorage.clear();
  window.history.replaceState(null, '', '/search?q=observer');
  window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
  const outgoing = document.createElement('main');
  outgoing.setAttribute('data-search-scroll-root', '');
  outgoing.scrollTop = 1200;
  document.body.append(outgoing);
  rememberSearchScroll();
  outgoing.remove();
});

afterEach(() => {
  globalThis.ResizeObserver = originalResizeObserver;
  setCurrentAccountId(null);
  jest.useRealTimers();
});

it('observes both fixed main and flowing content; resizing wakes restoration and disconnects', () => {
  const view = render(<Harness />);
  const main = view.container.querySelector('main')!;
  Object.defineProperty(main, 'clientHeight', { configurable: true, value: 600 });
  Object.defineProperty(main, 'scrollHeight', { configurable: true, value: 800 });
  act(() => { jest.advanceTimersByTime(80); });
  expect(observed).toEqual([main, main.firstElementChild]);
  Object.defineProperty(main, 'scrollHeight', { configurable: true, value: 4000 });
  act(() => { resized(); jest.advanceTimersByTime(80); });
  expect(main.scrollTop).toBe(1200);
  expect(disconnected).toHaveBeenCalledTimes(1);
  resized();
  fireEvent.load(main);
  fireEvent(window, new Event('resize'));
  expect(jest.getTimerCount()).toBe(0);
});

it('supports an empty main and removes size observers on user cancellation', () => {
  const view = render(<Harness empty />);
  const main = view.container.querySelector('main')!;
  expect(observed).toEqual([main]);
  fireEvent.wheel(main);
  expect(disconnected).toHaveBeenCalledTimes(1);
  expect(jest.getTimerCount()).toBe(0);
});

it('does nothing if the referenced main was not mounted', () => {
  render(<Harness noMain />);
  expect(observed).toEqual([]);
  expect(jest.getTimerCount()).toBe(0);
});

it('falls back to DOM/image/viewport events when ResizeObserver is unavailable', () => {
  Object.defineProperty(globalThis, 'ResizeObserver', { configurable: true, writable: true, value: undefined });
  const view = render(<Harness />);
  const main = view.container.querySelector('main')!;
  Object.defineProperty(main, 'clientHeight', { configurable: true, value: 600 });
  Object.defineProperty(main, 'scrollHeight', { configurable: true, value: 800 });
  act(() => { jest.advanceTimersByTime(80); });
  expect(main.scrollTop).toBe(0);
  Object.defineProperty(main, 'scrollHeight', { configurable: true, value: 4000 });
  fireEvent(window, new Event('resize'));
  act(() => { jest.advanceTimersByTime(80); });
  expect(main.scrollTop).toBe(1200);
  expect(jest.getTimerCount()).toBe(0);
});

it('ignores a previously queued frame callback after the user cancels', () => {
  let queued: FrameRequestCallback = () => {};
  jest.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { queued = callback; return 42; });
  const view = render(<Harness />);
  const main = view.container.querySelector('main')!;
  fireEvent.wheel(main);
  act(() => { queued(16); });
  expect(main.scrollTop).toBe(0);
  jest.restoreAllMocks();
});

it('stops when the referenced main disappears while the hook remains mounted', () => {
  const view = render(<Harness />);
  view.rerender(<Harness noMain />);
  act(() => { jest.advanceTimersByTime(80); });
  expect(disconnected).toHaveBeenCalledTimes(1);
  expect(jest.getTimerCount()).toBe(0);
});
