/**
 * Detail príspevku otvorený cieľom okna (upozornenie, adresa) v dashboarde: na mobile obrazovka, na počítači okno (nález 360,
 * krok 2 zrušenia starého spôsobu detailu príspevku).
 *
 * Dashboard drží jeden cieľ okna a podľa šírky okna prehliadača (`useIsMobile`, 1 024 px) ho ukáže ako mobilnú obrazovku
 * detailu (`FeedPostMobileDetailHost`) alebo ako okno (`FeedPostDetailOverlay`). História je v oboch prípadoch tá istá
 * (`feedOverlayHistory`): otvorenie pridá presne jeden záznam s adresou príspevku, bežné zatvorenie ho vráti krokom späť a
 * zatvorenie s `keepHistory` adresu nechá. Oba komponenty sú nahradené atrapami, ktoré zachytia vlastnosti; história je
 * skutočná (jsdom). Test idú cez vonkajšie rozhranie dashboardu (kontext okna, atrapy komponentov a adresa).
 */

import { act, render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ComponentProps } from 'react';
import Dashboard from '../Dashboard';
import type ModuleRouter from '../ModuleRouter';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider, __resetAuthBootstrapSnapshotForTests } from '@/contexts/AuthContext';
import { useFeedPostOverlay } from '../contexts/FeedPostOverlayContext';
import {
  isFeedOverlayHistoryBusy,
  resetFeedOverlayHistory,
} from '../modules/feed/feedOverlayHistory';
import type { User } from '@/types';

type ModuleRouterProps = ComponentProps<typeof ModuleRouter>;
type OverlayApi = NonNullable<ReturnType<typeof useFeedPostOverlay>>;

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

let mockRouterProps: Record<string, unknown> | null = null;
let mockOverlayApi: ReturnType<typeof useFeedPostOverlay> = null;
jest.mock('../ModuleRouter', () => ({
  __esModule: true,
  default: function MockModuleRouter(props: Record<string, unknown>) {
    mockRouterProps = props;
    mockOverlayApi = useFeedPostOverlay();
    return <div data-testid="module-state" data-module={String(props.activeModule)} />;
  },
}));

jest.mock('../DashboardLayout', () => ({
  __esModule: true,
  default: (props: { children?: React.ReactNode }) => <div data-testid="layout">{props.children}</div>,
}));

jest.mock('../DashboardModals', () => ({ __esModule: true, default: () => null }));

type CielMockProps = { postId: number; highlightCommentId: number | null; onClose: () => void };
let mockOknoProps: CielMockProps | null = null;
let mockObrazovkaProps: CielMockProps | null = null;
jest.mock('../modules/feed/FeedPostDetailOverlay', () => ({
  __esModule: true,
  default: function MockFeedPostDetailOverlay(props: CielMockProps) {
    mockOknoProps = props;
    return <div data-testid="feed-overlay" data-post-id={props.postId} />;
  },
}));
jest.mock('../modules/feed/FeedPostMobileDetailHost', () => ({
  __esModule: true,
  default: function MockFeedPostMobileDetailHost(props: CielMockProps) {
    mockObrazovkaProps = props;
    return <div data-testid="feed-mobile-host" data-post-id={props.postId} />;
  },
}));

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  prefetch: jest.fn(),
};
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard',
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
const overlayApi = () => mockOverlayApi as OverlayApi;
const obrazovkaProps = () => mockObrazovkaProps as CielMockProps;
const jeOknoOtvorene = () => document.querySelector('[data-testid="feed-overlay"]') !== null;
const jeObrazovkaOtvorena = () => document.querySelector('[data-testid="feed-mobile-host"]') !== null;
const currentUrl = () => window.location.pathname + window.location.search;

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

async function renderDashboard(isMobile: boolean) {
  installViewport(isMobile);
  render(
    <AuthProvider>
      <ThemeProvider>
        <Dashboard initialUser={baseUser} initialRoute="home" />
      </ThemeProvider>
    </AuthProvider>,
  );
  await waitFor(() => expect(routerProps().activeModule).toBe('home'));
  await settle();
}

