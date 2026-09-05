/**
 * Repost príspevku S FOTKOU – rozloženie, zobrazenie fotky a klik na ňu.
 *
 * Repostovaný foto príspevok má vlastné `images` prázdne (backend ich posiela
 * len pri `free_post`), fotku nesie len snapshot v `shared_content`. Appka sa
 * preto musela naučiť pozerať aj tam – inak repost vyzeral ako textový.
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostCard from '../FeedPostCard';
import FeedPostDetailOverlay from '../FeedPostDetailOverlay';
import { resetOverlayLayers } from '../../shared/overlayLayers';
import { sharedFeedPostPhoto } from '../feedImageSources';
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

function repost(overrides: Record<string, unknown> = {}): FeedPost {
  const { shared_content: sharedOverride, ...rest } = overrides;
  return {
    id: 7,
    post_type: 'shared_feed_post',
    caption: 'Toto stojí za pozretie.',
    author,
    images: [],
    shared_content: {
      type: 'feed_post',
      title: '',
      category: '',
      caption: 'Pôvodný text',
      id: 9,
      owner,
      owner_display_name: 'Peter',
      thumbnail_url: 'http://api.test/shared-9.webp',
      is_seeking: null,
      price_negotiable: null,
      price_from: null,
      price_currency: '',
      ...(sharedOverride as Record<string, unknown> | undefined),
    },
    shared_content_unavailable: false,
    tagged_users: [],
    likes_count: 0,
    comments_count: 0,
    is_liked_by_me: false,
    can_manage: false,
    created_at: '2026-01-01T10:00:00Z',
    ...rest,
  } as unknown as FeedPost;
}

/** Pôvodný príspevok, ktorý sa dotiahne pri kliku na fotku v reposte. */
function originalPost(): FeedPost {
  return {
    id: 9,
    post_type: 'free_post',
    caption: 'Pôvodný text',
    author: owner,
    images: [
      {
        id: 41,
        status: 'approved',
        thumbnail_url: 'http://api.test/41-t.webp',
        large_url: 'http://api.test/41-l.webp',
      },
    ],
    shared_content: null,
    shared_content_unavailable: false,
    tagged_users: [],
    likes_count: 4,
    comments_count: 1,
    is_liked_by_me: false,
    can_manage: false,
    created_at: '2026-01-01T09:00:00Z',
  } as unknown as FeedPost;
}

beforeEach(() => {
  jest.clearAllMocks();
  resetOverlayLayers();
  mockIsMobile = false;
  mockedListComments.mockResolvedValue({
    results: [],
    next: null,
    previous: null,
    count: 0,
  });
});

describe('rozpoznanie fotky v reposte', () => {
  it('finds the photo of a reposted photo post', () => {
    expect(sharedFeedPostPhoto(repost())).toEqual({
      postId: 9,
      thumbnailUrl: 'http://api.test/shared-9.webp',
    });
  });

  it('finds nothing for a text repost, an offer or an unavailable source', () => {
    expect(
      sharedFeedPostPhoto(repost({ shared_content: { thumbnail_url: null } })),
    ).toBeNull();
    // Ponuka má malý náhľad v kompaktnej karte, nie fotku na šírku.
    expect(
      sharedFeedPostPhoto(repost({ shared_content: { type: 'offer' } })),
    ).toBeNull();
    expect(
      sharedFeedPostPhoto(repost({ shared_content_unavailable: true })),
    ).toBeNull();
    expect(sharedFeedPostPhoto(null)).toBeNull();
  });
});

describe('desktopové okno detailu', () => {
  async function openOverlay(post: FeedPost) {
    mockedGetPost.mockResolvedValue(post);
    render(<FeedPostDetailOverlay postId={post.id} onClose={jest.fn()} />);
    // Kým sa príspevok načítava, okno ukazuje len kostru – rozloženie sa
    // vyberá až podľa načítaných dát.
    await screen.findByTestId('feed-post-card');
  }

  it('uses the two-column layout for a reposted photo post', async () => {
    await openOverlay(repost());

    // Vlastné `images` sú prázdne – rozhodnutie musí vidieť fotku v náhľade.
    expect(screen.getByTestId('feed-post-overlay-split')).toBeInTheDocument();
  });

  it('keeps the single column for a reposted text post', async () => {
    await openOverlay(repost({ shared_content: { thumbnail_url: null } }));

    expect(screen.queryByTestId('feed-post-overlay-split')).not.toBeInTheDocument();
    expect(screen.getByTestId('feed-post-overlay-fixed')).toBeInTheDocument();
  });
});

