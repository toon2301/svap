/**
 * Krok späť a vpred v histórii prehliadača (`popstate`) v `DashboardContent`:
 * modul sa berie z adresy v okne, pri profiloch aj identifikátor zobrazeného
 * používateľa, ostatné moduly zobrazeného používateľa zahodia, pravý panel
 * a mobilné menu sa zatvoria a modul sa zapíše do `localStorage`. Nepoznaná
 * alebo chybne zakódovaná adresa nezmení nič a po odmountovaní sa počúvanie
 * odoberie.
 *
 * Testy idú cez vonkajšie rozhranie komponentu (props, ktoré dostanú
 * podriadené komponenty), takže nezávisia od toho, v ktorom súbore sa
 * synchronizácia zloží, a musia prejsť nezmenené aj po rozdelení
 * `DashboardContent.tsx`.
 *
 * Krok v histórii sa simuluje tak, ako ho robí prehliadač: najprv sa zmení
 * adresa v okne a potom sa vyvolá `popstate`. Tabuľka adries a modulov má
 * vlastné testy (`dashboardRoutes`), tu je vzorka, ktorá drží zapojenie.
 */

import { act, render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ComponentProps } from 'react';
import Dashboard from '../Dashboard';
import type ModuleRouter from '../ModuleRouter';
import type DashboardLayout from '../DashboardLayout';
import { invalidateUserProfileCache, primeUserSlugId } from '../modules/profile/profileUserCache';
import type { SearchUserResult } from '../modules/search/types';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider, __resetAuthBootstrapSnapshotForTests } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import type { User } from '@/types';

type ModuleRouterProps = ComponentProps<typeof ModuleRouter>;
type DashboardLayoutProps = ComponentProps<typeof DashboardLayout>;

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

let mockRouterProps: Record<string, unknown> | null = null;
jest.mock('../ModuleRouter', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    mockRouterProps = props;
    return <div data-testid="module-state" data-module={String(props.activeModule)} />;
  },
}));

let mockLayoutProps: Record<string, unknown> | null = null;
jest.mock('../DashboardLayout', () => ({
  __esModule: true,
  default: (props: { children?: React.ReactNode } & Record<string, unknown>) => {
    mockLayoutProps = props;
    return <div data-testid="layout">{props.children}</div>;
  },
}));

jest.mock('../DashboardModals', () => ({ __esModule: true, default: () => null }));

jest.mock('../onboarding/DesktopOnboardingContext', () => ({
  ...jest.requireActual('../onboarding/DesktopOnboardingContext'),
  DesktopOnboardingProvider: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

let mockMobileOnboardingProps: Record<string, unknown> | null = null;
jest.mock('../onboarding/MobileOnboardingContext', () => ({
  ...jest.requireActual('../onboarding/MobileOnboardingContext'),
  MobileOnboardingProvider: (props: { children?: React.ReactNode } & Record<string, unknown>) => {
    mockMobileOnboardingProps = props;
    return <>{props.children}</>;
  },
}));

jest.mock('../onboarding/DesktopOnboardingOverlay', () => ({ __esModule: true, default: () => null }));
jest.mock('../onboarding/MobileOnboardingOverlay', () => ({ __esModule: true, default: () => null }));
jest.mock('../onboarding/OnboardingScrollLock', () => ({ __esModule: true, default: () => null }));

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  prefetch: jest.fn(),
};
let mockPathname = '/dashboard';
let mockSearchParams = new URLSearchParams();
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => mockSearchParams,
  usePathname: () => mockPathname,
}));

jest.mock('@/utils/auth', () => ({ isAuthenticated: jest.fn(() => true), clearAuthState: jest.fn() }));
jest.mock('@/utils/csrf', () => ({ fetchCsrfToken: jest.fn(), hasCsrfToken: jest.fn(() => true) }));
jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn(() => new Promise(() => {})),
    post: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(() => new Promise(() => {})),
  },
  endpoints: {
    auth: {
      me: '/auth/me/',
      logout: '/auth/logout/',
      login: '/auth/login/',
      register: '/auth/register/',
      mobileOnboarding: '/auth/onboarding/mobile/',
    },
    dashboard: {
      userProfileBySlug: (slug: string) => `/profile/slug/${slug}/`,
      userProfile: (id: number) => `/profile/${id}/`,
    },
    skills: { list: '/auth/skills/', detail: (id: number) => `/auth/skills/${id}/` },
  },
  invalidateSession: jest.fn(),
  isTransientAuthFailureError: jest.fn(() => false),
  setMayHaveRefreshCookie: jest.fn(),
}));

