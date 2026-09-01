/**
 * Okno detailu sleduje ŽIVÝ stav fotiek, nie snímku z otvorenia.
 *
 * Rozloženie okna (dvojstĺpcové s fotkou / jednostĺpcové bez nej) sa vyberá
 * podľa toho, či je čo ukázať v médiovej ploche. Keby to bola jednorazová
 * snímka z načítania, zamietnutie jedinej (rozpracovanej) fotky moderáciou
 * počas otvoreného okna by nechalo dvojstĺpcové rozloženie s prázdnou plochou
 * až do zavretia a znovuotvorenia.
 *
 * Okno preto používa TEN ISTÝ `usePendingFeedImages`, aký má karta vo feede –
 * len ho drží nad kartou a výsledok jej podáva (`liveImages`), aby nad jedným
 * príspevkom nebežali dva pollingy naraz.
 *
 * Vlastný súbor kvôli falošným časovačom: zvyšné testy okna bežia na reálnych
 * a miešanie oboch v jednom module si v tejto appke už raz vypýtalo prekvapenia
 * (rovnaký dôvod, prečo má vlastný súbor aj `FeedPostCard.likePolling`).
 */

import { act, render, screen, waitFor } from '@testing-library/react';
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

/** Interval `usePendingFeedImages` – jedno kolo dosledovania fotiek. */
const IMAGE_POLL_MS = 2500;

const author = {
  id: 10,
  display_name: 'Jana',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};

/** Rozpracovaná fotka ešte NEMÁ URL – karusel z nej kreslí stavovú plochu. */
function pendingImage(id: number) {
  return {
    id,
    status: 'pending',
    thumbnail_url: '',
    large_url: '',
  } as FeedPost['images'][number];
}

