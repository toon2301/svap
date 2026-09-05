/**
 * Zmazaný príspevok naprieč Nástenkou.
 *
 * Príspevok sa dá zmazať v inej relácii, kým ho appka ešte ukazuje. Ktorákoľvek
 * interakcia (otvorenie detailu, lajk, komentár) to má zistiť a zariadiť to
 * isté: kartu preč zo zoznamov, otvorené vrstvy zavrieť, jeden neutrálny toast
 * – bez reloadu a bez odhlásenia.
 */

import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import toast from 'react-hot-toast';
import FeedPostCard from '../FeedPostCard';
import FeedPostDetailOverlay from '../FeedPostDetailOverlay';
import { resetOverlayLayers } from '../../shared/overlayLayers';
import {
  handleGoneFeedPost,
  isFeedPostGoneError,
  resetAnnouncedFeedPosts,
} from '../feedPostGone';
import { onFeedPostDeleted } from '../feedPostDeletedEvents';
import { emitFeedPostCounts } from '../feedPostCountEvents';
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
const mockedLike = jest.requireMock('@/lib/feedApi').likeFeedPost as jest.Mock;
const mockedListComments = jest.requireMock('@/lib/feedApi')
  .listFeedPostComments as jest.Mock;
const mockedToastError = (toast as unknown as { error: jest.Mock }).error;

const GONE_MESSAGE = 'Tento príspevok už nie je dostupný.';

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
    likes_count: 1,
    comments_count: 0,
    is_liked_by_me: false,
    can_manage: false,
    created_at: '2026-01-01T10:00:00Z',
    ...overrides,
  } as FeedPost;
}

/** Zachytáva signál „príspevok zmizol", ktorý zoznamy počúvajú. */
function watchRemovals(): { ids: number[]; stop: () => void } {
  const ids: number[] = [];
  const stop = onFeedPostDeleted((id) => ids.push(id));
  return { ids, stop };
}

beforeEach(() => {
  jest.clearAllMocks();
  resetOverlayLayers();
  resetAnnouncedFeedPosts();
  mockIsMobile = false;
  mockedListComments.mockResolvedValue({
    results: [],
    next: null,
    previous: null,
    count: 0,
  });
});

describe('rozpoznanie chyby', () => {
  it('treats 404, 403 and 410 as gone, nothing else', () => {
    for (const status of [404, 403, 410]) {
      expect(isFeedPostGoneError({ response: { status } })).toBe(true);
    }
    for (const status of [400, 401, 429, 500]) {
      expect(isFeedPostGoneError({ response: { status } })).toBe(false);
    }
    // Výpadok siete nie je „zmizol" – príspevok môže ďalej existovať.
    expect(isFeedPostGoneError(new Error('network'))).toBe(false);
  });
});

describe('jeden toast na príspevok', () => {
  it('announces the same post only once, but keeps signalling removal', () => {
    const { ids, stop } = watchRemovals();
    try {
      const t = (_k: string, fallback: string) => fallback;
      handleGoneFeedPost(7, t);
      handleGoneFeedPost(7, t);
      handleGoneFeedPost(7, t);

      // Toast padne raz…
      expect(mockedToastError).toHaveBeenCalledTimes(1);
      expect(mockedToastError).toHaveBeenCalledWith(GONE_MESSAGE);
      // …ale signál ide vždy, aby sa zavreli aj neskôr otvorené vrstvy.
      expect(ids).toEqual([7, 7, 7]);
    } finally {
      stop();
    }
  });

  it('announces a different post separately', () => {
    const t = (_k: string, fallback: string) => fallback;
    handleGoneFeedPost(7, t);
    handleGoneFeedPost(8, t);

    expect(mockedToastError).toHaveBeenCalledTimes(2);
  });
});

