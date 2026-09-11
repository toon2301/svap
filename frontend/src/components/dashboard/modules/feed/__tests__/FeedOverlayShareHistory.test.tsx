/**
 * Zdieľanie z okna detailu otvoreného NAD nefeedovým modulom.
 *
 * Okno si pri bežnom zatvorení odoberá svoj záznam histórie cez
 * `history.back()`, ktorý je ASYNCHRÓNNY. Keď po zdieľaní hneď nasleduje
 * prepnutie na Nástenku (`pushState`), dobehol by až po ňom – a buď by ho
 * zrušil, alebo by nechal adresu na ceste už zavretého okna.
 *
 * Test meria MECHANIZMUS, nie výslednú adresu: v jsdom `pushState` zaradený
 * `back()` úplne zruší (odmerané: žiadny `popstate`, adresa končí na
 * pushnutej ceste), takže by tvrdenie o adrese prešlo aj s chybou. Rozhoduje
 * teda to, či sa krok späť vôbec vyžiada a s akou voľbou sa okno zatvára.
 */

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
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
  pushFeedOverlayHistory,
  popFeedOverlayHistory,
  forgetFeedOverlayHistory,
  resetFeedOverlayHistory,
} from '../feedOverlayHistory';
import { getFeedPost } from '@/lib/feedApi';

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
 * Dashboard okolo okna: drží jeho stav a účtovníctvo histórie presne tak,
 * ako to robí `handleFeedOverlayTargetChange`.
 */
let closeOptions: Array<FeedPostOverlayCloseOptions | undefined>;
let backSpy: jest.SpyInstance;

function OverlayHost() {
  const [open, setOpen] = React.useState(true);
  const handleTargetChange = React.useCallback(
    (target: unknown, options?: FeedPostOverlayCloseOptions) => {
      if (target) return;
      closeOptions.push(options);
      setOpen(false);
      if (options?.keepHistory) {
        forgetFeedOverlayHistory();
        return;
      }
      popFeedOverlayHistory();
    },
    [],
  );

  return (
    <FeedPostOverlayProvider onTargetChange={handleTargetChange}>
      <div data-testid="module-underneath" />
      {open ? (
        <FeedPostDetailOverlay
          postId={7}
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
  // Okno bolo otvorené nad profilom a pridalo si svoj záznam.
  window.history.replaceState(null, '', PROFILE_PATH);
  pushFeedOverlayHistory(OVERLAY_PATH);
  closeOptions = [];
  backSpy = jest.spyOn(window.history, 'back');
});

afterEach(() => {
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

describe('okno nad nefeedovým modulom', () => {
  it('closes without its own step back, because navigation follows', async () => {
    render(<OverlayHost />);
    await screen.findByTestId('feed-post-overlay');
    expect(window.location.pathname).toBe(OVERLAY_PATH);

    act(() => emitFeedShareLanding(99));

    await waitFor(() =>
      expect(screen.queryByTestId('feed-post-overlay')).not.toBeInTheDocument(),
    );
    // Jediná operácia s históriou ostáva na prepnutí modulu. Vlastný krok
    // späť je asynchrónny, takže by dobehol až PO ňom.
    expect(backSpy).not.toHaveBeenCalled();
    expect(closeOptions).toEqual([{ keepHistory: true }]);
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

  it('still removes its own entry when the feed IS on screen', async () => {
    // Feed je pod oknom, takže sa nikam nenaviguje – okno sa zatvára bežne
    // a svoj záznam si odoberie.
    const release = registerFeedLandingTarget();
    render(<OverlayHost />);
    await screen.findByTestId('feed-post-overlay');

    act(() => emitFeedShareLanding(99));

    await waitFor(() =>
      expect(screen.queryByTestId('feed-post-overlay')).not.toBeInTheDocument(),
    );
    expect(backSpy).toHaveBeenCalledTimes(1);
    expect(closeOptions).toEqual([undefined]);
    await settleHistory();
    // Krok späť dobehol – sme tam, kde bol používateľ pred otvorením okna.
    expect(window.location.pathname).toBe(PROFILE_PATH);
    release();
  });
});
