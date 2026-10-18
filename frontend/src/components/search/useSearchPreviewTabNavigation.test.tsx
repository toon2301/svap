import { StrictMode, type ReactNode } from 'react';
import { act, render, renderHook } from '@testing-library/react';
import { useSearchPreviewTabNavigation } from './useSearchPreviewTabNavigation';

type Target = 'users' | 'offers';
type Updates = Record<string, string | null | undefined>;

/** Mount the real nested scroll container without mocking window scrolling or browser dimensions. */
function renderScroller(top = 870) {
  const view = render(<main data-search-scroll-root><p>Search results</p></main>);
  const main = view.container.querySelector('main')!;
  main.scrollTop = top;
  return { ...view, main };
}

/** Render the hook with a controllable committed Next query and its real source history location. */
function renderNavigation(query = 'q=monitorovanie&tab=all', replace = jest.fn<void, [Updates]>()) {
  window.history.replaceState({ __NA: true, tree: ['search'] }, '', `/search?${query}`);
  const hook = renderHook((currentQuery: string) => useSearchPreviewTabNavigation(currentQuery, replace), {
    initialProps: query,
  });
  /** Commit history before the React query update, matching the order of a real router transition. */
  const commit = (nextQuery: string) => {
    window.history.replaceState(window.history.state, '', `/search?${nextQuery}`);
    hook.rerender(nextQuery);
  };
  return { ...hook, replace, commit };
}

beforeEach(() => {
  jest.clearAllMocks();
  window.history.replaceState(null, '', '/search?q=monitorovanie&tab=all');
});

afterEach(() => {
  jest.restoreAllMocks();
  window.history.replaceState(null, '', '/');
});

describe('explicit preview navigation resets only the committed destination', () => {
  it.each<Target>(['users', 'offers'])('does not reset on initial %s mount or ordinary query updates', (target) => {
    const { main } = renderScroller();
    const nav = renderNavigation(`q=monitorovanie&tab=${target}`);
    expect(main.scrollTop).toBe(870);
    nav.commit('q=other&tab=all');
    nav.commit('q=other&tab=users&users_page=2');
    nav.commit('q=other&tab=offers&page=3');
    expect(main.scrollTop).toBe(870);
    expect(nav.replace).not.toHaveBeenCalled();
  });

  it.each([
    {
      target: 'users' as const,
      updates: { tab: 'users', users_page: null },
      destination: 'q=logo+%26+test&tab=users&page=3&sort=price_desc&price_min=5&onlyMyLocation=1',
    },
    {
      target: 'offers' as const,
      updates: { tab: 'offers', page: '1' },
      destination: 'q=logo+%26+test&tab=offers&users_page=4&page=1&sort=price_desc&price_min=5&onlyMyLocation=1',
    },
  ])('preserves the exact $target update contract and waits for its committed query', ({ target, updates, destination }) => {
    const { main } = renderScroller();
    const source = 'q=logo+%26+test&tab=all&users_page=4&page=3&sort=price_desc&price_min=5&onlyMyLocation=1';
    const nav = renderNavigation(source);
    const originalHistory = window.history.state;
    const scrollWindow = jest.spyOn(window, 'scrollTo');
    act(() => nav.result.current(target));
    expect(nav.replace).toHaveBeenCalledTimes(1);
    expect(nav.replace).toHaveBeenCalledWith(updates);
    expect(main.scrollTop).toBe(870);
    nav.commit(source);
    expect(main.scrollTop).toBe(870);
    nav.commit(destination);
    expect(main.scrollTop).toBe(0);
    expect(scrollWindow).not.toHaveBeenCalled();
    expect(window.history.state).toEqual(originalHistory);

    // Data arriving or a same-query rerender must not move a user who subsequently scrolled.
    main.scrollTop = 420;
    nav.commit(destination);
    expect(main.scrollTop).toBe(420);
  });

  it.each<Target>(['users', 'offers'])('works with an empty serialized query without adding unrelated parameters (%s)', (target) => {
    const { main } = renderScroller();
    const nav = renderNavigation('');
    act(() => nav.result.current(target));
    nav.commit(target === 'users' ? 'tab=users' : 'tab=offers&page=1');
    expect(main.scrollTop).toBe(0);
  });

  it.each([
    ['users', 'q=monitorovanie&tab=users'],
    ['offers', 'q=monitorovanie&tab=offers&page=1'],
  ] as const)('does not navigate or reset a no-op %s target', (target, query) => {
    const { main } = renderScroller();
    const nav = renderNavigation(query);
    act(() => nav.result.current(target));
    expect(nav.replace).not.toHaveBeenCalled();
    expect(main.scrollTop).toBe(870);
  });

  it('does not retain a consumed intent when another direct tab change returns to the same target', () => {
    const { main } = renderScroller();
    const nav = renderNavigation();
    act(() => nav.result.current('users'));
    nav.commit('q=monitorovanie&tab=users');
    expect(main.scrollTop).toBe(0);
    main.scrollTop = 600;
    nav.commit('q=monitorovanie&tab=all');
    nav.commit('q=monitorovanie&tab=users');
    expect(main.scrollTop).toBe(600);
  });
});

