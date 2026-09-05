/**
 * Mobilná obrazovka detailu príspevku (Variant 2).
 *
 * Overuje sa, čo ju otvára, jej rozloženie (pevná hlavička, JEDNA súvislá
 * scrollovateľná plocha, pevné pole na komentár), rozbaľovanie textu v bežnom
 * toku a štartovacia pozícia – doscrollovanie ku komentárom LEN pri fotke
 * a aspoň dvoch komentároch.
 */

import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostCard from '../FeedPostCard';
import { resetOverlayLayers } from '../../shared/overlayLayers';
import {
  AUTO_SCROLL_MIN_COMMENTS,
  shouldAutoScrollToComments,
} from '../feedMobileDetailAutoScroll';
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

// Celý súbor je o MOBILE – tam táto obrazovka existuje.
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
const mockedLike = jest.requireMock('@/lib/feedApi').likeFeedPost as jest.Mock;

const author = {
  id: 10,
  display_name: 'Jana Nováková',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};

function image(id: number) {
  return {
    id,
    status: 'approved',
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
    comments_count: 3,
    is_liked_by_me: false,
    can_manage: false,
    created_at: '2026-01-01T10:00:00Z',
    ...overrides,
  } as FeedPost;
}

/** jsdom `scrollIntoView` neimplementuje – sleduje sa, či a na čom sa volalo. */
let scrollTargets: Element[] = [];

/**
 * Otvorí obrazovku ikonou komentárov na karte.
 *
 * Obrazovka sa vykresľuje portálom, takže sa efekt štartovacej pozície spustí
 * až v druhom kole – bez dobehnutia efektov by testy merali stav spred neho
 * (a tie negatívne by prechádzali z nesprávneho dôvodu).
 */
async function openFromCommentsButton(post = makePost()) {
  render(<FeedPostCard post={post} />);
  await userEvent.click(screen.getByTestId('feed-comments-button'));
  const detail = await screen.findByTestId('feed-mobile-detail');
  await act(async () => {});
  return detail;
}

beforeAll(() => {
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    writable: true,
    value: function scrollIntoView(this: Element) {
      scrollTargets.push(this);
    },
  });
});

beforeEach(() => {
  jest.clearAllMocks();
  resetOverlayLayers();
  scrollTargets = [];
  document.documentElement.classList.remove('dark');
  mockedListComments.mockResolvedValue({
    results: [],
    next: null,
    previous: null,
    count: 0,
  });
});

afterEach(() => {
  document.documentElement.classList.remove('dark');
});

describe('čo obrazovku otvára', () => {
  it('opens from the comments button on the card', async () => {
    const detail = await openFromCommentsButton();

    expect(detail).toBeInTheDocument();
    expect(within(detail).getByTestId('feed-post-comments')).toBeInTheDocument();
  });

  it('opens from a tap on the post text, with a photo and without one', async () => {
    for (const post of [makePost(), makePost({ images: [] })]) {
      const view = render(<FeedPostCard post={post} />);

      await userEvent.click(screen.getByTestId('feed-post-caption'));

      expect(await screen.findByTestId('feed-mobile-detail')).toBeInTheDocument();
      view.unmount();
    }
  });

  it('leaves the photo tap on the immersive viewer', async () => {
    render(<FeedPostCard post={makePost()} />);

    await userEvent.click(screen.getByTestId('feed-image-open-11'));

    // Fotka má vlastnú obrazovku (Variant 1) – táto sa z nej neotvára.
    expect(await screen.findByTestId('feed-photo-viewer')).toBeInTheDocument();
    expect(screen.queryByTestId('feed-mobile-detail')).not.toBeInTheDocument();
  });

  it('closes with the X button', async () => {
    await openFromCommentsButton();

    await userEvent.click(screen.getByTestId('feed-mobile-detail-close'));

    await waitFor(() =>
      expect(screen.queryByTestId('feed-mobile-detail')).not.toBeInTheDocument(),
    );
  });
});

