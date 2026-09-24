/**
 * Krok späť cez hranicu Next stránky – scenáre z mapovania C7 + D10.
 *
 * Krok späť cez hranicu stránky znamená pre dashboard NOVÝ mount s props
 * stránky, ktorej strom záznam nesie, a s adresou záznamu. Harness skladá
 * skutočné hooky tak, ako ich zapája `DashboardContent`:
 * `useDashboardMountRoute` → `useDashboardState` → `useDashboardUserProfile`.
 *
 * `pathname` je to, čo vráti `usePathname()` – router ho mení spolu so
 * stromom, preto sa `window.location` zámerne drží inde (router.push).
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import type { User } from '@/types';
import {
  dashboardModuleFromPath,
  useDashboardMountRoute,
  type DashboardRouteProps,
} from './dashboardMountRoute';
import { useDashboardState } from '../hooks/useDashboardState';
import { useDashboardUserProfile } from '../hooks/useDashboardUserProfile';
import { invalidateUserProfileCache } from '../modules/profile/profileUserCache';
import { withDesktopSettingsHistory } from '../hooks/desktopSettingsNavigation';

const mockOwnUser: User = {
  id: 7,
  username: 'tester',
  email: 'tester@example.com',
  first_name: 'Test',
  last_name: 'User',
  slug: 'test-user',
  user_type: 'individual',
  is_verified: true,
  is_public: true,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
} as User;

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockOwnUser,
    isLoading: false,
    refreshUser: jest.fn(),
    logout: jest.fn(),
    updateUser: jest.fn(),
  }),
}));

jest.mock('../modules/SearchModule', () => ({
  invalidateSearchCacheForUser: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn((url: string) => {
      const slug = url.replace('/profile/slug/', '');
      if (slug === 'test-user') return Promise.resolve({ data: { id: 7, slug: 'test-user' } });
      if (slug === 'jana') return Promise.resolve({ data: { id: 42, slug: 'jana' } });
      return new Promise(() => {});
    }),
  },
  endpoints: {
    dashboard: {
      userProfileBySlug: (slug: string) => `/profile/slug/${slug}`,
      userProfile: (id: number) => `/profile/${id}`,
    },
  },
}));

const setHighlightedSkillId = jest.fn();

/** Dashboard tak, ako ho zapája `DashboardContent`. */
function useMountedDashboard(pageProps: DashboardRouteProps, pathname: string) {
  const route = useDashboardMountRoute(pageProps, pathname);
  const state = useDashboardState(undefined, route.initialRoute);
  const profile = useDashboardUserProfile({
    user: state.user,
    activeModule: state.activeModule,
    dashboardState: state,
    initialViewedUserId: route.initialViewedUserId,
    initialHighlightedSkillId: route.initialHighlightedSkillId,
    initialProfileSlug: route.initialProfileSlug,
    initialRightItem: route.initialRightItem,
    setHighlightedSkillId,
  });
  return { route, state, profile };
}

/** Mount novej inštancie: props obnovenej stránky + adresa záznamu. */
function mountAfterBack(pageProps: DashboardRouteProps, url: string) {
  window.history.replaceState(null, '', url);
  const pathname = new URL(url, 'https://svaply.test').pathname;
  return renderHook(
    ({ p, path }: { p: DashboardRouteProps; path: string }) => useMountedDashboard(p, path),
    { initialProps: { p: pageProps, path: pathname } },
  );
}

const DASHBOARD_PAGE: DashboardRouteProps = { initialRoute: 'home' };
const SEARCH_PAGE: DashboardRouteProps = { initialRoute: 'search' };
const usersPage = (identifier: string): DashboardRouteProps => ({
  initialRoute: 'user-profile',
  initialViewedUserId: /^\d+$/.test(identifier) ? Number(identifier) : null,
  initialProfileSlug: identifier,
});

beforeEach(() => {
  jest.clearAllMocks();
  [7, 42].forEach(invalidateUserProfileCache);
  window.localStorage.clear();
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
});

describe('scenáre z mapovania', () => {
  it('opens the standalone watch-results module through the shared module switcher', () => {
    const { result } = renderHook(() => useDashboardState(mockOwnUser, 'home'));

    act(() => result.current.handleModuleChange('watches'));

    expect(result.current.activeModule).toBe('watches');
    expect(window.localStorage.getItem('activeModule')).toBe('watches');
  });

  it('6 – desktop: Back z cudzieho profilu pristane na VLASTNOM profile, nie na Nástenke', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
    // Záznam vlastného profilu vznikol pushState-om na stránke /dashboard.
    const { result } = mountAfterBack(DASHBOARD_PAGE, '/dashboard/users/test-user');

    await waitFor(() => expect(result.current.state.activeModule).toBe('profile'));
  });

  it('7 – mobil: Back z cudzieho profilu pristane na Vyhľadávaní', async () => {
    const { result } = mountAfterBack(DASHBOARD_PAGE, '/dashboard/search');

    await waitFor(() => expect(result.current.state.activeModule).toBe('search'));
  });

  it('8 – C7: záznam Vyhľadávania ako vlastná stránka (po F5) ostane Vyhľadávaním', async () => {
    const { result } = mountAfterBack(SEARCH_PAGE, '/dashboard/search');

    await waitFor(() => expect(result.current.state.activeModule).toBe('search'));
  });

  it('8 – C7: rovnaký záznam vytvorený na Nástenke (PWA) je tiež Vyhľadávanie', async () => {
    const { result } = mountAfterBack(DASHBOARD_PAGE, '/dashboard/search');

    await waitFor(() => expect(result.current.state.activeModule).toBe('search'));
  });
});

