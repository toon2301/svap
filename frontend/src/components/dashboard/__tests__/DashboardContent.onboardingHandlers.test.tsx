/**
 * Obsluha krokov úvodného sprievodcu v `DashboardContent`: čo sa v dashboarde
 * stane, keď sprievodca (mobilný / desktopový) požiada o otvorenie obrazovky,
 * a ako sa k nemu dostane oznam „prvá ponuka je vytvorená“.
 *
 * Oba providery sprievodcu sú nahradené atrapami, ktoré zachytia props – testy
 * tak volajú presne tie funkcie, ktoré dashboard sprievodcovi podáva, a nemusia
 * prechádzať celým sprievodcom. Testy idú cez vonkajšie rozhranie komponentu,
 * takže musia prejsť nezmenené aj po rozdelení `DashboardContent.tsx`.
 */

import { act, render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ComponentProps } from 'react';
import Dashboard from '../Dashboard';
import type ModuleRouter from '../ModuleRouter';
import type DashboardLayout from '../DashboardLayout';
import type { DesktopOnboardingProvider } from '../onboarding/DesktopOnboardingContext';
import type { MobileOnboardingProvider } from '../onboarding/MobileOnboardingContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider, __resetAuthBootstrapSnapshotForTests } from '@/contexts/AuthContext';
import type { SearchUserResult, User } from '@/types';

type ModuleRouterProps = ComponentProps<typeof ModuleRouter>;
type DashboardLayoutProps = ComponentProps<typeof DashboardLayout>;
type DesktopOnboardingProps = ComponentProps<typeof DesktopOnboardingProvider>;
type MobileOnboardingProps = ComponentProps<typeof MobileOnboardingProvider>;

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

let mockModalsProps: Record<string, unknown> | null = null;
jest.mock('../DashboardModals', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    mockModalsProps = props;
    return null;
  },
}));

let mockSkillSaveOptions: Record<string, unknown> | null = null;
jest.mock('../hooks/useSkillSaveHandler', () => ({
  useSkillSaveHandler: (options: Record<string, unknown>) => {
    mockSkillSaveOptions = options;
    return () => undefined;
  },
}));

