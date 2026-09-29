/**
 * Okno detailu príspevku z pohľadu `DashboardContent`: otvorenie cez kontext
 * (`useFeedPostOverlay`), adresa príspevku v histórii, zatvorenie (X, kontext,
 * tlačidlo späť v prehliadači, zatvorenie „preklikom inam“).
 *
 * Samotné okno je nahradené atrapou, ktorá zachytí props; história je skutočná
 * (`feedOverlayHistory` + jsdom). Testy idú cez vonkajšie rozhranie komponentu,
 * takže musia prejsť nezmenené aj po rozdelení `DashboardContent.tsx`.
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
  pushFeedOverlayHistory,
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
let mockOverlayMounts = 0;
let mockOverlayUnmounts = 0;
jest.mock('../modules/feed/FeedPostDetailOverlay', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return {
    __esModule: true,
    default: function MockFeedPostDetailOverlay(props: OverlayMockProps) {
      mockOverlayProps = props;
      useEffect(() => {
        mockOverlayMounts += 1;
        return () => {
          mockOverlayUnmounts += 1;
        };
      }, []);
      return <div data-testid="feed-overlay" data-post-id={props.postId} />;
    },
  };
});

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
const overlayApi = () => mockOverlayApi as OverlayApi;
const overlayProps = () => mockOverlayProps as OverlayMockProps;
const isOverlayOpen = () => document.querySelector('[data-testid="feed-overlay"]') !== null;
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

async function renderDashboard() {
  installViewport(false);
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

async function openOverlay(target: Parameters<OverlayApi['open']>[0]) {
  act(() => overlayApi().open(target));
  await settle();
}

async function closeOverlay(options?: Parameters<OverlayApi['close']>[0]) {
  act(() => overlayApi().close(options));
  await settle();
}

/** Zachytí `popstate` listenery pridané a odobrané za behu `run`. */
async function trackPopstateListeners(run: () => Promise<void>) {
  const added: EventListenerOrEventListenerObject[] = [];
  const removed: EventListenerOrEventListenerObject[] = [];
  const realAdd = window.addEventListener.bind(window);
  const realRemove = window.removeEventListener.bind(window);
  jest.spyOn(window, 'addEventListener').mockImplementation((type, listener, options) => {
    if (type === 'popstate' && listener) added.push(listener);
    realAdd(type, listener, options);
  });
  jest.spyOn(window, 'removeEventListener').mockImplementation((type, listener, options) => {
    if (type === 'popstate' && listener) removed.push(listener);
    realRemove(type, listener, options);
  });
  await run();
  return { added, removed };
}

beforeEach(() => {
  jest.clearAllMocks();
  __resetAuthBootstrapSnapshotForTests();
  resetFeedOverlayHistory();
  localStorage.clear();
  sessionStorage.clear();
  mockRouterProps = null;
  mockOverlayApi = null;
  mockOverlayProps = null;
  mockOverlayMounts = 0;
  mockOverlayUnmounts = 0;
  mockPathname = '/dashboard';
  window.history.replaceState(null, '', '/dashboard');
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('otvorenie okna', () => {
  it('okno je zavreté, kým ho niekto neotvorí, a adresa ostáva', async () => {
    await renderDashboard();
    expect(isOverlayOpen()).toBe(false);
    expect(currentUrl()).toBe('/dashboard');
    expect(isFeedOverlayHistoryBusy()).toBe(false);
  });

  it('ukáže príspevok, pridá do histórie presne jeden záznam s adresou príspevku', async () => {
    await renderDashboard();
    const historyLength = window.history.length;

    await openOverlay({ postId: 7 });

    expect(isOverlayOpen()).toBe(true);
    expect(overlayProps().postId).toBe(7);
    expect(overlayProps().highlightCommentId).toBeNull();
    expect(currentUrl()).toBe('/dashboard/feed/7');
    expect(window.history.length).toBe(historyLength + 1);
    expect(isFeedOverlayHistoryBusy()).toBe(true);
  });

  it('komentár z notifikácie sa pošle oknu aj zapíše do adresy', async () => {
    await renderDashboard();
    await openOverlay({ postId: 7, highlightCommentId: 12 });
    expect(overlayProps().highlightCommentId).toBe(12);
    expect(currentUrl()).toBe('/dashboard/feed/7?comment=12');
  });

  it('bez komentára (null) je adresa bez dotazu', async () => {
    await renderDashboard();
    await openOverlay({ postId: 7, highlightCommentId: null });
    expect(overlayProps().highlightCommentId).toBeNull();
    expect(currentUrl()).toBe('/dashboard/feed/7');
  });

  it('zmena príspevku v otvorenom okne adresu prepíše a ďalší záznam nepridá', async () => {
    await renderDashboard();
    await openOverlay({ postId: 7 });
    const historyLength = window.history.length;

    await openOverlay({ postId: 8, highlightCommentId: 3 });

    expect(overlayProps().postId).toBe(8);
    expect(overlayProps().highlightCommentId).toBe(3);
    expect(currentUrl()).toBe('/dashboard/feed/8?comment=3');
    expect(window.history.length).toBe(historyLength);
    expect(mockOverlayMounts).toBe(1);
  });

  it('otvorenie nemení modul ani nenavigovalo cez router (pod oknom sa nič neodmountuje)', async () => {
    await renderDashboard();
    await openOverlay({ postId: 7 });
    expect(routerProps().activeModule).toBe('home');
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
    expect(document.querySelector('[data-testid="module-state"]')).toBeInTheDocument();
  });
});

describe('zatvorenie okna', () => {
  it('krížik okna (onClose) okno zavrie a vráti adresu spred otvorenia krokom späť', async () => {
    await renderDashboard();
    await openOverlay({ postId: 7 });
    const backSpy = jest.spyOn(window.history, 'back');

    act(() => overlayProps().onClose());
    await settle();

    expect(isOverlayOpen()).toBe(false);
    expect(mockOverlayUnmounts).toBe(1);
    expect(backSpy).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(currentUrl()).toBe('/dashboard'));
    await settle();
    expect(isFeedOverlayHistoryBusy()).toBe(false);
  });

  it('zatvorenie cez kontext (close bez volieb) sa správa rovnako ako krížik', async () => {
    await renderDashboard();
    await openOverlay({ postId: 7 });
    const backSpy = jest.spyOn(window.history, 'back');

    await closeOverlay();

    expect(isOverlayOpen()).toBe(false);
    expect(backSpy).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(currentUrl()).toBe('/dashboard'));
    await settle();
  });

  it('zatvorenie s keepHistory adresu nechá (navigáciu rieši volajúci) a záznam zabudne', async () => {
    await renderDashboard();
    await openOverlay({ postId: 7 });
    const backSpy = jest.spyOn(window.history, 'back');

    await closeOverlay({ keepHistory: true });

    expect(isOverlayOpen()).toBe(false);
    expect(backSpy).not.toHaveBeenCalled();
    expect(currentUrl()).toBe('/dashboard/feed/7');
    expect(isFeedOverlayHistoryBusy()).toBe(false);
  });

  it('po zatvorení s keepHistory pridá ďalšie otvorenie nový záznam (starý sa už neprepisuje)', async () => {
    await renderDashboard();
    await openOverlay({ postId: 7 });
    await closeOverlay({ keepHistory: true });
    const historyLength = window.history.length;

    await openOverlay({ postId: 9 });

    expect(currentUrl()).toBe('/dashboard/feed/9');
    expect(window.history.length).toBe(historyLength + 1);
  });

  it('keepHistory: false sa berie ako bežné zatvorenie', async () => {
    await renderDashboard();
    await openOverlay({ postId: 7 });
    const backSpy = jest.spyOn(window.history, 'back');

    await closeOverlay({ keepHistory: false });

    expect(backSpy).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(currentUrl()).toBe('/dashboard'));
    await settle();
  });

  it('po zatvorení sa dá okno otvoriť znova (nový záznam, nový príspevok)', async () => {
    await renderDashboard();
    await openOverlay({ postId: 7 });
    await closeOverlay();
    await waitFor(() => expect(currentUrl()).toBe('/dashboard'));
    await settle();
    const pushSpy = jest.spyOn(window.history, 'pushState');
    const replaceSpy = jest.spyOn(window.history, 'replaceState');

    await openOverlay({ postId: 8 });

    expect(isOverlayOpen()).toBe(true);
    expect(overlayProps().postId).toBe(8);
    expect(currentUrl()).toBe('/dashboard/feed/8');
    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(pushSpy).toHaveBeenCalledWith(null, '', '/dashboard/feed/8');
    expect(replaceSpy).not.toHaveBeenCalled();
  });
});

