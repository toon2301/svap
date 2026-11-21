/**
 * Zatváranie vrstiev karty po zdieľaní a po zmazaní príspevku iným.
 *
 * Charakterizačné testy pred delením `FeedPostCard.tsx` (nález 333, dávka K48). Karta vlastní tri vrstvy: mobilnú
 * obrazovku detailu, mobilný prehliadač fotky a prehliadač fotky pôvodného príspevku z repostu. Po zdieľaní sa pristáva
 * na Nástenku, takže žiadna z nich nesmie ostať otvorená. Keď príspevok zmaže niekto iný (signál o zmazaní), karta
 * zavrie vrstvy len vtedy, ak ide o JEJ príspevok; zmazanie cudzieho príspevku ich nechá. Existujúce testy držia hlavne
 * mobilný detail a mobilný prehliadač; prehliadač fotky z repostu, ochranu na cudzie `id` a prechod karty na iný
 * príspevok nestráži nič. Testy idú cez verejné rozhranie karty (vlastnosti, DOM, `data-testid`, signály), takže musia
 * prejsť bez úpravy aj po každom kroku delenia.
 */

import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostCard from '../FeedPostCard';
import { emitFeedPostDeleted } from '../feedPostDeletedEvents';
import { emitFeedShareLanding, resetFeedShareLanding } from '../feedShareLanding';
import { resetOverlayLayers } from '../../shared/overlayLayers';
import { getFeedPost, type FeedPost } from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  FEED_COMMENT_MAX_LENGTH: 500,
  updateFeedPost: jest.fn(),
  deleteFeedPostImage: jest.fn(),
  deleteFeedPost: jest.fn(),
  getFeedPost: jest.fn(),
  likeFeedPost: jest.fn(),
  unlikeFeedPost: jest.fn(),
  listFeedPostComments: jest.fn(() =>
    Promise.resolve({ results: [], next: null, previous: null, count: 0 }),
  ),
  createFeedPostComment: jest.fn(),
  deleteFeedPostComment: jest.fn(),
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
  useLanguage: () => ({
    t: (_k: string, fallback: string) => fallback,
    locale: 'sk',
  }),
}));