let mockDesktopOnboardingProps: Record<string, unknown> | null = null;
jest.mock('../onboarding/DesktopOnboardingContext', () => ({
  ...jest.requireActual('../onboarding/DesktopOnboardingContext'),
  DesktopOnboardingProvider: (props: { children?: React.ReactNode } & Record<string, unknown>) => {
    mockDesktopOnboardingProps = props;
    return <>{props.children}</>;
  },
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

const baseUser = {
  id: 1, username: 'testuser', email: 'test@example.com', first_name: 'Test', last_name: 'User',
  slug: 'testuser', user_type: 'individual', is_verified: true, is_public: true,
  created_at: '2023-01-01T00:00:00Z', updated_at: '2023-01-01T00:00:00Z',
  profile_completeness: 80,
} as User;

const routerProps = () => mockRouterProps as unknown as ModuleRouterProps;
const layoutProps = () => mockLayoutProps as unknown as DashboardLayoutProps;
const desktop = () => mockDesktopOnboardingProps as unknown as DesktopOnboardingProps;
const mobile = () => mockMobileOnboardingProps as unknown as MobileOnboardingProps;
const activeModule = () => routerProps().activeModule;

function installViewport(isMobile: boolean) {
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

async function renderDashboard(
  isMobile = false,
  entry: { route: string; pathname: string; search: string } = { route: 'home', pathname: '/dashboard', search: '' },
  user: User = baseUser,
) {
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
  mockModalsProps = null;
  mockSkillSaveOptions = null;
  mockDesktopOnboardingProps = null;
  mockMobileOnboardingProps = null;
  mockPathname = '/dashboard';
  mockSearchParams = new URLSearchParams();
  window.history.replaceState(null, '', '/dashboard');
});

afterEach(() => {
  jest.restoreAllMocks();
});

const openNotificationsPanel = () => act(() => layoutProps().onSidebarNotificationsClick?.());
const openSearchPanel = () => act(() => layoutProps().onSidebarSearchClick?.());

describe('mobilný sprievodca otvára obrazovky', () => {
  it.each([
    ['onOpenHome', 'home', 'messages'],
    ['onOpenSearch', 'search', 'home'],
    ['onOpenRequests', 'requests', 'home'],
    ['onOpenMessages', 'messages', 'home'],
  ] as const)('%s prepne na modul „%s“ a zavrie panel upozornení', async (handler, target, from) => {
    await renderDashboard(true);
    act(() => layoutProps().onModuleChange(from));
    expect(activeModule()).toBe(from);
    openNotificationsPanel();
    expect(layoutProps().isNotificationsPanelOpen).toBe(true);

    act(() => mobile()[handler]?.());

    expect(activeModule()).toBe(target);
    expect(layoutProps().isNotificationsPanelOpen).toBe(false);
  });

  it('otvorenie domova z profilu vráti záložku vlastného profilu na ponuky', async () => {
    await renderDashboard(true);
    act(() => layoutProps().onModuleChange('profile'));
    act(() => routerProps().onOwnProfileTabChange?.('posts'));
    expect(routerProps().ownProfileTab).toBe('posts');

    act(() => mobile().onOpenHome?.());

    expect(activeModule()).toBe('home');
    expect(routerProps().ownProfileTab).toBe('offers');
  });

  it('dostane všetky obsluhy krokov a údaje o používateľovi', async () => {
    await renderDashboard(true);
    expect(mobile().activeModule).toBe('home');
    expect(mobile().userId).toBe(1);
    expect(mobile().serverState).toBeNull();
    expect(mobile().isBlockedByUi).toBe(false);
    for (const key of [
      'onOpenHome',
      'onOpenProfile',
      'onOpenEditProfile',
      'onOpenSearch',
      'onOpenRequests',
      'onOpenMessages',
      'onSkillCreatedHandlerSet',
    ] as const) {
      expect(typeof mobile()[key]).toBe('function');
    }
  });

  it('otvorenie úpravy profilu otvorí profil s pravým panelom v režime úpravy', async () => {
    await renderDashboard(true);

    act(() => mobile().onOpenEditProfile?.());

    expect(activeModule()).toBe('profile');
    expect(layoutProps().isRightSidebarOpen).toBe(true);
    expect(layoutProps().activeRightItem).toBe('edit-profile');
    expect(mobile().isProfileEditMode).toBe(true);
  });
});

describe('desktopový sprievodca otvára obrazovky', () => {
  it.each([
    ['onOpenHome', 'home', 'messages'],
    ['onOpenMessages', 'messages', 'home'],
  ] as const)('%s prepne na modul „%s“', async (handler, target, from) => {
    await renderDashboard();
    act(() => layoutProps().onModuleChange(from));

    act(() => desktop()[handler]?.());

    expect(activeModule()).toBe(target);
  });

  it('otvorenie hľadania zavrie panel upozornení a otvorí panel hľadania (modul ostáva)', async () => {
    await renderDashboard();
    openNotificationsPanel();
    expect(layoutProps().isNotificationsPanelOpen).toBe(true);
    expect(layoutProps().isSearchOpen).toBe(false);

    act(() => desktop().onOpenSearch?.());

    expect(layoutProps().isNotificationsPanelOpen).toBe(false);
    expect(layoutProps().isSearchOpen).toBe(true);
    expect(activeModule()).toBe('home');
  });

  it('otvorenie hľadania z celoobrazovkového hľadania vráti Nástenku a otvorí panel', async () => {
    await renderDashboard();
    act(() => layoutProps().onModuleChange('search'));
    expect(activeModule()).toBe('search');

    act(() => desktop().onOpenSearch?.());

    expect(activeModule()).toBe('home');
    expect(layoutProps().isSearchOpen).toBe(true);
  });

  it('zatvorenie hľadania zavrie panel a modul nemení', async () => {
    await renderDashboard();
    openSearchPanel();
    expect(layoutProps().isSearchOpen).toBe(true);

    act(() => desktop().onCloseSearch?.());

    expect(layoutProps().isSearchOpen).toBe(false);
    expect(activeModule()).toBe('home');
  });

  it('otvorenie žiadostí zavrie panel hľadania a prepne na žiadosti', async () => {
    await renderDashboard();
    openSearchPanel();
    expect(layoutProps().isSearchOpen).toBe(true);

    act(() => desktop().onOpenRequests?.());

    expect(layoutProps().isSearchOpen).toBe(false);
    expect(activeModule()).toBe('requests');
  });

  it('dostane stav obrazovky, podľa ktorého sa sprievodca riadi', async () => {
    await renderDashboard();
    expect(desktop().activeModule).toBe('home');
    expect(desktop().isSearchOpen).toBe(false);
    expect(desktop().isNotificationsPanelOpen).toBe(false);
    expect(desktop().isRightSidebarOpen).toBe(false);
    expect(desktop().isProfileEditMode).toBe(false);
    expect(desktop().serverState).toBeNull();

    openSearchPanel();
    expect(desktop().isSearchOpen).toBe(true);
    act(() => layoutProps().onModuleChange('messages'));
    expect(desktop().activeModule).toBe('messages');
  });

  it('sprievodcovia dostanú uložený stav sprievodcu z profilu používateľa', async () => {
    const desktopState = { version: 1, status: 'in_progress', step: 'search' } as const;
    const mobileState = { version: 1, status: 'in_progress', step: 'requests' } as const;

    await renderDashboard(false, { route: 'home', pathname: '/dashboard', search: '' }, {
      ...baseUser,
      desktop_onboarding: desktopState,
      mobile_onboarding: mobileState,
    });

    expect(desktop().serverState).toEqual(desktopState);
    expect(mobile().serverState).toEqual(mobileState);
  });

  it('dostane aj stav upozornení, pravého panela a úpravy profilu', async () => {
    await renderDashboard();
    openNotificationsPanel();
    expect(desktop().isNotificationsPanelOpen).toBe(true);
    expect(mobile().isBlockedByUi).toBe(true);
    act(() => layoutProps().onModuleChange('home'));

    act(() => desktop().onOpenEditProfile?.());

    expect(desktop().activeModule).toBe('profile');
    expect(desktop().isRightSidebarOpen).toBe(true);
    expect(desktop().isProfileEditMode).toBe(true);
    expect(mobile().isProfileEditMode).toBe(true);
    expect(mobile().isBlockedByUi).toBe(false);
  });

  it('otvorený pravý panel s inou položkou než úprava profilu blokuje mobilného sprievodcu', async () => {
    await renderDashboard();
    act(() => desktop().onOpenEditProfile?.());
    expect(mobile().isBlockedByUi).toBe(false);

    // „account-settings“ nie je medzi blokujúcimi modulmi, o blokovaní rozhoduje iba otvorený pravý panel.
    act(() => layoutProps().onRightItemClick?.('account-settings'));

    expect(desktop().isRightSidebarOpen).toBe(true);
    expect(desktop().isProfileEditMode).toBe(false);
    expect(mobile().isBlockedByUi).toBe(true);
  });

  it('zoznam nastavení na mobile je pre sprievodcu otvorená ponuka a blokuje mobilného sprievodcu', async () => {
    await renderDashboard(true);
    expect(desktop().isMobileMenuOpen).toBe(false);
    expect(mobile().isBlockedByUi).toBe(false);

    act(() => layoutProps().onModuleChange('settings'));

    expect(desktop().isMobileMenuOpen).toBe(true);
    expect(mobile().isBlockedByUi).toBe(true);
  });

  it('mobilné menu otvorené krokom späť z upozornení blokuje sprievodcu a klik na upozornenie ho zavrie', async () => {
    await renderDashboard(true);
    // Router, ktorý ako Next skutočne zmení adresu.
    mockRouter.push.mockImplementation((url: string) => {
      window.history.pushState(null, '', url);
      mockPathname = new URL(url, 'http://localhost').pathname;
    });
    act(() => routerProps().onNotificationNavigate?.('/dashboard/notifications'));
    act(() => layoutProps().onMobileBack?.());
    expect(activeModule()).toBe('');
    expect(mobile().isBlockedByUi).toBe(true);

    act(() => routerProps().onNotificationNavigate?.('/dashboard/unknown-section'));

    expect(mobile().isBlockedByUi).toBe(false);
  });

  it('otvorená konverzácia v Správach blokuje mobilného sprievodcu, zoznam konverzácií nie', async () => {
    await renderDashboard(true, { route: 'messages', pathname: '/dashboard/messages', search: 'conversationId=5' });
    expect(mobile().activeModule).toBe('messages');
    expect(mobile().isBlockedByUi).toBe(true);
  });

  it('zoznam konverzácií v Správach mobilného sprievodcu neblokuje', async () => {
    await renderDashboard(true, { route: 'messages', pathname: '/dashboard/messages', search: '' });
    expect(mobile().activeModule).toBe('messages');
    expect(mobile().isBlockedByUi).toBe(false);
  });
});

describe('desktopový sprievodca otvára vlastný profil', () => {
  const summary = { id: 42, username: 'anna' } as unknown as SearchUserResult;

  it('prepne na profil, zapíše modul do úložiska a pridá do histórie adresu profilu', async () => {
    await renderDashboard();
    act(() => layoutProps().onModuleChange('messages'));
    const pushSpy = jest.spyOn(window.history, 'pushState');

    act(() => desktop().onOpenProfile?.());

    expect(activeModule()).toBe('profile');
    expect(localStorage.getItem('activeModule')).toBe('profile');
    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(pushSpy).toHaveBeenCalledWith(null, '', '/dashboard/profile');
  });

  it('vráti záložku vlastného profilu na ponuky', async () => {
    await renderDashboard();
    act(() => routerProps().onOwnProfileTabChange?.('posts'));
    expect(routerProps().ownProfileTab).toBe('posts');

    act(() => desktop().onOpenProfile?.());

    expect(routerProps().ownProfileTab).toBe('offers');
  });

  it('zavrie pravý panel a zruší vybranú položku', async () => {
    await renderDashboard();
    act(() => layoutProps().onRightItemClick?.('offer-watches'));
    expect(layoutProps().isRightSidebarOpen).toBe(true);
    expect(layoutProps().activeRightItem).toBe('offer-watches');

    act(() => desktop().onOpenProfile?.());

    expect(activeModule()).toBe('profile');
    expect(layoutProps().isRightSidebarOpen).toBe(false);
    expect(layoutProps().activeRightItem).toBe('');
  });

  it('zavrie otvorený panel hľadania', async () => {
    await renderDashboard();
    openSearchPanel();
    expect(layoutProps().isSearchOpen).toBe(true);

    act(() => desktop().onOpenProfile?.());

    expect(layoutProps().isSearchOpen).toBe(false);
  });

  it('zavrie otvorený panel upozornení', async () => {
    await renderDashboard();
    openNotificationsPanel();
    expect(layoutProps().isNotificationsPanelOpen).toBe(true);

    act(() => desktop().onOpenProfile?.());

    expect(layoutProps().isNotificationsPanelOpen).toBe(false);
  });

  it('zabudne cudzí profil, ktorý bol otvorený', async () => {
    await renderDashboard();
    act(() => routerProps().onViewUserProfile?.(42, 'anna', summary));
    expect(routerProps().viewedUserId).toBe(42);
    expect(routerProps().viewedUserSlug).toBe('anna');
    expect(routerProps().viewedUserSummary).toBe(summary);

    act(() => desktop().onOpenProfile?.());

    expect(activeModule()).toBe('profile');
    expect(routerProps().viewedUserId).toBeNull();
    expect(routerProps().viewedUserSlug).toBeNull();
    expect(routerProps().viewedUserSummary).toBeNull();
  });

  it('zruší zvýraznenú kartu', async () => {
    await renderDashboard();
    // Router, ktorý ako Next skutočne zmení adresu (zvýraznenie karty ju číta priamo).
    mockRouter.push.mockImplementation((url: string) => {
      window.history.pushState(null, '', url);
      mockPathname = new URL(url, 'http://localhost').pathname;
    });
    act(() => routerProps().onNotificationNavigate?.('/dashboard/profile?offer=5'));
    expect(routerProps().highlightedSkillId).toBe(5);

    act(() => desktop().onOpenProfile?.());

    expect(routerProps().highlightedSkillId).toBeNull();
  });

  it('chyba úložiska nezabráni prepnutiu ani zápisu adresy', async () => {
    await renderDashboard();
    const pushSpy = jest.spyOn(window.history, 'pushState');
    const realSetItem = Storage.prototype.setItem;
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key === 'activeModule') throw new Error('quota');
      return realSetItem.call(this, key, value);
    });

    act(() => desktop().onOpenProfile?.());

    expect(activeModule()).toBe('profile');
    expect(pushSpy).toHaveBeenCalledWith(null, '', '/dashboard/profile');
  });
});