describe('tlačidlo späť v prehliadači pri otvorenom okne', () => {
  it('okno zavrie a nezačne ďalší krok späť (záznam zmizol sám)', async () => {
    await renderDashboard();
    await openOverlay({ postId: 7 });
    expect(isFeedOverlayHistoryBusy()).toBe(true);
    const backSpy = jest.spyOn(window.history, 'back');

    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await settle();

    expect(isOverlayOpen()).toBe(false);
    expect(mockOverlayUnmounts).toBe(1);
    expect(backSpy).not.toHaveBeenCalled();
    expect(isFeedOverlayHistoryBusy()).toBe(false);
  });

  it('skutočný krok späť v histórii vráti adresu spred otvorenia a okno zavrie', async () => {
    await renderDashboard();
    await openOverlay({ postId: 7 });
    expect(currentUrl()).toBe('/dashboard/feed/7');

    act(() => {
      window.history.back();
    });
    await waitFor(() => expect(isOverlayOpen()).toBe(false));
    await settle();

    expect(currentUrl()).toBe('/dashboard');
    expect(isFeedOverlayHistoryBusy()).toBe(false);
  });

  it('po takomto zatvorení pridá ďalšie otvorenie nový záznam', async () => {
    await renderDashboard();
    await openOverlay({ postId: 7 });
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await settle();
    const historyLength = window.history.length;

    await openOverlay({ postId: 8 });

    expect(window.history.length).toBe(historyLength + 1);
  });

  it('listener `popstate` sa pri zatvorení odoberie', async () => {
    await renderDashboard();
    const { added, removed } = await trackPopstateListeners(async () => {
      await openOverlay({ postId: 7 });
      await closeOverlay({ keepHistory: true });
    });

    const overlayListeners = added.filter((listener) => removed.includes(listener));
    expect(overlayListeners.length).toBeGreaterThanOrEqual(1);
    expect(added.length).toBe(overlayListeners.length);
  });

  it('bez otvoreného okna `popstate` históriu okna nemení', async () => {
    await renderDashboard();
    pushFeedOverlayHistory('/dashboard/feed/5');
    expect(isFeedOverlayHistoryBusy()).toBe(true);

    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await settle();

    expect(isFeedOverlayHistoryBusy()).toBe(true);
  });

  it('po zatvorení okna už `popstate` históriu okna nemení', async () => {
    await renderDashboard();
    await openOverlay({ postId: 7 });
    await closeOverlay({ keepHistory: true });
    pushFeedOverlayHistory('/dashboard/feed/5');
    expect(isFeedOverlayHistoryBusy()).toBe(true);

    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await settle();

    expect(isFeedOverlayHistoryBusy()).toBe(true);
  });
});
