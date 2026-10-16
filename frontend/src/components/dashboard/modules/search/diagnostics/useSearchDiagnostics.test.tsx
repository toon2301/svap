import { act, renderHook } from '@testing-library/react';
import * as evidence from './searchDiagnostics';
import type { SearchDiagnosticInput, SearchDiagnosticReporter } from './searchDiagnostics';
import { useSearchDiagnostics } from './useSearchDiagnostics';

jest.mock('./searchDiagnostics', () => {
  const actual = jest.requireActual<typeof import('./searchDiagnostics')>('./searchDiagnostics');
  return {
    ...actual,
    createSearchDiagnosticSnapshot: jest.fn(actual.createSearchDiagnosticSnapshot),
  };
});

const snapshotFactory = jest.mocked(evidence.createSearchDiagnosticSnapshot);
const input: SearchDiagnosticInput = {
  country: 'SK', queryLength: 12, offerType: 'offer', onlyMyLocation: false,
  priceMinSet: false, priceMaxSet: true,
};
const completed = {
  source: 'network', state: 'complete', httpStatus: 200,
  offersCount: 3, usersCount: 0, validCollections: true,
} as const;

function renderDiagnostics(userId: number | undefined = 1, active = true) {
  return renderHook(({ account, isActive }) => useSearchDiagnostics(account, isActive), {
    initialProps: { account: userId, isActive: active },
  });
}

beforeEach(() => {
  jest.restoreAllMocks();
  snapshotFactory.mockReset().mockImplementation(
    jest.requireActual<typeof import('./searchDiagnostics')>('./searchDiagnostics').createSearchDiagnosticSnapshot,
  );
  localStorage.clear();
});