describe('rozloženie obrazovky', () => {
  it('keeps the header fixed and everything else in one scroller', async () => {
    const detail = await openFromCommentsButton();

    // Hlavička je mimo scrollovanej plochy…
    const header = within(detail).getByTestId('feed-mobile-detail-header');
    expect(header.className).toContain('shrink-0');
    const scroller = within(detail).getByTestId('feed-comments-scroll');
    expect(scroller.contains(header)).toBe(false);

    // …zatiaľ čo text, fotka, akcie aj nadpis komentárov scrollujú SPOLU so
    // zoznamom – sú v tom istom boxe.
    for (const testId of [
      'feed-mobile-detail-caption',
      'feed-mobile-detail-photo',
      'feed-mobile-detail-actions',
      'feed-mobile-detail-comments-title',
    ]) {
      expect(scroller.contains(within(detail).getByTestId(testId))).toBe(true);
    }
  });

  it('pins the new-comment field outside the scroller', async () => {
    const detail = await openFromCommentsButton();

    const composer = within(detail).getByLabelText('Napíš komentár...');
    const scroller = within(detail).getByTestId('feed-comments-scroll');
    expect(scroller.contains(composer)).toBe(false);
    // Jednoriadkové, s ikonou odoslania a bez emoji – rovnaký compactComposer,
    // aký appka už má.
    expect(composer).toHaveAttribute('rows', '1');
    expect(within(detail).getByTestId('feed-comment-send')).toBeInTheDocument();
    expect(within(detail).queryByLabelText('Pridať emoji')).toBeNull();
  });

  it('drops the photo section entirely for a text-only post', async () => {
    const detail = await openFromCommentsButton(makePost({ images: [] }));

    expect(within(detail).queryByTestId('feed-mobile-detail-photo')).toBeNull();
    expect(
      within(detail).getByTestId('feed-mobile-detail-caption'),
    ).toBeInTheDocument();
  });

  it('groups like, comments and share together in the action row', async () => {
    const detail = await openFromCommentsButton();

    const actions = within(detail).getByTestId('feed-mobile-detail-actions');
    // Všetky tri sú v tom istom riadku – zdieľanie nie je odsunuté na druhý
    // koniec, takže riadok nemá `justify-between` ani odsúvač.
    expect(within(actions).getByTestId('feed-mobile-detail-like')).toBeInTheDocument();
    expect(
      within(actions).getByTestId('feed-mobile-detail-comments'),
    ).toBeInTheDocument();
    expect(within(actions).getByTestId('feed-mobile-detail-share')).toBeInTheDocument();
    expect(actions.className).not.toContain('justify-between');
    expect(
      within(actions).getByTestId('feed-mobile-detail-share').className,
    ).not.toContain('ml-auto');
  });

  it('follows the app theme instead of forcing a dark palette', async () => {
    const detail = await openFromCommentsButton();

    // Na rozdiel od panelu nad fotkou tu žiadna tmavá výnimka nie je – farby
    // sa prepínajú bežným `dark:` variantom podľa režimu appky.
    expect(detail.className).not.toMatch(/(^|\s)dark(\s|$)/);
    expect(detail.className).toContain('bg-white');
    expect(detail.className).toContain('dark:bg-[#0f0f10]');
  });
});

