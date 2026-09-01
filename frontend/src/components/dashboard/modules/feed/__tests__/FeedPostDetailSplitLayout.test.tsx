/**
 * Dvojstĺpcové okno detailu – príspevok S FOTKOU (desktop).
 *
 * Overuje sa rozdelenie na stĺpce, poradie v ľavom stĺpci, pružná fotka,
 * a hlavne DVE veci, na ktorých rozloženie stojí:
 *  - ľavý stĺpec sa nedá scrollovať za ŽIADNYCH okolností (ani pri caption na
 *    hranici 500 znakov, plne rozbalenom),
 *  - jediné scrollovateľné miesto v okne je zoznam komentárov a má appkinu
 *    utilitu `subtle-scrollbar` (svetlý aj tmavý režim rieši globals.css).
 *
 * jsdom nelayoutuje, takže výšky sa neoverujú v pixeloch – kontrolujú sa
 * triedy, ktoré o rozložení rozhodujú, presne ako v ostatných testoch okna.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostDetailOverlay from '../FeedPostDetailOverlay';
import { hasVisibleFeedPhoto } from '../FeedPostDetailSplitLayout';
import { BOUNDED_EXPANDED_MAX_HEIGHT } from '../FeedPostCaption';
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

const author = {
  id: 10,
  display_name: 'Jana',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};

function image(id: number, status: string = 'approved') {
  return {
    id,
    status,
    thumbnail_url: `http://api.test/${id}-t.webp`,
    large_url: `http://api.test/${id}-l.webp`,
  } as FeedPost['images'][number];
}

function makePost(overrides: Partial<FeedPost> = {}): FeedPost {
  return {
    id: 7,
    post_type: 'free_post',
    caption: 'Text príspevku',
    author,
    images: [image(11)],
    shared_content: null,
    shared_content_unavailable: false,
    tagged_users: [],
    likes_count: 2,
    comments_count: 1,
    is_liked_by_me: false,
    can_manage: false,
    created_at: '2026-01-01T10:00:00Z',
    ...overrides,
  } as FeedPost;
}

async function renderOverlay(post = makePost()) {
  mockedGetPost.mockResolvedValue(post);
  render(<FeedPostDetailOverlay postId={post.id} onClose={jest.fn()} />);
  await screen.findByTestId('feed-post-card');
}

/**
 * jsdom nelayoutuje – „presahuje text orezanie?" sa nastavuje priamo na uzle,
 * rovnako ako v teste samotného textu príspevku.
 */
function stubCaptionOverflow() {
  Object.defineProperty(HTMLParagraphElement.prototype, 'clientHeight', {
    configurable: true,
    get() {
      return this.dataset.testid === 'feed-post-caption' ? 200 : 0;
    },
  });
  Object.defineProperty(HTMLParagraphElement.prototype, 'scrollHeight', {
    configurable: true,
    get() {
      if (this.dataset.testid !== 'feed-post-caption') return 0;
      return this.className.includes('line-clamp') ? 4000 : 200;
    },
  });
}

/** Triedy, ktorými Tailwind zapína scrollovanie (nie `overscroll-*`). */
const SCROLLABLE_CLASS = /(^|\s)overflow(-y)?-(auto|scroll)(\s|$)/;

/** Všetky uzly v okne, ktoré sa dajú scrollovať. */
function scrollableNodes(root: HTMLElement): Element[] {
  return Array.from(root.querySelectorAll('*')).filter((node) =>
    SCROLLABLE_CLASS.test(node.className.toString()),
  );
}

afterEach(() => {
  Reflect.deleteProperty(HTMLParagraphElement.prototype, 'clientHeight');
  Reflect.deleteProperty(HTMLParagraphElement.prototype, 'scrollHeight');
});

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