describe('„je to môj profil" rozhoduje existujúci mechanizmus', () => {
  it('passes the own slug on as user-profile and lets useDashboardUserProfile switch it', async () => {
    const { result } = mountAfterBack(DASHBOARD_PAGE, '/dashboard/users/test-user');

    // Oprava sama o vlastníctve nerozhoduje – odovzdá adresu tak, ako by to
    // spravila stránka profilu.
    expect(result.current.route.initialRoute).toBe('user-profile');
    expect(result.current.route.initialProfileSlug).toBe('test-user');
    await waitFor(() => expect(result.current.state.activeModule).toBe('profile'));
  });

  it('keeps a foreign profile restored across the boundary on user-profile', async () => {
    const { result } = mountAfterBack(DASHBOARD_PAGE, '/dashboard/users/jana');

    await waitFor(() => expect(result.current.profile.viewedUserId).toBe(42));
    expect(result.current.state.activeModule).toBe('user-profile');
    expect(result.current.profile.viewedUserSlug).toBe('jana');
  });
});

describe('fungujúce prípady ostávajú', () => {
  it('bare /dashboard is the feed', async () => {
    const { result } = mountAfterBack(DASHBOARD_PAGE, '/dashboard');

    await waitFor(() => expect(result.current.state.activeModule).toBe('home'));
  });

  it('a feed entry created on a profile page is the feed too', async () => {
    const { result } = mountAfterBack(usersPage('jana'), '/dashboard');

    await waitFor(() => expect(result.current.state.activeModule).toBe('home'));
  });

  it('router.push to a profile mounts that profile even while the browser still shows the old address', async () => {
    // Next vykreslí novú stránku skôr, než zapíše adresu do prehliadača.
    window.history.replaceState(null, '', '/dashboard');
    const { result } = renderHook(() =>
      useMountedDashboard(usersPage('jana'), '/dashboard/users/jana'),
    );

    await waitFor(() => expect(result.current.profile.viewedUserId).toBe(42));
    expect(result.current.state.activeModule).toBe('user-profile');
  });

  it('kontrolný prípad: pushState preklik na autora nemení props namountovanej inštancie', async () => {
    const { result, rerender } = mountAfterBack(DASHBOARD_PAGE, '/dashboard');
    await waitFor(() => expect(result.current.state.activeModule).toBe('home'));

    // Preklik na autora: handler goToUserProfile zapíše modul aj slug, adresa sa zmení.
    window.history.pushState(null, '', '/dashboard/users/jana');
    rerender({ p: DASHBOARD_PAGE, path: '/dashboard/users/jana' });
    result.current.state.setActiveModule('user-profile');
    result.current.profile.setViewedUserSlug('jana');

    await waitFor(() => expect(result.current.profile.viewedUserId).toBe(42));
    expect(result.current.route).toEqual(DASHBOARD_PAGE);
    expect(result.current.state.activeModule).toBe('user-profile');

    // Back v tej istej stránke – syncModuleFromPath podľa toho istého mapovania.
    window.history.back();
    await waitFor(() => expect(window.location.pathname).toBe('/dashboard'));
    rerender({ p: DASHBOARD_PAGE, path: '/dashboard' });
    result.current.state.setActiveModule(dashboardModuleFromPath(window.location.pathname) ?? '');
    await waitFor(() => expect(result.current.state.activeModule).toBe('home'));
  });

  it('návrat z Nastavení: desktopový záznam s markerom otvorí Nastavenia ako po refreshi', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
    window.history.replaceState(
      withDesktopSettingsHistory(null, { moduleId: 'home', url: '/dashboard' }),
      '',
      '/dashboard/settings/notifications',
    );
    const { result } = renderHook(() =>
      useMountedDashboard(DASHBOARD_PAGE, '/dashboard/settings/notifications'),
    );

    await waitFor(() => expect(result.current.state.activeModule).toBe('settings'));
    expect(result.current.state.isRightSidebarOpen).toBe(true);
    expect(result.current.state.activeRightItem).toBe('notifications');
  });
});
