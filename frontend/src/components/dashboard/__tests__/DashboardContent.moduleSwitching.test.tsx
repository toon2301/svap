/**
 * Prepínanie modulov a tlačidlá bočného panela z pohľadu `DashboardContent`:
 * čo sa stane okrem samotného prepnutia (cieľ zo žiadostí, panel upozornení,
 * záložka vlastného profilu, návrat z popisu zručnosti), vstup do vlastného
 * profilu a do zručností, tlačidlá Hľadať / Upozornenia a prepínač režimu
 * zručností.
 *
 * Testy idú cez vonkajšie rozhranie komponentu (props, ktoré dostane
 * `ModuleRouter` a `DashboardLayout`, adresa a história prehliadača), takže
 * nezávisia od toho, v ktorom súbore obsluhy žijú, a musia prejsť nezmenené aj
 * po rozdelení `DashboardContent.tsx`. Samotná navigácia (`useDashboardNavigation`)
 * má vlastné testy – tu sa overuje, čo s ňou `DashboardContent` robí.
 */

import { act, render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ComponentProps } from 'react';
import Dashboard from '../Dashboard';
import type ModuleRouter from '../ModuleRouter';
import type DashboardLayout from '../DashboardLayout';
import {
  getSkillsDescribeReturnModule,
  setSkillsDescribeProfileReturn,
} from '../modules/skills/skillsDescribeReturnSession';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider, __resetAuthBootstrapSnapshotForTests } from '@/contexts/AuthContext';
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
jest.mock('../onboarding/MobileOnboardingContext', () => ({
  ...jest.requireActual('../onboarding/MobileOnboardingContext'),
  MobileOnboardingProvider: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
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

const baseUser = {
  id: 1, username: 'testuser', email: 'test@example.com', first_name: 'Test', last_name: 'User',
  slug: 'testuser', user_type: 'individual', is_verified: true, is_public: true,
  created_at: '2023-01-01T00:00:00Z', updated_at: '2023-01-01T00:00:00Z',
  profile_completeness: 80,
} as User;

const routerProps = () => mockRouterProps as unknown as ModuleRouterProps;
const layoutProps = () => mockLayoutProps as unknown as DashboardLayoutProps;
const activeModule = () => routerProps().activeModule;

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

type Entry = { route: string; pathname: string; search: string };
const HOME: Entry = { route: 'home', pathname: '/dashboard', search: '' };
const PROFILE: Entry = { route: 'profile', pathname: '/dashboard/profile', search: '' };
const SETTINGS: Entry = { route: 'settings', pathname: '/dashboard/settings', search: '' };

async function renderDashboard(isMobile = false, entry: Entry = HOME, user: User = baseUser) {
  mockPathname = entry.pathname;
  mockSearchParams = new URLSearchParams(entry.search);
  window.history.replaceState(null, '', entry.search ? `${entry.pathname}?${entry.search}` : entry.pathname);
  installViewport(isMobile);
  // Viacnásobný reťaz `await`ov v efektoch sa musí dobehnúť vnútri `act`,
  // inak ho RTL 13 zachytí mimo neho.
  await act(async () => {
    render(
      <AuthProvider>
        <ThemeProvider>
          <Dashboard initialUser={user} initialRoute={entry.route} />
        </ThemeProvider>
      </AuthProvider>,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  await waitFor(() => expect(activeModule()).toBe(entry.route));
  await settle();
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRouter.push.mockReset();
  __resetAuthBootstrapSnapshotForTests();
  localStorage.clear();
  sessionStorage.clear();
  mockRouterProps = null;
  mockLayoutProps = null;
  mockPathname = '/dashboard';
  mockSearchParams = new URLSearchParams();
  window.history.replaceState(null, '', '/dashboard');
});

afterEach(() => {
  jest.restoreAllMocks();
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: originalInnerWidth,
  });
});

const goTo = (moduleId: string) => act(() => routerProps().setActiveModule(moduleId));
const switchModule = (moduleId: string) => act(() => layoutProps().onModuleChange(moduleId));
const clickNotification = (targetUrl: string) => act(() => routerProps().onNotificationNavigate?.(targetUrl));
const setOwnProfileTab = (tab: 'offers' | 'posts' | 'portfolio') =>
  act(() => routerProps().onOwnProfileTabChange?.(tab));
const clickSearch = () => act(() => layoutProps().onSidebarSearchClick?.());
const clickNotificationsBell = () => act(() => layoutProps().onSidebarNotificationsClick?.());
const openRightItem = (itemId: string) => act(() => layoutProps().onRightItemClick(itemId));
const toggleSkillsModeFromLayout = () => act(() => layoutProps().onSkillsModeToggle?.());
const toggleSkillsModeFromRouter = () => act(() => routerProps().onSkillsModeToggle?.());

const spyPushState = () => jest.spyOn(window.history, 'pushState');

describe('prepnutie modulu (onModuleChange)', () => {
  it('zmení modul a zapíše adresu sekcie', async () => {
    await renderDashboard();
    const push = spyPushState();

    switchModule('search');

    expect(activeModule()).toBe('search');
    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith(null, '', '/dashboard/search');
  });

  it('zahodí cieľ zo žiadostí aj vtedy, keď sa prepína na tie isté žiadosti', async () => {
    await renderDashboard();
    clickNotification('/dashboard/requests?tab=sent');
    expect(activeModule()).toBe('requests');
    expect(routerProps().requestsRouteIntent).not.toBeNull();

    switchModule('requests');

    expect(activeModule()).toBe('requests');
    expect(routerProps().requestsRouteIntent).toBeNull();
  });

  it('zatvorí panel upozornení', async () => {
    await renderDashboard();
    clickNotificationsBell();
    expect(layoutProps().isNotificationsPanelOpen).toBe(true);

    switchModule('search');

    expect(layoutProps().isNotificationsPanelOpen).toBe(false);
    expect(activeModule()).toBe('search');
  });

  it('vstup do profilu vráti jeho záložku na Ponuky', async () => {
    await renderDashboard();
    setOwnProfileTab('posts');
    expect(routerProps().ownProfileTab).toBe('posts');

    switchModule('profile');

    expect(activeModule()).toBe('profile');
    expect(routerProps().ownProfileTab).toBe('offers');
  });

  it('odchod z profilu vráti jeho záložku na Ponuky', async () => {
    await renderDashboard(false, PROFILE);
    setOwnProfileTab('portfolio');
    expect(routerProps().ownProfileTab).toBe('portfolio');

    switchModule('search');

    expect(activeModule()).toBe('search');
    expect(routerProps().ownProfileTab).toBe('offers');
  });

  it('odchod z profilu, do ktorého sa prišlo prepnutím, vráti jeho záložku na Ponuky', async () => {
    await renderDashboard();
    switchModule('profile');
    expect(activeModule()).toBe('profile');
    setOwnProfileTab('posts');

    switchModule('search');

    expect(activeModule()).toBe('search');
    expect(routerProps().ownProfileTab).toBe('offers');
  });

  it('prepnutie medzi modulmi, ktoré profil nie sú, záložku profilu nemení', async () => {
    await renderDashboard();
    setOwnProfileTab('posts');

    switchModule('search');

    expect(activeModule()).toBe('search');
    expect(routerProps().ownProfileTab).toBe('posts');
  });
});

describe('vlastný profil a zručnosti z tlačidiel mimo hlavného prepínača', () => {
  it('profil zo spodnej lišty na mobile: modul profil, záložka Ponuky, adresa profilu', async () => {
    await renderDashboard(true);
    setOwnProfileTab('posts');
    const push = spyPushState();

    act(() => layoutProps().onMobileProfileClick?.());

    expect(activeModule()).toBe('profile');
    expect(routerProps().ownProfileTab).toBe('offers');
    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith(expect.anything(), '', '/dashboard/users/testuser');
  });

  it('Zručnosti z profilu: modul zručnosti, záložka profilu späť na Ponuky', async () => {
    await renderDashboard(false, PROFILE);
    setOwnProfileTab('portfolio');

    act(() => routerProps().onSkillsClick?.());

    expect(activeModule()).toBe('skills');
    expect(routerProps().ownProfileTab).toBe('offers');
  });
});

describe('cieľ zo žiadostí pri odchode zo žiadostí', () => {
  it('kým je otvorený modul žiadostí, cieľ ostáva', async () => {
    await renderDashboard();
    clickNotification('/dashboard/requests?tab=sent');
    await settle();

    expect(activeModule()).toBe('requests');
    expect(routerProps().requestsRouteIntent).toMatchObject({ tab: 'sent' });
  });

  it('zmena modulu mimo hlavného prepínača (napr. krok späť) ho zahodí', async () => {
    await renderDashboard();
    clickNotification('/dashboard/requests?tab=sent');
    expect(routerProps().requestsRouteIntent).not.toBeNull();

    goTo('home');

    expect(activeModule()).toBe('home');
    expect(routerProps().requestsRouteIntent).toBeNull();
  });
});

describe('návrat z popisu zručnosti', () => {
  it('uložený návrat na profil platí, kým je otvorený popis zručnosti', async () => {
    await renderDashboard();
    setSkillsDescribeProfileReturn(5);

    goTo('skills-describe');

    expect(getSkillsDescribeReturnModule(5)).toBe('profile');
  });

  it('po odchode z popisu zručnosti sa zahodí', async () => {
    await renderDashboard();
    setSkillsDescribeProfileReturn(5);
    goTo('skills-describe');
    expect(getSkillsDescribeReturnModule(5)).toBe('profile');

    goTo('skills');

    expect(getSkillsDescribeReturnModule(5)).toBeNull();
  });

  it('zvyšok z minulého otvorenia sa zahodí už pri načítaní mimo popisu zručnosti', async () => {
    setSkillsDescribeProfileReturn(5);
    expect(getSkillsDescribeReturnModule(5)).toBe('profile');

    await renderDashboard();

    expect(activeModule()).toBe('home');
    expect(getSkillsDescribeReturnModule(5)).toBeNull();
  });
});

describe('Hľadať v bočnom paneli (onSidebarSearchClick)', () => {
  it('otvára a zatvára vyhľadávací panel', async () => {
    await renderDashboard();
    expect(layoutProps().isSearchOpen).toBe(false);

    clickSearch();
    expect(layoutProps().isSearchOpen).toBe(true);

    clickSearch();
    expect(layoutProps().isSearchOpen).toBe(false);
  });

  it('zatvorí panel upozornení', async () => {
    await renderDashboard();
    clickNotificationsBell();
    expect(layoutProps().isNotificationsPanelOpen).toBe(true);

    clickSearch();

    expect(layoutProps().isSearchOpen).toBe(true);
    expect(layoutProps().isNotificationsPanelOpen).toBe(false);
  });
});

describe('Upozornenia v bočnom paneli (onSidebarNotificationsClick)', () => {
  it('otvára a zatvára panel upozornení', async () => {
    await renderDashboard();
    expect(layoutProps().isNotificationsPanelOpen).toBe(false);

    clickNotificationsBell();
    expect(layoutProps().isNotificationsPanelOpen).toBe(true);

    clickNotificationsBell();
    expect(layoutProps().isNotificationsPanelOpen).toBe(false);
  });

  it('zatvorí vyhľadávací panel', async () => {
    await renderDashboard();
    clickSearch();
    expect(layoutProps().isSearchOpen).toBe(true);

    clickNotificationsBell();

    expect(layoutProps().isNotificationsPanelOpen).toBe(true);
    expect(layoutProps().isSearchOpen).toBe(false);
  });

  it('zatvorí pravý panel a zruší vybranú položku', async () => {
    await renderDashboard(false, SETTINGS);
    openRightItem('account-settings');
    expect(layoutProps().isRightSidebarOpen).toBe(true);
    expect(layoutProps().activeRightItem).toBe('account-settings');

    clickNotificationsBell();

    expect(layoutProps().isNotificationsPanelOpen).toBe(true);
    expect(layoutProps().isRightSidebarOpen).toBe(false);
    expect(layoutProps().activeRightItem).toBe('');
    expect(activeModule()).toBe('settings');
  });
});

describe('prepínač režimu zručností (onSkillsModeToggle)', () => {
  const sources = [
    ['z bočného panela', toggleSkillsModeFromLayout],
    ['z modulu', toggleSkillsModeFromRouter],
  ] as const;

  it.each(sources)('%s: „Ponúkam“ → „Hľadám“', async (_label, toggle) => {
    await renderDashboard();
    goTo('skills-offer');
    const push = spyPushState();

    toggle();

    expect(activeModule()).toBe('skills-search');
    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith(null, '', '/dashboard/skills/search');
  });

  it.each(sources)('%s: „Hľadám“ → „Ponúkam“', async (_label, toggle) => {
    await renderDashboard();
    goTo('skills-search');
    const push = spyPushState();

    toggle();

    expect(activeModule()).toBe('skills-offer');
    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith(null, '', '/dashboard/skills/offer');
  });

  it.each(['home', 'skills', 'profile'])('v module „%s“ nerobí nič', async (moduleId) => {
    await renderDashboard();
    goTo(moduleId);
    const push = spyPushState();

    toggleSkillsModeFromLayout();
    toggleSkillsModeFromRouter();

    expect(activeModule()).toBe(moduleId);
    expect(push).not.toHaveBeenCalled();
  });

  it('prepína bežnou navigáciou: zatvorí panel upozornení', async () => {
    await renderDashboard();
    goTo('skills-offer');
    clickNotificationsBell();
    expect(layoutProps().isNotificationsPanelOpen).toBe(true);

    toggleSkillsModeFromLayout();

    expect(activeModule()).toBe('skills-search');
    expect(layoutProps().isNotificationsPanelOpen).toBe(false);
  });
});
