/**
 * Hostiteľ mobilnej obrazovky detailu príspevku (nález 360, krok 2 zrušenia starého spôsobu detailu príspevku).
 *
 * Z upozornenia alebo z adresy `/dashboard/feed/<id>` je známe len číslo príspevku (a prípadne komentára), takže ho hostiteľ
 * načíta a až potom ukáže obrazovku detailu (`FeedPostMobileDetail`). Drží rovnaké pravidlá ako okno na počítači: očíslované
 * načítanie, spoločné spracovanie zmiznutého príspevku (404, 403, 410), zatvorenie pri zmazaní, pristátie po zdieľaní so
 * záznamom v histórii (`keepHistory`) a zatvorenie `keepHistory` pri odchode na profil alebo zdroj. Testy idú cez verejné
 * rozhranie hostiteľa (vlastnosti, DOM, `data-testid`, kontext okna s atrapou `onTargetChange`, udalosti na `window` a atrapy
 * `getFeedPost` a `listFeedPostComments`).
 */

import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import toast from 'react-hot-toast';
import FeedPostMobileDetailHost from '../FeedPostMobileDetailHost';
import { FeedPostOverlayProvider } from '../../../contexts/FeedPostOverlayContext';
import { resetOverlayLayers } from '../../shared/overlayLayers';
import { FEED_HOME_NAVIGATION_EVENT } from '../feedHomeNavigation';
import { emitFeedPostDeleted, onFeedPostDeleted } from '../feedPostDeletedEvents';
import { resetAnnouncedFeedPosts } from '../feedPostGone';
import { emitFeedShareLanding, registerFeedLandingTarget, resetFeedShareLanding } from '../feedShareLanding';
import { getFeedPost, listFeedPostComments, type FeedPost } from '@/lib/feedApi';

const mockPush = jest.fn();

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
  useRouter: () => ({ push: mockPush }),
}));

const mockedGetPost = getFeedPost as jest.MockedFunction<typeof getFeedPost>;
const mockedList = listFeedPostComments as jest.MockedFunction<typeof listFeedPostComments>;

const zdielajuci = {
  id: 10,
  display_name: 'Jana Nováková',
  slug: 'jana',
  user_type: 'individual',
  avatar_url: null,
};
const vlastnik = {
  id: 21,
  display_name: 'Peter Kováč',
  slug: 'peter',
  user_type: 'individual',
  avatar_url: null,
};

function prispevok(id: number, overrides: Record<string, unknown> = {}): FeedPost {
  return {
    id,
    post_type: 'free_post',
    caption: `Text príspevku ${id}`,
    author: zdielajuci,
    images: [],
    shared_content: null,
    shared_content_unavailable: false,
    tagged_users: [],
    likes_count: 0,
    comments_count: 0,
    is_liked_by_me: false,
    can_manage: false,
    created_at: '2026-01-01T10:00:00Z',
    ...overrides,
  } as unknown as FeedPost;
}

/** Prezdieľaný príspevok číslo 9 od `vlastnik`. */
function prezdielany(id: number): FeedPost {
  return prispevok(id, {
    post_type: 'shared_feed_post',
    shared_content: {
      type: 'feed_post',
      title: '',
      category: '',
      caption: 'Pôvodný text',
      id: 9,
      owner: vlastnik,
      owner_display_name: 'Peter Kováč',
      thumbnail_url: null,
      is_seeking: null,
      price_negotiable: null,
      price_from: null,
      price_currency: '',
    },
  });
}

function komentar(id: number, text: string) {
  return {
    id,
    text,
    author: zdielajuci,
    can_delete: false,
    can_edit: false,
    likes_count: 0,
    is_liked_by_me: false,
    replies: [],
    replies_count: 0,
    created_at: '2026-01-01T11:00:00Z',
  };
}

function odpoved(status: number) {
  return Object.assign(new Error(`HTTP ${status}`), { response: { status } });
}

function odlozene<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Vykreslí hostiteľa v kontexte okna s atrapou `onTargetChange` (ako ho tvorí dashboard). */
function vykresli(
  postId: number,
  s: { highlightCommentId?: number | null; bezKontextu?: boolean; onClose?: () => void } = {},
) {
  const onClose = s.onClose ?? jest.fn();
  const onTargetChange = jest.fn();
  const uzol = (id: number, ciel: number | null | undefined) => {
    const host = <FeedPostMobileDetailHost postId={id} highlightCommentId={ciel} onClose={onClose} />;
    return s.bezKontextu ? host : <FeedPostOverlayProvider onTargetChange={onTargetChange}>{host}</FeedPostOverlayProvider>;
  };
  const view = render(uzol(postId, s.highlightCommentId));
  return {
    ...view,
    onClose,
    onTargetChange,
    prepni: (id: number, ciel?: number | null) => view.rerender(uzol(id, ciel)),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetPost.mockReset();
  mockedList.mockReset();
  mockedList.mockResolvedValue({ results: [], next: null, previous: null, count: 0 } as never);
  mockPush.mockReset();
  resetOverlayLayers();
  resetAnnouncedFeedPosts();
  resetFeedShareLanding();
  document.body.innerHTML = '';
});

