/**
 * Portfólio z pohľadu `DashboardContent`: krok späť z detailu položky
 * (`onMobileBack` hornej lišty, keď je aktívny modul `portfolio-detail`) a
 * založenie novej položky (`onCreatePortfolio`, ktorý dostane `ModuleRouter`).
 *
 * Testy idú cez vonkajšie rozhranie komponentu (props, ktoré dostane
 * `ModuleRouter` a `DashboardLayout`, adresa a história prehliadača), takže
 * nezávisia od toho, v ktorom súbore handlery žijú, a musia prejsť nezmenené
 * aj po rozdelení `DashboardContent.tsx`.
 */

import { act, render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ComponentProps } from 'react';
import Dashboard, { type DashboardProps } from '../Dashboard';
import type ModuleRouter from '../ModuleRouter';
import type DashboardLayout from '../DashboardLayout';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider, __resetAuthBootstrapSnapshotForTests } from '@/contexts/AuthContext';
import type { User } from '@/types';
import {
  adoptPortfolioDetailOrigin,
  openPortfolioDetail,
  resetPortfolioDetailOrigin,
} from '../modules/profile/portfolioRouting';

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
  api: { get: jest.fn(() => new Promise(() => {})), post: jest.fn(), delete: jest.fn() },
  endpoints: {
    auth: { me: '/auth/me/', logout: '/auth/logout/', login: '/auth/login/', register: '/auth/register/' },
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

/** Vstup rovno na adresu, ako ho robí odkaz alebo F5 (adresu dostane aj `usePathname`). */
async function renderAt(
  pathname: string,
  props: Partial<DashboardProps> & { initialRoute: string },
  { mobile = true, initialUser = baseUser }: { mobile?: boolean; initialUser?: User } = {},
) {
  mockPathname = pathname;
  window.history.replaceState(null, '', pathname);
  installViewport(mobile);
  render(
    <AuthProvider>
      <ThemeProvider>
        <Dashboard initialUser={initialUser} {...props} />
      </ThemeProvider>
    </AuthProvider>,
  );
  await waitFor(() => expect(activeModule()).toBe(props.initialRoute));
  // Dobeh úvodného overenia prihlásenia (AuthProvider) – inak by ho test zachytil mimo act.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

const renderPortfolioDetail = (pathname: string, props: Partial<DashboardProps> = {}) =>
  renderAt(pathname, { initialRoute: 'portfolio-detail', initialPortfolioItemId: 5, ...props });

/**
 * Adresa sa zmení bez prepnutia modulu (napr. `pushState`). Prekreslenie vynúti
 * zmena záložky na INÚ hodnotu (rovnaká by sa preskočila a adresa by sa neprečítala).
 */
const leavePathTo = (pathname: string) => {
  mockPathname = pathname;
  const otherTab = routerProps().ownProfileTab === 'posts' ? 'offers' : 'posts';
  act(() => routerProps().onOwnProfileTabChange?.(otherTab));
};

/** Horná lišta na mobile: „späť“ ide cez `onMobileBack` vrstvy. */
const pressBack = () => act(() => layoutProps().onMobileBack?.());

beforeEach(() => {
  jest.clearAllMocks();
  __resetAuthBootstrapSnapshotForTests();
  resetPortfolioDetailOrigin();
  localStorage.clear();
  sessionStorage.clear();
  mockRouterProps = null;
  mockLayoutProps = null;
  mockPathname = '/dashboard';
  window.history.replaceState(null, '', '/dashboard');
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('krok späť z detailu portfólia', () => {
  describe('keď appka pozná pôvod detailu', () => {
    it('spraví skutočný krok späť v histórii a nič iné', async () => {
      await renderPortfolioDetail('/dashboard/users/anna/portfolio/5', { initialProfileSlug: 'anna' });
      // Appka detail sama otvorila (zo záložky Portfólio) – detail si pôvod prevezme.
      openPortfolioDetail({ push: jest.fn() }, 'anna', 5);
      adoptPortfolioDetailOrigin();
      const back = jest.spyOn(window.history, 'back').mockImplementation(() => {});
      const storedBefore = localStorage.getItem('activeModule');

      pressBack();

      expect(back).toHaveBeenCalledTimes(1);
      expect(mockRouter.replace).not.toHaveBeenCalled();
      expect(activeModule()).toBe('portfolio-detail');
      expect(localStorage.getItem('activeModule')).toBe(storedBefore);
    });

    it('pôvod z iného načítania stránky (po F5) neplatí a ide sa cez replace', async () => {
      await renderPortfolioDetail('/dashboard/users/anna/portfolio/5', { initialProfileSlug: 'anna' });
      window.history.replaceState(
        { __svaplyPortfolioDetailOrigin: { version: 1, pageLoadId: 'stare-nacitanie' } },
        '',
        window.location.href,
      );
      const back = jest.spyOn(window.history, 'back').mockImplementation(() => {});

      pressBack();

      expect(back).not.toHaveBeenCalled();
      expect(mockRouter.replace).toHaveBeenCalledWith('/dashboard/users/anna/portfolio');
    });
  });

  describe('keď pôvod nie je známy (odkaz, F5)', () => {
    it('cudzí profil so slugom: modul, zobrazený používateľ a replace na zoznam', async () => {
      await renderPortfolioDetail('/dashboard/users/anna/portfolio/5', { initialProfileSlug: 'anna' });
      act(() => routerProps().onOwnProfileTabChange?.('posts'));

      pressBack();

      expect(mockRouter.replace).toHaveBeenCalledTimes(1);
      expect(mockRouter.replace).toHaveBeenCalledWith('/dashboard/users/anna/portfolio');
      expect(mockRouter.push).not.toHaveBeenCalled();
      expect(activeModule()).toBe('user-profile');
      expect(routerProps().viewedUserSlug).toBe('anna');
      expect(routerProps().viewedUserId).toBeNull();
      expect(routerProps().viewedUserSummary).toBeNull();
      expect(localStorage.getItem('activeModule')).toBe('user-profile');
      // Záložka vlastného profilu sa pri cudzom profile nemení.
      expect(routerProps().ownProfileTab).toBe('posts');
    });

    it('cudzí profil s číselným id sa otvorí podľa id', async () => {
      await renderPortfolioDetail('/dashboard/users/42/portfolio/5');

      pressBack();

      expect(mockRouter.replace).toHaveBeenCalledWith('/dashboard/users/42/portfolio');
      expect(activeModule()).toBe('user-profile');
      expect(routerProps().viewedUserId).toBe(42);
      expect(routerProps().viewedUserSlug).toBeNull();
    });

    it('slug so špeciálnymi znakmi sa v adrese zakóduje', async () => {
      await renderPortfolioDetail('/dashboard/users/an%20na/portfolio/5');

      pressBack();

      expect(mockRouter.replace).toHaveBeenCalledWith('/dashboard/users/an%20na/portfolio');
      expect(routerProps().viewedUserSlug).toBe('an na');
    });

    it('bez vlastníka v adrese sa vráti na vlastný profil, záložka Portfólio', async () => {
      // Modul detailu sa dá zapnúť aj stavom bez zmeny adresy (router je tu bez
      // účinku), takže vlastník nie je ani v adrese, ani v props.
      await renderAt('/dashboard', { initialRoute: 'home' });
      act(() => routerProps().onNotificationNavigate?.('/dashboard/users/anna/portfolio/5'));
      expect(activeModule()).toBe('portfolio-detail');
      expect(routerProps().viewedUserSlug).toBe('anna');
      act(() => routerProps().onOwnProfileTabChange?.('offers'));

      pressBack();

      expect(mockRouter.replace).toHaveBeenCalledWith('/dashboard/profile');
      expect(activeModule()).toBe('profile');
      expect(routerProps().viewedUserId).toBeNull();
      expect(routerProps().viewedUserSlug).toBeNull();
      expect(routerProps().ownProfileTab).toBe('portfolio');
      expect(localStorage.getItem('activeModule')).toBe('profile');
    });

    it('vlastník z props sa použije, keď adresa nemá tvar detailu', async () => {
      await renderPortfolioDetail('/dashboard/users/anna/portfolio/5', { initialProfileSlug: 'anna' });
      leavePathTo('/dashboard');

      pressBack();

      expect(mockRouter.replace).toHaveBeenCalledWith('/dashboard/users/anna/portfolio');
      expect(routerProps().viewedUserSlug).toBe('anna');
    });

    it('číselný vlastník z props sa použije ako id', async () => {
      await renderPortfolioDetail('/dashboard/users/42/portfolio/5', { initialViewedUserId: 42 });
      leavePathTo('/dashboard');

      pressBack();

      expect(mockRouter.replace).toHaveBeenCalledWith('/dashboard/users/42/portfolio');
      expect(routerProps().viewedUserId).toBe(42);
    });

    it('zobrazeného používateľa prepíše na vlastníka detailu (slug)', async () => {
      await renderPortfolioDetail('/dashboard/users/anna/portfolio/5', { initialProfileSlug: 'anna' });
      // Upozornenie medzitým prepne zobrazeného používateľa na cudzieho (číselné id).
      act(() => routerProps().onNotificationNavigate?.('/dashboard/users/77/portfolio/7'));
      expect(routerProps().viewedUserId).toBe(77);
      expect(routerProps().viewedUserSlug).toBeNull();

      pressBack();

      expect(routerProps().viewedUserId).toBeNull();
      expect(routerProps().viewedUserSlug).toBe('anna');
    });

    it('zobrazeného používateľa prepíše na vlastníka detailu (číselné id)', async () => {
      await renderPortfolioDetail('/dashboard/users/42/portfolio/5');
      act(() => routerProps().onNotificationNavigate?.('/dashboard/users/bob/portfolio/7'));
      expect(routerProps().viewedUserId).toBeNull();
      expect(routerProps().viewedUserSlug).toBe('bob');

      pressBack();

      expect(routerProps().viewedUserId).toBe(42);
      expect(routerProps().viewedUserSlug).toBeNull();
    });

    it('vlastník z medzier sa berie ako žiadny a vráti na vlastný profil', async () => {
      await renderPortfolioDetail('/dashboard/users/anna/portfolio/5', { initialProfileSlug: 'anna' });
      leavePathTo('/dashboard/users/%20/portfolio/5');

      pressBack();

      expect(mockRouter.replace).toHaveBeenCalledWith('/dashboard/profile');
      expect(activeModule()).toBe('profile');
      expect(routerProps().viewedUserSlug).toBeNull();
      expect(routerProps().ownProfileTab).toBe('portfolio');
    });

    // Handler „späť“ platí len pri module detailu, no panely sa dajú otvoriť aj
    // cez iný modul – preto sa berie handler z chvíle, keď detail je aktívny.
    // Panely sa vzájomne vylučujú, preto každý zvlášť.
    it.each([
      ['panel upozornení', () => layoutProps().onSidebarNotificationsClick?.(), () => layoutProps().isNotificationsPanelOpen],
      ['vyhľadávanie', () => layoutProps().onSidebarSearchClick?.(), () => layoutProps().isSearchOpen],
      ['pravý panel', () => layoutProps().onRightItemClick?.('offer-watches'), () => layoutProps().isRightSidebarOpen],
    ])('zatvorí: %s', async (_name, open, isOpen) => {
      await renderPortfolioDetail('/dashboard/users/anna/portfolio/5', { initialProfileSlug: 'anna' });
      const back = layoutProps().onMobileBack as () => void;
      act(() => open());
      expect(isOpen()).toBe(true);

      act(() => back());

      expect(isOpen()).toBe(false);
      expect(layoutProps().activeRightItem).toBe('');
    });

    it('chyba localStorage návrat nezruší', async () => {
      await renderPortfolioDetail('/dashboard/users/anna/portfolio/5', { initialProfileSlug: 'anna' });
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('storage blocked');
      });

      pressBack();

      expect(mockRouter.replace).toHaveBeenCalledWith('/dashboard/users/anna/portfolio');
      expect(activeModule()).toBe('user-profile');
    });
  });
});

describe('nová položka portfólia', () => {
  const createPortfolio = () => act(() => routerProps().onCreatePortfolio?.());

  it('prepne na tvorbu, záložku Portfólio a pridá záznam s adresou podľa slugu', async () => {
    await renderAt('/dashboard/profile', { initialRoute: 'profile' }, { mobile: false });
    const historyBefore = window.history.length;
    expect(routerProps().ownProfileTab).toBe('offers');

    createPortfolio();

    expect(activeModule()).toBe('portfolio-create');
    expect(routerProps().ownProfileTab).toBe('portfolio');
    expect(localStorage.getItem('activeModule')).toBe('portfolio-create');
    expect(window.location.pathname).toBe('/dashboard/users/testuser/portfolio/create');
    expect(window.history.length).toBe(historyBefore + 1);
    // Adresu mení `pushState` priamo, cez Next router nejde nič.
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('používateľ bez slugu sa v adrese identifikuje číselným id', async () => {
    await renderAt(
      '/dashboard/profile',
      { initialRoute: 'profile' },
      { mobile: false, initialUser: { ...baseUser, slug: '' } as User },
    );

    createPortfolio();

    expect(activeModule()).toBe('portfolio-create');
    expect(window.location.pathname).toBe('/dashboard/users/1/portfolio/create');
  });

  it('slug so špeciálnymi znakmi sa v adrese zakóduje', async () => {
    await renderAt(
      '/dashboard/profile',
      { initialRoute: 'profile' },
      { mobile: false, initialUser: { ...baseUser, slug: 'a b' } as User },
    );

    createPortfolio();

    expect(window.location.pathname).toBe('/dashboard/users/a%20b/portfolio/create');
  });

  it('bez slugu aj id sa modul prepne, ale adresa ostane', async () => {
    await renderAt(
      '/dashboard/profile',
      { initialRoute: 'profile' },
      { mobile: false, initialUser: { ...baseUser, id: 0, slug: '' } as User },
    );
    const historyBefore = window.history.length;

    createPortfolio();

    expect(activeModule()).toBe('portfolio-create');
    expect(routerProps().ownProfileTab).toBe('portfolio');
    expect(window.location.pathname).toBe('/dashboard/profile');
    expect(window.history.length).toBe(historyBefore);
  });

  it('chyba localStorage tvorbu nezruší', async () => {
    await renderAt('/dashboard/profile', { initialRoute: 'profile' }, { mobile: false });
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage blocked');
    });

    createPortfolio();

    expect(activeModule()).toBe('portfolio-create');
    expect(window.location.pathname).toBe('/dashboard/users/testuser/portfolio/create');
  });
});
