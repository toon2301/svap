/**
 * Obnova feedu počas prebiehajúceho lajku a mobilné vrstvy (oprava nálezu 356, dávka K56).
 *
 * Obnova feedu pošle do karty nový objekt príspevku so starým lajkom (snapshot je spred lajku). Hook lajku ho počas
 * lajku nepreberie, takže karta ukazuje lajk používateľa, ale `currentPost`, z ktorého sa nasadzujú mobilná obrazovka
 * detailu aj prehliadač fotky, sa vrátil na starý stav a po dokončení lajku sa už nezmenil (lajk aj počet ostali
 * rovnaké ako optimistický stav). Mobilné vrstvy sa preto otvorili s nesprávnym lajkom. Testy overujú, že sa otvoria
 * s tým istým lajkom a počtom ako karta, a že oprava nepokazila bežné obnovenie feedu bez lajku.
 */

import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostCard from '../FeedPostCard';
import { resetOverlayLayers } from '../../shared/overlayLayers';
import { likeFeedPost, unlikeFeedPost, updateFeedPost, type FeedPost } from '@/lib/feedApi';

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

jest.mock('@/hooks', () => ({
  useIsMobile: () => true,
  useIsMobileState: () => ({ isMobile: true, isResolved: true }),
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

const mockedLike = likeFeedPost as jest.MockedFunction<typeof likeFeedPost>;
const mockedUnlike = unlikeFeedPost as jest.MockedFunction<typeof unlikeFeedPost>;
const mockedUpdate = updateFeedPost as jest.MockedFunction<typeof updateFeedPost>;

type LikePayload = Awaited<ReturnType<typeof likeFeedPost>>;

/** Lajk, ktorý server dokončí až na požiadanie testu. */
function pendingLike() {
  let finish!: (payload: LikePayload) => void;
  const promise = new Promise<LikePayload>((resolve) => {
    finish = resolve;
  });
  return { promise, finish };
}

function makePost(overrides: Partial<FeedPost> = {}): FeedPost {
  return {
    id: 7,
    post_type: 'free_post',
    caption: 'Ahoj',
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
    likes_count: 3,
    comments_count: 2,
    is_liked_by_me: false,
    can_manage: false,
    created_at: '2026-01-01T10:00:00Z',
    ...overrides,
  } as FeedPost;
}

const likeCount = () => screen.getByTestId('feed-like-count');

/** Otvorí mobilnú obrazovku detailu ikonou komentárov a vráti jej lajk a počet lajkov. */
async function otvorDetail() {
  await userEvent.click(screen.getByTestId('feed-comments-button'));
  const detail = await screen.findByTestId('feed-mobile-detail');
  return {
    like: within(detail).getByTestId('feed-mobile-detail-like'),
    count: within(detail).getByTestId('feed-mobile-detail-like-count'),
  };
}

/** Otvorí mobilný prehliadač fotky ťuknutím na fotku a vráti jeho lajk a počet lajkov. */
async function otvorPrehliadacFotky() {
  await userEvent.click(screen.getByTestId('feed-image-open-11'));
  const viewer = await screen.findByTestId('feed-photo-viewer');
  return {
    like: within(viewer).getByTestId('feed-photo-viewer-like'),
    count: within(viewer).getByTestId('feed-photo-viewer-like-count'),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  resetOverlayLayers();
});

describe('obnova feedu počas prebiehajúceho lajku', () => {
  it('mobilná obrazovka detailu otvorená po lajku ukáže lajk a počet z karty', async () => {
    const server = pendingLike();
    mockedLike.mockReturnValue(server.promise);
    const { rerender } = render(<FeedPostCard post={makePost()} />);

    await userEvent.click(screen.getByTestId('feed-like-button'));
    expect(likeCount()).toHaveTextContent('4');
    // Obnova feedu so starým snapshotom (nový objekt, lajk ešte nie je na serveri): karta ho počas lajku nepreberie.
    rerender(<FeedPostCard post={makePost()} />);
    await act(async () => {
      server.finish({ is_liked_by_me: true, likes_count: 4 });
    });
    expect(likeCount()).toHaveTextContent('4');

    const detail = await otvorDetail();

    expect(detail.like).toHaveAttribute('aria-pressed', 'true');
    expect(detail.count).toHaveTextContent('4');
  });

  it('mobilný prehliadač fotky otvorený po lajku ukáže lajk a počet z karty', async () => {
    const server = pendingLike();
    mockedLike.mockReturnValue(server.promise);
    const { rerender } = render(<FeedPostCard post={makePost()} />);

    await userEvent.click(screen.getByTestId('feed-like-button'));
    rerender(<FeedPostCard post={makePost()} />);
    await act(async () => {
      server.finish({ is_liked_by_me: true, likes_count: 4 });
    });

    const viewer = await otvorPrehliadacFotky();

    expect(viewer.like).toHaveAttribute('aria-pressed', 'true');
    expect(viewer.count).toHaveTextContent('4');
  });

  it('mobilná obrazovka detailu ukáže po obnove feedu počas odobratia lajku odobraný lajk', async () => {
    const server = pendingLike();
    mockedUnlike.mockReturnValue(server.promise);
    const lajknuty = { is_liked_by_me: true, likes_count: 3 };
    const { rerender } = render(<FeedPostCard post={makePost(lajknuty)} />);

    await userEvent.click(screen.getByTestId('feed-like-button'));
    expect(likeCount()).toHaveTextContent('2');
    rerender(<FeedPostCard post={makePost(lajknuty)} />);
    await act(async () => {
      server.finish({ is_liked_by_me: false, likes_count: 2 });
    });
    expect(likeCount()).toHaveTextContent('2');

    const detail = await otvorDetail();

    expect(detail.like).toHaveAttribute('aria-pressed', 'false');
    expect(detail.count).toHaveTextContent('2');
  });

  it('ak server po obnove feedu vráti iný počet, detail ukáže počet zo servera', async () => {
    const server = pendingLike();
    mockedLike.mockReturnValue(server.promise);
    const { rerender } = render(<FeedPostCard post={makePost()} />);

    await userEvent.click(screen.getByTestId('feed-like-button'));
    // Obnova feedu medzitým prinesie iný počet (lajkol aj niekto ďalší).
    rerender(<FeedPostCard post={makePost({ likes_count: 5 })} />);
    await act(async () => {
      server.finish({ is_liked_by_me: true, likes_count: 6 });
    });
    expect(likeCount()).toHaveTextContent('6');

    const detail = await otvorDetail();

    expect(detail.like).toHaveAttribute('aria-pressed', 'true');
    expect(detail.count).toHaveTextContent('6');
  });
});

describe('obnova feedu bez prebiehajúceho lajku', () => {
  it('mobilná obrazovka detailu ukáže lajk a počet z čerstvého príspevku z feedu', async () => {
    const { rerender } = render(<FeedPostCard post={makePost()} />);

    rerender(<FeedPostCard post={makePost({ is_liked_by_me: true, likes_count: 8 })} />);
    expect(likeCount()).toHaveTextContent('8');
    const detail = await otvorDetail();

    expect(detail.like).toHaveAttribute('aria-pressed', 'true');
    expect(detail.count).toHaveTextContent('8');
  });

  it('lajk po úprave textu nevráti v karte starý text', async () => {
    mockedUpdate.mockResolvedValue(makePost({ caption: 'Novy text', is_edited: true, can_manage: true }));
    mockedLike.mockResolvedValue({ is_liked_by_me: true, likes_count: 4 });
    render(<FeedPostCard post={makePost({ can_manage: true })} />);

    await userEvent.click(screen.getByTestId('feed-post-menu-trigger'));
    await userEvent.click(within(screen.getByTestId('feed-post-menu')).getByTestId('feed-post-edit'));
    const input = await screen.findByTestId('feed-post-edit-input');
    await userEvent.clear(input);
    await userEvent.type(input, 'Novy text');
    await userEvent.click(screen.getByTestId('feed-post-edit-submit'));
    await waitFor(() =>
      expect(screen.queryByTestId('feed-post-edit-modal')).not.toBeInTheDocument(),
    );
    expect(await screen.findByText('Novy text')).toBeInTheDocument();

    // Premietnutie lajku do `currentPost` musí zachovať lokálnu verziu príspevku (text po úprave), nie ju nahradiť
    // príspevkom z feedu.
    await userEvent.click(screen.getByTestId('feed-like-button'));
    await waitFor(() => expect(likeCount()).toHaveTextContent('4'));

    expect(screen.getByText('Novy text')).toBeInTheDocument();
    expect(screen.queryByText('Ahoj')).not.toBeInTheDocument();
  });
});
