/**
 * DOČASNÝ odtlačok HTML mobilnej obrazovky detailu príspevku (R45) – poistka pred delením `FeedPostMobileDetail.tsx`
 * (nález 333, dávka K49).
 *
 * Dočasný súbor, ktorý zmaže posledná dávka delenia (K55). Konvencie projektu snapshoty nepoužívajú; výnimkou sú dočasné
 * odtlačky delenia (karta príspevku z K48 a tento) a platia len po dobu delenia. Delenie je čistý presun kódu, takže
 * vykreslený DOM sa nesmie zmeniť ani o atribút: odtlačok stráži najmä triedy CSS, poradie a vnorenie prvkov a atribút
 * `data-auto-scrolled` na kotve komentárov, ktoré inde nikto netestuje.
 *
 * PRAVIDLÁ: počas delenia sa súbor ani jeho `.snap` NEUPRAVUJÚ a odtlačok sa NIKDY neaktualizuje (`-u`); rozdiel
 * znamená, že presun zmenil DOM. Výstup je deterministický: pevný čas (falošné hodiny), pevné `id` a bez náhodných
 * hodnôt; identifikátory z `useId` sa normalizujú. Dva behy dávajú ten istý výstup.
 *
 * STAVY (päť, každý pokrýva viac vetiev obrazovky):
 *  1. text s fotkou a tromi komentármi: text, fotka, rozhodnutie o posune `true`, komentáre v zozname,
 *  2. zdieľaná ponuka s lajkom: náhľad ponuky namiesto fotky, `aria-pressed`, rozhodnutie o posune `true`,
 *  3. repost s fotkou od autora bez profilu: vypnutý avatar, meno pôvodného autora nad náhľadom, fotka v náhľade,
 *     rozhodnutie o posune `false`,
 *  4. menu vlastníka pri texte bez fotky: otvorené menu s tromi položkami, bez fotky, rozhodnutie o posune `false`,
 *  5. potvrdenie zmazania vlastného reposta bez fotky: zdieľanie vlastného príspevku (meno autora skryté).
 * Nepokryté vetvy: okná zdieľania, nahlásenia, úpravy a zoznam lajkujúcich (sú to samostatné komponenty, ich otvorenie
 * stráži `FeedPostMobileDetail.dialogs.test.tsx`), nedostupný zdieľaný zdroj a stav „Už nahlásené“ v menu.
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import FeedPostMobileDetail from '../FeedPostMobileDetail';
import { resetOverlayLayers } from '../../shared/overlayLayers';
import { listFeedPostComments, type FeedPost } from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  FEED_COMMENT_MAX_LENGTH: 500,
  updateFeedPost: jest.fn(),
  deleteFeedPostImage: jest.fn(),
  deleteFeedPost: jest.fn(),
  getFeedPost: jest.fn(),
  likeFeedPost: jest.fn(),
  unlikeFeedPost: jest.fn(),
  listFeedPostComments: jest.fn(),
  listFeedCommentReplies: jest.fn(),
  createFeedPostComment: jest.fn(),
  updateFeedPostComment: jest.fn(),
  deleteFeedPostComment: jest.fn(),
  likeFeedPostComment: jest.fn(),
  unlikeFeedPostComment: jest.fn(),
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
  useLanguage: () => ({ t: (_k: string, fallback: string) => fallback, locale: 'sk' }),
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
  DesktopEmojiPickerButton: () => null,
}));

jest.mock('../../messages/GroupUserPicker', () => ({
  GroupUserPicker: () => <div />,
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const mockedList = listFeedPostComments as jest.MockedFunction<typeof listFeedPostComments>;

const author = { id: 10, display_name: 'Jana Nováková', slug: 'jana', user_type: 'individual', avatar_url: null };
const bezProfilu = { id: 0, display_name: 'Bývalý používateľ', slug: '', user_type: 'individual', avatar_url: null };
const owner = { id: 30, display_name: 'Peter Malý', slug: 'peter', user_type: 'individual', avatar_url: null };
const img = (id: number) => ({
  id,
  status: 'approved',
  thumbnail_url: `http://api.test/${id}-t.webp`,
  large_url: `http://api.test/${id}-l.webp`,
});

type Over = Record<string, unknown>;
const base = (o: Over = {}): Over => ({
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
  created_at: '2026-01-04T10:00:00Z',
  ...o,
});
const shared = (type: string, o: Over = {}) => ({
  type,
  title: 'Programovanie',
  category: 'it',
  caption: '',
  id: 42,
  owner,
  owner_display_name: 'Peter Malý',
  thumbnail_url: 'http://api.test/offer-t.webp',
  is_seeking: false,
  price_negotiable: false,
  price_from: '25',
  price_currency: '€',
  ...o,
});
const offer = (o: Over = {}) =>
  base({ post_type: 'shared_offer', caption: 'Odporúčam.', shared_content: shared('offer'), ...o });
const repost = (photo: boolean, ownerOver: Over = {}, o: Over = {}) =>
  base({
    post_type: 'shared_feed_post',
    caption: 'Toto stojí za prečítanie.',
    shared_content: shared('feed_post', {
      title: '',
      category: '',
      caption: 'Pôvodný text príspevku',
      id: 99,
      owner: { ...owner, ...ownerOver },
      thumbnail_url: photo ? 'http://api.test/orig-t.webp' : null,
      is_seeking: null,
      price_negotiable: null,
      price_from: null,
      price_currency: '',
    }),
    ...o,
  });

function commentPage(count: number) {
  return {
    results: Array.from({ length: count }, (_unused, index) => ({
      id: 100 + index,
      text: `Komentár ${index + 1}`,
      author,
      can_delete: false,
      can_edit: false,
      likes_count: 0,
      is_liked_by_me: false,
      replies: [],
      replies_count: 0,
      created_at: '2026-01-05T09:00:00Z',
    })),
    next: null,
    previous: null,
    count,
  };
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

const klik = (...ids: string[]) => () => ids.forEach((id) => fireEvent.click(screen.getByTestId(id)));

type Stav = {
  name: string;
  post: Over;
  /** Počet komentárov, ktoré vráti zoznam (rovnaký ako `comments_count` príspevku). */
  komentare?: number;
  act?: () => void;
};