describe('text príspevku', () => {
  it('clamps to five lines and expands in the normal document flow', async () => {
    // jsdom nelayoutuje – „presahuje text orezanie?" sa nastavuje priamo na
    // uzle, rovnako ako v ostatných testoch textu príspevku.
    Object.defineProperty(HTMLParagraphElement.prototype, 'clientHeight', {
      configurable: true,
      get() {
        return this.dataset.testid === 'feed-mobile-detail-caption' ? 100 : 0;
      },
    });
    Object.defineProperty(HTMLParagraphElement.prototype, 'scrollHeight', {
      configurable: true,
      get() {
        if (this.dataset.testid !== 'feed-mobile-detail-caption') return 0;
        return this.className.includes('line-clamp') ? 900 : 100;
      },
    });

    try {
      const detail = await openFromCommentsButton(
        makePost({ caption: 'Veľmi dlhý text príspevku.' }),
      );

      const caption = within(detail).getByTestId('feed-mobile-detail-caption');
      expect(caption.className).toContain('line-clamp-5');
      // Žiadny overlay ani vlastný strop – text je bežná časť toku.
      expect(caption.className).not.toContain('overflow-y-auto');
      expect(caption.className).not.toMatch(/max-h-\[/);

      await userEvent.click(
        await within(detail).findByTestId('feed-mobile-detail-caption-toggle'),
      );

      const expanded = within(detail).getByTestId('feed-mobile-detail-caption');
      expect(expanded.className).not.toContain('line-clamp-5');
      expect(expanded.className).not.toMatch(/max-h-\[/);
      expect(expanded.className).not.toContain('overflow-y-auto');
      // Obsah pod textom ostáva pod ním v tom istom toku – teda sa posunie
      // nižšie, nič ho neprekryje.
      const actions = within(detail).getByTestId('feed-mobile-detail-actions');
      expect(expanded.compareDocumentPosition(actions)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      );
      const scroller = within(detail).getByTestId('feed-comments-scroll');
      expect(scroller.contains(expanded)).toBe(true);
      expect(scroller.contains(actions)).toBe(true);
    } finally {
      Reflect.deleteProperty(HTMLParagraphElement.prototype, 'clientHeight');
      Reflect.deleteProperty(HTMLParagraphElement.prototype, 'scrollHeight');
    }
  });
});

/**
 * Rozmery, ktorými test simuluje skutočný layout telefónu.
 *
 * Dôvod: pôvodná chyba bola VÝLUČNE o rozmeroch v čase. Doscrollovanie sa
 * spúšťalo, kým bol zoznam ešte v stave „Načítavam…" – obsah bol vtedy kratší
 * než plocha, takže sa prehliadač nemal kam pohnúť a volanie ticho zapadlo.
 * Test, ktorý len sleduje, či sa scrollovacia funkcia zavolala, to nemôže
 * chytiť; preto sa tu meria skutočná zmena `scrollTop` proti výške, ktorá
 * RASTIE s vykreslenými komentármi.
 */
const SCROLLER_HEIGHT = 707;
/** Text + fotka + riadok akcií + nadpis, kým nie sú komentáre. */
const HEADER_CONTENT_HEIGHT = 490;
const COMMENT_HEIGHT = 220;
/** Kotva „Komentáre" leží pod textom, fotkou a riadkom akcií. */
const ANCHOR_OFFSET = 422;

/** Napodobní layout prehliadača vrátane orezania `scrollTop` na maximum. */
function installLayout(scroller: HTMLElement, anchor: HTMLElement) {
  let top = 0;
  const scrollHeight = () =>
    HEADER_CONTENT_HEIGHT +
    scroller.querySelectorAll('[data-comment-id]').length * COMMENT_HEIGHT;

  Object.defineProperty(scroller, 'clientHeight', {
    configurable: true,
    get: () => SCROLLER_HEIGHT,
  });
  Object.defineProperty(scroller, 'scrollHeight', {
    configurable: true,
    get: scrollHeight,
  });
  Object.defineProperty(scroller, 'scrollTop', {
    configurable: true,
    get: () => top,
    set: (value: number) => {
      // Presne ako prehliadač: nad rámec obsahu sa posunúť nedá.
      const max = Math.max(0, scrollHeight() - SCROLLER_HEIGHT);
      top = Math.min(Math.max(0, value), max);
    },
  });
  scroller.getBoundingClientRect = () => ({ top: 0 }) as DOMRect;
  anchor.getBoundingClientRect = () => ({ top: ANCHOR_OFFSET - top }) as DOMRect;
}

function deferredPage<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

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
      created_at: '2026-01-01T11:00:00Z',
    })),
    next: null,
    previous: null,
    count,
  };
}

