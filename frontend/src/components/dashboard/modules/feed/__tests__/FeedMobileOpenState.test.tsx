/**
 * Ako mobilné vrstvy vyzerajú v PRVOM okamihu po otvorení.
 *
 * Tri veci, ktoré sa dajú overiť len tesne po otvorení: kde sedí počítadlo
 * fotiek, či je stav lajku hneď správny (a nie až po dorovnaní), a či sa
 * ku komentárom scrolluje plynulo.
 */

import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostCard from '../FeedPostCard';
import { resetOverlayLayers } from '../../shared/overlayLayers';
import { type FeedPost } from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  FEED_COMMENT_MAX_LENGTH: 500,
  getFeedPost: jest.fn(),
  listFeedPostComments: jest.fn(),
  listFeedCommentReplies: jest.fn(),
  createFeedPostComment: jest.fn(),
  deleteFeedPostComment: jest.fn(),
  updateFeedPostComment: jest.fn(),
  likeFeedPostComment: jest.fn(),
  unlikeFeedPostComment: jest.fn(),
  likeFeedPost: jest.fn(),
  unlikeFeedPost: jest.fn(),
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

const feedApi = jest.requireMock('@/lib/feedApi');
const mockedLike = feedApi.likeFeedPost as jest.Mock;
const mockedListComments = feedApi.listFeedPostComments as jest.Mock;

const author = {
  id: 10,
  display_name: 'Jana',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};

function image(id: number) {
  return {
    id,
    status: 'approved',
    thumbnail_url: `http://api.test/${id}-t.webp`,
    large_url: `http://api.test/${id}-l.webp`,
  } as FeedPost['images'][number];
}

function makePost(overrides: Partial<FeedPost> = {}): FeedPost {
  return {
    id: 7,
    post_type: 'free_post',
    caption: 'Text príspevku',
    author,
    images: [image(11)],
    shared_content: null,
    shared_content_unavailable: false,
    tagged_users: [],
    likes_count: 4,
    comments_count: 0,
    is_liked_by_me: false,
    can_manage: false,
    created_at: '2026-01-01T10:00:00Z',
    ...overrides,
  } as FeedPost;
}

beforeEach(() => {
  jest.clearAllMocks();
  resetOverlayLayers();
  mockedListComments.mockResolvedValue({
    results: [],
    next: null,
    previous: null,
    count: 0,
  });
});

describe('počítadlo fotiek v prehliadači', () => {
  it('sits on the photo, bottom right, clear of the action row', async () => {
    render(<FeedPostCard post={makePost({ images: [image(11), image(12)] })} />);
    await userEvent.click(screen.getByTestId('feed-image-open-11'));
    const viewer = await screen.findByTestId('feed-photo-viewer');

    const counter = within(viewer).getByTestId('feed-photo-viewer-counter');
    expect(counter).toHaveTextContent('1/2');
    // Vpravo dole NA fotke…
    expect(counter.className).toContain('right-3');
    expect(counter.className).toContain('bottom-16');
    // …nie vycentrované pod textom, ako predtým.
    expect(counter.className).not.toContain('top-20');
    expect(counter.className).not.toContain('left-1/2');
    // Jemné tmavé pozadie kvôli čitateľnosti na svetlej fotke.
    expect(counter.className).toContain('bg-black/55');
  });

  it('keeps the plain viewer counter centered at the bottom', async () => {
    // Prehliadač bez vlastnej vrstvy (portfólio, fullscreen v okne detailu)
    // ostáva nezmenený – zmena patrí len variantu s ovládacou vrstvou.
    render(<FeedPostCard post={makePost({ images: [image(11), image(12)] })} variant="detail" />);

    await userEvent.click(screen.getByTestId('feed-image-open-11'));

    const counter = await screen.findByTestId('feed-image-lightbox-counter');
    expect(counter.className).toContain('bottom-4');
    expect(counter.className).toContain('left-1/2');
  });
});

