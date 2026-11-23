/**
 * Komentáre na mobile ostávajú pri percentuálnej výške (nález 363, K57 krok 4).
 *
 * Krok 4 zaviedol vlastnosť `flexFill` pre jednostĺpcové okno detailu na počítači. Mobilný detail a panel komentárov
 * nad fotkou majú pevnú výšku, preto `flexFill` nedostávajú a ostávajú pri `fillHeight` s `h-full`. Testy stoja na
 * tom, čo obrazovky vykreslia (triedy zoznamu komentárov), a zachytia, ak by sa `flexFill` pridal aj tam.
 *
 * jsdom nelayoutuje, takže sa kontrolujú triedy koreňa komentárov a posuvného rámika.
 */

import { render, screen } from '@testing-library/react';
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
    comments_count: 2,
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

function jePercentualna() {
  const zoznam = screen.getByTestId('feed-comments-scroll');
  const koren = screen.getByTestId('feed-post-comments');
  expect(zoznam).toHaveClass('h-full');
  expect(zoznam).not.toHaveClass('flex-1');
  expect(koren).toHaveClass('h-full');
  expect(koren).not.toHaveClass('flex-1');
}

describe('komentáre mimo okna na počítači', () => {
  it('panel komentárov nad fotkou drží percentuálnu výšku', async () => {
    render(
      <FeedPhotoCommentsSheet
        postId={7}
        open
        onClose={jest.fn()}
        onCountChange={jest.fn()}
        onTotalChange={jest.fn()}
      />,
    );
    await screen.findByText('Komentár 1');

    jePercentualna();
  });

  it('mobilný detail príspevku drží percentuálnu výšku komentárov', async () => {
    render(<FeedPostMobileDetail post={prispevok()} onClose={jest.fn()} />);
    await screen.findByText('Komentár 1');

    jePercentualna();
  });
});
