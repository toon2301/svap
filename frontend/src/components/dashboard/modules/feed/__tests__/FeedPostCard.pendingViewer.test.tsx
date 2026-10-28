/**
 * Mobilný prehliadač fotky po vytvorení príspevku (nález 199).
 *
 * Fotka je pri vytvorení „spracúva sa“ (`pending`), karta ju dosledí pollingom a ukáže. Ťuk na ňu musí
 * otvoriť prehliadač aj s fotkou – predtým dostal prehliadač zastaraný príspevok bez adries fotiek,
 * zavrel sa hneď po otvorení a na mobile sa „nič nestalo“, kým sa feed nenačítal znova.
 */

import { act, render, screen, within } from '@testing-library/react';
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

const author = {
  id: 10,
  display_name: 'Jana',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};

function approved(id: number) {
  return {
    id,
    status: 'approved',
    thumbnail_url: `http://api.test/${id}-t.webp`,
    large_url: `http://api.test/${id}-l.webp`,
  } as FeedPost['images'][number];
}

function pending(id: number) {
  return { id, status: 'pending' } as FeedPost['images'][number];
}

function makePost(images: FeedPost['images']): FeedPost {
  return {
    id: 7,
    post_type: 'free_post',
    caption: 'Text príspevku',
    author,
    images,
    shared_content: null,
    shared_content_unavailable: false,
    tagged_users: [],
    likes_count: 0,
    comments_count: 0,
    is_liked_by_me: false,
    can_manage: true,
    created_at: '2026-01-01T10:00:00Z',
  } as FeedPost;
}

/** Karta s fotkami „spracúva sa“; po prvom kole pollingu server vráti hotové. */
async function renderCreatedPostAndWaitForPolling(created: FeedPost['images'], done: FeedPost['images']) {
  feedApi.getFeedPost.mockResolvedValue(makePost(done));
  const view = render(<FeedPostCard post={makePost(created)} />);
  await act(async () => {
    jest.advanceTimersByTime(2600);
  });
  return view;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  resetOverlayLayers();
  feedApi.listFeedPostComments.mockResolvedValue({ results: [], next: null, previous: null, count: 0 });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('Nástenka: prehliadač fotky po vytvorení príspevku', () => {
  it('opens the photo viewer with the photo once polling has finished processing it', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await renderCreatedPostAndWaitForPolling([pending(5)], [approved(5)]);

    expect(screen.queryByTestId('feed-image-status')).not.toBeInTheDocument();
    await user.click(await screen.findByTestId('feed-image-open-5'));

    const viewer = await screen.findByTestId('feed-photo-viewer');
    expect(within(viewer).getByTestId('feed-photo-viewer-image')).toHaveAttribute(
      'src',
      'http://api.test/5-l.webp',
    );
  });

  it('opens on the tapped photo when several photos finished processing', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await renderCreatedPostAndWaitForPolling(
      [pending(5), pending(6)],
      [approved(5), approved(6)],
    );

    await user.click(await screen.findByTestId('feed-image-open-5'));

    const viewer = await screen.findByTestId('feed-photo-viewer');
    expect(within(viewer).getByTestId('feed-photo-viewer-counter')).toHaveTextContent('1/2');
  });

  it('still opens a post whose photo was approved from the start', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<FeedPostCard post={makePost([approved(5)])} />);

    await user.click(screen.getByTestId('feed-image-open-5'));

    expect(await screen.findByTestId('feed-photo-viewer')).toBeInTheDocument();
  });

  it('does not offer a photo that is still being processed', async () => {
    feedApi.getFeedPost.mockResolvedValue(makePost([pending(5)]));
    render(<FeedPostCard post={makePost([pending(5)])} />);
    await act(async () => {
      jest.advanceTimersByTime(2600);
    });

    expect(screen.getByTestId('feed-image-status')).toBeInTheDocument();
    expect(screen.queryByTestId('feed-image-open-5')).not.toBeInTheDocument();
  });

  it('opens the photo again after the card receives a fresh version of the post', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const view = await renderCreatedPostAndWaitForPolling([pending(5)], [approved(5)]);

    view.rerender(<FeedPostCard post={makePost([approved(5)])} />);
    await user.click(await screen.findByTestId('feed-image-open-5'));

    expect(await screen.findByTestId('feed-photo-viewer')).toBeInTheDocument();
  });
});
