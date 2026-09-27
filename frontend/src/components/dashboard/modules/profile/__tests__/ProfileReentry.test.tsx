/**
 * Opakovaný vstup na profil (mapovanie Scenárov A+B, Nálezy 1–3).
 *
 * Skladá sa celý dashboard: `AuthProvider` → `DashboardContent` →
 * `ModuleRouter` → `ProfileModule` / `SearchUserProfileModule`. Sieť je
 * podvrhnutá po jednotlivých adresách (okamžite, oneskorene, na povel,
 * chybou) a rešpektuje `AbortSignal` ako axios.
 *
 *  - Nález 1: každý preklik na vlastnú ponuku = vlastný profil s „Upraviť",
 *    nikdy pohľad na cudzí profil so šípkou;
 *  - Nález 3: neskorá odpoveď zo staršieho vstupu neprepíše novší; na jeden
 *    vstup ide jediný request na preklad slugu;
 *  - Nález 2: každá chyba okrem 404 skončí viditeľnou chybou s novým pokusom.
 */

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthProvider, __resetAuthBootstrapSnapshotForTests } from '@/contexts/AuthContext';
import DashboardContent from '../../../components/DashboardContent';
import { __resetHighlightDocumentEntryForTests } from '../../../hooks/useDashboardHighlighting';
import { setCurrentAccountId } from '@/lib/currentAccount';
import { resetFeedReturnState, requestFeedReturnCapture } from '../../feed/feedReturnState';
import { openUserProfile } from '../../feed/feedProfileNavigation';
import { invalidateUserProfileCache, primeUserSlugId } from '../profileUserCache';

jest.setTimeout(30000);

const ME = {
  id: 7,
  username: 'tester',
  email: 'tester@example.com',
  first_name: 'Test',
  last_name: 'User',
  slug: 'test-user',
  user_type: 'individual',
  is_verified: true,
  // Onboarding je za nami – ako pri reálnom účte.
  mobile_onboarding: { status: 'completed', step: 'requests' },
  desktop_onboarding: { status: 'completed', step: 'search' },
};
const JANA = { ...ME, id: 10, username: 'jana', first_name: 'Jana', last_name: 'Cudzia', slug: 'jana' };
const PETER = { ...ME, id: 11, username: 'peter', first_name: 'Peter', last_name: 'Druhy', slug: 'peter' };

