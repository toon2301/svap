/**
 * Okno detailu na počítači: príspevok len s textom v dvoch stĺpcoch (K58, krok 3, nález 367, R73).
 *
 * Od 1 024 px má každý príspevok dva stĺpce a okno 864 px. Príspevok len s textom (aj repost textového príspevku) nemá
 * nič pružné, čo by pohltilo výšku, preto je okno vysoké podľa obsahu (najmenej 20 rem, najviac 95 % obrazovky) a text
 * sa ukáže celý, bez „Viac"; posúva sa len text vľavo a komentáre vpravo. Okno s fotkou, ponukou a portfóliom ostáva na
 * pevnej výške `h-[95vh]`. Pod 1 024 px sa nič nemení (576 px, jeden stĺpec, text s „Viac").
 *
 * jsdom nelayoutuje, takže sa kontrolujú triedy, ktoré o rozmeroch rozhodujú. „Presahuje text riadky?" sa nastavuje na
 * uzle (`scrollHeight` proti `clientHeight`): orezaný text presahuje, neorezaný sa zmestí, tak ako v prehliadači.
 */

import { act, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import FeedPostDetailOverlay from '../FeedPostDetailOverlay';
import FeedPostDetailSplitLayout from '../FeedPostDetailSplitLayout';
import { resetOverlayLayers } from '../../shared/overlayLayers';
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

const DLHY_TEXT = 'Dlhý text príspevku, ktorý by v okne s fotkou presahoval desať riadkov.';

const autor = {
  id: 10,
  display_name: 'Jana',
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

const ZAKLAD = {
  id: 7,
  author: autor,
  tagged_users: [],
  likes_count: 1,
  comments_count: 0,
  is_liked_by_me: false,
  can_manage: false,
  created_at: '2026-01-01T10:00:00Z',
  shared_content_unavailable: false,
};

/** Voľný príspevok s dlhým textom, s jednou schválenou fotkou alebo bez nej. */
function volnyPrispevok(sFotkou: boolean): FeedPost {
  return {
    ...ZAKLAD,
    post_type: 'free_post',
    caption: DLHY_TEXT,
    images: sFotkou
      ? [
          {
            id: 11,
            status: 'approved',
            thumbnail_url: 'http://api.test/11-t.webp',
            large_url: 'http://api.test/11-l.webp',
          },
        ]
      : [],
    shared_content: null,
  } as unknown as FeedPost;
}

/**
 * Zdieľaná ponuka alebo portfólio; `zdrojZmizol` = zdroj medzitým zmazaný (snapshot si nechá typ, ale bez živých
 * údajov, tak ako ho posiela backend).
 */
function zdielanaKarta(
  typ: 'offer' | 'portfolio_item',
  zdrojZmizol = false,
): FeedPost {
  const jePonuka = typ === 'offer';
  const zivy = !zdrojZmizol;
  return {
    ...ZAKLAD,
    post_type: jePonuka ? 'shared_offer' : 'shared_portfolio_item',
    caption: 'Odporúčam.',
    images: [],
    shared_content: {
      type: typ,
      title: jePonuka ? 'Programovanie' : 'Weby',
      category: 'it',
      caption: '',
      id: zivy ? 42 : null,
      owner: zivy ? povodnyAutor : null,
      owner_display_name: 'Peter',
      thumbnail_url: null,
      is_seeking: zivy && jePonuka ? false : null,
      price_negotiable: zivy && jePonuka ? false : null,
      price_from: zivy && jePonuka ? '25' : null,
      price_currency: zivy && jePonuka ? '€' : '',
    },
    shared_content_unavailable: !zivy,
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

/** Texty príspevku presahujú, kým sú orezané; neorezané sa zmestia. */
function nastavVysky() {
  const idecka = ['feed-post-caption', 'feed-shared-caption'];
  Object.defineProperty(HTMLParagraphElement.prototype, 'clientHeight', {
    configurable: true,
    get() {
      return idecka.includes(this.dataset.testid) ? 60 : 0;
    },
  });
  Object.defineProperty(HTMLParagraphElement.prototype, 'scrollHeight', {
    configurable: true,
    get() {
      if (!idecka.includes(this.dataset.testid)) return 0;
      return this.className.includes('line-clamp') ? 900 : 60;
    },
  });
}

beforeEach(() => {
  mockIsMobile = false;
  jest.clearAllMocks();
  resetOverlayLayers();
  mockedListComments.mockResolvedValue({
    results: [],
    next: null,
    previous: null,
    count: 0,
  });
});

afterEach(() => {
  // Výšky sú nastavené na prototype – bez upratania by pretiekli do ďalšieho testu.
  Reflect.deleteProperty(HTMLParagraphElement.prototype, 'clientHeight');
  Reflect.deleteProperty(HTMLParagraphElement.prototype, 'scrollHeight');
});

async function otvorOkno(prispevok: FeedPost) {
  mockedGetPost.mockResolvedValue(prispevok);
  render(<FeedPostDetailOverlay postId={prispevok.id} onClose={jest.fn()} />);
  await screen.findByTestId('feed-post-card');
  return screen.getByTestId('feed-post-overlay');
}

/** Obal textu: rodič odseku je koreň `FeedPostCaption`, jeho rodič je obal textu (alebo blok reposta). */
function obalTextu(): HTMLElement {
  return screen.getByTestId('feed-post-caption').parentElement
    ?.parentElement as HTMLElement;
}

// `toHaveClass` porovnáva celé triedy: trieda zlepená s vedľajšou by prešla cez `toContain`.
function jeSiroke(okno: HTMLElement) {
  expect(okno).toHaveClass('max-w-[54rem]');
  expect(okno).not.toHaveClass('max-w-xl');
}

function jeUzke(okno: HTMLElement) {
  expect(okno).toHaveClass('max-w-xl');
  expect(okno).not.toHaveClass('max-w-[54rem]');
}

const PRISPEVKY_LEN_S_TEXTOM: Array<[string, () => FeedPost]> = [
  ['príspevok len s textom', () => volnyPrispevok(false)],
  ['repost textového príspevku', () => repost(false)],
];

const PRISPEVKY_S_PEVNOU_VYSKOU: Array<[string, () => FeedPost]> = [
  ['príspevok s fotkou', () => volnyPrispevok(true)],
  ['repost príspevku s fotkou', () => repost(true)],
  ['ponuka', () => zdielanaKarta('offer')],
  ['portfólio', () => zdielanaKarta('portfolio_item')],
  ['ponuka, ktorej zdroj zmizol', () => zdielanaKarta('offer', true)],
];

describe('okno príspevku len s textom na počítači', () => {
  it.each(PRISPEVKY_LEN_S_TEXTOM)(
    '%s: dva stĺpce a okno 864 px s výškou podľa obsahu',
    async (_nazov, vytvor) => {
      const okno = await otvorOkno(vytvor());

      expect(within(okno).getByTestId('feed-post-overlay-split')).toBeInTheDocument();
      expect(within(okno).queryByTestId('feed-post-overlay-fixed')).toBeNull();
      jeSiroke(okno);
      expect(okno).toHaveClass('max-h-[95vh]', 'min-h-[20rem]');
      expect(okno).not.toHaveClass('h-[95vh]');
    },
  );

  it.each(PRISPEVKY_LEN_S_TEXTOM)(
    '%s: komentáre sú vpravo, karta vľavo',
    async (_nazov, vytvor) => {
      const okno = await otvorOkno(vytvor());

      const vlavo = within(okno).getByTestId('feed-post-overlay-media');
      const vpravo = within(okno).getByTestId('feed-post-overlay-comments');
      expect(vlavo).toContainElement(screen.getByTestId('feed-post-card'));
      expect(vpravo).toContainElement(screen.getByTestId('feed-post-comments'));
      expect(vlavo).not.toContainElement(screen.getByTestId('feed-post-comments'));
    },
  );
});

describe('kostra a chyba pri načítaní na počítači', () => {
  it('kostra pri načítaní má široké okno so stropom výšky', () => {
    mockedGetPost.mockReturnValue(new Promise(() => undefined));
    render(<FeedPostDetailOverlay postId={7} onClose={jest.fn()} />);

    expect(screen.getByTestId('feed-post-overlay-loading')).toBeInTheDocument();
    const okno = screen.getByTestId('feed-post-overlay');
    jeSiroke(okno);
    expect(okno).toHaveClass('max-h-[95vh]');
    expect(okno).not.toHaveClass('h-[95vh]');
    expect(okno).not.toHaveClass('min-h-[20rem]');
  });

  it('okno s chybou načítania je široké so stropom výšky', async () => {
    mockedGetPost.mockRejectedValue(new Error('chyba'));
    render(<FeedPostDetailOverlay postId={7} onClose={jest.fn()} />);

    await screen.findByTestId('feed-post-overlay-error');
    const okno = screen.getByTestId('feed-post-overlay');
    jeSiroke(okno);
    expect(okno).toHaveClass('max-h-[95vh]');
    expect(okno).not.toHaveClass('h-[95vh]');
    expect(okno).not.toHaveClass('min-h-[20rem]');
  });

  it.each(PRISPEVKY_LEN_S_TEXTOM)(
    '%s: po načítaní z kostry sa okno nezúži ani nerozšíri',
    async (_nazov, vytvor) => {
      let dokonci: (prispevok: FeedPost) => void = () => undefined;
      mockedGetPost.mockReturnValue(
        new Promise<FeedPost>((resolve) => {
          dokonci = resolve;
        }),
      );
      render(<FeedPostDetailOverlay postId={7} onClose={jest.fn()} />);
      jeSiroke(screen.getByTestId('feed-post-overlay'));

      await act(async () => {
        dokonci(vytvor());
      });
      await screen.findByTestId('feed-post-card');

      const okno = screen.getByTestId('feed-post-overlay');
      jeSiroke(okno);
      expect(okno).toHaveClass('max-h-[95vh]', 'min-h-[20rem]');
    },
  );

  it('príspevok s fotkou dostane po načítaní z kostry pevnú výšku, šírka sa nemení', async () => {
    let dokonci: (prispevok: FeedPost) => void = () => undefined;
    mockedGetPost.mockReturnValue(
      new Promise<FeedPost>((resolve) => {
        dokonci = resolve;
      }),
    );
    render(<FeedPostDetailOverlay postId={7} onClose={jest.fn()} />);
    jeSiroke(screen.getByTestId('feed-post-overlay'));

    await act(async () => {
      dokonci(volnyPrispevok(true));
    });
    await screen.findByTestId('feed-post-card');

    const okno = screen.getByTestId('feed-post-overlay');
    jeSiroke(okno);
    expect(okno).toHaveClass('h-[95vh]');
    expect(okno).not.toHaveClass('min-h-[20rem]');
  });
});

/**
 * Otvorí okno na príspevku s `id` 7 (hneď sa načíta) a prepne ho na príspevok s `id` 99, ktorého odpoveď nikdy nedorazí.
 * Okno sa neodmountuje, takže kým sa nový príspevok načítava, `post` ešte drží predošlý.
 */
async function otvorAPrepni(predosly: FeedPost) {
  mockedGetPost.mockImplementation((id) =>
    id === predosly.id ? Promise.resolve(predosly) : new Promise<FeedPost>(() => undefined),
  );
  const onClose = jest.fn();
  const { rerender } = render(<FeedPostDetailOverlay postId={predosly.id} onClose={onClose} />);
  await screen.findByTestId('feed-post-card');

  rerender(<FeedPostDetailOverlay postId={99} onClose={onClose} />);
  await screen.findByTestId('feed-post-overlay-loading');
  return screen.getByTestId('feed-post-overlay');
}

describe('prepnutie na iný príspevok na počítači: kostra nededí výšku predošlého', () => {
  it.each([
    ['príspevok s fotkou', () => volnyPrispevok(true)],
    ['ponuka', () => zdielanaKarta('offer')],
    ['príspevok len s textom', () => volnyPrispevok(false)],
    ['repost textového príspevku', () => repost(false)],
  ])(
    'po prepnutí z príspevku (%s) je kostra široká so stropom výšky, bez pevnej a bez minimálnej výšky',
    async (_nazov, vytvor) => {
      const okno = await otvorAPrepni(vytvor());

      jeSiroke(okno);
      expect(okno).toHaveClass('max-h-[95vh]');
      expect(okno).not.toHaveClass('h-[95vh]');
      expect(okno).not.toHaveClass('min-h-[20rem]');
    },
  );
});

describe('okno s fotkou, ponukou a portfóliom ostáva na pevnej výške', () => {
  it.each(PRISPEVKY_S_PEVNOU_VYSKOU)(
    '%s: `h-[95vh]` bez `min-h-[20rem]`',
    async (_nazov, vytvor) => {
      const okno = await otvorOkno(vytvor());

      expect(within(okno).getByTestId('feed-post-overlay-split')).toBeInTheDocument();
      jeSiroke(okno);
      expect(okno).toHaveClass('h-[95vh]');
      expect(okno).not.toHaveClass('max-h-[95vh]');
      expect(okno).not.toHaveClass('min-h-[20rem]');
    },
  );
});

describe('text v okne len s textom je celý', () => {
  it('voľný príspevok: odsek bez orezania a bez „Viac", aj keď by orezaný presahoval', async () => {
    nastavVysky();
    await otvorOkno(volnyPrispevok(false));

    const odsek = screen.getByTestId('feed-post-caption');
    expect(odsek.className).not.toContain('line-clamp');
    expect(odsek).toHaveTextContent(DLHY_TEXT);
    expect(screen.queryByTestId('feed-post-caption-toggle')).toBeNull();
  });

  it('voľný príspevok: posúva sa obal textu v ľavom stĺpci, nie odsek', async () => {
    nastavVysky();
    const okno = await otvorOkno(volnyPrispevok(false));

    expect(obalTextu()).toHaveClass(
      'px-4',
      'py-3',
      'subtle-scrollbar',
      'min-h-0',
      'flex-1',
      'overflow-y-auto',
    );
    expect(obalTextu()).not.toHaveClass('shrink-0');
    expect(within(okno).getByTestId('feed-post-overlay-media')).toContainElement(obalTextu());
    const odsek = screen.getByTestId('feed-post-caption');
    expect(odsek.className).not.toMatch(/max-h-/);
    expect(odsek).not.toHaveClass('overflow-y-auto');
  });

  it('repost textového príspevku: text zdieľajúceho aj pôvodný text sú celé, bez „Viac"', async () => {
    nastavVysky();
    await otvorOkno(repost(false));

    const text = screen.getByTestId('feed-post-caption');
    const povodny = screen.getByTestId('feed-shared-caption');
    expect(text.className).not.toContain('line-clamp');
    expect(povodny.className).not.toContain('line-clamp');
    expect(screen.queryByTestId('feed-post-caption-toggle')).toBeNull();
    expect(screen.queryByTestId('feed-shared-caption-toggle')).toBeNull();
  });

  it('repost textového príspevku: blok so zdieľaným obsahom sa posúva a nie je pevný', async () => {
    nastavVysky();
    await otvorOkno(repost(false));

    expect(obalTextu()).toHaveClass('subtle-scrollbar', 'min-h-0', 'flex-1', 'overflow-y-auto');
    expect(obalTextu()).not.toHaveClass('shrink-0');
  });

  it('voľný príspevok s fotkou: text ostáva na 10 riadkoch s „Viac" a obal je pevný blok', async () => {
    nastavVysky();
    await otvorOkno(volnyPrispevok(true));

    expect(screen.getByTestId('feed-post-caption')).toHaveClass('line-clamp-[10]');
    expect(await screen.findByTestId('feed-post-caption-toggle')).toHaveTextContent('Viac');
    expect(obalTextu()).toHaveClass('px-4', 'py-3', 'shrink-0');
    expect(obalTextu()).not.toHaveClass('flex-1');
    expect(obalTextu()).not.toHaveClass('overflow-y-auto');
  });

  it('repost príspevku s fotkou: pôvodný text ostáva na 3 riadkoch s „Viac"', async () => {
    nastavVysky();
    await otvorOkno(repost(true));

    expect(screen.getByTestId('feed-shared-caption')).toHaveClass('line-clamp-3');
    expect(await screen.findByTestId('feed-shared-caption-toggle')).toHaveTextContent('Viac');
  });
});

describe('komentáre v pravom stĺpci', () => {
  it.each(PRISPEVKY_LEN_S_TEXTOM)(
    '%s: komentáre odovzdávajú výšku flexom, zoznam sa posúva a pole na komentár je mimo neho',
    async (_nazov, vytvor) => {
      const okno = await otvorOkno(vytvor());

      const vpravo = within(okno).getByTestId('feed-post-overlay-comments');
      const koren = within(vpravo).getByTestId('feed-post-comments');
      expect(koren.parentElement).toHaveClass('min-h-0', 'flex-1', 'flex', 'flex-col');
      expect(koren).toHaveClass('flex', 'min-h-0', 'flex-1', 'flex-col');
      expect(koren).not.toHaveClass('h-full');
      const zoznam = within(vpravo).getByTestId('feed-comments-scroll');
      expect(zoznam).toHaveClass('min-h-0', 'flex-1', 'overflow-y-auto');
      expect(zoznam).not.toHaveClass('h-full');
      expect(zoznam).not.toContainElement(within(vpravo).getByLabelText('Napíš komentár...'));
    },
  );

  it.each(PRISPEVKY_S_PEVNOU_VYSKOU)(
    '%s: komentáre držia percentuálnu výšku ako doteraz',
    async (_nazov, vytvor) => {
      const okno = await otvorOkno(vytvor());

      const vpravo = within(okno).getByTestId('feed-post-overlay-comments');
      const koren = within(vpravo).getByTestId('feed-post-comments');
      expect(koren.parentElement).toHaveClass('min-h-0', 'flex-1');
      expect(koren.parentElement).not.toHaveClass('flex');
      expect(koren).toHaveClass('h-full');
      expect(koren).not.toHaveClass('flex-1');
      const zoznam = within(vpravo).getByTestId('feed-comments-scroll');
      expect(zoznam).toHaveClass('h-full');
      expect(zoznam).not.toHaveClass('flex-1');
    },
  );
});

describe('okno pod 1 024 px sa nemení', () => {
  it('príspevok len s textom: jeden stĺpec, 576 px a strop výšky bez minima', async () => {
    mockIsMobile = true;
    const okno = await otvorOkno(volnyPrispevok(false));

    expect(within(okno).getByTestId('feed-post-overlay-fixed')).toBeInTheDocument();
    expect(within(okno).queryByTestId('feed-post-overlay-split')).toBeNull();
    jeUzke(okno);
    expect(okno).toHaveClass('max-h-[95vh]');
    expect(okno).not.toHaveClass('h-[95vh]');
    expect(okno).not.toHaveClass('min-h-[20rem]');
  });

  it('príspevok len s textom: text ostáva na 10 riadkoch s „Viac" a obal nie je pružný', async () => {
    mockIsMobile = true;
    nastavVysky();
    await otvorOkno(volnyPrispevok(false));

    expect(screen.getByTestId('feed-post-caption')).toHaveClass('line-clamp-[10]');
    expect(await screen.findByTestId('feed-post-caption-toggle')).toHaveTextContent('Viac');
    expect(obalTextu()).not.toHaveClass('flex-1');
    expect(obalTextu()).not.toHaveClass('overflow-y-auto');
  });

  it('repost textového príspevku: jeden stĺpec, 576 px a pôvodný text na 3 riadkoch s „Viac"', async () => {
    mockIsMobile = true;
    nastavVysky();
    const okno = await otvorOkno(repost(false));

    expect(within(okno).getByTestId('feed-post-overlay-fixed')).toBeInTheDocument();
    expect(within(okno).queryByTestId('feed-post-overlay-split')).toBeNull();
    jeUzke(okno);
    expect(okno).not.toHaveClass('min-h-[20rem]');
    expect(screen.getByTestId('feed-shared-caption')).toHaveClass('line-clamp-3');
    expect(await screen.findByTestId('feed-shared-caption-toggle')).toHaveTextContent('Viac');
  });

  it('komentáre pod príspevkom odovzdávajú výšku flexom ako doteraz', async () => {
    mockIsMobile = true;
    const okno = await otvorOkno(volnyPrispevok(false));

    const sekcia = within(okno).getByTestId('feed-post-overlay-comments');
    expect(sekcia).toHaveClass('flex', 'flex-col', 'flex-1', 'min-h-[7rem]', 'overflow-hidden');
    expect(within(sekcia).getByTestId('feed-comments-scroll')).toHaveClass(
      'min-h-0',
      'flex-1',
      'overflow-y-auto',
    );
  });
});

describe('dvojstĺpcové rozloženie bez vlastnosti `textOnly`', () => {
  function vykresliRozlozenie(post: FeedPost, textOnly?: boolean) {
    return render(
      <FeedPostDetailSplitLayout
        post={post}
        liveImages={post.images}
        commentsCount={0}
        onDeleted={jest.fn()}
        onPostUpdated={jest.fn()}
        onCommentsCountChange={jest.fn()}
        onCommentsTotalChange={jest.fn()}
        {...(textOnly === undefined ? {} : { textOnly })}
      />,
    );
  }

  it('predvolene sa správa ako doteraz: text s fotkou má 10 riadkov a „Viac“, komentáre držia výšku v percentách', async () => {
    nastavVysky();
    vykresliRozlozenie(volnyPrispevok(true));
    await screen.findByTestId('feed-post-card');

    expect(screen.getByTestId('feed-post-caption')).toHaveClass('line-clamp-[10]');
    expect(await screen.findByTestId('feed-post-caption-toggle')).toHaveTextContent('Viac');
    expect(obalTextu()).toHaveClass('shrink-0');
    const koren = screen.getByTestId('feed-post-comments');
    expect(koren).toHaveClass('h-full');
    expect(koren).not.toHaveClass('flex-1');
    expect(koren.parentElement).not.toHaveClass('flex');
  });

  it('s `textOnly` je text celý a komentáre idú flexom', async () => {
    nastavVysky();
    vykresliRozlozenie(volnyPrispevok(false), true);
    await screen.findByTestId('feed-post-card');

    expect(screen.getByTestId('feed-post-caption').className).not.toContain('line-clamp');
    expect(screen.queryByTestId('feed-post-caption-toggle')).toBeNull();
    const koren = screen.getByTestId('feed-post-comments');
    expect(koren).toHaveClass('flex-1');
    expect(koren.parentElement).toHaveClass('min-h-0', 'flex-1', 'flex', 'flex-col');
  });

  it('s `textOnly` false je správanie rovnaké ako bez vlastnosti', async () => {
    nastavVysky();
    vykresliRozlozenie(volnyPrispevok(true), false);
    await screen.findByTestId('feed-post-card');

    expect(screen.getByTestId('feed-post-caption')).toHaveClass('line-clamp-[10]');
    expect(screen.getByTestId('feed-post-comments')).toHaveClass('h-full');
  });
});