describe('stav lajku hneď pri otvorení', () => {
  /** Lajkne na karte a počká, kým sa to na nej prejaví. */
  async function likeOnCard() {
    mockedLike.mockResolvedValue({ likes_count: 5, is_liked_by_me: true });
    await userEvent.click(screen.getByTestId('feed-like-button'));
    await waitFor(() =>
      expect(screen.getByTestId('feed-like-count')).toHaveTextContent('5'),
    );
  }

  it('shows the fresh like in the photo viewer from the first render', async () => {
    render(<FeedPostCard post={makePost()} />);
    await likeOnCard();

    await userEvent.click(screen.getByTestId('feed-image-open-11'));
    const viewer = await screen.findByTestId('feed-photo-viewer');

    // Bez `waitFor`: hodnota musí sedieť UŽ v prvom vykreslení, nie až po
    // dorovnaní. Predtým sa vrstva nasadila na `post`, ktorý lajk z karty
    // nenesie, a chvíľu ukazovala prázdne srdiečko.
    expect(within(viewer).getByTestId('feed-photo-viewer-like')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(
      within(viewer).getByTestId('feed-photo-viewer-like-count'),
    ).toHaveTextContent('5');
  });

  it('shows the fresh like in the mobile detail screen from the first render', async () => {
    render(<FeedPostCard post={makePost()} />);
    await likeOnCard();

    await userEvent.click(screen.getByTestId('feed-comments-button'));
    const detail = await screen.findByTestId('feed-mobile-detail');

    expect(within(detail).getByTestId('feed-mobile-detail-like')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(
      within(detail).getByTestId('feed-mobile-detail-like-count'),
    ).toHaveTextContent('5');
  });

  it('shows an unlike immediately too', async () => {
    feedApi.unlikeFeedPost.mockResolvedValue({
      likes_count: 3,
      is_liked_by_me: false,
    });
    render(<FeedPostCard post={makePost({ is_liked_by_me: true })} />);

    await userEvent.click(screen.getByTestId('feed-like-button'));
    await waitFor(() =>
      expect(screen.getByTestId('feed-like-count')).toHaveTextContent('3'),
    );

    await userEvent.click(screen.getByTestId('feed-image-open-11'));
    const viewer = await screen.findByTestId('feed-photo-viewer');

    expect(within(viewer).getByTestId('feed-photo-viewer-like')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
});

describe('plynulé doscrollovanie ku komentárom', () => {
  const SCROLLER_HEIGHT = 707;
  const HEADER_CONTENT_HEIGHT = 490;
  const COMMENT_HEIGHT = 220;
  const ANCHOR_OFFSET = 422;

  it('asks the browser for a smooth scroll instead of jumping', async () => {
    const page = {
      results: Array.from({ length: 10 }, (_unused, index) => ({
        id: 100 + index,
        text: `Komentár ${index + 1}`,
        author,
        can_delete: false,
        can_edit: false,
        likes_count: 0,
        is_liked_by_me: false,
        replies: [],
        replies_count: 0,
        created_at: '2026-01-01T11:00:00Z',
      })),
      next: null,
      previous: null,
      count: 10,
    };
    let deliver!: (value: typeof page) => void;
    mockedListComments.mockReturnValue(
      new Promise<typeof page>((resolve) => {
        deliver = resolve;
      }),
    );

    render(<FeedPostCard post={makePost({ comments_count: 10 })} />);
    await userEvent.click(screen.getByTestId('feed-comments-button'));
    await screen.findByTestId('feed-mobile-detail');

    const scroller = screen.getByTestId('feed-comments-scroll');
    const anchor = screen.getByTestId('feed-mobile-detail-comments-anchor');
    let top = 0;
    const scrollHeight = () =>
      HEADER_CONTENT_HEIGHT +
      scroller.querySelectorAll('[data-comment-id]').length * COMMENT_HEIGHT;
    Object.defineProperty(scroller, 'clientHeight', {
      configurable: true,
      get: () => SCROLLER_HEIGHT,
    });
    Object.defineProperty(scroller, 'scrollHeight', {
      configurable: true,
      get: scrollHeight,
    });
    Object.defineProperty(scroller, 'scrollTop', {
      configurable: true,
      get: () => top,
      set: (value: number) => {
        top = Math.min(Math.max(0, value), Math.max(0, scrollHeight() - SCROLLER_HEIGHT));
      },
    });
    scroller.getBoundingClientRect = () => ({ top: 0 }) as DOMRect;
    anchor.getBoundingClientRect = () => ({ top: ANCHOR_OFFSET - top }) as DOMRect;
    // jsdom `scrollTo` na prvkoch NEMÁ vôbec (je `undefined`), takže sa doplní
    // – appka ho práve preto volá cez kontrolu typu a inde padá na priamy zápis.
    const scrollTo = jest.fn();
    (scroller as unknown as { scrollTo: jest.Mock }).scrollTo = scrollTo;

    await act(async () => {
      deliver(page);
    });

    await waitFor(() => expect(scrollTo).toHaveBeenCalled());
    expect(scrollTo).toHaveBeenCalledWith({
      top: ANCHOR_OFFSET,
      behavior: 'smooth',
    });
    // Skok priamym zápisom sa už nerobí – o pozíciu sa stará prehliadač.
    expect(scroller.scrollTop).toBe(0);
  });
});
