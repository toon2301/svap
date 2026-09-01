/**
 * Okno detailu príspevku – vrstva nad appkou (DESKTOP).
 *
 * Tento súbor pokrýva JEDNOSTĹPCOVÉ rozloženie (príspevok BEZ fotky) a to, čo
 * je spoločné obom: zatváranie (X / Escape / klik mimo), vnorený fullscreen
 * prehliadač fotky ako druhá vrstva a to, že appka pod oknom ostáva
 * namountovaná. Dvojstĺpcové rozloženie príspevku S FOTKOU má vlastný súbor
 * `FeedPostDetailSplitLayout.test.tsx`.
 */

import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostDetailOverlay from '../FeedPostDetailOverlay';
import { resetOverlayLayers } from '../../shared/overlayLayers';
import { onFeedPostCounts } from '../feedPostCountEvents';
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

function makePost(overrides: Partial<FeedPost> = {}): FeedPost {
  return {
    id: 7,
    post_type: 'free_post',
    caption: 'Text príspevku',
    author,
    images: [
      {
        id: 11,
        status: 'approved',
        thumbnail_url: 'http://api.test/11-t.webp',
        large_url: 'http://api.test/11-l.webp',
      },
    ],
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

function renderOverlay(post = makePost(), highlightCommentId: number | null = null) {
  const onClose = jest.fn();
  mockedGetPost.mockResolvedValue(post);
  render(
    <div>
      <div data-testid="app-underneath">Appka pod oknom</div>
      <FeedPostDetailOverlay
        postId={post.id}
        highlightCommentId={highlightCommentId}
        onClose={onClose}
      />
    </div>,
  );
  return { onClose };
}

/** Odpoveď, ktorú test rozhodne, kedy dorazí. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

/**
 * Počká, kým sa príspevok načíta – dovtedy je v okne len kostra.
 *
 * Čaká sa na KARTU, nie na pevný blok: ten je len v jednostĺpcovom rozložení,
 * kým karta je v oboch.
 */
async function renderLoadedOverlay(
  post = makePost(),
  highlightCommentId: number | null = null,
) {
  const handles = renderOverlay(post, highlightCommentId);
  await screen.findByTestId('feed-post-card');
  return handles;
}

/** Text-only príspevok – jednostĺpcové rozloženie okna. */
function textOnlyPost(overrides: Partial<FeedPost> = {}): FeedPost {
  return makePost({ images: [], ...overrides });
}

/**
 * jsdom nelayoutuje – „presahuje text tri riadky?" sa nastavuje priamo na
 * uzle, rovnako ako v teste samotného textu príspevku.
 */
function stubCaptionHeights() {
  Object.defineProperty(HTMLParagraphElement.prototype, 'clientHeight', {
    configurable: true,
    get() {
      return this.dataset.testid === 'feed-post-caption' ? 60 : 0;
    },
  });
  Object.defineProperty(HTMLParagraphElement.prototype, 'scrollHeight', {
    configurable: true,
    get() {
      if (this.dataset.testid !== 'feed-post-caption') return 0;
      return this.className.includes('line-clamp') ? 4000 : 60;
    },
  });
}

afterEach(() => {
  // Výšky sú nastavené na prototype – bez upratania by pretiekli inam.
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

describe('obsah okna', () => {
  it('shows the fixed block in order and the comments below it', async () => {
    await renderLoadedOverlay(textOnlyPost());

    const overlay = screen.getByTestId('feed-post-overlay');
    const fixed = within(overlay).getByTestId('feed-post-overlay-fixed');

    // Poradie: hlavička, text, akcie – všetko v pevnom bloku.
    const order = Array.from(
      fixed.querySelectorAll(
        'header, [data-testid="feed-post-caption"], footer',
      ),
    ).map((node) => node.getAttribute('data-testid') ?? node.tagName.toLowerCase());
    expect(order).toEqual(['header', 'feed-post-caption', 'footer']);

    // Komentáre sú MIMO pevného bloku – to je jediná scrollovateľná časť.
    const comments = within(overlay).getByTestId('feed-post-overlay-comments');
    expect(fixed.contains(comments)).toBe(false);
    expect(
      within(comments).getByTestId('feed-post-comments'),
    ).toBeInTheDocument();
  });

  it('keeps both the post menu and the close button reachable', async () => {
    await renderLoadedOverlay(textOnlyPost());

    const header = screen.getByTestId('feed-post-overlay-fixed').querySelector('header');
    expect(screen.getByTestId('feed-post-menu-trigger')).toBeInTheDocument();
    expect(screen.getByTestId('feed-post-overlay-close')).toBeInTheDocument();
    // „X" okna sedí vpravo hore – hlavička mu preto musí uvoľniť miesto,
    // inak by menu karty prekryla (rozmery jsdom neráta, kontroluje sa trieda).
    expect(header?.className).toContain('pr-12');
  });

  it('leaves out the photo section for a text-only post', async () => {
    await renderLoadedOverlay(makePost({ images: [] }));

    expect(screen.getByTestId('feed-post-caption')).toBeInTheDocument();
    expect(screen.queryByTestId('feed-post-image')).not.toBeInTheDocument();
  });

  it('keeps the window inside the screen and scrolls only the comments', async () => {
    await renderLoadedOverlay(textOnlyPost());

    const overlay = screen.getByTestId('feed-post-overlay');
    // Okno sa nikdy nenatiahne cez obrazovku…
    expect(overlay.className).toContain('max-h-[95vh]');
    expect(overlay.className).toContain('overflow-hidden');
    // …zvyšok dostane komentárová časť (`flex-1` so základom 0), pričom
    // `min-h` jej drží podlahu, aby ju pevný blok nestlačil na nulu…
    const comments = screen.getByTestId('feed-post-overlay-comments');
    expect(comments.className).toContain('flex-1');
    expect(comments.className).toContain('min-h-[7rem]');
    const scroll = screen.getByTestId('feed-comments-scroll');
    expect(scroll.className).toContain('overflow-y-auto');
    // Scrollbar má appkinu utilitu (tenký, zaoblený, so svetlým aj tmavým
    // variantom v globals.css) – nie systémový predvolený.
    expect(scroll.className).toContain('subtle-scrollbar');
    // …a pevný blok má poistku pre krajný prípad, aby sa nič neschovalo za
    // orezanou hranou okna.
    expect(
      screen.getByTestId('feed-post-overlay-fixed').className,
    ).toContain('overflow-y-auto');
  });

  it('lets the keyboard reach the scrollable expanded caption', async () => {
    stubCaptionHeights();
    await renderLoadedOverlay(textOnlyPost({ caption: 'Veľmi dlhý text.' }));

    await userEvent.click(await screen.findByTestId('feed-post-caption-toggle'));

    // Text sa v okne scrolluje, takže musí byť v poradí Tab – inak by sa jeho
    // skrytá časť pri ovládaní klávesnicou nedala prečítať.
    const caption = screen.getByTestId('feed-post-caption');
    expect(caption).toHaveAttribute('tabindex', '0');
    expect(caption).toHaveAttribute('role', 'region');
    expect(caption).toHaveAccessibleName('Text príspevku');

    caption.focus();
    expect(caption).toHaveFocus();
  });

  it('keeps the actions and comments reachable with a long caption expanded', async () => {
    stubCaptionHeights();

    const longText = Array.from(
      { length: 40 },
      (_unused, paragraph) => `Odsek ${paragraph + 1} veľmi dlhého textu.`,
    ).join('\n\n');
    await renderLoadedOverlay(textOnlyPost({ caption: longText }));

    await userEvent.click(await screen.findByTestId('feed-post-caption-toggle'));

    // Rozbalený text v okne dostane vlastný strop a scrolluje sa v ňom, takže
    // nevytlačí riadok akcií ani komentáre za orezanú hranu okna.
    const caption = screen.getByTestId('feed-post-caption');
    expect(caption.className).toContain('max-h-[25vh]');
    expect(caption.className).toContain('overflow-y-auto');
    expect(caption.className).toContain('subtle-scrollbar');
    expect(caption.className).not.toContain('line-clamp-3');
    expect(screen.getByTestId('feed-like-button')).toBeInTheDocument();
    expect(screen.getByTestId('feed-post-comments')).toBeInTheDocument();
  });

  it('does not render its own comments inside the card', async () => {
    await renderLoadedOverlay();

    // Karta vo variante `detail` komentáre nekreslí – sú len raz, v okne.
    expect(screen.getAllByTestId('feed-post-comments')).toHaveLength(1);
  });
});

describe('zatváranie', () => {
  it('closes with the X button', async () => {
    const { onClose } = renderOverlay();
    await screen.findByTestId('feed-post-overlay');

    await userEvent.click(screen.getByTestId('feed-post-overlay-close'));

    expect(onClose).toHaveBeenCalled();
  });

  it('closes with Escape', async () => {
    const { onClose } = renderOverlay();
    await screen.findByTestId('feed-post-overlay');

    await userEvent.keyboard('{Escape}');

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('closes on a click outside the window', async () => {
    const { onClose } = renderOverlay();
    await screen.findByTestId('feed-post-overlay');

    await userEvent.click(screen.getByTestId('feed-post-overlay-layer'));

    expect(onClose).toHaveBeenCalled();
  });

  it('leaves the app underneath mounted the whole time', async () => {
    renderOverlay();
    await screen.findByTestId('feed-post-overlay');

    // Okno je vrstva, nie navigácia – nič pod ňou sa neodmountuje.
    expect(screen.getByTestId('app-underneath')).toBeInTheDocument();
  });
});

describe('fullscreen prehliadač nad oknom', () => {
  it('opens the lightbox on top and Escape closes it first', async () => {
    const { onClose } = await renderLoadedOverlay();

    await userEvent.click(screen.getByTestId('feed-image-open-11'));
    expect(screen.getByTestId('feed-image-lightbox')).toBeInTheDocument();
    // Okno pod ním ostáva otvorené.
    expect(screen.getByTestId('feed-post-overlay')).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');

    // Prvý Escape zavrie LEN prehliadač.
    await waitFor(() =>
      expect(screen.queryByTestId('feed-image-lightbox')).not.toBeInTheDocument(),
    );
    expect(onClose).not.toHaveBeenCalled();

    // Druhý Escape zavrie okno.
    await act(async () => {
      await userEvent.keyboard('{Escape}');
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});

describe('príprava okna a poradie odpovedí', () => {
  it('moves the focus inside once the portal exists', async () => {
    // Okno sa vykresľuje portálom, takže pri prvom renderi ešte nie je kam
    // fokus presunúť. Musí sa doň dostať, keď kontajner pribudne – inak by
    // klávesnica ostala v appke pod oknom.
    await renderLoadedOverlay();

    const overlay = screen.getByTestId('feed-post-overlay');
    await waitFor(() => expect(overlay.contains(document.activeElement)).toBe(true));
  });

  it('ignores a slow answer that belongs to the previous post', async () => {
    const slowFirst = deferred<FeedPost>();
    mockedGetPost.mockReturnValueOnce(slowFirst.promise);
    const secondPost = makePost({ id: 9, caption: 'Druhý príspevok', comments_count: 5 });
    mockedGetPost.mockResolvedValueOnce(secondPost);

    const { rerender } = render(
      <FeedPostDetailOverlay postId={7} onClose={jest.fn()} />,
    );
    // Prepnutie skôr, než dorazí odpoveď pre príspevok 7.
    rerender(<FeedPostDetailOverlay postId={9} onClose={jest.fn()} />);
    expect(await screen.findByText('Druhý príspevok')).toBeInTheDocument();

    // Až TERAZ dorazí pomalá odpoveď pre pôvodný príspevok.
    await act(async () => {
      slowFirst.resolve(makePost({ id: 7, caption: 'Prvý príspevok' }));
    });

    // Zobrazený ostáva ten, ktorý používateľ naozaj otvoril.
    expect(screen.getByText('Druhý príspevok')).toBeInTheDocument();
    expect(screen.queryByText('Prvý príspevok')).not.toBeInTheDocument();
    expect(screen.getByTestId('feed-post-card')).toBeInTheDocument();
  });

  it('does not publish the counts of the previous post', async () => {
    const seen: Array<{ postId: number; commentsCount?: number }> = [];
    const stop = onFeedPostCounts((patch) => {
      if (patch.commentsCount !== undefined) {
        seen.push({ postId: patch.postId, commentsCount: patch.commentsCount });
      }
    });

    const slowFirst = deferred<FeedPost>();
    mockedGetPost.mockReturnValueOnce(slowFirst.promise);
    mockedGetPost.mockResolvedValueOnce(makePost({ id: 9, comments_count: 5 }));

    const { rerender } = render(
      <FeedPostDetailOverlay postId={7} onClose={jest.fn()} />,
    );
    rerender(<FeedPostDetailOverlay postId={9} onClose={jest.fn()} />);
    await screen.findByTestId('feed-post-card');

    await act(async () => {
      slowFirst.resolve(makePost({ id: 7, comments_count: 99 }));
    });
    stop();

    // Počet z príspevku 7 sa nesmie rozposlať – ani pod cudzím id.
    expect(seen.every((patch) => patch.postId === 9)).toBe(true);
    expect(seen.some((patch) => patch.commentsCount === 99)).toBe(false);
  });
});

describe('zdieľaný obsah v okne', () => {
  function sharedPost() {
    return makePost({
      post_type: 'shared_post',
      caption: 'Toto stojí za pozretie.',
      images: [],
      shared_content: {
        type: 'offer',
        id: 55,
        title: 'Kurz gitary',
        owner: { id: 21, display_name: 'Peter', slug: 'peter', user_type: 'individual', avatar_url: null },
      },
    } as Partial<FeedPost>);
  }

  it('puts the sharer text above the nested preview', async () => {
    await renderLoadedOverlay(sharedPost());

    const caption = screen.getByTestId('feed-post-caption');
    const preview = screen.getByTestId('feed-shared-compact-preview');
    // Rovnaké pravidlo ako „text nad fotkou" pri voľnom príspevku: najprv
    // čítam, čo autor napísal, potom vidím, k čomu to napísal.
    expect(caption.compareDocumentPosition(preview)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });
});

describe('rozmery okna', () => {
  it('is wider than the feed card and nearly as tall as the screen', async () => {
    await renderLoadedOverlay(textOnlyPost());

    const overlay = screen.getByTestId('feed-post-overlay');
    // 54rem = 864 px, teda o ~29 % viac než pôvodných 42rem (672 px).
    expect(overlay.className).toContain('max-w-[54rem]');
    // Strop výšky necháva 2,5 % viewportu hore aj dole.
    expect(overlay.className).toContain('max-h-[95vh]');
  });

  it('keeps the same width for a text-only post', async () => {
    // Šírka je fixná, nech okno vyzerá rovnako bez ohľadu na to, či príspevok
    // má fotku – inak by sa pri prechádzaní príspevkov „mrvilo".
    await renderLoadedOverlay(makePost({ images: [] }));

    expect(screen.getByTestId('feed-post-overlay').className).toContain(
      'max-w-[54rem]',
    );
  });

  it('lets the height grow with the content instead of fixing it', async () => {
    await renderLoadedOverlay(makePost({ images: [] }));

    const overlay = screen.getByTestId('feed-post-overlay');
    // Žiadna pevná ani minimálna výška – krátky príspevok drží okno nízke,
    // dlhý ho natiahne až po strop.
    expect(overlay.className).not.toMatch(/(^|\s)h-\[/);
    expect(overlay.className).not.toMatch(/(^|\s)min-h-\[/);
    expect(overlay.className).toContain('max-h-[95vh]');
  });
});

describe('text v okne detailu', () => {
  it('shows about ten lines before the toggle, not three', async () => {
    stubCaptionHeights();
    await renderLoadedOverlay(textOnlyPost({ caption: 'Dlhý text príspevku.' }));

    // Karta vo feede orezáva na tri riadky; okno je oveľa väčšie, takže tam
    // by tri riadky pôsobili ako zbytočné skrátenie.
    expect(screen.getByTestId('feed-post-caption').className).toContain(
      'line-clamp-[10]',
    );
    expect(screen.getByTestId('feed-post-caption').className).not.toContain(
      'line-clamp-3',
    );
  });

  it('collapses runs of blank lines into a single break', async () => {
    await renderLoadedOverlay(
      textOnlyPost({ caption: 'Prvý odsek.\n\n\n\n\nDruhý odsek.' }),
    );

    // Séria prázdnych riadkov robí v okne veľkú dieru, ktorá tlačí akcie aj
    // komentáre nižšie – ostane z nej jedno zalomenie.
    expect(screen.getByTestId('feed-post-caption')).toHaveTextContent(
      'Prvý odsek. Druhý odsek.',
    );
    expect(screen.getByTestId('feed-post-caption').textContent).toBe(
      'Prvý odsek.\nDruhý odsek.',
    );
  });

  it('keeps a single blank line as paragraph separation', async () => {
    await renderLoadedOverlay(
      textOnlyPost({ caption: 'Prvý odsek.\n\nDruhý odsek.' }),
    );

    // Jeden prázdny riadok je bežné oddelenie odsekov – ten sa neruší.
    expect(screen.getByTestId('feed-post-caption').textContent).toBe(
      'Prvý odsek.\n\nDruhý odsek.',
    );
  });
});

describe('„..." menu vnútri okna', () => {
  /** Číselná hodnota z triedy `z-[NNN]`. */
  function zIndexOf(node: Element | null): number {
    const match = node?.className.match(/z-\[(\d+)\]/);
    return match ? Number(match[1]) : 0;
  }

  it('opens above the window, not behind it', async () => {
    await renderLoadedOverlay(textOnlyPost({ can_manage: true }));

    await userEvent.click(screen.getByTestId('feed-post-menu-trigger'));

    const menu = screen.getByTestId('feed-post-menu');
    expect(menu).toBeInTheDocument();
    // Menu sa vykresľuje portálom MIMO okna, takže o tom, či ho vidno,
    // rozhoduje vrstva. Nižšia hodnota = menu je za podkladom okna: v DOM je,
    // ale kliknúť sa naň nedá.
    const menuLayer = document.querySelector('[data-testid="feed-post-menu-layer"]');
    expect(zIndexOf(menuLayer)).toBeGreaterThan(
      zIndexOf(screen.getByTestId('feed-post-overlay-layer')),
    );
  });

  it('offers report, edit and delete to the author', async () => {
    await renderLoadedOverlay(textOnlyPost({ can_manage: true }));

    await userEvent.click(screen.getByTestId('feed-post-menu-trigger'));

    expect(screen.getByText('Nahlásiť príspevok')).toBeInTheDocument();
    expect(screen.getByTestId('feed-post-edit')).toBeInTheDocument();
    expect(screen.getByTestId('feed-post-delete')).toBeInTheDocument();
  });

  it('offers only report to somebody else', async () => {
    await renderLoadedOverlay(textOnlyPost({ can_manage: false }));

    await userEvent.click(screen.getByTestId('feed-post-menu-trigger'));

    // Upravovať a mazať smie iba autor – rozhoduje o tom backend cez
    // `can_manage`, presne ako na karte vo feede.
    expect(screen.getByText('Nahlásiť príspevok')).toBeInTheDocument();
    expect(screen.queryByTestId('feed-post-edit')).not.toBeInTheDocument();
    expect(screen.queryByTestId('feed-post-delete')).not.toBeInTheDocument();
  });

  it('opens the delete confirmation from inside the window', async () => {
    await renderLoadedOverlay(textOnlyPost({ can_manage: true }));

    await userEvent.click(screen.getByTestId('feed-post-menu-trigger'));
    await userEvent.click(screen.getByTestId('feed-post-delete'));

    expect(screen.getByTestId('feed-post-delete-confirm')).toBeInTheDocument();
  });
});

describe('dialóg otvorený z okna', () => {
  it('closes only the likers list with the first Escape', async () => {
    jest.requireMock('@/lib/feedApi').listFeedPostLikers.mockResolvedValue({
      results: [],
      next: null,
      previous: null,
      count: 0,
    });
    const { onClose } = await renderLoadedOverlay();

    // Počet lajkov v okne otvára zoznam – ďalšia vrstva nad oknom.
    await userEvent.click(screen.getByTestId('feed-like-count'));
    expect(await screen.findByTestId('feed-likers-dialog')).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');

    await waitFor(() =>
      expect(screen.queryByTestId('feed-likers-dialog')).not.toBeInTheDocument(),
    );
    // Okno pod zoznamom ostáva otvorené.
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByTestId('feed-post-overlay')).toBeInTheDocument();

    await act(async () => {
      await userEvent.keyboard('{Escape}');
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});

describe('nedostupný príspevok', () => {
  it('offers a retry when loading fails temporarily', async () => {
    mockedGetPost.mockRejectedValue({ response: { status: 500 } });
    render(
      <FeedPostDetailOverlay postId={7} onClose={jest.fn()} />,
    );

    expect(await screen.findByTestId('feed-post-overlay-error')).toBeInTheDocument();
  });

  it('closes itself when the post is gone', async () => {
    const onClose = jest.fn();
    mockedGetPost.mockRejectedValue({ response: { status: 404 } });
    render(<FeedPostDetailOverlay postId={7} onClose={onClose} />);

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
