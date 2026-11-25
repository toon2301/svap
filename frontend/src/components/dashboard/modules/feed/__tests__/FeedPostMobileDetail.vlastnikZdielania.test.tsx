/**
 * Mobilná obrazovka detailu: avatar a meno pôvodného autora zdieľaného obsahu otvoria jeho profil (nález 362, ručný test K59).
 *
 * Dávka K59 napojila preklik na profil pôvodného autora v karte na Nástenke a v okne detailu na počítači, no obrazovka detailu na
 * iPhone ostala bez neho (kreslí ju `FeedPostMobileDetailContent`, ktorý nedostáva `onClose`): ťuk na meno alebo avatar
 * nerobil nič pri prezdieľanom textovom príspevku, príspevku s fotkou, zdieľanej ponuke ani zdieľanom portfóliu. Po oprave
 * obrazovka podá obsahu `openSharedOwner` (`openUserProfile` s `beforeNavigate: onClose`), takže sa najprv zavrie a až potom
 * sa otvorí profil (signál `goToUserProfile`). Testy idú cez verejné rozhranie komponentu (vlastnosti, DOM, `data-testid`,
 * atrapa smerovača a udalosť na `window`), rovnako ako `FeedPostMobileDetail.sharedSource.test.tsx`.
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostMobileDetail from '../FeedPostMobileDetail';
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

const zdielajuci = {
  id: 10,
  display_name: 'Jana Nováková',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};
const vlastnik = {
  id: 21,
  display_name: 'Peter Kováč',
  slug: 'peter',
  user_type: 'individual',
  avatar_url: null,
};

function prispevok(overrides: Record<string, unknown> = {}): FeedPost {
  return {
    id: 7,
    post_type: 'free_post',
    caption: 'Text príspevku',
    author: zdielajuci,
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

/** Snapshot zdieľaného obsahu; `ine` mení jeho polia (vlastníka, fotku, typ). */
function zdielany(ine: Record<string, unknown> = {}) {
  return {
    type: 'feed_post',
    title: '',
    category: '',
    caption: 'Pôvodný text',
    id: 9,
    owner: vlastnik,
    owner_display_name: 'Peter Kováč',
    thumbnail_url: null,
    is_seeking: null,
    price_negotiable: null,
    price_from: null,
    price_currency: '',
    ...ine,
  };
}

const ponukaPolia = { type: 'offer', title: 'Doučovanie matematiky', caption: '', id: 5, is_seeking: false };
const portfolioPolia = { type: 'portfolio_item', title: 'Moje portfólio', caption: '', id: 6 };

const DRUHY: Array<[string, () => FeedPost]> = [
  ['prezdieľaný textový príspevok', () => prispevok({ post_type: 'shared_feed_post', shared_content: zdielany() })],
  [
    'prezdieľaný príspevok s fotografiou',
    () =>
      prispevok({
        post_type: 'shared_feed_post',
        shared_content: zdielany({ thumbnail_url: 'http://api.test/zdielany-9.webp' }),
      }),
  ],
  ['zdieľaná ponuka', () => prispevok({ post_type: 'shared_offer', shared_content: zdielany(ponukaPolia) })],
  ['zdieľané portfólio', () => prispevok({ post_type: 'shared_portfolio_item', shared_content: zdielany(portfolioPolia) })],
];

/** Poradie udalostí: zatvorenie obrazovky a signál `goToUserProfile` (`profil:adresa`, pri zdroji ponuky aj `:id`). */
let udalosti: string[] = [];
const poslucham = (event: Event) => {
  const { identifier, offerId } = (event as CustomEvent<{ identifier: string; offerId?: number }>).detail;
  udalosti.push(`profil:${identifier}${offerId != null ? `:${offerId}` : ''}`);
};

async function vykresli(post: FeedPost) {
  const onClose = jest.fn(() => {
    udalosti.push('zatvorenie');
  });
  const view = render(<FeedPostMobileDetail post={post} onClose={onClose} />);
  await screen.findByTestId('feed-mobile-detail');
  return { ...view, onClose };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetPost.mockReset();
  mockPush.mockReset();
  resetOverlayLayers();
  document.body.innerHTML = '';
  udalosti = [];
  window.addEventListener('goToUserProfile', poslucham);
});

