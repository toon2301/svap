/**
 * Okno detailu: rozpracovaný komentár pri prepnutí rozloženia (PR #323, nález CodeRabbitu; K58).
 *
 * Rozloženie sa prepína šírkou obrazovky: ak sa okno prehliadača zúži pod 1 024 px počas otvoreného okna, okno prejde
 * z dvoch stĺpcov na jeden a komentáre sa odmountujú. Text, ktorý autor práve písal, tým nesmie zmiznúť (text drží
 * okno, viď `useFeedCommentDraft`). Zamietnutie jedinej (rozpracovanej) fotky počas otvoreného okna rozloženie na
 * počítači od K58 (R73) nemení: príspevok len s textom má tiež dva stĺpce, text ostane v poli aj tak.
 *
 * Vlastný súbor kvôli falošným časovačom: dosledovanie fotiek beží na intervale, rovnako ako v
 * `FeedPostDetailOverlay.livePhotos` (a rovnako ako tam sa nemiešajú falošné časovače so skutočnými v jednom module).
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FeedPostDetailOverlay from '../FeedPostDetailOverlay';
import { resetOverlayLayers } from '../../shared/overlayLayers';
import { getFeedPost, type FeedPost } from '@/lib/feedApi';

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
const mockedListComments = jest.requireMock('@/lib/feedApi')
  .listFeedPostComments as jest.Mock;

/** Interval `usePendingFeedImages` – jedno kolo dosledovania fotiek. */
const IMAGE_POLL_MS = 2500;

const NAZOV_POLA = 'Napíš komentár...';

const autor = {
  id: 10,
  display_name: 'Jana',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};

/** Príspevok AUTORA s jedinou rozpracovanou fotkou (jediný stav, v ktorom sa dosledovanie fotiek spúšťa). */
function prispevokSRozpracovanouFotkou(): FeedPost {
  return {
    id: 7,
    post_type: 'free_post',
    caption: 'Text príspevku',
    author: autor,
    images: [{ id: 11, status: 'pending', thumbnail_url: '', large_url: '' }],
    shared_content: null,
    shared_content_unavailable: false,
    tagged_users: [],
    likes_count: 2,
    comments_count: 0,
    is_liked_by_me: false,
    can_manage: true,
    created_at: '2026-01-01T10:00:00Z',
  } as unknown as FeedPost;
}

/** Ten istý príspevok po zamietnutí fotky moderáciou. */
function prispevokSoZamietnutouFotkou(): FeedPost {
  return {
    ...prispevokSRozpracovanouFotkou(),
    images: [
      {
        id: 11,
        status: 'rejected',
        thumbnail_url: 'http://api.test/11-t.webp',
        large_url: 'http://api.test/11-l.webp',
      },
    ],
  } as unknown as FeedPost;
}

beforeEach(() => {
  mockIsMobile = false;
  jest.useFakeTimers();
  jest.clearAllMocks();
  resetOverlayLayers();
  mockedListComments.mockResolvedValue({
    results: [],
    next: null,
    previous: null,
    count: 0,
  });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('okno detailu: rozpracovaný komentár a zamietnutie fotky počas písania', () => {
  it('text ostane v poli, keď okno prejde z dvoch stĺpcov na jeden', async () => {
    mockedGetPost.mockReset();
    mockedGetPost.mockResolvedValue(prispevokSRozpracovanouFotkou());
    const { rerender } = render(<FeedPostDetailOverlay postId={7} onClose={jest.fn()} />);
    await act(async () => {});
    await waitFor(() => expect(screen.getByTestId('feed-post-card')).toBeInTheDocument());
    expect(screen.getByTestId('feed-post-overlay-split')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(NAZOV_POLA), {
      target: { value: 'Rozpísaný komentár' },
    });

    // Okno prehliadača sa zúži pod 1 024 px: rozloženie sa prepne samo a komentáre sa vykreslia znova.
    mockIsMobile = true;
    rerender(<FeedPostDetailOverlay postId={7} onClose={jest.fn()} />);

    await waitFor(() =>
      expect(screen.queryByTestId('feed-post-overlay-split')).not.toBeInTheDocument(),
    );
    expect(screen.getByTestId('feed-post-overlay-fixed')).toBeInTheDocument();
    expect(screen.getByLabelText(NAZOV_POLA)).toHaveValue('Rozpísaný komentár');
    await act(async () => {});
  });

  it('text ostane v poli aj po zamietnutí poslednej fotky, keď sa rozloženie nemení', async () => {
    // Prvá odpoveď patrí načítaniu okna, ďalšia kolu dosledovania fotiek.
    mockedGetPost.mockReset();
    mockedGetPost.mockResolvedValue(prispevokSoZamietnutouFotkou());
    mockedGetPost.mockResolvedValueOnce(prispevokSRozpracovanouFotkou());
    render(<FeedPostDetailOverlay postId={7} onClose={jest.fn()} />);
    await act(async () => {});
    await waitFor(() => expect(screen.getByTestId('feed-post-card')).toBeInTheDocument());
    expect(screen.getByTestId('feed-post-overlay-split')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(NAZOV_POLA), {
      target: { value: 'Rozpísaný komentár' },
    });

    await act(async () => {
      jest.advanceTimersByTime(IMAGE_POLL_MS);
    });

    // Moderácia fotku zamietla: na počítači ostane dvojstĺpcové okno (len text), pole s komentárom sa nezmení.
    await waitFor(() =>
      expect(screen.getByTestId('feed-image-rejected-note')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('feed-post-overlay-split')).toBeInTheDocument();
    expect(screen.getByLabelText(NAZOV_POLA)).toHaveValue('Rozpísaný komentár');
    await act(async () => {});
  });
});
