/**
 * Vstup na Nástenku od vrchu – cez skutočný dashboard.
 *
 * `<main data-dashboard-main>` je jeden DOM element pre všetky moduly;
 * `ModuleRouter` mení len jeho obsah. Profil aj Nastavenia si pri vstupe
 * scroll nulujú samy, Nástenka nie – priamy klik na „Nástenka"/„Domov" z
 * odscrollovaného profilu preto skončil kúsok pod vrchom.
 *
 * jsdom nemá layout, takže starú pozíciu na výšku feedu neoreže: bez resetu tu
 * `scrollTop` ostane presne tam, kde bol v profile. Práve to z testu robí
 * priamy dôkaz, že reset beží (alebo nebeží).
 *
 * Vlastný súbor: skladá celý dashboard (`AuthProvider` → `DashboardContent` →
 * `ModuleRouter` → `FeedList`), čo jednotkové testy feedu nepotrebujú.
 */

import React, { useLayoutEffect } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthProvider, __resetAuthBootstrapSnapshotForTests } from '@/contexts/AuthContext';
import DashboardContent from '../../../components/DashboardContent';
import FeedList from '../FeedList';
import { setCurrentAccountId } from '@/lib/currentAccount';
import {
  FEED_RETURN_STORAGE_KEY,
  resetFeedReturnState,
  saveFeedReturn,
} from '../feedReturnState';
import { openUserProfile } from '../feedProfileNavigation';
import { emitFeedShareLanding, resetFeedShareLanding } from '../feedShareLanding';
import { requestFeedHomeNavigation } from '../feedHomeNavigation';

const VIEWER_ID = 7;

const resolvedUser = {
  id: VIEWER_ID,
  username: 'tester',
  email: 'tester@example.com',
  first_name: 'Test',
  last_name: 'User',
  slug: 'test-user',
  user_type: 'individual',
  is_verified: true,
};

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useSearchParams: () => new URLSearchParams(''),
  usePathname: () => '/dashboard',
}));

jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(() => Promise.resolve({ status: 200, data: {} })),
    patch: jest.fn(() => Promise.resolve({ status: 200, data: {} })),
  },
  endpoints: {
    auth: { me: '/auth/me/', logout: '/auth/logout/' },
    dashboard: {
      userProfileBySlug: (slug: string) => `/profile/slug/${slug}`,
      userProfile: (id: number) => `/profile/${id}`,
    },
  },
  invalidateSession: jest.fn(),
  isTransientAuthFailureError: () => false,
  setMayHaveRefreshCookie: jest.fn(),
}));

jest.mock('@/lib/feedApi', () => ({
  listFeedPosts: jest.fn(),
  createFeedPost: jest.fn(),
  getFeedPost: jest.fn(),
  parseFeedPostId: () => null,
}));

jest.mock('@/lib/feedImageUpload', () => ({
  uploadFeedPostImages: jest.fn(),
  isAllowedFeedImageName: () => true,
  MAX_FEED_POST_IMAGES: 5,
  FEED_IMAGE_MAX_MB: 5,
  FEED_IMAGE_MAX_BYTES: 5 * 1024 * 1024,
  FEED_IMAGE_ACCEPT: '.jpg,.png',
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (_key: string, fallback: string) => fallback,
    locale: 'sk',
  }),
}));

let mockIsMobile = false;
jest.mock('@/hooks', () => ({
  useIsMobile: () => mockIsMobile,
  useIsMobileState: () => ({ isMobile: mockIsMobile, isResolved: true }),
}));

jest.mock('framer-motion', () => {
  const ReactLib = jest.requireActual('react');
  /** Ľubovoľný `motion.*` prvok vykreslí ten istý HTML tag bez animácií. */
  const motion = new Proxy(
    {},
    {
      get: (_target, tag: string) =>
        ReactLib.forwardRef(function MotionTag(
          { children, ...props }: Record<string, unknown> & { children?: React.ReactNode },
          ref: React.Ref<HTMLElement>,
        ) {
          const clean = { ...props };
          for (const key of ['initial', 'animate', 'exit', 'transition', 'variants', 'whileHover', 'whileTap', 'layout', 'drag']) {
            delete clean[key];
          }
          return ReactLib.createElement(tag, { ...clean, ref }, children);
        }),
    },
  );
  return {
    motion,
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => children ?? null,
    useReducedMotion: () => true,
  };
});

const { api } = jest.requireMock('@/lib/api');
const feedApi = jest.requireMock('@/lib/feedApi');
const mockedGet = api.get as jest.Mock;
const mockedList = feedApi.listFeedPosts as jest.Mock;

const author = {
  id: 10,
  display_name: 'Jana',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};

function post(id: number) {
  return {
    id,
    post_type: 'free_post',
    caption: `Príspevok ${id}`,
    author,
    images: [],
    shared_content: null,
    shared_content_unavailable: false,
    tagged_users: [],
    likes_count: 0,
    comments_count: 0,
    is_liked_by_me: false,
    can_manage: false,
    created_at: '2026-01-01T10:00:00Z',
  };
}

