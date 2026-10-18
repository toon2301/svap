import { useRef } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { setCurrentAccountId } from '@/lib/currentAccount';
import { openUserProfileFromSearch } from '@/components/dashboard/modules/profile/openUserProfileFromSearch';
import { rememberSearchScroll, SEARCH_SCROLL_STORAGE_KEY } from './searchScrollMemory';
import { useSearchScrollRestoration } from './useSearchScrollRestoration';
import { useSearchPreviewTabNavigation } from './useSearchPreviewTabNavigation';

const sourceQuery = 'q=preview&tab=all&sort=newest';
const replace = jest.fn();

/** Combine both real hooks on the same nested scroller without mocking history memory. */
function Harness({ query = sourceQuery, loading = false }: { query?: string; loading?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  useSearchScrollRestoration(ref, 105);
  const showMore = useSearchPreviewTabNavigation(query, replace);
  return <main ref={ref} data-search-scroll-root>
    <section data-search-loading={loading || undefined}>Results</section>
    <button onClick={() => showMore('users')}>More people</button>
    <button onClick={() => showMore('offers')}>More offers</button>
  </main>;
}

/** Model the real browser's available scroll range, which jsdom cannot calculate. */
function setGeometry(main: HTMLElement): void {
  Object.defineProperties(main, {
    clientHeight: { configurable: true, value: 600 },
    scrollHeight: { configurable: true, value: 7000 },
  });
}

/** Capture an existing profile-return snapshot through the same function as real navigation. */
function captureSource(top: number): string {
  const main = document.createElement('main');
  main.setAttribute('data-search-scroll-root', '');
  main.scrollTop = top;
  document.body.append(main);
  const id = rememberSearchScroll()!;
  main.remove();
  return id;
}

/** Apply the actual replace payload only when the simulated router commits its destination. */
function commitDestination(): string {
  const params = new URLSearchParams(sourceQuery);
  const updates = replace.mock.calls.at(-1)![0] as Record<string, string | null>;
  for (const [key, value] of Object.entries(updates)) {
    if (value === null) params.delete(key);
    else params.set(key, value);
  }
  const query = params.toString();
  window.history.replaceState(window.history.state, '', `/search?${query}`);
  return query;
}

/** Read only the saved position relevant to this test's opaque history identifier. */
function storedTop(id: string): number | undefined {
  const entries = JSON.parse(sessionStorage.getItem(SEARCH_SCROLL_STORAGE_KEY) || '[]') as { id: string; top: number }[];
  return entries.find((entry) => entry.id === id)?.top;
}

beforeEach(() => {
  jest.useFakeTimers();
  replace.mockReset();
  setCurrentAccountId(105);
  sessionStorage.clear();
  window.history.replaceState({ __NA: true }, '', `/search?${sourceQuery}`);
  window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
});

afterEach(() => {
  setCurrentAccountId(null);
  jest.useRealTimers();
});

it.each(['people', 'offers'])('an accessible click to more %s cannot be overwritten by a pending source restoration', async (target) => {
  const id = captureSource(1362);
  const view = render(<Harness loading />);
  const main = view.container.querySelector('main')!;
  setGeometry(main);
  main.scrollTop = 700;
  act(() => { jest.advanceTimersByTime(100); });
  // Deliberately no mousedown/keydown: the restoration hook has not been abandoned by pointer input.
  fireEvent.click(screen.getByRole('button', { name: `More ${target}` }));
  expect(main.scrollTop).toBe(700);
  const query = commitDestination();
  view.rerender(<Harness query={query} loading />);
  expect(main.scrollTop).toBe(0);
  view.rerender(<Harness query={query} />);
  await act(async () => {});
  act(() => { jest.advanceTimersByTime(7000); });
  expect(main.scrollTop).toBe(0);
  expect(storedTop(id)).toBe(1362);
});

it.each(['people', 'offers'])('more %s preserves a tracked source position and later profile returns to the destination', async (target) => {
  const sourceId = captureSource(1362);
  const view = render(<Harness />);
  const main = view.container.querySelector('main')!;
  setGeometry(main);
  act(() => { jest.advanceTimersByTime(100); });
  expect(main.scrollTop).toBe(1362);
  main.scrollTop = 900;
  fireEvent.scroll(main);
  fireEvent.click(screen.getByRole('button', { name: `More ${target}` }));
  const query = commitDestination();
  view.rerender(<Harness query={query} />);
  expect(main.scrollTop).toBe(0);
  fireEvent.scroll(main);
  act(() => { jest.advanceTimersByTime(100); });
  expect(storedTop(sourceId)).toBe(900);

  main.scrollTop = 530;
  const sourceUrl = window.location.href;
  openUserProfileFromSearch({ push: (url) => window.history.pushState({ __NA: true }, '', url) }, 'owner');
  const entries = JSON.parse(sessionStorage.getItem(SEARCH_SCROLL_STORAGE_KEY)!);
  const destination = entries.find((entry: { url: string }) => entry.url === `/search?${query}`);
  expect(destination.top).toBe(530);
  view.unmount();
  const state = { __NA: true, __svaplySearchScroll: { version: 1, id: destination.id } };
  window.history.replaceState(state, '', sourceUrl);
  window.dispatchEvent(new PopStateEvent('popstate', { state }));
  const returned = render(<Harness query={query} />);
  const returnedMain = returned.container.querySelector('main')!;
  setGeometry(returnedMain);
  await act(async () => {});
  act(() => { jest.advanceTimersByTime(100); });
  expect(returnedMain.scrollTop).toBe(530);
});
