/**
 * Návrat z detailu portfólia na profil, ktorý sa otvoril so zvýraznenou ponukou.
 *
 * Cesta: Nástenka → klik na ponuku (profil so zvýraznenou ponukou) → záložka Portfólio →
 * detail položky → krok späť. Čakalo sa, že používateľ skončí na tom istom profile
 * v záložke Portfólio. Skončil v záložke Ponuky, ktorá sa navyše znova odscrollovala
 * na pôvodne zvýraznenú ponuku a znova ju zvýraznila.
 *
 * Zvýraznenie nesie adresa dvoma parametrami a oba sú tu pokryté: karta ponuky na
 * Nástenke posiela `offerId` (`?offer=`), upozornenia a žiadosti `highlightId`
 * (`?highlight=`). Vlastný profil dostáva zvýraznenie len cez `?highlight=`.
 *
 * Príčina: klik na záložku Portfólio zapísal do adresy len `?tab=portfolio` a
 * zvýraznenie v nej nechal. Záznam histórie „profil na Portfóliu“ tak niesol aj
 * zvýraznenie a krok späť z detailu doň ho z adresy znova aktivoval – zvýraznená
 * ponuka patrí záložke Ponuky, takže ju vynútil.
 *
 * Skladá sa celý dashboard: `AuthProvider` → `DashboardContent` → `ModuleRouter` →
 * profil → sekcia ponúk/portfólia. Mock `useSearchParams` je STABILNÝ a mení sa len so
 * zmenou adresy, ako v Next – nový objekt pri každom renderi by efekt zvýraznenia
 * prehrával donekonečna. `router.push` skutočne zapisuje do histórie, bez toho by klik
 * na kartu položky nevytvoril záznam, na ktorý sa dá vrátiť.
 *
 * Krok späť na mobile ide cez skutočnú šípku hornej lišty. Šípka v samotnom detaile na
 * desktope sa tu nepoužíva zámerne: vracia sa cez `router.replace` a chybou nie je
 * zasiahnutá – zasiahnuté je len prehliadačové Späť (`history.back()`).
 */

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthProvider, __resetAuthBootstrapSnapshotForTests } from '@/contexts/AuthContext';
import DashboardContent from '../../../components/DashboardContent';
import { __resetHighlightDocumentEntryForTests } from '../../../hooks/useDashboardHighlighting';
import { setCurrentAccountId } from '@/lib/currentAccount';
import { resetFeedReturnState } from '../../feed/feedReturnState';
import { resetPortfolioDetailOrigin } from '../portfolioRouting';

jest.setTimeout(40000);

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
  // Dokončený tutoriál a nápovedy: bez nich by sa nad profilom spustil tutoriál, ukladal by svoj
  // stav (PATCH) a mockovaná odpoveď by ho zacyklila.
  mobile_onboarding: { version: 1, status: 'completed', step: 'dashboard_finish' },
  desktop_onboarding: { version: 1, status: 'completed', step: 'dashboard_finish' },
  mobile_card_flip_hint: { version: 1, own_completed: true, foreign_completed: true },
  desktop_card_flip_hint: { version: 1, own_completed: true, foreign_completed: true },
};

/** Cudzí profil – ten, na ktorý vedie preklik z Nástenky. */
const otherUser = {
  ...resolvedUser,
  id: 99,
  username: 'peter',
  email: '',
  first_name: 'Peter',
  last_name: 'Cudzi',
  slug: 'peter',
};

/** Zvýraznená ponuka. */
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

/** Položka portfólia, ktorej detail sa otvára. */
const PORTFOLIO_ITEM = {
  id: 5,
  title: 'Moja práca',
  category: 'portfolio-a-prezentacia-prace',
  sort_order: 1,
  cover_image: {
    id: 10,
    thumbnail_url: '/media/thumb.webp',
    medium_url: '/media/medium.webp',
    large_url: '/media/large.webp',
    image_url: '/media/original.webp',
  },
};

