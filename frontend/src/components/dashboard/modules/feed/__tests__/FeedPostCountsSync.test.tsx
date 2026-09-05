/**
 * Obojsmerná synchronizácia lajku a počtu komentárov medzi kartou a vrstvou.
 *
 * Predtým odoberala udalosti jediná `FeedPostCard`, takže signál tiekol len
 * jedným smerom: zmena vo vrstve sa dostala na kartu, zmena na karte do
 * otvorenej vrstvy nikdy. Oba hooky (`useFeedPostLike`,
 * `useFeedPostCommentsCount`) teraz vysielajú aj odoberajú.
 */

import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostCard from '../FeedPostCard';
import { resetOverlayLayers } from '../../shared/overlayLayers';
import { emitFeedPostCounts } from '../feedPostCountEvents';
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

const feedApi = jest.requireMock('@/lib/feedApi');
const mockedLike = feedApi.likeFeedPost as jest.Mock;
const mockedUnlike = feedApi.unlikeFeedPost as jest.Mock;
const mockedGetPost = feedApi.getFeedPost as jest.Mock;
const mockedListComments = feedApi.listFeedPostComments as jest.Mock;
const mockedCreateComment = feedApi.createFeedPostComment as jest.Mock;

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
    likes_count: 4,
    comments_count: 2,
    is_liked_by_me: false,
    can_manage: false,
    created_at: '2026-01-01T10:00:00Z',
    ...overrides,
  } as FeedPost;
}

/**
 * Nechá dobehnúť prvé načítanie zoznamu komentárov.
 *
 * Zoznam po ňom rozpošle svoj CELKOVÝ počet zo servera. Bez tohto čakania by
 * dorazil až po tom, čo si test injektuje vlastnú hodnotu, a legitímne by ju
 * prepísal – test by potom padal náhodne podľa toho, čo stihlo prvé.
 *
 * Čaká sa na ZNAK V DOM („Načítavam…" zmizlo), nie na počet prebehnutých
 * mikroúloh: to je nezávislé od toho, koľko krokov má načítanie vnútri.
 */
async function settleComments() {
  await waitFor(() =>
    expect(screen.queryByText('Načítavam...')).not.toBeInTheDocument(),
  );
  await act(async () => {});
}

/** Karta vo feede s otvorenou mobilnou obrazovkou detailu nad ňou. */
async function openMobileDetail(post = makePost()) {
  render(<FeedPostCard post={post} />);
  await userEvent.click(screen.getByTestId('feed-comments-button'));
  const detail = await screen.findByTestId('feed-mobile-detail');
  await settleComments();
  return detail;
}

/** Karta vo feede s otvoreným prehliadačom fotky nad ňou. */
async function openPhotoViewer(post = makePost()) {
  render(<FeedPostCard post={post} />);
  await userEvent.click(screen.getByTestId('feed-image-open-11'));
  const viewer = await screen.findByTestId('feed-photo-viewer');
  await settleComments();
  return viewer;
}

beforeEach(() => {
  jest.clearAllMocks();
  resetOverlayLayers();
  mockedListComments.mockResolvedValue({
    results: [],
    next: null,
    previous: null,
    count: 2,
  });
});

describe('lajk z karty do otvorenej vrstvy', () => {
  it('reaches the mobile detail screen — this never worked before', async () => {
    mockedLike.mockResolvedValue({ likes_count: 5, is_liked_by_me: true });
    const detail = await openMobileDetail();
    expect(
      within(detail).getByTestId('feed-mobile-detail-like-count'),
    ).toHaveTextContent('4');

    // Lajk na KARTE pod obrazovkou (druhé tlačidlo na obrazovke).
    await userEvent.click(screen.getByTestId('feed-like-button'));

    await waitFor(() =>
      expect(
        within(detail).getByTestId('feed-mobile-detail-like-count'),
      ).toHaveTextContent('5'),
    );
  });

  it('reaches the immersive photo viewer as well', async () => {
    mockedLike.mockResolvedValue({ likes_count: 5, is_liked_by_me: true });
    const viewer = await openPhotoViewer();

    await userEvent.click(screen.getByTestId('feed-like-button'));

    await waitFor(() =>
      expect(
        within(viewer).getByTestId('feed-photo-viewer-like-count'),
      ).toHaveTextContent('5'),
    );
  });
});

describe('lajk z otvorenej vrstvy na kartu', () => {
  it('still reaches the card underneath (regresný smer)', async () => {
    mockedLike.mockResolvedValue({ likes_count: 5, is_liked_by_me: true });
    const detail = await openMobileDetail();

    await userEvent.click(
      within(detail).getByTestId('feed-mobile-detail-like'),
    );

    await waitFor(() =>
      expect(screen.getByTestId('feed-like-count')).toHaveTextContent('5'),
    );
  });
});

