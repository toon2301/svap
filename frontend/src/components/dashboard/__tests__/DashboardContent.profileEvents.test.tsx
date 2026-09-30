/**
 * Globálne udalosti na okne, ktorými sa z iných častí appky otvára profil:
 * `goToUserProfile` (cudzí profil podľa ID alebo slugu, voliteľne so
 * zvýraznenou ponukou) a `goToMyProfile` (vlastný profil). Udalosť prepne
 * modul, zavrie vedľajšie rozhranie, nastaví zobrazeného používateľa, označí
 * vstup ako nový, zapíše zvýraznenie do stavu aj do `sessionStorage` a pridá
 * záznam do histórie s adresou profilu.
 *
 * Testy idú cez vonkajšie rozhranie komponentu (udalosti na okne, props, ktoré
 * dostanú podriadené komponenty, `history.pushState` a modulový stav profilu),
 * takže nezávisia od toho, v ktorom súbore sa obsluha zloží, a musia prejsť
 * nezmenené aj po rozdelení `DashboardContent.tsx`.
 */

import { act, render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ComponentProps } from 'react';
import Dashboard from '../Dashboard';
import type ModuleRouter from '../ModuleRouter';
import type DashboardLayout from '../DashboardLayout';
import { resetProfileFreshEntry, takeProfileFreshEntry } from '../modules/profile/profileFreshEntry';
import { readProfileOriginDepth } from '../modules/profile/profileOriginHistory';
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
let mockRouterRenders: Array<{ viewedUserId: unknown; viewedUserSlug: unknown }> = [];
jest.mock('../ModuleRouter', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    mockRouterProps = props;
    mockRouterRenders.push({ viewedUserId: props.viewedUserId, viewedUserSlug: props.viewedUserSlug });
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

type Entry = { route: string; pathname: string; search: string };
const HOME: Entry = { route: 'home', pathname: '/dashboard', search: '' };
const SETTINGS: Entry = { route: 'settings', pathname: '/dashboard/settings', search: '' };
const NOTIFICATIONS: Entry = { route: 'notifications', pathname: '/dashboard/notifications', search: '' };

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
          <Dashboard initialUser={user} initialRoute={entry.route} />
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
  resetProfileFreshEntry();
  localStorage.clear();
  sessionStorage.clear();
  mockRouterProps = null;
  mockRouterRenders = [];
  mockLayoutProps = null;
  mockMobileOnboardingProps = null;
  mockPathname = '/dashboard';
  mockSearchParams = new URLSearchParams();
  window.history.replaceState(null, '', '/dashboard');
});

afterEach(() => {
  jest.restoreAllMocks();
  invalidateUserProfileCache(77);
  resetProfileFreshEntry();
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: originalInnerWidth,
  });
});

const spyPushState = () => jest.spyOn(window.history, 'pushState');
const currentUrl = () => window.location.pathname + window.location.search;

