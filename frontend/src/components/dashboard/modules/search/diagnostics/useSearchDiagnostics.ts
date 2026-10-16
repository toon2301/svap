'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  createSearchDiagnosticSnapshot,
  type SearchDiagnosticInput,
  type SearchDiagnosticReporter,
  type SearchDiagnosticSnapshot,
} from './searchDiagnostics';

const useClientLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const ignoreUpdate: SearchDiagnosticReporter = () => {};

export interface SearchDiagnostics {
  enabled: boolean;
  snapshot: SearchDiagnosticSnapshot | null;
  setEnabled: (enabled: boolean) => void;
}

/** Keep manually enabled, sanitized evidence only for this mounted account/panel session. */
export function useSearchDiagnostics(userId: number | undefined, active: boolean) {
  const [enabled, setEnabledState] = useState(false);
  const [snapshot, setSnapshot] = useState<SearchDiagnosticSnapshot | null>(null);
  const session = useRef({ enabled: false, active: false, generation: 0, request: 0 });

  useClientLayoutEffect(() => {
    session.current.active = active;
    session.current.enabled = false;
    session.current.generation += 1;
    setEnabledState(false);
    setSnapshot(null);
    return () => {
      session.current.active = false;
      session.current.enabled = false;
      session.current.generation += 1;
    };
  }, [userId, active]);

  const setEnabled = useCallback((next: boolean) => {
    const isEnabled = next && session.current.active;
    session.current.enabled = isEnabled;
    session.current.generation += 1;
    setEnabledState(isEnabled);
    setSnapshot(null);
  }, []);

  // Stable identity is essential: toggling diagnostics must not restart the search debounce.
  const begin = useCallback((input: SearchDiagnosticInput): SearchDiagnosticReporter => {
    if (!session.current.enabled) return ignoreUpdate;
    const generation = session.current.generation;
    const request = ++session.current.request;
    let evidence: SearchDiagnosticSnapshot;
    try {
      evidence = createSearchDiagnosticSnapshot(input);
      setSnapshot(evidence);
    } catch {
      // Diagnostics must never prevent the real search from running.
      return ignoreUpdate;
    }
    return (update) => {
      if (!session.current.enabled || session.current.generation !== generation
        || session.current.request !== request) return;
      evidence = { ...evidence, ...update };
      setSnapshot(evidence);
    };
  }, []);

  return { enabled, snapshot, setEnabled, begin };
}