describe('zobrazenie fotky v náhľade', () => {
  it('shows the whole photo instead of cropping it', async () => {
    render(<FeedPostCard post={repost()} />);

    const photo = screen.getByTestId('feed-shared-post-photo');
    // Rámec má pevnú výšku a fotka sa doň vkladá cez `object-contain`
    // s rozmazaným pozadím – ten istý komponent, aký používa karusel.
    expect(photo.parentElement?.className).toContain('h-64');
    const image = photo.querySelector('img:not([aria-hidden])');
    expect(image?.className).toContain('object-contain');
    expect(image?.className).not.toContain('object-cover');
  });

  it('reserves no space at all for a text repost', async () => {
    render(
      <FeedPostCard post={repost({ shared_content: { thumbnail_url: null } })} />,
    );

    // Žiadny rámec, žiadna prázdna plocha – výška sedí s obsahom.
    const preview = screen.getByTestId('feed-shared-post-preview');
    expect(within(preview).queryByTestId('feed-shared-post-photo')).toBeNull();
    expect(preview.innerHTML).not.toContain('h-64');
    expect(preview.querySelector('img')).toBeNull();
  });
});

describe('klik na fotku v reposte', () => {
  it('opens the photo viewer of the ORIGINAL post on desktop', async () => {
    mockedGetPost.mockResolvedValue(originalPost());
    render(<FeedPostCard post={repost()} />);

    await userEvent.click(screen.getByTestId('feed-shared-post-photo'));

    // Doťahuje sa PÔVODNÝ príspevok – snapshot v reposte nesie len malý náhľad.
    await waitFor(() => expect(mockedGetPost).toHaveBeenCalledWith(9));
    const lightbox = await screen.findByTestId('feed-shared-photo-lightbox');
    // Vo fullscreene je veľká varianta pôvodného príspevku, nie snapshot.
    expect(
      within(lightbox).getByTestId('feed-shared-photo-lightbox-image'),
    ).toHaveAttribute('src', 'http://api.test/41-l.webp');
    // Detail zdieľajúceho príspevku sa neotvára.
    expect(screen.queryByTestId('feed-mobile-detail')).not.toBeInTheDocument();
  });

  it('opens the immersive viewer of the ORIGINAL post on mobile', async () => {
    mockIsMobile = true;
    mockedGetPost.mockResolvedValue(originalPost());
    render(<FeedPostCard post={repost()} />);

    await userEvent.click(screen.getByTestId('feed-shared-post-photo'));

    const viewer = await screen.findByTestId('feed-photo-viewer');
    // Autor, text aj počty patria PÔVODNÉMU príspevku, nie repost obalu.
    expect(within(viewer).getByTestId('feed-photo-viewer-author')).toHaveTextContent(
      'Peter',
    );
    expect(within(viewer).getByTestId('feed-photo-viewer-caption')).toHaveTextContent(
      'Pôvodný text',
    );
    expect(
      within(viewer).getByTestId('feed-photo-viewer-like-count'),
    ).toHaveTextContent('4');
    expect(screen.queryByTestId('feed-mobile-detail')).not.toBeInTheDocument();
  });

  it('still opens the sharing post detail from outside the photo', async () => {
    mockIsMobile = true;
    render(<FeedPostCard post={repost()} />);

    await userEvent.click(screen.getByTestId('feed-shared-post-preview-open'));

    expect(await screen.findByTestId('feed-mobile-detail')).toBeInTheDocument();
    expect(screen.queryByTestId('feed-photo-viewer')).not.toBeInTheDocument();
  });
});
