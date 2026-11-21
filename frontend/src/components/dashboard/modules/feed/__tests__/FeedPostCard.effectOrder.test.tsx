/**
 * DOČASNÁ sonda poradia registrácie efektov karty príspevku (R45) – poistka pred delením `FeedPostCard.tsx`
 * (nález 333, dávka K48).
 *
 * Dočasný súbor, ktorý zmaže posledná dávka delenia (K55); je to jediná výnimka z konvencie bez snapshotov spolu s
 * odtlačkom HTML (`FeedPostCard.htmlSnapshot.test.tsx`). Karta má sedem efektov, ktoré preberajú stav z feedu
 * (lajk, počty, označenia, príspevok, premietnutie lajku do `currentPost`, zdieľanie, zmazanie), a polling počtov. Ich
 * POREDIE je súčasť správania: napríklad príspevok z feedu sa musí prevziať PRED premietnutím lajku používateľa, inak by
 * vyhral starý príspevok. Presun efektov do hookov (krok f delenia) je najrizikovejší a pokazené poradie testy
 * správania nezachytia, preto sa tu poradie registrácie zapíše a porovná s odtlačkom.
 *
 * Pre každý stav sa pri prvom vykreslení zachytí zoznam volaní `useEffect` a `useLayoutEffect`: druh, počet závislostí
 * a podpis kódu (prvých 40 znakov z jeho identifikátorov, bez komentárov, počítadiel pokrytia a slov `return` a `else`,
 * takže sonda dáva rovnaký výsledok aj pri behu s `--coverage`). Prvých 40 znakov prežije premenovanie `post.id` na
 * `postId` pri presune do hooku a pritom zachytí zmenu poradia. Stavy sú rovnaké ako v odtlačku HTML (vrstvy sa otvárajú
 * až po prvom pripojení karty, preto majú rovnaký zoznam ako ich základná karta a nezopakúvajú sa).
 *
 * PRAVIDLÁ: počas delenia sa súbor ani jeho `.snap` NEUPRAVUJÚ a odtlačok sa NIKDY neaktualizuje (`-u`); rozdiel
 * znamená, že presun zmenil poradie efektov. Jediná povolená zmena je premenovanie, ktoré sa uvedie v texte commitu.
 */

import { render } from '@testing-library/react';
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

type Stav = { name: string; post?: Over; props?: Over; mobile?: boolean; overlay?: boolean };

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
  { name: 'mobil: karta s fotkou', post: { images: [img(11)] }, mobile: true },
  { name: 'mobil: karta s textom', mobile: true },
];

/**
 * Podpis kódu efektu: prvých 40 znakov z jeho identifikátorov. Pokrytie (istanbul) vkladá do funkcií komentáre,
 * počítadlá, zátvorky, bloky okolo jednoriadkových `if` a `return` pri výrazoch; z identifikátorov sa nič z toho
 * neprejaví (slová `return` a `else` sa vynechávajú), takže sonda dáva rovnaký výsledok aj pri behu s pokrytím.
 */
const podpisKodu = (zdroj: string) =>
  (
    zdroj
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/cov_[a-z0-9]+\(\)\.[fsb](\[\d+\])+(\+\+)?/g, '')
      .match(/[A-Za-z_$][\w$]*/g) ?? []
  )
    .filter((slovo) => slovo !== 'return' && slovo !== 'else')
    .join('.')
    .slice(0, 40);

/** Vykreslí kartu a vráti zoznam registrácií efektov v poradí: `druh:počet závislostí:začiatok kódu`. */
function poradieEfektov(strom: React.ReactElement): string[] {
  const React = jest.requireActual('react');
  const zaznam: string[] = [];
  const povodneEfekty = React.useEffect;
  const povodneVrstvove = React.useLayoutEffect;
  const sledovat =
    (druh: string, povodna: (fn: unknown, deps?: unknown[]) => unknown) =>
    (fn: unknown, deps?: unknown[]) => {
      zaznam.push(`${druh}:${deps ? deps.length : 'bez'}:${podpisKodu(String(fn))}`);
      return povodna(fn, deps);
    };
  React.useEffect = sledovat('E', povodneEfekty);
  React.useLayoutEffect = sledovat('L', povodneVrstvove);
  try {
    render(strom);
  } finally {
    React.useEffect = povodneEfekty;
    React.useLayoutEffect = povodneVrstvove;
  }
  return zaznam;
}

describe('dočasná sonda poradia efektov karty príspevku (R45, zmaže ju K55)', () => {
  beforeEach(() => {
    mockIsMobile = false;
    resetOverlayLayers();
    document.body.innerHTML = '';
  });

  it.each(STAVY)('$name', (stav) => {
    mockIsMobile = stav.mobile === true;
    const karta = <FeedPostCard post={base(stav.post) as unknown as FeedPost} {...stav.props} />;

    const poradie = poradieEfektov(
      stav.overlay ? <FeedPostOverlayProvider>{karta}</FeedPostOverlayProvider> : karta,
    );

    expect(poradie.length).toBeGreaterThan(10);
    expect(poradie.join('\n')).toMatchSnapshot();
  });
});
