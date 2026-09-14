/**
 * Zdieľanie z otvoreného okna detailu (desktop).
 *
 * Po zdieľaní sa pristáva na Nástenke, ale záznam okna v histórii OSTÁVA:
 * Späť z Nástenky má vrátiť do príspevku, z ktorého sa zdieľalo. Okno sa preto
 * zatvára s `keepHistory` a na Nástenku sa ide pushom – rovnako ako pri
 * zdieľaní z profilu.
 *
 * Test meria MECHANIZMUS, nie len výslednú adresu: v jsdom `pushState` zaradený
 * `back()` úplne zruší (odmerané: žiadny `popstate`, adresa končí na
 * pushnutej ceste), takže by tvrdenie o adrese prešlo aj s chybou. Rozhoduje
 * teda aj to, či sa krok späť vôbec vyžiada a s akou voľbou sa okno zatvára.
 */

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostDetailOverlay from '../FeedPostDetailOverlay';
import {
  FeedPostOverlayProvider,
  type FeedPostOverlayCloseOptions,
} from '../../../contexts/FeedPostOverlayContext';
import {
  emitFeedShareLanding,
  registerFeedLandingTarget,
  resetFeedShareLanding,
} from '../feedShareLanding';
import {
  adoptFeedOverlayHistory,
  pushFeedOverlayHistory,
  popFeedOverlayHistory,
  forgetFeedOverlayHistory,
  isFeedOverlayHistoryBusy,
  resetFeedOverlayHistory,
} from '../feedOverlayHistory';
import { onFeedHomeNavigation } from '../feedHomeNavigation';
import { decideFeedPostEntry } from '../feedPostEntryDecision';
import { parseFeedPostTargetUrl } from '../feedPostRouting';
import { getFeedPost, shareFeedPost } from '@/lib/feedApi';

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

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock('../../messages/DesktopEmojiPickerButton', () => ({
  DesktopEmojiPickerButton: () => null,
}));

jest.mock('../../messages/GroupUserPicker', () => ({
  GroupUserPicker: () => <div />,
}));

jest.mock('framer-motion', () => ({
  motion: {
    article: ({ children, ...props }: React.ComponentProps<'article'>) => (
      <article {...props}>{children}</article>
    ),
  },
}));

const mockedGetPost = getFeedPost as jest.MockedFunction<typeof getFeedPost>;
const mockedShare = shareFeedPost as jest.MockedFunction<typeof shareFeedPost>;

const author = {
  id: 10,
  display_name: 'Jana',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};

const PROFILE_PATH = '/dashboard/users/peter';
const OVERLAY_PATH = '/dashboard/feed/7';
const FEED_PATH = '/dashboard';

function post() {
  return {
    id: 7,
    post_type: 'free_post',
    caption: 'Text príspevku',
    author,
    images: [],
    shared_content: null,
    shared_content_unavailable: false,
    tagged_users: [],
    likes_count: 0,
    comments_count: 0,
    is_liked_by_me: false,
    can_manage: false,
    created_at: '2026-01-01T10:00:00Z',
  } as never;
}

/**
 * Dashboard okolo okna: stav okna, účtovníctvo histórie a reakcia na adresu
 * príspevku presne tak, ako to robí `DashboardContent`
 * (`handleFeedOverlayTargetChange`, popstate pri otvorenom okne a vstup cez
 * `decideFeedPostEntry`).
 */
let closeOptions: Array<FeedPostOverlayCloseOptions | undefined>;
let backSpy: jest.SpyInstance;
let homeRequests: number;
let stopHomeRequests: () => void;