describe('kedy sa rozloženie zapína', () => {
  it('treats a usable photo as a photo post', () => {
    expect(hasVisibleFeedPhoto([image(11)])).toBe(true);
    // Rozpracovaná fotka sa kreslí ako stavová plocha, takže sa počíta.
    expect(hasVisibleFeedPhoto([image(11, 'pending')])).toBe(true);
  });

  it('treats no photo or a rejected one as text-only', () => {
    expect(hasVisibleFeedPhoto([])).toBe(false);
    // Zamietnutú fotku karusel nekreslí – ostal by prázdny ľavý stĺpec.
    expect(hasVisibleFeedPhoto([image(11, 'rejected')])).toBe(false);
    expect(hasVisibleFeedPhoto(undefined)).toBe(false);
  });

  it('keeps a text-only post on the untouched single-column layout', async () => {
    await renderOverlay(makePost({ images: [] }));

    expect(screen.queryByTestId('feed-post-overlay-split')).not.toBeInTheDocument();
    expect(screen.getByTestId('feed-post-overlay-fixed')).toBeInTheDocument();
    // Výška ostáva STROPOM – krátky text drží okno nízke.
    expect(screen.getByTestId('feed-post-overlay').className).toContain(
      'max-h-[95vh]',
    );
  });
});

describe('rozdelenie na stĺpce', () => {
  it('splits the window into a 56/44 pair inside the existing frame', async () => {
    await renderOverlay();

    const overlay = screen.getByTestId('feed-post-overlay');
    // Vonkajší rámec ostáva nezmenený…
    expect(overlay.className).toContain('max-w-[54rem]');
    // …výška je ale PEVNÁ: pružná fotka má `flex-1`, ktoré potrebuje
    // definitívnu výšku rodiča (zo `max-h` by vyšla nula).
    expect(overlay.className).toContain('h-[95vh]');
    expect(overlay.className).not.toContain('max-h-[95vh]');

    expect(screen.getByTestId('feed-post-overlay-media').className).toContain(
      'w-[56%]',
    );
    expect(screen.getByTestId('feed-post-overlay-comments').className).toContain(
      'w-[44%]',
    );
  });

  it('keeps header, caption, photo and actions together in the left column', async () => {
    await renderOverlay();

    const media = screen.getByTestId('feed-post-overlay-media');
    const order = Array.from(
      media.querySelectorAll(
        'header, [data-testid="feed-post-caption"], [data-testid="feed-post-image"], footer',
      ),
    ).map((node) => node.getAttribute('data-testid') ?? node.tagName.toLowerCase());

    expect(order).toEqual([
      'header',
      'feed-post-caption',
      'feed-post-image',
      'footer',
    ]);
    expect(within(media).getByTestId('feed-like-button')).toBeInTheDocument();
    expect(within(media).getByTestId('feed-share-button')).toBeInTheDocument();
  });

  it('puts nothing but the comments in the right column', async () => {
    await renderOverlay();

    const comments = screen.getByTestId('feed-post-overlay-comments');
    expect(
      within(comments).getByRole('heading', { name: 'Komentáre' }),
    ).toBeInTheDocument();
    expect(within(comments).getByTestId('feed-post-comments')).toBeInTheDocument();
    // Pole na nový komentár patrí do pravého stĺpca, mimo scrollovanej časti.
    const composer = within(comments).getByLabelText('Napíš komentár...');
    expect(
      within(comments).getByTestId('feed-comments-scroll').contains(composer),
    ).toBe(false);

    // Fotka ani akcie sa do pravého stĺpca nesmú dostať.
    expect(within(comments).queryByTestId('feed-post-image')).toBeNull();
    expect(within(comments).queryByTestId('feed-like-button')).toBeNull();
  });

  it('leaves the carousel controls working inside the flexible height', async () => {
    await renderOverlay(makePost({ images: [image(11), image(12)] }));

    const media = screen.getByTestId('feed-post-overlay-media');
    // Vnútorná logika karuselu sa nemení – len jeho kontajner je pružný.
    expect(within(media).getByTestId('feed-post-image').className).toContain(
      'flex-1',
    );
    expect(within(media).getByText('1/2')).toBeInTheDocument();

    await userEvent.click(within(media).getByTestId('feed-image-next'));

    expect(within(media).getByText('2/2')).toBeInTheDocument();
  });
});