describe('automatický scroll pri otvorení', () => {
  describe('samotné pravidlo', () => {
    it('needs a photo AND at least three comments', () => {
      expect(AUTO_SCROLL_MIN_COMMENTS).toBe(3);
      expect(shouldAutoScrollToComments({ hasPhoto: true, commentsCount: 0 })).toBe(false);
      expect(shouldAutoScrollToComments({ hasPhoto: true, commentsCount: 2 })).toBe(false);
      expect(shouldAutoScrollToComments({ hasPhoto: true, commentsCount: 3 })).toBe(true);
      expect(shouldAutoScrollToComments({ hasPhoto: true, commentsCount: 9 })).toBe(true);
      expect(shouldAutoScrollToComments({ hasPhoto: false, commentsCount: 3 })).toBe(false);
      expect(shouldAutoScrollToComments({ hasPhoto: false, commentsCount: 99 })).toBe(false);
      // Chýbajúci počet nesmie skončiť skokom do prázdna.
      expect(shouldAutoScrollToComments({ hasPhoto: true, commentsCount: null })).toBe(false);
    });
  });

  /**
   * Otvorí obrazovku so ZADRŽANOU odpoveďou zoznamu, aby sa dal odmerať aj
   * stav PRED dorazením komentárov – práve v ňom pôvodná chyba vznikala.
   */
  async function openWithHeldComments(post = makePost()) {
    const page = deferredPage<ReturnType<typeof commentPage>>();
    mockedListComments.mockReturnValue(page.promise);
    render(<FeedPostCard post={post} />);
    await userEvent.click(screen.getByTestId('feed-comments-button'));
    await screen.findByTestId('feed-mobile-detail');

    const scroller = screen.getByTestId('feed-comments-scroll');
    const anchor = screen.getByTestId('feed-mobile-detail-comments-anchor');
    installLayout(scroller, anchor);
    return { page, scroller, anchor };
  }

  it('does not scroll while the list is still loading', async () => {
    const { scroller } = await openWithHeldComments(makePost({ comments_count: 10 }));

    // Toto je presne moment, v ktorom sa to predtým spúšťalo naprázdno:
    // obsah (490) je kratší než plocha (707), takže sa nedá pohnúť.
    expect(scroller.scrollHeight).toBeLessThan(scroller.clientHeight);
    expect(scroller.scrollTop).toBe(0);
  });

  it('scrolls the comments under the header once they are rendered', async () => {
    const { page, scroller } = await openWithHeldComments(
      makePost({ comments_count: 10 }),
    );

    await act(async () => {
      page.resolve(commentPage(10));
    });

    // Merané ČÍSLOM: kotva sa naozaj posunula na vrch plochy, teda hneď pod
    // pevnú hlavičku – fotka aj riadok akcií ostali nad dohľadom.
    await waitFor(() => expect(scroller.scrollTop).toBe(ANCHOR_OFFSET));
    expect(scroller.scrollHeight).toBeGreaterThan(scroller.clientHeight);
  });

  it.each([3, 12])('scrolls for a photo post with %i comments', async (comments) => {
    const { page, scroller } = await openWithHeldComments(
      makePost({ comments_count: comments }),
    );

    await act(async () => {
      page.resolve(commentPage(comments));
    });

    await waitFor(() => expect(scroller.scrollTop).toBe(ANCHOR_OFFSET));
  });

  it('scrolls for a shared preview post as well', async () => {
    const shared = {
      images: [],
      comments_count: 4,
      post_type: 'shared_feed_post',
      shared_content: {
        type: 'feed_post',
        title: '',
        category: '',
        caption: 'Pôvodný text',
        id: 9,
        owner: author,
        owner_display_name: 'Jana Nováková',
        thumbnail_url: null,
        is_seeking: null,
        price_negotiable: null,
        price_from: null,
        price_currency: '',
      },
    } as unknown as Partial<FeedPost>;
    const { page, scroller } = await openWithHeldComments(makePost(shared));

    await act(async () => {
      page.resolve(commentPage(4));
    });

    await waitFor(() => expect(scroller.scrollTop).toBe(ANCHOR_OFFSET));
  });

  it.each([0, 1, 2])(
    'stays at the top for a photo post with %i comments',
    async (comments) => {
      const { page, scroller } = await openWithHeldComments(
        makePost({ comments_count: comments }),
      );

      await act(async () => {
        page.resolve(commentPage(comments));
      });

      const anchor = await screen.findByTestId('feed-mobile-detail-comments-anchor');
      await waitFor(() => expect(anchor).toHaveAttribute('data-auto-scrolled'));
      expect(anchor.getAttribute('data-auto-scrolled')).toBe('false');
      expect(scroller.scrollTop).toBe(0);
    },
  );

  it.each([0, 3, 10])(
    'stays at the top for a text-only post with %i comments',
    async (comments) => {
      const { page, scroller } = await openWithHeldComments(
        makePost({ images: [], comments_count: comments }),
      );

      await act(async () => {
        page.resolve(commentPage(comments));
      });

      const anchor = await screen.findByTestId('feed-mobile-detail-comments-anchor');
      await waitFor(() => expect(anchor).toHaveAttribute('data-auto-scrolled'));
      expect(anchor.getAttribute('data-auto-scrolled')).toBe('false');
      expect(scroller.scrollTop).toBe(0);
    },
  );

  it('does not scroll again on a later re-render', async () => {
    const { page, scroller } = await openWithHeldComments(
      makePost({ comments_count: 10 }),
    );
    await act(async () => {
      page.resolve(commentPage(10));
    });
    await waitFor(() => expect(scroller.scrollTop).toBe(ANCHOR_OFFSET));

    // Používateľ si odscrolloval späť hore…
    scroller.scrollTop = 0;
    // …a obrazovka sa prekreslí (lajk je najlacnejšia zmena stavu).
    await userEvent.click(screen.getByTestId('feed-mobile-detail-like'));

    // Rozhodnutie ostáva JEDNORAZOVÉ – opravovalo sa jeho časovanie, nie to,
    // že padne raz. Ďalší komentár z pollingu nesmie strhnúť pohľad.
    expect(scroller.scrollTop).toBe(0);
  });
});

