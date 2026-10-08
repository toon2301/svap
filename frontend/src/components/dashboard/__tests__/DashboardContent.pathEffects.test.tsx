/**
 * Modul a ID, ktoré dashboard odvodí zo samotnej adresy (`usePathname`):
 * recenzie ponuky, detail a tvorba položky portfólia a detail príspevku
 * (na desktope okno nad Nástenkou, na mobile celá stránka).
 *
 * Adresa sa mení po mounte (klientská navigácia bez reloadu), takže testy
 * najprv namountujú dashboard a potom prepíšu cestu z routera. Priamy vstup
 * (odkaz, F5) je namountovanie rovno na adrese.
 *
 * Testy idú cez vonkajšie rozhranie komponentu (props, ktoré dostane
 * ModuleRouter, okno príspevku a skutočná história prehliadača), takže
 * nezávisia od toho, v ktorom súbore sa efekty zložia, a musia prejsť
 * nezmenené aj po rozdelení `DashboardContent.tsx`.
 */

import { act, render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ComponentProps } from 'react';
import Dashboard from '../Dashboard';
import type ModuleRouter from '../ModuleRouter';
import { useFeedPostOverlay } from '../contexts/FeedPostOverlayContext';
import { isFeedOverlayHistoryBusy, resetFeedOverlayHistory } from '../modules/feed/feedOverlayHistory';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider, __resetAuthBootstrapSnapshotForTests } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import type { User } from '@/types';

type ModuleRouterProps = ComponentProps<typeof ModuleRouter>;
type DashboardProps = ComponentProps<typeof Dashboard>;
type OverlayApi = NonNullable<ReturnType<typeof useFeedPostOverlay>>;

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

let mockRouterProps: Record<string, unknown> | null = null;
let mockModuleRenders: string[] = [];
let mockOverlayApi: ReturnType<typeof useFeedPostOverlay> = null;
jest.mock('../ModuleRouter', () => ({
  __esModule: true,
  default: function MockModuleRouter(props: Record<string, unknown>) {
    mockRouterProps = props;
    mockModuleRenders.push(String(props.activeModule));
    // Odberateľ kontextu v strome pod dashboardom – ako karta príspevku vo feede.
    mockOverlayApi = useFeedPostOverlay();
    return <div data-testid="module-state" data-module={String(props.activeModule)} />;
  },
}));

jest.mock('../DashboardLayout', () => ({
  __esModule: true,
  default: (props: { children?: React.ReactNode }) => <div data-testid="layout">{props.children}</div>,
}));

jest.mock('../DashboardModals', () => ({ __esModule: true, default: () => null }));

type OverlayMockProps = { postId: number; highlightCommentId: number | null; onClose: () => void };
let mockOverlayProps: OverlayMockProps | null = null;
let mockOverlayRenders = 0;
jest.mock('../modules/feed/FeedPostDetailOverlay', () => ({
  __esModule: true,
  default: function MockFeedPostDetailOverlay(props: OverlayMockProps) {
    mockOverlayProps = props;
    mockOverlayRenders += 1;
    // Chybná obsluha adresy by okno otvárala dokola; výnimka zlyhá rýchlo
    // namiesto nekonečného cyklu, ktorý by test nedokázal prerušiť.
    if (mockOverlayRenders > 50) throw new Error('Okno príspevku sa prekresľuje v slučke');
    return <div data-testid="feed-overlay" data-post-id={props.postId} />;
  },
}));

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
const activeModule = () => routerProps().activeModule;
const overlayApi = () => mockOverlayApi as OverlayApi;
const overlayProps = () => mockOverlayProps as OverlayMockProps;
const isOverlayOpen = () => document.querySelector('[data-testid="feed-overlay"]') !== null;
const currentUrl = () => window.location.pathname + window.location.search;

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

/**
 * Zmena viewportu za behu: media query zmení `matches` a zavolá poslucháča `change`,
 * ktorý si zaregistrovala (`useIsMobileState`). `window.innerWidth` sa mení spolu s ňou.
 */
