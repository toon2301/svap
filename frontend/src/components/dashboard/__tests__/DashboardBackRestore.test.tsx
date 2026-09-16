/**
 * Krok späť v dashboarde: modul podľa ADRESY, nie podľa toho, čo bolo predtým.
 *
 * Dva druhy kroku späť, obe zlyhávali na tých istých adresách:
 *  - cez hranicu Next stránky – dashboard sa namountuje nanovo s props stránky,
 *    ktorej strom záznam nesie (`pushState` zdedí strom aktuálnej stránky),
 *  - v rámci tej istej stránky – beží len `popstate` a modul prepína
 *    `syncModuleFromPath`.
 *
 * Obe cesty teraz čítajú tú istú tabuľku (`DASHBOARD_ROUTES`), preto ich test
 * drží spolu. `ModuleRouter` je nahradený výpisom stavu, aby bolo vidieť presne
 * modul, pravú sekciu a stav panela.
 */

import type { ReactElement } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Dashboard from '../Dashboard';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider, __resetAuthBootstrapSnapshotForTests } from '@/contexts/AuthContext';
import { withDesktopSettingsHistory } from '../hooks/desktopSettingsNavigation';
import type { User } from '@/types';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../ModuleRouter', () => ({
  __esModule: true,
  default: (props: { activeModule: string; activeRightItem: string; isRightSidebarOpen: boolean }) => (
    <div
      data-testid="module-state"
      data-module={props.activeModule}
      data-right-item={props.isRightSidebarOpen ? props.activeRightItem : ''}
    />
  ),
}));

let mockPathname = '/dashboard';
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => mockPathname,
}));

jest.mock('@/utils/auth', () => ({
  isAuthenticated: jest.fn(() => true),
  clearAuthState: jest.fn(),
}));

jest.mock('@/utils/csrf', () => ({
  fetchCsrfToken: jest.fn(),
  hasCsrfToken: jest.fn(() => true),
}));

jest.mock('@/lib/api', () => ({
  api: { get: jest.fn(() => new Promise(() => {})), post: jest.fn() },
  endpoints: {
    auth: { me: '/auth/me/', logout: '/auth/logout/', login: '/auth/login/', register: '/auth/register/' },
    dashboard: {
      userProfileBySlug: (slug: string) => `/profile/slug/${slug}/`,
      userProfile: (id: number) => `/profile/${id}/`,
    },
  },
  invalidateSession: jest.fn(),
  isTransientAuthFailureError: jest.fn(() => false),
  setMayHaveRefreshCookie: jest.fn(),
}));

const user = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  slug: 'testuser',
  user_type: 'individual',
  is_verified: true,
  is_public: true,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
} as User;

/** Stránka, na ktorej záznam vznikol – jej props nesie obnovený strom. */
const FEED_PAGE = { initialRoute: 'home' };

type Shown = { module: string; rightItem: string };

function setViewport(desktop: boolean) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: desktop ? 1280 : 390 });
  (window as unknown as { matchMedia: unknown }).matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches: !desktop,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
}

function settingsMarker() {
  return withDesktopSettingsHistory(null, { moduleId: 'home', url: '/dashboard' });
}

function renderDashboard(ui: ReactElement) {
  return render(<AuthProvider><ThemeProvider>{ui}</ThemeProvider></AuthProvider>);
}

function shown(): Shown {
  const node = screen.getByTestId('module-state');
  return {
    module: node.getAttribute('data-module') ?? '',
    rightItem: node.getAttribute('data-right-item') ?? '',
  };
}

/** Počká, kým sa dashboard ustáli na očakávanom module. */
async function waitForModule(expected: string): Promise<Shown> {
  await waitFor(() => expect(shown().module).toBe(expected));
  return shown();
}

/** Krok späť cez hranicu stránky: nový mount s props obnovenej stránky. */
async function backAcrossPages(
  url: string,
  marker: boolean,
  expected: string,
  options: { rightItem?: string; pageProps?: typeof FEED_PAGE } = {},
) {
  window.history.replaceState(marker ? settingsMarker() : null, '', url);
  mockPathname = url;
  const view = renderDashboard(
    <Dashboard initialUser={user} {...(options.pageProps ?? FEED_PAGE)} />,
  );
  const state = await waitForModule(expected);
  // Pravú sekciu treba overiť ešte pred odmountovaním.
  if (options.rightItem !== undefined) {
    await waitFor(() => expect(shown().rightItem).toBe(options.rightItem));
  }
  view.unmount();
  return state;
}

/** Krok späť v rámci tej istej stránky: len `popstate` na už bežiacom dashboarde. */
async function backWithinPage(url: string, marker: boolean, expected: string) {
  window.history.replaceState(null, '', '/dashboard');
  mockPathname = '/dashboard';
  const view = renderDashboard(<Dashboard initialUser={user} {...FEED_PAGE} />);
  await waitForModule('home');

  window.history.replaceState(marker ? settingsMarker() : null, '', url);
  act(() => {
    window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
  });
  const state = await waitForModule(expected);
  view.unmount();
  return state;
}

beforeEach(() => {
  jest.clearAllMocks();
  __resetAuthBootstrapSnapshotForTests();
  setViewport(true);
  mockPathname = '/dashboard';
});

type Case = {
  name: string;
  url: string;
  desktop: boolean;
  marker?: boolean;
  /** Modul po kroku späť cez hranicu stránky aj v rámci tej istej stránky. */
  module: string;
  /** Pravá sekcia po mounte (v rámci stránky ju `popstate` nerieši). */
  rightItemOnMount?: string;
};

