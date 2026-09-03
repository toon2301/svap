/**
 * Mobilný prehliadač fotky príspevku – ťuk na fotku vo feede.
 *
 * Overuje sa celá ovládacia vrstva nad fotkou (hlavička, text, akcie, menu,
 * „X"), prepínanie vrstvy ťukom, vysúvací panel komentárov a to, že fotky
 * naďalej prepína pôvodný `ImageLightbox` – nie nová kópia jeho logiky.
 */

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

// Celý tento súbor je o MOBILE – tam ťuk na fotku otvára prehliadač.
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

function makeComment(overrides: Record<string, unknown> = {}) {
  return {
    id: 100,
    text: 'Pekná fotka',
    author,
    can_delete: false,
    can_edit: false,
    likes_count: 1,
    is_liked_by_me: false,
    replies: [],
    replies_count: 0,
    created_at: '2026-01-01T11:00:00Z',
    ...overrides,
  };
}

/** Vykreslí kartu vo feede a ťukne na fotku – tak sa prehliadač otvára. */
async function openViewer(post = makePost()) {
  render(<FeedPostCard post={post} />);
  await userEvent.click(screen.getByTestId('feed-image-open-11'));
  return await screen.findByTestId('feed-photo-viewer');
}

/** Swipe doľava/doprava nad fotkou – gesto rieši `ImageLightbox`. */
function swipe(direction: 'left' | 'right') {
  const frame = screen.getByTestId('feed-photo-viewer-frame');
  const from = 300;
  const to = direction === 'left' ? 100 : 500;
  fireEvent.touchStart(frame, { touches: [{ clientX: from, clientY: 200 }] });
  fireEvent.touchEnd(frame, {
    changedTouches: [{ clientX: to, clientY: 205 }],
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  resetOverlayLayers();
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

describe('otvorenie prehliadača', () => {
  it('shows the photo with the whole control layer', async () => {
    const viewer = await openViewer();

    // Fotku aj jej prepínanie rieši pôvodný ImageLightbox – tu len overujeme,
    // že sa vykreslil a že nad ním sedí nová vrstva.
    expect(within(viewer).getByTestId('feed-photo-viewer-image')).toBeInTheDocument();
    expect(within(viewer).getByTestId('feed-photo-viewer-author')).toHaveTextContent(
      'Jana Nováková',
    );
    expect(within(viewer).getByTestId('feed-photo-viewer-caption')).toHaveTextContent(
      'Text príspevku',
    );
    expect(within(viewer).getByTestId('feed-photo-viewer-like')).toBeInTheDocument();
    expect(within(viewer).getByTestId('feed-photo-viewer-comments')).toBeInTheDocument();
    expect(within(viewer).getByTestId('feed-photo-viewer-share')).toBeInTheDocument();
    expect(
      within(viewer).getByTestId('feed-photo-viewer-menu-trigger'),
    ).toBeInTheDocument();
    // „X" sa v predošlom návrhu stratilo – musí tu byť.
    expect(within(viewer).getByTestId('feed-photo-viewer-close')).toBeInTheDocument();
  });

  it('closes with the X button', async () => {
    await openViewer();

    await userEvent.click(screen.getByTestId('feed-photo-viewer-close'));

    await waitFor(() =>
      expect(screen.queryByTestId('feed-photo-viewer')).not.toBeInTheDocument(),
    );
  });

  it('keeps a long name on one line with an ellipsis', async () => {
    await openViewer(
      makePost({
        author: { ...author, display_name: 'Bartolomej Vratislav Podhradský-Nemešányi' },
      }),
    );

    const name = screen.getByTestId('feed-photo-viewer-author').querySelector('span span');
    // `truncate` = jeden riadok + trojbodka; `min-w-0` na obale mu dovolí
    // ustúpiť, takže „X" vpravo si vždy udrží miesto.
    expect(name?.className).toContain('truncate');
    expect(name?.className).not.toContain('break-words');
  });

  it('clamps the caption to two lines with a Viac toggle', async () => {
    await openViewer(makePost({ caption: 'Veľmi dlhý text príspevku.' }));

    const caption = screen.getByTestId('feed-photo-viewer-caption');
    expect(caption.className).toContain('line-clamp-2');

    await userEvent.click(screen.getByTestId('feed-photo-viewer-caption-more'));

    expect(screen.getByTestId('feed-photo-viewer-caption').className).not.toContain(
      'line-clamp-2',
    );
  });
});

describe('prepínanie ovládacej vrstvy ťukom na fotku', () => {
  it('hides the layer on tap and brings it back on the next one', async () => {
    await openViewer();

    fireEvent.click(screen.getByTestId('feed-photo-viewer-frame'));

    await waitFor(() =>
      expect(screen.queryByTestId('feed-photo-viewer-top')).not.toBeInTheDocument(),
    );
    expect(screen.queryByTestId('feed-photo-viewer-actions')).not.toBeInTheDocument();
    // Fotka ostáva – schová sa len vrstva nad ňou.
    expect(screen.getByTestId('feed-photo-viewer-image')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('feed-photo-viewer-frame'));

    expect(await screen.findByTestId('feed-photo-viewer-top')).toBeInTheDocument();
    expect(screen.getByTestId('feed-photo-viewer-actions')).toBeInTheDocument();
  });

  it('swipes between photos with the layer shown and hidden alike', async () => {
    await openViewer(makePost({ images: [image(11), image(12)] }));

    // Počítadlo kreslí ImageLightbox – dôkaz, že prepínanie ostalo jeho.
    expect(screen.getByTestId('feed-photo-viewer-counter')).toHaveTextContent('1/2');

    swipe('left');
    expect(screen.getByTestId('feed-photo-viewer-counter')).toHaveTextContent('2/2');

    // Vrstva preč – swipe musí fungovať ďalej.
    fireEvent.click(screen.getByTestId('feed-photo-viewer-frame'));
    await waitFor(() =>
      expect(screen.queryByTestId('feed-photo-viewer-top')).not.toBeInTheDocument(),
    );

    swipe('right');
    expect(screen.getByTestId('feed-photo-viewer-counter')).toHaveTextContent('1/2');
  });

  it('does not close when the dark backdrop is tapped', async () => {
    await openViewer();

    fireEvent.click(screen.getByTestId('feed-photo-viewer'));

    // Podklad je tu plocha na prepínanie vrstvy, nie na zatváranie.
    expect(screen.getByTestId('feed-photo-viewer')).toBeInTheDocument();
  });
});

describe('riadok akcií', () => {
  it('separates the like toggle from the likers list', async () => {
    mockedLike.mockResolvedValue({ likes_count: 3, is_liked_by_me: true } as never);
    jest.requireMock('@/lib/feedApi').listFeedPostLikers.mockResolvedValue({
      results: [],
      next: null,
      previous: null,
      count: 0,
    });
    await openViewer();

    expect(screen.getByTestId('feed-photo-viewer-like-count')).toHaveTextContent('2');

    // Srdiečko = prepnutie lajku.
    await userEvent.click(screen.getByTestId('feed-photo-viewer-like'));
    await waitFor(() =>
      expect(screen.getByTestId('feed-photo-viewer-like-count')).toHaveTextContent('3'),
    );
    expect(mockedLike).toHaveBeenCalledWith(7);

    // Počet = samostatná akcia, otvára existujúci zoznam lajkujúcich.
    await userEvent.click(screen.getByTestId('feed-photo-viewer-like-count'));
    expect(await screen.findByTestId('feed-likers-dialog')).toBeInTheDocument();
  });

  it('shows the comment count next to the icon', async () => {
    await openViewer();

    expect(
      screen.getByTestId('feed-photo-viewer-comments-count'),
    ).toHaveTextContent('3');
  });

  it('opens the existing share modal', async () => {
    await openViewer();

    await userEvent.click(screen.getByTestId('feed-photo-viewer-share'));

    expect(await screen.findByTestId('feed-share-modal')).toBeInTheDocument();
  });
});

/** Číselná hodnota z triedy `z-[NNN]`. */
function zIndexOf(node: Element | null): number {
  const match = node?.className?.toString().match(/z-\[(\d+)\]/);
  return match ? Number(match[1]) : 0;
}

describe('„..." menu', () => {
  it('offers only the report on somebody else post', async () => {
    await openViewer();

    await userEvent.click(screen.getByTestId('feed-photo-viewer-menu-trigger'));

    const menu = screen.getByTestId('feed-photo-viewer-menu');
    expect(within(menu).getByTestId('feed-photo-viewer-report')).toBeInTheDocument();
    expect(within(menu).queryByTestId('feed-photo-viewer-edit')).toBeNull();
    expect(within(menu).queryByTestId('feed-photo-viewer-delete')).toBeNull();
    // Zdieľanie má vlastnú ikonu v riadku akcií – v menu sa neduplikuje.
    expect(within(menu).queryByText('Zdieľať ďalej')).toBeNull();
  });

  it('adds edit and delete on the own post', async () => {
    await openViewer(makePost({ can_manage: true }));

    await userEvent.click(screen.getByTestId('feed-photo-viewer-menu-trigger'));

    const menu = screen.getByTestId('feed-photo-viewer-menu');
    expect(within(menu).getByTestId('feed-photo-viewer-report')).toBeInTheDocument();
    expect(within(menu).getByTestId('feed-photo-viewer-edit')).toBeInTheDocument();
    expect(within(menu).getByTestId('feed-photo-viewer-delete')).toBeInTheDocument();
  });

  it('opens the existing delete confirmation above the photo', async () => {
    await openViewer(makePost({ can_manage: true }));

    await userEvent.click(screen.getByTestId('feed-photo-viewer-menu-trigger'));
    await userEvent.click(screen.getByTestId('feed-photo-viewer-delete'));

    const confirm = await screen.findByTestId('feed-photo-viewer-delete-confirm');
    expect(confirm).toBeInTheDocument();
    // Potvrdenie sa kreslí portálom, takže o tom, či ho vidno, rozhoduje
    // vrstva – nižšia hodnota by ho schovala za fotku.
    expect(zIndexOf(confirm.closest('[class*="z-["]'))).toBeGreaterThan(
      zIndexOf(screen.getByTestId('feed-photo-viewer')),
    );
  });
});

describe('panel komentárov', () => {
  async function openSheet(post = makePost()) {
    await openViewer(post);
    await userEvent.click(screen.getByTestId('feed-photo-viewer-comments'));
    return await screen.findByTestId('feed-photo-comments-sheet');
  }

  it('slides up over the photo and leaves it peeking above', async () => {
    const sheet = await openSheet();

    expect(within(sheet).getByRole('heading', { name: 'Komentáre' })).toBeInTheDocument();
    expect(within(sheet).getByTestId('feed-post-comments')).toBeInTheDocument();
    // Panel nezaberá celú výšku – fotka aj hlavička nad ním ostávajú vidieť.
    expect(sheet.className).toContain('h-[78%]');
    expect(screen.getByTestId('feed-photo-viewer-image')).toBeInTheDocument();
  });

  it('closes on a downward drag', async () => {
    await openSheet();

    const drag = screen.getByTestId('feed-photo-comments-drag');
    fireEvent.touchStart(drag, { touches: [{ clientY: 100 }] });
    fireEvent.touchMove(drag, { touches: [{ clientY: 260 }] });
    fireEvent.touchEnd(drag);

    await waitFor(() =>
      expect(screen.queryByTestId('feed-photo-comments-sheet')).not.toBeInTheDocument(),
    );
  });

  it('ignores a short drag that is not a dismissal', async () => {
    await openSheet();

    const drag = screen.getByTestId('feed-photo-comments-drag');
    fireEvent.touchStart(drag, { touches: [{ clientY: 100 }] });
    fireEvent.touchMove(drag, { touches: [{ clientY: 120 }] });
    fireEvent.touchEnd(drag);

    expect(screen.getByTestId('feed-photo-comments-sheet')).toBeInTheDocument();
  });

  it('resets the drag when the system cancels the gesture', async () => {
    await openSheet();

    const drag = screen.getByTestId('feed-photo-comments-drag');
    fireEvent.touchStart(drag, { touches: [{ clientY: 100 }] });
    fireEvent.touchMove(drag, { touches: [{ clientY: 300 }] });
    // Zrušené gesto (hovor, gesto prehliadača, druhý prst) panel NEZATVÁRA…
    fireEvent.touchCancel(drag);

    const sheet = screen.getByTestId('feed-photo-comments-sheet');
    expect(sheet).toBeInTheDocument();
    // …a nesmie ho nechať odtiahnutý o poslednú nameranú vzdialenosť.
    expect(sheet).not.toHaveAttribute('style', expect.stringContaining('translateY'));

    // Ďalší dotyk začína odznova, nie od starého začiatku.
    fireEvent.touchStart(drag, { touches: [{ clientY: 100 }] });
    fireEvent.touchMove(drag, { touches: [{ clientY: 120 }] });
    fireEvent.touchEnd(drag);
    expect(screen.getByTestId('feed-photo-comments-sheet')).toBeInTheDocument();
  });

  it('closes from the drag handle as well', async () => {
    await openSheet();

    await userEvent.click(screen.getByTestId('feed-photo-comments-handle'));

    await waitFor(() =>
      expect(screen.queryByTestId('feed-photo-comments-sheet')).not.toBeInTheDocument(),
    );
  });

  it('stays dark in the light app theme and in the dark one alike', async () => {
    const sheet = await openSheet();

    // Tailwind je v projekte na `darkMode: 'class'`, takže `dark` na obale
    // zapne tmavú paletu celému vnútru bez ohľadu na režim appky.
    expect(sheet.className).toContain('dark');
    expect(sheet.className).toContain('bg-[#0f0f10]');
    const lightModeClasses = sheet.className;

    await act(async () => {
      document.documentElement.classList.add('dark');
    });

    // V tmavom režime appky vyzerá presne rovnako – je to zámerná výnimka
    // viazaná na tento panel, nie na režim.
    expect(screen.getByTestId('feed-photo-comments-sheet').className).toBe(
      lightModeClasses,
    );
  });

  it('uses a one-line composer with a send icon and no emoji button', async () => {
    const sheet = await openSheet();

    const composer = within(sheet).getByLabelText('Napíš komentár...');
    expect(composer).toHaveAttribute('rows', '1');
    expect(within(sheet).getByTestId('feed-comment-send')).toBeInTheDocument();
    // Emoji tlačidlo appka na mobile nekreslí nikde.
    expect(within(sheet).queryByLabelText('Pridať emoji')).toBeNull();
  });

  it('loads more comments by scrolling, without a button', async () => {
    mockedListComments.mockResolvedValue({
      results: [makeComment()],
      next: 'http://api.test/comments?cursor=2',
      previous: null,
      count: 2,
    });
    const sheet = await openSheet();

    await within(sheet).findByText('Pekná fotka');
    // Donačítava sentinel pri scrollovaní – žiadne „Zobraziť ďalšie".
    expect(within(sheet).getByTestId('feed-comments-sentinel')).toBeInTheDocument();
    expect(within(sheet).queryByText(/Zobraziť ďalšie/)).toBeNull();
  });
});

describe('komentáre v paneli', () => {
  async function openSheetWith(comments: Record<string, unknown>[]) {
    mockedListComments.mockResolvedValue({
      results: comments,
      next: null,
      previous: null,
      count: comments.length,
    });
    render(<FeedPostCard post={makePost()} />);
    await userEvent.click(screen.getByTestId('feed-image-open-11'));
    await screen.findByTestId('feed-photo-viewer');
    await userEvent.click(screen.getByTestId('feed-photo-viewer-comments'));
    return await screen.findByTestId('feed-photo-comments-sheet');
  }

  it('puts the name on its own line above the text, with a time', async () => {
    const sheet = await openSheetWith([makeComment()]);

    const name = await within(sheet).findByTestId('feed-comment-author-100');
    // Meno je vlastný blokový prvok, text komentára je až pod ním.
    expect(name.className).toContain('block');
    expect(name).toHaveTextContent('Jana Nováková');
    const text = within(sheet).getByText('Pekná fotka');
    expect(name.compareDocumentPosition(text)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(within(sheet).getByTestId('feed-comment-time-100')).toBeInTheDocument();
  });

  it('offers reply only on top-level comments and the pencil only on own ones', async () => {
    const sheet = await openSheetWith([
      makeComment({
        id: 100,
        can_edit: true,
        replies_count: 1,
        replies: [makeComment({ id: 101, text: 'Odpoveď', can_edit: false })],
      }),
    ]);

    await within(sheet).findByTestId('feed-comment-author-100');
    // Vrcholový komentár: „Odpovedať" + ceruzka (je vlastný).
    expect(within(sheet).getByTestId('feed-comment-reply-100')).toBeInTheDocument();
    expect(within(sheet).getByTestId('feed-comment-edit-100')).toBeInTheDocument();
    // Zbalené odpovede sa ponúkajú vedľa „Odpovedať".
    const toggle = within(sheet).getByTestId('feed-comment-toggle-replies-100');
    expect(toggle).toHaveTextContent('Zobraziť odpovede (1)');

    await userEvent.click(toggle);

    // Odpoveď: lajk áno, „Odpovedať" nie (vnorenie je jednoúrovňové),
    // ceruzka nie (nie je vlastná).
    expect(await within(sheet).findByText('Odpoveď')).toBeInTheDocument();
    expect(within(sheet).queryByTestId('feed-comment-reply-101')).toBeNull();
    expect(within(sheet).queryByTestId('feed-comment-edit-101')).toBeNull();
    expect(
      within(sheet).getByTestId('feed-comment-like-101'),
    ).toBeInTheDocument();
    expect(within(sheet).getByTestId('feed-comment-like-100')).toBeInTheDocument();
  });
});

describe('preklik na profil', () => {
  it('opens the profile from the viewer header', async () => {
    const seen: string[] = [];
    const handler = (event: Event) => {
      seen.push((event as CustomEvent).detail?.identifier);
    };
    window.addEventListener('goToUserProfile', handler);
    try {
      await openViewer();

      await userEvent.click(screen.getByTestId('feed-photo-viewer-author'));

      expect(seen).toEqual(['jana']);
    } finally {
      window.removeEventListener('goToUserProfile', handler);
    }
  });

  it('opens the profile from a comment author', async () => {
    mockedListComments.mockResolvedValue({
      results: [makeComment()],
      next: null,
      previous: null,
      count: 1,
    });
    const seen: string[] = [];
    const handler = (event: Event) => {
      seen.push((event as CustomEvent).detail?.identifier);
    };
    window.addEventListener('goToUserProfile', handler);
    try {
      await openViewer();
      await userEvent.click(screen.getByTestId('feed-photo-viewer-comments'));
      const sheet = await screen.findByTestId('feed-photo-comments-sheet');

      await userEvent.click(
        await within(sheet).findByTestId('feed-comment-author-100'),
      );

      expect(seen).toEqual(['jana']);
    } finally {
      window.removeEventListener('goToUserProfile', handler);
    }
  });
});
