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

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
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

function renderApp() {
  render(
    <FeedPostOverlayProvider>
      <OverlayHost>
        <ProfileTab />
      </OverlayHost>
    </FeedPostOverlayProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  resetOverlayLayers();
  profileTabMounts = 0;
  mockedGetPost.mockResolvedValue(makePost());
});

it('opens the window from a profile tab', async () => {
  renderApp();

  await userEvent.click(screen.getByTestId('feed-comments-button'));

  expect(await screen.findByTestId('feed-post-overlay-fixed')).toBeInTheDocument();
  // Profil ostáva presne tam, kde bol – okno je vrstva, nie navigácia.
  expect(screen.getByTestId('profilova-zalozka')).toBeInTheDocument();
});

it('returns the user to the untouched app after closing', async () => {
  renderApp();

  // Stav, ktorý by navigácia zahodila.
  await userEvent.click(screen.getByRole('button', { name: 'rozbaliť' }));
  expect(screen.getByTestId('stav-zalozky')).toHaveTextContent('1');

  await userEvent.click(screen.getByTestId('feed-comments-button'));
  await screen.findByTestId('feed-post-overlay-fixed');

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
  await screen.findByTestId('feed-post-overlay-fixed');
  await userEvent.click(screen.getByTestId('feed-post-overlay-close'));
  await waitFor(() =>
    expect(screen.queryByTestId('feed-post-overlay')).not.toBeInTheDocument(),
  );

  await userEvent.click(screen.getByTestId('feed-comments-button'));

  expect(await screen.findByTestId('feed-post-overlay-fixed')).toBeInTheDocument();
});