const offer = (id: number, text: string) => ({
  id,
  category: 'Vzdelávanie',
  subcategory: text,
  description: text,
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
});

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn((url: string) => window.history.replaceState(window.history.state, '', url)),
  back: jest.fn(() => window.history.back()),
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
      profile: '/auth/profile/',
    },
    skills: { list: '/skills/', detail: (id: number) => `/skills/${id}/` },
    portfolio: {
      list: '/portfolio/',
      userListBySlug: (slug: string) => `/portfolio/slug/${slug}/`,
      userList: (id: number) => `/portfolio/user/${id}/`,
      detail: (id: number) => `/portfolio/${id}/`,
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

// ── podvrhnutá sieť ─────────────────────────────────────────────────────────

type Gate = { promise: Promise<void>; release: () => void };
type Step = 'ok' | 'network' | 'timeout' | number | Gate;

function gate(): Gate {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

/** Pre každú adresu fronta krokov; bez nich `ok` (preklad slugu s malým oneskorením). */
const steps = new Map<string, Step[]>();
const calls: Array<{ url: string; signal?: AbortSignal }> = [];

function payloadFor(url: string): unknown {
  if (url === '/auth/me/') return ME;
  if (url === '/profile/slug/test-user' || url === '/profile/7') return ME;
  if (url === '/profile/slug/jana' || url === '/profile/10') return JANA;
  if (url === '/profile/slug/peter' || url === '/profile/11') return PETER;
  if (url === '/users/7/skills/' || url === '/skills/') return [offer(55, 'mojaponuka')];
  if (url === '/users/10/skills/') return [offer(77, 'janinaponuka')];
  if (url === '/users/11/skills/') return [offer(88, 'peterponuka')];
  if (url.startsWith('/portfolio')) return [];
  return {};
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Axios pri zrušení odmietne s `CanceledError` – rovnako tu. */
function honourAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  return new Promise<T>((resolve, reject) => {
    const cancel = () => reject(Object.assign(new Error('canceled'), { code: 'ERR_CANCELED' }));
    if (signal.aborted) return cancel();
    signal.addEventListener('abort', cancel, { once: true });
    promise.then(resolve, reject);
  });
}

function installNetwork() {
  mockedGet.mockImplementation((url: string, config?: { signal?: AbortSignal }) => {
    calls.push({ url, signal: config?.signal });
    const step = steps.get(url)?.shift() ?? 'ok';
    const ok = () => ({ status: 200, data: payloadFor(url) });
    let result: Promise<unknown>;
    if (step === 'ok') {
      result = url.startsWith('/profile/slug/') ? wait(60).then(ok) : Promise.resolve(ok());
    } else if (step === 'network') {
      result = Promise.reject(Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' }));
    } else if (step === 'timeout') {
      result = Promise.reject(Object.assign(new Error('timeout of 30000ms exceeded'), { code: 'ECONNABORTED' }));
    } else if (typeof step === 'number') {
      result = Promise.reject({ response: { status: step } });
    } else {
      result = step.promise.then(ok);
    }
    return honourAbort(result, config?.signal);
  });
}

const slugCalls = (slug: string) => calls.filter((c) => c.url === `/profile/slug/${slug}`);

// ── obrazovka ───────────────────────────────────────────────────────────────

const EDIT = '[data-onboarding="profile-edit-button"]';
const ARROW = 'button[aria-label="Späť"]';

/** Zaznamená, či sa niečo AKOKOĽVEK krátko objavilo v DOM. */
function watchFor(check: () => boolean) {
  const seen = { value: check() };
  const observer = new MutationObserver(() => {
    if (check()) seen.value = true;
  });
  observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true });
  return { seen, stop: () => observer.disconnect() };
}

let scrolledTo: string[] = [];
const originalScrollIntoView = Element.prototype.scrollIntoView;

const post = (id: number) => ({
  id,
  post_type: 'free_post',
  caption: `Príspevok ${id}`,
  author: { id: 10, display_name: 'Jana', slug: 'jana', user_type: 'individual', avatar_url: null },
  images: [],
  shared_content: null,
  shared_content_unavailable: false,
  tagged_users: [],
  likes_count: 0,
  comments_count: 0,
  is_liked_by_me: false,
  can_manage: false,
  created_at: '2026-01-01T10:00:00Z',
});

async function settle(ms = 200) {
  await act(async () => {
    await wait(ms);
  });
}

async function mountOnFeed() {
  render(
    <AuthProvider>
      <DashboardContent initialRoute="home" />
    </AuthProvider>,
  );
  await screen.findByText('Príspevok 1');
}

/** Presne to, čo robí preklik na zdieľanú ponuku vo feede. */
async function openSharedOffer(identifier: string, offerId: number) {
  await act(async () => {
    requestFeedReturnCapture();
    window.dispatchEvent(new CustomEvent('goToUserProfile', { detail: { identifier, offerId } }));
  });
}

async function click(selector: string) {
  const element = document.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`na obrazovke chýba ${selector}`);
  await act(async () => {
    element.click();
  });
}

async function expectOwnProfile() {
  await waitFor(() => expect(document.querySelector(EDIT)).not.toBeNull());
  expect(document.querySelector(ARROW)).toBeNull();
}

async function expectForeignProfile(name: string) {
  await screen.findByText(new RegExp(name));
  expect(document.querySelector(EDIT)).toBeNull();
  expect(document.querySelector(ARROW)).not.toBeNull();
}

