/**
 * Ikony akcií a fotky karty: komentáre, počet lajkov, otváranie prehliadača fotky a okna detailu.
 *
 * Charakterizačné testy pred delením `FeedPostCard.tsx` (nález 333, dávka K48; riadok akcií sa presúva v kroku b).
 * Existujúce testy nestrážia, že druhý klik na ikonu komentárov (bez okna na počítači) komentáre zbalí, že ťuk na DRUHÚ
 * fotku na mobile otvorí prehliadač na druhej fotke, že v okne detailu fotka ani ikona komentárov neotvárajú okno
 * detailu a ťuk na text ani ikona komentárov neotvárajú mobilnú obrazovku detailu, a že počet lajkov s hodnotou 0 nie je
 * klikateľný (zoznam lajkujúcich sa nemá čo otvárať). Farba aktívnej ikony je len trieda CSS, tú stráži dočasný odtlačok
 * HTML. Testy idú cez verejné rozhranie karty (vlastnosti, DOM, `data-testid`, kontext okna), takže musia prejsť bez
 * úpravy aj po každom kroku delenia.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostCard from '../FeedPostCard';
import { FeedPostOverlayProvider } from '../../../contexts/FeedPostOverlayContext';
import { resetOverlayLayers } from '../../shared/overlayLayers';
import { type FeedPost } from '@/lib/feedApi';

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
  listFeedPostLikers: jest.fn(() =>
    Promise.resolve({ results: [], next: null, previous: null, count: 0 }),
  ),
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
    likes_count: 2,
    comments_count: 0,
    is_liked_by_me: false,
    can_manage: false,
    created_at: '2026-01-01T10:00:00Z',
    ...overrides,
  } as unknown as FeedPost;
}

beforeEach(() => {
  jest.clearAllMocks();
  resetOverlayLayers();
  mockIsMobile = false;
  document.body.innerHTML = '';
});

describe('ikona komentárov a počet lajkov', () => {
  it('druhý klik na ikonu komentárov bez okna na počítači komentáre zbalí', async () => {
    render(<FeedPostCard post={makePost()} />);
    expect(screen.queryByTestId('feed-post-comments')).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('feed-comments-button'));
    expect(await screen.findByTestId('feed-post-comments')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('feed-comments-button'));
    expect(screen.queryByTestId('feed-post-comments')).not.toBeInTheDocument();
  });

  it('počet pri srdiečku s hodnotou 0 nie je klikateľný a zoznam lajkujúcich sa neotvorí', async () => {
    render(<FeedPostCard post={makePost({ likes_count: 0 })} />);

    expect(screen.queryByTestId('feed-like-count')).not.toBeInTheDocument();
    expect(screen.getByTestId('feed-like-button')).toHaveAttribute(
      'aria-label',
      'Páči sa mi: 0',
    );
    await userEvent.click(screen.getByTestId('feed-like-button'));
    expect(screen.queryByTestId('feed-likers-dialog')).not.toBeInTheDocument();
  });

  it('počet pri srdiečku s hodnotou väčšou ako 0 je klikateľný a otvorí zoznam lajkujúcich', async () => {
    render(<FeedPostCard post={makePost({ likes_count: 2 })} />);
    expect(screen.queryByTestId('feed-likers-dialog')).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('feed-like-count'));

    expect(await screen.findByTestId('feed-likers-dialog')).toBeInTheDocument();
  });
});

describe('ťuk na fotku v mobile', () => {
  it.each([
    [11, '1/2', false],
    [12, '2/2', true],
  ])(
    'ťuk na fotku %i otvorí mobilný prehliadač na pozícii %s',
    async (photoId, counter, needsNext) => {
      mockIsMobile = true;
      render(<FeedPostCard post={makePost({ images: [photo(11), photo(12)] })} />);
      if (needsNext) await userEvent.click(screen.getByTestId('feed-image-next'));

      await userEvent.click(await screen.findByTestId(`feed-image-open-${photoId}`));

      expect(await screen.findByTestId('feed-photo-viewer')).toBeInTheDocument();
      expect(screen.getByTestId('feed-photo-viewer-counter')).toHaveTextContent(counter);
    },
  );
});

describe('okno detailu na počítači a mobilná obrazovka detailu', () => {
  it('vo feede otvára ikona komentárov aj fotka okno detailu príspevku', async () => {
    const onTargetChange = jest.fn();
    render(
      <FeedPostOverlayProvider onTargetChange={onTargetChange}>
        <FeedPostCard post={makePost({ images: [photo(11)] })} />
      </FeedPostOverlayProvider>,
    );

    await userEvent.click(screen.getByTestId('feed-comments-button'));
    expect(onTargetChange).toHaveBeenCalledTimes(1);
    expect(onTargetChange).toHaveBeenLastCalledWith({ postId: 7 });

    await userEvent.click(screen.getByTestId('feed-image-open-11'));
    expect(onTargetChange).toHaveBeenCalledTimes(2);
    expect(onTargetChange).toHaveBeenLastCalledWith({ postId: 7 });
  });

  it('v samotnom okne detailu ikona komentárov ani fotka okno neotvárajú, fotka ide do prehliadača', async () => {
    const onTargetChange = jest.fn();
    render(
      <FeedPostOverlayProvider onTargetChange={onTargetChange}>
        <FeedPostCard post={makePost({ images: [photo(11)] })} variant="detail" />
      </FeedPostOverlayProvider>,
    );

    await userEvent.click(screen.getByTestId('feed-comments-button'));
    await userEvent.click(screen.getByTestId('feed-image-open-11'));

    expect(onTargetChange).not.toHaveBeenCalled();
    expect(await screen.findByTestId('feed-image-lightbox')).toBeInTheDocument();
  });

  it('na mobile ťuk na text a ikona komentárov vo feede otvoria obrazovku detailu', async () => {
    mockIsMobile = true;
    const { unmount } = render(<FeedPostCard post={makePost()} />);

    await userEvent.click(screen.getByText('Ahoj'));
    expect(await screen.findByTestId('feed-mobile-detail')).toBeInTheDocument();
    unmount();

    render(<FeedPostCard post={makePost()} />);
    await userEvent.click(screen.getByTestId('feed-comments-button'));
    expect(await screen.findByTestId('feed-mobile-detail')).toBeInTheDocument();
  });

  it('na mobile v samotnom okne detailu ťuk na text ani ikona komentárov obrazovku detailu neotvoria', async () => {
    mockIsMobile = true;
    render(<FeedPostCard post={makePost()} variant="detail" />);

    await userEvent.click(screen.getByText('Ahoj'));
    await userEvent.click(screen.getByTestId('feed-comments-button'));

    expect(screen.queryByTestId('feed-mobile-detail')).not.toBeInTheDocument();
  });
});
