/**
 * Hlavička karty: nadpis zdieľaného obsahu a preklik na profil autora.
 *
 * Charakterizačné testy pred delením `FeedPostCard.tsx` (nález 333, dávka K48; hlavička sa presúva v kroku e).
 * Existujúce testy nestrážia, že hlavička zdieľaného portfólia hovorí o portfóliu a zdieľanej ponuky o ponuke, že klik
 * na avatar aj meno autora otvorí jeho profil (signál `goToUserProfile` s adresou profilu), že v okne detailu sa okno
 * pred odchodom zatvorí bez zásahu do histórie (inak by ostalo visieť nad cieľovou stránkou) a že avatar s menom sú pri
 * autorovi bez profilu vypnuté. Testy idú cez verejné rozhranie karty (vlastnosti, DOM, `data-testid`, kontext okna,
 * udalosť na `window`), takže musia prejsť bez úpravy aj po presune hlavičky do vlastného súboru.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostCard from '../FeedPostCard';
import { FeedPostOverlayProvider } from '../../../contexts/FeedPostOverlayContext';
import { type FeedPost } from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  FEED_COMMENT_MAX_LENGTH: 500,
  updateFeedPost: jest.fn(),
  deleteFeedPostImage: jest.fn(),
  deleteFeedPost: jest.fn(),
  getFeedPost: jest.fn(),
  likeFeedPost: jest.fn(),
  unlikeFeedPost: jest.fn(),
  listFeedPostComments: jest.fn(),
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
  useIsMobile: () => false,
  useIsMobileState: () => ({ isMobile: false, isResolved: true }),
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

const author = {
  id: 10,
  display_name: 'Jana',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};
const owner = {
  id: 21,
  display_name: 'Peter',
  slug: 'peter',
  user_type: 'individual',
  avatar_url: null,
};

function makePost(overrides: Record<string, unknown> = {}): FeedPost {
  return {
    id: 7,
    post_type: 'free_post',
    caption: 'Ahoj',
    author,
    images: [],
    shared_content: null,
    shared_content_unavailable: false,
    tagged_users: [],
    likes_count: 1,
    comments_count: 0,
    is_liked_by_me: false,
    can_manage: false,
    created_at: '2026-01-01T10:00:00Z',
    ...overrides,
  } as unknown as FeedPost;
}

const sharedOffer = {
  type: 'offer',
  title: 'Doučovanie matematiky',
  category: 'vzdelavanie',
  caption: '',
  id: 5,
  owner,
  owner_display_name: 'Peter',
  thumbnail_url: 'http://api.test/offer-t.webp',
  is_seeking: false,
  price_negotiable: false,
  price_from: '15',
  price_currency: 'EUR',
};
const sharedPortfolio = {
  ...sharedOffer,
  type: 'portfolio_item',
  title: 'Moje portfólio',
  thumbnail_url: null,
  id: 6,
};
const sharedPost = {
  ...sharedOffer,
  type: 'feed_post',
  title: '',
  category: '',
  caption: 'Pôvodný text zdieľaného príspevku.',
  id: 77,
  thumbnail_url: null,
  is_seeking: null,
  price_negotiable: null,
  price_from: null,
};

const profileEvent = jest.fn();
const listenProfile = (event: Event) =>
  profileEvent((event as CustomEvent<{ identifier: string }>).detail.identifier);

beforeEach(() => {
  jest.clearAllMocks();
  document.body.innerHTML = '';
  window.addEventListener('goToUserProfile', listenProfile);
});

afterEach(() => {
  window.removeEventListener('goToUserProfile', listenProfile);
});

describe('hlavička karty: nadpis zdieľaného obsahu', () => {
  it('zdieľané portfólio hovorí o portfóliu, zdieľaná ponuka o ponuke a repost o príspevku', () => {
    const { unmount } = render(
      <FeedPostCard
        post={makePost({
          post_type: 'shared_portfolio_item',
          caption: '',
          shared_content: sharedPortfolio,
        })}
      />,
    );
    expect(screen.getByText('Jana zdieľa portfólio ďalej')).toBeInTheDocument();
    expect(screen.queryByText('Jana ponúka výmenu ďalej')).not.toBeInTheDocument();
    unmount();

    const offer = render(
      <FeedPostCard
        post={makePost({ post_type: 'shared_offer', caption: '', shared_content: sharedOffer })}
      />,
    );
    expect(screen.getByText('Jana ponúka výmenu ďalej')).toBeInTheDocument();
    expect(screen.queryByText('Jana zdieľa portfólio ďalej')).not.toBeInTheDocument();
    offer.unmount();

    render(
      <FeedPostCard
        post={makePost({
          post_type: 'shared_feed_post',
          caption: 'Môj komentár',
          shared_content: sharedPost,
        })}
      />,
    );
    expect(screen.getByText('Jana zdieľa príspevok ďalej')).toBeInTheDocument();
  });
});

describe('hlavička karty: preklik na profil autora', () => {
  it('klik na avatar aj na meno otvorí profil autora a nezasahuje do okna detailu', async () => {
    const onTargetChange = jest.fn();
    render(
      <FeedPostOverlayProvider onTargetChange={onTargetChange}>
        <FeedPostCard post={makePost()} />
      </FeedPostOverlayProvider>,
    );

    await userEvent.click(screen.getByTestId('feed-post-author-avatar'));
    expect(profileEvent).toHaveBeenCalledTimes(1);
    expect(profileEvent).toHaveBeenLastCalledWith('jana');

    await userEvent.click(screen.getByTestId('feed-post-author-name'));
    expect(profileEvent).toHaveBeenCalledTimes(2);
    expect(profileEvent).toHaveBeenLastCalledWith('jana');
    expect(onTargetChange).not.toHaveBeenCalled();
  });

  it.each([
    ['avatar', 'feed-post-author-avatar'],
    ['meno', 'feed-post-author-name'],
  ])(
    'v okne detailu klik na %s najprv zatvorí okno bez zásahu do histórie a až potom otvorí profil',
    async (_label, testId) => {
      const onTargetChange = jest.fn();
      render(
        <FeedPostOverlayProvider onTargetChange={onTargetChange}>
          <FeedPostCard post={makePost()} variant="detail" />
        </FeedPostOverlayProvider>,
      );

      await userEvent.click(screen.getByTestId(testId));

      expect(onTargetChange).toHaveBeenCalledTimes(1);
      expect(onTargetChange).toHaveBeenCalledWith(null, { keepHistory: true });
      expect(profileEvent).toHaveBeenCalledWith('jana');
      expect(onTargetChange.mock.invocationCallOrder[0]).toBeLessThan(
        profileEvent.mock.invocationCallOrder[0],
      );
    },
  );

  it('avatar a meno sú pri autorovi bez profilu vypnuté a klik nič neotvorí', async () => {
    render(
      <FeedPostCard
        post={makePost({ author: { ...author, id: 0, slug: '', display_name: 'Bývalý používateľ' } })}
      />,
    );

    const avatar = screen.getByTestId('feed-post-author-avatar');
    const name = screen.getByTestId('feed-post-author-name');
    expect(avatar).toBeDisabled();
    expect(name).toBeDisabled();

    await userEvent.click(avatar);
    await userEvent.click(name);
    expect(profileEvent).not.toHaveBeenCalled();
  });

  it('avatar a meno autora s profilom sú aktívne', () => {
    render(<FeedPostCard post={makePost()} />);

    expect(screen.getByTestId('feed-post-author-avatar')).toBeEnabled();
    expect(screen.getByTestId('feed-post-author-name')).toBeEnabled();
  });
});
