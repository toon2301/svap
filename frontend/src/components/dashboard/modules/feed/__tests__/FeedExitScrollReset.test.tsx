/**
 * Odchod z Nástenky vráti `<main>` na vrch, KÝM je feed ešte v DOM – a dashboard
 * dá KAŽDÉMU modulu, aj cieľovému, vlastný nový element `<main>`.
 *
 * Namerané na iPhone (?debugscroll=1): reset profilu (`useProfileFreshEntry`)
 * prichádzal až po výmene modulu, keď krátky nový obsah pozíciu už orezal –
 * zapisoval 0 do 0 a stará pozícia Nástenky sa po narastení profilu vrátila
 * (iOS si ju drží mimo JavaScriptu). Oprava má dve časti:
 *  - `useFeedReturn` resetuje v cleanupe layout efektu Nástenky, ktorý React
 *    volá pred odpojením jej DOM – zápis je tak skutočná zmena, nie 0 → 0;
 *  - `useDashboardMainKey` (viď jej vlastný test) dáva `<main>` nový `key` pri
 *    KAŽDEJ zmene `activeModule`, takže React vytvorí čerstvý DOM element bez
 *    akejkoľvek scrollovej pamäte. 10 z 10 vstupov s touto opravou na iPhone
 *    prešlo čisto, oproti 4 z 5 zlyhaniam bez nej – merané v tej istej relácii,
 *    na tej istej karte.
 *
 * jsdom nemá layout ani iOS, takže samotný skok nezopakuje. Overuje sa PORADIE
 * a IDENTITA: prvý zápis 0 po odchode prichádza z hlbokej pozície, kým je
 * Nástenka pripojená, a až po snímke na Späť; cieľový modul dostane preukázateľne
 * INÝ element `<main>`. Zapisovač háči `scrollTop` na úrovni `Element.prototype`
 * (rovnaký vzor ako produkčný ladiaci pásik v `debug/scrollDebugHooks.ts`), takže
 * zachytí zápisy do KTORÉHOKOĽVEK `<main>` v poradí, v akom prišli – aj cez
 * výmenu elementu. Pri každom zápise uloží hodnotu, predošlú hodnotu, či je
 * zdrojový modul pripojený a či už existuje snímka.
 *
 * Skladá sa celý dashboard: `AuthProvider` → `DashboardContent` →
 * `ModuleRouter` → `FeedList` / `ProfileModule` / `SearchUserProfileModule`.
 */

import React from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthProvider, __resetAuthBootstrapSnapshotForTests } from '@/contexts/AuthContext';
import DashboardContent from '../../../components/DashboardContent';
import { __resetHighlightDocumentEntryForTests } from '../../../hooks/useDashboardHighlighting';
import { setCurrentAccountId } from '@/lib/currentAccount';
import { FEED_RETURN_STORAGE_KEY, resetFeedReturnState } from '../feedReturnState';
import { invalidateUserProfileCache, primeUserSlugId } from '../../profile/profileUserCache';
import { invalidateOffersCache } from '../../profile/profileOffersCache';

/** Cache ponúk je modulová: vlastné pod `self` aj pod id, cudzie pod id. */
function clearOffersCache() {
  for (const owner of [undefined, 7, 10]) invalidateOffersCache(owner);
}

jest.setTimeout(60000);

const ME = {
  id: 7,
  username: 'tester',
  email: 'tester@example.com',
  first_name: 'Test',
  last_name: 'User',
  slug: 'test-user',
  user_type: 'individual',
  is_verified: true,
  mobile_onboarding: { status: 'completed', step: 'requests' },
  desktop_onboarding: { status: 'completed', step: 'search' },
};
const JANA = { ...ME, id: 10, username: 'jana', first_name: 'Jana', last_name: 'Cudzia', slug: 'jana' };

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

let mockIsMobile = true;
jest.mock('@/hooks', () => ({
  useIsMobile: () => mockIsMobile,
  useIsMobileState: () => ({ isMobile: mockIsMobile, isResolved: true }),
}));

