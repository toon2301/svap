/**
 * Snímka Nástenky vs. štart appky – cez SKUTOČNÚ trasu, nie skratkou.
 *
 * Ostatné testy vlastníctva snímky nastavujú prihlásený účet priamo
 * (`setCurrentAccountId`). Tu je zložený reálny reťazec, ktorý je tesne po
 * štarte krehký:
 *
 *   AuthProvider → `/me` → applyResolvedUser → setCurrentAccountId
 *        ↓
 *   DashboardContent (brána `isLoading` / `!user`)
 *        ↓
 *   ModuleRouter → HomeModule → FeedList (preberá snímku)
 *
 * Kým `/me` nedobehne, appka NEVIE, kto je prihlásený. Snímka sa v tej chvíli
 * nesmie ani vydať (bola by to cudzia) ani zahodiť (patrí tomu, kto sa práve
 * prihlasuje) – práve to je rozdiel oproti „nezhode vlastníka".
 *
 * Vlastný súbor, nie prílepok k `FeedReturnState.test.tsx`: tamtie testy sú
 * jednotkové nad modulom feedu a ich mocky sú na to úzko strihnuté. Tento
 * potrebuje celý dashboard, a keby žili spolu, lacné testy by museli bežať pod
 * ťažkými mockami integračného.
 */

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import DashboardContent from '../../../components/DashboardContent';
import { setCurrentAccountId } from '@/lib/currentAccount';
import {
  FEED_RETURN_STORAGE_KEY,
  resetFeedReturnState,
  saveFeedReturn,
} from '../feedReturnState';

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

/** Odpoveď `/me` drží test – appka medzitým beží v stave „ešte neviem". */
let resolveMe: (() => void) | null = null;

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

jest.mock('@/hooks', () => ({
  useIsMobile: () => false,
  useIsMobileState: () => ({ isMobile: false, isResolved: true }),
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

/**
 * Stav po znovunačítaní dokumentu: `sessionStorage` snímku prežil, modulový
 * stav (vrátane toho, kto je prihlásený) nie.
 *
 * Zapisuje sa cez skutočný `saveFeedReturn`, nech test nekopíruje tvar záznamu.
 */
function snapshotLeftByPreviousPageLoad() {
  setCurrentAccountId(VIEWER_ID);
  saveFeedReturn({
    posts: [post(7), post(8)] as never,
    nextUrl: 'http://api.test/feed?cursor=8',
    scrollTop: 4200,
  });
  setCurrentAccountId(null);
}

beforeEach(() => {
  jest.clearAllMocks();
  resetFeedReturnState();
  setCurrentAccountId(null);
  window.localStorage.clear();
  window.history.replaceState(null, '', '/dashboard');
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });

  resolveMe = null;
  mockedGet.mockImplementation((url: string) => {
    if (url === '/auth/me/') {
      return new Promise((resolve) => {
        resolveMe = () => resolve({ status: 200, data: resolvedUser });
      });
    }
    return Promise.resolve({ status: 200, data: {} });
  });
  mockedList.mockResolvedValue({ results: [post(1), post(2)], next: null });
});

afterEach(() => {
  resetFeedReturnState();
  setCurrentAccountId(null);
});

describe('Nástenka pri štarte appky', () => {
  it('waits for /me before restoring, then restores without hitting the server', async () => {
    snapshotLeftByPreviousPageLoad();

    render(
      <AuthProvider>
        <DashboardContent initialRoute="home" />
      </AuthProvider>,
    );

    // (a) `/me` ešte beží: appka nevie, kto je prihlásený a dashboard sa drží
    // na načítavacej obrazovke – práve tá bráni Nástenke vykresliť sa skôr,
    // než je známy účet. Bez nej by `FeedList` snímku nazrel naprázdno a
    // nespotreboval by ju už nikdy.
    expect(screen.getByRole('status')).toHaveTextContent('Načítavam dashboard...');
    expect(screen.queryByText('Príspevok 7')).not.toBeInTheDocument();
    // Ani obnova zo snímky, ani čerstvé načítanie – Nástenka sa nevykresľuje.
    expect(mockedList).not.toHaveBeenCalled();
    // A snímka sa nesmie stratiť: nepatrí cudziemu, len sa ešte nevie komu.
    expect(window.sessionStorage.getItem(FEED_RETURN_STORAGE_KEY)).not.toBeNull();

    // (b) `/me` dobehne → applyResolvedUser → setCurrentAccountId.
    await act(async () => {
      resolveMe?.();
    });

    expect(await screen.findByText('Príspevok 7')).toBeInTheDocument();
    expect(screen.getByText('Príspevok 8')).toBeInTheDocument();
    // Obnova je zo snímky, nie čerstvým fetchom – inak by feed skočil na vrch.
    await waitFor(() =>
      expect(window.sessionStorage.getItem(FEED_RETURN_STORAGE_KEY)).toBeNull(),
    );
    expect(mockedList).not.toHaveBeenCalled();
  });
});
