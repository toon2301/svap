/**
 * Zvýraznenie karty po kroku späť: rozhoduje ADRESA, nie staré props.
 *
 * Krok späť cez hranicu Next stránky namountuje dashboard s props stránky,
 * ktorej strom záznam nesie – a ten strom si drží query z času, keď záznam
 * vznikol (`pushState` kopíruje strom aktuálnej stránky, mení len adresu).
 * Props teda vedia niesť STARŠIE zvýraznenie, než na aké ukazuje adresa.
 *
 * Tú istú hodnotu nastavovali dve miesta: `useDashboardHighlighting` (z props,
 * hneď potom z adresy) a `useDashboardUserProfile` (z props). Druhé sa
 * registruje neskôr, takže v tom istom batchi prepísalo adresu späť na staré
 * props. Prejavilo sa to len pri číselnom ID v adrese – slugová vetva do toho
 * zápisu nedôjde, preto tade zvýraznenie fungovalo.
 */

import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Dashboard from '../Dashboard';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider, __resetAuthBootstrapSnapshotForTests } from '@/contexts/AuthContext';
import type { User } from '@/types';

jest.mock('framer-motion', () => ({
  motion: { div: ({ children, ...p }: React.ComponentProps<'div'>) => <div {...p}>{children}</div> },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../ModuleRouter', () => ({
  __esModule: true,
  default: (props: { activeModule: string; highlightedSkillId: number | null }) => (
    <div
      data-testid="module-state"
      data-module={props.activeModule}
      data-highlight={props.highlightedSkillId == null ? '' : String(props.highlightedSkillId)}
    />
  ),
}));

let mockPathname = '/dashboard';
let mockSearch = '';
/**
 * Verne ako Next: objekt query je memoizovaný na adresu (`app-router`), nie
 * nový pri každom renderi. S novým objektom by sa efekt nad `searchParams`
 * prehrával donekonečna a test by prepísanie adresy starými props prehliadol.
 */
let memoizedSearchParams = new URLSearchParams('');
let memoizedSearchKey = '';
function currentSearchParams() {
  if (memoizedSearchKey !== mockSearch) {
    memoizedSearchKey = mockSearch;
    memoizedSearchParams = new URLSearchParams(mockSearch);
  }
  return memoizedSearchParams;
}
const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => currentSearchParams(),
  usePathname: () => mockPathname,
}));

jest.mock('@/utils/auth', () => ({ isAuthenticated: jest.fn(() => true), clearAuthState: jest.fn() }));
jest.mock('@/utils/csrf', () => ({ fetchCsrfToken: jest.fn(), hasCsrfToken: jest.fn(() => true) }));
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
  id: 1, username: 'testuser', email: 'test@example.com', first_name: 'Test', last_name: 'User',
  slug: 'testuser', user_type: 'individual', is_verified: true, is_public: true,
  created_at: '2023-01-01T00:00:00Z', updated_at: '2023-01-01T00:00:00Z',
} as User;

/** Zvýraznenie, ktoré nesie obnovený strom (staršie). */
const STALE = 5;
/** Zvýraznenie, na ktoré ukazuje adresa záznamu. */
const FRESH = 9;

beforeEach(() => {
  jest.clearAllMocks();
  __resetAuthBootstrapSnapshotForTests();
  sessionStorage.clear();
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
  (window as unknown as { matchMedia: unknown }).matchMedia = jest.fn().mockImplementation((q: string) => ({
    matches: false, media: q, onchange: null,
    addListener: jest.fn(), removeListener: jest.fn(),
    addEventListener: jest.fn(), removeEventListener: jest.fn(), dispatchEvent: jest.fn(),
  }));
});

type PageProps = {
  initialRoute: string;
  initialViewedUserId: number | null;
  initialProfileSlug: string;
  initialHighlightedSkillId: number | null;
};

/** Krok späť cez hranicu stránky: mount s props obnovenej stránky. */
async function backAcrossPages(url: string, search: string, pageProps: PageProps) {
  window.history.replaceState(null, '', search ? `${url}?${search}` : url);
  mockPathname = url;
  mockSearch = search;

  const view = render(
    <AuthProvider>
      <ThemeProvider>
        <Dashboard initialUser={user} {...pageProps} />
      </ThemeProvider>
    </AuthProvider>,
  );

  await waitFor(() => expect(screen.getByTestId('module-state')).toBeInTheDocument());
  // Zvýraznenie nastavujú efekty – počkaj, kým sa stav ustáli.
  await new Promise((resolve) => setTimeout(resolve, 50));
  const shown = screen.getByTestId('module-state').getAttribute('data-highlight') ?? '';
  view.unmount();
  return shown;
}

function profilePage(identifier: string, highlight: number | null): PageProps {
  const numeric = /^\d+$/.test(identifier);
  return {
    initialRoute: 'user-profile',
    initialViewedUserId: numeric ? Number(identifier) : null,
    initialProfileSlug: identifier,
    initialHighlightedSkillId: highlight,
  };
}

describe('zvýraznenie po kroku späť cez hranicu stránky', () => {
  it('slugová identita: adresa určuje zvýraznenie', async () => {
    const shown = await backAcrossPages(
      '/dashboard/users/jana',
      `highlight=${FRESH}`,
      profilePage('jana', STALE),
    );

    expect(shown).toBe(String(FRESH));
  });

  it('číselná identita: adresa určuje zvýraznenie aj tu', async () => {
    const shown = await backAcrossPages(
      '/dashboard/users/7',
      `highlight=${FRESH}`,
      profilePage('7', STALE),
    );

    expect(shown).toBe(String(FRESH));
  });

  it('číselná identita bez parametra v adrese: nezvýrazní sa nič', async () => {
    const shown = await backAcrossPages('/dashboard/users/7', '', profilePage('7', STALE));

    expect(shown).toBe('');
  });

  it('číselná identita bez starých props: adresa platí ďalej', async () => {
    const shown = await backAcrossPages(
      '/dashboard/users/7',
      `highlight=${FRESH}`,
      profilePage('7', null),
    );

    expect(shown).toBe(String(FRESH));
  });

  it('parameter `offer` znamená to isté čo `highlight`', async () => {
    const shown = await backAcrossPages(
      '/dashboard/users/7',
      `offer=${FRESH}`,
      profilePage('7', STALE),
    );

    expect(shown).toBe(String(FRESH));
  });

  it('bežné otvorenie profilu (props aj adresa súhlasia) ostáva nedotknuté', async () => {
    expect(
      await backAcrossPages('/dashboard/users/jana', `highlight=${FRESH}`, profilePage('jana', FRESH)),
    ).toBe(String(FRESH));
    expect(
      await backAcrossPages('/dashboard/users/7', `highlight=${FRESH}`, profilePage('7', FRESH)),
    ).toBe(String(FRESH));
  });
});
