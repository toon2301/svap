/**
 * Záložka vlastného profilu (`ownProfileTab`) z pohľadu `DashboardContent`:
 * s akou záložkou sa profil otvorí podľa adresy (stránkových props) a kedy sa
 * pri zmene props prevezme nová.
 *
 * Záložka z adresy platí len pre VLASTNÝ profil – pre cudzí sa ignoruje.
 * Vlastný profil sa pozná podľa slugu (po oreze medzier) alebo podľa ID.
 *
 * Testy idú cez vonkajšie rozhranie komponentu (props, ktoré dostane
 * `ModuleRouter`), takže nezávisia od toho, v ktorom súbore výpočet žije, a
 * musia prejsť nezmenené aj po rozdelení `DashboardContent.tsx`. Prvé
 * vykreslenie sa číta zo záznamu vykreslení `ModuleRouter` – inak by ho
 * prekryl efekt, ktorý záložku po mounte nastaví znova.
 */

import { act, render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ComponentProps } from 'react';
import Dashboard from '../Dashboard';
import type ModuleRouter from '../ModuleRouter';
import type { ProfileTab } from '../modules/profile/profileTypes';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider, __resetAuthBootstrapSnapshotForTests } from '@/contexts/AuthContext';
import type { User } from '@/types';

type ModuleRouterProps = ComponentProps<typeof ModuleRouter>;

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

let mockRouterProps: Record<string, unknown> | null = null;
let mockRenderedTabs: unknown[] = [];
jest.mock('../ModuleRouter', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    mockRouterProps = props;
    mockRenderedTabs.push(props.ownProfileTab);
    return <div data-testid="module-state" data-module={String(props.activeModule)} />;
  },
}));