function OverlayHost() {
  const [target, setTarget] = React.useState<{ postId: number } | null>({
    postId: 7,
  });
  const handleTargetChange = React.useCallback(
    (next: { postId: number } | null, options?: FeedPostOverlayCloseOptions) => {
      setTarget(next);
      if (next) return;
      closeOptions.push(options);
      if (options?.keepHistory) {
        forgetFeedOverlayHistory();
        return;
      }
      popFeedOverlayHistory();
    },
    [],
  );

  React.useEffect(() => {
    const handlePopState = () => {
      if (target) {
        // Späť pri otvorenom okne – záznam okna práve zmizol.
        forgetFeedOverlayHistory();
        setTarget(null);
        return;
      }
      const decision = decideFeedPostEntry({
        pathPostId: parseFeedPostTargetUrl(window.location.pathname)?.postId ?? null,
        overlayOpen: false,
        historyBusy: isFeedOverlayHistoryBusy(),
        liveUrl: window.location.pathname + window.location.search,
        viewportResolved: true,
        isMobile: false,
      });
      if (decision.kind !== 'overlay') return;
      adoptFeedOverlayHistory();
      setTarget(decision.target);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [target]);

  return (
    <FeedPostOverlayProvider onTargetChange={handleTargetChange}>
      <div data-testid="module-underneath" />
      {target ? (
        <FeedPostDetailOverlay
          postId={target.postId}
          highlightCommentId={null}
          onClose={() => handleTargetChange(null)}
        />
      ) : null}
    </FeedPostOverlayProvider>
  );
}

/** Prepnutie na Nástenku – to, čo spraví `handleMainModuleChange('home')`. */
function navigateToFeed() {
  window.history.pushState(null, '', FEED_PATH);
}

beforeEach(() => {
  jest.clearAllMocks();
  resetFeedShareLanding();
  resetFeedOverlayHistory();
  mockedGetPost.mockResolvedValue(post());
  // Okno bolo otvorené a pridalo si svoj záznam.
  window.history.replaceState(null, '', PROFILE_PATH);
  pushFeedOverlayHistory(OVERLAY_PATH);
  closeOptions = [];
  backSpy = jest.spyOn(window.history, 'back');
  homeRequests = 0;
  stopHomeRequests = onFeedHomeNavigation(() => {
    homeRequests += 1;
    navigateToFeed();
  });
});

afterEach(() => {
  stopHomeRequests();
  backSpy.mockRestore();
  resetFeedShareLanding();
  resetFeedOverlayHistory();
});

/** Nechá dobehnúť prípadný zaradený `history.back()`. */
async function settleHistory() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
}

/** Krok späť, ktorý sa naozaj stal (jsdom ho vybavuje asynchrónne). */
async function goBack() {
  await act(async () => {
    await new Promise<void>((resolve) => {
      const onPopState = () => {
        window.removeEventListener('popstate', onPopState);
        resolve();
      };
      window.addEventListener('popstate', onPopState);
      window.history.back();
    });
  });
}

describe('okno nad nefeedovým modulom', () => {
  it('closes without its own step back and leaves the navigation to the dialog', async () => {
    render(<OverlayHost />);
    await screen.findByTestId('feed-post-overlay');
    expect(window.location.pathname).toBe(OVERLAY_PATH);

    act(() => emitFeedShareLanding(99));

    await waitFor(() =>
      expect(screen.queryByTestId('feed-post-overlay')).not.toBeInTheDocument(),
    );
    // Vlastný krok späť je asynchrónny, takže by dobehol až PO prepnutí modulu.
    expect(backSpy).not.toHaveBeenCalled();
    expect(closeOptions).toEqual([{ keepHistory: true }]);
    // Feed na obrazovke nie je – navigáciu spúšťa dialóg, okno ju nezdvojí.
    expect(homeRequests).toBe(0);
  });

  it('ends up on the feed once the navigation runs', async () => {
    render(<OverlayHost />);
    await screen.findByTestId('feed-post-overlay');

    act(() => {
      emitFeedShareLanding(99);
      navigateToFeed();
    });

    await settleHistory();
    expect(window.location.pathname).toBe(FEED_PATH);
  });
});

describe('okno nad Nástenkou', () => {
  it('keeps its history entry and moves to the feed with a push', async () => {
    // Feed je pod oknom – dialóg nenaviguje, na Nástenku preskočí okno samo.
    const release = registerFeedLandingTarget();
    render(<OverlayHost />);
    await screen.findByTestId('feed-post-overlay');

    act(() => emitFeedShareLanding(99));

    await waitFor(() =>
      expect(screen.queryByTestId('feed-post-overlay')).not.toBeInTheDocument(),
    );
    // Záznam okna sa NEODOBERÁ – práve naň má viesť Späť.
    expect(backSpy).not.toHaveBeenCalled();
    expect(closeOptions).toEqual([{ keepHistory: true }]);
    expect(homeRequests).toBe(1);
    await settleHistory();
    expect(window.location.pathname).toBe(FEED_PATH);
    release();
  });

  it('reopens the original post when going back from the feed', async () => {
    const release = registerFeedLandingTarget();
    render(<OverlayHost />);
    await screen.findByTestId('feed-post-overlay');
    act(() => emitFeedShareLanding(99));
    await waitFor(() => expect(window.location.pathname).toBe(FEED_PATH));
    await waitFor(() =>
      expect(screen.queryByTestId('feed-post-overlay')).not.toBeInTheDocument(),
    );
    mockedGetPost.mockClear();

    await goBack();

    // Späť pristane na adrese príspevku a existujúci vstup cez adresu otvorí
    // to isté okno – nič nové sa nestavia.
    expect(window.location.pathname).toBe(OVERLAY_PATH);
    expect(await screen.findByTestId('feed-post-overlay')).toBeInTheDocument();
    expect(mockedGetPost).toHaveBeenCalledWith(7);
    expect(await screen.findByText('Text príspevku')).toBeInTheDocument();
    release();
  });
});

describe('skutočné zdieľanie z okna', () => {
  it.each([
    ['nad Nástenkou', true],
    ['nad iným modulom', false],
  ])('navigates to the feed exactly once – %s', async (_name, feedOnScreen) => {
    const release = feedOnScreen ? registerFeedLandingTarget() : () => {};
    mockedShare.mockResolvedValue({ id: 99, post_type: 'shared_feed_post' } as never);
    render(<OverlayHost />);
    await screen.findByTestId('feed-post-overlay');

    await userEvent.click(await screen.findByTestId('feed-share-button'));
    await userEvent.click(await screen.findByTestId('feed-share-submit'));

    await waitFor(() =>
      expect(screen.queryByTestId('feed-post-overlay')).not.toBeInTheDocument(),
    );
    expect(homeRequests).toBe(1);
    expect(backSpy).not.toHaveBeenCalled();
    expect(closeOptions).toEqual([{ keepHistory: true }]);
    release();
  });
});