const mockApiGet = api.get as jest.Mock;

const baseUser = {
  id: 1, username: 'testuser', email: 'test@example.com', first_name: 'Test', last_name: 'User',
  slug: 'testuser', user_type: 'individual', is_verified: true, is_public: true,
  created_at: '2023-01-01T00:00:00Z', updated_at: '2023-01-01T00:00:00Z',
  profile_completeness: 80,
} as User;

const routerProps = () => mockRouterProps as unknown as ModuleRouterProps;
const layoutProps = () => mockLayoutProps as unknown as DashboardLayoutProps;
const activeModule = () => routerProps().activeModule;
const mobileBlocked = () => mockMobileOnboardingProps?.isBlockedByUi;

const DESKTOP_WIDTH = 1280;
const MOBILE_WIDTH = 390;
const originalInnerWidth = window.innerWidth;

function installViewport(isMobile: boolean) {
  // `useDashboardNavigation` rozlišuje mobil/desktop podľa `window.innerWidth`,
  // `DashboardContent` podľa media query – obe musia hovoriť to isté.
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: isMobile ? MOBILE_WIDTH : DESKTOP_WIDTH,
  });
  (window as unknown as { matchMedia: unknown }).matchMedia = jest.fn().mockImplementation((q: string) => ({
    matches: q.includes('max-width: 1023px') ? isMobile : false,
    media: q,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
}

const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

type DashboardProps = ComponentProps<typeof Dashboard>;
type Entry = { route: string; pathname: string; search: string; props?: DashboardProps };
const HOME: Entry = { route: 'home', pathname: '/dashboard', search: '' };
const SETTINGS: Entry = { route: 'settings', pathname: '/dashboard/settings', search: '' };
const NOTIFICATIONS: Entry = { route: 'notifications', pathname: '/dashboard/notifications', search: '' };
const FOREIGN_PROFILE: Entry = {
  route: 'user-profile',
  pathname: '/dashboard/users/55',
  search: '',
  props: { initialViewedUserId: 55 },
};

async function renderDashboard(isMobile = false, entry: Entry = HOME, user: User = baseUser) {
  mockPathname = entry.pathname;
  mockSearchParams = new URLSearchParams(entry.search);
  window.history.replaceState(null, '', entry.search ? `${entry.pathname}?${entry.search}` : entry.pathname);
  installViewport(isMobile);
  let view!: ReturnType<typeof render>;
  // Viacnásobný reťaz `await`ov v efektoch sa musí dobehnúť vnútri `act`,
  // inak ho RTL 13 zachytí mimo neho.
  await act(async () => {
    view = render(
      <AuthProvider>
        <ThemeProvider>
          <Dashboard initialUser={user} initialRoute={entry.route} {...entry.props} />
        </ThemeProvider>
      </AuthProvider>,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  await waitFor(() => expect(activeModule()).toBe(entry.route));
  await settle();
  return view;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRouter.push.mockReset();
  mockApiGet.mockImplementation(() => new Promise(() => {}));
  __resetAuthBootstrapSnapshotForTests();
  localStorage.clear();
  sessionStorage.clear();
  mockRouterProps = null;
  mockLayoutProps = null;
  mockMobileOnboardingProps = null;
  mockPathname = '/dashboard';
  mockSearchParams = new URLSearchParams();
  window.history.replaceState(null, '', '/dashboard');
});

afterEach(() => {
  jest.restoreAllMocks();
  invalidateUserProfileCache(77);
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: originalInnerWidth,
  });
});

const openRightItem = (itemId: string) => act(() => layoutProps().onRightItemClick(itemId));

const popTo = (url: string, state: unknown = null) =>
  act(() => {
    window.history.replaceState(state, '', url);
    window.dispatchEvent(new PopStateEvent('popstate', { state }));
  });

const summary: SearchUserResult = { id: 55, display_name: 'Jana Nováková', slug: 'jana', is_verified: true };

describe('modul podľa adresy', () => {
  it.each([
    ['/dashboard/search', 'search'],
    ['/dashboard/requests', 'requests'],
    ['/dashboard/messages', 'messages'],
    ['/dashboard/messages/12', 'messages'],
    ['/dashboard/notifications', 'notifications'],
    ['/dashboard/favorites', 'favorites'],
    ['/dashboard/statistics', 'statistics'],
    ['/dashboard/settings', 'settings'],
    ['/dashboard/settings/watches', 'settings'],
    ['/dashboard/settings/notifications', 'notification-settings'],
    ['/dashboard/settings/account', 'account-settings'],
    ['/dashboard/settings/blocked', 'blocked-users'],
    ['/dashboard/language', 'language'],
    ['/dashboard/privacy', 'privacy'],
    ['/dashboard/account-type', 'account-type'],
    ['/dashboard/skills', 'skills'],
    ['/dashboard/skills/offer', 'skills-offer'],
    ['/dashboard/skills/search', 'skills-search'],
    ['/dashboard/feed/7', 'feed-post-detail'],
    ['/dashboard/offers/3/reviews', 'offer-reviews'],
    ['/dashboard/profile', 'profile'],
    ['/dashboard/settings/', 'settings'],
  ])('krok na %s otvorí modul %s', async (path, expected) => {
    await renderDashboard();

    await popTo(path);

    expect(activeModule()).toBe(expected);
  });

  it.each(['/dashboard', '/dashboard/', '/dashboard/home'])('krok na %s vráti Nástenku', async (path) => {
    await renderDashboard(false, SETTINGS);
    expect(activeModule()).toBe('settings');

    await popTo(path);

    expect(activeModule()).toBe('home');
  });

  it('modul sa berie z adresy v okne, nie zo stavu udalosti', async () => {
    await renderDashboard();

    await popTo('/dashboard/favorites', { module: 'requests', url: '/dashboard/requests' });

    expect(activeModule()).toBe('favorites');
  });

  it('funguje aj na mobile', async () => {
    await renderDashboard(true);

    await popTo('/dashboard/requests');

    expect(activeModule()).toBe('requests');
  });

  it('zapíše modul do localStorage', async () => {
    await renderDashboard();
    localStorage.clear();

    await popTo('/dashboard/favorites');

    expect(localStorage.getItem('activeModule')).toBe('favorites');
  });

  it('nezapísateľný localStorage krok nezruší: modul sa prepne aj panel sa zavrie', async () => {
    await renderDashboard(false, SETTINGS);
    openRightItem('account-settings');
    expect(layoutProps().isRightSidebarOpen).toBe(true);
    const originalSetItem = Storage.prototype.setItem;
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === 'activeModule') throw new Error('quota');
      return originalSetItem.call(this, key, value);
    });

    await popTo('/dashboard/favorites');

    expect(activeModule()).toBe('favorites');
    expect(layoutProps().isRightSidebarOpen).toBe(false);
    expect(layoutProps().activeRightItem).toBe('');
  });
});

