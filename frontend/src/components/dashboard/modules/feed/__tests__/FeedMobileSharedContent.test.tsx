/**
 * Zdieľaný obsah na MOBILE – smerovanie a vnorený náhľad.
 *
 * DVE pravidlá, ktoré tu strážime:
 *  - Vnorená KARTA ponuky/portfólia je samostatný ovládací prvok so sľubom
 *    konkrétneho cieľa – vedie naň PRIAMO, bez medzikroku cez detail.
 *  - Ostatné časti zdieľaného príspevku (text, ikona komentárov, náhľad mini
 *    príspevku) vedú do mobilnej obrazovky detailu; imerzný prehliadač fotky
 *    sa z nich neotvára, ten patrí skutočne nahranej fotke.
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostCard from '../FeedPostCard';
import { resetOverlayLayers } from '../../shared/overlayLayers';
import { shouldAutoScrollToComments } from '../feedMobileDetailAutoScroll';
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

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
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

const author = {
  id: 10,
  display_name: 'Jana Nováková',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};

const owner = {
  id: 21,
  display_name: 'Peter Kováč',
  slug: 'peter',
  user_type: 'individual',
  avatar_url: null,
};

function sharedContent(overrides: Record<string, unknown> = {}) {
  return {
    type: 'offer',
    id: 55,
    title: 'Kurz gitary',
    category: 'Hudba',
    caption: '',
    owner,
    owner_display_name: 'Peter Kováč',
    is_seeking: null,
    price_negotiable: null,
    price_from: null,
    price_currency: '',
    thumbnail_url: null,
    ...overrides,
  };
}

function makeSharedPost(overrides: Partial<FeedPost> = {}): FeedPost {
  return {
    id: 7,
    post_type: 'shared_offer',
    caption: 'Toto stojí za pozretie.',
    author,
    // Backend posiela `images` len pri free_post – zdieľaný príspevok ich
    // nikdy nemá, takže sa k prehliadaču fotky nemá ako dostať.
    images: [],
    shared_content: sharedContent(),
    shared_content_unavailable: false,
    tagged_users: [],
    likes_count: 1,
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

describe('smerovanie zo zdieľanej karty', () => {
  const variants: Array<[string, Partial<FeedPost>]> = [
    ['shared_offer', { post_type: 'shared_offer' }],
    [
      'shared_portfolio_item',
      {
        post_type: 'shared_portfolio_item',
        shared_content: sharedContent({ type: 'portfolio_item', id: 88 }),
      },
    ],
    [
      'shared_feed_post',
      {
        post_type: 'shared_feed_post',
        shared_content: sharedContent({ type: 'feed_post', id: 99, title: '' }),
      },
    ],
  ];

  it.each(variants)(
    'opens the mobile detail from the text on %s',
    async (_name, overrides) => {
      render(<FeedPostCard post={makeSharedPost(overrides)} />);

      await userEvent.click(screen.getByTestId('feed-post-caption'));

      expect(await screen.findByTestId('feed-mobile-detail')).toBeInTheDocument();
      expect(screen.queryByTestId('feed-photo-viewer')).not.toBeInTheDocument();
    },
  );

  it('goes straight to the offer from the nested card, without a detour', async () => {
    const seen: Array<Record<string, unknown>> = [];
    const handler = (event: Event) => seen.push((event as CustomEvent).detail);
    window.addEventListener('goToUserProfile', handler);
    try {
      render(<FeedPostCard post={makeSharedPost()} />);

      await userEvent.click(screen.getByTestId('feed-shared-compact-preview'));

      // Vnorená karta ponuky sľubuje konkrétny cieľ – vedie naň PRIAMO,
      // bez medzikroku cez detail zdieľajúceho príspevku.
      expect(seen).toEqual([{ identifier: 'peter', offerId: 55 }]);
      expect(screen.queryByTestId('feed-mobile-detail')).not.toBeInTheDocument();
    } finally {
      window.removeEventListener('goToUserProfile', handler);
    }
  });

  it('goes straight to the portfolio item from the nested card', async () => {
    render(
      <FeedPostCard
        post={makeSharedPost({
          post_type: 'shared_portfolio_item',
          shared_content: sharedContent({ type: 'portfolio_item', id: 88 }),
        })}
      />,
    );

    await userEvent.click(screen.getByTestId('feed-shared-compact-preview'));

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush.mock.calls[0][0]).toContain('88');
    expect(screen.queryByTestId('feed-mobile-detail')).not.toBeInTheDocument();
  });

  it('opens the detail from a reposted post preview, which is not an offer card', async () => {
    render(
      <FeedPostCard
        post={makeSharedPost({
          post_type: 'shared_feed_post',
          shared_content: sharedContent({ type: 'feed_post', id: 99, title: '' }),
        })}
      />,
    );

    await userEvent.click(screen.getByTestId('feed-shared-post-preview-open'));

    // Mini príspevok nie je „karta ponuky" so sľubom konkrétneho cieľa, ale
    // ukážka obsahu – na mobile teda ostáva cesta do detailu zdieľajúceho.
    expect(await screen.findByTestId('feed-mobile-detail')).toBeInTheDocument();
  });

  it.each(variants)(
    'opens the mobile detail from the comments button on %s',
    async (_name, overrides) => {
      render(<FeedPostCard post={makeSharedPost(overrides)} />);

      await userEvent.click(screen.getByTestId('feed-comments-button'));

      expect(await screen.findByTestId('feed-mobile-detail')).toBeInTheDocument();
    },
  );

  it('never renders a photo carousel for a shared post', async () => {
    render(<FeedPostCard post={makeSharedPost()} />);

    // Karta zdieľaného príspevku nemá fotku, takže neexistuje ani cesta,
    // ktorou by sa dal imerzný prehliadač otvoriť.
    expect(screen.queryByTestId('feed-post-image')).not.toBeInTheDocument();
  });
});

describe('vnorený náhľad v mobilnej obrazovke', () => {
  async function openDetail(post = makeSharedPost()) {
    render(<FeedPostCard post={post} />);
    await userEvent.click(screen.getByTestId('feed-comments-button'));
    return await screen.findByTestId('feed-mobile-detail');
  }

  it('shows the shared preview where a photo would be, with the text above it', async () => {
    const detail = await openDetail();

    const shared = within(detail).getByTestId('feed-mobile-detail-shared');
    expect(
      within(shared).getByTestId('feed-shared-compact-preview'),
    ).toBeInTheDocument();
    // Žiadny obrázkový karusel – náhľad zdieľaného obsahu stojí na jeho mieste.
    expect(within(detail).queryByTestId('feed-mobile-detail-photo')).toBeNull();

    // Rovnaké pravidlo ako „text nad fotkou": najprv čítam, čo autor napísal.
    const caption = within(detail).getByTestId('feed-mobile-detail-caption');
    expect(caption.compareDocumentPosition(shared)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('keeps the unavailable state of a shared source', async () => {
    const detail = await openDetail(
      makeSharedPost({ shared_content_unavailable: true }),
    );

    expect(
      within(detail).getByTestId('feed-shared-unavailable'),
    ).toBeInTheDocument();
    expect(
      within(detail).getByText('Táto ponuka už nie je dostupná'),
    ).toBeInTheDocument();
  });

  it('navigates to the source and closes the screen', async () => {
    const detail = await openDetail(
      makeSharedPost({
        post_type: 'shared_portfolio_item',
        shared_content: sharedContent({ type: 'portfolio_item', id: 88 }),
      }),
    );

    await userEvent.click(
      within(detail).getByTestId('feed-shared-compact-preview'),
    );

    // Naviguje na cieľ…
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush.mock.calls[0][0]).toContain('88');
    // …a obrazovka nesmie ostať visieť nad ním.
    await waitFor(() =>
      expect(screen.queryByTestId('feed-mobile-detail')).not.toBeInTheDocument(),
    );
  });

  it('sends an offer share to the profile event, not to the router', async () => {
    const seen: Array<Record<string, unknown>> = [];
    const handler = (event: Event) => {
      seen.push((event as CustomEvent).detail);
    };
    window.addEventListener('goToUserProfile', handler);
    try {
      const detail = await openDetail();

      await userEvent.click(
        within(detail).getByTestId('feed-shared-compact-preview'),
      );

      // Ponuky appka otvára globálnym eventom, nie cestou routera – typ sa
      // MUSÍ rozlišovať, číslovania sú nezávislé.
      expect(seen).toEqual([{ identifier: 'peter', offerId: 55 }]);
      expect(mockPush).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener('goToUserProfile', handler);
    }
  });
});

describe('automatický scroll pri zdieľanom obsahu', () => {
  it('treats a shared preview like a photo in the rule', () => {
    // Náhľad zaberá rovnaké miesto ako fotka, takže platí to isté pravidlo…
    expect(
      shouldAutoScrollToComments({
        hasPhoto: false,
        hasSharedPreview: true,
        commentsCount: 3,
      }),
    ).toBe(true);
    // …vrátane spoločného prahu troch komentárov.
    expect(
      shouldAutoScrollToComments({
        hasPhoto: false,
        hasSharedPreview: true,
        commentsCount: 2,
      }),
    ).toBe(false);
    expect(
      shouldAutoScrollToComments({
        hasPhoto: false,
        hasSharedPreview: true,
        commentsCount: 0,
      }),
    ).toBe(false);
    // Bez oboch sa ďalej nescrolluje.
    expect(
      shouldAutoScrollToComments({
        hasPhoto: false,
        hasSharedPreview: false,
        commentsCount: 9,
      }),
    ).toBe(false);
  });

  it.each([
    [3, 'true'],
    [2, 'false'],
    [0, 'false'],
  ])(
    'decides %i comments as %s on a shared post',
    async (comments, expected) => {
      render(
        <FeedPostCard post={makeSharedPost({ comments_count: comments })} />,
      );
      await userEvent.click(screen.getByTestId('feed-comments-button'));
      await screen.findByTestId('feed-mobile-detail');

      const anchor = await screen.findByTestId(
        'feed-mobile-detail-comments-anchor',
      );
      await waitFor(() => expect(anchor).toHaveAttribute('data-auto-scrolled'));
      expect(anchor.getAttribute('data-auto-scrolled')).toBe(expected);
    },
  );
});