beforeEach(() => {
  jest.clearAllMocks();
  __resetAuthBootstrapSnapshotForTests();
  __resetHighlightDocumentEntryForTests();
  resetFeedReturnState();
  setCurrentAccountId(null);
  // Cache profilov je modulová – každý test začína bez nej.
  for (const id of [7, 10, 11]) invalidateUserProfileCache(id);
  sessionStorage.clear();
  window.localStorage.clear();
  window.history.replaceState(null, '', '/dashboard');
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
  steps.clear();
  calls.length = 0;
  scrolledTo = [];
  Element.prototype.scrollIntoView = function scrollIntoViewMock(this: Element) {
    scrolledTo.push(this.textContent ?? '');
  };
  installNetwork();
  (feedApi.listFeedPosts as jest.Mock).mockResolvedValue({ results: [post(1), post(2)], next: null });
});

afterEach(() => {
  Element.prototype.scrollIntoView = originalScrollIntoView;
  resetFeedReturnState();
  setCurrentAccountId(null);
  sessionStorage.clear();
});

// ── Nález 1 ─────────────────────────────────────────────────────────────────

describe('Nález 1 – opakovaný preklik na vlastnú ponuku', () => {
  it('every one of 5 clicks (back on the feed in between) opens OWN profile with Upraviť', async () => {
    await mountOnFeed();

    for (let round = 1; round <= 5; round += 1) {
      scrolledTo = [];
      await openSharedOffer('test-user', 55);

      await expectOwnProfile();
      // Nový vstup: záložka Ponuky a zvýraznená karta, na ktorú sa doscrolluje.
      const query = new URLSearchParams(window.location.search);
      expect(window.location.pathname).toBe('/dashboard/users/test-user');
      expect(query.get('offer')).toBe('55');
      expect(query.get('tab')).toBe('offers');
      await waitFor(() => expect(scrolledTo.some((text) => text.includes('mojaponuka'))).toBe(true));

      await click('button[aria-label="Domov"]');
      await screen.findByText('Príspevok 1');
    }

    // Vlastný slug sa neprekladá vôbec – vlastný profil ide hneď cez `profile`.
    // (Kedysi ho prekladal duplicitný fetch v handleri a o module rozhodovalo,
    // či doletí skôr než efekt.)
    expect(slugCalls('test-user')).toHaveLength(0);
  });

  it('5 rapid clicks in a row never show the foreign view with the arrow', async () => {
    await mountOnFeed();
    const arrow = watchFor(() => document.querySelector(ARROW) !== null);

    for (let round = 1; round <= 5; round += 1) {
      await openSharedOffer('test-user', 55);
      await settle(20);
    }
    await expectOwnProfile();
    await settle();

    arrow.stop();
    expect(arrow.seen.value).toBe(false);
    expect(document.querySelector(EDIT)).not.toBeNull();
    expect(slugCalls('test-user')).toHaveLength(0);
  });
});

// ── Nález 3 ─────────────────────────────────────────────────────────────────

describe('Nález 3 – preteky medzi vstupmi', () => {
  it('a late answer for profile A never shows A on profile B', async () => {
    const janaAnswer = gate();
    steps.set('/profile/slug/jana', [janaAnswer]);
    await mountOnFeed();
    const janaShown = watchFor(() => (document.body.textContent ?? '').includes('Jana Cudzia'));

    await openSharedOffer('jana', 77);
    await screen.findByText('Načítavam profil...');

    // Pred odpoveďou pre A sa ide na B.
    await openSharedOffer('peter', 88);
    await expectForeignProfile('Peter Druhy');

    // A dorazí neskoro – nesmie nič zmeniť.
    await act(async () => {
      janaAnswer.release();
    });
    await settle(300);

    janaShown.stop();
    expect(janaShown.seen.value).toBe(false);
    expect(screen.getByText(/Peter Druhy/)).toBeInTheDocument();
    expect(window.location.pathname).toBe('/dashboard/users/peter');
    // Request pre A sa pri prechode na B prerušil.
    expect(slugCalls('jana')[0].signal?.aborted).toBe(true);
  });

  it('one entry sends exactly ONE slug request', async () => {
    await mountOnFeed();

    await openSharedOffer('jana', 77);
    await expectForeignProfile('Jana Cudzia');
    await settle();

    expect(slugCalls('jana')).toHaveLength(1);
  });

  it('a hard load (F5) of the profile sends exactly ONE slug request too', async () => {
    window.history.replaceState(null, '', '/dashboard/users/jana');
    render(
      <AuthProvider>
        <DashboardContent initialRoute="user-profile" initialProfileSlug="jana" />
      </AuthProvider>,
    );

    await expectForeignProfile('Jana Cudzia');
    await settle();

    expect(slugCalls('jana')).toHaveLength(1);
  });
});

