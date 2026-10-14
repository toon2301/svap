import { useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { User } from '@/types';
import { dashboardModuleFromPath } from '../../../components/dashboardMountRoute';
import { useDashboardState } from '../../../hooks/useDashboardState';
import { useDashboardNavigation } from '../../../hooks/useDashboardNavigation';
import { useDashboardUserProfile } from '../../../hooks/useDashboardUserProfile';
import { usePopstateModuleSync } from '../../../hooks/usePopstateModuleSync';
import { readDesktopSettingsDepth, readDesktopSettingsReturnTarget } from '../../../hooks/desktopSettingsNavigation';
import { useOfferWatchResultsNavigation } from '../results/offerWatchResultsNavigation';
import OfferWatchSettingsMobileHost from './OfferWatchSettingsMobileHost';
import {
  OFFER_WATCH_SETTINGS_PATH, requestOfferWatchMobile, type OfferWatchMobileView,
} from './offerWatchMobileNavigation';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null, isLoading: false, refreshUser: jest.fn(), logout: jest.fn(), updateUser: jest.fn(),
  }),
}));

jest.mock('../../../modules/SearchModule', () => ({ invalidateSearchCacheForUser: jest.fn() }));
jest.mock('../../../modules/profile/profileUserCache', () => ({
  setUserProfileToCache: jest.fn(), getUserIdBySlug: jest.fn(),
  getUserProfileFromCache: jest.fn(), primeUserSlugId: jest.fn(),
}));

jest.mock('./OfferWatchSettingsMobile', () => ({
  __esModule: true,
  /** Isolate the form/API while keeping real history and parent navigation behavior. */
  default: ({ view, onBack, onPushView }: {
    view: OfferWatchMobileView;
    onBack: () => void;
    onPushView: (next: OfferWatchMobileView) => void;
  }) => (
    <div data-testid="handoff-mobile-manager">
      <span data-testid="handoff-view">{'picker' in view && view.picker ? view.picker : view.kind}</span>
      <button onClick={onBack}>mobile back</button>
      <button onClick={() => onPushView({ kind: 'create' })}>create</button>
      <button onClick={() => onPushView({ kind: 'edit', watchId: 9 })}>edit</button>
      <button onClick={() => onPushView(view.kind === 'edit'
        ? { kind: 'edit', watchId: view.watchId, picker: 'country' }
        : { kind: 'create', picker: 'country' })}>country</button>
    </div>
  ),
}));

const source = '/dashboard/watches?watch=7&from=notification#results';
const nextFields = { __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: ['fixture'], nextInternal: 'preserved' };
const user = {
  id: 7, username: 'tester', email: 'tester@example.com', first_name: 'Test', last_name: 'User',
  slug: 'test-user', user_type: 'individual', is_verified: true, is_public: true,
  created_at: '2023-01-01T00:00:00Z', updated_at: '2023-01-01T00:00:00Z', profile_completeness: 80,
} as User;
const noop = jest.fn();
const mockLegacyDesktopOpen = jest.fn();
const mockReturnToSettings = jest.fn();
let mobileViewport = true;
let mediaListeners: Array<() => void> = [];