describe('ľavý stĺpec ustupuje fotkou, nie scrollovaním', () => {
  /**
   * V ľavom stĺpci sa bežný obsah zmestí – zmenšuje sa výhradne fotka.
   *
   * Scrollovať sa dá jedine cez POISTKY, ktoré držia krajné kombinácie
   * dosiahnuteľné: samotný stĺpec (`min-h-[8rem]` na fotke ho zapne, keď pevné
   * časti vyčerpajú výšku) a strop rozbaleného textu (`captionCap`). Nič iné
   * v stĺpci scrollovateľné byť nesmie – viď hlavičku
   * `FeedPostDetailSplitLayout`.
   */
  function expectLeftColumnShrinksThePhotoOnly({ captionCap = false } = {}) {
    const media = screen.getByTestId('feed-post-overlay-media');
    expect(media.className).toContain('min-h-0');
    // Poistka stĺpca vyzerá ako zvyšok appky, nie ako systémový scrollbar.
    expect(media.className).toContain('overflow-y-auto');
    expect(media.className).toContain('subtle-scrollbar');
    expect(scrollableNodes(media)).toEqual(
      captionCap ? [screen.getByTestId('feed-post-caption')] : [],
    );
  }

  it('gives the photo the leftover height and the rest a fixed one', async () => {
    await renderOverlay();

    expectLeftColumnShrinksThePhotoOnly();

    const media = screen.getByTestId('feed-post-overlay-media');
    const card = within(media).getByTestId('feed-post-card');
    // Pevné bloky: hlavička, text aj riadok akcií.
    expect(card.querySelector('header')?.className).toContain('shrink-0');
    expect(card.querySelector('footer')?.className).toContain('shrink-0');
    expect(
      screen.getByTestId('feed-post-caption').parentElement?.parentElement
        ?.className,
    ).toContain('shrink-0');
    // Jediná pružná časť je médiová plocha.
    const fill = within(media).getByTestId('feed-post-media-fill');
    expect(fill.className).toContain('flex-1');
    // Podlaha, nie výška: fotka sa smie zmenšovať, ale nikdy nezmizne.
    expect(fill.className).toContain('min-h-[8rem]');
    const photo = within(media).getByTestId('feed-post-image');
    expect(photo.className).toContain('flex-1');
    expect(photo.className).toContain('min-h-0');
    // Žiadna pevná výška fotky – tá by rozbaleniu textu neustúpila.
    expect(photo.className).not.toContain('h-80');
  });

  it('shrinks the photo instead of scrolling when the caption is expanded', async () => {
    stubCaptionOverflow();
    await renderOverlay(makePost({ caption: 'Veľmi dlhý text príspevku.' }));

    await userEvent.click(await screen.findByTestId('feed-post-caption-toggle'));

    const caption = screen.getByTestId('feed-post-caption');
    expect(caption.className).not.toContain('line-clamp');
    // Fotka ostáva pružná, takže rozbalený text ju len zmenší…
    expect(screen.getByTestId('feed-post-image').className).toContain('flex-1');
    // …a v stĺpci sa aj tak nedá scrollovať.
    expectLeftColumnShrinksThePhotoOnly({ captionCap: true });
  });

  it('still leaves the photo room with a caption at the 500-character limit', async () => {
    stubCaptionOverflow();
    // Presne na hranici, ktorú vynucuje FE (`CAPTION_MAX_LENGTH`) aj BE
    // (`MAX_TEXT_LENGTH`) – dlhší caption sa do príspevku nedostane.
    const maxCaption = 'Ab '.repeat(166) + 'cd';
    expect(maxCaption).toHaveLength(500);
    await renderOverlay(makePost({ caption: maxCaption }));

    await userEvent.click(await screen.findByTestId('feed-post-caption-toggle'));

    const caption = screen.getByTestId('feed-post-caption');
    // Poistka stropu: text si vezme nanajvýš 40 % výšky okna, takže po
    // hlavičke (~3,75 rem) a akciách (~2,75 rem) ostáva fotke vždy aspoň
    // ~55 vh − 6,5 rem. Preto sa stĺpec nemá ako pretiecť ani v najhoršom
    // prípade (text plný vynútených zalomení).
    expect(caption.className).toContain('max-h-[40vh]');
    expect(caption.className).not.toContain('max-h-[25vh]');
    expect(screen.getByTestId('feed-post-image').className).toContain('flex-1');
    expectLeftColumnShrinksThePhotoOnly({ captionCap: true });
  });

  it('keeps the safety cap of the caption on the app scrollbar style', async () => {
    stubCaptionOverflow();
    await renderOverlay(makePost({ caption: 'Veľmi dlhý text príspevku.' }));

    await userEvent.click(await screen.findByTestId('feed-post-caption-toggle'));

    const caption = screen.getByTestId('feed-post-caption');
    // Strop je poistka pre text plný zalomení; keby sa raz nadobudla, musí
    // vyzerať ako zvyšok appky a dať sa dosiahnuť aj klávesnicou.
    expect(caption.className).toContain('subtle-scrollbar');
    expect(caption).toHaveAttribute('tabindex', '0');
    expect(caption).toHaveAttribute('role', 'region');
  });
});

