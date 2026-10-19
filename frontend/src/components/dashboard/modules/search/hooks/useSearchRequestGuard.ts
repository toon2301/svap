'use client';

import { useCallback, useLayoutEffect, useMemo, useRef, type MutableRefObject } from 'react';

export type SearchRequest = {
  key: string;
  controller: AbortController;
  promise: Promise<void> | null;
  generation: number;
};

type SearchRequestGuardOptions = {
  contextKey: string;
  isActive: boolean;
  controllerRef: MutableRefObject<AbortController | null>;
};

/** Authorize one request for the latest committed account/query/filter context before the next paint. */
export function useSearchRequestGuard({ contextKey, isActive, controllerRef }: SearchRequestGuardOptions) {
  const context = useRef({ key: contextKey, active: isActive, generation: 0 });
  const mounted = useRef(false);
  const pending = useRef<SearchRequest | null>(null);

  /** Detach ownership before abort listeners can observe or complete the old request. */
  const cancel = useCallback(() => {
    const request = pending.current;
    pending.current = null;
    if (!request) return;
    request.controller.abort();
    if (controllerRef.current === request.controller) controllerRef.current = null;
  }, [controllerRef]);

  /** A stale response may neither change the visible result nor write cache/history for a former context. */
  const isCurrent = useCallback((request: SearchRequest): boolean => (
    mounted.current && context.current.active && context.current.key === request.key
    && context.current.generation === request.generation && pending.current === request
    && !request.controller.signal.aborted
  ), []);

  useLayoutEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; cancel(); };
  }, [cancel]);

  useLayoutEffect(() => {
    // A speculative concurrent render may never commit. Keep its input out of shared refs
    // until this layout phase, then invalidate and abort the former request before paint.
    if (context.current.key !== contextKey || context.current.active !== isActive) {
      context.current = { key: contextKey, active: isActive, generation: context.current.generation + 1 };
    }
    const request = pending.current;
    if (request && !isCurrent(request)) cancel();
  }, [contextKey, isActive, isCurrent, cancel]);

  /** Start a fresh attempt; inactive or obsolete callbacks receive an already-aborted, unauthorized record. */
  const begin = useCallback((key: string): SearchRequest => {
    const request: SearchRequest = {
      key, controller: new AbortController(), promise: null, generation: context.current.generation,
    };
    if (!mounted.current || !context.current.active || key !== context.current.key) {
      request.controller.abort();
      return request;
    }
    cancel();
    pending.current = request;
    controllerRef.current = request.controller;
    return request;
  }, [cancel, controllerRef]);

  /** Share only the current context's pending work, never a completed or superseded promise. */
  const getPending = useCallback((key: string): Promise<void> | null => {
    const request = pending.current;
    return request && request.key === key && isCurrent(request) ? request.promise : null;
  }, [isCurrent]);

  /** Attach the exact operation callers should reuse while this attempt owns the request slot. */
  const attachPromise = useCallback((request: SearchRequest, promise: Promise<void>): void => {
    if (isCurrent(request)) request.promise = promise;
  }, [isCurrent]);

  /** A stale finally block must not detach a newer controller or pending operation. */
  const finish = useCallback((request: SearchRequest): void => {
    if (pending.current !== request) return;
    pending.current = null;
    if (controllerRef.current === request.controller) controllerRef.current = null;
  }, [controllerRef]);

  return useMemo(() => ({ begin, getPending, attachPromise, isCurrent, finish, cancel }),
    [begin, getPending, attachPromise, isCurrent, finish, cancel]);
}