/** Dvanásť adries z mapovania, ktoré predtým dávali modul predošlej obrazovky. */
const MISSING_BEFORE: Case[] = [
  { name: 'Obľúbené', url: '/dashboard/favorites', desktop: false, module: 'favorites' },
  { name: 'Upozornenia (mobil)', url: '/dashboard/notifications', desktop: false, module: 'notifications' },
  { name: 'Nastavenia (mobil)', url: '/dashboard/settings', desktop: false, module: 'settings' },
  { name: 'Nastavenia (desktop, marker)', url: '/dashboard/settings', desktop: true, marker: true, module: 'settings', rightItemOnMount: 'edit-profile' },
  { name: 'Sledované ponuky (desktop, marker)', url: '/dashboard/settings/watches', desktop: true, marker: true, module: 'settings', rightItemOnMount: 'offer-watches' },
  { name: 'Sledované ponuky (mobil)', url: '/dashboard/settings/watches', desktop: false, module: 'settings' },
  { name: 'Jazyk (mobil)', url: '/dashboard/language', desktop: false, module: 'language' },
  { name: 'Jazyk (desktop, marker)', url: '/dashboard/language', desktop: true, marker: true, module: 'settings', rightItemOnMount: 'language' },
  { name: 'Typ účtu (mobil)', url: '/dashboard/account-type', desktop: false, module: 'account-type' },
  { name: 'Súkromie (mobil)', url: '/dashboard/privacy', desktop: false, module: 'privacy' },
  { name: 'Súkromie (desktop, marker)', url: '/dashboard/privacy', desktop: true, marker: true, module: 'settings', rightItemOnMount: 'privacy' },
  { name: 'Zručnosti', url: '/dashboard/skills', desktop: false, module: 'skills' },
  { name: 'Zručnosti – ponúkam', url: '/dashboard/skills/offer', desktop: false, module: 'skills-offer' },
  { name: 'Zručnosti – hľadám', url: '/dashboard/skills/search', desktop: false, module: 'skills-search' },
  { name: 'Štatistiky (mobil)', url: '/dashboard/statistics', desktop: false, module: 'statistics' },
  { name: 'Úprava vlastného profilu', url: '/dashboard/users/testuser/edit', desktop: true, module: 'profile', rightItemOnMount: 'edit-profile' },
];

describe('adresy, ktoré mapovanie doteraz nepoznalo', () => {
  it.each(MISSING_BEFORE.map((c) => [c.name, c]))('%s – Späť cez hranicu stránky', async (_n, c) => {
    const kase = c as Case;
    setViewport(kase.desktop);

    const state = await backAcrossPages(kase.url, Boolean(kase.marker), kase.module, {
      rightItem: kase.rightItemOnMount,
    });

    expect(state.module).toBe(kase.module);
  });

  it.each(MISSING_BEFORE.map((c) => [c.name, c]))('%s – Späť v rámci tej istej stránky', async (_n, c) => {
    const kase = c as Case;
    setViewport(kase.desktop);

    const state = await backWithinPage(kase.url, Boolean(kase.marker), kase.module);

    expect(state.module).toBe(kase.module);
  });
});

/** Adresy, ktoré mapovanie poznalo aj predtým – nesmú sa zmeniť. */
const ALREADY_WORKING: Array<[string, string, string]> = [
  ['Nástenka', '/dashboard', 'home'],
  ['Vyhľadávanie', '/dashboard/search', 'search'],
  ['Správy', '/dashboard/messages', 'messages'],
  ['Spolupráce', '/dashboard/requests', 'requests'],
  ['vlastný profil', '/dashboard/profile', 'profile'],
  ['cudzí profil', '/dashboard/users/jana', 'user-profile'],
  ['tvorba portfólia', '/dashboard/users/jana/portfolio/create', 'portfolio-create'],
  ['sekcia Nastavení', '/dashboard/settings/notifications', 'notification-settings'],
];

describe('predtým namapované adresy ostávajú', () => {
  it.each(ALREADY_WORKING)('%s – Späť cez hranicu stránky', async (_n, url, module) => {
    setViewport(false);

    expect((await backAcrossPages(url, false, module)).module).toBe(module);
  });

  it.each(ALREADY_WORKING)('%s – Späť v rámci tej istej stránky', async (_n, url, module) => {
    setViewport(false);

    expect((await backWithinPage(url, false, module)).module).toBe(module);
  });

  it('desktopová sekcia Nastavení sa obnoví aj s pravým panelom', async () => {
    setViewport(true);

    await backAcrossPages('/dashboard/settings/notifications', true, 'settings', {
      rightItem: 'notifications',
    });
  });
});

describe('scenáre z predošlého kola', () => {
  it('vlastný profil cez hranicu stránky', async () => {
    setViewport(true);

    expect((await backAcrossPages('/dashboard/users/testuser', false, 'profile')).module).toBe('profile');
  });

  it('cudzí profil cez hranicu stránky ostáva cudzím profilom', async () => {
    setViewport(true);

    expect((await backAcrossPages('/dashboard/users/jana', false, 'user-profile')).module).toBe('user-profile');
  });

  it('záznam Nástenky obnovený na stránke profilu je Nástenka', async () => {
    setViewport(true);

    const state = await backAcrossPages('/dashboard', false, 'home', {
      pageProps: {
        initialRoute: 'user-profile',
        initialProfileSlug: 'jana',
        initialViewedUserId: null,
      } as typeof FEED_PAGE,
    });

    expect(state.module).toBe('home');
  });
});