describe('optimistický lajk sa neprepíše vlastným echom', () => {
  it('keeps the optimistic value while the request is still running', async () => {
    // Server odpovie až keď to test dovolí – dovtedy platí optimistická zmena.
    let settle!: (value: unknown) => void;
    mockedLike.mockReturnValue(
      new Promise((resolve) => {
        settle = resolve;
      }),
    );
    const detail = await openMobileDetail();

    await userEvent.click(
      within(detail).getByTestId('feed-mobile-detail-like'),
    );
    // Optimisticky 4 → 5 na oboch miestach.
    await waitFor(() =>
      expect(
        within(detail).getByTestId('feed-mobile-detail-like-count'),
      ).toHaveTextContent('5'),
    );

    // Počas bežiaceho lajku dorazí ECHO so starou hodnotou (napr. dobiehajúce
    // dopytovanie počtov). MIESTO, KTORÉ LAJK SPUSTILO, ho musí ignorovať –
    // inak by si vlastnú optimistickú zmenu prepísalo späť.
    await act(async () => {
      emitFeedPostCounts({ postId: 7, likesCount: 4, isLikedByMe: false });
    });

    expect(
      within(detail).getByTestId('feed-mobile-detail-like-count'),
    ).toHaveTextContent('5');

    // Karta pod ňou žiadny vlastný lajk nespustila, takže cudziu hodnotu
    // prevziať SMIE – a keď odpoveď dorazí, dorovná ju vysielateľ.
    await act(async () => {
      settle({ likes_count: 5, is_liked_by_me: true });
    });
    await waitFor(() =>
      expect(screen.getByTestId('feed-like-count')).toHaveTextContent('5'),
    );
    expect(
      within(detail).getByTestId('feed-mobile-detail-like-count'),
    ).toHaveTextContent('5');
  });

  it('accepts an outside change once no like is in flight', async () => {
    const detail = await openMobileDetail();

    await act(async () => {
      emitFeedPostCounts({ postId: 7, likesCount: 9, isLikedByMe: true });
    });

    // Bez rozbehnutého vlastného lajku sa cudzia zmena prevziať MÁ.
    expect(
      within(detail).getByTestId('feed-mobile-detail-like-count'),
    ).toHaveTextContent('9');
    expect(screen.getByTestId('feed-like-count')).toHaveTextContent('9');
  });

  it('ignores counts of a different post', async () => {
    const detail = await openMobileDetail();

    await act(async () => {
      emitFeedPostCounts({ postId: 999, likesCount: 77, commentsCount: 77 });
    });

    expect(
      within(detail).getByTestId('feed-mobile-detail-like-count'),
    ).toHaveTextContent('4');
  });
});

describe('počet komentárov', () => {
  it('updates everywhere when a comment is added in a layer', async () => {
    mockedCreateComment.mockResolvedValue({
      id: 500,
      text: 'Nový',
      author,
      can_delete: true,
      can_edit: true,
      likes_count: 0,
      is_liked_by_me: false,
      replies: [],
      replies_count: 0,
      created_at: '2026-01-01T12:00:00Z',
    });
    const detail = await openMobileDetail();

    const field = within(detail).getByLabelText('Napíš komentár...');
    await userEvent.type(field, 'Nový');
    await userEvent.click(within(detail).getByTestId('feed-comment-send'));

    // Číslo musí narásť aj na karte pod obrazovkou, aj v samotnej obrazovke.
    await waitFor(() =>
      expect(screen.getByTestId('feed-comments-button')).toHaveTextContent('3'),
    );
    expect(
      within(detail).getByTestId('feed-mobile-detail-comments'),
    ).toHaveTextContent('3');
  });

  it('reaches an open layer from an outside change', async () => {
    const detail = await openMobileDetail();

    await act(async () => {
      emitFeedPostCounts({ postId: 7, commentsCount: 12 });
    });

    expect(
      within(detail).getByTestId('feed-mobile-detail-comments'),
    ).toHaveTextContent('12');
    expect(screen.getByTestId('feed-comments-button')).toHaveTextContent('12');
  });
});

describe('pravidelné dopytovanie počtov na karte', () => {
  it('publishes fresh server counts into the open layer', async () => {
    mockedGetPost.mockResolvedValue(
      makePost({ likes_count: 21, comments_count: 8, is_liked_by_me: true }),
    );
    const detail = await openMobileDetail();

    // To isté, čo urobí tik dopytovania na karte: rozpošle serverovú pravdu.
    // Predtým ju `refreshCounts` zapísal len lokálne, takže otvorená vrstva
    // ostala na čísle z momentu otvorenia.
    await act(async () => {
      emitFeedPostCounts({
        postId: 7,
        likesCount: 21,
        isLikedByMe: true,
        commentsCount: 8,
      });
    });

    expect(
      within(detail).getByTestId('feed-mobile-detail-like-count'),
    ).toHaveTextContent('21');
    expect(
      within(detail).getByTestId('feed-mobile-detail-comments'),
    ).toHaveTextContent('8');
  });
});