describe('scrollbar komentárov', () => {
  it('is the only place a normal post actually scrolls', async () => {
    await renderOverlay();

    const overlay = screen.getByTestId('feed-post-overlay');
    // Ľavý stĺpec má scroll len ako POISTKU pre krajnú kombináciu obsahu;
    // pri bežnom príspevku sa v ňom všetko zmestí. Okrem týchto dvoch uzlov
    // nesmie byť v okne scrollovateľné nič ďalšie.
    expect(new Set(scrollableNodes(overlay))).toEqual(
      new Set([
        screen.getByTestId('feed-post-overlay-media'),
        screen.getByTestId('feed-comments-scroll'),
      ]),
    );
    // Obe poistky vyzerajú rovnako ako zvyšok appky.
    scrollableNodes(overlay).forEach((node) => {
      expect(node.className.toString()).toContain('subtle-scrollbar');
    });
  });

  it('uses the app subtle-scrollbar utility, not the default one', async () => {
    await renderOverlay();

    const scroll = screen.getByTestId('feed-comments-scroll');
    // `subtle-scrollbar` je jediný scrollbar štýl, ktorý sem patrí – tenký a
    // zaoblený, so svetlým aj tmavým variantom v globals.css (rovnako ako
    // composer, zdieľací dialóg či zoznam lajkujúcich).
    expect(scroll.className).toContain('subtle-scrollbar');
    expect(scroll.className).toContain('overflow-y-auto');
    expect(scroll.className).not.toContain('review-modal-scrollbar');
    expect(scroll.className).not.toContain('scrollbar-hide');
    // Zoznam vypĺňa stĺpec, takže scrollbar je vidno na celej jeho výške.
    expect(scroll.className).toContain('h-full');
  });

  it('keeps the comments column itself unscrollable', async () => {
    await renderOverlay();

    // Scrolluje sa ZOZNAM, nie celý stĺpec – inak by odscrolloval aj nadpis
    // a pole na nový komentár.
    const comments = screen.getByTestId('feed-post-overlay-comments');
    expect(SCROLLABLE_CLASS.test(comments.className)).toBe(false);
    expect(comments.className).toContain('min-h-0');
  });
});

