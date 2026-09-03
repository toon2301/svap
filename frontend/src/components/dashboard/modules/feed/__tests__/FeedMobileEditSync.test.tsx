/**
 * Úprava príspevku z MOBILNÝCH obrazoviek sa premietne do karty vo feede.
 *
 * Karta je vlastníkom príspevku; obe mobilné vrstvy (prehliadač fotky aj
 * obrazovka detailu) jej upravenú verziu hlásia späť cez `onPostUpdated` –
 * ten istý mechanizmus, aký appka už používa medzi kartou a desktopovým oknom
 * detailu. Bez neho by karta po zatvorení ukazovala starý text až do
 * obnovenia feedu.
 */

import { render, screen, waitFor, within } from '@testing-library/react';
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

const mockedListComments = jest.requireMock('@/lib/feedApi')
  .listFeedPostComments as jest.Mock;
const mockedUpdatePost = jest.requireMock('@/lib/feedApi')
  .updateFeedPost as jest.Mock;

const author = {
  id: 10,
  display_name: 'Jana Nováková',
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
    caption: 'Pôvodný text',
    author,
    images: [image(11)],
    shared_content: null,
    shared_content_unavailable: false,
    tagged_users: [],
    likes_count: 0,
    comments_count: 0,
    is_liked_by_me: false,
    // Upravovať smie len autor – o tom rozhoduje backend.
    can_manage: true,
    created_at: '2026-01-01T10:00:00Z',
    ...overrides,
  } as FeedPost;
}

/** Prejde úpravou v otvorenom modale a uloží nový text. */
async function editCaptionTo(newCaption: string) {
  const modal = await screen.findByTestId('feed-post-edit-modal');
  const field = within(modal).getByTestId('feed-post-edit-input');
  await userEvent.clear(field);
  await userEvent.type(field, newCaption);
  await userEvent.click(within(modal).getByTestId('feed-post-edit-submit'));
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

describe('úprava z mobilnej obrazovky detailu', () => {
  it('updates the feed card once the screen is closed', async () => {
    mockedUpdatePost.mockResolvedValue(makePost({ caption: 'Upravený text' }));
    render(<FeedPostCard post={makePost()} />);

    await userEvent.click(screen.getByTestId('feed-comments-button'));
    const detail = await screen.findByTestId('feed-mobile-detail');

    await userEvent.click(
      within(detail).getByTestId('feed-mobile-detail-menu-trigger'),
    );
    await userEvent.click(within(detail).getByTestId('feed-mobile-detail-edit'));
    await editCaptionTo('Upravený text');

    await waitFor(() =>
      expect(
        within(screen.getByTestId('feed-mobile-detail')).getByTestId(
          'feed-mobile-detail-caption',
        ),
      ).toHaveTextContent('Upravený text'),
    );

    await userEvent.click(screen.getByTestId('feed-mobile-detail-close'));

    // Karta vo feede musí ukazovať NOVÝ obsah hneď, bez obnovenia feedu.
    await waitFor(() =>
      expect(screen.queryByTestId('feed-mobile-detail')).not.toBeInTheDocument(),
    );
    expect(screen.getByTestId('feed-post-caption')).toHaveTextContent(
      'Upravený text',
    );
  });
});

describe('úprava z mobilného prehliadača fotky', () => {
  it('updates the feed card once the viewer is closed', async () => {
    mockedUpdatePost.mockResolvedValue(makePost({ caption: 'Iný text' }));
    render(<FeedPostCard post={makePost()} />);

    await userEvent.click(screen.getByTestId('feed-image-open-11'));
    const viewer = await screen.findByTestId('feed-photo-viewer');

    await userEvent.click(
      within(viewer).getByTestId('feed-photo-viewer-menu-trigger'),
    );
    await userEvent.click(within(viewer).getByTestId('feed-photo-viewer-edit'));
    await editCaptionTo('Iný text');

    await waitFor(() =>
      expect(
        within(screen.getByTestId('feed-photo-viewer')).getByTestId(
          'feed-photo-viewer-caption',
        ),
      ).toHaveTextContent('Iný text'),
    );

    await userEvent.click(screen.getByTestId('feed-photo-viewer-close'));

    await waitFor(() =>
      expect(screen.queryByTestId('feed-photo-viewer')).not.toBeInTheDocument(),
    );
    expect(screen.getByTestId('feed-post-caption')).toHaveTextContent('Iný text');
  });
});