/** Compose the same parent hooks and ordinary desktop callback as DashboardLayout. */
function HandoffHarness() {
  const [initialModule] = useState(() => dashboardModuleFromPath(window.location.pathname) ?? 'watches');
  const [initialRightItem] = useState(() => window.location.pathname === OFFER_WATCH_SETTINGS_PATH
    ? 'offer-watches' : undefined);
  const state = useDashboardState(user, initialModule);
  const profile = useDashboardUserProfile({
    user: state.user, activeModule: state.activeModule, dashboardState: state,
    initialRightItem, setHighlightedSkillId: noop,
  });
  useDashboardNavigation({
    user: state.user, dashboardState: state, setIsSearchOpen: noop,
    setViewedUserId: profile.setViewedUserId, setViewedUserSlug: profile.setViewedUserSlug,
    setViewedUserSummary: profile.setViewedUserSummary,
    setHighlightedSkillId: noop, highlightTimeoutRef: { current: null },
  });
  usePopstateModuleSync({
    isMobile: mobileViewport, setActiveModule: state.setActiveModule,
    setIsRightSidebarOpen: state.setIsRightSidebarOpen, setActiveRightItem: state.setActiveRightItem,
    setIsMobileMenuOpen: state.setIsMobileMenuOpen,
    setViewedUserId: profile.setViewedUserId, setViewedUserSlug: profile.setViewedUserSlug,
    setViewedUserSummary: profile.setViewedUserSummary,
  });
  const open = useOfferWatchResultsNavigation({
    activeModule: state.activeModule, openDesktopSettings: state.openDesktopSettings,
    setActiveRightItem: state.setActiveRightItem,
  });
  const desktopManagerVisible = !mobileViewport && state.activeModule === 'settings'
    && state.isRightSidebarOpen && state.activeRightItem === 'offer-watches';
  return (
    <>
      <span data-testid="handoff-module">{state.activeModule}</span>
      <span data-testid="handoff-right-item">{state.activeRightItem}</span>
      <button onClick={open}>manage results</button>
      <button onClick={() => requestOfferWatchMobile()}>manage settings</button>
      {desktopManagerVisible && (
        <div data-testid="handoff-desktop-manager">
          <button onClick={() => state.closeOwnProfileEdit()}>desktop back</button>
        </div>
      )}
      <OfferWatchSettingsMobileHost
        onReturnToSettings={mockReturnToSettings}
        onOpenDesktop={() => {
          mockLegacyDesktopOpen();
          state.handleRightItemClick('offer-watches');
        }}
      />
    </>
  );
}

/** Read the complete current location rather than dropping its fragment. */
function currentUrl() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

/** Deliver an actual media-change event and rerender the responsive parent. */
function resize(view: ReturnType<typeof render>, mobile: boolean) {
  mobileViewport = mobile;
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: mobile ? 390 : 1280 });
  act(() => {
    [...mediaListeners].forEach((listener) => listener());
    view.rerender(<HandoffHarness />);
  });
}