describe('odhlásenie lajku', () => {
  it('propagates an unlike in both directions', async () => {
    mockedUnlike.mockResolvedValue({ likes_count: 3, is_liked_by_me: false });
    const detail = await openMobileDetail(makePost({ is_liked_by_me: true }));

    await userEvent.click(screen.getByTestId('feed-like-button'));

    await waitFor(() =>
      expect(
        within(detail).getByTestId('feed-mobile-detail-like-count'),
      ).toHaveTextContent('3'),
    );
  });
});

describe('zlyhaný lajk sa vráti späť VŠADE, nielen tam, kde zlyhal', () => {
  /** Sieťová chyba – bez `response`, teda nie „príspevok zmizol". */
  const networkError = new Error('network down');

  it('rolls the card back when the like fails in the mobile detail layer', async () => {
    mockedLike.mockRejectedValue(networkError);
    const detail = await openMobileDetail();

    await userEvent.click(within(detail).getByTestId('feed-mobile-detail-like'));

    // Vrstva, v ktorej sa klikalo, sa vráti na pôvodný stav…
    await waitFor(() =>
      expect(
        within(detail).getByTestId('feed-mobile-detail-like-count'),
      ).toHaveTextContent('4'),
    );
    expect(
      within(detail).getByTestId('feed-mobile-detail-like'),
    ).toHaveAttribute('aria-pressed', 'false');

    // …a KARTA pod ňou sa nesmie zaseknúť na krátko zobrazenej optimistickej
    // hodnote, ktorú by už nikto neopravil.
    expect(screen.getByTestId('feed-like-count')).toHaveTextContent('4');
  });

  it('rolls the card back when the like fails in the photo viewer', async () => {
    mockedLike.mockRejectedValue(networkError);
    const viewer = await openPhotoViewer();

    await userEvent.click(within(viewer).getByTestId('feed-photo-viewer-like'));

    await waitFor(() =>
      expect(
        within(viewer).getByTestId('feed-photo-viewer-like-count'),
      ).toHaveTextContent('4'),
    );
    expect(screen.getByTestId('feed-like-count')).toHaveTextContent('4');
  });

  it('rolls the open layer back when the like fails on the card', async () => {
    mockedLike.mockRejectedValue(networkError);
    const detail = await openMobileDetail();

    await userEvent.click(screen.getByTestId('feed-like-button'));

    // Opačný smer: klikalo sa na karte, vrátenie musí dôjsť aj hore.
    await waitFor(() =>
      expect(screen.getByTestId('feed-like-count')).toHaveTextContent('4'),
    );
    expect(
      within(detail).getByTestId('feed-mobile-detail-like-count'),
    ).toHaveTextContent('4');
    expect(
      within(detail).getByTestId('feed-mobile-detail-like'),
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('rolls a failed UNLIKE back to the liked state everywhere', async () => {
    mockedUnlike.mockRejectedValue(networkError);
    const detail = await openMobileDetail(
      makePost({ is_liked_by_me: true, likes_count: 4 }),
    );

    await userEvent.click(within(detail).getByTestId('feed-mobile-detail-like'));

    await waitFor(() =>
      expect(
        within(detail).getByTestId('feed-mobile-detail-like-count'),
      ).toHaveTextContent('4'),
    );
    expect(
      within(detail).getByTestId('feed-mobile-detail-like'),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('feed-like-count')).toHaveTextContent('4');
  });

  it('shows the optimistic value first and only then takes it back', async () => {
    // Zlyhanie sa oddiali, aby sa dal odmerať aj medzistav – bez neho by test
    // prešiel aj vtedy, keby sa optimistická zmena nikdy nezobrazila.
    let fail!: (error: unknown) => void;
    mockedLike.mockReturnValue(
      new Promise((_resolve, reject) => {
        fail = reject;
      }),
    );
    const detail = await openMobileDetail();

    await userEvent.click(within(detail).getByTestId('feed-mobile-detail-like'));

    await waitFor(() =>
      expect(screen.getByTestId('feed-like-count')).toHaveTextContent('5'),
    );

    await act(async () => {
      fail(networkError);
    });

    expect(screen.getByTestId('feed-like-count')).toHaveTextContent('4');
    expect(
      within(detail).getByTestId('feed-mobile-detail-like-count'),
    ).toHaveTextContent('4');
  });

  it('stays usable after the failure — a retry still works', async () => {
    mockedLike
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce({ likes_count: 5, is_liked_by_me: true });
    const detail = await openMobileDetail();

    await userEvent.click(within(detail).getByTestId('feed-mobile-detail-like'));
    await waitFor(() =>
      expect(screen.getByTestId('feed-like-count')).toHaveTextContent('4'),
    );

    // Zámok sa po zlyhaní uvoľnil, takže ďalší pokus prejde a rozpošle sa.
    await userEvent.click(within(detail).getByTestId('feed-mobile-detail-like'));

    await waitFor(() =>
      expect(screen.getByTestId('feed-like-count')).toHaveTextContent('5'),
    );
    expect(
      within(detail).getByTestId('feed-mobile-detail-like-count'),
    ).toHaveTextContent('5');
  });
});
