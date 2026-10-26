/**
 * Sledovania na PC → klik na hlavičku autora karty zhody otvorí profil (nález 171).
 *
 * Chyba sa prejavila len keď `router.push` NEZMENIL obrazovku: Dashboard stál na Next stránke toho
 * istého profilu, Next ho nenamountoval znova a modul ostal `watches`, zmenila sa len adresa.
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
    const OfferWatchMatchGrid =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../modules/offer-watch/results/OfferWatchMatchGrid').default;
    return props.activeModule === 'watches' ? (
      <OfferWatchMatchGrid matches={mockMatches()} watchUpdatedAt="2026-10-14T00:00:00Z" />
    ) : (
      <div data-testid="module-state" data-module={String(props.activeModule)} />
    );
  },
}));

jest.mock('../modules/shared/OfferImageCarousel', () => ({
  __esModule: true,
  default: ({ alt }: { alt: string }) => <div role="img" aria-label={alt} />,
}));
jest.mock('../modules/shared/OfferImageGalleryLightbox', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../modules/profile/offerLikesApi', () => ({ setOfferLikeState: jest.fn() }));

function mockMatches(): unknown[] {
  return [
    {
      createdAt: '2026-10-14T11:30:00Z',
      offer: {
        id: 61,
        category: 'Domácnosť',
        subcategory: 'Maliarske práce',
        description: 'Precízne maľovanie izieb',
        detailed_description: 'Detail',
        location: 'Bratislava',
        price_from: 25,
        price_currency: '€',
        experience: { value: 4, unit: 'years' },
        tags: [],
        user_display_name: 'Ada Maliarka',
        user_id: 21,
        owner_slug: mockOwnerSlug,
        owner_user_type: 'individual',
        reviews_count: 0,
        average_rating: 0,
        likes_count: 1,
        is_liked_by_me: false,
      },
    },
  ];
}
let mockOwnerSlug: string | null = 'ada-maliarka';

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
let mockPathname = '/dashboard/watches';
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

async function renderWatches() {
  mockPathname = '/dashboard/watches';
  window.history.replaceState(null, '', '/dashboard/watches?watch=11');
  installDesktop();
  await act(async () => {
    render(
      <AuthProvider>
        <ThemeProvider>
          <Dashboard initialUser={baseUser} initialRoute="watches" />
        </ThemeProvider>
      </AuthProvider>,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  await screen.findByText('Ada Maliarka');
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRouter.push.mockReset(); // `router.push` nič nezmení – Next Dashboard nenamountuje znova
  __resetAuthBootstrapSnapshotForTests();
  localStorage.clear();
  sessionStorage.clear();
  mockRouterProps = null;
  mockOwnerSlug = 'ada-maliarka';
});

describe('Sledovania → profil autora, keď router.push nezmení obrazovku', () => {
  it('klik na hlavičku autora otvorí profil so zvýraznenou ponukou a zapíše adresu s pôvodom', async () => {
    await renderWatches();
    expect(routerProps().activeModule).toBe('watches');

    fireEvent.click(screen.getByRole('button', { name: /Ada Maliarka/ }));

    await waitFor(() => expect(routerProps().activeModule).toBe('user-profile'));
    expect(routerProps().viewedUserSlug).toBe('ada-maliarka');
    expect(window.location.pathname).toBe('/dashboard/users/ada-maliarka');
    expect(new URLSearchParams(window.location.search).get('highlight')).toBe('61');
    expect(
      (routerProps() as unknown as { highlightedSkillId?: number | null }).highlightedSkillId,
    ).toBe(61);
    expect(readProfileOriginDepth(window.history.state)).toBe(0);
  });

  it('autor bez slugu sa otvorí podľa číselného ID', async () => {
    mockOwnerSlug = null;
    await renderWatches();

    fireEvent.click(screen.getByRole('button', { name: /Ada Maliarka/ }));

    await waitFor(() => expect(routerProps().activeModule).toBe('user-profile'));
    expect(routerProps().viewedUserId).toBe(21);
    expect(window.location.pathname).toBe('/dashboard/users/21');
  });

  it('profil zo Sledovaní je nový reťazec: zapamätané miesto Nástenky sa zahodí (nález 159)', async () => {
    await renderWatches();
    sessionStorage.setItem(
      FEED_RETURN_STORAGE_KEY,
      JSON.stringify({ id: 'x', savedAt: Date.now(), ownerId: 1 }),
    );

    fireEvent.click(screen.getByRole('button', { name: /Ada Maliarka/ }));

    await waitFor(() => expect(routerProps().activeModule).toBe('user-profile'));
    expect(sessionStorage.getItem(FEED_RETURN_STORAGE_KEY)).toBeNull();
  });
});