/** Traverse one real jsdom history entry and wait for all parent synchronization timers. */
async function traverse(direction: 'back' | 'forward') {
  await act(async () => {
    await new Promise<void>((resolve) => {
      window.addEventListener('popstate', () => resolve(), { once: true });
      window.history[direction]();
    });
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
}

/** Enter mobile management only through the actual results action. */
function openManager() {
  fireEvent.click(screen.getByRole('button', { name: 'manage results' }));
  expect(screen.getByTestId('handoff-view')).toHaveTextContent(/^list$/);
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  mobileViewport = true;
  mediaListeners = [];
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
  window.matchMedia = jest.fn().mockImplementation(() => ({
    get matches() { return mobileViewport; },
    addEventListener: (_type: string, listener: () => void) => mediaListeners.push(listener),
    removeEventListener: (_type: string, listener: () => void) => {
      mediaListeners = mediaListeners.filter((entry) => entry !== listener);
    },
  }));
  window.history.replaceState(nextFields, '', source);
});

afterEach(() => jest.restoreAllMocks());

describe('results-origin mobile to desktop handoff with real dashboard callbacks', () => {
  it('reuses the current manager entry, retains its exact results target, and opens the desktop section', async () => {
    const view = render(<HandoffHarness />);
    openManager();
    const length = window.history.length;
    const push = jest.spyOn(window.history, 'pushState');
    resize(view, false);
    await waitFor(() => expect(screen.getByTestId('handoff-desktop-manager')).toBeInTheDocument());
    expect(push).not.toHaveBeenCalled();
    expect(window.history.length).toBe(length);
    expect(currentUrl()).toBe(OFFER_WATCH_SETTINGS_PATH);
    expect(readDesktopSettingsReturnTarget(window.history.state)).toEqual({ moduleId: 'watches', url: source });
    expect(readDesktopSettingsDepth(window.history.state)).toBe(0);
    expect(window.history.state).toMatchObject(nextFields);
    expect(mockLegacyDesktopOpen).not.toHaveBeenCalled();
    expect(mockReturnToSettings).not.toHaveBeenCalled();
  });

  it.each(['list', 'create', 'edit', 'create-picker', 'edit-picker'])(
    '%s → desktop app Back returns directly to results, not profile or another manager entry',
    async (step) => {
      const view = render(<HandoffHarness />);
      openManager();
      if (step.startsWith('create')) fireEvent.click(screen.getByRole('button', { name: 'create' }));
      if (step.startsWith('edit')) fireEvent.click(screen.getByRole('button', { name: 'edit' }));
      if (step.endsWith('picker')) fireEvent.click(screen.getByRole('button', { name: 'country' }));
      resize(view, false);
      await waitFor(() => expect(screen.getByRole('button', { name: 'desktop back' })).toBeInTheDocument());
      fireEvent.click(screen.getByRole('button', { name: 'desktop back' }));
      await waitFor(() => expect(currentUrl()).toBe(source));
      expect(screen.getByTestId('handoff-module')).toHaveTextContent(/^watches$/);
      expect(screen.queryByTestId('handoff-desktop-manager')).not.toBeInTheDocument();
      expect(window.history.state).toMatchObject(nextFields);
      expect(mockReturnToSettings).not.toHaveBeenCalled();
    },
  );

  it('browser Back traverses nested entries and Forward reopens management without changing the results origin', async () => {
    const view = render(<HandoffHarness />);
    openManager();
    fireEvent.click(screen.getByRole('button', { name: 'create' }));
    fireEvent.click(screen.getByRole('button', { name: 'country' }));
    resize(view, false);
    await waitFor(() => expect(screen.getByTestId('handoff-desktop-manager')).toBeInTheDocument());
    expect(readDesktopSettingsDepth(window.history.state)).toBe(2);
    await traverse('back');
    expect(currentUrl()).toBe(OFFER_WATCH_SETTINGS_PATH);
    expect(readDesktopSettingsDepth(window.history.state)).toBe(1);
    await traverse('back');
    expect(readDesktopSettingsDepth(window.history.state)).toBe(0);
    await traverse('back');
    expect(currentUrl()).toBe(source);
    expect(screen.getByTestId('handoff-module')).toHaveTextContent(/^watches$/);
    await traverse('forward');
    expect(screen.getByTestId('handoff-desktop-manager')).toBeInTheDocument();
    expect(readDesktopSettingsReturnTarget(window.history.state)).toEqual({ moduleId: 'watches', url: source });
    fireEvent.click(screen.getByRole('button', { name: 'desktop back' }));
    await waitFor(() => expect(currentUrl()).toBe(source));
  });

  it('retains the results return target across a desktop remount', async () => {
    const view = render(<HandoffHarness />);
    openManager();
    fireEvent.click(screen.getByRole('button', { name: 'edit' }));
    resize(view, false);
    await waitFor(() => expect(screen.getByTestId('handoff-desktop-manager')).toBeInTheDocument());
    view.unmount();
    render(<HandoffHarness />);
    expect(screen.getByTestId('handoff-desktop-manager')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'desktop back' }));
    await waitFor(() => expect(currentUrl()).toBe(source));
    expect(screen.getByTestId('handoff-module')).toHaveTextContent(/^watches$/);
    expect(window.history.state).toMatchObject(nextFields);
  });

  it('mobile → desktop → mobile restores the same results flow without adding history entries', async () => {
    const view = render(<HandoffHarness />);
    openManager();
    const length = window.history.length;
    resize(view, false);
    await waitFor(() => expect(screen.getByTestId('handoff-desktop-manager')).toBeInTheDocument());
    const push = jest.spyOn(window.history, 'pushState');
    resize(view, true);
    expect(screen.getByTestId('handoff-mobile-manager')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
    expect(window.history.length).toBe(length);
    fireEvent.click(screen.getByRole('button', { name: 'mobile back' }));
    await waitFor(() => expect(currentUrl()).toBe(source));
    expect(screen.getByTestId('handoff-module')).toHaveTextContent(/^watches$/);
    expect(mockReturnToSettings).not.toHaveBeenCalled();
  });

  it('repeated desktop resize events do not reopen management or insert duplicate history entries', async () => {
    const view = render(<HandoffHarness />);
    openManager();
    const push = jest.spyOn(window.history, 'pushState');
    resize(view, false);
    await waitFor(() => expect(screen.getByTestId('handoff-desktop-manager')).toBeInTheDocument());
    resize(view, false);
    resize(view, false);
    expect(push).not.toHaveBeenCalled();
    expect(mockLegacyDesktopOpen).not.toHaveBeenCalled();
    expect(readDesktopSettingsReturnTarget(window.history.state)).toEqual({ moduleId: 'watches', url: source });
  });

  it('Forward on mobile restores a desktop-converted manager with a results return, not Settings', async () => {
    const view = render(<HandoffHarness />);
    openManager();
    resize(view, false);
    await waitFor(() => expect(screen.getByTestId('handoff-desktop-manager')).toBeInTheDocument());
    await traverse('back');
    expect(currentUrl()).toBe(source);
    resize(view, true);
    await traverse('forward');
    expect(screen.getByTestId('handoff-mobile-manager')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'mobile back' }));
    await waitFor(() => expect(currentUrl()).toBe(source));
    expect(mockReturnToSettings).not.toHaveBeenCalled();
    expect(window.history.state).toMatchObject(nextFields);
  });

  it('repeated full responsive cycles retain a single manager entry and the exact source', async () => {
    const view = render(<HandoffHarness />);
    openManager();
    const length = window.history.length;
    const push = jest.spyOn(window.history, 'pushState');
    for (let cycle = 0; cycle < 2; cycle += 1) {
      resize(view, false);
      await waitFor(() => expect(screen.getByTestId('handoff-desktop-manager')).toBeInTheDocument());
      resize(view, true);
      expect(screen.getByTestId('handoff-mobile-manager')).toBeInTheDocument();
    }
    expect(push).not.toHaveBeenCalled();
    expect(window.history.length).toBe(length);
    fireEvent.click(screen.getByRole('button', { name: 'mobile back' }));
    await waitFor(() => expect(currentUrl()).toBe(source));
    expect(mockReturnToSettings).not.toHaveBeenCalled();
  });

  it.each(['create', 'edit'])('nested %s picker → desktop → mobile list Back leaves management, not a stale form', async (kind) => {
    const view = render(<HandoffHarness />);
    openManager();
    fireEvent.click(screen.getByRole('button', { name: kind }));
    fireEvent.click(screen.getByRole('button', { name: 'country' }));
    resize(view, false);
    await waitFor(() => expect(screen.getByTestId('handoff-desktop-manager')).toBeInTheDocument());
    resize(view, true);
    expect(screen.getByTestId('handoff-view')).toHaveTextContent(/^list$/);
    fireEvent.click(screen.getByRole('button', { name: 'mobile back' }));
    await waitFor(() => expect(currentUrl()).toBe(source));
    expect(screen.getByTestId('handoff-module')).toHaveTextContent(/^watches$/);
    expect(mockReturnToSettings).not.toHaveBeenCalled();
  });

  it.each(['settings', 'direct'])('preserves the existing %s desktop callback contract', async (origin) => {
    window.history.replaceState(nextFields, '', origin === 'settings'
      ? '/dashboard/settings?tab=offers#settings' : OFFER_WATCH_SETTINGS_PATH);
    const view = render(<HandoffHarness />);
    if (origin === 'settings') fireEvent.click(screen.getByRole('button', { name: 'manage settings' }));
    expect(screen.getByTestId('handoff-mobile-manager')).toBeInTheDocument();
    const length = window.history.length;
    const push = jest.spyOn(window.history, 'pushState');
    resize(view, false);
    await waitFor(() => expect(screen.getByTestId('handoff-desktop-manager')).toBeInTheDocument());
    expect(mockLegacyDesktopOpen).toHaveBeenCalledTimes(1);
    expect(mockReturnToSettings).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    expect(window.history.length).toBe(length);
    expect(currentUrl()).toBe(OFFER_WATCH_SETTINGS_PATH);
    expect(window.history.state).toMatchObject(nextFields);
  });
});
