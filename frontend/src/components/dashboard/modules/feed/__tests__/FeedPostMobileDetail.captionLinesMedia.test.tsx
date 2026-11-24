/**
 * Počet riadkov textu na mobilnej obrazovke detailu príspevku po ručnom teste K58 (R77).
 *
 * Príspevok s fotkou, ponukou, portfóliom alebo náhľadom zdieľaného obsahu (aj repost textového príspevku) zbalí text
 * na 5 riadkov, „Viac“ je od šiesteho riadku. Obyčajný textový príspevok (aj taký, ktorému zamietli jedinú fotku) ostáva
 * na 10 riadkoch, „Viac“ je od jedenásteho. Pôvodný text vnútri náhľadu reposta ostáva na 3 riadkoch a karta vo feede pod
 * obrazovkou tiež.
 *
 * jsdom nelayoutuje, takže „presahuje text riadky?“ sa nastavuje na uzle (`scrollHeight` proti `clientHeight`). Presnú
 * hranicu riadkov tu nemožno zmerať; kontroluje sa trieda orezania, ktorú prehliadač vykoná.
 */

import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostCard from '../FeedPostCard';
import { resetOverlayLayers } from '../../shared/overlayLayers';
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

// Obrazovka detailu existuje len na mobile.
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

jest.mock('framer-motion', () => ({
  motion: {
    article: ({ children, ...props }: React.ComponentProps<'article'>) => (
      <article {...props}>{children}</article>
    ),
  },
}));

const mockedListComments = jest.requireMock('@/lib/feedApi')
  .listFeedPostComments as jest.Mock;

const DLHY_TEXT = 'Dlhý text príspevku, ktorý na mobile presahuje päť aj desať riadkov.';

const autor = {
  id: 10,
  display_name: 'Jana Nováková',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};
const povodnyAutor = {
  id: 21,
  display_name: 'Peter',
  slug: 'peter',
  user_type: 'individual',
  avatar_url: null,
};

function fotka(stav: 'approved' | 'rejected') {
  return {
    id: 11,
    status: stav,
    thumbnail_url: 'http://api.test/11-t.webp',
    large_url: 'http://api.test/11-l.webp',
  } as FeedPost['images'][number];
}

const ZAKLAD = {
  id: 7,
  author: autor,
  tagged_users: [],
  likes_count: 2,
  comments_count: 0,
  is_liked_by_me: false,
  can_manage: false,
  created_at: '2026-01-01T10:00:00Z',
  shared_content_unavailable: false,
};

/** Voľný príspevok s dlhým textom a danými fotkami. */
function volnyPrispevok(images: FeedPost['images']): FeedPost {
  return {
    ...ZAKLAD,
    post_type: 'free_post',
    caption: DLHY_TEXT,
    images,
    shared_content: null,
  } as unknown as FeedPost;
}

/** Zdieľaná ponuka alebo portfólio s textom zdieľajúceho. */
function zdielanaKarta(typ: 'offer' | 'portfolio_item'): FeedPost {
  const jePonuka = typ === 'offer';
  return {
    ...ZAKLAD,
    post_type: jePonuka ? 'shared_offer' : 'shared_portfolio_item',
    caption: DLHY_TEXT,
    images: [],
    shared_content: {
      type: typ,
      title: jePonuka ? 'Programovanie' : 'Weby',
      category: 'it',
      caption: '',
      id: 42,
      owner: povodnyAutor,
      owner_display_name: 'Peter',
      thumbnail_url: null,
      is_seeking: jePonuka ? false : null,
      price_negotiable: jePonuka ? false : null,
      price_from: jePonuka ? '25' : null,
      price_currency: jePonuka ? '€' : '',
    },
  } as unknown as FeedPost;
}

/** Zdieľaný voľný príspevok (repost); pôvodný príspevok má dlhý text a fotku len vtedy, keď `sFotkou`. */
function repost(sFotkou: boolean): FeedPost {
  return {
    ...ZAKLAD,
    post_type: 'shared_feed_post',
    caption: DLHY_TEXT,
    images: [],
    shared_content: {
      type: 'feed_post',
      title: '',
      category: '',
      caption: DLHY_TEXT,
      id: 9,
      owner: povodnyAutor,
      owner_display_name: 'Peter',
      thumbnail_url: sFotkou ? 'http://api.test/shared-9.webp' : null,
      is_seeking: null,
      price_negotiable: null,
      price_from: null,
      price_currency: '',
    },
  } as unknown as FeedPost;
}

/** Texty na obrazovke presahujú, kým sú orezané; neorezané sa zmestia. */
function nastavVysky() {
  const idecka = ['feed-mobile-detail-caption', 'feed-shared-caption'];
  Object.defineProperty(HTMLParagraphElement.prototype, 'clientHeight', {
    configurable: true,
    get() {
      return idecka.includes(this.dataset.testid) ? 200 : 0;
    },
  });
  Object.defineProperty(HTMLParagraphElement.prototype, 'scrollHeight', {
    configurable: true,
    get() {
      if (!idecka.includes(this.dataset.testid)) return 0;
      return this.className.includes('line-clamp') ? 900 : 200;
    },
  });
}