describe('rozpočet výšky ľavého stĺpca', () => {
  /** Číslo z triedy typu `max-h-[40vh]`. */
  function vhOf(className: string): number {
    const match = className.match(/max-h-\[(\d+)vh\]/);
    expect(match).not.toBeNull();
    return Number(match?.[1]);
  }

  /** `h-[95vh]` na okne pri dvojstĺpcovom rozložení. */
  const WINDOW_VH = 95;
  // Pevné bloky v pixeloch: hlavička (~3,75 rem), riadok akcií (~2,75 rem),
  // odsadenie textu (py-3) a prepínač „Viac"/„Menej".
  const FIXED_PX = 60 + 44 + 24 + 20;
  /** Podlaha médiovej plochy – `min-h-[8rem]` na `feed-post-media-fill`. */
  const PHOTO_FLOOR_PX = 128;

  /** Koľko px zvýši fotke, keď text vyčerpá svoj strop. */
  function leftoverForPhoto(viewportPx: number, extraPx = 0): number {
    const captionCapVh = vhOf(BOUNDED_EXPANDED_MAX_HEIGHT.roomy);
    return (
      (viewportPx * (WINDOW_VH - captionCapVh)) / 100 - FIXED_PX - extraPx
    );
  }

  it('lets a post without tags fit without the safety valve', () => {
    // Strop textu musí ostať pod výškou okna aj s pevnými blokmi…
    expect(vhOf(BOUNDED_EXPANDED_MAX_HEIGHT.roomy)).toBeLessThan(WINDOW_VH);

    // …a bez označených ľudí zvýši fotke viac než jej podlaha na každej bežnej
    // výške obrazovky, takže sa poistka stĺpca vôbec nezapne. Strop sa číta
    // priamo z komponentu, takže jeho zdvihnutie tento test rozbije.
    for (const viewportPx of [600, 700, 800, 900, 1080, 1440]) {
      expect(leftoverForPhoto(viewportPx)).toBeGreaterThan(PHOTO_FLOOR_PX);
    }
  });

  it('relies on the safety valve once tags are added to the maximum text', () => {
    // Plný zoznam označených (10) sa pri šírke stĺpca zalomí do ~3 riadkov
    // chipov aj s odsadením – práve táto KOMBINÁCIA vie na nižšom okne
    // prerásť dostupnú výšku. Vtedy fotku drží podlaha a dosiahnuteľnosť
    // riadku akcií zabezpečí scroll stĺpca; test len pomenúva, že sa na to
    // spoliehame (nie je to prehliadnutý prípad).
    const tagsPx = 104;
    expect(leftoverForPhoto(600, tagsPx)).toBeLessThan(PHOTO_FLOOR_PX);
    // Na bežnom notebooku sa aj tak zmestí všetko.
    expect(leftoverForPhoto(900, tagsPx)).toBeGreaterThan(PHOTO_FLOOR_PX);
  });

  it('gives the split layout more room for text than the single-column one', () => {
    // V jednom stĺpci sú pod textom ešte komentáre, takže tam smie text menej.
    expect(vhOf(BOUNDED_EXPANDED_MAX_HEIGHT.roomy)).toBeGreaterThan(
      vhOf(BOUNDED_EXPANDED_MAX_HEIGHT.compact),
    );
  });
});

describe('štýl scrollbaru v globals.css', () => {
  // Appka mala opakovane problém so scrollbarom, ktorý mal štýl len v svetlom
  // režime. Utilita je zdieľaná, takže sa oplatí strážiť oba varianty priamo –
  // trieda na správnom elemente sama o sebe nestačí.
  const css = readFileSync(
    join(__dirname, '../../../../../app/globals.css'),
    'utf-8',
  );

  it('defines the subtle scrollbar for the light mode', () => {
    expect(css).toContain('.subtle-scrollbar::-webkit-scrollbar-thumb');
    // Firefox nemá `::-webkit-*` – bez `scrollbar-color` by tam ostal systémový.
    expect(css).toMatch(/\.subtle-scrollbar\s*\{[^}]*scrollbar-width:\s*thin/);
    expect(css).toMatch(/\.subtle-scrollbar\s*\{[^}]*scrollbar-color:/);
  });

  it('defines the subtle scrollbar for the dark mode too', () => {
    // Tailwind je v projekte na `darkMode: 'class'`, takže tmavý variant musí
    // visieť práve na `.dark`.
    expect(css).toContain('.dark .subtle-scrollbar::-webkit-scrollbar-thumb');
    expect(css).toMatch(/\.dark\s+\.subtle-scrollbar\s*\{[^}]*scrollbar-color:/);
  });
});