const sendEvent = (event: Event) =>
  act(async () => {
    window.dispatchEvent(event);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
const goToUserProfile = (detail: unknown) => sendEvent(new CustomEvent('goToUserProfile', { detail }));
const goToMyProfile = (detail?: unknown) => sendEvent(new CustomEvent('goToMyProfile', { detail }));

const openSearch = () => act(() => layoutProps().onSidebarSearchClick?.());
const openNotificationsPanel = () => act(() => layoutProps().onSidebarNotificationsClick?.());
const openRightItem = (itemId: string) => act(() => layoutProps().onRightItemClick(itemId));

const summary: SearchUserResult = { id: 55, display_name: 'Jana Nováková', slug: 'jana', is_verified: true };
const showForeignProfile = () =>
  act(() => routerProps().onViewUserProfile?.(55, 'jana', summary));

const originState = expect.objectContaining({
  __svaplyProfileOrigin: expect.objectContaining({ version: 1, depth: 0 }),
});

describe('goToUserProfile: cudzí profil', () => {
  it('číselný identifikátor otvorí profil podľa ID a pridá záznam histórie', async () => {
    const pushState = spyPushState();
    await renderDashboard();

    await goToUserProfile({ identifier: '42' });

    expect(activeModule()).toBe('user-profile');
    expect(routerProps().viewedUserId).toBe(42);
    expect(routerProps().viewedUserSlug).toBeNull();
    expect(pushState).toHaveBeenCalledTimes(1);
    expect(pushState).toHaveBeenCalledWith(originState, '', '/dashboard/users/42');
    expect(currentUrl()).toBe('/dashboard/users/42');
    expect(readProfileOriginDepth(window.history.state)).toBe(0);
  });

  it('slug otvorí profil podľa slugu a preklad na ID nechá na načítaní profilu', async () => {
    const pushState = spyPushState();
    await renderDashboard();

    await goToUserProfile({ identifier: 'jana-novak' });

    expect(activeModule()).toBe('user-profile');
    expect(routerProps().viewedUserSlug).toBe('jana-novak');
    expect(routerProps().viewedUserId).toBeNull();
    expect(pushState).toHaveBeenCalledTimes(1);
    expect(pushState).toHaveBeenCalledWith(originState, '', '/dashboard/users/jana-novak');
    expect(mockApiGet).toHaveBeenCalledWith(
      '/profile/slug/jana-novak/',
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it('medzery okolo identifikátora sa orežú', async () => {
    const pushState = spyPushState();
    await renderDashboard();

    await goToUserProfile({ identifier: '  jana-novak  ' });

    expect(routerProps().viewedUserSlug).toBe('jana-novak');
    expect(pushState).toHaveBeenCalledWith(originState, '', '/dashboard/users/jana-novak');
  });

  it('slug so známym ID z cache dostane ID hneď, bez siete', async () => {
    primeUserSlugId('jana-cache', 77);
    await renderDashboard();

    await goToUserProfile({ identifier: 'jana-cache' });

    expect(routerProps().viewedUserSlug).toBe('jana-cache');
    expect(routerProps().viewedUserId).toBe(77);
    expect(mockApiGet).not.toHaveBeenCalledWith('/profile/slug/jana-cache/', expect.anything());
  });

  it('slug so známym ID z cache sa nikdy nevykreslí bez ID', async () => {
    primeUserSlugId('jana-cache', 77);
    await renderDashboard();
    mockRouterRenders = [];

    await goToUserProfile({ identifier: 'jana-cache' });

    const withSlug = mockRouterRenders.filter((snapshot) => snapshot.viewedUserSlug === 'jana-cache');
    expect(withSlug.length).toBeGreaterThan(0);
    expect(withSlug.map((snapshot) => snapshot.viewedUserId)).toEqual(withSlug.map(() => 77));
  });

  it('identifikátor s netriednymi znakmi sa v adrese zakóduje', async () => {
    const pushState = spyPushState();
    await renderDashboard();

    await goToUserProfile({ identifier: 'ján ová', highlightId: 3 });

    expect(routerProps().viewedUserSlug).toBe('ján ová');
    expect(pushState).toHaveBeenCalledWith(originState, '', '/dashboard/users/j%C3%A1n%20ov%C3%A1?highlight=3');
  });

  it('súhrn predošlého profilu sa zahodí', async () => {
    await renderDashboard();
    showForeignProfile();
    expect(routerProps().viewedUserSummary).toEqual(summary);

    await goToUserProfile({ identifier: '42' });

    expect(routerProps().viewedUserSummary).toBeNull();
  });

  it('krok z profilu na profil vymení ID za slug a naopak', async () => {
    await renderDashboard();

    await goToUserProfile({ identifier: '42' });
    expect(routerProps().viewedUserId).toBe(42);
    expect(routerProps().viewedUserSlug).toBeNull();

    await goToUserProfile({ identifier: 'peter-kovac' });
    expect(routerProps().viewedUserId).toBeNull();
    expect(routerProps().viewedUserSlug).toBe('peter-kovac');

    await goToUserProfile({ identifier: '43' });
    expect(routerProps().viewedUserId).toBe(43);
    expect(routerProps().viewedUserSlug).toBeNull();
  });

  it('nezapíše modul do localStorage', async () => {
    await renderDashboard();
    localStorage.clear();

    await goToUserProfile({ identifier: '42' });

    expect(localStorage.getItem('activeModule')).toBeNull();
  });

  it('odkaz na vlastný slug skončí na module profil', async () => {
    await renderDashboard();

    await goToUserProfile({ identifier: 'testuser' });

    expect(activeModule()).toBe('profile');
  });
});

describe('goToUserProfile: nový vstup do profilu', () => {
  it('označí vstup podľa ID a príznak je jednorazový', async () => {
    await renderDashboard();

    await goToUserProfile({ identifier: '42' });

    expect(takeProfileFreshEntry({ id: 42 })).toBe(true);
    expect(takeProfileFreshEntry({ id: 42 })).toBe(false);
  });

  it('označí vstup podľa slugu', async () => {
    await renderDashboard();

    await goToUserProfile({ identifier: 'jana-novak' });

    expect(takeProfileFreshEntry({ slug: 'jana-novak' })).toBe(true);
    expect(takeProfileFreshEntry({ slug: 'jana-novak' })).toBe(false);
  });

  it('príznak patrí len cieľovému profilu', async () => {
    await renderDashboard();

    await goToUserProfile({ identifier: '42' });

    expect(takeProfileFreshEntry({ id: 43 })).toBe(false);
  });

  it('ignorovaná udalosť vstup neoznačí', async () => {
    await renderDashboard();

    await goToUserProfile({ identifier: '   ' });

    expect(takeProfileFreshEntry({ id: 42 })).toBe(false);
  });
});

describe('goToUserProfile: zvýraznená ponuka', () => {
  it.each([
    ['číslo highlightId', { highlightId: 5 }, '?highlight=5', 5],
    ['reťazec highlightId', { highlightId: '7' }, '?highlight=7', 7],
    ['offerId', { offerId: 9 }, '?offer=9', 9],
    ['offerId má prednosť pred highlightId', { offerId: 9, highlightId: 5 }, '?offer=9', 9],
    ['reťazec offerId', { offerId: '11' }, '?offer=11', 11],
  ])('%s', async (_title, extra, query, expectedId) => {
    const pushState = spyPushState();
    await renderDashboard();

    await goToUserProfile({ identifier: 'jana-novak', ...extra });

    expect(pushState).toHaveBeenCalledWith(originState, '', `/dashboard/users/jana-novak${query}`);
    expect(routerProps().highlightedSkillId).toBe(expectedId);
    expect(sessionStorage.getItem('highlightedSkillId')).toBe(String(expectedId));
  });

  it('zapíše čas zvýraznenia do sessionStorage', async () => {
    await renderDashboard();
    const before = Date.now();

    await goToUserProfile({ identifier: 'jana-novak', highlightId: 5 });

    const stored = Number(sessionStorage.getItem('highlightedSkillTime'));
    expect(stored).toBeGreaterThanOrEqual(before);
    expect(stored).toBeLessThanOrEqual(Date.now());
  });

  it('zvýraznenie sa zapíše aj pri kroku z profilu na profil, keď sa modul nemení', async () => {
    await renderDashboard();
    await goToUserProfile({ identifier: 'peter-kovac' });
    expect(activeModule()).toBe('user-profile');
    sessionStorage.clear();
    const before = Date.now();

    await goToUserProfile({ identifier: 'jana-novak', highlightId: 5 });

    expect(routerProps().highlightedSkillId).toBe(5);
    expect(sessionStorage.getItem('highlightedSkillId')).toBe('5');
    expect(Number(sessionStorage.getItem('highlightedSkillTime'))).toBeGreaterThanOrEqual(before);
  });

  it.each([
    ['text', { highlightId: 'abc' }],
    ['desatinné číslo', { highlightId: 1.5 }],
    ['nula', { highlightId: 0 }],
    ['záporné číslo', { highlightId: -3 }],
    ['prázdny reťazec', { highlightId: '  ' }],
    ['null', { highlightId: null }],
    ['bez zvýraznenia', {}],
    ['offerId nula prebije platné highlightId', { offerId: 0, highlightId: 4 }],
  ])('neplatné zvýraznenie (%s) nepridá parameter a zruší predošlé', async (_title, extra) => {
    const pushState = spyPushState();
    await renderDashboard();
    await goToUserProfile({ identifier: 'peter-kovac', highlightId: 5 });
    expect(routerProps().highlightedSkillId).toBe(5);
    sessionStorage.clear();
    pushState.mockClear();

    await goToUserProfile({ identifier: 'jana-novak', ...extra });

    expect(pushState).toHaveBeenCalledWith(originState, '', '/dashboard/users/jana-novak');
    expect(routerProps().highlightedSkillId).toBeNull();
    expect(sessionStorage.getItem('highlightedSkillId')).toBeNull();
    expect(sessionStorage.getItem('highlightedSkillTime')).toBeNull();
  });

  it('nezapísateľný sessionStorage udalosť nezruší', async () => {
    const pushState = spyPushState();
    await renderDashboard();
    const originalSetItem = Storage.prototype.setItem;
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === 'highlightedSkillId' || key === 'highlightedSkillTime') throw new Error('quota');
      return originalSetItem.call(this, key, value);
    });

    await goToUserProfile({ identifier: 'jana-novak', highlightId: 5 });

    expect(activeModule()).toBe('user-profile');
    expect(routerProps().highlightedSkillId).toBe(5);
    expect(pushState).toHaveBeenCalledWith(originState, '', '/dashboard/users/jana-novak?highlight=5');
  });
});

describe('goToUserProfile: zatvorenie vedľajšieho rozhrania', () => {
  it('zatvorí panel hľadania', async () => {
    await renderDashboard();
    openSearch();
    expect(layoutProps().isSearchOpen).toBe(true);

    await goToUserProfile({ identifier: '42' });

    expect(layoutProps().isSearchOpen).toBe(false);
  });

  it('zatvorí panel upozornení', async () => {
    await renderDashboard();
    openNotificationsPanel();
    expect(layoutProps().isNotificationsPanelOpen).toBe(true);

    await goToUserProfile({ identifier: '42' });

    expect(layoutProps().isNotificationsPanelOpen).toBe(false);
  });

  it('zatvorí pravý panel a zruší vybranú položku', async () => {
    await renderDashboard(false, SETTINGS);
    openRightItem('account-settings');
    expect(layoutProps().isRightSidebarOpen).toBe(true);

    await goToUserProfile({ identifier: '42' });

    expect(layoutProps().isRightSidebarOpen).toBe(false);
    expect(layoutProps().activeRightItem).toBe('');
  });

  it('zatvorí mobilné menu', async () => {
    await renderDashboard(true, NOTIFICATIONS);
    act(() => layoutProps().onMobileBack());
    expect(mobileBlocked()).toBe(true);

    await goToUserProfile({ identifier: '42' });

    expect(activeModule()).toBe('user-profile');
    expect(mobileBlocked()).toBe(false);
  });
});

describe('goToUserProfile: ignorované udalosti', () => {
  it.each([
    ['bez detailu', new Event('goToUserProfile')],
    ['s prázdnym detailom', new CustomEvent('goToUserProfile', { detail: {} })],
    ['s medzerovým identifikátorom', new CustomEvent('goToUserProfile', { detail: { identifier: '   ' } })],
    ['s identifikátorom null', new CustomEvent('goToUserProfile', { detail: { identifier: null } })],
    ['s detailom null', new CustomEvent('goToUserProfile', { detail: null })],
  ])('udalosť %s nezmení nič', async (_title, event) => {
    const pushState = spyPushState();
    await renderDashboard();
    openSearch();

    await sendEvent(event);

    expect(activeModule()).toBe('home');
    expect(routerProps().viewedUserId).toBeNull();
    expect(routerProps().viewedUserSlug).toBeNull();
    expect(layoutProps().isSearchOpen).toBe(true);
    expect(pushState).not.toHaveBeenCalled();
    expect(currentUrl()).toBe('/dashboard');
  });
});

describe('goToMyProfile: vlastný profil', () => {
  it('prepne na modul profil a zahodí zobrazeného cudzieho používateľa', async () => {
    await renderDashboard();
    showForeignProfile();
    expect(routerProps().viewedUserId).toBe(55);
    expect(routerProps().viewedUserSlug).toBe('jana');
    expect(routerProps().viewedUserSummary).toEqual(summary);

    await goToMyProfile();

    expect(activeModule()).toBe('profile');
    expect(routerProps().viewedUserId).toBeNull();
    expect(routerProps().viewedUserSlug).toBeNull();
    expect(routerProps().viewedUserSummary).toBeNull();
  });

  it('pridá záznam histórie s adresou vlastného profilu a tá sa potom prepíše na slug', async () => {
    const pushState = spyPushState();
    await renderDashboard();

    await goToMyProfile();

    expect(pushState).toHaveBeenCalledTimes(1);
    expect(pushState).toHaveBeenCalledWith(originState, '', '/dashboard/profile');
    expect(currentUrl()).toBe('/dashboard/users/testuser');
    expect(readProfileOriginDepth(window.history.state)).toBe(0);
  });

  it('označí vstup ako nový pre vlastný profil a príznak je jednorazový', async () => {
    await renderDashboard();

    await goToMyProfile();

    expect(takeProfileFreshEntry({ id: 1 })).toBe(true);
    expect(takeProfileFreshEntry({ id: 1 })).toBe(false);
  });

  it('príznak nepatrí cudziemu profilu', async () => {
    await renderDashboard();

    await goToMyProfile();

    expect(takeProfileFreshEntry({ id: 55 })).toBe(false);
  });

  it('po zmene slugu používateľa označí vstup novým slugom', async () => {
    await renderDashboard();
    act(() => routerProps().onUserUpdate({ ...baseUser, slug: 'novy-slug' }));
    await settle();

    await goToMyProfile();

    expect(takeProfileFreshEntry({ slug: 'novy-slug' })).toBe(true);
  });

  it.each([
    ['číslo', { highlightId: 5 }, 5],
    ['reťazec', { highlightId: '8' }, 8],
  ])('platné zvýraznenie (%s) pridá parameter a zapíše ho', async (_title, detail, expectedId) => {
    const pushState = spyPushState();
    await renderDashboard();

    await goToMyProfile(detail);

    expect(pushState).toHaveBeenCalledWith(originState, '', `/dashboard/profile?highlight=${expectedId}`);
    expect(routerProps().highlightedSkillId).toBe(expectedId);
    expect(sessionStorage.getItem('highlightedSkillId')).toBe(String(expectedId));
    expect(Number(sessionStorage.getItem('highlightedSkillTime'))).toBeGreaterThan(0);
    expect(currentUrl()).toBe(`/dashboard/users/testuser?highlight=${expectedId}`);
  });

  it('zvýraznenie sa zapíše aj pri opakovanom vstupe do vlastného profilu, keď sa modul nemení', async () => {
    await renderDashboard();
    await goToMyProfile();
    expect(activeModule()).toBe('profile');
    sessionStorage.clear();
    const before = Date.now();

    await goToMyProfile({ highlightId: 5 });

    expect(routerProps().highlightedSkillId).toBe(5);
    expect(sessionStorage.getItem('highlightedSkillId')).toBe('5');
    expect(Number(sessionStorage.getItem('highlightedSkillTime'))).toBeGreaterThanOrEqual(before);
  });

  it.each([
    ['text', { highlightId: 'abc' }],
    ['desatinné číslo', { highlightId: 2.5 }],
    ['nula', { highlightId: 0 }],
    ['záporné číslo', { highlightId: -1 }],
    ['null', { highlightId: null }],
    ['offerId sa nepoužíva', { offerId: 9 }],
    ['bez zvýraznenia', {}],
    ['bez detailu', undefined],
  ])('neplatné zvýraznenie (%s) nepridá parameter a zruší predošlé', async (_title, detail) => {
    const pushState = spyPushState();
    await renderDashboard();
    await goToMyProfile({ highlightId: 5 });
    expect(routerProps().highlightedSkillId).toBe(5);
    sessionStorage.clear();
    pushState.mockClear();

    await goToMyProfile(detail);

    expect(pushState).toHaveBeenCalledWith(originState, '', '/dashboard/profile');
    expect(routerProps().highlightedSkillId).toBeNull();
    expect(sessionStorage.getItem('highlightedSkillId')).toBeNull();
    expect(sessionStorage.getItem('highlightedSkillTime')).toBeNull();
  });

  it('nezapísateľný sessionStorage udalosť nezruší', async () => {
    const pushState = spyPushState();
    await renderDashboard();
    const originalSetItem = Storage.prototype.setItem;
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === 'highlightedSkillId' || key === 'highlightedSkillTime') throw new Error('quota');
      return originalSetItem.call(this, key, value);
    });

    await goToMyProfile({ highlightId: 5 });

    expect(activeModule()).toBe('profile');
    expect(routerProps().highlightedSkillId).toBe(5);
    expect(pushState).toHaveBeenCalledWith(originState, '', '/dashboard/profile?highlight=5');
  });

  it('zatvorí panel hľadania a panel upozornení', async () => {
    await renderDashboard();
    openSearch();
    expect(layoutProps().isSearchOpen).toBe(true);

    await goToMyProfile();
    expect(layoutProps().isSearchOpen).toBe(false);

    openNotificationsPanel();
    expect(layoutProps().isNotificationsPanelOpen).toBe(true);

    await goToMyProfile();
    expect(layoutProps().isNotificationsPanelOpen).toBe(false);
  });

  it('zatvorí pravý panel a zruší vybranú položku', async () => {
    await renderDashboard(false, SETTINGS);
    openRightItem('account-settings');
    expect(layoutProps().isRightSidebarOpen).toBe(true);

    await goToMyProfile();

    expect(layoutProps().isRightSidebarOpen).toBe(false);
    expect(layoutProps().activeRightItem).toBe('');
  });

  it('zatvorí mobilné menu', async () => {
    await renderDashboard(true, NOTIFICATIONS);
    act(() => layoutProps().onMobileBack());
    expect(mobileBlocked()).toBe(true);

    await goToMyProfile();

    expect(activeModule()).toBe('profile');
    expect(mobileBlocked()).toBe(false);
  });
});