describe('adresy, ktoré krok ignoruje', () => {
  it.each([
    ['nepoznaná adresa dashboardu', '/dashboard/neexistuje'],
    ['číslo konverzácie, ktoré nie je číslo', '/dashboard/messages/abc'],
    ['chybne zakódovaný identifikátor', '/dashboard/users/%E0%A4%A'],
    ['adresa mimo dashboardu', '/prihlasenie'],
  ])('%s nezmení modul, pravý panel ani localStorage', async (_title, path) => {
    await renderDashboard(false, SETTINGS);
    openRightItem('account-settings');
    localStorage.clear();

    await popTo(path);

    expect(activeModule()).toBe('settings');
    expect(layoutProps().isRightSidebarOpen).toBe(true);
    expect(layoutProps().activeRightItem).toBe('account-settings');
    expect(localStorage.getItem('activeModule')).toBeNull();
  });

  it('nepoznaná adresa nezruší zobrazený cudzí profil', async () => {
    await renderDashboard(false, FOREIGN_PROFILE);
    act(() => routerProps().onViewUserProfile?.(55, 'jana', summary));
    expect(routerProps().viewedUserSummary).toEqual(summary);

    await popTo('/dashboard/neexistuje');

    expect(activeModule()).toBe('user-profile');
    expect(routerProps().viewedUserId).toBe(55);
    expect(routerProps().viewedUserSlug).toBe('jana');
    expect(routerProps().viewedUserSummary).toEqual(summary);
  });
});