/** Zdieľaný scrollovateľný `<main>` – ten istý element pre všetky moduly. */
function dashboardMain(): HTMLElement {
  const main = document.querySelector<HTMLElement>('[data-dashboard-main]');
  if (!main) throw new Error('chýba <main data-dashboard-main>');
  return main;
}

/** Položka bočnej navigácie (desktop) – ten istý `onModuleChange` ako mobil. */
function sidebarItem(id: string): HTMLElement {
  const item = document.querySelector<HTMLElement>(`[data-sidebar-nav-item="${id}"]`);
  if (!item) throw new Error(`chýba položka navigácie ${id}`);
  return item;
}

/**
 * Zaznamenáva každý zápis `scrollTop` na elemente.
 *
 * Rozhoduje PORADIE: reset na vrch musí prísť pred doscrollovaním na nový
 * príspevok, inak by ho zrušil. Samotná výsledná hodnota by to nerozlíšila.
 */
function recordScrollWrites(element: HTMLElement, initial: number): number[] {
  let top = initial;
  const writes: number[] = [];
  Object.defineProperty(element, 'scrollTop', {
    configurable: true,
    get: () => top,
    set: (value: number) => {
      top = value;
      writes.push(value);
    },
  });
  return writes;
}

async function mountDashboard() {
  render(
    <AuthProvider>
      <DashboardContent initialRoute="home" />
    </AuthProvider>,
  );
  await screen.findByText('Príspevok 1');
}

/** Pár tikov na `requestAnimationFrame` a asynchrónny `history.back()` v jsdom. */
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 60));
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  // `AuthContext` si drží vyriešený bootstrap v module – bez resetu by ďalší
  // test `/me` nevolal a účet by ostal neznámy.
  __resetAuthBootstrapSnapshotForTests();
  resetFeedReturnState();
  resetFeedShareLanding();
  setCurrentAccountId(null);
  mockIsMobile = false;
  window.localStorage.clear();
  window.history.replaceState(null, '', '/dashboard');
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
  mockedGet.mockImplementation((url: string) =>
    url === '/auth/me/'
      ? Promise.resolve({ status: 200, data: resolvedUser })
      : Promise.resolve({ status: 200, data: {} }),
  );
  mockedList.mockResolvedValue({ results: [post(1), post(2)], next: null });
});

afterEach(() => {
  resetFeedReturnState();
  resetFeedShareLanding();
  setCurrentAccountId(null);
  document.querySelectorAll('[data-dashboard-main]').forEach((node) => node.remove());
});

describe('priamy klik na Nástenku z odscrollovaného profilu', () => {
  it('lands at the top on desktop (sidebar Profil → Nástenka)', async () => {
    await mountDashboard();

    act(() => sidebarItem('profile').click());
    await waitFor(() => expect(screen.queryByText('Príspevok 1')).not.toBeInTheDocument());
    // Používateľ doscrolluje profil na úplný spodok.
    dashboardMain().scrollTop = 3000;

    act(() => sidebarItem('home').click());
    await screen.findByText('Príspevok 1');

    expect(dashboardMain().scrollTop).toBe(0);
  });

  it('lands at the top on mobile (profile icon in the top bar → Domov)', async () => {
    mockIsMobile = true;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    await mountDashboard();

    const profileIcon = document.querySelector<HTMLElement>('[data-onboarding="profile-icon"]');
    act(() => profileIcon!.click());
    await waitFor(() => expect(screen.queryByText('Príspevok 1')).not.toBeInTheDocument());
    dashboardMain().scrollTop = 3000;

    const homeButton = document.querySelectorAll<HTMLElement>('[data-mobile-bottom-nav] button')[0];
    act(() => homeButton.click());
    await screen.findByText('Príspevok 1');

    expect(dashboardMain().scrollTop).toBe(0);
  });
});

describe('návrat na Nástenku ostáva návratom', () => {
  it('Back from a profile opened from a post header restores the exact position', async () => {
    await mountDashboard();
    dashboardMain().scrollTop = 1500;

    // Preklik na autora z hlavičky príspevku – táto cesta snímku zachytáva.
    act(() => openUserProfile({ id: 21, slug: 'peter' }));
    await waitFor(() => expect(screen.queryByText('Príspevok 1')).not.toBeInTheDocument());
    dashboardMain().scrollTop = 3000;

    mockedList.mockClear();
    act(() => window.history.back());
    await screen.findByText('Príspevok 1');
    await settle();

    // Snímka má kladnú pozíciu, takže reset na vrch sa nesmie spustiť.
    await waitFor(() => expect(dashboardMain().scrollTop).toBe(1500));
    expect(mockedList).not.toHaveBeenCalled();
  });

  it('restores the exact position after a reload (F5 on the profile, then Back)', async () => {
    // Stav po znovunačítaní: snímka v `sessionStorage` prežila, účet sa zistí
    // až cez `/me`. Zapisuje sa skutočným `saveFeedReturn`.
    setCurrentAccountId(VIEWER_ID);
    saveFeedReturn({
      posts: [post(7), post(8)] as never,
      nextUrl: null,
      scrollTop: 4200,
    });
    setCurrentAccountId(null);

    render(
      <AuthProvider>
        <DashboardContent initialRoute="home" />
      </AuthProvider>,
    );
    await screen.findByText('Príspevok 7');
    await settle();

    await waitFor(() => expect(dashboardMain().scrollTop).toBe(4200));
    expect(mockedList).not.toHaveBeenCalled();
  });
});

