/**
 * Celá cesta: karta → okno → zatvorenie, tak ako to skladá dashboard.
 *
 * Kontext okno nevykresľuje (mountuje ho dashboard nad celou appkou), takže
 * tunajšia `Harness` robí presne to isté zloženie. Tým sa dá overiť to
 * podstatné: okno sa otvorí ODKIAĽKOĽVEK (tu z profilovej záložky) a appka
 * pod ním sa počas toho ani neodmountuje, ani nestratí svoj stav.
 *
 * Pozíciu scrollu jsdom nevie (nemá layout), preto ju zastupuje to, čo ju v
 * praxi ničí: odmountovanie stromu. Počítadlo mountov + zachovaný stav
 * záložky sú presne tie dva príznaky.
 */

import { useState, type ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostCard from '../FeedPostCard';
import FeedPostDetailOverlay from '../FeedPostDetailOverlay';
import {
  FeedPostOverlayProvider,
  useFeedPostOverlay,
} from '../../../contexts/FeedPostOverlayContext';
import { resetOverlayLayers } from '../../shared/overlayLayers';
import {
  isFeedOverlayHistoryBusy,
  popFeedOverlayHistory,
  pushFeedOverlayHistory,
  resetFeedOverlayHistory,
} from '../feedOverlayHistory';
import { buildFeedPostPath } from '../feedPostRouting';
import { getFeedPost, type FeedPost } from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  FEED_COMMENT_MAX_LENGTH: 500,
  getFeedPost: jest.fn(),
  likeFeedPost: jest.fn(),
  unlikeFeedPost: jest.fn(),
  listFeedPostComments: jest.fn().mockResolvedValue({
    results: [],
    next: null,
    previous: null,
    count: 0,
  }),
  listFeedCommentReplies: jest.fn(),
  createFeedPostComment: jest.fn(),
  deleteFeedPostComment: jest.fn(),
  updateFeedPostComment: jest.fn(),
  likeFeedPostComment: jest.fn(),
  unlikeFeedPostComment: jest.fn(),
  deleteFeedPost: jest.fn(),
  deleteFeedPostImage: jest.fn(),
  updateFeedPost: jest.fn(),
  reportFeedPost: jest.fn(),
  shareFeedPost: jest.fn(),
  removeOwnFeedPostTag: jest.fn(),
  listFeedPostLikers: jest.fn(),
  listFeedCommentLikers: jest.fn(),
}));

jest.mock('@/lib/feedImageUpload', () => ({
  uploadFeedPostImages: jest.fn(),
  isAllowedFeedImageName: () => true,
  MAX_FEED_POST_IMAGES: 5,
  FEED_IMAGE_MAX_MB: 5,
  FEED_IMAGE_MAX_BYTES: 5 * 1024 * 1024,
  FEED_IMAGE_ACCEPT: '.jpg,.png',
}));

const toastError = jest.fn();
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    error: (...args: unknown[]) => toastError(...args),
    success: jest.fn(),
  },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_k: string, fallback: string) => fallback, locale: 'sk' }),
}));

jest.mock('@/hooks', () => ({
  useIsMobile: () => false,
  useIsMobileState: () => ({ isMobile: false, isResolved: true }),
}));

jest.mock('../../shared/useProtectedImage', () => ({
  useProtectedImage: (src: string | null) => ({
    resolvedSrc: src,
    isProtected: false,
    isLoading: false,
    isError: false,
  }),
}));

jest.mock('../../messages/DesktopEmojiPickerButton', () => ({
  DesktopEmojiPickerButton: ({ ariaLabel }: { ariaLabel: string }) => (
    <button type="button" aria-label={ariaLabel}>
      emoji
    </button>
  ),
}));

