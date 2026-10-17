/**
 * Prechod do Správ cez `router.push` z profilu otvoreného z konverzácie (`DashboardContent`).
 *
 * Dashboard, ktorý už stojí na Next stránke `/dashboard/messages`, sa pri `router.push` na
 * `/dashboard/messages?targetUserId=…` neremountuje (tá istá stránka, líši sa len query).
 * Modul sa preto musí zosúladiť s adresou sám, inak adresa ukazuje Správy a obrazovka ostane
 * na profile až do F5. Testy idú cez vonkajšie rozhranie (adresa routera aj prehliadača,
 * udalosť `goToUserProfile`, props, ktoré dostane `ModuleRouter`).
 */

import { act, render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ComponentProps } from 'react';
import Dashboard from '../Dashboard';
import type ModuleRouter from '../ModuleRouter';
import type DashboardLayout from '../DashboardLayout';
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

const mockOpenConversation = jest.fn();
const mockListConversations = jest.fn();
const mockListMessageRequests = jest.fn();
const mockListMessages = jest.fn();
jest.mock('../modules/messages/messagingApi', () => ({
  ...jest.requireActual('../modules/messages/messagingApi'),
  openConversation: (...args: unknown[]) => mockOpenConversation(...args),
  listConversations: (...args: unknown[]) => mockListConversations(...args),
  listMessageRequests: (...args: unknown[]) => mockListMessageRequests(...args),
  listMessages: (...args: unknown[]) => mockListMessages(...args),
}));

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  prefetch: jest.fn(),
};
let mockPathname = '/dashboard/messages';
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
    // Onboarding PATCH never settles: no async state update after act, optimistic state stays stable.
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

/** Adresa pre router (hook `usePathname`/`useSearchParams`) a pre prehliadač (`window.location`) naraz. */
function setUrl(pathname: string, search = '') {
  mockPathname = pathname;
  mockSearchParams = new URLSearchParams(search);
  window.history.replaceState(null, '', search ? `${pathname}?${search}` : pathname);
}

const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

async function renderDashboard(pathname: string, search: string, route: string, mobile: boolean) {
  setUrl(pathname, search);
  installViewport(mobile);
  await act(async () => {
    render(
      <AuthProvider>
        <ThemeProvider>
          <Dashboard initialUser={baseUser} initialRoute={route} />
        </ThemeProvider>
      </AuthProvider>,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  await waitFor(() => expect(activeModule()).toBe(route));
}

/**
 * Prekreslenie, ktoré vynúti zmena záložky na INÚ hodnotu (rovnaká by sa preskočila) – router po
 * `router.push` hlási novú adresu a Dashboard sa prekreslí.
 */
async function rerenderDashboard() {
  const otherTab = routerProps().ownProfileTab === 'posts' ? 'offers' : 'posts';
  act(() => routerProps().onOwnProfileTabChange?.(otherTab));
  await settle();
}

/** Profil druhej strany otvorený z hlavičky konverzácie: modul a adresa idú cez `goToUserProfile`. */
async function openProfileFromConversationHeader() {
  act(() => {
    window.dispatchEvent(
      new CustomEvent('goToUserProfile', { detail: { identifier: 'test-c01-w93-15' } }),
    );
  });
  await waitFor(() => expect(activeModule()).toBe('user-profile'));
}

/** `router.push` na Správy: router aj prehliadač ukazujú novú adresu. */
async function routerPushesTo(search: string) {
  setUrl('/dashboard/messages', search);
  await rerenderDashboard();
}

beforeEach(() => {
  jest.clearAllMocks();
  mockOpenConversation.mockReset().mockReturnValue(new Promise(() => {}));
  mockListConversations.mockReset().mockReturnValue(new Promise(() => {}));
  mockListMessageRequests.mockReset().mockReturnValue(new Promise(() => {}));
  mockListMessages.mockReset().mockResolvedValue({ results: [], conversation: null });
  __resetAuthBootstrapSnapshotForTests();
  localStorage.clear();
  sessionStorage.clear();
  mockRouterProps = null;
  mockLayoutProps = null;
  setUrl('/dashboard/messages');
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe.each([
  ['mobil', true],
  ['desktop', false],
])('%s: Dashboard stojí na stránke Správy', (_label, mobile) => {
  beforeEach(async () => {
    await renderDashboard('/dashboard/messages', 'conversationId=1', 'messages', mobile);
  });

  it('po „Poslať správu“ z profilu otvoreného z konverzácie sa obrazovka prepne do Správ', async () => {
    await openProfileFromConversationHeader();

    await routerPushesTo('targetUserId=139');

    expect(activeModule()).toBe('messages');
  });

  it('na mobile sa po prepnutí otvorí konverzácia (horná lišta Správ)', async () => {
    await openProfileFromConversationHeader();

    await routerPushesTo('targetUserId=139');

    expect(layoutProps().isMobileMessageConversationOpen).toBe(true);
  });

  it('prepne aj po druhom okruhu (správy → profil → správy)', async () => {
    await openProfileFromConversationHeader();
    await routerPushesTo('targetUserId=139');
    await openProfileFromConversationHeader();

    await routerPushesTo('targetUserId=140');

    expect(activeModule()).toBe('messages');
  });

  it('modul sa nevráti na Správy, kým router ešte ukazuje starú adresu Správ (profil ostane)', async () => {
    await openProfileFromConversationHeader();

    // Router ešte hlási Správy, v prehliadači je už profil: žiadny vstup do Správ.
    await rerenderDashboard();

    expect(activeModule()).toBe('user-profile');
  });

  it('router ukazuje Správy skôr, než ich adresa zapíše prehliadač: nič sa neprepne', async () => {
    await openProfileFromConversationHeader();
    mockPathname = '/dashboard/messages';
    mockSearchParams = new URLSearchParams('targetUserId=139');

    await rerenderDashboard();

    expect(activeModule()).toBe('user-profile');
  });
});

describe('Dashboard stojí na inej stránke než Správy', () => {
  it('prechod do Správ cez menu (pushState + modul) funguje ako doteraz', async () => {
    await renderDashboard('/dashboard', '', 'home', false);

    act(() => (layoutProps() as unknown as { onModuleChange: (id: string) => void }).onModuleChange('messages'));
    await settle();

    expect(activeModule()).toBe('messages');
  });
});