jest.mock('../DashboardLayout', () => ({
  __esModule: true,
  default: (props: { children?: React.ReactNode }) => <div data-testid="layout">{props.children}</div>,
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
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => new URLSearchParams(),
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
const userWithoutSlug = { ...baseUser, slug: null } as unknown as User;
// Slug, ktorý vyzerá ako textová podoba chýbajúcej hodnoty, je platný slug.
const userSluggedNull = { ...baseUser, slug: 'null' } as User;
const userSluggedUndefined = { ...baseUser, slug: 'undefined' } as User;

const routerProps = () => mockRouterProps as unknown as ModuleRouterProps;
const ownProfileTab = () => routerProps().ownProfileTab;
const firstRenderedTab = () => mockRenderedTabs[0];

/** Stránkové props tak, ako ich dáva Next; `path` je adresa, pre ktorú platia. */
type Page = {
  route: string;
  path: string;
  tab?: ProfileTab;
  slug?: string | null;
  viewedUserId?: number | null;
};

/** Adresa, ktorú tabuľka trás nepozná – stránkové props sa preberú tak, ako sú. */
const UNMATCHED = '/dashboard/nezname';

let rerenderTree: ((ui: React.ReactElement) => void) | null = null;

const tree = (page: Page, user: User | null) => (
  <AuthProvider>
    <ThemeProvider>
      <Dashboard
        initialUser={user ?? undefined}
        initialRoute={page.route}
        initialProfileTab={page.tab}
        initialProfileSlug={page.slug}
        initialViewedUserId={page.viewedUserId}
      />
    </ThemeProvider>
  </AuthProvider>
);

async function renderDashboard(page: Page, user: User | null = baseUser) {
  mockPathname = page.path;
  window.history.replaceState(null, '', page.path);
  // Viacnásobný reťaz `await`ov v efektoch sa musí dobehnúť vnútri `act`,
  // inak ho RTL 13 zachytí mimo neho.
  await act(async () => {
    rerenderTree = render(tree(page, user)).rerender;
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  if (user) await waitFor(() => expect(mockRouterProps).not.toBeNull());
}

/** Stránka pošle nové props (navigácia v rámci tej istej stránky). */
async function changePage(page: Page, user: User | null = baseUser) {
  await act(async () => {
    rerenderTree?.(tree(page, user));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRouter.push.mockReset();
  __resetAuthBootstrapSnapshotForTests();
  localStorage.clear();
  sessionStorage.clear();
  mockRouterProps = null;
  mockRenderedTabs = [];
  rerenderTree = null;
  mockPathname = '/dashboard';
  window.history.replaceState(null, '', '/dashboard');
});

afterEach(() => {
  jest.restoreAllMocks();
});

const userProfilePage = (identifier: string, tab?: ProfileTab): Page => {
  const segment = { offers: 'skills', posts: 'posts', portfolio: 'portfolio' } as Record<string, string>;
  return {
    route: 'user-profile',
    path: tab ? `/dashboard/users/${identifier}/${segment[tab]}` : `/dashboard/users/${identifier}`,
    tab,
    slug: identifier,
    viewedUserId: /^\d+$/.test(identifier) ? Number(identifier) : null,
  };
};

describe('záložka pri otvorení profilu (prvé vykreslenie)', () => {
  const cases: ReadonlyArray<readonly [string, Page, User, ProfileTab]> = [
    ['vlastný profil podľa slugu, /posts', userProfilePage('testuser', 'posts'), baseUser, 'posts'],
    ['vlastný profil podľa slugu, /portfolio', userProfilePage('testuser', 'portfolio'), baseUser, 'portfolio'],
    ['vlastný profil podľa slugu, /skills', userProfilePage('testuser', 'offers'), baseUser, 'offers'],
    ['vlastný profil podľa ID v adrese', userProfilePage('1', 'posts'), baseUser, 'posts'],
    ['vlastný profil podľa ID, používateľ nemá slug', userProfilePage('1', 'portfolio'), userWithoutSlug, 'portfolio'],
    [
      'slug s okolitými medzerami sa pred porovnaním oreže',
      { route: 'user-profile', path: UNMATCHED, tab: 'posts', slug: '  testuser ', viewedUserId: null },
      baseUser,
      'posts',
    ],
    [
      'ID vlastného profilu platí aj pri cudzom slugu',
      { route: 'user-profile', path: UNMATCHED, tab: 'posts', slug: 'anna', viewedUserId: 1 },
      baseUser,
      'posts',
    ],
    [
      'slug vlastného profilu platí aj pri cudzom ID',
      { route: 'user-profile', path: UNMATCHED, tab: 'posts', slug: 'testuser', viewedUserId: 99 },
      baseUser,
      'posts',
    ],
    ['cudzí profil podľa slugu: záložka z adresy sa ignoruje', userProfilePage('anna', 'posts'), baseUser, 'offers'],
    ['cudzí profil podľa ID: záložka z adresy sa ignoruje', userProfilePage('99', 'portfolio'), baseUser, 'offers'],
    [
      'bez slugu aj ID v props sa profil za vlastný nepovažuje',
      { route: 'user-profile', path: UNMATCHED, tab: 'posts', slug: null, viewedUserId: null },
      baseUser,
      'offers',
    ],
    [
      'používateľ bez slugu a prázdny slug v props nie sú ten istý profil',
      { route: 'user-profile', path: UNMATCHED, tab: 'posts', slug: '', viewedUserId: null },
      userWithoutSlug,
      'offers',
    ],
    [
      'používateľ so slugom „null“ a stránka bez slugu (null) nie sú ten istý profil',
      { route: 'user-profile', path: UNMATCHED, tab: 'posts', slug: null, viewedUserId: null },
      userSluggedNull,
      'offers',
    ],
    [
      'používateľ so slugom „undefined“ a stránka bez slugu nie sú ten istý profil',
      { route: 'user-profile', path: UNMATCHED, tab: 'posts', viewedUserId: null },
      userSluggedUndefined,
      'offers',
    ],
    ['profil bez záložky v adrese: Ponuky', userProfilePage('testuser'), baseUser, 'offers'],
    [
      'iný modul so záložkou v props: Ponuky',
      { route: 'home', path: UNMATCHED, tab: 'posts', slug: 'testuser', viewedUserId: 1 },
      baseUser,
      'offers',
    ],
    [
      'vlastný profil (modul profile) so záložkou v props ju preberie',
      { route: 'profile', path: UNMATCHED, tab: 'posts' },
      baseUser,
      'posts',
    ],
    ['vlastný profil (modul profile) bez záložky: Ponuky', { route: 'profile', path: '/dashboard/profile' }, baseUser, 'offers'],
    [
      'vytvorenie portfólia: záložka Portfólio z adresy',
      { route: 'portfolio-create', path: '/dashboard/users/testuser/portfolio/create', tab: 'portfolio', slug: 'testuser' },
      baseUser,
      'portfolio',
    ],
    [
      'vytvorenie portfólia bez záložky: Ponuky',
      { route: 'portfolio-create', path: UNMATCHED },
      baseUser,
      'offers',
    ],
    [
      'detail portfólia: záložka Portfólio z adresy',
      { route: 'portfolio-detail', path: '/dashboard/users/testuser/portfolio/5', tab: 'portfolio', slug: 'testuser' },
      baseUser,
      'portfolio',
    ],
    [
      'detail portfólia bez záložky: Ponuky',
      { route: 'portfolio-detail', path: UNMATCHED },
      baseUser,
      'offers',
    ],
  ];

  it.each(cases)('%s', async (_label, page, user, expected) => {
    await renderDashboard(page, user);

    expect(firstRenderedTab()).toBe(expected);
    expect(ownProfileTab()).toBe(expected);
  });

  it('kým sa nenačíta používateľ (načítavanie), nespadne a nič nevykreslí', async () => {
    await renderDashboard(
      { route: 'user-profile', path: UNMATCHED, tab: 'posts', slug: 'testuser', viewedUserId: 1 },
      null,
    );

    expect(mockRenderedTabs).toEqual([]);
    expect(mockRouterProps).toBeNull();
  });
});

describe('záložka po zmene stránky (nové props na tej istej inštancii)', () => {
  it('vlastný profil podľa slugu: prevezme každú novú záložku z adresy', async () => {
    await renderDashboard(userProfilePage('testuser', 'offers'));
    expect(ownProfileTab()).toBe('offers');

    await changePage(userProfilePage('testuser', 'posts'));
    expect(ownProfileTab()).toBe('posts');

    await changePage(userProfilePage('testuser', 'portfolio'));
    expect(ownProfileTab()).toBe('portfolio');
  });

  it('vlastný profil podľa ID: prevezme novú záložku', async () => {
    await renderDashboard(userProfilePage('1', 'offers'), userWithoutSlug);

    await changePage(userProfilePage('1', 'posts'), userWithoutSlug);

    expect(ownProfileTab()).toBe('posts');
  });

  it('cudzí profil podľa slugu: záložka ostáva na Ponukách', async () => {
    await renderDashboard(userProfilePage('anna', 'offers'));

    await changePage(userProfilePage('anna', 'posts'));

    expect(routerProps().activeModule).toBe('user-profile');
    expect(ownProfileTab()).toBe('offers');
  });

  it('cudzí profil podľa ID: záložka ostáva na Ponukách', async () => {
    await renderDashboard(userProfilePage('99', 'offers'));

    await changePage(userProfilePage('99', 'portfolio'));

    expect(ownProfileTab()).toBe('offers');
  });

  it('slug s okolitými medzerami sa pred porovnaním oreže aj pri novej stránke', async () => {
    await renderDashboard(userProfilePage('anna', 'offers'));

    await changePage({ route: 'user-profile', path: UNMATCHED, tab: 'posts', slug: ' testuser  ', viewedUserId: null });

    expect(ownProfileTab()).toBe('posts');
  });

  it('prechod z cudzieho profilu na vlastný (zmení sa len identita): prevezme záložku z adresy', async () => {
    await renderDashboard(userProfilePage('anna', 'posts'));
    expect(ownProfileTab()).toBe('offers');

    await changePage(userProfilePage('testuser', 'posts'));

    expect(ownProfileTab()).toBe('posts');
  });

  it('zmena samotného ID profilu na vlastné prevezme záložku z adresy', async () => {
    const foreign: Page = { route: 'user-profile', path: UNMATCHED, tab: 'posts', slug: 'anna', viewedUserId: 99 };
    await renderDashboard(foreign);
    expect(ownProfileTab()).toBe('offers');

    await changePage({ ...foreign, viewedUserId: 1 });

    expect(ownProfileTab()).toBe('posts');
  });

  it('príchod na profil z inej sekcie (zmení sa len modul) prevezme záložku z adresy', async () => {
    const elsewhere: Page = { route: 'home', path: UNMATCHED, tab: 'posts', slug: 'testuser', viewedUserId: null };
    await renderDashboard(elsewhere);
    expect(ownProfileTab()).toBe('offers');

    await changePage({ ...elsewhere, route: 'user-profile' });

    expect(ownProfileTab()).toBe('posts');
  });

  it('záložku, ktorú si používateľ prepol sám, adresa hneď neprepíše', async () => {
    await renderDashboard(userProfilePage('testuser', 'posts'));
    expect(ownProfileTab()).toBe('posts');

    act(() => routerProps().onOwnProfileTabChange?.('portfolio'));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(ownProfileTab()).toBe('portfolio');
  });

  it('nová stránka bez záložky vlastnú záložku nemení', async () => {
    await renderDashboard(userProfilePage('testuser', 'posts'));
    expect(ownProfileTab()).toBe('posts');

    await changePage(userProfilePage('testuser'));

    expect(routerProps().activeModule).toBe('profile');
    expect(ownProfileTab()).toBe('posts');
  });

  it('nová stránka iného modulu než profil so záložkou vlastnú záložku nemení', async () => {
    await renderDashboard(userProfilePage('testuser', 'offers'));

    await changePage({ route: 'profile', path: UNMATCHED, tab: 'posts', slug: 'testuser', viewedUserId: 1 });

    expect(routerProps().activeModule).toBe('profile');
    expect(ownProfileTab()).toBe('offers');
  });
});
