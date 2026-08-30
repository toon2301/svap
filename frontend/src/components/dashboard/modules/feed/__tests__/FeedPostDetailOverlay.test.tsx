/**
 * Okno detailu príspevku – vrstva nad appkou (DESKTOP).
 *
 * Overuje sa obsah a poradie pevného bloku, že scrolluje len komentárová
 * časť, zatváranie (X / Escape / klik mimo), vnorený fullscreen prehliadač
 * fotky ako druhá vrstva a to, že appka pod oknom ostáva namountovaná.
 */

import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostDetailOverlay from '../FeedPostDetailOverlay';
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

/** Počká, kým sa príspevok načíta – dovtedy je v okne len kostra. */
async function renderLoadedOverlay(
  post = makePost(),
  highlightCommentId: number | null = null,
) {
  const handles = renderOverlay(post, highlightCommentId);
  await screen.findByTestId('feed-post-overlay-fixed');
  return handles;
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
    await renderLoadedOverlay();

    const overlay = screen.getByTestId('feed-post-overlay');
    const fixed = within(overlay).getByTestId('feed-post-overlay-fixed');

    // Poradie: hlavička, text, fotka, akcie – všetko v pevnom bloku.
    const order = Array.from(
      fixed.querySelectorAll(
        'header, [data-testid="feed-post-caption"], [data-testid="feed-post-image"], footer',
      ),
    ).map((node) => node.getAttribute('data-testid') ?? node.tagName.toLowerCase());
    expect(order).toEqual([
      'header',
      'feed-post-caption',
      'feed-post-image',
      'footer',
    ]);

    // Komentáre sú MIMO pevného bloku – to je jediná scrollovateľná časť.
    const comments = within(overlay).getByTestId('feed-post-overlay-comments');
    expect(fixed.contains(comments)).toBe(false);
    expect(
      within(comments).getByTestId('feed-post-comments'),
    ).toBeInTheDocument();
  });

  it('keeps both the post menu and the close button reachable', async () => {
    await renderLoadedOverlay();

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
    await renderLoadedOverlay();

    const overlay = screen.getByTestId('feed-post-overlay');
    // Okno sa nikdy nenatiahne cez obrazovku…
    expect(overlay.className).toContain('max-h-[90vh]');
    expect(overlay.className).toContain('overflow-hidden');
    // …zvyšok dostane komentárová časť (`flex-1` so základom 0), pričom
    // `min-h` jej drží podlahu, aby ju pevný blok nestlačil na nulu…
    const comments = screen.getByTestId('feed-post-overlay-comments');
    expect(comments.className).toContain('flex-1');
    expect(comments.className).toContain('min-h-[7rem]');
    expect(
      screen.getByTestId('feed-comments-scroll').className,
    ).toContain('overflow-y-auto');
    // …a pevný blok má poistku pre krajný prípad, aby sa nič neschovalo za
    // orezanou hranou okna.
    expect(
      screen.getByTestId('feed-post-overlay-fixed').className,
    ).toContain('overflow-y-auto');
  });

  it('keeps the actions and comments reachable with a long caption expanded', async () => {
    // jsdom nelayoutuje – „presahuje tri riadky?" sa nastavuje priamo na
    // uzle, rovnako ako v teste samotného textu príspevku.
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
        return this.className.includes('line-clamp-3') ? 4000 : 60;
      },
    });

    const longText = Array.from(
      { length: 40 },
      (_unused, paragraph) => `Odsek ${paragraph + 1} veľmi dlhého textu.`,
    ).join('\n\n');
    await renderLoadedOverlay(makePost({ caption: longText }));

    await userEvent.click(await screen.findByTestId('feed-post-caption-toggle'));

    // Rozbalený text v okne dostane vlastný strop a scrolluje sa v ňom, takže
    // nevytlačí riadok akcií ani komentáre za orezanú hranu okna.
    const caption = screen.getByTestId('feed-post-caption');
    expect(caption.className).toContain('max-h-[25vh]');
    expect(caption.className).toContain('overflow-y-auto');
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
