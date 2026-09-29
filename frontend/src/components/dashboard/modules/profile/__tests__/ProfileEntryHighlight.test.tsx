/**
 * Vstup na profil v bežiacej appke nevzkriesi staré zvýraznenie ponuky.
 *
 * Zvýraznenie má zálohu v `sessionStorage` (pre F5 na profile). Predtým ju
 * `useDashboardHighlighting` obnovoval pri KAŽDOM prepnutí na profil, ak bola
 * mladšia ako minúta – profil sa otvoril od vrchu a vzápätí ho `scrollIntoView`
 * odscrolloval na starú kartu. Na mobile cez ikonu profilu (desktop zálohu pri
 * prepnutí maže), a cez hlavičku príspevku na oboch.
 *
 * Skladá sa celý dashboard: `AuthProvider` → `DashboardContent` →
 * `ModuleRouter` → profil → sekcia ponúk. Mock `useSearchParams` je STABILNÝ
 * a mení sa len so zmenou adresy, ako v Next – nový objekt pri každom renderi
 * by efekt zvýraznenia prehrával donekonečna.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthProvider, __resetAuthBootstrapSnapshotForTests } from '@/contexts/AuthContext';
import DashboardContent from '../../../components/DashboardContent';
import { __resetHighlightDocumentEntryForTests } from '../../../hooks/useDashboardHighlighting';
import { setCurrentAccountId } from '@/lib/currentAccount';
import { resetFeedReturnState } from '../../feed/feedReturnState';
import { openUserProfile } from '../../feed/feedProfileNavigation';

jest.setTimeout(30000);

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

/** Vlastná ponuka – tá, ktorá bola pred chvíľou zvýraznená. */
const OFFER = {
  id: 55,
  category: 'Vzdelávanie',
  subcategory: 'skska',
  description: 'skska',
  detailed_description: '',
  price_from: 10,
  price_currency: 'EUR',
  district: '',
  location: '',
  images: [],
  is_hidden: false,
  type: 'offer',
  tags: [],
  opening_hours: null,
};

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn((url: string) => window.history.replaceState(window.history.state, '', url)),
  back: jest.fn(),
};
/** Ako Next: objekt query je ten istý, kým sa adresa nezmení. */
let mockSearchKey = '\u0000';
let mockSearch = new URLSearchParams('');
function mockSearchParams() {
  if (window.location.search !== mockSearchKey) {
    mockSearchKey = window.location.search;
    mockSearch = new URLSearchParams(mockSearchKey);
  }
  return mockSearch;
}

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => mockSearchParams(),
  usePathname: () => window.location.pathname,
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
      userSkills: (id: number) => `/users/${id}/skills/`,
    },
    skills: { list: '/skills/', detail: (id: number) => `/skills/${id}/` },
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