jest.mock('../../messages/GroupUserPicker', () => ({
  GroupUserPicker: () => <div />,
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('framer-motion', () => ({
  motion: {
    article: ({ children, ...props }: React.ComponentProps<'article'>) => (
      <article {...props}>{children}</article>
    ),
  },
}));

const mockedGetPost = getFeedPost as jest.MockedFunction<typeof getFeedPost>;

function makePost(): FeedPost {
  return {
    id: 7,
    post_type: 'free_post',
    caption: 'Text príspevku',
    author: {
      id: 10,
      display_name: 'Jana',
      slug: 'jana',
      user_type: 'individual',
      avatar_url: null,
    },
    images: [
      {
        id: 11,
        status: 'approved',
        thumbnail_url: 'http://api.test/11-t.webp',
        large_url: 'http://api.test/11-l.webp',
      },
    ],
    shared_content: null,
    shared_content_unavailable: false,
    tagged_users: [],
    likes_count: 2,
    comments_count: 3,
    is_liked_by_me: false,
    can_manage: false,
    created_at: '2026-01-01T10:00:00Z',
  } as FeedPost;
}

/** Rovnaké zloženie ako v dashboarde: appka + okno nad ňou. */
function OverlayHost({ children }: { children: ReactNode }) {
  const overlay = useFeedPostOverlay();
  return (
    <>
      {children}
      {overlay?.target ? (
        <FeedPostDetailOverlay
          postId={overlay.target.postId}
          highlightCommentId={overlay.target.highlightCommentId ?? null}
          onClose={overlay.close}
        />
      ) : null}
    </>
  );
}

let profileTabMounts = 0;

/** Profilová záložka s vlastným stavom – ten sa nesmie stratiť. */
function ProfileTab() {
  const [count, setCount] = useState(0);
  useState(() => {
    profileTabMounts += 1;
    return null;
  });
  return (
    <div data-testid="profilova-zalozka">
      <button type="button" onClick={() => setCount((value) => value + 1)}>
        rozbaliť
      </button>
      <span data-testid="stav-zalozky">{count}</span>
      <FeedPostCard post={makePost()} />
    </div>
  );
}

/** Rovnaká synchronizácia URL, akú robí dashboard. */
function syncHistory(target: { postId: number } | null) {
  if (target) pushFeedOverlayHistory(buildFeedPostPath(target.postId));
  else popFeedOverlayHistory();
}

function renderApp() {
  render(
    <FeedPostOverlayProvider onTargetChange={syncHistory}>
      <OverlayHost>
        <ProfileTab />
      </OverlayHost>
    </FeedPostOverlayProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  resetOverlayLayers();
  resetFeedOverlayHistory();
  // Cudzí profil – okno sa otvára odtiaľto, nie z Nástenky.
  window.history.replaceState(null, '', '/dashboard/users/5');
  profileTabMounts = 0;
  mockedGetPost.mockResolvedValue(makePost());
});

it('opens the window from a profile tab', async () => {
  renderApp();

  await userEvent.click(screen.getByTestId('feed-comments-button'));

  expect(await screen.findByTestId('feed-post-overlay-comments')).toBeInTheDocument();
  // Profil ostáva presne tam, kde bol – okno je vrstva, nie navigácia.
  expect(screen.getByTestId('profilova-zalozka')).toBeInTheDocument();
});

it('returns the user to the untouched app after closing', async () => {
  renderApp();

  // Stav, ktorý by navigácia zahodila.
  await userEvent.click(screen.getByRole('button', { name: 'rozbaliť' }));
  expect(screen.getByTestId('stav-zalozky')).toHaveTextContent('1');

  await userEvent.click(screen.getByTestId('feed-comments-button'));
  await screen.findByTestId('feed-post-overlay-comments');

  await userEvent.keyboard('{Escape}');

  await waitFor(() =>
    expect(screen.queryByTestId('feed-post-overlay')).not.toBeInTheDocument(),
  );
  expect(screen.getByTestId('stav-zalozky')).toHaveTextContent('1');
  // Jediný mount za celý beh = nič sa medzitým neodmountovalo, takže by
  // ostala aj pozícia scrollu (tú jsdom sama nevie).
  expect(profileTabMounts).toBe(1);
});

it('opens the window again after it was closed', async () => {
  renderApp();

  await userEvent.click(screen.getByTestId('feed-comments-button'));
  await screen.findByTestId('feed-post-overlay-comments');
  await userEvent.click(screen.getByTestId('feed-post-overlay-close'));
  await waitFor(() =>
    expect(screen.queryByTestId('feed-post-overlay')).not.toBeInTheDocument(),
  );

  await userEvent.click(screen.getByTestId('feed-comments-button'));

  expect(await screen.findByTestId('feed-post-overlay-comments')).toBeInTheDocument();
});


describe('bežné zatvorenie okna z cudzieho profilu', () => {
  /** Otvorí okno a vráti spôsob, akým ho test zatvorí. */
  async function openWindow() {
    renderApp();
    await userEvent.click(screen.getByTestId('feed-comments-button'));
    await screen.findByTestId('feed-post-overlay-comments');
    toastError.mockClear();
  }

  async function expectQuietClose() {
    await waitFor(() =>
      expect(screen.queryByTestId('feed-post-overlay')).not.toBeInTheDocument(),
    );
    // Príspevok existuje a používateľ len zavrel okno – hlásiť nedostupnosť
    // je vyslovene mätúce.
    expect(toastError).not.toHaveBeenCalled();
    // A kým sa krok späť nedokončí, cesta príspevku patrí ešte oknu: appka
    // pod ním preto NESMIE otvoriť celoobrazovkovú stránku (tá by po
    // dobehnutí kroku ostala bez id a nedostupnosť by ohlásila).
    expect(isFeedOverlayHistoryBusy()).toBe(true);
  }

  it('says nothing when closing with Escape', async () => {
    await openWindow();

    await userEvent.keyboard('{Escape}');

    await expectQuietClose();
  });

  it('says nothing when closing with the X button', async () => {
    await openWindow();

    await userEvent.click(screen.getByTestId('feed-post-overlay-close'));

    await expectQuietClose();
  });

  it('says nothing when closing by a click outside', async () => {
    await openWindow();

    await userEvent.click(screen.getByTestId('feed-post-overlay-layer'));

    await expectQuietClose();
  });
});
