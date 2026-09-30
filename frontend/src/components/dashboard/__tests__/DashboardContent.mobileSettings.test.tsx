/**
 * Mobilné Nastavenia z pohľadu `DashboardContent`: otvorenie a zatvorenie
 * zoznamu (hamburger / krížik), šípka späť v nastaveniach účtu a zahodenie
 * podobrazovky nastavení účtu pri odchode.
 *
 * Testy idú cez vonkajšie rozhranie komponentu (props, ktoré dostane
 * `ModuleRouter` a `DashboardLayout`, adresa a história prehliadača), takže
 * nezávisia od toho, v ktorom súbore obsluhy žijú, a musia prejsť nezmenené aj
 * po rozdelení `DashboardContent.tsx`. Samotná navigácia medzi sekciami
 * (`useDashboardNavigation`, `useDashboardState`) má vlastné testy – tu sa
 * overuje, čo s ňou `DashboardContent` robí.
 */

import { act, render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ComponentProps } from 'react';
import Dashboard from '../Dashboard';
import type ModuleRouter from '../ModuleRouter';
import type DashboardLayout from '../DashboardLayout';
import { hasMobileSettingsOrigin } from '../hooks/mobileSettingsOrigin';
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
const SETTINGS: Entry = { route: 'settings', pathname: '/dashboard/settings', search: '' };
const ACCOUNT_SETTINGS: Entry = {
  route: 'account-settings',
  pathname: '/dashboard/settings/account',
  search: '',
};
const PROFILE: Entry = { route: 'profile', pathname: '/dashboard/profile', search: '' };

