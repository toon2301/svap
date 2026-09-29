/**
 * Šípka späť v hornej lište (`onMobileBack` pre `DashboardLayout`) z pohľadu
 * `DashboardContent`: podľa aktívneho modulu sa vyberie obsluha návratu
 * (kategórie zručností, popis zručnosti, recenzie ponuky, ostatné moduly).
 *
 * Testy idú cez vonkajšie rozhranie komponentu (props, ktoré dostane
 * `ModuleRouter` a `DashboardLayout`, adresa a história prehliadača), takže
 * nezávisia od toho, v ktorom súbore obsluhy žijú, a musia prejsť nezmenené aj
 * po rozdelení `DashboardContent.tsx`. Detailné vetvy samotného
 * `handleMobileBack` (hook `useDashboardState`) sa tu nepreberajú – overuje sa
 * výber obsluhy a údaje, ktoré jej `DashboardContent` podáva.
 */

import { act, render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ComponentProps } from 'react';
import Dashboard from '../Dashboard';
import type ModuleRouter from '../ModuleRouter';
import type DashboardLayout from '../DashboardLayout';
import { setSkillsDescribeProfileReturn } from '../modules/skills/skillsDescribeReturnSession';
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
  isMobile = true,
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
  mockPathname = '/dashboard';
  mockSearchParams = new URLSearchParams();
  window.history.replaceState(null, '', '/dashboard');
});

afterEach(() => {
  jest.restoreAllMocks();
});

const goTo = (moduleId: string) => act(() => routerProps().setActiveModule(moduleId));
const pressBack = () => act(() => layoutProps().onMobileBack?.());
const openSearchPanel = () => act(() => layoutProps().onSidebarSearchClick?.());

const REVIEWS_ENTRY = (search: string) => ({
  route: 'offer-reviews',
  pathname: '/dashboard/offers/3/reviews',
  search,
});