// Výsledky vyhľadávania: ten istý `onUserClick`, aký dostáva skutočný panel.
jest.mock('../../SearchModule', () => ({
  __esModule: true,
  default: ({ onUserClick }: { onUserClick: (id: number, slug?: string | null) => void }) => (
    <button type="button" data-testid="search-result-jana" onClick={() => onUserClick(10, 'jana')}>
      Jana (výsledok)
    </button>
  ),
}));

jest.mock('framer-motion', () => {
  const ReactLib = jest.requireActual('react');
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

// ── podvrhnutá sieť ─────────────────────────────────────────────────────────

type Gate = { promise: Promise<void>; release: () => void };

function gate(): Gate {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

/** Adresa → brána, ktorá odpoveď pustí až na povel (ponuky „zo siete"). */
const gates = new Map<string, Gate>();

function payloadFor(url: string): unknown {
  if (url === '/auth/me/') return ME;
  if (url === '/profile/slug/test-user' || url === '/profile/7') return ME;
  if (url === '/profile/slug/jana' || url === '/profile/10') return JANA;
  if (url === '/users/7/skills/' || url === '/skills/') return [offer(55, 'mojaponuka')];
  if (url === '/users/10/skills/') return [offer(77, 'janinaponuka')];
  if (url.startsWith('/portfolio')) return [];
  return {};
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function installNetwork() {
  mockedGet.mockImplementation((url: string) => {
    const ok = () => ({ status: 200, data: payloadFor(url) });
    const pending = gates.get(url);
    if (pending) {
      gates.delete(url);
      return pending.promise.then(ok);
    }
    return url.startsWith('/profile/slug/') ? wait(30).then(ok) : Promise.resolve(ok());
  });
}

// ── Nástenka ────────────────────────────────────────────────────────────────

const author = (who: typeof ME) => ({
  id: who.id,
  display_name: `${who.first_name} ${who.last_name}`,
  slug: who.slug,
  user_type: 'individual',
  avatar_url: null,
});

const basePost = {
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

const shared = (type: 'offer' | 'portfolio_item', id: number, title: string, owner: typeof ME) => ({
  type,
  id,
  title,
  category: 'it',
  owner: { id: owner.id, slug: owner.slug },
  owner_display_name: `${owner.first_name} ${owner.last_name}`,
  thumbnail_url: null,
});

const FEED = [
  { ...basePost, id: 1, post_type: 'free_post', caption: 'Príspevok 1', author: author(JANA) },
  { ...basePost, id: 2, post_type: 'free_post', caption: 'Môj príspevok', author: author(ME) },
  {
    ...basePost,
    id: 3,
    post_type: 'shared_offer',
    caption: '',
    author: author(JANA),
    shared_content: shared('offer', 55, 'Moja ponuka', ME),
  },
  {
    ...basePost,
    id: 4,
    post_type: 'shared_offer',
    caption: '',
    author: author(JANA),
    shared_content: shared('offer', 77, 'Janina ponuka', JANA),
  },
  {
    ...basePost,
    id: 5,
    post_type: 'shared_portfolio_item',
    caption: '',
    author: author(JANA),
    shared_content: shared('portfolio_item', 9, 'Janino portfólio', JANA),
  },
];

// ── zapisovač scrollTop na <main> ───────────────────────────────────────────

const FEED_ROOT = '[data-testid="home-feed-root"]';
const EDIT = '[data-onboarding="profile-edit-button"]';
const ARROW = 'button[aria-label="Späť"]';
const DEEP = 2369;

type Write = { value: number; previous: number; sourceAttached: boolean; snapshot: boolean };

function dashboardMain(): HTMLElement {
  const main = document.querySelector<HTMLElement>('[data-dashboard-main]');
  if (!main) throw new Error('chýba <main data-dashboard-main>');
  return main;
}

/** Odinštalovania zapisovačov, ktoré test zabudol uninštalovať sám – poistka v afterEach. */
const pendingUninstalls: Array<() => void> = [];

/**
 * Zaznamenáva zápisy do `scrollTop` KAŽDÉHO `<main data-dashboard-main>` –
 * háči setter na `Element.prototype`, nie na jednej inštancii, takže prežije
 * výmenu elementu (nový `<main>` pri zmene modulu). `userScrollsTo` je posun
 * používateľom (bez zápisu z appky, priamo cez pôvodný natívny setter, aby sa
 * nezapočítal) a zároveň určí, ktorá obrazovka je zdroj, z ktorého sa odchádza;
 * záznam zápisov sa tým vynuluje.
 */
function recordMain() {
  const proto = Element.prototype;
  const original = Object.getOwnPropertyDescriptor(proto, 'scrollTop')!;
  const nativeGet = original.get!;
  const nativeSet = original.set!;
  const writes: Write[] = [];
  let source: Element | null = null;
  const main = dashboardMain(); // snímka pri vytvorení – na overenie výmeny identity.

  Object.defineProperty(proto, 'scrollTop', {
    configurable: true,
    get: original.get,
    set(this: Element, value: number) {
      if (this.hasAttribute('data-dashboard-main')) {
        writes.push({
          value,
          previous: nativeGet.call(this),
          sourceAttached: Boolean(source?.isConnected),
          snapshot: sessionStorage.getItem(FEED_RETURN_STORAGE_KEY) !== null,
        });
      }
      nativeSet.call(this, value);
    },
  });

  const uninstall = () => {
    if (Object.getOwnPropertyDescriptor(proto, 'scrollTop')?.set !== original.set) {
      Object.defineProperty(proto, 'scrollTop', original);
    }
  };
  pendingUninstalls.push(uninstall);

  return {
    /** `<main>` v momente vytvorenia zapisovača – na `toBe`/`isConnected` po výmene. */
    main,
    /** AKTUÁLNY `<main>` – po zmene modulu iný element, viď useDashboardMainKey.ts. */
    get current(): HTMLElement {
      return dashboardMain();
    },
    writes,
    userScrollsTo(value: number, sourceSelector = FEED_ROOT) {
      source = document.querySelector(sourceSelector);
      if (!source) throw new Error(`zdroj ${sourceSelector} nie je na obrazovke`);
      nativeSet.call(dashboardMain(), value);
      writes.length = 0;
    },
  };
}

/** Kľúčové tvrdenie: prvý zápis po odchode = reset z hĺbky, kým je Nástenka v DOM. */
function expectExitReset(writes: Write[], previous: number, snapshot: boolean) {
  expect(writes[0]).toEqual({ value: 0, previous, sourceAttached: true, snapshot });
}

// ── obrazovka ───────────────────────────────────────────────────────────────

let intoView: Array<{ text: string; mainTop: number }> = [];
const originalScrollIntoView = Element.prototype.scrollIntoView;

async function settle(ms = 150) {
  await act(async () => {
    await wait(ms);
  });
}

async function mount(options: { strict?: boolean } = {}) {
  const tree = (
    <AuthProvider>
      <DashboardContent initialRoute="home" />
    </AuthProvider>
  );
  const view = render(options.strict ? <React.StrictMode>{tree}</React.StrictMode> : tree);
  await screen.findByText('Príspevok 1');
  const recorder = recordMain();
  Element.prototype.scrollIntoView = function scrollIntoViewMock(this: Element) {
    intoView.push({ text: this.textContent ?? '', mainTop: recorder.current.scrollTop });
  };
  return { view, recorder };
}

async function tap(element: Element | null) {
  if (!element) throw new Error('prvok nie je na obrazovke');
  await act(async () => {
    (element as HTMLElement).click();
  });
}

/** Náhľad zdieľaného obsahu na karte Nástenky (ponuka, portfólio). */
function sharedPreview(title: string) {
  return screen.getByText(title).closest('[data-testid="feed-shared-compact-preview"]');
}

/** Meno autora v hlavičke príspevku. */
function postHeaderAuthor(caption: string) {
  const card = screen.getByText(caption).closest('[data-testid="feed-post-card"]') as HTMLElement;
  return within(card).getByTestId('feed-post-author-name');
}

async function expectOwnProfile() {
  await waitFor(() => expect(document.querySelector(EDIT)).not.toBeNull());
  expect(document.querySelector(ARROW)).toBeNull();
}

async function expectForeignProfile() {
  await screen.findAllByText(/Jana Cudzia/);
  expect(document.querySelector(EDIT)).toBeNull();
}

/** Zvýraznená karta: doscrolluje sa na ňu, keď `<main>` stojí na vrchu. */
async function expectHighlightScrolledFromTop(offerText: string) {
  await waitFor(() => expect(intoView.some((call) => call.text.includes(offerText))).toBe(true));
  const call = intoView.find((entry) => entry.text.includes(offerText));
  expect(call?.mainTop).toBe(0);
}

async function goHome() {
  await tap(document.querySelector('button[aria-label="Domov"]'));
  await screen.findByText('Príspevok 1');
  await settle();
}

beforeEach(() => {
  jest.clearAllMocks();
  __resetAuthBootstrapSnapshotForTests();
  __resetHighlightDocumentEntryForTests();
  resetFeedReturnState();
  setCurrentAccountId(null);
  for (const id of [7, 10]) invalidateUserProfileCache(id);
  clearOffersCache();
  sessionStorage.clear();
  window.localStorage.clear();
  window.history.replaceState(null, '', '/dashboard');
  mockIsMobile = true;
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
  gates.clear();
  intoView = [];
  installNetwork();
  mockedList.mockResolvedValue({ results: FEED, next: null });
});

afterEach(() => {
  Element.prototype.scrollIntoView = originalScrollIntoView;
  while (pendingUninstalls.length) pendingUninstalls.pop()!();
  resetFeedReturnState();
  setCurrentAccountId(null);
  sessionStorage.clear();
  jest.useRealTimers();
});

// ── vstupy z Nástenky ───────────────────────────────────────────────────────

describe('odchod z Nástenky resetuje <main>, kým je feed v DOM', () => {
  it.each([
    ['deep (2000+ px)', DEEP],
    ['shallow (50 px)', 50],
    ['at zero', 0],
  ])('own offer card, source %s: reset first, then own profile scrolled to the card from the top', async (_label, depth) => {
    const { recorder } = await mount();
    recorder.userScrollsTo(depth);

    await tap(sharedPreview('Moja ponuka'));

    expectExitReset(recorder.writes, depth, true);
    await expectOwnProfile();
    // Profil dostal vlastný, dosiaľ nikdy neskrolovaný element `<main>`.
    expect(recorder.current).not.toBe(recorder.main);
    expect(recorder.main.isConnected).toBe(false);
    expect(new URLSearchParams(window.location.search).get('tab')).toBe('offers');
    await expectHighlightScrolledFromTop('mojaponuka');
    // Každý ďalší zápis už ide do nového modulu a len na vrch.
    expect(recorder.writes.slice(1).every((write) => !write.sourceAttached && write.value === 0)).toBe(true);
  });

  it.each([
    ['slug in cache', true],
    ['slug not in cache', false],
  ])('foreign offer card (%s): reset first, foreign profile scrolled to the card', async (_label, cached) => {
    if (cached) primeUserSlugId('jana', 10);
    const { recorder } = await mount();
    recorder.userScrollsTo(DEEP);

    await tap(sharedPreview('Janina ponuka'));

    expectExitReset(recorder.writes, DEEP, true);
    await expectForeignProfile();
    expect(recorder.current).not.toBe(recorder.main);
    await expectHighlightScrolledFromTop('janinaponuka');
  });

  it('post header, own author: reset first, own profile on Offers', async () => {
    const { recorder } = await mount();
    recorder.userScrollsTo(DEEP);

    await tap(postHeaderAuthor('Môj príspevok'));

    expectExitReset(recorder.writes, DEEP, true);
    await expectOwnProfile();
    expect(recorder.current).not.toBe(recorder.main);
    expect(new URLSearchParams(window.location.search).get('tab')).toBe('offers');
  });

  it('post header, foreign author: reset first, foreign profile on Offers', async () => {
    const { recorder } = await mount();
    recorder.userScrollsTo(DEEP);

    await tap(postHeaderAuthor('Príspevok 1'));

    expectExitReset(recorder.writes, DEEP, true);
    await expectForeignProfile();
    expect(recorder.current).not.toBe(recorder.main);
    expect(new URLSearchParams(window.location.search).get('tab')).toBe('offers');
  });

  it('shared portfolio card: the feed does not move before the page switch, reset comes with it', async () => {
    const { view, recorder } = await mount();
    recorder.userScrollsTo(DEEP);

    await tap(sharedPreview('Janino portfólio'));

    // `router.push` na inú Next stránku – kým nie je hotová, stará ostáva
    // na obrazovke a Nástenka sa nesmie ani pohnúť.
    expect(mockRouter.push).toHaveBeenCalledWith(expect.stringContaining('/portfolio/9'));
    expect(recorder.writes).toEqual([]);
    expect(sessionStorage.getItem(FEED_RETURN_STORAGE_KEY)).not.toBeNull();

    // Výmena stránky = odmontovanie dashboardu v jednom commite.
    view.unmount();

    expectExitReset(recorder.writes, DEEP, true);
  });

  it('mobile profile icon: reset first (no snapshot), own profile', async () => {
    const { recorder } = await mount();
    recorder.userScrollsTo(DEEP);

    await tap(document.querySelector('[data-onboarding="profile-icon"]'));

    expectExitReset(recorder.writes, DEEP, false);
    await expectOwnProfile();
    expect(recorder.current).not.toBe(recorder.main);
  });

  it('desktop sidebar Profil: reset first (no snapshot), own profile', async () => {
    mockIsMobile = false;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
    const { recorder } = await mount();
    recorder.userScrollsTo(DEEP);

    await tap(document.querySelector('[data-sidebar-nav-item="profile"]'));

    expectExitReset(recorder.writes, DEEP, false);
    await waitFor(() => expect(screen.queryByText('Príspevok 1')).not.toBeInTheDocument());
    expect(recorder.current).not.toBe(recorder.main);
  });

  it('desktop search result: reset first, foreign profile', async () => {
    mockIsMobile = false;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
    const { recorder } = await mount();
    await tap(document.querySelector('[data-sidebar-nav-item="search"]'));
    recorder.userScrollsTo(DEEP);

    await tap(await screen.findByTestId('search-result-jana'));

    expectExitReset(recorder.writes, DEEP, false);
    await waitFor(() => expect(screen.queryByText('Príspevok 1')).not.toBeInTheDocument());
    expect(recorder.current).not.toBe(recorder.main);
  });

  it('desktop Settings: the feed reset comes before the Settings reset, on a fresh <main>', async () => {
    mockIsMobile = false;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
    const { recorder } = await mount();
    recorder.userScrollsTo(DEEP);

    await tap(document.querySelector('[data-sidebar-nav-item="settings"]'));

    expectExitReset(recorder.writes, DEEP, false);
    await waitFor(() => expect(screen.queryByText('Príspevok 1')).not.toBeInTheDocument());
    expect(recorder.current).not.toBe(recorder.main);
    expect(recorder.current.scrollTop).toBe(0);
  });
});

// ── ponuky, opakovanie, čas ─────────────────────────────────────────────────

describe('ponuky zo siete aj z cache, opakované vstupy', () => {
  it('offers from the network (late) and then from the cache: reset first both times', async () => {
    const { recorder } = await mount();
    // Ponuky naozaj zo siete: bez cache a s bránou až tesne pred vstupom –
    // skoršie requesty (dashboard si vlastné ponuky načíta aj sám) ju nesmú
    // spotrebovať.
    clearOffersCache();
    const offers = gate();
    gates.set('/users/7/skills/', offers);
    gates.set('/skills/', offers);

    const feedMain = recorder.current;
    recorder.userScrollsTo(DEEP);
    await tap(sharedPreview('Moja ponuka'));
    expectExitReset(recorder.writes, DEEP, true);
    await expectOwnProfile();
    expect(recorder.current).not.toBe(feedMain);
    // Ponuky ešte nie sú – reset aj fresh-entry prebehli bez nich.
    expect(intoView).toEqual([]);
    await act(async () => {
      offers.release();
    });
    await expectHighlightScrolledFromTop('mojaponuka');

    const profileMain = recorder.current;
    await goHome();
    expect(recorder.current).not.toBe(profileMain);
    intoView = [];
    const feedMainAgain = recorder.current;
    recorder.userScrollsTo(DEEP);
    await tap(sharedPreview('Moja ponuka'));
    expectExitReset(recorder.writes, DEEP, true);
    expect(recorder.current).not.toBe(feedMainAgain);
    await expectHighlightScrolledFromTop('mojaponuka');
  });

  it('5 rapid entries in a row: every one resets from the depth AND lands on a brand-new <main>', async () => {
    const { recorder } = await mount();

    for (let round = 1; round <= 5; round += 1) {
      const before = recorder.current;
      intoView = [];
      recorder.userScrollsTo(DEEP + round);
      await tap(sharedPreview('Moja ponuka'));
      expectExitReset(recorder.writes, DEEP + round, true);
      await expectOwnProfile();
      expect(recorder.current).not.toBe(before);
      await expectHighlightScrolledFromTop('mojaponuka');
      const profileMain = recorder.current;
      await goHome();
      expect(recorder.current).not.toBe(profileMain);
    }
  });

  it('an entry 70 s after the previous one (caches expired): reset first again, still a new <main>', async () => {
    jest.useFakeTimers({ advanceTimers: true, doNotFake: ['queueMicrotask', 'nextTick'] });
    const { recorder } = await mount();

    recorder.userScrollsTo(DEEP);
    await tap(sharedPreview('Moja ponuka'));
    expectExitReset(recorder.writes, DEEP, true);
    await expectHighlightScrolledFromTop('mojaponuka');
    const profileMain = recorder.current;
    await goHome();
    expect(recorder.current).not.toBe(profileMain);

    await act(async () => {
      jest.advanceTimersByTime(70_000);
    });
    intoView = [];
    mockedGet.mockClear();
    const feedMain = recorder.current;
    recorder.userScrollsTo(DEEP);
    await tap(sharedPreview('Moja ponuka'));

    expectExitReset(recorder.writes, DEEP, true);
    expect(recorder.current).not.toBe(feedMain);
    await expectHighlightScrolledFromTop('mojaponuka');
    // Cache ponúk po 60 s vypršala – ponuky išli znova zo siete.
    expect(mockedGet.mock.calls.map(([url]) => url)).toContain('/users/7/skills/');
  });

  it('StrictMode: the extra dev cleanup at mount does not change the order on exit', async () => {
    const { recorder } = await mount({ strict: true });
    recorder.userScrollsTo(DEEP);

    await tap(sharedPreview('Moja ponuka'));

    expectExitReset(recorder.writes, DEEP, true);
    await expectOwnProfile();
    expect(recorder.current).not.toBe(recorder.main);
    await expectHighlightScrolledFromTop('mojaponuka');
  });
});

// ── návrat na Nástenku ──────────────────────────────────────────────────────

describe('Späť vráti presnú pozíciu aj obsah Nástenky – aj do nového <main>', () => {
  it('Back after the entry: snapshot taken before the reset restores position and posts', async () => {
    const { recorder } = await mount();
    recorder.userScrollsTo(DEEP);

    await tap(sharedPreview('Moja ponuka'));
    expectExitReset(recorder.writes, DEEP, true);
    await expectOwnProfile();
    const profileMain = recorder.current;

    // Server medzitým vracia iný feed – obnova ho nesmie použiť.
    mockedList.mockClear();
    mockedList.mockResolvedValue({ results: [{ ...FEED[0], id: 90, caption: 'Nový zo servera' }], next: null });
    act(() => window.history.back());
    await screen.findByText('Moja ponuka');
    await settle();

    // Nástenka pri návrate dostáva vlastný nový element – rovnako ako pri
    // ktoromkoľvek inom vstupe naň.
    expect(recorder.current).not.toBe(profileMain);
    await waitFor(() => expect(recorder.current.scrollTop).toBe(DEEP));
    expect(screen.queryByText('Nový zo servera')).not.toBeInTheDocument();
    expect(mockedList).not.toHaveBeenCalled();
  });

  it('StrictMode: Back still restores the exact position (the dev cleanup at mount comes first)', async () => {
    const { recorder } = await mount({ strict: true });
    recorder.userScrollsTo(DEEP);

    await tap(sharedPreview('Moja ponuka'));
    expectExitReset(recorder.writes, DEEP, true);
    await expectOwnProfile();

    mockedList.mockClear();
    act(() => window.history.back());
    await screen.findByText('Moja ponuka');
    await settle();

    await waitFor(() => expect(recorder.current.scrollTop).toBe(DEEP));
    expect(mockedList).not.toHaveBeenCalled();
  });

  it('F5 on the profile, then Back: the stored snapshot restores the exact position', async () => {
    const first = await mount();
    first.recorder.userScrollsTo(DEEP);
    await tap(sharedPreview('Moja ponuka'));
    expectExitReset(first.recorder.writes, DEEP, true);
    await expectOwnProfile();

    // F5: nový dokument – modulový stav je preč, sessionStorage a história ostali.
    first.view.unmount();
    __resetAuthBootstrapSnapshotForTests();
    expect(sessionStorage.getItem(FEED_RETURN_STORAGE_KEY)).not.toBeNull();
    render(
      <AuthProvider>
        <DashboardContent initialRoute="user-profile" initialProfileSlug="test-user" />
      </AuthProvider>,
    );
    await expectOwnProfile();
    const recorder = recordMain();

    mockedList.mockClear();
    act(() => window.history.back());
    await screen.findByText('Moja ponuka');
    await settle();

    await waitFor(() => expect(recorder.current.scrollTop).toBe(DEEP));
    expect(mockedList).not.toHaveBeenCalled();
  });
});

describe('opačný smer: Domov z profilu – tiež na novom <main>', () => {
  it('Domov from a deep profile lands on the feed at the top, on a brand-new <main>', async () => {
    const { recorder } = await mount();
    await tap(document.querySelector('[data-onboarding="profile-icon"]'));
    await expectOwnProfile();
    const profileMain = recorder.current;
    recorder.userScrollsTo(3000, EDIT);

    await goHome();

    // Predtým nahlásené ako to isté riziko no-op, neopravené: „feed enter top"
    // beží až po výmene modulu, keď je nový obsah krátky. S novým elementom pri
    // KAŽDEJ zmene modulu to už nevadí – Nástenka dostane čerstvý uzol, ktorý
    // nikdy nescrolloval, takže reset je 0 → 0 nie preto, že by prepisoval
    // zdedenú hodnotu 3000, ale preto, že žiadna taká pamäť na ňom nie je.
    expect(recorder.current).not.toBe(profileMain);
    expect(profileMain.isConnected).toBe(false);
    expect(recorder.writes).toEqual([{ value: 0, previous: 0, sourceAttached: false, snapshot: false }]);
    expect(recorder.current.scrollTop).toBe(0);
  });
});