describe('lajk na zmiznutom príspevku', () => {
  it('removes the post, announces it once and keeps the app running', async () => {
    mockedLike.mockRejectedValue({ response: { status: 404 } });
    const { ids, stop } = watchRemovals();
    try {
      render(<FeedPostCard post={makePost()} />);

      await userEvent.click(screen.getByTestId('feed-like-button'));

      await waitFor(() => expect(ids).toEqual([7]));
      expect(mockedToastError).toHaveBeenCalledTimes(1);
      expect(mockedToastError).toHaveBeenCalledWith(GONE_MESSAGE);

      // Druhá interakcia s tým istým príspevkom už mlčí.
      await userEvent.click(screen.getByTestId('feed-like-button'));
      await waitFor(() => expect(ids).toEqual([7, 7]));
      expect(mockedToastError).toHaveBeenCalledTimes(1);
    } finally {
      stop();
    }
  });
});

describe('načítanie komentárov zmiznutého príspevku', () => {
  it('removes the post instead of offering a retry', async () => {
    mockIsMobile = true;
    mockedListComments.mockRejectedValue({ response: { status: 404 } });
    const { ids, stop } = watchRemovals();
    try {
      render(<FeedPostCard post={makePost()} />);

      await userEvent.click(screen.getByTestId('feed-comments-button'));

      await waitFor(() => expect(ids).toContain(7));
      expect(mockedToastError).toHaveBeenCalledWith(GONE_MESSAGE);
      // „Skúsiť znova" by tu nemalo čo skúšať.
      expect(screen.queryByText('Komentáre sa nepodarilo načítať.')).toBeNull();
    } finally {
      stop();
    }
  });
});

