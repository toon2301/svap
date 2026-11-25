/**
 * Mobilný detail príspevku: skrytá diagnostika viditeľnej plochy (nálezy 375 až 377, kolo 3c).
 *
 * Detail pri ručnom teste chybu nemal, preto má na porovnanie s panelom nad fotkou rovnaký prekryv s číslami. Predvolene
 * neexistuje, zapína sa príznakom (v paneli nad fotkou dlhým podržaním nadpisu) a kreslí sa vpravo s názvom „detail“.
 */

import { act, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import FeedPostMobileDetail from '../FeedPostMobileDetail';
import { readKeyboardDiagnosticsFlag, toggleKeyboardDiagnostics } from '../feedKeyboardDiagnostics';
import { resetOverlayLayers } from '../../shared/overlayLayers';
import type { FeedPost } from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  FEED_COMMENT_MAX_LENGTH: 500,
  getFeedPost: jest.fn(),
  listFeedPostComments: jest.fn(() =>
    Promise.resolve({ results: [], next: null, previous: null, count: 0 }),
  ),
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

const post = {
  id: 7,
  post_type: 'free_post',
  caption: 'Text príspevku',
  author: {
    id: 10,
    display_name: 'Jana Nováková',
    slug: 'jana',
    user_type: 'individual',
    avatar_url: null,
  },
  images: [],
  shared_content: null,
  shared_content_unavailable: false,
  tagged_users: [],
  likes_count: 2,
  comments_count: 0,
  is_liked_by_me: false,
  can_manage: true,
  created_at: '2026-01-01T10:00:00Z',
} as unknown as FeedPost;

beforeEach(() => {
  resetOverlayLayers();
  document.body.innerHTML = '';
});

afterEach(() => {
  if (readKeyboardDiagnosticsFlag()) toggleKeyboardDiagnostics();
  window.localStorage.clear();
});

describe('skrytá diagnostika v mobilnom detaile', () => {
  it('predvolene neexistuje', async () => {
    render(<FeedPostMobileDetail post={post} onClose={jest.fn()} />);
    await screen.findByTestId('feed-mobile-detail');

    expect(screen.queryByTestId('feed-kbd-diagnostics')).not.toBeInTheDocument();
  });

  it('po zapnutí príznaku ukáže prekryv s názvom „detail“ vpravo a meria vrstvu detailu', async () => {
    render(<FeedPostMobileDetail post={post} onClose={jest.fn()} />);
    await screen.findByTestId('feed-mobile-detail');

    act(() => {
      toggleKeyboardDiagnostics();
    });

    const blok = screen.getByTestId('feed-kbd-diagnostics');
    expect(blok).toHaveTextContent('KBD detail');
    expect(blok).toHaveTextContent(/vrstva \d+ až \d+/);
    expect(blok).toHaveClass('right-1');
    expect(blok).not.toHaveClass('left-1');
  });

  it('po vypnutí príznaku prekryv zmizne a detail ostane otvorený', async () => {
    render(<FeedPostMobileDetail post={post} onClose={jest.fn()} />);
    await screen.findByTestId('feed-mobile-detail');
    act(() => {
      toggleKeyboardDiagnostics();
    });
    expect(screen.getByTestId('feed-kbd-diagnostics')).toBeInTheDocument();

    act(() => {
      toggleKeyboardDiagnostics();
    });

    expect(screen.queryByTestId('feed-kbd-diagnostics')).not.toBeInTheDocument();
    expect(screen.getByTestId('feed-mobile-detail')).toBeInTheDocument();
  });
});
