/**
 * Preberanie príspevku z feedu do karty (lajk, počty, označenia) a jeho premietnutie do mobilnej vrstvy.
 *
 * Charakterizačné testy pred delením `FeedPostCard.tsx` (nález 333, dávka K48). Obnovenie feedu pošle do karty nový
 * objekt príspevku pod tým istým `key`, takže karta si stav musí prevziať sama: lajk a jeho počet (okrem času, keď
 * beží vlastný lajk), počet komentárov a označenia. Sedem efektov, ktoré to robia, musí po delení bežať v rovnakom
 * poradí, preto je tu aj test, v ktorom sa v jednej dávke zmení príspevok z feedu aj lajk používateľa: pri
 * zlom poradí by vyhral starý príspevok. Chybu 355 a 356 (zastaraný stav pri obnove feedu počas lajku, okno zdieľania
 * po úprave) tieto testy zámerne nezachytávajú ani na nich nezávisia.
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostCard from '../FeedPostCard';
import { emitFeedPostCounts } from '../feedPostCountEvents';
import { likeFeedPost, unlikeFeedPost, type FeedPost } from '@/lib/feedApi';

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
    images: [],
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

const tag = (id: number, name: string) =>
  ({
    id,
    display_name: name,
    slug: name.toLowerCase(),
    can_remove_tag: false,
  }) as NonNullable<FeedPost['tagged_users']>[number];

type LikePayload = Awaited<ReturnType<typeof likeFeedPost>>;

/** Lajk, ktorý server dokončí až na požiadanie testu. */
function pendingLike() {
  let finish!: (payload: LikePayload) => void;
  const promise = new Promise<LikePayload>((resolve) => {
    finish = resolve;
  });
  return { promise, finish };
}

const likeCount = () => screen.getByTestId('feed-like-count');

beforeEach(() => {
  jest.clearAllMocks();
  mockIsMobile = false;
  document.body.innerHTML = '';
});

describe('preberanie príspevku z feedu do karty', () => {
  it('nový príspevok z feedu prepíše stav lajku, počet lajkov, počet komentárov a označenia', async () => {
    const { rerender } = render(
      <FeedPostCard post={makePost({ tagged_users: [tag(30, 'Ema')] })} />,
    );
    expect(likeCount()).toHaveTextContent('3');
    expect(screen.getByTestId('feed-comments-button')).toHaveAttribute(
      'aria-label',
      'Komentáre: 2',
    );
    expect(screen.getByTestId('feed-post-tag-30')).toBeInTheDocument();

    rerender(
      <FeedPostCard
        post={makePost({
          is_liked_by_me: true,
          likes_count: 8,
          comments_count: 5,
          tagged_users: [tag(31, 'Eva')],
        })}
      />,
    );

    expect(likeCount()).toHaveTextContent('8');
    expect(screen.getByTestId('feed-comments-button')).toHaveAttribute(
      'aria-label',
      'Komentáre: 5',
    );
    expect(screen.getByTestId('feed-post-tag-31')).toBeInTheDocument();
    expect(screen.queryByTestId('feed-post-tag-30')).not.toBeInTheDocument();

    // Prevzatý stav lajku sa prejaví v správaní: ďalší klik lajk odoberie, nie pridá.
    mockedUnlike.mockResolvedValue({ is_liked_by_me: false, likes_count: 7 });
    await userEvent.click(screen.getByTestId('feed-like-button'));
    expect(mockedUnlike).toHaveBeenCalledWith(7);
    expect(mockedLike).not.toHaveBeenCalled();
  });

  it('počas prebiehajúceho lajku sa optimistický stav príspevkom z feedu neprepíše', async () => {
    const server = pendingLike();
    mockedLike.mockReturnValue(server.promise);
    const { rerender } = render(<FeedPostCard post={makePost()} />);

    await userEvent.click(screen.getByTestId('feed-like-button'));
    expect(likeCount()).toHaveTextContent('4');

    // Obnova feedu medzitým prinesie iný počet (lajkol aj niekto ďalší): optimistický stav nesmie prebliknúť späť.
    rerender(<FeedPostCard post={makePost({ likes_count: 5 })} />);
    expect(likeCount()).toHaveTextContent('4');

    await act(async () => {
      server.finish({ is_liked_by_me: true, likes_count: 6 });
    });
    expect(likeCount()).toHaveTextContent('6');
  });
});

describe('premietnutie lajku do mobilnej obrazovky detailu', () => {
  it('ak sa v tej istej dávke zmení príspevok z feedu aj lajk, vyhrá lajk používateľa', async () => {
    mockIsMobile = true;
    mockedLike.mockReturnValue(new Promise(() => undefined));
    const original = makePost();
    const { rerender } = render(<FeedPostCard post={original} />);

    // Klik na lajk a obnova feedu (nový objekt príspevku) prídu v jednej dávke.
    act(() => {
      fireEvent.click(screen.getByTestId('feed-like-button'));
      rerender(<FeedPostCard post={{ ...original }} />);
    });
    await userEvent.click(screen.getByTestId('feed-comments-button'));

    expect(await screen.findByTestId('feed-mobile-detail-like')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('lajk používateľa sa premietne do mobilnej obrazovky detailu otvorenej po ňom', async () => {
    mockIsMobile = true;
    mockedLike.mockResolvedValue({ is_liked_by_me: true, likes_count: 4 });
    render(<FeedPostCard post={makePost()} />);

    await userEvent.click(screen.getByTestId('feed-like-button'));
    await userEvent.click(screen.getByTestId('feed-comments-button'));

    expect(await screen.findByTestId('feed-mobile-detail-like')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByTestId('feed-mobile-detail-like-count')).toHaveTextContent('4');
  });

  it('zmena samotného počtu lajkov z iného miesta sa premietne do mobilnej obrazovky detailu', async () => {
    mockIsMobile = true;
    render(<FeedPostCard post={makePost()} />);

    act(() => {
      emitFeedPostCounts({ postId: 7, likesCount: 9 });
    });
    expect(likeCount()).toHaveTextContent('9');
    await userEvent.click(screen.getByTestId('feed-comments-button'));

    expect(await screen.findByTestId('feed-mobile-detail-like-count')).toHaveTextContent('9');
    expect(screen.getByTestId('feed-mobile-detail-like')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
});