describe('hlavička a akcie', () => {
  it('keeps a long name on one line next to the menu and the X', async () => {
    const detail = await openFromCommentsButton(
      makePost({
        author: { ...author, display_name: 'Bartolomej Vratislav Podhradský-Nemešányi' },
      }),
    );

    const name = within(detail)
      .getByTestId('feed-mobile-detail-author')
      .querySelector('span span');
    expect(name?.className).toContain('truncate');
    expect(
      within(detail).getByTestId('feed-mobile-detail-menu-trigger'),
    ).toBeInTheDocument();
    expect(within(detail).getByTestId('feed-mobile-detail-close')).toBeInTheDocument();
  });

  it('offers only the report on somebody else post', async () => {
    const detail = await openFromCommentsButton();

    await userEvent.click(
      within(detail).getByTestId('feed-mobile-detail-menu-trigger'),
    );

    const menu = within(detail).getByTestId('feed-mobile-detail-menu');
    expect(within(menu).getByTestId('feed-mobile-detail-report')).toBeInTheDocument();
    expect(within(menu).queryByTestId('feed-mobile-detail-edit')).toBeNull();
    expect(within(menu).queryByTestId('feed-mobile-detail-delete')).toBeNull();
  });

  it('adds edit and delete on the own post', async () => {
    const detail = await openFromCommentsButton(makePost({ can_manage: true }));

    await userEvent.click(
      within(detail).getByTestId('feed-mobile-detail-menu-trigger'),
    );

    const menu = within(detail).getByTestId('feed-mobile-detail-menu');
    expect(within(menu).getByTestId('feed-mobile-detail-report')).toBeInTheDocument();
    expect(within(menu).getByTestId('feed-mobile-detail-edit')).toBeInTheDocument();
    expect(within(menu).getByTestId('feed-mobile-detail-delete')).toBeInTheDocument();
  });

  it('separates the like toggle from the likers list', async () => {
    mockedLike.mockResolvedValue({ likes_count: 3, is_liked_by_me: true } as never);
    jest.requireMock('@/lib/feedApi').listFeedPostLikers.mockResolvedValue({
      results: [],
      next: null,
      previous: null,
      count: 0,
    });
    const detail = await openFromCommentsButton();

    await userEvent.click(within(detail).getByTestId('feed-mobile-detail-like'));
    await waitFor(() =>
      expect(
        within(detail).getByTestId('feed-mobile-detail-like-count'),
      ).toHaveTextContent('3'),
    );

    await userEvent.click(
      within(detail).getByTestId('feed-mobile-detail-like-count'),
    );
    expect(await screen.findByTestId('feed-likers-dialog')).toBeInTheDocument();
  });

  it('opens the author profile from the header', async () => {
    const seen: string[] = [];
    const handler = (event: Event) => {
      seen.push((event as CustomEvent).detail?.identifier);
    };
    window.addEventListener('goToUserProfile', handler);
    try {
      const detail = await openFromCommentsButton();

      await userEvent.click(within(detail).getByTestId('feed-mobile-detail-author'));

      expect(seen).toEqual(['jana']);
    } finally {
      window.removeEventListener('goToUserProfile', handler);
    }
  });
});

describe('komentáre', () => {
  it('loads more by scrolling, without a button', async () => {
    mockedListComments.mockResolvedValue({
      results: [
        {
          id: 100,
          text: 'Pekná fotka',
          author,
          can_delete: false,
          can_edit: false,
          likes_count: 0,
          is_liked_by_me: false,
          replies: [],
          replies_count: 0,
          created_at: '2026-01-01T11:00:00Z',
        },
      ],
      next: 'http://api.test/comments?cursor=2',
      previous: null,
      count: 2,
    });
    const detail = await openFromCommentsButton();

    await within(detail).findByText('Pekná fotka');
    // Sentinel je v TEJ ISTEJ ploche, ktorou používateľ scrolluje.
    const scroller = within(detail).getByTestId('feed-comments-scroll');
    expect(
      scroller.contains(within(detail).getByTestId('feed-comments-sentinel')),
    ).toBe(true);
    expect(within(detail).queryByText(/Zobraziť ďalšie/)).toBeNull();
  });
});