describe('priamy klik na Nástenku z profilu otvoreného z hlavičky príspevku', () => {
  /**
   * Tá istá cesta ako test na Späť vyššie – snímka existuje – ale namiesto
   * kroku späť príde výslovná voľba sekcie. Snímka patrí len návratu, takže
   * sa nesmie použiť: Nástenka sa načíta nanovo a od vrchu.
   */
  async function openAuthorProfileFromPostHeader() {
    await mountDashboard();
    dashboardMain().scrollTop = 1500;

    act(() => openUserProfile({ id: 21, slug: 'peter' }));
    await waitFor(() => expect(screen.queryByText('Príspevok 1')).not.toBeInTheDocument());
    // Predpoklad scenára: snímka pre Späť naozaj vznikla. Bez nej by test
    // prešiel aj so starou chybou.
    expect(window.sessionStorage.getItem(FEED_RETURN_STORAGE_KEY)).not.toBeNull();

    // Používateľ doscrolluje profil na spodok.
    dashboardMain().scrollTop = 3000;
    // Server medzitým vracia iný obsah – podľa neho sa pozná, že feed prišiel
    // zo servera, a nie zo starej snímky (tá drží príspevky 1 a 2).
    mockedList.mockClear();
    mockedList.mockResolvedValue({ results: [post(5), post(6)], next: null });
  }

  async function expectFreshFeed() {
    expect(await screen.findByText('Príspevok 5')).toBeInTheDocument();
    await settle();
    expect(screen.queryByText('Príspevok 1')).not.toBeInTheDocument();
    expect(mockedList).toHaveBeenCalledTimes(1);
    expect(dashboardMain().scrollTop).toBe(0);
    expect(window.sessionStorage.getItem(FEED_RETURN_STORAGE_KEY)).toBeNull();
  }

  // Len desktop: na mobile je profil z hlavičky príspevku vždy `user-profile`,
  // kde spodná navigácia chýba a hamburger otvára akcie profilu, nie menu.
  // Von sa tam dá len šípkou alebo krokom späť – teda práve návratom.
  it('loads the feed fresh at the top (sidebar Nástenka)', async () => {
    await openAuthorProfileFromPostHeader();

    act(() => sidebarItem('home').click());

    await expectFreshFeed();
  });
});

describe('pristátie po zdieľaní z profilu', () => {
  const scrollIntoView = Element.prototype.scrollIntoView;

  afterEach(() => {
    Element.prototype.scrollIntoView = scrollIntoView;
  });

  it('resets to the top BEFORE scrolling to the new post, never after', async () => {
    await mountDashboard();

    act(() => sidebarItem('profile').click());
    await waitFor(() => expect(screen.queryByText('Príspevok 1')).not.toBeInTheDocument());

    const main = dashboardMain();
    const writes = recordScrollWrites(main, 3000);
    // Doscrollovanie na novú kartu – v prehliadači by posunulo `<main>`.
    const landedOn: string[] = [];
    Element.prototype.scrollIntoView = function scrollIntoViewMock(this: Element) {
      landedOn.push(this.textContent ?? '');
      main.scrollTop = 777;
    };

    // Presne to, čo robí `FeedShareDialog` pri zdieľaní z profilu.
    mockedList.mockResolvedValue({ results: [post(99), post(1), post(2)], next: null });
    act(() => {
      emitFeedShareLanding(99);
      requestFeedHomeNavigation();
    });

    await screen.findByText('Príspevok 99');
    await waitFor(() => expect(landedOn).toHaveLength(1));
    await settle();

    expect(landedOn[0]).toContain('Príspevok 99');
    // Najprv vrch (vstup na Nástenku), až potom nový príspevok – a nič po ňom.
    expect(writes).toEqual([0, 777]);
    expect(main.scrollTop).toBe(777);
  });
});

describe('reset beží pred vykreslením', () => {
  it('moves <main> to the top in the layout phase, before anything is painted', async () => {
    const main = document.createElement('main');
    main.setAttribute('data-dashboard-main', '');
    document.body.appendChild(main);
    main.scrollTop = 3000;

    // Súrodenec za Nástenkou: jeho layout efekt beží po jej layout efektoch,
    // ale PRED všetkými bežnými efektmi – teda v tej istej fáze, v akej by
    // prehliadač kreslil. Ak tu `<main>` ešte nie je na vrchu, používateľ by
    // posunutú Nástenku na jeden snímok uvidel.
    const seenBeforePaint: number[] = [];
    function LayoutPhaseProbe() {
      useLayoutEffect(() => {
        seenBeforePaint.push(main.scrollTop);
      }, []);
      return null;
    }

    render(
      <>
        <FeedList />
        <LayoutPhaseProbe />
      </>,
    );

    expect(seenBeforePaint).toEqual([0]);
    await screen.findByText('Príspevok 1');
  });
});
