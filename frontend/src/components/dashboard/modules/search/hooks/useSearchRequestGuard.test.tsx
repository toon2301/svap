import { StrictMode, Suspense, startTransition, useLayoutEffect, useState, type ReactNode } from 'react';
import { act, render, renderHook, screen } from '@testing-library/react';
import { useSearchRequestGuard, type SearchRequest } from './useSearchRequestGuard';

const initial = JSON.stringify({ viewer: 1, query: 'tes', country: 'SK', type: 'offer', price: '' });

/** Exercise the real hook and its public controller reference with committed React context changes. */
function mountGuard(contextKey = initial, isActive = true) {
  const controllerRef: { current: AbortController | null } = { current: null };
  const view = renderHook((props: { contextKey: string; isActive: boolean }) => (
    useSearchRequestGuard({ ...props, controllerRef })
  ), { initialProps: { contextKey, isActive } });
  return { ...view, controllerRef };
}

/** Resolve old network work independently of abort support, as a raced response might still settle. */
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((finish) => { resolve = finish; });
  return { promise, resolve };
}

describe('search request ownership and duplicate work', () => {
  it('owns a new request and exposes only its exact pending promise', () => {
    const { result, controllerRef } = mountGuard();
    const guard = result.current;
    const request = guard.begin(initial);
    expect(request.key).toBe(initial);
    expect(request.promise).toBeNull();
    expect(guard.isCurrent(request)).toBe(true);
    expect(controllerRef.current).toBe(request.controller);
    expect(guard.getPending(initial)).toBeNull();
    const work = deferred();
    guard.attachPromise(request, work.promise);
    expect(guard.getPending(initial)).toBe(work.promise);
    expect(guard.getPending(initial)).toBe(work.promise);
    expect(guard.getPending('another-query')).toBeNull();
    expect(request.controller.signal.aborted).toBe(false);
  });

  it('a replacement aborts the previous attempt without lending it the new promise', () => {
    const { result, controllerRef } = mountGuard();
    const first = result.current.begin(initial);
    const firstWork = deferred();
    result.current.attachPromise(first, firstWork.promise);
    const latest = result.current.begin(initial);
    const latestWork = deferred();
    result.current.attachPromise(latest, latestWork.promise);
    expect(first.controller.signal.aborted).toBe(true);
    expect(result.current.isCurrent(first)).toBe(false);
    expect(result.current.isCurrent(latest)).toBe(true);
    expect(result.current.getPending(initial)).toBe(latestWork.promise);
    expect(controllerRef.current).toBe(latest.controller);
    result.current.attachPromise(first, latestWork.promise);
    expect(first.promise).toBe(firstWork.promise);
  });

  it('finish detaches completed work without aborting a successful controller', () => {
    const { result, controllerRef } = mountGuard();
    const request = result.current.begin(initial);
    const originalWork = Promise.resolve();
    result.current.attachPromise(request, originalWork);
    result.current.finish(request);
    expect(result.current.isCurrent(request)).toBe(false);
    expect(result.current.getPending(initial)).toBeNull();
    expect(controllerRef.current).toBeNull();
    expect(request.controller.signal.aborted).toBe(false);
    result.current.attachPromise(request, deferred().promise);
    expect(request.promise).toBe(originalWork);
  });

  it('a stale finally block cannot finish or clear the replacement request', () => {
    const { result, controllerRef } = mountGuard();
    const first = result.current.begin(initial);
    const latest = result.current.begin(initial);
    result.current.finish(first);
    expect(result.current.isCurrent(latest)).toBe(true);
    expect(controllerRef.current).toBe(latest.controller);
  });

  it('cancel removes authorization before synchronous abort listeners run', () => {
    const { result, controllerRef } = mountGuard();
    const request = result.current.begin(initial);
    const observed = jest.fn(() => result.current.isCurrent(request));
    request.controller.signal.addEventListener('abort', observed);
    result.current.cancel();
    expect(observed).toHaveReturnedWith(false);
    expect(request.controller.signal.aborted).toBe(true);
    expect(controllerRef.current).toBeNull();
    expect(result.current.getPending(initial)).toBeNull();
    expect(() => result.current.cancel()).not.toThrow();
  });

  it.each(['cancel', 'finish'] as const)('%s does not clear or abort a foreign reference', (action) => {
    const { result, controllerRef } = mountGuard();
    const request = result.current.begin(initial);
    const foreign = new AbortController();
    controllerRef.current = foreign;
    if (action === 'finish') result.current.finish(request);
    else result.current.cancel();
    expect(controllerRef.current).toBe(foreign);
    expect(foreign.signal.aborted).toBe(false);
    expect(request.controller.signal.aborted).toBe(action === 'cancel');
  });

  it('does not abort an unowned controller when there is no pending request', () => {
    const { result, controllerRef } = mountGuard();
    const foreign = new AbortController();
    controllerRef.current = foreign;
    result.current.cancel();
    expect(controllerRef.current).toBe(foreign);
    expect(foreign.signal.aborted).toBe(false);
  });

  it('external cancellation immediately invalidates a request and its reusable promise', () => {
    const { result } = mountGuard();
    const request = result.current.begin(initial);
    request.controller.abort();
    const work = deferred();
    result.current.attachPromise(request, work.promise);
    expect(request.promise).toBeNull();
    expect(result.current.isCurrent(request)).toBe(false);
    expect(result.current.getPending(initial)).toBeNull();
  });
});