describe('manual local diagnostic session', () => {
  it('is disabled initially, and attempts and updates while disabled do nothing', () => {
    const snapshot = snapshotFactory;
    const { result } = renderDiagnostics();
    let report!: SearchDiagnosticReporter;
    act(() => { report = result.current.begin(input); report(completed); });
    expect(result.current.enabled).toBe(false);
    expect(result.current.snapshot).toBeNull();
    expect(snapshot).not.toHaveBeenCalled();
  });

  it('enables into a waiting state without creating evidence for an old request', () => {
    const snapshot = snapshotFactory;
    const { result } = renderDiagnostics();
    const oldReport = result.current.begin(input);
    act(() => { result.current.setEnabled(true); });
    expect(result.current.enabled).toBe(true);
    expect(result.current.snapshot).toBeNull();
    expect(snapshot).not.toHaveBeenCalled();
    act(() => { oldReport(completed); });
    expect(result.current.snapshot).toBeNull();
  });

  it('begins only the explicitly started attempt and preserves its captured parameters', () => {
    const { result } = renderDiagnostics();
    act(() => { result.current.setEnabled(true); });
    let report!: SearchDiagnosticReporter;
    act(() => { report = result.current.begin(input); });
    expect(result.current.snapshot).toMatchObject({
      ...input, source: 'none', state: 'pending', httpStatus: null,
      offersCount: null, usersCount: null,
    });
    act(() => { report(completed); });
    expect(result.current.snapshot).toMatchObject({ ...input, ...completed });
  });

  it('represents a cache result without inventing an HTTP response', () => {
    const { result } = renderDiagnostics();
    act(() => { result.current.setEnabled(true); });
    act(() => {
      const report = result.current.begin(input);
      report({ source: 'cache', state: 'complete', offersCount: 0, usersCount: 2, validCollections: true });
    });
    expect(result.current.snapshot).toMatchObject({
      source: 'cache', state: 'complete', httpStatus: null, offersCount: 0, usersCount: 2,
    });
  });

  it.each(['error', 'cancelled', 'empty'] as const)('reports %s without claiming successful counts or status', (state) => {
    const { result } = renderDiagnostics();
    act(() => { result.current.setEnabled(true); });
    act(() => { result.current.begin(input)({ source: 'none', state }); });
    expect(result.current.snapshot).toMatchObject({
      state, source: 'none', httpStatus: null, offersCount: null, usersCount: null,
    });
  });

  it('keeps the latest attempt when an older request finishes after it', () => {
    const { result } = renderDiagnostics();
    act(() => { result.current.setEnabled(true); });
    let first!: SearchDiagnosticReporter;
    let second!: SearchDiagnosticReporter;
    act(() => { first = result.current.begin(input); });
    act(() => { second = result.current.begin({ ...input, country: 'CZ', queryLength: 2 }); });
    act(() => { first(completed); });
    expect(result.current.snapshot).toMatchObject({ country: 'CZ', queryLength: 2, state: 'pending' });
    act(() => { second({ ...completed, offersCount: 0 }); });
    expect(result.current.snapshot).toMatchObject({ country: 'CZ', state: 'complete', offersCount: 0 });
    const latest = result.current.snapshot;
    act(() => { first({ source: 'none', state: 'cancelled' }); });
    expect(result.current.snapshot).toBe(latest);
  });

  it('forgets evidence on disable and never accepts a late old response', () => {
    const { result } = renderDiagnostics();
    act(() => { result.current.setEnabled(true); });
    let report!: SearchDiagnosticReporter;
    act(() => { report = result.current.begin(input); report(completed); });
    expect(result.current.snapshot).not.toBeNull();
    act(() => { result.current.setEnabled(false); });
    act(() => { report(completed); });
    expect(result.current.enabled).toBe(false);
    expect(result.current.snapshot).toBeNull();
  });

  it('rejects an old-session reporter after diagnostics is reopened', () => {
    const { result } = renderDiagnostics();
    act(() => { result.current.setEnabled(true); });
    let oldReport!: SearchDiagnosticReporter;
    act(() => { oldReport = result.current.begin(input); });
    act(() => { result.current.setEnabled(false); });
    act(() => { result.current.setEnabled(true); });
    act(() => { oldReport(completed); });
    expect(result.current.enabled).toBe(true);
    expect(result.current.snapshot).toBeNull();
    act(() => { result.current.begin(input)(completed); });
    expect(result.current.snapshot).toMatchObject(completed);
  });

  it.each([2, undefined])('clears evidence and rejects previous account updates when account becomes %s', (account) => {
    const { result, rerender } = renderDiagnostics();
    act(() => { result.current.setEnabled(true); });
    let report!: SearchDiagnosticReporter;
    act(() => { report = result.current.begin(input); report(completed); });
    rerender({ account, isActive: true });
    expect(result.current.enabled).toBe(false);
    expect(result.current.snapshot).toBeNull();
    act(() => { result.current.setEnabled(true); report(completed); });
    expect(result.current.snapshot).toBeNull();
    act(() => { result.current.begin(input)(completed); });
    expect(result.current.snapshot).toMatchObject(completed);
  });

  it('closing the search panel forgets evidence, prevents activation and rejects late results', () => {
    const { result, rerender } = renderDiagnostics();
    act(() => { result.current.setEnabled(true); });
    let report!: SearchDiagnosticReporter;
    act(() => { report = result.current.begin(input); });
    rerender({ account: 1, isActive: false });
    act(() => { result.current.setEnabled(true); report(completed); });
    expect(result.current.enabled).toBe(false);
    expect(result.current.snapshot).toBeNull();
    rerender({ account: 1, isActive: true });
    act(() => { report(completed); });
    expect(result.current.enabled).toBe(false);
    expect(result.current.snapshot).toBeNull();
  });

  it('is not activatable while the search panel starts hidden', () => {
    const { result } = renderDiagnostics(1, false);
    act(() => { result.current.setEnabled(true); result.current.begin(input)(completed); });
    expect(result.current.enabled).toBe(false);
    expect(result.current.snapshot).toBeNull();
  });

  it('keeps public callback identities across all state and owner changes', () => {
    const { result, rerender } = renderDiagnostics();
    const begin = result.current.begin;
    const setEnabled = result.current.setEnabled;
    act(() => { setEnabled(true); });
    act(() => { begin(input)(completed); });
    rerender({ account: 1, isActive: true });
    expect(result.current.begin).toBe(begin);
    expect(result.current.setEnabled).toBe(setEnabled);
    rerender({ account: 2, isActive: false });
    expect(result.current.begin).toBe(begin);
    expect(result.current.setEnabled).toBe(setEnabled);
  });

  it('ignores a reporter retained after unmount', () => {
    const { result, unmount } = renderDiagnostics();
    act(() => { result.current.setEnabled(true); });
    let report!: SearchDiagnosticReporter;
    act(() => { report = result.current.begin(input); });
    const last = result.current.snapshot;
    unmount();
    act(() => { report(completed); });
    expect(result.current.snapshot).toBe(last);
  });

  it('isolates failed evidence creation from real search callers and recovers on a subsequent attempt', () => {
    const snapshot = snapshotFactory;
    const { result } = renderDiagnostics();
    act(() => { result.current.setEnabled(true); });
    snapshot.mockImplementationOnce(() => { throw new Error('Broken diagnostics'); });
    expect(() => {
      act(() => { result.current.begin(input)(completed); });
    }).not.toThrow();
    expect(result.current.snapshot).toBeNull();
    act(() => { result.current.begin(input)(completed); });
    expect(result.current.snapshot).toMatchObject(completed);
  });
});