const STAVY: Stav[] = [
  {
    name: 'text s fotkou a tromi komentármi (rozhodnutie o posune: áno)',
    post: { images: [img(11)], comments_count: 3 },
    komentare: 3,
  },
  {
    name: 'zdieľaná ponuka s lajkom',
    post: offer({ is_liked_by_me: true, likes_count: 1, comments_count: 3 }),
    komentare: 3,
  },
  {
    name: 'repost s fotkou od autora bez profilu (vypnutý avatar)',
    post: repost(true, {}, { author: bezProfilu }),
  },
  {
    name: 'menu vlastníka pri texte bez fotky',
    post: { can_manage: true },
    act: klik('feed-mobile-detail-menu-trigger'),
  },
  {
    name: 'potvrdenie zmazania vlastného reposta bez fotky',
    post: repost(false, author, { can_manage: true }),
    act: klik('feed-mobile-detail-menu-trigger', 'feed-mobile-detail-delete'),
  },
];

/** Identifikátory z `useId` závisia od počtu vykreslení v súbore, nie od DOM: normalizujú sa. */
const html = () =>
  document.body.innerHTML
    .replace(/«[a-z0-9]+»/g, '«id»')
    .replace(/:r[0-9a-z]+:/g, ':id:')
    .replace(/_r_[0-9a-z]+_/g, '_id_')
    .replace(/></g, '>\n<');

describe('dočasný odtlačok HTML mobilnej obrazovky detailu príspevku (R45, zmaže ho K55)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedList.mockReset();
    resetOverlayLayers();
    document.body.innerHTML = '';
    jest.useFakeTimers({ now: new Date('2026-01-05T10:00:00Z') });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it.each(STAVY)('$name', async (stav) => {
    mockedList.mockResolvedValue(commentPage(stav.komentare ?? 0) as never);
    render(<FeedPostMobileDetail post={base(stav.post) as unknown as FeedPost} onClose={jest.fn()} />);
    await flush();
    if (stav.act) {
      stav.act();
      await flush();
    }

    expect(html()).toMatchSnapshot();
  });
});