describe('profil v adrese', () => {
  it('číselný identifikátor otvorí cudzí profil podľa ID', async () => {
    await renderDashboard();

    await popTo('/dashboard/users/55');

    expect(activeModule()).toBe('user-profile');
    expect(routerProps().viewedUserId).toBe(55);
    expect(routerProps().viewedUserSlug).toBeNull();
  });

  it('slug otvorí cudzí profil podľa slugu a ID doplní až jeho preklad', async () => {
    await renderDashboard();

    await popTo('/dashboard/users/jana-novak');

    expect(activeModule()).toBe('user-profile');
    expect(routerProps().viewedUserSlug).toBe('jana-novak');
    expect(routerProps().viewedUserId).toBeNull();
    expect(mockApiGet).toHaveBeenCalledWith(
      '/profile/slug/jana-novak/',
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it('slug so známym ID z cache dostane ID hneď, bez siete', async () => {
    primeUserSlugId('jana-cache', 77);
    await renderDashboard();

    await popTo('/dashboard/users/jana-cache');

    expect(routerProps().viewedUserSlug).toBe('jana-cache');
    expect(routerProps().viewedUserId).toBe(77);
    expect(mockApiGet).not.toHaveBeenCalledWith('/profile/slug/jana-cache/', expect.anything());
  });

  it('slug so znakmi kódovanými v adrese sa zobrazí rozkódovaný', async () => {
    await renderDashboard();

    await popTo('/dashboard/users/j%C3%A1n-nov%C3%A1k');

    expect(activeModule()).toBe('user-profile');
    expect(routerProps().viewedUserSlug).toBe('ján-novák');
  });

  it.each(['posts', 'skills', 'portfolio'])('podstránka /users/55/%s je cudzí profil 55', async (segment) => {
    await renderDashboard();

    await popTo(`/dashboard/users/55/${segment}`);

    expect(activeModule()).toBe('user-profile');
    expect(routerProps().viewedUserId).toBe(55);
    expect(routerProps().viewedUserSlug).toBeNull();
  });

  it('detail portfólia zachová identifikátor vlastníka (slug)', async () => {
    await renderDashboard();

    await popTo('/dashboard/users/jana-novak/portfolio/9');

    expect(activeModule()).toBe('portfolio-detail');
    expect(routerProps().viewedUserSlug).toBe('jana-novak');
    expect(routerProps().viewedUserId).toBeNull();
  });

  it('detail portfólia zachová identifikátor vlastníka (ID)', async () => {
    await renderDashboard();

    await popTo('/dashboard/users/55/portfolio/9');

    expect(activeModule()).toBe('portfolio-detail');
    expect(routerProps().viewedUserId).toBe(55);
    expect(routerProps().viewedUserSlug).toBeNull();
  });

  it('vytvorenie portfólia zobrazeného používateľa zahodí', async () => {
    await renderDashboard(false, FOREIGN_PROFILE);
    act(() => routerProps().onViewUserProfile?.(55, 'jana', summary));

    await popTo('/dashboard/users/jana/portfolio/create');

    expect(activeModule()).toBe('portfolio-create');
    expect(routerProps().viewedUserId).toBeNull();
    expect(routerProps().viewedUserSlug).toBeNull();
    expect(routerProps().viewedUserSummary).toBeNull();
  });

  it('krok z profilu na iný modul zahodí zobrazeného používateľa aj jeho súhrn', async () => {
    await renderDashboard(false, FOREIGN_PROFILE);
    act(() => routerProps().onViewUserProfile?.(55, 'jana', summary));
    expect(routerProps().viewedUserId).toBe(55);
    expect(routerProps().viewedUserSlug).toBe('jana');
    expect(routerProps().viewedUserSummary).toEqual(summary);

    await popTo('/dashboard/settings');

    expect(activeModule()).toBe('settings');
    expect(routerProps().viewedUserId).toBeNull();
    expect(routerProps().viewedUserSlug).toBeNull();
    expect(routerProps().viewedUserSummary).toBeNull();
  });

  it('podstránka úpravy profilu je modul profil a zobrazeného používateľa zahodí', async () => {
    await renderDashboard(false, FOREIGN_PROFILE);
    act(() => routerProps().onViewUserProfile?.(55, 'jana', summary));

    await popTo('/dashboard/users/55/edit');

    expect(activeModule()).toBe('profile');
    expect(routerProps().viewedUserId).toBeNull();
    expect(routerProps().viewedUserSlug).toBeNull();
    expect(routerProps().viewedUserSummary).toBeNull();
  });

  it('krok z jedného cudzieho profilu na druhý (ID) zahodí súhrn a slug', async () => {
    await renderDashboard(false, FOREIGN_PROFILE);
    act(() => routerProps().onViewUserProfile?.(55, 'jana', summary));

    await popTo('/dashboard/users/56');

    expect(activeModule()).toBe('user-profile');
    expect(routerProps().viewedUserId).toBe(56);
    expect(routerProps().viewedUserSlug).toBeNull();
    expect(routerProps().viewedUserSummary).toBeNull();
  });

  it('krok z cudzieho profilu na iný profil (slug) zahodí ID a súhrn', async () => {
    await renderDashboard(false, FOREIGN_PROFILE);
    act(() => routerProps().onViewUserProfile?.(55, 'jana', summary));

    await popTo('/dashboard/users/peter-kovac');

    expect(activeModule()).toBe('user-profile');
    expect(routerProps().viewedUserId).toBeNull();
    expect(routerProps().viewedUserSlug).toBe('peter-kovac');
    expect(routerProps().viewedUserSummary).toBeNull();
  });

  it('vlastný profil podľa slugu sa zobrazí ako modul profil', async () => {
    await renderDashboard();

    await popTo('/dashboard/users/testuser');

    expect(activeModule()).toBe('profile');
  });

  it('vlastný profil podľa ID sa zobrazí ako modul profil', async () => {
    await renderDashboard();

    await popTo('/dashboard/users/1');

    expect(activeModule()).toBe('profile');
  });
});

describe('zatvorenie vedľajšieho rozhrania', () => {
  it('zatvorí pravý panel a zruší vybranú položku', async () => {
    await renderDashboard(false, SETTINGS);
    openRightItem('account-settings');
    expect(layoutProps().isRightSidebarOpen).toBe(true);
    expect(layoutProps().activeRightItem).toBe('account-settings');

    await popTo('/dashboard');

    expect(activeModule()).toBe('home');
    expect(layoutProps().isRightSidebarOpen).toBe(false);
    expect(layoutProps().activeRightItem).toBe('');
  });

  it('zatvorí mobilné menu', async () => {
    await renderDashboard(true, NOTIFICATIONS);
    act(() => layoutProps().onMobileBack());
    expect(mobileBlocked()).toBe(true);

    await popTo('/dashboard');

    expect(activeModule()).toBe('home');
    expect(mobileBlocked()).toBe(false);
  });
});

describe('odpojenie po odmountovaní', () => {
  it('odoberie všetky počúvania na popstate a krok už nič nezmení', async () => {
    const added = jest.spyOn(window, 'addEventListener');
    const removed = jest.spyOn(window, 'removeEventListener');
    const view = await renderDashboard();
    const handlersOf = (spy: jest.SpyInstance) =>
      spy.mock.calls.filter(([type]) => type === 'popstate').map(([, handler]) => handler);
    const registered = handlersOf(added);
    expect(registered.length).toBeGreaterThan(0);

    view.unmount();

    expect(handlersOf(removed)).toEqual(expect.arrayContaining(registered));
    await popTo('/dashboard/favorites');
    expect(activeModule()).toBe('home');
    expect(localStorage.getItem('activeModule')).not.toBe('favorites');
  });
});