/** Otvorí obrazovku ikonou komentárov na karte a dobehne efekty, ktoré obrazovka spúšťa až v druhom kole. */
async function otvorObrazovku(post: FeedPost) {
  render(<FeedPostCard post={post} />);
  await userEvent.click(screen.getByTestId('feed-comments-button'));
  const obrazovka = await screen.findByTestId('feed-mobile-detail');
  await act(async () => {});
  return obrazovka;
}

beforeAll(() => {
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    writable: true,
    value: jest.fn(),
  });
});

beforeEach(() => {
  jest.clearAllMocks();
  resetOverlayLayers();
  mockedListComments.mockResolvedValue({
    results: [],
    next: null,
    previous: null,
    count: 0,
  });
  nastavVysky();
});

afterEach(() => {
  // Výšky sú nastavené na prototype: bez upratania by pretiekli inam.
  Reflect.deleteProperty(HTMLParagraphElement.prototype, 'clientHeight');
  Reflect.deleteProperty(HTMLParagraphElement.prototype, 'scrollHeight');
});

describe('mobilný detail: text s fotkou alebo náhľadom zdieľaného obsahu má 5 riadkov', () => {
  it.each([
    ['príspevok s fotkou', () => volnyPrispevok([fotka('approved')])],
    ['zdieľaná ponuka', () => zdielanaKarta('offer')],
    ['zdieľané portfólio', () => zdielanaKarta('portfolio_item')],
    ['repost príspevku s fotkou', () => repost(true)],
    ['repost textového príspevku', () => repost(false)],
  ])('%s: text na 5 riadkoch a „Viac“ od šiesteho riadku', async (_nazov, vytvor) => {
    const obrazovka = await otvorObrazovku(vytvor());

    const text = within(obrazovka).getByTestId('feed-mobile-detail-caption');
    expect(text).toHaveClass('line-clamp-5');
    expect(text).not.toHaveClass('line-clamp-[10]');
    expect(text).not.toHaveClass('line-clamp-3');
    expect(await within(obrazovka).findByTestId('feed-mobile-detail-caption-toggle')).toHaveTextContent(
      'Viac',
    );
  });

  it('po „Viac“ sa text s fotkou rozbalí v bežnom toku, bez stropu a bez vlastného posúvania, a „Menej“ ho vráti na 5 riadkov', async () => {
    const obrazovka = await otvorObrazovku(volnyPrispevok([fotka('approved')]));

    await userEvent.click(await within(obrazovka).findByTestId('feed-mobile-detail-caption-toggle'));

    const rozbaleny = within(obrazovka).getByTestId('feed-mobile-detail-caption');
    expect(rozbaleny).not.toHaveClass('line-clamp-5');
    expect(rozbaleny.className).not.toMatch(/max-h-\[/);
    expect(rozbaleny).not.toHaveClass('overflow-y-auto');
    expect(within(obrazovka).getByTestId('feed-mobile-detail-caption-toggle')).toHaveTextContent('Menej');

    await userEvent.click(within(obrazovka).getByTestId('feed-mobile-detail-caption-toggle'));

    expect(within(obrazovka).getByTestId('feed-mobile-detail-caption')).toHaveClass('line-clamp-5');
    expect(within(obrazovka).getByTestId('feed-mobile-detail-caption-toggle')).toHaveTextContent('Viac');
  });

  it('krátky text s fotkou prepínač nemá', async () => {
    Object.defineProperty(HTMLParagraphElement.prototype, 'scrollHeight', {
      configurable: true,
      get() {
        return 200;
      },
    });
    const obrazovka = await otvorObrazovku(volnyPrispevok([fotka('approved')]));

    expect(within(obrazovka).getByTestId('feed-mobile-detail-caption')).toHaveClass('line-clamp-5');
    expect(within(obrazovka).queryByTestId('feed-mobile-detail-caption-toggle')).toBeNull();
  });
});

describe('mobilný detail: obyčajný textový príspevok ostáva na 10 riadkoch', () => {
  it.each([
    ['príspevok len s textom', () => volnyPrispevok([])],
    ['príspevok, ktorému zamietli jedinú fotku', () => volnyPrispevok([fotka('rejected')])],
  ])('%s: text na 10 riadkoch a „Viac“ od jedenásteho riadku', async (_nazov, vytvor) => {
    const obrazovka = await otvorObrazovku(vytvor());

    const text = within(obrazovka).getByTestId('feed-mobile-detail-caption');
    expect(text).toHaveClass('line-clamp-[10]');
    expect(text).not.toHaveClass('line-clamp-5');
    expect(await within(obrazovka).findByTestId('feed-mobile-detail-caption-toggle')).toHaveTextContent(
      'Viac',
    );
  });
});

describe('mobilný detail: ostatné texty sa nemenia', () => {
  it('pôvodný text vnútri náhľadu reposta má 3 riadky', async () => {
    const obrazovka = await otvorObrazovku(repost(false));

    expect(within(obrazovka).getByTestId('feed-shared-caption')).toHaveClass('line-clamp-3');
    expect(within(obrazovka).getByTestId('feed-shared-caption')).not.toHaveClass('line-clamp-5');
  });

  it('karta vo feede pod obrazovkou ostáva na troch riadkoch, aj keď má príspevok fotku', async () => {
    await otvorObrazovku(volnyPrispevok([fotka('approved')]));

    expect(screen.getByTestId('feed-post-caption')).toHaveClass('line-clamp-3');
    expect(screen.getByTestId('feed-post-caption')).not.toHaveClass('line-clamp-5');
  });
});
