/**
 * DOČASNÝ odtlačok HTML karty príspevku (R45) – poistka pred delením `FeedPostCard.tsx` (nález 333, dávka K48).
 *
 * Dočasný súbor, ktorý zmaže posledná dávka delenia (K55). Konvencie projektu snapshoty nepoužívajú (v repozitári nie je
 * žiadny súbor `.snap`); tento je jediná výnimka a platí len po dobu delenia. Delenie je čistý presun kódu, takže
 * vykreslený DOM sa nesmie zmeniť ani o atribút: odtlačok stráži najmä pružný stĺpec okna detailu (`fillHeight`,
 * `fixedBlock`), ktorý závisí od tried a od toho, že koreň každého presunutého bloku ostane priamym potomkom `article`.
 * Triedy CSS tu nikto netestuje inde, preto ich stráži tento súbor.
 *
 * PRAVIDLÁ: počas delenia sa súbor ani jeho `.snap` NEUPRAVUJÚ a odtlačok sa NIKDY neaktualizuje (`-u`); rozdiel
 * znamená, že presun zmenil DOM. Výstup je deterministický: pevný čas (falošné hodiny), pevné `id` a bez náhodných
 * hodnôt; identifikátory z `useId` sa normalizujú. Dva behy dávajú ten istý výstup. Stavy zjednocujú sondy z mapovaní K46:
 * feed, okno detailu s `fillHeight` aj bez, mobil a otvorené vrstvy karty (desktop aj mobil).
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
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
  getFeedPost: jest.fn(() =>
    Promise.resolve({
      id: 99,
      post_type: 'free_post',
      caption: 'Pôvodný text',
      author: { id: 30, display_name: 'Peter', slug: 'peter', user_type: 'individual', avatar_url: null },
      images: [{ id: 5, status: 'approved', thumbnail_url: 'http://api.test/5-t.webp', large_url: 'http://api.test/5-l.webp' }],
      shared_content: null,
      shared_content_unavailable: false,
      tagged_users: [],
      likes_count: 0,
      comments_count: 0,
      is_liked_by_me: false,
      can_manage: false,
      created_at: '2026-01-01T10:00:00Z',
    }),
  ),
  likeFeedPost: jest.fn(),
  unlikeFeedPost: jest.fn(),
  listFeedPostComments: jest.fn(() =>
    Promise.resolve({ results: [], next: null, previous: null, count: 0 }),
  ),
  listFeedCommentReplies: jest.fn(),
  createFeedPostComment: jest.fn(),
  updateFeedPostComment: jest.fn(),
  deleteFeedPostComment: jest.fn(),
  likeFeedPostComment: jest.fn(),
  unlikeFeedPostComment: jest.fn(),
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
  useLanguage: () => ({ t: (_k: string, fallback: string) => fallback, locale: 'sk' }),
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
  DesktopEmojiPickerButton: () => null,
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

const author = { id: 10, display_name: 'Jana', slug: 'jana', user_type: 'individual', avatar_url: null };
const owner = { id: 30, display_name: 'Peter Malý', slug: 'peter', user_type: 'individual', avatar_url: null };
const img = (id: number, status = 'approved') => ({
  id,
  status,
  thumbnail_url: `http://api.test/${id}-t.webp`,
  large_url: `http://api.test/${id}-l.webp`,
});
const tag = (id: number, name: string, own: boolean) => ({
  id,
  display_name: name,
  slug: name.toLowerCase(),
  can_remove_tag: own,
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
  comments_count: 3,
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
const offer = (o: Over = {}) => base({ post_type: 'shared_offer', caption: 'Odporúčam.', shared_content: shared('offer'), ...o });
const portfolio = (o: Over = {}) =>
  base({ post_type: 'shared_portfolio_item', caption: 'Pozrite si prácu.', shared_content: shared('portfolio_item', { title: 'Logo značky', id: 43 }), ...o });
const repost = (photo: boolean, ownerId = 30, o: Over = {}) =>
  base({
    post_type: 'shared_feed_post',
    caption: 'Toto stojí za prečítanie.',
    shared_content: shared('feed_post', {
      title: '',
      category: '',
      caption: 'Pôvodný text príspevku',
      id: 99,
      owner: { ...owner, id: ownerId },
      thumbnail_url: photo ? 'http://api.test/orig-t.webp' : null,
      is_seeking: null,
      price_negotiable: null,
      price_from: null,
      price_currency: '',
    }),
    ...o,
  });

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

const klik = (...ids: string[]) => () => ids.forEach((id) => fireEvent.click(screen.getByTestId(id)));
const nahlasit = () => {
  fireEvent.click(screen.getByTestId('feed-post-menu-trigger'));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Nahlásiť príspevok' }));
};
const rozbalit = klik('feed-post-caption-toggle');
const dlhyText = 'Dlhý text príspevku. '.repeat(45);
const fotkaRepostu = () => {
  const fotka = screen.queryByTestId('feed-shared-post-photo');
  if (fotka) fireEvent.click(fotka);
};

type Stav = {
  name: string;
  post?: Over;
  props?: Over;
  mobile?: boolean;
  overlay?: boolean;
  /** jsdom nemá rozmery: pre rozbalenie textu sa musí podstrčiť pretečenie (`scrollHeight` väčšie ako `clientHeight`). */
  pretecenie?: boolean;
  act?: () => void;
};