function flipViewport(isMobile: boolean) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: isMobile ? MOBILE_WIDTH : DESKTOP_WIDTH,
  });
  act(() => {
    (window.matchMedia as jest.Mock).mock.results.forEach((result) => {
      const mediaQuery = result.value as { matches: boolean; media: string; addEventListener: jest.Mock };
      if (!mediaQuery.media.includes('max-width: 1023px')) return;
      mediaQuery.matches = isMobile;
      mediaQuery.addEventListener.mock.calls
        .filter(([type]) => type === 'change')
        .forEach(([, listener]) => listener());
    });
  });
}

const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

type Entry = { route: string; pathname: string; search: string; props?: Partial<DashboardProps> };
const HOME: Entry = { route: 'home', pathname: '/dashboard', search: '' };
const SETTINGS: Entry = { route: 'settings', pathname: '/dashboard/settings', search: '' };
const REVIEWS_3: Entry = {
  route: 'offer-reviews',
  pathname: '/dashboard/offers/3/reviews',
  search: '',
  props: { initialOfferId: 3 },
};
const PORTFOLIO_12: Entry = {
  route: 'portfolio-detail',
  pathname: '/dashboard/users/jana/portfolio/12',
  search: '',
  props: { initialProfileSlug: 'jana', initialProfileTab: 'portfolio', initialPortfolioItemId: 12 },
};
const PORTFOLIO_CREATE: Entry = {
  route: 'portfolio-create',
  pathname: '/dashboard/users/jana/portfolio/create',
  search: '',
  props: { initialProfileSlug: 'jana', initialProfileTab: 'portfolio' },
};
const FEED_7: Entry = {
  route: 'feed-post-detail',
  pathname: '/dashboard/feed/7',
  search: '',
  props: { initialFeedPostId: 7 },
};

let mountedEntry: Entry = HOME;

const dashboardTree = (entry: Entry) => (
  <AuthProvider>
    <ThemeProvider>
      <Dashboard initialUser={baseUser} initialRoute={entry.route} {...entry.props} />
    </ThemeProvider>
  </AuthProvider>
);

const urlOf = (pathname: string, search: string) => (search ? `${pathname}?${search}` : pathname);

