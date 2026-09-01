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

jest.mock('@/hooks', () => ({
  useIsMobile: () => false,
  useIsMobileState: () => ({ isMobile: false, isResolved: true }),
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

describe('ľavý stĺpec sa nikdy nescrolluje', () => {
  /**
   * Ľavý stĺpec sa nedá scrollovať – ani sám, ani žiadny uzol v ňom.
   *
   * Jedinou povolenou výnimkou je POISTKA stropu rozbaleného textu
   * (`captionCap`): tá sa nadobudne až pri texte plnom vynútených zalomení a
   * práve ona drží záruku, že stĺpec nemá ako pretiecť. Bežný caption sa do
   * nej nedostane, viď hlavičku `FeedPostDetailSplitLayout`.
   */
  function expectLeftColumnCannotScroll({ captionCap = false } = {}) {
    const media = screen.getByTestId('feed-post-overlay-media');
    expect(media.className).toContain('overflow-hidden');
    expect(media.className).toContain('min-h-0');
    expect(SCROLLABLE_CLASS.test(media.className)).toBe(false);
    expect(scrollableNodes(media)).toEqual(
      captionCap ? [screen.getByTestId('feed-post-caption')] : [],
    );
  }

  it('gives the photo the leftover height and the rest a fixed one', async () => {
    await renderOverlay();

    expectLeftColumnCannotScroll();

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
    expect(fill.className).toContain('min-h-0');
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
    expectLeftColumnCannotScroll({ captionCap: true });
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
    expectLeftColumnCannotScroll({ captionCap: true });
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
  it('is the only scrollable place in the whole window', async () => {
    await renderOverlay();

    const overlay = screen.getByTestId('feed-post-overlay');
    const scrollable = scrollableNodes(overlay);

    expect(scrollable).toHaveLength(1);
    expect(scrollable[0]).toBe(screen.getByTestId('feed-comments-scroll'));
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

  it('leaves the photo a sane minimum even in the worst case', () => {
    // Rozpočet stĺpca v percentách výšky obrazovky. Toto je presne ten výpočet,
    // ktorým je zaručené, že ľavý stĺpec nikdy nepretečie – a keďže strop číta
    // priamo z komponentu, jeho zdvihnutie tento test rozbije.
    const windowVh = 95; // `h-[95vh]` na okne
    const captionCapVh = vhOf(BOUNDED_EXPANDED_MAX_HEIGHT.roomy);
    // Pevné bloky v pixeloch: hlavička (~3,75 rem), riadok akcií (~2,75 rem),
    // odsadenie textu (py-3) a prepínač „Viac"/„Menej".
    const fixedPx = 60 + 44 + 24 + 20;

    // Strop textu musí ostať pod výškou okna aj s pevnými blokmi…
    expect(captionCapVh).toBeLessThan(windowVh);

    // …a fotke musí zvýšiť rozumné minimum na každej bežnej výške obrazovky.
    for (const viewportPx of [600, 700, 800, 900, 1080, 1440]) {
      const photoPx =
        (viewportPx * (windowVh - captionCapVh)) / 100 - fixedPx;
      expect(photoPx).toBeGreaterThan(140);
    }
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