const okno = { variant: 'detail', fillHeight: true };
const STAVY: Stav[] = [
  { name: 'feed: cudzí text bez fotky' },
  { name: 'feed: jedna fotka', post: { images: [img(11)] } },
  { name: 'feed: tri fotky a dlhý text', post: { images: [img(11), img(12), img(13)], caption: 'Dlhý text. '.repeat(60) } },
  { name: 'feed: zdieľaná ponuka', post: offer() },
  { name: 'feed: zdieľané portfólio', post: portfolio() },
  { name: 'feed: repost textu', post: repost(false) },
  { name: 'feed: repost s fotkou', post: repost(true) },
  { name: 'feed: vlastný repost s fotkou', post: repost(true, 10) },
  { name: 'feed: vlastné zdieľanie ponuky', post: offer({ shared_content: shared('offer', { owner: author }) }) },
  { name: 'feed: nedostupný zdieľaný zdroj', post: offer({ shared_content_unavailable: true }) },
  { name: 'feed: fotka a označenia, jedno vlastné', post: { images: [img(11)], tagged_users: [tag(1, 'Ema', false), tag(2, 'Ja', true)] } },
  { name: 'feed: vlastný upravený príspevok s lajkom', post: { can_manage: true, is_edited: true, is_liked_by_me: true, likes_count: 0 } },
  { name: 'feed: zamietnutá fotka', post: { images: [img(11), img(12, 'rejected')] } },
  { name: 'feed: fotka s kontextom okna', post: { images: [img(11)] }, overlay: true },
  { name: 'feed: otvorené komentáre v karte', props: { initialCommentsOpen: true } },
  { name: 'okno: fotka (fillHeight)', post: { images: [img(11)] }, props: okno, overlay: true },
  { name: 'okno: zdieľaná ponuka (fillHeight)', post: offer(), props: okno, overlay: true },
  { name: 'okno: portfólio s označením (fillHeight)', post: portfolio({ tagged_users: [tag(1, 'Ema', false)] }), props: okno },
  { name: 'okno: repost s fotkou a označením (fillHeight)', post: repost(true, 30, { tagged_users: [tag(1, 'Ema', true)] }), props: okno, overlay: true },
  { name: 'okno: repost textu (fillHeight)', post: repost(false), props: okno },
  { name: 'okno: dlhý text bez fillHeight', post: { caption: 'x'.repeat(900) }, props: { variant: 'detail' }, overlay: true },
  { name: 'okno: text (fillHeight)', props: okno, overlay: true },
  { name: 'okno: rozbalený dlhý text (fillHeight)', post: { caption: dlhyText }, props: okno, overlay: true, pretecenie: true, act: rozbalit },
  { name: 'okno: rozbalený dlhý text bez fillHeight', post: { caption: dlhyText }, props: { variant: 'detail' }, overlay: true, pretecenie: true, act: rozbalit },
  { name: 'okno: rozbalený text repostu (fillHeight)', post: repost(false, 30, { caption: dlhyText }), props: okno, pretecenie: true, act: rozbalit },
  { name: 'okno: rozbalený text repostu bez fillHeight', post: repost(false, 30, { caption: dlhyText }), props: { variant: 'detail' }, pretecenie: true, act: rozbalit },
  { name: 'mobil: karta s fotkou', post: { images: [img(11)] }, mobile: true },
  { name: 'mobil: karta s textom', mobile: true },
  { name: 'vrstvy: menu vlastníka', post: { can_manage: true }, act: klik('feed-post-menu-trigger') },
  { name: 'vrstvy: menu cudzieho príspevku', act: klik('feed-post-menu-trigger') },
  { name: 'vrstvy: zoznam lajkujúcich', act: klik('feed-like-count') },
  { name: 'vrstvy: potvrdenie zmazania', post: { can_manage: true }, act: klik('feed-post-menu-trigger', 'feed-post-delete') },
  { name: 'vrstvy: potvrdenie odstránenia označenia', post: { tagged_users: [tag(2, 'Ja', true)] }, act: klik('feed-post-tag-remove') },
  { name: 'vrstvy: nahlásenie', act: nahlasit },
  { name: 'vrstvy: zdieľanie', act: klik('feed-share-button') },
  { name: 'vrstvy: úprava s fotkou', post: { can_manage: true, images: [img(11)] }, act: klik('feed-post-menu-trigger', 'feed-post-edit') },
  { name: 'vrstvy: prehliadač fotky z repostu', post: repost(true), act: fotkaRepostu },
  { name: 'vrstvy: klik na komentáre s kontextom okna', post: { images: [img(11)] }, overlay: true, act: klik('feed-comments-button') },
  { name: 'mobil: obrazovka detailu', post: { images: [img(11)], can_manage: true }, mobile: true, act: klik('feed-comments-button') },
  { name: 'mobil: prehliadač fotky', post: { images: [img(11), img(12)] }, mobile: true, act: klik('feed-image-open-11') },
  { name: 'mobil: detail zdieľanej ponuky', post: offer({ is_liked_by_me: true }), mobile: true, act: klik('feed-comments-button') },
  { name: 'mobil: detail s menu vlastníka', post: { can_manage: true, is_edited: true }, mobile: true, act: klik('feed-comments-button', 'feed-mobile-detail-menu-trigger') },
  { name: 'mobil: detail repostu so zoznamom lajkujúcich', post: repost(true), mobile: true, act: klik('feed-comments-button', 'feed-mobile-detail-like-count') },
  { name: 'mobil: detail repostu s potvrdením zmazania', post: { ...repost(true, 10), can_manage: true }, mobile: true, act: klik('feed-comments-button', 'feed-mobile-detail-menu-trigger', 'feed-mobile-detail-delete') },
];