describe('odpojenie po odmountovaní', () => {
  it('odoberie počúvanie oboch udalostí a udalosti už nič nezmenia', async () => {
    const added = jest.spyOn(window, 'addEventListener');
    const removed = jest.spyOn(window, 'removeEventListener');
    const view = await renderDashboard();
    const handlersOf = (spy: jest.SpyInstance, type: string) =>
      spy.mock.calls.filter(([name]) => name === type).map(([, handler]) => handler);
    const userHandlers = handlersOf(added, 'goToUserProfile');
    const myHandlers = handlersOf(added, 'goToMyProfile');
    expect(userHandlers.length).toBeGreaterThan(0);
    expect(myHandlers.length).toBeGreaterThan(0);
    const pushState = spyPushState();

    view.unmount();

    expect(handlersOf(removed, 'goToUserProfile')).toEqual(expect.arrayContaining(userHandlers));
    expect(handlersOf(removed, 'goToMyProfile')).toEqual(expect.arrayContaining(myHandlers));
    await goToUserProfile({ identifier: '42' });
    await goToMyProfile();
    expect(pushState).not.toHaveBeenCalled();
    expect(takeProfileFreshEntry({ id: 42 })).toBe(false);
    expect(takeProfileFreshEntry({ id: 1 })).toBe(false);
  });
});
