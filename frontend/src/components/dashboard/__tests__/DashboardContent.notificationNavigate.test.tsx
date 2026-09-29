/**
 * Klik na upozornenie: `DashboardContent` prijme cieľovú adresu a rozhodne, čo
 * sa v appke stane (modul, zobrazený používateľ, zvýraznená karta, zatvorenie
 * panelov, navigácia).
 *
 * Testy idú cez vonkajšie rozhranie komponentu – `onNotificationNavigate`, ktoré
 * dostane `ModuleRouter`, a `notificationsOverlay`, ktorý dostane
 * `DashboardLayout`. Nezávisia teda od toho, v ktorom súbore handler žije, a
 * musia prejsť nezmenené aj po rozdelení `DashboardContent.tsx`.
 */

import { act, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ComponentProps, ReactElement } from 'react';
import Dashboard from '../Dashboard';
import type ModuleRouter from '../ModuleRouter';
import type DashboardLayout from '../DashboardLayout';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider, __resetAuthBootstrapSnapshotForTests } from '@/contexts/AuthContext';
import type { User } from '@/types';
import type { SearchUserResult } from '../modules/search/types';

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

jest.mock('../modules/feed/FeedPostDetailOverlay', () => ({
  __esModule: true,
  default: (props: { postId: number; highlightCommentId: number | null; onClose: () => void }) => (
    <div
      data-testid="feed-overlay"
      data-post-id={props.postId}
      data-comment-id={props.highlightCommentId ?? ''}
    >
      <button type="button" onClick={props.onClose}>
        zavrieť okno
      </button>
    </div>
  ),
}));

/** Router, ktorý ako Next skutočne zmení adresu (zvýraznenie karty ju číta priamo). */
function navigateTo(url: string, mode: 'push' | 'replace') {
  window.history[mode === 'push' ? 'pushState' : 'replaceState'](null, '', url);
  mockPathname = new URL(url, 'http://localhost').pathname;
}
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

const user = {
  id: 1, username: 'testuser', email: 'test@example.com', first_name: 'Test', last_name: 'User',
  slug: 'testuser', user_type: 'individual', is_verified: true, is_public: true,
  created_at: '2023-01-01T00:00:00Z', updated_at: '2023-01-01T00:00:00Z',
  profile_completeness: 80,
} as User;

const routerProps = () => mockRouterProps as unknown as ModuleRouterProps;
const layoutProps = () => mockLayoutProps as unknown as DashboardLayoutProps;
const activeModule = () => routerProps().activeModule;

let mockIsMobile = false;