/** Identifikátory z `useId` závisia od počtu vykreslení v súbore, nie od DOM: normalizujú sa. */
const html = () =>
  document.body.innerHTML
    .replace(/«[a-z0-9]+»/g, '«id»')
    .replace(/:r[0-9a-z]+:/g, ':id:')
    .replace(/_r_[0-9a-z]+_/g, '_id_')
    .replace(/></g, '>\n<');

const povodneRozmery = {
  scrollHeight: Object.getOwnPropertyDescriptor(Element.prototype, 'scrollHeight'),
  clientHeight: Object.getOwnPropertyDescriptor(Element.prototype, 'clientHeight'),
};

function podstrcitPretecenie(zapnut: boolean) {
  (['scrollHeight', 'clientHeight'] as const).forEach((meno) => {
    const povodny = povodneRozmery[meno];
    if (zapnut) {
      Object.defineProperty(Element.prototype, meno, { configurable: true, get: () => (meno === 'scrollHeight' ? 400 : 60) });
    } else if (povodny) {
      Object.defineProperty(Element.prototype, meno, povodny);
    }
  });
}

describe('dočasný odtlačok HTML karty príspevku (R45, zmaže ho K55)', () => {
  beforeEach(() => {
    mockIsMobile = false;
    resetOverlayLayers();
    document.body.innerHTML = '';
    jest.useFakeTimers({ now: new Date('2026-01-05T10:00:00Z') });
  });

  afterEach(() => {
    podstrcitPretecenie(false);
    jest.useRealTimers();
  });

  it.each(STAVY)('$name', async (stav) => {
    mockIsMobile = stav.mobile === true;
    podstrcitPretecenie(stav.pretecenie === true);
    const card = <FeedPostCard post={base(stav.post) as unknown as FeedPost} {...stav.props} />;
    render(stav.overlay ? <FeedPostOverlayProvider>{card}</FeedPostOverlayProvider> : card);
    await flush();
    if (stav.act) {
      stav.act();
      await flush();
    }

    expect(html()).toMatchSnapshot();
  });
});