jest.mock('@/hooks', () => ({
  useIsMobile: () => true,
  useIsMobileState: () => ({ isMobile: true, isResolved: true }),
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

function dashboardMain(): HTMLElement {
  const main = document.querySelector<HTMLElement>('[data-dashboard-main]');
  if (!main) throw new Error('chýba <main data-dashboard-main>');
  return main;
}

/**
 * Zaznamenáva každý zápis `scrollTop` do KTORÉHOKOĽVEK `<main data-dashboard-main>`
 * – rozhoduje, čo prišlo PO resete. Háči setter na `Element.prototype`, nie na
 * jednej inštancii: dashboard dáva `<main>` nový DOM element pri každej zmene
 * modulu (`useDashboardMainKey`), takže reset pri vstupe na profil zapisuje
 * už do INÉHO elementu, než na akom stála Nástenka.
 */
function recordScrollWrites(): { writes: number[]; uninstall: () => void } {
  const proto = Element.prototype;
  const original = Object.getOwnPropertyDescriptor(proto, 'scrollTop')!;
  const nativeSet = original.set!;
  const writes: number[] = [];
  Object.defineProperty(proto, 'scrollTop', {
    configurable: true,
    get: original.get,
    set(this: Element, value: number) {
      if (this.hasAttribute('data-dashboard-main')) writes.push(value);
      nativeSet.call(this, value);
    },
  });
  return {
    writes,
    uninstall: () => {
      if (Object.getOwnPropertyDescriptor(proto, 'scrollTop')?.set !== original.set) {
        Object.defineProperty(proto, 'scrollTop', original);
      }
    },
  };
}

/** Zvýraznenie zapísané pred chvíľou – napr. zo Spoluprác či upozornenia. */
function storeRecentHighlight(id: number) {
  sessionStorage.setItem('highlightedSkillId', String(id));
  sessionStorage.setItem('highlightedSkillTime', String(Date.now() - 20_000));
}

async function waitAWhile(ms = 300) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

let scrolledTo: string[] = [];
const originalScrollIntoView = Element.prototype.scrollIntoView;

/** Dokument načítaný na Nástenke, feed odscrollovaný. */
async function mountOnFeed() {
  render(
    <AuthProvider>
      <DashboardContent initialRoute="home" />
    </AuthProvider>,
  );
  await screen.findByText('Príspevok 1');
  dashboardMain().scrollTop = 3000;
  const { writes, uninstall } = recordScrollWrites();
  // Píše do AKTUÁLNEHO `<main>`, presne ako produkčný kód (nie do zachytenej,
  // po výmene modulu už odpojenej referencie).
  Element.prototype.scrollIntoView = function scrollIntoViewMock(this: Element) {
    scrolledTo.push(this.textContent ?? '');
    dashboardMain().scrollTop = 1200;
  };
  return { writes, uninstall };
}

beforeEach(() => {
  jest.clearAllMocks();
  __resetAuthBootstrapSnapshotForTests();
  // Každý test je nový dokument načítaný na Nástenke.
  __resetHighlightDocumentEntryForTests();
  resetFeedReturnState();
  setCurrentAccountId(null);
  sessionStorage.clear();
  window.localStorage.clear();
  window.history.replaceState(null, '', '/dashboard');
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
  scrolledTo = [];
  mockedGet.mockImplementation((url: string) => {
    if (url === '/auth/me/') return Promise.resolve({ status: 200, data: resolvedUser });
    if (url === '/profile/slug/test-user' || url === `/profile/${VIEWER_ID}`) {
      return Promise.resolve({ status: 200, data: resolvedUser });
    }
    if (url.includes('/skills/')) return Promise.resolve({ status: 200, data: [OFFER] });
    return Promise.resolve({ status: 200, data: {} });
  });
  mockedList.mockResolvedValue({ results: [post(1), post(2)], next: null });
});

afterEach(() => {
  Element.prototype.scrollIntoView = originalScrollIntoView;
  resetFeedReturnState();
  setCurrentAccountId(null);
  sessionStorage.clear();
});

/** Karta ponuky je na obrazovke – bez nej by „žiadny scroll" nič nedokazoval. */
async function waitForOfferCard() {
  await screen.findAllByText(/skska/);
  await waitAWhile();
}

describe('vstup na profil do minúty od iného zvýraznenia', () => {
  it('mobile profile icon: opens at the top, nothing is highlighted', async () => {
    const { writes, uninstall } = await mountOnFeed();
    try {
      storeRecentHighlight(55);

      document.querySelector<HTMLElement>('[data-onboarding="profile-icon"]')!.click();
      await waitForOfferCard();

      // Vrch pri odchode z Nástenky (kým je v DOM), vrch z nového vstupu – a nič po ňom.
      expect(writes).toEqual([0, 0]);
      expect(dashboardMain().scrollTop).toBe(0);
      expect(scrolledTo).toEqual([]);
      expect(window.location.search).not.toContain('highlight');
      expect(mockRouter.replace).not.toHaveBeenCalledWith(expect.stringContaining('highlight='));
    } finally {
      uninstall();
    }
  });

  it('profile opened from a post header (Nález B): nothing is highlighted', async () => {
    const { writes, uninstall } = await mountOnFeed();
    try {
      storeRecentHighlight(55);

      // Preklik na autora z hlavičky príspevku – bez zvýraznenia.
      openUserProfile({ id: VIEWER_ID, slug: 'test-user' });
      await waitForOfferCard();

      // Vrch pri odchode z Nástenky, vrch z nového vstupu – a nič po ňom.
      expect(writes).toEqual([0, 0]);
      expect(dashboardMain().scrollTop).toBe(0);
      expect(scrolledTo).toEqual([]);
      expect(window.location.search).not.toContain('highlight');
    } finally {
      uninstall();
    }
  });
});

describe('priame načítanie aliasu vlastného profilu', () => {
  it('keeps highlight, tab and fragment together when /dashboard/profile is canonicalized', async () => {
    window.history.replaceState(null, '', '/dashboard/profile?highlight=55&tab=offers#sekcia');
    Element.prototype.scrollIntoView = function scrollIntoViewMock(this: Element) {
      scrolledTo.push(this.textContent ?? '');
    };

    render(
      <AuthProvider>
        <DashboardContent initialRoute="profile" />
      </AuthProvider>,
    );

    // `/dashboard/profile` je len iný tvar adresy vlastného profilu – všetko,
    // čo v nej je, patrí profilu a musí prejsť so sebou naraz.
    await waitFor(() => expect(window.location.pathname).toBe('/dashboard/users/test-user'));
    await waitFor(() => expect(scrolledTo).toHaveLength(1));
    expect(scrolledTo[0]).toContain('skska');
    const query = new URLSearchParams(window.location.search);
    expect(query.get('highlight')).toBe('55');
    expect(query.get('tab')).toBe('offers');
    expect(window.location.hash).toBe('#sekcia');
  });
});

describe('explicitné zvýraznenie ďalej funguje', () => {
  it('goToMyProfile with a highlight (received request) scrolls to the card', async () => {
    await mountOnFeed();

    // Karta aj detail prijatej žiadosti v Spoluprácach.
    window.dispatchEvent(new CustomEvent('goToMyProfile', { detail: { highlightId: 55 } }));

    await waitFor(() => expect(scrolledTo).toHaveLength(1));
    expect(scrolledTo[0]).toContain('skska');
    expect(window.location.search).toContain('highlight=55');
  });

  it('goToUserProfile with a highlight (sent request, proposal) scrolls to the card', async () => {
    await mountOnFeed();

    window.dispatchEvent(
      new CustomEvent('goToUserProfile', {
        detail: { identifier: 'test-user', highlightId: 55 },
      }),
    );

    await waitFor(() => expect(scrolledTo).toHaveLength(1));
    expect(scrolledTo[0]).toContain('skska');
    expect(window.location.search).toContain('highlight=55');
  });
});