describe('kategórie zručností (skills-select-category)', () => {
  it('šípka zavolá obsluhu, ktorú si zaregistrovala obrazovka kategórií, a modul nemení', async () => {
    await renderDashboard();
    goTo('skills-select-category');
    const categoryBack = jest.fn();
    act(() => routerProps().onSkillsCategoryBackHandlerSet?.(categoryBack));

    pressBack();

    expect(categoryBack).toHaveBeenCalledTimes(1);
    expect(activeModule()).toBe('skills-select-category');
  });

  it('platí posledná zaregistrovaná obsluha', async () => {
    await renderDashboard();
    goTo('skills-select-category');
    const first = jest.fn();
    const second = jest.fn();
    act(() => routerProps().onSkillsCategoryBackHandlerSet?.(first));
    act(() => routerProps().onSkillsCategoryBackHandlerSet?.(second));

    pressBack();

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('každé stlačenie šípky zavolá obsluhu znova', async () => {
    await renderDashboard();
    goTo('skills-select-category');
    const categoryBack = jest.fn();
    act(() => routerProps().onSkillsCategoryBackHandlerSet?.(categoryBack));

    pressBack();
    pressBack();

    expect(categoryBack).toHaveBeenCalledTimes(2);
  });

  it('bez zaregistrovanej obsluhy ide bežný návrat: späť na Ponúkam', async () => {
    await renderDashboard();
    goTo('skills-select-category');

    pressBack();

    expect(activeModule()).toBe('skills-offer');
  });

  it('bez zaregistrovanej obsluhy rešpektuje uložený režim „hľadám“', async () => {
    await renderDashboard();
    localStorage.setItem('skillsDescribeMode', 'search');
    goTo('skills-select-category');

    pressBack();

    expect(activeModule()).toBe('skills-search');
  });

  it('zaregistrovaná obsluha nemá vplyv na iné moduly', async () => {
    await renderDashboard();
    const categoryBack = jest.fn();
    act(() => routerProps().onSkillsCategoryBackHandlerSet?.(categoryBack));
    goTo('skills-offer');

    pressBack();

    expect(categoryBack).not.toHaveBeenCalled();
    expect(activeModule()).toBe('skills');
  });
});

describe('popis zručnosti (skills-describe)', () => {
  const skill = { id: 5, category: 'Doučovanie', subcategory: 'Matematika' };

  it('návrat vedie na profil, ak sa do popisu vošlo z karty s rovnakým ID', async () => {
    await renderDashboard();
    goTo('skills-describe');
    act(() => routerProps().setSelectedSkillsCategory(skill));
    setSkillsDescribeProfileReturn(5);

    pressBack();

    expect(activeModule()).toBe('profile');
  });

  it('návratový cieľ pre inú kartu sa ignoruje (ide sa podľa režimu, predvolene Ponúkam)', async () => {
    await renderDashboard();
    goTo('skills-describe');
    act(() => routerProps().setSelectedSkillsCategory({ ...skill, id: 6 }));
    setSkillsDescribeProfileReturn(5);

    pressBack();

    expect(activeModule()).toBe('skills-offer');
  });

  it('nová karta bez ID nemá návratový cieľ na profil', async () => {
    await renderDashboard();
    goTo('skills-describe');
    act(() => routerProps().setSelectedSkillsCategory({ category: 'Doučovanie', subcategory: 'Matematika' }));
    setSkillsDescribeProfileReturn(5);

    pressBack();

    expect(activeModule()).toBe('skills-offer');
  });

  it('bez vybranej karty sa návratový cieľ na profil nepoužije', async () => {
    await renderDashboard();
    goTo('skills-describe');
    setSkillsDescribeProfileReturn(5);

    pressBack();

    expect(activeModule()).toBe('skills-offer');
  });

  it.each([
    ['search', 'skills-search'],
    ['offer', 'skills-offer'],
  ] as const)('bez návratového cieľa vedie šípka podľa uloženého režimu „%s“', async (mode, target) => {
    await renderDashboard();
    localStorage.setItem('skillsDescribeMode', mode);
    goTo('skills-describe');
    act(() => routerProps().setSelectedSkillsCategory(skill));

    pressBack();

    expect(activeModule()).toBe(target);
  });

  it('zaregistrovaná obsluha kategórií sa v popise zručnosti nevolá', async () => {
    await renderDashboard();
    const categoryBack = jest.fn();
    act(() => routerProps().onSkillsCategoryBackHandlerSet?.(categoryBack));
    goTo('skills-describe');

    pressBack();

    expect(categoryBack).not.toHaveBeenCalled();
    expect(activeModule()).toBe('skills-offer');
  });
});

describe('recenzie ponuky (offer-reviews)', () => {
  it.each([
    ['/dashboard/requests', 'requests'],
    ['/dashboard/favorites', 'favorites'],
    ['/dashboard/search', 'search'],
  ] as const)('šípka s návratovou adresou „%s“ otvorí modul „%s“', async (returnTo, target) => {
    await renderDashboard(true, REVIEWS_ENTRY(`returnTo=${encodeURIComponent(returnTo)}`));

    pressBack();

    expect(activeModule()).toBe(target);
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it('návratová adresa s parametrami sa odovzdá celá (cieľ zo žiadostí)', async () => {
    await renderDashboard(true, REVIEWS_ENTRY(`returnTo=${encodeURIComponent('/dashboard/requests?tab=sent&status=active')}`));

    pressBack();

    expect(activeModule()).toBe('requests');
    expect(routerProps().requestsRouteIntent).toMatchObject({ statusTab: 'active', tab: 'sent' });
  });

  it('bez návratovej adresy ide o krok späť v histórii prehliadača', async () => {
    await renderDashboard(true, REVIEWS_ENTRY(''));

    pressBack();

    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    expect(activeModule()).toBe('offer-reviews');
  });

  it.each([
    ['absolútna adresa', 'https://evil.example/dashboard/requests'],
    ['adresa bez protokolu', '//evil.example/dashboard/requests'],
    ['adresa mimo dashboardu', '/settings'],
    ['adresa s podobným začiatkom', '/dashboardevil'],
    ['prázdna adresa', ''],
    ['samé medzery', '   '],
  ])('nebezpečná návratová adresa (%s) sa nepoužije: krok späť v histórii', async (_label, returnTo) => {
    await renderDashboard(true, REVIEWS_ENTRY(`returnTo=${encodeURIComponent(returnTo)}`));

    pressBack();

    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    expect(activeModule()).toBe('offer-reviews');
  });

  it('návratová adresa sa číta z aktuálnych parametrov adresy, nie len z tých pri načítaní', async () => {
    await renderDashboard(true, REVIEWS_ENTRY(''));
    mockSearchParams = new URLSearchParams(`returnTo=${encodeURIComponent('/dashboard/requests')}`);
    openSearchPanel();

    pressBack();

    expect(activeModule()).toBe('requests');
    expect(mockRouter.back).not.toHaveBeenCalled();
  });
});

describe('ostatné moduly ide bežným návratom', () => {
  it.each([
    ['skills-offer', 'skills'],
    ['skills-search', 'skills'],
    ['skills', 'profile'],
    ['favorites', 'home'],
  ] as const)('z modulu „%s“ vedie šípka na „%s“', async (from, target) => {
    await renderDashboard();
    goTo(from);

    pressBack();

    expect(activeModule()).toBe(target);
  });
});
