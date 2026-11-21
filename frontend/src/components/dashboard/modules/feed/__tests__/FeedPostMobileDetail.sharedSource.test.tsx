/**
 * Zdieľaný obsah na mobilnej obrazovke detailu: preklik na zdroj, fotka z repostu a meno pôvodného autora.
 *
 * Charakterizačné testy pred delením `FeedPostMobileDetail.tsx` (nález 333, dávka K49). Pri zdieľanom príspevku
 * obrazovka kreslí náhľad pôvodného obsahu na mieste fotky a napája naň tri veci: preklik na zdroj (text repostu,
 * ponuka), ktorý najprv zatvorí obrazovku a až potom naviguje, fotku v reposte, ktorá otvorí prehliadač fotiek
 * PÔVODNÉHO príspevku (nie detail zdieľajúceho), a skrytie mena pôvodného autora pri zdieľaní vlastného príspevku.
 * Existujúce testy overujú len to, že sa náhľad vykreslí; ani jedno z troch napojení nestráži nič (K46: prežilo päť
 * skúšobných pokazení). Testy idú cez verejné rozhranie komponentu (`export default`, vlastnosti, DOM, `data-testid`,
 * atrapa smerovača a udalosť `goToUserProfile`), takže musia prejsť bez úpravy aj po delení súboru.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostMobileDetail from '../FeedPostMobileDetail';
import { dashboardFeedPostPath } from '../../../components/dashboardRoutes';
import { resetOverlayLayers } from '../../shared/overlayLayers';
import { getFeedPost, type FeedPost } from '@/lib/feedApi';

const mockPush = jest.fn();

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
  useRouter: () => ({ push: mockPush }),
}));

const mockedGetPost = getFeedPost as jest.MockedFunction<typeof getFeedPost>;

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
    caption: 'Text príspevku',
    author,
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

type SharedOverrides = Record<string, unknown>;

/** Zdieľaný príspevok číslo 9; `sharedOverrides` mení jeho snapshot (autor, fotka). */
function repost(sharedOverrides: SharedOverrides = {}): FeedPost {
  return makePost({
    post_type: 'shared_feed_post',
    caption: 'Toto stojí za pozretie.',
    shared_content: {
      type: 'feed_post',
      title: '',
      category: '',
      caption: 'Pôvodný text',
      id: 9,
      owner,
      owner_display_name: 'Peter Kováč',
      thumbnail_url: null,
      is_seeking: null,
      price_negotiable: null,
      price_from: null,
      price_currency: '',
      ...sharedOverrides,
    },
  });
}

const repostWithPhoto = () => repost({ thumbnail_url: 'http://api.test/shared-9.webp' });

/** Zdieľaná ponuka číslo 5 od autora so slugom `peter`. */
const sharedOffer = () =>
  makePost({
    post_type: 'shared_offer',
    caption: 'Pozrite si ponuku.',
    shared_content: {
      type: 'offer',
      title: 'Doučovanie matematiky',
      category: '',
      caption: '',
      id: 5,
      owner,
      owner_display_name: 'Peter Kováč',
      thumbnail_url: null,
      is_seeking: false,
      price_negotiable: null,
      price_from: null,
      price_currency: '',
    },
  });

const originalPost = () => makePost({ id: 9, author: owner, images: [photo(41)], likes_count: 4 });

async function renderDetail(post: FeedPost, onClose: () => void = jest.fn()) {
  const view = render(<FeedPostMobileDetail post={post} onClose={onClose} />);
  await screen.findByTestId('feed-mobile-detail');
  return view;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetPost.mockReset();
  mockPush.mockReset();
  resetOverlayLayers();
  document.body.innerHTML = '';
});

describe('preklik zo zdieľaného obsahu na mobilnej obrazovke detailu', () => {
  it('ťuk na text zdieľaného príspevku najprv zatvorí obrazovku a potom prejde na pôvodný príspevok', async () => {
    const calls: string[] = [];
    mockPush.mockImplementation(() => {
      calls.push('prechod');
    });
    await renderDetail(repost(), () => {
      calls.push('zatvorenie');
    });

    await userEvent.click(screen.getByTestId('feed-shared-post-preview-open'));

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith(dashboardFeedPostPath(9));
    expect(calls).toEqual(['zatvorenie', 'prechod']);
  });

  it('ťuk na ponuku zdieľanú v príspevku najprv zatvorí obrazovku a potom otvorí ponuku na profile vlastníka', async () => {
    const calls: string[] = [];
    const handler = (event: Event) => {
      const { identifier, offerId } = (event as CustomEvent).detail;
      calls.push(`profil:${identifier}:${offerId}`);
    };
    window.addEventListener('goToUserProfile', handler);
    try {
      await renderDetail(sharedOffer(), () => {
        calls.push('zatvorenie');
      });

      await userEvent.click(screen.getByTestId('feed-shared-compact-preview'));

      expect(calls).toEqual(['zatvorenie', 'profil:peter:5']);
      expect(mockPush).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener('goToUserProfile', handler);
    }
  });
});

describe('fotka v reposte na mobilnej obrazovke detailu', () => {
  it('ťuk na fotku v reposte dotiahne pôvodný príspevok a otvorí jeho prehliadač fotiek, nie detail zdieľajúceho', async () => {
    mockedGetPost.mockResolvedValue(originalPost());
    const onClose = jest.fn();
    await renderDetail(repostWithPhoto(), onClose);

    await userEvent.click(screen.getByTestId('feed-shared-post-photo'));

    expect(await screen.findByTestId('feed-photo-viewer')).toBeInTheDocument();
    expect(mockedGetPost).toHaveBeenCalledTimes(1);
    expect(mockedGetPost).toHaveBeenCalledWith(9);
    expect(mockPush).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByTestId('feed-mobile-detail')).toBeInTheDocument();
  });

  it('prehliadač fotky z repostu sa zatvorí tlačidlom X a obrazovka ostane otvorená', async () => {
    mockedGetPost.mockResolvedValue(originalPost());
    const onClose = jest.fn();
    await renderDetail(repostWithPhoto(), onClose);
    await userEvent.click(screen.getByTestId('feed-shared-post-photo'));
    await screen.findByTestId('feed-photo-viewer');

    await userEvent.click(screen.getByTestId('feed-photo-viewer-close'));

    await waitFor(() =>
      expect(screen.queryByTestId('feed-photo-viewer')).not.toBeInTheDocument(),
    );
    expect(screen.getByTestId('feed-mobile-detail')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('repost bez fotky nemá fotku ako cieľ ťuku, text zdieľaného príspevku ostáva klikateľný', async () => {
    await renderDetail(repost());

    expect(screen.queryByTestId('feed-shared-post-photo')).not.toBeInTheDocument();
    expect(screen.getByTestId('feed-shared-post-preview-open')).toBeInTheDocument();
    expect(mockedGetPost).not.toHaveBeenCalled();
  });
});

describe('meno pôvodného autora v zdieľanom príspevku na mobilnej obrazovke detailu', () => {
  it('pri cudzom príspevku ukáže meno pôvodného autora nad náhľadom, pri zdieľaní vlastného príspevku ho vynechá', async () => {
    const foreign = await renderDetail(repost());
    expect(screen.getByTestId('feed-shared-card-owner')).toHaveTextContent('Peter Kováč');
    foreign.unmount();

    await renderDetail(
      repost({ owner: author, owner_display_name: 'Jana Nováková' }),
    );

    expect(screen.getByTestId('feed-shared-card')).toBeInTheDocument();
    expect(screen.queryByTestId('feed-shared-card-owner')).not.toBeInTheDocument();
  });
});