describe('oznam „prvá ponuka je vytvorená“', () => {
  it('bez zaregistrovaných obsluh nič nespadne', async () => {
    await renderDashboard();
    expect(() => act(() => (mockModalsProps?.onCreatedSkillSaved as () => void)())).not.toThrow();
  });

  it('dôjde k mobilnému aj desktopovému sprievodcovi', async () => {
    await renderDashboard();
    const onMobile = jest.fn();
    const onDesktop = jest.fn();
    mobile().onSkillCreatedHandlerSet?.(onMobile);
    desktop().onSkillCreatedHandlerSet?.(onDesktop);

    act(() => (mockModalsProps?.onCreatedSkillSaved as () => void)());

    expect(onMobile).toHaveBeenCalledTimes(1);
    expect(onDesktop).toHaveBeenCalledTimes(1);
  });

  it('funguje aj po uložení karty cez ukladací hook', async () => {
    await renderDashboard();
    const onMobile = jest.fn();
    const onDesktop = jest.fn();
    mobile().onSkillCreatedHandlerSet?.(onMobile);
    desktop().onSkillCreatedHandlerSet?.(onDesktop);

    act(() => (mockSkillSaveOptions?.onCreatedSkillSaved as () => void)());

    expect(onMobile).toHaveBeenCalledTimes(1);
    expect(onDesktop).toHaveBeenCalledTimes(1);
  });

  it('odregistrovaná obsluha sa už nevolá, druhá ostáva', async () => {
    await renderDashboard();
    const onMobile = jest.fn();
    const onDesktop = jest.fn();
    mobile().onSkillCreatedHandlerSet?.(onMobile);
    desktop().onSkillCreatedHandlerSet?.(onDesktop);
    mobile().onSkillCreatedHandlerSet?.(null);

    act(() => (mockModalsProps?.onCreatedSkillSaved as () => void)());

    expect(onMobile).not.toHaveBeenCalled();
    expect(onDesktop).toHaveBeenCalledTimes(1);

    desktop().onSkillCreatedHandlerSet?.(null);
    act(() => (mockModalsProps?.onCreatedSkillSaved as () => void)());
    expect(onDesktop).toHaveBeenCalledTimes(1);
  });

  it('nová obsluha nahradí predošlú', async () => {
    await renderDashboard();
    const first = jest.fn();
    const second = jest.fn();
    mobile().onSkillCreatedHandlerSet?.(first);
    mobile().onSkillCreatedHandlerSet?.(second);

    act(() => (mockModalsProps?.onCreatedSkillSaved as () => void)());

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('zaregistrovanie obsluhy nič nespustí', async () => {
    await renderDashboard();
    const handler = jest.fn();

    mobile().onSkillCreatedHandlerSet?.(handler);
    desktop().onSkillCreatedHandlerSet?.(handler);

    expect(handler).not.toHaveBeenCalled();
  });
});
