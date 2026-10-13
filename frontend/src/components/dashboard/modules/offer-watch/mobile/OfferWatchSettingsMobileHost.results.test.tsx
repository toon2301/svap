import { useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { dashboardModuleFromPath } from '../../../components/dashboardMountRoute';
import { usePopstateModuleSync } from '../../../hooks/usePopstateModuleSync';
import { useOfferWatchResultsNavigation } from '../results/offerWatchResultsNavigation';
import OfferWatchSettingsMobileHost from './OfferWatchSettingsMobileHost';
import {
  OFFER_WATCH_SETTINGS_PATH,
  hasOfferWatchSettingsReturnHistory,
  readOfferWatchMobileHistory,
  requestOfferWatchMobile,
  withOfferWatchSettingsReturnHistory,
} from './offerWatchMobileNavigation';

jest.mock('./OfferWatchSettingsMobile', () => ({
  __esModule: true,
  /** Isolate form/API work while retaining the real host, request and parent popstate hooks. */
  default: ({ view, onBack, onPushView }: {
    view: { kind: 'list' | 'create' | 'edit'; watchId?: number; picker?: string };
    onBack: () => void;
    onPushView: (view: unknown) => void;
  }) => (
    <div data-testid="results-manager">
      <span data-testid="manager-view">{view.picker || view.kind}</span>
      <button onClick={onBack}>back</button>
      <button onClick={() => onPushView({ kind: 'create' })}>create</button>
      <button onClick={() => onPushView({ kind: 'edit', watchId: 9 })}>edit</button>
      <button onClick={() => onPushView({ ...view, picker: 'country' })}>country</button>
    </div>
  ),
}));

let mobileViewport = true;
let mediaListeners: Array<() => void> = [];
const mockReturnToSettings = jest.fn();
const mockOpenDesktop = jest.fn();
const mockOpenChange = jest.fn();
const mockSetter = jest.fn();

/** Render the actual results opener and actual parent module synchronizer around the host. */
function ResultsHarness() {
  const [activeModule, setActiveModule] = useState(() => dashboardModuleFromPath(window.location.pathname) ?? 'watches');
  usePopstateModuleSync({
    isMobile: true,
    setActiveModule,
    setIsRightSidebarOpen: mockSetter,
    setActiveRightItem: mockSetter,
    setIsMobileMenuOpen: mockSetter,
    setViewedUserId: mockSetter,
    setViewedUserSlug: mockSetter,
    setViewedUserSummary: mockSetter,
  });
  const open = useOfferWatchResultsNavigation({
    activeModule,
    openDesktopSettings: mockSetter,
    setActiveRightItem: mockSetter,
  });
  return (
    <>
      <span data-testid="parent-module">{activeModule}</span>
      <button onClick={open}>manage from results</button>
      <OfferWatchSettingsMobileHost
        onReturnToSettings={mockReturnToSettings}
        onOpenDesktop={mockOpenDesktop}
        onOpenChange={mockOpenChange}
      />
    </>
  );
}

/** Keep each test's exact source URL, including parameters, fragments and Next history fields. */
function sourceUrl() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

/** Open through the real production results hook, not a manually invented event payload. */
function openManager() {
  fireEvent.click(screen.getByRole('button', { name: 'manage from results' }));
  expect(screen.getByTestId('manager-view')).toHaveTextContent(/^list$/);
}

/** Wait for jsdom's asynchronous history traversal to update both URL and the host view. */
async function goBack() {
  act(() => window.history.back());
  await waitFor(() => expect(mockOpenChange).toHaveBeenLastCalledWith(false));
}

beforeEach(() => {
  jest.clearAllMocks();
  mobileViewport = true;
  mediaListeners = [];
  window.matchMedia = jest.fn().mockImplementation(() => ({
    get matches() { return mobileViewport; },
    addEventListener: (_type: string, listener: () => void) => mediaListeners.push(listener),
    removeEventListener: (_type: string, listener: () => void) => {
      mediaListeners = mediaListeners.filter((entry) => entry !== listener);
    },
  }));
  window.history.replaceState({ nextInternal: 'preserved' }, '', '/dashboard/watches?watch=7&from=notification#results');
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('OW-12: mobile manager opened from results', () => {
  it.each(['browser', 'app'])('%s Back returns to results without opening Settings', async (method) => {
    const original = sourceUrl();
    render(<ResultsHarness />);
    openManager();
    expect(readOfferWatchMobileHistory(window.history.state)?.origin).toBe('results');
    expect(window.location.pathname).toBe(OFFER_WATCH_SETTINGS_PATH);

    if (method === 'app') fireEvent.click(screen.getByRole('button', { name: 'back' }));
    else act(() => window.history.back());

    await waitFor(() => expect(screen.queryByTestId('results-manager')).not.toBeInTheDocument());
    expect(sourceUrl()).toBe(original);
    expect(screen.getByTestId('parent-module')).toHaveTextContent(/^watches$/);
    expect(window.history.state.nextInternal).toBe('preserved');
    expect(hasOfferWatchSettingsReturnHistory(window.history.state)).toBe(false);
    expect(mockReturnToSettings).not.toHaveBeenCalled();
    // A queued 0 ms callback must not reopen Settings after the visible assertion.
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); });
    expect(mockReturnToSettings).not.toHaveBeenCalled();
  });

  it.each(['create', 'edit'])('keeps results origin through %s → picker → form → list → results', async (kind) => {
    const original = sourceUrl();
    render(<ResultsHarness />);
    openManager();
    fireEvent.click(screen.getByRole('button', { name: kind }));
    fireEvent.click(screen.getByRole('button', { name: 'country' }));
    expect(readOfferWatchMobileHistory(window.history.state)?.origin).toBe('results');
    act(() => window.history.back());
    await waitFor(() => expect(screen.getByTestId('manager-view')).toHaveTextContent(new RegExp(`^${kind}$`)));
    act(() => window.history.back());
    await waitFor(() => expect(screen.getByTestId('manager-view')).toHaveTextContent(/^list$/));
    await goBack();
    expect(sourceUrl()).toBe(original);
    expect(mockReturnToSettings).not.toHaveBeenCalled();
  });

  it('Forward reopens the manager, then another Back still returns to results', async () => {
    const original = sourceUrl();
    render(<ResultsHarness />);
    openManager();
    await goBack();
    act(() => window.history.forward());
    await waitFor(() => expect(screen.getByTestId('manager-view')).toHaveTextContent(/^list$/));
    expect(readOfferWatchMobileHistory(window.history.state)?.origin).toBe('results');
    await goBack();
    expect(sourceUrl()).toBe(original);
    expect(mockReturnToSettings).not.toHaveBeenCalled();
  });

  it('a remounted host restores the results-origin marker and does not return to Settings', async () => {
    const original = sourceUrl();
    const first = render(<ResultsHarness />);
    openManager();
    first.unmount();
    render(<ResultsHarness />);
    expect(screen.getByTestId('manager-view')).toHaveTextContent(/^list$/);
    fireEvent.click(screen.getByRole('button', { name: 'back' }));
    await waitFor(() => expect(screen.queryByTestId('results-manager')).not.toBeInTheDocument());
    expect(sourceUrl()).toBe(original);
    expect(screen.getByTestId('parent-module')).toHaveTextContent(/^watches$/);
    expect(mockReturnToSettings).not.toHaveBeenCalled();
  });

  it('a remount after Back does not discover a false Settings-return marker', async () => {
    const first = render(<ResultsHarness />);
    openManager();
    first.unmount();
    act(() => window.history.back());
    await waitFor(() => expect(window.location.pathname).toBe('/dashboard/watches'));
    render(<ResultsHarness />);
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); });
    expect(screen.queryByTestId('results-manager')).not.toBeInTheDocument();
    expect(hasOfferWatchSettingsReturnHistory(window.history.state)).toBe(false);
    expect(mockReturnToSettings).not.toHaveBeenCalled();
  });

  it('does not leave a stale Settings-return marker on a results source entry', async () => {
    const view = render(<ResultsHarness />);
    window.history.replaceState(withOfferWatchSettingsReturnHistory(window.history.state), '');
    // The already-mounted opener cleans old source metadata before pushing management.
    openManager();
    await goBack();
    expect(hasOfferWatchSettingsReturnHistory(window.history.state)).toBe(false);
    view.unmount();
  });

  it('an explicit results request supersedes a queued legacy Settings restoration', () => {
    jest.useFakeTimers();
    window.history.replaceState(withOfferWatchSettingsReturnHistory(window.history.state), '');
    render(<ResultsHarness />);
    openManager();
    act(() => jest.advanceTimersByTime(0));
    expect(mockReturnToSettings).not.toHaveBeenCalled();
    expect(readOfferWatchMobileHistory(window.history.state)?.origin).toBe('results');
  });

  it('repeated back clicks perform only one traversal', () => {
    render(<ResultsHarness />);
    openManager();
    const back = jest.spyOn(window.history, 'back').mockImplementation(() => undefined);
    fireEvent.click(screen.getByRole('button', { name: 'back' }));
    fireEvent.click(screen.getByRole('button', { name: 'back' }));
    expect(back).toHaveBeenCalledTimes(1);
  });

  it('repeated open requests add only one management history entry', () => {
    render(<ResultsHarness />);
    const push = jest.spyOn(window.history, 'pushState');
    openManager();
    openManager();
    expect(push).toHaveBeenCalledTimes(1);
    expect(readOfferWatchMobileHistory(window.history.state)?.origin).toBe('results');
  });

  it('preserves the existing desktop handover after crossing 1024 px', () => {
    render(<ResultsHarness />);
    openManager();
    mobileViewport = false;
    act(() => mediaListeners.forEach((listener) => listener()));
    expect(screen.queryByTestId('results-manager')).not.toBeInTheDocument();
    expect(window.location.pathname).toBe(OFFER_WATCH_SETTINGS_PATH);
    expect(readOfferWatchMobileHistory(window.history.state)).toBeNull();
    expect(mockOpenDesktop).toHaveBeenCalledTimes(1);
    expect(mockReturnToSettings).not.toHaveBeenCalled();
  });

  it('the default Settings request is still a Settings return, even over a results URL', async () => {
    render(<ResultsHarness />);
    act(() => requestOfferWatchMobile());
    expect(readOfferWatchMobileHistory(window.history.state)?.origin).toBe('settings');
    await goBack();
    await waitFor(() => expect(mockReturnToSettings).toHaveBeenCalledTimes(1));
  });
});