describe('preview intentions cannot leak into a different navigation', () => {
  it('abandons an intent on a foreign query rather than resetting a later coincidental target', () => {
    const { main } = renderScroller();
    const nav = renderNavigation();
    act(() => nav.result.current('offers'));
    nav.commit('q=different&tab=offers&page=1');
    expect(main.scrollTop).toBe(870);
    nav.commit('q=monitorovanie&tab=offers&page=1');
    expect(main.scrollTop).toBe(870);
  });

  it('cancels on popstate before a same-query history return can consume the intent', () => {
    const { main } = renderScroller();
    const nav = renderNavigation();
    act(() => nav.result.current('users'));
    act(() => window.dispatchEvent(new PopStateEvent('popstate', { state: { __NA: true } })));
    nav.commit('q=monitorovanie&tab=users');
    expect(main.scrollTop).toBe(870);
    nav.commit('q=monitorovanie&tab=all');
    nav.commit('q=monitorovanie&tab=users');
    expect(main.scrollTop).toBe(870);
  });

  it('clears a failed navigation before rethrowing the original router error', () => {
    const { main } = renderScroller();
    const failure = new Error('Router rejected transition');
    const replace = jest.fn<void, [Updates]>(() => { throw failure; });
    const nav = renderNavigation(undefined, replace);
    expect(() => act(() => nav.result.current('users'))).toThrow(failure);
    expect(main.scrollTop).toBe(870);
    nav.commit('q=monitorovanie&tab=users');
    expect(main.scrollTop).toBe(870);
  });

  it('consumes the target safely if the results main is absent', () => {
    const nav = renderNavigation();
    act(() => nav.result.current('users'));
    expect(() => nav.commit('q=monitorovanie&tab=users')).not.toThrow();
    const { main } = renderScroller();
    nav.commit('q=monitorovanie&tab=users');
    expect(main.scrollTop).toBe(870);
  });

  it('does not carry a pending intention across unmount or leave popstate listeners behind', () => {
    const add = jest.spyOn(window, 'addEventListener');
    const remove = jest.spyOn(window, 'removeEventListener');
    const { main } = renderScroller();
    const nav = renderNavigation();
    act(() => nav.result.current('users'));
    const listeners = add.mock.calls.filter(([name]) => name === 'popstate');
    expect(listeners.length).toBeGreaterThan(0);
    nav.unmount();
    for (const [name, handler] of listeners) expect(remove).toHaveBeenCalledWith(name, handler);
    renderNavigation('q=monitorovanie&tab=users');
    expect(main.scrollTop).toBe(870);
  });

  it.each([
    { first: 'users' as const, latest: 'offers' as const, intermediate: 'q=monitorovanie&tab=users', final: 'q=monitorovanie&tab=offers&page=1' },
    { first: 'offers' as const, latest: 'users' as const, intermediate: 'q=monitorovanie&tab=offers&page=1', final: 'q=monitorovanie&tab=users' },
  ])('only the latest $latest target resets after an older $first commit', ({ first, latest, intermediate, final }) => {
    const { main } = renderScroller();
    const nav = renderNavigation();
    act(() => {
      nav.result.current(first);
      nav.result.current(latest);
    });
    nav.commit(intermediate);
    expect(main.scrollTop).toBe(870);
    nav.commit(final);
    expect(main.scrollTop).toBe(0);
    expect(nav.replace).toHaveBeenCalledTimes(2);
  });

  it('lets a foreign commit cancel even a rapid alternate-target sequence', () => {
    const { main } = renderScroller();
    const nav = renderNavigation();
    act(() => {
      nav.result.current('users');
      nav.result.current('offers');
    });
    nav.commit('q=monitorovanie&tab=users&users_page=2');
    nav.commit('q=monitorovanie&tab=offers&page=1');
    expect(main.scrollTop).toBe(870);
  });

  it('supports a new explicit action after the previous transition committed', () => {
    const { main } = renderScroller();
    const nav = renderNavigation();
    act(() => nav.result.current('users'));
    nav.commit('q=monitorovanie&tab=users');
    main.scrollTop = 460;
    act(() => nav.result.current('offers'));
    expect(main.scrollTop).toBe(460);
    nav.commit('q=monitorovanie&tab=offers&page=1');
    expect(main.scrollTop).toBe(0);
  });

  it('survives StrictMode effect cleanup without resetting an ordinary destination mount', () => {
    const { main } = renderScroller();
    const replace = jest.fn<void, [Updates]>();
    const hook = renderHook((query: string) => useSearchPreviewTabNavigation(query, replace), {
      initialProps: 'q=monitorovanie&tab=all',
      wrapper: ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>,
    });
    expect(main.scrollTop).toBe(870);
    act(() => hook.result.current('offers'));
    window.history.replaceState(null, '', '/search?q=monitorovanie&tab=offers&page=1');
    hook.rerender('q=monitorovanie&tab=offers&page=1');
    expect(main.scrollTop).toBe(0);
  });
});