/** Klik na upozornenie – tak, ako ho volá panel aj celoobrazovková stránka upozornení. */
async function clickNotification(targetUrl: string) {
  act(() => routerProps().onNotificationNavigate?.(targetUrl));
  await settle();
}

async function openOverlay(target: Parameters<OverlayApi['open']>[0]) {
  act(() => overlayApi().open(target));
  await settle();
}

beforeEach(() => {
  jest.clearAllMocks();
  // Smerovač ako Next skutočne mení adresu: po zatvorení obrazovky sa modul zosúladí s adresou, na ktorú sa vrátil krok späť.
  mockRouter.push.mockImplementation((url: string) => window.history.pushState(null, '', url));
  mockRouter.replace.mockImplementation((url: string) => window.history.replaceState(null, '', url));
  __resetAuthBootstrapSnapshotForTests();
  resetFeedOverlayHistory();
  localStorage.clear();
  sessionStorage.clear();
  mockRouterProps = null;
  mockOverlayApi = null;
  mockOknoProps = null;
  mockObrazovkaProps = null;
  window.history.replaceState(null, '', '/dashboard');
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('cieľ okna detailu príspevku podľa šírky obrazovky', () => {
  it('na počítači sa ukáže okno a nie mobilná obrazovka', async () => {
    await renderDashboard(false);

    await openOverlay({ postId: 7, highlightCommentId: 12 });

    expect(jeOknoOtvorene()).toBe(true);
    expect(jeObrazovkaOtvorena()).toBe(false);
    expect(mockOknoProps?.postId).toBe(7);
    expect(mockOknoProps?.highlightCommentId).toBe(12);
  });

  it('na mobile sa ukáže obrazovka detailu s číslom príspevku a komentárom a nie okno', async () => {
    await renderDashboard(true);

    await openOverlay({ postId: 7, highlightCommentId: 12 });

    expect(jeObrazovkaOtvorena()).toBe(true);
    expect(jeOknoOtvorene()).toBe(false);
    expect(obrazovkaProps().postId).toBe(7);
    expect(obrazovkaProps().highlightCommentId).toBe(12);
  });

  it('na mobile bez komentára dostane obrazovka null', async () => {
    await renderDashboard(true);

    await openOverlay({ postId: 7 });

    expect(obrazovkaProps().highlightCommentId).toBeNull();
  });

  it('na mobile je otvorenie rovnaké ako na počítači: jeden záznam v histórii s adresou príspevku a komentárom', async () => {
    await renderDashboard(true);
    const dlzka = window.history.length;

    await openOverlay({ postId: 7, highlightCommentId: 12 });

    expect(currentUrl()).toBe('/dashboard/feed/7?comment=12');
    expect(window.history.length).toBe(dlzka + 1);
    expect(isFeedOverlayHistoryBusy()).toBe(true);
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(routerProps().activeModule).toBe('home');
  });

  it('na mobile bežné zatvorenie obrazovky vráti adresu krokom späť', async () => {
    await renderDashboard(true);
    await openOverlay({ postId: 7 });
    const backSpy = jest.spyOn(window.history, 'back');

    act(() => obrazovkaProps().onClose());
    await settle();

    expect(jeObrazovkaOtvorena()).toBe(false);
    expect(backSpy).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(currentUrl()).toBe('/dashboard'));
    await settle();
    expect(isFeedOverlayHistoryBusy()).toBe(false);
  });

  it('na mobile zatvorenie s keepHistory (odchod na iné miesto) adresu nechá a záznam zabudne', async () => {
    await renderDashboard(true);
    await openOverlay({ postId: 7 });
    const backSpy = jest.spyOn(window.history, 'back');

    act(() => overlayApi().close({ keepHistory: true }));
    await settle();

    expect(jeObrazovkaOtvorena()).toBe(false);
    expect(backSpy).not.toHaveBeenCalled();
    expect(currentUrl()).toBe('/dashboard/feed/7');
    expect(isFeedOverlayHistoryBusy()).toBe(false);
  });

  it('na mobile krok späť v prehliadači obrazovku zavrie a ďalší krok späť nezačne', async () => {
    await renderDashboard(true);
    await openOverlay({ postId: 7 });
    const backSpy = jest.spyOn(window.history, 'back');

    act(() => {
      window.history.replaceState(null, '', '/dashboard');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await settle();

    expect(jeObrazovkaOtvorena()).toBe(false);
    expect(backSpy).not.toHaveBeenCalled();
    expect(isFeedOverlayHistoryBusy()).toBe(false);
  });

  it('zmena príspevku v otvorenej obrazovke na mobile adresu prepíše a ďalší záznam nepridá', async () => {
    await renderDashboard(true);
    await openOverlay({ postId: 7 });
    const dlzka = window.history.length;

    await openOverlay({ postId: 8, highlightCommentId: 3 });

    expect(obrazovkaProps().postId).toBe(8);
    expect(obrazovkaProps().highlightCommentId).toBe(3);
    expect(currentUrl()).toBe('/dashboard/feed/8?comment=3');
    expect(window.history.length).toBe(dlzka);
  });
});

describe('upozornenie na príspevok na mobile (krok 3a opravy A)', () => {
  it('otvorí obrazovku detailu s číslom príspevku a komentárom, bez navigácie a bez zmeny modulu', async () => {
    await renderDashboard(true);

    await clickNotification('/dashboard/feed/42?comment=7');

    expect(jeObrazovkaOtvorena()).toBe(true);
    expect(jeOknoOtvorene()).toBe(false);
    expect(obrazovkaProps().postId).toBe(42);
    expect(obrazovkaProps().highlightCommentId).toBe(7);
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
    expect(routerProps().activeModule).toBe('home');
    expect(currentUrl()).toBe('/dashboard/feed/42?comment=7');
  });

  it('bez komentára dostane obrazovka null', async () => {
    await renderDashboard(true);

    await clickNotification('/dashboard/feed/42');

    expect(obrazovkaProps().postId).toBe(42);
    expect(obrazovkaProps().highlightCommentId).toBeNull();
  });

  it('otvorená z iného modulu ostáva pod obrazovkou ten istý modul a po zatvorení sa naň vráti', async () => {
    await renderDashboard(true);
    await clickNotification('/dashboard/favorites');
    expect(routerProps().activeModule).toBe('favorites');
    mockRouter.push.mockClear();

    await clickNotification('/dashboard/feed/42');
    expect(jeObrazovkaOtvorena()).toBe(true);
    expect(routerProps().activeModule).toBe('favorites');
    expect(mockRouter.push).not.toHaveBeenCalled();

    act(() => obrazovkaProps().onClose());
    await settle();
    await waitFor(() => expect(currentUrl()).toBe('/dashboard/favorites'));

    expect(jeObrazovkaOtvorena()).toBe(false);
    expect(routerProps().activeModule).toBe('favorites');
  });

  it('druhé upozornenie na iný príspevok pri otvorenej obrazovke ju prepne a nepridá ďalší záznam v histórii', async () => {
    await renderDashboard(true);
    await clickNotification('/dashboard/feed/42?comment=7');
    const dlzka = window.history.length;

    await clickNotification('/dashboard/feed/43');

    expect(obrazovkaProps().postId).toBe(43);
    expect(obrazovkaProps().highlightCommentId).toBeNull();
    expect(currentUrl()).toBe('/dashboard/feed/43');
    expect(window.history.length).toBe(dlzka);
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('na počítači otvorí okno a nie obrazovku, rovnakým spôsobom', async () => {
    await renderDashboard(false);

    await clickNotification('/dashboard/feed/42?comment=7');

    expect(jeOknoOtvorene()).toBe(true);
    expect(jeObrazovkaOtvorena()).toBe(false);
    expect(mockOknoProps?.postId).toBe(42);
    expect(mockOknoProps?.highlightCommentId).toBe(7);
    expect(mockRouter.push).not.toHaveBeenCalled();
  });
});