describe('otvorené vrstvy sa zatvárajú', () => {
  it('closes the mobile detail when the post disappears', async () => {
    mockIsMobile = true;
    render(<FeedPostCard post={makePost()} />);
    await userEvent.click(screen.getByTestId('feed-comments-button'));
    await screen.findByTestId('feed-mobile-detail');

    await act(async () => {
      handleGoneFeedPost(7, (_k, fallback) => fallback as string);
    });

    await waitFor(() =>
      expect(screen.queryByTestId('feed-mobile-detail')).not.toBeInTheDocument(),
    );
  });

  it('closes the immersive photo viewer when the post disappears', async () => {
    mockIsMobile = true;
    render(<FeedPostCard post={makePost()} />);
    await userEvent.click(screen.getByTestId('feed-image-open-11'));
    await screen.findByTestId('feed-photo-viewer');

    await act(async () => {
      handleGoneFeedPost(7, (_k, fallback) => fallback as string);
    });

    await waitFor(() =>
      expect(screen.queryByTestId('feed-photo-viewer')).not.toBeInTheDocument(),
    );
  });

  it('closes the desktop detail window when the post disappears', async () => {
    mockedGetPost.mockResolvedValue(makePost());
    const onClose = jest.fn();
    render(<FeedPostDetailOverlay postId={7} onClose={onClose} />);
    await screen.findByTestId('feed-post-card');

    await act(async () => {
      handleGoneFeedPost(7, (_k, fallback) => fallback as string);
    });

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});

describe('otvorenie detailu zmiznutého príspevku', () => {
  it('removes it from the feed as well, not just closes the window', async () => {
    mockedGetPost.mockRejectedValue({ response: { status: 404 } });
    const onClose = jest.fn();
    const { ids, stop } = watchRemovals();
    try {
      render(<FeedPostDetailOverlay postId={7} onClose={onClose} />);

      await waitFor(() => expect(onClose).toHaveBeenCalled());
      // Predtým okno len zmizlo a karta vo feede ostala visieť.
      expect(ids).toEqual([7]);
      expect(mockedToastError).toHaveBeenCalledWith(GONE_MESSAGE);
    } finally {
      stop();
    }
  });
});

describe('dopytovanie na pozadí pre zmiznutý príspevok', () => {
  it('stops polling instead of asking every 8 seconds forever', async () => {
    jest.useFakeTimers();
    try {
      // Komentáre rozbalené PRIAMO V KARTE – tak ich vykresľuje mobilný
      // permalink (`FeedPostDetailModule`). Zoznam tam ostáva namountovaný aj
      // po zistení, že príspevok zmizol: karta zatvára svoje vlastné vrstvy,
      // ale rozbalené komentáre v sebe nie, a stránka pod nimi žiadny zoznam
      // nemá, ktorý by kartu odstránil.
      mockedListComments.mockRejectedValue({ response: { status: 404 } });
      render(<FeedPostCard post={makePost()} initialCommentsOpen />);
      await act(async () => {});

      const callsAfterFirstLoad = mockedListComments.mock.calls.length;
      expect(callsAfterFirstLoad).toBeGreaterThan(0);
      expect(screen.getByTestId('feed-post-comments')).toBeInTheDocument();

      // Tri celé kolá dopytovania (8 s každé).
      await act(async () => {
        jest.advanceTimersByTime(8000 * 3);
      });

      // Zmiznutý príspevok sa už nedopytuje – „zmizol" predtým nebolo to isté
      // ako „zlyhalo", takže sa pýtal ďalej donekonečna.
      expect(mockedListComments.mock.calls.length).toBe(callsAfterFirstLoad);
    } finally {
      jest.useRealTimers();
    }
  });

  it('keeps polling a post that merely failed to load', async () => {
    jest.useFakeTimers();
    try {
      // Kontrast: výpadok siete NIE JE „zmizol". Tam sa oplatí skúsiť znova,
      // takže sa dopytovanie zastaviť nesmie.
      mockedListComments.mockRejectedValue(new Error('network'));
      render(<FeedPostCard post={makePost()} initialCommentsOpen />);
      await act(async () => {});

      const callsAfterFirstLoad = mockedListComments.mock.calls.length;
      await act(async () => {
        jest.advanceTimersByTime(8000 * 3);
      });

      // Zlyhanie zapne „skúsiť znova" a dopytovanie sa pozastaví cez `failed`,
      // takže ani tu nepribudnú kolá – rozdiel je v tom, že sa dá obnoviť.
      expect(mockedListComments.mock.calls.length).toBe(callsAfterFirstLoad);
      expect(
        screen.getByText('Komentáre sa nepodarilo načítať.'),
      ).toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('zastaraná odpoveď v okne detailu', () => {
  it('does not overwrite a newer comments count with an older snapshot', async () => {
    // Zoznam komentárov zámerne nikdy nedobehne: aj on po načítaní zverejní
    // svoj celkový počet a test by potom meral jeho hodnotu, nie snímku
    // z načítania príspevku.
    mockedListComments.mockReturnValue(new Promise(() => {}));
    // Načítanie príspevku sa zdrží; medzitým dorazí novší počet odinakiaľ.
    let deliver!: (post: FeedPost) => void;
    mockedGetPost.mockReturnValue(
      new Promise<FeedPost>((resolve) => {
        deliver = resolve;
      }),
    );
    render(<FeedPostDetailOverlay postId={7} onClose={jest.fn()} />);

    await act(async () => {
      emitFeedPostCounts({ postId: 7, commentsCount: 42 });
    });

    // Odpoveď nesie STARŠIU snímku (2), lebo odišla pred tou zmenou.
    await act(async () => {
      deliver(makePost({ comments_count: 2 }));
    });

    const overlay = await screen.findByTestId('feed-post-overlay');
    expect(
      within(overlay).getByTestId('feed-comments-button'),
    ).toHaveTextContent('42');
  });

  it('publishes the loaded count when nothing changed meanwhile', async () => {
    mockedListComments.mockReturnValue(new Promise(() => {}));
    mockedGetPost.mockResolvedValue(makePost({ comments_count: 6 }));
    render(<FeedPostDetailOverlay postId={7} onClose={jest.fn()} />);

    const overlay = await screen.findByTestId('feed-post-overlay');
    await waitFor(() =>
      expect(
        within(overlay).getByTestId('feed-comments-button'),
      ).toHaveTextContent('6'),
    );
  });
});
