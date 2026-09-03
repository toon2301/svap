'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createOfferWatch,
  deleteOfferWatch,
  listOfferWatches,
  normalizeOfferWatchApiError,
  OfferWatchApiError,
  updateOfferWatch,
} from './offerWatchApi';
import type {
  OfferWatch,
  OfferWatchActionResult,
  OfferWatchInput,
} from './types';

type MutationState =
  | { kind: 'create' }
  | { kind: 'update' | 'delete'; watchId: number }
  | null;

export type UseOfferWatchesResult = {
  watches: OfferWatch[];
  isLoading: boolean;
  mutation: MutationState;
  error: OfferWatchApiError | null;
  reload: () => Promise<OfferWatchActionResult<OfferWatch[]>>;
  createWatch: (
    input: OfferWatchInput,
  ) => Promise<OfferWatchActionResult<OfferWatch>>;
  updateWatch: (
    watchId: number,
    input: OfferWatchInput,
  ) => Promise<OfferWatchActionResult<OfferWatch>>;
  deleteWatch: (watchId: number) => Promise<OfferWatchActionResult<void>>;
  clearError: () => void;
};

export function useOfferWatches(): UseOfferWatchesResult {
  const [watches, setWatches] = useState<OfferWatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mutation, setMutation] = useState<MutationState>(null);
  const [error, setError] = useState<OfferWatchApiError | null>(null);
  const mountedRef = useRef(false);
  const loadSequenceRef = useRef(0);
  const loadAbortRef = useRef<AbortController | null>(null);
  const mutationAbortRef = useRef<AbortController | null>(null);
  const mutationRef = useRef<MutationState>(null);

  const reload = useCallback(async (): Promise<OfferWatchActionResult<OfferWatch[]>> => {
    loadAbortRef.current?.abort();
    const controller = new AbortController();
    const sequence = ++loadSequenceRef.current;
    loadAbortRef.current = controller;
    if (mountedRef.current) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const loaded = await listOfferWatches(controller.signal);
      if (mountedRef.current && sequence === loadSequenceRef.current) {
        setWatches(loaded);
        setIsLoading(false);
      }
      return { ok: true, value: loaded };
    } catch (caught) {
      const normalized = normalizeOfferWatchApiError(caught);
      if (
        mountedRef.current
        && sequence === loadSequenceRef.current
        && normalized.kind !== 'cancelled'
      ) {
        setError(normalized);
        setIsLoading(false);
      }
      return { ok: false, error: normalized };
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void reload();
    return () => {
      mountedRef.current = false;
      loadAbortRef.current?.abort();
      mutationAbortRef.current?.abort();
    };
  }, [reload]);

  const runMutation = useCallback(async <T,>(
    state: Exclude<MutationState, null>,
    request: (signal: AbortSignal) => Promise<T>,
    applyResult: (value: T) => void,
  ): Promise<OfferWatchActionResult<T>> => {
    if (mutationRef.current) {
      return { ok: false, error: new OfferWatchApiError('busy') };
    }

    loadAbortRef.current?.abort();
    loadSequenceRef.current += 1;
    const controller = new AbortController();
    mutationAbortRef.current = controller;
    mutationRef.current = state;
    if (mountedRef.current) {
      setMutation(state);
      setError(null);
      setIsLoading(false);
    }

    try {
      const value = await request(controller.signal);
      if (mountedRef.current) applyResult(value);
      return { ok: true, value };
    } catch (caught) {
      const normalized = normalizeOfferWatchApiError(caught);
      if (mountedRef.current && normalized.kind !== 'cancelled') {
        setError(normalized);
      }
      return { ok: false, error: normalized };
    } finally {
      if (mutationAbortRef.current === controller) {
        mutationAbortRef.current = null;
      }
      mutationRef.current = null;
      if (mountedRef.current) setMutation(null);
    }
  }, []);

  const createWatch = useCallback(
    (input: OfferWatchInput) => runMutation(
      { kind: 'create' },
      (signal) => createOfferWatch(input, signal),
      (created) => {
        setWatches((current) => [
          created,
          ...current.filter((watch) => watch.id !== created.id),
        ]);
      },
    ),
    [runMutation],
  );

  const updateWatch = useCallback(
    (watchId: number, input: OfferWatchInput) => runMutation(
      { kind: 'update', watchId },
      (signal) => updateOfferWatch(watchId, input, signal),
      (updated) => {
        setWatches((current) => current.map((watch) => (
          watch.id === updated.id ? updated : watch
        )));
      },
    ),
    [runMutation],
  );

  const deleteWatch = useCallback(
    (watchId: number) => runMutation(
      { kind: 'delete', watchId },
      (signal) => deleteOfferWatch(watchId, signal),
      () => {
        setWatches((current) => current.filter((watch) => watch.id !== watchId));
      },
    ),
    [runMutation],
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    watches,
    isLoading,
    mutation,
    error,
    reload,
    createWatch,
    updateWatch,
    deleteWatch,
    clearError,
  };
}

