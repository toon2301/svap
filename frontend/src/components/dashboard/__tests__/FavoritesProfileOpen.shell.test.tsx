/**
 * Obľúbené na PC → klik na kartu otvorí profil (nález 162, T9.1).
 *
 * Chyba sa prejavila len keď `router.push` NEZMENIL obrazovku: Dashboard stál na Next stránke toho
 * istého profilu, Next ho nenamountoval znova a modul ostal `favorites`, zmenila sa len adresa.
 * Test preto drží `router.push` ako prázdnu funkciu (presne to, čo shell v tej chvíli vidí) a
 * vyžaduje, aby sa profil otvoril aj tak – stavom Dashboardu, nie navigáciou routera.
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ComponentProps } from 'react';
import Dashboard from '../Dashboard';
import type ModuleRouter from '../ModuleRouter';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider, __resetAuthBootstrapSnapshotForTests } from '@/contexts/AuthContext';
import { readProfileOriginDepth } from '../modules/profile/profileOriginHistory';
import { FEED_RETURN_STORAGE_KEY } from '../modules/feed/feedReturnState';
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
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const FavoritesModule = require('../modules/FavoritesModule').default;
    return props.activeModule === 'favorites' ? (
      <FavoritesModule />
    ) : (
      <div data-testid="module-state" data-module={String(props.activeModule)} />
    );
  },
}));

jest.mock('../DashboardLayout', () => ({
  __esModule: true,
  default: (props: { children?: React.ReactNode }) => (
    <div data-testid="layout">{props.children}</div>
  ),
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

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  prefetch: jest.fn(),
};
let mockPathname = '/dashboard/favorites';
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => mockPathname,
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

jest.mock('../modules/favoritesApi', () => ({
  __esModule: true,
  fetchFavoriteUsers: jest.fn(),
  setFavoriteUserState: jest.fn(),
}));
import { fetchFavoriteUsers } from '../modules/favoritesApi';

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

function installDesktop() {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 1280 });
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

async function renderFavorites() {
  mockPathname = '/dashboard/favorites';
  window.history.replaceState(null, '', '/dashboard/favorites');
  installDesktop();
  await act(async () => {
    render(
      <AuthProvider>
        <ThemeProvider>
          <Dashboard initialUser={baseUser} initialRoute="favorites" />
        </ThemeProvider>
      </AuthProvider>,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  await screen.findByText('Jana Novakova');
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRouter.push.mockReset(); // `router.push` nič nezmení – Next Dashboard nenamountuje znova
  __resetAuthBootstrapSnapshotForTests();
  localStorage.clear();
  sessionStorage.clear();
  mockRouterProps = null;
  (fetchFavoriteUsers as jest.Mock).mockResolvedValue([
    { id: 7, slug: 'jana-novakova', display_name: 'Jana Novakova', avatar_url: null },
    { id: 8, slug: null, display_name: 'Bez Slugu', avatar_url: null },
  ]);
});

describe('Obľúbené → profil, keď router.push nezmení obrazovku', () => {
  it('klik na hlavičku karty otvorí profil a zapíše adresu s pôvodom', async () => {
    await renderFavorites();
    expect(routerProps().activeModule).toBe('favorites');

    fireEvent.click(screen.getByLabelText('Jana Novakova'));

    await waitFor(() => expect(routerProps().activeModule).toBe('user-profile'));
    expect(routerProps().viewedUserSlug).toBe('jana-novakova');
    expect(window.location.pathname).toBe('/dashboard/users/jana-novakova');
    // pôvod pre appkovú šípku na mobile: prvý záznam profilu má hĺbku 0
    expect(readProfileOriginDepth(window.history.state)).toBe(0);
  });

  it('klik na meno karty robí presne to isté', async () => {
    await renderFavorites();

    fireEvent.click(screen.getByRole('heading', { name: 'Jana Novakova' }));

    await waitFor(() => expect(routerProps().activeModule).toBe('user-profile'));
    expect(routerProps().viewedUserSlug).toBe('jana-novakova');
    expect(window.location.pathname).toBe('/dashboard/users/jana-novakova');
  });

  it('karta bez slugu sa otvorí podľa číselného ID', async () => {
    await renderFavorites();

    fireEvent.click(screen.getByLabelText('Bez Slugu'));

    await waitFor(() => expect(routerProps().activeModule).toBe('user-profile'));
    expect(routerProps().viewedUserId).toBe(8);
    expect(window.location.pathname).toBe('/dashboard/users/8');
  });

  it('profil z Obľúbených je nový reťazec: zapamätané miesto Nástenky sa zahodí (nález 159)', async () => {
    await renderFavorites();
    sessionStorage.setItem(
      FEED_RETURN_STORAGE_KEY,
      JSON.stringify({ id: 'x', savedAt: Date.now(), ownerId: 1 }),
    );

    fireEvent.click(screen.getByLabelText('Jana Novakova'));

    await waitFor(() => expect(routerProps().activeModule).toBe('user-profile'));
    expect(sessionStorage.getItem(FEED_RETURN_STORAGE_KEY)).toBeNull();
  });

  it('„Správa“ ide ďalej cez router (Správy majú vlastnú synchronizáciu)', async () => {
    await renderFavorites();

    fireEvent.click(screen.getAllByRole('button', { name: 'Správa' })[0]);

    expect(mockRouter.push).toHaveBeenCalledWith('/dashboard/messages?targetUserId=7');
  });
});