describe('hostiteľ obrazovky detailu: načítanie príspevku', () => {
  it('načíta príspevok podľa čísla a ukáže obrazovku detailu', async () => {
    mockedGetPost.mockResolvedValue(prispevok(5));

    vykresli(5);

    expect(await screen.findByTestId('feed-mobile-detail')).toBeInTheDocument();
    expect(mockedGetPost).toHaveBeenCalledWith(5);
    expect(screen.getByText('Text príspevku 5')).toBeInTheDocument();
    expect(screen.queryByTestId('feed-mobile-detail-host')).not.toBeInTheDocument();
  });

  it('kým sa príspevok načítava, ukáže kostru a tlačidlo X ju zatvorí', async () => {
    const cakanie = odlozene<FeedPost>();
    mockedGetPost.mockReturnValue(cakanie.promise);
    const { onClose } = vykresli(5);

    expect(await screen.findByTestId('feed-mobile-detail-host-loading')).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('feed-mobile-detail-host-close'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Escape v stave načítavania zavolá onClose', async () => {
    mockedGetPost.mockReturnValue(odlozene<FeedPost>().promise);
    const { onClose } = vykresli(5);
    await screen.findByTestId('feed-mobile-detail-host-loading');

    await userEvent.keyboard('{Escape}');

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('cieľový komentár z upozornenia sa podá obrazovke a zvýrazní', async () => {
    Object.defineProperty(Element.prototype, 'scrollIntoView', { value: jest.fn(), configurable: true, writable: true });
    mockedGetPost.mockResolvedValue(prispevok(5, { comments_count: 2 }));
    mockedList.mockResolvedValue({
      results: [komentar(41, 'Starší'), komentar(42, 'Ten z upozornenia')],
      next: null,
      previous: null,
      count: 2,
    } as never);

    vykresli(5, { highlightCommentId: 42 });

    await screen.findByText('Ten z upozornenia');
    await waitFor(() =>
      expect(document.querySelector('[data-comment-id="42"]')?.className).toContain('bg-purple-100/80'),
    );
  });
});

describe('hostiteľ obrazovky detailu: príspevok sa nepodarilo načítať', () => {
  it.each([404, 403, 410])('stav %i: príspevok zmizne zo zoznamov, hláška padne raz a hostiteľ sa zatvorí', async (stav) => {
    mockedGetPost.mockRejectedValue(odpoved(stav));
    const zmazanie = jest.fn();
    const odhlas = onFeedPostDeleted(zmazanie);
    try {
      const { onClose } = vykresli(5);

      await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
      expect(zmazanie).toHaveBeenCalledWith(5);
      expect(toast.error).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('feed-mobile-detail-host-error')).not.toBeInTheDocument();
    } finally {
      odhlas();
    }
  });

  it('pri inej chybe ponúkne „Skúsiť znova“ a nezatvorí sa; opakovanie príspevok načíta', async () => {
    mockedGetPost.mockRejectedValueOnce(new Error('offline')).mockResolvedValue(prispevok(5));
    const { onClose } = vykresli(5);

    const chyba = await screen.findByTestId('feed-mobile-detail-host-error');
    expect(onClose).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();

    await userEvent.click(within(chyba).getByRole('button', { name: 'Skúsiť znova' }));

    expect(await screen.findByTestId('feed-mobile-detail')).toBeInTheDocument();
    expect(mockedGetPost).toHaveBeenCalledTimes(2);
  });

  it('odpoveď na predošlý príspevok neprepíše nový, keď dorazí neskôr', async () => {
    const stary = odlozene<FeedPost>();
    mockedGetPost.mockImplementation(((id: number) => (id === 5 ? stary.promise : Promise.resolve(prispevok(6)))) as never);
    const { prepni } = vykresli(5);
    await screen.findByTestId('feed-mobile-detail-host-loading');

    // Druhé upozornenie na iný príspevok: nový príspevok sa načíta skôr než pomalší predošlý.
    prepni(6);
    expect(await screen.findByText('Text príspevku 6')).toBeInTheDocument();
    await act(async () => {
      stary.resolve(prispevok(5));
    });

    expect(screen.getByText('Text príspevku 6')).toBeInTheDocument();
    expect(screen.queryByText('Text príspevku 5')).not.toBeInTheDocument();
  });
});

describe('hostiteľ obrazovky detailu: zmazanie a pristátie po zdieľaní', () => {
  it('zmazanie príspevku z inej vrstvy hostiteľa zatvorí, zmazanie iného príspevku nie', async () => {
    mockedGetPost.mockResolvedValue(prispevok(5));
    const { onClose } = vykresli(5);
    await screen.findByTestId('feed-mobile-detail');

    act(() => emitFeedPostDeleted(77));
    expect(onClose).not.toHaveBeenCalled();

    act(() => emitFeedPostDeleted(5));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('po zdieľaní sa zatvorí cez kontext so záznamom v histórii a Nástenku zobrazí sám, keď je na obrazovke', async () => {
    mockedGetPost.mockResolvedValue(prispevok(5));
    const domov = jest.fn();
    window.addEventListener(FEED_HOME_NAVIGATION_EVENT, domov);
    const odhlas = registerFeedLandingTarget();
    try {
      const { onClose, onTargetChange } = vykresli(5);
      await screen.findByTestId('feed-mobile-detail');

      act(() => emitFeedShareLanding(123));

      expect(onTargetChange).toHaveBeenCalledWith(null, { keepHistory: true });
      expect(onClose).not.toHaveBeenCalled();
      expect(domov).toHaveBeenCalledTimes(1);
    } finally {
      odhlas();
      window.removeEventListener(FEED_HOME_NAVIGATION_EVENT, domov);
    }
  });

  it('po zdieľaní bez Nástenky na obrazovke Nástenku nežiada (navigáciu spustí dialóg zdieľania)', async () => {
    mockedGetPost.mockResolvedValue(prispevok(5));
    const domov = jest.fn();
    window.addEventListener(FEED_HOME_NAVIGATION_EVENT, domov);
    try {
      const { onTargetChange } = vykresli(5);
      await screen.findByTestId('feed-mobile-detail');

      act(() => emitFeedShareLanding(123));

      expect(onTargetChange).toHaveBeenCalledWith(null, { keepHistory: true });
      expect(domov).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener(FEED_HOME_NAVIGATION_EVENT, domov);
    }
  });

  it('po zdieľaní bez kontextu okna sa zatvorí bežným onClose', async () => {
    mockedGetPost.mockResolvedValue(prispevok(5));
    const { onClose } = vykresli(5, { bezKontextu: true });
    await screen.findByTestId('feed-mobile-detail');

    act(() => emitFeedShareLanding(123));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('hostiteľ obrazovky detailu: zatvorenie pri odchode na iné miesto', () => {
  it('preklik na pôvodného autora zatvorí cez kontext so záznamom v histórii, nie bežným onClose', async () => {
    mockedGetPost.mockResolvedValue(prezdielany(5));
    const udalosti: string[] = [];
    const poslucham = (event: Event) =>
      udalosti.push(`profil:${(event as CustomEvent<{ identifier: string }>).detail.identifier}`);
    window.addEventListener('goToUserProfile', poslucham);
    try {
      const { onClose, onTargetChange } = vykresli(5);
      await screen.findByTestId('feed-mobile-detail');

      await userEvent.click(within(screen.getByTestId('feed-shared-card-owner')).getByText('Peter Kováč'));

      expect(onTargetChange).toHaveBeenCalledWith(null, { keepHistory: true });
      expect(onClose).not.toHaveBeenCalled();
      expect(udalosti).toEqual(['profil:peter']);
    } finally {
      window.removeEventListener('goToUserProfile', poslucham);
    }
  });

  it('preklik na zdroj zdieľaného príspevku zatvorí cez kontext so záznamom v histórii a prejde na jeho adresu', async () => {
    mockedGetPost.mockResolvedValue(prezdielany(5));
    const { onClose, onTargetChange } = vykresli(5);
    await screen.findByTestId('feed-mobile-detail');

    await userEvent.click(screen.getByTestId('feed-shared-post-preview-open'));

    expect(onTargetChange).toHaveBeenCalledWith(null, { keepHistory: true });
    expect(onClose).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/dashboard/feed/9');
  });

  it('preklik na profil bez kontextu okna sa zatvorí bežným onClose', async () => {
    mockedGetPost.mockResolvedValue(prezdielany(5));
    const { onClose } = vykresli(5, { bezKontextu: true });
    await screen.findByTestId('feed-mobile-detail');

    await userEvent.click(within(screen.getByTestId('feed-shared-card-owner')).getByText('Peter Kováč'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('tlačidlo X obrazovky zatvára bežne cez onClose, nie cez kontext', async () => {
    mockedGetPost.mockResolvedValue(prispevok(5));
    const { onClose, onTargetChange } = vykresli(5);
    await screen.findByTestId('feed-mobile-detail');

    await userEvent.click(screen.getByTestId('feed-mobile-detail-close'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onTargetChange).not.toHaveBeenCalled();
  });
});