const mockRouter = {
  // Ako Next: nový záznam histórie a zmena stránky. `popstate` tu nahrádza Next, ktorý
  // o zmene adresy dáva vedieť modulom dashboardu.
  push: jest.fn((url: string) => {
    window.history.pushState(null, '', url);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }),
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
  sharePortfolioItemToFeed: jest.fn(),
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

/** Mobil/desktop sa prepína per test – profil aj horná lišta sa vetvia podľa tohto háčika. */
let mockIsMobile = true;
jest.mock('@/hooks', () => ({
  useIsMobile: () => mockIsMobile,
  useIsMobileState: () => ({ isMobile: mockIsMobile, isResolved: true }),
}));

jest.mock('@/components/dashboard/modules/profile/portfolioApi', () => ({
  ...jest.requireActual('@/components/dashboard/modules/profile/portfolioApi'),
  listProfilePortfolio: jest.fn(),
  getPortfolioItem: jest.fn(),
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
const portfolioApi = jest.requireMock('@/components/dashboard/modules/profile/portfolioApi');
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

type Viewport = 'mobile' | 'desktop';
type Owner = 'own' | 'foreign';
/** Ako sa profil otvoril: s `?highlight=`, s `?offer=` (karta ponuky na Nástenke), alebo bez zvýraznenia. */
type Entry = 'highlight' | 'offer' | 'none';

const OFFERS_TAB = 'Ponúkam / Hľadám';
const PORTFOLIO_TAB = 'Portfólio';
const WAIT = { timeout: 5000 } as const;

const profilePath = (owner: Owner) => (owner === 'own' ? '/dashboard/users/test-user' : '/dashboard/users/peter');
const detailPath = (owner: Owner) => `${profilePath(owner)}/portfolio/${PORTFOLIO_ITEM.id}`;

function url(): string {
  return `${window.location.pathname}${window.location.search}`;
}

function query(): URLSearchParams {
  return new URLSearchParams(window.location.search);
}

/** Názov(y) práve označených záložiek profilu – to, čo vidí používateľ. */
function selectedTab(): string {
  const selected = screen
    .queryAllByRole('tab')
    .filter((tab) => tab.getAttribute('aria-selected') === 'true');
  return selected.map((tab) => tab.getAttribute('aria-label') ?? '?').join(',') || '(žiadna)';
}

/** Čas na dobeh asynchrónnych efektov; v `act`, inak by ich zmeny stavu React hlásil ako varovania. */
async function settle(ms = 300) {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

let scrolledTo: string[] = [];
const originalScrollIntoView = Element.prototype.scrollIntoView;

/** Dokument načítaný na Nástenke. */
async function mountOnFeed() {
  render(
    <AuthProvider>
      <DashboardContent initialRoute="home" />
    </AuthProvider>,
  );
  await screen.findByText('Príspevok 1', undefined, WAIT);
  Element.prototype.scrollIntoView = function scrollIntoViewMock(this: Element) {
    scrolledTo.push(this.textContent ?? '');
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  __resetAuthBootstrapSnapshotForTests();
  // Každý test je nový dokument načítaný na Nástenke.
  __resetHighlightDocumentEntryForTests();
  resetPortfolioDetailOrigin();
  resetFeedReturnState();
  setCurrentAccountId(null);
  sessionStorage.clear();
  window.localStorage.clear();
  window.history.replaceState(null, '', '/dashboard');
  mockIsMobile = true;
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
  scrolledTo = [];
  mockedGet.mockImplementation((requestUrl: string) => {
    if (requestUrl === '/auth/me/') return Promise.resolve({ status: 200, data: resolvedUser });
    if (requestUrl === '/profile/slug/test-user' || requestUrl === `/profile/${VIEWER_ID}`) {
      return Promise.resolve({ status: 200, data: resolvedUser });
    }
    if (requestUrl === '/profile/slug/peter' || requestUrl === `/profile/${otherUser.id}`) {
      return Promise.resolve({ status: 200, data: otherUser });
    }
    if (requestUrl.includes('/skills/')) return Promise.resolve({ status: 200, data: [OFFER] });
    return Promise.resolve({ status: 200, data: {} });
  });
  mockedList.mockResolvedValue({ results: [post(1), post(2)], next: null });
  portfolioApi.listProfilePortfolio.mockResolvedValue([PORTFOLIO_ITEM]);
  // Detail sa nikdy nedoloží: stačí, že je na obrazovke a že má vlastnú adresu.
  portfolioApi.getPortfolioItem.mockReturnValue(new Promise(() => {}));
});

afterEach(() => {
  Element.prototype.scrollIntoView = originalScrollIntoView;
  resetFeedReturnState();
  setCurrentAccountId(null);
  sessionStorage.clear();
});

function useViewport(viewport: Viewport) {
  mockIsMobile = viewport === 'mobile';
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: viewport === 'mobile' ? 390 : 1280,
  });
}

/** Preklik z Nástenky na profil – vlastný alebo cudzí, so zvýraznením ponuky alebo bez. */
function openProfileFromFeed(owner: Owner, entry: Entry) {
  const highlight =
    entry === 'highlight' ? { highlightId: OFFER.id } : entry === 'offer' ? { offerId: OFFER.id } : {};
  act(() => {
    window.dispatchEvent(
      owner === 'own'
        ? new CustomEvent('goToMyProfile', { detail: highlight })
        : new CustomEvent('goToUserProfile', { detail: { identifier: 'peter', ...highlight } }),
    );
  });
}

/**
 * Nástenka → profil → záložka Portfólio → detail položky.
 *
 * Skončí s otvoreným detailom: adresa je adresa položky a profil (záložky) je preč.
 */
async function openDetailFromProfile(owner: Owner, entry: Entry) {
  await mountOnFeed();
  openProfileFromFeed(owner, entry);
  await screen.findAllByText(/skska/, undefined, WAIT);
  await settle();

  if (entry !== 'none') {
    // Východisko: profil sa naozaj otvoril na ponuke a odscrolloval sa na ňu.
    expect(query().get(entry)).toBe(String(OFFER.id));
    expect(selectedTab()).toBe(OFFERS_TAB);
    expect(scrolledTo).toHaveLength(1);
  }

  fireEvent.click(screen.getByRole('tab', { name: PORTFOLIO_TAB }));
  fireEvent.click(await screen.findByRole('button', { name: PORTFOLIO_ITEM.title }, WAIT));

  await waitFor(() => expect(window.location.pathname).toBe(detailPath(owner)), WAIT);
  await waitFor(() => expect(screen.queryAllByRole('tab')).toHaveLength(0), WAIT);
}

/** Krok späť z detailu – ten, ktorý robí používateľ. */
function goBackFromDetail(viewport: Viewport) {
  if (viewport === 'mobile') {
    fireEvent.click(screen.getByRole('button', { name: 'Späť' }));
  } else {
    window.history.back();
  }
}

/** Po kroku späť je na obrazovke profil; ostatné efekty dostanú čas, aby sa prejavili. */
async function waitForProfileAfterBack(owner: Owner) {
  await waitFor(() => expect(window.location.pathname).toBe(profilePath(owner)), WAIT);
  await waitFor(() => expect(screen.queryAllByRole('tab').length).toBeGreaterThan(0), WAIT);
  await settle(600);
}

/** Vlastný profil dostáva zvýraznenie len cez `goToMyProfile` (`?highlight=`), cudzí aj cez `?offer=`. */
const SCENARIOS: Array<{ viewport: Viewport; owner: Owner; entry: 'highlight' | 'offer' }> = [
  { viewport: 'mobile', owner: 'own', entry: 'highlight' },
  { viewport: 'mobile', owner: 'foreign', entry: 'highlight' },
  { viewport: 'mobile', owner: 'foreign', entry: 'offer' },
  { viewport: 'desktop', owner: 'own', entry: 'highlight' },
  { viewport: 'desktop', owner: 'foreign', entry: 'highlight' },
  { viewport: 'desktop', owner: 'foreign', entry: 'offer' },
];

const CONTROL_SCENARIOS: Array<{ viewport: Viewport; owner: Owner }> = [
  { viewport: 'mobile', owner: 'own' },
  { viewport: 'mobile', owner: 'foreign' },
  { viewport: 'desktop', owner: 'own' },
  { viewport: 'desktop', owner: 'foreign' },
];

describe.each(SCENARIOS)(
  'návrat z detailu portfólia – $viewport, $owner profile, ?$entry=',
  ({ viewport, owner, entry }) => {
    it('lands on the Portfolio tab again and does not scroll to the offer or highlight it', async () => {
      useViewport(viewport);
      await openDetailFromProfile(owner, entry);

      goBackFromDetail(viewport);
      await waitForProfileAfterBack(owner);

      expect(selectedTab()).toBe(PORTFOLIO_TAB);
      expect(scrolledTo).toHaveLength(1);
      expect(query().has('highlight')).toBe(false);
      expect(query().has('offer')).toBe(false);
      expect(query().get('tab')).toBe('portfolio');
      expect(await screen.findByRole('button', { name: PORTFOLIO_ITEM.title }, WAIT)).toBeInTheDocument();
    });
  },
);

describe.each(CONTROL_SCENARIOS)(
  'kontrola bez zvýraznenia – $viewport, $owner profile',
  ({ viewport, owner }) => {
    it('a profile opened without a highlight returns to the Portfolio tab as well', async () => {
      useViewport(viewport);
      await openDetailFromProfile(owner, 'none');

      goBackFromDetail(viewport);
      await waitForProfileAfterBack(owner);

      expect(selectedTab()).toBe(PORTFOLIO_TAB);
      expect(scrolledTo).toHaveLength(0);
      expect(url()).toBe(`${profilePath(owner)}?tab=portfolio`);
      expect(await screen.findByRole('button', { name: PORTFOLIO_ITEM.title }, WAIT)).toBeInTheDocument();
    });
  },
);

describe('krok späť až k záznamu so zvýraznením', () => {
  it('still highlights the offer again when the user steps back to the highlighted record itself', async () => {
    await openDetailFromProfile('own', 'highlight');

    goBackFromDetail('mobile');
    await waitForProfileAfterBack('own');
    expect(selectedTab()).toBe(PORTFOLIO_TAB);

    // Ešte jeden krok späť je pôvodný záznam „profil na Ponukách so zvýraznením“.
    window.history.back();
    await waitFor(() => expect(selectedTab()).toBe(OFFERS_TAB), WAIT);
    await waitFor(() => expect(scrolledTo).toHaveLength(2), WAIT);
    expect(query().get('highlight')).toBe(String(OFFER.id));
    expect(scrolledTo[1]).toContain('skska');
  });
});