function installViewport(isMobile: boolean) {
  mockIsMobile = isMobile;
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: isMobile ? 390 : 1280 });
  (window as unknown as { matchMedia: unknown }).matchMedia = jest.fn().mockImplementation((q: string) => ({
    matches: q.includes('max-width: 1023px') ? mockIsMobile : false,
    media: q,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
}

async function renderDashboard({ mobile = false }: { mobile?: boolean } = {}) {
  installViewport(mobile);
  render(
    <AuthProvider>
      <ThemeProvider>
        <Dashboard initialUser={user} initialRoute="home" />
      </ThemeProvider>
    </AuthProvider>,
  );
  await waitFor(() => expect(activeModule()).toBe('home'));
  // Dobeh úvodného overenia prihlásenia (AuthProvider) – inak by ho test zachytil mimo act.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/** Klik na upozornenie – tak, ako ho volá panel aj celoobrazovková stránka. */
function clickNotification(targetUrl: string) {
  act(() => {
    routerProps().onNotificationNavigate?.(targetUrl);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRouter.push.mockImplementation((url: string) => navigateTo(url, 'push'));
  mockRouter.replace.mockImplementation((url: string) => navigateTo(url, 'replace'));
  __resetAuthBootstrapSnapshotForTests();
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

describe('adresy mimo dashboardu sa ignorujú', () => {
  it.each([
    '',
    '/login',
    '/dashboardX',
    'dashboard/requests',
    '//dashboard/requests',
    'https://example.com/dashboard/requests',
    // Kontrola pustí len presne '/dashboard' alebo '/dashboard/…' – adresa
    // Nástenky s query či hashom sa preto ignoruje (viď nález v správe).
    '/dashboard?from=push',
    '/dashboard#top',
  ])('%p nič nezmení', async (target) => {
    await renderDashboard();
    act(() => layoutProps().onSidebarNotificationsClick?.());
    expect(layoutProps().isNotificationsPanelOpen).toBe(true);

    clickNotification(target);

    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(activeModule()).toBe('home');
    // Panel ostáva otvorený – klik sa nespracoval vôbec.
    expect(layoutProps().isNotificationsPanelOpen).toBe(true);
  });
});

describe('cieľový modul podľa adresy', () => {
  it.each<[string, string]>([
    ['/dashboard/requests', 'requests'],
    ['/dashboard/requests/', 'requests'],
    ['/dashboard/messages', 'messages'],
    ['/dashboard/messages/12', 'messages'],
    ['/dashboard/offers/5/reviews', 'offer-reviews'],
    ['/dashboard/settings/notifications', 'notification-settings'],
    ['/dashboard/settings/account', 'account-settings'],
    ['/dashboard/settings/blocked', 'blocked-users'],
    ['/dashboard/notifications', 'notifications'],
    ['/dashboard/favorites', 'favorites'],
    ['/dashboard/search', 'search'],
    ['/dashboard/settings', 'settings'],
    ['/dashboard/language', 'language'],
    ['/dashboard/account-type', 'account-type'],
    ['/dashboard/privacy', 'privacy'],
    ['/dashboard/skills/offer', 'skills-offer'],
    ['/dashboard/skills/search', 'skills-search'],
    ['/dashboard/skills', 'skills'],
    ['/dashboard/profile', 'profile'],
    ['/dashboard/users/anna', 'user-profile'],
    ['/dashboard/users/anna/portfolio', 'user-profile'],
    ['/dashboard/users/anna/portfolio/3', 'portfolio-detail'],
    ['/dashboard/users/anna/portfolio/create', 'portfolio-create'],
    ['/dashboard/requests?tab=sent#top', 'requests'],
  ])('%s → %s', async (target, expectedModule) => {
    await renderDashboard();

    clickNotification(target);

    expect(activeModule()).toBe(expectedModule);
    expect(localStorage.getItem('activeModule')).toBe(expectedModule);
    expect(mockRouter.push).toHaveBeenCalledTimes(1);
    expect(mockRouter.push).toHaveBeenCalledWith(target);
  });

  it('neznáma adresa v dashboarde: modul ostáva, navigácia prebehne', async () => {
    await renderDashboard();
    const storedBefore = localStorage.getItem('activeModule');

    clickNotification('/dashboard/unknown-section');

    expect(activeModule()).toBe('home');
    expect(localStorage.getItem('activeModule')).toBe(storedBefore);
    expect(mockRouter.push).toHaveBeenCalledWith('/dashboard/unknown-section');
  });
});

describe('príspevok z upozornenia', () => {
  it('na desktope sa otvorí v okne nad appkou a nenaviguje sa', async () => {
    await renderDashboard();
    act(() => layoutProps().onSidebarNotificationsClick?.());

    clickNotification('/dashboard/feed/42?comment=7');

    const overlay = screen.getByTestId('feed-overlay');
    expect(overlay).toHaveAttribute('data-post-id', '42');
    expect(overlay).toHaveAttribute('data-comment-id', '7');
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(layoutProps().isNotificationsPanelOpen).toBe(false);
    expect(activeModule()).toBe('home');
    expect(window.location.pathname).toBe('/dashboard/feed/42');
    expect(screen.queryByTestId('feed-overlay')).not.toBeNull();
  });

  it('na desktope bez komentára otvorí okno bez zvýraznenia', async () => {
    await renderDashboard();

    clickNotification('/dashboard/feed/42');

    expect(screen.getByTestId('feed-overlay')).toHaveAttribute('data-comment-id', '');
  });

  it('otvorenie okna zavrie aj vyhľadávanie', async () => {
    await renderDashboard();
    act(() => layoutProps().onSidebarSearchClick?.());
    expect(layoutProps().isSearchOpen).toBe(true);

    clickNotification('/dashboard/feed/42');

    expect(screen.getByTestId('feed-overlay')).toBeInTheDocument();
    expect(layoutProps().isSearchOpen).toBe(false);
  });

  it('na mobile ostáva celoobrazovková stránka: okno sa neotvorí, naviguje sa', async () => {
    await renderDashboard({ mobile: true });

    clickNotification('/dashboard/feed/42?comment=7');

    expect(screen.queryByTestId('feed-overlay')).toBeNull();
    expect(mockRouter.push).toHaveBeenCalledWith('/dashboard/feed/42?comment=7');
  });
});

describe('žiadosti (requests)', () => {
  it('cieľ zo žiadostí sa odovzdá modulu a každý ďalší klik má nový kľúč', async () => {
    await renderDashboard();

    clickNotification('/dashboard/requests?status=active&tab=sent');
    expect(routerProps().requestsRouteIntent).toEqual({ statusTab: 'active', tab: 'sent', key: 1 });

    clickNotification('/dashboard/requests');
    expect(routerProps().requestsRouteIntent).toEqual({ statusTab: 'pending', tab: 'received', key: 2 });
  });

  it('prechod na iný modul zahodí cieľ zo žiadostí', async () => {
    await renderDashboard();
    clickNotification('/dashboard/requests?tab=sent');
    expect(routerProps().requestsRouteIntent).not.toBeNull();

    clickNotification('/dashboard/favorites');

    expect(routerProps().requestsRouteIntent).toBeNull();
  });

  it('adresa bez modulu (neznáma) zahodí cieľ zo žiadostí tiež', async () => {
    await renderDashboard();
    clickNotification('/dashboard/requests?tab=sent');

    clickNotification('/dashboard/unknown-section');

    expect(routerProps().requestsRouteIntent).toBeNull();
  });
});

describe('zobrazený používateľ', () => {
  const summary = { id: 42, username: 'anna' } as unknown as SearchUserResult;

  async function withViewedUser() {
    await renderDashboard();
    act(() => routerProps().onViewUserProfile?.(42, 'anna', summary));
    expect(routerProps().viewedUserId).toBe(42);
    expect(routerProps().viewedUserSummary).toBe(summary);
  }

  it('číselný identifikátor nastaví id a zruší slug', async () => {
    await renderDashboard();

    clickNotification('/dashboard/users/42');

    expect(routerProps().viewedUserId).toBe(42);
    expect(routerProps().viewedUserSlug).toBeNull();
  });

  it('slug nastaví slug a zruší id', async () => {
    await renderDashboard();

    clickNotification('/dashboard/users/anna');

    expect(routerProps().viewedUserId).toBeNull();
    expect(routerProps().viewedUserSlug).toBe('anna');
  });

  it('číselný identifikátor zruší slug predošlého profilu', async () => {
    await renderDashboard();
    clickNotification('/dashboard/users/anna');
    expect(routerProps().viewedUserSlug).toBe('anna');

    clickNotification('/dashboard/users/42');

    expect(routerProps().viewedUserId).toBe(42);
    expect(routerProps().viewedUserSlug).toBeNull();
  });

  it('slug zruší číselné id predošlého profilu', async () => {
    await renderDashboard();
    clickNotification('/dashboard/users/42');
    expect(routerProps().viewedUserId).toBe(42);

    clickNotification('/dashboard/users/anna');

    expect(routerProps().viewedUserId).toBeNull();
    expect(routerProps().viewedUserSlug).toBe('anna');
  });

  it('detail portfólia prevezme vlastníka z adresy', async () => {
    await renderDashboard();

    clickNotification('/dashboard/users/anna/portfolio/3');

    expect(activeModule()).toBe('portfolio-detail');
    expect(routerProps().viewedUserSlug).toBe('anna');
  });

  it('prechod na iný profil zahodí zhrnutie predošlého', async () => {
    await withViewedUser();

    clickNotification('/dashboard/users/77');

    expect(routerProps().viewedUserId).toBe(77);
    expect(routerProps().viewedUserSummary).toBeNull();
  });

  it('prechod na iný modul zahodí zobrazeného používateľa aj zhrnutie', async () => {
    await withViewedUser();

    clickNotification('/dashboard/favorites');

    expect(routerProps().viewedUserId).toBeNull();
    expect(routerProps().viewedUserSlug).toBeNull();
    expect(routerProps().viewedUserSummary).toBeNull();
  });

  it('neznáma adresa zobrazeného používateľa nemení', async () => {
    await withViewedUser();

    clickNotification('/dashboard/unknown-section');

    expect(routerProps().viewedUserId).toBe(42);
    expect(routerProps().viewedUserSummary).toBe(summary);
  });
});

describe('zvýraznenie karty z upozornenia', () => {
  it('na vlastnom profile zvýrazní kartu z parametra offer a zapamätá si ju', async () => {
    await renderDashboard();

    clickNotification('/dashboard/profile?offer=5');

    expect(routerProps().highlightedSkillId).toBe(5);
    expect(sessionStorage.getItem('highlightedSkillId')).toBe('5');
    expect(Number(sessionStorage.getItem('highlightedSkillTime'))).toBeGreaterThan(0);
  });

  it('na cudzom profile zvýrazní kartu z parametra highlight', async () => {
    await renderDashboard();

    clickNotification('/dashboard/users/anna?highlight=7');

    expect(routerProps().highlightedSkillId).toBe(7);
    expect(sessionStorage.getItem('highlightedSkillId')).toBe('7');
  });

  it('parameter offer má prednosť pred parametrom highlight', async () => {
    await renderDashboard();

    clickNotification('/dashboard/profile?offer=5&highlight=9');

    expect(routerProps().highlightedSkillId).toBe(5);
  });

  // Router tu adresu nemení, takže do úložiska zapisuje len samotný handler
  // (inak by zapísal aj hook čítajúci adresu po navigácii).
  it.each([
    ['vlastný profil', '/dashboard/profile?offer=5', 5],
    ['cudzí profil', '/dashboard/users/anna?highlight=7', 7],
  ])('handler zvýrazní kartu sám: %s', async (_name, target, id) => {
    mockRouter.push.mockImplementation(() => undefined);
    await renderDashboard();

    clickNotification(target);

    expect(sessionStorage.getItem('highlightedSkillId')).toBe(String(id));
    expect(Number(sessionStorage.getItem('highlightedSkillTime'))).toBeGreaterThan(0);
  });

  // Vlastná kontrola id v handleri.
  // (Hook useDashboardHighlighting, ktorý číta adresu po navigácii, akceptuje
  // aj 0, záporné a desatinné čísla – to je mimo tohto súboru, viď správa.)
  it.each(['abc', '0', '-3', '1.5', ''])('handler neplatné id %p nezvýrazní', async (raw) => {
    mockRouter.push.mockImplementation(() => undefined);
    await renderDashboard();

    clickNotification(`/dashboard/profile?offer=${raw}`);

    expect(routerProps().highlightedSkillId).toBeNull();
    expect(sessionStorage.getItem('highlightedSkillId')).toBeNull();
  });

  it('mimo profilu sa parameter ignoruje', async () => {
    await renderDashboard();

    clickNotification('/dashboard/requests?offer=5');

    expect(routerProps().highlightedSkillId).toBeNull();
    expect(sessionStorage.getItem('highlightedSkillId')).toBeNull();
  });
});

describe('zatvorenie panelov', () => {
  it('klik zavrie panel upozornení, vyhľadávanie aj pravý panel', async () => {
    await renderDashboard();
    act(() => layoutProps().onRightItemClick?.('offer-watches'));
    expect(layoutProps().isRightSidebarOpen).toBe(true);
    act(() => layoutProps().onSidebarSearchClick?.());
    expect(layoutProps().isSearchOpen).toBe(true);
    act(() => layoutProps().onSidebarNotificationsClick?.());
    expect(layoutProps().isNotificationsPanelOpen).toBe(true);

    clickNotification('/dashboard/favorites');

    expect(layoutProps().isNotificationsPanelOpen).toBe(false);
    expect(layoutProps().isSearchOpen).toBe(false);
    expect(layoutProps().isRightSidebarOpen).toBe(false);
    expect(layoutProps().activeRightItem).toBe('');
  });

  // Panely sa vzájomne vylučujú (otvorenie jedného zavrie ostatné), preto každý zvlášť.
  // Modul sa nemení, takže panel nezavrie nič iné než handler upozornenia.
  it.each([
    ['panel upozornení', () => layoutProps().onSidebarNotificationsClick?.(), () => layoutProps().isNotificationsPanelOpen],
    ['vyhľadávanie', () => layoutProps().onSidebarSearchClick?.(), () => layoutProps().isSearchOpen],
    ['pravý panel', () => layoutProps().onRightItemClick?.('offer-watches'), () => layoutProps().isRightSidebarOpen],
  ])('klik na aktuálny modul zavrie: %s', async (_name, open, isOpen) => {
    await renderDashboard();
    act(() => open());
    expect(isOpen()).toBe(true);

    clickNotification('/dashboard');

    expect(activeModule()).toBe('home');
    expect(isOpen()).toBe(false);
    expect(layoutProps().activeRightItem).toBe('');
  });

  it('krížik panela upozornení ho zavrie', async () => {
    await renderDashboard();
    act(() => layoutProps().onSidebarNotificationsClick?.());
    expect(layoutProps().isNotificationsPanelOpen).toBe(true);

    act(() => layoutProps().onNotificationsPanelClose?.());

    expect(layoutProps().isNotificationsPanelOpen).toBe(false);
  });

  it('panel upozornení volá ten istý handler ako obrazovka upozornení', async () => {
    await renderDashboard();
    const overlay = layoutProps().notificationsOverlay as ReactElement<{
      onNavigate: (target: string) => void;
    }>;

    act(() => overlay.props.onNavigate('/dashboard/requests?tab=sent'));

    expect(activeModule()).toBe('requests');
    expect(mockRouter.push).toHaveBeenCalledWith('/dashboard/requests?tab=sent');
  });
});

describe('úložisko prehliadača nie je dostupné', () => {
  it('chyba localStorage navigáciu nezruší', async () => {
    await renderDashboard();
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });

    clickNotification('/dashboard/requests');

    expect(activeModule()).toBe('requests');
    expect(mockRouter.push).toHaveBeenCalledWith('/dashboard/requests');
  });

  it('chyba sessionStorage zvýraznenie nezruší', async () => {
    await renderDashboard();
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });

    clickNotification('/dashboard/profile?offer=5');

    expect(routerProps().highlightedSkillId).toBe(5);
    expect(mockRouter.push).toHaveBeenCalledWith('/dashboard/profile?offer=5');
  });
});
