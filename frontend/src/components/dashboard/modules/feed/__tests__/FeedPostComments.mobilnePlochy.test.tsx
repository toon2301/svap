/**
 * Mobilný detail príspevku a panel komentárov nad fotkou majú jedno pole na komentár aj odpoveď (R75, kolo 3b).
 *
 * Obe plochy zapínajú `mobileReplyField`: ťuk na „Odpovedať“ neotvorí pole pod komentárom, ale prepne pole dole na odpoveď
 * (riadok „Odpovedáš: Meno“, krížik). Testy stoja na tom, čo plochy vykreslia, a zachytia, ak by sa vlastnosť pri niektorej
 * z nich stratila.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPhotoCommentsSheet from '../FeedPhotoCommentsSheet';
import FeedPostMobileDetail from '../FeedPostMobileDetail';
import { resetOverlayLayers } from '../../shared/overlayLayers';
import { listFeedPostComments, type FeedPost } from '@/lib/feedApi';

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

const mockedList = listFeedPostComments as jest.MockedFunction<
  typeof listFeedPostComments
>;

const autor = {
  id: 10,
  display_name: 'Jana Nováková',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};

function prispevok(): FeedPost {
  return {
    id: 7,
    post_type: 'free_post',
    caption: 'Text príspevku',
    author: autor,
    images: [],
    shared_content: null,
    shared_content_unavailable: false,
    tagged_users: [],
    likes_count: 2,
    comments_count: 1,
    is_liked_by_me: false,
    can_manage: false,
    created_at: '2026-01-01T10:00:00Z',
  } as unknown as FeedPost;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedList.mockReset();
  resetOverlayLayers();
  document.body.innerHTML = '';
  mockedList.mockResolvedValue({
    results: [
      {
        id: 100,
        text: 'Komentár 1',
        author: autor,
        can_delete: false,
        can_edit: false,
        likes_count: 0,
        is_liked_by_me: false,
        replies: [],
        replies_count: 0,
        created_at: '2026-01-01T11:00:00Z',
      },
    ],
    next: null,
    previous: null,
    count: 1,
  } as never);
});

async function overPrepnutiaNaOdpoved() {
  await screen.findByText('Komentár 1');
  await userEvent.click(screen.getByTestId('feed-comment-reply-100'));

  // Pole pod komentárom (počítač) sa neotvorí, prepne sa pole dole.
  expect(screen.queryByTestId('feed-reply-composer')).toBeNull();
  expect(screen.getByTestId('feed-reply-target')).toHaveTextContent(
    'Odpovedáš: Jana Nováková',
  );
  expect(screen.getByTestId('feed-reply-cancel')).toBeInTheDocument();
  const pole = screen.getByRole('textbox', { name: 'Napíš odpoveď...' });
  expect(pole).toHaveFocus();
  // Je to to isté jednoriadkové pole mimo posuvného zoznamu.
  expect(pole).toHaveAttribute('rows', '1');
  expect(screen.getByTestId('feed-comments-scroll').contains(pole)).toBe(false);
}

describe('jedno pole na komentár aj odpoveď na mobilných plochách', () => {
  it('panel komentárov nad fotkou prepne pole dole na odpoveď', async () => {
    render(
      <FeedPhotoCommentsSheet
        postId={7}
        open
        onClose={jest.fn()}
        onCountChange={jest.fn()}
        onTotalChange={jest.fn()}
      />,
    );

    await overPrepnutiaNaOdpoved();
  });

  it('mobilný detail príspevku prepne pole dole na odpoveď', async () => {
    render(<FeedPostMobileDetail post={prispevok()} onClose={jest.fn()} />);

    await overPrepnutiaNaOdpoved();
  });
});