// ── Nález 2 ─────────────────────────────────────────────────────────────────

describe('Nález 2 – chyba nikdy nenechá večný spinner', () => {
  it.each([
    ['výpadok siete', 'network' as Step],
    ['500', 500 as Step],
    ['429', 429 as Step],
    ['timeout', 'timeout' as Step],
  ])('%s → visible error with a retry button', async (_label, failure) => {
    steps.set('/profile/slug/jana', [failure]);
    await mountOnFeed();

    await openSharedOffer('jana', 77);

    await screen.findByText('Nepodarilo sa načítať profil používateľa.');
    expect(screen.getByTestId('viewed-user-retry')).toHaveTextContent('Skúsiť znova');
    expect(screen.queryByText('Načítavam profil...')).toBeNull();
  });

  it('404 still reads as "profile not found" (no retry)', async () => {
    steps.set('/profile/slug/jana', [404]);
    await mountOnFeed();

    await openSharedOffer('jana', 77);

    await screen.findByText('Profil používateľa sa nepodarilo načítať.');
    expect(screen.queryByTestId('viewed-user-retry')).toBeNull();
    expect(screen.queryByText('Načítavam profil...')).toBeNull();
  });

  it('"Skúsiť znova" repeats the request and shows the profile on success', async () => {
    steps.set('/profile/slug/jana', [500]);
    await mountOnFeed();

    await openSharedOffer('jana', 77);
    await screen.findByTestId('viewed-user-retry');
    expect(slugCalls('jana')).toHaveLength(1);

    await click('[data-testid="viewed-user-retry"]');

    await expectForeignProfile('Jana Cudzia');
    expect(slugCalls('jana')).toHaveLength(2);
    expect(screen.queryByText('Nepodarilo sa načítať profil používateľa.')).toBeNull();
  });
});

// ── regresie ────────────────────────────────────────────────────────────────

describe('regresie – vstup na cudzí profil', () => {
  it('shared offer: foreign profile on the Offers tab with the arrow, card scrolled to', async () => {
    await mountOnFeed();

    await openSharedOffer('jana', 77);

    await expectForeignProfile('Jana Cudzia');
    expect(new URLSearchParams(window.location.search).get('tab')).toBe('offers');
    await waitFor(() => expect(scrolledTo.some((text) => text.includes('janinaponuka'))).toBe(true));
  });

  it('post header: foreign profile, fresh entry on the Offers tab', async () => {
    await mountOnFeed();

    await act(async () => {
      openUserProfile({ id: 10, slug: 'jana' });
    });

    await expectForeignProfile('Jana Cudzia');
    expect(new URLSearchParams(window.location.search).get('tab')).toBe('offers');
  });

  it('search (remount on the profile route with the id primed): no slug request', async () => {
    primeUserSlugId('jana', 10);
    window.history.replaceState(null, '', '/dashboard/users/jana');
    render(
      <AuthProvider>
        <DashboardContent initialRoute="user-profile" initialProfileSlug="jana" />
      </AuthProvider>,
    );

    await expectForeignProfile('Jana Cudzia');
    expect(slugCalls('jana')).toHaveLength(0);
  });

  it('F5 inside an open profile keeps its tab (not reset to Offers)', async () => {
    window.history.replaceState(null, '', '/dashboard/users/jana?tab=portfolio');
    render(
      <AuthProvider>
        <DashboardContent initialRoute="user-profile" initialProfileSlug="jana" />
      </AuthProvider>,
    );

    await expectForeignProfile('Jana Cudzia');
    await settle();

    expect(new URLSearchParams(window.location.search).get('tab')).toBe('portfolio');
  });
});