let mockIsMobile = false;
jest.mock('@/hooks', () => ({
  useIsMobile: () => mockIsMobile,
  useIsMobileState: () => ({ isMobile: mockIsMobile, isResolved: true }),
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

const author = {
  id: 10,
  display_name: 'Jana',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};
const owner = {
  id: 21,
  display_name: 'Peter',
  slug: 'peter',
  user_type: 'individual',
  avatar_url: null,
};

const photo = (id: number) => ({
  id,
  status: 'approved',
  thumbnail_url: `http://api.test/${id}-t.webp`,
  large_url: `http://api.test/${id}-l.webp`,
});

function makePost(overrides: Record<string, unknown> = {}): FeedPost {
  return {
    id: 7,
    post_type: 'free_post',
    caption: 'Ahoj',
    author,
    images: [],
    shared_content: null,
    shared_content_unavailable: false,
    tagged_users: [],
    likes_count: 1,
    comments_count: 0,
    is_liked_by_me: false,
    can_manage: false,
    created_at: '2026-01-01T10:00:00Z',
    ...overrides,
  } as unknown as FeedPost;
}

const repost = (thumbnailUrl: string | null) =>
  makePost({
    post_type: 'shared_feed_post',
    caption: 'Toto stojí za pozretie.',
    shared_content: {
      type: 'feed_post',
      title: '',
      category: '',
      caption: 'Pôvodný text',
      id: 9,
      owner,
      owner_display_name: 'Peter',
      thumbnail_url: thumbnailUrl,
      is_seeking: null,
      price_negotiable: null,
      price_from: null,
      price_currency: '',
    },
  });

/** Repost s fotkou: klik na fotku dotiahne pôvodný príspevok číslo 9 a otvorí jeho prehliadač. */
const repostWithPhoto = () => repost('http://api.test/shared-9.webp');
/** Ten istý repost po obnove feedu, keď pôvodný príspevok už fotku nemá. */
const repostWithoutPhoto = () => repost(null);

const originalPost = () =>
  makePost({ id: 9, author: owner, images: [photo(41)], likes_count: 4 });

async function openSharedPhoto() {
  mockedGetPost.mockResolvedValue(originalPost());
  await userEvent.click(screen.getByTestId('feed-shared-post-photo'));
  return screen.findByTestId('feed-shared-photo-lightbox');
}

async function openMobileDetail() {
  await userEvent.click(screen.getByTestId('feed-comments-button'));
  return screen.findByTestId('feed-mobile-detail');
}

async function openMobilePhotoViewer() {
  await userEvent.click(screen.getByTestId('feed-image-open-11'));
  return screen.findByTestId('feed-photo-viewer');
}

beforeEach(() => {
  jest.clearAllMocks();
  resetOverlayLayers();
  resetFeedShareLanding();
  mockIsMobile = false;
  document.body.innerHTML = '';
});

describe('zatváranie vrstiev karty po zdieľaní (pristátí na Nástenke)', () => {
  it('po zdieľaní sa zatvorí prehliadač fotky z repostu', async () => {
    render(<FeedPostCard post={repostWithPhoto()} />);
    await openSharedPhoto();

    act(() => {
      emitFeedShareLanding(500);
    });

    await waitFor(() =>
      expect(screen.queryByTestId('feed-shared-photo-lightbox')).not.toBeInTheDocument(),
    );
  });

  it('po zdieľaní sa zatvorí mobilná obrazovka detailu', async () => {
    mockIsMobile = true;
    render(<FeedPostCard post={makePost()} />);
    await openMobileDetail();

    act(() => {
      emitFeedShareLanding(500);
    });

    expect(screen.queryByTestId('feed-mobile-detail')).not.toBeInTheDocument();
  });

  it('po zdieľaní sa zatvorí mobilný prehliadač fotky', async () => {
    mockIsMobile = true;
    render(<FeedPostCard post={makePost({ images: [photo(11)] })} />);
    await openMobilePhotoViewer();

    act(() => {
      emitFeedShareLanding(500);
    });

    expect(screen.queryByTestId('feed-photo-viewer')).not.toBeInTheDocument();
  });
});

describe('zatváranie vrstiev karty po zmazaní príspevku iným', () => {
  it('zmazanie iného príspevku mobilnú obrazovku detailu nezatvorí, zmazanie tohto príspevku áno', async () => {
    mockIsMobile = true;
    render(<FeedPostCard post={makePost()} />);
    await openMobileDetail();

    act(() => {
      emitFeedPostDeleted(999);
    });
    expect(screen.getByTestId('feed-mobile-detail')).toBeInTheDocument();

    act(() => {
      emitFeedPostDeleted(7);
    });
    expect(screen.queryByTestId('feed-mobile-detail')).not.toBeInTheDocument();
  });

  it('zmazanie iného príspevku mobilný prehliadač fotky nezatvorí, zmazanie tohto príspevku áno', async () => {
    mockIsMobile = true;
    render(<FeedPostCard post={makePost({ images: [photo(11)] })} />);
    await openMobilePhotoViewer();

    act(() => {
      emitFeedPostDeleted(999);
    });
    expect(screen.getByTestId('feed-photo-viewer')).toBeInTheDocument();

    act(() => {
      emitFeedPostDeleted(7);
    });
    expect(screen.queryByTestId('feed-photo-viewer')).not.toBeInTheDocument();
  });

  it('zmazanie iného príspevku prehliadač fotky z repostu nezatvorí, zmazanie tohto príspevku áno', async () => {
    render(<FeedPostCard post={repostWithPhoto()} />);
    await openSharedPhoto();

    act(() => {
      emitFeedPostDeleted(999);
    });
    expect(screen.getByTestId('feed-shared-photo-lightbox')).toBeInTheDocument();

    act(() => {
      emitFeedPostDeleted(7);
    });
    await waitFor(() =>
      expect(screen.queryByTestId('feed-shared-photo-lightbox')).not.toBeInTheDocument(),
    );
  });

  it('prehliadač fotky z repostu sa zatvorí, keď repost po obnove feedu už fotku nemá', async () => {
    const { rerender } = render(<FeedPostCard post={repostWithPhoto()} />);
    await openSharedPhoto();

    rerender(<FeedPostCard post={repostWithoutPhoto()} />);

    await waitFor(() =>
      expect(screen.queryByTestId('feed-shared-photo-lightbox')).not.toBeInTheDocument(),
    );
    expect(screen.queryByTestId('feed-shared-post-photo')).not.toBeInTheDocument();
  });

  it('po prechode karty na iný príspevok vrstvy zatvára až zmazanie nového príspevku', async () => {
    mockIsMobile = true;
    const { rerender } = render(<FeedPostCard post={makePost()} />);
    rerender(<FeedPostCard post={makePost({ id: 8, caption: 'Iný príspevok' })} />);
    await openMobileDetail();

    act(() => {
      emitFeedPostDeleted(7);
    });
    expect(screen.getByTestId('feed-mobile-detail')).toBeInTheDocument();

    act(() => {
      emitFeedPostDeleted(8);
    });
    expect(screen.queryByTestId('feed-mobile-detail')).not.toBeInTheDocument();
  });
});