async function renderDashboard(isMobile = false, entry: Entry = HOME, expectedModule = entry.route) {
  mountedEntry = entry;
  mockPathname = entry.pathname;
  mockSearchParams = new URLSearchParams(entry.search);
  window.history.replaceState(null, '', urlOf(entry.pathname, entry.search));
  installViewport(isMobile);
  let view!: ReturnType<typeof render>;
  // Viacnásobný reťaz `await`ov v efektoch sa musí dobehnúť vnútri `act`,
  // inak ho RTL 13 zachytí mimo neho.
  await act(async () => {
    view = render(dashboardTree(entry));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  await waitFor(() => expect(activeModule()).toBe(expectedModule));
  await settle();
  return view;
}

/**
 * Klientská navigácia bez reloadu: router dostane novú cestu, stránka
 * (props) ostáva tá istá. `liveUrl: false` = router je o krok pred skutočnou
 * adresou v prehliadači (po `replaceState` ho Next dorovnáva až v transition).
 */
async function navigateTo(
  view: ReturnType<typeof render>,
  pathname: string,
  search = '',
  { liveUrl = true }: { liveUrl?: boolean } = {},
) {
  mockPathname = pathname;
  mockSearchParams = new URLSearchParams(search);
  if (liveUrl) window.history.replaceState(null, '', urlOf(pathname, search));
  await act(async () => {
    view.rerender(dashboardTree(mountedEntry));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRouter.push.mockReset();
  (api.get as jest.Mock).mockImplementation(() => new Promise(() => {}));
  __resetAuthBootstrapSnapshotForTests();
  resetFeedOverlayHistory();
  localStorage.clear();
  sessionStorage.clear();
  mockRouterProps = null;
  mockOverlayApi = null;
  mockOverlayProps = null;
  mockOverlayRenders = 0;
  mockModuleRenders = [];
  mountedEntry = HOME;
  mockPathname = '/dashboard';
  mockSearchParams = new URLSearchParams();
  window.history.replaceState(null, '', '/dashboard');
});

afterEach(() => {
  jest.restoreAllMocks();
  resetFeedOverlayHistory();
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: originalInnerWidth,
  });
});

describe('recenzie ponuky podľa adresy', () => {
  it('priamy vstup na adresu recenzií ukáže recenzie danej ponuky', async () => {
    await renderDashboard(false, REVIEWS_3);

    expect(activeModule()).toBe('offer-reviews');
    expect(routerProps().offerIdForReviews).toBe(3);
  });

  it('preklik na adresu recenzií prepne modul a vezme ID z adresy', async () => {
    const view = await renderDashboard();
    expect(routerProps().offerIdForReviews).toBeNull();

    await navigateTo(view, '/dashboard/offers/3/reviews');

    expect(activeModule()).toBe('offer-reviews');
    expect(routerProps().offerIdForReviews).toBe(3);
  });

  it('zmena ID v adrese podá ModuleRouteru nové ID', async () => {
    const view = await renderDashboard();
    await navigateTo(view, '/dashboard/offers/3/reviews');

    await navigateTo(view, '/dashboard/offers/8/reviews');

    expect(activeModule()).toBe('offer-reviews');
    expect(routerProps().offerIdForReviews).toBe(8);
  });

  it('koncové lomítko adresy nevadí', async () => {
    const view = await renderDashboard();

    await navigateTo(view, '/dashboard/offers/3/reviews/');

    expect(activeModule()).toBe('offer-reviews');
    expect(routerProps().offerIdForReviews).toBe(3);
  });

  it('ID z props stránky má prednosť pred ID z adresy', async () => {
    const view = await renderDashboard(false, REVIEWS_3);

    await navigateTo(view, '/dashboard/offers/8/reviews');

    expect(routerProps().offerIdForReviews).toBe(3);
  });

  it('po odchode z adresy recenzií ModuleRouter ponuku už nedostane', async () => {
    const view = await renderDashboard();
    await navigateTo(view, '/dashboard/offers/3/reviews');

    await navigateTo(view, '/dashboard');

    expect(routerProps().offerIdForReviews).toBeNull();
  });

  it.each([
    ['ponuka bez recenzií', '/dashboard/offers/3'],
    ['ID nie je číslo', '/dashboard/offers/abc/reviews'],
    ['ďalší segment za recenziami', '/dashboard/offers/3/reviews/extra'],
    ['predpona pred adresou', '/x/dashboard/offers/3/reviews'],
  ])('adresa, ktorá nie je adresou recenzií (%s), modul nezmení', async (_title, pathname) => {
    const view = await renderDashboard();

    await navigateTo(view, pathname);

    expect(activeModule()).toBe('home');
    expect(routerProps().offerIdForReviews).toBeNull();
  });
});

describe('detail položky portfólia podľa adresy', () => {
  it('priamy vstup na adresu detailu ukáže položku a jej vlastníka', async () => {
    await renderDashboard(false, PORTFOLIO_12);

    expect(activeModule()).toBe('portfolio-detail');
    expect(routerProps().portfolioItemIdForDetail).toBe(12);
    expect(routerProps().portfolioOwnerIdentifier).toBe('jana');
  });

  it('preklik na adresu detailu prepne modul a vezme položku aj vlastníka z adresy', async () => {
    const view = await renderDashboard();
    expect(routerProps().portfolioItemIdForDetail).toBeNull();
    expect(routerProps().portfolioOwnerIdentifier).toBeNull();

    await navigateTo(view, '/dashboard/users/jana/portfolio/12');

    expect(activeModule()).toBe('portfolio-detail');
    expect(routerProps().portfolioItemIdForDetail).toBe(12);
    expect(routerProps().portfolioOwnerIdentifier).toBe('jana');
  });

  it('vlastník so zakódovanými znakmi sa v adrese dekóduje', async () => {
    const view = await renderDashboard();

    await navigateTo(view, '/dashboard/users/j%C3%A1na/portfolio/12');

    expect(routerProps().portfolioOwnerIdentifier).toBe('jána');
  });

  it('číselný vlastník sa podá ako text', async () => {
    const view = await renderDashboard();

    await navigateTo(view, '/dashboard/users/55/portfolio/12');

    expect(routerProps().portfolioOwnerIdentifier).toBe('55');
    expect(routerProps().portfolioItemIdForDetail).toBe(12);
  });

  it('koncové lomítko adresy nevadí', async () => {
    const view = await renderDashboard();

    await navigateTo(view, '/dashboard/users/jana/portfolio/12/');

    expect(activeModule()).toBe('portfolio-detail');
    expect(routerProps().portfolioItemIdForDetail).toBe(12);
  });

  it('vlastník z adresy má prednosť pred vlastníkom z props stránky', async () => {
    const view = await renderDashboard(false, PORTFOLIO_12);

    await navigateTo(view, '/dashboard/users/peter/portfolio/12');

    expect(routerProps().portfolioOwnerIdentifier).toBe('peter');
  });

  const OWNER_FROM_PROPS: Array<[string, Entry, string]> = [
    ['slug', PORTFOLIO_12, 'jana'],
    [
      'ID používateľa',
      {
        ...PORTFOLIO_12,
        pathname: '/dashboard/users/55/portfolio/12',
        props: { initialViewedUserId: 55, initialProfileTab: 'portfolio', initialPortfolioItemId: 12 },
      },
      '55',
    ],
    [
      'slug má prednosť pred ID používateľa',
      { ...PORTFOLIO_12, props: { ...PORTFOLIO_12.props, initialViewedUserId: 55 } },
      'jana',
    ],
  ];

  it.each(OWNER_FROM_PROPS)('bez vlastníka v adrese sa vlastník vezme z props stránky (%s)', async (_title, entry, expected) => {
    const view = await renderDashboard(false, entry);

    await navigateTo(view, '/dashboard');

    expect(routerProps().portfolioOwnerIdentifier).toBe(expected);
  });

  it('položka z props stránky má prednosť pred položkou z adresy', async () => {
    const view = await renderDashboard(false, PORTFOLIO_12);

    await navigateTo(view, '/dashboard/users/jana/portfolio/15');

    expect(routerProps().portfolioItemIdForDetail).toBe(12);
  });

  it('po odchode z adresy detailu ModuleRouter položku už nedostane', async () => {
    const view = await renderDashboard();
    await navigateTo(view, '/dashboard/users/jana/portfolio/12');

    await navigateTo(view, '/dashboard');

    expect(routerProps().portfolioItemIdForDetail).toBeNull();
    expect(routerProps().portfolioOwnerIdentifier).toBeNull();
  });

  it.each([
    ['ID nie je číslo', '/dashboard/users/jana/portfolio/abc'],
    ['ďalší segment za ID', '/dashboard/users/jana/portfolio/12/extra'],
    ['chýbajúci vlastník', '/dashboard/users//portfolio/12'],
    ['vlastník s lomkou', '/dashboard/users/jana/x/portfolio/12'],
    ['zoznam portfólia bez položky', '/dashboard/users/jana/portfolio'],
  ])('adresa, ktorá nie je adresou detailu (%s), modul nezmení', async (_title, pathname) => {
    const view = await renderDashboard();

    await navigateTo(view, pathname);

    expect(activeModule()).toBe('home');
    expect(routerProps().portfolioItemIdForDetail).toBeNull();
  });

  it('nekonečné ID (príliš veľa číslic) sa nepovažuje za položku', async () => {
    const view = await renderDashboard();

    await navigateTo(view, `/dashboard/users/jana/portfolio/${'9'.repeat(400)}`);

    expect(activeModule()).toBe('home');
    expect(routerProps().portfolioItemIdForDetail).toBeNull();
  });
});

describe('tvorba položky portfólia podľa adresy', () => {
  it('priamy vstup na adresu tvorby ukáže tvorbu s vlastníkom', async () => {
    await renderDashboard(false, PORTFOLIO_CREATE);

    expect(activeModule()).toBe('portfolio-create');
    expect(routerProps().portfolioCreateOwnerIdentifier).toBe('jana');
    expect(routerProps().portfolioItemIdForDetail).toBeNull();
  });

  it('preklik na adresu tvorby prepne modul a vlastníka vezme z adresy', async () => {
    const view = await renderDashboard();
    expect(routerProps().portfolioCreateOwnerIdentifier).toBeNull();

    await navigateTo(view, '/dashboard/users/jana/portfolio/create');

    expect(activeModule()).toBe('portfolio-create');
    expect(routerProps().portfolioCreateOwnerIdentifier).toBe('jana');
    expect(routerProps().portfolioItemIdForDetail).toBeNull();
    expect(routerProps().portfolioOwnerIdentifier).toBeNull();
  });

  it('vlastník so zakódovanými znakmi sa v adrese dekóduje', async () => {
    const view = await renderDashboard();

    await navigateTo(view, '/dashboard/users/j%C3%A1na/portfolio/create');

    expect(routerProps().portfolioCreateOwnerIdentifier).toBe('jána');
  });

  it('číselný vlastník sa podá ako text', async () => {
    const view = await renderDashboard();

    await navigateTo(view, '/dashboard/users/55/portfolio/create');

    expect(routerProps().portfolioCreateOwnerIdentifier).toBe('55');
  });

  it('koncové lomítko adresy nevadí', async () => {
    const view = await renderDashboard();

    await navigateTo(view, '/dashboard/users/jana/portfolio/create/');

    expect(activeModule()).toBe('portfolio-create');
    expect(routerProps().portfolioCreateOwnerIdentifier).toBe('jana');
  });

  it('po odchode z adresy tvorby ModuleRouter vlastníka už nedostane', async () => {
    const view = await renderDashboard();
    await navigateTo(view, '/dashboard/users/jana/portfolio/create');

    await navigateTo(view, '/dashboard');

    expect(routerProps().portfolioCreateOwnerIdentifier).toBeNull();
  });

  it.each([
    ['preklep v poslednom segmente', '/dashboard/users/jana/portfolio/creat'],
    ['ďalší segment za tvorbou', '/dashboard/users/jana/portfolio/create/extra'],
    ['zoznam portfólia', '/dashboard/users/jana/portfolio'],
  ])('adresa, ktorá nie je adresou tvorby (%s), modul nezmení', async (_title, pathname) => {
    const view = await renderDashboard();

    await navigateTo(view, pathname);

    expect(activeModule()).toBe('home');
    expect(routerProps().portfolioCreateOwnerIdentifier).toBeNull();
  });
});

describe('detail príspevku podľa adresy: desktop', () => {
  it('priamy vstup ukáže Nástenku a nad ňou okno s príspevkom', async () => {
    const pushState = jest.spyOn(window.history, 'pushState');

    await renderDashboard(false, FEED_7, 'home');

    expect(activeModule()).toBe('home');
    expect(routerProps().feedPostIdForDetail).toBe(7);
    expect(isOverlayOpen()).toBe(true);
    expect(overlayProps().postId).toBe(7);
    expect(overlayProps().highlightCommentId).toBeNull();
    expect(currentUrl()).toBe('/dashboard/feed/7');
    expect(pushState).not.toHaveBeenCalled();
    expect(isFeedOverlayHistoryBusy()).toBe(false);
  });

  it('komentár zo skutočnej adresy sa pošle oknu a adresa ostane', async () => {
    await renderDashboard(false, { ...FEED_7, search: 'comment=3' }, 'home');

    expect(overlayProps().postId).toBe(7);
    expect(overlayProps().highlightCommentId).toBe(3);
    expect(currentUrl()).toBe('/dashboard/feed/7?comment=3');
  });

  it('priamy vstup okno len prevezme: história sa nerozrastie', async () => {
    const lengthBefore = window.history.length;

    await renderDashboard(false, FEED_7, 'home');

    expect(window.history.length).toBe(lengthBefore);
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('zatvorenie okna vráti adresu Nástenky bez kroku späť', async () => {
    await renderDashboard(false, FEED_7, 'home');
    const back = jest.spyOn(window.history, 'back');
    const lengthBefore = window.history.length;

    act(() => overlayProps().onClose());
    await settle();

    expect(isOverlayOpen()).toBe(false);
    expect(currentUrl()).toBe('/dashboard');
    expect(back).not.toHaveBeenCalled();
    expect(window.history.length).toBe(lengthBefore);
    expect(activeModule()).toBe('home');
  });

  it('zavreté okno sa neotvorí znova, kým router ešte ukazuje na príspevok', async () => {
    await renderDashboard(false, FEED_7, 'home');

    act(() => overlayProps().onClose());
    await settle();

    expect(mockPathname).toBe('/dashboard/feed/7');
    expect(isOverlayOpen()).toBe(false);
    expect(activeModule()).toBe('home');
  });

  it('preklik na príspevok z inej obrazovky otvorí Nástenku s oknom', async () => {
    const view = await renderDashboard(false, SETTINGS);
    expect(isOverlayOpen()).toBe(false);

    await navigateTo(view, '/dashboard/feed/7');

    expect(activeModule()).toBe('home');
    expect(routerProps().feedPostIdForDetail).toBe(7);
    expect(isOverlayOpen()).toBe(true);
    expect(overlayProps().postId).toBe(7);
  });

  it('preklik na príspevok s komentárom pošle komentár oknu', async () => {
    const view = await renderDashboard();

    await navigateTo(view, '/dashboard/feed/7', 'comment=3');

    expect(overlayProps().postId).toBe(7);
    expect(overlayProps().highlightCommentId).toBe(3);
  });

  it('kým skutočná adresa nie je adresou príspevku, okno sa neotvorí', async () => {
    const view = await renderDashboard();

    await navigateTo(view, '/dashboard/feed/7', '', { liveUrl: false });

    expect(currentUrl()).toBe('/dashboard');
    expect(activeModule()).toBe('home');
    expect(isOverlayOpen()).toBe(false);
  });

  it('okno otvorené z feedu sa pri dobehnutí adresy v routeri neotvára druhýkrát', async () => {
    const view = await renderDashboard();
    act(() => overlayApi().open({ postId: 5 }));
    await settle();
    expect(currentUrl()).toBe('/dashboard/feed/5');
    const lengthBefore = window.history.length;
    const rendersBefore = mockOverlayRenders;
    expect(overlayProps().postId).toBe(5);

    await navigateTo(view, '/dashboard/feed/5');

    expect(isOverlayOpen()).toBe(true);
    expect(overlayProps().postId).toBe(5);
    expect(activeModule()).toBe('home');
    expect(window.history.length).toBe(lengthBefore);
    expect(mockOverlayRenders - rendersBefore).toBeLessThan(5);
  });

  it('okno otvorené priamym vstupom ostáva, aj keď sa viewport zmení na mobil', async () => {
    await renderDashboard(false, FEED_7, 'home');
    expect(isOverlayOpen()).toBe(true);
    mockModuleRenders = [];

    flipViewport(true);
    await settle();

    expect(isOverlayOpen()).toBe(true);
    expect(overlayProps().postId).toBe(7);
    expect(activeModule()).toBe('home');
    expect(mockModuleRenders).not.toContain('feed-post-detail');
  });

  it('okno zatvorené krokom späť sa nevráti, kým adresa príspevku ešte visí v routeri', async () => {
    const view = await renderDashboard();
    act(() => overlayApi().open({ postId: 5 }));
    await settle();
    await navigateTo(view, '/dashboard/feed/5');
    expect(isOverlayOpen()).toBe(true);

    act(() => overlayApi().close());

    expect(isFeedOverlayHistoryBusy()).toBe(true);
    expect(isOverlayOpen()).toBe(false);

    // jsdom vráti adresu až po dvoch po sebe idúcich úlohách, nie po jednom kole.
    await waitFor(() => expect(currentUrl()).toBe('/dashboard'));
    await settle();

    expect(mockPathname).toBe('/dashboard/feed/5');
    expect(isFeedOverlayHistoryBusy()).toBe(false);
    expect(isOverlayOpen()).toBe(false);
    expect(activeModule()).toBe('home');
  });

  it('krok v histórii na adresu príspevku po dobehnutí cesty v routeri nikdy nevykreslí celostránkový detail', async () => {
    const view = await renderDashboard();
    await navigateTo(view, '/dashboard/feed/7');
    expect(isOverlayOpen()).toBe(true);
    expect(activeModule()).toBe('home');
    mockModuleRenders = [];

    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await settle();

    expect(mockModuleRenders).not.toContain('feed-post-detail');
    expect(activeModule()).toBe('home');
    expect(routerProps().feedPostIdForDetail).toBe(7);
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('krok v histórii na adresu príspevku pred dobehnutím cesty v routeri nikdy nevykreslí celostránkový detail', async () => {
    const view = await renderDashboard();
    window.history.replaceState(null, '', '/dashboard/feed/7');
    mockModuleRenders = [];

    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await settle();

    expect(mockModuleRenders).not.toContain('feed-post-detail');
    expect(activeModule()).toBe('home');

    await navigateTo(view, '/dashboard/feed/7');

    expect(mockModuleRenders).not.toContain('feed-post-detail');
    expect(activeModule()).toBe('home');
    expect(isOverlayOpen()).toBe(true);
    expect(overlayProps().postId).toBe(7);
  });

  it.each([
    ['nulové ID', '/dashboard/feed/0'],
    ['ID nie je číslo', '/dashboard/feed/abc'],
    ['ďalší segment za ID', '/dashboard/feed/7/extra'],
    ['zoznam bez príspevku', '/dashboard/feed'],
  ])('adresa, ktorá nie je adresou príspevku (%s), nič neotvorí', async (_title, pathname) => {
    const view = await renderDashboard();

    await navigateTo(view, pathname);

    expect(activeModule()).toBe('home');
    expect(routerProps().feedPostIdForDetail).toBeNull();
    expect(isOverlayOpen()).toBe(false);
  });
});

describe('detail príspevku podľa adresy: mobil', () => {
  it('priamy vstup ostáva celoobrazovkovou stránkou bez okna', async () => {
    const pushState = jest.spyOn(window.history, 'pushState');

    await renderDashboard(true, FEED_7);

    expect(activeModule()).toBe('feed-post-detail');
    expect(routerProps().feedPostIdForDetail).toBe(7);
    expect(isOverlayOpen()).toBe(false);
    expect(currentUrl()).toBe('/dashboard/feed/7');
    expect(pushState).not.toHaveBeenCalled();
  });

  it('preklik na príspevok z inej obrazovky ukáže celoobrazovkovú stránku', async () => {
    const view = await renderDashboard(true, SETTINGS);

    await navigateTo(view, '/dashboard/feed/7');

    expect(activeModule()).toBe('feed-post-detail');
    expect(routerProps().feedPostIdForDetail).toBe(7);
    expect(isOverlayOpen()).toBe(false);
  });

  it('krok v histórii na adresu príspevku ostáva celostránkový detail bez okna', async () => {
    const view = await renderDashboard(true);
    await navigateTo(view, '/dashboard/feed/7');

    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await settle();

    expect(activeModule()).toBe('feed-post-detail');
    expect(routerProps().feedPostIdForDetail).toBe(7);
    expect(isOverlayOpen()).toBe(false);
  });

  it('príspevok z props stránky má prednosť pred príspevkom z adresy', async () => {
    const view = await renderDashboard(true, FEED_7);

    await navigateTo(view, '/dashboard/feed/9');

    expect(routerProps().feedPostIdForDetail).toBe(7);
  });

  it('adresa, ktorá nie je adresou príspevku, nič neotvorí', async () => {
    const view = await renderDashboard(true);

    await navigateTo(view, '/dashboard/feed/abc');

    expect(activeModule()).toBe('home');
    expect(routerProps().feedPostIdForDetail).toBeNull();
    expect(isOverlayOpen()).toBe(false);
  });
});
