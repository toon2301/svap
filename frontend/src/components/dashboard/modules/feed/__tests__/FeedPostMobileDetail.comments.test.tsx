/**
 * Napojenie komentárov na mobilnú obrazovku detailu: štartovacia poloha a celkový počet pri ikone.
 *
 * Charakterizačné testy pred delením `FeedPostMobileDetail.tsx` (nález 333, dávka K49). Obrazovka dostane od
 * `FeedPostComments` dva signály: „zoznam je vykreslený“ (podľa neho sa rozhodne, či sa otvorí rovno pri komentároch) a
 * celkový počet komentárov zo zoznamu (ten sa ukáže pri ikone komentárov). Existujúce testy merajú samotný posun,
 * ktorý obrazovka vykoná; nestrážia ale dve podmienky okolo neho (posun sa nevykoná, keď je kotva už na vrchu plochy,
 * a rozhodnutie padne raz za otvorenie) ani premietnutie celkového počtu zo zoznamu (K46: prežili tri skúšobné
 * pokazenia). Testy idú cez verejné rozhranie komponentu (`export default`, vlastnosti, DOM, `data-testid`, atrapa
 * `listFeedPostComments` a rozmery kotvy), takže musia prejsť bez úpravy aj po delení súboru.
 */

import { act, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FeedPostMobileDetail from '../FeedPostMobileDetail';
import { resetOverlayLayers } from '../../shared/overlayLayers';
import { listFeedPostComments, type FeedPost } from '@/lib/feedApi';

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

const mockedList = listFeedPostComments as jest.MockedFunction<typeof listFeedPostComments>;

const author = {
  id: 10,
  display_name: 'Jana Nováková',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};

const photo = (id: number) => ({
  id,
  status: 'approved',
  thumbnail_url: `http://api.test/${id}-t.webp`,
  large_url: `http://api.test/${id}-l.webp`,
});

/** Príspevok s fotkou a desiatimi komentármi: presne ten, pri ktorom sa obrazovka otvára pri komentároch. */
function makePost(overrides: Record<string, unknown> = {}): FeedPost {
  return {
    id: 7,
    post_type: 'free_post',
    caption: 'Text príspevku',
    author,
    images: [photo(11)],
    shared_content: null,
    shared_content_unavailable: false,
    tagged_users: [],
    likes_count: 2,
    comments_count: 10,
    is_liked_by_me: false,
    can_manage: false,
    created_at: '2026-01-01T10:00:00Z',
    ...overrides,
  } as unknown as FeedPost;
}

function commentPage(count: number, label = 'Komentár', total = count) {
  return {
    results: Array.from({ length: count }, (_unused, index) => ({
      id: 100 + index,
      text: `${label} ${index + 1}`,
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
    count: total,
  };
}

function deferredPage<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

/**
 * Napodobní rozmery: vrch plochy je na 0, kotva „Komentáre“ na `anchorTop`. Plynulý posun (`scrollTo`) jsdom nemá,
 * preto sa na plochu doplní atrapa, ktorá si zapamätá, či a o koľko sa posúva.
 */
function installLayout(anchorTop: number) {
  const scroller = screen.getByTestId('feed-comments-scroll');
  const anchor = screen.getByTestId('feed-mobile-detail-comments-anchor');
  scroller.getBoundingClientRect = () => ({ top: 0 }) as DOMRect;
  anchor.getBoundingClientRect = () => ({ top: anchorTop }) as DOMRect;
  const scrollTo = jest.fn();
  scroller.scrollTo = scrollTo as unknown as typeof scroller.scrollTo;
  return { anchor, scrollTo };
}

/** Otvorí obrazovku so zadržanou odpoveďou zoznamu, aby sa rozmery dali nastaviť PRED dorazením komentárov. */
async function openWithHeldComments(post: FeedPost, anchorTop: number) {
  const page = deferredPage<ReturnType<typeof commentPage>>();
  mockedList.mockReturnValueOnce(page.promise as never);
  const view = render(<FeedPostMobileDetail post={post} onClose={jest.fn()} />);
  await screen.findByTestId('feed-mobile-detail');
  const layout = installLayout(anchorTop);
  return { ...layout, view, page };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedList.mockReset();
  resetOverlayLayers();
  document.body.innerHTML = '';
});

describe('štartovacia poloha mobilnej obrazovky detailu', () => {
  it('kotva pod vrchom plochy sa posunie plynule o vypočítanú vzdialenosť', async () => {
    const { anchor, scrollTo, page } = await openWithHeldComments(makePost(), 422);
    expect(scrollTo).not.toHaveBeenCalled();

    await act(async () => {
      page.resolve(commentPage(10));
    });

    await waitFor(() => expect(scrollTo).toHaveBeenCalledTimes(1));
    expect(scrollTo).toHaveBeenCalledWith({ top: 422, behavior: 'smooth' });
    expect(anchor).toHaveAttribute('data-auto-scrolled', 'true');
  });

  it.each([0, -40])(
    'kotva, ktorá je už na vrchu plochy alebo nad ním (%i px), sa neposúva, hoci rozhodnutie o posune padne',
    async (anchorTop) => {
      const { anchor, scrollTo, page } = await openWithHeldComments(makePost(), anchorTop);

      await act(async () => {
        page.resolve(commentPage(10));
      });

      await waitFor(() => expect(anchor).toHaveAttribute('data-auto-scrolled', 'true'));
      expect(scrollTo).not.toHaveBeenCalled();
    },
  );

  it('rozhodnutie padne raz za otvorenie obrazovky: po prechode na iný príspevok sa posun nezopakuje', async () => {
    const { anchor, scrollTo, view, page } = await openWithHeldComments(makePost(), 422);
    await act(async () => {
      page.resolve(commentPage(10));
    });
    await waitFor(() => expect(scrollTo).toHaveBeenCalledTimes(1));

    // Obrazovka dostane iný príspevok s fotkou a desiatimi komentármi; `FeedPostComments` pre neho vyšle signál
    // „zoznam je vykreslený“ znova, rozhodnutie o posune ale už padlo.
    mockedList.mockResolvedValueOnce(commentPage(10, 'Iný príspevok') as never);
    view.rerender(
      <FeedPostMobileDetail
        post={makePost({ id: 8, images: [photo(12)] })}
        onClose={jest.fn()}
      />,
    );

    expect(await screen.findByText('Iný príspevok 1')).toBeInTheDocument();
    expect(mockedList).toHaveBeenCalledTimes(2);
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(anchor).toHaveAttribute('data-auto-scrolled', 'true');
  });
});

describe('počet komentárov pri ikone na mobilnej obrazovke detailu', () => {
  it('celkový počet zo zoznamu komentárov sa premietne do počtu pri ikone komentárov', async () => {
    const page = deferredPage<ReturnType<typeof commentPage>>();
    mockedList.mockReturnValueOnce(page.promise as never);
    render(
      <FeedPostMobileDetail post={makePost({ comments_count: 2, images: [] })} onClose={jest.fn()} />,
    );
    await screen.findByTestId('feed-mobile-detail');
    expect(screen.getByTestId('feed-mobile-detail-comments')).toHaveTextContent('2');

    await act(async () => {
      page.resolve(commentPage(2, 'Komentár', 5));
    });

    await waitFor(() =>
      expect(screen.getByTestId('feed-mobile-detail-comments')).toHaveTextContent('5'),
    );
  });
});
