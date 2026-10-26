/**
 * Blokovanie profilu a „Späť na nástenku" → Nástenka (nález 172).
 *
 * Chyba sa prejavila len keď `router.replace('/dashboard')` NEZMENIL obrazovku: Dashboard stál na Next
 * stránke `/dashboard` (štandard po prihlásení a po F5), profil sa otvoril udalosťou `goToUserProfile`
 * (history.pushState, Next router o ňom nevie), Next nenamountoval Dashboard znova a modul ostal
 * `user-profile`. Test preto drží `router.replace`/`router.push` ako prázdne funkcie (presne to, čo
 * shell v tej chvíli vidí) a vyžaduje, aby sa Nástenka zobrazila aj tak – stavom Dashboardu.
 * `DashboardLayout` je REÁLNY: žiadosť o Nástenku prijíma on (viď feedHomeNavigation).
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ComponentProps } from 'react';
import Dashboard from '../Dashboard';
import type ModuleRouter from '../ModuleRouter';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider, __resetAuthBootstrapSnapshotForTests } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { peekFeedReturn, saveFeedReturn } from '../modules/feed/feedReturnState';
import type { FeedPost } from '@/lib/feedApi';
import { setCurrentAccountId } from '@/lib/currentAccount';
import type { User } from '@/types';

type ModuleRouterProps = ComponentProps<typeof ModuleRouter>;

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
    const { SearchUserProfileModule } =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../modules/search/SearchUserProfileModule');
    return props.activeModule === 'user-profile' && props.viewedUserId ? (
      <SearchUserProfileModule userId={props.viewedUserId} currentUserId={1} />
    ) : (
      <div data-testid="module-state" data-module={String(props.activeModule)} />
    );
  },
}));

// Reálny DashboardLayout (počúva žiadosť o Nástenku); ťažké potomky sú prázdne.
jest.mock('../Sidebar', () => ({ __esModule: true, default: () => <nav /> }));
jest.mock('../RightSidebar', () => ({ __esModule: true, default: () => <aside /> }));
jest.mock('../MobileTopNav', () => ({ __esModule: true, default: () => null }));
jest.mock('../MobileTopBar', () => ({ __esModule: true, default: () => null }));
jest.mock('../modules/bug-report/BugReportDialogHost', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../modules/offer-watch/mobile/OfferWatchSettingsMobileHost', () => ({
  __esModule: true,
  default: () => null,
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
jest.mock('../onboarding/DesktopOnboardingOverlay', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../onboarding/MobileOnboardingOverlay', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../onboarding/OnboardingScrollLock', () => ({ __esModule: true, default: () => null }));

// Profil: len tlačidlo „Blokovať" (zvyšok profilu s routerom nesúvisí).
jest.mock('../modules/profile/ProfileDesktopView', () => ({
  __esModule: true,
  default: ({ onBlockClick }: { onBlockClick?: () => void }) => (
    <div data-testid="foreign-profile">
      {onBlockClick && (
        <button type="button" onClick={onBlockClick}>
          block profile
        </button>
      )}
    </div>
  ),
}));
jest.mock('../modules/profile/ProfileMobileView', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../modules/userBlocksApi', () => ({
  __esModule: true,
  blockUser: jest.fn(),
}));
import { blockUser } from '../modules/userBlocksApi';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: Object.assign(jest.fn(), { error: jest.fn(), success: jest.fn() }),
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

jest.mock('@/utils/auth', () => ({
  isAuthenticated: jest.fn(() => true),
  clearAuthState: jest.fn(),
}));
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
  profile_completeness: 80,
} as User;

const routerProps = () => mockRouterProps as unknown as ModuleRouterProps;

function installViewport(width: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width });
  (window as unknown as { matchMedia: unknown }).matchMedia = jest
    .fn()
    .mockImplementation((q: string) => ({
      matches: false,
      media: q,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
}

/** Nástenka na Next stránke `/dashboard`, profil otvorený udalosťou (history.pushState, bez routera). */
async function openForeignProfileFromHome(width = 1280, highlightId?: number) {
  window.history.replaceState(null, '', '/dashboard');
  installViewport(width);
  await act(async () => {
    render(
      <AuthProvider>
        <ThemeProvider>
          <Dashboard initialUser={baseUser} initialRoute="home" />
        </ThemeProvider>
      </AuthProvider>,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  expect(routerProps().activeModule).toBe('home');
  await act(async () => {
    window.dispatchEvent(
      new CustomEvent('goToUserProfile', { detail: { identifier: '7', highlightId } }),
    );
  });
  await waitFor(() => expect(routerProps().activeModule).toBe('user-profile'));
  expect(window.location.pathname).toMatch(/^\/dashboard\/users\/(7|jana)$/);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRouter.push.mockReset(); // Next router nič nezmení – Dashboard sa nenamountuje znova
  mockRouter.replace.mockReset();
  __resetAuthBootstrapSnapshotForTests();
  setCurrentAccountId(null);
  localStorage.clear();
  sessionStorage.clear();
  mockRouterProps = null;
  (blockUser as jest.Mock).mockResolvedValue({ user_id: 7, is_blocked: true });
});

describe('Profil otvorený udalosťou → odchod na Nástenku, keď router nezmení obrazovku', () => {
  it('po zablokovaní sa zobrazí Nástenka a adresa je /dashboard', async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: { id: 7, slug: 'jana', first_name: 'Jana', last_name: 'N', user_type: 'individual' },
    });
    await openForeignProfileFromHome();

    fireEvent.click(await screen.findByRole('button', { name: 'block profile' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Zablokovať' }));

    await waitFor(() => expect(blockUser).toHaveBeenCalledWith(7));
    await waitFor(() => expect(routerProps().activeModule).toBe('home'));
    expect(window.location.pathname).toBe('/dashboard');
    expect(screen.queryByTestId('foreign-profile')).not.toBeInTheDocument();
  });

  it('„Späť na nástenku" na chybovej obrazovke zobrazí Nástenku', async () => {
    (api.get as jest.Mock).mockRejectedValue({ response: { status: 404 } });
    await openForeignProfileFromHome();

    fireEvent.click(await screen.findByRole('button', { name: 'Späť na nástenku' }));

    await waitFor(() => expect(routerProps().activeModule).toBe('home'));
    expect(window.location.pathname).toBe('/dashboard');
  });

  it('mobil (390 px): rovnako po zablokovaní', async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: { id: 7, slug: 'jana', first_name: 'Jana', last_name: 'N', user_type: 'individual' },
    });
    await openForeignProfileFromHome(390);

    fireEvent.click(await screen.findByRole('button', { name: 'block profile' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Zablokovať' }));

    await waitFor(() => expect(routerProps().activeModule).toBe('home'));
  });

  it('záznam zablokovaného profilu v histórii sa prepíše adresou Nástenky pred jej zobrazením', async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: { id: 7, slug: 'jana', first_name: 'Jana', last_name: 'N', user_type: 'individual' },
    });
    await openForeignProfileFromHome();
    const replaceSpy = jest.spyOn(window.history, 'replaceState');
    const pushSpy = jest.spyOn(window.history, 'pushState');
    try {
      fireEvent.click(await screen.findByRole('button', { name: 'block profile' }));
      fireEvent.click(await screen.findByRole('button', { name: 'Zablokovať' }));
      await waitFor(() => expect(routerProps().activeModule).toBe('home'));

      const replaced = replaceSpy.mock.calls.findIndex(([, , url]) => url === '/dashboard');
      const pushed = pushSpy.mock.calls.findIndex(([, , url]) => url === '/dashboard');
      expect(replaced).toBeGreaterThanOrEqual(0);
      expect(replaceSpy.mock.calls[replaced][0]).toBeNull();
      expect(pushed).toBeGreaterThanOrEqual(0);
      expect(replaceSpy.mock.invocationCallOrder[replaced]).toBeLessThan(
        pushSpy.mock.invocationCallOrder[pushed],
      );
    } finally {
      replaceSpy.mockRestore();
      pushSpy.mockRestore();
    }
  });

  it('po zablokovaní sa zapamätaná Nástenka s príspevkami zablokovaného zahodí (neobnoví sa)', async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: { id: 7, slug: 'jana', first_name: 'Jana', last_name: 'N', user_type: 'individual' },
    });
    await openForeignProfileFromHome();
    setCurrentAccountId(1); // snímka patrí prihlásenému účtu (Auth je v tomto teste zamknutý)
    // Snímka z kliku na autora príspevku na Nástenke (PC): s ňou by Domov obnovil feed aj s príspevkami
    // práve zablokovaného používateľa.
    saveFeedReturn({
      posts: [{ id: 501, author: { id: 7 } } as unknown as FeedPost],
      nextUrl: null,
      scrollTop: 600,
      entry: 'other-profile',
    });
    expect(peekFeedReturn()).not.toBeNull();

    fireEvent.click(await screen.findByRole('button', { name: 'block profile' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Zablokovať' }));

    await waitFor(() => expect(routerProps().activeModule).toBe('home'));
    expect(peekFeedReturn()).toBeNull();
  });

  it('profil otvorený so zvýraznením ponuky odíde na čistú adresu /dashboard', async () => {
    (api.get as jest.Mock).mockRejectedValue({ response: { status: 404 } });
    await openForeignProfileFromHome(1280, 55);
    expect(window.location.search).toContain('highlight=55');

    fireEvent.click(await screen.findByRole('button', { name: 'Späť na nástenku' }));

    await waitFor(() => expect(routerProps().activeModule).toBe('home'));
    expect(window.location.pathname).toBe('/dashboard');
    expect(window.location.search).toBe('');
  });

  it('Nástenka sa zobrazí aj keď prehliadač prepísanie záznamu odmietne', async () => {
    (api.get as jest.Mock).mockRejectedValue({ response: { status: 404 } });
    await openForeignProfileFromHome();
    const original = window.history.replaceState.bind(window.history);
    const replaceSpy = jest
      .spyOn(window.history, 'replaceState')
      .mockImplementation((state, unused, url) => {
        if (url === '/dashboard') throw new DOMException('denied', 'SecurityError');
        original(state, unused, url);
      });
    try {
      fireEvent.click(await screen.findByRole('button', { name: 'Späť na nástenku' }));

      await waitFor(() => expect(routerProps().activeModule).toBe('home'));
    } finally {
      replaceSpy.mockRestore();
    }
  });
});