describe('account/query/filter/country context and lifecycle isolation', () => {
  it.each([
    { viewer: 2 }, { query: 'monitorovanie' }, { country: 'CZ' }, { type: 'seeking' }, { price: '10' },
  ])('aborts and invalidates a former context when %j changes', (change) => {
    const { result, rerender, controllerRef } = mountGuard();
    const request = result.current.begin(initial);
    result.current.attachPromise(request, deferred().promise);
    const contextKey = JSON.stringify({ ...JSON.parse(initial), ...change });
    rerender({ contextKey, isActive: true });
    expect(request.controller.signal.aborted).toBe(true);
    expect(result.current.isCurrent(request)).toBe(false);
    expect(result.current.getPending(initial)).toBeNull();
    expect(controllerRef.current).toBeNull();
    const current = result.current.begin(contextKey);
    expect(result.current.isCurrent(current)).toBe(true);
    expect(current.generation).toBeGreaterThan(request.generation);
  });

  it('preserves committed authorization during render and invalidates it before the next paint', () => {
    const controllerRef: { current: AbortController | null } = { current: null };
    const observations: { authorized: boolean; aborted: boolean }[] = [];
    const commits: { authorized: boolean; aborted: boolean }[] = [];
    let request: SearchRequest | null = null;
    const view = renderHook((contextKey: string) => {
      const guard = useSearchRequestGuard({ contextKey, isActive: true, controllerRef });
      if (request) observations.push({ authorized: guard.isCurrent(request), aborted: request.controller.signal.aborted });
      useLayoutEffect(() => {
        if (request) commits.push({ authorized: guard.isCurrent(request), aborted: request.controller.signal.aborted });
      }, [contextKey, guard]);
      return guard;
    }, { initialProps: initial });
    request = view.result.current.begin(initial);
    view.rerender('different-context');
    expect(observations).toContainEqual({ authorized: true, aborted: false });
    expect(commits).toEqual([{ authorized: false, aborted: true }]);
    expect(request.controller.signal.aborted).toBe(true);
    expect(view.result.current.isCurrent(request)).toBe(false);
  });

  it('never reauthorizes the original request after A → B → A', () => {
    const { result, rerender } = mountGuard();
    const request = result.current.begin(initial);
    rerender({ contextKey: 'B', isActive: true });
    rerender({ contextKey: initial, isActive: true });
    expect(result.current.isCurrent(request)).toBe(false);
    const latest = result.current.begin(initial);
    expect(result.current.isCurrent(latest)).toBe(true);
    expect(latest.generation).toBeGreaterThan(request.generation);
  });

  it('an obsolete begin callback cannot cancel a valid current-context request', () => {
    const { result, rerender, controllerRef } = mountGuard();
    const begin = result.current.begin;
    rerender({ contextKey: 'B', isActive: true });
    const current = result.current.begin('B');
    const obsolete = begin(initial);
    expect(obsolete.controller.signal.aborted).toBe(true);
    expect(result.current.isCurrent(obsolete)).toBe(false);
    expect(result.current.isCurrent(current)).toBe(true);
    expect(current.controller.signal.aborted).toBe(false);
    expect(controllerRef.current).toBe(current.controller);
  });

  it('inactive panels cannot start authorized work, and reactivation never revives old work', () => {
    const { result, rerender, controllerRef } = mountGuard(initial, false);
    const inactive = result.current.begin(initial);
    expect(inactive.controller.signal.aborted).toBe(true);
    expect(result.current.isCurrent(inactive)).toBe(false);
    expect(controllerRef.current).toBeNull();
    rerender({ contextKey: initial, isActive: true });
    const request = result.current.begin(initial);
    rerender({ contextKey: initial, isActive: false });
    expect(request.controller.signal.aborted).toBe(true);
    rerender({ contextKey: initial, isActive: true });
    expect(result.current.isCurrent(request)).toBe(false);
    expect(result.current.isCurrent(result.current.begin(initial))).toBe(true);
  });

  it('retains stable callback/object identities and pending work across same-context rerenders', () => {
    const { result, rerender } = mountGuard();
    const guard = result.current;
    const request = guard.begin(initial);
    const work = deferred();
    guard.attachPromise(request, work.promise);
    rerender({ contextKey: initial, isActive: true });
    expect(result.current).toBe(guard);
    expect(result.current.getPending(initial)).toBe(work.promise);
    expect(result.current.isCurrent(request)).toBe(true);
    rerender({ contextKey: 'B', isActive: true });
    expect(result.current).toBe(guard);
  });

  it('unmount aborts work and permanently rejects callbacks retained by asynchronous callers', () => {
    const { result, unmount, controllerRef } = mountGuard();
    const guard = result.current;
    const request = guard.begin(initial);
    unmount();
    expect(request.controller.signal.aborted).toBe(true);
    expect(guard.isCurrent(request)).toBe(false);
    expect(controllerRef.current).toBeNull();
    const afterUnmount = guard.begin(initial);
    expect(afterUnmount.controller.signal.aborted).toBe(true);
    expect(guard.isCurrent(afterUnmount)).toBe(false);
    expect(controllerRef.current).toBeNull();
  });

  it('late response/finally callbacks cannot commit to or detach a replacement context', async () => {
    const { result, rerender, controllerRef } = mountGuard();
    const old = result.current.begin(initial);
    const work = deferred();
    const commit = jest.fn();
    const promise = work.promise.then(() => {
      if (result.current.isCurrent(old)) commit();
    }).finally(() => result.current.finish(old));
    result.current.attachPromise(old, promise);
    rerender({ contextKey: 'B', isActive: true });
    const current = result.current.begin('B');
    await act(async () => { work.resolve(); await promise; });
    expect(commit).not.toHaveBeenCalled();
    expect(controllerRef.current).toBe(current.controller);
    expect(result.current.isCurrent(current)).toBe(true);
  });

  it('supports StrictMode effect replay while cleaning up its owned request on unmount', () => {
    const controllerRef: { current: AbortController | null } = { current: null };
    const view = renderHook(() => useSearchRequestGuard({ contextKey: initial, isActive: true, controllerRef }), {
      wrapper: ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>,
    });
    const request = view.result.current.begin(initial);
    expect(view.result.current.isCurrent(request)).toBe(true);
    view.unmount();
    expect(request.controller.signal.aborted).toBe(true);
    expect(controllerRef.current).toBeNull();
  });

  it('keeps committed A authorized when a concurrent suspended B render is abandoned', async () => {
    const controllerRef: { current: AbortController | null } = { current: null };
    const commits = jest.fn();
    const never = new Promise<void>(() => undefined);
    let setContext!: (value: string) => void;
    let guard!: ReturnType<typeof useSearchRequestGuard>;
    let suspended = false;

    /** Suspend only the speculative target after the real guard has participated in that render. */
    function Panel({ contextKey }: { contextKey: string }) {
      guard = useSearchRequestGuard({ contextKey, isActive: true, controllerRef });
      useLayoutEffect(() => { commits(contextKey); }, [contextKey]);
      if (contextKey === 'B') { suspended = true; throw never; }
      return <output>{contextKey}</output>;
    }

    /** Retain the already-visible A screen while React attempts a lower-priority B transition. */
    function ConcurrentScreen() {
      const [contextKey, update] = useState('A');
      setContext = update;
      return <Suspense fallback={<p>Pending target</p>}><Panel contextKey={contextKey} /></Suspense>;
    }

    render(<ConcurrentScreen />);
    const request = guard.begin('A');
    const work = deferred();
    const finalize = jest.fn();
    const completed = work.promise.then(() => {
      if (guard.isCurrent(request)) { finalize(); guard.finish(request); }
    });
    guard.attachPromise(request, completed);
    act(() => { startTransition(() => setContext('B')); });
    expect(suspended).toBe(true);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.queryByText('Pending target')).not.toBeInTheDocument();
    expect(commits).toHaveBeenCalledTimes(1);
    expect(commits).toHaveBeenCalledWith('A');
    expect(request.controller.signal.aborted).toBe(false);

    act(() => setContext('A'));
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(commits).toHaveBeenCalledTimes(1);
    expect(request.controller.signal.aborted).toBe(false);
    expect(guard.isCurrent(request)).toBe(true);
    expect(guard.getPending('A')).toBe(completed);
    await act(async () => { work.resolve(); await completed; });
    expect(finalize).toHaveBeenCalledTimes(1);
    expect(guard.getPending('A')).toBeNull();
    expect(controllerRef.current).toBeNull();
  });
});