function settledImage(id: number, status: 'approved' | 'rejected') {
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
    images: [],
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

/**
 * Príspevok AUTORA s jedinou rozpracovanou fotkou – jediný stav, v ktorom
 * `usePendingFeedImages` vôbec začne pollovať (cudziemu divákovi backend
 * rozpracované fotky neposiela).
 */
function pendingPost(overrides: Partial<FeedPost> = {}): FeedPost {
  return makePost({
    can_manage: true,
    images: [pendingImage(11)],
    ...overrides,
  });
}

/**
 * Prvá odpoveď patrí načítaniu okna, ďalšie kolám pollingu; po nich už chodí
 * posledná dokola.
 *
 * Fronta sa stavia od nuly (`mockReset`): `jest.clearAllMocks()` maže len
 * históriu volaní, nie nespotrebované `...Once` odpovede – tie by z testu,
 * ktorý ich všetky nevyčerpal, pretiekli do ďalšieho a ten by dostal cudzí
 * príspevok.
 */
function respondWith(initial: FeedPost, ...later: FeedPost[]) {
  mockedGetPost.mockReset();
  mockedGetPost.mockResolvedValue(later[later.length - 1] ?? initial);
  mockedGetPost.mockResolvedValueOnce(initial);
  later.forEach((post) => mockedGetPost.mockResolvedValueOnce(post));
}

async function openOverlay(post: FeedPost) {
  render(<FeedPostDetailOverlay postId={post.id} onClose={jest.fn()} />);
  // Odpoveď načítania je hotová hneď (mock), stačí ju nechať dobehnúť.
  await act(async () => {});
  await waitFor(() =>
    expect(screen.getByTestId('feed-post-card')).toBeInTheDocument(),
  );
}

/** Nechá prebehnúť jedno kolo dosledovania fotiek. */
async function tickImagePoll() {
  await act(async () => {
    jest.advanceTimersByTime(IMAGE_POLL_MS);
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  resetOverlayLayers();
  mockedListComments.mockResolvedValue({
    results: [],
    next: null,
    previous: null,
    count: 0,
  });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('rozloženie sa prepína podľa živého stavu fotiek', () => {
  it('switches to the single-column layout when the last photo is rejected', async () => {
    const post = pendingPost();
    respondWith(
      post,
      makePost({ can_manage: true, images: [settledImage(11, 'rejected')] }),
    );
    await openOverlay(post);

    // Kým sa fotka spracúva, okno je dvojstĺpcové so stavovou plochou.
    expect(screen.getByTestId('feed-post-overlay-split')).toBeInTheDocument();
    expect(screen.getByTestId('feed-image-status')).toBeInTheDocument();

    await tickImagePoll();

    // Moderácia fotku zamietla – rozloženie sa prepne SAMO, bez zavretia okna.
    await waitFor(() =>
      expect(
        screen.queryByTestId('feed-post-overlay-split'),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByTestId('feed-post-overlay-fixed')).toBeInTheDocument();
    expect(screen.queryByTestId('feed-post-image')).not.toBeInTheDocument();
    // Autor sa o dôvode dozvie z diskrétnej poznámky, ako inde v appke.
    expect(screen.getByTestId('feed-image-rejected-note')).toBeInTheDocument();
  });

  it('drops the fixed window height with the two-column layout', async () => {
    const post = pendingPost();
    respondWith(
      post,
      makePost({ can_manage: true, images: [settledImage(11, 'rejected')] }),
    );
    await openOverlay(post);

    // Dvojstĺpcové rozloženie potrebuje PEVNÚ výšku (pružná fotka má `flex-1`)…
    expect(screen.getByTestId('feed-post-overlay').className).toContain(
      'h-[95vh]',
    );

    await tickImagePoll();

    // …jednostĺpcové sa naopak vracia k STROPU, aby krátky príspevok
    // nenechal pod sebou prázdne okno.
    await waitFor(() =>
      expect(screen.getByTestId('feed-post-overlay').className).toContain(
        'max-h-[95vh]',
      ),
    );
  });

  it('stays on the two-column layout when the photo is approved instead', async () => {
    const post = pendingPost();
    respondWith(
      post,
      makePost({ can_manage: true, images: [settledImage(11, 'approved')] }),
    );
    await openOverlay(post);

    expect(screen.getByTestId('feed-image-status')).toBeInTheDocument();

    await tickImagePoll();

    // Opačný smer: fotka prešla, okno ostáva dvojstĺpcové a už kreslí fotku.
    await waitFor(() =>
      expect(screen.queryByTestId('feed-image-status')).not.toBeInTheDocument(),
    );
    expect(screen.getByTestId('feed-post-overlay-split')).toBeInTheDocument();
    expect(screen.getByTestId('feed-image-open-11')).toBeInTheDocument();
  });

  it('keeps the two-column layout while one of several photos is rejected', async () => {
    const post = pendingPost({
      images: [settledImage(11, 'approved'), pendingImage(12)],
    });
    respondWith(
      post,
      makePost({
        can_manage: true,
        images: [settledImage(11, 'approved'), settledImage(12, 'rejected')],
      }),
    );
    await openOverlay(post);

    await tickImagePoll();

    // Zamietnutá je len jedna z dvoch – ostáva čo ukázať, takže rozloženie
    // sa nemá prečo meniť.
    await waitFor(() =>
      expect(screen.getByTestId('feed-image-rejected-note')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('feed-post-overlay-split')).toBeInTheDocument();
    expect(screen.getByTestId('feed-post-image')).toBeInTheDocument();
  });
});

describe('sledovanie beží raz a za rovnakých podmienok ako doteraz', () => {
  it('runs a single polling loop for the post, not one per card', async () => {
    const post = pendingPost();
    respondWith(post, post, post);
    await openOverlay(post);

    // Načítanie okna.
    expect(mockedGetPost).toHaveBeenCalledTimes(1);

    await tickImagePoll();

    // Fotky sleduje LEN okno; karta v ňom ich dostáva hotové, takže nad
    // rovnakým príspevkom nebeží druhá slučka (appka je citlivá na 429).
    expect(mockedGetPost).toHaveBeenCalledTimes(2);

    await tickImagePoll();

    expect(mockedGetPost).toHaveBeenCalledTimes(3);
  });

  it('does not watch anything for somebody else than the author', async () => {
    // Cudziemu divákovi backend rozpracovanú fotku vôbec neposiela, takže niet
    // čo dosledovať – pôvodná podmienka hooku ostáva nezmenená.
    const post = makePost({ can_manage: false, images: [pendingImage(11)] });
    respondWith(post, post);
    await openOverlay(post);

    await tickImagePoll();

    expect(mockedGetPost).toHaveBeenCalledTimes(1);
  });

  it('does not watch a post whose photos are all settled', async () => {
    const post = makePost({
      can_manage: true,
      images: [settledImage(11, 'approved')],
    });
    respondWith(post, post);
    await openOverlay(post);

    await tickImagePoll();

    expect(mockedGetPost).toHaveBeenCalledTimes(1);
  });

  it('stops watching once the photo is settled', async () => {
    const post = pendingPost();
    respondWith(
      post,
      makePost({ can_manage: true, images: [settledImage(11, 'approved')] }),
    );
    await openOverlay(post);

    await tickImagePoll();
    expect(mockedGetPost).toHaveBeenCalledTimes(2);

    // Fotka je vybavená – ďalšie kolá už nemajú čo sledovať.
    await tickImagePoll();
    await tickImagePoll();

    expect(mockedGetPost).toHaveBeenCalledTimes(2);
  });
});