async function renderDashboard(isMobile = true, entry: Entry = HOME, user: User = baseUser) {
  mockPathname = entry.pathname;
  mockSearchParams = new URLSearchParams(entry.search);
  window.history.replaceState(null, '', entry.search ? `${entry.pathname}?${entry.search}` : entry.pathname);
  installViewport(isMobile);
  render(
    <AuthProvider>
      <ThemeProvider>
        <Dashboard initialUser={user} initialRoute={entry.route} />
      </ThemeProvider>
    </AuthProvider>,
  );
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

const openMobileMenu = () => act(() => layoutProps().onMobileMenuOpen?.());
const closeMobileMenu = () => act(() => layoutProps().onMobileMenuClose?.());
const pressBack = () => act(() => layoutProps().onMobileBack?.());
const setAccountView = (view: 'overview' | 'verify-email' | 'delete-account') =>
  act(() => routerProps().onMobileAccountSettingsViewChange?.(view));
const openNotificationsPanel = () => act(() => layoutProps().onSidebarNotificationsClick?.());

const spyPushState = () => jest.spyOn(window.history, 'pushState');
const spyBack = () => jest.spyOn(window.history, 'back').mockImplementation(() => undefined);

describe('zoznam Nastavení na mobile', () => {
  it.each([
    ['mobil, modul settings', true, 'settings', true],
    ['desktop, modul settings', false, 'settings', false],
    ['mobil, iný modul', true, 'home', false],
  ] as const)('%s: menu zoznamu je otvorené = %s', async (_label, isMobile, moduleId, isOpen) => {
    await renderDashboard(isMobile, moduleId === 'settings' ? SETTINGS : HOME);

    expect(activeModule()).toBe(moduleId);
    expect(layoutProps().isMobileMenuOpen).toBe(isOpen);
  });
});

describe('otvorenie zoznamu (hamburger, onMobileMenuOpen)', () => {
  it('z Nástenky ide bežnou navigáciou: nový záznam s adresou Nastavení a označením pôvodu', async () => {
    await renderDashboard();
    const push = spyPushState();

    openMobileMenu();

    expect(activeModule()).toBe('settings');
    expect(layoutProps().isMobileMenuOpen).toBe(true);
    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith(expect.anything(), '', '/dashboard/settings');
    expect(hasMobileSettingsOrigin(push.mock.calls[0][0])).toBe(true);
    expect(window.location.pathname).toBe('/dashboard/settings');
  });

  it('zatvorí panel upozornení', async () => {
    await renderDashboard();
    openNotificationsPanel();
    expect(layoutProps().isNotificationsPanelOpen).toBe(true);

    openMobileMenu();

    expect(layoutProps().isNotificationsPanelOpen).toBe(false);
  });

  it('z vlastného profilu vráti jeho záložku na Ponuky', async () => {
    await renderDashboard(true, PROFILE);
    act(() => routerProps().onOwnProfileTabChange?.('posts'));
    expect(routerProps().ownProfileTab).toBe('posts');

    openMobileMenu();

    expect(activeModule()).toBe('settings');
    expect(routerProps().ownProfileTab).toBe('offers');
  });

  it('z profilu, do ktorého sa prišlo prepnutím modulu, vráti jeho záložku na Ponuky', async () => {
    await renderDashboard(true, HOME);
    act(() => layoutProps().onModuleChange('profile'));
    expect(activeModule()).toBe('profile');
    act(() => routerProps().onOwnProfileTabChange?.('posts'));
    expect(routerProps().ownProfileTab).toBe('posts');

    openMobileMenu();

    expect(activeModule()).toBe('settings');
    expect(routerProps().ownProfileTab).toBe('offers');
  });

  it.each([
    ['/dashboard/settings'],
    ['/dashboard/settings/'],
  ])('keď adresa už ukazuje na zoznam (%s), iba zosúladí modul bez nového záznamu', async (path) => {
    await renderDashboard();
    window.history.replaceState(null, '', path);
    openNotificationsPanel();
    const push = spyPushState();

    openMobileMenu();

    expect(activeModule()).toBe('settings');
    expect(push).not.toHaveBeenCalled();
    expect(layoutProps().isNotificationsPanelOpen).toBe(true);
  });

  it('adresa sekcie Nastavení nie je adresa zoznamu: navigácia na zoznam prebehne', async () => {
    await renderDashboard();
    window.history.replaceState(null, '', '/dashboard/settings/account');
    const push = spyPushState();

    openMobileMenu();

    expect(activeModule()).toBe('settings');
    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith(expect.anything(), '', '/dashboard/settings');
  });
});

describe('zatvorenie zoznamu (krížik, onMobileMenuClose)', () => {
  it('zoznam otvorený z appky sa zatvára krokom späť v histórii', async () => {
    await renderDashboard();
    openMobileMenu();
    const back = spyBack();
    const push = spyPushState();

    closeMobileMenu();

    expect(back).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
    expect(activeModule()).toBe('settings');
  });

  it.each([
    ['/dashboard/settings'],
    ['/dashboard/settings/'],
  ])('pri priamom vstupe (%s, bez záznamu appky pod zoznamom) ide na Nástenku', async (path) => {
    await renderDashboard(true, SETTINGS);
    window.history.replaceState(null, '', path);
    const back = spyBack();
    const push = spyPushState();

    closeMobileMenu();

    expect(back).not.toHaveBeenCalled();
    expect(activeModule()).toBe('home');
    expect(layoutProps().isMobileMenuOpen).toBe(false);
    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith(null, '', '/dashboard');
    expect(window.location.pathname).toBe('/dashboard');
  });

  it('záznam z iného načítania stránky sa nepovažuje za záznam appky: ide na Nástenku', async () => {
    await renderDashboard(true, SETTINGS);
    window.history.replaceState(
      { __svaplyMobileSettingsOrigin: { version: 1, pageLoadId: 'ina-stranka' } },
      '',
      '/dashboard/settings',
    );
    const back = spyBack();

    closeMobileMenu();

    expect(back).not.toHaveBeenCalled();
    expect(activeModule()).toBe('home');
  });

  it('keď adresa už nie je zoznam (riadok po otvorení sekcie zavolá zatvorenie ešte raz), nerobí nič', async () => {
    await renderDashboard();
    openMobileMenu();
    act(() => layoutProps().onSidebarLanguageClick?.());
    expect(activeModule()).toBe('language');
    expect(window.location.pathname).toBe('/dashboard/language');
    const back = spyBack();
    const push = spyPushState();

    closeMobileMenu();

    expect(back).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    expect(activeModule()).toBe('language');
  });

  it('mimo Nastavení (adresa Nástenky) nerobí nič', async () => {
    await renderDashboard();
    const back = spyBack();
    const push = spyPushState();

    closeMobileMenu();

    expect(back).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    expect(activeModule()).toBe('home');
  });
});

describe('šípka v nastaveniach účtu (onMobileBack)', () => {
  it('prehľad → šípka vedie na zoznam Nastavení (priamy vstup bez záznamu appky)', async () => {
    await renderDashboard(true, ACCOUNT_SETTINGS);
    const push = spyPushState();

    pressBack();

    expect(activeModule()).toBe('settings');
    expect(push).toHaveBeenCalledWith(null, '', '/dashboard/settings');
  });

  it('prehľad otvorený zo zoznamu → šípka je krok späť v histórii', async () => {
    await renderDashboard();
    openMobileMenu();
    act(() => layoutProps().onSidebarAccountSettingsClick?.());
    expect(activeModule()).toBe('account-settings');
    const back = spyBack();

    pressBack();

    expect(back).toHaveBeenCalledTimes(1);
  });

  it.each(['verify-email', 'delete-account'] as const)(
    'podobrazovka „%s“ → šípka najprv vráti prehľad, až ďalšia odíde',
    async (view) => {
      await renderDashboard(true, ACCOUNT_SETTINGS);
      setAccountView(view);
      expect(routerProps().mobileAccountSettingsView).toBe(view);
      expect(layoutProps().mobileAccountSettingsView).toBe(view);
      const push = spyPushState();

      pressBack();

      expect(routerProps().mobileAccountSettingsView).toBe('overview');
      expect(layoutProps().mobileAccountSettingsView).toBe('overview');
      expect(activeModule()).toBe('account-settings');
      expect(push).not.toHaveBeenCalled();

      pressBack();

      expect(activeModule()).toBe('settings');
      expect(push).toHaveBeenCalledWith(null, '', '/dashboard/settings');
    },
  );

  it('modul „account-settings“ s inou pravou položkou: podobrazovka sa tiež najprv vráti na prehľad', async () => {
    await renderDashboard(true, ACCOUNT_SETTINGS);
    act(() => layoutProps().onRightItemClick('neznama-polozka'));
    setAccountView('verify-email');
    expect(layoutProps().activeRightItem).toBe('neznama-polozka');
    const push = spyPushState();
    const back = spyBack();

    pressBack();

    expect(routerProps().mobileAccountSettingsView).toBe('overview');
    expect(activeModule()).toBe('account-settings');
    expect(push).not.toHaveBeenCalled();
    expect(back).not.toHaveBeenCalled();
  });

  it('desktopová podoba (modul settings + pravá položka účtu) sa riadi rovnako: najprv prehľad', async () => {
    await renderDashboard(false, SETTINGS);
    act(() => layoutProps().onRightItemClick('account-settings'));
    expect(layoutProps().activeRightItem).toBe('account-settings');
    expect(activeModule()).toBe('settings');
    setAccountView('verify-email');

    pressBack();

    expect(routerProps().mobileAccountSettingsView).toBe('overview');
    expect(layoutProps().activeRightItem).toBe('account-settings');
    expect(layoutProps().isRightSidebarOpen).toBe(true);
  });

  it('desktopová podoba z prehľadu zavrie pravú položku', async () => {
    await renderDashboard(false, SETTINGS);
    act(() => layoutProps().onRightItemClick('account-settings'));
    expect(layoutProps().isRightSidebarOpen).toBe(true);

    pressBack();

    expect(layoutProps().activeRightItem).toBe('');
    expect(layoutProps().isRightSidebarOpen).toBe(false);
    expect(activeModule()).toBe('settings');
  });
});

describe('podobrazovka nastavení účtu sa zahodí pri odchode', () => {
  it('odchod z nastavení účtu na iný modul vráti prehľad', async () => {
    await renderDashboard(true, ACCOUNT_SETTINGS);
    setAccountView('verify-email');

    act(() => layoutProps().onModuleChange('home'));

    expect(activeModule()).toBe('home');
    expect(routerProps().mobileAccountSettingsView).toBe('overview');
    expect(layoutProps().mobileAccountSettingsView).toBe('overview');
  });

  it('odchod z modulu „account-settings“ bez zmeny pravej položky vráti prehľad', async () => {
    await renderDashboard(true, ACCOUNT_SETTINGS);
    act(() => layoutProps().onRightItemClick('neznama-polozka'));
    setAccountView('verify-email');
    expect(routerProps().mobileAccountSettingsView).toBe('verify-email');

    act(() => routerProps().setActiveModule('home'));

    expect(activeModule()).toBe('home');
    expect(layoutProps().activeRightItem).toBe('neznama-polozka');
    expect(routerProps().mobileAccountSettingsView).toBe('overview');
  });

  it('kým je modul „account-settings“, podobrazovka ostáva aj pri zmene pravej položky', async () => {
    await renderDashboard(true, ACCOUNT_SETTINGS);
    setAccountView('verify-email');

    act(() => layoutProps().onRightItemClick('neznama-polozka'));

    expect(activeModule()).toBe('account-settings');
    expect(layoutProps().activeRightItem).toBe('neznama-polozka');
    expect(routerProps().mobileAccountSettingsView).toBe('verify-email');
  });

  it('kým je pravá položka „account-settings“, podobrazovka ostáva aj pri zmene modulu', async () => {
    await renderDashboard(false, SETTINGS);
    act(() => layoutProps().onRightItemClick('account-settings'));
    setAccountView('delete-account');

    act(() => routerProps().setActiveModule('profile'));

    expect(activeModule()).toBe('profile');
    expect(layoutProps().activeRightItem).toBe('account-settings');
    expect(routerProps().mobileAccountSettingsView).toBe('delete-account');
  });

  it('prepnutie pravej položky na inú sekciu (modul ostáva settings) vráti prehľad', async () => {
    await renderDashboard(false, SETTINGS);
    act(() => layoutProps().onRightItemClick('account-settings'));
    setAccountView('verify-email');

    act(() => layoutProps().onRightItemClick('blocked-users'));

    expect(layoutProps().activeRightItem).toBe('blocked-users');
    expect(routerProps().mobileAccountSettingsView).toBe('overview');
  });

  it('podobrazovka nastavená mimo nastavení účtu sa pri najbližšej zmene modulu zahodí', async () => {
    await renderDashboard(true, HOME);
    setAccountView('verify-email');

    act(() => layoutProps().onModuleChange('search'));

    expect(routerProps().mobileAccountSettingsView).toBe('overview');
  });

  it('nový vstup do nastavení účtu začína prehľadom', async () => {
    await renderDashboard(true, ACCOUNT_SETTINGS);
    expect(routerProps().mobileAccountSettingsView).toBe('overview');
    expect(layoutProps().mobileAccountSettingsView).toBe('overview');
  });
});