describe('krajná kombinácia obsahu nad fotkou', () => {
  /** Plný počet označených (`MAX_FEED_POST_TAGS` = 10 na backende). */
  function tenTaggedUsers() {
    return Array.from({ length: 10 }, (_unused, index) => ({
      id: index + 1,
      display_name: `Označený Používateľ ${index + 1}`,
      slug: `oznaceny-${index + 1}`,
      user_type: 'individual',
      avatar_url: null,
      can_remove_tag: false,
    })) as FeedPost['tagged_users'];
  }

  it('keeps the photo and the action row reachable with max text and full tags', async () => {
    stubCaptionOverflow();
    const maxCaption = 'Ab '.repeat(166) + 'cd';
    expect(maxCaption).toHaveLength(500);

    await renderOverlay(
      makePost({ caption: maxCaption, tagged_users: tenTaggedUsers() }),
    );
    await userEvent.click(await screen.findByTestId('feed-post-caption-toggle'));

    const media = screen.getByTestId('feed-post-overlay-media');

    // Označení sú v hre tiež – práve ich súčet s rozbaleným textom vie
    // vyčerpať výšku stĺpca.
    expect(within(media).getAllByTestId(/^feed-post-tag-\d+$/)).toHaveLength(10);

    // 1) Fotka nezmizne: má podlahu, nie len „ber, čo zvýši".
    expect(within(media).getByTestId('feed-post-media-fill').className).toContain(
      'min-h-[8rem]',
    );
    expect(within(media).getByTestId('feed-post-image')).toBeInTheDocument();

    // 2) Riadok akcií ostáva v stĺpci a stĺpec sa dá doscrollovať, takže sa
    //    lajk, komentáre ani zdieľanie nemôžu ocitnúť mimo dosahu.
    const actions = media.querySelector('footer');
    expect(actions).not.toBeNull();
    expect(media.contains(actions)).toBe(true);
    expect(media.className).toContain('overflow-y-auto');
    expect(within(media).getByTestId('feed-like-button')).toBeInTheDocument();
    expect(within(media).getByTestId('feed-share-button')).toBeInTheDocument();
  });
});

describe('šírka obrazovky rozhoduje spolu s fotkou', () => {
  it('keeps the single-column layout below the desktop breakpoint', async () => {
    // Otvorené okno sa pri zúžení prehliadača nezatvára, takže bez tejto
    // podmienky by dva stĺpce ostali aj na obrazovke, kde by z nich boli dva
    // nepoužiteľne úzke pruhy.
    mockIsMobile = true;
    await renderOverlay();

    expect(screen.queryByTestId('feed-post-overlay-split')).not.toBeInTheDocument();
    expect(screen.getByTestId('feed-post-overlay-fixed')).toBeInTheDocument();
    // Rovnaké správanie ako pri text-only príspevku: výška je zase len strop.
    expect(screen.getByTestId('feed-post-overlay').className).toContain(
      'max-h-[95vh]',
    );
    // Fotka sa nestráca – len sa vykresľuje v jednom stĺpci ako doteraz.
    expect(screen.getByTestId('feed-post-image')).toBeInTheDocument();
  });

  it('uses the two-column layout above it, as before', async () => {
    mockIsMobile = false;
    await renderOverlay();

    expect(screen.getByTestId('feed-post-overlay-split')).toBeInTheDocument();
  });
});