afterEach(() => {
  window.removeEventListener('goToUserProfile', poslucham);
});

describe('mobilná obrazovka detailu: avatar a meno pôvodného autora otvoria jeho profil', () => {
  it.each(DRUHY)('%s: ťuk na meno najprv zatvorí obrazovku a potom otvorí profil pôvodného autora', async (_druh, vytvor) => {
    const { onClose } = await vykresli(vytvor());
    const riadok = screen.getByTestId('feed-shared-card-owner');
    expect(riadok.tagName).toBe('BUTTON');

    await userEvent.click(within(riadok).getByText('Peter Kováč'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(udalosti).toEqual(['zatvorenie', 'profil:peter']);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it.each(DRUHY)('%s: ťuk na avatar otvorí ten istý profil', async (_druh, vytvor) => {
    const { onClose } = await vykresli(vytvor());

    await userEvent.click(within(screen.getByTestId('feed-shared-card-owner')).getByText('PK'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(udalosti).toEqual(['zatvorenie', 'profil:peter']);
  });

  it('ťuk na meno pri prezdieľanom príspevku s fotografiou neotvorí ani pôvodný príspevok, ani prehliadač fotky', async () => {
    await vykresli(DRUHY[1][1]());

    await userEvent.click(within(screen.getByTestId('feed-shared-card-owner')).getByText('Peter Kováč'));

    expect(mockPush).not.toHaveBeenCalled();
    expect(mockedGetPost).not.toHaveBeenCalled();
    expect(screen.queryByTestId('feed-photo-viewer')).not.toBeInTheDocument();
    expect(udalosti).toEqual(['zatvorenie', 'profil:peter']);
  });

  it('keď vlastník nemá adresu profilu, otvorí sa profil podľa jeho id', async () => {
    await vykresli(
      prispevok({
        post_type: 'shared_feed_post',
        shared_content: zdielany({ owner: { ...vlastnik, slug: null } }),
      }),
    );

    await userEvent.click(within(screen.getByTestId('feed-shared-card-owner')).getByText('Peter Kováč'));

    expect(udalosti).toEqual(['zatvorenie', 'profil:21']);
  });
});

describe('mobilná obrazovka detailu: kedy riadok pôvodného autora nepreklikáva', () => {
  it('pri zdieľaní vlastného príspevku sa riadok pôvodného autora nekreslí', async () => {
    await vykresli(
      prispevok({
        post_type: 'shared_feed_post',
        shared_content: zdielany({ owner: zdielajuci, owner_display_name: 'Jana Nováková' }),
      }),
    );

    expect(screen.getByTestId('feed-shared-card')).toBeInTheDocument();
    expect(screen.queryByTestId('feed-shared-card-owner')).not.toBeInTheDocument();
    expect(udalosti).toEqual([]);
  });

  it('pri nedostupnom zdroji ostáva meno bez prekliku a ťuk naň nič nespraví', async () => {
    const { onClose } = await vykresli(
      prispevok({
        post_type: 'shared_feed_post',
        shared_content: zdielany({ owner: null }),
        shared_content_unavailable: true,
      }),
    );
    const riadok = screen.getByTestId('feed-shared-card-owner');

    await userEvent.click(within(riadok).getByText('Peter Kováč'));

    expect(riadok.tagName).toBe('DIV');
    expect(onClose).not.toHaveBeenCalled();
    expect(udalosti).toEqual([]);
  });

  it('vlastník bez id aj adresy profilu ostáva bez prekliku', async () => {
    const { onClose } = await vykresli(
      prispevok({
        post_type: 'shared_feed_post',
        shared_content: zdielany({ owner: { ...vlastnik, id: 0, slug: '' } }),
      }),
    );
    const riadok = screen.getByTestId('feed-shared-card-owner');

    await userEvent.click(within(riadok).getByText('Peter Kováč'));

    expect(riadok.tagName).toBe('DIV');
    expect(onClose).not.toHaveBeenCalled();
    expect(udalosti).toEqual([]);
  });
});
